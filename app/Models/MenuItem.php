<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MenuItem extends Model
{
    protected $fillable = [
        'business_id','menu_category_id','menu_category_type_id','name','description',
        'price','image','is_available','sort_order',
        'yelp_business_id','yelp_menu_item_id','yelp_source_table','yelp_source_row_id','yelp_synced_at',
    ];

    protected $casts = ['price' => 'float', 'is_available' => 'boolean', 'sort_order' => 'integer', 'yelp_synced_at' => 'datetime'];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function menuCategory(): BelongsTo
    {
        return $this->belongsTo(MenuCategory::class);
    }

    /** Menu category type (e.g. Kids Cuisine, Vegetarian) — global list. */
    public function menuCategoryType(): BelongsTo
    {
        return $this->belongsTo(MenuCategoryType::class, 'menu_category_type_id');
    }

    public function modifierGroups(): HasMany
    {
        return $this->hasMany(MenuItemModifierGroup::class)
                    ->orderBy('sort_order')
                    ->orderBy('id');
    }
}
