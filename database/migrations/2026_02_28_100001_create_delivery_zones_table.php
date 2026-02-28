<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->string('name');
            $table->string('description')->nullable();
            // Circle-based zone: center + radius
            $table->decimal('center_lat', 10, 7)->nullable();
            $table->decimal('center_lng', 10, 7)->nullable();
            $table->decimal('radius_km', 8, 2)->nullable()->comment('Radius in km for circle zone');
            // Polygon-based zone (GeoJSON coordinates stored as JSON)
            $table->json('polygon_coordinates')->nullable()->comment('[[lat,lng], ...] polygon points');
            $table->enum('zone_type', ['circle', 'polygon', 'city'])->default('circle');
            $table->string('city_name')->nullable()->comment('For city-based zones');
            $table->string('zip_codes')->nullable()->comment('Comma-separated ZIP codes');
            $table->decimal('delivery_fee', 8, 2)->default(0);
            $table->decimal('min_order_amount', 8, 2)->default(0);
            $table->integer('estimated_minutes')->default(30)->comment('Estimated delivery time in minutes');
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['business_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_zones');
    }
};
