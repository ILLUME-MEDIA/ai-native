<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Uber Direct (Delivery as a Service) API integration.
 *
 * Docs: https://developer.uber.com/docs/deliveries/get-started
 * Auth: OAuth2 client_credentials → scope: eats.deliveries
 *
 * Credentials stored in app_secrets (or .env fallback):
 *   UBER_DIRECT_CLIENT_ID
 *   UBER_DIRECT_CLIENT_SECRET
 *   UBER_DIRECT_CUSTOMER_ID   ← org-level customer_id (UUID or cus_xxx)
 *   UBER_DIRECT_ENV           ← "sandbox" | "production"  (default: sandbox)
 */
class UberDirectService
{
    private string $clientId;
    private string $clientSecret;
    private string $customerId;
    private string $baseUrl;
    private string $env;

    public function __construct()
    {
        $this->env          = AppSecretService::get('UBER_DIRECT_ENV', 'sandbox');
        $this->clientId     = (string) AppSecretService::get('UBER_DIRECT_CLIENT_ID', '');
        $this->clientSecret = (string) AppSecretService::get('UBER_DIRECT_CLIENT_SECRET', '');
        $this->customerId   = (string) AppSecretService::get('UBER_DIRECT_CUSTOMER_ID', '');
        $this->baseUrl      = $this->env === 'production'
            ? 'https://api.uber.com/v1'
            : 'https://sandbox-api.uber.com/v1';
    }

    public function getEnv(): string   { return $this->env; }
    public function isSandbox(): bool  { return $this->env === 'sandbox'; }
    public function getCustomerId(): string { return $this->customerId; }

    // ── OAuth2 Token ──────────────────────────────────────────────────────────

    /**
     * Get a cached OAuth2 access token.
     * Token URL: https://login.uber.com/oauth/v2/token
     * Scope: eats.deliveries
     */
    private function getAccessToken(): string
    {
        $cacheKey = "uber_direct_token_{$this->env}";

        return Cache::remember($cacheKey, 3300, function () {
            $response = Http::asForm()->post('https://login.uber.com/oauth/v2/token', [
                'client_id'     => $this->clientId,
                'client_secret' => $this->clientSecret,
                'grant_type'    => 'client_credentials',
                'scope'         => 'eats.deliveries',
            ]);

            if ($response->failed()) {
                $body = $response->body();
                Log::error("[UberDirect] Token fetch failed: {$body}");
                throw new \RuntimeException('Uber Direct OAuth2 failed: ' . $body);
            }

            $token = $response->json('access_token');
            if (!$token) {
                throw new \RuntimeException('Uber Direct: no access_token in response.');
            }

            return $token;
        });
    }

    // ── HTTP ──────────────────────────────────────────────────────────────────

    private function request(string $method, string $path, array $data = []): array
    {
        $token = $this->getAccessToken();

        $req = Http::withHeaders([
            'Authorization' => "Bearer {$token}",
            'Content-Type'  => 'application/json',
        ])->asJson();

        $url = $this->baseUrl . $path;

        $response = match (strtolower($method)) {
            'get'    => $req->get($url, $data),
            'post'   => $req->post($url, $data),
            'patch'  => $req->patch($url, $data),
            'delete' => $req->delete($url, $data),
            default  => throw new \InvalidArgumentException("Unsupported HTTP method: {$method}"),
        };

        if ($response->failed()) {
            $body = $response->body();
            Log::error("[UberDirect] API error [{$method} {$path}] {$response->status()}: {$body}");
            $json    = json_decode($body, true) ?? [];
            $message = $json['message'] ?? $json['code'] ?? $body;
            throw new \RuntimeException("Uber Direct error: {$message}");
        }

        return $response->json() ?? [];
    }

    // ── Address helper ────────────────────────────────────────────────────────

    /**
     * Encode address fields into the Uber Direct JSON-string format.
     *
     * Uber Direct address is a JSON-encoded string, e.g.:
     *   '{"street_address":["100 Main St"],"city":"New York","state":"NY","zip_code":"10001","country":"US"}'
     */
    public static function encodeAddress(
        string $streetAddress,
        string $city       = '',
        string $state      = '',
        string $zipCode    = '',
        string $country    = 'US'
    ): string {
        return json_encode(array_filter([
            'street_address' => [$streetAddress],
            'city'           => $city    ?: null,
            'state'          => $state   ?: null,
            'zip_code'       => $zipCode ?: null,
            'country'        => $country ?: 'US',
        ], fn($v) => $v !== null));
    }

    /**
     * Build address string from a Business or raw address string.
     * If it looks like a full address string, parse it; otherwise pass as-is in street_address.
     */
    public static function buildAddressFromString(string $address, string $country = 'US'): string
    {
        // Already JSON-encoded?
        if (str_starts_with(trim($address), '{')) return $address;

        return json_encode([
            'street_address' => [$address],
            'country'        => $country,
        ]);
    }

    // ── Normalize phone ───────────────────────────────────────────────────────

    private function normalizePhone(?string $phone): ?string
    {
        if (!$phone || trim($phone) === '') return null;
        $digits = preg_replace('/\D/', '', $phone);
        if (strlen($digits) === 10) $digits = '1' . $digits;
        if (strlen($digits) !== 11 || $digits[0] !== '1') return null;
        return '+' . $digits;
    }

    // ── Quotes ────────────────────────────────────────────────────────────────

    /**
     * Create a delivery quote (fee estimate + deliverability check).
     *
     * @param  string      $pickupAddress   JSON-string or plain address
     * @param  string      $dropoffAddress  JSON-string or plain address
     * @param  int         $manifestValue   Order value in cents
     * @param  string|null $pickupPhone
     * @param  string|null $dropoffPhone
     * @param  string|null $externalStoreId Uber store ID
     */
    public function createQuote(
        string  $pickupAddress,
        string  $dropoffAddress,
        int     $manifestValue  = 0,
        ?string $pickupPhone    = null,
        ?string $dropoffPhone   = null,
        ?string $externalStoreId = null
    ): array {
        $payload = array_filter([
            'pickup_address'        => self::buildAddressFromString($pickupAddress),
            'dropoff_address'       => self::buildAddressFromString($dropoffAddress),
            'pickup_phone_number'   => $this->normalizePhone($pickupPhone),
            'dropoff_phone_number'  => $this->normalizePhone($dropoffPhone),
            'manifest_total_value'  => $manifestValue ?: null,
            'external_store_id'     => $externalStoreId,
        ], fn($v) => $v !== null);

        return $this->request('post', "/customers/{$this->customerId}/delivery_quotes", $payload);
    }

    // ── Deliveries ────────────────────────────────────────────────────────────

    /**
     * Create a delivery from an Order model (same pattern as DoorDash).
     */
    public function createDelivery(Order $order, array $options = []): array
    {
        $business = $order->business;

        $pickupAddress = self::encodeAddress(
            implode(' ', array_filter([$business->address ?? '', $business->address_2 ?? ''])),
            $business->city    ?? '',
            $business->state   ?? '',
            $business->zip     ?? '',
        );

        $dropoffAddress = self::buildAddressFromString($order->delivery_address ?? '');

        // Build manifest items from order items if available
        $manifestItems = [];
        if ($order->relationLoaded('items') && $order->items->isNotEmpty()) {
            foreach ($order->items as $item) {
                $manifestItems[] = [
                    'name'     => $item->name,
                    'quantity' => $item->quantity,
                    'size'     => 'small',
                    'price'    => (int) round($item->price * 100), // cents
                ];
            }
        }

        $payload = array_filter([
            'pickup_name'           => $business->name,
            'pickup_address'        => $pickupAddress,
            'pickup_phone_number'   => $this->normalizePhone($business->phone),
            'pickup_instructions'   => "Pick up order {$order->order_number}",
            'dropoff_name'          => $order->customer_name ?? 'Customer',
            'dropoff_address'       => $dropoffAddress,
            'dropoff_phone_number'  => $this->normalizePhone($order->customer_phone),
            'dropoff_instructions'  => $order->notes ?? null,
            'manifest_total_value'  => (int) round($order->total * 100), // cents
            'external_id'           => $order->order_number,
            'tip'                   => isset($options['tip_cents']) ? (int) $options['tip_cents'] : null,
            'requires_id'           => $options['requires_id'] ?? null,
            'manifest_items'        => $manifestItems ?: null,
            // CPP fields (optional)
            'pickup_action'         => $options['pickup_action'] ?? null, // "pick_pack_pay" for CPP
            'pickup_payment'        => $options['pickup_payment'] ?? null,
        ], fn($v) => $v !== null);

        return $this->request('post', "/customers/{$this->customerId}/deliveries", $payload);
    }

    /**
     * Create a delivery from raw fields (for non-order deliveries / CPP).
     */
    public function createDeliveryRaw(array $payload): array
    {
        return $this->request('post', "/customers/{$this->customerId}/deliveries", $payload);
    }

    /**
     * List all deliveries for this customer.
     */
    public function listDeliveries(array $filters = []): array
    {
        return $this->request('get', "/customers/{$this->customerId}/deliveries", $filters);
    }

    /**
     * Get a specific delivery by Uber delivery ID.
     */
    public function getDelivery(string $deliveryId): array
    {
        return $this->request('get', "/customers/{$this->customerId}/deliveries/{$deliveryId}");
    }

    /**
     * Update a delivery (Uber Direct uses POST, not PATCH).
     */
    public function updateDelivery(string $deliveryId, array $data): array
    {
        return $this->request('post', "/customers/{$this->customerId}/deliveries/{$deliveryId}", $data);
    }

    /**
     * Cancel a delivery.
     */
    public function cancelDelivery(string $deliveryId): array
    {
        return $this->request('post', "/customers/{$this->customerId}/deliveries/{$deliveryId}/cancel");
    }

    /**
     * Get proof of delivery (signature / photo).
     */
    public function proofOfDelivery(string $deliveryId): array
    {
        return $this->request('post', "/customers/{$this->customerId}/deliveries/{$deliveryId}/proof-of-delivery");
    }

    /**
     * Find stores near a location.
     */
    public function findStores(float $lat, float $lng, ?string $externalStoreId = null): array
    {
        $params = array_filter([
            'filter[location][lat]' => $lat,
            'filter[location][lng]' => $lng,
            'filter[external_store_id]' => $externalStoreId,
        ], fn($v) => $v !== null);

        return $this->request('get', '/stores', $params);
    }

    // ── Status label ──────────────────────────────────────────────────────────

    public static function statusLabel(string $status): string
    {
        return match ($status) {
            'pending'          => 'Finding Courier',
            'pickup'           => 'Courier Heading to Pickup',
            'pickup_complete'  => 'Picked Up',
            'dropoff'          => 'Out for Delivery',
            'delivered'        => 'Delivered',
            'completed'        => 'Completed',
            'cancelled'        => 'Cancelled',
            'returned'         => 'Returned',
            default            => ucfirst(str_replace('_', ' ', $status)),
        };
    }
}
