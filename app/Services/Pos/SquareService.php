<?php

namespace App\Services\Pos;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SquareService
{
    private string $appId;
    private string $appSecret;
    private string $baseUrl;
    private string $connectUrl = 'https://connect.squareup.com';

    public function __construct()
    {
        $env            = config('services.square.environment', 'sandbox');
        $this->appId    = config('services.square.app_id', '');
        $this->appSecret = config('services.square.app_secret', '');
        $this->baseUrl   = $env === 'production'
            ? 'https://connect.squareup.com'
            : 'https://connect.squareupsandbox.com';
    }

    // ── OAuth ─────────────────────────────────────────────────────────────────

    public function getAuthUrl(string $state, string $redirectUri): string
    {
        $params = http_build_query([
            'client_id'    => $this->appId,
            'scope'        => 'MERCHANT_PROFILE_READ ORDERS_WRITE ORDERS_READ PAYMENTS_WRITE PAYMENTS_READ ITEMS_READ ITEMS_WRITE INVENTORY_READ INVENTORY_WRITE',
            'session'      => 'false',
            'state'        => $state,
            'redirect_uri' => $redirectUri,
        ]);

        return "{$this->connectUrl}/oauth2/authorize?{$params}";
    }

    public function exchangeCode(string $code, string $redirectUri): array
    {
        $response = $this->http()->post("{$this->connectUrl}/oauth2/token", [
            'client_id'     => $this->appId,
            'client_secret' => $this->appSecret,
            'code'          => $code,
            'redirect_uri'  => $redirectUri,
            'grant_type'    => 'authorization_code',
        ]);

        $this->assertSuccess($response, 'Square OAuth token exchange');

        return $response->json();
    }

    public function refreshToken(string $refreshToken): array
    {
        $response = Http::withHeaders([
            'Square-Version' => '2024-01-18',
            'Authorization'  => 'Client ' . $this->appSecret,
            'Content-Type'   => 'application/json',
        ])->post("{$this->connectUrl}/oauth2/token", [
            'client_id'     => $this->appId,
            'grant_type'    => 'refresh_token',
            'refresh_token' => $refreshToken,
        ]);

        $this->assertSuccess($response, 'Square token refresh');

        return $response->json();
    }

    public function revokeToken(string $accessToken): void
    {
        Http::withHeaders([
            'Authorization'  => 'Client ' . $this->appSecret,
            'Square-Version' => '2024-01-18',
        ])->post("{$this->connectUrl}/oauth2/revoke", [
            'client_id'    => $this->appId,
            'access_token' => $accessToken,
        ]);
    }

    // ── Locations ─────────────────────────────────────────────────────────────

    public function listLocations(string $accessToken): array
    {
        $response = $this->request($accessToken)->get("{$this->baseUrl}/v2/locations");
        return $response->json('locations', []);
    }

    // ── Catalog ───────────────────────────────────────────────────────────────

    public function listCatalogItems(string $accessToken): array
    {
        $items  = [];
        $cursor = null;

        do {
            $params = ['types' => 'ITEM'];
            if ($cursor) $params['cursor'] = $cursor;

            $data   = $this->request($accessToken)->get("{$this->baseUrl}/v2/catalog/list", $params)->json();
            $items  = array_merge($items, $data['objects'] ?? []);
            $cursor = $data['cursor'] ?? null;
        } while ($cursor);

        return $items;
    }

    public function upsertCatalogObjects(string $accessToken, array $objects): array
    {
        $response = $this->request($accessToken)->post("{$this->baseUrl}/v2/catalog/batch-upsert", [
            'idempotency_key' => (string) Str::uuid(),
            'batches'         => [['objects' => $objects]],
        ]);

        $this->assertSuccess($response, 'Square catalog upsert');

        return $response->json();
    }

    public function deleteCatalogObjects(string $accessToken, array $objectIds): void
    {
        $this->request($accessToken)->post("{$this->baseUrl}/v2/catalog/batch-delete", [
            'object_ids' => $objectIds,
        ]);
    }

    // ── Orders ────────────────────────────────────────────────────────────────

    public function createOrder(string $accessToken, string $locationId, array $lineItems, array $metadata = []): array
    {
        $response = $this->request($accessToken)->post("{$this->baseUrl}/v2/orders", [
            'idempotency_key' => (string) Str::uuid(),
            'order'           => [
                'location_id' => $locationId,
                'line_items'  => $lineItems,
                'metadata'    => $metadata,
            ],
        ]);

        $this->assertSuccess($response, 'Square create order');

        return $response->json('order');
    }

    public function getOrder(string $accessToken, string $orderId): array
    {
        return $this->request($accessToken)
                    ->get("{$this->baseUrl}/v2/orders/{$orderId}")
                    ->json('order', []);
    }

    // ── Terminal / POS ────────────────────────────────────────────────────────

    public function createTerminalCheckout(
        string  $accessToken,
        string  $posOrderId,
        int     $amountCents,
        string  $currency = 'USD',
        ?string $deviceId = null
    ): array {
        $checkout = [
            'amount_money'    => ['amount' => $amountCents, 'currency' => $currency],
            'order_id'        => $posOrderId,
            'payment_options' => ['autocomplete' => true],
            'device_options'  => ['skip_receipt_screen' => false],
        ];

        if ($deviceId) {
            $checkout['device_options']['device_id'] = $deviceId;
        }

        $response = $this->request($accessToken)->post("{$this->baseUrl}/v2/terminals/checkouts", [
            'idempotency_key' => (string) Str::uuid(),
            'checkout'        => $checkout,
        ]);

        $this->assertSuccess($response, 'Square terminal checkout');

        return $response->json('checkout');
    }

    public function getTerminalCheckout(string $accessToken, string $checkoutId): array
    {
        return $this->request($accessToken)
                    ->get("{$this->baseUrl}/v2/terminals/checkouts/{$checkoutId}")
                    ->json('checkout', []);
    }

    public function cancelTerminalCheckout(string $accessToken, string $checkoutId): array
    {
        return $this->request($accessToken)
                    ->post("{$this->baseUrl}/v2/terminals/checkouts/{$checkoutId}/cancel")
                    ->json('checkout', []);
    }

    public function listDevices(string $accessToken): array
    {
        return $this->request($accessToken)
                    ->get("{$this->baseUrl}/v2/devices")
                    ->json('devices', []);
    }

    // ── Payments ──────────────────────────────────────────────────────────────

    /** Create a payment via card nonce (web/mobile SDKs). */
    public function createPayment(
        string $accessToken,
        string $sourceId,
        int    $amountCents,
        string $currency = 'USD',
        ?string $orderId  = null,
        ?string $note     = null
    ): array {
        $body = [
            'idempotency_key' => (string) Str::uuid(),
            'source_id'       => $sourceId,
            'amount_money'    => ['amount' => $amountCents, 'currency' => $currency],
            'autocomplete'    => true,
        ];

        if ($orderId) $body['order_id']    = $orderId;
        if ($note)    $body['note']        = $note;

        $response = $this->request($accessToken)->post("{$this->baseUrl}/v2/payments", $body);

        $this->assertSuccess($response, 'Square create payment');

        return $response->json('payment');
    }

    // ── Webhook ───────────────────────────────────────────────────────────────

    public function verifyWebhookSignature(
        string $body,
        string $signature,
        string $signatureKey,
        string $notificationUrl
    ): bool {
        $hash = base64_encode(hash_hmac('sha256', $notificationUrl . $body, $signatureKey, true));
        return hash_equals($hash, $signature);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function request(string $accessToken): PendingRequest
    {
        return Http::withHeaders([
            'Authorization'  => "Bearer {$accessToken}",
            'Square-Version' => '2024-01-18',
            'Content-Type'   => 'application/json',
        ]);
    }

    private function http(): PendingRequest
    {
        return Http::withHeaders([
            'Square-Version' => '2024-01-18',
            'Content-Type'   => 'application/json',
        ]);
    }

    private function assertSuccess($response, string $context): void
    {
        if (!$response->successful()) {
            $msg = $response->json('errors.0.detail') ?? $response->body();
            throw new \RuntimeException("{$context} failed: {$msg}");
        }
    }
}
