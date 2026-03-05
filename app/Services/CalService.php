<?php

namespace App\Services;

use App\Models\CalPlatform;
use Illuminate\Support\Facades\Http;

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

    /**
     * Get all bookings from Cal.com.
     */
    public function getBookings(array $params = []): array
    {
        $response = $this->http()->get('/bookings', $params);
        if ($response->failed()) {
            return ['error' => $response->body(), 'status' => $response->status()];
        }
        return $response->json() ?? [];
    }

    /**
     * Get a single booking by UID.
     */
    public function getBooking(string $uid): array
    {
        $response = $this->http()->get("/bookings/{$uid}");
        if ($response->failed()) {
            return ['error' => $response->body(), 'status' => $response->status()];
        }
        return $response->json() ?? [];
    }

    /**
     * Cancel a booking.
     */
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

    /**
     * Get event types for this platform.
     */
    public function getEventTypes(): array
    {
        $response = $this->http()->get('/event-types');
        if ($response->failed()) {
            return ['error' => $response->body(), 'status' => $response->status()];
        }
        return $response->json() ?? [];
    }

    /**
     * Sync Cal.com bookings into local cal_meetings table.
     */
    public function syncBookings(): array
    {
        $result = $this->getBookings(['take' => 100]);

        if (isset($result['error'])) {
            return $result;
        }

        $bookings = $result['data'] ?? $result['bookings'] ?? [];
        $synced = 0;

        foreach ($bookings as $booking) {
            $uid       = $booking['uid'] ?? null;
            $startTime = $booking['startTime'] ?? null;

            // Skip bookings without a start time
            if (empty($startTime)) {
                continue;
            }

            $attendees = $booking['attendees'] ?? [];
            $attendee  = $attendees[0] ?? [];

            \App\Models\CalMeeting::updateOrCreate(
                ['booking_uid' => $uid, 'cal_platform_id' => $this->platform->id],
                [
                    'event_type_id'     => (string) ($booking['eventTypeId'] ?? ''),
                    'title'             => $booking['title'] ?? 'Meeting',
                    'description'       => $booking['description'] ?? null,
                    'attendee_name'     => $attendee['name'] ?? null,
                    'attendee_email'    => $attendee['email'] ?? null,
                    'attendee_timezone' => $attendee['timeZone'] ?? null,
                    'start_time'        => $startTime,
                    'end_time'          => $booking['endTime'] ?? null,
                    'status'            => strtolower($booking['status'] ?? 'upcoming'),
                    'meeting_url'       => $booking['videoCallData']['url'] ?? null,
                    'metadata'          => $booking,
                ]
            );
            $synced++;
        }

        return ['synced' => $synced];
    }
}
