<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discovery_users', function (Blueprint $table) {
            $table->dropIndex(['city']);
            $table->dropIndex(['country_code']);
            $table->dropColumn([
                'lat', 'lng', 'address', 'city', 'state',
                'zip', 'country', 'country_code', 'location_from_gps',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('discovery_users', function (Blueprint $table) {
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('zip', 20)->nullable();
            $table->string('country', 100)->nullable();
            $table->char('country_code', 2)->nullable();
            $table->boolean('location_from_gps')->default(false);
            $table->index('city');
            $table->index('country_code');
        });
    }
};
