<?php

namespace Database\Seeders;

use App\Models\DesignSystem\DsComponent;
use App\Models\DesignSystem\DsTheme;
use App\Models\DesignSystem\DsToken;
use Illuminate\Database\Seeder;

class DesignSystemSeeder extends Seeder
{
    public function run(): void
    {
        // ── Default Theme ──────────────────────────────────────────
        $theme = DsTheme::firstOrCreate(
            ['slug' => 'default'],
            ['name' => 'Default', 'is_default' => true, 'description' => 'Default design system theme']
        );

        // ── Tokens ────────────────────────────────────────────────
        $tokens = [];

        // ── Semantic colors ───────────────────────────────────────
        foreach ([
            'primary'   => '#3b82f6',
            'secondary' => '#6c757d',
            'success'   => '#22c55e',
            'danger'    => '#ef4444',
            'warning'   => '#f59e0b',
            'info'      => '#06b6d4',
            'light'     => '#f8f9fa',
            'dark'      => '#212529',
            'white'     => '#ffffff',
            'black'     => '#000000',
        ] as $name => $value) {
            $tokens[] = ['category' => 'color', 'name' => "color.{$name}", 'value' => $value];
        }

        // ── Soft / gradient variants ───────────────────────────────
        foreach ([
            'primary'   => [59, 130, 246],
            'secondary' => [108, 117, 125],
            'success'   => [34, 197, 94],
            'danger'    => [239, 68, 68],
            'warning'   => [245, 158, 11],
            'info'      => [6, 182, 212],
        ] as $name => [$r, $g, $b]) {
            $tokens[] = ['category' => 'color', 'name' => "color.{$name}.soft", 'value' => "rgba({$r},{$g},{$b},0.1)"];
        }

        // Gradient pairs
        foreach ([
            'primary'   => ['#3b82f6', '#8b5cf6'],
            'secondary' => ['#6c757d', '#adb5bd'],
            'success'   => ['#22c55e', '#16a34a'],
            'danger'    => ['#ef4444', '#dc2626'],
            'warning'   => ['#f59e0b', '#d97706'],
            'info'      => ['#06b6d4', '#0284c7'],
        ] as $name => [$from, $to]) {
            $tokens[] = ['category' => 'color', 'name' => "color.{$name}.gradient.from", 'value' => $from];
            $tokens[] = ['category' => 'color', 'name' => "color.{$name}.gradient.to",   'value' => $to];
        }

        // ── Color palettes (Tailwind-scale) ───────────────────────
        $palettes = [
            'gray'   => ['50'=>'#f9fafb','100'=>'#f3f4f6','200'=>'#e5e7eb','300'=>'#d1d5db','400'=>'#9ca3af','500'=>'#6b7280','600'=>'#4b5563','700'=>'#374151','800'=>'#1f2937','900'=>'#111827'],
            'red'    => ['50'=>'#fef2f2','100'=>'#fee2e2','200'=>'#fecaca','300'=>'#fca5a5','400'=>'#f87171','500'=>'#ef4444','600'=>'#dc2626','700'=>'#b91c1c','800'=>'#991b1b','900'=>'#7f1d1d'],
            'orange' => ['50'=>'#fff7ed','100'=>'#ffedd5','200'=>'#fed7aa','300'=>'#fdba74','400'=>'#fb923c','500'=>'#f97316','600'=>'#ea580c','700'=>'#c2410c','800'=>'#9a3412','900'=>'#7c2d12'],
            'yellow' => ['50'=>'#fefce8','100'=>'#fef9c3','200'=>'#fef08a','300'=>'#fde047','400'=>'#facc15','500'=>'#eab308','600'=>'#ca8a04','700'=>'#a16207','800'=>'#854d0e','900'=>'#713f12'],
            'green'  => ['50'=>'#f0fdf4','100'=>'#dcfce7','200'=>'#bbf7d0','300'=>'#86efac','400'=>'#4ade80','500'=>'#22c55e','600'=>'#16a34a','700'=>'#15803d','800'=>'#166534','900'=>'#14532d'],
            'teal'   => ['50'=>'#f0fdfa','100'=>'#ccfbf1','200'=>'#99f6e4','300'=>'#5eead4','400'=>'#2dd4bf','500'=>'#14b8a6','600'=>'#0d9488','700'=>'#0f766e','800'=>'#115e59','900'=>'#134e4a'],
            'cyan'   => ['50'=>'#ecfeff','100'=>'#cffafe','200'=>'#a5f3fc','300'=>'#67e8f9','400'=>'#22d3ee','500'=>'#06b6d4','600'=>'#0891b2','700'=>'#0e7490','800'=>'#155e75','900'=>'#164e63'],
            'blue'   => ['50'=>'#eff6ff','100'=>'#dbeafe','200'=>'#bfdbfe','300'=>'#93c5fd','400'=>'#60a5fa','500'=>'#3b82f6','600'=>'#2563eb','700'=>'#1d4ed8','800'=>'#1e40af','900'=>'#1e3a8a'],
            'indigo' => ['50'=>'#eef2ff','100'=>'#e0e7ff','200'=>'#c7d2fe','300'=>'#a5b4fc','400'=>'#818cf8','500'=>'#6366f1','600'=>'#4f46e5','700'=>'#4338ca','800'=>'#3730a3','900'=>'#312e81'],
            'violet' => ['50'=>'#f5f3ff','100'=>'#ede9fe','200'=>'#ddd6fe','300'=>'#c4b5fd','400'=>'#a78bfa','500'=>'#8b5cf6','600'=>'#7c3aed','700'=>'#6d28d9','800'=>'#5b21b6','900'=>'#4c1d95'],
            'purple' => ['50'=>'#faf5ff','100'=>'#f3e8ff','200'=>'#e9d5ff','300'=>'#d8b4fe','400'=>'#c084fc','500'=>'#a855f7','600'=>'#9333ea','700'=>'#7e22ce','800'=>'#6b21a8','900'=>'#581c87'],
            'pink'   => ['50'=>'#fdf2f8','100'=>'#fce7f3','200'=>'#fbcfe8','300'=>'#f9a8d4','400'=>'#f472b6','500'=>'#ec4899','600'=>'#db2777','700'=>'#be185d','800'=>'#9d174d','900'=>'#831843'],
            'rose'   => ['50'=>'#fff1f2','100'=>'#ffe4e6','200'=>'#fecdd3','300'=>'#fda4af','400'=>'#fb7185','500'=>'#f43f5e','600'=>'#e11d48','700'=>'#be123c','800'=>'#9f1239','900'=>'#881337'],
        ];

        foreach ($palettes as $colorName => $shades) {
            foreach ($shades as $shade => $value) {
                $tokens[] = ['category' => 'color', 'name' => "color.{$colorName}.{$shade}", 'value' => $value];
            }
        }

        // ── Typography — Font Family ───────────────────────────────
        foreach ([
            'font.family.sans'  => 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            'font.family.serif' => 'Georgia, Cambria, "Times New Roman", Times, serif',
            'font.family.mono'  => '"Fira Code", "Cascadia Code", Consolas, "Courier New", monospace',
        ] as $name => $value) {
            $tokens[] = ['category' => 'font', 'name' => $name, 'value' => $value];
        }

        // Font sizes
        foreach ([
            'font.size.xs'   => '0.75rem',
            'font.size.sm'   => '0.875rem',
            'font.size.base' => '1rem',
            'font.size.lg'   => '1.125rem',
            'font.size.xl'   => '1.25rem',
            'font.size.2xl'  => '1.5rem',
            'font.size.3xl'  => '1.875rem',
            'font.size.4xl'  => '2.25rem',
            'font.size.5xl'  => '3rem',
            'font.size.6xl'  => '3.75rem',
        ] as $name => $value) {
            $tokens[] = ['category' => 'font', 'name' => $name, 'value' => $value];
        }

        // Font weights
        foreach ([
            'font.weight.thin'      => '100',
            'font.weight.light'     => '300',
            'font.weight.normal'    => '400',
            'font.weight.medium'    => '500',
            'font.weight.semibold'  => '600',
            'font.weight.bold'      => '700',
            'font.weight.extrabold' => '800',
            'font.weight.black'     => '900',
        ] as $name => $value) {
            $tokens[] = ['category' => 'font', 'name' => $name, 'value' => $value];
        }

        // Line heights
        foreach ([
            'font.line-height.none'    => '1',
            'font.line-height.tight'   => '1.25',
            'font.line-height.snug'    => '1.375',
            'font.line-height.normal'  => '1.5',
            'font.line-height.relaxed' => '1.625',
            'font.line-height.loose'   => '2',
        ] as $name => $value) {
            $tokens[] = ['category' => 'font', 'name' => $name, 'value' => $value];
        }

        // Letter spacing
        foreach ([
            'font.letter-spacing.tighter' => '-0.05em',
            'font.letter-spacing.tight'   => '-0.025em',
            'font.letter-spacing.normal'  => '0em',
            'font.letter-spacing.wide'    => '0.025em',
            'font.letter-spacing.wider'   => '0.05em',
            'font.letter-spacing.widest'  => '0.1em',
        ] as $name => $value) {
            $tokens[] = ['category' => 'font', 'name' => $name, 'value' => $value];
        }

        // Button-specific font tokens
        foreach ([
            'font.btn.sm'  => '0.75rem',
            'font.btn.md'  => '0.875rem',
            'font.btn.lg'  => '1rem',
        ] as $name => $value) {
            $tokens[] = ['category' => 'font', 'name' => $name, 'value' => $value];
        }

        // ── Border Radius ─────────────────────────────────────────
        foreach ([
            'radius.none' => '0px',
            'radius.xs'   => '2px',
            'radius.sm'   => '4px',
            'radius.md'   => '6px',
            'radius.lg'   => '8px',
            'radius.xl'   => '12px',
            'radius.2xl'  => '16px',
            'radius.3xl'  => '24px',
            'radius.full' => '9999px',
        ] as $name => $value) {
            $tokens[] = ['category' => 'radius', 'name' => $name, 'value' => $value];
        }

        // ── Spacing ───────────────────────────────────────────────
        foreach ([
            'spacing.0'  => '0px',
            'spacing.1'  => '0.25rem',
            'spacing.2'  => '0.5rem',
            'spacing.3'  => '0.75rem',
            'spacing.4'  => '1rem',
            'spacing.5'  => '1.25rem',
            'spacing.6'  => '1.5rem',
            'spacing.7'  => '1.75rem',
            'spacing.8'  => '2rem',
            'spacing.10' => '2.5rem',
            'spacing.12' => '3rem',
            'spacing.16' => '4rem',
            'spacing.20' => '5rem',
            'spacing.24' => '6rem',
            'spacing.32' => '8rem',
            'spacing.40' => '10rem',
            'spacing.48' => '12rem',
            'spacing.64' => '16rem',
            // Button spacing
            'spacing.btn.sm.x' => '0.5rem',
            'spacing.btn.sm.y' => '0.25rem',
            'spacing.btn.md.x' => '1rem',
            'spacing.btn.md.y' => '0.5rem',
            'spacing.btn.lg.x' => '1.5rem',
            'spacing.btn.lg.y' => '0.75rem',
        ] as $name => $value) {
            $tokens[] = ['category' => 'spacing', 'name' => $name, 'value' => $value];
        }

        // ── Shadows ───────────────────────────────────────────────
        foreach ([
            'shadow.none'  => 'none',
            'shadow.xs'    => '0 1px 2px rgba(0,0,0,0.04)',
            'shadow.sm'    => '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
            'shadow.md'    => '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
            'shadow.lg'    => '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
            'shadow.xl'    => '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            'shadow.2xl'   => '0 25px 50px -12px rgba(0,0,0,0.25)',
            'shadow.inner' => 'inset 0 2px 4px 0 rgba(0,0,0,0.06)',
            'shadow.card'  => '0 2px 8px rgba(0,0,0,0.08)',
        ] as $name => $value) {
            $tokens[] = ['category' => 'shadow', 'name' => $name, 'value' => $value];
        }

        // ── Border ────────────────────────────────────────────────
        foreach ([
            'border.width'       => '1px',
            'border.width.0'     => '0px',
            'border.width.2'     => '2px',
            'border.width.4'     => '4px',
            'border.style'       => 'solid',
            'border.color'       => '#dee2e6',
            'border.color.light' => '#f1f3f5',
            'border.color.dark'  => '#adb5bd',
        ] as $name => $value) {
            $tokens[] = ['category' => 'border', 'name' => $name, 'value' => $value];
        }

        // ── Opacity ───────────────────────────────────────────────
        foreach ([
            'opacity.0'        => '0',
            'opacity.25'       => '0.25',
            'opacity.50'       => '0.5',
            'opacity.75'       => '0.75',
            'opacity.100'      => '1',
            'opacity.disabled' => '0.65',
        ] as $name => $value) {
            $tokens[] = ['category' => 'opacity', 'name' => $name, 'value' => $value];
        }

        // ── Animation ─────────────────────────────────────────────
        foreach ([
            'animation.duration.fastest'  => '75ms',
            'animation.duration.fast'     => '150ms',
            'animation.duration.base'     => '200ms',
            'animation.duration.slow'     => '300ms',
            'animation.duration.slower'   => '500ms',
            'animation.duration.slowest'  => '700ms',
            'animation.timing.linear'     => 'linear',
            'animation.timing.ease'       => 'ease',
            'animation.timing.ease-in'    => 'ease-in',
            'animation.timing.ease-out'   => 'ease-out',
            'animation.timing.ease-in-out'=> 'ease-in-out',
            'animation.timing.bounce'     => 'cubic-bezier(0.68,-0.55,0.265,1.55)',
            'animation.timing.smooth'     => 'cubic-bezier(0.4,0,0.2,1)',
        ] as $name => $value) {
            $tokens[] = ['category' => 'animation', 'name' => $name, 'value' => $value];
        }

        // ── Insert / skip duplicates ───────────────────────────────
        foreach ($tokens as $i => $t) {
            DsToken::firstOrCreate(
                ['theme_id' => $theme->id, 'name' => $t['name']],
                array_merge($t, ['sort_order' => $i])
            );
        }

        // ── Button Component ───────────────────────────────────────
        if (!DsComponent::where('slug', 'button')->exists()) {
            $btn = DsComponent::create([
                'name'        => 'Button',
                'slug'        => 'button',
                'type'        => 'button',
                'description' => 'Multi-variant button component',
                'base_props'  => ['tag' => 'button', 'type' => 'button'],
            ]);

            $colorVariants = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];
            $sizes = ['sm', 'md', 'lg'];

            foreach ($colorVariants as $variant) {
                $btn->variants()->create(['variant_name' => $variant, 'style_modifier' => null, 'size' => null,
                    'token_mapping' => ['background-color' => "color.{$variant}", 'color' => in_array($variant, ['light']) ? 'color.dark' : 'color.white', 'border-radius' => 'radius.md', 'border-width' => 'border.width', 'border-style' => 'border.style', 'border-color' => "color.{$variant}", 'box-shadow' => 'shadow.sm', 'font-weight' => 'font.weight.medium'], 'is_active' => true]);

                $btn->variants()->create(['variant_name' => $variant, 'style_modifier' => 'outline',
                    'token_mapping' => ['background-color' => 'color.white', 'color' => "color.{$variant}", 'border-width' => 'border.width', 'border-style' => 'border.style', 'border-color' => "color.{$variant}", 'border-radius' => 'radius.md'], 'is_active' => true]);

                $btn->variants()->create(['variant_name' => $variant, 'style_modifier' => 'soft',
                    'token_mapping' => ['background-color' => "color.{$variant}.soft", 'color' => "color.{$variant}", 'border-radius' => 'radius.md'], 'is_active' => true]);
            }

            foreach ($sizes as $size) {
                $btn->variants()->create(['variant_name' => 'base', 'style_modifier' => null, 'size' => $size,
                    'token_mapping' => ['padding-left' => "spacing.btn.{$size}.x", 'padding-right' => "spacing.btn.{$size}.x", 'padding-top' => "spacing.btn.{$size}.y", 'padding-bottom' => "spacing.btn.{$size}.y", 'font-size' => "font.btn.{$size}"], 'is_active' => true]);
            }
        }

        $tokenCount = count($tokens);
        $this->command->info("Design System seeded: 1 theme, {$tokenCount} tokens.");
    }
}
