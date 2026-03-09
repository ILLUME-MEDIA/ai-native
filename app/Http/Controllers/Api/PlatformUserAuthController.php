<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalMeeting;
use App\Models\CalPlatform;
use App\Models\KanbanBoard;
use App\Models\KanbanCard;
use App\Models\SectionEntity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Public-facing platform user API.
 *
 * URL pattern: /api/cal/{table}/...
 * {table} = DB table name (openorg_users, se_xdstudio_users …)
 *
 * Platform is resolved automatically from the table:
 *  - openorg_users  → CalPlatform where users_entity_id IS NULL
 *  - se_xyz_users   → SectionEntity(table_name) → CalPlatform(users_entity_id = entity.id)
 *
 * No platform_id or slug needed anywhere.
 *
 * GET  /api/cal/{table}/users?email=      → get user profile          (SITE_API_KEY)
 * POST /api/cal/{table}/users             → find-or-create + token     (SITE_API_KEY)
 * GET  /api/cal/{table}/meetings          → public / token-filtered
 * GET  /api/cal/{table}/cards?email=      → cards by email or token
 */
class PlatformUserAuthController extends Controller
{
    /**
     * GET /api/cal/{table}/users?email=
     */
    public function show(Request $request, string $table): JsonResponse
    {
        [$platform, $error] = $this->resolveFromTable($table);
        if ($error) return $error;

        $email = strtolower(trim($request->query('email', '')));
        if (! $email) {
            return response()->json(['message' => 'email query parameter is required.'], 422);
        }

        $user = DB::table($table)
            ->where('cal_platform_id', $platform->id)
            ->where('email', $email)
            ->first();

        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        return response()->json([
            'user'  => $this->formatUser((array) $user),
            'table' => $table,
        ]);
    }

    /**
     * POST /api/cal/{table}/users
     * Body: { name, email, phone?, metadata? }
     */
    public function store(Request $request, string $table): JsonResponse
    {
        [$platform, $error] = $this->resolveFromTable($table);
        if ($error) return $error;

        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|max:255',
            'phone'    => 'nullable|string|max:50',
            'metadata' => 'nullable|array',
        ]);

        $email = strtolower(trim($data['email']));

        $existing = DB::table($table)
            ->where('cal_platform_id', $platform->id)
            ->where('email', $email)
            ->first();

        if ($existing) {
            $user = (array) $existing;
            return response()->json([
                'success' => true,
                'status'  => 'found',
                'token'   => $this->buildToken($email, $table, $user),
                'user'    => $this->formatUser($user),
                'table'   => $table,
            ]);
        }

        $insert = [
            'cal_platform_id' => $platform->id,
            'name'            => $data['name'],
            'email'           => $email,
            'phone'           => $data['phone'] ?? null,
            'is_active'       => true,
            'created_at'      => now(),
            'updated_at'      => now(),
        ];

        if (! empty($data['metadata']) && Schema::hasColumn($table, 'metadata')) {
            $insert['metadata'] = json_encode($data['metadata']);
        }

        $id   = DB::table($table)->insertGetId($insert);
        $user = (array) DB::table($table)->find($id);

        Log::info("PlatformUserAuth [{$table}]: created [{$email}] platform={$platform->id}");

        return response()->json([
            'success' => true,
            'status'  => 'created',
            'token'   => $this->buildToken($email, $table, $user),
            'user'    => $this->formatUser($user),
            'table'   => $table,
        ], 201);
    }

    /**
     * GET /api/cal/{table}/meetings?email=&status=&per_page=
     * Public. email param OR Bearer token = filter by user's email.
     * Each meeting includes linked kanban_card info.
     */
    public function meetings(Request $request, string $table): JsonResponse
    {
        [$platform, $error] = $this->resolveFromTable($table);
        if ($error) return $error;

        // Accept email from query param OR from Bearer token
        $userEmail = strtolower(trim($request->query('email', '')))
            ?: $this->emailFromToken($request->bearerToken());

        $query = CalMeeting::where('cal_platform_id', $platform->id)
            ->orderByDesc('start_time');

        if ($userEmail) {
            $query->where('attendee_email', $userEmail);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $perPage  = min((int) $request->query('per_page', 15), 100);
        $meetings = $query->paginate($perPage);

        // Attach linked Kanban card to each meeting
        $meetingIds     = collect($meetings->items())->pluck('id');
        $cardsByMeeting = KanbanCard::with('column')
            ->whereIn('source_meeting_id', $meetingIds)
            ->get()
            ->keyBy('source_meeting_id');

        $data = collect($meetings->items())->map(function ($meeting) use ($cardsByMeeting) {
            $card = $cardsByMeeting->get($meeting->id);
            return array_merge($meeting->toArray(), [
                'kanban_card' => $card ? [
                    'id'           => $card->id,
                    'column_id'    => $card->column_id,
                    'column_name'  => $card->column?->name,
                    'column_color' => $card->column?->color,
                    'position'     => $card->position,
                ] : null,
            ]);
        });

        return response()->json([
            'data'         => $data,
            'total'        => $meetings->total(),
            'current_page' => $meetings->currentPage(),
            'last_page'    => $meetings->lastPage(),
            'user_email'   => $userEmail,
        ]);
    }

    /**
     * GET /api/cal/{table}/cards?email=
     * email query param OR Bearer token — returns Kanban cards for that email.
     */
    public function cards(Request $request, string $table): JsonResponse
    {
        [$platform, $error] = $this->resolveFromTable($table);
        if ($error) return $error;

        $userEmail = strtolower(trim($request->query('email', '')))
            ?: $this->emailFromToken($request->bearerToken());

        if (! $userEmail) {
            return response()->json(['message' => 'email parameter or valid Bearer token is required.'], 422);
        }

        $boardIds = KanbanBoard::where('cal_platform_id', $platform->id)->pluck('id');

        $cards = KanbanCard::with('column')
            ->whereIn('board_id', $boardIds)
            ->where(function ($q) use ($userEmail) {
                $q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.attendee_email')) = ?", [$userEmail])
                  ->orWhere('assignee', $userEmail);
            })
            ->orderBy('due_date')
            ->get()
            ->map(fn ($c) => [
                'id'                => $c->id,
                'board_id'          => $c->board_id,
                'column_id'         => $c->column_id,
                'column_name'       => $c->column?->name,
                'column_color'      => $c->column?->color,
                'title'             => $c->title,
                'description'       => $c->description,
                'priority'          => $c->priority,
                'due_date'          => $c->due_date?->toDateString(),
                'assignee'          => $c->assignee,
                'labels'            => $c->labels ?? [],
                'position'          => $c->position,
                'is_meeting_card'   => (bool) $c->is_meeting_card,
                'source_meeting_id' => $c->source_meeting_id,
                'metadata'          => $c->metadata,
            ]);

        return response()->json([
            'data'       => $cards,
            'total'      => $cards->count(),
            'user_email' => $userEmail,
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Resolve CalPlatform from table name automatically.
     *
     * openorg_users  → platform where users_entity_id IS NULL
     * se_xyz_users   → SectionEntity(table_name=se_xyz_users) → platform(users_entity_id=entity.id)
     *
     * Returns [$platform, null] or [null, JsonResponse].
     */
    private function resolveFromTable(string $table): array
    {
        if (! Schema::hasTable($table)) {
            return [null, response()->json(['message' => "Table '{$table}' does not exist."], 404)];
        }

        if ($table === 'openorg_users') {
            $platform = CalPlatform::whereNull('users_entity_id')->where('is_active', true)->first();
        } else {
            $entity = SectionEntity::where('table_name', $table)->first();
            if (! $entity) {
                return [null, response()->json(['message' => "Table '{$table}' is not a registered user table."], 403)];
            }
            $platform = CalPlatform::where('users_entity_id', $entity->id)->where('is_active', true)->first();
        }

        if (! $platform) {
            return [null, response()->json(['message' => "No active platform found for table '{$table}'."], 404)];
        }

        return [$platform, null];
    }

    /**
     * Decrypt an OTP auth Bearer token and return the email, or null if invalid/expired.
     */
    private function emailFromToken(?string $token): ?string
    {
        if (! $token) return null;
        try {
            $payload = decrypt($token);
            if (
                isset($payload['type'], $payload['exp'], $payload['email']) &&
                $payload['type'] === 'otp_auth' &&
                $payload['exp'] > now()->timestamp
            ) {
                return strtolower(trim($payload['email']));
            }
        } catch (\Throwable) {}
        return null;
    }

    /**
     * Encrypted auth token — identical format to OTP auth.
     */
    private function buildToken(string $email, string $table, array $record): string
    {
        $days = (int) config('otp_auth.token_expires_days', 30);

        return encrypt([
            'email' => $email,
            'table' => $table,
            'id'    => $record['id'] ?? null,
            'exp'   => now()->addDays($days)->timestamp,
            'type'  => 'otp_auth',
        ]);
    }

    private function formatUser(array $user): array
    {
        if (isset($user['metadata']) && is_string($user['metadata'])) {
            $user['metadata'] = json_decode($user['metadata'], true) ?? [];
        }
        unset($user['password'], $user['remember_token']);
        return $user;
    }
}
