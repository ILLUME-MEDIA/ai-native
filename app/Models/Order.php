<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'order_number','business_id','session_id','user_id','status',
        'subtotal','tax','delivery_fee','total',
        'customer_name','customer_phone','customer_email',
        'delivery_address','notes','order_type',
        'item_delivery_type','delivery_vendor',
    ];

    protected $casts = [
        'subtotal' => 'float',
        'tax' => 'float',
        'delivery_fee' => 'float',
        'total' => 'float',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
