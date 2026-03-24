<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\OpenorgUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OpenorgUsersController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = OpenorgUser::with('platform')->orderBy('name');

        if ($platformId = $request->query('platform_id')) {
            $query->where('cal_platform_id', $platformId);
        }

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        $users = $query->get()->map(fn ($u) => $this->format($u));

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cal_platform_id' => 'required|exists:cal_platforms,id',
            'name'            => 'required|string|max:255',
            'email'           => 'required|email|max:255',
            'phone'           => 'nullable|string|max:50',
            'is_active'       => 'boolean',
            'metadata'        => 'nullable|array',
        ]);

        // Ensure unique email per platform
        $exists = OpenorgUser::where('cal_platform_id', $data['cal_platform_id'])
            ->where('email', $data['email'])->exists();

        if ($exists) {
            return response()->json(['message' => 'A user with this email already exists in this platform.'], 422);
        }

        $user = OpenorgUser::create($data);

        return response()->json($this->format($user->load('platform')), 201);
    }

    public function update(Request $request, OpenorgUser $openorgUser): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'sometimes|string|max:255',
            'email'    => 'sometimes|email|max:255',
            'phone'    => 'nullable|string|max:50',
            'is_active'=> 'boolean',
            'metadata' => 'nullable|array',
        ]);

        // Unique email check on update
        if (isset($data['email']) && $data['email'] !== $openorgUser->email) {
            $exists = OpenorgUser::where('cal_platform_id', $openorgUser->cal_platform_id)
                ->where('email', $data['email'])->where('id', '!=', $openorgUser->id)->exists();

            if ($exists) {
                return response()->json(['message' => 'A user with this email already exists in this platform.'], 422);
            }
        }

        $openorgUser->update($data);

        return response()->json($this->format($openorgUser->fresh()->load('platform')));
    }

    public function destroy(OpenorgUser $openorgUser): JsonResponse
    {
        $openorgUser->delete();
        return response()->json(null, 204);
    }

    private function format(OpenorgUser $u): array
    {
        return [
            'id'              => $u->id,
            'cal_platform_id' => $u->cal_platform_id,
            'platform_name'   => $u->relationLoaded('platform') ? $u->platform?->name : null,
            'name'            => $u->name,
            'email'           => $u->email,
            'phone'           => $u->phone,
            'is_active'       => $u->is_active,
            'metadata'        => $u->metadata ?? [],
            'created_at'      => $u->created_at,
        ];
    }
}
