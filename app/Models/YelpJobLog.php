<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class YelpJobLog extends Model
{
    protected $fillable = [
        'job_id',
        'account_id',
        'status',
        'total_rows',
        'processed_rows',
        'failed_rows',
        'skipped_rows',
        'closed_rows',
        'not_found_rows',
        'stop_requested_at',
        'new_columns_added',
        'error_message',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'total_rows'        => 'integer',
        'processed_rows'    => 'integer',
        'failed_rows'       => 'integer',
        'skipped_rows'      => 'integer',
        'closed_rows'       => 'integer',
        'not_found_rows'    => 'integer',
        'new_columns_added' => 'array',
        'started_at'        => 'datetime',
        'completed_at'      => 'datetime',
    ];

    public function isStopRequested(): bool
    {
        // Refresh from DB to get latest value
        return !is_null($this->fresh()->stop_requested_at);
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(YelpJob::class, 'job_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(YelpAccount::class, 'account_id');
    }

    public function getDurationAttribute(): ?string
    {
        if (!$this->started_at || !$this->completed_at) {
            return null;
        }
        $secs = $this->started_at->diffInSeconds($this->completed_at);
        return $secs < 60 ? "{$secs}s" : round($secs / 60, 1) . 'm';
    }
}
