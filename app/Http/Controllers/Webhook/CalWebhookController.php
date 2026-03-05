<?php

namespace App\Http\Controllers\Webhook;

use App\Http\Controllers\Controller;
use App\Models\CalMeeting;
use App\Models\CalPlatform;
use App\Models\KanbanBoard;
use App\Models\KanbanCard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CalWebhookController extends Controller
{
    /**
     * Handle incoming Cal.com webhook.
     * Route: POST /api/webhooks/cal/{slug}
     */
    public function handle(Request $request, string $slug): JsonResponse
    {
        $platform = CalPlatform::where('slug', $slug)->where('is_active', true)->first();

        if (! $platform) {
            return response()->json(['message' => 'Platform not found.'], 404);
        }

        // Signature verification
        if ($platform->webhook_secret) {
            $signature = $request->header('X-Cal-Signature-256');
            if (! $signature) {
                Log::warning("Cal webhook [{$slug}]: missing signature.");
                return response()->json(['message' => 'Missing signature.'], 401);
            }
            $expected = 'sha256=' . hash_hmac('sha256', $request->getContent(), $platform->getPlainWebhookSecret());
            if (! hash_equals($expected, $signature)) {
                Log::warning("Cal webhook [{$slug}]: invalid signature.");
                return response()->json(['message' => 'Invalid signature.'], 401);
            }
        }

        $body    = $request->json()->all();
        $event   = $body['triggerEvent'] ?? null;
        $payload = $body['payload'] ?? $body;

        Log::info("Cal webhook [{$slug}]: event={$event}");

        match ($event) {
            'BOOKING_CREATED'     => $this->upsertBooking($platform, $payload, 'upcoming'),
            'BOOKING_CONFIRMED'   => $this->upsertBooking($platform, $payload, 'upcoming'),
            'BOOKING_RESCHEDULED' => $this->upsertBooking($platform, $payload, 'rescheduled'),
            'BOOKING_CANCELLED'   => $this->cancelBooking($platform, $payload),
            'MEETING_ENDED'       => $this->completeBooking($platform, $payload),
            default               => null,
        };

        return response()->json(['ok' => true]);
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function upsertBooking(CalPlatform $platform, array $payload, string $status): void
    {
        $uid       = $payload['uid'] ?? null;
        $startTime = $payload['startTime'] ?? null;
        if (empty($uid) || empty($startTime)) return;

        $attendees     = $payload['attendees'] ?? [];
        $attendee      = $attendees[0] ?? [];
        $attendeeName  = $attendee['name'] ?? null;
        $attendeeEmail = $attendee['email'] ?? null;

        // ── Auto-create user if platform has this enabled ──────────────────────
        $userId     = null;
        $userSource = null;

        if ($attendeeEmail && $platform->auto_create_users) {
            [$userId, $userSource] = $this->resolveOrCreateUser($platform, $attendeeName, $attendeeEmail);
        }

        // ── Upsert the meeting ─────────────────────────────────────────────────
        $isNew = ! CalMeeting::where('booking_uid', $uid)
            ->where('cal_platform_id', $platform->id)
            ->exists();

        $meeting = CalMeeting::updateOrCreate(
            ['booking_uid' => $uid, 'cal_platform_id' => $platform->id],
            [
                'event_type_id'     => (string) ($payload['eventTypeId'] ?? ''),
                'title'             => $payload['title'] ?? 'Meeting',
                'description'       => $payload['description'] ?? null,
                'attendee_name'     => $attendeeName,
                'attendee_email'    => $attendeeEmail,
                'attendee_timezone' => $attendee['timeZone'] ?? null,
                'start_time'        => $startTime,
                'end_time'          => $payload['endTime'] ?? null,
                'status'            => $status,
                'meeting_url'       => $payload['videoCallData']['url'] ?? null,
                'openorg_user_id'   => $userId,
                'user_source'       => $userSource,
                'metadata'          => $payload,
            ]
        );

        // ── Auto-create kanban card for new bookings only ──────────────────────
        if ($isNew) {
            $this->createKanbanCard($meeting, $platform, $userId, $userSource);
        }
    }

    /**
     * Find existing user by email in the platform's users table,
     * or create a new one with name + email from the booking.
     * Returns [$userId, $userSource].
     */
    private function resolveOrCreateUser(CalPlatform $platform, ?string $name, string $email): array
    {
        $table = $platform->getUsersTable();

        $existing = DB::table($table)
            ->where('cal_platform_id', $platform->id)
            ->where('email', $email)
            ->first();

        if ($existing) {
            return [$existing->id, $table];
        }

        $id = DB::table($table)->insertGetId([
            'cal_platform_id' => $platform->id,
            'name'            => $name ?? $email,
            'email'           => $email,
            'is_active'       => true,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        Log::info("Cal webhook: auto-created user [{$email}] in [{$table}] for platform [{$platform->slug}]");

        return [$id, $table];
    }

    private function createKanbanCard(CalMeeting $meeting, CalPlatform $platform, ?int $userId, ?string $userSource): void
    {
        $board = KanbanBoard::where('cal_platform_id', $platform->id)
            ->orderBy('id')
            ->first();

        if (! $board) return;

        $firstColumn = $board->columns()->orderBy('position')->first();
        if (! $firstColumn) return;

        $maxPos = KanbanCard::where('column_id', $firstColumn->id)->max('position') ?? -1;

        KanbanCard::create([
            'column_id'         => $firstColumn->id,
            'board_id'          => $board->id,
            'title'             => $meeting->title,
            'description'       => $meeting->description,
            'assignee'          => $meeting->attendee_name,
            'openorg_user_id'   => $userId,
            'user_source'       => $userSource,
            'due_date'          => $meeting->start_time?->toDateString(),
            'priority'          => 'medium',
            'position'          => $maxPos + 1,
            'source_meeting_id' => $meeting->id,
            'is_meeting_card'   => true,
            'metadata'          => [
                'meeting_url'    => $meeting->meeting_url,
                'attendee_email' => $meeting->attendee_email,
                'start_time'     => $meeting->start_time?->toIso8601String(),
                'end_time'       => $meeting->end_time?->toIso8601String(),
            ],
        ]);
    }

    private function cancelBooking(CalPlatform $platform, array $payload): void
    {
        $uid = $payload['uid'] ?? null;
        if (! $uid) return;

        CalMeeting::where('booking_uid', $uid)
            ->where('cal_platform_id', $platform->id)
            ->update(['status' => 'cancelled', 'metadata' => $payload]);
    }

    private function completeBooking(CalPlatform $platform, array $payload): void
    {
        $uid = $payload['uid'] ?? null;
        if (! $uid) return;

        CalMeeting::where('booking_uid', $uid)
            ->where('cal_platform_id', $platform->id)
            ->update(['status' => 'completed']);
    }
}
