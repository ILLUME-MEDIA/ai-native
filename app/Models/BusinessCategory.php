<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BusinessCategory extends Model
{
    protected $fillable = ['name', 'slug', 'type', 'icon', 'description', 'is_active', 'sort_order'];

    protected $casts = ['is_active' => 'boolean', 'sort_order' => 'integer'];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function businesses(): HasMany
    {
        return $this->hasMany(Business::class, 'category_id');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    /**
     * Filter categories by business type.
     * Usage: BusinessCategory::byType('restaurant')->get()
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeRestaurant($query)
    {
        return $query->where('type', 'restaurant');
    }

    public function scopeStore($query)
    {
        return $query->where('type', 'store');
    }

    public function scopeService($query)
    {
        return $query->where('type', 'service');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
