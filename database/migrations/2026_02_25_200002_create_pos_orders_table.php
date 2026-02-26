<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->enum('provider', ['square', 'clover']);

            $table->string('pos_order_id');           // Square/Clover order ID
            $table->string('pos_payment_id')->nullable(); // POS payment ID after checkout
            $table->string('pos_checkout_id')->nullable(); // Square terminal checkout ID

            $table->string('pos_status')->default('open'); // open, completed, cancelled, etc.
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->unique(['order_id', 'provider']);
            $table->index('pos_order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_orders');
    }
};
