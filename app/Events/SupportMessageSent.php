<?php

namespace App\Events;

use App\Models\SupportMessage;
use App\Models\SupportTicket;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast when a new message is added to a support ticket.
 * Channel: support.ticket.{ticket_id}
 * Both admin and user listen on this channel.
 */
class SupportMessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public SupportTicket  $ticket,
        public SupportMessage $message,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel("support.ticket.{$this->ticket->id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    public function broadcastWith(): array
    {
        return [
            'ticket_id'   => $this->ticket->id,
            'status'      => $this->ticket->status,
            'unread_admin'=> $this->ticket->unread_admin,
            'unread_user' => $this->ticket->unread_user,
            'message'     => [
                'id'          => $this->message->id,
                'ticket_id'   => $this->message->ticket_id,
                'sender_type' => $this->message->sender_type,
                'sender_id'   => $this->message->sender_id,
                'message'     => $this->message->message,
                'is_read'     => $this->message->is_read,
                'created_at'  => $this->message->created_at?->toISOString(),
            ],
        ];
    }
}
