<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->index();
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->foreignId('menu_item_id')->constrained('menu_items')->onDelete('cascade');
            $table->unsignedInteger('quantity')->default(1);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['session_id', 'menu_item_id']); // one row per item per session
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cart_items');
    }
};
