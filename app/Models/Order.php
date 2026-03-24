<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'order_number','business_id','session_id','user_id','status',
        'payment_status','payment_method','stripe_payment_intent_id','paid_at',
        'doordash_delivery_id','doordash_status','doordash_tracking_url',
        'uber_direct_delivery_id','uber_direct_status','uber_direct_tracking_url','uber_direct_fee',
        'subtotal','tax','delivery_fee','platform_fee','tip','total',
        'customer_name','customer_phone','customer_email',
        'delivery_address','notes','order_type',
        'item_delivery_type','delivery_vendor',
        // Delivery assignment
        'assigned_driver_id','driver_status','platform_order_id',
        'tracking_url','estimated_delivery_at',
        'driver_accepted_at','driver_picked_up_at','delivered_at',
    ];

    protected $casts = [
        'subtotal'              => 'float',
        'tax'                   => 'float',
        'delivery_fee'          => 'float',
        'platform_fee'          => 'float',
        'tip'                   => 'float',
        'total'                 => 'float',
        'paid_at'               => 'datetime',
        'estimated_delivery_at' => 'datetime',
        'driver_accepted_at'    => 'datetime',
        'driver_picked_up_at'   => 'datetime',
        'delivered_at'          => 'datetime',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function assignedDriver(): BelongsTo
    {
        return $this->belongsTo(DeliveryStaff::class, 'assigned_driver_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(DeliveryAssignment::class);
    }

    public function currentAssignment(): HasMany
    {
        return $this->hasMany(DeliveryAssignment::class)->where('is_current', true);
    }

    public function platformOrder(): BelongsTo
    {
        return $this->belongsTo(PlatformOrder::class, 'platform_order_id');
    }
}
