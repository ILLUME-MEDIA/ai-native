<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AiSkill extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'instructions',
        'allowed_tools',
        'model',
        'is_active',
        'priority',
        'trigger_keywords',
        'metadata'
    ];

    protected $casts = [
        'allowed_tools' => 'array',
        'is_active' => 'boolean',
        'priority' => 'integer',
        'trigger_keywords' => 'array',
        'metadata' => 'array'
    ];
}
