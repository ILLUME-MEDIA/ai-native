<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscoveryUserLocation extends Model
{
    protected $fillable = [
        'discovery_user_id',
        'lat', 'lng',
        'address', 'city', 'state', 'zip',
        'country', 'country_code',
        'location_from_gps',
    ];

    protected $casts = [
        'lat'               => 'float',
        'lng'               => 'float',
        'location_from_gps' => 'boolean',
    ];

    public function discoveryUser(): BelongsTo
    {
        return $this->belongsTo(DiscoveryUser::class);
    }
}
