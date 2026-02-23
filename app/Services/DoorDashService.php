<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DoorDashService
{
    private string $developerId;
    private string $keyId;
    private string $signingSecret;
    private string $baseUrl;
    private string $env;  // "sandbox" or "production"

    public function __construct()
    {
        // Pick credential set based on DOORDASH_ENV
        $this->env = config('services.doordash.env', 'sandbox');
        $cfg = config("services.doordash.{$this->env}") ?? [];

        $this->developerId   = (string) ($cfg['developer_id']   ?? '');
        $this->keyId         = (string) ($cfg['key_id']          ?? '');
        $this->signingSecret = (string) ($cfg['signing_secret']  ?? '');
        $this->baseUrl       = rtrim((string) ($cfg['base_url']  ?? 'https://openapi.doordash.com/drive/v1'), '/');
    }

    /** Returns "sandbox" or "production" */
    public function getEnv(): string { return $this->env; }
    public function isSandbox(): bool { return $this->env === 'sandbox'; }

    // ── JWT ───────────────────────────────────────────────────────────────────

    /**
     * Generate a short-lived JWT for the DoorDash Drive API.
     */
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

        // DoorDash signing secret is base64url-encoded; decode before using as HMAC key
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
        ])->{$method}($this->baseUrl . $path, $data);

        if ($response->failed()) {
            $body = $response->body();
            Log::error("DoorDash API error [{$method} {$path}]: {$body}");
            throw new \RuntimeException('DoorDash API error: ' . $body);
        }

        return $response->json() ?? [];
    }

    // ── Drive API calls ───────────────────────────────────────────────────────

    /**
     * Create a DoorDash Drive delivery for a given order.
     * Returns the full delivery object from DoorDash.
     */
    public function createDelivery(Order $order): array
    {
        $business = $order->business;

        $pickupAddress = implode(', ', array_filter([
            $business->address ?? '',
            $business->address_2 ?? '',
            $business->city ?? '',
            $business->state ?? '',
            $business->zip ?? '',
        ]));

        return $this->request('post', '/deliveries', [
            'external_delivery_id'  => $order->order_number,
            'pickup_address'        => $pickupAddress,
            'pickup_business_name'  => $business->name,
            'pickup_phone_number'   => $this->normalizePhone($business->phone),
            'pickup_instructions'   => "Pick up order {$order->order_number}",
            'dropoff_address'       => $order->delivery_address,
            'dropoff_business_name' => $order->customer_name ?? 'Customer',
            'dropoff_phone_number'  => $this->normalizePhone($order->customer_phone),
            'dropoff_instructions'  => $order->notes ?? '',
            'order_value'           => (int) round($order->total * 100), // cents
            'currency'              => 'USD',
        ]);
    }

    /**
     * Get a delivery fee quote without creating a delivery.
     * Returns the DoorDash quote object including fee, currency, expiry.
     *
     * @param  string  $pickupAddress   Full pickup address string
     * @param  string  $dropoffAddress  Full dropoff address string
     * @param  int     $orderValue      Order value in cents
     */
    public function getQuote(string $pickupAddress, string $dropoffAddress, int $orderValue = 0): array
    {
        // DoorDash quotes endpoint lives in v2 regardless of the configured base URL.
        // Derive the host from baseUrl and always use the known v2 quotes path.
        $parsed    = parse_url($this->baseUrl);
        $host      = ($parsed['scheme'] ?? 'https') . '://' . ($parsed['host'] ?? 'openapi.doordash.com');
        $quoteUrl  = $host . '/drive/v2/deliveries/quotes';

        $jwt      = $this->generateJwt();
        $payload  = [
            'external_delivery_id' => 'quote-' . uniqid(),
            'pickup_address'       => $pickupAddress,
            'dropoff_address'      => $dropoffAddress,
            'order_value'          => $orderValue,
            'currency'             => 'USD',
        ];

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$jwt}",
            'Content-Type'  => 'application/json',
        ])->post($quoteUrl, $payload);

        if ($response->failed()) {
            $body = $response->body();
            $json = json_decode($body, true);
            // Detect when credentials only allow Classic (v1) — no quote support
            if (isset($json['code']) && $json['code'] === 'authorization_error') {
                throw new \RuntimeException(
                    'Delivery quotes require DoorDash Drive API v2. ' .
                    'Your current credentials only support Classic API (v1). ' .
                    'You can still dispatch deliveries; quotes are not available with this plan.'
                );
            }
            Log::error("DoorDash quote API error: {$body}");
            throw new \RuntimeException($json['message'] ?? $body);
        }

        return $response->json() ?? [];
    }

    /**
     * Get live delivery status from DoorDash.
     */
    public function getDelivery(string $externalDeliveryId): array
    {
        return $this->request('get', "/deliveries/{$externalDeliveryId}");
    }

    /**
     * Cancel an active DoorDash delivery.
     */
    public function cancelDelivery(string $externalDeliveryId): array
    {
        return $this->request('put', "/deliveries/{$externalDeliveryId}/cancel");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Ensure phone is E.164 format; fall back to placeholder if blank.
     */
    private function normalizePhone(?string $phone): string
    {
        if (! $phone) return '+10000000000';
        $digits = preg_replace('/\D/', '', $phone);
        if (strlen($digits) === 10) $digits = '1' . $digits;
        return '+' . $digits;
    }

    /**
     * Map a DoorDash delivery_status string to a human-readable label.
     */
    public static function statusLabel(string $status): string
    {
        return match ($status) {
            'created'              => 'Order Received',
            'confirmed'            => 'Confirmed',
            'enroute_to_pickup'    => 'Dasher Heading to Restaurant',
            'arrived_at_pickup'    => 'Dasher at Restaurant',
            'picked_up'            => 'Out for Delivery',
            'enroute_to_dropoff'   => 'Almost There',
            'arrived_at_dropoff'   => 'Dasher Arrived',
            'delivered'            => 'Delivered',
            'delivery_cancelled'   => 'Delivery Cancelled',
            'returned'             => 'Returned',
            default                => ucfirst(str_replace('_', ' ', $status)),
        };
    }
}
