<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\DoorDashService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DoorDashController extends Controller
{
    public function __construct(private DoorDashService $doorDash) {}

    // ── POST /api/delivery/doordash/quote ─────────────────────────────────────

    /**
     * Get a delivery fee quote from DoorDash.
     * Accepts pickup_address, dropoff_address, and optional order_value (in dollars).
     */
    public function quote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pickup_address'  => 'required|string',
            'dropoff_address' => 'required|string',
            'order_value'     => 'nullable|numeric|min:0',
        ]);

        try {
            $quote = $this->doorDash->getQuote(
                $data['pickup_address'],
                $data['dropoff_address'],
                (int) round(($data['order_value'] ?? 0) * 100), // convert dollars → cents
            );
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 502);
        }

        // Normalize the fee to dollars for the response
        $feeCents = $quote['fee'] ?? $quote['delivery_fee'] ?? null;

        return response()->json([
            'success'          => true,
            'fee'              => $feeCents !== null ? round($feeCents / 100, 2) : null,
            'fee_cents'        => $feeCents,
            'currency'         => $quote['currency'] ?? 'USD',
            'expires_at'       => $quote['expires_at'] ?? null,
            'quote_id'         => $quote['external_delivery_id'] ?? null,
            'raw'              => $quote,
        ]);
    }

    // ── GET /api/delivery/doordash/env ───────────────────────────────────────

    /** Returns the current DoorDash environment (sandbox / production). */
    public function env(): JsonResponse
    {
        return response()->json([
            'env'        => $this->doorDash->getEnv(),
            'is_sandbox' => $this->doorDash->isSandbox(),
        ]);
    }

    // ── GET /api/delivery/doordash/status/{order} ─────────────────────────────

    /**
     * Fetch live delivery status from DoorDash and sync it to the local order.
     */
    public function status(Order $order): JsonResponse
    {
        if (! $order->doordash_delivery_id) {
            return response()->json([
                'success' => false,
                'message' => 'No DoorDash delivery found for this order.',
            ], 404);
        }

        try {
            $delivery = $this->doorDash->getDelivery($order->doordash_delivery_id);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 502);
        }

        $ddStatus = $delivery['delivery_status'] ?? null;

        $update = [];
        if ($ddStatus) $update['doordash_status'] = $ddStatus;
        if (! empty($delivery['tracking_url'])) $update['doordash_tracking_url'] = $delivery['tracking_url'];
        if ($update) $order->update($update);

        // Mirror certain DoorDash statuses onto the order status
        $orderStatus = match ($ddStatus) {
            'picked_up', 'enroute_to_dropoff', 'arrived_at_dropoff' => 'out_for_delivery',
            'delivered'          => 'delivered',
            'delivery_cancelled' => 'cancelled',
            default              => null,
        };
        if ($orderStatus) $order->update(['status' => $orderStatus]);

        return response()->json([
            'success'      => true,
            'order_number' => $order->order_number,
            'dd_status'    => $ddStatus,
            'dd_label'     => DoorDashService::statusLabel($ddStatus ?? ''),
            'tracking_url' => $order->doordash_tracking_url,
            'delivery'     => $delivery,
        ]);
    }

    // ── POST /api/delivery/doordash/cancel/{order} ────────────────────────────

    /**
     * Cancel an active DoorDash delivery.
     */
    public function cancel(Order $order): JsonResponse
    {
        if (! $order->doordash_delivery_id) {
            return response()->json([
                'success' => false,
                'message' => 'No DoorDash delivery found for this order.',
            ], 404);
        }

        if (in_array($order->doordash_status, ['delivered', 'delivery_cancelled', 'returned'])) {
            return response()->json([
                'success' => false,
                'message' => 'Delivery cannot be cancelled (status: ' . $order->doordash_status . ').',
            ], 409);
        }

        try {
            $result = $this->doorDash->cancelDelivery($order->doordash_delivery_id);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 502);
        }

        $order->update([
            'doordash_status' => 'delivery_cancelled',
            'status'          => 'cancelled',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'DoorDash delivery cancelled.',
            'result'  => $result,
        ]);
    }

    // ── POST /api/delivery/doordash/dispatch/{order} ──────────────────────────

    /**
     * Manually dispatch (or re-dispatch) a DoorDash delivery for an order.
     * Useful for orders that failed auto-dispatch on creation.
     */
    public function dispatch(Order $order): JsonResponse
    {
        if ($order->doordash_delivery_id) {
            return response()->json([
                'success' => false,
                'message' => 'DoorDash delivery already dispatched (id: ' . $order->doordash_delivery_id . ').',
            ], 409);
        }

        if (! $order->delivery_address) {
            return response()->json([
                'success' => false,
                'message' => 'Order has no delivery address.',
            ], 422);
        }

        try {
            $delivery = $this->doorDash->createDelivery($order->load('business'));
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 502);
        }

        $order->update([
            'doordash_delivery_id'  => $delivery['external_delivery_id'] ?? $order->order_number,
            'doordash_status'       => $delivery['delivery_status'] ?? 'created',
            'doordash_tracking_url' => $delivery['tracking_url'] ?? null,
        ]);

        return response()->json([
            'success'      => true,
            'delivery_id'  => $order->doordash_delivery_id,
            'status'       => $order->doordash_status,
            'label'        => DoorDashService::statusLabel($order->doordash_status ?? ''),
            'tracking_url' => $order->doordash_tracking_url,
        ], 201);
    }

    // ── POST /api/delivery/doordash/webhook ───────────────────────────────────

    /**
     * Receive DoorDash webhook events and sync delivery status.
     * Configure this URL in: DoorDash Developer Portal → Webhooks.
     */
    public function webhook(Request $request): Response
    {
        $data       = $request->json()->all();
        $externalId = $data['external_delivery_id'] ?? null;
        $ddStatus   = $data['delivery_status'] ?? null;

        if ($externalId && $ddStatus) {
            $updateFields = ['doordash_status' => $ddStatus];

            if (! empty($data['tracking_url'])) {
                $updateFields['doordash_tracking_url'] = $data['tracking_url'];
            }

            $orderStatus = match ($ddStatus) {
                'enroute_to_pickup'                            => 'preparing',
                'arrived_at_pickup'                            => 'ready',
                'picked_up', 'enroute_to_dropoff', 'arrived_at_dropoff' => 'out_for_delivery',
                'delivered'                                    => 'delivered',
                'delivery_cancelled', 'returned'               => 'cancelled',
                default                                        => null,
            };
            if ($orderStatus) $updateFields['status'] = $orderStatus;

            Order::where('order_number', $externalId)->update($updateFields);
        }

        return response('ok', 200);
    }
}
