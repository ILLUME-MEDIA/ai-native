<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JiraConfig extends Model
{
    protected $fillable = [
        'domain',
        'email',
        'api_token',
        'default_project_key',
    ];

    protected $casts = [
        'api_token' => 'encrypted',
    ];
}
