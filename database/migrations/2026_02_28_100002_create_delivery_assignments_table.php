<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->foreignId('driver_id')->constrained('delivery_staff')->onDelete('restrict');
            $table->foreignId('zone_id')->nullable()->constrained('delivery_zones')->onDelete('set null');
            $table->enum('status', [
                'assigned',      // Admin assigned, driver hasn't responded
                'accepted',      // Driver accepted
                'rejected',      // Driver rejected
                'picked_up',     // Driver picked up from restaurant
                'out_for_delivery', // En route to customer
                'delivered',     // Successfully delivered
                'failed',        // Delivery failed
                'cancelled',     // Assignment cancelled
            ])->default('assigned');
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->decimal('pickup_lat', 10, 7)->nullable();
            $table->decimal('pickup_lng', 10, 7)->nullable();
            $table->decimal('dropoff_lat', 10, 7)->nullable();
            $table->decimal('dropoff_lng', 10, 7)->nullable();
            $table->text('driver_notes')->nullable();
            $table->integer('driver_rating')->nullable()->comment('Customer rating 1-5 for this delivery');
            $table->string('rejection_reason')->nullable();
            $table->decimal('driver_earnings', 8, 2)->default(0)->comment('Driver pay for this delivery');
            $table->boolean('is_current')->default(true)->comment('Current active assignment for this order');
            $table->timestamps();

            $table->index(['order_id', 'is_current']);
            $table->index(['driver_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_assignments');
    }
};
