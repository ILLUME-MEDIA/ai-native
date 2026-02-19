<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Per-item delivery type (can differ from order_type)
            $table->enum('item_delivery_type', ['pickup', 'delivery'])
                  ->default('delivery')
                  ->after('order_type');

            // Delivery vendor: doordash, uber_eats, grubhub, in_house, etc.
            $table->string('delivery_vendor')->nullable()->after('item_delivery_type');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['item_delivery_type', 'delivery_vendor']);
        });
    }
};
