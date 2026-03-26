<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\Muzzhub;
use App\Models\Order;
use App\Services\UberDirectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Uber Direct (Delivery as a Service) Integration.
 *
 * Docs: https://developer.uber.com/docs/deliveries/get-started
 *
 * Routes:
 *   GET  /api/delivery/uber-direct/config
 *   POST /api/delivery/uber-direct/quote
 *   POST /api/delivery/uber-direct/dispatch/{order}
 *   GET  /api/delivery/uber-direct/status/{order}
 *   GET  /api/delivery/uber-direct/deliveries
 *   POST /api/delivery/uber-direct/update/{order}
 *   POST /api/delivery/uber-direct/cancel/{order}
 *   POST /api/delivery/uber-direct/proof/{order}
 *   POST /api/delivery/uber-direct/stores
 *   POST /api/webhooks/delivery/uber-direct   ← no auth
 *
 * Courier Pick & Pack (CPP):
 *   POST /api/delivery/uber-direct/cpp/quote
 *   POST /api/delivery/uber-direct/cpp/dispatch/{order}
 */
class UberDirectController extends Controller
{
    public function __construct(private UberDirectService $uber) {}

    // ── Config / Setup ────────────────────────────────────────────────────────

    /**
     * GET /api/delivery/uber-direct/config
     */
    public function config(): JsonResponse
    {
        return response()->json([
            'env'          => $this->uber->getEnv(),
            'is_sandbox'   => $this->uber->isSandbox(),
            'customer_id'  => $this->uber->getCustomerId() ?: null,
            'webhook_url'  => url('/api/webhooks/delivery/uber-direct'),
            'setup_steps'  => [
                '1. Register at https://developer.uber.com → Create app → Enable "Direct" product',
                '2. Get Client ID + Client Secret from the developer portal',
                '3. Get your Customer ID (UUID) from Uber Direct dashboard',
                '4. Add credentials to App Secrets: UBER_DIRECT_CLIENT_ID, UBER_DIRECT_CLIENT_SECRET, UBER_DIRECT_CUSTOMER_ID',
                '5. Set UBER_DIRECT_ENV to "sandbox" for testing or "production" for live',
                '6. Register webhook URL in developer portal: ' . url('/api/webhooks/delivery/uber-direct'),
                '7. Subscribe to events: delivery.status.*, delivery.courier_update',
            ],
            'sandbox_info' => 'Use sandbox-api.uber.com for testing. No real deliveries are created.',
            'docs_url'     => 'https://developer.uber.com/docs/deliveries/get-started',
            'cpp_docs_url' => 'https://developer.uber.com/docs/deliveries/guides/courier-pick-and-pack',
        ]);
    }

    // ── Quote ─────────────────────────────────────────────────────────────────

    /**
     * POST /api/delivery/uber-direct/quote
     *
     * Get delivery fee estimate between two addresses.
     */
    public function quote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id'          => 'nullable|integer|exists:businesses,id',
            'pickup_address'       => 'nullable|string',
            'dropoff_address'      => 'required|string',
            'pickup_phone_number'  => 'nullable|string',
            'dropoff_phone_number' => 'nullable|string',
            'manifest_total_value' => 'nullable|integer|min:0', // cents
            'external_store_id'    => 'nullable|string',
        ]);

        // Auto-resolve pickup address from business (same as DoorDash)
        $pickupAddress = $data['pickup_address'] ?? null;
        $pickupPhone   = $data['pickup_phone_number'] ?? null;

        if (!$pickupAddress && !empty($data['business_id'])) {
            $muzzhub = Muzzhub::where('business_id', $data['business_id'])->first();
            if ($muzzhub) {
                $pickupAddress = UberDirectService::encodeAddress(
                    implode(' ', array_filter([$muzzhub->address ?? '', $muzzhub->address_2 ?? ''])),
                    $muzzhub->city  ?? '',
                    $muzzhub->state ?? '',
                    $muzzhub->zip   ?? '',
                );
                $pickupPhone = $pickupPhone ?? $muzzhub->phone ?? $muzzhub->mobile_phone ?? null;
            }
        }

        if (!$pickupAddress) {
            return response()->json([
                'success' => false,
                'message' => 'pickup_address is required (or provide business_id to auto-fill).',
            ], 422);
        }

        try {
            $result = $this->uber->createQuote(
                $pickupAddress,
                $data['dropoff_address'],
                $data['manifest_total_value'] ?? 0,
                $pickupPhone,
                $data['dropoff_phone_number'] ?? null,
                $data['external_store_id'] ?? null,
            );

            return response()->json([
                'success'  => true,
                'quote'    => $result,
                'fee_usd'  => isset($result['fee']) ? round($result['fee'] / 100, 2) : null,
                'currency' => $result['currency'] ?? 'USD',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Dispatch ──────────────────────────────────────────────────────────────

    /**
     * POST /api/delivery/uber-direct/dispatch/{order}
     *
     * Create a delivery for an existing order.
     */
    public function dispatch(Request $request, Order $order): JsonResponse
    {
        if ($order->uber_direct_delivery_id) {
            return response()->json([
                'success' => false,
                'message' => "Order already has Uber Direct delivery: {$order->uber_direct_delivery_id}",
            ], 422);
        }

        $options = $request->validate([
            'tip_cents'      => 'nullable|integer|min:0',
            'requires_id'    => 'nullable|boolean',
        ]);

        try {
            $order->load(['business', 'items']);
            $delivery = $this->uber->createDelivery($order, $options);

            $order->update([
                'uber_direct_delivery_id'  => $delivery['id'],
                'uber_direct_status'       => $delivery['status'] ?? 'pending',
                'uber_direct_tracking_url' => $delivery['tracking_url'] ?? null,
                'uber_direct_fee'          => $delivery['fee'] ?? null,
                'tracking_url'             => $delivery['tracking_url'] ?? $order->tracking_url,
                'delivery_vendor'          => 'uber_direct',
                'estimated_delivery_at'    => isset($delivery['dropoff']['eta'])
                    ? Carbon::parse($delivery['dropoff']['eta']) : null,
            ]);

            return response()->json([
                'success'  => true,
                'message'  => 'Uber Direct delivery dispatched.',
                'delivery' => $delivery,
                'order'    => $order->fresh(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Status ────────────────────────────────────────────────────────────────

    /**
     * GET /api/delivery/uber-direct/status/{order}
     *
     * Get live delivery status from Uber Direct.
     */
    public function status(Order $order): JsonResponse
    {
        if (!$order->uber_direct_delivery_id) {
            return response()->json(['success' => false, 'message' => 'No Uber Direct delivery for this order.'], 404);
        }

        try {
            $delivery = $this->uber->getDelivery($order->uber_direct_delivery_id);

            // Sync status + tracking back to order
            $updateFields = [
                'uber_direct_status'       => $delivery['status'] ?? $order->uber_direct_status,
                'uber_direct_tracking_url' => $delivery['tracking_url'] ?? $order->uber_direct_tracking_url,
                'tracking_url'             => $delivery['tracking_url'] ?? $order->tracking_url,
            ];
            if (!empty($delivery['dropoff']['eta'])) {
                $updateFields['estimated_delivery_at'] = Carbon::parse($delivery['dropoff']['eta']);
            }
            $order->update($updateFields);

            return response()->json([
                'success'       => true,
                'delivery'      => $delivery,
                'status_label'  => UberDirectService::statusLabel($delivery['status'] ?? ''),
                'tracking_url'  => $delivery['tracking_url'] ?? null,
                'courier'       => $delivery['courier'] ?? null,
                'dropoff_eta'   => $delivery['dropoff']['eta'] ?? null,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── List ──────────────────────────────────────────────────────────────────

    /**
     * GET /api/delivery/uber-direct/deliveries
     *
     * List all deliveries from Uber Direct.
     */
    public function listDeliveries(Request $request): JsonResponse
    {
        try {
            $filters = $request->only(['status', 'limit', 'offset']);
            $result  = $this->uber->listDeliveries($filters);

            return response()->json(['success' => true, 'data' => $result]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Update ────────────────────────────────────────────────────────────────

    /**
     * POST /api/delivery/uber-direct/update/{order}
     *
     * Update an active delivery (tip, dropoff instructions, etc.)
     */
    public function update(Request $request, Order $order): JsonResponse
    {
        if (!$order->uber_direct_delivery_id) {
            return response()->json(['success' => false, 'message' => 'No Uber Direct delivery for this order.'], 404);
        }

        $data = $request->validate([
            'tip'                    => 'nullable|integer|min:0', // cents
            'dropoff_instructions'   => 'nullable|string|max:500',
            'requires_id'            => 'nullable|boolean',
        ]);

        try {
            $result = $this->uber->updateDelivery($order->uber_direct_delivery_id, array_filter($data, fn($v) => $v !== null));

            return response()->json(['success' => true, 'delivery' => $result]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    /**
     * POST /api/delivery/uber-direct/cancel/{order}
     *
     * Cancel an active Uber Direct delivery.
     */
    public function cancel(Order $order): JsonResponse
    {
        if (!$order->uber_direct_delivery_id) {
            return response()->json(['success' => false, 'message' => 'No Uber Direct delivery for this order.'], 404);
        }

        try {
            $result = $this->uber->cancelDelivery($order->uber_direct_delivery_id);

            $order->update([
                'uber_direct_status' => 'canceled',
                'status'             => 'cancelled',
            ]);

            return response()->json([
                'success'  => true,
                'message'  => 'Uber Direct delivery cancelled.',
                'result'   => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Proof of Delivery ─────────────────────────────────────────────────────

    /**
     * POST /api/delivery/uber-direct/proof/{order}
     *
     * Get proof of delivery (signature / photo) after delivery completion.
     */
    public function proofOfDelivery(Order $order): JsonResponse
    {
        if (!$order->uber_direct_delivery_id) {
            return response()->json(['success' => false, 'message' => 'No Uber Direct delivery for this order.'], 404);
        }

        try {
            $result = $this->uber->proofOfDelivery($order->uber_direct_delivery_id);

            return response()->json(['success' => true, 'proof' => $result]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Find Stores ───────────────────────────────────────────────────────────

    /**
     * POST /api/delivery/uber-direct/stores
     *
     * Find Uber Direct stores near a location.
     */
    public function findStores(Request $request): JsonResponse
    {
        $data = $request->validate([
            'latitude'         => 'required|numeric',
            'longitude'        => 'required|numeric',
            'external_store_id'=> 'nullable|string',
        ]);

        try {
            $result = $this->uber->findStores(
                (float) $data['latitude'],
                (float) $data['longitude'],
                $data['external_store_id'] ?? null,
            );

            return response()->json(['success' => true, 'stores' => $result]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── CPP (Courier Pick and Pack) ───────────────────────────────────────────

    /**
     * POST /api/delivery/uber-direct/cpp/quote
     *
     * Create a CPP delivery quote.
     * CPP requires pickup_action: "pick_pack_pay" and manifest_items with replacement_type.
     */
    public function cppQuote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id'            => 'nullable|integer|exists:businesses,id',
            'pickup_address'         => 'nullable|string',
            'dropoff_address'        => 'required|string',
            'pickup_phone_number'    => 'nullable|string',
            'dropoff_phone_number'   => 'nullable|string',
            'manifest_total_value'   => 'nullable|integer|min:0', // cents
            'external_store_id'      => 'nullable|string',
            'manifest_items'         => 'required|array|min:1',
            'manifest_items.*.name'              => 'required|string',
            'manifest_items.*.quantity'          => 'required|integer|min:1',
            'manifest_items.*.price'             => 'required|integer|min:0', // cents
            'manifest_items.*.replacement_type'  => 'nullable|in:contact_customer,remove_item,customer_choice',
            'manifest_items.*.size'              => 'nullable|in:small,medium,large,xlarge',
            'manifest_items.*.weight'            => 'nullable|array',
            'manifest_items.*.external_id'       => 'nullable|string',
        ]);

        // Auto-resolve pickup from business_id (same as quote())
        $pickupAddress = $data['pickup_address'] ?? null;
        $pickupPhone   = $data['pickup_phone_number'] ?? null;

        if (!$pickupAddress && !empty($data['business_id'])) {
            $muzzhub = Muzzhub::where('business_id', $data['business_id'])->first();
            if ($muzzhub) {
                $pickupAddress = UberDirectService::encodeAddress(
                    implode(' ', array_filter([$muzzhub->address ?? '', $muzzhub->address_2 ?? ''])),
                    $muzzhub->city  ?? '',
                    $muzzhub->state ?? '',
                    $muzzhub->zip   ?? '',
                );
                $pickupPhone = $pickupPhone ?? $muzzhub->phone ?? $muzzhub->mobile_phone ?? null;
            }
        }

        if (!$pickupAddress) {
            return response()->json([
                'success' => false,
                'message' => 'pickup_address is required (or provide business_id to auto-fill).',
            ], 422);
        }

        try {
            $result = $this->uber->createQuote(
                $pickupAddress,
                $data['dropoff_address'],
                $data['manifest_total_value'] ?? 0,
                $pickupPhone,
                $data['dropoff_phone_number'] ?? null,
                $data['external_store_id'] ?? null,
            );

            return response()->json([
                'success'           => true,
                'vendor'            => 'uber_direct',
                'fee'               => isset($result['fee']) ? round($result['fee'] / 100, 2) : null,
                'fee_cents'         => $result['fee'] ?? null,
                'currency'          => $result['currency'] ?? 'USD',
                'estimated_minutes' => isset($result['dropoff']['eta'])
                    ? max(1, (int) now()->diffInMinutes(\Carbon\Carbon::parse($result['dropoff']['eta'])))
                    : null,
                'quote_id'          => $result['id'] ?? null,
                'expires_at'        => $result['expires'] ?? null,
                'raw'               => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /api/delivery/uber-direct/cpp/dispatch/{order}
     *
     * Create a CPP delivery for an order.
     * Driver picks items from store (pick_pack_pay mode).
     */
    public function cppDispatch(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'manifest_items'                    => 'required|array|min:1',
            'manifest_items.*.name'             => 'required|string',
            'manifest_items.*.quantity'         => 'required|integer|min:1',
            'manifest_items.*.price'            => 'required|integer|min:0', // cents
            'manifest_items.*.replacement_type' => 'nullable|in:contact_customer,remove_item,customer_choice',
            'manifest_items.*.size'             => 'nullable|in:small,medium,large,xlarge',
            'manifest_items.*.weight'           => 'nullable|array',
            'manifest_items.*.external_id'      => 'nullable|string',
            'pickup_payment'                    => 'nullable|array',
            'tip_cents'                         => 'nullable|integer|min:0',
        ]);

        try {
            $order->load(['business', 'items']);

            // pickup_payment is REQUIRED for CPP mode — default to pay_with_uber
            // max_amount = order total in cents (tells courier the spending limit)
            $pickupPayment = $data['pickup_payment'] ?? [
                'payment_method' => 'pay_with_uber',
                'max_amount'     => (int) round($order->total * 100),
            ];

            $delivery = $this->uber->createDelivery($order, [
                'tip_cents'       => $data['tip_cents'] ?? null,
                'pickup_action'   => 'pick_pack_pay',
                'pickup_payment'  => $pickupPayment,
                'manifest_items'  => $data['manifest_items'], // CPP items with replacement_type
            ]);

            $order->update([
                'uber_direct_delivery_id'  => $delivery['id'],
                'uber_direct_status'       => $delivery['status'] ?? 'pending',
                'uber_direct_tracking_url' => $delivery['tracking_url'] ?? null,
                'uber_direct_fee'          => $delivery['fee'] ?? null,
                'tracking_url'             => $delivery['tracking_url'] ?? $order->tracking_url,
                'delivery_vendor'          => 'uber_direct',
            ]);

            return response()->json([
                'success'  => true,
                'message'  => 'Uber Direct CPP delivery dispatched.',
                'delivery' => $delivery,
                'order'    => $order->fresh(),
            ]);
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            // CPP (pick_pack_pay) requires special account activation by Uber Direct.
            // Uber returns a misleading "Pickup payment is required" error when the
            // feature is not enabled on the account — translate it to something clear.
            if (str_contains($msg, 'Pickup payment is required') || str_contains($msg, 'pickup_payment')) {
                $msg = 'Uber Direct CPP (Courier Pick & Pack) is not enabled on this account. '
                     . 'Contact your Uber Direct account manager to activate the pick_pack_pay feature. '
                     . 'Original error: ' . $msg;
            }
            return response()->json(['success' => false, 'message' => $msg], 422);
        }
    }

    // ── Webhook ───────────────────────────────────────────────────────────────

    /**
     * POST /api/webhooks/delivery/uber-direct
     *
     * Uber Direct sends delivery status updates here.
     *
     * Event types:
     *   delivery.status.enroute_for_pickup
     *   delivery.status.arrived_at_pickup
     *   delivery.status.picked_up
     *   delivery.status.enroute_for_dropoff
     *   delivery.status.arrived_at_dropoff
     *   delivery.status.delivered
     *   delivery.status.completed
     *   delivery.status.cancelled
     *   delivery.status.returned
     *   delivery.courier_update
     */
    public function webhook(Request $request): Response
    {
        $payload = $request->all();

        Log::info('[UberDirect] Webhook received', [
            'event_type' => $payload['event_type'] ?? 'unknown',
            'delivery_id'=> $payload['delivery_id'] ?? null,
        ]);

        try {
            $eventType  = $payload['event_type'] ?? $payload['type'] ?? '';
            $deliveryId = $payload['delivery_id'] ?? $payload['id'] ?? null;

            if (!$deliveryId) {
                Log::warning('[UberDirect] Webhook missing delivery_id', $payload);
                return response('', 200);
            }

            $order = Order::where('uber_direct_delivery_id', $deliveryId)->first();

            if (!$order) {
                Log::warning("[UberDirect] No order found for delivery_id: {$deliveryId}");
                return response('', 200);
            }

            // Map Uber Direct event type → internal status
            $statusMap = [
                'delivery.status.enroute_for_pickup'  => 'pickup',
                'delivery.status.arrived_at_pickup'   => 'pickup',
                'delivery.status.picked_up'           => 'pickup_complete',
                'delivery.status.enroute_for_dropoff' => 'dropoff',
                'delivery.status.arrived_at_dropoff'  => 'dropoff',
                'delivery.status.delivered'           => 'delivered',
                'delivery.status.completed'           => 'completed',
                'delivery.status.canceled'            => 'canceled',
                'delivery.status.cancelled'           => 'canceled',
                'delivery.status.returned'            => 'returned',
            ];

            $uberStatus = $payload['status'] ?? ($statusMap[$eventType] ?? null);

            $updates = [];

            if ($uberStatus) {
                $updates['uber_direct_status'] = $uberStatus;

                // Sync order status for key events
                if (in_array($uberStatus, ['delivered', 'completed'])) {
                    $updates['status']       = 'delivered';
                    $updates['delivered_at'] = now();
                } elseif (in_array($uberStatus, ['canceled', 'cancelled'])) {
                    $updates['status'] = 'cancelled';
                } elseif (in_array($uberStatus, ['pickup', 'pickup_complete', 'dropoff'])) {
                    $updates['status'] = 'out_for_delivery';
                }
            }

            // Courier location update
            if ($eventType === 'delivery.courier_update' && isset($payload['location'])) {
                Log::info("[UberDirect] Courier location update for order {$order->order_number}", [
                    'lat' => $payload['location']['lat'] ?? null,
                    'lng' => $payload['location']['lng'] ?? null,
                ]);
            }

            if ($updates) {
                $order->update($updates);
            }

            Log::info("[UberDirect] Order {$order->order_number} updated: event={$eventType}");
        } catch (\Throwable $e) {
            Log::error('[UberDirect] Webhook error: ' . $e->getMessage());
        }

        // Always return 200 to Uber
        return response('', 200);
    }
}
