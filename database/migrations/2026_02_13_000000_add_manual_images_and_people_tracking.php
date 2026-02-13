<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('youtube_playlists', function (Blueprint $table) {
            $table->string('manual_image_url')->nullable()->after('description');
            $table->json('watchlist_person_ids')->nullable()->after('metadata');
        });

        Schema::table('youtube_videos', function (Blueprint $table) {
            $table->string('manual_image_url')->nullable()->after('thumbnail_animated_url');
        });

        Schema::table('youtube_platform_pushes', function (Blueprint $table) {
            $table->string('platform_person_id')->nullable()->after('platform_track_id');
            $table->string('push_type')->default('streaming')->after('platform_name');
        });
    }

    public function down(): void
    {
        Schema::table('youtube_playlists', function (Blueprint $table) {
            $table->dropColumn(['manual_image_url', 'watchlist_person_ids']);
        });

        Schema::table('youtube_videos', function (Blueprint $table) {
            $table->dropColumn('manual_image_url');
        });

        Schema::table('youtube_platform_pushes', function (Blueprint $table) {
            $table->dropColumn(['platform_person_id', 'push_type']);
        });
    }
};
