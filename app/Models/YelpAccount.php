<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class YelpAccount extends Model
{
    protected $fillable = [
        'name',
        'api_key',
        'daily_limit',
        'requests_today',
        'last_reset_at',
        'is_active',
    ];

    protected $casts = [
        'daily_limit'    => 'integer',
        'requests_today' => 'integer',
        'last_reset_at'  => 'datetime',
        'is_active'      => 'boolean',
    ];

    protected $hidden = ['api_key'];

    public function logs(): HasMany
    {
        return $this->hasMany(YelpJobLog::class, 'account_id');
    }

    /** Reset counter if last reset was over 24 hours ago */
    public function resetIfStale(): void
    {
        if (!$this->last_reset_at || $this->last_reset_at->diffInHours(now()) >= 24) {
            $this->update(['requests_today' => 0, 'last_reset_at' => now()]);
        }
    }

    public function getRemainingRequestsAttribute(): int
    {
        return max(0, $this->daily_limit - $this->requests_today);
    }

    public function hasQuota(): bool
    {
        $this->resetIfStale();
        return $this->is_active && $this->requests_today < $this->daily_limit;
    }

    public function incrementUsage(int $count = 1): void
    {
        $this->increment('requests_today', $count);
    }
}
