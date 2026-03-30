<?php

namespace App\Http\Controllers\Ecommerce;

use App\Events\SupportMessageSent;
use App\Events\SupportTicketUpdated;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\SupportMessage;
use App\Models\SupportTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * User-facing support/issue endpoints (OTP Bearer or session auth).
 *
 * GET  /api/ecommerce/support/tickets              — list my tickets
 * POST /api/ecommerce/support/tickets              — open new ticket
 * GET  /api/ecommerce/support/tickets/{ticket}     — view ticket + messages
 * POST /api/ecommerce/support/tickets/{ticket}/messages — send message
 * POST /api/ecommerce/support/tickets/{ticket}/close    — close ticket
 */
class UserSupportController extends Controller
{
    // ── Auth helpers ──────────────────────────────────────────────────────────

    private function otpPayload(Request $request): ?array
    {
        $auth = $request->header('Authorization', '');
        if (! str_starts_with($auth, 'Bearer ')) return null;
        try {
            $payload = decrypt(substr($auth, 7));
            if (
                isset($payload['type'], $payload['id'], $payload['exp']) &&
                $payload['type'] === 'otp_auth' &&
                ! Carbon::createFromTimestamp($payload['exp'])->isPast()
            ) {
                return $payload;
            }
        } catch (\Throwable) {}
        return null;
    }

    private function sessionId(Request $request): string
    {
        $p = $this->otpPayload($request);
        if ($p) return "otp_{$p['table']}_{$p['id']}";
        return $request->header('X-Session-Id')
            ?? (session()->isStarted() ? session()->getId() : \Illuminate\Support\Str::uuid());
    }

    /** Verify ticket belongs to current user/session */
    private function resolveTicket(Request $request, SupportTicket $ticket): ?JsonResponse
    {
        $payload = $this->otpPayload($request);
        if ($payload) {
            if ($ticket->user_table !== ($payload['table'] ?? 'users') || $ticket->user_id != $payload['id']) {
                return response()->json(['message' => 'Not found.'], 404);
            }
            return null;
        }
        // Session-based: check order session_id
        $sid = $this->sessionId($request);
        if ($ticket->order_id) {
            $order = Order::find($ticket->order_id);
            if (! $order || $order->session_id !== $sid) {
                return response()->json(['message' => 'Not found.'], 404);
            }
        }
        return null;
    }

    // ── Routes ────────────────────────────────────────────────────────────────

    /** GET /api/ecommerce/support/tickets */
    public function index(Request $request): JsonResponse
    {
        $payload = $this->otpPayload($request);

        $q = SupportTicket::with(['latestMessage'])
            ->withCount('messages')
            ->orderByDesc('updated_at');

        if ($payload) {
            $q->where('user_table', $payload['table'] ?? 'users')
              ->where('user_id', $payload['id']);
        } else {
            // Session-based: show tickets linked to user's orders
            $sid      = $this->sessionId($request);
            $orderIds = Order::where('session_id', $sid)->pluck('id');
            $q->whereIn('order_id', $orderIds);
        }

        return response()->json($q->paginate((int) $request->get('per_page', 20)));
    }

    /** POST /api/ecommerce/support/tickets */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id'   => 'nullable|integer|exists:orders,id',
            'subject'    => 'required|string|max:200',
            'category'   => 'sometimes|in:general,refund,delivery,quality,other',
            'priority'   => 'sometimes|in:low,medium,high,urgent',
            'message'    => 'required|string|max:2000',
        ]);

        $payload = $this->otpPayload($request);

        // If order_id provided, verify ownership
        if (! empty($data['order_id'])) {
            $order = Order::findOrFail($data['order_id']);
            $sid   = $this->sessionId($request);
            if ($order->session_id !== $sid) {
                return response()->json(['message' => 'Order not found.'], 404);
            }
        }

        $ticket = SupportTicket::create([
            'order_id'    => $data['order_id'] ?? null,
            'user_table'  => $payload['table'] ?? 'users',
            'user_id'     => $payload['id'] ?? null,
            'subject'     => $data['subject'],
            'category'    => $data['category'] ?? 'general',
            'priority'    => $data['priority'] ?? 'medium',
            'status'      => 'open',
            'unread_admin'=> 1,
        ]);

        // First message
        SupportMessage::create([
            'ticket_id'   => $ticket->id,
            'sender_type' => 'user',
            'sender_id'   => $payload['id'] ?? null,
            'message'     => $data['message'],
            'is_read'     => false,
        ]);

        return response()->json([
            'message' => 'Support ticket created.',
            'ticket'  => $ticket->load('messages'),
        ], 201);
    }

    /** GET /api/ecommerce/support/tickets/{ticket} */
    public function show(Request $request, SupportTicket $ticket): JsonResponse
    {
        if ($err = $this->resolveTicket($request, $ticket)) return $err;

        // Mark admin messages as read
        $ticket->messages()->where('sender_type', 'admin')->where('is_read', false)->update(['is_read' => true]);
        $ticket->update(['unread_user' => 0]);

        return response()->json($ticket->load(['messages', 'order:id,order_number,total,status']));
    }

    /** POST /api/ecommerce/support/tickets/{ticket}/messages */
    public function sendMessage(Request $request, SupportTicket $ticket): JsonResponse
    {
        if ($err = $this->resolveTicket($request, $ticket)) return $err;

        if (in_array($ticket->status, ['resolved', 'closed'])) {
            return response()->json(['message' => 'This ticket is closed. Please open a new ticket.'], 422);
        }

        $data    = $request->validate(['message' => 'required|string|max:2000']);
        $payload = $this->otpPayload($request);

        $msg = SupportMessage::create([
            'ticket_id'   => $ticket->id,
            'sender_type' => 'user',
            'sender_id'   => $payload['id'] ?? null,
            'message'     => $data['message'],
            'is_read'     => false,
        ]);

        $ticket->update([
            'status'       => 'open',
            'unread_admin' => $ticket->unread_admin + 1,
            'updated_at'   => now(),
        ]);

        broadcast(new SupportMessageSent($ticket->fresh(), $msg))->toOthers();

        return response()->json(['message' => 'Message sent.', 'ticket' => $ticket->fresh()->load('messages')]);
    }

    /** POST /api/ecommerce/support/tickets/{ticket}/close */
    public function close(Request $request, SupportTicket $ticket): JsonResponse
    {
        if ($err = $this->resolveTicket($request, $ticket)) return $err;

        $ticket->update(['status' => 'closed']);
        broadcast(new SupportTicketUpdated($ticket->fresh()))->toOthers();

        return response()->json(['message' => 'Ticket closed.', 'ticket' => $ticket->fresh()]);
    }
}
