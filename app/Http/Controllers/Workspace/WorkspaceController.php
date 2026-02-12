<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use App\Support\ResolvesWorkspacePaths;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Validation\ValidationException;

class WorkspaceController extends Controller
{
    use AuthorizesRequests;
    use ResolvesWorkspacePaths;

    private int $maxFileSize;
    private int $maxScanDepth;
    private int $maxScanItems;
    private array $excludedDirs;
    private array $allowedExtensions;
    private bool $allowExtensionless;

    public function __construct(private Filesystem $fs)
    {
        $this->maxFileSize = (int) config('workspaces.max_file_size', 10 * 1024 * 1024);
        $this->maxScanDepth = (int) config('workspaces.max_scan_depth', 6);
        $this->maxScanItems = (int) config('workspaces.max_scan_items', 20000);
        $this->excludedDirs = config('workspaces.excluded_dirs', ['.git', 'node_modules', 'vendor', 'storage', 'bootstrap/cache']);
        $this->allowedExtensions = config('workspaces.allowed_extensions', []);
        $this->allowExtensionless = (bool) config('workspaces.allow_extensionless', true);
    }
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

        $depth = (int) $request->input('depth', $this->maxScanDepth);
        $depth = max(1, min($depth, $this->maxScanDepth));

        $items = [];
        $count = 0;
        $this->scanDirectory($workspace->full_path, '', 0, $depth, $items, $count);

        usort($items, function ($a, $b) {
            if ($a['type'] !== $b['type']) {
                return $a['type'] === 'directory' ? -1 : 1;
            }
            return strcasecmp($a['name'], $b['name']);
        });

        return response()->json(['files' => $items]);
    }

    /**
     * List direct children of a directory (incremental explorer loading).
     * GET /api/workspaces/{workspace}/files/list?path=src
     */
    public function listDirectory(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $request->validate(['path' => 'nullable|string']);

        $relative = (string) ($request->input('path') ?? '');
        $relative = trim(str_replace('\\', '/', $relative), '/');

        if ($relative !== '' && $this->isExcludedPath($relative)) {
            return response()->json(['items' => []]);
        }

        $dirFull = $workspace->full_path;
        $dirRelativePrefix = '';

        if ($relative !== '') {
            [$dirFull, $dirRelativePrefix] = $this->resolveWorkspacePath($workspace, $relative);
            if (!is_dir($dirFull)) {
                return response()->json(['error' => 'Directory not found'], 404);
            }
        }

        $items = [];

        foreach ($this->fs->directories($dirFull) as $dir) {
            if (is_link($dir)) continue;
            $name = basename($dir);
            $childRel = $dirRelativePrefix ? ($dirRelativePrefix . '/' . $name) : $name;
            $childRel = trim(str_replace('\\', '/', $childRel), '/');

            if ($this->isExcludedPath($childRel)) {
                continue;
            }

            $items[] = [
                'name' => $name,
                'path' => $childRel,
                'type' => 'directory',
                'size' => 0,
                'modified' => filemtime($dir),
            ];
        }

        foreach ($this->fs->files($dirFull) as $file) {
            if (is_link($file->getRealPath())) continue;
            $name = $file->getFilename();
            $childRel = $dirRelativePrefix ? ($dirRelativePrefix . '/' . $name) : $name;
            $childRel = trim(str_replace('\\', '/', $childRel), '/');

            $items[] = [
                'name' => $name,
                'path' => $childRel,
                'type' => 'file',
                'size' => $file->getSize(),
                'modified' => $file->getMTime(),
                'extension' => $file->getExtension(),
            ];
        }

        usort($items, function ($a, $b) {
            if ($a['type'] !== $b['type']) {
                return $a['type'] === 'directory' ? -1 : 1;
            }
            return strcasecmp($a['name'], $b['name']);
        });

        return response()->json([
            'path' => $relative === '' ? '/' : $relative,
            'items' => $items,
        ]);
    }

    private function scanDirectory(string $basePath, string $relativePath, int $depth, int $maxDepth, array &$items, int &$count): void
    {
        if ($depth > $maxDepth || $count >= $this->maxScanItems) {
            return;
        }

        $directory = $relativePath === '' ? $basePath : $basePath . DIRECTORY_SEPARATOR . $relativePath;

        if (!$this->fs->isDirectory($directory)) {
            return;
        }

        foreach ($this->fs->directories($directory) as $dir) {
            if ($count >= $this->maxScanItems) {
                return;
            }

            if (is_link($dir)) {
                continue;
            }

            $name = basename($dir);
            $relativeItemPath = $relativePath ? $relativePath . '/' . $name : $name;
            if ($this->isExcludedPath($relativeItemPath)) {
                continue;
            }

            $items[] = [
                'name' => $name,
                'path' => $relativeItemPath,
                'type' => 'directory',
                'size' => 0,
                'modified' => filemtime($dir)
            ];
            $count++;

            $this->scanDirectory($basePath, $relativeItemPath, $depth + 1, $maxDepth, $items, $count);
        }

        foreach ($this->fs->files($directory) as $file) {
            if ($count >= $this->maxScanItems) {
                return;
            }

            if (is_link($file->getRealPath())) {
                continue;
            }

            $name = $file->getFilename();
            $relativeItemPath = $relativePath ? $relativePath . '/' . $name : $name;

            $items[] = [
                'name' => $name,
                'path' => $relativeItemPath,
                'type' => 'file',
                'size' => $file->getSize(),
                'modified' => $file->getMTime(),
                'extension' => $file->getExtension()
            ];
            $count++;
        }
    }

    public function readFile(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $request->validate(['path' => 'required|string']);

        [$filePath, $relativePath] = $this->resolveWorkspacePath($workspace, $request->path);

        if (!$this->fs->exists($filePath) || $this->fs->isDirectory($filePath)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        $size = $this->fs->size($filePath);
        if ($size > $this->maxFileSize) {
            return response()->json(['error' => 'File too large', 'size' => $size], 400);
        }

        $this->assertExtensionAllowed($filePath);

        $content = $this->fs->get($filePath);

        return response()->json([
            'content' => $content,
            'path' => $relativePath,
            'size' => $size,
            'modified' => $this->fs->lastModified($filePath)
        ]);
    }

    public function writeFile(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $request->validate([
            'path' => 'required|string',
            'content' => 'nullable|string'
        ]);

        // Ensure workspace root directory exists before resolving paths
        if (!$this->fs->isDirectory($workspace->full_path)) {
            $this->fs->makeDirectory($workspace->full_path, 0755, true);
        }

        [$filePath, $relativePath] = $this->resolveWorkspacePath($workspace, $request->path);

        $this->assertExtensionAllowed($filePath);

        // Ensure parent directory exists
        $directory = dirname($filePath);
        if (!$this->fs->isDirectory($directory)) {
            $this->fs->makeDirectory($directory, 0755, true);
        }

        $this->fs->put($filePath, $request->input('content', ''), true);

        $relativePath = str_replace('\\', '/', $relativePath);
        $ext = strtolower(pathinfo($relativePath, PATHINFO_EXTENSION));

        return response()->json([
            'success' => true,
            'path' => $relativePath,
            'size' => $this->fs->size($filePath),
            'fs_patch' => [
                'op' => 'update',
                'path' => $relativePath,
                'type' => 'file',
                'node' => [
                    'name' => basename($relativePath),
                    'path' => $relativePath,
                    'type' => 'file',
                    'size' => $this->fs->size($filePath),
                    'extension' => $ext,
                ],
            ],
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

        // Ensure workspace root directory exists before resolving paths
        if (!$this->fs->isDirectory($workspace->full_path)) {
            $this->fs->makeDirectory($workspace->full_path, 0755, true);
        }

        [$filePath, $relativePath] = $this->resolveWorkspacePath($workspace, $request->path);

        if ($this->fs->exists($filePath)) {
            return response()->json(['error' => 'Path already exists'], 409);
        }

        if ($request->type === 'directory') {
            $this->fs->makeDirectory($filePath, 0755, true);
        } else {
            $this->assertExtensionAllowed($filePath);

            $directory = dirname($filePath);
            if (!$this->fs->isDirectory($directory)) {
                $this->fs->makeDirectory($directory, 0755, true);
            }
            $this->fs->put($filePath, $request->content ?? '', true);
        }

        $relativePath = str_replace('\\', '/', $relativePath);
        $ext = $request->type === 'file' ? strtolower(pathinfo($relativePath, PATHINFO_EXTENSION)) : '';
        $size = $request->type === 'file' ? $this->fs->size($filePath) : 0;

        return response()->json([
            'success' => true,
            'path' => $relativePath,
            'type' => $request->type,
            'fs_patch' => [
                'op' => 'create',
                'path' => $relativePath,
                'type' => $request->type,
                'node' => [
                    'name' => basename($relativePath),
                    'path' => $relativePath,
                    'type' => $request->type,
                    'size' => $size,
                    'extension' => $ext,
                ],
            ],
        ]);
    }

    public function deleteFile(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $request->validate(['path' => 'required|string']);

        [$filePath] = $this->resolveWorkspacePath($workspace, $request->path);

        if (!$this->fs->exists($filePath)) {
            return response()->json(['error' => 'Path not found'], 404);
        }

        $type = $this->fs->isDirectory($filePath) ? 'directory' : 'file';

        if ($type === 'directory') {
            $this->fs->deleteDirectory($filePath);
        } else {
            $this->fs->delete($filePath);
        }

        $relativePath = str_replace('\\', '/', (string) $request->path);
        $relativePath = ltrim($relativePath, '/');

        return response()->json([
            'success' => true,
            'type' => $type,
            'fs_patch' => [
                'op' => 'delete',
                'path' => $relativePath,
                'type' => $type,
            ],
        ]);
    }

    public function renameFile(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $request->validate([
            'old_path' => 'required|string',
            'new_path' => 'required|string',
        ]);

        [$oldFullPath, $oldRelative] = $this->resolveWorkspacePath($workspace, $request->old_path);
        [$newFullPath, $newRelative] = $this->resolveWorkspacePath($workspace, $request->new_path);

        if (!$this->fs->exists($oldFullPath)) {
            return response()->json(['error' => 'Source not found'], 404);
        }

        if ($this->fs->exists($newFullPath)) {
            return response()->json(['error' => 'Destination already exists'], 409);
        }

        // Ensure parent directory exists
        $newParentDir = dirname($newFullPath);
        if (!$this->fs->isDirectory($newParentDir)) {
            $this->fs->makeDirectory($newParentDir, 0755, true);
        }

        if ($this->fs->isDirectory($oldFullPath)) {
            $this->fs->moveDirectory($oldFullPath, $newFullPath);
        } else {
            $this->fs->move($oldFullPath, $newFullPath);
        }

        $type = $this->fs->isDirectory($newFullPath) ? 'directory' : 'file';
        $newRelative = str_replace('\\', '/', $newRelative);
        $oldRelative = str_replace('\\', '/', $oldRelative);

        return response()->json([
            'success' => true,
            'old_path' => $oldRelative,
            'new_path' => $newRelative,
            'type' => $type,
            'fs_patch' => [
                'op' => 'rename',
                'old_path' => $oldRelative,
                'new_path' => $newRelative,
                'type' => $type,
                'node' => [
                    'name' => basename($newRelative),
                    'path' => $newRelative,
                    'type' => $type,
                    'size' => $type === 'file' ? $this->fs->size($newFullPath) : 0,
                    'extension' => $type === 'file' ? strtolower(pathinfo($newRelative, PATHINFO_EXTENSION)) : '',
                ],
            ],
        ]);
    }

    protected function createInitialStructure(Workspace $workspace)
    {
        $basePath = $workspace->full_path;

        // Create basic structure
        if (!$this->fs->isDirectory("$basePath/src")) {
            $this->fs->makeDirectory("$basePath/src", 0755, true);
        }
        if (!$this->fs->isDirectory("$basePath/public")) {
            $this->fs->makeDirectory("$basePath/public", 0755, true);
        }

        // Create README.md
        $description = $workspace->description ?? '';
        $this->fs->put("$basePath/README.md", "# {$workspace->name}\n\n{$description}", true);

        // Create .gitignore
        $this->fs->put("$basePath/.gitignore", "node_modules/\nvendor/\n.env\n.DS_Store\n", true);
    }

    protected function isExcludedPath(string $relativePath): bool
    {
        $relativePath = trim(str_replace('\\', '/', $relativePath), '/');

        foreach ($this->excludedDirs as $excluded) {
            $excluded = trim(str_replace('\\', '/', $excluded), '/');
            if ($excluded === '') {
                continue;
            }

            if ($relativePath === $excluded || str_starts_with($relativePath, $excluded . '/')) {
                return true;
            }
        }

        return false;
    }

    protected function assertExtensionAllowed(string $path): void
    {
        if (empty($this->allowedExtensions)) {
            return;
        }

        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        if ($ext === '' && $this->allowExtensionless) {
            return;
        }
        if ($ext === '' || !in_array($ext, $this->allowedExtensions, true)) {
            throw ValidationException::withMessages(['path' => 'File extension not allowed']);
        }
    }
}
