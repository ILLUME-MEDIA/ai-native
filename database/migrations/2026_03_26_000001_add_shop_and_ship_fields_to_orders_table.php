<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds DoorDash Shop & Deliver and ShipEngine fields to the orders table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // DoorDash Shop & Deliver
            $table->string('doordash_shop_delivery_id')->nullable()->after('doordash_tracking_url');
            $table->string('doordash_shop_status')->nullable()->after('doordash_shop_delivery_id');
            $table->string('doordash_shop_tracking_url')->nullable()->after('doordash_shop_status');

            // ShipEngine (shipping labels)
            $table->string('shipengine_label_id')->nullable()->after('doordash_shop_tracking_url');
            $table->string('shipengine_tracking_number')->nullable()->after('shipengine_label_id');
            $table->string('shipengine_carrier_code')->nullable()->after('shipengine_tracking_number');
            $table->string('shipengine_label_url')->nullable()->after('shipengine_carrier_code');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'doordash_shop_delivery_id',
                'doordash_shop_status',
                'doordash_shop_tracking_url',
                'shipengine_label_id',
                'shipengine_tracking_number',
                'shipengine_carrier_code',
                'shipengine_label_url',
            ]);
        });
    }
};
