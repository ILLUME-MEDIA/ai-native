<?php

namespace App\Services\Pos;

use Illuminate\Support\Facades\Http;

/**
 * Deliverect – OAuth2 client credentials (no user redirect).
 * Focused on bidirectional menu sync + order management across delivery channels.
 *
 * Auth: POST https://api.deliverect.com/oauth/token  (client_credentials)
 * API:  https://api.deliverect.com/
 */
class DeliverectService
{
    private string $clientId;
    private string $clientSecret;
    private string $baseUrl;

    public function __construct()
    {
        $this->clientId     = \App\Services\AppSecretService::get('DELIVERECT_CLIENT_ID',    config('services.deliverect.client_id',    ''));
        $this->clientSecret = \App\Services\AppSecretService::get('DELIVERECT_CLIENT_SECRET', config('services.deliverect.client_secret', ''));
        $this->baseUrl      = 'https://api.deliverect.com';
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    /**
     * Obtain access token via client_credentials grant.
     * Returns array with access_token, expires_in.
     */
    public function getAccessToken(): array
    {
        $response = Http::asForm()->post("{$this->baseUrl}/oauth/token", [
            'grant_type'    => 'client_credentials',
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
        ]);

        $this->assertSuccess($response, 'Deliverect auth');

        return $response->json();
    }

    // ── Account ───────────────────────────────────────────────────────────────

    /** Get account details (verify connection). */
    public function getAccount(string $accessToken, string $accountId): array
    {
        $response = Http::withToken($accessToken)
                        ->get("{$this->baseUrl}/account/{$accountId}");

        if (!$response->successful()) {
            throw new \RuntimeException('Deliverect account fetch failed: ' . $response->body());
        }

        return $response->json() ?? [];
    }

    /** List all channel links (locations / virtual brands). */
    public function getChannelLinks(string $accessToken, string $accountId, int $skip = 0, int $take = 100): array
    {
        $items = [];

        do {
            $response = Http::withToken($accessToken)
                            ->get("{$this->baseUrl}/channelLink", [
                                'accountId' => $accountId,
                                'skip'      => $skip,
                                'take'      => $take,
                            ]);

            $batch = $response->json('channelLinks', $response->json() ?? []);
            if (!is_array($batch)) $batch = [];

            $items  = array_merge($items, $batch);
            $skip  += count($batch);
        } while (count($batch) === $take);

        return $items;
    }

    // ── Menu ──────────────────────────────────────────────────────────────────

    /** Get the current menu for a location (channel link). */
    public function getMenu(string $accessToken, string $accountId, string $locationId): array
    {
        $response = Http::withToken($accessToken)
                        ->get("{$this->baseUrl}/menu/{$accountId}/{$locationId}");

        return $response->json() ?? [];
    }

    /**
     * Push a complete menu to a location.
     * Deliverect uses a structured menu payload:
     * { name, description, imageUrl, menus: [{ name, items: [{ plu, name, price, ... }] }] }
     */
    public function pushMenu(string $accessToken, string $accountId, string $locationId, array $menu): array
    {
        $response = Http::withToken($accessToken)
                        ->put("{$this->baseUrl}/menu/{$accountId}/{$locationId}", $menu);

        $this->assertSuccess($response, 'Deliverect push menu');

        return $response->json() ?? [];
    }

    /** Get menu status after a push (async validation). */
    public function getMenuStatus(string $accessToken, string $accountId, string $locationId): array
    {
        $response = Http::withToken($accessToken)
                        ->get("{$this->baseUrl}/menuStatus/{$accountId}/{$locationId}");

        return $response->json() ?? [];
    }

    // ── Orders ────────────────────────────────────────────────────────────────

    /** List orders for an account. */
    public function getOrders(string $accessToken, string $accountId, int $skip = 0, int $take = 50): array
    {
        $response = Http::withToken($accessToken)
                        ->get("{$this->baseUrl}/order/{$accountId}", [
                            'skip' => $skip,
                            'take' => $take,
                        ]);

        return $response->json('orders', $response->json() ?? []);
    }

    /** Get a specific order. */
    public function getOrder(string $accessToken, string $accountId, string $orderId): array
    {
        $response = Http::withToken($accessToken)
                        ->get("{$this->baseUrl}/order/{$accountId}/{$orderId}");

        return $response->json() ?? [];
    }

    /** Update order status (e.g., accept, reject, ready). */
    public function updateOrderStatus(string $accessToken, string $accountId, string $orderId, string $status): array
    {
        $response = Http::withToken($accessToken)
                        ->patch("{$this->baseUrl}/order/{$accountId}/{$orderId}", [
                            'status' => $status,
                        ]);

        $this->assertSuccess($response, 'Deliverect update order status');

        return $response->json() ?? [];
    }

    /**
     * Create/inject an order into Deliverect (e.g., from your own checkout).
     */
    public function createOrder(string $accessToken, string $accountId, array $order): array
    {
        $response = Http::withToken($accessToken)
                        ->post("{$this->baseUrl}/order/{$accountId}", $order);

        $this->assertSuccess($response, 'Deliverect create order');

        return $response->json() ?? [];
    }

    // ── Webhook ───────────────────────────────────────────────────────────────

    public function verifyWebhookSignature(string $body, string $signature, string $secret): bool
    {
        $expected = hash_hmac('sha256', $body, $secret);
        return hash_equals($expected, $signature);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function assertSuccess($response, string $context): void
    {
        if (!$response->successful()) {
            $msg = $response->json('message') ?? $response->json('error') ?? $response->body();
            throw new \RuntimeException("{$context} failed: {$msg}");
        }
    }
}
