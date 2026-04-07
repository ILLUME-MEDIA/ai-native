<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoogleRowLog extends Model
{
    protected $fillable = [
        'log_id',
        'row_id',
        'status',
        'search_term',
        'search_location',
        'google_place_id',
        'google_name',
        'google_address',
        'google_rating',
        'fields_updated',
        'error',
    ];

    protected $casts = [
        'fields_updated' => 'array',
        'google_rating'  => 'float',
    ];

    public function log(): BelongsTo
    {
        return $this->belongsTo(GoogleJobLog::class, 'log_id');
    }
}
