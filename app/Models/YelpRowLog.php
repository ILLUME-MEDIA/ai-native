<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class YelpRowLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'log_id',
        'row_id',
        'search_term',
        'search_location',
        'status',
        'yelp_id',
        'yelp_name',
        'yelp_city',
        'yelp_rating',
        'yelp_is_closed',
        'error',
    ];

    protected $casts = [
        'yelp_rating'    => 'float',
        'yelp_is_closed' => 'boolean',
        'created_at'     => 'datetime',
    ];

    public function log(): BelongsTo
    {
        return $this->belongsTo(YelpJobLog::class, 'log_id');
    }
}
