<?php

namespace App\Console\Commands;

use App\Jobs\RunDeployJob;
use App\Models\DeployLog;
use Illuminate\Console\Command;

class RunDeployCommand extends Command
{
    protected $signature   = 'deploy:run {logId : The deploy log ID to process}';
    protected $description = 'Execute a deploy job directly (bypasses queue worker).';

    public function handle(): int
    {
        $logId = (int) $this->argument('logId');
        $log   = DeployLog::find($logId);

        if (!$log) {
            $this->error("DeployLog #{$logId} not found.");
            return 1;
        }

        $this->info("Starting deploy for log #{$logId} (project #{$log->project_id})…");

        $job = new RunDeployJob($log->project_id, $logId);
        $job->handle();

        $this->info("Deploy finished. Status: " . (DeployLog::find($logId)?->status ?? 'unknown'));
        return 0;
    }
}
