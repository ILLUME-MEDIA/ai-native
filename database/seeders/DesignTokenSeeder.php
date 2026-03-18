<?php

namespace Database\Seeders;

use App\Models\DesignSystem\DsTheme;
use App\Models\DesignSystem\DsToken;
use Illuminate\Database\Seeder;

/**
 * Seeds a complete professional token set into a theme.
 * Covers: full color palettes, semantic aliases, spacing, typography, shadow/elevation, radii.
 * Token naming: category.group.scale  e.g. color.primary.500, spacing.4, font.size.sm
 */
class DesignTokenSeeder extends Seeder
{
    // ── Raw color palettes ────────────────────────────────────────────────────

    private array $palettes = [
        'primary' => [
            50  => '#ecfeff', 100 => '#cffafe', 200 => '#a5f3fc', 300 => '#67e8f9',
            400 => '#22d3ee', 500 => '#06b6d4', 600 => '#0891b2', 700 => '#0e7490',
            800 => '#155e75', 900 => '#164e63',
        ],
        'secondary' => [
            50  => '#fdf2f8', 100 => '#fce7f3', 200 => '#fbcfe8', 300 => '#f9a8d4',
            400 => '#f472b6', 500 => '#ec4899', 600 => '#db2777', 700 => '#be185d',
            800 => '#9d174d', 900 => '#831843',
        ],
        'success' => [
            50  => '#f0fdf4', 100 => '#dcfce7', 200 => '#bbf7d0', 300 => '#86efac',
            400 => '#4ade80', 500 => '#22c55e', 600 => '#16a34a', 700 => '#15803d',
            800 => '#166534', 900 => '#14532d',
        ],
        'danger' => [
            50  => '#fff1f2', 100 => '#ffe4e6', 200 => '#fecdd3', 300 => '#fda4af',
            400 => '#fb7185', 500 => '#f43f5e', 600 => '#e11d48', 700 => '#be123c',
            800 => '#9f1239', 900 => '#881337',
        ],
        'warning' => [
            50  => '#fff7ed', 100 => '#ffedd5', 200 => '#fed7aa', 300 => '#fdba74',
            400 => '#fb923c', 500 => '#f97316', 600 => '#ea580c', 700 => '#c2410c',
            800 => '#9a3412', 900 => '#7c2d12',
        ],
        'info' => [
            50  => '#f0f9ff', 100 => '#e0f2fe', 200 => '#bae6fd', 300 => '#7dd3fc',
            400 => '#38bdf8', 500 => '#0ea5e9', 600 => '#0284c7', 700 => '#0369a1',
            800 => '#075985', 900 => '#0c4a6e',
        ],
        'gray' => [
            50  => '#fafafa', 100 => '#f4f4f5', 200 => '#e4e4e7', 300 => '#d4d4d8',
            400 => '#a1a1aa', 500 => '#71717a', 600 => '#52525b', 700 => '#3f3f46',
            800 => '#27272a', 900 => '#18181b',
        ],
        'blue'   => [
            50  => '#eff6ff', 100 => '#dbeafe', 200 => '#bfdbfe', 300 => '#93c5fd',
            400 => '#60a5fa', 500 => '#3b82f6', 600 => '#2563eb', 700 => '#1d4ed8',
            800 => '#1e40af', 900 => '#1e3a8a',
        ],
        'purple' => [
            50  => '#faf5ff', 100 => '#f3e8ff', 200 => '#e9d5ff', 300 => '#d8b4fe',
            400 => '#c084fc', 500 => '#a855f7', 600 => '#9333ea', 700 => '#7e22ce',
            800 => '#6b21a8', 900 => '#581c87',
        ],
        'teal' => [
            50  => '#f0fdfa', 100 => '#ccfbf1', 200 => '#99f6e4', 300 => '#5eead4',
            400 => '#2dd4bf', 500 => '#14b8a6', 600 => '#0d9488', 700 => '#0f766e',
            800 => '#115e59', 900 => '#134e4a',
        ],
        'amber' => [
            50  => '#fffbeb', 100 => '#fef3c7', 200 => '#fde68a', 300 => '#fcd34d',
            400 => '#fbbf24', 500 => '#f59e0b', 600 => '#d97706', 700 => '#b45309',
            800 => '#92400e', 900 => '#78350f',
        ],
    ];

    // ── Spacing (4px base grid) ───────────────────────────────────────────────

    private array $spacing = [
        'px'  => '1px',   '0'   => '0px',    '0.5' => '2px',   '1'   => '4px',
        '1.5' => '6px',   '2'   => '8px',    '2.5' => '10px',  '3'   => '12px',
        '3.5' => '14px',  '4'   => '16px',   '5'   => '20px',  '6'   => '24px',
        '7'   => '28px',  '8'   => '32px',   '9'   => '36px',  '10'  => '40px',
        '11'  => '44px',  '12'  => '48px',   '14'  => '56px',  '16'  => '64px',
        '20'  => '80px',  '24'  => '96px',   '28'  => '112px', '32'  => '128px',
        '36'  => '144px', '40'  => '160px',  '48'  => '192px', '56'  => '224px',
        '64'  => '256px', '72'  => '288px',  '80'  => '320px', '96'  => '384px',
    ];

    // ── Radii ─────────────────────────────────────────────────────────────────

    private array $radii = [
        'none' => '0px',  'xs' => '2px',  'sm' => '4px',
        'md'   => '8px',  'lg' => '12px', 'xl' => '16px',
        '2xl'  => '24px', 'full' => '9999px',
    ];

    // ── Typography ────────────────────────────────────────────────────────────

    private array $fontSizes = [
        '2xs' => '10px', 'xs' => '12px', 'sm' => '14px', 'md' => '16px',
        'lg'  => '18px', 'xl' => '20px', '2xl' => '24px', '3xl' => '30px',
        '4xl' => '36px', '5xl' => '48px', '6xl' => '60px', '7xl' => '72px',
    ];

    private array $fontWeights = [
        'thin' => '100', 'light' => '300', 'normal' => '400',
        'medium' => '500', 'semibold' => '600', 'bold' => '700',
        'extrabold' => '800', 'black' => '900',
    ];

    private array $lineHeights = [
        'none' => '1', 'tight' => '1.25', 'snug' => '1.375',
        'normal' => '1.5', 'relaxed' => '1.625', 'loose' => '2',
    ];

    private array $letterSpacings = [
        'tighter' => '-0.05em', 'tight' => '-0.025em', 'normal' => '0em',
        'wide' => '0.025em', 'wider' => '0.05em', 'widest' => '0.1em',
    ];

    // ── Shadows (elevation 0–9) ───────────────────────────────────────────────

    private array $shadows = [
        '0'  => '0px 1px 1px rgba(0,0,0,0.18)',
        '1'  => '0px 1px 1.41px rgba(0,0,0,0.20)',
        '2'  => '0px 1px 2.22px rgba(0,0,0,0.22)',
        '3'  => '0px 2px 2.62px rgba(0,0,0,0.23)',
        '4'  => '0px 2px 3.84px rgba(0,0,0,0.25)',
        '5'  => '0px 3px 4.65px rgba(0,0,0,0.27)',
        '6'  => '0px 3px 4.65px rgba(0,0,0,0.29)',
        '7'  => '0px 4px 4.65px rgba(0,0,0,0.30)',
        '8'  => '0px 4px 5.46px rgba(0,0,0,0.32)',
        '9'  => '0px 5px 6.27px rgba(0,0,0,0.34)',
    ];

    // ── Opacity ───────────────────────────────────────────────────────────────

    private array $opacities = [
        '0' => '0', '5' => '0.05', '10' => '0.1', '20' => '0.2',
        '25' => '0.25', '30' => '0.3', '40' => '0.4', '50' => '0.5',
        '60' => '0.6', '70' => '0.7', '75' => '0.75', '80' => '0.8',
        '90' => '0.9', '95' => '0.95', '100' => '1',
    ];

    // ── Semantic light theme ───────────────────────────────────────────────────

    private array $semanticLight = [
        // Text
        'color.text.default'       => ['alias_of' => 'color.gray.900'],
        'color.text.muted'         => ['alias_of' => 'color.gray.600'],
        'color.text.subtle'        => ['alias_of' => 'color.gray.500'],
        'color.text.inverse'       => ['value' => '#ffffff'],
        'color.text.brand'         => ['alias_of' => 'color.primary.700'],
        'color.text.danger'        => ['alias_of' => 'color.danger.700'],
        'color.text.warning'       => ['alias_of' => 'color.warning.700'],
        'color.text.success'       => ['alias_of' => 'color.success.700'],
        'color.text.info'          => ['alias_of' => 'color.info.700'],
        // Backgrounds
        'color.bg.canvas'          => ['alias_of' => 'color.gray.50'],
        'color.bg.surface'         => ['value' => '#ffffff'],
        'color.bg.surface-subtle'  => ['alias_of' => 'color.gray.100'],
        'color.bg.elevated'        => ['value' => '#ffffff'],
        'color.bg.brand'           => ['alias_of' => 'color.primary.50'],
        'color.bg.danger-subtle'   => ['alias_of' => 'color.danger.50'],
        'color.bg.warning-subtle'  => ['alias_of' => 'color.warning.50'],
        'color.bg.success-subtle'  => ['alias_of' => 'color.success.50'],
        'color.bg.info-subtle'     => ['alias_of' => 'color.info.50'],
        'color.bg.overlay'         => ['value' => 'rgba(15,23,42,0.4)'],
        // Borders
        'color.border.default'     => ['alias_of' => 'color.gray.200'],
        'color.border.muted'       => ['alias_of' => 'color.gray.100'],
        'color.border.strong'      => ['alias_of' => 'color.gray.300'],
        'color.border.brand'       => ['alias_of' => 'color.primary.500'],
        'color.border.focus'       => ['alias_of' => 'color.blue.500'],
        'color.border.danger'      => ['alias_of' => 'color.danger.400'],
        'color.border.success'     => ['alias_of' => 'color.success.400'],
        'color.border.warning'     => ['alias_of' => 'color.warning.400'],
        // Accent
        'color.accent.primary'        => ['alias_of' => 'color.primary.500'],
        'color.accent.primary-hover'  => ['alias_of' => 'color.primary.600'],
        'color.accent.primary-active' => ['alias_of' => 'color.primary.700'],
        'color.accent.secondary'      => ['alias_of' => 'color.secondary.500'],
        // Status
        'color.status.danger'    => ['alias_of' => 'color.danger.500'],
        'color.status.warning'   => ['alias_of' => 'color.warning.500'],
        'color.status.success'   => ['alias_of' => 'color.success.500'],
        'color.status.info'      => ['alias_of' => 'color.info.500'],
        // On-color (text on colored backgrounds)
        'color.on.primary'   => ['value' => '#ffffff'],
        'color.on.secondary' => ['value' => '#ffffff'],
        'color.on.danger'    => ['value' => '#ffffff'],
        'color.on.success'   => ['value' => '#ffffff'],
        'color.on.warning'   => ['alias_of' => 'color.gray.900'],
        'color.on.info'      => ['value' => '#ffffff'],
    ];

    // ── Dark mode semantic ─────────────────────────────────────────────────────

    private array $semanticDark = [
        'color.dark.text.default'       => ['alias_of' => 'color.gray.50'],
        'color.dark.text.muted'         => ['alias_of' => 'color.gray.300'],
        'color.dark.text.subtle'        => ['alias_of' => 'color.gray.400'],
        'color.dark.text.inverse'       => ['alias_of' => 'color.gray.900'],
        'color.dark.text.brand'         => ['alias_of' => 'color.primary.300'],
        'color.dark.bg.canvas'          => ['value' => '#18181b'],
        'color.dark.bg.surface'         => ['value' => '#27272a'],
        'color.dark.bg.surface-subtle'  => ['value' => '#3f3f46'],
        'color.dark.bg.elevated'        => ['value' => '#3f3f46'],
        'color.dark.border.default'     => ['value' => '#52525b'],
        'color.dark.border.muted'       => ['value' => '#3f3f46'],
        'color.dark.border.strong'      => ['value' => '#71717a'],
        'color.dark.accent.primary'     => ['alias_of' => 'color.primary.400'],
        'color.dark.accent.primary-hover' => ['alias_of' => 'color.primary.300'],
    ];

    // ─────────────────────────────────────────────────────────────────────────

    public function run(int $themeId = 0): void
    {
        if (!$themeId) {
            $theme = DsTheme::where('is_default', true)->first() ?? DsTheme::first();
            if (!$theme) {
                $theme = DsTheme::create(['name' => 'Default', 'slug' => 'default', 'is_default' => true, 'description' => 'Default design token theme']);
            }
            $themeId = $theme->id;
        }

        $sort = 0;
        $upsert = function (string $name, string $value, string $category, string $type = 'static', ?string $aliasOf = null) use ($themeId, &$sort) {
            DsToken::updateOrCreate(
                ['theme_id' => $themeId, 'name' => $name],
                ['value' => $value, 'category' => $category, 'type' => $type, 'alias_of' => $aliasOf, 'sort_order' => $sort++]
            );
        };

        // 1. Color palettes (raw)
        foreach ($this->palettes as $palette => $shades) {
            foreach ($shades as $shade => $hex) {
                $upsert("color.{$palette}.{$shade}", $hex, 'color');
            }
        }

        // 2. Semantic colors (light mode)
        foreach ($this->semanticLight as $name => $def) {
            if (isset($def['alias_of'])) {
                $upsert($name, $def['alias_of'], 'color', 'alias', $def['alias_of']);
            } else {
                $upsert($name, $def['value'], 'color', 'static');
            }
        }

        // 3. Dark mode semantics
        foreach ($this->semanticDark as $name => $def) {
            if (isset($def['alias_of'])) {
                $upsert($name, $def['alias_of'], 'color', 'alias', $def['alias_of']);
            } else {
                $upsert($name, $def['value'], 'color', 'static');
            }
        }

        // 4. Spacing
        foreach ($this->spacing as $key => $val) {
            $upsert("spacing.{$key}", $val, 'spacing');
        }

        // 5. Radii
        foreach ($this->radii as $key => $val) {
            $upsert("radius.{$key}", $val, 'radius');
        }

        // 6. Typography
        foreach ($this->fontSizes as $key => $val) {
            $upsert("font.size.{$key}", $val, 'font');
        }
        foreach ($this->fontWeights as $key => $val) {
            $upsert("font.weight.{$key}", $val, 'font');
        }
        foreach ($this->lineHeights as $key => $val) {
            $upsert("font.leading.{$key}", $val, 'font');
        }
        foreach ($this->letterSpacings as $key => $val) {
            $upsert("font.tracking.{$key}", $val, 'font');
        }
        $upsert('font.family.sans',  "'Inter', system-ui, -apple-system, sans-serif",                'font');
        $upsert('font.family.mono',  "SFMono-Regular, Menlo, Monaco, Consolas, monospace",           'font');

        // 7. Shadows / elevation
        foreach ($this->shadows as $level => $val) {
            $upsert("shadow.{$level}", $val, 'shadow');
        }

        // 8. Opacity
        foreach ($this->opacities as $key => $val) {
            $upsert("opacity.{$key}", $val, 'opacity');
        }

        // 9. Maintain backward-compat single tokens
        $upsert('color.primary',   $this->palettes['primary'][500],   'color');
        $upsert('color.secondary', $this->palettes['secondary'][500],  'color');
        $upsert('color.success',   $this->palettes['success'][500],    'color');
        $upsert('color.danger',    $this->palettes['danger'][500],     'color');
        $upsert('color.warning',   $this->palettes['warning'][500],    'color');
        $upsert('color.info',      $this->palettes['info'][500],       'color');
    }
}
