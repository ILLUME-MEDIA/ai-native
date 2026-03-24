<?php

namespace App\Jobs;

use App\Models\DeployLog;
use App\Models\DeployProject;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use ZipArchive;

class RunDeployJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;

    public function __construct(
        public int $projectId,
        public int $logId,
        public ?string $commitHash = null,
        public ?string $commitMessage = null,
    ) {}

    public function handle(): void
    {
        $project = DeployProject::find($this->projectId);
        $log     = DeployLog::find($this->logId);

        if (!$project || !$log) return;

        $log->update(['status' => 'running']);
        $started = now();
        $lines   = [];

        // Zip/extract paths — declared here so finally can clean them up
        $zipPath    = null;
        $extractDir = null;

        try {
            $this->log($lines, "=== Deploy started: {$project->name} ===");
            $this->log($lines, "Branch: {$project->branch} | Framework: " . ($project->framework ?: 'auto'));
            $this->flush($log, $lines);

            // Use a dir outside the web app root so build tools (rsbuild/vite) don't
            // traverse up and pick up our own postcss.config.js.
            // /tmp is noexec on cPanel, so use ~/deploy_tmp instead.
            if (PHP_OS_FAMILY === 'Windows') {
                $deployTmpDir = sys_get_temp_dir();
            } else {
                $home = rtrim(getenv('HOME') ?: dirname(dirname(base_path())), '/');
                $deployTmpDir = $home . '/deploy_tmp';
                if (!is_dir($deployTmpDir)) {
                    @mkdir($deployTmpDir, 0755, true);
                }
            }
            $tmpBase    = $deployTmpDir . '/deploy_' . $project->id . '_' . time();
            $zipPath    = $tmpBase . '.zip';
            $extractDir = $tmpBase . '_src';

            // ── 1. Get latest commit hash from GitHub API ────────────────────
            $this->checkStopped();
            $this->log($lines, "\n[1/5] Fetching latest commit info...");
            $this->flush($log, $lines);
            $commitHash = $this->commitHash ?? $this->fetchHeadCommit($project, $lines);
            if ($commitHash) {
                $log->update(['commit_hash' => substr($commitHash, 0, 40)]);
            }
            $this->flush($log, $lines);

            // ── 2. Download repo ZIP ─────────────────────────────────────────
            $this->checkStopped();
            $this->log($lines, "\n[2/5] Downloading repository...");
            $this->flush($log, $lines);
            $this->downloadRepo($project, $zipPath, $lines);
            $this->flush($log, $lines);

            // ── 3. Extract ───────────────────────────────────────────────────
            $this->checkStopped();
            $this->log($lines, "\n[3/5] Extracting...");
            $this->flush($log, $lines);
            $sourceDir = $this->extractZip($zipPath, $extractDir, $lines);
            $this->flush($log, $lines);

            // ── 4. Build (if build_command is set) ───────────────────────────
            $deployDir = $sourceDir;
            if ($project->build_command) {
                $this->checkStopped();
                $this->log($lines, "\n[4/5] Building — {$project->build_command}");
                $this->flush($log, $lines);
                $this->runBuild($project, $sourceDir, $lines, $log);

                $outDir    = $project->build_output_dir ?: 'dist';
                $deployDir = rtrim($sourceDir, '/') . '/' . ltrim($outDir, '/');

                if (!is_dir($deployDir)) {
                    throw new \RuntimeException(
                        "Build output dir '{$outDir}' not found after build.\n" .
                        "Contents: " . implode(', ', array_diff(scandir($sourceDir) ?: [], ['.', '..']))
                    );
                }
                $this->log($lines, "Build output dir: {$outDir}");
                $this->flush($log, $lines);
            } else {
                $this->log($lines, "\n[4/5] No build step — uploading source directly.");
                $this->flush($log, $lines);
            }

            // ── 5. FTP Upload ────────────────────────────────────────────────
            $this->checkStopped();
            $this->log($lines, "\n[5/5] Uploading to {$project->ftp_path}...");
            $this->flush($log, $lines);
            $uploaded = $this->ftpUpload($project, $deployDir, $lines);

            $this->log($lines, "\n=== Deploy complete. {$uploaded} files uploaded. ===");

            $log->update([
                'status'          => 'success',
                'commit_hash'     => $commitHash ? substr($commitHash, 0, 40) : $log->commit_hash,
                'output'          => implode("\n", $lines),
                'duration_seconds'=> max(0, abs((int) now()->diffInSeconds($started))),
            ]);

            $project->update([
                'status'           => 'success',
                'last_deployed_at' => now(),
                'last_commit_hash' => $commitHash ? substr($commitHash, 0, 40) : $project->last_commit_hash,
            ]);

        } catch (\Throwable $e) {
            $stopped = $e instanceof \App\Exceptions\DeployStoppedException;
            $this->log($lines, $stopped ? "\n[WARN] Deploy stopped by user." : "\n[ERROR] " . $e->getMessage());

            $log->update([
                'status'          => $stopped ? 'cancelled' : 'failed',
                'output'          => implode("\n", $lines),
                'duration_seconds'=> max(0, abs((int) now()->diffInSeconds($started))),
            ]);
            $project->update(['status' => $stopped ? 'idle' : 'failed']);

        } finally {
            if ($zipPath && file_exists($zipPath))   @unlink($zipPath);
            if ($extractDir && is_dir($extractDir))  $this->removeDir($extractDir);
        }
    }

    // ── Fetch HEAD commit ──────────────────────────────────────────────────────

    private function fetchHeadCommit(DeployProject $project, array &$lines): ?string
    {
        [$owner, $repo] = $project->getOwnerRepo();
        if (!$owner || !$repo) return null;

        $resp = Http::withHeaders($this->githubHeaders($project))
            ->get("https://api.github.com/repos/{$owner}/{$repo}/commits/{$project->branch}");

        if ($resp->successful()) {
            $sha = $resp->json('sha');
            $msg = $resp->json('commit.message') ?? '';
            $this->log($lines, "Commit: " . substr($sha ?? '', 0, 7) . " — " . strtok($msg, "\n"));
            return $sha;
        }
        $this->log($lines, "[WARN] Could not fetch commit info (" . $resp->status() . ")");
        return null;
    }

    // ── Download ───────────────────────────────────────────────────────────────

    private function downloadRepo(DeployProject $project, string $zipPath, array &$lines): void
    {
        [$owner, $repo] = $project->getOwnerRepo();
        if (!$owner || !$repo) throw new \RuntimeException('Cannot parse owner/repo from URL.');

        $url  = "https://api.github.com/repos/{$owner}/{$repo}/zipball/{$project->branch}";
        $resp = Http::withHeaders($this->githubHeaders($project))
            ->withOptions(['allow_redirects' => true, 'timeout' => 120])
            ->get($url);

        if (!$resp->successful()) {
            throw new \RuntimeException("GitHub download error {$resp->status()}: " . $resp->body());
        }

        file_put_contents($zipPath, $resp->body());
        $this->log($lines, "Downloaded " . round(filesize($zipPath) / 1024) . " KB.");
    }

    // ── Extract ────────────────────────────────────────────────────────────────

    private function extractZip(string $zipPath, string $extractDir, array &$lines): string
    {
        if (!class_exists('ZipArchive')) {
            throw new \RuntimeException('PHP ZipArchive extension is required.');
        }

        $zip = new ZipArchive();
        if ($zip->open($zipPath) !== true) {
            throw new \RuntimeException('Failed to open ZIP archive.');
        }

        @mkdir($extractDir, 0755, true);
        $zip->extractTo($extractDir);
        $zip->close();

        // GitHub wraps content in "owner-repo-{sha}/" — unwrap it
        $dirs      = glob($extractDir . '/*', GLOB_ONLYDIR);
        $sourceDir = (count($dirs) === 1) ? $dirs[0] : $extractDir;

        $count = iterator_count(
            new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($sourceDir, \FilesystemIterator::SKIP_DOTS)
            )
        );
        $this->log($lines, "Extracted {$count} files.");
        return $sourceDir;
    }

    // ── Build ──────────────────────────────────────────────────────────────────

    private function runBuild(DeployProject $project, string $dir, array &$lines, DeployLog $log): void
    {
        // CI=true makes build tools (Vite, CRA, etc.) switch to non-interactive mode:
        // no spinners, no progress bars, and — crucially — line-buffered stdout instead
        // of the fully-buffered mode they use when no TTY is detected.
        $env = array_merge(getenv() ?: [], ['CI' => 'true']);

        if ($project->node_path) {
            $nodePath    = rtrim($project->node_path, '/\\');
            $sep         = PHP_OS_FAMILY === 'Windows' ? ';' : ':';
            $env['PATH'] = $nodePath . $sep . ($env['PATH'] ?? getenv('PATH') ?: '');
        }

        // Log node/npm version first — helps diagnose version-incompatibility hangs.
        // Vite requires Node >=14, react-scripts requires >=14, etc.
        // If node is too old the build will hang with zero output.
        $this->execCmd('node --version && npm --version 2>&1', $dir, $lines, $env, $log);

        $this->execCmd('npm install --prefer-offline 2>&1', $dir, $lines, $env, $log);
        $this->execCmd($project->build_command . ' 2>&1',   $dir, $lines, $env, $log);
    }

    /**
     * Run a shell command, streaming its stdout/stderr to $lines in real-time.
     * Flushes to DB every 500 ms so the frontend can show live output.
     * Respects the stop-deploy flag and terminates the subprocess when signalled.
     * Throws RuntimeException if the command exits with a non-zero code.
     * Throws DeployStoppedException if the user requests a stop while running.
     *
     * @param  int $timeout  Max seconds to wait (default 600 = 10 min). Prevents
     *                        hung builds (e.g. Node version incompatibility) from
     *                        blocking the worker indefinitely.
     */
    private function execCmd(string $cmd, string $cwd, array &$lines, array $env = [], ?DeployLog $log = null, int $timeout = 600): void
    {
        $descriptors = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
        $procEnv     = $env ?: null; // null = inherit parent environment

        // On Linux we write the exit code to a temp file so we can read it after
        // the process ends.  This is necessary because many cPanel/shared-hosting
        // servers compile PHP with --enable-sigchild, which makes proc_close()
        // and proc_get_status()['exitcode'] always return -1 regardless of the
        // real exit code.  Writing it via the shell itself is always reliable.
        $exitFile = null;

        if (PHP_OS_FAMILY === 'Windows') {
            $shell = 'cmd /c ' . $cmd;
        } else {
            // stdbuf forces line-buffered stdout/stderr so we can stream output in
            // real-time even when the child process is running inside a pipe (no TTY).
            // This pairs with CI=true (set in runBuild) for maximum compatibility.
            $stdbuf = file_exists('/usr/bin/stdbuf') ? '/usr/bin/stdbuf'
                    : (file_exists('/bin/stdbuf')     ? '/bin/stdbuf' : null);
            $prefix = $stdbuf ? "{$stdbuf} -oL -eL " : '';

            $exitFile = sys_get_temp_dir() . '/dep_exit_' . $this->logId . '_' . getmypid();
            // Subshell so the exit code of CMD is captured even when CMD uses set -e
            $shell = $prefix . 'bash -c ' . escapeshellarg("({$cmd}); echo \$? > " . escapeshellarg($exitFile));
        }

        $proc = proc_open($shell, $descriptors, $pipes, $cwd, $procEnv);

        if (!is_resource($proc)) {
            throw new \RuntimeException("Failed to start process: {$cmd}");
        }

        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $lastFlush = microtime(true);
        $startedAt = microtime(true);
        $tick      = 0;

        // Stream output line-by-line so the frontend sees live logs
        while (true) {
            $status = proc_get_status($proc);

            $out = fread($pipes[1], 8192) ?: '';
            $err = fread($pipes[2], 8192) ?: '';

            if ($out !== '') {
                foreach (explode("\n", rtrim($out, "\n")) as $line) {
                    if ($line !== '') $this->log($lines, $line);
                }
            }
            if ($err !== '') {
                foreach (explode("\n", rtrim($err, "\n")) as $line) {
                    if ($line !== '') $this->log($lines, '[stderr] ' . $line);
                }
            }

            // Flush to DB every 500 ms so the frontend polling can show live output
            if ($log && (microtime(true) - $lastFlush) >= 0.5) {
                $this->flush($log, $lines);
                $lastFlush = microtime(true);
            }

            // Every ~1 s: check stop signal and enforce timeout
            if (++$tick % 10 === 0) {
                // Stop signal from user — kill subprocess immediately
                if (Cache::has("deploy_stop_{$this->projectId}")) {
                    Cache::forget("deploy_stop_{$this->projectId}");
                    $this->killProc($proc, $pipes, $exitFile);
                    throw new \App\Exceptions\DeployStoppedException();
                }

                // Hard timeout — prevents hung builds from blocking the worker forever
                $elapsed = (int)(microtime(true) - $startedAt);
                if ($elapsed >= $timeout) {
                    $this->log($lines, "[ERROR] Command timed out after {$elapsed}s — killed.");
                    if ($log) $this->flush($log, $lines);
                    $this->killProc($proc, $pipes, $exitFile);
                    throw new \RuntimeException("Command timed out ({$timeout}s): {$cmd}");
                }
            }

            if (!$status['running']) break;

            usleep(100_000); // 100 ms
        }

        // Drain any remaining bytes after process exits
        stream_set_blocking($pipes[1], true);
        stream_set_blocking($pipes[2], true);
        $rem1 = stream_get_contents($pipes[1]);
        $rem2 = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        if ($rem1) foreach (explode("\n", rtrim($rem1, "\n")) as $line) if ($line !== '') $this->log($lines, $line);
        if ($rem2) foreach (explode("\n", rtrim($rem2, "\n")) as $line) if ($line !== '') $this->log($lines, '[stderr] ' . $line);

        if ($log) $this->flush($log, $lines);

        proc_close($proc); // frees resources; return value is unreliable on --enable-sigchild builds

        // Read the real exit code from the temp file (Linux only).
        // Fall back to 0 if the file is missing (e.g. process was killed before writing).
        $exitCode = 0;
        if ($exitFile) {
            if (file_exists($exitFile)) {
                $exitCode = (int)trim(file_get_contents($exitFile));
                @unlink($exitFile);
            }
            // If the file is absent the process was likely killed (stop/timeout) and an
            // exception was already thrown above — treat as 0 to avoid a double error.
        }

        if ($exitCode !== 0) {
            throw new \RuntimeException("Command exited with code {$exitCode}: {$cmd}");
        }
    }

    // ── FTP Upload ─────────────────────────────────────────────────────────────

    private function ftpUpload(DeployProject $project, string $localDir, array &$lines): int
    {
        $host = $project->getPlainFtpHost();
        $user = $project->getPlainFtpUsername();
        $pass = $project->getPlainFtpPassword();
        $port = $project->ftp_port ?: 21;
        $path = rtrim($project->ftp_path ?: '/', '/') . '/';

        if (!$host || !$user || !$pass) {
            throw new \RuntimeException('FTP credentials not fully configured.');
        }

        $ftp = $project->ftp_ssl
            ? @ftp_ssl_connect($host, $port, 30)
            : @ftp_connect($host, $port, 30);

        if (!$ftp) throw new \RuntimeException("FTP connection failed: {$host}:{$port}");

        if (!ftp_login($ftp, $user, $pass)) {
            ftp_close($ftp);
            throw new \RuntimeException("FTP login failed for user: {$user}");
        }

        ftp_pasv($ftp, true);
        $this->log($lines, "FTP connected to {$host}:{$port} → {$path}");

        $count = $this->ftpUploadDir($ftp, $localDir, $path, $lines);
        ftp_close($ftp);
        return $count;
    }

    private function ftpUploadDir($ftp, string $localDir, string $remotePath, array &$lines): int
    {
        $count = 0;
        foreach (scandir($localDir) as $item) {
            if ($item === '.' || $item === '..') continue;

            // Check stop flag every file
            $this->checkStopped();

            $local  = $localDir . '/' . $item;
            $remote = $remotePath . $item;

            if (is_dir($local)) {
                @ftp_mkdir($ftp, $remote);
                $count += $this->ftpUploadDir($ftp, $local, $remote . '/', $lines);
            } else {
                if (ftp_put($ftp, $remote, $local, FTP_BINARY)) {
                    $count++;
                } else {
                    $this->log($lines, "[WARN] Upload failed: {$remote}");
                }
            }
        }
        return $count;
    }

    // ── Utils ──────────────────────────────────────────────────────────────────

    private function githubHeaders(DeployProject $project): array
    {
        $h = ['Accept' => 'application/vnd.github+json', 'User-Agent' => 'DeployManager/1.0'];
        $token = $project->getPlainToken();
        if ($token) $h['Authorization'] = "token {$token}";
        return $h;
    }

    private function checkStopped(): void
    {
        if (Cache::has("deploy_stop_{$this->projectId}")) {
            Cache::forget("deploy_stop_{$this->projectId}");
            throw new \App\Exceptions\DeployStoppedException();
        }
    }

    /**
     * Terminate a running subprocess and close its pipes.
     * Sends SIGTERM first, then SIGKILL after 500 ms if still running.
     * On Linux we kill the entire process group so child processes
     * (bash → npm → node) are all cleaned up.
     */
    private function killProc($proc, array $pipes, ?string $exitFile = null): void
    {
        if (PHP_OS_FAMILY !== 'Windows') {
            $pid = proc_get_status($proc)['pid'] ?? null;
            if ($pid) {
                // Negative PID = signal the whole process group
                @posix_kill(-$pid, 15); // SIGTERM
                usleep(500_000);
                if (@proc_get_status($proc)['running']) {
                    @posix_kill(-$pid, 9); // SIGKILL
                }
            }
        }
        foreach ($pipes as $pipe) {
            if (is_resource($pipe)) @fclose($pipe);
        }
        @proc_terminate($proc);
        @proc_close($proc);
        if ($exitFile && file_exists($exitFile)) @unlink($exitFile);
    }

    private function flush(DeployLog $log, array $lines): void
    {
        $log->update(['output' => implode("\n", $lines)]);
    }

    private function log(array &$lines, string $text): void
    {
        $lines[] = '[' . date('H:i:s') . '] ' . $text;
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) return;
        foreach (scandir($dir) as $f) {
            if ($f === '.' || $f === '..') continue;
            $p = $dir . '/' . $f;
            is_dir($p) ? $this->removeDir($p) : @unlink($p);
        }
        @rmdir($dir);
    }
}
