<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KanbanBoard extends Model
{
    protected $fillable = ['name', 'description', 'color', 'is_active', 'cal_platform_id'];

    protected $casts = ['is_active' => 'boolean'];

    public function columns(): HasMany
    {
        return $this->hasMany(KanbanColumn::class, 'board_id')->orderBy('position');
    }

    public function cards(): HasMany
    {
        return $this->hasMany(KanbanCard::class, 'board_id');
    }

    public function platform(): BelongsTo
    {
        return $this->belongsTo(CalPlatform::class, 'cal_platform_id');
    }

    /**
     * Find the best matching column for a given Cal.com meeting status.
     * Mapping: upcoming/confirmed/rescheduled → "To Do"
     *          cancelled → "Cancelled" (falls back to last column)
     *          completed → "Done" (falls back to last column)
     */
    public function findColumnByStatus(string $status): ?KanbanColumn
    {
        $cols = $this->columns()->orderBy('position')->get();
        if ($cols->isEmpty()) return null;

        // Name-based keywords per status (ordered by preference)
        $targets = match ($status) {
            'upcoming', 'confirmed' => ['to do', 'todo', 'new', 'backlog', 'open'],
            'rescheduled'           => ['to do', 'todo', 'rescheduled', 'backlog'],
            'cancelled'             => ['cancelled', 'canceled', 'closed'],
            'completed'             => ['done', 'completed', 'finished', 'closed'],
            default                 => ['to do', 'todo'],
        };

        foreach ($targets as $target) {
            $col = $cols->first(fn ($c) => strtolower(trim($c->name)) === $target);
            if ($col) return $col;
        }

        // Fallback: terminal statuses go to last column, others to first
        $terminal = ['cancelled', 'completed'];
        return in_array($status, $terminal) ? $cols->last() : $cols->first();
    }
}
