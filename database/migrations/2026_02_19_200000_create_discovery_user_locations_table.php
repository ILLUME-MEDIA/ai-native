<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discovery_user_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('discovery_user_id')
                  ->constrained('discovery_users')
                  ->cascadeOnDelete();

            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('zip', 20)->nullable();
            $table->string('country', 100)->nullable();
            $table->char('country_code', 2)->nullable();
            $table->boolean('location_from_gps')->default(false);

            $table->timestamps();

            $table->index('city');
            $table->index('country_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discovery_user_locations');
    }
};
