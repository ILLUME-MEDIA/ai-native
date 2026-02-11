<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AICommandApproval extends Model
{
    protected $fillable = [
        'workspace_id',
        'user_id',
        'command_type',
        'command',
        'affected_files',
        'original_content',
        'new_content',
        'diff',
        'ai_explanation',
        'status',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'execution_result',
        'expires_at'
    ];

    protected $casts = [
        'affected_files' => 'array',
        'execution_result' => 'array',
        'approved_at' => 'datetime',
        'expires_at' => 'datetime'
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($approval) {
            if (empty($approval->expires_at)) {
                $approval->expires_at = now()->addHours(24);
            }
        });
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending')
            ->where('expires_at', '>', now());
    }

    public function scopeExpired($query)
    {
        return $query->where('status', 'pending')
            ->where('expires_at', '<=', now());
    }

    public function approve($userId)
    {
        $this->update([
            'status' => 'approved',
            'approved_by' => $userId,
            'approved_at' => now()
        ]);

        return $this;
    }

    public function reject($userId, $reason = null)
    {
        $this->update([
            'status' => 'rejected',
            'approved_by' => $userId,
            'approved_at' => now(),
            'rejection_reason' => $reason
        ]);

        return $this;
    }

    public function isExpired(): bool
    {
        return $this->status === 'pending' && $this->expires_at < now();
    }

    public function canBeApproved(): bool
    {
        return $this->status === 'pending' && !$this->isExpired();
    }
}
