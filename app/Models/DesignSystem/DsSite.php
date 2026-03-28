<?php

namespace App\Models\DesignSystem;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class DsSite extends Model
{
    protected $table = 'ds_sites';

    protected $fillable = ['name', 'slug', 'domain', 'api_key', 'theme_id', 'is_active', 'description'];

    protected $hidden = ['api_key'];

    protected $casts = ['is_active' => 'boolean'];

    public function theme(): BelongsTo
    {
        return $this->belongsTo(DsTheme::class, 'theme_id');
    }

    public function pages(): HasMany
    {
        return $this->hasMany(DsSitePage::class, 'site_id')->orderBy('sort_order');
    }

    /** Generate and store a new API key, returns the plain-text key */
    public function regenerateApiKey(): string
    {
        $plain = 'ds_' . Str::random(40);
        $this->api_key = encrypt($plain);
        $this->save();
        return $plain;
    }

    /** Reveal the plain-text API key */
    public function getPlainApiKey(): ?string
    {
        if (!$this->api_key) return null;
        try {
            return decrypt($this->api_key);
        } catch (\Throwable) {
            return null;
        }
    }

    /** Masked key for display: ds_****...xxxx */
    public function getMaskedApiKey(): ?string
    {
        $plain = $this->getPlainApiKey();
        if (!$plain) return null;
        return substr($plain, 0, 6) . str_repeat('*', 30) . substr($plain, -4);
    }

    /** Resolve the effective theme (falls back to default theme, then any theme) */
    public function resolveTheme(): ?DsTheme
    {
        return $this->theme
            ?? DsTheme::where('is_default', true)->first()
            ?? DsTheme::first();
    }
}
