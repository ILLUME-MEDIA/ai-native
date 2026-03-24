<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CalPlatform;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Dynamic platform users controller.
 *
 * Reads/writes to whatever table the platform has configured as its
 * "users" source: either `openorg_users` (default) or a Section Builder
 * entity table (when cal_platforms.users_entity_id is set).
 *
 * Routes: /api/admin/platforms/{platform}/users
 */
class PlatformUsersController extends Controller
{
    public function index(Request $request, CalPlatform $platform): JsonResponse
    {
        $table = $platform->getUsersTable();
        $query = DB::table($table)->where('cal_platform_id', $platform->id);

        if ($request->boolean('active_only') && Schema::hasColumn($table, 'is_active')) {
            $query->where('is_active', true);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search, $table) {
                $q->where('name', 'like', "%{$search}%");
                if (Schema::hasColumn($table, 'email')) {
                    $q->orWhere('email', 'like', "%{$search}%");
                }
            });
        }

        $users = $query->orderBy('name')->get()->map(fn ($u) => $this->formatRow((array) $u, $table));

        return response()->json([
            'data'  => $users,
            'table' => $table,
        ]);
    }

    public function store(Request $request, CalPlatform $platform): JsonResponse
    {
        $table = $platform->getUsersTable();

        $data = $this->validateForTable($request, $table, $platform->id);

        // Unique email check per platform
        if (isset($data['email']) && Schema::hasColumn($table, 'email')) {
            $exists = DB::table($table)
                ->where('cal_platform_id', $platform->id)
                ->where('email', $data['email'])
                ->exists();

            if ($exists) {
                return response()->json(['message' => 'A user with this email already exists in this platform.'], 422);
            }
        }

        $data['cal_platform_id'] = $platform->id;
        $data['created_at']      = now();
        $data['updated_at']      = now();

        $id   = DB::table($table)->insertGetId($data);
        $user = DB::table($table)->find($id);

        return response()->json($this->formatRow((array) $user, $table), 201);
    }

    public function update(Request $request, CalPlatform $platform, int $userId): JsonResponse
    {
        $table = $platform->getUsersTable();

        $user = DB::table($table)->where('id', $userId)->where('cal_platform_id', $platform->id)->first();
        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        $data = $this->validateForTable($request, $table, $platform->id, isUpdate: true);

        // Unique email check on update
        if (isset($data['email']) && Schema::hasColumn($table, 'email') && $data['email'] !== $user->email) {
            $exists = DB::table($table)
                ->where('cal_platform_id', $platform->id)
                ->where('email', $data['email'])
                ->where('id', '!=', $userId)
                ->exists();

            if ($exists) {
                return response()->json(['message' => 'A user with this email already exists in this platform.'], 422);
            }
        }

        $data['updated_at'] = now();

        DB::table($table)->where('id', $userId)->update($data);
        $updated = DB::table($table)->find($userId);

        return response()->json($this->formatRow((array) $updated, $table));
    }

    public function destroy(CalPlatform $platform, int $userId): JsonResponse
    {
        $table = $platform->getUsersTable();
        DB::table($table)->where('id', $userId)->where('cal_platform_id', $platform->id)->delete();
        return response()->json(null, 204);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private function validateForTable(Request $request, string $table, int $platformId, bool $isUpdate = false): array
    {
        $required = $isUpdate ? 'sometimes' : 'required';
        $rules    = [
            'name'      => "{$required}|string|max:255",
            'email'     => "{$required}|email|max:255",
            'phone'     => 'nullable|string|max:50',
            'is_active' => 'boolean',
            'metadata'  => 'nullable|array',
        ];

        // Only validate fields that exist in the table
        $validated = [];
        $input     = $request->validate($rules);

        $columns = Schema::getColumnListing($table);
        foreach ($input as $key => $value) {
            if (in_array($key, $columns)) {
                // Encode JSON fields
                if ($key === 'metadata' && is_array($value)) {
                    $validated[$key] = json_encode($value);
                } else {
                    $validated[$key] = $value;
                }
            }
        }

        return $validated;
    }

    private function formatRow(array $row, string $table): array
    {
        $metadata = null;
        if (isset($row['metadata']) && is_string($row['metadata'])) {
            $metadata = json_decode($row['metadata'], true) ?? [];
        } elseif (isset($row['metadata']) && is_array($row['metadata'])) {
            $metadata = $row['metadata'];
        }

        return [
            'id'              => $row['id'],
            'cal_platform_id' => $row['cal_platform_id'] ?? null,
            'name'            => $row['name'] ?? null,
            'email'           => $row['email'] ?? null,
            'phone'           => $row['phone'] ?? null,
            'is_active'       => isset($row['is_active']) ? (bool) $row['is_active'] : true,
            'metadata'        => $metadata ?? [],
            'user_source'     => $table,
            'created_at'      => $row['created_at'] ?? null,
        ];
    }
}
