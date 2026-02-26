<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\PosCatalogMap;
use App\Models\PosConnection;
use App\Services\Pos\CloverService;
use App\Services\Pos\SquareService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PosController extends Controller
{
    // ── List all POS connections (admin) ──────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $q = PosConnection::with('business')->orderBy('provider');

        if ($request->filled('business_id')) {
            $q->where('business_id', $request->business_id);
        }

        return response()->json($q->get()->map(fn ($c) => $this->connectionSummary($c)));
    }

    // ── Square OAuth ──────────────────────────────────────────────────────────

    /** GET /api/ecommerce/pos/square/auth-url?business_id= */
    public function squareAuthUrl(Request $request): JsonResponse
    {
        $request->validate(['business_id' => 'required|exists:businesses,id']);

        $state = encrypt(['business_id' => $request->business_id, 'ts' => now()->timestamp]);
        $url   = app(SquareService::class)->getAuthUrl($state, route('pos.square.callback'));

        return response()->json(['url' => $url]);
    }

    /** GET /pos/square/callback  (web route — redirects to admin page) */
    public function squareCallback(Request $request)
    {
        if ($request->filled('error')) {
            return redirect('/admin/apps/ecommerce/pos?error=' . $request->error);
        }

        try {
            $state      = decrypt($request->state);
            $businessId = $state['business_id'];

            $tokens    = app(SquareService::class)
                             ->exchangeCode($request->code, route('pos.square.callback'));

            $locations = app(SquareService::class)->listLocations($tokens['access_token']);
            $primary   = $locations[0] ?? null;

            PosConnection::updateOrCreate(
                ['business_id' => $businessId, 'provider' => 'square'],
                [
                    'access_token'  => encrypt($tokens['access_token']),
                    'refresh_token' => isset($tokens['refresh_token'])
                        ? encrypt($tokens['refresh_token']) : null,
                    'expires_at'    => isset($tokens['expires_at'])
                        ? Carbon::parse($tokens['expires_at']) : null,
                    'merchant_id'   => $tokens['merchant_id'] ?? null,
                    'location_id'   => $primary['id'] ?? null,
                    'location_name' => $primary['name'] ?? null,
                    'is_active'     => true,
                    'connected_at'  => now(),
                ]
            );

            return redirect('/admin/apps/ecommerce/pos?provider=square&status=connected');
        } catch (\Throwable $e) {
            return redirect('/admin/apps/ecommerce/pos?error=' . urlencode($e->getMessage()));
        }
    }

    // ── Clover OAuth ──────────────────────────────────────────────────────────

    /** GET /api/ecommerce/pos/clover/auth-url?business_id=&merchant_id= */
    public function cloverAuthUrl(Request $request): JsonResponse
    {
        $request->validate([
            'business_id' => 'required|exists:businesses,id',
            'merchant_id' => 'required|string',
        ]);

        $state = encrypt([
            'business_id' => $request->business_id,
            'merchant_id' => $request->merchant_id,
            'ts'          => now()->timestamp,
        ]);

        $url = app(CloverService::class)->getAuthUrl($state, route('pos.clover.callback'));

        return response()->json(['url' => $url]);
    }

    /** GET /pos/clover/callback */
    public function cloverCallback(Request $request)
    {
        try {
            $state      = decrypt($request->state);
            $businessId = $state['business_id'];
            $merchantId = $state['merchant_id'] ?? $request->merchant_id;

            $tokens  = app(CloverService::class)->exchangeCode($request->code);
            $token   = $tokens['access_token'];
            $merchant = app(CloverService::class)->getMerchant($token, $merchantId);

            PosConnection::updateOrCreate(
                ['business_id' => $businessId, 'provider' => 'clover'],
                [
                    'access_token'  => encrypt($token),
                    'refresh_token' => null,
                    'merchant_id'   => $merchantId,
                    'location_name' => $merchant['name'] ?? null,
                    'is_active'     => true,
                    'connected_at'  => now(),
                ]
            );

            return redirect('/admin/apps/ecommerce/pos?provider=clover&status=connected');
        } catch (\Throwable $e) {
            return redirect('/admin/apps/ecommerce/pos?error=' . urlencode($e->getMessage()));
        }
    }

    // ── Manage connections ────────────────────────────────────────────────────

    public function show(PosConnection $connection): JsonResponse
    {
        return response()->json($this->connectionSummary($connection));
    }

    public function update(Request $request, PosConnection $connection): JsonResponse
    {
        $data = $request->validate([
            'location_id'   => 'sometimes|string|nullable',
            'location_name' => 'sometimes|string|nullable',
            'is_active'     => 'boolean',
        ]);

        $connection->update($data);

        return response()->json($this->connectionSummary($connection->fresh()));
    }

    public function disconnect(PosConnection $connection): JsonResponse
    {
        // Attempt to revoke token on Square side
        if ($connection->provider === 'square') {
            try {
                app(SquareService::class)->revokeToken($connection->decryptedAccessToken());
            } catch (\Throwable) {
                // Ignore revocation errors — proceed with local disconnect
            }
        }

        // Delete catalog maps and POS orders for this connection
        PosCatalogMap::where('business_id', $connection->business_id)
                     ->where('provider', $connection->provider)
                     ->delete();

        $provider = ucfirst($connection->provider);
        $connection->delete();

        return response()->json(['message' => "{$provider} disconnected successfully."]);
    }

    /** GET /api/ecommerce/pos/{connection}/locations — Square only */
    public function locations(PosConnection $connection): JsonResponse
    {
        abort_unless($connection->provider === 'square', 422, 'Locations only available for Square.');

        $connection->ensureAccessToken();
        $locations = app(SquareService::class)->listLocations($connection->decryptedAccessToken());

        return response()->json($locations);
    }

    /** PATCH /api/ecommerce/pos/{connection}/location — set active Square location */
    public function setLocation(Request $request, PosConnection $connection): JsonResponse
    {
        abort_unless($connection->provider === 'square', 422);

        $data = $request->validate([
            'location_id'   => 'required|string',
            'location_name' => 'required|string',
        ]);

        $connection->update($data);

        return response()->json(['message' => 'Location updated.', 'connection' => $this->connectionSummary($connection->fresh())]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function connectionSummary(PosConnection $c): array
    {
        return [
            'id'             => $c->id,
            'business_id'    => $c->business_id,
            'business_name'  => $c->business?->name,
            'provider'       => $c->provider,
            'merchant_id'    => $c->merchant_id,
            'location_id'    => $c->location_id,
            'location_name'  => $c->location_name,
            'is_active'      => $c->is_active,
            'connected_at'   => $c->connected_at,
            'expires_at'     => $c->expires_at,
            'catalog_count'  => PosCatalogMap::where('business_id', $c->business_id)
                                             ->where('provider', $c->provider)
                                             ->whereNotNull('menu_item_id')
                                             ->count(),
        ];
    }
}
