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

    public function blame(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $data = $request->validate(['file' => 'required|string']);
        $file = $this->sanitizeGitPath($workspace, $data['file']);

        $result = $this->runGit($workspace, 'blame', '--line-porcelain', '--', $file);

        if (!$result['success']) {
            return response()->json($result);
        }

        return response()->json(['success' => true, 'blame' => $this->parseBlame($result['output'] ?? '')]);
    }

    public function parsedDiff(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $data = $request->validate([
            'file'   => 'nullable|string',
            'staged' => 'nullable|boolean',
            'commit' => 'nullable|string',
        ]);

        $file   = $data['file'] ?? null;
        $staged = filter_var($data['staged'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $commit = $data['commit'] ?? null;

        $args = ['diff'];
        if ($staged) {
            $args[] = '--cached';
        }
        if ($commit !== null && $commit !== '') {
            $this->assertSafeGitRef($commit);
            $args[] = $commit;
        }
        if ($file !== null && $file !== '') {
            $args[] = '--';
            $args[] = $this->sanitizeGitPath($workspace, $file);
        }

        $result = $this->runGit($workspace, ...$args);

        if (!$result['success']) {
            return response()->json($result);
        }

        return response()->json(['success' => true, 'files' => $this->parseUnifiedDiff($result['output'] ?? '')]);
    }

    public function branches(Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $result        = $this->runGit($workspace, 'branch', '-a', '--format=%(refname:short)');
        $currentResult = $this->runGit($workspace, 'rev-parse', '--abbrev-ref', 'HEAD');

        $branches = [];
        if ($result['success']) {
            $branches = array_values(array_filter(
                preg_split('/\r\n|\r|\n/', trim($result['output'] ?? '')),
                fn ($b) => $b !== ''
            ));
        }

        return response()->json([
            'success'  => true,
            'current'  => trim($currentResult['output'] ?? ''),
            'branches' => $branches,
        ]);
    }

    public function createBranch(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $data = $request->validate(['name' => 'required|string']);
        $this->assertSafeGitRef($data['name']);

        return response()->json($this->runGit($workspace, 'branch', $data['name']));
    }

    public function checkout(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $data = $request->validate([
            'branch' => 'required|string',
            'create' => 'nullable|boolean',
        ]);

        $this->assertSafeGitRef($data['branch']);

        $args = ['checkout'];
        if (!empty($data['create'])) {
            $args[] = '-b';
        }
        $args[] = $data['branch'];

        $result = $this->runGit($workspace, ...$args);

        // After checkout, refresh git_enabled status if needed
        if ($result['success']) {
            $result['branch'] = $data['branch'];
        }

        return response()->json($result);
    }

    protected function parseBlame(string $output): array
    {
        $lines       = preg_split('/\r\n|\r|\n/', $output);
        $blame       = [];
        $current     = [];
        $commitCache = [];

        foreach ($lines as $line) {
            if (preg_match('/^([0-9a-f]{40}) \d+ \d+/', $line, $m)) {
                $hash    = $m[1];
                $current = ['hash' => $hash];
                if (isset($commitCache[$hash])) {
                    $current = array_merge($commitCache[$hash], ['hash' => $hash]);
                }
                continue;
            }

            if (preg_match('/^author (.+)$/', $line, $m)) {
                $current['author'] = $m[1];
            } elseif (preg_match('/^author-mail <(.+)>$/', $line, $m)) {
                $current['email'] = $m[1];
            } elseif (preg_match('/^author-time (\d+)$/', $line, $m)) {
                $current['timestamp'] = (int) $m[1];
            } elseif (preg_match('/^summary (.+)$/', $line, $m)) {
                $current['summary'] = $m[1];
            } elseif (str_starts_with($line, "\t")) {
                $current['content'] = substr($line, 1);
                $current['line']    = count($blame) + 1;

                if (!empty($current['hash']) && !isset($commitCache[$current['hash']])) {
                    $commitCache[$current['hash']] = [
                        'author'    => $current['author'] ?? '',
                        'email'     => $current['email'] ?? '',
                        'timestamp' => $current['timestamp'] ?? null,
                        'summary'   => $current['summary'] ?? '',
                    ];
                }

                $blame[]  = $current;
                $current  = [];
            }
        }

        return $blame;
    }

    protected function parseUnifiedDiff(string $output): array
    {
        $files       = [];
        $currentFile = null;
        $currentHunk = null;
        $oldLine     = 0;
        $newLine     = 0;
        $lines       = preg_split('/\r\n|\r|\n/', $output);

        foreach ($lines as $line) {
            if (str_starts_with($line, 'diff --git ')) {
                if ($currentFile !== null) {
                    if ($currentHunk !== null) {
                        $currentFile['hunks'][] = $currentHunk;
                        $currentHunk = null;
                    }
                    $files[] = $currentFile;
                }
                $currentFile = ['file' => '', 'additions' => 0, 'deletions' => 0, 'hunks' => []];
                continue;
            }

            if ($currentFile === null) continue;

            if (str_starts_with($line, '+++ b/')) {
                $currentFile['file'] = substr($line, 6);
                continue;
            }
            if (str_starts_with($line, '--- ') || str_starts_with($line, '+++ ') || str_starts_with($line, 'index ') || str_starts_with($line, 'new file') || str_starts_with($line, 'deleted file')) {
                continue;
            }

            if (preg_match('/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/', $line, $m)) {
                if ($currentHunk !== null) {
                    $currentFile['hunks'][] = $currentHunk;
                }
                $oldLine     = (int) $m[1];
                $newLine     = (int) $m[2];
                $currentHunk = ['old_start' => $oldLine, 'new_start' => $newLine, 'lines' => []];
                continue;
            }

            if ($currentHunk === null) continue;

            if (str_starts_with($line, '+')) {
                $currentHunk['lines'][]  = ['type' => 'added',   'old_line' => null,     'new_line' => $newLine, 'content' => substr($line, 1)];
                $currentFile['additions']++;
                $newLine++;
            } elseif (str_starts_with($line, '-')) {
                $currentHunk['lines'][]  = ['type' => 'removed',  'old_line' => $oldLine, 'new_line' => null,     'content' => substr($line, 1)];
                $currentFile['deletions']++;
                $oldLine++;
            } elseif (str_starts_with($line, ' ')) {
                $currentHunk['lines'][]  = ['type' => 'context',  'old_line' => $oldLine, 'new_line' => $newLine, 'content' => substr($line, 1)];
                $oldLine++;
                $newLine++;
            }
        }

        if ($currentFile !== null) {
            if ($currentHunk !== null) {
                $currentFile['hunks'][] = $currentHunk;
            }
            $files[] = $currentFile;
        }

        return $files;
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
