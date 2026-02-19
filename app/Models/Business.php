<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Business extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'category_id','name','slug','description','address','city','state',
        'phone','email','logo','cover_image','latitude','longitude','is_active',
    ];

    protected $casts = ['is_active' => 'boolean', 'latitude' => 'float', 'longitude' => 'float'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(BusinessCategory::class, 'category_id');
    }

    public function menuCategories(): HasMany
    {
        return $this->hasMany(MenuCategory::class);
    }

    public function menuItems(): HasMany
    {
        return $this->hasMany(MenuItem::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
