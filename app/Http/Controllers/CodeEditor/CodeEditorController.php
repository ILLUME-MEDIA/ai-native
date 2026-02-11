<?php

namespace App\Http\Controllers\CodeEditor;

use App\Http\Controllers\Controller;
use App\Models\CodeEditorPermission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class CodeEditorController extends Controller
{
    protected $basePath;
    protected $maxFileSize;
    protected $allowedExtensions;

    public function __construct()
    {
        // Restrict to project root
        $this->basePath = base_path();

        // Configuration
        $this->maxFileSize = config('codeeditor.max_file_size', 10485760); // 10MB
        $this->allowedExtensions = config('codeeditor.allowed_extensions', [
            'php', 'js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'sass', 'less',
            'html', 'htm', 'json', 'xml', 'md', 'txt', 'yml', 'yaml',
            'sql', 'sh', 'bash', 'env', 'example', 'lock'
        ]);
    }

    /**
     * List files and directories
     */
    public function list(Request $request)
    {
        try {
            $path = $this->sanitizePath($request->input('path', '/'));
            $fullPath = $this->basePath . $path;

            // Check permission
            if (!CodeEditorPermission::canPerform(auth()->id(), $path, 'read')) {
                return response()->json(['error' => 'Permission denied'], 403);
            }

            if (!File::isDirectory($fullPath)) {
                return response()->json(['error' => 'Invalid directory'], 400);
            }

            $items = [];

            // Get all files and directories
            foreach (File::allFiles($fullPath) as $file) {
                $relativePath = $this->relativePath($file->getRealPath());

                $items[] = [
                    'name' => $file->getFilename(),
                    'path' => $relativePath,
                    'type' => 'file',
                    'size' => $file->getSize(),
                    'modified' => $file->getMTime(),
                    'extension' => $file->getExtension(),
                    'readable' => CodeEditorPermission::canPerform(auth()->id(), $relativePath, 'read'),
                    'writable' => CodeEditorPermission::canPerform(auth()->id(), $relativePath, 'write'),
                ];
            }

            foreach (File::directories($fullPath) as $dir) {
                $relativePath = $this->relativePath($dir);

                $items[] = [
                    'name' => basename($dir),
                    'path' => $relativePath,
                    'type' => 'directory',
                    'size' => 0,
                    'modified' => filemtime($dir),
                    'extension' => '',
                    'readable' => CodeEditorPermission::canPerform(auth()->id(), $relativePath . '/*', 'read'),
                    'writable' => CodeEditorPermission::canPerform(auth()->id(), $relativePath . '/*', 'write'),
                ];
            }

            // Sort: directories first, then files alphabetically
            usort($items, function ($a, $b) {
                if ($a['type'] !== $b['type']) {
                    return $a['type'] === 'directory' ? -1 : 1;
                }
                return strcasecmp($a['name'], $b['name']);
            });

            return response()->json([
                'files' => $items,
                'path' => $path
            ]);

        } catch (\Exception $e) {
            Log::error('Code Editor List Error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to list files'], 500);
        }
    }

    /**
     * Read file content
     */
    public function read(Request $request)
    {
        try {
            $request->validate([
                'path' => 'required|string'
            ]);

            $path = $this->sanitizePath($request->input('path'));
            $fullPath = $this->basePath . $path;

            // Check permission
            if (!CodeEditorPermission::canPerform(auth()->id(), $path, 'read')) {
                return response()->json(['error' => 'Permission denied'], 403);
            }

            if (!File::exists($fullPath)) {
                return response()->json(['error' => 'File not found'], 404);
            }

            if (File::isDirectory($fullPath)) {
                return response()->json(['error' => 'Cannot read directory'], 400);
            }

            $size = File::size($fullPath);
            if ($size > $this->maxFileSize) {
                return response()->json([
                    'error' => 'File too large',
                    'size' => $size,
                    'max_size' => $this->maxFileSize
                ], 400);
            }

            $content = File::get($fullPath);

            // Log action
            $this->logAction('read', $path, true);

            return response()->json([
                'content' => $content,
                'path' => $path,
                'encoding' => 'utf-8',
                'size' => $size,
                'modified' => File::lastModified($fullPath),
                'extension' => pathinfo($fullPath, PATHINFO_EXTENSION)
            ]);

        } catch (\Exception $e) {
            Log::error('Code Editor Read Error', ['error' => $e->getMessage(), 'path' => $path ?? null]);
            return response()->json(['error' => 'Failed to read file'], 500);
        }
    }

    /**
     * Create file or directory
     */
    public function create(Request $request)
    {
        try {
            $request->validate([
                'path' => 'required|string',
                'type' => 'required|in:file,directory',
                'content' => 'nullable|string'
            ]);

            $path = $this->sanitizePath($request->input('path'));
            $fullPath = $this->basePath . $path;
            $type = $request->input('type');

            // Check permission
            if (!CodeEditorPermission::canPerform(auth()->id(), $path, 'write')) {
                return response()->json(['error' => 'Permission denied'], 403);
            }

            if (File::exists($fullPath)) {
                return response()->json(['error' => 'Path already exists'], 409);
            }

            // Check extension for files
            if ($type === 'file') {
                $extension = pathinfo($fullPath, PATHINFO_EXTENSION);
                if (!in_array($extension, $this->allowedExtensions)) {
                    return response()->json([
                        'error' => 'File extension not allowed',
                        'extension' => $extension,
                        'allowed' => $this->allowedExtensions
                    ], 400);
                }
            }

            // Create
            if ($type === 'directory') {
                File::makeDirectory($fullPath, 0755, true);
            } else {
                // Ensure parent directory exists
                $parentDir = dirname($fullPath);
                if (!File::isDirectory($parentDir)) {
                    File::makeDirectory($parentDir, 0755, true);
                }
                File::put($fullPath, $request->input('content', ''));
            }

            // Log action
            $this->logAction('create', $path, true);

            return response()->json([
                'success' => true,
                'path' => $path,
                'type' => $type,
                'message' => ucfirst($type) . ' created successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Code Editor Create Error', ['error' => $e->getMessage(), 'path' => $path ?? null]);
            $this->logAction('create', $path ?? null, false, $e->getMessage());
            return response()->json(['error' => 'Failed to create ' . ($type ?? 'item')], 500);
        }
    }

    /**
     * Update file content
     */
    public function update(Request $request)
    {
        try {
            $request->validate([
                'path' => 'required|string',
                'content' => 'required|string'
            ]);

            $path = $this->sanitizePath($request->input('path'));
            $fullPath = $this->basePath . $path;

            // Check permission
            if (!CodeEditorPermission::canPerform(auth()->id(), $path, 'write')) {
                return response()->json(['error' => 'Permission denied'], 403);
            }

            if (!File::exists($fullPath)) {
                return response()->json(['error' => 'File not found'], 404);
            }

            if (File::isDirectory($fullPath)) {
                return response()->json(['error' => 'Cannot update directory'], 400);
            }

            // Backup original (optional - for safety)
            $backup = $fullPath . '.backup.' . time();
            File::copy($fullPath, $backup);

            // Write new content
            File::put($fullPath, $request->input('content'));

            // Remove backup after successful write
            File::delete($backup);

            // Log action
            $this->logAction('update', $path, true);

            return response()->json([
                'success' => true,
                'path' => $path,
                'message' => 'File saved successfully',
                'size' => File::size($fullPath),
                'modified' => File::lastModified($fullPath)
            ]);

        } catch (\Exception $e) {
            Log::error('Code Editor Update Error', ['error' => $e->getMessage(), 'path' => $path ?? null]);
            $this->logAction('update', $path ?? null, false, $e->getMessage());

            // Restore backup if exists
            if (isset($backup) && File::exists($backup)) {
                File::move($backup, $fullPath);
            }

            return response()->json(['error' => 'Failed to save file'], 500);
        }
    }

    /**
     * Delete file or directory
     */
    public function delete(Request $request)
    {
        try {
            $request->validate([
                'path' => 'required|string'
            ]);

            $path = $this->sanitizePath($request->input('path'));
            $fullPath = $this->basePath . $path;

            // Check permission
            if (!CodeEditorPermission::canPerform(auth()->id(), $path, 'delete')) {
                return response()->json(['error' => 'Permission denied'], 403);
            }

            if (!File::exists($fullPath)) {
                return response()->json(['error' => 'Path not found'], 404);
            }

            $type = File::isDirectory($fullPath) ? 'directory' : 'file';

            // Delete
            if (File::isDirectory($fullPath)) {
                File::deleteDirectory($fullPath);
            } else {
                File::delete($fullPath);
            }

            // Log action
            $this->logAction('delete', $path, true);

            return response()->json([
                'success' => true,
                'path' => $path,
                'type' => $type,
                'message' => ucfirst($type) . ' deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Code Editor Delete Error', ['error' => $e->getMessage(), 'path' => $path ?? null]);
            $this->logAction('delete', $path ?? null, false, $e->getMessage());
            return response()->json(['error' => 'Failed to delete'], 500);
        }
    }

    /**
     * Rename or move file/directory
     */
    public function rename(Request $request)
    {
        try {
            $request->validate([
                'old_path' => 'required|string',
                'new_path' => 'required|string'
            ]);

            $oldPath = $this->sanitizePath($request->input('old_path'));
            $newPath = $this->sanitizePath($request->input('new_path'));

            $oldFullPath = $this->basePath . $oldPath;
            $newFullPath = $this->basePath . $newPath;

            // Check permissions
            if (!CodeEditorPermission::canPerform(auth()->id(), $oldPath, 'write')) {
                return response()->json(['error' => 'Permission denied for source'], 403);
            }

            if (!CodeEditorPermission::canPerform(auth()->id(), $newPath, 'write')) {
                return response()->json(['error' => 'Permission denied for destination'], 403);
            }

            if (!File::exists($oldFullPath)) {
                return response()->json(['error' => 'Source not found'], 404);
            }

            if (File::exists($newFullPath)) {
                return response()->json(['error' => 'Destination already exists'], 409);
            }

            // Ensure parent directory exists
            $newParentDir = dirname($newFullPath);
            if (!File::isDirectory($newParentDir)) {
                File::makeDirectory($newParentDir, 0755, true);
            }

            // Move/Rename
            File::move($oldFullPath, $newFullPath);

            // Log action
            $this->logAction('rename', "$oldPath → $newPath", true);

            return response()->json([
                'success' => true,
                'old_path' => $oldPath,
                'new_path' => $newPath,
                'message' => 'Renamed successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Code Editor Rename Error', ['error' => $e->getMessage()]);
            $this->logAction('rename', ($oldPath ?? '') . ' → ' . ($newPath ?? ''), false, $e->getMessage());
            return response()->json(['error' => 'Failed to rename'], 500);
        }
    }

    /**
     * Search in files
     */
    public function search(Request $request)
    {
        try {
            $request->validate([
                'query' => 'required|string|min:2',
                'path' => 'nullable|string',
                'case_sensitive' => 'nullable|boolean',
                'regex' => 'nullable|boolean'
            ]);

            $query = $request->input('query');
            $path = $this->sanitizePath($request->input('path', '/'));
            $caseSensitive = $request->boolean('case_sensitive', false);
            $isRegex = $request->boolean('regex', false);

            $fullPath = $this->basePath . $path;

            if (!File::isDirectory($fullPath)) {
                return response()->json(['error' => 'Invalid search path'], 400);
            }

            $results = [];
            $files = File::allFiles($fullPath);

            foreach ($files as $file) {
                $relativePath = $this->relativePath($file->getRealPath());

                // Check permission
                if (!CodeEditorPermission::canPerform(auth()->id(), $relativePath, 'read')) {
                    continue;
                }

                // Skip large files
                if ($file->getSize() > $this->maxFileSize) {
                    continue;
                }

                // Skip binary files
                $extension = $file->getExtension();
                if (!in_array($extension, $this->allowedExtensions)) {
                    continue;
                }

                $content = File::get($file->getRealPath());
                $lines = explode("\n", $content);

                foreach ($lines as $lineNum => $lineContent) {
                    $matched = false;

                    if ($isRegex) {
                        $matched = @preg_match("/$query/", $lineContent);
                    } else {
                        if ($caseSensitive) {
                            $matched = str_contains($lineContent, $query);
                        } else {
                            $matched = str_contains(strtolower($lineContent), strtolower($query));
                        }
                    }

                    if ($matched) {
                        $results[] = [
                            'file' => $relativePath,
                            'line' => $lineNum + 1,
                            'content' => trim($lineContent),
                            'match' => $query
                        ];

                        // Limit results per file
                        if (count(array_filter($results, fn($r) => $r['file'] === $relativePath)) >= 10) {
                            break;
                        }
                    }
                }

                // Limit total results
                if (count($results) >= 100) {
                    break;
                }
            }

            return response()->json([
                'results' => $results,
                'total' => count($results),
                'query' => $query
            ]);

        } catch (\Exception $e) {
            Log::error('Code Editor Search Error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Search failed'], 500);
        }
    }

    /**
     * Get file tree structure
     */
    public function tree(Request $request)
    {
        try {
            $path = $this->sanitizePath($request->input('path', '/'));
            $maxDepth = $request->input('depth', 3);

            $tree = $this->buildTree($path, 0, $maxDepth);

            return response()->json([
                'tree' => $tree,
                'path' => $path
            ]);

        } catch (\Exception $e) {
            Log::error('Code Editor Tree Error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to build tree'], 500);
        }
    }

    /**
     * Build file tree recursively
     */
    protected function buildTree($path, $currentDepth, $maxDepth)
    {
        if ($currentDepth >= $maxDepth) {
            return [];
        }

        $fullPath = $this->basePath . $path;
        $items = [];

        if (!File::isDirectory($fullPath)) {
            return $items;
        }

        // Directories first
        foreach (File::directories($fullPath) as $dir) {
            $relativePath = $this->relativePath($dir);
            $name = basename($dir);

            // Skip common excluded directories
            if (in_array($name, ['node_modules', 'vendor', '.git', 'storage', 'bootstrap/cache'])) {
                continue;
            }

            $items[] = [
                'name' => $name,
                'path' => $relativePath,
                'type' => 'directory',
                'children' => $this->buildTree($relativePath, $currentDepth + 1, $maxDepth)
            ];
        }

        // Then files
        foreach (File::files($fullPath) as $file) {
            $relativePath = $this->relativePath($file->getRealPath());

            $items[] = [
                'name' => $file->getFilename(),
                'path' => $relativePath,
                'type' => 'file',
                'size' => $file->getSize(),
                'extension' => $file->getExtension()
            ];
        }

        return $items;
    }

    /**
     * Sanitize and validate path
     */
    protected function sanitizePath($path)
    {
        // Remove any ../ attempts
        $path = str_replace('..', '', $path);

        // Remove multiple slashes
        $path = preg_replace('#/+#', '/', $path);

        // Ensure leading slash
        if (!str_starts_with($path, '/')) {
            $path = '/' . $path;
        }

        // Remove trailing slash (except for root)
        if ($path !== '/' && str_ends_with($path, '/')) {
            $path = rtrim($path, '/');
        }

        return $path;
    }

    /**
     * Get relative path from base
     */
    protected function relativePath($fullPath)
    {
        $path = str_replace($this->basePath, '', $fullPath);
        return str_replace('\\', '/', $path);
    }

    /**
     * Log action for audit trail
     */
    protected function logAction($action, $path, $success, $error = null)
    {
        Log::info('Code Editor Action', [
            'user_id' => auth()->id(),
            'action' => $action,
            'path' => $path,
            'success' => $success,
            'error' => $error,
            'ip' => request()->ip()
        ]);
    }
}
