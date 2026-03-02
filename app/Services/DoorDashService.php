<?php

namespace App\Services;

use App\Exceptions\DoorDashApiException;
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
     * Get a delivery fee estimate using the DoorDash Drive Classic API.
     *
     * Strategy:
     *  1. POST /drive/v1/estimates — the dedicated Classic Drive estimates endpoint.
     *     Returns fee, tax, pickup_time, delivery_time without creating a delivery.
     *  2. Fallback: POST /drive/v2/deliveries/quotes — for accounts on Drive API v2.
     *  3. Fallback: POST /drive/v2/deliveries + immediate cancel — last resort.
     *
     * @param  string       $pickupAddress   Full pickup address string
     * @param  string       $dropoffAddress  Full dropoff address string
     * @param  int          $orderValue      Order value in cents
     * @param  string|null  $pickupPhone     Raw phone for pickup contact (normalized internally)
     * @param  string|null  $dropoffPhone    Raw phone for dropoff contact (normalized internally)
     */
    public function getQuote(
        string $pickupAddress,
        string $dropoffAddress,
        int $orderValue = 0,
        ?string $pickupPhone = null,
        ?string $dropoffPhone = null
    ): array {
        $parsed  = parse_url($this->baseUrl);
        $host    = ($parsed['scheme'] ?? 'https') . '://' . ($parsed['host'] ?? 'openapi.doordash.com');

        $jwt     = $this->generateJwt();
        $headers = ['Authorization' => "Bearer {$jwt}", 'Content-Type' => 'application/json'];

        // Resolve phone numbers — use caller-supplied phones, fall back to valid placeholder
        $phPickup  = $this->normalizePhone($pickupPhone ?? '');
        $phDropoff = $this->normalizePhone($dropoffPhone ?? '');

        // DoorDash accepts full_address string inside an address object
        $pickupObj  = ['full_address' => $pickupAddress];
        $dropoffObj = ['full_address' => $dropoffAddress];

        // Pickup time is required — use 30 min from now as default
        $pickupTime = now()->addMinutes(30)->utc()->toIso8601String();

        // ── Attempt 1: Drive v1/estimates (Classic Drive API — proper endpoint) ──
        $v1Payload = [
            'pickup_address'  => $pickupObj,
            'dropoff_address' => $dropoffObj,
            'order_value'     => $orderValue,
            'pickup_time'     => $pickupTime,
        ];

        $response = Http::withHeaders($headers)
            ->post("{$host}/drive/v1/estimates", $v1Payload);

        if ($response->successful()) {
            $result            = $response->json() ?? [];
            $result['_source'] = 'v1_estimates';
            return $result;
        }

        // Check if v1/estimates endpoint is unavailable for this account
        $body = $response->body();
        $json = json_decode($body, true) ?? [];
        $code = $json['code'] ?? '';
        $msg  = $json['message'] ?? $body;

        $msgLower = strtolower($msg);

        $isEndpointMissing = in_array($code, ['unknown_path', 'not_found'], true)
            || str_contains($msgLower, 'unknown path')
            || str_contains($msgLower, 'drive/v2')          // "Make sure your request url prefix is .../drive/v2"
            || str_contains($msgLower, 'drive api')         // "permissions to access the following apis: Drive API"
            || str_contains($msgLower, 'request url prefix')
            || $response->status() === 404;

        if (! $isEndpointMissing) {
            Log::error("DoorDash v1/estimates error [{$response->status()}]: {$body}");
            throw new DoorDashApiException($msg ?: 'DoorDash quote failed.', $json);
        }

        Log::info('DoorDash v1/estimates not available (account uses Drive v2). Falling back to v2 quotes.');

        // ── Attempt 2: Drive v2 quotes (newer accounts) ───────────────────────
        // v2/deliveries/quotes requires phone numbers and contact names in addition
        // to addresses — omitting them causes "Validation Failed".
        $v2Payload = [
            'external_delivery_id'  => 'quote-' . uniqid(),
            'pickup_address'        => $pickupAddress,
            'pickup_business_name'  => 'Pickup Location',
            'pickup_phone_number'   => $phPickup,
            'dropoff_address'       => $dropoffAddress,
            'dropoff_business_name' => 'Dropoff Location',
            'dropoff_phone_number'  => $phDropoff,
            'order_value'           => $orderValue,
            'currency'              => 'USD',
        ];

        $response = Http::withHeaders($headers)
            ->post("{$host}/drive/v2/deliveries/quotes", $v2Payload);

        if ($response->successful()) {
            $result            = $response->json() ?? [];
            $result['_source'] = 'v2_quotes';
            return $result;
        }

        $body = $response->body();
        $json = json_decode($body, true) ?? [];
        $code = $json['code'] ?? '';
        $msg  = $json['message'] ?? $body;

        $isV2QuotesMissing = in_array($code, ['unknown_path', 'not_found'], true)
            || str_contains(strtolower($msg), 'unknown path')
            || $response->status() === 404;

        if (! $isV2QuotesMissing) {
            Log::error("DoorDash v2/quotes error [{$response->status()}]: {$body}");
            throw new DoorDashApiException($msg ?: 'DoorDash quote failed.', $json);
        }

        Log::info('DoorDash v2/deliveries/quotes not available. Falling back to v2 create+cancel to get fee.');

        // ── Attempt 3: Create a temporary v2 delivery, read its fee, cancel immediately ──
        // Last resort for Drive v2 accounts that don't expose /quotes at all.
        $tempId = 'fee-check-' . uniqid();

        $v2CreatePayload = [
            'external_delivery_id'  => $tempId,
            'pickup_address'        => $pickupAddress,
            'pickup_business_name'  => 'Pickup Location',
            'pickup_phone_number'   => $phPickup,
            'dropoff_address'       => $dropoffAddress,
            'dropoff_business_name' => 'Dropoff Location',
            'dropoff_phone_number'  => $phDropoff,
            'order_value'           => $orderValue,
            'currency'              => 'USD',
        ];

        $createResp = Http::withHeaders($headers)
            ->post("{$host}/drive/v2/deliveries", $v2CreatePayload);

        if ($createResp->successful()) {
            $delivery = $createResp->json() ?? [];

            // Cancel immediately — fire and forget (ignore errors)
            try {
                Http::withHeaders([
                    'Authorization' => 'Bearer ' . $this->generateJwt(),
                    'Content-Type'  => 'application/json',
                ])->put("{$host}/drive/v2/deliveries/{$tempId}/cancel");
            } catch (\Throwable) {}

            $delivery['_source'] = 'v2_create_cancel';
            return $delivery;
        }

        $body = $createResp->body();
        $json = json_decode($body, true) ?? [];
        $msg  = $json['message'] ?? $body;
        Log::error("DoorDash v2 create-cancel quote error [{$createResp->status()}]: {$body}");
        throw new DoorDashApiException(
            $msg ?: 'DoorDash quote failed. No compatible quote endpoint found for this account.',
            $json
        );
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
        if (! $phone) return '+12025550179'; // valid E.164 placeholder
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
