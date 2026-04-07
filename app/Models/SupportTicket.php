<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class SupportTicket extends Model
{
    protected $fillable = [
        'order_id', 'user_table', 'user_id',
        'ticket_number', 'subject', 'category',
        'status', 'priority',
        'affected_items',
        'agent_handled', 'refund_intent_count',
        'resolution_note', 'resolved_at',
        'unread_admin', 'unread_user',
    ];

    protected $casts = [
        'resolved_at'        => 'datetime',
        'unread_admin'       => 'integer',
        'unread_user'        => 'integer',
        'affected_items'     => 'array',
        'agent_handled'      => 'boolean',
        'refund_intent_count'=> 'integer',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function (self $ticket) {
            if (! $ticket->ticket_number) {
                $ticket->ticket_number = 'TKT-' . strtoupper(Str::random(6));
            }
        });
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportMessage::class, 'ticket_id')->orderBy('created_at');
    }

    public function latestMessage(): HasMany
    {
        return $this->hasMany(SupportMessage::class, 'ticket_id')->latest()->limit(1);
    }
}
