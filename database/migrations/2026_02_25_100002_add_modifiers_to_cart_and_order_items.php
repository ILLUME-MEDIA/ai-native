<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            // JSON snapshot of selected modifier options at add-to-cart time
            // [{group_id, group_name, option_id, option_name, price_adjustment}]
            $table->json('modifiers')->nullable()->after('notes');
        });

        Schema::table('order_items', function (Blueprint $table) {
            // Snapshot at order creation time (price is already baked in)
            $table->json('modifiers')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropColumn('modifiers');
        });
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('modifiers');
        });
    }
};
