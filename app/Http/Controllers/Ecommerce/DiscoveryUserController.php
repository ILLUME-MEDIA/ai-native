<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\DiscoveryUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DiscoveryUserController extends Controller
{
    // ── OTP Auth helper ───────────────────────────────────────────────────────

    /**
     * Resolve a DiscoveryUser from an OTP Bearer token.
     * Returns [user|null, error_code|null] tuple for specific failure reasons.
     */
    protected function resolveOtpUser(Request $request): array
    {
        $auth = $request->header('Authorization', '');
        if (! str_starts_with($auth, 'Bearer ')) {
            return [null, 'no_token'];
        }
        $token = substr($auth, 7);
        try {
            $payload = decrypt($token);

            if (! isset($payload['type'], $payload['id'], $payload['exp'], $payload['table'])) {
                return [null, 'invalid_token'];
            }
            if ($payload['type'] !== 'otp_auth') {
                return [null, 'invalid_token_type'];  // e.g. otp_session token used by mistake
            }
            if ($payload['table'] !== 'discovery_users') {
                return [null, 'wrong_table'];          // token was issued for a different table
            }
            if (Carbon::createFromTimestamp($payload['exp'])->isPast()) {
                return [null, 'token_expired'];
            }

            $user = DiscoveryUser::find((int) $payload['id']);
            return $user ? [$user, null] : [null, 'user_not_found'];

        } catch (\Throwable) {
            return [null, 'decrypt_failed'];           // wrong APP_KEY or tampered token
        }
    }

    private function otpRequired(Request $request): DiscoveryUser|JsonResponse
    {
        [$user, $errorCode] = $this->resolveOtpUser($request);

        if (! $user) {
            $messages = [
                'no_token'          => 'No Bearer token provided.',
                'invalid_token'     => 'Bearer token is malformed.',
                'invalid_token_type'=> 'Token type invalid. Use the "token" from POST /otp-auth/verify (not otp_session).',
                'wrong_table'       => 'Token was issued for a different table. Re-verify with table=discovery_users.',
                'token_expired'     => 'OTP token expired. Re-verify via POST /otp-auth/verify.',
                'user_not_found'    => 'User not found. Account may have been deleted.',
                'decrypt_failed'    => 'Token decryption failed. Check APP_KEY or re-verify.',
            ];
            return response()->json([
                'success' => false,
                'message' => $messages[$errorCode] ?? 'OTP Bearer token required.',
                'hint'    => 'POST /otp-auth/verify with { email, otp, table: "discovery_users" } → use the returned "token" field.',
                'code'    => $errorCode ?? 'otp_required',
            ], 401);
        }
        return $user;
    }

    // ── OTP "me" endpoints ────────────────────────────────────────────────────

    public function meShow(Request $request): JsonResponse
    {
        $user = $this->otpRequired($request);
        if ($user instanceof JsonResponse) return $user;

        return response()->json(['success' => true, 'user' => $user->load('location')]);
    }

    public function meUpdate(Request $request): JsonResponse
    {
        $user = $this->otpRequired($request);
        if ($user instanceof JsonResponse) return $user;

        $user->update($request->only(['name', 'email', 'phone', 'photo', 'audio', 'bio']));
        return response()->json(['success' => true, 'user' => $user->fresh()->load('location')]);
    }

    // ── OTP Location endpoints ─────────────────────────────────────────────────

    public function locationShow(Request $request): JsonResponse
    {
        $user = $this->otpRequired($request);
        if ($user instanceof JsonResponse) return $user;

        $location = $user->location;
        return response()->json(['success' => true, 'location' => $location]);
    }

    public function locationSave(Request $request): JsonResponse
    {
        $user = $this->otpRequired($request);
        if ($user instanceof JsonResponse) return $user;

        $data = $request->validate([
            'lat'               => 'nullable|numeric|between:-90,90',
            'lng'               => 'nullable|numeric|between:-180,180',
            'address'           => 'nullable|string|max:300',
            'city'              => 'nullable|string|max:100',
            'state'             => 'nullable|string|max:100',
            'zip'               => 'nullable|string|max:20',
            'country'           => 'nullable|string|max:100',
            'country_code'      => 'nullable|string|size:2',
            'location_from_gps' => 'boolean',
        ]);

        $location = $user->location()->updateOrCreate(
            ['discovery_user_id' => $user->id],
            $data
        );

        $status = $location->wasRecentlyCreated ? 201 : 200;
        return response()->json(['success' => true, 'location' => $location->fresh()], $status);
    }

    public function locationDestroy(Request $request): JsonResponse
    {
        $user = $this->otpRequired($request);
        if ($user instanceof JsonResponse) return $user;

        optional($user->location)->delete();
        return response()->json(['success' => true, 'message' => 'Location removed.']);
    }

    // ── Admin endpoints (Sanctum) ─────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $q = DiscoveryUser::with('location');

        if ($request->filled('search')) {
            $s = $request->search;
            $q->where(function ($q) use ($s) {
                $q->where('name', 'like', "%$s%")
                  ->orWhere('email', 'like', "%$s%")
                  ->orWhere('ip_address', 'like', "%$s%")
                  ->orWhereHas('location', fn($lq) =>
                      $lq->where('city', 'like', "%$s%")
                         ->orWhere('country', 'like', "%$s%")
                  );
            });
        }

        if ($request->filled('device_type')) {
            $q->where('device_type', $request->device_type);
        }

        if ($request->filled('browser')) {
            $q->where('browser', $request->browser);
        }

        if ($request->filled('country_code')) {
            $q->whereHas('location', fn($lq) =>
                $lq->where('country_code', $request->country_code)
            );
        }

        return response()->json(
            $q->orderByDesc('last_seen_at')->orderByDesc('id')->paginate(25)
        );
    }

    public function show(DiscoveryUser $discoveryUser): JsonResponse
    {
        return response()->json($discoveryUser->load('location'));
    }

    public function update(Request $request, DiscoveryUser $discoveryUser): JsonResponse
    {
        $discoveryUser->update($request->only(['name', 'email', 'phone', 'photo', 'audio', 'bio']));
        return response()->json($discoveryUser->load('location'));
    }

    public function destroy(DiscoveryUser $discoveryUser): JsonResponse
    {
        $discoveryUser->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
