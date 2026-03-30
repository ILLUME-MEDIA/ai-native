<?php

namespace App\Services;

use App\Models\SectionEntity;
use App\Models\SectionField;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SchemaSyncService
{
    protected const DEFAULT_SYNC_TTL_SECONDS = 300;
    /**
     * Tables that should not be exposed as configurable entities.
     *
     * @var array<int, string>
     */
    protected array $excludedTables = [
        'migrations',
        'cache',
        'cache_locks',
        'jobs',
        'job_batches',
        'failed_jobs',
        'sessions',
        'password_reset_tokens',
        'personal_access_tokens',
    ];

    /**
     * Run pending migrations (auto-creating tables) and ensure meta tables reflect the current DB schema.
     */
    public function sync(): void
    {
        // 1) Ensure all migrations are applied so any missing tables are created.
        $this->runPendingMigrations();

        // 2) Reflect current DB schema into Section Builder meta tables.
        $this->syncEntitiesFromDatabase();
    }

    /**
     * Run schema sync at most once per TTL window to avoid slow page loads.
     *
     * NOTE: Does NOT run migrations — migrations must be run via `php artisan migrate`.
     * Running Artisan::call('migrate') on a web request blocks for 10-30s and causes
     * page load hangs. Only the fast entity-reflection step runs here.
     */
    public function syncIfStale(int $ttlSeconds = self::DEFAULT_SYNC_TTL_SECONDS): void
    {
        try {
            DB::connection()->getPdo();
        } catch (\Exception) {
            return; // DB unavailable — skip sync silently
        }

        $lastSyncedAt = Cache::get('section_builder_schema_sync_last');

        if ($lastSyncedAt && now()->diffInSeconds($lastSyncedAt) < $ttlSeconds) {
            return;
        }

        // Prevent concurrent syncs from multiple requests.
        if (! Cache::add('section_builder_schema_sync_lock', true, 60)) {
            return;
        }

        try {
            // Only sync entities — never run migrations on a web request.
            $this->syncEntitiesFromDatabase();
            Cache::put('section_builder_schema_sync_last', now(), 3600);
        } finally {
            Cache::forget('section_builder_schema_sync_lock');
        }
    }

    /**
     * Run any pending migrations to align the database with the migrations folder.
     * If a table already exists (created manually before its migration was added),
     * that migration is marked as run in the migrations table instead of failing.
     */
    protected function runPendingMigrations(): void
    {
        // Migrations can be slow — bump the time limit to avoid a web-request timeout.
        $prevLimit = (int) ini_get('max_execution_time');
        set_time_limit(120);

        try {
            // Step 1: Attempt a normal bulk migrate. Works fine on clean installs.
            try {
                Artisan::call('migrate', ['--force' => true]);
                return;
            } catch (\Illuminate\Database\QueryException $e) {
                if (!str_contains($e->getMessage(), 'already exists') && $e->getCode() !== '42S01') {
                    throw $e;
                }
                // Table-exists conflict — fall through to per-migration mode.
            }

            // Step 2: Run each pending migration individually so conflicts are handled gracefully.
            $ran      = DB::table('migrations')->pluck('migration')->toArray();
            $maxBatch = DB::table('migrations')->max('batch') ?? 0;
            $batch    = $maxBatch + 1;

            $files = glob(database_path('migrations/*.php'));
            sort($files);

            foreach ($files as $file) {
                $name = pathinfo($file, PATHINFO_FILENAME);

                if (in_array($name, $ran)) {
                    continue;
                }

                try {
                    Artisan::call('migrate', [
                        '--force' => true,
                        '--path'  => 'database/migrations/' . basename($file),
                    ]);
                } catch (\Illuminate\Database\QueryException $e) {
                    if (str_contains($e->getMessage(), 'already exists') || $e->getCode() === '42S01') {
                        // Table already existed — mark migration as run so it won't be retried.
                        DB::table('migrations')->insertOrIgnore([
                            'migration' => $name,
                            'batch'     => $batch,
                        ]);
                    } else {
                        throw $e;
                    }
                }
            }
        } finally {
            if ($prevLimit > 0) {
                set_time_limit($prevLimit);
            }
        }
    }

    /**
     * Ensure there is a SectionEntity + SectionFields definition for every relevant DB table and column.
     */
    protected function syncEntitiesFromDatabase(): void
    {
        $connection = DB::connection();
        $driver = $connection->getDriverName();

        // For now we optimize for MySQL, which you're using.
        // This can be extended to other drivers later if needed.
        if ($driver !== 'mysql') {
            return;
        }

        $database = $connection->getDatabaseName();

        $tables = $connection->select(
            "select table_name from information_schema.tables where table_schema = ? and table_type in ('BASE TABLE','SYSTEM VERSIONED')",
            [$database],
        );

        foreach ($tables as $row) {
            $tableName = $row->table_name ?? $row->TABLE_NAME ?? null;

            if (! $tableName || $this->shouldSkipTable($tableName)) {
                continue;
            }

            $this->syncEntityForTable($tableName, $database);
        }
    }

    /**
     * Determine if a table should be skipped from Section Builder management.
     */
    protected function shouldSkipTable(string $tableName): bool
    {
        return in_array($tableName, $this->excludedTables, true);
    }

    /**
     * Sync a single table's SectionEntity and SectionFields definition.
     */
    protected function syncEntityForTable(string $tableName, string $database): void
    {
        $connection = DB::connection();

        $columns = $connection->select(
            "select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = ? and table_name = ? order by ordinal_position",
            [$database, $tableName],
        );

        $entity = SectionEntity::firstOrCreate(
            ['table_name' => $tableName],
            [
                'name' => Str::title(str_replace('_', ' ', $tableName)),
                'slug' => Str::slug($tableName),
                'source_type' => 'migration',
                'is_system' => $this->isSystemTable($tableName),
            ],
        );

        foreach ($columns as $column) {
            $columnName = $column->column_name ?? $column->COLUMN_NAME;
            $dataType = strtolower($column->data_type ?? $column->DATA_TYPE ?? 'string');
            $isNullable = ($column->is_nullable ?? $column->IS_NULLABLE ?? 'YES') === 'YES';
            $default = $column->column_default ?? $column->COLUMN_DEFAULT ?? null;

            $field = SectionField::firstOrNew([
                'entity_id' => $entity->id,
                'column_name' => $columnName,
            ]);

            if (! $field->exists) {
                $field->fill([
                    'label' => Str::title(str_replace('_', ' ', $columnName)),
                    'type' => $this->mapDatabaseTypeToFieldType($dataType, $columnName),
                    'nullable' => $isNullable,
                    'required' => ! $isNullable,
                    'default_value' => $this->normalizeDefaultValue($default),
                    'list_visible' => true,
                    'detail_visible' => true,
                    'is_searchable' => $this->isSearchableColumn($columnName),
                    'is_sortable' => $this->isSortableColumn($columnName),
                    'sort_order' => $field->sort_order ?? 0,
                ]);
            }

            $field->save();
        }
    }

    /**
     * Decide whether a table should be considered "system" (less editable via UI).
     */
    protected function isSystemTable(string $tableName): bool
    {
        return in_array($tableName, [
            'users',
            'orders',
            'order_items',
            'carts',
            'cart_items',
            'transactions',
        ], true);
    }

    /**
     * Map database (MySQL) column types to Section Builder field types.
     */
    protected function mapDatabaseTypeToFieldType(string $dbType, string $columnName): string
    {
        $dbType = strtolower($dbType);

        return match ($dbType) {
            'int', 'integer', 'bigint', 'smallint', 'mediumint', 'tinyint' => 'integer',
            'bool', 'boolean' => 'boolean',
            'datetime', 'timestamp', 'time' => 'datetime',
            'date' => 'date',
            'text', 'mediumtext', 'longtext' => 'text',
            default => $this->guessTypeFromColumnName($columnName),
        };
    }

    /**
     * Fallback heuristic: infer type from column name.
     */
    protected function guessTypeFromColumnName(string $columnName): string
    {
        if (Str::endsWith($columnName, ['_at'])) {
            return 'datetime';
        }

        if (Str::contains($columnName, ['image', 'file', 'media'])) {
            return 'file';
        }

        return 'string';
    }

    /**
     * Normalize default value for storage.
     *
     * @param  mixed  $default
     */
    protected function normalizeDefaultValue($default): ?string
    {
        if ($default === null) {
            return null;
        }

        if (is_scalar($default)) {
            return (string) $default;
        }

        return json_encode(Arr::wrap($default));
    }

    protected function isSearchableColumn(string $columnName): bool
    {
        return in_array($columnName, ['name', 'title', 'email'], true);
    }

    protected function isSortableColumn(string $columnName): bool
    {
        return in_array($columnName, ['id', 'created_at', 'updated_at'], true);
    }
}

