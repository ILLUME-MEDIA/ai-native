<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\DoorDashShopService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * DoorDash Drive Shop & Deliver controller.
 *
 * Dashers shop for items at the merchant location, pay with a DoorDash-issued card,
 * then deliver to the customer.
 *
 * Requires separate Shop & Deliver developer credentials (DOORDASH_SHOP_*).
 */
class DoorDashShopController extends Controller
{
    private DoorDashShopService $shop;

    public function __construct(DoorDashShopService $shop)
    {
        $this->shop = $shop;
    }

    // ── Config / env ──────────────────────────────────────────────────────────

    /** GET /api/delivery/doordash-shop/env */
    public function env(): JsonResponse
    {
        return response()->json([
            'env'       => $this->shop->getEnv(),
            'is_sandbox'=> $this->shop->isSandbox(),
        ]);
    }

    // ── Quote ─────────────────────────────────────────────────────────────────

    /** POST /api/delivery/doordash-shop/quote */
    public function quote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pickup_address'  => 'required|string',
            'dropoff_address' => 'required|string',
            'order_value'     => 'nullable|numeric|min:0',
        ]);

        try {
            $result = $this->shop->getQuote(
                $data['pickup_address'],
                $data['dropoff_address'],
                (int) round(($data['order_value'] ?? 0) * 100)
            );

            $fee = $result['fee'] ?? ($result['currency_amount'] ?? null);

            return response()->json([
                'success'     => true,
                'vendor'      => 'doordash_shop',
                'fee'         => $fee !== null ? round($fee / 100, 2) : null,
                'fee_cents'   => $fee,
                'currency'    => 'USD',
                'raw'         => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Dispatch ──────────────────────────────────────────────────────────────

    /**
     * POST /api/delivery/doordash-shop/dispatch/{order}
     * Sends a Shop & Deliver delivery request to DoorDash.
     */
    public function dispatch(Request $request, Order $order): JsonResponse
    {
        if ($order->doordash_shop_delivery_id) {
            return response()->json(['success' => false, 'message' => 'Shop & Deliver already dispatched for this order.'], 422);
        }

        $data = $request->validate([
            'contains_alcohol'        => 'nullable|boolean',
            'action_if_undeliverable' => 'nullable|in:return_to_pickup,discard',
        ]);

        try {
            $order->load(['business', 'items']);
            $delivery = $this->shop->createDelivery($order, $data);

            $order->update([
                'doordash_shop_delivery_id'  => $delivery['id'] ?? $delivery['external_delivery_id'] ?? $order->order_number,
                'doordash_shop_status'       => $delivery['status'] ?? 'created',
                'doordash_shop_tracking_url' => $delivery['delivery_tracking_url'] ?? null,
                'delivery_vendor'            => 'doordash_shop',
                'tracking_url'               => $delivery['delivery_tracking_url'] ?? $order->tracking_url,
                'estimated_delivery_at'      => isset($delivery['estimated_delivery_time'])
                    ? Carbon::parse($delivery['estimated_delivery_time']) : null,
            ]);

            return response()->json([
                'success'     => true,
                'message'     => 'DoorDash Shop & Deliver dispatched.',
                'delivery_id' => $order->fresh()->doordash_shop_delivery_id,
                'status'      => $order->fresh()->doordash_shop_status,
                'tracking_url'=> $order->fresh()->doordash_shop_tracking_url,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Status ────────────────────────────────────────────────────────────────

    /** GET /api/delivery/doordash-shop/status/{order} */
    public function status(Order $order): JsonResponse
    {
        if (!$order->doordash_shop_delivery_id) {
            return response()->json(['success' => false, 'message' => 'No Shop & Deliver delivery for this order.'], 404);
        }

        try {
            $delivery = $this->shop->getDelivery($order->doordash_shop_delivery_id);
            $status   = $delivery['status'] ?? $order->doordash_shop_status;

            $order->update([
                'doordash_shop_status'       => $status,
                'doordash_shop_tracking_url' => $delivery['delivery_tracking_url'] ?? $order->doordash_shop_tracking_url,
            ]);

            return response()->json([
                'success'      => true,
                'status'       => $status,
                'status_label' => DoorDashShopService::statusLabel($status),
                'tracking_url' => $delivery['delivery_tracking_url'] ?? null,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    /** POST /api/delivery/doordash-shop/cancel/{order} */
    public function cancel(Order $order): JsonResponse
    {
        if (!$order->doordash_shop_delivery_id) {
            return response()->json(['success' => false, 'message' => 'No Shop & Deliver delivery to cancel.'], 404);
        }

        try {
            $this->shop->cancelDelivery($order->doordash_shop_delivery_id);
            $order->update(['doordash_shop_status' => 'delivery_cancelled']);

            return response()->json(['success' => true, 'message' => 'Shop & Deliver delivery cancelled.']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Webhook ───────────────────────────────────────────────────────────────

    /**
     * POST /api/webhooks/delivery/doordash-shop
     * Receives DoorDash Shop & Deliver status updates.
     */
    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        $extId   = $payload['external_delivery_id'] ?? null;
        $status  = $payload['delivery_status']       ?? $payload['status'] ?? null;

        if ($extId && $status) {
            $order = Order::where('order_number', $extId)->first();
            if ($order) {
                $order->update([
                    'doordash_shop_delivery_id'  => $payload['id'] ?? $order->doordash_shop_delivery_id,
                    'doordash_shop_status'       => $status,
                    'doordash_shop_tracking_url' => $payload['delivery_tracking_url'] ?? $order->doordash_shop_tracking_url,
                ]);
            }
        }

        return response()->json(['received' => true]);
    }
}
