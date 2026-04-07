<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('google_row_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('log_id')->constrained('google_job_logs')->cascadeOnDelete();
            $table->unsignedBigInteger('row_id')->nullable();
            $table->string('status')->default('found'); // found|failed|skipped|not_found|error
            $table->string('search_term')->nullable();
            $table->string('search_location')->nullable();
            $table->string('google_place_id')->nullable();
            $table->string('google_name')->nullable();
            $table->string('google_address')->nullable();
            $table->decimal('google_rating', 3, 1)->nullable();
            $table->json('fields_updated')->nullable();  // list of column names written
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index(['log_id', 'status']);
            $table->index('row_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('google_row_logs');
    }
};
