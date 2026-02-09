<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('section_entities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('table_name')->unique();
            $table->string('slug')->unique();
            $table->string('source_type')->default('frontend'); // migration | frontend | system
            $table->boolean('is_system')->default(false);
            $table->string('default_sort_field')->nullable();
            $table->string('default_sort_direction')->default('asc');

            // MCP / AI permissions at table level
            $table->boolean('mcp_enabled')->default(false);
            $table->boolean('mcp_can_read')->default(false);
            $table->boolean('mcp_can_create')->default(false);
            $table->boolean('mcp_can_update')->default(false);
            $table->boolean('mcp_can_delete')->default(false);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('section_entities');
    }
};

