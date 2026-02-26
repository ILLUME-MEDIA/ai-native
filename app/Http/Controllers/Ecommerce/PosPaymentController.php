<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PosCatalogMap;
use App\Models\PosConnection;
use App\Models\PosOrder;
use App\Services\Pos\CloverService;
use App\Services\Pos\SquareService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosPaymentController extends Controller
{
    // ── List POS orders for an order ──────────────────────────────────────────

    public function posOrders(Order $order): JsonResponse
    {
        return response()->json(PosOrder::where('order_id', $order->id)->get());
    }

    // ── Create POS order + terminal checkout (Square) ─────────────────────────

    /**
     * POST /api/ecommerce/pos/{connection}/checkout
     * Creates a Square/Clover order from local order, then initiates terminal checkout.
     */
    public function createCheckout(Request $request, PosConnection $connection): JsonResponse
    {
        abort_unless($connection->is_active, 422, 'POS connection is inactive.');

        $data = $request->validate([
            'order_id'  => 'required|exists:orders,id',
            'device_id' => 'nullable|string',
        ]);

        $connection->ensureAccessToken();
        $token = $connection->decryptedAccessToken();
        $order = Order::with('items')->findOrFail($data['order_id']);

        if ($connection->provider === 'square') {
            return $this->squareCheckout($connection, $token, $order, $data['device_id'] ?? null);
        }

        if ($connection->provider === 'clover') {
            return $this->cloverCheckout($connection, $token, $order);
        }

        return response()->json(['message' => 'Unsupported provider'], 422);
    }

    // ── Poll terminal checkout status (Square) ────────────────────────────────

    /**
     * GET /api/ecommerce/pos/{connection}/checkout/{checkoutId}/status
     */
    public function checkoutStatus(PosConnection $connection, string $checkoutId): JsonResponse
    {
        abort_unless($connection->provider === 'square', 422, 'Status polling only available for Square.');

        $connection->ensureAccessToken();
        $token    = $connection->decryptedAccessToken();
        $checkout = app(SquareService::class)->getTerminalCheckout($token, $checkoutId);
        $status   = $checkout['status'] ?? 'UNKNOWN';

        if ($status === 'COMPLETED') {
            $this->markSquarePaid($checkout);
        } elseif (in_array($status, ['CANCELED', 'CANCEL_REQUESTED'])) {
            // Nothing to do locally, order stays unpaid
        }

        return response()->json([
            'status'     => $status,
            'payment_id' => $checkout['payment_ids'][0] ?? null,
        ]);
    }

    /** POST /api/ecommerce/pos/{connection}/checkout/{checkoutId}/cancel */
    public function cancelCheckout(PosConnection $connection, string $checkoutId): JsonResponse
    {
        abort_unless($connection->provider === 'square', 422);

        $connection->ensureAccessToken();
        $checkout = app(SquareService::class)
                        ->cancelTerminalCheckout($connection->decryptedAccessToken(), $checkoutId);

        return response()->json(['status' => $checkout['status'] ?? 'CANCEL_REQUESTED']);
    }

    // ── List POS devices ──────────────────────────────────────────────────────

    public function devices(PosConnection $connection): JsonResponse
    {
        abort_unless($connection->provider === 'square', 422, 'Device list only available for Square.');

        $connection->ensureAccessToken();
        $devices = app(SquareService::class)->listDevices($connection->decryptedAccessToken());

        return response()->json($devices);
    }

    // ── Square web payment (card nonce from Square.js) ────────────────────────

    /**
     * POST /api/ecommerce/pos/{connection}/pay
     * Charges using a Square card nonce (from Square Web Payments SDK).
     */
    public function squarePay(Request $request, PosConnection $connection): JsonResponse
    {
        abort_unless($connection->provider === 'square', 422);
        abort_unless($connection->is_active, 422, 'POS connection is inactive.');

        $data = $request->validate([
            'order_id'  => 'required|exists:orders,id',
            'source_id' => 'required|string',   // card nonce from Square.js
        ]);

        $connection->ensureAccessToken();
        $token = $connection->decryptedAccessToken();
        $order = Order::with('items')->findOrFail($data['order_id']);

        // Get or create Square POS order
        $posOrder = PosOrder::where('order_id', $order->id)->where('provider', 'square')->first();
        if (!$posOrder) {
            $squareOrder = app(SquareService::class)->createOrder(
                $token,
                $connection->location_id,
                $this->buildSquareLineItems($connection, $order),
                ['local_order_id' => (string) $order->id]
            );
            $posOrder = PosOrder::create([
                'order_id'     => $order->id,
                'provider'     => 'square',
                'pos_order_id' => $squareOrder['id'],
                'pos_status'   => $squareOrder['state'] ?? 'OPEN',
                'synced_at'    => now(),
            ]);
        }

        $payment = app(SquareService::class)->createPayment(
            $token,
            $data['source_id'],
            (int) round($order->total * 100),
            'USD',
            $posOrder->pos_order_id,
            "Order #{$order->order_number}"
        );

        $posOrder->update([
            'pos_payment_id' => $payment['id'],
            'pos_status'     => $payment['status'],
            'synced_at'      => now(),
        ]);

        if ($payment['status'] === 'COMPLETED') {
            $order->update([
                'payment_status' => 'paid',
                'payment_method' => 'square_pos',
                'paid_at'        => now(),
            ]);
        }

        return response()->json([
            'payment_id' => $payment['id'],
            'status'     => $payment['status'],
        ]);
    }

    // ── Square helpers ────────────────────────────────────────────────────────

    private function squareCheckout(PosConnection $conn, string $token, Order $order, ?string $deviceId): JsonResponse
    {
        $posOrder = PosOrder::where('order_id', $order->id)->where('provider', 'square')->first();

        if (!$posOrder) {
            $squareOrder = app(SquareService::class)->createOrder(
                $token,
                $conn->location_id,
                $this->buildSquareLineItems($conn, $order),
                ['local_order_id' => (string) $order->id]
            );

            $posOrder = PosOrder::create([
                'order_id'     => $order->id,
                'provider'     => 'square',
                'pos_order_id' => $squareOrder['id'],
                'pos_status'   => $squareOrder['state'] ?? 'OPEN',
                'synced_at'    => now(),
            ]);
        }

        $checkout = app(SquareService::class)->createTerminalCheckout(
            $token,
            $posOrder->pos_order_id,
            (int) round($order->total * 100),
            'USD',
            $deviceId
        );

        $posOrder->update([
            'pos_checkout_id' => $checkout['id'],
            'synced_at'       => now(),
        ]);

        return response()->json([
            'checkout_id'  => $checkout['id'],
            'status'       => $checkout['status'],
            'pos_order_id' => $posOrder->pos_order_id,
            'amount'       => $order->total,
        ], 201);
    }

    private function cloverCheckout(PosConnection $conn, string $token, Order $order): JsonResponse
    {
        $clover   = app(CloverService::class);
        $posOrder = PosOrder::where('order_id', $order->id)->where('provider', 'clover')->first();

        if (!$posOrder) {
            $cloverOrder = $clover->createOrder($token, $conn->merchant_id);
            $orderId     = $cloverOrder['id'];

            foreach ($order->items as $item) {
                $clover->addLineItem($token, $conn->merchant_id, $orderId, [
                    'name'     => $item->name,
                    'price'    => (int) round($item->price * 100),
                    'unitQty'  => $item->quantity * 1000,
                    'note'     => $item->notes ?? '',
                ]);
            }

            $posOrder = PosOrder::create([
                'order_id'     => $order->id,
                'provider'     => 'clover',
                'pos_order_id' => $orderId,
                'pos_status'   => 'open',
                'synced_at'    => now(),
            ]);
        }

        return response()->json([
            'pos_order_id' => $posOrder->pos_order_id,
            'status'       => $posOrder->pos_status,
            'clover_url'   => "https://www.clover.com/pos/{$conn->merchant_id}",
            'amount'       => $order->total,
        ], 201);
    }

    private function buildSquareLineItems(PosConnection $conn, Order $order): array
    {
        return $order->items->map(function ($item) use ($conn) {
            $map  = PosCatalogMap::where('business_id', $conn->business_id)
                                 ->where('provider', 'square')
                                 ->where('menu_item_id', $item->menu_item_id)
                                 ->first();

            $line = [
                'name'             => $item->name,
                'quantity'         => (string) $item->quantity,
                'base_price_money' => [
                    'amount'   => (int) round($item->price * 100),
                    'currency' => 'USD',
                ],
            ];

            if ($map?->pos_variant_id) {
                $line['catalog_object_id'] = $map->pos_variant_id;
            }

            if (!empty($item->modifiers)) {
                $line['modifiers'] = collect($item->modifiers)->map(fn ($m) => [
                    'name'             => $m['option_name'],
                    'base_price_money' => [
                        'amount'   => (int) round($m['price_adjustment'] * 100),
                        'currency' => 'USD',
                    ],
                ])->all();
            }

            if ($item->notes) {
                $line['note'] = $item->notes;
            }

            return $line;
        })->all();
    }

    private function markSquarePaid(array $checkout): void
    {
        $posOrder = PosOrder::where('pos_order_id', $checkout['order_id'] ?? '')
                            ->where('provider', 'square')
                            ->first();

        if (!$posOrder) return;

        $posOrder->update([
            'pos_payment_id' => $checkout['payment_ids'][0] ?? null,
            'pos_status'     => 'COMPLETED',
            'synced_at'      => now(),
        ]);

        Order::where('id', $posOrder->order_id)->update([
            'payment_status' => 'paid',
            'payment_method' => 'square_pos',
            'paid_at'        => now(),
        ]);
    }
}
