<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DiscoveryUser extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name', 'email', 'photo', 'bio', 'phone',
        'lat', 'lng', 'address', 'city', 'state', 'zip', 'country', 'country_code', 'location_from_gps',
        'ip_address', 'isp', 'connection_type', 'downlink', 'rtt',
        'browser', 'browser_version', 'user_agent', 'language', 'languages',
        'timezone', 'cookies_enabled', 'do_not_track', 'referrer',
        'device_type', 'os', 'os_version', 'platform',
        'hardware_concurrency', 'device_memory', 'screen_width', 'screen_height', 'pixel_ratio', 'color_depth',
        'fingerprint', 'webgl_renderer', 'webgl_vendor',
        'last_seen_at',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'location_from_gps' => 'boolean',
        'cookies_enabled' => 'boolean',
        'do_not_track' => 'boolean',
        'pixel_ratio' => 'float',
        'last_seen_at' => 'datetime',
    ];
}
