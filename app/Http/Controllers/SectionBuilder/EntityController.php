<?php

namespace App\Http\Controllers\SectionBuilder;

use App\Http\Controllers\Controller;
use App\Models\SectionEntity;
use App\Services\DynamicEntityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EntityController extends Controller
{
    public function __construct(protected DynamicEntityService $entityService)
    {
    }
    
    public function index()
    {
        // Auto-sync: Check for missing tables and create entities
        $this->autoSyncMissingTables();

        $entities = SectionEntity::query()
            ->select(['id', 'name', 'table_name', 'slug', 'mcp_enabled', 'source_type', 'is_system'])
            ->orderBy('name')
            ->get();

        // Attach live record count from each table
        foreach ($entities as $entity) {
            $entity->total_rows = null;
            try {
                if (\Illuminate\Support\Facades\Schema::hasTable($entity->table_name)) {
                    $entity->total_rows = \Illuminate\Support\Facades\DB::table($entity->table_name)->count();
                }
            } catch (\Throwable) {
                // Fail softly
            }
        }

        return response()->json($entities);
    }
    
    /**
     * Auto-sync missing database tables to Section Editor,
     * and sync fields for ALL existing entities so dropped/added columns
     * are reflected immediately without opening each entity.
     */
    protected function autoSyncMissingTables(): void
    {
        try {
            $connection = \Illuminate\Support\Facades\DB::connection();
            $database   = $connection->getDatabaseName();

            $tables = \Illuminate\Support\Facades\DB::select(
                "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'",
                [$database]
            );

            $systemTables = [
                'migrations', 'failed_jobs', 'password_reset_tokens',
                'personal_access_tokens', 'sessions',
            ];

            $existingDbTables = collect($tables)->pluck('TABLE_NAME')->all();

            // Direction 1: DB table exists but no section_entity → auto-create entity
            foreach ($existingDbTables as $tableName) {
                if (in_array($tableName, $systemTables)) {
                    continue;
                }

                $entity = SectionEntity::where('table_name', $tableName)->first();

                if (!$entity) {
                    $this->entityService->resolveEntity($tableName);
                } else {
                    $this->entityService->syncFieldsWithSchema($entity);
                }
            }

            // Direction 2: ANY section_entity whose actual DB table is missing → create it
            SectionEntity::all()->each(function ($entity) use ($existingDbTables) {
                if (!in_array($entity->table_name, $existingDbTables)) {
                    try {
                        Schema::create($entity->table_name, function (\Illuminate\Database\Schema\Blueprint $table) {
                            $table->id();
                            $table->timestamps();
                        });

                        // Also add any columns already defined in section_fields
                        $entity->load('fields');
                        foreach ($entity->fields as $field) {
                            if (in_array($field->column_name, ['id', 'created_at', 'updated_at'])) {
                                continue;
                            }
                            if (!Schema::hasColumn($entity->table_name, $field->column_name)) {
                                Schema::table($entity->table_name, function (\Illuminate\Database\Schema\Blueprint $table) use ($field) {
                                    $col = match ($field->type) {
                                        'number'            => $table->integer($field->column_name),
                                        'decimal'           => $table->decimal($field->column_name, 10, 2),
                                        'boolean'           => $table->boolean($field->column_name)->default(false),
                                        'date'              => $table->date($field->column_name),
                                        'datetime'          => $table->dateTime($field->column_name),
                                        'text', 'textarea'  => $table->text($field->column_name),
                                        'longtext'          => $table->longText($field->column_name),
                                        'json'              => $table->json($field->column_name),
                                        default             => $table->string($field->column_name, 255),
                                    };
                                    if ($field->nullable) {
                                        $col->nullable();
                                    }
                                });
                            }
                        }

                        \Log::info("Auto-created missing DB table: {$entity->table_name}");
                    } catch (\Exception $e) {
                        \Log::warning("Failed to auto-create table {$entity->table_name}: " . $e->getMessage());
                    }
                }
            });
        } catch (\Exception $e) {
            \Log::warning("Auto-sync failed: " . $e->getMessage());
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'table_name' => ['required', 'string', 'max:255', 'alpha_dash', 'unique:section_entities,table_name'],
            'slug' => ['nullable', 'string', 'max:255', 'alpha_dash', 'unique:section_entities,slug'],
        ]);

        $data['slug'] = $data['slug'] ?? Str::slug($data['table_name']);
        $data['source_type'] = 'frontend';
        $data['is_system'] = false;

        // Create the actual database table if it doesn't already exist
        if (!Schema::hasTable($data['table_name'])) {
            Schema::create($data['table_name'], function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->timestamps();
            });
        }

        $entity = SectionEntity::create($data);

        Cache::forget('section_builder_schema_sync_last');

        return response()->json($entity, 201);
    }

    public function show($entity)
    {
        $resolved = $this->resolveEntity($entity);

        // Sync stored fields with the real DB schema every time the entity is loaded.
        // This removes fields for dropped columns and adds fields for new columns.
        $this->entityService->syncFieldsWithSchema($resolved);

        $resolved->load(['fields' => fn ($q) => $q->orderBy('sort_order')->with('relatedEntity:id,name,table_name,slug')]);
        return response()->json($resolved);
    }

    /**
     * Resolve entity by ID, slug, or table name - auto-creates if table exists.
     */
    protected function resolveEntity($entity): SectionEntity
    {
        $resolved = null;
        
        if (is_numeric($entity)) {
            $resolved = SectionEntity::find($entity);
        } else {
            // Try slug or table name
            $resolved = SectionEntity::where('slug', $entity)
                ->orWhere('table_name', $entity)
                ->first();
        }
        
        // If not found but table exists in database, auto-create it
        if (!$resolved && Schema::hasTable($entity)) {
            $resolved = $this->entityService->resolveEntity($entity);
        }
        
        if (!$resolved) {
            abort(404, "Entity not found: {$entity}");
        }
        
        return $resolved;
    }
    
    public function update(Request $request, $entity)
    {
        $resolved = $this->resolveEntity($entity);
        
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'table_name' => [
                'sometimes',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('section_entities', 'table_name')->ignore($resolved->id),
            ],
            'slug' => [
                'sometimes',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('section_entities', 'slug')->ignore($resolved->id),
            ],
            'mcp_enabled' => ['sometimes', 'boolean'],
            'mcp_can_read' => ['sometimes', 'boolean'],
            'mcp_can_create' => ['sometimes', 'boolean'],
            'mcp_can_update' => ['sometimes', 'boolean'],
            'mcp_can_delete' => ['sometimes', 'boolean'],
            'fields' => ['sometimes', 'array'],
            'fields.*.name' => ['required', 'string', 'max:255'],
            'fields.*.slug' => ['required', 'string', 'max:255'],
            'fields.*.type' => ['required', 'string', 'max:50'],
            'fields.*.required' => ['sometimes', 'boolean'],
            'fields.*.nullable' => ['sometimes', 'boolean'],
            'fields.*.default_value' => ['nullable', 'string'],
            'fields.*.is_listing_visible' => ['sometimes', 'boolean'],
            'fields.*.is_detail_visible' => ['sometimes', 'boolean'],
            'fields.*.id' => ['nullable', 'integer'],
            'fields.*.related_entity_id' => ['nullable', 'integer', 'exists:section_entities,id'],
            'fields.*.relation_type' => ['nullable', 'string', 'max:32'],
            'fields.*.relation_display_column' => ['nullable', 'string', 'max:64'],
        ]);

        $resolved->fill($data);
        $resolved->save();

        // Sync fields if provided
        if (isset($data['fields'])) {
            // Capture old fields keyed by ID for rename detection
            $oldFields = $resolved->fields()->get()->keyBy('id');

            // Detect and apply DB column renames BEFORE deleting section_fields
            foreach ($data['fields'] as $fieldData) {
                $fieldId       = $fieldData['id'] ?? null;
                $newColumnName = $fieldData['slug'];

                if (
                    $fieldId &&
                    isset($oldFields[$fieldId]) &&
                    $oldFields[$fieldId]->column_name !== $newColumnName &&
                    Schema::hasTable($resolved->table_name) &&
                    Schema::hasColumn($resolved->table_name, $oldFields[$fieldId]->column_name) &&
                    !Schema::hasColumn($resolved->table_name, $newColumnName)
                ) {
                    $oldColumnName = $oldFields[$fieldId]->column_name;
                    Schema::table($resolved->table_name, function (\Illuminate\Database\Schema\Blueprint $table) use ($oldColumnName, $newColumnName) {
                        $table->renameColumn($oldColumnName, $newColumnName);
                    });
                }
            }

            // Delete existing fields
            $resolved->fields()->delete();

            // Create new fields with sort order
            foreach ($data['fields'] as $index => $fieldData) {
                $columnName = $fieldData['slug'];
                $fieldType  = $fieldData['type'];
                $isNullable = $fieldData['nullable'] ?? true;

                $resolved->fields()->create([
                    'column_name' => $columnName,
                    'label' => $fieldData['name'],
                    'type' => $fieldType,
                    'related_entity_id' => $fieldData['related_entity_id'] ?? null,
                    'relation_type' => $fieldData['relation_type'] ?? null,
                    'relation_display_column' => $fieldData['relation_display_column'] ?? null,
                    'required' => $fieldData['required'] ?? false,
                    'nullable' => $isNullable,
                    'default_value' => $fieldData['default_value'] ?? null,
                    'list_visible' => $fieldData['is_listing_visible'] ?? true,
                    'detail_visible' => $fieldData['is_detail_visible'] ?? true,
                    'sort_order' => $index,
                ]);

                // Add column to actual DB table if it doesn't exist (new field, not a rename)
                if (
                    !in_array($columnName, ['id', 'created_at', 'updated_at']) &&
                    Schema::hasTable($resolved->table_name) &&
                    !Schema::hasColumn($resolved->table_name, $columnName)
                ) {
                    Schema::table($resolved->table_name, function (\Illuminate\Database\Schema\Blueprint $table) use ($columnName, $fieldType, $isNullable) {
                        $col = match ($fieldType) {
                            'number'            => $table->integer($columnName),
                            'decimal'           => $table->decimal($columnName, 10, 2),
                            'boolean'           => $table->boolean($columnName)->default(false),
                            'date'              => $table->date($columnName),
                            'datetime'          => $table->dateTime($columnName),
                            'text', 'textarea'  => $table->text($columnName),
                            'longtext'          => $table->longText($columnName),
                            'json'              => $table->json($columnName),
                            default             => $table->string($columnName, 255),
                        };
                        if ($isNullable) {
                            $col->nullable();
                        }
                    });
                }
            }
        }

        // Reload with fields
        $resolved->load('fields');

        Cache::forget('section_builder_schema_sync_last');

        return response()->json($resolved);
    }

    public function destroy($entity)
    {
        $resolved = $this->resolveEntity($entity);

        // Prevent deleting system tables
        if ($resolved->is_system) {
            return response()->json(['error' => 'System tables cannot be deleted.'], 403);
        }

        // Drop the actual database table if it exists
        if (Schema::hasTable($resolved->table_name)) {
            Schema::dropIfExists($resolved->table_name);
        }

        // Delete section_fields and then the entity record
        $resolved->fields()->delete();
        $resolved->delete();

        Cache::forget('section_builder_schema_sync_last');

        return response()->json(['message' => "Table '{$resolved->table_name}' deleted successfully."]);
    }

    public function getMcpConfig($entity)
    {
        $resolved = $this->resolveEntity($entity);

        return response()->json([
            'enabled' => $resolved->mcp_enabled,
            'read' => $resolved->mcp_can_read,
            'create' => $resolved->mcp_can_create,
            'update' => $resolved->mcp_can_update,
            'delete' => $resolved->mcp_can_delete,
        ]);
    }
}

