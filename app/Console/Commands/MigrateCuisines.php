<?php

namespace App\Console\Commands;

use App\Models\Cuisine;
use App\Models\Muzzhub;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MigrateCuisines extends Command
{
    protected $signature   = 'cuisines:migrate {--dry-run : Preview without saving}';
    protected $description = 'Extract cuisine values from muzzhub.cuisine text into the cuisines table and attach relations';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        // Step 0: merge any existing duplicates
        $this->deduplicateCuisines($dryRun);

        // Step 1: extract from muzzhub.cuisine text
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
            // Split by comma, semicolon, slash, pipe, or ampersand
            $parts = preg_split('/[,;\/|&]/', $muzzhub->cuisine);
            $parts = array_filter(array_map('trim', $parts));

            $cuisineIds = [];

            foreach ($parts as $raw) {
                $raw = trim($raw);
                if ($raw === '' || strlen($raw) < 2) continue;

                // Normalize: title case
                $name = Str::title(strtolower($raw));
                $slug = Str::slug($name);

                if ($dryRun) {
                    $this->line("  [DRY] Muzzhub #{$muzzhub->id} → \"{$name}\" (slug: {$slug})");
                    continue;
                }

                // Find by name (case-insensitive) OR slug — create only if not found
                $cuisine = Cuisine::whereRaw('LOWER(name) = ?', [strtolower($name)])->first()
                    ?? Cuisine::where('slug', $slug)->first();

                if (!$cuisine) {
                    $cuisine = Cuisine::create([
                        'name'       => $name,
                        'slug'       => $slug,
                        'is_active'  => true,
                        'sort_order' => 0,
                    ]);
                    $totalCreated++;
                    $this->line("  Created: \"{$name}\"");
                }

                $cuisineIds[] = $cuisine->id;
            }

            if (!$dryRun && !empty($cuisineIds)) {
                // syncWithoutDetaching = add new, keep existing, never duplicate
                $muzzhub->cuisines()->syncWithoutDetaching(array_unique($cuisineIds));
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

    private function deduplicateCuisines(bool $dryRun): void
    {
        $groups = DB::table('cuisines')
            ->selectRaw('LOWER(name) as norm_name, MIN(id) as keep_id, COUNT(*) as cnt')
            ->groupByRaw('LOWER(name)')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        if ($groups->isEmpty()) return;

        foreach ($groups as $group) {
            $keepId = $group->keep_id;
            $dupes  = Cuisine::whereRaw('LOWER(name) = ?', [$group->norm_name])
                ->where('id', '!=', $keepId)
                ->pluck('id')
                ->toArray();

            $this->warn("Dedup \"{$group->norm_name}\": keeping ID {$keepId}, removing IDs " . implode(',', $dupes));

            if ($dryRun) continue;

            foreach ($dupes as $dupeId) {
                $muzzhubIds = DB::table('muzzhub_cuisine')->where('cuisine_id', $dupeId)->pluck('muzzhub_id');
                foreach ($muzzhubIds as $mid) {
                    DB::table('muzzhub_cuisine')->insertOrIgnore([
                        'muzzhub_id' => $mid,
                        'cuisine_id' => $keepId,
                    ]);
                }
                DB::table('muzzhub_cuisine')->where('cuisine_id', $dupeId)->delete();
                Cuisine::where('id', $dupeId)->delete();
            }
        }
    }
}
