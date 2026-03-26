<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\PosCatalogMap;
use App\Models\PosConnection;
use App\Models\PosOrder;
use App\Services\Pos\SquareService;
use App\Services\Pos\SpotOnService;
use App\Services\Pos\ToastService;
use App\Services\Pos\PosLavuService;
use App\Services\Pos\DeliverectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PosWebhookController extends Controller
{
    // ── Square ────────────────────────────────────────────────────────────────

    public function square(Request $request): JsonResponse
    {
        $sigKey = config('services.square.webhook_signature_key');
        $sig    = $request->header('x-square-hmacsha256-signature', '');
        $body   = $request->getContent();
        $url    = url('/api/webhooks/pos/square');

        if ($sigKey && !app(SquareService::class)->verifyWebhookSignature($body, $sig, $sigKey, $url)) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $event     = $request->json()->all();
        $eventType = $event['type'] ?? '';

        Log::channel('daily')->info("Square webhook: {$eventType}", ['event' => $event]);

        match (true) {
            $eventType === 'terminal.checkout.updated' => $this->handleSquareCheckoutUpdated(
                $event['data']['object']['checkout'] ?? []
            ),
            $eventType === 'payment.updated' => $this->handleSquarePaymentUpdated(
                $event['data']['object']['payment'] ?? []
            ),
            $eventType === 'order.updated' => $this->handleSquareOrderUpdated(
                $event['data']['object']['order_updated'] ?? []
            ),
            $eventType === 'catalog.version.updated' => $this->handleSquareCatalogUpdated($event),
            default => null,
        };

        return response()->json(['ok' => true]);
    }

    // ── Clover ────────────────────────────────────────────────────────────────

    public function clover(Request $request): JsonResponse
    {
        $event     = $request->json()->all();
        $eventType = $event['type'] ?? '';
        $objType   = $event['objectType'] ?? '';

        Log::channel('daily')->info("Clover webhook: {$eventType}/{$objType}");

        if (in_array($eventType, ['CREATE', 'UPDATE']) && $objType === 'payment') {
            $payment = $event['object']['payment'] ?? [];
            if (($payment['result'] ?? '') === 'SUCCESS') {
                $posOrderId = $payment['order']['id'] ?? null;
                if ($posOrderId) {
                    $posOrder = PosOrder::where('pos_order_id', $posOrderId)->where('provider', 'clover')->first();
                    if ($posOrder) {
                        $posOrder->update([
                            'pos_payment_id' => $payment['id'],
                            'pos_status'     => 'paid',
                            'synced_at'      => now(),
                        ]);
                        Order::where('id', $posOrder->order_id)->update([
                            'payment_status' => 'paid',
                            'payment_method' => 'clover_pos',
                            'paid_at'        => now(),
                        ]);
                    }
                }
            }
        }

        if (in_array($eventType, ['CREATE', 'UPDATE']) && $objType === 'item') {
            $item = $event['object']['item'] ?? [];
            if (!empty($item['id'])) {
                $map = PosCatalogMap::where('provider', 'clover')->where('pos_item_id', $item['id'])->first();
                if ($map) {
                    $price = ($item['price'] ?? 0) / 100;
                    $map->update(['pos_item_name' => $item['name'] ?? $map->pos_item_name, 'pos_item_price' => $price, 'synced_at' => now()]);
                    if ($map->menu_item_id) {
                        MenuItem::where('id', $map->menu_item_id)->update(['name' => $item['name'] ?? null, 'price' => $price]);
                    }
                }
            }
        }

        return response()->json(['ok' => true]);
    }

    // ── Toast ─────────────────────────────────────────────────────────────────

    /**
     * POST /api/webhooks/pos/toast
     * Toast sends HMAC-SHA256 signed events.
     * Key events: ORDER_CREATED, ORDER_UPDATED, PAYMENT_CREATED
     */
    public function toast(Request $request): JsonResponse
    {
        $sigKey = config('services.toast.webhook_secret');
        $sig    = $request->header('toast-signature', '');
        $body   = $request->getContent();

        if ($sigKey && !app(ToastService::class)->verifyWebhookSignature($body, $sig, $sigKey)) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $event     = $request->json()->all();
        $eventType = $event['eventType'] ?? '';

        Log::channel('daily')->info("Toast webhook: {$eventType}", ['event' => $event]);

        match ($eventType) {
            'ORDER_CREATED', 'ORDER_UPDATED' => $this->handleToastOrderUpdated(
                $event['order'] ?? []
            ),
            'PAYMENT_CREATED' => $this->handleToastPaymentCreated(
                $event['payment'] ?? []
            ),
            'MENU_PUBLISHED' => $this->handleToastMenuPublished($event),
            default => null,
        };

        return response()->json(['ok' => true]);
    }

    // ── SpotOn ────────────────────────────────────────────────────────────────

    /**
     * POST /api/webhooks/pos/spoton
     * Events: order.created, order.updated, payment.completed
     */
    public function spotOn(Request $request): JsonResponse
    {
        $sigKey = config('services.spoton.webhook_secret');
        $sig    = $request->header('x-spoton-signature', '');
        $body   = $request->getContent();

        if ($sigKey && !app(SpotOnService::class)->verifyWebhookSignature($body, $sig, $sigKey)) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $event     = $request->json()->all();
        $eventType = $event['type'] ?? $event['event'] ?? '';

        Log::channel('daily')->info("SpotOn webhook: {$eventType}", ['event' => $event]);

        match (true) {
            str_contains($eventType, 'order') => $this->handleSpotOnOrderUpdated($event['data'] ?? []),
            str_contains($eventType, 'payment') => $this->handleSpotOnPaymentCompleted($event['data'] ?? []),
            default => null,
        };

        return response()->json(['ok' => true]);
    }

    // ── POSLavu ───────────────────────────────────────────────────────────────

    /**
     * POST /api/webhooks/pos/poslavu
     * Events: order.created, order.updated, payment.completed, item.updated
     */
    public function posLavu(Request $request): JsonResponse
    {
        $sigKey = config('services.poslavu.webhook_secret');
        $sig    = $request->header('x-poslavu-signature', '');
        $body   = $request->getContent();

        if ($sigKey && !app(PosLavuService::class)->verifyWebhookSignature($body, $sig, $sigKey)) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $event     = $request->json()->all();
        $eventType = $event['event'] ?? $event['type'] ?? '';

        Log::channel('daily')->info("POSLavu webhook: {$eventType}", ['event' => $event]);

        match (true) {
            str_contains($eventType, 'order') => $this->handlePosLavuOrderUpdated($event['data'] ?? []),
            str_contains($eventType, 'payment') => $this->handlePosLavuPaymentCompleted($event['data'] ?? []),
            str_contains($eventType, 'item') => $this->handlePosLavuItemUpdated($event['data'] ?? []),
            default => null,
        };

        return response()->json(['ok' => true]);
    }

    // ── Deliverect ────────────────────────────────────────────────────────────

    /**
     * POST /api/webhooks/pos/deliverect
     * Deliverect sends new orders here when they arrive from delivery channels.
     * Key events: order (new), orderStatusUpdate
     */
    public function deliverect(Request $request): JsonResponse
    {
        $sigKey = config('services.deliverect.webhook_secret');
        $sig    = $request->header('x-deliverect-signature', '');
        $body   = $request->getContent();

        if ($sigKey && !app(DeliverectService::class)->verifyWebhookSignature($body, $sig, $sigKey)) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $event     = $request->json()->all();
        $eventType = $event['type'] ?? $event['eventType'] ?? '';

        Log::channel('daily')->info("Deliverect webhook: {$eventType}", ['event' => $event]);

        match (true) {
            in_array($eventType, ['order', 'ORDER']) => $this->handleDeliverectNewOrder($event),
            in_array($eventType, ['orderStatusUpdate', 'ORDER_STATUS_UPDATE']) => $this->handleDeliverectOrderStatus($event),
            default => null,
        };

        return response()->json(['ok' => true]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Square handlers
    // ══════════════════════════════════════════════════════════════════════════

    private function handleSquareCheckoutUpdated(array $checkout): void
    {
        if (empty($checkout)) return;

        $posOrderId = $checkout['order_id'] ?? null;
        $status     = $checkout['status']   ?? '';

        if (!$posOrderId) return;

        $posOrder = PosOrder::where('pos_order_id', $posOrderId)->where('provider', 'square')->first();
        if (!$posOrder) return;

        $posOrder->update(['pos_status' => $status, 'synced_at' => now()]);

        if ($status === 'COMPLETED') {
            $posOrder->update(['pos_payment_id' => $checkout['payment_ids'][0] ?? null]);
            Order::where('id', $posOrder->order_id)->update([
                'payment_status' => 'paid',
                'payment_method' => 'square_pos',
                'paid_at'        => now(),
            ]);
        }
    }

    private function handleSquarePaymentUpdated(array $payment): void
    {
        if (empty($payment) || ($payment['status'] ?? '') !== 'COMPLETED') return;

        $posOrderId = $payment['order_id'] ?? null;
        if (!$posOrderId) return;

        $posOrder = PosOrder::where('pos_order_id', $posOrderId)->where('provider', 'square')->first();
        if (!$posOrder) return;

        $posOrder->update(['pos_payment_id' => $payment['id'], 'pos_status' => 'COMPLETED', 'synced_at' => now()]);
        Order::where('id', $posOrder->order_id)->update([
            'payment_status' => 'paid',
            'payment_method' => 'square_pos',
            'paid_at'        => now(),
        ]);
    }

    private function handleSquareOrderUpdated(array $updated): void
    {
        $squareOrderId = $updated['order_id'] ?? null;
        if (!$squareOrderId) return;

        $posOrder = PosOrder::where('pos_order_id', $squareOrderId)->where('provider', 'square')->first();
        if ($posOrder) {
            $posOrder->update(['pos_status' => $updated['state'] ?? $posOrder->pos_status, 'synced_at' => now()]);
        }
    }

    private function handleSquareCatalogUpdated(array $event): void
    {
        $merchantId = $event['merchant_id'] ?? null;
        if (!$merchantId) return;

        $conn = PosConnection::where('merchant_id', $merchantId)->where('provider', 'square')->where('is_active', true)->first();
        if (!$conn) return;

        PosCatalogMap::where('business_id', $conn->business_id)->where('provider', 'square')->update(['synced_at' => null]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Toast handlers
    // ══════════════════════════════════════════════════════════════════════════

    private function handleToastOrderUpdated(array $order): void
    {
        $orderGuid = $order['guid'] ?? null;
        if (!$orderGuid) return;

        $posOrder = PosOrder::where('pos_order_id', $orderGuid)->where('provider', 'toast')->first();
        if ($posOrder) {
            $posOrder->update([
                'pos_status' => $order['displayState'] ?? $order['closedDate'] ? 'CLOSED' : 'OPEN',
                'synced_at'  => now(),
            ]);
        }
    }

    private function handleToastPaymentCreated(array $payment): void
    {
        $orderGuid = $payment['orderGuid'] ?? null;
        if (!$orderGuid) return;

        $posOrder = PosOrder::where('pos_order_id', $orderGuid)->where('provider', 'toast')->first();
        if (!$posOrder) return;

        $posOrder->update([
            'pos_payment_id' => $payment['guid'] ?? null,
            'pos_status'     => 'COMPLETED',
            'synced_at'      => now(),
        ]);

        Order::where('id', $posOrder->order_id)->update([
            'payment_status' => 'paid',
            'payment_method' => 'toast_pos',
            'paid_at'        => now(),
        ]);
    }

    private function handleToastMenuPublished(array $event): void
    {
        $restaurantGuid = $event['restaurantGuid'] ?? null;
        if (!$restaurantGuid) return;

        $conn = PosConnection::where('merchant_id', $restaurantGuid)->where('provider', 'toast')->where('is_active', true)->first();
        if ($conn) {
            PosCatalogMap::where('business_id', $conn->business_id)->where('provider', 'toast')->update(['synced_at' => null]);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SpotOn handlers
    // ══════════════════════════════════════════════════════════════════════════

    private function handleSpotOnOrderUpdated(array $order): void
    {
        $orderId = $order['id'] ?? null;
        if (!$orderId) return;

        $posOrder = PosOrder::where('pos_order_id', $orderId)->where('provider', 'spoton')->first();
        if ($posOrder) {
            $posOrder->update(['pos_status' => $order['status'] ?? $posOrder->pos_status, 'synced_at' => now()]);
        }
    }

    private function handleSpotOnPaymentCompleted(array $payment): void
    {
        $orderId = $payment['orderId'] ?? null;
        if (!$orderId) return;

        $posOrder = PosOrder::where('pos_order_id', $orderId)->where('provider', 'spoton')->first();
        if (!$posOrder) return;

        $posOrder->update([
            'pos_payment_id' => $payment['id'] ?? null,
            'pos_status'     => 'completed',
            'synced_at'      => now(),
        ]);

        Order::where('id', $posOrder->order_id)->update([
            'payment_status' => 'paid',
            'payment_method' => 'spoton_pos',
            'paid_at'        => now(),
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POSLavu handlers
    // ══════════════════════════════════════════════════════════════════════════

    private function handlePosLavuOrderUpdated(array $order): void
    {
        $orderId = $order['id'] ?? $order['orderId'] ?? null;
        if (!$orderId) return;

        $posOrder = PosOrder::where('pos_order_id', $orderId)->where('provider', 'poslavu')->first();
        if ($posOrder) {
            $posOrder->update(['pos_status' => $order['status'] ?? $posOrder->pos_status, 'synced_at' => now()]);
        }
    }

    private function handlePosLavuPaymentCompleted(array $payment): void
    {
        $orderId = $payment['orderId'] ?? $payment['order_id'] ?? null;
        if (!$orderId) return;

        $posOrder = PosOrder::where('pos_order_id', $orderId)->where('provider', 'poslavu')->first();
        if (!$posOrder) return;

        $posOrder->update([
            'pos_payment_id' => $payment['id'] ?? null,
            'pos_status'     => 'completed',
            'synced_at'      => now(),
        ]);

        Order::where('id', $posOrder->order_id)->update([
            'payment_status' => 'paid',
            'payment_method' => 'poslavu_pos',
            'paid_at'        => now(),
        ]);
    }

    private function handlePosLavuItemUpdated(array $item): void
    {
        $itemId = $item['id'] ?? $item['itemId'] ?? null;
        if (!$itemId) return;

        $map = PosCatalogMap::where('provider', 'poslavu')->where('pos_item_id', $itemId)->first();
        if (!$map) return;

        $price = (float) ($item['price'] ?? $map->pos_item_price);
        $name  = $item['name'] ?? $item['itemName'] ?? $map->pos_item_name;

        $map->update(['pos_item_name' => $name, 'pos_item_price' => $price, 'synced_at' => now()]);

        if ($map->menu_item_id) {
            MenuItem::where('id', $map->menu_item_id)->update(['name' => $name, 'price' => $price]);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Deliverect handlers
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * A new order arrived from a delivery channel (e.g. Uber Eats, DoorDash).
     * Deliverect routes it here via webhook — we log it in pos_orders.
     */
    private function handleDeliverectNewOrder(array $event): void
    {
        $dlOrder   = $event['order'] ?? $event;
        $dlOrderId = $dlOrder['_id'] ?? $dlOrder['id'] ?? null;
        $accountId = $dlOrder['accountId'] ?? null;

        if (!$dlOrderId || !$accountId) return;

        $conn = PosConnection::where('merchant_id', $accountId)->where('provider', 'deliverect')->where('is_active', true)->first();
        if (!$conn) return;

        // Check if we already have this POS order
        $exists = PosOrder::where('pos_order_id', $dlOrderId)->where('provider', 'deliverect')->exists();
        if ($exists) return;

        // Try to match to a local order via channelOrderId
        $localOrderId = null;
        $channelOrderId = $dlOrder['channelOrderId'] ?? null;
        if ($channelOrderId && str_starts_with($channelOrderId, 'order_')) {
            $localOrderId = (int) substr($channelOrderId, 6);
        }

        PosOrder::create([
            'order_id'     => $localOrderId,
            'provider'     => 'deliverect',
            'pos_order_id' => $dlOrderId,
            'pos_status'   => 'received',
            'synced_at'    => now(),
        ]);

        Log::channel('daily')->info("Deliverect new order received: {$dlOrderId}", ['account' => $accountId]);
    }

    private function handleDeliverectOrderStatus(array $event): void
    {
        $dlOrderId = $event['orderId'] ?? $event['_id'] ?? null;
        $status    = $event['status'] ?? null;

        if (!$dlOrderId || !$status) return;

        $posOrder = PosOrder::where('pos_order_id', $dlOrderId)->where('provider', 'deliverect')->first();
        if (!$posOrder) return;

        // Deliverect status codes: 1=received, 2=accepted, 3=in kitchen, 4=ready, 5=picked up, 6=delivered, 7=cancelled
        $statusMap = [
            1 => 'received',   2 => 'accepted',   3 => 'in_kitchen',
            4 => 'ready',      5 => 'picked_up',  6 => 'delivered',   7 => 'cancelled',
        ];

        $statusLabel = $statusMap[$status] ?? (string) $status;
        $posOrder->update(['pos_status' => $statusLabel, 'synced_at' => now()]);

        // Mark local order paid when delivered
        if ($status === 6 && $posOrder->order_id) {
            Order::where('id', $posOrder->order_id)->update([
                'payment_status' => 'paid',
                'payment_method' => 'deliverect',
                'paid_at'        => now(),
            ]);
        }
    }
}
