<?php

namespace App\Services\Pos;

use Illuminate\Support\Facades\Http;

/**
 * SpotOn POS – standard OAuth 2.0 authorization-code flow.
 * Auth URL: https://login.spoton.com/oauth/authorize
 * Token URL: https://login.spoton.com/oauth/token
 * API Base: https://api.spoton.com/
 */
class SpotOnService
{
    private string $clientId;
    private string $clientSecret;
    private string $authBase;
    private string $apiBase;

    public function __construct()
    {
        $env                = \App\Services\AppSecretService::get('SPOTON_ENVIRONMENT', config('services.spoton.environment', 'sandbox'));
        $this->clientId     = \App\Services\AppSecretService::get('SPOTON_CLIENT_ID',    config('services.spoton.client_id',    ''));
        $this->clientSecret = \App\Services\AppSecretService::get('SPOTON_CLIENT_SECRET', config('services.spoton.client_secret', ''));

        if ($env === 'production') {
            $this->authBase = 'https://login.spoton.com';
            $this->apiBase  = 'https://api.spoton.com';
        } else {
            $this->authBase = 'https://login.sandbox.spoton.com';
            $this->apiBase  = 'https://api.sandbox.spoton.com';
        }
    }

    // ── OAuth ─────────────────────────────────────────────────────────────────

    public function getAuthUrl(string $state, string $redirectUri): string
    {
        $params = http_build_query([
            'client_id'     => $this->clientId,
            'response_type' => 'code',
            'redirect_uri'  => $redirectUri,
            'scope'         => 'read:menu write:menu read:orders write:orders read:merchant',
            'state'         => $state,
        ]);

        return "{$this->authBase}/oauth/authorize?{$params}";
    }

    public function exchangeCode(string $code, string $redirectUri): array
    {
        $response = Http::asForm()->post("{$this->authBase}/oauth/token", [
            'grant_type'    => 'authorization_code',
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
            'code'          => $code,
            'redirect_uri'  => $redirectUri,
        ]);

        $this->assertSuccess($response, 'SpotOn OAuth token exchange');

        return $response->json();
    }

    public function refreshToken(string $refreshToken): array
    {
        $response = Http::asForm()->post("{$this->authBase}/oauth/token", [
            'grant_type'    => 'refresh_token',
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
            'refresh_token' => $refreshToken,
        ]);

        $this->assertSuccess($response, 'SpotOn token refresh');

        return $response->json();
    }

    // ── Merchant ──────────────────────────────────────────────────────────────

    public function getMerchant(string $accessToken): array
    {
        $response = Http::withToken($accessToken)
                        ->get("{$this->apiBase}/merchant/v1/me");

        return $response->json() ?? [];
    }

    // ── Menu / Items ──────────────────────────────────────────────────────────

    /** List all menu items for a merchant. */
    public function getMenuItems(string $accessToken, string $merchantId, int $limit = 100): array
    {
        $items  = [];
        $page   = 1;

        do {
            $response = Http::withToken($accessToken)
                            ->get("{$this->apiBase}/merchant/v1/{$merchantId}/menu/items", [
                                'limit' => $limit,
                                'page'  => $page,
                            ]);

            $data   = $response->json();
            $batch  = $data['data'] ?? $data['items'] ?? [];
            $items  = array_merge($items, $batch);
            $page++;
        } while (count($batch) === $limit);

        return $items;
    }

    public function createMenuItem(string $accessToken, string $merchantId, array $item): array
    {
        $response = Http::withToken($accessToken)
                        ->post("{$this->apiBase}/merchant/v1/{$merchantId}/menu/items", $item);

        $this->assertSuccess($response, 'SpotOn create menu item');

        return $response->json();
    }

    public function updateMenuItem(string $accessToken, string $merchantId, string $itemId, array $item): array
    {
        $response = Http::withToken($accessToken)
                        ->put("{$this->apiBase}/merchant/v1/{$merchantId}/menu/items/{$itemId}", $item);

        $this->assertSuccess($response, 'SpotOn update menu item');

        return $response->json();
    }

    // ── Orders ────────────────────────────────────────────────────────────────

    public function getOrders(string $accessToken, string $merchantId, int $limit = 50): array
    {
        $response = Http::withToken($accessToken)
                        ->get("{$this->apiBase}/merchant/v1/{$merchantId}/orders", [
                            'limit' => $limit,
                        ]);

        return $response->json('data', []);
    }

    public function createOrder(string $accessToken, string $merchantId, array $order): array
    {
        $response = Http::withToken($accessToken)
                        ->post("{$this->apiBase}/merchant/v1/{$merchantId}/orders", $order);

        $this->assertSuccess($response, 'SpotOn create order');

        return $response->json();
    }

    public function getOrder(string $accessToken, string $merchantId, string $orderId): array
    {
        return Http::withToken($accessToken)
                   ->get("{$this->apiBase}/merchant/v1/{$merchantId}/orders/{$orderId}")
                   ->json() ?? [];
    }

    // ── Payments ──────────────────────────────────────────────────────────────

    public function createPayment(string $accessToken, string $merchantId, string $orderId, array $payment): array
    {
        $response = Http::withToken($accessToken)
                        ->post("{$this->apiBase}/merchant/v1/{$merchantId}/orders/{$orderId}/payments", $payment);

        $this->assertSuccess($response, 'SpotOn create payment');

        return $response->json();
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
            $msg = $response->json('message') ?? $response->json('error_description') ?? $response->body();
            throw new \RuntimeException("{$context} failed: {$msg}");
        }
    }
}
