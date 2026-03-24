<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformOrder extends Model
{
    protected $fillable = [
        'business_id', 'order_id', 'platform',
        'platform_order_id', 'platform_order_number', 'status',
        'subtotal', 'tax', 'delivery_fee', 'platform_fee', 'total', 'payout',
        'customer_name', 'customer_phone', 'customer_display_name',
        'delivery_address', 'notes',
        'order_placed_at', 'prep_time_minutes', 'estimated_ready_at',
        'accepted_at', 'rejected_at', 'rejection_reason',
        'raw_payload', 'items_payload',
    ];

    protected $casts = [
        'subtotal'           => 'float',
        'tax'                => 'float',
        'delivery_fee'       => 'float',
        'platform_fee'       => 'float',
        'total'              => 'float',
        'payout'             => 'float',
        'raw_payload'        => 'array',
        'items_payload'      => 'array',
        'order_placed_at'    => 'datetime',
        'estimated_ready_at' => 'datetime',
        'accepted_at'        => 'datetime',
        'rejected_at'        => 'datetime',
        'prep_time_minutes'  => 'integer',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'received');
    }

    public function scopeForPlatform($query, string $platform)
    {
        return $query->where('platform', $platform);
    }
}
