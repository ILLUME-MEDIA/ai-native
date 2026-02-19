<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Business extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'category_id','name','slug','description','cuisine','address','address_2',
        'city','state','zip','country','phone','email','website',
        'logo','cover_image','latitude','longitude',
        'compliance','slaughter_method','halal_authority','halal_info','halal_options','halal_chain',
        'price','parking','credit_cards','transit','permalink',
        'rating','review_count',
        'alcohol','kids_menu','pray_space','organic','catering','delivery',
        'wheelchair_access','wifi','cash_only','pork','drive_thru',
        'reservations','outdoor_seating','shisha','featured','sponsored',
        'monday_open','monday_close','tuesday_open','tuesday_close',
        'wednesday_open','wednesday_close','thursday_open','thursday_close',
        'friday_open','friday_close','saturday_open','saturday_close',
        'sunday_open','sunday_close',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean', 'latitude' => 'float', 'longitude' => 'float',
        'rating'    => 'float',   'review_count' => 'integer',
        'alcohol' => 'boolean', 'kids_menu' => 'boolean', 'pray_space' => 'boolean',
        'organic' => 'boolean', 'catering' => 'boolean', 'delivery' => 'boolean',
        'wheelchair_access' => 'boolean', 'wifi' => 'boolean', 'cash_only' => 'boolean',
        'pork' => 'boolean', 'drive_thru' => 'boolean', 'reservations' => 'boolean',
        'outdoor_seating' => 'boolean', 'shisha' => 'boolean',
        'featured' => 'boolean', 'sponsored' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(BusinessCategory::class, 'category_id');
    }

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
}
