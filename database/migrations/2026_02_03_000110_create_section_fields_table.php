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
        Schema::create('section_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_id')->constrained('section_entities')->cascadeOnDelete();

            $table->string('column_name');
            $table->string('label');
            $table->string('type'); // string, integer, text, boolean, date, enum, file, image, media, etc.

            $table->json('options')->nullable(); // enum values, validation, UI hints

            $table->boolean('nullable')->default(true);
            $table->boolean('required')->default(false);
            $table->text('default_value')->nullable();

            $table->boolean('list_visible')->default(true);
            $table->boolean('detail_visible')->default(true);
            $table->boolean('is_searchable')->default(false);
            $table->boolean('is_sortable')->default(false);
            $table->integer('sort_order')->default(0);

            // MCP / AI field-level permissions
            $table->boolean('mcp_readable')->default(false);
            $table->boolean('mcp_writable')->default(false);

            // File / media specific options
            $table->string('storage_disk')->nullable();
            $table->string('storage_path_pattern')->nullable();

            $table->timestamps();

            $table->unique(['entity_id', 'column_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('section_fields');
    }
};

