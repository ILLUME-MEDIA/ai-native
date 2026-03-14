<?php

namespace App\Models\DesignSystem;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DsComponentVariant extends Model
{
    protected $table = 'ds_component_variants';

    protected $fillable = [
        'component_id', 'variant_name', 'style_modifier',
        'size', 'token_mapping', 'static_classes', 'description', 'is_active',
    ];

    protected $casts = [
        'token_mapping'  => 'array',
        'static_classes' => 'array',
        'is_active'      => 'boolean',
    ];

    public function component(): BelongsTo
    {
        return $this->belongsTo(DsComponent::class, 'component_id');
    }

    /**
     * Resolve token_mapping to actual CSS property→value pairs
     * using the provided token map.
     *
     * token_mapping example:
     * { "background-color": "color.primary", "color": "color.white", "border-radius": "radius.md" }
     *
     * Returns:
     * { "background-color": "#3b82f6", "color": "#ffffff", "border-radius": "8px" }
     */
    public function resolveStyles(array $tokenMap): array
    {
        $styles = [];
        foreach ($this->token_mapping as $cssProp => $tokenName) {
            if (isset($tokenMap[$tokenName])) {
                $styles[$cssProp] = $tokenMap[$tokenName];
            }
        }
        return $styles;
    }

    /**
     * Build a CSS rule string for this variant.
     * Selector example: .btn-primary, .btn-primary-outline-sm
     */
    public function toCssRule(array $tokenMap, string $prefix = 'btn'): string
    {
        $parts = [$prefix, $this->variant_name];
        if ($this->style_modifier) $parts[] = $this->style_modifier;
        if ($this->size)           $parts[] = $this->size;

        $selector = '.' . implode('-', $parts);
        $styles = $this->resolveStyles($tokenMap);

        if (empty($styles)) return '';

        $body = implode("\n  ", array_map(
            fn($k, $v) => "{$k}: {$v};",
            array_keys($styles),
            array_values($styles)
        ));

        return "{$selector} {\n  {$body}\n}";
    }
}
