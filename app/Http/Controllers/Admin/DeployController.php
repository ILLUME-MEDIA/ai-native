<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\RunDeployJob;
use App\Models\DeployLog;
use App\Models\DeployProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class DeployController extends Controller
{
    // ── Projects CRUD ─────────────────────────────────────────────────────────

    public function index()
    {
        return response()->json(
            DeployProject::latest()->get()->map(fn($p) => $p->toApiArray())
        );
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
        $nodeBin  = trim(shell_exec('which node 2>/dev/null') ?? '');
        $npmBin   = trim(shell_exec('which npm 2>/dev/null') ?? '');
        $nodeVer  = $nodeBin ? trim(shell_exec("{$nodeBin} --version 2>/dev/null") ?? '') : null;
        $npmVer   = $npmBin  ? trim(shell_exec("{$npmBin} --version 2>/dev/null") ?? '') : null;
        $nodeDir  = $nodeBin ? dirname($nodeBin) : null;

        return response()->json([
            'node_path'    => $nodeDir,
            'node_version' => $nodeVer,
            'npm_version'  => $npmVer,
            'found'        => (bool) $nodeBin,
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

        $log = DeployLog::create([
            'project_id'   => $project->id,
            'status'       => 'pending',
            'branch'       => $project->branch,
            'triggered_by' => 'manual',
        ]);

        $project->update(['status' => 'deploying']);
        RunDeployJob::dispatch($project->id, $log->id);

        return response()->json(['log_id' => $log->id]);
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
