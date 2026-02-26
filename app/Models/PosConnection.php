<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class PosConnection extends Model
{
    protected $fillable = [
        'business_id', 'provider', 'access_token', 'refresh_token',
        'expires_at', 'merchant_id', 'location_id', 'location_name',
        'is_active', 'connected_at',
    ];

    protected $casts = [
        'is_active'    => 'boolean',
        'expires_at'   => 'datetime',
        'connected_at' => 'datetime',
    ];

    protected $hidden = ['access_token', 'refresh_token'];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function catalogMaps(): HasMany
    {
        return $this->hasMany(PosCatalogMap::class, 'business_id', 'business_id')
                    ->where('provider', $this->provider);
    }

    public function posOrders(): HasMany
    {
        return $this->hasMany(PosOrder::class, 'provider', 'provider');
    }

    /** Decrypt and return the raw access token. */
    public function decryptedAccessToken(): string
    {
        return decrypt($this->access_token);
    }

    /**
     * For Square: refresh token if it has expired.
     * Call before any API request.
     */
    public function ensureAccessToken(): void
    {
        if ($this->provider !== 'square') return;
        if (!$this->expires_at) return;
        if ($this->expires_at->isFuture()) return;
        if (!$this->refresh_token) return;

        try {
            $tokens = app(\App\Services\Pos\SquareService::class)
                          ->refreshToken(decrypt($this->refresh_token));

            $this->update([
                'access_token'  => encrypt($tokens['access_token']),
                'refresh_token' => isset($tokens['refresh_token'])
                    ? encrypt($tokens['refresh_token'])
                    : $this->refresh_token,
                'expires_at'    => isset($tokens['expires_at'])
                    ? Carbon::parse($tokens['expires_at'])
                    : null,
            ]);

            $this->refresh();
        } catch (\Throwable) {
            $this->update(['is_active' => false]);
            abort(503, 'POS token expired. Please reconnect ' . ucfirst($this->provider) . '.');
        }
    }
}
