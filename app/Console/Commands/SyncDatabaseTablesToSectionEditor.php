<?php

namespace App\Console\Commands;

use App\Models\SectionEntity;
use App\Models\SectionField;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class SyncDatabaseTablesToSectionEditor extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'section:sync-tables {--sync-fields : Also sync table columns as fields}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync all existing database tables to Section Editor (create SectionEntity records)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $syncFields = $this->option('sync-fields');
        
        $this->info('Scanning database tables...');
        
        // Get all tables from the database
        $tables = $this->getAllTables();
        
        if (empty($tables)) {
            $this->warn('No tables found in the database.');
            return 1;
        }
        
        $this->info("Found " . count($tables) . " tables.");
        
        $created = 0;
        $skipped = 0;
        $fieldsCreated = 0;
        
        foreach ($tables as $tableName) {
            // Skip Laravel system tables
            if (in_array($tableName, ['migrations', 'failed_jobs', 'password_reset_tokens', 'personal_access_tokens'])) {
                $this->line("Skipping system table: {$tableName}");
                $skipped++;
                continue;
            }
            
            // Check if SectionEntity already exists for this table
            $existing = SectionEntity::where('table_name', $tableName)->first();
            
            if ($existing) {
                $this->line("Already exists: {$tableName} (ID: {$existing->id})");
                $skipped++;
                
                // If sync-fields is enabled, sync fields for existing entities too
                if ($syncFields) {
                    $fieldsCount = $this->syncFieldsForEntity($existing, $tableName);
                    $fieldsCreated += $fieldsCount;
                }
                continue;
            }
            
            // Create SectionEntity
            $entity = $this->createSectionEntity($tableName);
            
            if ($entity) {
                $this->info("Created: {$tableName} → {$entity->name} (ID: {$entity->id})");
                $created++;
                
                // Sync fields if requested
                if ($syncFields) {
                    $fieldsCount = $this->syncFieldsForEntity($entity, $tableName);
                    $fieldsCreated += $fieldsCount;
                    $this->line("  └─ Synced {$fieldsCount} fields");
                }
            } else {
                $this->error("Failed to create entity for: {$tableName}");
            }
        }
        
        $this->newLine();
        $this->info("Summary:");
        $this->line("  Created: {$created} entities");
        $this->line("  Skipped: {$skipped} entities (already exist or system tables)");
        
        if ($syncFields) {
            $this->line("  Fields synced: {$fieldsCreated}");
        }
        
        return 0;
    }
    
    /**
     * Get all table names from the database.
     */
    protected function getAllTables(): array
    {
        $connection = DB::connection();
        $database = $connection->getDatabaseName();
        
        $tables = DB::select("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'", [$database]);
        
        return array_map(function ($table) {
            return $table->TABLE_NAME;
        }, $tables);
    }
    
    /**
     * Create a SectionEntity for a database table.
     */
    protected function createSectionEntity(string $tableName): ?SectionEntity
    {
        try {
            // Generate a human-readable name from table name
            $name = $this->generateEntityName($tableName);
            $slug = Str::slug($name);
            
            // Ensure slug is unique
            $originalSlug = $slug;
            $counter = 1;
            while (SectionEntity::where('slug', $slug)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }
            
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
            
            return $entity;
        } catch (\Exception $e) {
            $this->error("Error creating entity for {$tableName}: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Sync table columns as SectionField records.
     */
    protected function syncFieldsForEntity(SectionEntity $entity, string $tableName): int
    {
        if (!Schema::hasTable($tableName)) {
            return 0;
        }
        
        $columns = Schema::getColumnListing($tableName);
        $created = 0;
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
                    'required' => !$columnDetails['nullable'],
                    'default_value' => $columnDetails['default'],
                    'list_visible' => in_array($columnName, ['id', 'name', 'title', 'email', 'created_at']),
                    'detail_visible' => true,
                    'is_searchable' => in_array($fieldType, ['text', 'string', 'email', 'number']),
                    'is_sortable' => !in_array($fieldType, ['text', 'longtext', 'json']),
                    'sort_order' => $sortOrder++,
                    'mcp_readable' => true,
                    'mcp_writable' => !in_array($columnName, ['id', 'created_at', 'updated_at']),
                ]);
                
                $created++;
            } catch (\Exception $e) {
                $this->warn("Failed to create field {$columnName} for {$tableName}: " . $e->getMessage());
            }
        }
        
        return $created;
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
}
