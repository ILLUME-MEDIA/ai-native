<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataSyncLog extends Model
{
    protected $fillable = [
        'source_id', 'status', 'imported', 'skipped', 'failed', 'duration_ms', 'error',
    ];

    protected $casts = [
        'imported'    => 'integer',
        'skipped'     => 'integer',
        'failed'      => 'integer',
        'duration_ms' => 'integer',
    ];

    public function source(): BelongsTo
    {
        return $this->belongsTo(DataSource::class, 'source_id');
    }
}
