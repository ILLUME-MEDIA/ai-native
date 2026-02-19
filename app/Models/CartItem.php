<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    protected $fillable = ['session_id','business_id','menu_item_id','quantity','notes'];

    protected $casts = ['quantity' => 'integer'];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class);
    }
}
