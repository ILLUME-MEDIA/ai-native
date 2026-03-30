<?php

namespace App\Http\Controllers\Admin;

use App\Events\SupportMessageSent;
use App\Events\SupportTicketUpdated;
use App\Http\Controllers\Controller;
use App\Models\SupportMessage;
use App\Models\SupportTicket;
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

        // System message
        SupportMessage::create([
            'ticket_id'   => $ticket->id,
            'sender_type' => 'admin',
            'sender_id'   => auth()->id(),
            'message'     => '✓ Issue resolved: ' . $data['resolution_note'],
            'is_read'     => false,
        ]);

        $ticket->update(['unread_user' => $ticket->unread_user + 1]);

        return response()->json(['message' => 'Ticket resolved.', 'ticket' => $ticket->fresh()]);
    }

    // ── Close ─────────────────────────────────────────────────────────────────

    public function close(SupportTicket $ticket): JsonResponse
    {
        $ticket->update(['status' => 'closed']);
        broadcast(new SupportTicketUpdated($ticket->fresh()))->toOthers();
        return response()->json(['message' => 'Ticket closed.', 'ticket' => $ticket->fresh()]);
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
