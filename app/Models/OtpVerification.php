<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class OtpVerification extends Model
{
    protected $fillable = [
        'email',
        'otp',
        'identifier',
        'expires_at',
        'verified_at',
        'attempts',
        'ip_address',
    ];

    protected $casts = [
        'expires_at'  => 'datetime',
        'verified_at' => 'datetime',
    ];

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isVerified(): bool
    {
        return $this->verified_at !== null;
    }

    public function hasExceededAttempts(int $max = 5): bool
    {
        return $this->attempts >= $max;
    }

    public function scopeLatestForEmail($query, string $email)
    {
        return $query->where('email', $email)
            ->whereNull('verified_at')
            ->latest()
            ->first();
    }
}
