<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class YelpNotFoundBusiness extends Model
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
        'source_payload',
        'removed_from_source',
        'reason',
    ];

    protected $casts = [
        'source_payload'      => 'array',
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

