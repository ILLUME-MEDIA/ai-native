<?php

namespace App\Support;

use App\Models\Workspace;
use Illuminate\Validation\ValidationException;

trait ResolvesWorkspacePaths
{
    protected function resolveWorkspacePath(Workspace $workspace, string $inputPath): array
    {
        $raw = str_replace('\\', '/', $inputPath);

        if ($raw === '' || str_contains($raw, "\0")) {
            throw ValidationException::withMessages(['path' => 'Invalid path']);
        }

        if (preg_match('#^[A-Za-z]:#', $raw) || str_starts_with($raw, '//')) {
            throw ValidationException::withMessages(['path' => 'Invalid path']);
        }

        $relativePath = rtrim(ltrim($raw, '/'), '/');

        if ($relativePath === '' || preg_match('#(^|/)\.\.(?:/|$)#', $relativePath)) {
            throw ValidationException::withMessages(['path' => 'Invalid path']);
        }

        $basePath = $this->normalizePath($workspace->full_path);
        $fullPath = $this->normalizePath($basePath . '/' . $relativePath);

        $this->assertWithinBase($basePath, $fullPath);

        return [$fullPath, $relativePath];
    }

    protected function assertWithinBase(string $basePath, string $fullPath): void
    {
        $baseReal = realpath($basePath) ?: $basePath;
        $baseNorm = $this->normalizeForCompare($baseReal);

        if (file_exists($fullPath)) {
            // Existing file/dir: use realpath to resolve symlinks
            $fullReal = realpath($fullPath) ?: $fullPath;
            $fullNorm = $this->normalizeForCompare($fullReal);
        } else {
            // New file/dir: walk up to find the nearest existing ancestor
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
                // No existing ancestor found; fall back to string comparison
                // using the normalized full path (already sanitized by caller)
                $fullNorm = $this->normalizeForCompare($fullPath);
            } else {
                // Reconstruct the full path using the real parent + remaining segments
                $parentNorm = $this->normalizeForCompare($parentReal);
                $parentOrigNorm = $this->normalizeForCompare($parent);
                $remainder = substr($this->normalizeForCompare($fullPath), strlen($parentOrigNorm));
                $fullNorm = $parentNorm . $remainder;
            }
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
}
