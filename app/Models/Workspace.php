<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Workspace extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'path',
        'description',
        'type',
        'settings',
        'git_enabled',
        'git_remote',
        'is_active',
        'last_accessed_at'
    ];

    protected $casts = [
        'settings' => 'array',
        'git_enabled' => 'boolean',
        'is_active' => 'boolean',
        'last_accessed_at' => 'datetime'
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($workspace) {
            if (empty($workspace->slug)) {
                $workspace->slug = Str::slug($workspace->name) . '-' . Str::random(8);
            }

            if (empty($workspace->path)) {
                $workspace->path = 'storage/workspaces/' . $workspace->user_id . '/' . $workspace->slug;
            }
        });

        static::created(function ($workspace) {
            // Create workspace directory
            $fullPath = base_path($workspace->path);
            if (!file_exists($fullPath)) {
                mkdir($fullPath, 0755, true);
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(AICommandApproval::class);
    }

    public function getFullPathAttribute(): string
    {
        return base_path($this->path);
    }

    public function touchAccess()
    {
        $this->update(['last_accessed_at' => now()]);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }
}
