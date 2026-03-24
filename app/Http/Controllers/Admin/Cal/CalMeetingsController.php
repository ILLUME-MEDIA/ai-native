<?php

namespace App\Http\Controllers\Admin\Cal;

use App\Http\Controllers\Controller;
use App\Models\CalMeeting;
use App\Models\CalPlatform;
use App\Models\KanbanBoard;
use App\Models\KanbanCard;
use Illuminate\Support\Facades\DB;
use App\Services\CalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalMeetingsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CalMeeting::with('platform')->orderByDesc('start_time');

        if ($platformId = $request->query('platform_id')) {
            $query->where('cal_platform_id', $platformId);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('attendee_name', 'like', "%{$search}%")
                  ->orWhere('attendee_email', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%");
            });
        }

        $perPage  = min((int) $request->query('per_page', 15), 100);
        $meetings = $query->paginate($perPage)->through(fn ($m) => $this->format($m));

        return response()->json($meetings);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cal_platform_id'   => 'required|exists:cal_platforms,id',
            'openorg_user_id'   => 'nullable|integer',
            'title'             => 'required|string|max:255',
            'description'       => 'nullable|string',
            'attendee_name'     => 'required|string|max:255',
            'attendee_email'    => 'required|email|max:255',
            'attendee_timezone' => 'nullable|string|max:100',
            'start_time'        => 'required|date',
            'end_time'          => 'required|date|after:start_time',
            'status'            => 'nullable|in:upcoming,completed,cancelled,rescheduled',
            'meeting_url'       => 'nullable|url|max:500',
        ]);

        $meeting = CalMeeting::create($data);

        // Auto-create kanban card in the board linked to this platform
        $this->createKanbanCard($meeting);

        return response()->json($this->format($meeting->load('platform')), 201);
    }

    /** Auto-create a read-only kanban card in the platform's linked board. */
    private function createKanbanCard(CalMeeting $meeting): void
    {
        $board = KanbanBoard::with('platform.usersEntity')
            ->where('cal_platform_id', $meeting->cal_platform_id)
            ->orderBy('id')
            ->first();

        if (!$board) return;

        $firstColumn = $board->columns()->orderBy('position')->first();
        if (!$firstColumn) return;

        $maxPos     = KanbanCard::where('column_id', $firstColumn->id)->max('position') ?? -1;
        $userSource = $board->platform?->getUsersTable();

        KanbanCard::create([
            'column_id'         => $firstColumn->id,
            'board_id'          => $board->id,
            'title'             => $meeting->title,
            'description'       => $meeting->description,
            'assignee'          => $meeting->attendee_name,
            'openorg_user_id'   => $meeting->openorg_user_id,
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

    public function update(Request $request, CalMeeting $calMeeting): JsonResponse
    {
        $data = $request->validate([
            'openorg_user_id'   => 'nullable|integer',
            'title'             => 'sometimes|string|max:255',
            'description'       => 'nullable|string',
            'attendee_name'     => 'sometimes|string|max:255',
            'attendee_email'    => 'sometimes|email|max:255',
            'attendee_timezone' => 'nullable|string|max:100',
            'start_time'        => 'sometimes|date',
            'end_time'          => 'sometimes|date',
            'status'            => 'nullable|in:upcoming,completed,cancelled,rescheduled',
            'meeting_url'       => 'nullable|url|max:500',
        ]);

        $calMeeting->update($data);

        return response()->json($this->format($calMeeting->fresh()->load('platform')));
    }

    public function destroy(CalMeeting $calMeeting): JsonResponse
    {
        $calMeeting->delete();
        return response()->json(null, 204);
    }

    public function cancelViaApi(Request $request, CalMeeting $calMeeting): JsonResponse
    {
        $platform = $calMeeting->platform;
        $service  = new CalService($platform);

        $result = $service->cancelBooking(
            $calMeeting->booking_uid,
            $request->input('reason', '')
        );

        if (isset($result['error'])) {
            return response()->json(['message' => 'Cal.com API error', 'detail' => $result['error']], 422);
        }

        $calMeeting->update(['status' => 'cancelled']);

        return response()->json($this->format($calMeeting->fresh()->load('platform')));
    }

    private function format(CalMeeting $m): array
    {
        return [
            'id'                => $m->id,
            'cal_platform_id'   => $m->cal_platform_id,
            'openorg_user_id'   => $m->openorg_user_id,
            'platform'          => $m->relationLoaded('platform') ? [
                'id'    => $m->platform->id,
                'name'  => $m->platform->name,
                'color' => $m->platform->color,
            ] : null,
            'booking_uid'       => $m->booking_uid,
            'event_type_id'     => $m->event_type_id,
            'title'             => $m->title,
            'description'       => $m->description,
            'attendee_name'     => $m->attendee_name,
            'attendee_email'    => $m->attendee_email,
            'attendee_timezone' => $m->attendee_timezone,
            'start_time'        => $m->start_time?->toIso8601String(),
            'end_time'          => $m->end_time?->toIso8601String(),
            'status'            => $m->status,
            'meeting_url'       => $m->meeting_url,
            'created_at'        => $m->created_at,
        ];
    }
}
