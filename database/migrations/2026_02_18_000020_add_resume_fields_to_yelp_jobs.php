<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yelp_jobs', function (Blueprint $table) {
            // Resume: last row ID that was successfully processed (0 = start from beginning)
            $table->unsignedBigInteger('last_processed_id')->default(0)->after('next_run_at');
            // Limit how many API calls per single cron run (0 = unlimited)
            $table->unsignedInteger('max_calls_per_run')->default(0)->after('last_processed_id');
        });
    }

    public function down(): void
    {
        Schema::table('yelp_jobs', function (Blueprint $table) {
            $table->dropColumn(['last_processed_id', 'max_calls_per_run']);
        });
    }
};
