<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add layout column to sections (sections now = layout containers/rows)
        Schema::table('ds_page_sections', function (Blueprint $table) {
            $table->string('layout', 30)->default('1col')->after('section_type');
            // 1col | 2col | 3col | 4col | sidebar-left | sidebar-right
        });

        // Blocks table — actual content atoms inside section columns
        Schema::create('ds_page_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')
                  ->constrained('ds_page_sections')
                  ->cascadeOnDelete();
            $table->unsignedTinyInteger('column_index')->default(0); // which column slot (0-based)
            $table->string('block_type', 50);
            // heading|paragraph|image|button|spacer|divider|gallery|video|html|quote|list|icon
            $table->string('label', 100)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->json('content')->nullable();  // block-specific content fields
            $table->json('style')->nullable();    // per-block CSS overrides
            $table->boolean('is_visible')->default(true);
            $table->timestamps();

            $table->index(['section_id', 'column_index', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ds_page_blocks');
        Schema::table('ds_page_sections', function (Blueprint $table) {
            $table->dropColumn('layout');
        });
    }
};
