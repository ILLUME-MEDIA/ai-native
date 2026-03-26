<?php

namespace App\Services\Pos;

use Illuminate\Support\Facades\Http;

/**
 * Toast POS – uses machine-to-machine client credentials (no user OAuth redirect).
 * Credentials: client_id + client_secret + restaurant_guid.
 * Token endpoint: POST /authentication/v1/authentication/login
 */
class ToastService
{
    private string $clientId;
    private string $clientSecret;
    private string $baseUrl;

    public function __construct()
    {
        $env               = \App\Services\AppSecretService::get('TOAST_ENVIRONMENT', config('services.toast.environment', 'sandbox'));
        $this->clientId    = \App\Services\AppSecretService::get('TOAST_CLIENT_ID',    config('services.toast.client_id',    ''));
        $this->clientSecret = \App\Services\AppSecretService::get('TOAST_CLIENT_SECRET', config('services.toast.client_secret', ''));
        $this->baseUrl     = $env === 'production'
            ? 'https://ws-api.toasttab.com'
            : 'https://ws-sandbox-api.toasttab.com';
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    /**
     * Obtain a short-lived access token (machine-to-machine).
     * Returns the full token response array.
     */
    public function getAccessToken(): array
    {
        $response = Http::post("{$this->baseUrl}/authentication/v1/authentication/login", [
            'clientId'       => $this->clientId,
            'clientSecret'   => $this->clientSecret,
            'userAccessType' => 'TOAST_MACHINE_CLIENT',
        ]);

        $this->assertSuccess($response, 'Toast auth');

        return $response->json('token');
    }

    /**
     * Verify the stored client credentials are valid and return restaurant info.
     */
    public function getRestaurant(string $accessToken, string $restaurantGuid): array
    {
        $response = $this->request($accessToken, $restaurantGuid)
                         ->get("{$this->baseUrl}/restaurants/v1/restaurants/{$restaurantGuid}");

        if (!$response->successful()) {
            throw new \RuntimeException('Toast restaurant fetch failed: ' . $response->body());
        }

        return $response->json() ?? [];
    }

    // ── Menu ──────────────────────────────────────────────────────────────────

    /** Get all menu items for a restaurant. */
    public function getMenuItems(string $accessToken, string $restaurantGuid): array
    {
        $response = $this->request($accessToken, $restaurantGuid)
                         ->get("{$this->baseUrl}/config/v2/menuItems");

        return $response->json() ?? [];
    }

    /** Get full menus (menu groups + items). */
    public function getMenus(string $accessToken, string $restaurantGuid): array
    {
        $response = $this->request($accessToken, $restaurantGuid)
                         ->get("{$this->baseUrl}/config/v2/menus");

        return $response->json() ?? [];
    }

    /**
     * Create or update a menu item.
     * Toast uses PUT for upsert on menu items.
     */
    public function upsertMenuItem(string $accessToken, string $restaurantGuid, array $item): array
    {
        $response = $this->request($accessToken, $restaurantGuid)
                         ->post("{$this->baseUrl}/config/v2/menuItems", $item);

        $this->assertSuccess($response, 'Toast menu item upsert');

        return $response->json() ?? [];
    }

    // ── Orders ────────────────────────────────────────────────────────────────

    /** List recent orders for a restaurant. */
    public function getOrders(string $accessToken, string $restaurantGuid, int $pageSize = 50): array
    {
        $response = $this->request($accessToken, $restaurantGuid)
                         ->get("{$this->baseUrl}/orders/v2/orders", [
                             'pageSize' => $pageSize,
                         ]);

        return $response->json() ?? [];
    }

    /**
     * Create a new order in Toast.
     * Minimum payload: checks[0].selections[]{itemGuid, quantity}
     */
    public function createOrder(string $accessToken, string $restaurantGuid, array $order): array
    {
        $response = $this->request($accessToken, $restaurantGuid)
                         ->post("{$this->baseUrl}/orders/v2/orders", $order);

        $this->assertSuccess($response, 'Toast create order');

        return $response->json() ?? [];
    }

    /** Get a specific order. */
    public function getOrder(string $accessToken, string $restaurantGuid, string $orderGuid): array
    {
        $response = $this->request($accessToken, $restaurantGuid)
                         ->get("{$this->baseUrl}/orders/v2/orders/{$orderGuid}");

        return $response->json() ?? [];
    }

    // ── Payments ──────────────────────────────────────────────────────────────

    /** Add a payment to an existing order check. */
    public function addPayment(
        string $accessToken,
        string $restaurantGuid,
        string $orderGuid,
        string $checkGuid,
        array  $payment
    ): array {
        $response = $this->request($accessToken, $restaurantGuid)
                         ->post("{$this->baseUrl}/orders/v2/orders/{$orderGuid}/checks/{$checkGuid}/payments", $payment);

        $this->assertSuccess($response, 'Toast add payment');

        return $response->json() ?? [];
    }

    // ── Webhook ───────────────────────────────────────────────────────────────

    /** Verify Toast webhook HMAC-SHA256 signature. */
    public function verifyWebhookSignature(string $body, string $signature, string $secret): bool
    {
        $expected = hash_hmac('sha256', $body, $secret);
        return hash_equals($expected, $signature);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function request(string $accessToken, string $restaurantGuid)
    {
        return Http::withHeaders([
            'Authorization'                  => "Bearer {$accessToken}",
            'Toast-Restaurant-External-ID'   => $restaurantGuid,
            'Content-Type'                   => 'application/json',
        ]);
    }

    private function assertSuccess($response, string $context): void
    {
        if (!$response->successful()) {
            $msg = $response->json('message') ?? $response->body();
            throw new \RuntimeException("{$context} failed: {$msg}");
        }
    }
}
