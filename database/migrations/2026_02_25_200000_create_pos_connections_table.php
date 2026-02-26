<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->cascadeOnDelete();
            $table->enum('provider', ['square', 'clover']);

            // Encrypted OAuth tokens
            $table->text('access_token');
            $table->text('refresh_token')->nullable();
            $table->timestamp('expires_at')->nullable();

            // POS account identifiers
            $table->string('merchant_id')->nullable();      // Square merchant_id / Clover merchant_id
            $table->string('location_id')->nullable();      // Square location_id
            $table->string('location_name')->nullable();    // Display name

            $table->boolean('is_active')->default(true);
            $table->timestamp('connected_at')->nullable();
            $table->timestamps();

            $table->unique(['business_id', 'provider']); // one connection per provider per business
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_connections');
    }
};
