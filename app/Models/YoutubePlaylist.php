<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class YoutubePlaylist extends Model
{
    use HasFactory;

    protected $fillable = [
        'playlist_id',
        'playlist_url',
        'title',
        'description',
        'manual_image_url',
        'video_count',
        'last_fetched_at',
        'last_synced_at',
        'metadata',
        'watchlist_person_ids',
    ];

    protected $casts = [
        'last_fetched_at' => 'datetime',
        'last_synced_at' => 'datetime',
        'metadata' => 'array',
        'watchlist_person_ids' => 'array',
    ];

    public function videos()
    {
        return $this->hasMany(YoutubeVideo::class, 'playlist_id', 'playlist_id');
    }
}
