<?php

namespace App\Models\DesignSystem;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DsSitePage extends Model
{
    protected $table = 'ds_site_pages';

    protected $fillable = [
        'site_id', 'name', 'slug', 'title', 'meta_description',
        'sort_order', 'theme_id', 'is_active',
    ];

    protected $casts = ['is_active' => 'boolean'];

    public function site(): BelongsTo
    {
        return $this->belongsTo(DsSite::class, 'site_id');
    }

    public function theme(): BelongsTo
    {
        return $this->belongsTo(DsTheme::class, 'theme_id');
    }

    public function sections(): HasMany
    {
        return $this->hasMany(DsPageSection::class, 'page_id')->orderBy('sort_order');
    }

    /** Resolve effective theme: page override → site theme → default theme */
    public function resolveTheme(): ?DsTheme
    {
        return $this->theme
            ?? $this->site?->resolveTheme()
            ?? DsTheme::where('is_default', true)->first()
            ?? DsTheme::first();
    }
}
