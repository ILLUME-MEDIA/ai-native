<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosCatalogMap extends Model
{
    protected $fillable = [
        'business_id', 'provider', 'menu_item_id',
        'pos_item_id', 'pos_variant_id',
        'pos_item_name', 'pos_item_price',
        'synced_at',
    ];

    protected $casts = [
        'pos_item_price' => 'float',
        'synced_at'      => 'datetime',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class);
    }
}
