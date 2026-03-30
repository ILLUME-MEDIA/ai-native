<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\EcommerceSetting;
use App\Models\Order;
use App\Models\OrderRefund;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * User-facing refund endpoints (OTP Bearer auth).
 *
 * POST /api/ecommerce/my-orders/{order}/refund-request — submit a refund request
 * GET  /api/ecommerce/my-orders/{order}/refund         — get refund status for an order
 * GET  /api/ecommerce/my-refunds                       — list all my refund requests
 */
class UserRefundController extends Controller
{
    // ── OTP Auth helper ───────────────────────────────────────────────────────

    private function otpPayload(Request $request): ?array
    {
        $auth = $request->header('Authorization', '');
        if (! str_starts_with($auth, 'Bearer ')) {
            return null;
        }
        try {
            $payload = decrypt(substr($auth, 7));
            if (
                isset($payload['type'], $payload['id'], $payload['exp']) &&
                $payload['type'] === 'otp_auth' &&
                ! Carbon::createFromTimestamp($payload['exp'])->isPast()
            ) {
                return $payload;
            }
        } catch (\Throwable) {
        }
        return null;
    }

    /** Session ID resolution — mirrors OrderController logic */
    private function sessionId(Request $request): string
    {
        $payload = $this->otpPayload($request);
        if ($payload) {
            $table = $payload['table'] ?? 'users';
            return "otp_{$table}_{$payload['id']}";
        }
        return $request->header('X-Session-Id')
            ?? (session()->isStarted() ? session()->getId() : \Illuminate\Support\Str::uuid());
    }

    /** Verify the order belongs to the current session / OTP user */
    private function resolveMyOrder(Request $request, Order $order): ?JsonResponse
    {
        $payload = $this->otpPayload($request);

        // OTP auth — verify via user_id if set on order
        if ($payload) {
            if ($order->user_id && (int)$order->user_id !== (int)$payload['id']) {
                return response()->json(['message' => 'Order not found.'], 404);
            }
            return null;
        }

        // X-Session-Id provided — verify session
        $headerSid = $request->header('X-Session-Id');
        if ($headerSid) {
            if ($order->session_id && $order->session_id !== $headerSid) {
                return response()->json(['message' => 'Order not found.'], 404);
            }
            return null;
        }

        // No auth at all (site API key / open call) — allow through
        return null;
    }

    // ── Routes ────────────────────────────────────────────────────────────────

    /**
     * POST /api/ecommerce/my-orders/{order}/refund-request
     *
     * Submit a refund request for an order the user owns.
     * Checks the refund window setting; auto-processes via Stripe if enabled.
     */
    public function requestRefund(Request $request, Order $order): JsonResponse
    {
        if ($err = $this->resolveMyOrder($request, $order)) {
            return $err;
        }

        // Must be paid
        if ($order->payment_status !== 'paid') {
            return response()->json(['message' => 'Only paid orders can be refunded.'], 422);
        }

        // No duplicate pending/approved request
        $existing = $order->refunds()
            ->whereIn('status', ['pending', 'approved', 'refunded'])
            ->first();
        if ($existing) {
            return response()->json([
                'message' => 'A refund request already exists for this order.',
                'refund'  => $existing,
            ], 409);
        }

        // Refund window check
        $windowHours = (int) (EcommerceSetting::where('key', 'refund_window_hours')->value('value') ?? 24);
        if ($windowHours > 0 && $order->created_at->lt(now()->subHours($windowHours))) {
            return response()->json([
                'message' => "Refund requests must be submitted within {$windowHours} hours of placing the order.",
            ], 422);
        }

        $data = $request->validate([
            'issue_type' => 'required|in:wrong_item,missing_item,damaged,late,quality,other',
            'reason'     => 'required|string|max:1000',
            'amount'     => 'nullable|numeric|min:0.01|max:' . $order->total,
        ]);

        $otpPayload = $this->otpPayload($request);

        $refund = OrderRefund::create([
            'order_id'   => $order->id,
            'user_table' => $otpPayload['table'] ?? 'users',
            'user_id'    => $otpPayload['id'] ?? null,
            'amount'     => $data['amount'] ?? $order->total,
            'issue_type' => $data['issue_type'],
            'reason'     => $data['reason'],
            'status'     => 'pending',
        ]);

        // Auto-refund via Stripe if enabled
        $autoEnabled = filter_var(
            EcommerceSetting::where('key', 'refund_auto_enabled')->value('value'),
            FILTER_VALIDATE_BOOLEAN
        );

        if ($autoEnabled && $order->stripe_payment_intent_id) {
            try {
                $stripe      = app(\App\Services\StripeService::class);
                $amountCents = (int) round($refund->amount * 100);
                $stripeRefund = $stripe->refundPaymentIntent($order->stripe_payment_intent_id, $amountCents);

                $refund->update([
                    'status'           => 'refunded',
                    'stripe_refund_id' => $stripeRefund->id,
                    'auto_refunded'    => true,
                    'processed_at'     => now(),
                ]);

                $order->update(['payment_status' => 'refunded', 'status' => 'refunded']);

                return response()->json([
                    'message' => 'Your refund has been automatically processed.',
                    'refund'  => $refund->fresh(),
                ], 201);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Auto-refund failed order#{$order->id}: " . $e->getMessage());
                // Fall through — keep status as pending for manual review
            }
        }

        return response()->json([
            'message' => 'Refund request submitted. Our team will review it shortly.',
            'refund'  => $refund,
        ], 201);
    }

    /**
     * GET /api/ecommerce/my-orders/{order}/refund
     *
     * Get refund status for a specific order.
     */
    public function orderRefundStatus(Request $request, Order $order): JsonResponse
    {
        if ($err = $this->resolveMyOrder($request, $order)) {
            return $err;
        }

        $refund = $order->refunds()->latest()->first();

        return response()->json([
            'order_number' => $order->order_number,
            'refund'       => $refund,
        ]);
    }

    /**
     * GET /api/ecommerce/my-refunds
     *
     * All refund requests submitted by the current session/user.
     */
    public function myRefunds(Request $request): JsonResponse
    {
        $payload   = $this->otpPayload($request);
        $headerSid = $request->header('X-Session-Id');

        $q = OrderRefund::with('order:id,order_number,total,created_at,business_id')
            ->orderByDesc('id');

        if ($payload) {
            // OTP user — filter by user_id
            $q->where('user_id', $payload['id'])->where('user_table', $payload['table'] ?? 'users');
        } elseif ($headerSid) {
            // Session user — filter via orders
            $orderIds = Order::where('session_id', $headerSid)->pluck('id');
            $q->whereIn('order_id', $orderIds);
        }
        // else: no filter (site API key) — returns all, admin use case

        return response()->json($q->paginate((int) $request->get('per_page', 20)));
    }
}
