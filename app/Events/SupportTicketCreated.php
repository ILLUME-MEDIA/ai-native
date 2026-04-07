<?php

namespace App\Events;

use App\Models\SupportTicket;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast when a new support ticket is created by a user.
 * Admin panel listens on "support.admin" channel to refresh the ticket list.
 *
 * Channel: support.admin
 * Event:   .ticket.created
 */
class SupportTicketCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public SupportTicket $ticket) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('support.admin'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ticket.created';
    }

    public function broadcastWith(): array
    {
        return [
            'ticket_id'     => $this->ticket->id,
            'ticket_number' => $this->ticket->ticket_number,
            'subject'       => $this->ticket->subject,
            'category'      => $this->ticket->category,
            'priority'      => $this->ticket->priority,
            'status'        => $this->ticket->status,
            'unread_admin'  => $this->ticket->unread_admin,
            'created_at'    => $this->ticket->created_at?->toISOString(),
        ];
    }
}
