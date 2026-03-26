<?php

namespace App\Services\Pos;

use Illuminate\Support\Facades\Http;

/**
 * POSLavu – API key (Bearer token) authentication, no OAuth redirect.
 * Base URL: https://api.poslavu.com/api/
 * The user provides an API key and optional restaurant_id.
 */
class PosLavuService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = 'https://api.poslavu.com/api';
    }

    // ── Verify credentials ────────────────────────────────────────────────────

    /**
     * Verify credentials by fetching restaurant details.
     */
    public function getRestaurant(string $apiKey, string $restaurantId): array
    {
        $response = $this->request($apiKey)
                         ->get("{$this->baseUrl}/restaurants/{$restaurantId}");

        if (!$response->successful()) {
            // Some POSLavu endpoints use /me or /restaurant
            $response = $this->request($apiKey)->get("{$this->baseUrl}/restaurant");
        }

        if (!$response->successful()) {
            throw new \RuntimeException('POSLavu credential check failed: ' . $response->body());
        }

        return $response->json() ?? [];
    }

    // ── Menu / Items ──────────────────────────────────────────────────────────

    /** List all menu items. */
    public function getItems(string $apiKey, string $restaurantId, int $limit = 100): array
    {
        $items  = [];
        $page   = 1;

        do {
            $response = $this->request($apiKey)
                             ->get("{$this->baseUrl}/items", [
                                 'restaurant_id' => $restaurantId,
                                 'limit'         => $limit,
                                 'page'          => $page,
                             ]);

            $data  = $response->json();
            $batch = $data['data'] ?? $data['items'] ?? (is_array($data) && !isset($data['data']) ? $data : []);

            // Flatten if response is a direct array
            if (isset($data[0])) {
                $batch = $data;
            }

            $items = array_merge($items, $batch);
            $page++;
        } while (count($batch) === $limit);

        return $items;
    }

    public function createItem(string $apiKey, string $restaurantId, array $data): array
    {
        $response = $this->request($apiKey)
                         ->post("{$this->baseUrl}/items", array_merge($data, [
                             'restaurant_id' => $restaurantId,
                         ]));

        $this->assertSuccess($response, 'POSLavu create item');

        return $response->json();
    }

    public function updateItem(string $apiKey, string $restaurantId, string $itemId, array $data): array
    {
        $response = $this->request($apiKey)
                         ->put("{$this->baseUrl}/items/{$itemId}", array_merge($data, [
                             'restaurant_id' => $restaurantId,
                         ]));

        $this->assertSuccess($response, 'POSLavu update item');

        return $response->json();
    }

    public function getCategories(string $apiKey, string $restaurantId): array
    {
        $response = $this->request($apiKey)
                         ->get("{$this->baseUrl}/categories", [
                             'restaurant_id' => $restaurantId,
                         ]);

        $data = $response->json();
        return $data['data'] ?? $data ?? [];
    }

    // ── Orders ────────────────────────────────────────────────────────────────

    public function getOrders(string $apiKey, string $restaurantId, int $limit = 50): array
    {
        $response = $this->request($apiKey)
                         ->get("{$this->baseUrl}/orders", [
                             'restaurant_id' => $restaurantId,
                             'limit'         => $limit,
                         ]);

        $data = $response->json();
        return $data['data'] ?? $data ?? [];
    }

    public function createOrder(string $apiKey, string $restaurantId, array $order): array
    {
        $response = $this->request($apiKey)
                         ->post("{$this->baseUrl}/orders", array_merge($order, [
                             'restaurant_id' => $restaurantId,
                         ]));

        $this->assertSuccess($response, 'POSLavu create order');

        return $response->json();
    }

    public function addOrderItem(string $apiKey, string $orderId, array $item): array
    {
        $response = $this->request($apiKey)
                         ->post("{$this->baseUrl}/orders/{$orderId}/items", $item);

        $this->assertSuccess($response, 'POSLavu add order item');

        return $response->json();
    }

    public function getOrder(string $apiKey, string $orderId): array
    {
        $response = $this->request($apiKey)
                         ->get("{$this->baseUrl}/orders/{$orderId}");

        return $response->json() ?? [];
    }

    // ── Webhook ───────────────────────────────────────────────────────────────

    public function verifyWebhookSignature(string $body, string $signature, string $secret): bool
    {
        $expected = hash_hmac('sha256', $body, $secret);
        return hash_equals($expected, $signature);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function request(string $apiKey)
    {
        return Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type'  => 'application/json',
            'Accept'        => 'application/json',
        ]);
    }

    private function assertSuccess($response, string $context): void
    {
        if (!$response->successful()) {
            $msg = $response->json('message') ?? $response->json('error') ?? $response->body();
            throw new \RuntimeException("{$context} failed: {$msg}");
        }
    }
}
