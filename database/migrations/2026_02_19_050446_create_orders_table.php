<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('business_id')->constrained('businesses')->onDelete('restrict');
            $table->string('session_id')->nullable()->index(); // guest identifier
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->enum('status', ['pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled'])->default('pending');
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('tax', 10, 2)->default(0);
            $table->decimal('delivery_fee', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();
            $table->string('customer_email')->nullable();
            $table->text('delivery_address')->nullable();
            $table->text('notes')->nullable();
            $table->enum('order_type', ['delivery','pickup','dine_in'])->default('delivery');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
