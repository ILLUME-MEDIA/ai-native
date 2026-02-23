<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AITask extends Model
{
    protected $table = 'ai_tasks';

    protected $fillable = [
        'task_list_id',
        'order',
        'title',
        'description',
        'status',
        'result',
    ];

    protected $casts = [
        'result' => 'array',
    ];

    public function taskList(): BelongsTo
    {
        return $this->belongsTo(AITaskList::class, 'task_list_id');
    }
}
