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
        'video_count',
        'last_fetched_at',
        'last_synced_at',
        'metadata'
    ];

    protected $casts = [
        'last_fetched_at' => 'datetime',
        'last_synced_at' => 'datetime',
        'metadata' => 'array'
    ];

    public function videos()
    {
        return $this->hasMany(YoutubeVideo::class, 'playlist_id', 'playlist_id');
    }
}
