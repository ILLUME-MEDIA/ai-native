<?php

namespace App\Console\Commands;

use App\Jobs\RunDeployJob;
use App\Models\DeployLog;
use App\Models\DeployProject;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class PollDeployProjects extends Command
{
    protected $signature   = 'deploy:poll';
    protected $description = 'Check GitHub for new commits and auto-deploy projects configured in poll mode.';

    public function handle(): void
    {
        $projects = DeployProject::where('deploy_mode', 'poll')
            ->where('auto_deploy', true)
            ->where('status', '!=', 'deploying')
            ->get();

        foreach ($projects as $project) {
            // Respect poll_interval — skip if checked recently
            $cacheKey = "deploy_poll_checked_{$project->id}";
            if (Cache::has($cacheKey)) {
                continue;
            }
            // Mark this project as "just checked" for poll_interval minutes
            Cache::put($cacheKey, true, now()->addMinutes($project->poll_interval ?? 5));

            $this->checkProject($project);
        }
    }

    private function checkProject(DeployProject $project): void
    {
        [$owner, $repo] = $project->getOwnerRepo();
        if (!$owner || !$repo) return;

        $headers = ['Accept' => 'application/vnd.github+json', 'User-Agent' => 'DeployManager/1.0'];
        $token   = $project->getPlainToken();
        if ($token) $headers['Authorization'] = "token {$token}";

        try {
            $resp = Http::withHeaders($headers)
                ->timeout(15)
                ->get("https://api.github.com/repos/{$owner}/{$repo}/commits/{$project->branch}");

            if (!$resp->successful()) {
                $this->warn("[{$project->name}] GitHub API {$resp->status()}");
                return;
            }

            $latestSha = $resp->json('sha');
            $commitMsg = strtok($resp->json('commit.message') ?? '', "\n");

            if (!$latestSha) return;

            // No new commit — skip
            if ($project->last_commit_hash === substr($latestSha, 0, 40)) {
                return;
            }

            $this->info("[{$project->name}] New commit: " . substr($latestSha, 0, 7) . " — {$commitMsg}");

            $log = DeployLog::create([
                'project_id'     => $project->id,
                'status'         => 'pending',
                'branch'         => $project->branch,
                'triggered_by'   => 'poll',
                'commit_hash'    => substr($latestSha, 0, 40),
                'commit_message' => substr($commitMsg, 0, 255),
            ]);

            $project->update(['status' => 'deploying']);

            // Run synchronously here — we're already inside an artisan command (cron job).
            $job = new RunDeployJob($project->id, $log->id, $latestSha, $commitMsg);
            $job->handle();

        } catch (\Throwable $e) {
            $this->error("[{$project->name}] " . $e->getMessage());
        }
    }
}
