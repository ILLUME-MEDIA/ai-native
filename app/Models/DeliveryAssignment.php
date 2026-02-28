<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryAssignment extends Model
{
    protected $fillable = [
        'order_id', 'driver_id', 'zone_id', 'status',
        'assigned_at', 'accepted_at', 'rejected_at',
        'picked_up_at', 'delivered_at',
        'pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng',
        'driver_notes', 'driver_rating', 'rejection_reason',
        'driver_earnings', 'is_current',
    ];

    protected $casts = [
        'assigned_at'  => 'datetime',
        'accepted_at'  => 'datetime',
        'rejected_at'  => 'datetime',
        'picked_up_at' => 'datetime',
        'delivered_at' => 'datetime',
        'pickup_lat'   => 'float',
        'pickup_lng'   => 'float',
        'dropoff_lat'  => 'float',
        'dropoff_lng'  => 'float',
        'driver_earnings' => 'float',
        'is_current'   => 'boolean',
        'driver_rating' => 'integer',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(DeliveryStaff::class, 'driver_id');
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class, 'zone_id');
    }

    public function scopeCurrent($query)
    {
        return $query->where('is_current', true);
    }
}
