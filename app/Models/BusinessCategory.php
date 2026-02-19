<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BusinessCategory extends Model
{
    protected $fillable = ['name', 'slug', 'type', 'icon', 'description', 'is_active', 'sort_order'];

    protected $casts = ['is_active' => 'boolean', 'sort_order' => 'integer'];

    public function businesses(): HasMany
    {
        return $this->hasMany(Business::class, 'category_id');
    }
}
