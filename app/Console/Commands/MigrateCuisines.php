<?php

namespace App\Console\Commands;

use App\Models\Cuisine;
use App\Models\Muzzhub;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MigrateCuisines extends Command
{
    protected $signature   = 'cuisines:migrate {--dry-run : Preview without saving} {--dedup : Merge duplicate cuisine entries}';
    protected $description = 'Extract cuisine values from muzzhub.cuisine text into the cuisines table and attach relations';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        // ── Step 0: Dedup existing cuisines table ─────────────────────────────
        $this->deduplicateCuisines($dryRun);

        // ── Step 1: Extract from muzzhub.cuisine text ─────────────────────────
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

            foreach ($values as $raw) {
                $raw = trim($raw);
                if ($raw === '') continue;

                // Normalize: title case + slug
                $name = Str::title(strtolower($raw));
                $slug = Str::slug($name);

                if ($dryRun) {
                    $this->line("  [DRY] Muzzhub #{$muzzhub->id} → cuisine: \"{$name}\" (slug: {$slug})");
                    continue;
                }

                // Find by slug OR by name (case-insensitive) to avoid duplicates
                $cuisine = Cuisine::whereRaw('LOWER(name) = ?', [strtolower($name)])->first()
                    ?? Cuisine::where('slug', $slug)->first()
                    ?? Cuisine::create(['name' => $name, 'slug' => $slug, 'is_active' => true, 'sort_order' => 0]);

                if ($cuisine->wasRecentlyCreated) {
                    $totalCreated++;
                    $this->line("  Created cuisine: \"{$name}\"");
                }

                $cuisineIds[] = $cuisine->id;
            }

            if (!$dryRun && !empty($cuisineIds)) {
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

    /**
     * Find duplicate cuisines (same name, case-insensitive) and merge them
     * into the one with the lowest ID. Updates pivot table accordingly.
     */
    private function deduplicateCuisines(bool $dryRun): void
    {
        // Group by lower(name), find groups with > 1 record
        $groups = Cuisine::selectRaw('LOWER(name) as norm_name, MIN(id) as keep_id, COUNT(*) as cnt')
            ->groupByRaw('LOWER(name)')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        if ($groups->isEmpty()) {
            $this->line('No duplicate cuisines found.');
            return;
        }

        foreach ($groups as $group) {
            $keepId = $group->keep_id;
            $dupes  = Cuisine::whereRaw('LOWER(name) = ?', [$group->norm_name])
                ->where('id', '!=', $keepId)
                ->pluck('id')
                ->toArray();

            $this->warn("Duplicate \"{$group->norm_name}\": keeping ID {$keepId}, merging " . implode(',', $dupes));

            if ($dryRun) continue;

            // Re-point pivot rows from duplicates → keeper
            foreach ($dupes as $dupeId) {
                // For each muzzhub linked to the dupe, attach to keeper (ignore if already linked)
                $muzzhubIds = DB::table('muzzhub_cuisine')
                    ->where('cuisine_id', $dupeId)
                    ->pluck('muzzhub_id');

                foreach ($muzzhubIds as $mid) {
                    DB::table('muzzhub_cuisine')->insertOrIgnore([
                        'muzzhub_id'  => $mid,
                        'cuisine_id'  => $keepId,
                    ]);
                }

                // Remove dupe pivot rows + delete dupe cuisine
                DB::table('muzzhub_cuisine')->where('cuisine_id', $dupeId)->delete();
                Cuisine::where('id', $dupeId)->delete();
            }

            $this->info("  Merged {$group->cnt} duplicates → ID {$keepId}");
        }
    }
}
