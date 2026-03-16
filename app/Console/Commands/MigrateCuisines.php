<?php

namespace App\Console\Commands;

use App\Models\Cuisine;
use App\Models\Muzzhub;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class MigrateCuisines extends Command
{
    protected $signature   = 'cuisines:migrate {--dry-run : Preview without saving}';
    protected $description = 'Extract cuisine values from muzzhub.cuisine text into the cuisines table and attach relations';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        $rows = Muzzhub::whereNotNull('cuisine')
            ->where('cuisine', '!=', '')
            ->select('id', 'cuisine')
            ->get();

        if ($rows->isEmpty()) {
            $this->info('No muzzhub records with cuisine data found.');
            return 0;
        }

        $this->info("Found {$rows->count()} muzzhub records with cuisine data.");

        $totalCreated  = 0;
        $totalAttached = 0;

        foreach ($rows as $muzzhub) {
            // Split by comma, semicolon, or slash
            $values = preg_split('/[,;\/]/', $muzzhub->cuisine);
            $values = array_filter(array_map('trim', $values));

            $cuisineIds = [];

            foreach ($values as $name) {
                $name = trim($name);
                if ($name === '') continue;

                // Normalize: title case
                $name = Str::title(strtolower($name));
                $slug = Str::slug($name);

                if ($dryRun) {
                    $this->line("  [DRY] Muzzhub #{$muzzhub->id} → cuisine: \"{$name}\" (slug: {$slug})");
                    continue;
                }

                $cuisine = Cuisine::firstOrCreate(
                    ['slug' => $slug],
                    ['name' => $name, 'slug' => $slug, 'is_active' => true, 'sort_order' => 0]
                );

                if ($cuisine->wasRecentlyCreated) {
                    $totalCreated++;
                    $this->line("  Created cuisine: \"{$name}\"");
                }

                $cuisineIds[] = $cuisine->id;
            }

            if (!$dryRun && !empty($cuisineIds)) {
                // sync without detaching — preserves existing if run multiple times
                $muzzhub->cuisines()->syncWithoutDetaching($cuisineIds);
                $totalAttached += count($cuisineIds);
            }
        }

        if ($dryRun) {
            $this->warn('Dry run complete — no changes saved.');
        } else {
            $this->info("Done! Cuisines created: {$totalCreated} | Relations attached: {$totalAttached}");
        }

        return 0;
    }
}
