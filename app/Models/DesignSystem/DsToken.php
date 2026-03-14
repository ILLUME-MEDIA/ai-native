<?php

namespace App\Models\DesignSystem;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DsToken extends Model
{
    protected $table = 'ds_tokens';

    protected $fillable = [
        'theme_id', 'name', 'category', 'value',
        'type', 'alias_of', 'description', 'sort_order',
    ];

    public function theme(): BelongsTo
    {
        return $this->belongsTo(DsTheme::class, 'theme_id');
    }
}
