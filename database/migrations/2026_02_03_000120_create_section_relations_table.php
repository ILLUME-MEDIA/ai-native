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
        Schema::create('section_relations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_entity_id')->constrained('section_entities')->cascadeOnDelete();
            $table->foreignId('child_entity_id')->constrained('section_entities')->cascadeOnDelete();

            $table->string('relation_type'); // hasOne, hasMany, belongsTo, belongsToMany
            $table->string('foreign_key')->nullable();
            $table->string('local_key')->nullable();
            $table->string('pivot_table')->nullable();

            // Optional MCP traversal control
            $table->boolean('mcp_traversable')->default(false);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('section_relations');
    }
};

