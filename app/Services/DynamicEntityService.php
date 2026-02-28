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

        // Sorting
        $this->applySorting($model, $entity, $request->string('sort')->toString(), $request->string('direction')->toString());

        $perPage = (int) $request->input('per_page', 15);

        $paginator = $model->paginate($perPage);

        // Enrich each record with belongsTo relation data
        $paginator->setCollection(
            $this->enrichCollection($paginator->getCollection(), $entity)
        );

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
     * Apply per-column filters (Datatables-style).
     *
     * Expected query format:
     *   GET /api/entities/{slug}?filters[name]=John&filters[status]=active
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

            // Only allow known columns
            if (! in_array($column, $fieldColumns, true) && ! Schema::hasColumn($entity->table_name, $column)) {
                continue;
            }

            // Simple "LIKE" filter (works for most datatable use-cases)
            $query->where($column, 'like', '%'.$value.'%');
        }
    }

    protected function applySearch(Builder $query, SectionEntity $entity, ?string $term): void
    {
        if (!$term) {
            return;
        }

        $searchable = $entity->fields->where('is_searchable', true)->pluck('column_name')->all();

        if (empty($searchable)) {
            return;
        }

        $query->where(function (Builder $inner) use ($searchable, $term) {
            foreach ($searchable as $col) {
                $inner->orWhere($col, 'like', "%{$term}%");
            }
        });
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
     * Detects the real primary key so tables that use e.g. 'num' instead of 'id' work correctly.
     */
    protected function resolveModelClass(SectionEntity $entity)
    {
        $pk = $this->detectPrimaryKey($entity->table_name);

        $instance = new class($pk) extends \Illuminate\Database\Eloquent\Model {
            protected $guarded = [];
            protected $primaryKey;

            public function __construct(string $pk = 'id', array $attributes = [])
            {
                $this->primaryKey = $pk;
                parent::__construct($attributes);
            }
        };
        $instance->setTable($entity->table_name);

        return $instance;
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
            return $pk ? $pk->COLUMN_NAME : 'id';
        } catch (\Exception $e) {
            return 'id';
        }
    }

    // ─── Relation Enrichment ─────────────────────────────────────────────────

    /**
     * Bulk-enrich a collection of records with belongsTo relation data.
     * One query per relation field (not N+1).
     */
    protected function enrichCollection(Collection $records, SectionEntity $entity): Collection
    {
        if ($records->isEmpty()) {
            return $records;
        }

        $entity->loadMissing('fields.relatedEntity');

        $belongsToFields = $entity->fields->filter(
            fn($f) => $f->related_entity_id && $f->relatedEntity && $f->relation_type === 'belongsTo'
        );

        if ($belongsToFields->isEmpty()) {
            return $records;
        }

        // Build a lookup map per FK field: [fkValue => relatedRecord]
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

            $lookup[$field->column_name] = DB::table($relatedTable)
                ->whereIn('id', $fkValues)
                ->get()
                ->keyBy('id');
        }

        // Attach relation data to each record
        return $records->map(function ($record) use ($belongsToFields, $lookup) {
            foreach ($belongsToFields as $field) {
                $fkValue = $record->{$field->column_name} ?? null;
                if ($fkValue !== null && isset($lookup[$field->column_name][$fkValue])) {
                    $related = (array) $lookup[$field->column_name][$fkValue];
                    $record->setAttribute($field->column_name . '_relation', $related);
                }
            }
            return $record;
        });
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

                $related = DB::table($relatedTable)->find($fkValue);
                $record->setAttribute(
                    $field->column_name . '_relation',
                    $related ? (array) $related : null
                );
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

            $foreignKey = Str::singular($entity->table_name) . '_id';
            $localValue = $record->id ?? null;
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

