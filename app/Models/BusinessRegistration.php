<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BusinessRegistration extends Model
{
    protected $fillable = [
        'business_name', 'address', 'address_2', 'city', 'state', 'zip', 'country',
        'contact_name', 'contact_email', 'contact_phone', 'website_url', 'menu_url',
        'monday_open', 'monday_close', 'tuesday_open', 'tuesday_close',
        'wednesday_open', 'wednesday_close', 'thursday_open', 'thursday_close',
        'friday_open', 'friday_close', 'saturday_open', 'saturday_close',
        'sunday_open', 'sunday_close',
        'bio', 'image_url', 'audio_url',
        'agreement_accepted', 'signature_name', 'signature_data',
        'target_source', 'status', 'rejection_reason', 'external_site_url', 'business_id',
        'ip_address',
    ];

    protected $casts = [
        'agreement_accepted' => 'boolean',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    public function hoursArray(): array
    {
        $days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        $result = [];
        foreach ($days as $day) {
            $result[$day] = [
                'open'  => $this->{"{$day}_open"},
                'close' => $this->{"{$day}_close"},
            ];
        }
        return $result;
    }
}
