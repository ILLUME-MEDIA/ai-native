<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderRefund;
use App\Services\StripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin refund management.
 *
 * GET    /api/admin/refunds              — paginated list + stats
 * GET    /api/admin/refunds/stats        — aggregate stats only
 * POST   /api/admin/refunds              — admin manually creates a refund request
 * GET    /api/admin/refunds/{refund}     — single refund detail (with order items)
 * POST   /api/admin/refunds/{refund}/approve  — approve with refund type + Stripe
 * POST   /api/admin/refunds/{refund}/reject   — reject with admin note
 * POST   /api/admin/refunds/{refund}/process-stripe — manually trigger Stripe for approved
 */
class RefundController extends Controller
{
    public function __construct(private StripeService $stripe) {}

    // ── List ──────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $q = OrderRefund::with([
            'order:id,order_number,total,subtotal,platform_fee,tip,payment_status,stripe_payment_intent_id,customer_name,customer_email,business_id,created_at',
            'order.business:id,name',
        ])->orderByDesc('id');

        if ($request->filled('status'))     $q->where('status', $request->status);
        if ($request->filled('issue_type')) $q->where('issue_type', $request->issue_type);
        if ($request->filled('search')) {
            $q->whereHas('order', fn ($s) => $s
                ->where('order_number', 'like', '%' . $request->search . '%')
                ->orWhere('customer_name',  'like', '%' . $request->search . '%')
                ->orWhere('customer_email', 'like', '%' . $request->search . '%')
            );
        }

        $refunds = $q->paginate((int) $request->get('per_page', 20));

        return response()->json([
            'data'  => $refunds->items(),
            'meta'  => [
                'current_page' => $refunds->currentPage(),
                'last_page'    => $refunds->lastPage(),
                'total'        => $refunds->total(),
                'per_page'     => $refunds->perPage(),
            ],
            'stats' => $this->buildStats(),
        ]);
    }

    public function stats(): JsonResponse
    {
        return response()->json($this->buildStats());
    }

    // ── Admin Create ──────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id'   => 'required|integer|exists:orders,id',
            'issue_type' => 'required|in:wrong_item,missing_item,damaged,late,quality,other',
            'reason'     => 'required|string|max:1000',
            'amount'     => 'required|numeric|min:0.01',
            'admin_note' => 'nullable|string|max:500',
        ]);

        // Prevent duplicate pending refund for same order
        if (OrderRefund::where('order_id', $data['order_id'])->where('status', 'pending')->exists()) {
            return response()->json(['message' => 'A pending refund already exists for this order.'], 422);
        }

        $refund = OrderRefund::create([
            'order_id'   => $data['order_id'],
            'issue_type' => $data['issue_type'],
            'reason'     => $data['reason'],
            'amount'     => $data['amount'],
            'admin_note' => $data['admin_note'] ?? null,
            'status'     => 'pending',
        ]);

        return response()->json([
            'message' => 'Refund request created.',
            'refund'  => $refund->load('order:id,order_number,total,customer_name,customer_email'),
        ], 201);
    }

    public function show(OrderRefund $refund): JsonResponse
    {
        $refund->load(['order.items', 'order.business:id,name']);
        return response()->json($refund);
    }

    // ── Approve ───────────────────────────────────────────────────────────────

    /**
     * Approve with smart refund type resolution.
     *
     * refund_type options:
     *   full         → order.total
     *   platform_fee → order.platform_fee
     *   tip          → order.tip
     *   subtotal     → order.subtotal
     *   partial      → custom amount (required)
     *   items        → sum of selected order items (refund_item_ids required)
     *
     * If order has a stripe_payment_intent_id and process_stripe=true (default),
     * the refund is issued via Stripe immediately and status → 'refunded'.
     * Otherwise status → 'approved' (pending manual processing).
     *
     * Auto-refund OFF logic: admin must explicitly call this endpoint.
     * Nothing happens automatically unless auto_refund setting is enabled.
     */
    public function approve(Request $request, OrderRefund $refund): JsonResponse
    {
        if ($refund->status !== 'pending') {
            return response()->json(['message' => "Cannot approve a refund with status '{$refund->status}'."], 422);
        }

        $data = $request->validate([
            'refund_type'    => 'sometimes|in:full,platform_fee,tip,subtotal,partial,items',
            'refund_item_ids'=> 'required_if:refund_type,items|array',
            'refund_item_ids.*' => 'integer',
            'amount'         => 'required_if:refund_type,partial|nullable|numeric|min:0.01',
            'admin_note'     => 'nullable|string|max:500',
            'process_stripe' => 'boolean',
        ]);

        $order       = $refund->order->load('items');
        $refundType  = $data['refund_type'] ?? 'full';
        $amount      = $this->resolveAmount($refundType, $data, $order);

        if ($amount <= 0) {
            return response()->json(['message' => 'Calculated refund amount is zero. Check order fees/items.'], 422);
        }

        $itemIds      = $data['refund_item_ids'] ?? null;
        $shouldStripe = ($data['process_stripe'] ?? true) && $order->stripe_payment_intent_id;

        if ($shouldStripe) {
            try {
                $amountCents  = (int) round($amount * 100);
                $stripeRefund = $this->stripe->refundPaymentIntent($order->stripe_payment_intent_id, $amountCents);

                $refund->update([
                    'status'           => 'refunded',
                    'refund_type'      => $refundType,
                    'refund_item_ids'  => $itemIds,
                    'amount'           => $amount,
                    'stripe_refund_id' => $stripeRefund->id,
                    'admin_note'       => $data['admin_note'] ?? null,
                    'processed_at'     => now(),
                ]);

                // Update order status based on refund type
                if ($refundType === 'full') {
                    $order->update(['payment_status' => 'refunded', 'status' => 'refunded']);
                } else {
                    // Partial refund — mark payment_status as partially_refunded
                    $order->update(['payment_status' => 'partially_refunded']);
                }

                return response()->json([
                    'message'      => 'Refund approved and processed via Stripe.',
                    'refund_type'  => $refundType,
                    'amount'       => $amount,
                    'refund'       => $refund->fresh()->load('order:id,order_number,payment_status'),
                ]);
            } catch (\Throwable $e) {
                return response()->json(['message' => 'Stripe refund failed: ' . $e->getMessage()], 502);
            }
        }

        // Approve without Stripe — admin will process manually
        $refund->update([
            'status'          => 'approved',
            'refund_type'     => $refundType,
            'refund_item_ids' => $itemIds,
            'amount'          => $amount,
            'admin_note'      => $data['admin_note'] ?? null,
            'processed_at'    => now(),
        ]);

        return response()->json([
            'message'     => 'Refund approved. Process Stripe refund separately if needed.',
            'refund_type' => $refundType,
            'amount'      => $amount,
            'refund'      => $refund->fresh(),
        ]);
    }

    // ── Update Admin Note ─────────────────────────────────────────────────────

    public function updateNote(Request $request, OrderRefund $refund): JsonResponse
    {
        $data = $request->validate(['admin_note' => 'nullable|string|max:500']);
        $refund->update(['admin_note' => $data['admin_note'] ?? null]);
        return response()->json(['message' => 'Note saved.', 'refund' => $refund->fresh()]);
    }

    // ── Reject ────────────────────────────────────────────────────────────────

    public function reject(Request $request, OrderRefund $refund): JsonResponse
    {
        if ($refund->status !== 'pending') {
            return response()->json(['message' => "Cannot reject a refund with status '{$refund->status}'."], 422);
        }

        $data = $request->validate([
            'admin_note' => 'required|string|max:500',
        ]);

        $refund->update([
            'status'       => 'rejected',
            'admin_note'   => $data['admin_note'],
            'processed_at' => now(),
        ]);

        return response()->json(['message' => 'Refund request rejected.', 'refund' => $refund->fresh()]);
    }

    // ── Manual Stripe process ─────────────────────────────────────────────────

    public function processStripe(OrderRefund $refund): JsonResponse
    {
        if ($refund->status !== 'approved') {
            return response()->json(['message' => 'Only approved refunds can be processed.'], 422);
        }

        $order = $refund->order;
        if (! $order->stripe_payment_intent_id) {
            return response()->json(['message' => 'Order has no Stripe payment.'], 422);
        }

        try {
            $amountCents  = (int) round($refund->amount * 100);
            $stripeRefund = $this->stripe->refundPaymentIntent($order->stripe_payment_intent_id, $amountCents);

            $refund->update([
                'status'           => 'refunded',
                'stripe_refund_id' => $stripeRefund->id,
                'processed_at'     => now(),
            ]);

            if ($refund->refund_type === 'full') {
                $order->update(['payment_status' => 'refunded', 'status' => 'refunded']);
            } else {
                $order->update(['payment_status' => 'partially_refunded']);
            }

            return response()->json(['message' => 'Refund processed via Stripe.', 'refund' => $refund->fresh()]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Stripe error: ' . $e->getMessage()], 502);
        }
    }

    // ── Refund amount resolver ────────────────────────────────────────────────

    /**
     * Calculate the refund amount based on type and order data.
     */
    private function resolveAmount(string $type, array $data, Order $order): float
    {
        return match ($type) {
            'full'         => round((float) $order->total,        2),
            'platform_fee' => round((float) $order->platform_fee, 2),
            'tip'          => round((float) $order->tip,          2),
            'subtotal'     => round((float) $order->subtotal,     2),
            'partial'      => round((float) ($data['amount'] ?? 0), 2),
            'items'        => $this->sumItems($order, $data['refund_item_ids'] ?? []),
            default        => round((float) $order->total, 2),
        };
    }

    private function sumItems(Order $order, array $itemIds): float
    {
        return round(
            $order->items
                ->whereIn('id', $itemIds)
                ->sum('subtotal'),
            2
        );
    }

    // ── Stats ─────────────────────────────────────────────────────────────────

    private function buildStats(): array
    {
        $total    = OrderRefund::count();
        $pending  = OrderRefund::where('status', 'pending')->count();
        $approved = OrderRefund::where('status', 'approved')->count();
        $rejected = OrderRefund::where('status', 'rejected')->count();
        $refunded = OrderRefund::where('status', 'refunded')->count();
        $totalAmt = OrderRefund::where('status', 'refunded')->sum('amount');

        return compact('total', 'pending', 'approved', 'rejected', 'refunded', 'totalAmt');
    }
}
