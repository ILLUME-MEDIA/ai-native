<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('yelp_match_diffs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('yelp_jobs')->cascadeOnDelete();
            $table->foreignId('log_id')->nullable()->constrained('yelp_job_logs')->nullOnDelete();
            $table->foreignId('entity_id')->nullable()->constrained('section_entities')->nullOnDelete();
            $table->string('source_table');
            $table->unsignedBigInteger('source_row_id');
            $table->string('yelp_business_id')->nullable();
            $table->string('yelp_business_name')->nullable();
            $table->string('country_code', 32)->nullable();
            $table->json('source_payload')->nullable();
            $table->json('yelp_payload')->nullable();
            $table->json('field_diffs')->nullable();
            $table->json('mapped_updates')->nullable();
            $table->enum('merge_status', ['pending', 'merged', 'skipped'])->default('pending');
            $table->text('merge_note')->nullable();
            $table->timestamp('merged_at')->nullable();
            $table->timestamps();

            $table->unique(['job_id', 'source_row_id']);
            $table->index(['job_id', 'merge_status']);
        });

        Schema::create('yelp_closed_businesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('yelp_jobs')->cascadeOnDelete();
            $table->foreignId('log_id')->nullable()->constrained('yelp_job_logs')->nullOnDelete();
            $table->foreignId('entity_id')->nullable()->constrained('section_entities')->nullOnDelete();
            $table->string('source_table');
            $table->unsignedBigInteger('source_row_id')->nullable();
            $table->string('search_term')->nullable();
            $table->string('search_location')->nullable();
            $table->string('country_code', 32)->nullable();
            $table->string('yelp_business_id')->nullable();
            $table->string('yelp_business_name')->nullable();
            $table->json('source_payload')->nullable();
            $table->json('yelp_payload')->nullable();
            $table->boolean('removed_from_source')->default(true);
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->index(['job_id', 'created_at']);
        });

        Schema::create('yelp_not_found_businesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('yelp_jobs')->cascadeOnDelete();
            $table->foreignId('log_id')->nullable()->constrained('yelp_job_logs')->nullOnDelete();
            $table->foreignId('entity_id')->nullable()->constrained('section_entities')->nullOnDelete();
            $table->string('source_table');
            $table->unsignedBigInteger('source_row_id')->nullable();
            $table->string('search_term')->nullable();
            $table->string('search_location')->nullable();
            $table->string('country_code', 32)->nullable();
            $table->json('source_payload')->nullable();
            $table->boolean('removed_from_source')->default(true);
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->index(['job_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yelp_not_found_businesses');
        Schema::dropIfExists('yelp_closed_businesses');
        Schema::dropIfExists('yelp_match_diffs');
    }
};

