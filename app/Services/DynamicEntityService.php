<?php

namespace App\Services;

use App\Models\SectionEntity;
use App\Models\SectionField;
use App\Models\SectionRelation;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DynamicEntityService
{
    public function resolveEntity(string $slugOrTable): ?SectionEntity
    {
        $entity = SectionEntity::with('fields')
            ->where('slug', $slugOrTable)
            ->orWhere('table_name', $slugOrTable)
            ->first();
        
        // Auto-sync: If entity not found but table exists in database, create it automatically
        if (!$entity && Schema::hasTable($slugOrTable)) {
            $entity = $this->autoCreateEntityFromTable($slugOrTable);
        }
        
        return $entity;
    }
    
    /**
     * Automatically create SectionEntity and fields from an existing database table.
     */
    protected function autoCreateEntityFromTable(string $tableName): ?SectionEntity
    {
        try {
            // Generate entity name and slug
            $name = $this->generateEntityName($tableName);
            $slug = Str::slug($name);
            
            // Ensure slug is unique
            $originalSlug = $slug;
            $counter = 1;
            while (SectionEntity::where('slug', $slug)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }
            
            // Create SectionEntity
            $entity = SectionEntity::create([
                'name' => $name,
                'table_name' => $tableName,
                'slug' => $slug,
                'source_type' => 'database',
                'is_system' => false,
                'default_sort_field' => 'id',
                'default_sort_direction' => 'desc',
                'mcp_enabled' => false,
                'mcp_can_read' => false,
                'mcp_can_create' => false,
                'mcp_can_update' => false,
                'mcp_can_delete' => false,
            ]);
            
            // Auto-sync fields from table columns
            $this->autoSyncFieldsForEntity($entity, $tableName);
            
            // Reload with fields
            $entity->load('fields');
            
            return $entity;
        } catch (\Exception $e) {
            \Log::error("Failed to auto-create entity for table {$tableName}: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Public method: sync section_fields with the real database schema.
     * - Removes field records whose columns no longer exist in the table.
     * - Adds field records for columns that are new (not yet tracked).
     * Called on every entity show() so the editor always reflects reality.
     */
    public function syncFieldsWithSchema(SectionEntity $entity): void
    {
        $tableName = $entity->table_name;

        if (!Schema::hasTable($tableName)) {
            return;
        }

        try {
            $actualColumns = Schema::getColumnListing($tableName);

            // 1. Remove fields for columns that no longer exist in the real table
            $entity->fields()
                ->whereNotIn('column_name', $actualColumns)
                ->delete();

            // 2. Reload fields so autoSyncFieldsForEntity sees the updated set
            $entity->unsetRelation('fields');
            $entity->load('fields');

            // 3. Add fields for any new columns not yet tracked
            $this->autoSyncFieldsForEntity($entity, $tableName);

            // 4. Final reload to ensure fresh data is on the model
            $entity->unsetRelation('fields');
        } catch (\Exception $e) {
            \Log::warning("syncFieldsWithSchema failed for {$tableName}: " . $e->getMessage());
        }
    }

    /**
     * Auto-sync table columns as SectionField records.
     */
    protected function autoSyncFieldsForEntity(SectionEntity $entity, string $tableName): void
    {
        if (!Schema::hasTable($tableName)) {
            return;
        }
        
        $columns = Schema::getColumnListing($tableName);
        $sortOrder = 0;
        
        foreach ($columns as $columnName) {
            // Skip if field already exists
            if ($entity->fields()->where('column_name', $columnName)->exists()) {
                continue;
            }
            
            // Get column details
            $columnDetails = $this->getColumnDetails($tableName, $columnName);
            
            // Determine field type based on column type
            $fieldType = $this->mapColumnTypeToFieldType($columnDetails['type']);
            
            // Create SectionField
            try {
                SectionField::create([
                    'entity_id' => $entity->id,
                    'column_name' => $columnName,
                    'label' => $this->generateFieldLabel($columnName),
                    'type' => $fieldType,
                    'nullable' => $columnDetails['nullable'],
                    'required' => !$columnDetails['nullable'] && $columnName !== 'id',
                    'default_value' => $columnDetails['default'],
                    'list_visible' => in_array($columnName, ['id', 'name', 'title', 'email', 'created_at']),
                    'detail_visible' => true,
                    'is_searchable' => in_array($fieldType, ['text', 'string', 'email', 'number']),
                    'is_sortable' => !in_array($fieldType, ['text', 'textarea', 'longtext', 'json']),
                    'sort_order' => $sortOrder++,
                    'mcp_readable' => true,
                    'mcp_writable' => !in_array($columnName, ['id', 'created_at', 'updated_at']),
                ]);
            } catch (\Exception $e) {
                \Log::warning("Failed to create field {$columnName} for {$tableName}: " . $e->getMessage());
            }
        }
    }
    
    /**
     * Get column details from database.
     */
    protected function getColumnDetails(string $tableName, string $columnName): array
    {
        $connection = DB::connection();
        $database = $connection->getDatabaseName();
        
        $column = DB::selectOne(
            "SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
             FROM information_schema.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
            [$database, $tableName, $columnName]
        );
        
        return [
            'type' => $column->COLUMN_TYPE ?? 'varchar(255)',
            'nullable' => ($column->IS_NULLABLE ?? 'NO') === 'YES',
            'default' => $column->COLUMN_DEFAULT,
        ];
    }
    
    /**
     * Map database column type to SectionField type.
     */
    protected function mapColumnTypeToFieldType(string $columnType): string
    {
        $columnType = strtolower($columnType);
        
        if (str_contains($columnType, 'int')) {
            return 'number';
        }
        
        if (str_contains($columnType, 'decimal') || str_contains($columnType, 'float') || str_contains($columnType, 'double')) {
            return 'number';
        }
        
        if (str_contains($columnType, 'text')) {
            if (str_contains($columnType, 'longtext') || str_contains($columnType, 'mediumtext')) {
                return 'textarea';
            }
            return 'text';
        }
        
        if (str_contains($columnType, 'json')) {
            return 'json';
        }
        
        if (str_contains($columnType, 'date') || str_contains($columnType, 'time')) {
            return 'date';
        }
        
        if (str_contains($columnType, 'bool') || str_contains($columnType, 'tinyint(1)')) {
            return 'boolean';
        }
        
        if (str_contains($columnType, 'email')) {
            return 'email';
        }
        
        // Default to string
        return 'string';
    }
    
    /**
     * Generate a human-readable entity name from table name.
     */
    protected function generateEntityName(string $tableName): string
    {
        // Remove common prefixes/suffixes
        $name = $tableName;
        $name = preg_replace('/^youtube_/', '', $name);
        $name = preg_replace('/^ai_/', '', $name);
        $name = preg_replace('/_table$/', '', $name);
        
        // Convert snake_case to Title Case
        $name = str_replace('_', ' ', $name);
        $name = ucwords($name);
        
        return $name;
    }
    
    /**
     * Generate a human-readable field label from column name.
     */
    protected function generateFieldLabel(string $columnName): string
    {
        // Convert snake_case to Title Case
        $label = str_replace('_', ' ', $columnName);
        $label = ucwords($label);
        
        return $label;
    }

    public function index(SectionEntity $entity, Request $request, array $context = []): LengthAwarePaginator
    {
        if (! Schema::hasTable($entity->table_name)) {
            throw new \RuntimeException("Table [{$entity->table_name}] does not exist. Create it via Section Builder or run migrations.");
        }

        $model = $this->makeBaseQuery($entity, $context);

        // Global search across searchable columns
        $this->applySearch($model, $entity, $request->string('search')->toString());

        // Column-level filters: ?filters[column]=value
        $filters = (array) $request->input('filters', []);
        $this->applyFilters($model, $entity, $filters);

        // Location-based proximity filter: ?lat=&lng=&radius=&unit=miles|km&lat_field=&lng_field=
        $locationApplied = $this->applyLocationFilter($model, $entity, $request);

        // Sorting — if location active and no explicit sort, order by distance
        if ($locationApplied && !$request->filled('sort')) {
            // distance column already added by applyLocationFilter; skip normal sort
        } else {
            $this->applySorting($model, $entity, $request->string('sort')->toString(), $request->string('direction')->toString());
        }

        $perPage = (int) $request->input('per_page', 15);

        $paginator = $model->paginate($perPage);

        // Enrich each record with belongsTo relation data
        $paginator->setCollection(
            $this->enrichCollection($paginator->getCollection(), $entity)
        );

        // Round distance field if location filter was applied
        if ($locationApplied) {
            $alias = ($request->input('unit', 'miles') === 'km') ? 'distance_km' : 'distance_miles';
            $paginator->getCollection()->transform(function ($item) use ($alias) {
                if (isset($item->{$alias})) {
                    $item->{$alias} = round((float) $item->{$alias}, 2);
                }
                return $item;
            });
        }

        return $paginator;
    }

    public function show(SectionEntity $entity, int|string $id, array $context = [])
    {
        if (! Schema::hasTable($entity->table_name)) {
            throw new \RuntimeException("Table [{$entity->table_name}] does not exist.");
        }

        /** @var Builder $model */
        $model = $this->makeBaseQuery($entity, $context);

        $record = $model->findOrFail($id);

        // Enrich with belongsTo data + hasMany/hasOne children
        $this->enrichRecord($record, $entity, includeChildren: true);

        return $record;
    }

    /**
     * Fetch a single record by any field value.
     * e.g. showByField($entity, 'email', 'john@example.com')
     */
    public function showByField(SectionEntity $entity, string $field, string $value, array $context = [])
    {
        if (! Schema::hasTable($entity->table_name)) {
            throw new \RuntimeException("Table [{$entity->table_name}] does not exist.");
        }

        // Validate the field exists (either in section_fields or as an actual DB column)
        $knownColumns = $entity->fields->pluck('column_name')->all();
        $fieldAllowed = in_array($field, $knownColumns, true)
            || Schema::hasColumn($entity->table_name, $field);

        if (! $fieldAllowed) {
            throw new \RuntimeException("Field '{$field}' does not exist on this entity.");
        }

        // Comma-separated values → OR LIKE on each value (works for both numeric IDs in
        // delimited columns like "\t208\t322\t" and regular string searches)
        if (str_contains($value, ',')) {
            $vals = array_values(array_filter(array_map('trim', explode(',', $value)), fn($v) => $v !== ''));

            $records = $this->makeBaseQuery($entity, $context)
                ->where(function ($q) use ($field, $vals) {
                    foreach ($vals as $v) {
                        $q->orWhere($field, 'like', '%' . $v . '%');
                    }
                })
                ->get();

            if ($records->isEmpty()) {
                throw new \Illuminate\Database\Eloquent\ModelNotFoundException(
                    "No records found where {$field} contains any of: " . implode(', ', $vals)
                );
            }

            return $this->enrichCollection($records, $entity);
        }

        // Numeric value → exact match, return single record
        if (is_numeric($value)) {
            $record = $this->makeBaseQuery($entity, $context)
                ->where($field, $value)
                ->first();

            if (! $record) {
                throw new \Illuminate\Database\Eloquent\ModelNotFoundException(
                    "No record found where {$field} = {$value}"
                );
            }

            $this->enrichRecord($record, $entity, includeChildren: true);

            return $record;
        }

        // String value → LIKE keyword search on the specified field, return all matches
        $records = $this->makeBaseQuery($entity, $context)
            ->where($field, 'like', '%' . $value . '%')
            ->get();

        if ($records->isEmpty()) {
            throw new \Illuminate\Database\Eloquent\ModelNotFoundException(
                "No records found where {$field} matches '{$value}'"
            );
        }

        $records = $this->enrichCollection($records, $entity);

        return $records;
    }

    public function store(SectionEntity $entity, array $payload, array $context = [])
    {
        if (! Schema::hasTable($entity->table_name)) {
            throw new \RuntimeException("Table [{$entity->table_name}] does not exist.");
        }

        $modelClass = $this->resolveModelClass($entity);

        $fillable = $this->writableFields($entity, $context);
        $data = Arr::only($payload, $fillable);

        $record = $modelClass->newQuery()->create($data);
        $this->enrichRecord($record, $entity);

        return $record;
    }

    public function update(SectionEntity $entity, int|string $id, array $payload, array $context = [])
    {
        if (! Schema::hasTable($entity->table_name)) {
            throw new \RuntimeException("Table [{$entity->table_name}] does not exist.");
        }

        $modelClass = $this->resolveModelClass($entity);
        $record = $modelClass->newQuery()->findOrFail($id);

        $fillable = $this->writableFields($entity, $context);
        $data = Arr::only($payload, $fillable);

        $record->fill($data);
        $record->save();

        $this->enrichRecord($record, $entity);

        return $record;
    }

    public function destroy(SectionEntity $entity, int|string $id, array $context = []): void
    {
        if (! Schema::hasTable($entity->table_name)) {
            throw new \RuntimeException("Table [{$entity->table_name}] does not exist.");
        }

        $modelClass = $this->resolveModelClass($entity);
        $record = $modelClass->newQuery()->findOrFail($id);

        $record->delete();
    }

    protected function makeBaseQuery(SectionEntity $entity, array $context = []): Builder
    {
        $modelClass = $this->resolveModelClass($entity);

        /** @var Builder $query */
        $query = $modelClass->newQuery();

        // MCP context: restrict selected fields to MCP-readable only
        if (Arr::get($context, 'actor') === 'mcp') {
            $selectable = $entity->fields
                ->where('mcp_readable', true)
                ->pluck('column_name')
                ->all();

            if (!empty($selectable)) {
                $query->select($selectable);
            }
        }

        return $query;
    }

    /**
     * Apply per-column filters — always uses LIKE (partial match) for all values.
     *
     * Single value:          filters[category]=208    → WHERE category LIKE '%208%'
     * Comma-separated:       filters[category]=208,107 → WHERE (category LIKE '%208%' OR category LIKE '%107%')
     * Array:                 filters[category][]=208&filters[category][]=107 → same as above
     *
     * Works with tab/comma-delimited columns (e.g. "\t208\t288\t322\t").
     */
    protected function applyFilters(Builder $query, SectionEntity $entity, array $filters): void
    {
        if (empty($filters)) {
            return;
        }

        $fieldColumns = $entity->fields->pluck('column_name')->all();

        foreach ($filters as $column => $value) {
            if ($value === '' || $value === null) {
                continue;
            }

            if (! in_array($column, $fieldColumns, true) && ! Schema::hasColumn($entity->table_name, $column)) {
                continue;
            }

            // Normalize to array of trimmed non-empty strings
            if (is_array($value)) {
                $vals = array_values(array_filter(array_map('trim', $value), fn($v) => $v !== ''));
            } elseif (str_contains((string) $value, ',')) {
                $vals = array_values(array_filter(array_map('trim', explode(',', (string) $value)), fn($v) => $v !== ''));
            } else {
                $vals = [trim((string) $value)];
            }

            if (empty($vals)) {
                continue;
            }

            // Always OR LIKE — works for plain values and tab/comma-delimited stored values
            if (count($vals) === 1) {
                $query->where($column, 'like', '%' . $vals[0] . '%');
            } else {
                $query->where(function (Builder $q) use ($column, $vals) {
                    foreach ($vals as $v) {
                        $q->orWhere($column, 'like', '%' . $v . '%');
                    }
                });
            }
        }
    }

    protected function applySearch(Builder $query, SectionEntity $entity, ?string $term): void
    {
        if (!$term) {
            return;
        }

        // 1. Try is_searchable=true fields — but only string/text types (not numbers)
        $searchable = $entity->fields
            ->where('is_searchable', true)
            ->filter(fn($f) => in_array($f->type, ['string', 'text', 'email', 'textarea', 'longtext', 'slug', 'url']))
            ->pluck('column_name')
            ->all();

        // 2. Fall back to fields with string/text type
        if (empty($searchable)) {
            $searchable = $entity->fields
                ->filter(fn($f) => in_array($f->type, ['string', 'text', 'email', 'textarea', 'longtext', 'slug', 'url']))
                ->pluck('column_name')
                ->all();
        }

        // 3. Final fallback: get varchar/text columns directly from DB schema
        if (empty($searchable)) {
            $searchable = $this->getTextColumnsFromSchema($entity->table_name);
        }

        if (empty($searchable)) {
            return;
        }

        $query->where(function (Builder $inner) use ($searchable, $term) {
            foreach ($searchable as $col) {
                $inner->orWhere($col, 'like', "%{$term}%");
            }
        });
    }

    protected function getTextColumnsFromSchema(string $tableName): array
    {
        try {
            $database = DB::connection()->getDatabaseName();
            $rows = DB::select(
                "SELECT COLUMN_NAME FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
                 AND DATA_TYPE IN ('varchar','char','text','tinytext','mediumtext','longtext')",
                [$database, $tableName]
            );
            // Handle both uppercase (COLUMN_NAME) and lowercase (column_name) depending on PDO config
            $cols = [];
            foreach ($rows as $row) {
                $arr = (array) $row;
                $col = $arr['COLUMN_NAME'] ?? $arr['column_name'] ?? null;
                if ($col) $cols[] = $col;
            }
            return $cols;
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Debug: return which columns are being searched for a given entity + term.
     * Call via GET /api/entities/{entity}?search=term&debug_search=1
     */
    public function debugSearch(SectionEntity $entity, string $term): array
    {
        $step1 = $entity->fields
            ->where('is_searchable', true)
            ->filter(fn($f) => in_array($f->type, ['string', 'text', 'email', 'textarea', 'longtext', 'slug', 'url']))
            ->pluck('column_name')
            ->all();
        $step2 = $entity->fields
            ->filter(fn($f) => in_array($f->type, ['string', 'text', 'email', 'textarea', 'longtext', 'slug', 'url']))
            ->pluck('column_name')
            ->all();
        $step3 = $this->getTextColumnsFromSchema($entity->table_name);
        $final = !empty($step1) ? $step1 : (!empty($step2) ? $step2 : $step3);

        return [
            'search_term'         => $term,
            'fields_count'        => $entity->fields->count(),
            'step1_is_searchable' => $step1,
            'step2_type_fallback' => $step2,
            'step3_db_schema'     => $step3,
            'final_columns'       => $final,
            'final_count'         => count($final),
        ];
    }

    /**
     * Apply Haversine-based proximity filter when lat+lng are provided.
     *
     * Params (all optional except lat+lng pair):
     *   lat        — user latitude  (decimal degrees)
     *   lng        — user longitude (decimal degrees)
     *   radius     — search radius, default 100
     *   unit       — "miles" (default) or "km"
     *   lat_field  — column name for latitude  (default: latitude)
     *   lng_field  — column name for longitude (default: longitude)
     *
     * When active, adds `distance_miles` or `distance_km` to SELECT and sorts ASC.
     * Returns true if location filter was applied, false otherwise.
     */
    protected function applyLocationFilter(Builder $query, SectionEntity $entity, Request $request): bool
    {
        $lat = $request->filled('lat') ? (float) $request->input('lat') : null;
        $lng = $request->filled('lng') ? (float) $request->input('lng') : null;

        if ($lat === null || $lng === null) {
            return false;
        }

        if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            return false;
        }

        $unit      = $request->input('unit', 'miles');
        $earthR    = $unit === 'km' ? 6371 : 3959;
        $radius    = $request->filled('radius') ? (float) $request->input('radius') : 100;
        $alias     = $unit === 'km' ? 'distance_km' : 'distance_miles';
        $latField  = $request->input('lat_field',  'latitude');
        $lngField  = $request->input('lng_field',  'longitude');

        // Verify columns exist in the table
        if (
            !Schema::hasColumn($entity->table_name, $latField) ||
            !Schema::hasColumn($entity->table_name, $lngField)
        ) {
            return false;
        }

        $expr = "( {$earthR} * acos( LEAST(1, cos(radians({$lat})) * cos(radians(`{$latField}`)) * cos(radians(`{$lngField}`) - radians({$lng})) + sin(radians({$lat})) * sin(radians(`{$latField}`)) ) ) )";

        $query->selectRaw("*, {$expr} AS `{$alias}`")
              ->whereNotNull($latField)
              ->whereNotNull($lngField)
              ->whereRaw("{$expr} <= ?", [$radius])
              ->orderByRaw("{$expr} ASC");

        return true;
    }

    protected function applySorting(Builder $query, SectionEntity $entity, ?string $sort, ?string $direction): void
    {
        if (! $sort) {
            $sort = $entity->default_sort_field ?? 'id';
        }

        $direction = in_array(strtolower($direction ?? ''), ['asc', 'desc'], true) ? $direction : 'asc';

        $sortableField = $entity->fields->where('column_name', $sort)->where('is_sortable', true)->first();
        $columnExists = Schema::hasTable($entity->table_name) && Schema::hasColumn($entity->table_name, $sort);
        if ($sortableField || $columnExists) {
            $query->orderBy($sort, $direction);
        }
    }

    /**
     * Resolve the underlying Eloquent model for an entity.
     * Detects the real primary key and whether it is auto-increment.
     */
    protected function resolveModelClass(SectionEntity $entity)
    {
        [$pk, $incrementing] = $this->detectPrimaryKeyInfo($entity->table_name);

        $instance = new class($pk, $incrementing) extends \Illuminate\Database\Eloquent\Model {
            protected $guarded = [];
            protected $primaryKey;
            public $incrementing;

            public function __construct(string $pk = 'id', bool $inc = true, array $attributes = [])
            {
                $this->primaryKey  = $pk;
                $this->incrementing = $inc;
                parent::__construct($attributes);
            }
        };
        $instance->setTable($entity->table_name);

        return $instance;
    }

    /**
     * Public alias for detectPrimaryKey — used by controllers.
     */
    public function detectPk(string $tableName): string
    {
        return $this->detectPrimaryKey($tableName);
    }

    /**
     * Detect PK column name + whether it is AUTO_INCREMENT.
     * Returns [columnName, isAutoIncrement].
     */
    protected function detectPrimaryKeyInfo(string $tableName): array
    {
        try {
            $database = DB::connection()->getDatabaseName();
            $row = DB::selectOne(
                "SELECT c.COLUMN_NAME, c.EXTRA
                 FROM information_schema.KEY_COLUMN_USAGE k
                 JOIN information_schema.COLUMNS c
                   ON c.TABLE_SCHEMA = k.TABLE_SCHEMA
                  AND c.TABLE_NAME  = k.TABLE_NAME
                  AND c.COLUMN_NAME = k.COLUMN_NAME
                 WHERE k.TABLE_SCHEMA = ? AND k.TABLE_NAME = ? AND k.CONSTRAINT_NAME = 'PRIMARY'
                 ORDER BY k.ORDINAL_POSITION LIMIT 1",
                [$database, $tableName]
            );
            $col = $row ? ($row->COLUMN_NAME ?? $row->column_name ?? 'id') : 'id';
            $inc = $row ? str_contains(strtolower($row->EXTRA ?? $row->extra ?? ''), 'auto_increment') : true;
            return [$col, $inc];
        } catch (\Exception $e) {
            return ['id', true];
        }
    }

    /**
     * Detect the actual primary key column of a table.
     * Falls back to 'id' if the table has no PRIMARY constraint or on any error.
     */
    protected function detectPrimaryKey(string $tableName): string
    {
        try {
            $database = DB::connection()->getDatabaseName();
            $pk = DB::selectOne(
                "SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY'
                 ORDER BY ORDINAL_POSITION LIMIT 1",
                [$database, $tableName]
            );
            return $pk ? ($pk->COLUMN_NAME ?? $pk->column_name ?? 'id') : 'id';
        } catch (\Exception $e) {
            return 'id';
        }
    }

    // ─── Relation Enrichment ─────────────────────────────────────────────────

    /**
     * Bulk-enrich a collection of records with relation data.
     * One query per relation field (never N+1).
     * Handles belongsTo, hasMany, and hasOne.
     */
    protected function enrichCollection(Collection $records, SectionEntity $entity): Collection
    {
        if ($records->isEmpty()) {
            return $records;
        }

        $entity->loadMissing('fields.relatedEntity');

        $relatedFields = $entity->fields->filter(
            fn($f) => $f->related_entity_id && $f->relatedEntity
        );

        if ($relatedFields->isEmpty()) {
            return $records;
        }

        // ── belongsTo: FK is on this table ───────────────────────────────
        $belongsToFields = $relatedFields->filter(fn($f) => $f->relation_type === 'belongsTo');

        $lookup = [];
        foreach ($belongsToFields as $field) {
            $fkValues = $records->pluck($field->column_name)->filter()->unique()->values()->all();
            if (empty($fkValues)) {
                continue;
            }

            $relatedTable = $field->relatedEntity->table_name;
            if (! Schema::hasTable($relatedTable)) {
                continue;
            }

            // Support matching on a custom column (e.g. 'name') instead of always 'id'.
            // Set relation_display_column on the field to the column name in the related table.
            $matchColumn = $field->relation_display_column ?: 'id';

            $fetched = DB::table($relatedTable)
                ->whereIn($matchColumn, $fkValues)
                ->get();

            // Apply one level of nested enrichment (e.g. accounts → uploads)
            $fetchedArr  = $fetched->map(fn($r) => (array) $r)->values()->all();
            $enrichedArr = $this->enrichRelatedRecordsArray($fetchedArr, $field->relatedEntity);
            $lookup[$field->column_name] = collect($enrichedArr)->keyBy($matchColumn);
        }

        $records = $records->map(function ($record) use ($belongsToFields, $lookup) {
            foreach ($belongsToFields as $field) {
                $fkValue = $record->{$field->column_name} ?? null;
                if ($fkValue !== null && isset($lookup[$field->column_name][$fkValue])) {
                    $record->setAttribute(
                        $field->column_name . '_relation',
                        (array) $lookup[$field->column_name][$fkValue]
                    );
                }
            }
            return $record;
        });

        // ── hasMany / hasOne: FK is on related table ─────────────────────
        $hasManyFields = $relatedFields->filter(
            fn($f) => in_array($f->relation_type, ['hasMany', 'hasOne'], true)
        );

        if ($hasManyFields->isEmpty()) {
            return $records;
        }

        // Collect all local keys from the collection (one batch per field)
        $localKeys = $records->map(fn($r) => $r->getKey())->filter()->unique()->values()->all();

        foreach ($hasManyFields as $field) {
            $relatedTable = $field->relatedEntity->table_name;
            if (! Schema::hasTable($relatedTable)) {
                \Log::warning("enrichCollection: related table [{$relatedTable}] does not exist for field [{$field->column_name}]");
                continue;
            }

            $foreignKey = $field->relation_display_column ?: (Str::singular($entity->table_name) . '_id');

            // Guard: skip if FK column doesn't exist in related table
            if (! Schema::hasColumn($relatedTable, $foreignKey)) {
                \Log::warning("enrichCollection: FK column [{$foreignKey}] does not exist in [{$relatedTable}] for field [{$field->column_name}]. Set 'Foreign Key Column' in Section Builder.");
                $records = $records->map(function ($record) use ($field) {
                    $record->setAttribute($field->column_name, $field->relation_type === 'hasMany' ? [] : null);
                    return $record;
                });
                continue;
            }

            \Log::info("enrichCollection: loading [{$field->column_name}] via [{$relatedTable}].{$foreignKey} IN (" . implode(',', $localKeys) . ")");

            // Single batch query for all records
            $allChildren = DB::table($relatedTable)->whereIn($foreignKey, $localKeys)->get();

            \Log::info("enrichCollection: found {$allChildren->count()} children for [{$field->column_name}]");

            // Group by FK value.
            // Use case-insensitive property lookup because the user may have saved
            // the FK as "recordnum" while MySQL returns the column as "recordNum".
            $fkLower = strtolower($foreignKey);
            $childrenByKey = [];
            foreach ($allChildren as $child) {
                $childArr = (array) $child;
                $fkValue  = null;
                foreach ($childArr as $col => $val) {
                    if (strtolower($col) === $fkLower) {
                        $fkValue = $val;
                        break;
                    }
                }
                $key = (string) ($fkValue ?? '');
                $childrenByKey[$key][] = $childArr;
            }

            $records = $records->map(function ($record) use ($field, $childrenByKey) {
                $key      = (string) $record->getKey();
                $children = $childrenByKey[$key] ?? [];

                if ($field->relation_type === 'hasMany') {
                    $record->setAttribute($field->column_name, array_values($children));
                } else {
                    $record->setAttribute($field->column_name, $children[0] ?? null);
                }

                return $record;
            });
        }

        return $records;
    }

    /**
     * Enrich a single record with relation data.
     *
     * $includeChildren = true → also fetch hasMany / hasOne children
     * (used for show() so the full record is returned with nested data)
     */
    protected function enrichRecord($record, SectionEntity $entity, bool $includeChildren = false): void
    {
        $entity->loadMissing('fields.relatedEntity');

        // ── belongsTo fields ──────────────────────────────────────────────
        foreach ($entity->fields as $field) {
            if (! $field->related_entity_id || ! $field->relatedEntity) {
                continue;
            }

            if ($field->relation_type === 'belongsTo') {
                $fkValue = $record->{$field->column_name} ?? null;
                if ($fkValue === null) {
                    continue;
                }

                $relatedTable = $field->relatedEntity->table_name;
                if (! Schema::hasTable($relatedTable)) {
                    continue;
                }

                // Support matching on a custom column (e.g. 'name') instead of always 'id'.
                $matchColumn = $field->relation_display_column ?: 'id';
                $related = $matchColumn === 'id'
                    ? DB::table($relatedTable)->find($fkValue)
                    : DB::table($relatedTable)->where($matchColumn, $fkValue)->first();

                if ($related) {
                    // Apply one level of nested enrichment (e.g. accounts → uploads)
                    $enriched = $this->enrichRelatedRecordsArray([(array) $related], $field->relatedEntity);
                    $record->setAttribute($field->column_name . '_relation', $enriched[0] ?? null);
                } else {
                    $record->setAttribute($field->column_name . '_relation', null);
                }
            }
        }

        if (! $includeChildren) {
            return;
        }

        // ── hasMany / hasOne via section_relations table ──────────────────
        $sectionRelations = SectionRelation::where('parent_entity_id', $entity->id)
            ->whereIn('relation_type', ['hasMany', 'hasOne'])
            ->with('childEntity')
            ->get();

        foreach ($sectionRelations as $rel) {
            if (! $rel->childEntity) {
                continue;
            }

            $childTable = $rel->childEntity->table_name;
            if (! Schema::hasTable($childTable)) {
                continue;
            }

            $foreignKey = $rel->foreign_key ?: Str::singular($entity->table_name) . '_id';
            $localKey   = $rel->local_key   ?: 'id';
            $localValue = $record->{$localKey} ?? null;

            if ($localValue === null) {
                continue;
            }

            if ($rel->relation_type === 'hasMany') {
                $children = DB::table($childTable)->where($foreignKey, $localValue)->get();
                $record->setAttribute(
                    Str::camel($childTable),
                    $children->map(fn($r) => (array) $r)->values()->all()
                );
            } elseif ($rel->relation_type === 'hasOne') {
                $child = DB::table($childTable)->where($foreignKey, $localValue)->first();
                $record->setAttribute(
                    Str::camel(Str::singular($childTable)),
                    $child ? (array) $child : null
                );
            }
        }

        // ── hasMany / hasOne fields directly on section_fields ────────────
        foreach ($entity->fields as $field) {
            if (! $field->related_entity_id || ! $field->relatedEntity) {
                continue;
            }
            if (! in_array($field->relation_type, ['hasMany', 'hasOne'], true)) {
                continue;
            }

            $relatedTable = $field->relatedEntity->table_name;
            if (! Schema::hasTable($relatedTable)) {
                continue;
            }

            // Use relation_display_column as custom FK if set, otherwise fall back to convention
            $foreignKey = $field->relation_display_column ?: (Str::singular($entity->table_name) . '_id');
            $localValue = $record->getKey() ?? null;
            if ($localValue === null) {
                continue;
            }

            if ($field->relation_type === 'hasMany') {
                $children = DB::table($relatedTable)->where($foreignKey, $localValue)->get();
                $record->setAttribute(
                    $field->column_name,
                    $children->map(fn($r) => (array) $r)->values()->all()
                );
            } elseif ($field->relation_type === 'hasOne') {
                $child = DB::table($relatedTable)->where($foreignKey, $localValue)->first();
                $record->setAttribute($field->column_name, $child ? (array) $child : null);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Apply one level of enrichment to a plain-array list of related records.
     *
     * Used after a belongsTo fetch so that the related record itself gets its
     * own nested relations attached. Example:
     *   article.author (text) → accounts (belongsTo by name)
     *   accounts.id → uploads (hasMany via section_relations, FK=recordNum)
     *
     * @param  array[]        $records       Array of plain arrays (from DB::table)
     * @param  SectionEntity  $relatedEntity The entity that "owns" these records
     * @return array[]
     */
    protected function enrichRelatedRecordsArray(array $records, SectionEntity $relatedEntity): array
    {
        if (empty($records)) {
            return $records;
        }

        $relatedEntity->loadMissing('fields.relatedEntity');

        // ── belongsTo fields on the related entity ────────────────────────
        $belongsToFields = $relatedEntity->fields->filter(
            fn($f) => $f->related_entity_id && $f->relatedEntity && $f->relation_type === 'belongsTo'
        );

        foreach ($belongsToFields as $field) {
            $fkValues = collect($records)->pluck($field->column_name)->filter()->unique()->values()->all();
            if (empty($fkValues)) {
                continue;
            }

            $nestedTable = $field->relatedEntity->table_name;
            if (! Schema::hasTable($nestedTable)) {
                continue;
            }

            $matchCol    = $field->relation_display_column ?: 'id';
            $nestedLookup = DB::table($nestedTable)
                ->whereIn($matchCol, $fkValues)
                ->get()
                ->keyBy($matchCol);

            $records = array_map(function ($record) use ($field, $nestedLookup) {
                $fkValue = $record[$field->column_name] ?? null;
                if ($fkValue !== null && isset($nestedLookup[$fkValue])) {
                    $record[$field->column_name . '_relation'] = (array) $nestedLookup[$fkValue];
                }
                return $record;
            }, $records);
        }

        // ── hasMany / hasOne via section_relations on the related entity ──
        $sectionRelations = SectionRelation::where('parent_entity_id', $relatedEntity->id)
            ->whereIn('relation_type', ['hasMany', 'hasOne'])
            ->with('childEntity')
            ->get();

        foreach ($sectionRelations as $rel) {
            if (! $rel->childEntity) {
                continue;
            }

            $childTable = $rel->childEntity->table_name;
            if (! Schema::hasTable($childTable)) {
                continue;
            }

            $foreignKey    = $rel->foreign_key ?: Str::singular($relatedEntity->table_name) . '_id';
            $localKey      = $rel->local_key   ?: 'id';
            $localKeyLower = strtolower($localKey);

            $localValues = collect($records)->map(function ($r) use ($localKeyLower) {
                foreach ($r as $col => $val) {
                    if (strtolower($col) === $localKeyLower) {
                        return $val;
                    }
                }
                return null;
            })->filter()->unique()->values()->all();

            if (empty($localValues)) {
                continue;
            }

            $allChildren = DB::table($childTable)->whereIn($foreignKey, $localValues)->get();
            $fkLower     = strtolower($foreignKey);

            $childrenByKey = [];
            foreach ($allChildren as $child) {
                $childArr = (array) $child;
                $fkValue  = null;
                foreach ($childArr as $col => $val) {
                    if (strtolower($col) === $fkLower) {
                        $fkValue = $val;
                        break;
                    }
                }
                $childrenByKey[(string) ($fkValue ?? '')][] = $childArr;
            }

            $attrName = $rel->relation_type === 'hasMany'
                ? Str::camel($childTable)
                : Str::camel(Str::singular($childTable));

            $records = array_map(
                function ($record) use ($rel, $childrenByKey, $localKeyLower, $attrName) {
                    $localVal = null;
                    foreach ($record as $col => $val) {
                        if (strtolower($col) === $localKeyLower) {
                            $localVal = $val;
                            break;
                        }
                    }
                    $children = $childrenByKey[(string) ($localVal ?? '')] ?? [];
                    $record[$attrName] = $rel->relation_type === 'hasMany'
                        ? array_values($children)
                        : ($children[0] ?? null);
                    return $record;
                },
                $records
            );
        }

        return $records;
    }

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Determine which fields can be written in the current context.
     */
    protected function writableFields(SectionEntity $entity, array $context = []): array
    {
        $fields = $entity->fields;

        if (Arr::get($context, 'actor') === 'mcp') {
            $fields = $fields->where('mcp_writable', true);
        }

        // hasMany / hasOne relation fields have no column in the main table — exclude them
        $fields = $fields->filter(
            fn($f) => ! in_array($f->relation_type, ['hasMany', 'hasOne'], true)
        );

        return $fields->pluck('column_name')->all();
    }
}

