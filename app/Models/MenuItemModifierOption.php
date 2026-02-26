<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MenuItemModifierOption extends Model
{
    protected $fillable = [
        'modifier_group_id',
        'name',
        'price_adjustment',
        'is_default',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'price_adjustment' => 'float',
        'is_default'       => 'boolean',
        'is_active'        => 'boolean',
        'sort_order'       => 'integer',
    ];

    public function modifierGroup(): BelongsTo
    {
        return $this->belongsTo(MenuItemModifierGroup::class, 'modifier_group_id');
    }
}
