<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DataSource extends Model
{
    protected $fillable = [
        'name', 'slug', 'description', 'type', 'config',
        'is_active', 'last_sync_at', 'total_synced',
        'sync_status', 'last_error',
    ];

    protected $casts = [
        'config'       => 'array',
        'is_active'    => 'boolean',
        'last_sync_at' => 'datetime',
        'total_synced' => 'integer',
    ];

    public function logs(): HasMany
    {
        return $this->hasMany(DataSyncLog::class, 'source_id')->latest();
    }
}
