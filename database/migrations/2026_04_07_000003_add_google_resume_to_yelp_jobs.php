<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yelp_jobs', function (Blueprint $table) {
            $table->unsignedBigInteger('google_last_processed_id')->default(0)->after('google_column_mapping');
        });
    }

    public function down(): void
    {
        Schema::table('yelp_jobs', function (Blueprint $table) {
            $table->dropColumn('google_last_processed_id');
        });
    }
};
