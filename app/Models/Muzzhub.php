<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Muzzhub extends Model
{
    use SoftDeletes;

    protected $table = 'muzzhub';

    protected $fillable = [
        'category_id',
        'business_id',
        'yelp_verified', 'name', 'slug', 'type', 'cuisine', 'description',
        'address', 'address_2', 'city', 'state', 'zip', 'country',
        'longitude', 'latitude', 'phone', 'mobile_phone', 'email', 'website',
        'logo', 'cover_image', 'permalink', 'restHash',
        'compliance', 'slaughter_method', 'halal_authority', 'halal_info',
        'halal_options', 'halal_chain', 'halal_items', 'halal_menu', 'description_halal',
        'monday_open', 'monday_close', 'tuesday_open', 'tuesday_close',
        'wednesday_open', 'wednesday_close', 'thursday_open', 'thursday_close',
        'friday_open', 'friday_close', 'saturday_open', 'saturday_close',
        'sunday_open', 'sunday_close',
        'alcohol', 'kids_menu', 'pray_space', 'organic', 'catering', 'delivery',
        'wheelchair_access', 'wifi', 'cash_only', 'pork', 'featured', 'sponsored',
        'shisha', 'drive_thru', 'reservations', 'outdoor_seating', 'prayer',
        'restrooms', 'wheelchair', 'credit_cards', 'amenities', 'alcohol_options',
        'rating', 'review_count', 'followers', 'following', 'total_ratings', 'photo_count',
        'price', 'parking', 'parking_zhalal', 'transit', 'timezone',
        'comments', 'ownedBy', 'related', 'associated_listings',
        'featured_heading', 'featured_tiles',
        'enable_order', 'enable_order_print', 'enable_stripe', 'adjust_platform_fee',
        'is_online', 'booking', 'booking_slot_value', 'platforms',
        'order_online_link', 'delivery_fee_discount', 'offline_record_time',
        'capacity', 'to_go', 'demographics', 'kitchen',
        'restrict_checkin', 'created_app_user', 'createdByUserNum', 'updatedByUserNum',
        'checkin_start', 'checkin_end', 'start_date', 'end_date', 'closedDate',
        'is_active', 'auto_accept',
    ];

    protected $casts = [
        'is_active'         => 'boolean',
        'yelp_verified'     => 'boolean',
        'alcohol'           => 'boolean',
        'kids_menu'         => 'boolean',
        'pray_space'        => 'boolean',
        'organic'           => 'boolean',
        'catering'          => 'boolean',
        'delivery'          => 'boolean',
        'wheelchair_access' => 'boolean',
        'wifi'              => 'boolean',
        'cash_only'         => 'boolean',
        'pork'              => 'boolean',
        'featured'          => 'boolean',
        'sponsored'         => 'boolean',
        'enable_order'      => 'boolean',
        'enable_order_print'=> 'boolean',
        'enable_stripe'     => 'boolean',
        'adjust_platform_fee'=> 'boolean',
        'is_online'         => 'boolean',
        'restrict_checkin'  => 'boolean',
        'created_app_user'  => 'boolean',
        'auto_accept'       => 'boolean',
    ];

    // ── Amenities accessor ────────────────────────────────────────────────────
    // Overrides the raw (null) `amenities` column with a structured object
    // built from the existing scattered amenity fields in this table.

    public function getAmenitiesAttribute(): array
    {
        $bool = fn($key) => (bool) ($this->attributes[$key] ?? false);
        $str  = fn($key) => isset($this->attributes[$key]) && $this->attributes[$key] !== '' ? $this->attributes[$key] : null;

        return [
            'halal' => [
                'menu_level'  => (int) ($this->attributes['halal_menu'] ?? 0), // 0=none,1=partial,2=mostly,3=fully
                'authority'   => $str('halal_authority'),
                'slaughter'   => $str('slaughter_method'),
                'compliance'  => $str('compliance'),
                'chain'       => $bool('halal_chain'),
                'items'       => $str('halal_items'),
                'options'     => $str('halal_options'),
                'description' => $str('description_halal'),
            ],
            'food' => [
                'alcohol'         => $bool('alcohol'),
                'alcohol_options' => $str('alcohol_options'),
                'pork'            => $bool('pork'),
                'organic'         => $bool('organic'),
                'shisha'          => $bool('shisha'),
                'kids_menu'       => $bool('kids_menu'),
            ],
            'service' => [
                'delivery'     => $bool('delivery'),
                'catering'     => $bool('catering'),
                'to_go'        => $bool('to_go'),
                'reservations' => $bool('reservations'),
                'drive_thru'   => $bool('drive_thru'),
                'cash_only'    => $bool('cash_only'),
                'credit_cards' => $str('credit_cards'),
            ],
            'facilities' => [
                'wifi'             => $bool('wifi'),
                'parking'          => $bool('parking'),
                'outdoor_seating'  => $bool('outdoor_seating'),
                'wheelchair_access'=> $bool('wheelchair_access'),
                'restrooms'        => $bool('restrooms'),
                'pray_space'       => $bool('pray_space'),
                'prayer'           => $bool('prayer'),
                'transit'          => $bool('transit'),
                'capacity'         => isset($this->attributes['capacity']) ? (int) $this->attributes['capacity'] : null,
            ],
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(MuzzhubCategory::class, 'category_id');
    }

    /** Linked Business for menu/orders — order flow uses this. */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
