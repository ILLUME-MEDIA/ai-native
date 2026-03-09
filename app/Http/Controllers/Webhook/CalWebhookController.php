<?php

namespace App\Http\Controllers\Webhook;

use App\Http\Controllers\Controller;
use App\Models\CalMeeting;
use App\Models\CalPlatform;
use App\Models\KanbanBoard;
use App\Models\KanbanCard;
use App\Services\CalService;
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

        // ── Find existing user by email (no auto-create — use POST /api/cal/{slug}/{table}/users) ──
        $userId     = null;
        $userSource = null;

        if ($attendeeEmail) {
            $table    = $platform->getUsersTable();
            $existing = \Illuminate\Support\Facades\DB::table($table)
                ->where('cal_platform_id', $platform->id)
                ->where('email', strtolower(trim($attendeeEmail)))
                ->first();
            if ($existing) {
                $userId     = $existing->id;
                $userSource = $table;
            }
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

        $service = new CalService($platform);
        $board   = KanbanBoard::where('cal_platform_id', $platform->id)->orderBy('id')->first();

        if ($board) {
            if ($isNew) {
                $service->createKanbanCard($meeting, $board, $userId, $userSource);
            } else {
                $service->moveKanbanCardToStatus($meeting, $board, $status);
            }
        }
    }

    private function cancelBooking(CalPlatform $platform, array $payload): void
    {
        $uid = $payload['uid'] ?? null;
        if (! $uid) return;

        $meeting = CalMeeting::where('booking_uid', $uid)
            ->where('cal_platform_id', $platform->id)
            ->first();

        if (! $meeting) return;

        $meeting->update(['status' => 'cancelled', 'metadata' => $payload]);

        $board = KanbanBoard::where('cal_platform_id', $platform->id)->orderBy('id')->first();
        if ($board) {
            (new CalService($platform))->moveKanbanCardToStatus($meeting, $board, 'cancelled');
        }
    }

    private function completeBooking(CalPlatform $platform, array $payload): void
    {
        $uid = $payload['uid'] ?? null;
        if (! $uid) return;

        $meeting = CalMeeting::where('booking_uid', $uid)
            ->where('cal_platform_id', $platform->id)
            ->first();

        if (! $meeting) return;

        $meeting->update(['status' => 'completed']);

        $board = KanbanBoard::where('cal_platform_id', $platform->id)->orderBy('id')->first();
        if ($board) {
            (new CalService($platform))->moveKanbanCardToStatus($meeting, $board, 'completed');
        }
    }
}
