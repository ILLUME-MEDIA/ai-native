<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\PosCatalogMap;
use App\Models\PosConnection;
use App\Models\PosOrder;
use App\Services\Pos\SquareService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PosWebhookController extends Controller
{
    // ── Square webhooks ───────────────────────────────────────────────────────

    public function square(Request $request): JsonResponse
    {
        $sigKey  = config('services.square.webhook_signature_key');
        $sig     = $request->header('x-square-hmacsha256-signature', '');
        $body    = $request->getContent();
        $url     = url('/api/webhooks/pos/square');

        if ($sigKey && !app(SquareService::class)->verifyWebhookSignature($body, $sig, $sigKey, $url)) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $event     = $request->json()->all();
        $eventType = $event['type'] ?? '';

        Log::channel('daily')->info("Square webhook: {$eventType}", ['event' => $event]);

        match (true) {
            // ── Terminal checkout completed / updated ────────────────────────
            $eventType === 'terminal.checkout.updated' => $this->handleSquareCheckoutUpdated(
                $event['data']['object']['checkout'] ?? []
            ),

            // ── Payment completed ────────────────────────────────────────────
            $eventType === 'payment.updated' => $this->handleSquarePaymentUpdated(
                $event['data']['object']['payment'] ?? []
            ),

            // ── Order updated ────────────────────────────────────────────────
            $eventType === 'order.updated' => $this->handleSquareOrderUpdated(
                $event['data']['object']['order_updated'] ?? []
            ),

            // ── Catalog updated in Square — refresh cache ────────────────────
            $eventType === 'catalog.version.updated' => $this->handleSquareCatalogUpdated($event),

            default => null,
        };

        return response()->json(['ok' => true]);
    }

    // ── Clover webhooks ───────────────────────────────────────────────────────

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
                    $posOrder = PosOrder::where('pos_order_id', $posOrderId)
                                       ->where('provider', 'clover')
                                       ->first();
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

        // Clover item created/updated in POS — update our cached price
        if (in_array($eventType, ['CREATE', 'UPDATE']) && $objType === 'item') {
            $item = $event['object']['item'] ?? [];
            if (!empty($item['id'])) {
                $map = PosCatalogMap::where('provider', 'clover')
                                    ->where('pos_item_id', $item['id'])
                                    ->first();

                if ($map) {
                    $price = ($item['price'] ?? 0) / 100;
                    $map->update(['pos_item_name' => $item['name'] ?? $map->pos_item_name, 'pos_item_price' => $price, 'synced_at' => now()]);

                    if ($map->menu_item_id) {
                        MenuItem::where('id', $map->menu_item_id)->update([
                            'name'  => $item['name'] ?? null,
                            'price' => $price,
                        ]);
                    }
                }
            }
        }

        return response()->json(['ok' => true]);
    }

    // ── Square handlers ───────────────────────────────────────────────────────

    private function handleSquareCheckoutUpdated(array $checkout): void
    {
        if (empty($checkout)) return;

        $posOrderId = $checkout['order_id'] ?? null;
        $status     = $checkout['status']   ?? '';

        if (!$posOrderId) return;

        $posOrder = PosOrder::where('pos_order_id', $posOrderId)
                            ->where('provider', 'square')
                            ->first();

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
        // Update cached prices from Square catalog version change
        $merchantId = $event['merchant_id'] ?? null;
        if (!$merchantId) return;

        $conn = PosConnection::where('merchant_id', $merchantId)
                             ->where('provider', 'square')
                             ->where('is_active', true)
                             ->first();

        if (!$conn) return;

        // Mark all maps as stale so next push/pull will refresh them
        PosCatalogMap::where('business_id', $conn->business_id)
                     ->where('provider', 'square')
                     ->update(['synced_at' => null]);
    }
}
