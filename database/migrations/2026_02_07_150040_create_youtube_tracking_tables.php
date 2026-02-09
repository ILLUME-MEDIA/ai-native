<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('youtube_playlists')) {
            Schema::create('youtube_playlists', function (Blueprint $table) {
                $table->id();
                $table->string('playlist_id')->unique();
                $table->string('playlist_url');
                $table->string('title')->nullable();
                $table->text('description')->nullable();
                $table->integer('video_count')->default(0);
                $table->timestamp('last_fetched_at')->nullable();
                $table->timestamp('last_synced_at')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->index('playlist_id');
            });
        }

        if (!Schema::hasTable('youtube_videos')) {
            Schema::create('youtube_videos', function (Blueprint $table) {
                $table->id();
                $table->string('video_id')->unique();
                $table->string('playlist_id');
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('channel_name')->nullable();
                $table->string('channel_id')->nullable();
                $table->string('thumbnail_url')->nullable();
                $table->string('video_url')->nullable();
                $table->string('duration')->nullable();
                $table->bigInteger('view_count')->default(0);
                $table->bigInteger('like_count')->default(0);
                $table->bigInteger('comment_count')->default(0);
                $table->timestamp('published_at')->nullable();
                $table->json('tags')->nullable();
                $table->json('genres')->nullable();
                $table->timestamp('tags_generated_at')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->index('video_id');
                $table->index('playlist_id');
                $table->foreign('playlist_id')->references('playlist_id')->on('youtube_playlists')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('youtube_platform_pushes')) {
            Schema::create('youtube_platform_pushes', function (Blueprint $table) {
                $table->id();
                $table->string('video_id');
                $table->string('playlist_id');
                $table->string('platform_name');
                $table->string('platform_album_id')->nullable();
                $table->string('platform_track_id')->nullable();
                $table->string('status')->default('pending');
                $table->text('error_message')->nullable();
                $table->json('push_data')->nullable();
                $table->json('response_data')->nullable();
                $table->timestamp('pushed_at')->nullable();
                $table->timestamps();

                $table->index('video_id');
                $table->index('platform_name');
                $table->unique(['video_id', 'platform_name'], 'unique_video_platform');

                $table->foreign('video_id')->references('video_id')->on('youtube_videos')->onDelete('cascade');
                $table->foreign('playlist_id')->references('playlist_id')->on('youtube_playlists')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('youtube_platform_pushes');
        Schema::dropIfExists('youtube_videos');
        Schema::dropIfExists('youtube_playlists');
    }
};
