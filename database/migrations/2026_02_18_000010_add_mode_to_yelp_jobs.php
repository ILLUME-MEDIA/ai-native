<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yelp_jobs', function (Blueprint $table) {
            // smart = verify open/closed first, only fetch details if open
            // full  = always fetch full details
            // verify_only = only check open/closed, don't fetch other data
            $table->enum('mode', ['smart', 'full', 'verify_only'])->default('smart')->after('schedule');
        });

        Schema::table('yelp_job_logs', function (Blueprint $table) {
            $table->unsignedInteger('closed_rows')->default(0)->after('skipped_rows');
            $table->unsignedInteger('not_found_rows')->default(0)->after('closed_rows');
            // Cache key to signal stop request
            $table->string('stop_requested_at')->nullable()->after('not_found_rows');
        });
    }

    public function down(): void
    {
        Schema::table('yelp_jobs', function (Blueprint $table) {
            $table->dropColumn('mode');
        });
        Schema::table('yelp_job_logs', function (Blueprint $table) {
            $table->dropColumn(['closed_rows', 'not_found_rows', 'stop_requested_at']);
        });
    }
};
