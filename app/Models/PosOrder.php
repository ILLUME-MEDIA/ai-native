<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosOrder extends Model
{
    protected $fillable = [
        'order_id', 'provider',
        'pos_order_id', 'pos_payment_id', 'pos_checkout_id',
        'pos_status', 'synced_at',
    ];

    protected $casts = [
        'synced_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
