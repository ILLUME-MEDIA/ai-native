<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // List of system columns that should NEVER appear in section_fields
        $systemColumns = [
            'id',
            'name',
            'table_name',
            'slug',
            'source_type',
            'is_system',
            'default_sort_field',
            'default_sort_direction',
            'mcp_enabled',
            'mcp_can_read',
            'mcp_can_create',
            'mcp_can_update',
            'mcp_can_delete',
            'created_at',
            'updated_at',
        ];

        // Delete any field records that match system column names
        DB::table('section_fields')
            ->whereIn('column_name', $systemColumns)
            ->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No rollback - we don't want to restore invalid data
    }
};
