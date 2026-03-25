<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\RunDeployJob;
use App\Models\DeployLog;
use App\Models\DeployProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class DeployController extends Controller
{
    // ── Projects CRUD ─────────────────────────────────────────────────────────

    public function index()
    {
        try {
            $projects = DeployProject::latest()->get()->map(fn($p) => $p->toApiArray());
            return response()->json($projects);
        } catch (\Throwable $e) {
            \Log::error('DeployController@index failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error'   => true,
                'message' => 'Failed to load projects: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function store(Request $r)
    {
        $data = $r->validate([
            'name'             => 'required|string|max:100',
            'repo_url'         => 'required|url|max:255',
            'github_token'     => 'nullable|string|max:255',
            'branch'           => 'nullable|string|max:100',
            'framework'        => 'nullable|string|max:30',
            'build_command'    => 'nullable|string|max:255',
            'build_output_dir' => 'nullable|string|max:100',
            'node_path'        => 'nullable|string|max:255',
            'ftp_host'         => 'nullable|string|max:255',
            'ftp_username'     => 'nullable|string|max:255',
            'ftp_password'     => 'nullable|string|max:255',
            'ftp_path'         => 'nullable|string|max:255',
            'ftp_port'         => 'nullable|integer|min:1|max:65535',
            'ftp_ssl'          => 'nullable|boolean',
            'auto_deploy'      => 'nullable|boolean',
            'deploy_mode'      => 'nullable|in:webhook,poll',
            'poll_interval'    => 'nullable|integer|min:1|max:60',
        ]);

        $project = DeployProject::create($data);
        return response()->json($project->toApiArray(), 201);
    }

    public function update(Request $r, $id)
    {
        $project = DeployProject::findOrFail($id);

        $data = $r->validate([
            'name'             => 'sometimes|string|max:100',
            'repo_url'         => 'sometimes|url|max:255',
            'github_token'     => 'nullable|string|max:255',
            'branch'           => 'nullable|string|max:100',
            'framework'        => 'nullable|string|max:30',
            'build_command'    => 'nullable|string|max:255',
            'build_output_dir' => 'nullable|string|max:100',
            'node_path'        => 'nullable|string|max:255',
            'ftp_host'         => 'nullable|string|max:255',
            'ftp_username'     => 'nullable|string|max:255',
            'ftp_password'     => 'nullable|string|max:255',
            'ftp_path'         => 'nullable|string|max:255',
            'ftp_port'         => 'nullable|integer|min:1|max:65535',
            'ftp_ssl'          => 'nullable|boolean',
            'auto_deploy'      => 'nullable|boolean',
            'deploy_mode'      => 'nullable|in:webhook,poll',
            'poll_interval'    => 'nullable|integer|min:1|max:60',
        ]);

        // Never overwrite secrets with empty string
        foreach (['github_token', 'ftp_password', 'ftp_host', 'ftp_username'] as $f) {
            if (array_key_exists($f, $data) && ($data[$f] === '' || $data[$f] === null)) {
                unset($data[$f]);
            }
        }

        $project->update($data);
        return response()->json($project->fresh()->toApiArray());
    }

    public function destroy($id)
    {
        DeployProject::findOrFail($id)->delete();
        return response()->json(['deleted' => true]);
    }

    // ── Logs ──────────────────────────────────────────────────────────────────

    public function logs($id)
    {
        $project = DeployProject::findOrFail($id);
        return response()->json(
            $project->logs()->limit(30)->get()
                ->map(fn($l) => [
                    'id'              => $l->id,
                    'status'          => $l->status,
                    'commit_hash'     => $l->commit_hash,
                    'commit_message'  => $l->commit_message,
                    'branch'          => $l->branch,
                    'triggered_by'    => $l->triggered_by,
                    'output'          => $l->output,
                    'duration_seconds'=> $l->duration_seconds,
                    'created_at'      => $l->created_at?->toISOString(),
                ])
        );
    }

    // ── Detect Node.js on this server ────────────────────────────────────────

    public function detectNode()
    {
        $home = rtrim(getenv('HOME') ?: dirname(dirname(base_path())), '/');

        $searchPatterns = [
            '/usr/local/bin/node',
            '/usr/bin/node',
            '/bin/node',
            '/opt/alt/node*/bin/node',
            '/opt/cpanel/ea-nodejs*/bin/node',
            '/opt/nodejs*/bin/node',
            $home . '/.nvm/versions/node/*/bin/node',
            $home . '/nodevenv/*/*/bin/node',
            '/usr/local/nvm/versions/node/*/bin/node',
        ];

        $found = [];
        $checked = [];

        foreach ($searchPatterns as $pattern) {
            $bins = glob($pattern) ?: [];
            // If no glob chars, check directly
            if (empty($bins) && !str_contains($pattern, '*') && file_exists($pattern)) {
                $bins = [$pattern];
            }
            foreach ($bins as $bin) {
                if (isset($checked[$bin])) continue;
                $checked[$bin] = true;
                $ver = trim(shell_exec("{$bin} --version 2>/dev/null") ?? '');
                if (!$ver) continue;
                $found[] = [
                    'path'    => dirname($bin),
                    'bin'     => $bin,
                    'version' => $ver,
                    'ok'      => version_compare(ltrim($ver, 'v'), '18.0.0', '>='),
                ];
            }
        }

        // Fallback: which node
        $whichNode = trim(shell_exec('which node 2>/dev/null') ?? '');
        if ($whichNode && !isset($checked[$whichNode]) && file_exists($whichNode)) {
            $ver = trim(shell_exec("{$whichNode} --version 2>/dev/null") ?? '');
            if ($ver) {
                $found[] = [
                    'path'    => dirname($whichNode),
                    'bin'     => $whichNode,
                    'version' => $ver,
                    'ok'      => version_compare(ltrim($ver, 'v'), '18.0.0', '>='),
                ];
            }
        }

        // Sort: ok (>=18) first, then by version descending
        usort($found, fn($a, $b) =>
            $b['ok'] <=> $a['ok'] ?:
            version_compare(ltrim($b['version'], 'v'), ltrim($a['version'], 'v'))
        );

        $recommended = collect($found)->first(fn($n) => $n['ok']);

        return response()->json([
            'installations' => $found,
            'recommended'   => $recommended,
            'found'         => count($found) > 0,
        ]);
    }

    // ── Reveal secrets ────────────────────────────────────────────────────────

    public function reveal(Request $r, $id)
    {
        $project = DeployProject::findOrFail($id);

        return response()->json([
            'github_token' => $project->getPlainToken(),
            'ftp_password' => $project->getPlainFtpPassword(),
            'ftp_host'     => $project->getPlainFtpHost(),
            'ftp_username' => $project->getPlainFtpUsername(),
        ]);
    }

    // ── Manual deploy ─────────────────────────────────────────────────────────

    public function deploy($id)
    {
        $project = DeployProject::findOrFail($id);

        if ($project->status === 'deploying') {
            return response()->json(['message' => 'Already deploying.'], 409);
        }

        // If the user previously hit "Stop", a short-lived cache flag may still exist.
        // Clear it so a new deploy doesn't immediately cancel itself.
        Cache::forget("deploy_stop_{$id}");

        $log = DeployLog::create([
            'project_id'   => $project->id,
            'status'       => 'pending',
            'branch'       => $project->branch,
            'triggered_by' => 'manual',
        ]);

        $project->update(['status' => 'deploying']);

        // Write an immediate line so UI doesn't show "blank pending"
        $log->update([
            'output' => '[' . date('H:i:s') . "] Starting deploy… waiting for worker start",
        ]);

        // Run in a detached background process — no queue worker needed.
        // Designed for shared hosting (cPanel) where queue:work can't run persistently.
        $this->runDeployInBackground($log->id, $project->id);

        return response()->json(['log_id' => $log->id]);
    }

    // ── Lightweight log output poll (for real-time terminal) ──────────────────

    public function logOutput($projectId, $logId)
    {
        $log = DeployLog::where('id', $logId)
            ->where('project_id', $projectId)
            ->first();

        if (!$log) {
            return response()->json(['error' => 'Log not found'], 404);
        }

        return response()->json([
            'id'               => $log->id,
            'status'           => $log->status,
            'output'           => $log->output ?? '',
            'duration_seconds' => $log->duration_seconds,
            'commit_hash'      => $log->commit_hash,
        ]);
    }

    // ── Background dispatch helper ────────────────────────────────────────────

    private function runDeployInBackground(int $logId, int $projectId): void
    {
        $artisan = base_path('artisan');

        // ── Windows (local dev) ──────────────────────────────────────────────
        if (PHP_OS_FAMILY === 'Windows') {
            $php = PHP_BINARY;
            $cmd = "start /B \"\" \"{$php}\" \"{$artisan}\" deploy:run {$logId}";
            pclose(popen($cmd, 'r'));
            return;
        }

        // ── Linux/cPanel — Method 1: PHP-FPM / LiteSpeed (most reliable) ─────
        // Use Laravel's terminating callback: it runs *after* the response is sent,
        // while the app container + DB are still available.
        if (function_exists('fastcgi_finish_request') || function_exists('litespeed_finish_request')) {
            ignore_user_abort(true);
            set_time_limit(0);

            app()->terminating(function () use ($logId, $projectId) {
                try {
                    if (function_exists('fastcgi_finish_request')) {
                        @fastcgi_finish_request();
                    } elseif (function_exists('litespeed_finish_request')) {
                        @litespeed_finish_request();
                    }

                    $log = DeployLog::find($logId);
                    if ($log && $log->status === 'pending') {
                        (new \App\Jobs\RunDeployJob($projectId, $logId))->handle();
                    }
                } catch (\Throwable $e) {
                    // Best-effort: record why the worker didn't start
                    try {
                        DeployLog::where('id', $logId)->update([
                            'status' => 'failed',
                            'output' => \DB::raw(
                                "CONCAT(IFNULL(output,''), '\n[" . date('H:i:s') . "] [ERROR] Background start failed: " .
                                addslashes($e->getMessage()) . "')"
                            ),
                        ]);
                        DeployProject::where('id', $projectId)->update(['status' => 'failed']);
                    } catch (\Throwable) {
                        // swallow
                    }
                }
            });
            return;
        }

        // ── Linux — Method 2: nohup background process ───────────────────────
        // Fallback for mod_php or systems without fastcgi_finish_request.
        // PHP_BINARY in a web context may be php-fpm/cgi; try CLI binary first.
        $phpCli = trim(shell_exec('which php 2>/dev/null') ?: '') ?: PHP_BINARY;
        $cmd    = 'nohup ' . escapeshellarg($phpCli) . ' '
                . escapeshellarg($artisan) . ' deploy:run ' . (int)$logId
                . ' > /dev/null 2>&1 &';
        @exec($cmd);
    }

    // ── Stop a running deploy ─────────────────────────────────────────────────

    public function stop($id)
    {
        $project = DeployProject::findOrFail($id);

        Cache::put("deploy_stop_{$id}", true, now()->addMinutes(2));

        // Update running or pending logs to cancelled
        $project->logs()->whereIn('status', ['running', 'pending'])->update([
            'status' => 'cancelled',
            'output' => \DB::raw("CONCAT(IFNULL(output,''), '\n[" . date('H:i:s') . "] [WARN] Stop requested by user...')"),
        ]);

        $project->update(['status' => 'idle']);

        return response()->json(['stopped' => true]);
    }

    // ── Auto-detect framework from repo ──────────────────────────────────────

    public function detect(Request $r)
    {
        $r->validate(['repo_url' => 'required|url', 'github_token' => 'nullable|string', 'branch' => 'nullable|string']);

        [$owner, $repo] = (new DeployProject(['repo_url' => $r->repo_url]))->getOwnerRepo();

        if (!$owner || !$repo) {
            return response()->json(['error' => 'Invalid GitHub URL.'], 422);
        }

        $branch  = $r->branch ?: 'main';
        $headers = ['Accept' => 'application/vnd.github+json', 'User-Agent' => 'DeployManager/1.0'];
        if ($r->github_token) $headers['Authorization'] = 'token ' . $r->github_token;

        try {
            $resp = Http::withHeaders($headers)
                ->get("https://api.github.com/repos/{$owner}/{$repo}/contents?ref={$branch}");

            if (!$resp->successful()) {
                return response()->json(['error' => 'Cannot access repo. Check URL and token. (' . $resp->status() . ')'], 422);
            }

            $files     = array_column($resp->json() ?? [], 'name');
            $framework = DeployProject::detectFramework($files);
            [$cmd, $dir] = DeployProject::defaultBuild($framework);

            // Check if package.json actually has a build script
            if (in_array('package.json', $files)) {
                $pkgResp = Http::withHeaders($headers)
                    ->get("https://api.github.com/repos/{$owner}/{$repo}/contents/package.json?ref={$branch}");
                if ($pkgResp->successful()) {
                    $content = $pkgResp->json('content') ?? '';
                    $pkg     = json_decode(base64_decode(str_replace("\n", '', $content)), true);
                    if (!isset($pkg['scripts']['build'])) {
                        $cmd = null;
                        $dir = null;
                    }
                    // Use exact build script from package.json
                    if (isset($pkg['scripts']['build'])) {
                        $cmd = 'npm run build';
                    }
                }
            }

            return response()->json([
                'framework'        => $framework,
                'build_command'    => $cmd,
                'build_output_dir' => $dir,
                'root_files'       => $files,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
