<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AiRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'rule_content',
        'type',
        'is_active',
        'priority',
        'conditions'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'priority' => 'integer',
        'conditions' => 'array'
    ];
}
