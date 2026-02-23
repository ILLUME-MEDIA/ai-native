<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\DoorDashService;
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
        $q = Order::with(['business', 'items'])->orderByDesc('id');
        if ($request->filled('business_id')) $q->where('business_id', $request->business_id);
        if ($request->filled('status'))      $q->where('status', $request->status);
        if ($request->filled('session_id'))  $q->where('session_id', $request->session_id);
        return response()->json($q->paginate(20));
    }

    public function show(Order $order): JsonResponse
    {
        return response()->json($order->load(['business', 'items']));
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
        $cartItems = CartItem::where('session_id', $sid)
            ->where('business_id', $data['business_id'])
            ->with('menuItem')
            ->get();

        if ($cartItems->isEmpty()) {
            return response()->json(['message' => 'Cart is empty for this business.'], 422);
        }

        $subtotal     = round($cartItems->sum(fn ($ci) => ($ci->menuItem->price ?? 0) * $ci->quantity), 2);
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
            OrderItem::create([
                'order_id'     => $order->id,
                'menu_item_id' => $ci->menu_item_id,
                'name'         => $ci->menuItem->name,
                'price'        => $ci->menuItem->price,
                'quantity'     => $ci->quantity,
                'subtotal'     => round($ci->menuItem->price * $ci->quantity, 2),
                'notes'        => $ci->notes,
            ]);
        }

        CartItem::where('session_id', $sid)->where('business_id', $data['business_id'])->delete();

        $order->load('business');

        // ── Auto-accept: confirm + set preparing immediately ─────────────────
        if ($order->business?->auto_accept) {
            $order->update(['status' => 'preparing']);
        }

        // ── Auto-dispatch DoorDash delivery ──────────────────────────────────
        if (($data['delivery_vendor'] ?? '') === 'doordash' && $order->delivery_address) {
            try {
                $doorDash = app(DoorDashService::class);
                $delivery = $doorDash->createDelivery($order);
                $order->update([
                    'doordash_delivery_id'  => $delivery['external_delivery_id'] ?? $order->order_number,
                    'doordash_status'       => $delivery['delivery_status'] ?? 'created',
                    'doordash_tracking_url' => $delivery['tracking_url'] ?? null,
                ]);
            } catch (\Throwable $e) {
                // Don't fail the order — log the error and let admin manually dispatch
                Log::warning("DoorDash auto-dispatch failed for {$order->order_number}: {$e->getMessage()}");
            }
        }

        return response()->json($order->fresh()->load(['business', 'items']), 201);
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|in:pending,confirmed,preparing,ready,out_for_delivery,delivered,cancelled',
        ]);
        $order->update($data);
        return response()->json($order->load(['business', 'items']));
    }
}
