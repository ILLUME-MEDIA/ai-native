<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Business extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name','slug','description','cuisine',
        'address','address_2','city','state','zip','country',
        'phone','email','website',
        'logo','cover_image','latitude','longitude',
        'price','delivery','featured','is_active','auto_accept',
    ];

    protected $casts = [
        'is_active'   => 'boolean',
        'latitude'    => 'float',
        'longitude'   => 'float',
        'delivery'    => 'boolean',
        'featured'    => 'boolean',
        'auto_accept' => 'boolean',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

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

    public function registrations(): HasMany
    {
        return $this->hasMany(BusinessRegistration::class);
    }

    /** Muzzhub listing linked for order flow (menu/orders via this business). */
    public function muzzhub(): HasOne
    {
        return $this->hasOne(Muzzhub::class);
    }
}
