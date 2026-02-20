<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add target_source to business_registrations
        Schema::table('business_registrations', function (Blueprint $table) {
            $table->enum('target_source', ['businesses', 'muzzhub', 'pakistanhub'])
                  ->default('businesses')
                  ->after('status')
                  ->comment('Which platform/hub this registration targets');
        });

        // Add source column to businesses so we can tag which hub it belongs to
        Schema::table('businesses', function (Blueprint $table) {
            $table->string('source', 50)
                  ->nullable()
                  ->default(null)
                  ->after('is_active')
                  ->comment('Source hub: muzzhub, pakistanhub, or null for general');
        });
    }

    public function down(): void
    {
        Schema::table('business_registrations', function (Blueprint $table) {
            $table->dropColumn('target_source');
        });

        Schema::table('businesses', function (Blueprint $table) {
            $table->dropColumn('source');
        });
    }
};
