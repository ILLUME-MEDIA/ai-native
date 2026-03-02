<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\MenuItem;
use App\Models\MenuItemModifierOption;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\StripeCustomer;
use App\Services\DoorDashService;
use App\Services\StripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Stripe\StripeClient;

/**
 * POST /api/ecommerce/checkout
 *
 * Unified single-call checkout endpoint — designed for embedding on external sites.
 *
 * Supports two item sources:
 *   - items[] in body  → external site passes items directly (no session cart needed)
 *   - session cart     → same X-Session-Id / OTP token used for cart
 *
 * Supports two payment methods:
 *   - cod              → Cash on Delivery (no payment processing)
 *   - stripe           → Charge via stripe_payment_method_id OR OTP user's saved card
 */
class CheckoutController extends Controller
{
    public function __construct(private StripeService $stripe) {}

    // ── POST /api/ecommerce/checkout ──────────────────────────────────────────

    public function checkout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id'                    => 'required|integer|exists:businesses,id',

            // Customer info
            'customer_name'                  => 'required|string|max:200',
            'customer_email'                 => 'required|email|max:200',
            'customer_phone'                 => 'required|string|max:30',

            // Order options
            'order_type'                     => 'nullable|in:delivery,pickup,dine_in',
            'delivery_address'               => 'nullable|string|max:500',
            'delivery_vendor'                => 'nullable|string|max:100',
            'delivery_fee'                   => 'nullable|numeric|min:0',
            'tax_rate'                       => 'nullable|numeric|min:0|max:100',
            'notes'                          => 'nullable|string|max:500',

            // Inline items — external site passes these instead of session cart
            'items'                          => 'nullable|array|min:1',
            'items.*.menu_item_id'           => 'required|integer|exists:menu_items,id',
            'items.*.quantity'               => 'nullable|integer|min:1|max:99',
            'items.*.notes'                  => 'nullable|string|max:300',
            'items.*.modifiers'              => 'nullable|array',
            'items.*.modifiers.*.option_id'  => 'required|integer|exists:menu_item_modifier_options,id',
            'items.*.modifiers.*.quantity'   => 'nullable|integer|min:1|max:99',

            // Payment
            'payment_method'                 => 'nullable|in:cod,stripe',
            'stripe_payment_method_id'       => 'nullable|string|starts_with:pm_',
        ]);

        // ── Resolve order line-items ──────────────────────────────────────────

        if (!empty($data['items'])) {
            // External site: items passed directly in the request body
            $lineItems = $this->buildFromPayload($data['items']);
            if (empty($lineItems)) {
                return response()->json(['success' => false, 'message' => 'No valid/active items found.'], 422);
            }
        } else {
            // Session-based: use existing cart (same as POST /ecommerce/orders)
            $sid       = $this->sessionId($request);
            $cartItems = CartItem::where('session_id', $sid)
                ->where('business_id', $data['business_id'])
                ->with('menuItem')
                ->get();

            if ($cartItems->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cart is empty. Pass items[] in the request body or add to cart first.',
                ], 422);
            }

            $lineItems = $this->buildFromCart($cartItems);
        }

        // ── Compute totals ────────────────────────────────────────────────────

        $subtotal    = round(array_sum(array_column($lineItems, 'subtotal')), 2);
        $taxRate     = (float) ($data['tax_rate'] ?? 0);
        $tax         = round($subtotal * ($taxRate / 100), 2);
        $deliveryFee = round((float) ($data['delivery_fee'] ?? 0), 2);
        $total       = round($subtotal + $tax + $deliveryFee, 2);
        $orderType   = $data['order_type'] ?? 'delivery';

        // ── Create order ──────────────────────────────────────────────────────

        $order = Order::create([
            'order_number'       => 'ORD-' . strtoupper(Str::random(8)),
            'business_id'        => $data['business_id'],
            'session_id'         => $this->sessionId($request),
            'user_id'            => auth()->id(),
            'status'             => 'pending',
            'payment_method'     => $data['payment_method'] ?? 'cod',
            'payment_status'     => 'unpaid',
            'subtotal'           => $subtotal,
            'tax'                => $tax,
            'delivery_fee'       => $deliveryFee,
            'total'              => $total,
            'customer_name'      => $data['customer_name'],
            'customer_phone'     => $data['customer_phone'],
            'customer_email'     => $data['customer_email'],
            'delivery_address'   => $data['delivery_address'] ?? null,
            'notes'              => $data['notes'] ?? null,
            'order_type'         => $orderType,
            'item_delivery_type' => $orderType === 'pickup' ? 'pickup' : 'delivery',
            'delivery_vendor'    => $data['delivery_vendor'] ?? null,
        ]);

        foreach ($lineItems as $item) {
            OrderItem::create(array_merge($item, ['order_id' => $order->id]));
        }

        // Clear session cart if it was used
        if (empty($data['items'])) {
            CartItem::where('session_id', $this->sessionId($request))
                ->where('business_id', $data['business_id'])
                ->delete();
        }

        $order->load('business');

        // ── Auto-accept ───────────────────────────────────────────────────────

        if ($order->business?->auto_accept) {
            $order->update(['status' => 'preparing']);
        }

        // ── DoorDash auto-dispatch ────────────────────────────────────────────

        if (($data['delivery_vendor'] ?? '') === 'doordash' && $order->delivery_address) {
            try {
                $delivery = app(DoorDashService::class)->createDelivery($order);
                $order->update([
                    'doordash_delivery_id'  => $delivery['external_delivery_id'] ?? $order->order_number,
                    'doordash_status'       => $delivery['delivery_status'] ?? 'created',
                    'doordash_tracking_url' => $delivery['tracking_url'] ?? null,
                    'tracking_url'          => $delivery['tracking_url'] ?? null,
                    'estimated_delivery_at' => isset($delivery['estimated_delivery_time'])
                        ? Carbon::parse($delivery['estimated_delivery_time']) : null,
                ]);
            } catch (\Throwable $e) {
                Log::warning("DoorDash auto-dispatch failed for {$order->order_number}: {$e->getMessage()}");
            }
        }

        // ── Stripe payment ────────────────────────────────────────────────────

        if (($data['payment_method'] ?? 'cod') === 'stripe') {
            $payResult = $this->processStripe($request, $order, $data['stripe_payment_method_id'] ?? null);
            if ($payResult !== true) {
                // Payment failed — order exists but status is unpaid; return 402
                return $payResult;
            }
        }

        return response()->json([
            'success' => true,
            'order'   => $order->fresh()->load(['business', 'items']),
        ], 201);
    }

    // ── Stripe: charge directly with pm_id OR via OTP saved card ─────────────

    private function processStripe(Request $request, Order $order, ?string $pmId): true|JsonResponse
    {
        $amountCents = (int) round($order->total * 100);

        if ($pmId) {
            // Direct charge with a Stripe payment method (external site / new card)
            try {
                $stripe = new StripeClient(config('services.stripe.secret'));
                $intent = $stripe->paymentIntents->create([
                    'amount'         => $amountCents,
                    'currency'       => 'usd',
                    'payment_method' => $pmId,
                    'description'    => "Order #{$order->order_number}",
                    'confirm'        => true,
                    'off_session'    => true,
                    'return_url'     => config('app.url'),
                    'metadata'       => ['order_number' => $order->order_number],
                ]);

                $order->update([
                    'payment_status'           => $intent->status === 'succeeded' ? 'paid' : 'failed',
                    'payment_method'           => 'stripe_card',
                    'stripe_payment_intent_id' => $intent->id,
                    'paid_at'                  => $intent->status === 'succeeded' ? now() : null,
                ]);

                return true;

            } catch (\Throwable $e) {
                $order->update(['payment_status' => 'failed']);
                return response()->json([
                    'success' => false,
                    'message' => 'Payment failed: ' . $e->getMessage(),
                    'order'   => $order->fresh()->load(['business', 'items']),
                ], 402);
            }
        }

        // No pm_id — try OTP Bearer token → use saved card
        $otpPayload = $this->otpPayload($request);

        if (!$otpPayload) {
            return response()->json([
                'success' => false,
                'message' => 'Stripe payment requires stripe_payment_method_id or OTP Bearer token (for saved card).',
            ], 401);
        }

        $table    = $otpPayload['table'] ?? 'users';
        $userId   = (int) $otpPayload['id'];
        $customer = StripeCustomer::where('user_table', $table)->where('user_id', $userId)->first();

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'No saved card found. Pass stripe_payment_method_id or save a card via POST /payment/stripe/save-method.',
            ], 422);
        }

        try {
            $intent = $this->stripe->charge($customer, $amountCents, 'usd', null, "Order #{$order->order_number}");
            $order->update([
                'payment_status'           => $intent->status === 'succeeded' ? 'paid' : 'failed',
                'payment_method'           => 'stripe_card',
                'stripe_payment_intent_id' => $intent->id,
                'paid_at'                  => $intent->status === 'succeeded' ? now() : null,
            ]);
            return true;

        } catch (\Throwable $e) {
            $order->update(['payment_status' => 'failed']);
            return response()->json([
                'success' => false,
                'message' => 'Payment failed: ' . $e->getMessage(),
                'order'   => $order->fresh()->load(['business', 'items']),
            ], 402);
        }
    }

    // ── Build line-items from inline payload ──────────────────────────────────

    private function buildFromPayload(array $items): array
    {
        $result = [];
        foreach ($items as $item) {
            $menuItem = MenuItem::where('id', $item['menu_item_id'])
                ->where('is_active', true)
                ->first();
            if (!$menuItem) continue;

            $qty       = (int) ($item['quantity'] ?? 1);
            $modifiers = $this->buildModifierSnapshot($item['modifiers'] ?? []);
            // modifier line_total = price_adjustment × modifier.quantity (per item, not per item.quantity)
            $modAdj    = collect($modifiers ?? [])->sum('line_total');
            $price     = round((float) $menuItem->price + $modAdj, 2);

            $result[] = [
                'menu_item_id' => $menuItem->id,
                'name'         => $menuItem->name,
                'price'        => $price,
                'quantity'     => $qty,
                'subtotal'     => round($price * $qty, 2),
                'notes'        => $item['notes'] ?? null,
                'modifiers'    => $modifiers,
            ];
        }
        return $result;
    }

    // ── Build line-items from session cart ────────────────────────────────────

    private function buildFromCart(\Illuminate\Database\Eloquent\Collection $cartItems): array
    {
        return $cartItems->map(function ($ci) {
            $base   = (float) ($ci->menuItem->price ?? 0);
            $modAdj = collect($ci->modifiers ?? [])->sum(
                fn ($m) => ($m['price_adjustment'] ?? 0) * ($m['quantity'] ?? 1)
            );
            $price  = round($base + $modAdj, 2);
            return [
                'menu_item_id' => $ci->menu_item_id,
                'name'         => $ci->menuItem->name,
                'price'        => $price,
                'quantity'     => $ci->quantity,
                'subtotal'     => round($price * $ci->quantity, 2),
                'notes'        => $ci->notes,
                'modifiers'    => $ci->modifiers,
            ];
        })->all();
    }

    // ── Modifier snapshot (same logic as CartController) ─────────────────────

    private function buildModifierSnapshot(array $modifiers): ?array
    {
        if (empty($modifiers)) return null;

        $qtyMap = collect($modifiers)->keyBy('option_id')
            ->map(fn ($m) => (int) ($m['quantity'] ?? 1));

        return MenuItemModifierOption::with('modifierGroup')
            ->whereIn('id', $qtyMap->keys())
            ->where('is_active', true)
            ->get()
            ->map(function ($o) use ($qtyMap) {
                $qty = $qtyMap->get($o->id, 1);
                return [
                    'group_id'         => $o->modifierGroup->id,
                    'group_name'       => $o->modifierGroup->name,
                    'option_id'        => $o->id,
                    'option_name'      => $o->name,
                    'price_adjustment' => $o->price_adjustment,
                    'quantity'         => $qty,
                    'line_total'       => round($o->price_adjustment * $qty, 2),
                ];
            })
            ->values()
            ->all();
    }

    // ── Session & auth helpers ────────────────────────────────────────────────

    protected function sessionId(Request $request): string
    {
        $bearer = $this->extractBearer($request);
        if ($bearer) {
            try {
                $payload = decrypt($bearer);
                if (
                    isset($payload['type'], $payload['id'], $payload['exp']) &&
                    $payload['type'] === 'otp_auth' &&
                    !Carbon::createFromTimestamp($payload['exp'])->isPast()
                ) {
                    return "otp_{$payload['table']}_{$payload['id']}";
                }
            } catch (\Throwable) {}
        }
        return $request->header('X-Session-Id') ?? Str::uuid()->toString();
    }

    private function extractBearer(Request $request): ?string
    {
        $auth = $request->header('Authorization', '');
        return str_starts_with($auth, 'Bearer ') ? substr($auth, 7) : null;
    }

    private function otpPayload(Request $request): ?array
    {
        $bearer = $this->extractBearer($request);
        if (!$bearer) return null;
        try {
            $payload = decrypt($bearer);
            if (
                isset($payload['type'], $payload['id'], $payload['exp']) &&
                $payload['type'] === 'otp_auth' &&
                !Carbon::createFromTimestamp($payload['exp'])->isPast()
            ) {
                return $payload;
            }
        } catch (\Throwable) {}
        return null;
    }
}
