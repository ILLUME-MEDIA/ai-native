<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cuisines', function (Blueprint $table) {
            // JSON array of up to 3 fallback image URLs for restaurants
            // that have this cuisine but no cover_image of their own.
            $table->json('images')->nullable()->after('hover_icon');
        });
    }

    public function down(): void
    {
        Schema::table('cuisines', function (Blueprint $table) {
            $table->dropColumn('images');
        });
    }
};
