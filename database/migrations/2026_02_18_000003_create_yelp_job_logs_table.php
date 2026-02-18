<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('yelp_job_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('yelp_jobs')->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('yelp_accounts')->nullOnDelete();
            $table->enum('status', ['pending', 'running', 'completed', 'failed', 'paused'])->default('pending');
            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('processed_rows')->default(0);
            $table->unsignedInteger('failed_rows')->default(0);
            $table->unsignedInteger('skipped_rows')->default(0);
            $table->json('new_columns_added')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yelp_job_logs');
    }
};
