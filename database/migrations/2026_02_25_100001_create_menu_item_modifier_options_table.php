<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_item_modifier_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('modifier_group_id')
                  ->constrained('menu_item_modifier_groups')
                  ->cascadeOnDelete();

            $table->string('name');                                      // "Small", "Extra Cheese", "Mild"
            $table->decimal('price_adjustment', 8, 2)->default(0.00);   // +1.50, -0.50, 0
            $table->boolean('is_default')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index('modifier_group_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_item_modifier_options');
    }
};
