<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('yelp_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('entity_id')->constrained('section_entities')->cascadeOnDelete();

            // Which DB columns to use for Yelp search
            // JSON: {"term": "name_col", "address": "addr_col", "city": "city_col", "state": "state_col", "zip": "zip_col"}
            $table->json('search_columns');

            // JSON map: {"yelp_field_key": "db_column_name"}
            // e.g. {"yelp_id": "yelp_id", "is_closed": "is_closed", "rating": "yelp_rating"}
            $table->json('column_mapping');

            // Cron expression or preset: manual|hourly|daily|weekly
            $table->string('schedule')->default('manual');

            $table->boolean('is_active')->default(true);
            $table->timestamp('last_run_at')->nullable();
            $table->timestamp('next_run_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yelp_jobs');
    }
};
