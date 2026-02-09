<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('youtube_videos', function (Blueprint $table) {
            if (!Schema::hasColumn('youtube_videos', 'thumbnail_animated_url')) {
                $table->string('thumbnail_animated_url', 512)->nullable()->after('thumbnail_url');
            }
        });
    }

    public function down(): void
    {
        Schema::table('youtube_videos', function (Blueprint $table) {
            $table->dropColumn('thumbnail_animated_url');
        });
    }
};
