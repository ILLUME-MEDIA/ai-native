<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class YoutubeVideo extends Model
{
    use HasFactory;

    protected $fillable = [
        'video_id',
        'playlist_id',
        'title',
        'description',
        'channel_name',
        'channel_id',
        'thumbnail_url',
        'thumbnail_animated_url',
        'manual_image_url',
        'video_url',
        'duration',
        'view_count',
        'like_count',
        'comment_count',
        'published_at',
        'tags',
        'genres',
        'tags_generated_at',
        'metadata',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'tags_generated_at' => 'datetime',
        'tags' => 'array',
        'genres' => 'array',
        'metadata' => 'array',
        'view_count' => 'integer',
        'like_count' => 'integer',
        'comment_count' => 'integer'
    ];

    public function playlist()
    {
        return $this->belongsTo(YoutubePlaylist::class, 'playlist_id', 'playlist_id');
    }

    public function pushes()
    {
        return $this->hasMany(YoutubePlatformPush::class, 'video_id', 'video_id');
    }
}
