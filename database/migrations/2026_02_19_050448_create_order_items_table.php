<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->unsignedBigInteger('menu_item_id')->nullable(); // nullable: item may be deleted later
            $table->string('name');                // snapshot at order time
            $table->decimal('price', 10, 2);       // snapshot at order time
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('subtotal', 10, 2);    // price * quantity
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
