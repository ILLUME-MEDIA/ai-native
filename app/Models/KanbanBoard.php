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
}
