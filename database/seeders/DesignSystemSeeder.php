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
        $tokens = [
            // Colors
            ['category' => 'color', 'name' => 'color.primary',   'value' => '#3b82f6'],
            ['category' => 'color', 'name' => 'color.secondary', 'value' => '#6c757d'],
            ['category' => 'color', 'name' => 'color.success',   'value' => '#22c55e'],
            ['category' => 'color', 'name' => 'color.danger',    'value' => '#ef4444'],
            ['category' => 'color', 'name' => 'color.warning',   'value' => '#f59e0b'],
            ['category' => 'color', 'name' => 'color.info',      'value' => '#06b6d4'],
            ['category' => 'color', 'name' => 'color.light',     'value' => '#f8f9fa'],
            ['category' => 'color', 'name' => 'color.dark',      'value' => '#212529'],
            ['category' => 'color', 'name' => 'color.white',     'value' => '#ffffff'],
            ['category' => 'color', 'name' => 'color.black',     'value' => '#000000'],
            // Soft variants (low-opacity backgrounds)
            ['category' => 'color', 'name' => 'color.primary.soft',   'value' => 'rgba(59, 130, 246, 0.1)'],
            ['category' => 'color', 'name' => 'color.secondary.soft', 'value' => 'rgba(108, 117, 125, 0.1)'],
            ['category' => 'color', 'name' => 'color.success.soft',   'value' => 'rgba(34, 197, 94, 0.1)'],
            ['category' => 'color', 'name' => 'color.danger.soft',    'value' => 'rgba(239, 68, 68, 0.1)'],
            ['category' => 'color', 'name' => 'color.warning.soft',   'value' => 'rgba(245, 158, 11, 0.1)'],
            ['category' => 'color', 'name' => 'color.info.soft',      'value' => 'rgba(6, 182, 212, 0.1)'],
            // Gradient colors
            ['category' => 'color', 'name' => 'color.primary.gradient.from',   'value' => '#3b82f6'],
            ['category' => 'color', 'name' => 'color.primary.gradient.to',     'value' => '#8b5cf6'],
            ['category' => 'color', 'name' => 'color.secondary.gradient.from', 'value' => '#6c757d'],
            ['category' => 'color', 'name' => 'color.secondary.gradient.to',   'value' => '#adb5bd'],
            // Border Radius
            ['category' => 'radius', 'name' => 'radius.none',  'value' => '0px'],
            ['category' => 'radius', 'name' => 'radius.sm',    'value' => '4px'],
            ['category' => 'radius', 'name' => 'radius.md',    'value' => '6px'],
            ['category' => 'radius', 'name' => 'radius.lg',    'value' => '8px'],
            ['category' => 'radius', 'name' => 'radius.xl',    'value' => '12px'],
            ['category' => 'radius', 'name' => 'radius.full',  'value' => '9999px'],
            // Spacing (padding)
            ['category' => 'spacing', 'name' => 'spacing.btn.sm.x',   'value' => '0.5rem'],
            ['category' => 'spacing', 'name' => 'spacing.btn.sm.y',   'value' => '0.25rem'],
            ['category' => 'spacing', 'name' => 'spacing.btn.md.x',   'value' => '1rem'],
            ['category' => 'spacing', 'name' => 'spacing.btn.md.y',   'value' => '0.5rem'],
            ['category' => 'spacing', 'name' => 'spacing.btn.lg.x',   'value' => '1.5rem'],
            ['category' => 'spacing', 'name' => 'spacing.btn.lg.y',   'value' => '0.75rem'],
            // Font
            ['category' => 'font', 'name' => 'font.btn.sm',   'value' => '0.75rem'],
            ['category' => 'font', 'name' => 'font.btn.md',   'value' => '0.875rem'],
            ['category' => 'font', 'name' => 'font.btn.lg',   'value' => '1rem'],
            ['category' => 'font', 'name' => 'font.weight.medium', 'value' => '500'],
            ['category' => 'font', 'name' => 'font.weight.semibold', 'value' => '600'],
            // Shadows
            ['category' => 'shadow', 'name' => 'shadow.none', 'value' => 'none'],
            ['category' => 'shadow', 'name' => 'shadow.sm',   'value' => '0 1px 2px rgba(0,0,0,0.05)'],
            ['category' => 'shadow', 'name' => 'shadow.md',   'value' => '0 4px 6px -1px rgba(0,0,0,0.1)'],
            // Border
            ['category' => 'border', 'name' => 'border.width',    'value' => '1px'],
            ['category' => 'border', 'name' => 'border.style',    'value' => 'solid'],
            // Opacity
            ['category' => 'opacity', 'name' => 'opacity.disabled', 'value' => '0.65'],
        ];

        foreach ($tokens as $i => $t) {
            DsToken::firstOrCreate(
                ['theme_id' => $theme->id, 'name' => $t['name']],
                array_merge($t, ['sort_order' => $i])
            );
        }

        // ── Button Component ───────────────────────────────────────
        $btn = DsComponent::create([
            'name'        => 'Button',
            'slug'        => 'button',
            'type'        => 'button',
            'description' => 'Multi-variant button component',
            'base_props'  => ['tag' => 'button', 'type' => 'button'],
        ]);

        $colorVariants = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];
        $modifiers = [null, 'outline', 'soft', 'ghost', 'gradient', 'rounded', 'outline-rounded', 'soft-rounded', 'ghost-rounded', 'gradient-rounded'];
        $sizes = ['sm', 'md', 'lg'];

        foreach ($colorVariants as $variant) {
            // Default (solid) button
            $btn->variants()->create([
                'variant_name'   => $variant,
                'style_modifier' => null,
                'size'           => null,
                'token_mapping'  => [
                    'background-color' => "color.{$variant}",
                    'color'            => in_array($variant, ['light']) ? 'color.dark' : 'color.white',
                    'border-radius'    => 'radius.md',
                    'border-width'     => 'border.width',
                    'border-style'     => 'border.style',
                    'border-color'     => "color.{$variant}",
                    'box-shadow'       => 'shadow.sm',
                    'font-weight'      => 'font.weight.medium',
                ],
                'is_active' => true,
            ]);

            // Outline button
            $btn->variants()->create([
                'variant_name'   => $variant,
                'style_modifier' => 'outline',
                'token_mapping'  => [
                    'background-color' => 'color.white',
                    'color'            => "color.{$variant}",
                    'border-width'     => 'border.width',
                    'border-style'     => 'border.style',
                    'border-color'     => "color.{$variant}",
                    'border-radius'    => 'radius.md',
                ],
                'is_active' => true,
            ]);

            // Soft button
            $btn->variants()->create([
                'variant_name'   => $variant,
                'style_modifier' => 'soft',
                'token_mapping'  => [
                    'background-color' => "color.{$variant}.soft",
                    'color'            => "color.{$variant}",
                    'border-radius'    => 'radius.md',
                ],
                'is_active' => true,
            ]);

            // Ghost button
            $btn->variants()->create([
                'variant_name'   => $variant,
                'style_modifier' => 'ghost',
                'token_mapping'  => [
                    'background-color' => 'color.white',
                    'color'            => "color.{$variant}",
                    'border-radius'    => 'radius.md',
                ],
                'static_classes' => ['btn-ghost-hover'],
                'is_active' => true,
            ]);

            // Rounded (pill) button
            $btn->variants()->create([
                'variant_name'   => $variant,
                'style_modifier' => 'rounded',
                'token_mapping'  => [
                    'background-color' => "color.{$variant}",
                    'color'            => in_array($variant, ['light']) ? 'color.dark' : 'color.white',
                    'border-radius'    => 'radius.full',
                    'border-width'     => 'border.width',
                    'border-style'     => 'border.style',
                    'border-color'     => "color.{$variant}",
                ],
                'is_active' => true,
            ]);
        }

        // Sizes (applied as modifiers to the base button)
        foreach ($sizes as $size) {
            $btn->variants()->create([
                'variant_name'   => 'base',
                'style_modifier' => null,
                'size'           => $size,
                'token_mapping'  => [
                    'padding-left'   => "spacing.btn.{$size}.x",
                    'padding-right'  => "spacing.btn.{$size}.x",
                    'padding-top'    => "spacing.btn.{$size}.y",
                    'padding-bottom' => "spacing.btn.{$size}.y",
                    'font-size'      => "font.btn.{$size}",
                ],
                'is_active' => true,
            ]);
        }

        $this->command->info('Design System seeded: 1 theme, ' . count($tokens) . ' tokens, buttons seeded.');
    }
}
