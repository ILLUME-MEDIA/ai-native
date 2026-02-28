<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class DeliveryStaff extends Model
{
    use SoftDeletes;

    protected $table = 'delivery_staff';

    protected $fillable = [
        'business_id', 'name', 'phone', 'email', 'pin', 'api_token',
        'vehicle_type', 'vehicle_model', 'vehicle_plate', 'photo',
        'status', 'is_active', 'current_lat', 'current_lng',
        'location_updated_at', 'total_deliveries', 'rating', 'notes',
    ];

    protected $hidden = ['pin', 'api_token'];

    protected $casts = [
        'is_active'           => 'boolean',
        'current_lat'         => 'float',
        'current_lng'         => 'float',
        'location_updated_at' => 'datetime',
        'total_deliveries'    => 'integer',
        'rating'              => 'float',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(DeliveryAssignment::class, 'driver_id');
    }

    public function activeAssignment(): HasMany
    {
        return $this->hasMany(DeliveryAssignment::class, 'driver_id')
            ->whereIn('status', ['assigned', 'accepted', 'picked_up', 'out_for_delivery'])
            ->where('is_current', true);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'assigned_driver_id');
    }

    // ── Token management ──────────────────────────────────────────────────────

    public function generateToken(): string
    {
        $token = Str::random(80);
        $this->update(['api_token' => hash('sha256', $token)]);
        return $token;
    }

    public static function findByToken(string $token): ?self
    {
        return static::where('api_token', hash('sha256', $token))->first();
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeAvailable($query)
    {
        return $query->where('status', 'available')->where('is_active', true);
    }

    public function scopeForBusiness($query, int $businessId)
    {
        return $query->where('business_id', $businessId);
    }
}
