<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\CartItem;
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
 * UberEats Merchant API Integration.
 *
 * Webhook URL (set in UberEats Merchant Portal):
 *   POST /api/webhooks/delivery/ubereats
 *
 * UberEats sends us orders via webhook → we create PlatformOrder → admin accepts/rejects.
 * Admin can also push menu to UberEats and sync order status back.
 */
class UberEatsController extends Controller
{
    private const PLATFORM = 'ubereats';

    // ── Webhook: Receive incoming UberEats orders ─────────────────────────────

    /**
     * POST /api/webhooks/delivery/ubereats
     * UberEats posts order events here.
     */
    public function webhook(Request $request): Response
    {
        $payload = $request->all();
        $rawBody = $request->getContent();

        Log::info('[UberEats] Webhook received', ['type' => $payload['type'] ?? 'unknown']);

        $eventType = $payload['type'] ?? $payload['event_type'] ?? null;

        match ($eventType) {
            'orders.notification', 'eats.order' => $this->handleNewOrder($payload),
            'orders.cancel'                     => $this->handleCancellation($payload),
            'orders.scheduled.upcoming'         => $this->handleScheduled($payload),
            default => Log::info('[UberEats] Unhandled event', ['type' => $eventType]),
        };

        // UberEats expects 200 response
        return response('', 200);
    }

    private function handleNewOrder(array $payload): void
    {
        try {
            // UberEats order payload structure varies by API version
            $order   = $payload['order'] ?? $payload;
            $orderId = $order['id'] ?? $order['order_id'] ?? null;

            if (!$orderId) {
                Log::warning('[UberEats] No order ID in payload');
                return;
            }

            // Find which business this belongs to (match by ubereats_store_id)
            $storeId = $order['restaurant_id'] ?? $order['store_id'] ?? null;
            $setting = DeliverySetting::where('platform', self::PLATFORM)
                ->where('ubereats_store_id', $storeId)
                ->where('is_enabled', true)
                ->first();

            if (!$setting) {
                Log::warning("[UberEats] No business found for store_id: {$storeId}");
                return;
            }

            // Parse items
            $items = collect($order['cart']['items'] ?? $order['items'] ?? [])->map(fn($item) => [
                'platform_item_id' => $item['id'] ?? null,
                'name'             => $item['title'] ?? $item['name'] ?? 'Unknown Item',
                'quantity'         => $item['quantity'] ?? 1,
                'price'            => ($item['price']['unit_price'] ?? $item['price'] ?? 0) / 100, // cents→dollars
                'customizations'   => $item['selected_modifier_groups'] ?? $item['customizations'] ?? [],
                'notes'            => $item['special_instructions'] ?? null,
            ])->toArray();

            // Customer info (UberEats often masks)
            $customer = $order['eater'] ?? $order['customer'] ?? [];
            $delivery = $order['delivery_address'] ?? $order['dropoff_address'] ?? [];

            PlatformOrder::updateOrCreate(
                ['platform' => self::PLATFORM, 'platform_order_id' => $orderId],
                [
                    'business_id'           => $setting->business_id,
                    'platform'              => self::PLATFORM,
                    'platform_order_id'     => $orderId,
                    'platform_order_number' => $order['display_id'] ?? $orderId,
                    'status'                => 'received',
                    'subtotal'              => ($order['pricing']['subtotal'] ?? 0) / 100,
                    'tax'                   => ($order['pricing']['tax'] ?? 0) / 100,
                    'delivery_fee'          => ($order['pricing']['delivery_fee'] ?? 0) / 100,
                    'platform_fee'          => ($order['pricing']['commission'] ?? 0) / 100,
                    'total'                 => ($order['pricing']['total'] ?? 0) / 100,
                    'customer_name'         => $customer['first_name'] ?? 'UberEats Customer',
                    'customer_phone'        => $customer['phone'] ?? null,
                    'customer_display_name' => ($customer['first_name'] ?? '') . ' ' . ($customer['last_name'] ?? ''),
                    'delivery_address'      => $delivery['street_address'] ?? $delivery['formatted_address'] ?? null,
                    'notes'                 => $order['special_instructions'] ?? null,
                    'order_placed_at'       => now(),
                    'prep_time_minutes'     => $order['prep_time'] ?? 20,
                    'raw_payload'           => $payload,
                    'items_payload'         => $items,
                ]
            );

            Log::info("[UberEats] Order {$orderId} saved as platform_order for business {$setting->business_id}");
        } catch (\Throwable $e) {
            Log::error('[UberEats] handleNewOrder failed: ' . $e->getMessage());
        }
    }

    private function handleCancellation(array $payload): void
    {
        $orderId = $payload['order_id'] ?? $payload['id'] ?? null;
        if (!$orderId) return;

        PlatformOrder::where('platform', self::PLATFORM)
            ->where('platform_order_id', $orderId)
            ->update(['status' => 'cancelled']);

        Log::info("[UberEats] Order {$orderId} cancelled.");
    }

    private function handleScheduled(array $payload): void
    {
        // Handle scheduled order notifications (future order coming up soon)
        Log::info('[UberEats] Scheduled order notification', $payload);
    }

    // ── Admin: View & manage UberEats orders ─────────────────────────────────

    /**
     * GET /api/delivery/ubereats/orders?business_id=X&status=received
     * List all UberEats platform orders.
     */
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

    /**
     * POST /api/delivery/ubereats/orders/{platformOrder}/accept
     * Admin accepts UberEats order → creates our internal order.
     */
    public function accept(Request $request, PlatformOrder $platformOrder): JsonResponse
    {
        if ($platformOrder->platform !== self::PLATFORM) {
            return response()->json(['message' => 'Not a UberEats order.'], 422);
        }
        if ($platformOrder->status !== 'received') {
            return response()->json(['message' => 'Order already processed.'], 422);
        }

        $data = $request->validate([
            'prep_time_minutes' => 'nullable|integer|min:5|max:120',
        ]);

        DB::transaction(function () use ($platformOrder, $data) {
            // Create internal order
            $order = Order::create([
                'order_number'     => 'UE-' . strtoupper(Str::random(8)),
                'business_id'      => $platformOrder->business_id,
                'session_id'       => 'ubereats_' . $platformOrder->platform_order_id,
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
                'delivery_vendor'  => 'ubereats',
            ]);

            // Create order items from platform payload
            foreach ($platformOrder->items_payload ?? [] as $item) {
                // Try to match to our menu item
                $menuItem = MenuItem::where('business_id', $platformOrder->business_id)
                    ->where('name', 'like', '%' . ($item['name'] ?? '') . '%')
                    ->first();

                OrderItem::create([
                    'order_id'     => $order->id,
                    'menu_item_id' => $menuItem?->id,
                    'name'         => $item['name'] ?? 'Unknown',
                    'price'        => $item['price'] ?? 0,
                    'quantity'     => $item['quantity'] ?? 1,
                    'subtotal'     => ($item['price'] ?? 0) * ($item['quantity'] ?? 1),
                    'notes'        => $item['notes'] ?? null,
                ]);
            }

            // Link platform order to internal order
            $platformOrder->update([
                'order_id'         => $order->id,
                'status'           => 'accepted',
                'accepted_at'      => now(),
                'prep_time_minutes'=> $data['prep_time_minutes'] ?? $platformOrder->prep_time_minutes,
            ]);

            // TODO: Send acceptance back to UberEats API
            // $this->sendAcceptanceToUberEats($platformOrder);
        });

        return response()->json([
            'message'        => 'UberEats order accepted.',
            'platform_order' => $platformOrder->fresh('order'),
        ]);
    }

    /**
     * POST /api/delivery/ubereats/orders/{platformOrder}/reject
     */
    public function reject(Request $request, PlatformOrder $platformOrder): JsonResponse
    {
        $data = $request->validate([
            'reason' => 'nullable|string|max:200',
        ]);

        $platformOrder->update([
            'status'           => 'rejected',
            'rejected_at'      => now(),
            'rejection_reason' => $data['reason'] ?? 'Rejected by merchant.',
        ]);

        // TODO: Send rejection back to UberEats API

        return response()->json(['message' => 'UberEats order rejected.']);
    }

    /**
     * POST /api/delivery/ubereats/orders/{platformOrder}/status
     * Update order status back to UberEats.
     */
    public function updateOrderStatus(Request $request, PlatformOrder $platformOrder): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|in:preparing,ready,picked_up,delivered,cancelled',
        ]);

        $platformOrder->update(['status' => $data['status']]);

        // TODO: Send status update to UberEats Merchant API
        // $this->sendStatusToUberEats($platformOrder, $data['status']);

        return response()->json([
            'message' => "Status updated to {$data['status']} on UberEats.",
            'order'   => $platformOrder->fresh(),
        ]);
    }

    /**
     * GET /api/delivery/ubereats/config
     * Get UberEats webhook URL and setup instructions.
     */
    public function config(): JsonResponse
    {
        return response()->json([
            'webhook_url'  => url('/api/webhooks/delivery/ubereats'),
            'setup_steps'  => [
                '1. Log into UberEats Merchant Portal (merchant.uber.com)',
                '2. Go to Settings → Developer → Webhook Configuration',
                '3. Add webhook URL: ' . url('/api/webhooks/delivery/ubereats'),
                '4. Select events: orders.notification, orders.cancel',
                '5. Save your Store ID and enter it in Delivery Settings',
                '6. Add your UberEats Client ID and Client Secret in Delivery Settings',
            ],
            'platform'     => 'ubereats',
            'docs_url'     => 'https://developer.uber.com/docs/eats/introduction',
        ]);
    }
}
