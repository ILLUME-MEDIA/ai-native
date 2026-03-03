<?php

namespace App\Models;

use Cron\CronExpression;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class YelpJob extends Model
{
    protected $fillable = [
        'name',
        'entity_id',
        'search_columns',
        'column_mapping',
        'schedule',
        'mode',
        'auto_merge',
        'is_active',
        'last_run_at',
        'next_run_at',
        'last_processed_id',
        'max_calls_per_run',
    ];

    protected $casts = [
        'search_columns'    => 'array',
        'column_mapping'    => 'array',
        'is_active'         => 'boolean',
        'auto_merge'        => 'boolean',
        'last_run_at'       => 'datetime',
        'next_run_at'       => 'datetime',
        'last_processed_id' => 'integer',
        'max_calls_per_run' => 'integer',
    ];

    public function entity(): BelongsTo
    {
        return $this->belongsTo(SectionEntity::class, 'entity_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(YelpJobLog::class, 'job_id')->latest();
    }

    public function latestLog(): HasMany
    {
        return $this->hasMany(YelpJobLog::class, 'job_id')->latest()->limit(1);
    }

    public function matchDiffs(): HasMany
    {
        return $this->hasMany(YelpMatchDiff::class, 'job_id')->latest();
    }

    /** Calculate and store the next run time from the cron/preset schedule */
    public function updateNextRunAt(): void
    {
        if ($this->schedule === 'manual') {
            $this->next_run_at = null;
            $this->saveQuietly();
            return;
        }

        $cron = $this->toCronExpression();
        if ($cron) {
            $this->next_run_at = (new CronExpression($cron))->getNextRunDate();
            $this->saveQuietly();
        }
    }

    public function toCronExpression(): ?string
    {
        return match ($this->schedule) {
            'manual'  => null,
            'hourly'  => '0 * * * *',
            'daily'   => '0 0 * * *',
            'weekly'  => '0 0 * * 0',
            'monthly' => '0 0 1 * *',
            default   => $this->schedule, // treat as raw cron expression
        };
    }

    public function isDue(): bool
    {
        if (!$this->is_active || $this->schedule === 'manual') {
            return false;
        }
        return $this->next_run_at !== null && $this->next_run_at->isPast();
    }
}
