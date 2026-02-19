<?php

namespace App\Services\DataSync;

use App\Models\Business;
use App\Models\BusinessCategory;
use App\Models\DataSource;
use App\Models\DataSyncLog;
use App\Services\DataSync\Connectors\LocalTableConnector;
use App\Services\DataSync\Connectors\RestApiConnector;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class DataSyncService
{
    /** Default mapping: muzzhub/common column → Business field (same name = identity) */
    private const DEFAULT_LOCAL_MAP = [
        'name'             => 'name',
        'description'      => 'description',
        'cuisine'          => 'cuisine',
        'address'          => 'address',
        'address_2'        => 'address_2',
        'city'             => 'city',
        'state'            => 'state',
        'zip'              => 'zip',
        'country'          => 'country',
        'phone'            => 'phone',
        'email'            => 'email',
        'website'          => 'website',
        'latitude'         => 'latitude',
        'longitude'        => 'longitude',
        'type'             => 'type',            // used for category mapping
        'permalink'        => 'permalink',
        'rating'           => 'rating',
        'review_count'     => 'review_count',
        'compliance'       => 'compliance',
        'slaughter_method' => 'slaughter_method',
        'halal_authority'  => 'halal_authority',
        'halal_info'       => 'halal_info',
        'halal_options'    => 'halal_options',
        'halal_chain'      => 'halal_chain',
        'price'            => 'price',
        'parking'          => 'parking',
        'credit_cards'     => 'credit_cards',
        'transit'          => 'transit',
        'alcohol'          => 'alcohol',
        'kids_menu'        => 'kids_menu',
        'pray_space'       => 'pray_space',
        'organic'          => 'organic',
        'catering'         => 'catering',
        'delivery'         => 'delivery',
        'wheelchair_access'=> 'wheelchair_access',
        'wifi'             => 'wifi',
        'cash_only'        => 'cash_only',
        'pork'             => 'pork',
        'drive_thru'       => 'drive_thru',
        'reservations'     => 'reservations',
        'outdoor_seating'  => 'outdoor_seating',
        'shisha'           => 'shisha',
        'featured'         => 'featured',
        'sponsored'        => 'sponsored',
        'monday_open'      => 'monday_open',
        'monday_close'     => 'monday_close',
        'tuesday_open'     => 'tuesday_open',
        'tuesday_close'    => 'tuesday_close',
        'wednesday_open'   => 'wednesday_open',
        'wednesday_close'  => 'wednesday_close',
        'thursday_open'    => 'thursday_open',
        'thursday_close'   => 'thursday_close',
        'friday_open'      => 'friday_open',
        'friday_close'     => 'friday_close',
        'saturday_open'    => 'saturday_open',
        'saturday_close'   => 'saturday_close',
        'sunday_open'      => 'sunday_open',
        'sunday_close'     => 'sunday_close',
    ];

    public function sync(DataSource $source): array
    {
        $startedAt = now();

        $log = DataSyncLog::create(['source_id' => $source->id, 'status' => 'running']);
        $source->update(['sync_status' => 'syncing', 'last_error' => null]);

        try {
            [$connector, $userFieldMap] = $this->makeConnector($source);

            // Merge default map with user-provided overrides
            $fieldMap = array_merge(
                $source->type === 'local_table' ? self::DEFAULT_LOCAL_MAP : [],
                $userFieldMap
            );

            // Ensure default categories exist
            $categories = $this->ensureCategories();

            $imported = 0;
            $skipped  = 0;
            $failed   = 0;

            foreach ($connector->businesses() as $row) {
                try {
                    $data = $this->applyFieldMap($row, $fieldMap);

                    $permalink = $data['permalink'] ?? null;

                    // Skip if already imported
                    if ($permalink && Business::where('permalink', $permalink)->exists()) {
                        $skipped++;
                        continue;
                    }

                    // Resolve category
                    $type     = strtolower(trim($data['type'] ?? 'restaurant'));
                    $category = match (true) {
                        str_contains($type, 'store')   => $categories['store'],
                        str_contains($type, 'service') => $categories['service'],
                        default                        => $categories['restaurant'],
                    };

                    // Generate unique slug
                    $slugBase = $permalink
                        ? Str::slug(last(explode('/', $permalink)))
                        : Str::slug($data['name'] ?? 'business');
                    if (!$slugBase) $slugBase = 'business';
                    $slug = $slugBase;
                    $i    = 1;
                    while (Business::where('slug', $slug)->exists()) {
                        $slug = $slugBase . '-' . $i++;
                    }

                    Business::create([
                        'category_id'      => $category->id,
                        'name'             => $data['name'] ?? '',
                        'slug'             => $slug,
                        'description'      => $data['description'] ?? null,
                        'cuisine'          => $data['cuisine'] ?? null,
                        'address'          => $data['address'] ?? null,
                        'address_2'        => $data['address_2'] ?? null,
                        'city'             => $data['city'] ?? null,
                        'state'            => $data['state'] ?? null,
                        'zip'              => $data['zip'] ?? null,
                        'country'          => $data['country'] ?? 'us',
                        'phone'            => $data['phone'] ?? null,
                        'email'            => $data['email'] ?? null,
                        'website'          => $data['website'] ?? null,
                        'latitude'         => is_numeric($data['latitude'] ?? null)  ? (float)$data['latitude']  : null,
                        'longitude'        => is_numeric($data['longitude'] ?? null) ? (float)$data['longitude'] : null,
                        'compliance'       => $data['compliance'] ?? null,
                        'slaughter_method' => $data['slaughter_method'] ?? null,
                        'halal_authority'  => $data['halal_authority'] ?? null,
                        'halal_info'       => $data['halal_info'] ?? null,
                        'halal_options'    => $data['halal_options'] ?? null,
                        'halal_chain'      => $data['halal_chain'] ?? null,
                        'price'            => $data['price'] ?? null,
                        'parking'          => $data['parking'] ?? null,
                        'credit_cards'     => $data['credit_cards'] ?? null,
                        'transit'          => $data['transit'] ?? null,
                        'permalink'        => $permalink,
                        'rating'           => is_numeric($data['rating'] ?? null) ? (float)$data['rating'] : null,
                        'review_count'     => (int)($data['review_count'] ?? 0),
                        'alcohol'          => (bool)($data['alcohol'] ?? false),
                        'kids_menu'        => (bool)($data['kids_menu'] ?? false),
                        'pray_space'       => (bool)($data['pray_space'] ?? false),
                        'organic'          => (bool)($data['organic'] ?? false),
                        'catering'         => (bool)($data['catering'] ?? false),
                        'delivery'         => (bool)($data['delivery'] ?? false),
                        'wheelchair_access'=> (bool)($data['wheelchair_access'] ?? false),
                        'wifi'             => (bool)($data['wifi'] ?? false),
                        'cash_only'        => (bool)($data['cash_only'] ?? false),
                        'pork'             => (bool)($data['pork'] ?? false),
                        'drive_thru'       => (bool)($data['drive_thru'] ?? false),
                        'reservations'     => (bool)($data['reservations'] ?? false),
                        'outdoor_seating'  => (bool)($data['outdoor_seating'] ?? false),
                        'shisha'           => (bool)($data['shisha'] ?? false),
                        'featured'         => (bool)($data['featured'] ?? false),
                        'sponsored'        => (bool)($data['sponsored'] ?? false),
                        'monday_open'      => $data['monday_open'] ?? null,
                        'monday_close'     => $data['monday_close'] ?? null,
                        'tuesday_open'     => $data['tuesday_open'] ?? null,
                        'tuesday_close'    => $data['tuesday_close'] ?? null,
                        'wednesday_open'   => $data['wednesday_open'] ?? null,
                        'wednesday_close'  => $data['wednesday_close'] ?? null,
                        'thursday_open'    => $data['thursday_open'] ?? null,
                        'thursday_close'   => $data['thursday_close'] ?? null,
                        'friday_open'      => $data['friday_open'] ?? null,
                        'friday_close'     => $data['friday_close'] ?? null,
                        'saturday_open'    => $data['saturday_open'] ?? null,
                        'saturday_close'   => $data['saturday_close'] ?? null,
                        'sunday_open'      => $data['sunday_open'] ?? null,
                        'sunday_close'     => $data['sunday_close'] ?? null,
                        'is_active'        => true,
                    ]);

                    $imported++;
                } catch (\Throwable $e) {
                    $failed++;
                }
            }

            $durationMs = (int) ($startedAt->diffInMilliseconds(now()));
            $log->update([
                'status'      => 'completed',
                'imported'    => $imported,
                'skipped'     => $skipped,
                'failed'      => $failed,
                'duration_ms' => $durationMs,
            ]);
            $source->update([
                'sync_status'  => 'completed',
                'last_sync_at' => now(),
                'total_synced' => $source->total_synced + $imported,
            ]);

            return compact('imported', 'skipped', 'failed', 'durationMs');
        } catch (\Throwable $e) {
            $log->update(['status' => 'failed', 'error' => $e->getMessage()]);
            $source->update(['sync_status' => 'failed', 'last_error' => $e->getMessage()]);
            throw $e;
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────

    private function makeConnector(DataSource $source): array
    {
        $config   = $source->config ?? [];
        $fieldMap = $config['field_map'] ?? [];
        unset($config['field_map']); // keep connector config clean

        $connector = match ($source->type) {
            'local_table' => new LocalTableConnector($config + ['field_map' => $fieldMap]),
            'api'         => new RestApiConnector($config + ['field_map' => $fieldMap]),
            default       => throw new \InvalidArgumentException("Unknown source type: {$source->type}"),
        };

        return [$connector, $fieldMap];
    }

    /** Apply field_map: { "source_key": "local_key" } with dot-notation support. */
    private function applyFieldMap(array $row, array $fieldMap): array
    {
        if (empty($fieldMap)) {
            return $row; // identity: source columns already match Business fields
        }

        $result = [];
        foreach ($fieldMap as $srcKey => $localKey) {
            // dot-notation on source (e.g. "location.city" → nested array)
            $value = Arr::get($row, $srcKey);
            if ($value !== null) {
                Arr::set($result, $localKey, $value);
            }
        }

        // Pass through any unmapped keys that weren't in field_map as-is
        foreach ($row as $k => $v) {
            if (!isset($result[$k])) {
                $result[$k] = $v;
            }
        }

        return $result;
    }

    private function ensureCategories(): array
    {
        return [
            'restaurant' => BusinessCategory::firstOrCreate(
                ['type' => 'restaurant'],
                ['name' => 'Restaurant', 'slug' => 'restaurant', 'icon' => 'tools-kitchen-2', 'is_active' => true, 'sort_order' => 1]
            ),
            'store' => BusinessCategory::firstOrCreate(
                ['type' => 'store'],
                ['name' => 'Store', 'slug' => 'store', 'icon' => 'building-store', 'is_active' => true, 'sort_order' => 2]
            ),
            'service' => BusinessCategory::firstOrCreate(
                ['type' => 'service'],
                ['name' => 'Service', 'slug' => 'service', 'icon' => 'briefcase', 'is_active' => true, 'sort_order' => 3]
            ),
        ];
    }
}
