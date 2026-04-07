<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yelp_jobs', function (Blueprint $table) {
            $table->boolean('google_enabled')->default(false)->after('auto_merge');
            $table->json('google_column_mapping')->nullable()->after('google_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('yelp_jobs', function (Blueprint $table) {
            $table->dropColumn(['google_enabled', 'google_column_mapping']);
        });
    }
};
