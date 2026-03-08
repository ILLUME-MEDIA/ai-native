<?php

namespace App\Services;

use App\Models\CalMeeting;
use App\Models\CalPlatform;
use App\Models\KanbanBoard;
use App\Models\KanbanCard;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CalService
{
    private CalPlatform $platform;

    public function __construct(CalPlatform $platform)
    {
        $this->platform = $platform;
    }

    private function http()
    {
        return Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->platform->getPlainApiKey(),
            'Content-Type'  => 'application/json',
        ])->baseUrl($this->platform->base_url);
    }

    public function getBookings(array $params = []): array
    {
        $response = $this->http()->get('/bookings', $params);
        if ($response->failed()) {
            return ['error' => $response->body(), 'status' => $response->status()];
        }
        return $response->json() ?? [];
    }

    public function getBooking(string $uid): array
    {
        $response = $this->http()->get("/bookings/{$uid}");
        if ($response->failed()) {
            return ['error' => $response->body(), 'status' => $response->status()];
        }
        return $response->json() ?? [];
    }

    public function cancelBooking(string $uid, string $reason = ''): array
    {
        $response = $this->http()->delete("/bookings/{$uid}", [
            'cancellationReason' => $reason,
        ]);
        if ($response->failed()) {
            return ['error' => $response->body(), 'status' => $response->status()];
        }
        return $response->json() ?? [];
    }

    public function getEventTypes(): array
    {
        $response = $this->http()->get('/event-types');
        if ($response->failed()) {
            return ['error' => $response->body(), 'status' => $response->status()];
        }
        return $response->json() ?? [];
    }

    /**
     * Extract bookings array from a Cal.com API response.
     * Handles v2 flat (data=[...]), v2 nested (data.bookings=[...]), v1 (bookings=[...]).
     */
    private function extractBookings(array $result): array
    {
        $data = $result['data'] ?? null;
        if (is_array($data)) {
            if (isset($data['bookings']) && is_array($data['bookings'])) {
                return $data['bookings'];
            }
            if (array_is_list($data)) {
                return $data;
            }
        }
        return $result['bookings'] ?? [];
    }

    /**
     * Sync Cal.com bookings → cal_meetings + link users + create kanban cards.
     * Paginates automatically — Cal.com v2 max limit is 100 per request.
     */
    public function syncBookings(): array
    {
        $allBookings = [];
        $cursor      = null;

        do {
            $params = ['limit' => 100, 'take' => 100]; // v2 uses limit, v1 uses take
            if ($cursor) {
                $params['cursor'] = $cursor;
            }

            $result = $this->getBookings($params);

            if (isset($result['error'])) {
                return $result;
            }

            $page        = $this->extractBookings($result);
            $cursor      = $result['data']['nextCursor'] ?? $result['nextCursor'] ?? null;
            $allBookings = array_merge($allBookings, $page);

        } while (!empty($page) && count($page) >= 100 && $cursor);

        $bookings = $allBookings;

        if (empty($bookings)) {
            Log::info("CalService sync [{$this->platform->slug}]: 0 bookings.");
            return ['synced' => 0, 'kanban_cards_created' => 0];
        }

        $table   = $this->platform->getUsersTable();
        $synced  = 0;
        $created = 0;

        foreach ($bookings as $booking) {
            $uid       = $booking['uid'] ?? null;
            $startTime = $booking['startTime'] ?? null;

            if (empty($startTime)) continue;

            $attendees     = $booking['attendees'] ?? [];
            $attendee      = $attendees[0] ?? [];
            $attendeeEmail = $attendee['email'] ?? null;
            $attendeeName  = $attendee['name']  ?? null;

            // ── Link to existing user (passive — no auto-create) ──────────────
            $userId     = null;
            $userSource = null;
            if ($attendeeEmail) {
                $user = DB::table($table)
                    ->where('cal_platform_id', $this->platform->id)
                    ->where('email', strtolower(trim($attendeeEmail)))
                    ->first();
                if ($user) {
                    $userId     = $user->id;
                    $userSource = $table;
                }
            }

            // ── Upsert meeting ───────────────────────────────────────────────
            $isNew   = ! CalMeeting::where('booking_uid', $uid)
                ->where('cal_platform_id', $this->platform->id)
                ->exists();

            $meeting = CalMeeting::updateOrCreate(
                ['booking_uid' => $uid, 'cal_platform_id' => $this->platform->id],
                [
                    'event_type_id'     => (string) ($booking['eventTypeId'] ?? ''),
                    'title'             => $booking['title'] ?? 'Meeting',
                    'description'       => $booking['description'] ?? null,
                    'attendee_name'     => $attendeeName,
                    'attendee_email'    => $attendeeEmail,
                    'attendee_timezone' => $attendee['timeZone'] ?? null,
                    'start_time'        => $startTime,
                    'end_time'          => $booking['endTime'] ?? null,
                    'status'            => strtolower($booking['status'] ?? 'upcoming'),
                    'meeting_url'       => $booking['videoCallData']['url'] ?? null,
                    'openorg_user_id'   => $userId,
                    'user_source'       => $userSource,
                    'metadata'          => $booking,
                ]
            );
            $synced++;

            // ── Create kanban card for new meetings only ──────────────────────
            if ($isNew) {
                $this->createKanbanCard($meeting, $userId, $userSource);
                $created++;
            }
        }

        return ['synced' => $synced, 'kanban_cards_created' => $created];
    }

    private function createKanbanCard(CalMeeting $meeting, ?int $userId, ?string $userSource): void
    {
        $board = KanbanBoard::where('cal_platform_id', $this->platform->id)
            ->orderBy('id')
            ->first();

        if (! $board) return;

        $firstColumn = $board->columns()->orderBy('position')->first();
        if (! $firstColumn) return;

        // Don't duplicate — check if card already exists for this meeting
        $exists = KanbanCard::where('source_meeting_id', $meeting->id)->exists();
        if ($exists) return;

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
}
