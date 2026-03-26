<?php

namespace App\Services\Pos;

use Illuminate\Support\Facades\Http;

class CloverService
{
    private string $appId;
    private string $appSecret;
    private string $baseUrl;

    public function __construct()
    {
        $env             = \App\Services\AppSecretService::get('CLOVER_ENVIRONMENT', config('services.clover.environment', 'sandbox'));
        $this->appId     = \App\Services\AppSecretService::get('CLOVER_APP_ID',     config('services.clover.app_id',     ''));
        $this->appSecret = \App\Services\AppSecretService::get('CLOVER_APP_SECRET', config('services.clover.app_secret', ''));
        $this->baseUrl   = $env === 'production'
            ? 'https://www.clover.com'
            : 'https://sandbox.dev.clover.com';
    }

    // ── OAuth ─────────────────────────────────────────────────────────────────

    public function getAuthUrl(string $state, string $redirectUri): string
    {
        $params = http_build_query([
            'client_id'    => $this->appId,
            'redirect_uri' => $redirectUri,
            'state'        => $state,
        ]);

        return "{$this->baseUrl}/oauth/authorize?{$params}";
    }

    public function exchangeCode(string $code): array
    {
        $response = Http::get("{$this->baseUrl}/oauth/token", [
            'client_id'     => $this->appId,
            'client_secret' => $this->appSecret,
            'code'          => $code,
        ]);

        if (!$response->successful()) {
            throw new \RuntimeException('Clover OAuth failed: ' . $response->body());
        }

        return $response->json();
    }

    // ── Merchant ──────────────────────────────────────────────────────────────

    public function getMerchant(string $accessToken, string $merchantId): array
    {
        return Http::withToken($accessToken)
                   ->get("{$this->baseUrl}/v3/merchants/{$merchantId}", ['expand' => 'address'])
                   ->json();
    }

    // ── Inventory (Items) ─────────────────────────────────────────────────────

    public function getItems(string $accessToken, string $merchantId, int $limit = 100): array
    {
        $items  = [];
        $offset = 0;

        do {
            $data = Http::withToken($accessToken)
                        ->get("{$this->baseUrl}/v3/merchants/{$merchantId}/items", [
                            'expand' => 'categories,modifierGroups',
                            'limit'  => $limit,
                            'offset' => $offset,
                        ])
                        ->json();

            $batch = $data['elements'] ?? [];
            $items = array_merge($items, $batch);
            $offset += count($batch);
        } while (count($batch) === $limit);

        return $items;
    }

    public function createItem(string $accessToken, string $merchantId, array $data): array
    {
        $response = Http::withToken($accessToken)
                        ->post("{$this->baseUrl}/v3/merchants/{$merchantId}/items", $data);

        if (!$response->successful()) {
            throw new \RuntimeException('Clover create item failed: ' . $response->body());
        }

        return $response->json();
    }

    public function updateItem(string $accessToken, string $merchantId, string $itemId, array $data): array
    {
        $response = Http::withToken($accessToken)
                        ->post("{$this->baseUrl}/v3/merchants/{$merchantId}/items/{$itemId}", $data);

        if (!$response->successful()) {
            throw new \RuntimeException('Clover update item failed: ' . $response->body());
        }

        return $response->json();
    }

    public function deleteItem(string $accessToken, string $merchantId, string $itemId): void
    {
        Http::withToken($accessToken)
            ->delete("{$this->baseUrl}/v3/merchants/{$merchantId}/items/{$itemId}");
    }

    public function getCategories(string $accessToken, string $merchantId): array
    {
        return Http::withToken($accessToken)
                   ->get("{$this->baseUrl}/v3/merchants/{$merchantId}/categories")
                   ->json('elements', []);
    }

    public function createCategory(string $accessToken, string $merchantId, string $name): array
    {
        return Http::withToken($accessToken)
                   ->post("{$this->baseUrl}/v3/merchants/{$merchantId}/categories", ['name' => $name])
                   ->json();
    }

    // ── Orders ────────────────────────────────────────────────────────────────

    public function getOrders(string $accessToken, string $merchantId, int $limit = 50): array
    {
        return Http::withToken($accessToken)
                   ->get("{$this->baseUrl}/v3/merchants/{$merchantId}/orders", [
                       'expand' => 'lineItems',
                       'limit'  => $limit,
                   ])
                   ->json('elements', []);
    }

    public function createOrder(string $accessToken, string $merchantId): array
    {
        $response = Http::withToken($accessToken)
                        ->post("{$this->baseUrl}/v3/merchants/{$merchantId}/orders", [
                            'state' => 'open',
                        ]);

        if (!$response->successful()) {
            throw new \RuntimeException('Clover create order failed: ' . $response->body());
        }

        return $response->json();
    }

    public function addLineItem(string $accessToken, string $merchantId, string $orderId, array $item): array
    {
        $response = Http::withToken($accessToken)
                        ->post("{$this->baseUrl}/v3/merchants/{$merchantId}/orders/{$orderId}/line_items", $item);

        if (!$response->successful()) {
            throw new \RuntimeException('Clover add line item failed: ' . $response->body());
        }

        return $response->json();
    }

    public function getOrder(string $accessToken, string $merchantId, string $orderId): array
    {
        return Http::withToken($accessToken)
                   ->get("{$this->baseUrl}/v3/merchants/{$merchantId}/orders/{$orderId}", [
                       'expand' => 'lineItems,payments',
                   ])
                   ->json();
    }

    // ── Payments ──────────────────────────────────────────────────────────────

    public function getPayments(string $accessToken, string $merchantId, string $orderId): array
    {
        return Http::withToken($accessToken)
                   ->get("{$this->baseUrl}/v3/merchants/{$merchantId}/orders/{$orderId}/payments")
                   ->json('elements', []);
    }
}
