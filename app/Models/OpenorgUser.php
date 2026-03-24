<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OpenorgUser extends Model
{
    protected $fillable = ['cal_platform_id', 'name', 'email', 'phone', 'is_active', 'metadata'];

    protected $casts = [
        'is_active' => 'boolean',
        'metadata'  => 'array',
    ];

    public function platform(): BelongsTo
    {
        return $this->belongsTo(CalPlatform::class, 'cal_platform_id');
    }

    public function meetings(): HasMany
    {
        return $this->hasMany(CalMeeting::class);
    }

    public function kanbanCards(): HasMany
    {
        return $this->hasMany(KanbanCard::class);
    }
}
