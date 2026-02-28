<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->foreignId('order_id')->nullable()->constrained('orders')->onDelete('set null')
                  ->comment('Linked to our internal order after acceptance');
            $table->enum('platform', ['ubereats', 'instacart', 'grubhub', 'skip', 'doordash']);
            $table->string('platform_order_id')->comment('External platform order ID');
            $table->string('platform_order_number')->nullable();
            $table->enum('status', [
                'received',   // Webhook received, pending admin action
                'accepted',   // Admin/auto accepted
                'rejected',   // Admin rejected
                'preparing',  // Being prepared
                'ready',      // Ready for pickup by platform driver
                'picked_up',  // Platform driver picked up
                'delivered',  // Delivered to customer
                'cancelled',  // Cancelled
                'failed',     // Failed to process
            ])->default('received');
            // Order details from platform
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('tax', 10, 2)->default(0);
            $table->decimal('delivery_fee', 10, 2)->default(0);
            $table->decimal('platform_fee', 10, 2)->default(0)->comment('Fee charged by platform');
            $table->decimal('total', 10, 2)->default(0);
            $table->decimal('payout', 10, 2)->default(0)->comment('What we receive after platform fees');
            // Customer info (may be masked by platform)
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();
            $table->string('customer_display_name')->nullable()->comment('Platform display name');
            $table->text('delivery_address')->nullable();
            $table->text('notes')->nullable();
            // Timing
            $table->timestamp('order_placed_at')->nullable();
            $table->integer('prep_time_minutes')->nullable();
            $table->timestamp('estimated_ready_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->string('rejection_reason')->nullable();
            // Raw payload for debugging
            $table->json('raw_payload')->nullable();
            $table->json('items_payload')->nullable()->comment('Parsed items from platform');
            $table->timestamps();

            $table->unique(['platform', 'platform_order_id']);
            $table->index(['business_id', 'status', 'platform']);
            $table->index(['business_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_orders');
    }
};
