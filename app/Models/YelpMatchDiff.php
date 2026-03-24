<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class YelpMatchDiff extends Model
{
    protected $fillable = [
        'job_id',
        'log_id',
        'entity_id',
        'source_table',
        'source_row_id',
        'yelp_business_id',
        'yelp_business_name',
        'country_code',
        'source_payload',
        'yelp_payload',
        'field_diffs',
        'mapped_updates',
        'merge_status',
        'merge_note',
        'merged_at',
    ];

    protected $casts = [
        'source_payload' => 'array',
        'yelp_payload'   => 'array',
        'field_diffs'    => 'array',
        'mapped_updates' => 'array',
        'merged_at'      => 'datetime',
    ];

    public function job(): BelongsTo
    {
        return $this->belongsTo(YelpJob::class, 'job_id');
    }

    public function log(): BelongsTo
    {
        return $this->belongsTo(YelpJobLog::class, 'log_id');
    }

    public function menuItems(): HasMany
    {
        return $this->hasMany(YelpMatchMenuItem::class, 'match_diff_id')->orderBy('sort_order');
    }
}
