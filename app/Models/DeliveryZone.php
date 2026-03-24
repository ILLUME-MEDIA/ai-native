<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryZone extends Model
{
    protected $fillable = [
        'business_id', 'name', 'description',
        'center_lat', 'center_lng', 'radius_km',
        'polygon_coordinates', 'zone_type',
        'city_name', 'zip_codes',
        'delivery_fee', 'min_order_amount',
        'estimated_minutes', 'is_active', 'sort_order',
    ];

    protected $casts = [
        'polygon_coordinates' => 'array',
        'is_active'           => 'boolean',
        'center_lat'          => 'float',
        'center_lng'          => 'float',
        'radius_km'           => 'float',
        'delivery_fee'        => 'float',
        'min_order_amount'    => 'float',
        'estimated_minutes'   => 'integer',
        'sort_order'          => 'integer',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(DeliveryAssignment::class, 'zone_id');
    }

    /**
     * Check if a lat/lng point is within this zone (circle-based check).
     */
    public function containsPoint(float $lat, float $lng): bool
    {
        if ($this->zone_type === 'circle' && $this->center_lat && $this->center_lng && $this->radius_km) {
            $distance = $this->haversineDistance($lat, $lng, $this->center_lat, $this->center_lng);
            return $distance <= $this->radius_km;
        }
        return true; // For city/zip-based zones, assume valid if zone is active
    }

    private function haversineDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371; // km
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }
}
