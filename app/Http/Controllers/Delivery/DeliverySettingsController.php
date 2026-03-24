<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\DeliverySetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin: configure delivery platforms per business.
 * (UberEats credentials, Instacart, own delivery, DoorDash, etc.)
 */
class DeliverySettingsController extends Controller
{
    /**
     * Get all platform settings for a business.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate(['business_id' => 'required|exists:businesses,id']);

        $settings = DeliverySetting::where('business_id', $request->business_id)
            ->get()
            ->keyBy('platform');

        // Return placeholder for platforms not yet configured
        $platforms = ['own', 'doordash', 'ubereats', 'instacart', 'grubhub', 'skip'];
        $result = [];

        foreach ($platforms as $platform) {
            if (isset($settings[$platform])) {
                $s = $settings[$platform]->toArray();
                // Show masked credentials (only last 4 chars)
                if ($settings[$platform]->getApiKeyPlain()) {
                    $s['api_key_masked'] = '****' . substr($settings[$platform]->getApiKeyPlain(), -4);
                }
                $result[$platform] = $s;
            } else {
                $result[$platform] = [
                    'business_id' => (int)$request->business_id,
                    'platform'    => $platform,
                    'is_enabled'  => false,
                    'configured'  => false,
                ];
            }
        }

        return response()->json($result);
    }

    /**
     * Create or update a platform's settings.
     */
    public function upsert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id'                   => 'required|exists:businesses,id',
            'platform'                      => 'required|in:own,doordash,ubereats,instacart,grubhub,skip',
            'is_enabled'                    => 'boolean',
            'api_key'                       => 'nullable|string',
            'api_secret'                    => 'nullable|string',
            'webhook_secret'                => 'nullable|string',
            'store_id'                      => 'nullable|string|max:200',
            'location_id'                   => 'nullable|string|max:200',
            'access_token'                  => 'nullable|string',
            'settings'                      => 'nullable|array',
            'auto_assign_driver'            => 'boolean',
            'max_delivery_radius_km'        => 'nullable|integer|min:1|max:100',
            'driver_accept_timeout_minutes' => 'nullable|integer|min:1|max:60',
            'ubereats_store_id'             => 'nullable|string|max:200',
            'ubereats_menu_id'              => 'nullable|string|max:200',
            'instacart_retailer_id'         => 'nullable|string|max:200',
            'instacart_location_id'         => 'nullable|string|max:200',
        ]);

        $setting = DeliverySetting::updateOrCreate(
            ['business_id' => $data['business_id'], 'platform' => $data['platform']],
            $data
        );

        return response()->json([
            'message'  => "Settings for {$data['platform']} saved.",
            'setting'  => $setting,
        ]);
    }

    /**
     * Test connection / validate credentials for a platform.
     */
    public function testConnection(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id' => 'required|exists:businesses,id',
            'platform'    => 'required|in:own,doordash,ubereats,instacart,grubhub,skip',
        ]);

        $setting = DeliverySetting::where('business_id', $data['business_id'])
            ->where('platform', $data['platform'])
            ->first();

        if (!$setting) {
            return response()->json(['success' => false, 'message' => 'No settings configured for this platform.'], 404);
        }

        // Platform-specific connection test
        return match ($data['platform']) {
            'ubereats'  => $this->testUberEats($setting),
            'instacart' => $this->testInstacart($setting),
            'doordash'  => response()->json(['success' => true, 'message' => 'DoorDash uses DoorDash Drive API — check DoorDash controller.']),
            'own'       => response()->json(['success' => true, 'message' => 'Own delivery is always available.']),
            default     => response()->json(['success' => false, 'message' => 'Test not implemented for this platform.']),
        };
    }

    private function testUberEats(DeliverySetting $setting): JsonResponse
    {
        if (!$setting->getApiKeyPlain()) {
            return response()->json(['success' => false, 'message' => 'UberEats client_id not configured.'], 422);
        }
        // Real test would call UberEats API — for now just check config
        return response()->json([
            'success'    => true,
            'message'    => 'UberEats credentials appear configured. Use UberEats Merchant Portal to verify webhook endpoint.',
            'webhook_url'=> url('/api/webhooks/delivery/ubereats'),
        ]);
    }

    private function testInstacart(DeliverySetting $setting): JsonResponse
    {
        if (!$setting->getApiKeyPlain()) {
            return response()->json(['success' => false, 'message' => 'Instacart API key not configured.'], 422);
        }
        return response()->json([
            'success'    => true,
            'message'    => 'Instacart credentials appear configured.',
            'webhook_url'=> url('/api/webhooks/delivery/instacart'),
        ]);
    }
}
