<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Driver assignment
            $table->foreignId('assigned_driver_id')->nullable()->after('delivery_vendor')
                  ->constrained('delivery_staff')->onDelete('set null');
            $table->enum('driver_status', [
                'unassigned', 'assigned', 'accepted', 'picked_up', 'out_for_delivery', 'delivered', 'failed'
            ])->default('unassigned')->after('assigned_driver_id');
            // Platform order link
            $table->unsignedBigInteger('platform_order_id')->nullable()->after('driver_status')
                  ->comment('FK to platform_orders.id');
            // Delivery tracking
            $table->string('tracking_url')->nullable()->after('platform_order_id');
            $table->timestamp('estimated_delivery_at')->nullable()->after('tracking_url');
            $table->timestamp('driver_accepted_at')->nullable()->after('estimated_delivery_at');
            $table->timestamp('driver_picked_up_at')->nullable()->after('driver_accepted_at');
            $table->timestamp('delivered_at')->nullable()->after('driver_picked_up_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['assigned_driver_id']);
            $table->dropColumn([
                'assigned_driver_id', 'driver_status', 'platform_order_id',
                'tracking_url', 'estimated_delivery_at',
                'driver_accepted_at', 'driver_picked_up_at', 'delivered_at',
            ]);
        });
    }
};
