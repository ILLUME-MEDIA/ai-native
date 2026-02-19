<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MenuItem extends Model
{
    protected $fillable = [
        'business_id','menu_category_id','name','description',
        'price','image','is_available','sort_order',
    ];

    protected $casts = ['price' => 'float', 'is_available' => 'boolean', 'sort_order' => 'integer'];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function menuCategory(): BelongsTo
    {
        return $this->belongsTo(MenuCategory::class);
    }
}
