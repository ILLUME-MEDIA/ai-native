<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\PosCatalogMap;
use App\Models\PosConnection;
use App\Services\Pos\CloverService;
use App\Services\Pos\DeliverectService;
use App\Services\Pos\PosLavuService;
use App\Services\Pos\SpotOnService;
use App\Services\Pos\SquareService;
use App\Services\Pos\ToastService;
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

    // ── Check credentials for all providers ───────────────────────────────────

    public function check(): JsonResponse
    {
        $providers = [];

        foreach (['square', 'clover', 'toast', 'spoton', 'poslavu', 'deliverect'] as $prov) {
            $upper = strtoupper($prov);
            $keyId     = \App\Services\AppSecretService::get("{$upper}_CLIENT_ID",    \App\Services\AppSecretService::get("{$upper}_APP_ID",    config("services.{$prov}.client_id", config("services.{$prov}.app_id"))));
            $keySecret = \App\Services\AppSecretService::get("{$upper}_CLIENT_SECRET", \App\Services\AppSecretService::get("{$upper}_APP_SECRET", config("services.{$prov}.client_secret", config("services.{$prov}.app_secret"))));
            $env       = \App\Services\AppSecretService::get("{$upper}_ENVIRONMENT", config("services.{$prov}.environment", 'sandbox'));

            $providers[$prov] = [
                'app_id'          => filled($keyId),
                'app_secret'      => filled($keySecret),
                'environment'     => $env,
                'credentials_ok'  => filled($keyId) && filled($keySecret),
            ];
        }

        // Live API ping for each active connection
        $connections = PosConnection::where('is_active', true)->get();
        $liveTests   = [];

        foreach ($connections as $conn) {
            $result = ['id' => $conn->id, 'provider' => $conn->provider, 'business_id' => $conn->business_id];
            try {
                match ($conn->provider) {
                    'square' => (function () use ($conn, &$result) {
                        $conn->ensureAccessToken();
                        $locations = app(SquareService::class)->listLocations($conn->decryptedAccessToken());
                        $result['status']    = 'ok';
                        $result['locations'] = count($locations);
                    })(),

                    'clover' => (function () use ($conn, &$result) {
                        $merchant = app(CloverService::class)->getMerchant(
                            $conn->decryptedAccessToken(), $conn->merchant_id
                        );
                        $result['status']   = 'ok';
                        $result['merchant'] = $merchant['name'] ?? $conn->merchant_id;
                    })(),

                    'toast' => (function () use ($conn, &$result) {
                        $conn->ensureAccessToken();
                        $restaurant = app(ToastService::class)->getRestaurant(
                            $conn->decryptedAccessToken(), $conn->merchant_id
                        );
                        $result['status']   = 'ok';
                        $result['merchant'] = $restaurant['general']['name'] ?? $conn->merchant_id;
                    })(),

                    'spoton' => (function () use ($conn, &$result) {
                        $conn->ensureAccessToken();
                        $merchant = app(SpotOnService::class)->getMerchant($conn->decryptedAccessToken());
                        $result['status']   = 'ok';
                        $result['merchant'] = $merchant['name'] ?? $conn->merchant_id;
                    })(),

                    'poslavu' => (function () use ($conn, &$result) {
                        $restaurant = app(PosLavuService::class)->getRestaurant(
                            $conn->decryptedAccessToken(), $conn->merchant_id
                        );
                        $result['status']   = 'ok';
                        $result['merchant'] = $restaurant['name'] ?? $conn->merchant_id;
                    })(),

                    'deliverect' => (function () use ($conn, &$result) {
                        $conn->ensureAccessToken();
                        $account = app(DeliverectService::class)->getAccount(
                            $conn->decryptedAccessToken(), $conn->merchant_id
                        );
                        $result['status']   = 'ok';
                        $result['merchant'] = $account['name'] ?? $conn->merchant_id;
                    })(),

                    default => null,
                };
            } catch (\Throwable $e) {
                $result['status'] = 'error';
                $result['error']  = $e->getMessage();
            }
            $liveTests[] = $result;
        }

        return response()->json([
            ...$providers,
            'connections'        => $liveTests,
            'oauth_callback_url' => [
                'square'  => route('pos.square.callback'),
                'clover'  => route('pos.clover.callback'),
                'spoton'  => route('pos.spoton.callback'),
            ],
        ]);
    }

    // ── Square OAuth ──────────────────────────────────────────────────────────

    public function squareAuthUrl(Request $request): JsonResponse
    {
        $request->validate(['business_id' => 'required|exists:businesses,id']);

        $state = encrypt(['business_id' => $request->business_id, 'ts' => now()->timestamp]);
        $url   = app(SquareService::class)->getAuthUrl($state, route('pos.square.callback'));

        return response()->json(['url' => $url]);
    }

    public function squareCallback(Request $request)
    {
        if ($request->filled('error')) {
            return redirect('/admin/apps/ecommerce/pos?error=' . $request->error);
        }

        try {
            $state      = decrypt($request->state);
            $businessId = $state['business_id'];

            $tokens    = app(SquareService::class)->exchangeCode($request->code, route('pos.square.callback'));
            $locations = app(SquareService::class)->listLocations($tokens['access_token']);
            $primary   = $locations[0] ?? null;

            PosConnection::updateOrCreate(
                ['business_id' => $businessId, 'provider' => 'square'],
                [
                    'access_token'  => encrypt($tokens['access_token']),
                    'refresh_token' => isset($tokens['refresh_token']) ? encrypt($tokens['refresh_token']) : null,
                    'expires_at'    => isset($tokens['expires_at']) ? Carbon::parse($tokens['expires_at']) : null,
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

    public function cloverCallback(Request $request)
    {
        try {
            $state      = decrypt($request->state);
            $businessId = $state['business_id'];
            $merchantId = $state['merchant_id'] ?? $request->merchant_id;

            $tokens   = app(CloverService::class)->exchangeCode($request->code);
            $token    = $tokens['access_token'];
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

    // ── Toast – direct credentials (no user OAuth redirect) ──────────────────

    /**
     * POST /api/ecommerce/pos/toast/connect
     * Accepts {business_id, restaurant_guid} — uses app-level client_id/secret from AppSecrets.
     */
    public function toastConnect(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id'     => 'required|exists:businesses,id',
            'restaurant_guid' => 'required|string',
        ]);

        $toast  = app(ToastService::class);
        $tokens = $toast->getAccessToken();         // uses app-level credentials
        $token  = $tokens['accessToken'] ?? $tokens['access_token'] ?? '';
        $expiry = now()->addSeconds($tokens['expiresIn'] ?? $tokens['expires_in'] ?? 3600);

        // Verify the restaurant exists
        $restaurant = $toast->getRestaurant($token, $data['restaurant_guid']);

        PosConnection::updateOrCreate(
            ['business_id' => $data['business_id'], 'provider' => 'toast'],
            [
                'access_token'  => encrypt($token),
                'refresh_token' => null,
                'expires_at'    => $expiry,
                'merchant_id'   => $data['restaurant_guid'],
                'location_name' => $restaurant['general']['name'] ?? $data['restaurant_guid'],
                'is_active'     => true,
                'connected_at'  => now(),
            ]
        );

        return response()->json(['message' => 'Toast POS connected successfully.', 'status' => 'connected']);
    }

    // ── SpotOn OAuth ──────────────────────────────────────────────────────────

    public function spotOnAuthUrl(Request $request): JsonResponse
    {
        $request->validate(['business_id' => 'required|exists:businesses,id']);

        $state = encrypt(['business_id' => $request->business_id, 'ts' => now()->timestamp]);
        $url   = app(SpotOnService::class)->getAuthUrl($state, route('pos.spoton.callback'));

        return response()->json(['url' => $url]);
    }

    public function spotOnCallback(Request $request)
    {
        if ($request->filled('error')) {
            return redirect('/admin/apps/ecommerce/pos?error=' . $request->error);
        }

        try {
            $state      = decrypt($request->state);
            $businessId = $state['business_id'];

            $tokens   = app(SpotOnService::class)->exchangeCode($request->code, route('pos.spoton.callback'));
            $token    = $tokens['access_token'];
            $expiry   = isset($tokens['expires_in']) ? now()->addSeconds($tokens['expires_in']) : null;
            $merchant = app(SpotOnService::class)->getMerchant($token);

            PosConnection::updateOrCreate(
                ['business_id' => $businessId, 'provider' => 'spoton'],
                [
                    'access_token'  => encrypt($token),
                    'refresh_token' => isset($tokens['refresh_token']) ? encrypt($tokens['refresh_token']) : null,
                    'expires_at'    => $expiry,
                    'merchant_id'   => $merchant['id'] ?? null,
                    'location_name' => $merchant['name'] ?? null,
                    'is_active'     => true,
                    'connected_at'  => now(),
                ]
            );

            return redirect('/admin/apps/ecommerce/pos?provider=spoton&status=connected');
        } catch (\Throwable $e) {
            return redirect('/admin/apps/ecommerce/pos?error=' . urlencode($e->getMessage()));
        }
    }

    // ── POSLavu – direct API key (no user OAuth redirect) ────────────────────

    /**
     * POST /api/ecommerce/pos/poslavu/connect
     * Accepts {business_id, api_key, restaurant_id}
     */
    public function posLavuConnect(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id'   => 'required|exists:businesses,id',
            'api_key'       => 'required|string',
            'restaurant_id' => 'required|string',
        ]);

        $lavu = app(PosLavuService::class);

        // Verify the API key works
        $restaurant = $lavu->getRestaurant($data['api_key'], $data['restaurant_id']);

        PosConnection::updateOrCreate(
            ['business_id' => $data['business_id'], 'provider' => 'poslavu'],
            [
                'access_token'  => encrypt($data['api_key']),
                'refresh_token' => null,
                'expires_at'    => null,                          // API keys don't expire
                'merchant_id'   => $data['restaurant_id'],
                'location_name' => $restaurant['name'] ?? $data['restaurant_id'],
                'is_active'     => true,
                'connected_at'  => now(),
            ]
        );

        return response()->json(['message' => 'POSLavu connected successfully.', 'status' => 'connected']);
    }

    // ── Deliverect – client credentials (no user OAuth redirect) ─────────────

    /**
     * POST /api/ecommerce/pos/deliverect/connect
     * Accepts {business_id, account_id} — uses app-level client_id/secret from AppSecrets.
     */
    public function deliverectConnect(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id' => 'required|exists:businesses,id',
            'account_id'  => 'required|string',
        ]);

        $deliverect = app(DeliverectService::class);
        $tokens     = $deliverect->getAccessToken();
        $token      = $tokens['access_token'];
        $expiry     = now()->addSeconds($tokens['expires_in'] ?? 3600);

        // Verify account exists
        $account = $deliverect->getAccount($token, $data['account_id']);

        PosConnection::updateOrCreate(
            ['business_id' => $data['business_id'], 'provider' => 'deliverect'],
            [
                'access_token'  => encrypt($token),
                'refresh_token' => null,
                'expires_at'    => $expiry,
                'merchant_id'   => $data['account_id'],
                'location_name' => $account['name'] ?? $data['account_id'],
                'is_active'     => true,
                'connected_at'  => now(),
            ]
        );

        return response()->json(['message' => 'Deliverect connected successfully.', 'status' => 'connected']);
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
        // Attempt token revocation for providers that support it
        if ($connection->provider === 'square') {
            try {
                app(SquareService::class)->revokeToken($connection->decryptedAccessToken());
            } catch (\Throwable) {
                // Ignore
            }
        }

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

    /** PATCH /api/ecommerce/pos/{connection}/location */
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

    /**
     * GET /api/ecommerce/pos/{connection}/channel-links
     * Deliverect: list all channel links (locations / virtual brands).
     */
    public function channelLinks(PosConnection $connection): JsonResponse
    {
        abort_unless($connection->provider === 'deliverect', 422, 'Channel links only available for Deliverect.');

        $connection->ensureAccessToken();
        $links = app(DeliverectService::class)->getChannelLinks(
            $connection->decryptedAccessToken(),
            $connection->merchant_id
        );

        return response()->json($links);
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
