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

        $process = $this->buildProcess($command, $workingDir);

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

        // Release session lock so other requests (file tree, presence, etc.)
        // are not blocked while the terminal stream is running.
        $request->session()->save();

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
            // ob_implicit_flush so each flush() reaches SAPI directly.
            // sendSSE() calls ob_flush()+flush() per event — handles cPanel buffering.
            @ob_implicit_flush(true);

            $this->sendSSE('connected', ['status' => 'connected']);

            $process = $this->buildProcess($command, $workingDir);

            try {
                $process->start();

                while ($process->isRunning()) {
                    // Send an SSE keepalive comment so the browser connection
                    // stays alive and PHP can detect client disconnect via
                    // connection_aborted() after the flush call.
                    echo ": ping\n\n";
                    if (ob_get_level() > 0) { @ob_flush(); }
                    @flush();

                    if (connection_aborted()) {
                        $process->stop(1, SIGTERM ?? 15);
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

                    usleep(100_000); // 100ms — enough resolution for Ctrl+C
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

    // ── Background job terminal (non-blocking) ────────────────────────────────
    // These endpoints let the terminal run commands without holding PHP's thread.
    // The command runs in a background process writing stdout/stderr to a temp file.
    // The frontend polls /job/{id} every 300 ms — each poll takes < 20 ms.
    // php artisan serve is free to handle AI chat-stream in between polls.

    /**
     * Start a terminal command as a background job.
     * Returns {job_id, working_directory} immediately — does NOT block PHP.
     */
    public function startJob(Request $request, Workspace $workspace): \Illuminate\Http\JsonResponse
    {
        $this->authorize('update', $workspace);

        $request->validate([
            'command' => 'required|string',
            'cwd'     => 'nullable|string',
        ]);

        $request->session()->save(); // release session lock immediately

        $command = trim((string) $request->command);
        if ($command === '') {
            return response()->json(['error' => 'Command cannot be empty'], 422);
        }

        $maxLength = (int) config('workspaces.terminal_max_length', 4096);
        if (strlen($command) > $maxLength) {
            return response()->json(['error' => 'Command too long'], 422);
        }

        $allowedPrefixes = config('workspaces.terminal_allowlist', []);
        if (!empty($allowedPrefixes) && !$this->isAllowedCommand($command, $allowedPrefixes)) {
            return response()->json(['error' => 'Command not allowed'], 403);
        }

        if ($this->requiresApproval($command) && !$request->boolean('approved')) {
            return response()->json(['requires_approval' => true, 'command' => $command], 200);
        }

        // Resolve working directory
        $workingDir = $workspace->full_path;
        $cwdInput   = $request->input('cwd');
        if (is_string($cwdInput) && $cwdInput !== '' && $cwdInput !== '/' && $cwdInput !== '.') {
            [$cwdPath] = $this->resolveWorkspacePath($workspace, $cwdInput);
            if (!is_dir($cwdPath)) {
                return response()->json(['error' => 'Working directory not found'], 400);
            }
            $workingDir = $cwdPath;
        }

        // Handle cd inline (no subprocess needed)
        if (preg_match('/^cd\s+(.+)$/i', $command, $m)) {
            $target = trim(trim($m[1]), '"\'');
            if ($target === '~' || $target === '') {
                $newDir = $workspace->full_path;
            } else {
                if (!preg_match('#^[/\\\\]#', $target) && !preg_match('#^[A-Za-z]:#', $target)) {
                    $target = $workingDir . DIRECTORY_SEPARATOR . $target;
                }
                $real = realpath($target);
                if (!$real || !is_dir($real)) {
                    return response()->json(['done' => true, 'exit_code' => 1, 'output' => "cd: no such directory: " . trim($m[1]) . "\n", 'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir)]);
                }
                $baseReal = strtolower(rtrim(str_replace('\\', '/', realpath($workspace->full_path) ?: $workspace->full_path), '/'));
                $normReal = strtolower(rtrim(str_replace('\\', '/', $real), '/'));
                if (!str_starts_with($normReal . '/', $baseReal . '/')) {
                    return response()->json(['done' => true, 'exit_code' => 1, 'output' => "cd: permission denied (outside workspace)\n", 'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir)]);
                }
                $newDir = $real;
            }
            return response()->json(['done' => true, 'exit_code' => 0, 'output' => '', 'working_directory' => $this->relativeWorkspacePath($workspace, $newDir)]);
        }

        // Git commands use SSE but are fast — tell frontend to fall back
        if ($this->isGitCommand($command)) {
            return response()->json(['use_stream' => true]);
        }

        // ── Start background process ──────────────────────────────────────────
        $jobId     = bin2hex(random_bytes(10));
        $tmpDir    = sys_get_temp_dir();
        $outFile   = $tmpDir . DIRECTORY_SEPARATOR . "terminal_{$jobId}.out";
        $exitFile  = $tmpDir . DIRECTORY_SEPARATOR . "terminal_{$jobId}.exit";

        // Touch so polling can start immediately without "file not found"
        file_put_contents($outFile, '');

        if (PHP_OS_FAMILY === 'Windows') {
            $this->startJobWindows($command, $workingDir, $outFile, $exitFile, $jobId);
        } else {
            $this->startJobLinux($command, $workingDir, $outFile, $exitFile, $jobId);
        }

        // Store metadata (10 min TTL — plenty for any command)
        cache()->put("terminal_job_{$jobId}", [
            'workspace_id'      => $workspace->id,
            'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
            'out_file'          => $outFile,
            'exit_file'         => $exitFile,
            'pid_file'          => $tmpDir . DIRECTORY_SEPARATOR . "terminal_{$jobId}.pid",
            'bat_file'          => PHP_OS_FAMILY === 'Windows'
                ? ($tmpDir . DIRECTORY_SEPARATOR . "terminal_{$jobId}.bat")
                : null,
            'started_at'        => now()->toIso8601String(),
        ], 600);

        return response()->json([
            'job_id'            => $jobId,
            'working_directory' => $this->relativeWorkspacePath($workspace, $workingDir),
        ]);
    }

    /**
     * Poll a running job for new output.
     * Returns {output, offset, done, exit_code, working_directory}.
     * Each call takes < 20 ms — PHP is free between polls.
     */
    public function pollJob(Request $request, Workspace $workspace, string $jobId): \Illuminate\Http\JsonResponse
    {
        $this->authorize('update', $workspace);
        $request->session()->save();

        $meta = cache()->get("terminal_job_{$jobId}");
        if (!$meta || $meta['workspace_id'] !== $workspace->id) {
            return response()->json(['error' => 'Job not found'], 404);
        }

        $offset   = max(0, (int) $request->input('offset', 0));
        $outFile  = $meta['out_file'];
        $exitFile = $meta['exit_file'];

        $content = file_exists($outFile) ? (string) file_get_contents($outFile) : '';
        $newChunk = substr($content, $offset);
        $newOffset = strlen($content);

        $done     = file_exists($exitFile);
        $exitCode = null;
        if ($done) {
            $exitCode = (int) trim((string) file_get_contents($exitFile));
            // Clean up temp files
            @unlink($outFile);
            @unlink($exitFile);
            if ($meta['bat_file']) @unlink($meta['bat_file']);
            cache()->forget("terminal_job_{$jobId}");
        }

        return response()->json([
            'output'            => $newChunk,
            'offset'            => $newOffset,
            'done'              => $done,
            'exit_code'         => $exitCode,
            'working_directory' => $done ? $meta['working_directory'] : null,
        ]);
    }

    /**
     * Kill a running background job (Ctrl+C).
     * The runner script wrote runner PID + child PID to the pid file.
     * We kill both with /T (Windows) or SIGTERM (Linux) to stop the whole tree.
     */
    public function killJob(Request $request, Workspace $workspace, string $jobId): \Illuminate\Http\JsonResponse
    {
        $this->authorize('update', $workspace);
        $request->session()->save();

        $meta = cache()->get("terminal_job_{$jobId}");
        if (!$meta || $meta['workspace_id'] !== $workspace->id) {
            return response()->json(['ok' => false]);
        }

        $pidFile = $meta['pid_file'] ?? (sys_get_temp_dir() . DIRECTORY_SEPARATOR . "terminal_{$jobId}.pid");

        if (file_exists($pidFile)) {
            // Runner writes: runnerPid\nchildPid (child PID added after proc_open)
            $pids = array_filter(array_map('intval', explode("\n", (string) file_get_contents($pidFile))));

            foreach ($pids as $pid) {
                if ($pid <= 0) continue;
                if (PHP_OS_FAMILY === 'Windows') {
                    // /T = kill entire process tree, /F = force
                    exec("taskkill /F /T /PID {$pid} 2>NUL");
                } else {
                    // Try process group first (kills children), fall back to single
                    exec("kill -TERM -{$pid} 2>/dev/null; kill -TERM {$pid} 2>/dev/null");
                }
            }
            @unlink($pidFile);
        }

        // Mark job as done with exit code -1 so the poller stops
        @file_put_contents($meta['exit_file'], "-1");
        // Clean up other temp files
        @unlink($meta['out_file'] ?? '');
        if ($meta['bat_file'] ?? null) @unlink($meta['bat_file']);
        cache()->forget("terminal_job_{$jobId}");

        return response()->json(['ok' => true]);
    }

    /**
     * Path to the PHP runner script used for background jobs.
     */
    protected function runnerScript(): string
    {
        return storage_path('app/terminal_runner.php');
    }

    protected function startJobWindows(string $command, string $cwd, string $outFile, string $exitFile, string $jobId): void
    {
        $tmpDir  = sys_get_temp_dir();
        $pidFile = $tmpDir . DIRECTORY_SEPARATOR . "terminal_{$jobId}.pid";
        $batFile = $tmpDir . DIRECTORY_SEPARATOR . "terminal_{$jobId}.bat";

        $phpBin    = str_replace('/', '\\', PHP_BINARY);
        $runner    = str_replace('/', '\\', $this->runnerScript());
        $encodedCmd = base64_encode($command);

        // Set env vars then launch runner via start /B (truly backgrounded)
        $envLines = '';
        foreach ($this->buildWindowsEnv() as $k => $v) {
            $escaped = str_replace('"', '""', $v);
            $envLines .= "SET \"{$k}={$escaped}\"\r\n";
        }

        $bat = "@echo off\r\n{$envLines}\"{$phpBin}\" \"{$runner}\" \"{$jobId}\" \"{$encodedCmd}\" \"{$cwd}\" \"{$outFile}\" \"{$exitFile}\" \"{$pidFile}\"\r\n";
        file_put_contents($batFile, $bat);

        $handle = popen("start /B /MIN cmd /C \"{$batFile}\"", 'r');
        if ($handle) pclose($handle);
    }

    protected function startJobLinux(string $command, string $cwd, string $outFile, string $exitFile, string $jobId): void
    {
        $tmpDir  = sys_get_temp_dir();
        $pidFile = $tmpDir . DIRECTORY_SEPARATOR . "terminal_{$jobId}.pid";

        $phpBin     = PHP_BINARY;
        $runner     = $this->runnerScript();
        $encodedCmd = base64_encode($command);

        $extraPath   = (string) config('workspaces.extra_path', '');
        $currentPath = getenv('PATH') ?: '/usr/local/bin:/usr/bin:/bin';
        $homeDir     = getenv('HOME') ?: '';
        $path = implode(':', array_unique(array_filter([
            $extraPath ?: null,
            $homeDir ? $homeDir . '/.local/bin' : null,
            '/usr/local/bin', '/usr/bin', '/bin',
            $currentPath,
        ])));

        $cmd = implode(' ', array_map('escapeshellarg', [
            $phpBin, $runner, $jobId, $encodedCmd, $cwd, $outFile, $exitFile, $pidFile,
        ]));

        exec("PATH=" . escapeshellarg($path) . " HOME=" . escapeshellarg($homeDir ?: '/root') . " nohup {$cmd} > /dev/null 2>&1 &");
    }

    /**
     * Build a Process for the given shell command.
     * On Windows, runs through Git Bash so Unix commands (ls, cat, grep, npm, etc.) work.
     * On Linux/macOS, uses the system shell directly.
     */
    protected function buildProcess(string $command, string $workingDir): Process
    {
        $timeout = (int) config('workspaces.terminal_timeout', 300);

        if (PHP_OS_FAMILY === 'Windows') {
            return Process::fromShellCommandline(
                $command, $workingDir,
                $this->buildWindowsEnv(), null, $timeout
            );
        }

        // ── Linux / macOS / cPanel ───────────────────────────────────────────────
        // PHP-FPM / www-data / cPanel user processes all have a minimal PATH.
        // We build a comprehensive PATH from multiple sources so node/npm/yarn
        // are found without requiring the user to set WORKSPACE_EXTRA_PATH.

        $extraPath   = (string) config('workspaces.extra_path', '');
        $currentPath = getenv('PATH') ?: '/usr/local/bin:/usr/bin:/bin';
        $homeDir     = getenv('HOME') ?: posix_getpwuid(posix_getuid())['dir'] ?? '';

        // --- 1. Ask the shell where node is (cheapest reliable check) ----------
        $nodeBinDir = null;
        $whichNode  = @shell_exec('which node 2>/dev/null');
        if ($whichNode) {
            $nodeBinDir = dirname(trim($whichNode));
        }

        // --- 2. nvm installations -----------------------------------------------
        // Collect all /home/*/  dirs so we cover cPanel accounts too.
        $homeDirs = array_filter(array_unique(array_merge(
            [$homeDir, '/root'],
            (array) glob('/home/*', GLOB_ONLYDIR) ?: [],
            ['/home/www-data', '/var/www'],
        )));

        $nvmBins = [];
        foreach ($homeDirs as $hd) {
            $nvmVersions = $hd . '/.nvm/versions/node';
            if (!is_dir($nvmVersions)) continue;
            $bins = array_filter((array) glob($nvmVersions . '/*/bin'), 'is_dir');
            if ($bins) {
                rsort($bins); // highest version first
                $nvmBins[] = $bins[0];
                // Also add the npm global bin for this user
                $npmGlobal = $hd . '/.npm-global/bin';
                if (is_dir($npmGlobal)) {
                    $nvmBins[] = $npmGlobal;
                }
                break; // one user's nvm is enough
            }
        }

        // --- 3. cPanel nodevenv (created by cPanel's "Setup Node.js App") ------
        // Layout: ~/nodevenv/<app_name>/<node_version>/bin
        $cPanelNodeBins = [];
        foreach ($homeDirs as $hd) {
            $nodevenv = $hd . '/nodevenv';
            if (!is_dir($nodevenv)) continue;
            $bins = array_filter((array) glob($nodevenv . '/*/*/bin'), 'is_dir');
            if ($bins) {
                rsort($bins);
                $cPanelNodeBins[] = $bins[0];
                break;
            }
        }

        // --- 4. Standard + user local paths ------------------------------------
        $standardPaths = array_filter([
            $homeDir ? $homeDir . '/.local/bin' : null,
            '/usr/local/bin',
            '/usr/bin',
            '/bin',
            '/usr/local/sbin',
            '/usr/sbin',
            '/sbin',
        ]);

        // Merge: extra (highest priority) → which node → nvm → nodevenv → standard → current
        $pathParts = array_filter(array_merge(
            $extraPath !== '' ? [$extraPath] : [],
            $nodeBinDir ? [$nodeBinDir] : [],
            $nvmBins,
            $cPanelNodeBins,
            $standardPaths,
            [$currentPath],
        ));

        $env = [
            'PATH'        => implode(':', array_unique($pathParts)),
            'HOME'        => $homeDir ?: '/root',
            'FORCE_COLOR' => '1',
            'TERM'        => 'xterm-256color',
        ];

        // bash -l (login shell) loads ~/.bash_profile / ~/.profile so nvm
        // initialises itself — the most reliable method on shared/cPanel hosts.
        // Fall back to /bin/sh if bash is unavailable.
        $shell = is_executable('/bin/bash') ? '/bin/bash' : '/bin/sh';
        $shellArgs = ($shell === '/bin/bash')
            ? [$shell, '-l', '-c', $command]
            : [$shell, '-c', $command];

        return new Process($shellArgs, $workingDir, $env, null, $timeout);
    }

    /**
     * Build a complete Windows environment array for subprocesses.
     *
     * PHP artisan serve may be started from Git Bash, VSCode terminal, or any shell
     * that has an incomplete or Unix-style PATH — meaning C:\Windows\System32
     * (netstat, findstr, tasklist, etc.) and the Node.js directory may be absent.
     *
     * Passing null env to proc_open inherits that broken PATH.
     * This method builds PATH explicitly with guaranteed system dirs + Node.js,
     * then preserves all other critical Windows env vars so SYSTEMROOT/TEMP/etc.
     * are always available to cmd.exe subprocesses.
     */
    protected function buildWindowsEnv(): array
    {
        $systemRoot  = getenv('SYSTEMROOT') ?: 'C:\\Windows';
        $currentPath = getenv('PATH') ?: '';

        // Dirs that MUST be in PATH for Windows commands to work
        $mustHave = [
            $systemRoot . '\\System32',          // netstat, findstr, tasklist, where, …
            $systemRoot,                          // cmd.exe itself
            $systemRoot . '\\System32\\Wbem',    // wmic
        ];

        // Add Node.js directory (npm, node, npx, …)
        $nodeDirs = $this->detectNodePathsWindows();
        foreach ($nodeDirs as $d) {
            $mustHave[] = $d;
        }

        // Also scan nvm-windows symlink folder (APPDATA\nvm\nodejs)
        $appData = getenv('APPDATA') ?: '';
        if ($appData && is_dir($appData . '\\nvm\\nodejs')) {
            $mustHave[] = $appData . '\\nvm\\nodejs';
        }
        if ($appData && is_dir($appData . '\\npm')) {
            $mustHave[] = $appData . '\\npm'; // global npm bins
        }

        // Merge: mustHave first (highest priority), then inherited PATH entries
        $parts = array_filter(explode(';', $currentPath));
        foreach (array_reverse($mustHave) as $dir) {
            $key = strtolower(rtrim(str_replace('/', '\\', $dir), '\\'));
            $exists = false;
            foreach ($parts as $p) {
                if (strtolower(rtrim(str_replace('/', '\\', $p), '\\')) === $key) {
                    $exists = true;
                    break;
                }
            }
            if (!$exists) {
                array_unshift($parts, $dir);
            }
        }

        $newPath = implode(';', $parts);

        // Return a complete env array — only variables that exist in the current process.
        // Symfony Process replaces the entire env when a non-null array is passed to
        // proc_open, so we must include all Windows vars cmd.exe needs.
        $env = ['PATH' => $newPath];
        foreach ([
            'SYSTEMROOT', 'SYSTEMDRIVE', 'WINDIR', 'COMSPEC',
            'TEMP', 'TMP',
            'USERNAME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA',
            'HOMEDRIVE', 'HOMEPATH',
            'COMPUTERNAME', 'OS',
            'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE',
        ] as $var) {
            $val = getenv($var);
            if ($val !== false && $val !== '') {
                $env[$var] = $val;
            }
        }

        // Defaults for vars that might be missing (e.g. when started from Git Bash)
        $env += [
            'SYSTEMROOT' => $systemRoot,
            'SYSTEMDRIVE' => getenv('SYSTEMDRIVE') ?: 'C:',
            'WINDIR'     => $systemRoot,
            'COMSPEC'    => $systemRoot . '\\system32\\cmd.exe',
            'OS'         => 'Windows_NT',
        ];

        return $env;
    }

    /**
     * Detect common Node.js / npm installation directories on Windows.
     * Returns an array of existing directory paths to prepend to PATH.
     */
    protected function detectNodePathsWindows(): array
    {
        $candidates = [];

        // 1. Admin-configured override via .env / config
        $configured = (string) config('workspaces.node_path_windows', '');
        if ($configured !== '') {
            foreach (explode(';', $configured) as $p) {
                $p = trim($p);
                if ($p !== '' && is_dir($p)) {
                    $candidates[] = $p;
                }
            }
            if (!empty($candidates)) {
                return $candidates; // trust the explicit config
            }
        }

        // 2. Ask `where node` — fastest when node is already in the server's PATH
        $whereOutput = shell_exec('where node 2>NUL');
        if ($whereOutput) {
            foreach (explode("\n", trim($whereOutput)) as $line) {
                $line = trim($line);
                if ($line !== '' && is_file($line)) {
                    $dir = dirname($line);
                    if (!in_array($dir, $candidates, true)) {
                        $candidates[] = $dir;
                    }
                }
            }
        }

        if (!empty($candidates)) {
            return $candidates;
        }

        // 3. Well-known installation locations
        $userProfile = getenv('USERPROFILE') ?: 'C:\\Users\\' . (getenv('USERNAME') ?: 'User');
        $appData     = getenv('APPDATA')     ?: $userProfile . '\\AppData\\Roaming';
        $localApp    = getenv('LOCALAPPDATA') ?: $userProfile . '\\AppData\\Local';

        $wellKnown = [
            'C:\\Program Files\\nodejs',
            'C:\\Program Files (x86)\\nodejs',
            $appData  . '\\npm',                   // global npm bin
            $localApp . '\\Programs\\nodejs',
        ];

        // nvm-windows stores each version under %APPDATA%\nvm\vX.Y.Z
        $nvmRoot = $appData . '\\nvm';
        if (is_dir($nvmRoot)) {
            $versions = array_filter((array) glob($nvmRoot . '\\v*'), 'is_dir');
            if ($versions) {
                rsort($versions); // highest version first
                $wellKnown[] = $versions[0];
                // also add the global npm bin which nvm-windows puts here
                $wellKnown[] = $appData . '\\npm';
            }
        }

        foreach ($wellKnown as $dir) {
            if (is_dir($dir) && !in_array($dir, $candidates, true)) {
                $candidates[] = $dir;
            }
        }

        return $candidates;
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
            @ob_implicit_flush(true);

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
