<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AiPlatform extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'base_url',
        'api_token',
        'target_section',
        'settings',
        'is_active'
    ];

    protected $casts = [
        'settings' => 'array',
        'is_active' => 'boolean'
    ];
}
