<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KanbanBoard;
use App\Models\KanbanCard;
use App\Models\KanbanColumn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KanbanController extends Controller
{
    public function boardsIndex(Request $request): JsonResponse
    {
        $query = KanbanBoard::withCount('cards')->orderBy('name');
        if ($platformId = $request->query('platform_id')) {
            $query->where('cal_platform_id', $platformId);
        }
        return response()->json($query->get());
    }

    public function boardsShow(KanbanBoard $board): JsonResponse
    {
        $board->load(['columns.cards']);
        $board->columns->each(function ($col) {
            $col->setRelation('cards', $col->cards->map(fn ($c) => $this->formatCard($c)));
        });
        return response()->json($board);
    }

    public function boardsStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'            => 'required|string|max:255',
            'description'     => 'nullable|string',
            'color'           => 'nullable|string|max:20',
            'is_active'       => 'boolean',
            'cal_platform_id' => 'nullable|exists:cal_platforms,id',
        ]);
        $board = KanbanBoard::create($data);
        foreach ([
            ['name' => 'To Do',       'color' => '#e5e7eb', 'position' => 0],
            ['name' => 'In Progress', 'color' => '#fef3c7', 'position' => 1],
            ['name' => 'Review',      'color' => '#dbeafe', 'position' => 2],
            ['name' => 'Done',        'color' => '#d1fae5', 'position' => 3],
        ] as $col) {
            KanbanColumn::create(array_merge($col, ['board_id' => $board->id]));
        }
        return response()->json($board->load('columns'), 201);
    }

    public function boardsUpdate(Request $request, KanbanBoard $board): JsonResponse
    {
        $data = $request->validate([
            'name'            => 'sometimes|string|max:255',
            'description'     => 'nullable|string',
            'color'           => 'nullable|string|max:20',
            'is_active'       => 'boolean',
            'cal_platform_id' => 'nullable|exists:cal_platforms,id',
        ]);
        $board->update($data);
        return response()->json($board->fresh());
    }

    public function boardsDestroy(KanbanBoard $board): JsonResponse
    {
        $board->delete();
        return response()->json(null, 204);
    }

    public function columnsStore(Request $request, KanbanBoard $board): JsonResponse
    {
        $data = $request->validate([
            'name'      => 'required|string|max:255',
            'color'     => 'nullable|string|max:20',
            'wip_limit' => 'nullable|integer|min:1',
        ]);
        $max    = KanbanColumn::where('board_id', $board->id)->max('position') ?? -1;
        $column = KanbanColumn::create(array_merge($data, ['board_id' => $board->id, 'position' => $max + 1]));
        return response()->json($column, 201);
    }

    public function columnsUpdate(Request $request, KanbanColumn $column): JsonResponse
    {
        $data = $request->validate([
            'name'      => 'sometimes|string|max:255',
            'color'     => 'nullable|string|max:20',
            'wip_limit' => 'nullable|integer|min:1',
            'position'  => 'nullable|integer|min:0',
        ]);
        $column->update($data);
        return response()->json($column->fresh());
    }

    public function columnsDestroy(KanbanColumn $column): JsonResponse
    {
        $column->cards()->delete();
        $column->delete();
        return response()->json(null, 204);
    }

    public function columnsReorder(Request $request, KanbanBoard $board): JsonResponse
    {
        $request->validate([
            'columns'            => 'required|array',
            'columns.*.id'       => 'required|integer',
            'columns.*.position' => 'required|integer',
        ]);
        foreach ($request->input('columns') as $item) {
            KanbanColumn::where('id', $item['id'])->where('board_id', $board->id)
                ->update(['position' => $item['position']]);
        }
        return response()->json(['ok' => true]);
    }

    public function cardsStore(Request $request, KanbanColumn $column): JsonResponse
    {
        $data = $request->validate([
            'title'           => 'required|string|max:255',
            'description'     => 'nullable|string',
            'priority'        => 'nullable|in:low,medium,high,urgent',
            'due_date'        => 'nullable|date',
            'assignee'        => 'nullable|string|max:255',
            'openorg_user_id' => 'nullable|integer',
            'labels'          => 'nullable|array',
            'metadata'        => 'nullable|array',
        ]);
        $max        = KanbanCard::where('column_id', $column->id)->max('position') ?? -1;
        $userSource = $this->resolveUserSource($column->board_id);
        $card       = KanbanCard::create(array_merge($data, [
            'column_id'   => $column->id,
            'board_id'    => $column->board_id,
            'position'    => $max + 1,
            'user_source' => $userSource,
        ]));
        return response()->json($this->formatCard($card), 201);
    }

    public function cardsUpdate(Request $request, KanbanCard $card): JsonResponse
    {
        if ($card->is_meeting_card) {
            return response()->json(['message' => 'Meeting cards cannot be edited. Use drag & drop to change their column.'], 422);
        }
        $data = $request->validate([
            'title'           => 'sometimes|string|max:255',
            'description'     => 'nullable|string',
            'priority'        => 'nullable|in:low,medium,high,urgent',
            'due_date'        => 'nullable|date',
            'assignee'        => 'nullable|string|max:255',
            'openorg_user_id' => 'nullable|integer',
            'labels'          => 'nullable|array',
            'metadata'        => 'nullable|array',
        ]);
        $card->update($data);
        return response()->json($this->formatCard($card->fresh()));
    }

    public function cardsDestroy(KanbanCard $card): JsonResponse
    {
        $card->delete();
        return response()->json(null, 204);
    }

    public function cardsMove(Request $request, KanbanCard $card): JsonResponse
    {
        $data = $request->validate([
            'column_id' => 'required|exists:kanban_columns,id',
            'position'  => 'required|integer|min:0',
        ]);
        $newColumn = KanbanColumn::findOrFail($data['column_id']);
        KanbanCard::where('column_id', $newColumn->id)
            ->where('id', '!=', $card->id)
            ->where('position', '>=', $data['position'])
            ->increment('position');
        $card->update([
            'column_id' => $newColumn->id,
            'board_id'  => $newColumn->board_id,
            'position'  => $data['position'],
        ]);
        return response()->json($this->formatCard($card->fresh()));
    }

    /**
     * Resolve the users table for a given board (via board → platform → usersTable()).
     * Returns null if board has no platform.
     */
    private function resolveUserSource(int $boardId): ?string
    {
        $board = KanbanBoard::with('platform.usersEntity')->find($boardId);
        if (!$board || !$board->cal_platform_id) return null;
        return $board->platform?->getUsersTable();
    }

    private function formatCard(KanbanCard $card): array
    {
        // Dynamic user lookup: use user_source if set, else try openorgUser relation
        $user = null;
        if ($card->openorg_user_id) {
            $source = $card->user_source ?? 'openorg_users';
            if ($source === 'openorg_users') {
                if ($card->relationLoaded('openorgUser') && $card->openorgUser) {
                    $u    = $card->openorgUser;
                    $user = ['id' => $u->id, 'name' => $u->name, 'email' => $u->email];
                } else {
                    $row  = DB::table('openorg_users')->find($card->openorg_user_id);
                    $user = $row ? ['id' => $row->id, 'name' => $row->name, 'email' => $row->email] : null;
                }
            } else {
                $row  = DB::table($source)->find($card->openorg_user_id);
                $user = $row ? ['id' => $row->id, 'name' => $row->name, 'email' => $row->email ?? null] : null;
            }
        }

        return [
            'id'                => $card->id,
            'column_id'         => $card->column_id,
            'board_id'          => $card->board_id,
            'title'             => $card->title,
            'description'       => $card->description,
            'priority'          => $card->priority,
            'due_date'          => $card->due_date?->toDateString(),
            'assignee'          => $card->assignee,
            'labels'            => $card->labels ?? [],
            'position'          => $card->position,
            'metadata'          => $card->metadata,
            'openorg_user_id'   => $card->openorg_user_id,
            'user_source'       => $card->user_source,
            'source_meeting_id' => $card->source_meeting_id,
            'is_meeting_card'   => (bool) $card->is_meeting_card,
            'openorg_user'      => $user,
        ];
    }
}
