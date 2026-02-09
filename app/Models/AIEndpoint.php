<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AIEndpoint extends Model
{
    use HasFactory;

    protected $table = 'ai_endpoints';

    protected $fillable = [
        'name',
        'provider',
        'api_key',
        'base_url',
        'default_model',
        'auto_model_selection',
        'is_active',
        'metadata',
    ];

    protected $casts = [
        'api_key' => 'encrypted',
        'auto_model_selection' => 'boolean',
        'is_active' => 'boolean',
        'metadata' => 'array',
    ];
}
