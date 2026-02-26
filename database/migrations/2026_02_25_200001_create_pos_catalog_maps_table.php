<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_catalog_maps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->cascadeOnDelete();
            $table->enum('provider', ['square', 'clover']);

            // Local menu item (nullable = POS item not yet imported to our system)
            $table->foreignId('menu_item_id')->nullable()->constrained('menu_items')->nullOnDelete();

            // POS identifiers
            $table->string('pos_item_id');          // Square catalog object ID / Clover item ID
            $table->string('pos_variant_id')->nullable(); // Square item variation ID

            // Cached POS data (for display without extra API calls)
            $table->string('pos_item_name');
            $table->decimal('pos_item_price', 10, 2)->default(0);

            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->unique(['business_id', 'provider', 'pos_item_id']);
            $table->index(['business_id', 'provider']);
            $table->index('menu_item_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_catalog_maps');
    }
};
