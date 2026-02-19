<?php

namespace App\Console\Commands;

use App\Models\Business;
use App\Models\BusinessCategory;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportMuzzhub extends Command
{
    protected $signature = 'app:import-muzzhub
                            {--fresh : Delete existing imported businesses first}';

    protected $description = 'Import businesses from the muzzhub table into the businesses table';

    public function handle(): int
    {
        $total = DB::table('muzzhub')->count();
        $this->info("Found {$total} records in muzzhub table.");

        if ($this->option('fresh')) {
            $deleted = Business::whereNotNull('permalink')->delete();
            $this->warn("Deleted {$deleted} previously imported businesses.");
        }

        // Ensure default categories exist
        $catRestaurant = BusinessCategory::firstOrCreate(
            ['type' => 'restaurant', 'name' => 'Restaurant'],
            ['slug' => 'restaurant', 'icon' => 'tools-kitchen-2', 'is_active' => true, 'sort_order' => 1]
        );
        $catStore = BusinessCategory::firstOrCreate(
            ['type' => 'store', 'name' => 'Store'],
            ['slug' => 'store', 'icon' => 'building-store', 'is_active' => true, 'sort_order' => 2]
        );
        $catService = BusinessCategory::firstOrCreate(
            ['type' => 'service', 'name' => 'Service'],
            ['slug' => 'service', 'icon' => 'briefcase', 'is_active' => true, 'sort_order' => 3]
        );

        $rows = DB::table('muzzhub')->orderBy('id')->get();
        $bar  = $this->output->createProgressBar($rows->count());
        $bar->start();

        $imported = 0;
        $skipped  = 0;

        foreach ($rows as $row) {
            // Skip if already imported (same permalink)
            $permalink = $row->permalink ?? null;
            if ($permalink && Business::where('permalink', $permalink)->exists()) {
                $skipped++;
                $bar->advance();
                continue;
            }

            // Map category
            $type = strtolower(trim($row->type ?? 'places'));
            $category = match (true) {
                str_contains($type, 'store')   => $catStore,
                str_contains($type, 'service') => $catService,
                default                        => $catRestaurant,
            };

            // Generate unique slug from permalink or name
            $slugBase = $permalink
                ? Str::slug(last(explode('/', $permalink)))
                : Str::slug($row->name ?? 'business');
            if (!$slugBase) $slugBase = 'business';
            $slug = $slugBase;
            $i = 1;
            while (Business::where('slug', $slug)->exists()) {
                $slug = $slugBase . '-' . $i++;
            }

            Business::create([
                'category_id'      => $category->id,
                'name'             => $row->name ?? '',
                'slug'             => $slug,
                'description'      => $row->description ?? null,
                'cuisine'          => $this->cleanText($row->cuisine ?? null),
                'address'          => $row->address ?? null,
                'address_2'        => $row->address_2 ?? null,
                'city'             => $row->city ?? null,
                'state'            => $row->state ?? null,
                'zip'              => $row->zip ?? null,
                'country'          => $row->country ?? 'us',
                'phone'            => $row->phone ?? null,
                'email'            => $row->email ?? null,
                'website'          => $row->website ?? null,
                'latitude'         => is_numeric($row->latitude)  ? (float)$row->latitude  : null,
                'longitude'        => is_numeric($row->longitude) ? (float)$row->longitude : null,
                'compliance'       => $row->compliance ?? null,
                'slaughter_method' => $row->slaughter_method ?? null,
                'halal_authority'  => $row->halal_authority ?? null,
                'halal_info'       => $row->halal_info ?? null,
                'halal_options'    => $row->halal_options ?? null,
                'halal_chain'      => $row->halal_chain ?? null,
                'price'            => $row->price ?? null,
                'parking'          => $row->parking ?? null,
                'credit_cards'     => $this->cleanText($row->credit_cards ?? null),
                'transit'          => $row->transit ?? null,
                'permalink'        => $permalink,
                'rating'           => is_numeric($row->rating) ? (float)$row->rating : null,
                'review_count'     => (int)($row->review_count ?? 0),
                'alcohol'          => (bool)($row->alcohol ?? false),
                'kids_menu'        => (bool)($row->kids_menu ?? false),
                'pray_space'       => (bool)($row->pray_space ?? false),
                'organic'          => (bool)($row->organic ?? false),
                'catering'         => (bool)($row->catering ?? false),
                'delivery'         => (bool)($row->delivery ?? false),
                'wheelchair_access'=> (bool)($row->wheelchair_access ?? false),
                'wifi'             => (bool)($row->wifi ?? false),
                'cash_only'        => (bool)($row->cash_only ?? false),
                'pork'             => (bool)($row->pork ?? false),
                'drive_thru'       => false,
                'reservations'     => false,
                'outdoor_seating'  => false,
                'shisha'           => (bool)($row->shisha ?? false),
                'featured'         => (bool)($row->featured ?? false),
                'sponsored'        => (bool)($row->sponsored ?? false),
                'monday_open'      => $row->monday_open ?? null,
                'monday_close'     => $row->monday_close ?? null,
                'tuesday_open'     => $row->tuesday_open ?? null,
                'tuesday_close'    => $row->tuesday_close ?? null,
                'wednesday_open'   => $row->wednesday_open ?? null,
                'wednesday_close'  => $row->wednesday_close ?? null,
                'thursday_open'    => $row->thursday_open ?? null,
                'thursday_close'   => $row->thursday_close ?? null,
                'friday_open'      => $row->friday_open ?? null,
                'friday_close'     => $row->friday_close ?? null,
                'saturday_open'    => $row->saturday_open ?? null,
                'saturday_close'   => $row->saturday_close ?? null,
                'sunday_open'      => $row->sunday_open ?? null,
                'sunday_close'     => $row->sunday_close ?? null,
                'is_active'        => true,
            ]);

            $imported++;
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Done! Imported: {$imported} | Skipped (already exist): {$skipped}");

        return self::SUCCESS;
    }

    /** Strip tab-separated list into a clean comma-separated string */
    private function cleanText(?string $val): ?string
    {
        if (!$val) return null;
        $parts = array_filter(array_map('trim', explode("\t", $val)));
        return $parts ? implode(', ', $parts) : null;
    }
}
