<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * DoorDash Drive Shop & Deliver service.
 *
 * Dashers go to a store, shop for items, pay using a DoorDash-issued card,
 * then deliver to the customer. Requires a separate DoorDash developer account
 * approved for the Shop & Deliver program.
 *
 * Credentials stored in app_secrets:
 *   DOORDASH_SHOP_ENV                      ← "sandbox" | "production"
 *   DOORDASH_SHOP_SANDBOX_DEVELOPER_ID     ← UUID
 *   DOORDASH_SHOP_SANDBOX_KEY_ID           ← UUID
 *   DOORDASH_SHOP_SANDBOX_SIGNING_SECRET   ← base64url-encoded
 *   DOORDASH_SHOP_PROD_DEVELOPER_ID
 *   DOORDASH_SHOP_PROD_KEY_ID
 *   DOORDASH_SHOP_PROD_SIGNING_SECRET
 *
 * API: POST https://openapi.doordash.com/drive/v1/deliveries  (same endpoint as Classic)
 */
class DoorDashShopService
{
    private string $developerId;
    private string $keyId;
    private string $signingSecret;
    private string $baseUrl;
    private string $env;

    public function __construct()
    {
        $this->env = (string) AppSecretService::get('DOORDASH_SHOP_ENV', 'sandbox');

        if ($this->env === 'production') {
            $this->developerId   = (string) AppSecretService::get('DOORDASH_SHOP_PROD_DEVELOPER_ID',  '');
            $this->keyId         = (string) AppSecretService::get('DOORDASH_SHOP_PROD_KEY_ID',         '');
            $this->signingSecret = (string) AppSecretService::get('DOORDASH_SHOP_PROD_SIGNING_SECRET', '');
        } else {
            $this->developerId   = (string) AppSecretService::get('DOORDASH_SHOP_SANDBOX_DEVELOPER_ID',  '');
            $this->keyId         = (string) AppSecretService::get('DOORDASH_SHOP_SANDBOX_KEY_ID',         '');
            $this->signingSecret = (string) AppSecretService::get('DOORDASH_SHOP_SANDBOX_SIGNING_SECRET', '');
        }

        $this->baseUrl = 'https://openapi.doordash.com/drive/v1';
    }

    public function getEnv(): string  { return $this->env; }
    public function isSandbox(): bool { return $this->env === 'sandbox'; }

    // ── JWT ───────────────────────────────────────────────────────────────────

    private function generateJwt(): string
    {
        $header = $this->base64UrlEncode(json_encode([
            'dd-ver' => 'DD-JWT-V1',
            'typ'    => 'JWT',
            'alg'    => 'HS256',
            'kid'    => $this->keyId,
        ]));

        $now     = time();
        $payload = $this->base64UrlEncode(json_encode([
            'aud' => 'doordash',
            'iss' => $this->developerId,
            'kid' => $this->keyId,
            'exp' => $now + 300,
            'iat' => $now,
        ]));

        $signingKey = $this->base64UrlDecode($this->signingSecret);
        $signature  = $this->base64UrlEncode(hash_hmac('sha256', "{$header}.{$payload}", $signingKey, true));

        return "{$header}.{$payload}.{$signature}";
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $data): string
    {
        $padded = $data . str_repeat('=', (4 - strlen($data) % 4) % 4);
        return base64_decode(strtr($padded, '-_', '+/'));
    }

    // ── HTTP ──────────────────────────────────────────────────────────────────

    private function request(string $method, string $path, array $data = []): array
    {
        $jwt = $this->generateJwt();

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$jwt}",
            'Content-Type'  => 'application/json',
        ])->asJson()->{$method}($this->baseUrl . $path, $data);

        if ($response->failed()) {
            $body = $response->body();
            Log::error("DoorDash Shop API error [{$method} {$path}]: {$body}");
            throw new \RuntimeException('DoorDash Shop API error: ' . $body);
        }

        return $response->json() ?? [];
    }

    // ── Phone helpers ─────────────────────────────────────────────────────────

    private function normalizePhone(?string $phone): ?string
    {
        if (!$phone || trim($phone) === '') return null;
        $digits = preg_replace('/\D/', '', $phone);
        if (strlen($digits) === 10) $digits = '1' . $digits;
        if (strlen($digits) !== 11 || $digits[0] !== '1') return null;
        return '+' . $digits;
    }

    private function parseAddressString(string $address): array
    {
        $parts = array_map('trim', explode(',', $address));

        if (count($parts) >= 3) {
            $street   = $parts[0];
            $city     = $parts[1];
            $stateZip = $parts[2] ?? '';
            $zip      = $parts[3] ?? '';

            if ($zip === '' && str_contains($stateZip, ' ')) {
                $spacePos = strrpos($stateZip, ' ');
                $zip      = substr($stateZip, $spacePos + 1);
                $stateZip = substr($stateZip, 0, $spacePos);
            }

            return array_filter([
                'street'       => $street,
                'city'         => $city,
                'state'        => trim($stateZip),
                'zip_code'     => trim($zip),
                'full_address' => $address,
            ], fn($v) => $v !== '');
        }

        return ['full_address' => $address];
    }

    // ── Drive API ─────────────────────────────────────────────────────────────

    /**
     * Create a Shop & Deliver delivery from an Order.
     * The Dasher will go to the business/store, purchase the items, and deliver.
     *
     * @param  Order  $order   Must have business + items loaded
     * @param  array  $options  Optional: contains_alcohol, action_if_undeliverable
     */
    public function createDelivery(Order $order, array $options = []): array
    {
        $business = $order->business;

        $phPickup  = $this->normalizePhone($business->phone ?? '');
        $phDropoff = $this->normalizePhone($order->customer_phone ?? '');
        $phPickup  = $phPickup  ?? $phDropoff;
        $phDropoff = $phDropoff ?? $phPickup;

        $pickupAddress = array_filter([
            'street'   => trim(($business->address ?? '') . ' ' . ($business->address_2 ?? '')),
            'city'     => $business->city  ?? '',
            'state'    => $business->state ?? '',
            'zip_code' => $business->zip   ?? '',
        ], fn($v) => $v !== '');

        $dropoffAddress = $this->parseAddressString($order->delivery_address ?? '');

        $nameParts = explode(' ', trim($order->customer_name ?? 'Customer'), 2);
        $customer  = array_filter([
            'first_name'   => $nameParts[0] ?? 'Customer',
            'last_name'    => $nameParts[1] ?? null,
            'phone_number' => $phDropoff,
            'email'        => $order->customer_email ?: null,
        ], fn($v) => $v !== null && $v !== '');

        // Build shopping list from order items
        $items = [];
        if ($order->relationLoaded('items') && $order->items->isNotEmpty()) {
            foreach ($order->items as $item) {
                $items[] = array_filter([
                    'name'        => $item->name,
                    'quantity'    => $item->quantity,
                    'price'       => (int) round($item->price * 100),
                    'external_id' => (string) $item->id,
                    'description' => $item->notes ?: null,
                ], fn($v) => $v !== null && $v !== '');
            }
        }

        if (empty($items)) {
            $items = [['name' => "Order {$order->order_number}", 'quantity' => 1, 'price' => (int) round($order->total * 100)]];
        }

        $payload = array_filter([
            'external_delivery_id'    => $order->order_number,
            'pickup_address'          => $pickupAddress,
            'pickup_business_name'    => $business->name,
            'pickup_phone_number'     => $phPickup,
            'pickup_instructions'     => "Shop and pick up items from {$business->name}",
            'dropoff_address'         => $dropoffAddress,
            'dropoff_instructions'    => $order->notes ?: null,
            'customer'                => $customer,
            'order_value'             => (int) round($order->total * 100),
            'items'                   => $items,
            'contains_alcohol'        => $options['contains_alcohol'] ?? false,
            'action_if_undeliverable' => $options['action_if_undeliverable'] ?? 'return_to_pickup',
            'pickup_time'             => now()->addMinutes(30)->utc()->format('Y-m-d\TH:i:s\Z'),
        ], fn($v) => $v !== null && $v !== '' && $v !== []);

        Log::info('DoorDash Shop createDelivery payload', ['payload' => $payload]);

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->generateJwt(),
            'Content-Type'  => 'application/json',
        ])->asJson()->post($this->baseUrl . '/deliveries', $payload);

        Log::info('DoorDash Shop createDelivery response', [
            'http_status' => $response->status(),
            'body'        => $response->body(),
        ]);

        if ($response->successful()) {
            return $response->json() ?? [];
        }

        throw new \RuntimeException('DoorDash Shop createDelivery error: ' . $response->body());
    }

    /**
     * Get a delivery fee estimate for a Shop & Deliver order.
     */
    public function getQuote(string $pickupAddress, string $dropoffAddress, int $orderValue = 0): array
    {
        $payload = [
            'pickup_address'  => ['full_address' => $pickupAddress],
            'dropoff_address' => ['full_address' => $dropoffAddress],
            'order_value'     => $orderValue,
            'pickup_time'     => now()->addMinutes(30)->utc()->format('Y-m-d\TH:i:s\Z'),
        ];

        return $this->request('post', '/estimates', $payload);
    }

    /**
     * Get delivery details by DoorDash numeric delivery ID.
     */
    public function getDelivery(string|int $deliveryId): array
    {
        return $this->request('get', "/deliveries/{$deliveryId}");
    }

    /**
     * Cancel an active Shop & Deliver delivery.
     */
    public function cancelDelivery(string|int $deliveryId): array
    {
        return $this->request('put', "/deliveries/{$deliveryId}/cancel");
    }

    /** Map raw DoorDash status to human label (same as Drive Classic). */
    public static function statusLabel(string $status): string
    {
        return match ($status) {
            'created'              => 'Order Received',
            'confirmed'            => 'Confirmed',
            'enroute_to_pickup'    => 'Dasher Heading to Store',
            'arrived_at_pickup'    => 'Dasher at Store',
            'picked_up'            => 'Items Picked Up',
            'enroute_to_dropoff'   => 'Out for Delivery',
            'arrived_at_dropoff'   => 'Arrived at Drop-off',
            'delivered'            => 'Delivered',
            'delivery_cancelled'   => 'Cancelled',
            'returned'             => 'Returned',
            default                => ucwords(str_replace('_', ' ', $status)),
        };
    }
}
