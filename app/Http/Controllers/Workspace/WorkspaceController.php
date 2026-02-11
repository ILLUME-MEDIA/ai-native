<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class WorkspaceController extends Controller
{
    use AuthorizesRequests;
    public function index(Request $request)
    {
        $workspaces = Workspace::forUser(auth()->id())
            ->active()
            ->orderBy('last_accessed_at', 'desc')
            ->get();

        return response()->json($workspaces);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'nullable|in:project,site,library'
        ]);

        $workspace = Workspace::create([
            'user_id' => auth()->id(),
            'name' => $request->name,
            'description' => $request->description,
            'type' => $request->type ?? 'project',
            'last_accessed_at' => now()
        ]);

        // Create initial files
        $this->createInitialStructure($workspace);

        return response()->json($workspace);
    }

    public function show(Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $workspace->touchAccess();

        return response()->json($workspace);
    }

    public function update(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'settings' => 'nullable|array'
        ]);

        $workspace->update($request->only(['name', 'description', 'settings']));

        return response()->json($workspace);
    }

    public function destroy(Workspace $workspace)
    {
        $this->authorize('delete', $workspace);

        // Soft delete - mark as inactive
        $workspace->update(['is_active' => false]);

        return response()->json(['message' => 'Workspace archived']);
    }

    public function files(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $items = $this->scanDirectory($workspace->full_path, $workspace->full_path);

        usort($items, function ($a, $b) {
            if ($a['type'] !== $b['type']) {
                return $a['type'] === 'directory' ? -1 : 1;
            }
            return strcasecmp($a['name'], $b['name']);
        });

        return response()->json(['files' => $items]);
    }

    private function scanDirectory($directory, $basePath, $relativePath = '')
    {
        $items = [];

        if (!is_dir($directory)) {
            return $items;
        }

        foreach (scandir($directory) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $fullItemPath = $directory . DIRECTORY_SEPARATOR . $item;
            $relativeItemPath = $relativePath ? $relativePath . '/' . $item : $item;

            if (is_dir($fullItemPath)) {
                $items[] = [
                    'name' => $item,
                    'path' => $relativeItemPath,
                    'type' => 'directory',
                    'size' => 0,
                    'modified' => filemtime($fullItemPath)
                ];

                // Recursively scan subdirectories
                $subitems = $this->scanDirectory($fullItemPath, $basePath, $relativeItemPath);
                $items = array_merge($items, $subitems);
            } else {
                $extension = pathinfo($item, PATHINFO_EXTENSION);
                $items[] = [
                    'name' => $item,
                    'path' => $relativeItemPath,
                    'type' => 'file',
                    'size' => filesize($fullItemPath),
                    'modified' => filemtime($fullItemPath),
                    'extension' => $extension
                ];
            }
        }

        return $items;
    }

    public function readFile(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $request->validate(['path' => 'required|string']);

        $filePath = $workspace->full_path . '/' . ltrim($request->path, '/');

        if (!File::exists($filePath) || File::isDirectory($filePath)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        $content = File::get($filePath);

        return response()->json([
            'content' => $content,
            'path' => $request->path,
            'size' => File::size($filePath),
            'modified' => File::lastModified($filePath)
        ]);
    }

    public function writeFile(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $request->validate([
            'path' => 'required|string',
            'content' => 'required|string'
        ]);

        $filePath = $workspace->full_path . '/' . ltrim($request->path, '/');

        // Ensure parent directory exists
        $directory = dirname($filePath);
        if (!File::isDirectory($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        File::put($filePath, $request->content);

        return response()->json([
            'success' => true,
            'path' => $request->path,
            'size' => File::size($filePath)
        ]);
    }

    public function createFile(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $request->validate([
            'path' => 'required|string',
            'type' => 'required|in:file,directory',
            'content' => 'nullable|string'
        ]);

        $filePath = $workspace->full_path . '/' . ltrim($request->path, '/');

        if (File::exists($filePath)) {
            return response()->json(['error' => 'Path already exists'], 409);
        }

        if ($request->type === 'directory') {
            File::makeDirectory($filePath, 0755, true);
        } else {
            $directory = dirname($filePath);
            if (!File::isDirectory($directory)) {
                File::makeDirectory($directory, 0755, true);
            }
            File::put($filePath, $request->content ?? '');
        }

        return response()->json([
            'success' => true,
            'path' => $request->path,
            'type' => $request->type
        ]);
    }

    public function deleteFile(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $request->validate(['path' => 'required|string']);

        $filePath = $workspace->full_path . '/' . ltrim($request->path, '/');

        if (!File::exists($filePath)) {
            return response()->json(['error' => 'Path not found'], 404);
        }

        if (File::isDirectory($filePath)) {
            File::deleteDirectory($filePath);
        } else {
            File::delete($filePath);
        }

        return response()->json(['success' => true]);
    }

    protected function createInitialStructure(Workspace $workspace)
    {
        $basePath = $workspace->full_path;

        // Create basic structure
        File::makeDirectory("$basePath/src", 0755, true);
        File::makeDirectory("$basePath/public", 0755, true);

        // Create README.md
        File::put("$basePath/README.md", "# {$workspace->name}\n\n{$workspace->description}");

        // Create .gitignore
        File::put("$basePath/.gitignore", "node_modules/\nvendor/\n.env\n.DS_Store\n");
    }
}
