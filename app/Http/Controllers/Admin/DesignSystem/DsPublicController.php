<?php

namespace App\Http\Controllers\Admin\DesignSystem;

use App\Http\Controllers\Controller;
use App\Models\DesignSystem\DsPageSection;
use App\Models\DesignSystem\DsSite;
use App\Models\DesignSystem\DsSitePage;
use App\Models\DesignSystem\DsTheme;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * DsPublicController — Public (no-auth) read-only API for consuming site pages.
 *
 * Usage from any website / frontend:
 *
 *   GET /api/ds/{siteSlug}
 *       → full site: pages list + resolved theme (nested arrays) + CSS vars
 *
 *   GET /api/ds/{siteSlug}/page/{pageSlug}
 *       → single page with sections + merged theme (page overrides site overrides default)
 *
 * Theme shape returned:
 * {
 *   "theme": {
 *     "colors":     { "primary": "#405189", "secondary": "#74788d", ... },
 *     "typography": { "fontFamily": "...", "fontSize": { "sm": "12px", ... }, "fontWeight": {...} },
 *     "spacing":    { "xs": "4px", "sm": "8px", ... },
 *     "borders":    { "radius": { "sm": "4px", ... }, "width": "1px", ... },
 *     "shadows":    { "sm": "...", "md": "...", ... },
 *     "raw":        { "color.primary": "#405189", ... }   ← flat token map
 *   },
 *   "css": ":root { --color-primary: #405189; ... }"
 * }
 */
class DsPublicController extends Controller
{
    // ── GET /api/ds/{siteSlug} ────────────────────────────────────────────────

    public function site(Request $request, string $siteSlug): JsonResponse
    {
        $site = DsSite::where('slug', $siteSlug)->firstOrFail();

        // Optional API key check for private sites (future: $site->is_public)
        // For now all sites are public-readable.

        $pages = $site->pages()
            ->where('is_active', true)
            ->withCount('sections')
            ->with('theme')
            ->get()
            ->map(fn($p) => $this->formatPageSummary($p));

        $theme   = $site->theme ?? DsTheme::where('is_default', true)->first() ?? DsTheme::first();
        $themeData = $theme ? $this->buildThemePayload($theme) : null;

        return response()->json([
            'site'  => [
                'id'   => $site->id,
                'name' => $site->name,
                'slug' => $site->slug,
                'url'  => $site->url,
            ],
            'theme' => $themeData ? $themeData['theme'] : null,
            'css'   => $themeData ? $themeData['css']   : '',
            'pages' => $pages,
        ]);
    }

    // ── GET /api/ds/{siteSlug}/page/{pageSlug} ────────────────────────────────

    public function page(Request $request, string $siteSlug, string $pageSlug): JsonResponse
    {
        $site = DsSite::where('slug', $siteSlug)->firstOrFail();
        $page = DsSitePage::where('site_id', $site->id)
            ->where('slug', $pageSlug)
            ->where('is_active', true)
            ->with(['sections' => fn($q) => $q->where('is_visible', true)->orderBy('sort_order'), 'theme'])
            ->firstOrFail();

        // Resolve theme cascade: page theme → site theme → default theme
        $theme = $page->theme
            ?? $site->theme
            ?? DsTheme::where('is_default', true)->first()
            ?? DsTheme::first();

        $themeData = $theme ? $this->buildThemePayload($theme) : null;

        $sections = $page->sections->map(fn($s) => $this->formatSectionPublic($s));

        return response()->json([
            'site' => [
                'id'   => $site->id,
                'name' => $site->name,
                'slug' => $site->slug,
                'url'  => $site->url,
            ],
            'page' => [
                'id'               => $page->id,
                'name'             => $page->name,
                'slug'             => $page->slug,
                'title'            => $page->title,
                'meta_description' => $page->meta_description,
                'theme_id'         => $page->theme_id,
            ],
            'theme'    => $themeData ? $themeData['theme'] : null,
            'css'      => $themeData ? $themeData['css']   : '',
            'sections' => $sections,
        ]);
    }

    // ── Build nested theme payload ─────────────────────────────────────────────

    /**
     * Converts a flat token map { "color.primary": "#405189", ... }
     * into grouped nested arrays:
     *   colors       → color.* keys
     *   typography   → font.* keys
     *   spacing      → spacing.* keys
     *   borders      → radius.* + border.* keys
     *   shadows      → shadow.* keys
     *   animation    → animation.* keys
     *   raw          → all tokens flat
     */
    private function buildThemePayload(DsTheme $theme): array
    {
        $raw = $theme->resolveTokenMap();

        $colors     = [];
        $typography = ['fontSize' => [], 'fontWeight' => [], 'lineHeight' => [], 'letterSpacing' => []];
        $spacing    = [];
        $borders    = ['radius' => [], 'width' => []];
        $shadows    = [];
        $animation  = [];
        $other      = [];

        foreach ($raw as $name => $value) {
            $parts    = explode('.', $name, 2);
            $category = $parts[0];
            $key      = $parts[1] ?? $name;

            match ($category) {
                'color'   => $colors[$key]                              = $value,
                'font'    => $this->sortFont($typography, $key, $value),
                'spacing' => $spacing[$key]                             = $value,
                'radius'  => $borders['radius'][$key]                  = $value,
                'border'  => $borders['width'][$key]                   = $value,
                'shadow'  => $shadows[$key]                            = $value,
                'animation' => $animation[$key]                        = $value,
                default   => $other[$name]                             = $value,
            };
        }

        // Clean up empty sub-arrays
        $typography = array_filter($typography);
        $borders    = array_filter($borders);

        $nested = [
            'colors'     => $colors,
            'typography' => $typography,
            'spacing'    => $spacing,
            'borders'    => $borders,
            'shadows'    => $shadows,
        ];
        if (!empty($animation)) $nested['animation'] = $animation;
        if (!empty($other))     $nested['other']      = $other;
        $nested['raw'] = $raw;

        return [
            'theme' => $nested,
            'css'   => $theme->toCssVariables(),
        ];
    }

    private function sortFont(array &$typo, string $key, string $value): void
    {
        if (str_starts_with($key, 'size.')  || $key === 'size')   { $typo['fontSize'][str_replace('size.', '', $key)]        = $value; return; }
        if (str_starts_with($key, 'weight.') || $key === 'weight') { $typo['fontWeight'][str_replace('weight.', '', $key)]    = $value; return; }
        if (str_starts_with($key, 'lineHeight.'))                  { $typo['lineHeight'][str_replace('lineHeight.', '', $key)] = $value; return; }
        if (str_starts_with($key, 'letterSpacing.'))               { $typo['letterSpacing'][str_replace('letterSpacing.', '', $key)] = $value; return; }
        // fontFamily or other
        $typo[$key] = $value;
    }

    // ── Formatters ────────────────────────────────────────────────────────────

    private function formatPageSummary(DsSitePage $page): array
    {
        return [
            'id'               => $page->id,
            'name'             => $page->name,
            'slug'             => $page->slug,
            'title'            => $page->title,
            'meta_description' => $page->meta_description,
            'sections_count'   => $page->sections_count ?? 0,
            'theme_id'         => $page->theme_id,
            'sort_order'       => $page->sort_order,
        ];
    }

    private function formatSectionPublic(DsPageSection $section): array
    {
        $settings = $section->resolved_settings ?? [];
        $style    = $settings['_style'] ?? [];
        unset($settings['_style']);

        return [
            'id'           => $section->id,
            'type'         => $section->section_type,
            'label'        => $section->label,
            'sort_order'   => $section->sort_order,
            'content'      => $settings,   // all content settings (logo, links, items, etc.)
            'style'        => $style,       // CSS overrides for this section
        ];
    }
}
