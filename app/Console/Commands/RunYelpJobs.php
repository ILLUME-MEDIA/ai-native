<?php

namespace App\Console\Commands;

use App\Models\YelpJob;
use App\Models\YelpJobLog;
use App\Services\YelpSyncService;
use Illuminate\Console\Command;

class RunYelpJobs extends Command
{
    protected $signature   = 'yelp:run-jobs {--job= : Run a specific job ID} {--all : Run all active jobs regardless of schedule}';
    protected $description = 'Run scheduled Yelp sync jobs. Checks next_run_at by default.';

    public function handle(YelpSyncService $syncService): int
    {
        if ($this->option('job')) {
            $job = YelpJob::find($this->option('job'));
            if (!$job) {
                $this->error("Job ID {$this->option('job')} not found.");
                return 1;
            }
            $this->runJob($job, $syncService);
            return 0;
        }

        $query = YelpJob::where('is_active', true)->with('entity');

        if (!$this->option('all')) {
            $query->where('next_run_at', '<=', now())
                  ->where('schedule', '!=', 'manual');
        }

        $jobs = $query->get();

        if ($jobs->isEmpty()) {
            $this->info('No Yelp jobs are due.');
            return 0;
        }

        foreach ($jobs as $job) {
            $this->runJob($job, $syncService);
        }

        return 0;
    }

    protected function runJob(YelpJob $job, YelpSyncService $syncService): void
    {
        $this->info("Running Yelp job: {$job->name} (ID: {$job->id})");

        $log = YelpJobLog::create([
            'job_id'     => $job->id,
            'status'     => 'pending',
            'started_at' => now(),
        ]);

        try {
            $syncService->run($job, $log);
            $log->refresh();
            $this->info("  ✓ Status: {$log->status} | Processed: {$log->processed_rows} | Failed: {$log->failed_rows} | Skipped: {$log->skipped_rows}");
            if (!empty($log->new_columns_added)) {
                $this->info("  + New columns added: " . implode(', ', $log->new_columns_added));
            }
        } catch (\Throwable $e) {
            $log->update(['status' => 'failed', 'error_message' => $e->getMessage(), 'completed_at' => now()]);
            $this->error("  ✗ Job failed: " . $e->getMessage());
        }
    }
}
