<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\DeliverySetting;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PlatformOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Instacart Connect API Integration.
 *
 * Webhook URL: POST /api/webhooks/delivery/instacart
 *
 * Instacart sends order webhooks to our endpoint.
 * We create PlatformOrder → admin accepts → we create internal Order.
 * Menu sync can be pushed to Instacart via admin panel.
 */
class InstacartController extends Controller
{
    private const PLATFORM = 'instacart';

    // ── Webhook ───────────────────────────────────────────────────────────────

    /**
     * POST /api/webhooks/delivery/instacart
     */
    public function webhook(Request $request): Response
    {
        $payload   = $request->all();
        $eventType = $payload['event_type'] ?? $payload['type'] ?? null;

        Log::info('[Instacart] Webhook received', ['event' => $eventType]);

        // Verify webhook signature
        $signature = $request->header('X-Instacart-Signature');
        if ($signature && !$this->verifySignature($request->getContent(), $signature, $payload['retailer_id'] ?? null)) {
            Log::warning('[Instacart] Invalid webhook signature');
            return response('Unauthorized', 401);
        }

        match ($eventType) {
            'order.created', 'order.placed'     => $this->handleNewOrder($payload),
            'order.cancelled'                   => $this->handleCancellation($payload),
            'order.updated'                     => $this->handleOrderUpdate($payload),
            'fulfillment.started'               => $this->handleFulfillmentStarted($payload),
            'fulfillment.delivered'             => $this->handleDelivered($payload),
            default => Log::info('[Instacart] Unhandled event: ' . $eventType),
        };

        return response('', 200);
    }

    private function verifySignature(string $body, string $signature, ?string $retailerId): bool
    {
        if (!$retailerId) return true; // Skip if no retailer ID

        $setting = DeliverySetting::where('platform', self::PLATFORM)
            ->where('instacart_retailer_id', $retailerId)
            ->first();

        if (!$setting || !$setting->getWebhookSecretPlain()) return true;

        $expected = hash_hmac('sha256', $body, $setting->getWebhookSecretPlain());
        return hash_equals($expected, $signature);
    }

    private function handleNewOrder(array $payload): void
    {
        try {
            $order      = $payload['order'] ?? $payload;
            $orderId    = $order['id'] ?? $order['order_id'] ?? null;
            $retailerId = $order['retailer_id'] ?? $payload['retailer_id'] ?? null;

            if (!$orderId) return;

            $setting = DeliverySetting::where('platform', self::PLATFORM)
                ->where('instacart_retailer_id', $retailerId)
                ->where('is_enabled', true)
                ->first();

            if (!$setting) {
                Log::warning("[Instacart] No business for retailer_id: {$retailerId}");
                return;
            }

            $items = collect($order['items'] ?? $order['line_items'] ?? [])->map(fn($item) => [
                'platform_item_id' => $item['id'] ?? $item['sku'] ?? null,
                'name'             => $item['name'] ?? $item['product_name'] ?? 'Unknown',
                'quantity'         => $item['quantity'] ?? 1,
                'price'            => (float)($item['unit_price'] ?? $item['price'] ?? 0),
                'notes'            => $item['special_instructions'] ?? null,
            ])->toArray();

            $customer = $order['customer'] ?? $order['user'] ?? [];
            $delivery = $order['delivery_address'] ?? $order['dropoff'] ?? [];

            PlatformOrder::updateOrCreate(
                ['platform' => self::PLATFORM, 'platform_order_id' => $orderId],
                [
                    'business_id'           => $setting->business_id,
                    'platform'              => self::PLATFORM,
                    'platform_order_id'     => $orderId,
                    'platform_order_number' => $order['order_number'] ?? $orderId,
                    'status'                => 'received',
                    'subtotal'              => (float)($order['subtotal'] ?? 0),
                    'tax'                   => (float)($order['tax_total'] ?? 0),
                    'delivery_fee'          => (float)($order['delivery_fee'] ?? 0),
                    'platform_fee'          => (float)($order['commission'] ?? 0),
                    'total'                 => (float)($order['total'] ?? 0),
                    'customer_name'         => ($customer['first_name'] ?? '') . ' ' . ($customer['last_name'] ?? 'Customer'),
                    'customer_phone'        => $customer['phone'] ?? null,
                    'delivery_address'      => $delivery['street_address'] ?? $delivery['address_line_1'] ?? null,
                    'notes'                 => $order['special_instructions'] ?? null,
                    'order_placed_at'       => now(),
                    'prep_time_minutes'     => 25,
                    'raw_payload'           => $payload,
                    'items_payload'         => $items,
                ]
            );

            Log::info("[Instacart] Order {$orderId} saved for business {$setting->business_id}");
        } catch (\Throwable $e) {
            Log::error('[Instacart] handleNewOrder failed: ' . $e->getMessage());
        }
    }

    private function handleCancellation(array $payload): void
    {
        $orderId = $payload['order_id'] ?? $payload['id'] ?? null;
        if (!$orderId) return;

        PlatformOrder::where('platform', self::PLATFORM)
            ->where('platform_order_id', $orderId)
            ->update(['status' => 'cancelled']);
    }

    private function handleOrderUpdate(array $payload): void
    {
        Log::info('[Instacart] Order updated', $payload);
    }

    private function handleFulfillmentStarted(array $payload): void
    {
        $orderId = $payload['order_id'] ?? null;
        if (!$orderId) return;

        PlatformOrder::where('platform', self::PLATFORM)
            ->where('platform_order_id', $orderId)
            ->update(['status' => 'picked_up']);
    }

    private function handleDelivered(array $payload): void
    {
        $orderId = $payload['order_id'] ?? null;
        if (!$orderId) return;

        PlatformOrder::where('platform', self::PLATFORM)
            ->where('platform_order_id', $orderId)
            ->update(['status' => 'delivered']);
    }

    // ── Admin: Manage Instacart orders ────────────────────────────────────────

    public function orders(Request $request): JsonResponse
    {
        $q = PlatformOrder::where('platform', self::PLATFORM)
            ->with(['business', 'order'])
            ->when($request->filled('business_id'), fn($q) => $q->where('business_id', $request->business_id))
            ->when($request->filled('status'),      fn($q) => $q->where('status', $request->status))
            ->latest()
            ->paginate((int)$request->input('per_page', 20));

        return response()->json($q);
    }

    public function accept(Request $request, PlatformOrder $platformOrder): JsonResponse
    {
        if ($platformOrder->platform !== self::PLATFORM) {
            return response()->json(['message' => 'Not an Instacart order.'], 422);
        }
        if ($platformOrder->status !== 'received') {
            return response()->json(['message' => 'Order already processed.'], 422);
        }

        DB::transaction(function () use ($platformOrder) {
            $order = Order::create([
                'order_number'     => 'IC-' . strtoupper(Str::random(8)),
                'business_id'      => $platformOrder->business_id,
                'session_id'       => 'instacart_' . $platformOrder->platform_order_id,
                'status'           => 'confirmed',
                'subtotal'         => $platformOrder->subtotal,
                'tax'              => $platformOrder->tax,
                'delivery_fee'     => $platformOrder->delivery_fee,
                'total'            => $platformOrder->total,
                'customer_name'    => $platformOrder->customer_name,
                'customer_phone'   => $platformOrder->customer_phone,
                'delivery_address' => $platformOrder->delivery_address,
                'notes'            => $platformOrder->notes,
                'order_type'       => 'delivery',
                'delivery_vendor'  => 'instacart',
            ]);

            foreach ($platformOrder->items_payload ?? [] as $item) {
                $menuItem = MenuItem::where('business_id', $platformOrder->business_id)
                    ->where('name', 'like', '%' . ($item['name'] ?? '') . '%')
                    ->first();

                OrderItem::create([
                    'order_id'     => $order->id,
                    'menu_item_id' => $menuItem?->id,
                    'name'         => $item['name'] ?? 'Item',
                    'price'        => $item['price'] ?? 0,
                    'quantity'     => $item['quantity'] ?? 1,
                    'subtotal'     => ($item['price'] ?? 0) * ($item['quantity'] ?? 1),
                    'notes'        => $item['notes'] ?? null,
                ]);
            }

            $platformOrder->update([
                'order_id'    => $order->id,
                'status'      => 'accepted',
                'accepted_at' => now(),
            ]);
        });

        return response()->json([
            'message'        => 'Instacart order accepted.',
            'platform_order' => $platformOrder->fresh('order'),
        ]);
    }

    public function reject(Request $request, PlatformOrder $platformOrder): JsonResponse
    {
        $data = $request->validate(['reason' => 'nullable|string|max:200']);

        $platformOrder->update([
            'status'           => 'rejected',
            'rejected_at'      => now(),
            'rejection_reason' => $data['reason'] ?? 'Rejected by merchant.',
        ]);

        return response()->json(['message' => 'Instacart order rejected.']);
    }

    /**
     * GET /api/delivery/instacart/config
     */
    public function config(): JsonResponse
    {
        return response()->json([
            'webhook_url'  => url('/api/webhooks/delivery/instacart'),
            'setup_steps'  => [
                '1. Log into Instacart Connect Portal (connect.instacart.com)',
                '2. Go to Settings → Integrations → Webhooks',
                '3. Add webhook URL: ' . url('/api/webhooks/delivery/instacart'),
                '4. Copy your Retailer ID and Location ID',
                '5. Enter credentials in Delivery Settings → Instacart',
                '6. Enable the integration',
            ],
            'platform'     => 'instacart',
            'docs_url'     => 'https://docs.connect.instacart.com',
        ]);
    }
}
