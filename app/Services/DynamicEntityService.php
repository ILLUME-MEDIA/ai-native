<?php

namespace App\Services;

use App\Models\SectionEntity;
use App\Models\SectionField;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
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

        $this->applySearch($model, $entity, $request->string('search')->toString());
        $this->applySorting($model, $entity, $request->string('sort')->toString(), $request->string('direction')->toString());

        $perPage = (int) $request->input('per_page', 15);

        return $model->paginate($perPage);
    }

    public function show(SectionEntity $entity, int|string $id, array $context = [])
    {
        if (! Schema::hasTable($entity->table_name)) {
            throw new \RuntimeException("Table [{$entity->table_name}] does not exist.");
        }

        /** @var Builder $model */
        $model = $this->makeBaseQuery($entity, $context);

        return $model->findOrFail($id);
    }

    public function store(SectionEntity $entity, array $payload, array $context = [])
    {
        if (! Schema::hasTable($entity->table_name)) {
            throw new \RuntimeException("Table [{$entity->table_name}] does not exist.");
        }

        $modelClass = $this->resolveModelClass($entity);

        $fillable = $this->writableFields($entity, $context);
        $data = Arr::only($payload, $fillable);

        return $modelClass->newQuery()->create($data);
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
     * For now, we use the query builder directly on the table; this can later be
     * evolved to custom model classes per entity if needed.
     */
    protected function resolveModelClass(SectionEntity $entity)
    {
        // Use an anonymous model bound to the entity's table.
        $instance = new class extends \Illuminate\Database\Eloquent\Model {};
        $instance->setTable($entity->table_name);

        return $instance;
    }

    /**
     * Determine which fields can be written in the current context.
     */
    protected function writableFields(SectionEntity $entity, array $context = []): array
    {
        $fields = $entity->fields;

        if (Arr::get($context, 'actor') === 'mcp') {
            $fields = $fields->where('mcp_writable', true);
        }

        return $fields->pluck('column_name')->all();
    }
}

