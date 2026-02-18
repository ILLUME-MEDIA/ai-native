<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('yelp_row_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('log_id')->index();  // FK to yelp_job_logs
            $table->unsignedBigInteger('row_id')->nullable(); // ID in the synced table

            // What we sent to Yelp
            $table->string('search_term')->nullable();
            $table->string('search_location')->nullable();

            // Result
            $table->enum('status', ['found', 'not_found', 'failed', 'skipped', 'updated', 'closed'])->default('not_found');

            // What Yelp returned (if anything)
            $table->string('yelp_id')->nullable();
            $table->string('yelp_name')->nullable();
            $table->string('yelp_city')->nullable();
            $table->decimal('yelp_rating', 3, 1)->nullable();
            $table->boolean('yelp_is_closed')->nullable();

            // Error message if failed
            $table->text('error')->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->foreign('log_id')->references('id')->on('yelp_job_logs')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yelp_row_logs');
    }
};
