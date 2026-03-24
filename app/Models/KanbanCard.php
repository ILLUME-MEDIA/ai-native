<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KanbanCard extends Model
{
    protected $fillable = [
        'column_id', 'board_id', 'title', 'description',
        'priority', 'due_date', 'assignee', 'labels', 'position', 'metadata',
        'openorg_user_id', 'user_source', 'source_meeting_id', 'is_meeting_card',
    ];

    protected $casts = [
        'labels'          => 'array',
        'metadata'        => 'array',
        'due_date'        => 'date',
        'is_meeting_card' => 'boolean',
    ];

    public function column(): BelongsTo
    {
        return $this->belongsTo(KanbanColumn::class, 'column_id');
    }

    public function board(): BelongsTo
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }

    public function openorgUser(): BelongsTo
    {
        return $this->belongsTo(OpenorgUser::class, 'openorg_user_id');
    }

    public function sourceMeeting(): BelongsTo
    {
        return $this->belongsTo(CalMeeting::class, 'source_meeting_id');
    }
}
