<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\ShipEngineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ShipEngine Delivery Controller
 *
 * Creates shipping labels (USPS, UPS, FedEx, DHL) for orders
 * that need to be shipped by mail/courier rather than on-demand delivery.
 *
 * Routes:
 *   POST   /api/delivery/shipengine/dispatch/{order}   — create label
 *   GET    /api/delivery/shipengine/status/{order}     — get tracking info
 *   POST   /api/delivery/shipengine/void/{order}       — void label
 *   POST   /api/delivery/shipengine/rates/{order}      — get rate options
 *   GET    /api/delivery/shipengine/carriers            — list available carriers
 */
class ShipEngineDeliveryController extends Controller
{
    private ShipEngineService $se;

    public function __construct(ShipEngineService $se)
    {
        $this->se = $se;
    }

    // ── List carriers ─────────────────────────────────────────────────────────

    /** GET /api/delivery/shipengine/carriers */
    public function carriers(): JsonResponse
    {
        try {
            $result = $this->se->listCarriers();
            return response()->json(['success' => true, 'carriers' => $result['carriers'] ?? $result]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Rate options ──────────────────────────────────────────────────────────

    /**
     * POST /api/delivery/shipengine/rates/{order}
     * Returns available carrier+service options with pricing.
     */
    public function rates(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'weight_oz'        => 'nullable|numeric|min:0.1',
            'length_in'        => 'nullable|numeric|min:1',
            'width_in'         => 'nullable|numeric|min:1',
            'height_in'        => 'nullable|numeric|min:1',
            'carrier_ids'      => 'nullable|array',
            'carrier_ids.*'    => 'string',
        ]);

        $order->load('business');
        $business = $order->business;

        try {
            $payload = [
                'shipment' => [
                    'ship_to'   => $this->buildToAddress($order),
                    'ship_from' => $this->buildFromAddress($business),
                    'packages'  => [$this->buildPackage($data)],
                ],
                'rate_options' => [
                    'carrier_ids' => $data['carrier_ids'] ?? [],
                ],
            ];

            $result = $this->se->getRates($payload);

            $rates = collect($result['rate_response']['rates'] ?? $result['rates'] ?? [])
                ->sortBy('shipping_amount.amount')
                ->values();

            return response()->json([
                'success' => true,
                'rates'   => $rates,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Dispatch (create label) ───────────────────────────────────────────────

    /**
     * POST /api/delivery/shipengine/dispatch/{order}
     * Creates a shipping label and saves tracking info to the order.
     */
    public function dispatch(Request $request, Order $order): JsonResponse
    {
        if ($order->shipengine_label_id) {
            return response()->json(['success' => false, 'message' => 'Shipping label already created for this order.'], 422);
        }

        $data = $request->validate([
            'carrier_id'   => 'required|string',
            'service_code' => 'required|string',
            'weight_oz'    => 'nullable|numeric|min:0.1',
            'length_in'    => 'nullable|numeric|min:1',
            'width_in'     => 'nullable|numeric|min:1',
            'height_in'    => 'nullable|numeric|min:1',
        ]);

        $order->load(['business', 'items']);
        $business = $order->business;

        try {
            $payload = [
                'shipment' => [
                    'carrier_id'   => $data['carrier_id'],
                    'service_code' => $data['service_code'],
                    'ship_to'      => $this->buildToAddress($order),
                    'ship_from'    => $this->buildFromAddress($business),
                    'packages'     => [$this->buildPackage($data)],
                    'external_order_id' => $order->order_number,
                ],
            ];

            $label = $this->se->createLabel($payload);

            $trackingNumber = $label['tracking_number'] ?? null;
            $labelUrl       = $label['label_download']['pdf'] ?? $label['label_download']['href'] ?? null;
            $carrierCode    = $label['carrier_code'] ?? $data['carrier_id'];

            $order->update([
                'shipengine_label_id'        => $label['label_id'] ?? null,
                'shipengine_tracking_number' => $trackingNumber,
                'shipengine_carrier_code'    => $carrierCode,
                'shipengine_label_url'       => $labelUrl,
                'delivery_vendor'            => 'shipengine',
                'tracking_url'               => $this->buildTrackingUrl($carrierCode, $trackingNumber),
            ]);

            return response()->json([
                'success'          => true,
                'message'          => 'Shipping label created.',
                'label_id'         => $label['label_id'] ?? null,
                'tracking_number'  => $trackingNumber,
                'carrier_code'     => $carrierCode,
                'label_url'        => $labelUrl,
                'tracking_url'     => $order->fresh()->tracking_url,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Status / tracking ─────────────────────────────────────────────────────

    /** GET /api/delivery/shipengine/status/{order} */
    public function status(Order $order): JsonResponse
    {
        if (!$order->shipengine_tracking_number || !$order->shipengine_carrier_code) {
            return response()->json(['success' => false, 'message' => 'No shipment tracking info for this order.'], 404);
        }

        try {
            $result = $this->se->trackByNumber($order->shipengine_carrier_code, $order->shipengine_tracking_number);

            $status      = $result['status_code'] ?? 'unknown';
            $description = $result['status_description'] ?? ucfirst($status);

            return response()->json([
                'success'      => true,
                'status'       => $status,
                'status_label' => $description,
                'carrier_code' => $order->shipengine_carrier_code,
                'tracking_number' => $order->shipengine_tracking_number,
                'events'       => $result['events'] ?? [],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Void label ────────────────────────────────────────────────────────────

    /** POST /api/delivery/shipengine/void/{order} */
    public function void(Order $order): JsonResponse
    {
        if (!$order->shipengine_label_id) {
            return response()->json(['success' => false, 'message' => 'No label to void for this order.'], 404);
        }

        try {
            $result = $this->se->voidLabel($order->shipengine_label_id);

            if ($result['approved'] ?? false) {
                $order->update(['shipengine_label_id' => null, 'shipengine_tracking_number' => null]);
            }

            return response()->json([
                'success'  => $result['approved'] ?? false,
                'approved' => $result['approved'] ?? false,
                'message'  => $result['message'] ?? 'Label void request submitted.',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Address builders ──────────────────────────────────────────────────────

    private function buildFromAddress($business): array
    {
        return array_filter([
            'name'          => $business->name ?? 'Store',
            'phone'         => $business->phone ?? null,
            'address_line1' => trim(($business->address ?? '') . ' ' . ($business->address_2 ?? '')),
            'city_locality' => $business->city  ?? '',
            'state_province'=> $business->state ?? '',
            'postal_code'   => $business->zip   ?? '',
            'country_code'  => 'US',
        ], fn($v) => $v !== null && $v !== '');
    }

    private function buildToAddress(Order $order): array
    {
        // Parse "Street, City, State, ZIP" delivery address
        $parts = array_map('trim', explode(',', $order->delivery_address ?? ''));

        return array_filter([
            'name'           => $order->customer_name ?? 'Customer',
            'phone'          => $order->customer_phone ?? null,
            'address_line1'  => $parts[0] ?? $order->delivery_address ?? '',
            'city_locality'  => $parts[1] ?? '',
            'state_province' => isset($parts[2]) ? preg_replace('/\s+\d.*/', '', trim($parts[2])) : '',
            'postal_code'    => isset($parts[3]) ? trim($parts[3]) : (isset($parts[2]) ? preg_replace('/.*\s+/', '', trim($parts[2])) : ''),
            'country_code'   => 'US',
        ], fn($v) => $v !== null && $v !== '');
    }

    private function buildPackage(array $data): array
    {
        return [
            'weight' => [
                'value' => (float) ($data['weight_oz'] ?? 16),
                'unit'  => 'ounce',
            ],
            'dimensions' => [
                'length' => (float) ($data['length_in'] ?? 10),
                'width'  => (float) ($data['width_in']  ?? 8),
                'height' => (float) ($data['height_in'] ?? 4),
                'unit'   => 'inch',
            ],
        ];
    }

    private function buildTrackingUrl(string $carrierCode, ?string $trackingNumber): ?string
    {
        if (!$trackingNumber) return null;

        return match (strtolower($carrierCode)) {
            'stamps_com', 'usps'  => "https://tools.usps.com/go/TrackConfirmAction?tLabels={$trackingNumber}",
            'ups'                  => "https://www.ups.com/track?tracknum={$trackingNumber}",
            'fedex'                => "https://www.fedex.com/fedextrack/?trknbr={$trackingNumber}",
            'dhl_express', 'dhl'  => "https://www.dhl.com/en/express/tracking.html?AWB={$trackingNumber}",
            default               => null,
        };
    }
}
