<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoogleJobLog extends Model
{
    protected $fillable = [
        'job_id', 'account_id', 'status',
        'total_rows', 'processed_rows', 'failed_rows', 'skipped_rows',
        'new_columns_added', 'error_message',
        'stop_requested_at', 'started_at', 'completed_at',
    ];

    protected $casts = [
        'new_columns_added'  => 'array',
        'stop_requested_at'  => 'datetime',
        'started_at'         => 'datetime',
        'completed_at'       => 'datetime',
    ];

    public function job(): BelongsTo
    {
        return $this->belongsTo(YelpJob::class, 'job_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(GoogleAccount::class, 'account_id');
    }

    public function isStopRequested(): bool
    {
        $this->refresh();
        return $this->stop_requested_at !== null || $this->status === 'paused';
    }
}
