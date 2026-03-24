<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;

class ClearAppCache extends Command
{
    protected $signature   = 'app:clear-cache';
    protected $description = 'Clear all application caches: config, route, view, and Laravel cache store';

    public function handle(): int
    {
        $this->info('Clearing application caches...');

        $steps = [
            ['label' => 'Application cache (Cache::flush)',  'fn' => fn () => Cache::flush()],
            ['label' => 'Config cache',                       'fn' => fn () => Artisan::call('config:clear')],
            ['label' => 'Route cache',                        'fn' => fn () => Artisan::call('route:clear')],
            ['label' => 'View cache',                         'fn' => fn () => Artisan::call('view:clear')],
        ];

        foreach ($steps as $step) {
            try {
                ($step['fn'])();
                $this->line("  <info>✓</info> {$step['label']}");
            } catch (\Throwable $e) {
                $this->line("  <error>✗</error> {$step['label']}: {$e->getMessage()}");
            }
        }

        // Force section builder to re-sync on next request
        Cache::forget('section_builder_schema_sync_last');
        Cache::forget('section_builder_schema_sync_lock');
        $this->line('  <info>✓</info> Section builder schema sync reset');

        $this->info('Done.');

        return self::SUCCESS;
    }
}
