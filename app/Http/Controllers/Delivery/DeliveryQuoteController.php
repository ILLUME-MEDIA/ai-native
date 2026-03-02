<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\DeliverySetting;
use App\Models\DeliveryZone;
use App\Services\DoorDashService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Unified Delivery Quote API.
 *
 * POST /api/delivery/quote
 * Accepts `vendor` param and routes to the correct provider.
 *
 * Supported vendors: doordash | ubereats | instacart | own
 */
class DeliveryQuoteController extends Controller
{
    /**
     * POST /api/delivery/quote
     *
     * Body:
     * {
     *   "vendor"           : "doordash",       // required: doordash|ubereats|instacart|own
     *   "pickup_address"   : "123 Main St...", // required for doordash
     *   "dropoff_address"  : "456 Oak Ave...", // required for doordash
     *   "order_value"      : 35.50,            // optional, dollars
     *   "business_id"      : 1,                // required for ubereats/instacart/own
     *   "lat"              : 33.7294,          // optional, customer lat for zone check
     *   "lng"              : -117.7694,        // optional, customer lng for zone check
     * }
     *
     * Response (normalized across all vendors):
     * {
     *   "success"           : true,
     *   "vendor"            : "doordash",
     *   "fee"               : 5.99,            // dollars
     *   "fee_cents"         : 599,
     *   "currency"          : "USD",
     *   "estimated_minutes" : 35,
     *   "min_order_amount"  : 0,
     *   "expires_at"        : null,
     *   "quote_id"          : null,
     *   "zone"              : null,            // populated for own/zone-based vendors
     *   "raw"               : {...}            // raw vendor response (doordash only)
     * }
     */
    public function quote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'vendor'          => 'required|string|in:doordash,ubereats,instacart,own',
            'pickup_address'  => 'nullable|string',
            'dropoff_address' => 'nullable|string',
            'order_value'     => 'nullable|numeric|min:0',
            'business_id'     => 'nullable|integer|exists:businesses,id',
            'lat'             => 'nullable|numeric',
            'lng'             => 'nullable|numeric',
            'customer_phone'  => 'nullable|string|max:30',
        ]);

        return match ($data['vendor']) {
            'doordash'  => $this->quoteDoorDash($data),
            'ubereats'  => $this->quoteUberEats($data),
            'instacart' => $this->quoteInstacart($data),
            'own'       => $this->quoteOwnDelivery($data),
        };
    }

    // ── DoorDash Quote ────────────────────────────────────────────────────────

    private function quoteDoorDash(array $data): JsonResponse
    {
        if (empty($data['pickup_address']) || empty($data['dropoff_address'])) {
            return response()->json([
                'success' => false,
                'vendor'  => 'doordash',
                'message' => 'pickup_address and dropoff_address are required for DoorDash quotes.',
            ], 422);
        }

        try {
            $doorDash = app(DoorDashService::class);

            // Use business phone for pickup; customer_phone (if provided) for dropoff
            $business    = !empty($data['business_id']) ? Business::find($data['business_id']) : null;
            $pickupPhone = $business?->phone ?? null;
            $dropoffPhone = $data['customer_phone'] ?? null;

            $raw = $doorDash->getQuote(
                $data['pickup_address'],
                $data['dropoff_address'],
                (int) round(($data['order_value'] ?? 0) * 100),
                $pickupPhone,
                $dropoffPhone
            );
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'vendor'  => 'doordash',
                'message' => $e->getMessage(),
            ], 502);
        }

        $feeCents = $raw['fee'] ?? $raw['delivery_fee'] ?? null;
        $taxCents = $raw['tax'] ?? null;

        return response()->json([
            'success'           => true,
            'vendor'            => 'doordash',
            'fee'               => $feeCents !== null ? round($feeCents / 100, 2) : null,
            'fee_cents'         => $feeCents,
            'tax'               => $taxCents !== null ? round($taxCents / 100, 2) : null,
            'tax_cents'         => $taxCents,
            'currency'          => $raw['currency'] ?? 'USD',
            'estimated_minutes' => $this->parseDoorDashEta($raw),
            'pickup_time'       => $raw['pickup_time'] ?? null,
            'delivery_time'     => $raw['delivery_time'] ?? $raw['estimated_delivery_time'] ?? null,
            'min_order_amount'  => 0,
            'expires_at'        => $raw['expires_at'] ?? null,
            'quote_id'          => isset($raw['id']) ? (string)$raw['id'] : ($raw['external_delivery_id'] ?? null),
            'zone'              => null,
            'raw'               => $raw,
        ]);
    }

    private function parseDoorDashEta(array $raw): ?int
    {
        // v1/estimates returns delivery_time (ISO string)
        foreach (['delivery_time', 'estimated_delivery_time'] as $field) {
            if (!empty($raw[$field])) {
                try {
                    $eta = \Carbon\Carbon::parse($raw[$field]);
                    return max(1, (int) now()->diffInMinutes($eta));
                } catch (\Throwable) {}
            }
        }
        return null;
    }

    // ── UberEats Quote ────────────────────────────────────────────────────────
    // UberEats does NOT offer a public delivery fee quote API for third-party
    // merchants. Delivery fee is handled by UberEats at checkout on their side.
    // We estimate based on configured delivery settings or delivery zones.

    private function quoteUberEats(array $data): JsonResponse
    {
        if (empty($data['business_id'])) {
            return response()->json([
                'success' => false,
                'vendor'  => 'ubereats',
                'message' => 'business_id is required for UberEats quotes.',
            ], 422);
        }

        // Check if business has UberEats enabled
        $setting = DeliverySetting::where('business_id', $data['business_id'])
            ->where('platform', 'ubereats')
            ->where('is_enabled', true)
            ->first();

        if (!$setting) {
            return response()->json([
                'success' => false,
                'vendor'  => 'ubereats',
                'message' => 'UberEats is not enabled for this business.',
            ], 422);
        }

        // Try to match a delivery zone if lat/lng provided
        $zone = null;
        if (!empty($data['lat']) && !empty($data['lng'])) {
            $zone = $this->matchDeliveryZone((int)$data['business_id'], (float)$data['lat'], (float)$data['lng']);
        }

        // UberEats manages the actual delivery fee — for our system we return the
        // configured zone fee as an estimate (the final fee will be shown on UberEats)
        $fee = $zone ? $zone->delivery_fee : ($setting->settings['default_delivery_fee'] ?? 0);

        return response()->json([
            'success'           => true,
            'vendor'            => 'ubereats',
            'fee'               => (float)$fee,
            'fee_cents'         => (int)round($fee * 100),
            'currency'          => 'USD',
            'estimated_minutes' => $zone?->estimated_minutes ?? 30,
            'min_order_amount'  => $zone?->min_order_amount ?? 0,
            'expires_at'        => null,
            'quote_id'          => null,
            'zone'              => $zone ? ['id' => $zone->id, 'name' => $zone->name] : null,
            'note'              => 'UberEats manages actual delivery fees at checkout. This is an estimated fee.',
            'raw'               => null,
        ]);
    }

    // ── Instacart Quote ───────────────────────────────────────────────────────
    // Instacart also manages delivery fees internally. We estimate similarly.

    private function quoteInstacart(array $data): JsonResponse
    {
        if (empty($data['business_id'])) {
            return response()->json([
                'success' => false,
                'vendor'  => 'instacart',
                'message' => 'business_id is required for Instacart quotes.',
            ], 422);
        }

        $setting = DeliverySetting::where('business_id', $data['business_id'])
            ->where('platform', 'instacart')
            ->where('is_enabled', true)
            ->first();

        if (!$setting) {
            return response()->json([
                'success' => false,
                'vendor'  => 'instacart',
                'message' => 'Instacart is not enabled for this business.',
            ], 422);
        }

        $zone = null;
        if (!empty($data['lat']) && !empty($data['lng'])) {
            $zone = $this->matchDeliveryZone((int)$data['business_id'], (float)$data['lat'], (float)$data['lng']);
        }

        $fee = $zone ? $zone->delivery_fee : ($setting->settings['default_delivery_fee'] ?? 0);

        return response()->json([
            'success'           => true,
            'vendor'            => 'instacart',
            'fee'               => (float)$fee,
            'fee_cents'         => (int)round($fee * 100),
            'currency'          => 'USD',
            'estimated_minutes' => $zone?->estimated_minutes ?? 45,
            'min_order_amount'  => $zone?->min_order_amount ?? 10,
            'expires_at'        => null,
            'quote_id'          => null,
            'zone'              => $zone ? ['id' => $zone->id, 'name' => $zone->name] : null,
            'note'              => 'Instacart manages actual delivery fees. This is an estimated fee based on your configured zones.',
            'raw'               => null,
        ]);
    }

    // ── Own Delivery Quote ────────────────────────────────────────────────────

    private function quoteOwnDelivery(array $data): JsonResponse
    {
        if (empty($data['business_id'])) {
            return response()->json([
                'success' => false,
                'vendor'  => 'own',
                'message' => 'business_id is required for own delivery quotes.',
            ], 422);
        }

        $zone = null;
        if (!empty($data['lat']) && !empty($data['lng'])) {
            $zone = $this->matchDeliveryZone((int)$data['business_id'], (float)$data['lat'], (float)$data['lng']);
        }

        if (!$zone) {
            return response()->json([
                'success' => false,
                'vendor'  => 'own',
                'message' => 'No delivery zone covers this location.',
                'in_zone' => false,
            ], 200);
        }

        // Check min order
        $orderValue = (float)($data['order_value'] ?? 0);
        if ($zone->min_order_amount > 0 && $orderValue < $zone->min_order_amount) {
            return response()->json([
                'success'          => false,
                'vendor'           => 'own',
                'message'          => "Minimum order amount is \${$zone->min_order_amount} for delivery to this area.",
                'min_order_amount' => $zone->min_order_amount,
                'in_zone'          => true,
            ], 200);
        }

        return response()->json([
            'success'           => true,
            'vendor'            => 'own',
            'fee'               => $zone->delivery_fee,
            'fee_cents'         => (int)round($zone->delivery_fee * 100),
            'currency'          => 'USD',
            'estimated_minutes' => $zone->estimated_minutes,
            'min_order_amount'  => $zone->min_order_amount,
            'expires_at'        => null,
            'quote_id'          => null,
            'in_zone'           => true,
            'zone'              => [
                'id'          => $zone->id,
                'name'        => $zone->name,
                'description' => $zone->description,
            ],
            'raw'               => null,
        ]);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private function matchDeliveryZone(int $businessId, float $lat, float $lng): ?DeliveryZone
    {
        $zones = DeliveryZone::where('business_id', $businessId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        foreach ($zones as $zone) {
            if ($zone->containsPoint($lat, $lng)) {
                return $zone;
            }
        }

        return null;
    }
}
