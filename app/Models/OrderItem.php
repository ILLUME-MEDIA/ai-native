<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = ['order_id','menu_item_id','name','price','quantity','subtotal','notes','modifiers'];

    protected $casts = ['price' => 'float', 'subtotal' => 'float', 'quantity' => 'integer', 'modifiers' => 'array'];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
