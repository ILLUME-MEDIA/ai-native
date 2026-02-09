<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AIAuditLog extends Model
{
    use HasFactory;

    protected $table = 'ai_audit_logs';

    protected $fillable = [
        'action',
        'model',
        'provider',
        'result',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];
}
