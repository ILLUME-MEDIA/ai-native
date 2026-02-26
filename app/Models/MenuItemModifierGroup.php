<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MenuItemModifierGroup extends Model
{
    protected $fillable = [
        'menu_item_id',
        'name',
        'description',
        'is_required',
        'min_select',
        'max_select',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'is_active'   => 'boolean',
        'min_select'  => 'integer',
        'max_select'  => 'integer',
        'sort_order'  => 'integer',
    ];

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class);
    }

    public function options(): HasMany
    {
        return $this->hasMany(MenuItemModifierOption::class, 'modifier_group_id')
                    ->orderBy('sort_order')
                    ->orderBy('id');
    }
}
