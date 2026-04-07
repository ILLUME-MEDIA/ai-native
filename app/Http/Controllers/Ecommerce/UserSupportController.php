<?php

namespace App\Http\Controllers\Ecommerce;

use App\Events\SupportMessageSent;
use App\Events\SupportTicketCreated;
use App\Events\SupportTicketUpdated;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Services\SupportAgentService;
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
    public function __construct(private SupportAgentService $agent) {}

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

        // OTP auth: ticket must belong to this user
        if ($payload) {
            if ($ticket->user_id && ($ticket->user_table !== ($payload['table'] ?? 'users') || (int)$ticket->user_id !== (int)$payload['id'])) {
                return response()->json(['message' => 'Not found.'], 404);
            }
            return null;
        }

        // Session-based: if ticket has order_id, verify session owns that order
        $sid = $this->sessionId($request);
        if ($ticket->order_id) {
            $order = Order::find($ticket->order_id);
            if ($order && $order->session_id && $order->session_id !== $sid) {
                return response()->json(['message' => 'Not found.'], 404);
            }
        }

        // Ticket has no order_id and no user_id — allow access (e.g. site API key)
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

        $headerSid = $request->header('X-Session-Id');

        if ($payload) {
            // OTP user — filter by user_id
            $q->where('user_table', $payload['table'] ?? 'users')
              ->where('user_id', $payload['id']);
        } elseif ($headerSid) {
            // Session-based: show tickets linked to user's orders
            $orderIds = Order::where('session_id', $headerSid)->pluck('id');
            $q->where(fn($s) => $s
                ->whereIn('order_id', $orderIds)
                ->orWhere('session_id', $headerSid)
            );
        }
        // else: no auth (site API key) — return all tickets

        return response()->json($q->paginate((int) $request->get('per_page', 20)));
    }

    /** POST /api/ecommerce/support/tickets */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id'              => 'nullable|integer|exists:orders,id',
            'subject'               => 'required|string|max:200',
            'category'              => 'sometimes|in:general,refund,delivery,quality,other',
            'priority'              => 'sometimes|in:low,medium,high,urgent',
            'message'               => 'nullable|string|max:2000',
            // Structured affected items from the frontend item-picker
            'affected_items'        => 'nullable|array|max:50',
            'affected_items.*.order_item_id' => 'nullable|integer',
            'affected_items.*.menu_item_id'  => 'nullable|integer',
            'affected_items.*.name'          => 'required_with:affected_items|string|max:200',
            'affected_items.*.quantity'      => 'nullable|integer|min:1',
            'affected_items.*.modifiers'     => 'nullable|array',
            'affected_items.*.modifiers.*'   => 'string|max:100',
        ]);

        $payload       = $this->otpPayload($request);
        $affectedItems = $data['affected_items'] ?? null;

        // Auto-build message body from affected_items when message is absent/empty
        $messageBody = $data['message'] ?? null;
        if (empty($messageBody) && ! empty($affectedItems)) {
            $lines = array_map(function ($item) {
                $name  = $item['name'] ?? 'Item';
                $mods  = ! empty($item['modifiers']) ? '(' . implode(', ', $item['modifiers']) . ')' : '';
                $qty   = ($item['quantity'] ?? 1) > 1 ? " x{$item['quantity']}" : '';
                return "- {$name}{$qty}" . ($mods ? " {$mods}" : '');
            }, $affectedItems);

            $messageBody = "Affected items:\n" . implode("\n", $lines);
        }

        if (empty($messageBody)) {
            return response()->json([
                'success' => false,
                'message' => 'Provide a message or select affected items.',
            ], 422);
        }

        // If order_id provided, soft-verify ownership
        $linkedOrderId = $data['order_id'] ?? null;
        $linkedOrder   = null;
        if ($linkedOrderId) {
            $linkedOrder = Order::find($linkedOrderId);
            if ($linkedOrder) {
                $sid = $this->sessionId($request);
                if ($payload) {
                    if (isset($payload['id']) && $linkedOrder->user_id && (int)$linkedOrder->user_id !== (int)$payload['id']) {
                        $linkedOrderId = null;
                        $linkedOrder   = null;
                    }
                } elseif ($linkedOrder->session_id && $linkedOrder->session_id !== $sid) {
                    $linkedOrderId = null;
                    $linkedOrder   = null;
                }
            } else {
                $linkedOrderId = null;
            }
        }

        // Append order number to message if order is linked and message doesn't already include it
        if ($linkedOrder && ! str_contains($messageBody, $linkedOrder->order_number)) {
            $messageBody .= "\n\n" . $linkedOrder->order_number;
        }

        $ticket = SupportTicket::create([
            'order_id'       => $linkedOrderId,
            'user_table'     => $payload['table'] ?? 'users',
            'user_id'        => $payload['id'] ?? null,
            'subject'        => $data['subject'],
            'category'       => $data['category'] ?? 'general',
            'priority'       => $data['priority'] ?? 'medium',
            'affected_items' => $affectedItems,
            'status'         => 'open',
            'unread_admin'   => 1,
        ]);

        SupportMessage::create([
            'ticket_id'   => $ticket->id,
            'sender_type' => 'user',
            'sender_id'   => $payload['id'] ?? null,
            'message'     => $messageBody,
            'is_read'     => false,
        ]);

        // Notify admin panel in real-time that a new ticket arrived
        broadcast(new SupportTicketCreated($ticket->fresh()->load('messages')));

        // Agent auto-responds if admin is offline
        if ($this->agent->shouldAutoRespond($ticket->fresh())) {
            $this->agent->respond($ticket->fresh()->load(['messages', 'order']), $messageBody);
        }

        return response()->json([
            'message' => 'Support ticket created.',
            'ticket'  => $ticket->fresh()->load('messages'),
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

        // Agent auto-responds if admin is offline
        $freshTicket = $ticket->fresh()->load(['messages', 'order']);
        if ($this->agent->shouldAutoRespond($freshTicket)) {
            $this->agent->respond($freshTicket, $data['message']);
        }

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
