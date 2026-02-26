<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_item_modifier_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_item_id')
                  ->constrained('menu_items')
                  ->cascadeOnDelete();

            $table->string('name');                          // "Size", "Toppings", "Spice Level"
            $table->string('description')->nullable();
            $table->boolean('is_required')->default(false);
            $table->unsignedTinyInteger('min_select')->default(0);  // 0 = optional
            $table->unsignedTinyInteger('max_select')->default(1);  // 1 = single choice, 0 = unlimited
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index('menu_item_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_item_modifier_groups');
    }
};
