<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule AI duties execution every minute (checks for due duties)
Schedule::command('ai:duties:execute')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/ai-duties.log'));

// Schedule Yelp sync jobs every minute (checks next_run_at per job)
Schedule::command('yelp:run-jobs')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/yelp-sync.log'));

// Poll GitHub for new commits on "poll" mode deploy projects
Schedule::command('deploy:poll')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/deploy-poll.log'));

// Auto-delete deploy logs older than 3 days
Schedule::call(function () {
    \App\Models\DeployLog::where('created_at', '<', now()->subDays(3))->delete();
})->daily()->name('deploy-logs-cleanup')->withoutOverlapping();
