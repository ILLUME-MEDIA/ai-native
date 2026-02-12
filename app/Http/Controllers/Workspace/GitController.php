<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use App\Services\Git\GitService;
use App\Support\ResolvesWorkspacePaths;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Validation\ValidationException;

class GitController extends Controller
{
    use AuthorizesRequests;
    use ResolvesWorkspacePaths;

    protected GitService $gitService;

    public function __construct(GitService $gitService)
    {
        $this->gitService = $gitService;
    }
    public function init(Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $result = $this->runGit($workspace, 'init');

        if ($result['success']) {
            $workspace->update(['git_enabled' => true]);
        }

        return response()->json($result);
    }

    public function status(Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $result = $this->runGit($workspace, 'status', '--porcelain=1', '-b');

        if ($result['success']) {
            $parsed = $this->parseStatus($result['output'] ?? '');
            $result = array_merge($result, $parsed);
        }

        return response()->json($result);
    }

    public function add(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $data = $request->validate([
            'files' => 'nullable|array',
            'files.*' => 'string'
        ]);

        $files = $data['files'] ?? ['.'];
        $files = $this->sanitizeGitPaths($workspace, $files);

        return response()->json($this->runGit($workspace, 'add', ...$files));
    }

    public function commit(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $request->validate(['message' => 'required|string']);

        return response()->json($this->runGit($workspace, 'commit', '-m', $request->message));
    }

    public function push(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $data = $request->validate([
            'branch' => 'nullable|string'
        ]);

        $branch = $data['branch'] ?? 'main';
        $this->assertSafeGitRef($branch);

        return response()->json($this->runGit($workspace, 'push', 'origin', $branch));
    }

    public function pull(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        return response()->json($this->runGit($workspace, 'pull'));
    }

    public function log(Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $result = $this->runGit($workspace, 'log', '--pretty=format:%H%x1f%an%x1f%ad%x1f%s', '--date=iso-strict', '-20');

        if ($result['success']) {
            $result['commits'] = $this->parseLog($result['output'] ?? '');
        }

        return response()->json($result);
    }

    public function diff(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $data = $request->validate([
            'file' => 'nullable|string'
        ]);

        $file = $data['file'] ?? null;

        $args = ['diff'];
        if ($file !== null && $file !== '') {
            $args[] = $this->sanitizeGitPath($workspace, $file);
        }

        return response()->json($this->runGit($workspace, ...$args));
    }

    protected function runGit(Workspace $workspace, ...$args)
    {
        if (!is_dir($workspace->full_path)) {
            return [
                'success' => false,
                'error' => 'Workspace directory not found',
                'output' => '',
                'exit_code' => 1,
                'working_directory' => null
            ];
        }

        // Use the GitService for secure, production-ready Git execution
        $result = $this->gitService->execute($workspace->full_path, $args);

        // Improve missing-git UX on Windows
        if (!$result['success'] && (($result['exit_code'] ?? null) === 127 || str_contains((string) ($result['error'] ?? ''), 'Git is not installed'))) {
            $result['actionable_help'] = [
                'title' => 'Git not found',
                'message' => 'Git does not appear to be installed or available to the server process.',
                'windows_steps' => [
                    'Install Git for Windows from the official installer.',
                    'Ensure "git.exe" is in PATH for the user running PHP (IIS/Apache/PHP-FPM).',
                    'Or set GIT_BINARY_PATH in your Laravel config to the full path (e.g. C:\\Program Files\\Git\\cmd\\git.exe).',
                ],
            ];
        }

        return $result;
    }

    protected function sanitizeGitPaths(Workspace $workspace, array $files): array
    {
        $sanitized = [];

        foreach ($files as $file) {
            if (!is_string($file) || $file === '') {
                continue;
            }

            if (in_array($file, ['.', '-A', '--all'], true)) {
                $sanitized[] = $file;
                continue;
            }

            $sanitized[] = $this->sanitizeGitPath($workspace, $file);
        }

        if ($sanitized === []) {
            $sanitized[] = '.';
        }

        return $sanitized;
    }

    protected function sanitizeGitPath(Workspace $workspace, string $file): string
    {
        $file = str_replace('\\', '/', $file);

        if (str_starts_with($file, '-')) {
            throw ValidationException::withMessages(['file' => 'Invalid file path']);
        }

        [$fullPath, $relativePath] = $this->resolveWorkspacePath($workspace, $file);
        if (str_starts_with($relativePath, './')) {
            $relativePath = substr($relativePath, 2);
        }

        if (is_dir($fullPath)) {
            return rtrim($relativePath, '/') . '/';
        }

        return $relativePath;
    }

    protected function assertSafeGitRef(string $ref): void
    {
        if (!preg_match('#^[A-Za-z0-9._/-]+$#', $ref)) {
            throw ValidationException::withMessages(['branch' => 'Invalid branch name']);
        }
    }

    protected function parseStatus(string $output): array
    {
        $lines = preg_split('/\\r\\n|\\r|\\n/', trim($output));
        $branch = null;
        $changes = [];

        foreach ($lines as $index => $line) {
            if ($line === '') {
                continue;
            }

            if ($index === 0 && str_starts_with($line, '## ')) {
                $branchInfo = substr($line, 3);
                $branch = explode('...', $branchInfo)[0] ?? $branchInfo;
                continue;
            }

            $status = trim(substr($line, 0, 2));
            $file = trim(substr($line, 3));
            if ($file !== '') {
                $changes[] = ['status' => $status, 'file' => $file];
            }
        }

        return [
            'branch' => $branch,
            'changes' => $changes
        ];
    }

    protected function parseLog(string $output): array
    {
        $commits = [];
        $lines = preg_split('/\\r\\n|\\r|\\n/', trim($output));

        foreach ($lines as $line) {
            if ($line === '') {
                continue;
            }

            // Use unit separator (\x1f) as delimiter to avoid conflicts with | in commit messages
            $parts = explode("\x1f", $line, 4);
            [$hash, $author, $date, $message] = array_pad($parts, 4, null);
            $commits[] = [
                'hash' => $hash,
                'author' => $author,
                'date' => $date,
                'message' => $message,
            ];
        }

        return $commits;
    }
}
