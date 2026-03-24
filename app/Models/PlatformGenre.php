<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformGenre extends Model
{
    protected $fillable = ['platform_name', 'genres', 'sort_order'];

    protected $casts = [
        'genres' => 'array',
    ];
}
