<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeployLog extends Model
{
    protected $fillable = [
        'project_id', 'status', 'commit_hash', 'commit_message',
        'branch', 'triggered_by', 'output', 'duration_seconds',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(DeployProject::class, 'project_id');
    }
}
