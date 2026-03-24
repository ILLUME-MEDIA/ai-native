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
     * Sync Cal.com bookings → cal_meetings + link users + create/move kanban cards.
     * - New meetings: card created in column matching its status.
     * - Existing meetings whose status changed: card is moved to the matching column.
     */
    public function syncBookings(): array
    {
        $allBookings = [];
        $cursor      = null;

        do {
            $params = ['limit' => 100, 'take' => 100];
            if ($cursor) $params['cursor'] = $cursor;

            $result = $this->getBookings($params);
            if (isset($result['error'])) return $result;

            $page        = $this->extractBookings($result);
            $cursor      = $result['data']['nextCursor'] ?? $result['nextCursor'] ?? null;
            $allBookings = array_merge($allBookings, $page);

        } while (!empty($page) && count($page) >= 100 && $cursor);

        if (empty($allBookings)) {
            return ['synced' => 0, 'kanban_cards_created' => 0, 'kanban_cards_moved' => 0];
        }

        $table        = $this->platform->getUsersTable();
        $synced       = 0;
        $cardsCreated = 0;
        $cardsMoved   = 0;

        $board = KanbanBoard::where('cal_platform_id', $this->platform->id)->orderBy('id')->first();

        foreach ($allBookings as $booking) {
            $uid       = $booking['uid'] ?? null;
            $startTime = $booking['startTime'] ?? null;
            if (empty($startTime)) continue;

            $attendees     = $booking['attendees'] ?? [];
            $attendee      = $attendees[0] ?? [];
            $attendeeEmail = $attendee['email'] ?? null;
            $attendeeName  = $attendee['name']  ?? null;
            $status        = strtolower($booking['status'] ?? 'upcoming');

            [$userId, $userSource] = $this->findUser($attendeeEmail, $table);

            $isNew = ! CalMeeting::where('booking_uid', $uid)
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
                    'status'            => $status,
                    'meeting_url'       => $booking['videoCallData']['url'] ?? null,
                    'openorg_user_id'   => $userId,
                    'user_source'       => $userSource,
                    'metadata'          => $booking,
                ]
            );
            $synced++;

            if (!$board) continue;

            if ($isNew) {
                if ($this->createKanbanCard($meeting, $board, $userId, $userSource)) $cardsCreated++;
            } else {
                if ($this->moveKanbanCardToStatus($meeting, $board, $status)) $cardsMoved++;
            }
        }

        return [
            'synced'               => $synced,
            'kanban_cards_created' => $cardsCreated,
            'kanban_cards_moved'   => $cardsMoved,
        ];
    }

    /**
     * Create a kanban card in the column matching the meeting's status.
     * Returns true if created, false if skipped (duplicate / no board).
     */
    public function createKanbanCard(CalMeeting $meeting, KanbanBoard $board, ?int $userId, ?string $userSource): bool
    {
        if (KanbanCard::where('source_meeting_id', $meeting->id)->exists()) return false;

        $column = $board->findColumnByStatus($meeting->status ?? 'upcoming');
        if (!$column) return false;

        $maxPos = KanbanCard::where('column_id', $column->id)->max('position') ?? -1;

        KanbanCard::create([
            'column_id'         => $column->id,
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

        return true;
    }

    /**
     * Move an existing kanban card to the column matching the new meeting status.
     * Returns true if moved, false if no card or already in correct column.
     */
    public function moveKanbanCardToStatus(CalMeeting $meeting, KanbanBoard $board, string $status): bool
    {
        $card = KanbanCard::where('source_meeting_id', $meeting->id)->first();
        if (!$card) return false;

        $targetColumn = $board->findColumnByStatus($status);
        if (!$targetColumn || $card->column_id === $targetColumn->id) return false;

        $maxPos = KanbanCard::where('column_id', $targetColumn->id)->max('position') ?? -1;
        $card->update([
            'column_id' => $targetColumn->id,
            'board_id'  => $board->id,
            'position'  => $maxPos + 1,
        ]);

        return true;
    }

    /**
     * Find a user by email in the platform's configured users table.
     * Returns [userId, tableName] or [null, null].
     */
    private function findUser(?string $email, string $table): array
    {
        if (!$email) return [null, null];

        $user = DB::table($table)
            ->where('cal_platform_id', $this->platform->id)
            ->where('email', strtolower(trim($email)))
            ->first();

        return $user ? [$user->id, $table] : [null, null];
    }
}
