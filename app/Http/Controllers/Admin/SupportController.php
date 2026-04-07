<?php

namespace App\Http\Controllers\Admin;

use App\Events\SupportMessageSent;
use App\Events\SupportTicketUpdated;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderRefund;
use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Services\StripeService;
use App\Services\SupportAgentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin support ticket management.
 *
 * GET    /api/admin/support/tickets                           — paginated list + stats
 * GET    /api/admin/support/tickets/stats                     — counts only
 * GET    /api/admin/support/tickets/{ticket}                  — full ticket + messages
 * POST   /api/admin/support/tickets/{ticket}/reply            — admin sends message
 * PATCH  /api/admin/support/tickets/{ticket}/status           — change status/priority
 * POST   /api/admin/support/tickets/{ticket}/resolve          — mark resolved with note
 * POST   /api/admin/support/tickets/{ticket}/close            — close ticket
 */
class SupportController extends Controller
{
    public function __construct(
        private StripeService $stripe,
        private SupportAgentService $agent,
    ) {}

    // ── Admin availability (controls AI agent) ────────────────────────────────

    /** GET /api/admin/support/availability */
    public function getAvailability(): JsonResponse
    {
        return response()->json(['online' => $this->agent->isAdminOnline()]);
    }

    /** POST /api/admin/support/availability  { online: true|false } */
    public function setAvailability(Request $request): JsonResponse
    {
        $data = $request->validate(['online' => 'required|boolean']);
        $this->agent->setAdminOnline($data['online']);
        return response()->json([
            'online'  => $data['online'],
            'message' => $data['online'] ? 'You are now online. AI agent is paused.' : 'You are offline. AI agent will auto-respond.',
        ]);
    }

    // ── List ──────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $q = SupportTicket::with(['order:id,order_number,total', 'latestMessage'])
            ->withCount('messages')
            ->orderByDesc('updated_at');

        if ($request->filled('status'))   $q->where('status', $request->status);
        if ($request->filled('priority')) $q->where('priority', $request->priority);
        if ($request->filled('category')) $q->where('category', $request->category);
        if ($request->filled('search')) {
            $q->where(fn ($s) => $s
                ->where('subject', 'like', '%' . $request->search . '%')
                ->orWhere('ticket_number', 'like', '%' . $request->search . '%')
                ->orWhereHas('order', fn ($o) => $o
                    ->where('order_number', 'like', '%' . $request->search . '%')
                    ->orWhere('customer_name',  'like', '%' . $request->search . '%')
                    ->orWhere('customer_email', 'like', '%' . $request->search . '%')
                )
            );
        }

        $tickets = $q->paginate((int) $request->get('per_page', 20));

        return response()->json([
            'data'  => $tickets->items(),
            'meta'  => [
                'current_page' => $tickets->currentPage(),
                'last_page'    => $tickets->lastPage(),
                'total'        => $tickets->total(),
                'per_page'     => $tickets->perPage(),
            ],
            'stats' => $this->buildStats(),
        ]);
    }

    public function stats(): JsonResponse
    {
        return response()->json($this->buildStats());
    }

    // ── Single ticket ─────────────────────────────────────────────────────────

    public function show(SupportTicket $ticket): JsonResponse
    {
        // Mark user messages as read by admin
        $ticket->messages()->where('sender_type', 'user')->where('is_read', false)->update(['is_read' => true]);
        $ticket->update(['unread_admin' => 0]);

        return response()->json($ticket->load(['messages', 'order:id,order_number,total,status,customer_name,customer_email']));
    }

    // ── Admin reply ───────────────────────────────────────────────────────────

    public function reply(Request $request, SupportTicket $ticket): JsonResponse
    {
        $data = $request->validate(['message' => 'required|string|max:2000']);

        if ($ticket->status === 'open') {
            $ticket->update(['status' => 'in_progress']);
        }

        $msg = SupportMessage::create([
            'ticket_id'   => $ticket->id,
            'sender_type' => 'admin',
            'sender_id'   => auth()->id(),
            'message'     => $data['message'],
            'is_read'     => false,
        ]);

        $ticket->update([
            'unread_user' => $ticket->unread_user + 1,
            'updated_at'  => now(),
        ]);

        broadcast(new SupportMessageSent($ticket->fresh(), $msg))->toOthers();

        return response()->json([
            'message' => 'Reply sent.',
            'ticket'  => $ticket->fresh()->load('messages'),
        ]);
    }

    // ── Status / priority change ──────────────────────────────────────────────

    public function updateStatus(Request $request, SupportTicket $ticket): JsonResponse
    {
        $data = $request->validate([
            'status'   => 'sometimes|in:open,in_progress,resolved,closed',
            'priority' => 'sometimes|in:low,medium,high,urgent',
        ]);

        $ticket->update($data);

        broadcast(new SupportTicketUpdated($ticket->fresh()));

        return response()->json(['message' => 'Ticket updated.', 'ticket' => $ticket->fresh()]);
    }

    // ── Resolve ───────────────────────────────────────────────────────────────

    public function resolve(Request $request, SupportTicket $ticket): JsonResponse
    {
        $data = $request->validate(['resolution_note' => 'required|string|max:1000']);

        $ticket->update([
            'status'          => 'resolved',
            'resolution_note' => $data['resolution_note'],
            'resolved_at'     => now(),
        ]);

        // System message in chat so user sees resolution note
        $sysMsg = SupportMessage::create([
            'ticket_id'   => $ticket->id,
            'sender_type' => 'admin',
            'sender_id'   => auth()->id(),
            'message'     => '✓ Issue resolved: ' . $data['resolution_note'],
            'is_read'     => false,
        ]);

        $ticket->update(['unread_user' => $ticket->unread_user + 1]);

        // Broadcast resolution to user frontend in real-time
        broadcast(new SupportMessageSent($ticket->fresh(), $sysMsg));
        broadcast(new SupportTicketUpdated($ticket->fresh()));

        return response()->json(['message' => 'Ticket resolved.', 'ticket' => $ticket->fresh()->load('messages')]);
    }

    // ── Close ─────────────────────────────────────────────────────────────────

    public function close(SupportTicket $ticket): JsonResponse
    {
        $ticket->update(['status' => 'closed']);
        broadcast(new SupportTicketUpdated($ticket->fresh()))->toOthers();
        return response()->json(['message' => 'Ticket closed.', 'ticket' => $ticket->fresh()]);
    }

    // ── Refund + Resolve (single action from chat) ────────────────────────────

    /**
     * POST /api/admin/support/tickets/{ticket}/refund-and-resolve
     *
     * Creates/updates an OrderRefund, processes it via Stripe (optional),
     * then resolves the ticket with a system message. All in one request.
     *
     * Body:
     *   refund_type     — full|partial|platform_fee|tip|subtotal|items
     *   amount          — required for partial
     *   refund_item_ids — required for items
     *   resolution_note — required (shown in chat + stored on ticket)
     *   process_stripe  — boolean (default true) — attempt Stripe charge immediately
     *   admin_note      — optional internal note
     */
    public function refundAndResolve(Request $request, SupportTicket $ticket): JsonResponse
    {
        if (in_array($ticket->status, ['resolved', 'closed'])) {
            return response()->json(['message' => 'Ticket is already resolved/closed.'], 422);
        }
        if (! $ticket->order_id) {
            return response()->json(['message' => 'No order is linked to this ticket.'], 422);
        }

        $data = $request->validate([
            'refund_type'        => 'required|in:full,partial,platform_fee,tip,subtotal,items',
            'refund_item_ids'    => 'required_if:refund_type,items|array',
            'refund_item_ids.*'  => 'integer',
            'amount'             => 'required_if:refund_type,partial|nullable|numeric|min:0.01',
            'resolution_note'    => 'required|string|max:1000',
            'process_stripe'     => 'sometimes|boolean',
            'admin_note'         => 'nullable|string|max:500',
        ]);

        $order = Order::with('items')->findOrFail($ticket->order_id);

        // Resolve amount based on type
        $refundType = $data['refund_type'];
        $amount = match ($refundType) {
            'full'         => round((float) $order->total,        2),
            'platform_fee' => round((float) $order->platform_fee, 2),
            'tip'          => round((float) $order->tip,          2),
            'subtotal'     => round((float) $order->subtotal,     2),
            'partial'      => round((float) ($data['amount'] ?? 0), 2),
            'items'        => round($order->items->whereIn('id', $data['refund_item_ids'] ?? [])->sum('subtotal'), 2),
            default        => round((float) $order->total,        2),
        };

        if ($amount <= 0) {
            return response()->json(['message' => 'Calculated refund amount is zero.'], 422);
        }

        // Create refund record (skip if one already exists for this order)
        $refund = OrderRefund::firstOrCreate(
            ['order_id' => $order->id, 'status' => 'pending'],
            [
                'issue_type'  => 'other',
                'reason'      => $ticket->subject,
                'amount'      => $amount,
                'refund_type' => $refundType,
            ]
        );

        // Update amounts/type even if it existed
        $refund->update([
            'refund_type'     => $refundType,
            'refund_item_ids' => $data['refund_item_ids'] ?? null,
            'amount'          => $amount,
            'admin_note'      => $data['admin_note'] ?? null,
        ]);

        // Attempt Stripe refund
        $refundStatus   = 'approved';
        $stripeRefundId = null;
        $shouldStripe   = ($data['process_stripe'] ?? true) && $order->stripe_payment_intent_id;

        if ($shouldStripe) {
            try {
                $stripeResult   = $this->stripe->refundPaymentIntent($order->stripe_payment_intent_id, (int) round($amount * 100));
                $refundStatus   = 'refunded';
                $stripeRefundId = $stripeResult->id;

                $order->update($refundType === 'full'
                    ? ['payment_status' => 'refunded', 'status' => 'refunded']
                    : ['payment_status' => 'partially_refunded']
                );
            } catch (\Throwable $e) {
                return response()->json(['message' => 'Stripe refund failed: ' . $e->getMessage()], 502);
            }
        }

        $refund->update([
            'status'           => $refundStatus,
            'stripe_refund_id' => $stripeRefundId,
            'processed_at'     => now(),
        ]);

        // Resolve ticket
        $ticket->update([
            'status'          => 'resolved',
            'resolution_note' => $data['resolution_note'],
            'resolved_at'     => now(),
        ]);

        // System message with refund summary
        $stripeNote = $stripeRefundId
            ? " — processed via Stripe (#{$stripeRefundId})"
            : ' — manual processing required';
        $sysMsgText = implode("\n", [
            '✓ Refund ' . $refundStatus . ': $' . number_format($amount, 2) . ' (' . $refundType . ')' . $stripeNote . '.',
            '',
            $data['resolution_note'],
        ]);

        $sysMsg = SupportMessage::create([
            'ticket_id'   => $ticket->id,
            'sender_type' => 'admin',
            'sender_id'   => auth()->id(),
            'message'     => $sysMsgText,
            'is_read'     => false,
        ]);

        $ticket->update(['unread_user' => $ticket->unread_user + 1]);

        // Push to user frontend in real-time
        broadcast(new SupportMessageSent($ticket->fresh(), $sysMsg));
        broadcast(new SupportTicketUpdated($ticket->fresh()));

        return response()->json([
            'message' => 'Refund ' . $refundStatus . ' and ticket resolved.',
            'refund'  => $refund->fresh()->load('order:id,order_number,total,payment_status'),
            'ticket'  => $ticket->fresh()->load('messages'),
        ]);
    }

    // ── Stats ─────────────────────────────────────────────────────────────────

    private function buildStats(): array
    {
        return [
            'total'       => SupportTicket::count(),
            'open'        => SupportTicket::where('status', 'open')->count(),
            'in_progress' => SupportTicket::where('status', 'in_progress')->count(),
            'resolved'    => SupportTicket::where('status', 'resolved')->count(),
            'closed'      => SupportTicket::where('status', 'closed')->count(),
            'unread'      => SupportTicket::where('unread_admin', '>', 0)->count(),
        ];
    }
}
