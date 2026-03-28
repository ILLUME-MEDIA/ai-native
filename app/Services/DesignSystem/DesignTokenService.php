<?php

namespace App\Services\DesignSystem;

use App\Models\DesignSystem\DsComponent;
use App\Models\DesignSystem\DsTheme;
use App\Models\DesignSystem\DsToken;
use Illuminate\Support\Facades\Cache;

class DesignTokenService
{
    const CACHE_TTL = 300; // 5 minutes

    // ── Theme ──────────────────────────────────────────────────────

    public function getDefaultTheme(): DsTheme
    {
        return DsTheme::where('is_default', true)->firstOrFail();
    }

    public function getTokenMap(int $themeId): array
    {
        return Cache::remember("ds_token_map_{$themeId}", self::CACHE_TTL, function () use ($themeId) {
            $theme = DsTheme::findOrFail($themeId);
            return $theme->resolveTokenMap();
        });
    }

    public function invalidateCache(int $themeId): void
    {
        Cache::forget("ds_token_map_{$themeId}");
        Cache::forget("ds_token_nested_{$themeId}");
        Cache::forget("ds_css_{$themeId}");
        Cache::forget("ds_components_{$themeId}");
    }

    /** Nested grouped token map { color: { primary: "#405189" }, spacing: { md: "16px" } } */
    public function getNestedTokenMap(int $themeId): array
    {
        return Cache::remember("ds_token_nested_{$themeId}", self::CACHE_TTL, function () use ($themeId) {
            $theme = DsTheme::findOrFail($themeId);
            return $theme->resolveNestedMap();
        });
    }

    // ── CSS Export ─────────────────────────────────────────────────

    public function generateCss(int $themeId): string
    {
        return Cache::remember("ds_css_{$themeId}", self::CACHE_TTL, function () use ($themeId) {
            $theme     = DsTheme::with('tokens')->findOrFail($themeId);
            $tokenMap  = $theme->resolveTokenMap();
            $css       = [$theme->toCssVariables()];

            // Generate component CSS rules
            $components = DsComponent::with(['variants' => fn($q) => $q->where('is_active', true)])->get();

            foreach ($components as $component) {
                foreach ($component->variants as $variant) {
                    $rule = $variant->toCssRule($tokenMap, $component->slug);
                    if ($rule) $css[] = $rule;
                }
            }

            return implode("\n\n", $css);
        });
    }

    // ── Component Variant Resolution ───────────────────────────────

    /**
     * Resolve variant config for a specific component + variant + modifier + size.
     * Returns resolved CSS properties ready for React inline styles or className injection.
     */
    public function resolveVariant(
        string $componentSlug,
        string $variantName,
        ?string $modifier = null,
        ?string $size = null,
        ?int $themeId = null
    ): array {
        $themeId  ??= $this->getDefaultTheme()->id;
        $tokenMap   = $this->getTokenMap($themeId);

        $component = DsComponent::where('slug', $componentSlug)->firstOrFail();

        $query = $component->variants()
            ->where('variant_name', $variantName)
            ->where('is_active', true);

        if ($modifier !== null) $query->where('style_modifier', $modifier);
        else                    $query->whereNull('style_modifier');

        if ($size !== null) $query->where('size', $size);
        else                $query->whereNull('size');

        $variant = $query->firstOrFail();

        return [
            'styles'        => $variant->resolveStyles($tokenMap),
            'staticClasses' => $variant->static_classes ?? [],
            'tokenMapping'  => $variant->token_mapping,
        ];
    }

    // ── Bulk Component Resolution ───────────────────────────────────

    /**
     * Returns all variants for a component, grouped by variant+modifier+size.
     * Used by the React token engine to build a full style map client-side.
     */
    public function resolveAllVariants(string $componentSlug, int $themeId): array
    {
        $tokenMap  = $this->getTokenMap($themeId);
        $component = DsComponent::where('slug', $componentSlug)
            ->with(['variants' => fn($q) => $q->where('is_active', true)])
            ->firstOrFail();

        $result = [];
        foreach ($component->variants as $variant) {
            $key = implode('|', array_filter([
                $variant->variant_name,
                $variant->style_modifier,
                $variant->size,
            ]));
            $result[$key] = [
                'variantName'   => $variant->variant_name,
                'modifier'      => $variant->style_modifier,
                'size'          => $variant->size,
                'styles'        => $variant->resolveStyles($tokenMap),
                'staticClasses' => $variant->static_classes ?? [],
            ];
        }

        return $result;
    }

    // ── Export ─────────────────────────────────────────────────────

    /**
     * Export theme as a nested grouped JSON structure.
     *
     * Returns:
     * {
     *   "color":   { "primary": "#405189", "secondary": "#74788d", ... },
     *   "spacing": { "xs": "4px", "sm": "8px", "md": "16px", ... },
     *   "radius":  { "sm": "4px", "md": "8px", "lg": "12px" },
     *   "shadow":  { "sm": "...", "md": "...", "lg": "..." },
     *   "font":    { "family": "Inter", "size": { "sm": "12px", ... } },
     *   "_flat":   { "color.primary": "#405189", ... }   ← backward-compat flat map
     * }
     */
    public function exportJson(int $themeId): array
    {
        $theme  = DsTheme::findOrFail($themeId);
        $nested = $theme->resolveNestedMap();
        $flat   = $theme->resolveTokenMap();

        return array_merge($nested, ['_flat' => $flat]);
    }

    public function exportDesignTokenStandard(int $themeId): array
    {
        $tokens = DsToken::where('theme_id', $themeId)->get();
        $output = [];

        foreach ($tokens as $token) {
            $parts = explode('.', $token->name);
            $ref   = &$output;
            foreach ($parts as $i => $part) {
                if ($i === count($parts) - 1) {
                    $ref[$part] = ['$value' => $token->value, '$type' => $token->category];
                    if ($token->description) $ref[$part]['$description'] = $token->description;
                } else {
                    $ref[$part] ??= [];
                    $ref = &$ref[$part];
                }
            }
        }

        return $output;
    }

    public function exportTailwindConfig(int $themeId): array
    {
        $theme = DsTheme::findOrFail($themeId);
        return ['theme' => ['extend' => $theme->toTailwindConfig()]];
    }
}
