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
     * Refresh the access token if it has expired.
     * Supports: square, spoton (OAuth refresh_token), toast/deliverect (re-auth via client credentials).
     */
    public function ensureAccessToken(): void
    {
        if (!$this->expires_at) return;
        if ($this->expires_at->isFuture()) return;

        try {
            match ($this->provider) {
                'square' => $this->refreshSquareToken(),
                'spoton' => $this->refreshSpotOnToken(),
                'toast'  => $this->refreshToastToken(),
                'deliverect' => $this->refreshDeliverectToken(),
                default  => null,   // clover, poslavu: tokens don't expire
            };
        } catch (\Throwable) {
            $this->update(['is_active' => false]);
            abort(503, 'POS token expired. Please reconnect ' . ucfirst($this->provider) . '.');
        }
    }

    // ── Provider-specific refresh logic ───────────────────────────────────────

    private function refreshSquareToken(): void
    {
        if (!$this->refresh_token) return;

        $tokens = app(\App\Services\Pos\SquareService::class)
                      ->refreshToken(decrypt($this->refresh_token));

        $this->update([
            'access_token'  => encrypt($tokens['access_token']),
            'refresh_token' => isset($tokens['refresh_token'])
                ? encrypt($tokens['refresh_token'])
                : $this->refresh_token,
            'expires_at' => isset($tokens['expires_at']) ? Carbon::parse($tokens['expires_at']) : null,
        ]);

        $this->refresh();
    }

    private function refreshSpotOnToken(): void
    {
        if (!$this->refresh_token) return;

        $tokens = app(\App\Services\Pos\SpotOnService::class)
                      ->refreshToken(decrypt($this->refresh_token));

        $this->update([
            'access_token'  => encrypt($tokens['access_token']),
            'refresh_token' => isset($tokens['refresh_token'])
                ? encrypt($tokens['refresh_token'])
                : $this->refresh_token,
            'expires_at' => isset($tokens['expires_in']) ? now()->addSeconds($tokens['expires_in']) : null,
        ]);

        $this->refresh();
    }

    private function refreshToastToken(): void
    {
        // Toast uses machine-to-machine client credentials — just re-auth
        $tokens = app(\App\Services\Pos\ToastService::class)->getAccessToken();
        $token  = $tokens['accessToken'] ?? $tokens['access_token'] ?? '';
        $expiry = now()->addSeconds($tokens['expiresIn'] ?? $tokens['expires_in'] ?? 3600);

        $this->update([
            'access_token' => encrypt($token),
            'expires_at'   => $expiry,
        ]);

        $this->refresh();
    }

    private function refreshDeliverectToken(): void
    {
        $tokens = app(\App\Services\Pos\DeliverectService::class)->getAccessToken();

        $this->update([
            'access_token' => encrypt($tokens['access_token']),
            'expires_at'   => now()->addSeconds($tokens['expires_in'] ?? 3600),
        ]);

        $this->refresh();
    }
}
