<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Cuisine extends Model
{
    protected $fillable = ['name', 'slug', 'icon', 'hover_icon', 'is_active', 'sort_order'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function muzzs(): BelongsToMany
    {
        return $this->belongsToMany(Muzzhub::class, 'muzzhub_cuisine', 'cuisine_id', 'muzzhub_id');
    }
}
