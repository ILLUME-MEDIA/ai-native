<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->enum('platform', ['own', 'doordash', 'ubereats', 'instacart', 'grubhub', 'skip'])->default('own');
            $table->boolean('is_enabled')->default(false);
            // Credentials (encrypted at app level)
            $table->string('api_key')->nullable();
            $table->text('api_secret')->nullable();
            $table->text('webhook_secret')->nullable();
            $table->string('store_id')->nullable()->comment('Platform store/location ID');
            $table->string('location_id')->nullable();
            $table->string('access_token')->nullable()->comment('OAuth access token if applicable');
            $table->string('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            // Platform-specific settings
            $table->json('settings')->nullable()->comment('Platform-specific settings JSON');
            // Own delivery settings
            $table->boolean('auto_assign_driver')->default(false)->comment('Auto-assign nearest available driver');
            $table->integer('max_delivery_radius_km')->default(10);
            $table->integer('driver_accept_timeout_minutes')->default(5)->comment('Minutes before reassigning if driver doesn\'t accept');
            // UberEats specific
            $table->string('ubereats_store_id')->nullable();
            $table->string('ubereats_menu_id')->nullable();
            // Instacart specific
            $table->string('instacart_retailer_id')->nullable();
            $table->string('instacart_location_id')->nullable();
            $table->timestamps();

            $table->unique(['business_id', 'platform']);
            $table->index(['business_id', 'is_enabled']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_settings');
    }
};
