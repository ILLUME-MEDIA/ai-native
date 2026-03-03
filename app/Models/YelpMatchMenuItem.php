<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class YelpMatchMenuItem extends Model
{
    protected $fillable = [
        'match_diff_id',
        'job_id',
        'source_row_id',
        'source_table',
        'business_id',
        'yelp_business_id',
        'yelp_menu_item_id',
        'name',
        'category',
        'description',
        'price',
        'currency',
        'image',
        'is_available',
        'sort_order',
        'source_type',
        'raw_payload',
    ];

    protected $casts = [
        'price'        => 'float',
        'is_available' => 'boolean',
        'sort_order'   => 'integer',
        'raw_payload'  => 'array',
    ];

    public function matchDiff(): BelongsTo
    {
        return $this->belongsTo(YelpMatchDiff::class, 'match_diff_id');
    }
}

