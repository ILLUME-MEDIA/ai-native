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
        'is_active',
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
    ];

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
