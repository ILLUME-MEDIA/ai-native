<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yelp_match_menu_items', function (Blueprint $table) {
            if (!Schema::hasColumn('yelp_match_menu_items', 'modifiers_json')) {
                $table->text('modifiers_json')->nullable()->after('raw_payload');
            }
        });

        // Add modifiers_json to menu_items if the table exists
        if (Schema::hasTable('menu_items') && !Schema::hasColumn('menu_items', 'modifiers_json')) {
            Schema::table('menu_items', function (Blueprint $table) {
                $table->text('modifiers_json')->nullable()->after('is_available');
            });
        }
    }

    public function down(): void
    {
        Schema::table('yelp_match_menu_items', function (Blueprint $table) {
            if (Schema::hasColumn('yelp_match_menu_items', 'modifiers_json')) {
                $table->dropColumn('modifiers_json');
            }
        });

        if (Schema::hasTable('menu_items') && Schema::hasColumn('menu_items', 'modifiers_json')) {
            Schema::table('menu_items', function (Blueprint $table) {
                $table->dropColumn('modifiers_json');
            });
        }
    }
};
