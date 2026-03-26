<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PosCatalogMap;
use App\Models\PosConnection;
use App\Models\PosOrder;
use App\Services\Pos\CloverService;
use App\Services\Pos\DeliverectService;
use App\Services\Pos\PosLavuService;
use App\Services\Pos\SpotOnService;
use App\Services\Pos\SquareService;
use App\Services\Pos\ToastService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosPaymentController extends Controller
{
    // ── List POS orders for an order ──────────────────────────────────────────

    public function posOrders(Order $order): JsonResponse
    {
        return response()->json(PosOrder::where('order_id', $order->id)->get());
    }

    // ── List POS orders by business + provider (for POS Orders tab) ───────────

    public function posOrdersByConnection(Request $request): JsonResponse
    {
        $request->validate([
            'business_id' => 'required|integer',
            'provider'    => 'required|string',
        ]);

        $orders = PosOrder::where('provider', $request->provider)
            ->whereHas('order', fn ($q) => $q->where('business_id', $request->business_id))
            ->with(['order:id,business_id,total,status,created_at'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return response()->json($orders);
    }

    // ── Create POS order + terminal checkout ──────────────────────────────────

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

        return match ($connection->provider) {
            'square'     => $this->squareCheckout($connection, $token, $order, $data['device_id'] ?? null),
            'clover'     => $this->cloverCheckout($connection, $token, $order),
            'toast'      => $this->toastCheckout($connection, $token, $order),
            'spoton'     => $this->spotOnCheckout($connection, $token, $order),
            'poslavu'    => $this->posLavuCheckout($connection, $token, $order),
            'deliverect' => $this->deliverectCheckout($connection, $token, $order),
            default      => response()->json(['message' => 'Unsupported provider'], 422),
        };
    }

    // ── Poll terminal checkout status (Square) ────────────────────────────────

    public function checkoutStatus(PosConnection $connection, string $checkoutId): JsonResponse
    {
        abort_unless($connection->provider === 'square', 422, 'Status polling only available for Square.');

        $connection->ensureAccessToken();
        $checkout = app(SquareService::class)->getTerminalCheckout($connection->decryptedAccessToken(), $checkoutId);
        $status   = $checkout['status'] ?? 'UNKNOWN';

        if ($status === 'COMPLETED') {
            $this->markSquarePaid($checkout);
        }

        return response()->json([
            'status'     => $status,
            'payment_id' => $checkout['payment_ids'][0] ?? null,
        ]);
    }

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

    // ── Square web payment ─────────────────────────────────────────────────────

    public function squarePay(Request $request, PosConnection $connection): JsonResponse
    {
        abort_unless($connection->provider === 'square', 422);
        abort_unless($connection->is_active, 422, 'POS connection is inactive.');

        $data = $request->validate([
            'order_id'  => 'required|exists:orders,id',
            'source_id' => 'required|string',
        ]);

        $connection->ensureAccessToken();
        $token = $connection->decryptedAccessToken();
        $order = Order::with('items')->findOrFail($data['order_id']);

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

    // ══════════════════════════════════════════════════════════════════════════
    // SQUARE checkout
    // ══════════════════════════════════════════════════════════════════════════

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

    // ══════════════════════════════════════════════════════════════════════════
    // CLOVER checkout
    // ══════════════════════════════════════════════════════════════════════════

    private function cloverCheckout(PosConnection $conn, string $token, Order $order): JsonResponse
    {
        $clover   = app(CloverService::class);
        $posOrder = PosOrder::where('order_id', $order->id)->where('provider', 'clover')->first();

        if (!$posOrder) {
            $cloverOrder = $clover->createOrder($token, $conn->merchant_id);
            $orderId     = $cloverOrder['id'];

            foreach ($order->items as $item) {
                $clover->addLineItem($token, $conn->merchant_id, $orderId, [
                    'name'    => $item->name,
                    'price'   => (int) round($item->price * 100),
                    'unitQty' => $item->quantity * 1000,
                    'note'    => $item->notes ?? '',
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

    // ══════════════════════════════════════════════════════════════════════════
    // TOAST checkout
    // ══════════════════════════════════════════════════════════════════════════

    private function toastCheckout(PosConnection $conn, string $token, Order $order): JsonResponse
    {
        $toast    = app(ToastService::class);
        $posOrder = PosOrder::where('order_id', $order->id)->where('provider', 'toast')->first();

        if (!$posOrder) {
            // Build Toast order: checks[0].selections[]
            $selections = $order->items->map(function ($item) use ($conn) {
                $map = PosCatalogMap::where('business_id', $conn->business_id)
                                    ->where('provider', 'toast')
                                    ->where('menu_item_id', $item->menu_item_id)
                                    ->first();

                $sel = [
                    'quantity' => $item->quantity,
                ];

                if ($map?->pos_item_id) {
                    $sel['itemGuid'] = $map->pos_item_id;
                } else {
                    // Fallback: ad-hoc item with price
                    $sel['displayName']  = $item->name;
                    $sel['preDiscountPrice'] = (int) round($item->price * 100);
                }

                if ($item->notes) {
                    $sel['specialRequest'] = $item->notes;
                }

                return $sel;
            })->all();

            $toastOrder = $toast->createOrder($token, $conn->merchant_id, [
                'checks' => [[
                    'selections' => $selections,
                ]],
                'externalId' => 'order_' . $order->id,
            ]);

            $orderGuid = $toastOrder['guid'] ?? null;
            $checkGuid = $toastOrder['checks'][0]['guid'] ?? null;

            $posOrder = PosOrder::create([
                'order_id'     => $order->id,
                'provider'     => 'toast',
                'pos_order_id' => $orderGuid,
                'pos_status'   => $toastOrder['displayState'] ?? 'OPEN',
                'synced_at'    => now(),
            ]);

            // Attach check GUID in checkout_id for later payment
            if ($checkGuid) {
                $posOrder->update(['pos_checkout_id' => $checkGuid]);
            }
        }

        return response()->json([
            'pos_order_id' => $posOrder->pos_order_id,
            'check_guid'   => $posOrder->pos_checkout_id,
            'status'       => $posOrder->pos_status,
            'amount'       => $order->total,
        ], 201);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SPOTON checkout
    // ══════════════════════════════════════════════════════════════════════════

    private function spotOnCheckout(PosConnection $conn, string $token, Order $order): JsonResponse
    {
        $spoton   = app(SpotOnService::class);
        $posOrder = PosOrder::where('order_id', $order->id)->where('provider', 'spoton')->first();

        if (!$posOrder) {
            $lineItems = $order->items->map(function ($item) use ($conn) {
                $map = PosCatalogMap::where('business_id', $conn->business_id)
                                    ->where('provider', 'spoton')
                                    ->where('menu_item_id', $item->menu_item_id)
                                    ->first();

                return [
                    'itemId'   => $map?->pos_item_id,
                    'name'     => $item->name,
                    'price'    => (int) round($item->price * 100),
                    'quantity' => $item->quantity,
                    'note'     => $item->notes ?? '',
                ];
            })->all();

            $spotOnOrder = $spoton->createOrder($token, $conn->merchant_id, [
                'externalId' => 'order_' . $order->id,
                'total'      => (int) round($order->total * 100),
                'items'      => $lineItems,
            ]);

            $posOrder = PosOrder::create([
                'order_id'     => $order->id,
                'provider'     => 'spoton',
                'pos_order_id' => $spotOnOrder['id'],
                'pos_status'   => $spotOnOrder['status'] ?? 'open',
                'synced_at'    => now(),
            ]);
        }

        return response()->json([
            'pos_order_id' => $posOrder->pos_order_id,
            'status'       => $posOrder->pos_status,
            'amount'       => $order->total,
        ], 201);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POSLAVU checkout
    // ══════════════════════════════════════════════════════════════════════════

    private function posLavuCheckout(PosConnection $conn, string $token, Order $order): JsonResponse
    {
        $lavu     = app(PosLavuService::class);
        $posOrder = PosOrder::where('order_id', $order->id)->where('provider', 'poslavu')->first();

        if (!$posOrder) {
            $lavuOrder = $lavu->createOrder($token, $conn->merchant_id, [
                'externalId' => 'order_' . $order->id,
                'total'      => round($order->total, 2),
                'status'     => 'open',
            ]);

            $orderId = $lavuOrder['id'] ?? $lavuOrder['orderId'] ?? null;

            // Add line items
            foreach ($order->items as $item) {
                $map = PosCatalogMap::where('business_id', $conn->business_id)
                                    ->where('provider', 'poslavu')
                                    ->where('menu_item_id', $item->menu_item_id)
                                    ->first();

                try {
                    $lavu->addOrderItem($token, $orderId, [
                        'itemId'   => $map?->pos_item_id,
                        'name'     => $item->name,
                        'price'    => round($item->price, 2),
                        'quantity' => $item->quantity,
                        'note'     => $item->notes ?? '',
                    ]);
                } catch (\Throwable) {
                    // Continue even if individual line item add fails
                }
            }

            $posOrder = PosOrder::create([
                'order_id'     => $order->id,
                'provider'     => 'poslavu',
                'pos_order_id' => $orderId,
                'pos_status'   => 'open',
                'synced_at'    => now(),
            ]);
        }

        return response()->json([
            'pos_order_id' => $posOrder->pos_order_id,
            'status'       => $posOrder->pos_status,
            'amount'       => $order->total,
        ], 201);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DELIVERECT checkout
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Deliverect: inject order into the platform (received orders flow).
     * Creates an order in Deliverect so it can be dispatched to delivery channels.
     */
    private function deliverectCheckout(PosConnection $conn, string $token, Order $order): JsonResponse
    {
        $deliverect = app(DeliverectService::class);
        $posOrder   = PosOrder::where('order_id', $order->id)->where('provider', 'deliverect')->first();

        if (!$posOrder) {
            $items = $order->items->map(function ($item) use ($conn) {
                $map = PosCatalogMap::where('business_id', $conn->business_id)
                                    ->where('provider', 'deliverect')
                                    ->where('menu_item_id', $item->menu_item_id)
                                    ->first();

                return [
                    'plu'      => $map?->pos_item_id ?? (string) $item->menu_item_id,
                    'name'     => $item->name,
                    'price'    => (int) round($item->price * 100),
                    'quantity' => $item->quantity,
                    'note'     => $item->notes ?? '',
                ];
            })->all();

            $dlOrder = $deliverect->createOrder($token, $conn->merchant_id, [
                'channelOrderId' => 'order_' . $order->id,
                'status'         => 1,                         // RECEIVED
                'orderIsAlreadyPaid' => false,
                'payment' => [
                    'type'   => 1,                              // Cash/online
                    'amount' => (int) round($order->total * 100),
                ],
                'decimalDigits' => 2,
                'items'         => $items,
            ]);

            $posOrder = PosOrder::create([
                'order_id'     => $order->id,
                'provider'     => 'deliverect',
                'pos_order_id' => $dlOrder['_id'] ?? $dlOrder['id'] ?? null,
                'pos_status'   => 'received',
                'synced_at'    => now(),
            ]);
        }

        return response()->json([
            'pos_order_id' => $posOrder->pos_order_id,
            'status'       => $posOrder->pos_status,
            'amount'       => $order->total,
        ], 201);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SQUARE helpers
    // ══════════════════════════════════════════════════════════════════════════

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
