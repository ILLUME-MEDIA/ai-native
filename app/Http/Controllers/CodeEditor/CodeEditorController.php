<?php

namespace App\Http\Controllers\CodeEditor;

use App\Http\Controllers\Controller;
use App\Models\CodeEditorPermission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class CodeEditorController extends Controller
{
    protected string $basePath;
    protected int $maxFileSize;
    protected array $allowedExtensions;
    protected array $excludedDirectories;
    protected int $maxTreeDepth;
    protected int $maxListDepth;
    protected int $maxScanItems;
    protected int $maxSearchResults;
    protected int $maxSearchResultsPerFile;
    protected int $maxSearchDepth;
    protected bool $allowExtensionless;

    public function __construct()
    {
        // Restrict to project root
        $this->basePath = rtrim(str_replace('\\', '/', base_path()), '/');

        // Configuration
        $this->maxFileSize = config('codeeditor.max_file_size', 10485760); // 10MB
        $this->allowedExtensions = config('codeeditor.allowed_extensions', [
            'php', 'js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'sass', 'less',
            'html', 'htm', 'json', 'xml', 'md', 'txt', 'yml', 'yaml',
            'sql', 'sh', 'bash', 'env', 'example', 'lock'
        ]);

        $this->excludedDirectories = config('codeeditor.excluded_directories', [
            'node_modules',
            'vendor',
            '.git',
            'storage/framework',
            'storage/logs',
            'bootstrap/cache'
        ]);
        $this->maxTreeDepth = (int) config('codeeditor.max_tree_depth', 6);
        $this->maxListDepth = (int) config('codeeditor.max_list_depth', 4);
        $this->maxScanItems = (int) config('codeeditor.max_scan_items', 20000);
        $this->maxSearchResults = (int) config('codeeditor.max_search_results', 200);
        $this->maxSearchResultsPerFile = (int) config('codeeditor.max_search_results_per_file', 10);
        $this->maxSearchDepth = (int) config('codeeditor.max_search_depth', $this->maxTreeDepth);
        $this->allowExtensionless = (bool) config('codeeditor.allow_extensionless', true);
    }

    /**
     * List files and directories
     */
    public function list(Request $request)
    {
        try {
            [$fullPath, $path] = $this->resolvePath($request->input('path', '/'), true);

            // Check permission
            if (!CodeEditorPermission::canPerform(auth()->id(), $path, 'read')) {
                return response()->json(['error' => 'Permission denied'], 403);
            }

            if (!File::isDirectory($fullPath)) {
                return response()->json(['error' => 'Invalid directory'], 400);
            }

            $depth = (int) $request->input('depth', $this->maxListDepth);
            $depth = max(1, min($depth, $this->maxListDepth));

            $items = [];
            $count = 0;
            $this->scanDirectory($fullPath, $path, 0, $depth, $items, $count);

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

        } catch (ValidationException $e) {
            throw $e;
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

            [$fullPath, $path] = $this->resolvePath($request->input('path'));

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

            $this->assertExtensionAllowed($fullPath);

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

        } catch (ValidationException $e) {
            throw $e;
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

            [$fullPath, $path] = $this->resolvePath($request->input('path'));
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
                $this->assertExtensionAllowed($fullPath);
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
                File::put($fullPath, $request->input('content', ''), true);
            }

            // Log action
            $this->logAction('create', $path, true);

            return response()->json([
                'success' => true,
                'path' => $path,
                'type' => $type,
                'message' => ucfirst($type) . ' created successfully'
            ]);

        } catch (ValidationException $e) {
            throw $e;
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

            [$fullPath, $path] = $this->resolvePath($request->input('path'));

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

            $this->assertExtensionAllowed($fullPath);

            // Backup original (optional - for safety)
            $backup = $fullPath . '.backup.' . time();
            File::copy($fullPath, $backup);

            // Write new content
            File::put($fullPath, $request->input('content'), true);

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

        } catch (ValidationException $e) {
            throw $e;
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

            [$fullPath, $path] = $this->resolvePath($request->input('path'));

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

        } catch (ValidationException $e) {
            throw $e;
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

            [$oldFullPath, $oldPath] = $this->resolvePath($request->input('old_path'));
            [$newFullPath, $newPath] = $this->resolvePath($request->input('new_path'));

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
            $this->logAction('rename', $oldPath . ' -> ' . $newPath, true);

            return response()->json([
                'success' => true,
                'old_path' => $oldPath,
                'new_path' => $newPath,
                'message' => 'Renamed successfully'
            ]);

        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Code Editor Rename Error', ['error' => $e->getMessage()]);
            $this->logAction('rename', ($oldPath ?? '') . ' -> ' . ($newPath ?? ''), false, $e->getMessage());
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
            [$fullPath, $path] = $this->resolvePath($request->input('path', '/'), true);
            $caseSensitive = $request->boolean('case_sensitive', false);
            $isRegex = $request->boolean('regex', false);

            if (!CodeEditorPermission::canPerform(auth()->id(), $path, 'read')) {
                return response()->json(['error' => 'Permission denied'], 403);
            }

            if (!File::isDirectory($fullPath)) {
                return response()->json(['error' => 'Invalid search path'], 400);
            }

            $pattern = null;
            if ($isRegex) {
                $pattern = '/' . $query . '/' . ($caseSensitive ? '' : 'i');
                if (@preg_match($pattern, '') === false) {
                    return response()->json(['error' => 'Invalid regex pattern'], 400);
                }
            }

            $results = [];
            $files = [];
            $count = 0;
            $this->collectFiles($fullPath, $path, 0, $this->maxSearchDepth, $files, $count);

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
                if (!empty($this->allowedExtensions)) {
                    if ($extension === '' && $this->allowExtensionless) {
                        // allow extensionless
                    } elseif (!in_array($extension, $this->allowedExtensions)) {
                        continue;
                    }
                }

                $content = File::get($file->getRealPath());
                $lines = explode("\n", $content);

                $fileMatchCount = 0;

                foreach ($lines as $lineNum => $lineContent) {
                    $matched = false;

                    if ($isRegex) {
                        $matched = preg_match($pattern, $lineContent) === 1;
                    } else {
                        if ($caseSensitive) {
                            $matched = str_contains($lineContent, $query);
                        } else {
                            $matched = stripos($lineContent, $query) !== false;
                        }
                    }

                    if ($matched) {
                        $results[] = [
                            'file' => $relativePath,
                            'line' => $lineNum + 1,
                            'content' => trim($lineContent),
                            'match' => $query,
                        ];
                        $fileMatchCount++;

                        if ($fileMatchCount >= $this->maxSearchResultsPerFile) {
                            break;
                        }
                    }
                }

                // Limit total results
                if (count($results) >= $this->maxSearchResults) {
                    break;
                }
            }

            return response()->json([
                'results' => $results,
                'total' => count($results),
                'query' => $query
            ]);

        } catch (ValidationException $e) {
            throw $e;
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
            [$fullPath, $path] = $this->resolvePath($request->input('path', '/'), true);
            $maxDepth = (int) $request->input('depth', $this->maxTreeDepth);
            $maxDepth = max(1, min($maxDepth, $this->maxTreeDepth));

            if (!CodeEditorPermission::canPerform(auth()->id(), $path, 'read')) {
                return response()->json(['error' => 'Permission denied'], 403);
            }

            $count = 0;
            $tree = $this->buildTree($fullPath, $path, 0, $maxDepth, $count);

            return response()->json([
                'tree' => $tree,
                'path' => $path
            ]);

        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Code Editor Tree Error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to build tree'], 500);
        }
    }

    /**
     * Build file tree recursively
     */
    protected function buildTree(string $fullPath, string $relativePath, int $currentDepth, int $maxDepth, int &$count): array
    {
        if ($currentDepth >= $maxDepth || $count >= $this->maxScanItems) {
            return [];
        }
        $items = [];

        if (!File::isDirectory($fullPath)) {
            return $items;
        }

        // Directories first
        foreach (File::directories($fullPath) as $dir) {
            if ($count >= $this->maxScanItems) {
                return $items;
            }

            if (is_link($dir)) {
                continue;
            }

            $name = basename($dir);
            $childRelative = $this->joinRelativePath($relativePath, $name);
            if ($this->isExcludedPath($childRelative)) {
                continue;
            }
            if (!CodeEditorPermission::canPerform(auth()->id(), $childRelative . '/*', 'read')) {
                continue;
            }

            $count++;

            $items[] = [
                'name' => $name,
                'path' => $childRelative,
                'type' => 'directory',
                'children' => $this->buildTree($dir, $childRelative, $currentDepth + 1, $maxDepth, $count)
            ];
        }

        // Then files
        foreach (File::files($fullPath) as $file) {
            if ($count >= $this->maxScanItems) {
                return $items;
            }

            if (is_link($file->getRealPath())) {
                continue;
            }

            $childRelative = $this->joinRelativePath($relativePath, $file->getFilename());
            if (!CodeEditorPermission::canPerform(auth()->id(), $childRelative, 'read')) {
                continue;
            }

            $items[] = [
                'name' => $file->getFilename(),
                'path' => $childRelative,
                'type' => 'file',
                'size' => $file->getSize(),
                'extension' => $file->getExtension()
            ];
            $count++;
        }

        return $items;
    }

    protected function scanDirectory(string $fullPath, string $relativePath, int $depth, int $maxDepth, array &$items, int &$count): void
    {
        if ($depth > $maxDepth || $count >= $this->maxScanItems) {
            return;
        }

        if (!File::isDirectory($fullPath)) {
            return;
        }

        foreach (File::directories($fullPath) as $dir) {
            if ($count >= $this->maxScanItems) {
                return;
            }

            if (is_link($dir)) {
                continue;
            }

            $name = basename($dir);
            $childRelative = $this->joinRelativePath($relativePath, $name);
            if ($this->isExcludedPath($childRelative)) {
                continue;
            }
            if (!CodeEditorPermission::canPerform(auth()->id(), $childRelative . '/*', 'read')) {
                continue;
            }

            $items[] = [
                'name' => $name,
                'path' => $childRelative,
                'type' => 'directory',
                'size' => 0,
                'modified' => filemtime($dir),
                'extension' => '',
                'readable' => CodeEditorPermission::canPerform(auth()->id(), $childRelative . '/*', 'read'),
                'writable' => CodeEditorPermission::canPerform(auth()->id(), $childRelative . '/*', 'write'),
            ];
            $count++;

            $this->scanDirectory($dir, $childRelative, $depth + 1, $maxDepth, $items, $count);
        }

        foreach (File::files($fullPath) as $file) {
            if ($count >= $this->maxScanItems) {
                return;
            }

            if (is_link($file->getRealPath())) {
                continue;
            }

            $childRelative = $this->joinRelativePath($relativePath, $file->getFilename());
            if (!CodeEditorPermission::canPerform(auth()->id(), $childRelative, 'read')) {
                continue;
            }

            $items[] = [
                'name' => $file->getFilename(),
                'path' => $childRelative,
                'type' => 'file',
                'size' => $file->getSize(),
                'modified' => $file->getMTime(),
                'extension' => $file->getExtension(),
                'readable' => CodeEditorPermission::canPerform(auth()->id(), $childRelative, 'read'),
                'writable' => CodeEditorPermission::canPerform(auth()->id(), $childRelative, 'write'),
            ];
            $count++;
        }
    }

    protected function collectFiles(string $fullPath, string $relativePath, int $depth, int $maxDepth, array &$files, int &$count): void
    {
        if ($depth > $maxDepth || $count >= $this->maxScanItems) {
            return;
        }

        if (!File::isDirectory($fullPath)) {
            return;
        }

        foreach (File::directories($fullPath) as $dir) {
            if ($count >= $this->maxScanItems) {
                return;
            }

            if (is_link($dir)) {
                continue;
            }

            $name = basename($dir);
            $childRelative = $this->joinRelativePath($relativePath, $name);
            if ($this->isExcludedPath($childRelative)) {
                continue;
            }
            if (!CodeEditorPermission::canPerform(auth()->id(), $childRelative . '/*', 'read')) {
                continue;
            }

            $this->collectFiles($dir, $childRelative, $depth + 1, $maxDepth, $files, $count);
        }

        foreach (File::files($fullPath) as $file) {
            if ($count >= $this->maxScanItems) {
                return;
            }

            if (is_link($file->getRealPath())) {
                continue;
            }

            $childRelative = $this->joinRelativePath($relativePath, $file->getFilename());
            if (!CodeEditorPermission::canPerform(auth()->id(), $childRelative, 'read')) {
                continue;
            }

            $files[] = $file;
            $count++;
        }
    }

    protected function resolvePath(?string $path, bool $allowRoot = false): array
    {
        $raw = str_replace('\\', '/', (string) $path);

        if ($allowRoot && ($raw === '' || $raw === '/')) {
            return [$this->basePath, '/'];
        }

        if ($raw === '' || str_contains($raw, "\0")) {
            throw ValidationException::withMessages(['path' => 'Invalid path']);
        }

        if (preg_match('#^[A-Za-z]:#', $raw) || str_starts_with($raw, '//')) {
            throw ValidationException::withMessages(['path' => 'Invalid path']);
        }

        $relative = rtrim(ltrim($raw, '/'), '/');
        if ($relative === '' || preg_match('#(^|/)\.\.(?:/|$)#', $relative)) {
            throw ValidationException::withMessages(['path' => 'Invalid path']);
        }

        $full = $this->normalizePath($this->basePath . '/' . $relative);
        $this->assertWithinBase($full);

        return [$full, '/' . $relative];
    }

    protected function assertWithinBase(string $fullPath): void
    {
        $baseReal = realpath($this->basePath) ?: $this->basePath;
        $baseNorm = $this->normalizeForCompare($baseReal);

        if (file_exists($fullPath)) {
            $fullReal = realpath($fullPath) ?: $fullPath;
            $fullNorm = $this->normalizeForCompare($fullReal);
        } else {
            $parent = dirname($fullPath);
            while ($parent !== '.' && $parent !== DIRECTORY_SEPARATOR && !file_exists($parent)) {
                $next = dirname($parent);
                if ($next === $parent) {
                    break;
                }
                $parent = $next;
            }
            $parentReal = realpath($parent);
            if ($parentReal === false) {
                throw ValidationException::withMessages(['path' => 'Invalid path']);
            }
            $fullNorm = $this->normalizeForCompare($parentReal);
        }

        $baseNorm = rtrim($baseNorm, '/') . '/';
        $fullNorm = rtrim($fullNorm, '/') . '/';

        if (!str_starts_with($fullNorm, $baseNorm)) {
            throw ValidationException::withMessages(['path' => 'Invalid path']);
        }
    }

    protected function normalizePath(string $path): string
    {
        $path = str_replace('\\', '/', $path);
        $path = preg_replace('#/+#', '/', $path);
        return rtrim($path, '/');
    }

    protected function normalizeForCompare(string $path): string
    {
        $path = $this->normalizePath($path);
        if (DIRECTORY_SEPARATOR === '\\') {
            $path = strtolower($path);
        }
        return $path;
    }

    protected function joinRelativePath(string $base, string $child): string
    {
        $base = rtrim($base, '/');
        if ($base === '' || $base === '/') {
            return '/' . ltrim($child, '/');
        }
        return $base . '/' . ltrim($child, '/');
    }

    protected function isExcludedPath(string $relativePath): bool
    {
        $relativePath = trim(str_replace('\\', '/', $relativePath), '/');

        foreach ($this->excludedDirectories as $excluded) {
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

    /**
     * Get relative path from base
     */
    protected function relativePath($fullPath)
    {
        $fullPath = $this->normalizePath((string) $fullPath);
        $base = $this->normalizePath($this->basePath);

        if (str_starts_with($fullPath, $base)) {
            $relative = substr($fullPath, strlen($base));
        } else {
            $relative = $fullPath;
        }

        $relative = str_replace('\\', '/', $relative);
        if ($relative === '') {
            return '/';
        }

        return str_starts_with($relative, '/') ? $relative : '/' . $relative;
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
