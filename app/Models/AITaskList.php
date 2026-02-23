<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AITaskList extends Model
{
    protected $table = 'ai_task_lists';

    protected $fillable = [
        'conversation_id',
        'status',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(AIConversation::class, 'conversation_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(AITask::class, 'task_list_id')->orderBy('order');
    }
}
