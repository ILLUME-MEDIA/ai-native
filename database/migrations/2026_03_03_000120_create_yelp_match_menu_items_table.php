<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('yelp_match_menu_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_diff_id')->constrained('yelp_match_diffs')->cascadeOnDelete();
            $table->foreignId('job_id')->constrained('yelp_jobs')->cascadeOnDelete();
            $table->unsignedBigInteger('source_row_id');
            $table->string('source_table');
            $table->unsignedBigInteger('business_id')->nullable();
            $table->string('yelp_business_id')->nullable();
            $table->string('yelp_menu_item_id')->nullable();
            $table->string('name');
            $table->string('category')->nullable();
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2)->nullable();
            $table->string('currency', 8)->nullable();
            $table->string('image')->nullable();
            $table->boolean('is_available')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('source_type', 32)->default('details_fallback');
            $table->json('raw_payload')->nullable();
            $table->timestamps();

            $table->index(['job_id', 'source_row_id']);
            $table->index(['business_id', 'yelp_business_id']);
            $table->unique(['match_diff_id', 'sort_order', 'name'], 'yelp_match_menu_unique_item');
        });

        Schema::table('menu_items', function (Blueprint $table) {
            if (!Schema::hasColumn('menu_items', 'yelp_business_id')) {
                $table->string('yelp_business_id')->nullable()->after('image');
            }
            if (!Schema::hasColumn('menu_items', 'yelp_menu_item_id')) {
                $table->string('yelp_menu_item_id')->nullable()->after('yelp_business_id');
            }
            if (!Schema::hasColumn('menu_items', 'yelp_source_table')) {
                $table->string('yelp_source_table')->nullable()->after('yelp_menu_item_id');
            }
            if (!Schema::hasColumn('menu_items', 'yelp_source_row_id')) {
                $table->unsignedBigInteger('yelp_source_row_id')->nullable()->after('yelp_source_table');
            }
            if (!Schema::hasColumn('menu_items', 'yelp_synced_at')) {
                $table->timestamp('yelp_synced_at')->nullable()->after('yelp_source_row_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $drops = [];
            foreach (['yelp_business_id', 'yelp_menu_item_id', 'yelp_source_table', 'yelp_source_row_id', 'yelp_synced_at'] as $col) {
                if (Schema::hasColumn('menu_items', $col)) {
                    $drops[] = $col;
                }
            }
            if (!empty($drops)) {
                $table->dropColumn($drops);
            }
        });

        Schema::dropIfExists('yelp_match_menu_items');
    }
};

