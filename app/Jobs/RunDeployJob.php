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

            $tmpBase    = sys_get_temp_dir() . '/deploy_' . $project->id . '_' . time();
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
                $this->runBuild($project, $sourceDir, $lines);

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
                'duration_seconds'=> (int) now()->diffInSeconds($started),
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
                'duration_seconds'=> (int) now()->diffInSeconds($started),
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

    private function runBuild(DeployProject $project, string $dir, array &$lines): void
    {
        // Build an env array so node_path works cross-platform without shell-specific syntax
        $env = [];
        if ($project->node_path) {
            $nodePath = rtrim($project->node_path, '/\\');
            $sep      = PHP_OS_FAMILY === 'Windows' ? ';' : ':';
            $env      = array_merge(getenv() ?: [], ['PATH' => $nodePath . $sep . (getenv('PATH') ?: '')]);
        }

        $this->execCmd('npm install --prefer-offline 2>&1', $dir, $lines, $env);
        $this->execCmd($project->build_command . ' 2>&1',   $dir, $lines, $env);
    }

    private function execCmd(string $cmd, string $cwd, array &$lines, array $env = []): void
    {
        $descriptors = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
        $procEnv     = $env ?: null; // null = inherit parent environment

        if (PHP_OS_FAMILY === 'Windows') {
            $shell = 'cmd /c ' . $cmd;
        } else {
            $shell = 'bash -c ' . escapeshellarg($cmd);
        }

        $proc = proc_open($shell, $descriptors, $pipes, $cwd, $procEnv);

        if (!is_resource($proc)) {
            throw new \RuntimeException("Failed to start process: {$cmd}");
        }

        fclose($pipes[0]);
        $stdout   = stream_get_contents($pipes[1]);
        $stderr   = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exitCode = proc_close($proc);

        if ($stdout) $this->log($lines, trim($stdout));
        if ($stderr)  $this->log($lines, "[stderr] " . trim($stderr));

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
