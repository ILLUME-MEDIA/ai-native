<?php

namespace App\Services;

use App\Events\SupportMessageSent;
use App\Models\AIEndpoint;
use App\Models\OrderRefund;
use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Services\AI\AIProviderFactory;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * SupportAgentService
 * -------------------
 * AI-powered support agent using Claude (Haiku model — fast + low cost).
 *
 * Flow:
 *   1. Admin marks themselves offline  → isAdminOnline() = false
 *   2. User sends message              → UserSupportController calls shouldAutoRespond()
 *   3. Agent responds via Claude       → stores message with sender_type='agent'
 *   4. If refund intent detected:
 *      - First time  → acknowledge + increment refund_intent_count
 *      - Repeat      → create OrderRefund (pending), notify admin via broadcast
 *   5. Admin comes online → marks available → handles pending tickets
 */
class SupportAgentService
{
    private const CACHE_KEY      = 'support_admin_online';
    private const ONLINE_TTL_HRS = 8;

    // ── Admin availability ────────────────────────────────────────────────────

    public function isAdminOnline(): bool
    {
        return (bool) Cache::get(self::CACHE_KEY, false);
    }

    public function setAdminOnline(bool $online): void
    {
        if ($online) {
            Cache::put(self::CACHE_KEY, true, now()->addHours(self::ONLINE_TTL_HRS));
        } else {
            Cache::forget(self::CACHE_KEY);
        }
    }

    /** Should the agent auto-respond to this ticket? */
    public function shouldAutoRespond(SupportTicket $ticket): bool
    {
        // Don't respond to resolved/closed tickets
        if (in_array($ticket->status, ['resolved', 'closed'])) return false;
        // Don't respond if admin is online (they'll handle it)
        return ! $this->isAdminOnline();
    }

    // ── Main agent response ───────────────────────────────────────────────────

    /**
     * Generate and store an agent reply. Returns the stored SupportMessage or null on failure.
     */
    public function respond(SupportTicket $ticket, string $latestUserMessage): ?SupportMessage
    {
        // Resolve AI endpoint from DB — prefer anthropic, then any active endpoint
        $endpoint = AIEndpoint::where('is_active', true)
            ->orderByRaw("FIELD(provider,'anthropic','openai','mistral','google') ASC")
            ->first();

        if (! $endpoint) {
            Log::warning('SupportAgent: No active AI endpoint found in DB. Add one at /admin/ai/endpoints.');
            return null;
        }

        try {
            $adapter  = AIProviderFactory::make($endpoint);
            $messages = $this->buildMessages($ticket, $latestUserMessage);

            // Prepend system prompt as a system role message (AIProviderFactory handles Anthropic's system separation)
            $payload = array_merge(
                [['role' => 'system', 'content' => $this->systemPrompt($ticket)]],
                $messages
            );

            $result = $adapter->generateTextWithTools($payload, []);
            $raw    = $result['text'] ?? '';
            $parsed = $this->parseResponse($raw);

            $agentText = $parsed['message'] ?? $raw;
            $action    = $parsed['action']  ?? null;

            // Store agent message in conversation
            $msg = SupportMessage::create([
                'ticket_id'   => $ticket->id,
                'sender_type' => 'agent',
                'sender_id'   => null,
                'message'     => $agentText,
                'is_read'     => false,
            ]);

            // Track refund intents
            $refundIntentCount = $ticket->refund_intent_count ?? 0;
            if (in_array($action, ['refund_intent', 'request_refund'])) {
                $refundIntentCount++;
            }

            // Escalate to admin if user keeps requesting refund
            if ($action === 'request_refund' && $ticket->order_id) {
                $this->escalateRefund($ticket);
            }

            $ticket->update([
                'agent_handled'       => true,
                'refund_intent_count' => $refundIntentCount,
                'unread_user'         => $ticket->unread_user + 1,
                'updated_at'          => now(),
            ]);

            // Push agent reply to user via Pusher
            broadcast(new SupportMessageSent($ticket->fresh(), $msg));

            return $msg;

        } catch (\Throwable $e) {
            Log::error('SupportAgent exception: ' . $e->getMessage());
            return null;
        }
    }

    // ── Build Claude conversation messages ────────────────────────────────────

    private function buildMessages(SupportTicket $ticket, string $latestUserMessage): array
    {
        $history = $ticket->messages()
            ->orderBy('created_at')
            ->get();

        $messages = [];
        foreach ($history as $msg) {
            // Map agent → assistant, admin → assistant, user → user
            $role      = $msg->sender_type === 'user' ? 'user' : 'assistant';
            $messages[] = ['role' => $role, 'content' => $msg->message];
        }

        // Append latest message if not already there
        if (empty($messages) || end($messages)['content'] !== $latestUserMessage) {
            $messages[] = ['role' => 'user', 'content' => $latestUserMessage];
        }

        return $this->normalizeMessages($messages);
    }

    /**
     * Claude requires strictly alternating user/assistant roles.
     * Merge consecutive same-role messages and ensure starts with 'user'.
     */
    private function normalizeMessages(array $messages): array
    {
        $out  = [];
        foreach ($messages as $msg) {
            if (! empty($out) && $out[array_key_last($out)]['role'] === $msg['role']) {
                $out[array_key_last($out)]['content'] .= "\n\n" . $msg['content'];
            } else {
                $out[] = $msg;
            }
        }
        if (empty($out) || $out[0]['role'] !== 'user') {
            array_unshift($out, ['role' => 'user', 'content' => '(start of conversation)']);
        }
        return $out;
    }

    // ── System prompt ─────────────────────────────────────────────────────────

    private function systemPrompt(SupportTicket $ticket): string
    {
        $order = '';
        if ($ticket->order) {
            $o     = $ticket->order;
            $order = "\nLinked Order: #{$o->order_number} | Total: \${$o->total} | Status: {$o->status}";
        }

        $items = '';
        if (! empty($ticket->affected_items)) {
            $lines = collect($ticket->affected_items)->map(fn($i) =>
                '- ' . ($i['name'] ?? 'item') .
                (! empty($i['modifiers']) ? ' (' . implode(', ', $i['modifiers']) . ')' : '') .
                (($i['quantity'] ?? 1) > 1 ? ' x' . $i['quantity'] : '')
            )->implode("\n");
            $items = "\nCustomer-reported affected items:\n{$lines}";
        }

        $refundCount = $ticket->refund_intent_count ?? 0;

        return <<<PROMPT
You are a helpful customer support assistant for an online ordering platform.
Human support agents are currently offline. You are handling support temporarily.

Ticket context:
- Ticket: #{$ticket->ticket_number}
- Subject: {$ticket->subject}
- Category: {$ticket->category}
- Priority: {$ticket->priority}{$order}{$items}
- Times customer mentioned refund so far: {$refundCount}

Your rules:
1. Be empathetic, professional, and concise (max 3 sentences).
2. For order/delivery questions: acknowledge and provide what info you can from context.
3. First refund request: express understanding, confirm you're logging it for a human agent to review.
4. If refund_count >= 1 (customer already requested once): escalate — set action to "request_refund".
5. Never promise specific refund amounts or processing times.
6. Always end by mentioning a human agent will follow up when available.

Respond ONLY with valid JSON — no extra text:
{"message": "your reply", "action": null}
{"message": "your reply", "action": "refund_intent"}
{"message": "your reply", "action": "request_refund"}
PROMPT;
    }

    // ── Parse Claude's JSON response ──────────────────────────────────────────

    private function parseResponse(string $text): array
    {
        $text = trim($text);
        $text = preg_replace('/^```(?:json)?\s*/i', '', $text);
        $text = preg_replace('/\s*```$/i', '', $text);

        $decoded = json_decode(trim($text), true);
        if (is_array($decoded) && isset($decoded['message'])) {
            return $decoded;
        }
        return ['message' => $text, 'action' => null];
    }

    // ── Escalate refund to admin ──────────────────────────────────────────────

    private function escalateRefund(SupportTicket $ticket): void
    {
        // Skip if refund already pending/approved
        $exists = OrderRefund::where('order_id', $ticket->order_id)
            ->whereIn('status', ['pending', 'approved', 'refunded'])
            ->exists();
        if ($exists) return;

        OrderRefund::create([
            'order_id'   => $ticket->order_id,
            'issue_type' => 'other',
            'reason'     => "Agent-escalated refund | Ticket #{$ticket->ticket_number}: {$ticket->subject}",
            'amount'     => (float) ($ticket->order?->total ?? 0),
            'status'     => 'pending',
            'admin_note' => 'Auto-created by support agent after repeated refund request. Awaiting admin approval.',
        ]);

        Log::info("SupportAgent: Refund request escalated for ticket #{$ticket->ticket_number}");
    }
}
