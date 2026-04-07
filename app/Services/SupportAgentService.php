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

    /**
     * Provider preference order for support agent.
     * Mistral is first — cheap, fast, no per-token billing issues on free tier.
     * Add more providers here if needed.
     */
    private const PROVIDER_PREFERENCE = ['mistral', 'anthropic', 'openai', 'google', 'gemini'];

    /**
     * Fallback model list per provider.
     * If default_model is empty OR the chosen model returns a quota/rate error, try the next one.
     */
    private const MODEL_FALLBACKS = [
        'mistral'   => ['mistral-small-latest', 'open-mixtral-8x7b', 'open-mistral-7b', 'mistral-tiny'],
        'anthropic' => ['claude-haiku-4-5-20251001', 'claude-3-5-haiku-20241022', 'claude-3-haiku-20240307'],
        'openai'    => ['gpt-4o-mini', 'gpt-3.5-turbo'],
        'google'    => ['gemini-1.5-flash', 'gemini-1.0-pro'],
        'gemini'    => ['gemini-1.5-flash', 'gemini-1.0-pro'],
    ];

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
        $endpoint = $this->resolveEndpoint();
        if (! $endpoint) {
            Log::warning('SupportAgent: No active AI endpoint found. Add one at /admin/ai/endpoints.');
            return null;
        }

        $messages = $this->buildMessages($ticket, $latestUserMessage);
        $system   = $this->systemPrompt($ticket);
        $raw      = $this->callWithFallback($endpoint, $system, $messages);

        if ($raw === null) {
            Log::error('SupportAgent: All models exhausted for endpoint "' . $endpoint->name . '". Check API quotas.');
            return null;
        }

        try {
            $parsed    = $this->parseResponse($raw);
            $agentText = $parsed['message'] ?? $raw;
            $action    = $parsed['action']  ?? null;

            $msg = SupportMessage::create([
                'ticket_id'   => $ticket->id,
                'sender_type' => 'agent',
                'sender_id'   => null,
                'message'     => $agentText,
                'is_read'     => false,
            ]);

            $refundIntentCount = $ticket->refund_intent_count ?? 0;

            // PHP-level override: if user has mentioned refund before AND AI detected
            // any refund intent again, force escalation — don't trust AI to return the
            // right action every time (Mistral often keeps returning 'refund_intent').
            if (in_array($action, ['refund_intent', 'request_refund'])) {
                if ($refundIntentCount >= 1) {
                    $action = 'request_refund'; // force escalation
                }
                $refundIntentCount++;
            }

            if ($action === 'request_refund' && $ticket->order_id) {
                $this->escalateRefund($ticket);
            }

            $ticket->update([
                'agent_handled'       => true,
                'refund_intent_count' => $refundIntentCount,
                'unread_user'         => $ticket->unread_user + 1,
                'updated_at'          => now(),
            ]);

            broadcast(new SupportMessageSent($ticket->fresh(), $msg));

            return $msg;

        } catch (\Throwable $e) {
            Log::error('SupportAgent store/broadcast exception: ' . $e->getMessage());
            return null;
        }
    }

    // ── Endpoint resolution ───────────────────────────────────────────────────

    /** Pick the best active endpoint based on PROVIDER_PREFERENCE order. */
    private function resolveEndpoint(): ?AIEndpoint
    {
        $active = AIEndpoint::where('is_active', true)->get();
        if ($active->isEmpty()) return null;

        foreach (self::PROVIDER_PREFERENCE as $provider) {
            $found = $active->firstWhere('provider', $provider);
            if ($found) return $found;
        }

        return $active->first(); // any active endpoint as last resort
    }

    // ── Call with per-model fallback ──────────────────────────────────────────

    /**
     * Try the endpoint's default model first, then fallback models one by one.
     * Returns the raw text response, or null if all models fail.
     */
    private function callWithFallback(AIEndpoint $endpoint, string $system, array $messages): ?string
    {
        $provider  = $endpoint->provider;
        $fallbacks = self::MODEL_FALLBACKS[$provider] ?? [];

        // Build model list: [default_model (if set), ...fallbacks] deduplicated
        $modelsToTry = array_values(array_unique(array_filter(
            array_merge([$endpoint->default_model ?? ''], $fallbacks)
        )));

        if (empty($modelsToTry)) {
            $modelsToTry = [''];  // use adapter's built-in default
        }

        foreach ($modelsToTry as $model) {
            try {
                $adapter = AIProviderFactory::make($endpoint);
                if ($model) $adapter->setModel($model);

                $raw = $this->callAdapter($adapter, $system, $messages);

                Log::info("SupportAgent: responded using {$provider}/{$model}");
                return $raw;

            } catch (\Throwable $e) {
                $msg = $e->getMessage();
                // Check if it's a quota / rate-limit error → try next model
                $isQuotaError = str_contains($msg, 'insufficient balance')
                    || str_contains($msg, 'quota')
                    || str_contains($msg, 'rate limit')
                    || str_contains($msg, 'Rate limit')
                    || str_contains($msg, '429')
                    || str_contains($msg, 'suspended')
                    || str_contains($msg, 'billing');

                Log::warning("SupportAgent: model '{$model}' failed" . ($isQuotaError ? ' (quota)' : '') . " — {$msg}");

                if (! $isQuotaError) {
                    // Non-quota error (bad request, auth wrong key, etc.) — skip remaining models
                    return null;
                }
                // Quota error → try next model in list
            }
        }

        return null; // all models exhausted
    }

    /** Send the actual API request to the adapter. */
    private function callAdapter($adapter, string $system, array $messages): string
    {
        if (method_exists($adapter, 'generateTextWithTools')) {
            $payload = array_merge([['role' => 'system', 'content' => $system]], $messages);
            $result  = $adapter->generateTextWithTools($payload, []);
            return $result['text'] ?? '';
        }

        // Universal fallback: format as single string prompt
        return $adapter->generateText(
            $this->formatPrompt($system, $messages),
            ['max_tokens' => 400]
        )['text'] ?? '';
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
You are a customer support team member for an online food ordering platform.
Write naturally — like a real person on a support team, not a bot.

Ticket context:
- Ticket: #{$ticket->ticket_number}
- Subject: {$ticket->subject}
- Category: {$ticket->category}
- Priority: {$ticket->priority}{$order}{$items}
- Times customer mentioned refund so far: {$refundCount}

Tone & style rules:
1. Sound like a real support agent — warm, helpful, casual-professional. No corporate-speak.
2. Keep replies SHORT — 2-3 sentences max. No bullet points, no lists.
3. Use "we" not "I" (you're part of a team). Don't say "AI", "agent", "bot", or "automated".
4. First refund mention: acknowledge and say the team will look into it.
5. If refund_count >= 1 (already asked before): tell them a team member will process it — set action "request_refund".
6. Never promise exact amounts or timelines.
7. End with something like "we'll get back to you shortly" — natural, not scripted.

Respond ONLY with valid JSON, no extra text:
{"message": "your reply here", "action": null}
{"message": "your reply here", "action": "refund_intent"}
{"message": "your reply here", "action": "request_refund"}
PROMPT;
    }

    // ── Format history as single prompt (for adapters without multi-turn support) ──

    private function formatPrompt(string $system, array $messages): string
    {
        $lines = [$system, '', 'Conversation:'];
        foreach ($messages as $msg) {
            $label   = $msg['role'] === 'user' ? 'Customer' : 'Agent';
            $lines[] = "{$label}: {$msg['content']}";
        }
        $lines[] = '';
        $lines[] = 'Now respond to the last Customer message. Reply with JSON only: {"message":"...","action":null}';
        return implode("\n", $lines);
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
