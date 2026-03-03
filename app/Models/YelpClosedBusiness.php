<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class YelpClosedBusiness extends Model
{
    protected $fillable = [
        'job_id',
        'log_id',
        'entity_id',
        'source_table',
        'source_row_id',
        'search_term',
        'search_location',
        'country_code',
        'yelp_business_id',
        'yelp_business_name',
        'source_payload',
        'yelp_payload',
        'removed_from_source',
        'reason',
    ];

    protected $casts = [
        'source_payload'      => 'array',
        'yelp_payload'        => 'array',
        'removed_from_source' => 'boolean',
    ];

    public function job(): BelongsTo
    {
        return $this->belongsTo(YelpJob::class, 'job_id');
    }

    public function log(): BelongsTo
    {
        return $this->belongsTo(YelpJobLog::class, 'log_id');
    }
}

