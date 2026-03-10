<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EcommerceSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET  /api/admin/ecommerce-settings          — all settings as key→value map
 * PUT  /api/admin/ecommerce-settings          — bulk update (pass key→value pairs)
 * GET  /api/admin/ecommerce-settings/{group}  — settings for a specific group
 */
class EcommerceSettingsController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = EcommerceSetting::orderBy('group')->orderBy('key')->get();
        return response()->json($settings);
    }

    public function byGroup(string $group): JsonResponse
    {
        $map = EcommerceSetting::group($group);
        return response()->json($map);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            // Platform fee global settings
            'platform_fee_type'          => 'sometimes|in:percentage,fixed',
            'platform_fee_value'         => 'sometimes|numeric|min:0',

            // Tip settings
            'tip_enabled'                => 'sometimes|boolean',
            'tip_suggested_percentages'  => 'sometimes|array|min:1|max:10',
            'tip_suggested_percentages.*'=> 'numeric|min:1|max:100',
            'tip_allow_custom'           => 'sometimes|boolean',
        ]);

        $meta = [
            'platform_fee_type'         => ['group' => 'fees',  'label' => 'Platform Fee Type',          'description' => 'percentage or fixed'],
            'platform_fee_value'        => ['group' => 'fees',  'label' => 'Platform Fee Value',         'description' => 'Percentage (e.g. 5) or fixed amount'],
            'tip_enabled'               => ['group' => 'tips',  'label' => 'Tips Enabled',               'description' => 'Show tip options at checkout'],
            'tip_suggested_percentages' => ['group' => 'tips',  'label' => 'Suggested Tip Percentages',  'description' => 'Array of suggested % values'],
            'tip_allow_custom'          => ['group' => 'tips',  'label' => 'Allow Custom Tip',           'description' => 'Allow customer to enter a custom tip'],
        ];

        $saved = [];
        foreach ($data as $key => $value) {
            $saved[$key] = EcommerceSetting::set($key, $value, $meta[$key] ?? []);
        }

        return response()->json([
            'message'  => 'Settings updated.',
            'settings' => EcommerceSetting::group('fees') + EcommerceSetting::group('tips'),
        ]);
    }
}
