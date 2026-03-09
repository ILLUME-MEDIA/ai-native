<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalMeeting;
use App\Models\CalPlatform;
use App\Models\SectionEntity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Public-facing platform user API.
 *
 * URL pattern: /api/cal/{platform-slug}/{table}/users
 *
 * {slug}  = Cal platform slug (e.g. "openorg", "xdstudio")
 * {table} = DB table name  (e.g. "openorg_users", "se_xdstudio_users")
 *
 * Endpoints:
 *   GET  /api/cal/{slug}/{table}/users?email=ali@example.com  → get user profile
 *   POST /api/cal/{slug}/{table}/users                        → create/find user + token
 *
 * Security: table must be either `openorg_users` or a registered Section Builder
 * entity table. Arbitrary table names are rejected (403).
 *
 * Token: same encrypted format as OTP auth — works with same middleware.
 *
 * Examples:
 *   GET  /api/cal/openorg/openorg_users/users?email=ali@example.com
 *   POST /api/cal/xdstudio/se_xdstudio_users/users
 *        body: { "name": "John", "email": "john@xd.com", "phone": "..." }
 */
class PlatformUserAuthController extends Controller
{
    /**
     * GET /api/cal/{slug}/{table}/users?email=...
     * Get user profile by email (email in query string).
     */
    public function show(Request $request, string $slug, string $table): JsonResponse
    {
        [$platform, $error] = $this->resolvePlatformAndTable($slug, $table);
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
            'user'     => $this->formatUser((array) $user),
            'platform' => $platform->slug,
            'table'    => $table,
        ]);
    }

    /**
     * POST /api/cal/{slug}/{table}/users
     * Create or find user by email in the specified table, return auth token.
     * Email + all user fields go in request body.
     */
    public function store(Request $request, string $slug, string $table): JsonResponse
    {
        [$platform, $error] = $this->resolvePlatformAndTable($slug, $table);
        if ($error) return $error;

        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|max:255',
            'phone'    => 'nullable|string|max:50',
            'metadata' => 'nullable|array',
        ]);

        $email = strtolower(trim($data['email']));

        // Find existing user in this specific table + platform
        $existing = DB::table($table)
            ->where('cal_platform_id', $platform->id)
            ->where('email', $email)
            ->first();

        if ($existing) {
            $user = (array) $existing;
            return response()->json([
                'success'  => true,
                'status'   => 'found',
                'token'    => $this->buildToken($email, $table, $user),
                'user'     => $this->formatUser($user),
                'platform' => $platform->slug,
                'table'    => $table,
            ]);
        }

        // Create new user
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

        Log::info("PlatformUserAuth [{$slug}/{$table}]: created [{$email}]");

        return response()->json([
            'success'  => true,
            'status'   => 'created',
            'token'    => $this->buildToken($email, $table, $user),
            'user'     => $this->formatUser($user),
            'platform' => $platform->slug,
            'table'    => $table,
        ], 201);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Resolve platform by slug and validate the requested table is allowed.
     * Returns [$platform, null] on success or [null, JsonResponse] on failure.
     *
     * Allowed tables:
     *  - openorg_users  (always allowed)
     *  - Any section_entities.table_name  (must exist and belong to any platform)
     */

    /**
     * GET /api/cal/{slug}/{table}/meetings
     * List meetings for this platform.
     *
     * With Bearer token (from POST /users): returns only that user's meetings.
     * Without token: returns all meetings for the platform (public calendar view).
     *
     * Query params: status, page, per_page
     */
    public function meetings(Request $request, string $slug, string $table): JsonResponse
    {
        [$platform, $error] = $this->resolvePlatformAndTable($slug, $table);
        if ($error) return $error;

        // Try to resolve user email from Bearer token (optional)
        $userEmail = null;
        $token     = $request->bearerToken();
        if ($token) {
            try {
                $payload = decrypt($token);
                if (
                    isset($payload['type'], $payload['exp'], $payload['email']) &&
                    $payload['type'] === 'otp_auth' &&
                    $payload['exp'] > now()->timestamp
                ) {
                    $userEmail = strtolower(trim($payload['email']));
                }
            } catch (\Throwable) {}
        }

        $query = CalMeeting::where('cal_platform_id', $platform->id)
            ->orderByDesc('start_time');

        // Token present → filter by attendee_email extracted from token
        if ($userEmail) {
            $query->where('attendee_email', $userEmail);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $perPage  = min((int) $request->query('per_page', 15), 100);
        $meetings = $query->paginate($perPage);

        return response()->json([
            'data'         => $meetings->items(),
            'total'        => $meetings->total(),
            'current_page' => $meetings->currentPage(),
            'last_page'    => $meetings->lastPage(),
            'user_email'   => $userEmail,
        ]);
    }

    private function resolvePlatformAndTable(string $slug, string $table): array
    {
        $platform = CalPlatform::where('slug', $slug)->where('is_active', true)->first();
        if (! $platform) {
            return [null, response()->json(['message' => "Platform '{$slug}' not found."], 404)];
        }

        // Security: only allow openorg_users or known Section Builder entity tables
        $allowed = $table === 'openorg_users'
            || SectionEntity::where('table_name', $table)->exists();

        if (! $allowed) {
            return [null, response()->json([
                'message' => "Table '{$table}' is not a registered user table.",
            ], 403)];
        }

        // Confirm the table actually exists in the DB
        if (! Schema::hasTable($table)) {
            return [null, response()->json([
                'message' => "Table '{$table}' does not exist.",
            ], 404)];
        }

        return [$platform, null];
    }

    /**
     * Encrypted auth token — identical format to OTP auth.
     * type = 'otp_auth' → same middleware validates it.
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
