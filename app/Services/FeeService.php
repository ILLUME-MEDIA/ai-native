<?php

namespace App\Services;

use App\Models\Business;
use App\Models\EcommerceSetting;

class FeeService
{
    // ── Platform Fee ─────────────────────────────────────────────────────────

    /**
     * Calculate the platform fee amount for a given subtotal and business.
     *
     * Resolution order:
     *  1. Business.platform_fee_override = none/percentage/fixed → use business value
     *  2. inherit → check linked Muzzhub.platform_fee_override (none/percentage/fixed)
     *  3. Muzzhub.platform_fee_override = inherit → check Muzzhub.adjust_platform_fee = false → 0
     *  4. Fall through → global ecommerce_settings
     *
     * Returns the fee amount (rounded to 2 dp).
     */
    public function calculatePlatformFee(float $subtotal, ?Business $business = null): float
    {
        $override = $business?->platform_fee_override ?? 'inherit';

        if ($override === 'none') {
            return 0.0;
        }

        if ($override === 'percentage') {
            $rate = (float) ($business->platform_fee_value ?? 0);
            return round($subtotal * ($rate / 100), 2);
        }

        if ($override === 'fixed') {
            return round((float) ($business->platform_fee_value ?? 0), 2);
        }

        // inherit — check linked Muzzhub overrides
        if ($business) {
            $muzzhub = $business->muzzhub;
            if ($muzzhub) {
                $mOverride = $muzzhub->platform_fee_override ?? 'inherit';

                if ($mOverride === 'none') return 0.0;

                if ($mOverride === 'percentage') {
                    $rate = (float) ($muzzhub->platform_fee_value ?? 0);
                    return round($subtotal * ($rate / 100), 2);
                }

                if ($mOverride === 'fixed') {
                    return round((float) ($muzzhub->platform_fee_value ?? 0), 2);
                }

                // muzzhub inherits → fall through to global
            }
        }

        // global settings
        return $this->calculateFromGlobal($subtotal);
    }

    /**
     * Calculate fee from global ecommerce settings.
     */
    private function calculateFromGlobal(float $subtotal): float
    {
        try {
            $type  = EcommerceSetting::get('platform_fee_type', 'percentage');
            $value = (float) EcommerceSetting::get('platform_fee_value', 0);
        } catch (\Throwable) {
            // ecommerce_settings table missing (migration not run) — return 0
            return 0.0;
        }

        if ($value <= 0) return 0.0;

        return $type === 'fixed'
            ? round($value, 2)
            : round($subtotal * ($value / 100), 2);
    }

    /**
     * Get the effective fee config for a business (for display in cart summary).
     */
    public function getFeeConfig(?Business $business = null): array
    {
        $override = $business?->platform_fee_override ?? 'inherit';

        if ($override === 'none') {
            return ['type' => 'none', 'value' => 0];
        }

        if (in_array($override, ['percentage', 'fixed'])) {
            return ['type' => $override, 'value' => (float) ($business->platform_fee_value ?? 0)];
        }

        // inherit — check linked Muzzhub overrides
        if ($business) {
            $muzzhub = $business->muzzhub;
            if ($muzzhub) {
                $mOverride = $muzzhub->platform_fee_override ?? 'inherit';

                if ($mOverride === 'none') {
                    return ['type' => 'none', 'value' => 0, 'source' => 'muzzhub'];
                }

                if (in_array($mOverride, ['percentage', 'fixed'])) {
                    return ['type' => $mOverride, 'value' => (float) ($muzzhub->platform_fee_value ?? 0), 'source' => 'muzzhub'];
                }

                // muzzhub inherits → fall through to global
            }
        }

        // global
        try {
            return [
                'type'   => EcommerceSetting::get('platform_fee_type', 'percentage'),
                'value'  => (float) EcommerceSetting::get('platform_fee_value', 0),
                'source' => 'global',
            ];
        } catch (\Throwable) {
            return ['type' => 'none', 'value' => 0, 'source' => 'global'];
        }
    }

    // ── Tip Options ──────────────────────────────────────────────────────────

    /**
     * Build tip options array based on global settings + subtotal.
     *
     * Each suggested percentage becomes a concrete $ amount.
     * Returns null if tips are disabled globally.
     *
     * Result shape:
     * [
     *   { "label": "10%", "type": "percentage", "percent": 10, "amount": 4.50 },
     *   { "label": "20%", "type": "percentage", "percent": 20, "amount": 9.00 },
     *   { "label": "30%", "type": "percentage", "percent": 30, "amount": 13.50 },
     *   { "label": "Custom", "type": "custom" }   // only if allow_custom = true
     * ]
     */
    public function getTipOptions(float $subtotal): ?array
    {
        try {
            $enabled = filter_var(EcommerceSetting::get('tip_enabled', true), FILTER_VALIDATE_BOOLEAN);
            if (! $enabled) return null;

            $suggested    = EcommerceSetting::get('tip_suggested_percentages', [10, 20, 30]);
            $allowCustom  = filter_var(EcommerceSetting::get('tip_allow_custom', true), FILTER_VALIDATE_BOOLEAN);
        } catch (\Throwable) {
            // ecommerce_settings table missing — return default tip options
            $suggested   = [10, 20, 30];
            $allowCustom = true;
        }

        if (! is_array($suggested)) $suggested = [10, 20, 30];

        $options = array_map(function ($pct) use ($subtotal) {
            $pct = (float) $pct;
            return [
                'label'   => (int) $pct . '%',
                'type'    => 'percentage',
                'percent' => $pct,
                'amount'  => round($subtotal * ($pct / 100), 2),
            ];
        }, $suggested);

        if ($allowCustom) {
            $options[] = ['label' => 'Custom', 'type' => 'custom'];
        }

        return $options;
    }

    /**
     * Resolve a tip value submitted by the client.
     *
     * Accepts:
     *   { "tip_type": "percentage", "tip_value": 20 }  → calculates from subtotal
     *   { "tip_type": "fixed",      "tip_value": 5.00 } → fixed amount
     *   { "tip_type": "none" }                          → 0
     *
     * Returns rounded tip amount.
     */
    public function resolveTip(float $subtotal, ?string $tipType, ?float $tipValue): float
    {
        if (! $tipType || $tipType === 'none') return 0.0;

        $enabled = filter_var(EcommerceSetting::get('tip_enabled', true), FILTER_VALIDATE_BOOLEAN);
        if (! $enabled) return 0.0;

        if ($tipType === 'percentage') {
            return round($subtotal * (($tipValue ?? 0) / 100), 2);
        }

        if ($tipType === 'fixed') {
            return round(max(0, (float) ($tipValue ?? 0)), 2);
        }

        return 0.0;
    }
}
