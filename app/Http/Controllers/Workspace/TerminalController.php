<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use App\Services\Git\GitService;
use App\Support\ResolvesWorkspacePaths;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Validation\ValidationException;

class TerminalController extends Controller
{
    use AuthorizesRequests;
    use ResolvesWorkspacePaths;

    public function __construct(private GitService $gitService)
    {
    }

    public function execute(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $request->validate([
            'command' => 'required|string',
            'requires_approval' => 'boolean',
            'cwd' => 'nullable|string'
        ]);

        $command = trim($request->command);

        if ($command === '') {
            throw ValidationException::withMessages(['command' => 'Command cannot be empty']);
        }

        $maxLength = (int) config('workspaces.terminal_max_length', 4096);
        if (strlen($command) > $maxLength) {
            throw ValidationException::withMessages(['command' => 'Command too long']);
        }

        $allowedPrefixes = config('workspaces.terminal_allowlist', []);
        if (!empty($allowedPrefixes) && !$this->isAllowedCommand($command, $allowedPrefixes)) {
            return response()->json([
                'success' => false,
                'error' => 'Command not allowed'
            ], 403);
        }

        $workingDir = $workspace->full_path;
        $cwdInput = $request->input('cwd');
        if (is_string($cwdInput) && $cwdInput !== '' && $cwdInput !== '/' && $cwdInput !== '.') {
            [$cwdPath] = $this->resolveWorkspacePath($workspace, $cwdInput);
            if (!is_dir($cwdPath)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Working directory not found'
                ], 400);
            }
            $workingDir = $cwdPath;
        }

        // Check if command requires approval
        if ($this->requiresApproval($command) && !$request->boolean('approved')) {
            return response()->json([
                'requires_approval' => true,
                'command' => $command,
                'message' => 'This command requires approval'
            ]);
        }

        if (!is_dir($workingDir)) {
            return response()->json([
                'success' => false,
                'error' => 'Workspace directory not found'
            ], 404);
        }

        // Handle 'cd' commands by resolving the directory and returning it
        if (preg_match('/^cd\s+(.+)$/i', $command, $cdMatch)) {
            $target = trim($cdMatch[1]);
            $target = trim($target, '"\'');

            if ($target === '~' || $target === '') {
                $newDir = $workspace->full_path;
            } elseif ($target === '-') {
                $newDir = $workingDir; // stay in current (simplified)
            } else {
                // Resolve relative to current working dir
                if (!preg_match('#^[/\\\\]#', $target) && !preg_match('#^[A-Za-z]:#', $target)) {
                    $target = $workingDir . DIRECTORY_SEPARATOR . $target;
                }

                $realTarget = realpath($target);
                if ($realTarget === false || !is_dir($realTarget)) {
                    return response()->json([
                        'success' => false,
                        'output' => '',
                        'error' => "cd: no such directory: " . trim($cdMatch[1]),
                        'exit_code' => 1,
                        'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
                    ]);
                }

                // Ensure resolved path is within workspace
                $baseReal = realpath($workspace->full_path);
                $normalizedBase = rtrim(str_replace('\\', '/', $baseReal ?: $workspace->full_path), '/');
                $normalizedTarget = rtrim(str_replace('\\', '/', $realTarget), '/');

                if (DIRECTORY_SEPARATOR === '\\') {
                    $normalizedBase = strtolower($normalizedBase);
                    $normalizedTarget = strtolower($normalizedTarget);
                }

                if (!str_starts_with($normalizedTarget . '/', $normalizedBase . '/')) {
                    return response()->json([
                        'success' => false,
                        'output' => '',
                        'error' => 'cd: permission denied (outside workspace)',
                        'exit_code' => 1,
                        'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
                    ]);
                }

                $newDir = $realTarget;
            }

            return response()->json([
                'success' => true,
                'output' => '',
                'error' => '',
                'exit_code' => 0,
                'working_directory' => $this->relativeWorkspacePath($workspace, $newDir),
            ]);
        }

        // If user runs git commands, use GitService (supports auto-detected git.exe)
        if ($this->isGitCommand($command)) {
            return $this->executeGitJson($workspace, $workingDir, $command);
        }

        $process = Process::fromShellCommandline(
            $command,
            $workingDir,
            null,
            null,
            (int) config('workspaces.terminal_timeout', 300)
        );

        try {
            $process->run();

            return response()->json([
                'success' => $process->isSuccessful(),
                'output' => $process->getOutput(),
                'error' => $process->getErrorOutput(),
                'exit_code' => $process->getExitCode(),
                'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Streaming terminal execution using SSE.
     * Emits:
     * - connected
     * - stdout {text}
     * - stderr {text}
     * - exit {success, exit_code, working_directory}
     * - error {error}
     */
    public function executeStream(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $request->validate([
            'command' => 'required|string',
            'requires_approval' => 'boolean',
            'cwd' => 'nullable|string'
        ]);

        // Prevent timeouts; allow disconnect to abort process
        set_time_limit(0);
        ignore_user_abort(false);

        $command = trim((string) $request->command);
        if ($command === '') {
            throw ValidationException::withMessages(['command' => 'Command cannot be empty']);
        }

        $maxLength = (int) config('workspaces.terminal_max_length', 4096);
        if (strlen($command) > $maxLength) {
            throw ValidationException::withMessages(['command' => 'Command too long']);
        }

        $allowedPrefixes = config('workspaces.terminal_allowlist', []);
        if (!empty($allowedPrefixes) && !$this->isAllowedCommand($command, $allowedPrefixes)) {
            return response()->stream(function () {
                $this->sendSSE('error', ['error' => 'Command not allowed']);
                $this->sendSSE('exit', ['success' => false, 'exit_code' => 403, 'working_directory' => '/']);
                $this->sendSSE('done', ['status' => 'completed']);
            }, 200, $this->sseHeaders());
        }

        $workingDir = $workspace->full_path;
        $cwdInput = $request->input('cwd');
        if (is_string($cwdInput) && $cwdInput !== '' && $cwdInput !== '/' && $cwdInput !== '.') {
            [$cwdPath] = $this->resolveWorkspacePath($workspace, $cwdInput);
            if (!is_dir($cwdPath)) {
                return response()->stream(function () use ($workspace, $workingDir) {
                    $this->sendSSE('error', ['error' => 'Working directory not found']);
                    $this->sendSSE('exit', [
                        'success' => false,
                        'exit_code' => 400,
                        'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
                    ]);
                    $this->sendSSE('done', ['status' => 'completed']);
                }, 200, $this->sseHeaders());
            }
            $workingDir = $cwdPath;
        }

        // Approval check
        if ($this->requiresApproval($command) && !$request->boolean('approved')) {
            return response()->stream(function () use ($workspace, $workingDir, $command) {
                $this->sendSSE('approval_required', [
                    'requires_approval' => true,
                    'command' => $command,
                    'message' => 'This command requires approval'
                ]);
                $this->sendSSE('exit', [
                    'success' => false,
                    'exit_code' => 0,
                    'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
                ]);
                $this->sendSSE('done', ['status' => 'completed']);
            }, 200, $this->sseHeaders());
        }

        // Handle 'cd' commands without spawning a process
        if (preg_match('/^cd\s+(.+)$/i', $command, $cdMatch)) {
            $target = trim($cdMatch[1]);
            $target = trim($target, '"\'');

            if ($target === '~' || $target === '') {
                $newDir = $workspace->full_path;
            } elseif ($target === '-') {
                $newDir = $workingDir;
            } else {
                if (!preg_match('#^[/\\\\]#', $target) && !preg_match('#^[A-Za-z]:#', $target)) {
                    $target = $workingDir . DIRECTORY_SEPARATOR . $target;
                }

                $realTarget = realpath($target);
                if ($realTarget === false || !is_dir($realTarget)) {
                    return response()->stream(function () use ($workspace, $workingDir, $cdMatch) {
                        $this->sendSSE('stderr', ['text' => "cd: no such directory: " . trim($cdMatch[1]) . "\n"]);
                        $this->sendSSE('exit', [
                            'success' => false,
                            'exit_code' => 1,
                            'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
                        ]);
                        $this->sendSSE('done', ['status' => 'completed']);
                    }, 200, $this->sseHeaders());
                }

                $baseReal = realpath($workspace->full_path);
                $normalizedBase = rtrim(str_replace('\\', '/', $baseReal ?: $workspace->full_path), '/');
                $normalizedTarget = rtrim(str_replace('\\', '/', $realTarget), '/');
                if (DIRECTORY_SEPARATOR === '\\') {
                    $normalizedBase = strtolower($normalizedBase);
                    $normalizedTarget = strtolower($normalizedTarget);
                }

                if (!str_starts_with($normalizedTarget . '/', $normalizedBase . '/')) {
                    return response()->stream(function () use ($workspace, $workingDir) {
                        $this->sendSSE('stderr', ['text' => "cd: permission denied (outside workspace)\n"]);
                        $this->sendSSE('exit', [
                            'success' => false,
                            'exit_code' => 1,
                            'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
                        ]);
                        $this->sendSSE('done', ['status' => 'completed']);
                    }, 200, $this->sseHeaders());
                }

                $newDir = $realTarget;
            }

            return response()->stream(function () use ($workspace, $newDir) {
                $this->sendSSE('exit', [
                    'success' => true,
                    'exit_code' => 0,
                    'working_directory' => $this->relativeWorkspacePath($workspace, $newDir),
                ]);
                $this->sendSSE('done', ['status' => 'completed']);
            }, 200, $this->sseHeaders());
        }

        // If user runs git commands, use GitService (supports auto-detected git.exe)
        if ($this->isGitCommand($command)) {
            return $this->executeGitStream($workspace, $workingDir, $command);
        }

        return response()->stream(function () use ($workspace, $workingDir, $command) {
            $this->sendSSE('connected', ['status' => 'connected']);

            $process = Process::fromShellCommandline(
                $command,
                $workingDir,
                null,
                null,
                (int) config('workspaces.terminal_timeout', 300)
            );

            try {
                $process->start();

                while ($process->isRunning()) {
                    if (connection_aborted()) {
                        $process->stop(1);
                        $this->sendSSE('exit', [
                            'success' => false,
                            'exit_code' => 130,
                            'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
                        ]);
                        $this->sendSSE('done', ['status' => 'completed']);
                        return;
                    }

                    $out = $process->getIncrementalOutput();
                    if ($out !== '') {
                        $this->sendSSE('stdout', ['text' => $out]);
                    }

                    $err = $process->getIncrementalErrorOutput();
                    if ($err !== '') {
                        $this->sendSSE('stderr', ['text' => $err]);
                    }

                    usleep(25_000); // 25ms
                }

                // Flush any remaining output
                $out = $process->getIncrementalOutput();
                if ($out !== '') {
                    $this->sendSSE('stdout', ['text' => $out]);
                }
                $err = $process->getIncrementalErrorOutput();
                if ($err !== '') {
                    $this->sendSSE('stderr', ['text' => $err]);
                }

                $this->sendSSE('exit', [
                    'success' => $process->isSuccessful(),
                    'exit_code' => $process->getExitCode(),
                    'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
                ]);
                $this->sendSSE('done', ['status' => 'completed']);
            } catch (\Exception $e) {
                $this->sendSSE('error', ['error' => $e->getMessage()]);
                $this->sendSSE('exit', [
                    'success' => false,
                    'exit_code' => 1,
                    'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
                ]);
                $this->sendSSE('done', ['status' => 'completed']);
            }
        }, 200, $this->sseHeaders());
    }

    protected function isGitCommand(string $command): bool
    {
        $command = ltrim($command);
        return $command === 'git' || str_starts_with($command, 'git ');
    }

    protected function splitCommand(string $command): array
    {
        // Basic quoted-arg splitting: supports double-quotes
        // Example: git commit -m "hello world"  => ['git','commit','-m','hello world']
        $tokens = str_getcsv($command, ' ', '"');
        $tokens = array_values(array_filter(array_map('trim', $tokens), fn ($t) => $t !== ''));
        return $tokens;
    }

    protected function executeGitJson(Workspace $workspace, string $workingDir, string $command)
    {
        if (!$this->gitService->isGitAvailable()) {
            return response()->json([
                'success' => false,
                'output' => '',
                'error' => "git: not found. Install Git for Windows or set GIT_BINARY_PATH.\nTip: Use the Source Control panel for guided setup.",
                'exit_code' => 127,
                'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
                'actionable_help' => [
                    'title' => 'Git not found',
                    'message' => 'Git does not appear to be installed or available to the server process.',
                    'windows_steps' => [
                        'Install Git for Windows.',
                        'Restart terminal / web server after install.',
                        'If still not found, set GIT_BINARY_PATH to full path: C:\\Program Files\\Git\\cmd\\git.exe',
                    ],
                ],
            ], 200);
        }

        $parts = $this->splitCommand($command);
        array_shift($parts); // remove 'git'
        $result = $this->gitService->execute($workingDir, $parts);

        return response()->json([
            'success' => (bool) ($result['success'] ?? false),
            'output' => (string) ($result['output'] ?? ''),
            'error' => (string) ($result['error'] ?? ''),
            'exit_code' => (int) ($result['exit_code'] ?? 1),
            'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
        ]);
    }

    protected function executeGitStream(Workspace $workspace, string $workingDir, string $command)
    {
        return response()->stream(function () use ($workspace, $workingDir, $command) {
            $this->sendSSE('connected', ['status' => 'connected']);

            if (!$this->gitService->isGitAvailable()) {
                $this->sendSSE('stderr', ['text' => "git: not found. Install Git for Windows or set GIT_BINARY_PATH.\n"]);
                $this->sendSSE('exit', [
                    'success' => false,
                    'exit_code' => 127,
                    'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
                ]);
                $this->sendSSE('done', ['status' => 'completed']);
                return;
            }

            $parts = $this->splitCommand($command);
            array_shift($parts); // remove 'git'

            $result = $this->gitService->executeStreaming($workingDir, $parts, function ($chunk, $isError) {
                if ($chunk === '') return;
                $this->sendSSE($isError ? 'stderr' : 'stdout', ['text' => $chunk]);
            });

            $this->sendSSE('exit', [
                'success' => (bool) ($result['success'] ?? false),
                'exit_code' => (int) ($result['exit_code'] ?? 1),
                'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
            ]);
            $this->sendSSE('done', ['status' => 'completed']);
        }, 200, $this->sseHeaders());
    }

    protected function sseHeaders(): array
    {
        return [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ];
    }

    protected function sendSSE(string $event, $data): void
    {
        echo "event: {$event}\n";
        echo "data: " . json_encode($data) . "\n\n";

        if (ob_get_level() > 0) {
            ob_flush();
        }
        flush();
    }

    protected function requiresApproval(string $command): bool
    {
        $dangerous = config('workspaces.terminal_dangerous_patterns', [
            'rm ',
            'rm -',
            'del ',
            'format ',
            'mkfs',
            'dd ',
            '>',
            'sudo ',
            'chmod 777',
            'chown ',
            'icacls ',
            'takeown '
        ]);

        foreach ($dangerous as $pattern) {
            if (str_contains($command, $pattern)) {
                return true;
            }
        }

        return false;
    }

    protected function isAllowedCommand(string $command, array $allowlist): bool
    {
        $command = ltrim($command);

        foreach ($allowlist as $allowed) {
            if (!is_string($allowed) || $allowed === '') {
                continue;
            }

            if (str_starts_with($command, $allowed)) {
                return true;
            }
        }

        return false;
    }

    protected function relativeWorkspacePath(Workspace $workspace, string $path): string
    {
        $base = rtrim(str_replace('\\', '/', $workspace->full_path), '/');
        $path = rtrim(str_replace('\\', '/', $path), '/');

        if (str_starts_with($path, $base)) {
            $relative = substr($path, strlen($base));
        } else {
            $relative = $path;
        }

        $relative = str_replace('\\', '/', $relative);
        if ($relative === '') {
            return '/';
        }

        return str_starts_with($relative, '/') ? $relative : '/' . $relative;
    }
}
