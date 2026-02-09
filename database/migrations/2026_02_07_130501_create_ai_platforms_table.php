<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ai_platforms', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type'); // streaming or watchlist
            $table->text('base_url')->nullable();
            $table->text('api_token')->nullable();
            $table->string('target_section')->nullable(); // e.g., urbanhal_listings
            $table->json('settings')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_platforms');
    }
};
