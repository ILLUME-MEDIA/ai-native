<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class YoutubePlatformPush extends Model
{
    use HasFactory;

    protected $fillable = [
        'video_id',
        'playlist_id',
        'platform_name',
        'platform_album_id',
        'platform_track_id',
        'status',
        'error_message',
        'push_data',
        'response_data',
        'pushed_at'
    ];

    protected $casts = [
        'pushed_at' => 'datetime',
        'push_data' => 'array',
        'response_data' => 'array'
    ];

    public function video()
    {
        return $this->belongsTo(YoutubeVideo::class, 'video_id', 'video_id');
    }

    public function playlist()
    {
        return $this->belongsTo(YoutubePlaylist::class, 'playlist_id', 'playlist_id');
    }
}
