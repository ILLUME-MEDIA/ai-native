<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class AiDuty extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'instructions',
        'schedule_type',
        'schedule_value',
        'execution_data',
        'last_result',
        'last_executed_at',
        'next_execution_at',
        'is_active',
        'priority',
        'execution_count',
        'success_count',
        'failure_count',
        'status',
        'error_message',
        'metadata'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'priority' => 'integer',
        'execution_count' => 'integer',
        'success_count' => 'integer',
        'failure_count' => 'integer',
        'execution_data' => 'array',
        'last_result' => 'array',
        'metadata' => 'array',
        'last_executed_at' => 'datetime',
        'next_execution_at' => 'datetime'
    ];

    /**
     * Get active duties that are due for execution
     */
    public static function getDueDuties()
    {
        return static::where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('next_execution_at')
                    ->orWhere('next_execution_at', '<=', now());
            })
            ->where('status', '!=', 'running')
            ->orderBy('priority', 'desc')
            ->orderBy('next_execution_at', 'asc')
            ->get();
    }

    /**
     * Calculate next execution time based on schedule
     */
    public function calculateNextExecution()
    {
        if (!$this->is_active || !$this->schedule_value) {
            return null;
        }

        switch ($this->schedule_type) {
            case 'interval':
                return $this->parseInterval($this->schedule_value);
            case 'daily':
                return $this->parseDaily($this->schedule_value);
            case 'weekly':
                return $this->parseWeekly($this->schedule_value);
            case 'monthly':
                return $this->parseMonthly($this->schedule_value);
            case 'cron':
                // Basic implementation, for production consider a cron parser library
                return now()->addHour();
            default:
                return null;
        }
    }

    private function parseInterval($value)
    {
        if (preg_match('/every_(\d+)_(minute|minutes|hour|hours|day|days)/i', $value, $matches)) {
            $amount = (int) $matches[1];
            $unit = strtolower($matches[2]);
            return now()->add($unit, $amount);
        }
        return now()->addHours(12);
    }

    private function parseDaily($value)
    {
        if (preg_match('/(\d{1,2}):(\d{2})(?::(\d{2}))?/', $value, $matches)) {
            $next = now()->setTime((int) $matches[1], (int) $matches[2], 0);
            if ($next->isPast())
                $next->addDay();
            return $next;
        }
        return now()->addDay()->setTime(0, 0, 0);
    }

    private function parseWeekly($value)
    {
        if (preg_match('/(\w+):(\d{1,2}):(\d{2})/i', $value, $matches)) {
            $dayName = ucfirst(strtolower($matches[1]));
            $next = now()->next($dayName)->setTime((int) $matches[2], (int) $matches[3], 0);
            return $next;
        }
        return now()->addWeek();
    }

    private function parseMonthly($value)
    {
        if (preg_match('/(\d{1,2}):(\d{1,2}):(\d{2})/', $value, $matches)) {
            $next = now()->day((int) $matches[1])->setTime((int) $matches[2], (int) $matches[3], 0);
            if ($next->isPast())
                $next->addMonth();
            return $next;
        }
        return now()->addMonth();
    }

    public function markAsRunning()
    {
        $this->update([
            'status' => 'running',
            'last_executed_at' => now()
        ]);
    }

    public function markAsCompleted($result = null)
    {
        $this->update([
            'status' => 'completed',
            'last_result' => $result,
            'last_executed_at' => now(),
            'next_execution_at' => $this->calculateNextExecution(),
            'execution_count' => $this->execution_count + 1,
            'success_count' => $this->success_count + 1,
            'error_message' => null
        ]);
    }

    public function markAsFailed($errorMessage)
    {
        $this->update([
            'status' => 'failed',
            'last_executed_at' => now(),
            'next_execution_at' => $this->calculateNextExecution(),
            'execution_count' => $this->execution_count + 1,
            'failure_count' => $this->failure_count + 1,
            'error_message' => $errorMessage
        ]);
    }
}
