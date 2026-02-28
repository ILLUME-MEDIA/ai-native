<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliverySetting extends Model
{
    protected $fillable = [
        'business_id', 'platform', 'is_enabled',
        'api_key', 'api_secret', 'webhook_secret',
        'store_id', 'location_id', 'access_token', 'refresh_token',
        'token_expires_at', 'settings',
        'auto_assign_driver', 'max_delivery_radius_km',
        'driver_accept_timeout_minutes',
        'ubereats_store_id', 'ubereats_menu_id',
        'instacart_retailer_id', 'instacart_location_id',
    ];

    protected $hidden = [
        'api_key', 'api_secret', 'webhook_secret', 'access_token', 'refresh_token',
    ];

    protected $casts = [
        'is_enabled'                    => 'boolean',
        'auto_assign_driver'            => 'boolean',
        'settings'                      => 'array',
        'token_expires_at'              => 'datetime',
        'max_delivery_radius_km'        => 'integer',
        'driver_accept_timeout_minutes' => 'integer',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    /**
     * Safely get the api_key without hidden filter (for internal service use).
     */
    public function getApiKeyPlain(): ?string
    {
        return $this->getAttributes()['api_key'] ?? null;
    }

    public function getApiSecretPlain(): ?string
    {
        return $this->getAttributes()['api_secret'] ?? null;
    }

    public function getWebhookSecretPlain(): ?string
    {
        return $this->getAttributes()['webhook_secret'] ?? null;
    }
}
