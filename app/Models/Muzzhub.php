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
        try {
            return [
                'halal' => [
                    'menu_level'  => (int) ($this->attributes['halal_menu'] ?? 0),
                    'authority'   => $this->amenityStr('halal_authority'),
                    'slaughter'   => $this->amenityStr('slaughter_method'),
                    'compliance'  => $this->amenityStr('compliance'),
                    'chain'       => $this->amenityBool('halal_chain'),
                    'items'       => $this->amenityStr('halal_items'),
                    'options'     => $this->amenityStr('halal_options'),
                    'description' => $this->amenityStr('description_halal'),
                ],
                'food' => [
                    'alcohol'         => $this->amenityBool('alcohol'),
                    'alcohol_options' => $this->amenityStr('alcohol_options'),
                    'pork'            => $this->amenityBool('pork'),
                    'organic'         => $this->amenityBool('organic'),
                    'shisha'          => $this->amenityBool('shisha'),
                    'kids_menu'       => $this->amenityBool('kids_menu'),
                ],
                'service' => [
                    'delivery'     => $this->amenityBool('delivery'),
                    'catering'     => $this->amenityBool('catering'),
                    'to_go'        => $this->amenityBool('to_go'),
                    'reservations' => $this->amenityBool('reservations'),
                    'drive_thru'   => $this->amenityBool('drive_thru'),
                    'cash_only'    => $this->amenityBool('cash_only'),
                    'credit_cards' => $this->amenityStr('credit_cards'),
                ],
                'facilities' => [
                    'wifi'              => $this->amenityBool('wifi'),
                    'parking'           => $this->amenityBool('parking'),
                    'outdoor_seating'   => $this->amenityBool('outdoor_seating'),
                    'wheelchair_access' => $this->amenityBool('wheelchair_access'),
                    'restrooms'         => $this->amenityBool('restrooms'),
                    'pray_space'        => $this->amenityBool('pray_space'),
                    'prayer'            => $this->amenityBool('prayer'),
                    'transit'           => $this->amenityBool('transit'),
                    'capacity'          => isset($this->attributes['capacity']) && $this->attributes['capacity'] !== null
                                            ? (int) $this->attributes['capacity'] : null,
                ],
            ];
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function amenityBool(string $key): bool
    {
        $val = $this->attributes[$key] ?? null;
        if ($val === null) return false;
        // Handle string "0"/"1" stored in DB as well as native booleans/integers
        return filter_var($val, FILTER_VALIDATE_BOOLEAN);
    }

    private function amenityStr(string $key): ?string
    {
        $val = $this->attributes[$key] ?? null;
        if ($val === null || $val === '') return null;
        return (string) $val;
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
