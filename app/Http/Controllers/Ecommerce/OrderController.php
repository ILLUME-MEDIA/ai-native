<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PosConnection;
use App\Models\PosOrder;
use App\Services\DoorDashService;
use App\Services\Pos\CloverService;
use App\Services\Pos\SquareService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /**
     * Resolve session ID — same logic as CartController.
     *
     * Priority:
     *  1. OTP Bearer token → "otp_{table}_{id}"  (user-bound, device-independent)
     *  2. X-Session-Id header (anonymous UUID)
     *  3. Laravel cookie session
     */
    protected function sessionId(Request $request): string
    {
        $bearer = $this->extractBearer($request);

        if ($bearer) {
            try {
                $payload = decrypt($bearer);

                if (
                    isset($payload['type'], $payload['id'], $payload['exp']) &&
                    $payload['type'] === 'otp_auth' &&
                    ! Carbon::createFromTimestamp($payload['exp'])->isPast()
                ) {
                    $table = $payload['table'] ?? 'users';
                    return "otp_{$table}_{$payload['id']}";
                }
            } catch (\Throwable) {
                // Invalid token — fall through
            }
        }

        return $request->header('X-Session-Id')
            ?? (session()->isStarted() ? session()->getId() : Str::uuid());
    }

    private function extractBearer(Request $request): ?string
    {
        $auth = $request->header('Authorization', '');
        return str_starts_with($auth, 'Bearer ')
            ? substr($auth, 7)
            : null;
    }

    public function index(Request $request): JsonResponse
    {
        $q = Order::with(['business', 'items', 'posOrders'])->orderByDesc('id');
        if ($request->filled('business_id')) $q->where('business_id', $request->business_id);
        if ($request->filled('status'))      $q->where('status', $request->status);
        if ($request->filled('session_id'))  $q->where('session_id', $request->session_id);
        return response()->json($q->paginate((int) $request->get('per_page', 20)));
    }

    public function show(Order $order): JsonResponse
    {
        $order->load(['business', 'items', 'assignedDriver', 'currentAssignment.driver', 'platformOrder']);

        // Enrich with live DoorDash tracking if available
        $tracking = null;
        if ($order->doordash_delivery_id) {
            $tracking = [
                'vendor'       => 'doordash',
                'delivery_id'  => $order->doordash_delivery_id,
                'status'       => $order->doordash_status,
                'status_label' => \App\Services\DoorDashService::statusLabel($order->doordash_status ?? ''),
                'tracking_url' => $order->doordash_tracking_url,
            ];
        } elseif ($order->tracking_url) {
            $tracking = [
                'vendor'       => $order->delivery_vendor,
                'tracking_url' => $order->tracking_url,
                'status'       => $order->driver_status,
            ];
        }

        $data = $order->toArray();
        $data['tracking'] = $tracking;

        return response()->json($data);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id'      => 'required|exists:businesses,id',
            'customer_name'    => 'nullable|string|max:200',
            'customer_phone'   => 'nullable|string|max:30',
            'customer_email'   => 'nullable|email|max:200',
            'delivery_address' => 'nullable|string',
            'notes'            => 'nullable|string',
            'order_type'          => 'in:delivery,pickup,dine_in',
            'item_delivery_type'  => 'in:pickup,delivery',
            'delivery_vendor'     => 'nullable|string|max:100',
            'tax_rate'            => 'numeric|min:0|max:100',
            'delivery_fee'        => 'nullable|numeric|min:0',
        ]);

        $sid       = $this->sessionId($request);

        Log::info('ORDER::store sessionId', [
            'sid'        => $sid,
            'header_sid' => $request->header('X-Session-Id'),
            'auth_header'=> $request->header('Authorization') ? substr($request->header('Authorization'), 0, 20).'...' : null,
            'business_id'=> $data['business_id'],
            'all_cart_sids' => CartItem::where('business_id', $data['business_id'])->pluck('session_id')->unique()->values(),
        ]);

        $cartItems = CartItem::where('session_id', $sid)
            ->where('business_id', $data['business_id'])
            ->with('menuItem')
            ->get();

        if ($cartItems->isEmpty()) {
            return response()->json(['message' => 'Cart is empty for this business.'], 422);
        }

        $subtotal     = round($cartItems->sum(function ($ci) {
            $base   = $ci->menuItem->price ?? 0;
            $modAdj = collect($ci->modifiers ?? [])->sum('price_adjustment');
            return ($base + $modAdj) * $ci->quantity;
        }), 2);
        $taxRate      = (float) ($data['tax_rate'] ?? 0);
        $tax          = round($subtotal * ($taxRate / 100), 2);
        $deliveryFee  = round((float) ($data['delivery_fee'] ?? 0), 2);
        $total        = round($subtotal + $tax + $deliveryFee, 2);

        $order = Order::create([
            'order_number'     => 'ORD-' . strtoupper(Str::random(8)),
            'business_id'      => $data['business_id'],
            'session_id'       => $sid,
            'user_id'          => auth()->id(),
            'status'           => 'pending',
            'subtotal'         => $subtotal,
            'tax'              => $tax,
            'delivery_fee'     => $deliveryFee,
            'total'            => $total,
            'customer_name'    => $data['customer_name'] ?? null,
            'customer_phone'   => $data['customer_phone'] ?? null,
            'customer_email'   => $data['customer_email'] ?? null,
            'delivery_address' => $data['delivery_address'] ?? null,
            'notes'               => $data['notes'] ?? null,
            'order_type'          => $data['order_type'] ?? 'delivery',
            'item_delivery_type'  => $data['item_delivery_type'] ?? 'delivery',
            'delivery_vendor'     => $data['delivery_vendor'] ?? null,
        ]);

        foreach ($cartItems as $ci) {
            $itemPrice = ($ci->menuItem->price ?? 0) + collect($ci->modifiers ?? [])->sum('price_adjustment');
            OrderItem::create([
                'order_id'     => $order->id,
                'menu_item_id' => $ci->menu_item_id,
                'name'         => $ci->menuItem->name,
                'price'        => round($itemPrice, 2),
                'quantity'     => $ci->quantity,
                'subtotal'     => round($itemPrice * $ci->quantity, 2),
                'notes'        => $ci->notes,
                'modifiers'    => $ci->modifiers,
            ]);
        }

        // Clear cart — also cover guest cart (X-Session-Id) if user checked out with OTP token
        $sidsToDelete = [$sid];
        $headerSid = $request->header('X-Session-Id');
        if ($headerSid && $headerSid !== $sid) {
            $sidsToDelete[] = $headerSid;
        }
        CartItem::whereIn('session_id', $sidsToDelete)->where('business_id', $data['business_id'])->delete();

        $order->load(['business', 'items']);

        // ── Auto-sync to POS (Square / Clover) ───────────────────────────────
        $this->syncOrderToPos($order);

        // ── Auto-accept: set preparing immediately ────────────────────────────
        if ($order->business?->auto_accept) {
            $order->update(['status' => 'preparing']);
        }

        // ── Auto-dispatch: only when status is 'preparing' (auto_accept triggered) ──
        // Manual preparing triggers dispatch via updateStatus() instead.
        if ($order->delivery_address && $order->fresh()->status === 'preparing') {
            $this->dispatchDeliveryVendor($order->fresh());
        }

        return response()->json($order->fresh()->load(['business', 'items']), 201);
    }

    /**
     * Extract OTP payload from Bearer token (without expiry enforcement).
     * Returns the payload array or null if token is absent/invalid.
     */
    private function otpPayload(Request $request): ?array
    {
        $bearer = $this->extractBearer($request);
        if (!$bearer) return null;

        try {
            $payload = decrypt($bearer);
            if (
                isset($payload['type'], $payload['id'], $payload['exp']) &&
                $payload['type'] === 'otp_auth'
            ) {
                return $payload;
            }
        } catch (\Throwable) {}

        return null;
    }

    /**
     * Resolve the OTP user's phone and email from DB so we can match
     * orders placed as guest (no email, or different session).
     * Returns ['email' => ..., 'phone' => ...] or null.
     */
    private function otpUserContacts(array $otp): ?array
    {
        $table = $otp['table'] ?? 'users';
        $id    = $otp['id'];

        try {
            $record = \DB::table($table)->where('id', $id)->first(['email', 'phone']);
            if (!$record) return null;

            return [
                'email' => $record->email ?? null,
                'phone' => $record->phone ?? null,
            ];
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * GET /api/ecommerce/my-orders
     * Returns paginated orders scoped to the current session.
     */
    public function myOrders(Request $request): JsonResponse
    {
        $sid      = $this->sessionId($request);
        $otp      = $this->otpPayload($request);
        $otpSid   = $otp ? 'otp_' . ($otp['table'] ?? 'users') . '_' . $otp['id'] : null;
        $contacts = $otp ? $this->otpUserContacts($otp) : null;

        $q = Order::with(['business', 'items'])
            ->where(function ($query) use ($sid, $otpSid, $contacts) {
                $query->where('session_id', $sid);
                if ($otpSid && $otpSid !== $sid) {
                    $query->orWhere('session_id', $otpSid);
                }
                if (!empty($contacts['email'])) {
                    $query->orWhere('customer_email', $contacts['email']);
                }
                if (!empty($contacts['phone'])) {
                    $query->orWhere('customer_phone', $contacts['phone']);
                }
            })
            ->orderByDesc('id');

        if ($request->filled('status')) {
            $q->where('status', $request->status);
        }

        return response()->json($q->paginate((int) $request->get('per_page', 20)));
    }

    /**
     * GET /api/ecommerce/my-orders/{order}
     * Returns a single order — only if it belongs to the current session.
     */
    public function myOrderShow(Request $request, Order $order): JsonResponse
    {
        $sid      = $this->sessionId($request);
        $otp      = $this->otpPayload($request);
        $otpSid   = $otp ? 'otp_' . ($otp['table'] ?? 'users') . '_' . $otp['id'] : null;
        $contacts = $otp ? $this->otpUserContacts($otp) : null;

        $belongs = $order->session_id === $sid
            || ($otpSid && $order->session_id === $otpSid)
            || (!empty($contacts['email']) && $order->customer_email === $contacts['email'])
            || (!empty($contacts['phone']) && $order->customer_phone === $contacts['phone']);

        if (!$belongs) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $order->load(['business', 'items']);

        $tracking = null;
        if ($order->doordash_delivery_id) {
            $tracking = [
                'vendor'       => 'doordash',
                'delivery_id'  => $order->doordash_delivery_id,
                'status'       => $order->doordash_status,
                'status_label' => \App\Services\DoorDashService::statusLabel($order->doordash_status ?? ''),
                'tracking_url' => $order->doordash_tracking_url,
            ];
        } elseif ($order->tracking_url) {
            $tracking = [
                'vendor'       => $order->delivery_vendor,
                'tracking_url' => $order->tracking_url,
                'status'       => $order->driver_status,
            ];
        }

        $data = $order->toArray();
        $data['tracking'] = $tracking;

        return response()->json($data);
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|in:pending,confirmed,preparing,ready,out_for_delivery,delivered,cancelled',
        ]);

        $previousStatus = $order->status;
        $order->update($data);

        // ── Auto-dispatch delivery vendor when status becomes 'preparing' ───
        // Triggers for DoorDash or Uber Direct, any previous status, only if
        // not yet dispatched.
        if ($data['status'] === 'preparing' && $order->delivery_address) {
            $this->dispatchDeliveryVendor($order->load('business'));
        }

        return response()->json($order->fresh()->load(['business', 'items', 'assignedDriver']));
    }

    // ── POS auto-sync ─────────────────────────────────────────────────────────

    /**
     * Silently push the new order to any active POS (Square / Clover) for this business.
     * Errors are caught and logged — never fail the order response.
     */
    private function syncOrderToPos(Order $order): void
    {
        try {
            $connections = PosConnection::where('business_id', $order->business_id)
                ->where('is_active', true)
                ->get();

            foreach ($connections as $conn) {
                // Skip if already synced for this provider
                if (PosOrder::where('order_id', $order->id)->where('provider', $conn->provider)->exists()) {
                    continue;
                }

                $conn->ensureAccessToken();
                $token = $conn->decryptedAccessToken();

                if ($conn->provider === 'square') {
                    $lineItems = $order->items->map(fn ($item) => array_filter([
                        'name'             => $item->name,
                        'quantity'         => (string) $item->quantity,
                        'base_price_money' => ['amount' => (int) round($item->price * 100), 'currency' => 'USD'],
                        'note'             => $item->notes ?: null,
                    ], fn ($v) => $v !== null))->all();

                    $sq = app(SquareService::class)->createOrder(
                        $token,
                        $conn->location_id,
                        $lineItems,
                        ['local_order_id' => (string) $order->id]
                    );

                    PosOrder::create([
                        'order_id'     => $order->id,
                        'provider'     => 'square',
                        'pos_order_id' => $sq['id'],
                        'pos_status'   => $sq['state'] ?? 'OPEN',
                        'synced_at'    => now(),
                    ]);

                    Log::info("POS Square synced for {$order->order_number}: {$sq['id']}");

                } elseif ($conn->provider === 'clover') {
                    $clover = app(CloverService::class);
                    $co     = $clover->createOrder($token, $conn->merchant_id);

                    foreach ($order->items as $item) {
                        $clover->addLineItem($token, $conn->merchant_id, $co['id'], [
                            'name'    => $item->name,
                            'price'   => (int) round($item->price * 100),
                            'unitQty' => $item->quantity * 1000,
                            'note'    => $item->notes ?? '',
                        ]);
                    }

                    PosOrder::create([
                        'order_id'     => $order->id,
                        'provider'     => 'clover',
                        'pos_order_id' => $co['id'],
                        'pos_status'   => 'open',
                        'synced_at'    => now(),
                    ]);

                    Log::info("POS Clover synced for {$order->order_number}: {$co['id']}");
                }
            }
        } catch (\Throwable $e) {
            Log::error("POS auto-sync failed for {$order->order_number}: {$e->getMessage()}");
        }
    }

    // ── Delivery dispatch helper ──────────────────────────────────────────────

    /**
     * Auto-dispatch to the selected delivery vendor (DoorDash or Uber Direct).
     * Called on order creation and whenever status becomes 'preparing'.
     * Only dispatches if the vendor is supported AND no delivery is active yet.
     * Errors are logged but never fail the order.
     */
    private function dispatchDeliveryVendor(Order $order): void
    {
        $vendor = $order->delivery_vendor;

        if (!$vendor || !$order->delivery_address) {
            return;
        }

        // ── DoorDash ──────────────────────────────────────────────────────────
        if ($vendor === 'doordash' && !$order->doordash_delivery_id) {
            try {
                $doorDash = app(DoorDashService::class);
                $delivery = $doorDash->createDelivery($order->load(['business', 'items']));

                // v1 Classic: `status` (not `delivery_status`), `delivery_tracking_url` (not `tracking_url`)
                $order->update([
                    'doordash_delivery_id'  => $delivery['id'] ?? $delivery['external_delivery_id'] ?? $order->order_number,
                    'doordash_status'       => $delivery['status'] ?? 'scheduled',
                    'doordash_tracking_url' => $delivery['delivery_tracking_url'] ?? null,
                    'tracking_url'          => $delivery['delivery_tracking_url'] ?? null,
                    'estimated_delivery_at' => isset($delivery['estimated_delivery_time'])
                        ? Carbon::parse($delivery['estimated_delivery_time']) : null,
                ]);

                Log::info("DoorDash dispatched for {$order->order_number}: id={$order->doordash_delivery_id}");
            } catch (\Throwable $e) {
                Log::error("DoorDash dispatch FAILED for {$order->order_number}: {$e->getMessage()}", [
                    'order_id'         => $order->id,
                    'delivery_address' => $order->delivery_address,
                    'business_id'      => $order->business_id,
                ]);
            }
            return;
        }

        // ── Uber Direct ───────────────────────────────────────────────────────
        if ($vendor === 'uber_direct' && !$order->uber_direct_delivery_id) {
            try {
                $uber     = app(\App\Services\UberDirectService::class);
                $delivery = $uber->createDelivery($order->load(['business', 'items']));

                $order->update([
                    'uber_direct_delivery_id'  => $delivery['id'],
                    'uber_direct_status'       => $delivery['status'] ?? 'pending',
                    'uber_direct_tracking_url' => $delivery['tracking_url'] ?? null,
                    'uber_direct_fee'          => $delivery['fee'] ?? null,
                    'tracking_url'             => $delivery['tracking_url'] ?? $order->tracking_url,
                    'estimated_delivery_at'    => isset($delivery['dropoff']['eta'])
                        ? Carbon::parse($delivery['dropoff']['eta']) : null,
                ]);

                Log::info("Uber Direct dispatched for {$order->order_number}: id={$order->uber_direct_delivery_id}");
            } catch (\Throwable $e) {
                Log::error("Uber Direct dispatch FAILED for {$order->order_number}: {$e->getMessage()}", [
                    'order_id'         => $order->id,
                    'delivery_address' => $order->delivery_address,
                    'business_id'      => $order->business_id,
                ]);
            }
            return;
        }
    }
}
