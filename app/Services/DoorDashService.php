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
        ])->asJson()->{$method}($this->baseUrl . $path, $data);

        if ($response->failed()) {
            $body = $response->body();
            Log::error("DoorDash API error [{$method} {$path}]: {$body}");
            throw new \RuntimeException('DoorDash API error: ' . $body);
        }

        return $response->json() ?? [];
    }

    // ── Drive API calls ───────────────────────────────────────────────────────

    /**
     * Create a DoorDash Drive Classic (v1) delivery for a given order.
     *
     * API spec: POST /drive/v1/deliveries
     * Key differences from our old flat payload:
     *  - pickup_address / dropoff_address must be OBJECTS (city, state, street, zip_code)
     *  - customer is REQUIRED object (phone_number, first_name, last_name, email)
     *  - There is NO dropoff_phone_number / dropoff_business_name at root — those live in customer{}
     *  - Response fields: status (not delivery_status), delivery_tracking_url (not tracking_url)
     */
    public function createDelivery(Order $order): array
    {
        $business = $order->business;

        // ── Phone numbers ──────────────────────────────────────────────────────
        $phPickup  = $this->normalizePhone($business->phone ?? '');
        $phDropoff = $this->normalizePhone($order->customer_phone ?? '');
        $phPickup  = $phPickup  ?? $phDropoff;
        $phDropoff = $phDropoff ?? $phPickup;

        // ── Pickup address object ──────────────────────────────────────────────
        $pickupAddress = array_filter([
            'street'   => trim(($business->address ?? '') . ' ' . ($business->address_2 ?? '')),
            'city'     => $business->city  ?? '',
            'state'    => $business->state ?? '',
            'zip_code' => $business->zip   ?? '',
        ], fn($v) => $v !== '');

        // ── Dropoff address object ─────────────────────────────────────────────
        // Delivery address is stored as a string: "2309 San Pablo Ave, Berkeley, CA, 94702"
        // Parse it into object fields; fall back to full_address only if parsing fails.
        $dropoffAddress = $this->parseAddressString($order->delivery_address ?? '');

        // ── Customer object (required by v1 Classic) ───────────────────────────
        $nameParts = explode(' ', trim($order->customer_name ?? 'Customer'), 2);
        $customer  = array_filter([
            'first_name'             => $nameParts[0] ?? 'Customer',
            'last_name'              => $nameParts[1] ?? null,
            'phone_number'           => $phDropoff,
            'email'                  => $order->customer_email ?: null,
            'should_send_notifications' => true,
        ], fn($v) => $v !== null && $v !== '');

        // ── Final payload (v1 Classic fields only) ─────────────────────────────
        $payload = array_filter([
            'external_delivery_id' => $order->order_number,
            'pickup_address'       => $pickupAddress,
            'pickup_business_name' => $business->name,
            'pickup_phone_number'  => $phPickup,
            'pickup_instructions'  => "Pick up order {$order->order_number}",
            'dropoff_address'      => $dropoffAddress,
            'dropoff_instructions' => $order->notes ?: null,
            'customer'             => $customer,
            'order_value'          => (int) round($order->total * 100),
            'tip'                  => $order->tip ? (int) round($order->tip * 100) : null,
            'pickup_time'          => now()->addMinutes(20)->utc()->format('Y-m-d\TH:i:s\Z'),
        ], fn($v) => $v !== null && $v !== '' && $v !== []);

        Log::info('DoorDash createDelivery payload', ['payload' => $payload]);

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->generateJwt(),
            'Content-Type'  => 'application/json',
        ])->asJson()->post($this->baseUrl . '/deliveries', $payload);

        Log::info('DoorDash createDelivery response', [
            'http_status' => $response->status(),
            'body'        => $response->body(),
        ]);

        if ($response->successful()) {
            return $response->json() ?? [];
        }

        throw new \RuntimeException('DoorDash createDelivery error: ' . $response->body());
    }

    /**
     * Parse a delivery address string into a DoorDash address object.
     * Input formats handled:
     *   "2309 San Pablo Avenue, Berkeley, CA, 94702"
     *   "2309 San Pablo Avenue, Berkeley, CA 94702"
     *   "2309 San Pablo Avenue Berkeley CA 94702"  (fallback to full_address only)
     */
    private function parseAddressString(string $address): array
    {
        // Try comma-separated: "street, city, state, zip" or "street, city, state zip"
        $parts = array_map('trim', explode(',', $address));

        if (count($parts) >= 3) {
            $street = $parts[0];
            $city   = $parts[1];

            // State and ZIP might be combined: "CA 94702" or separate: "CA", "94702"
            $stateZip = $parts[2] ?? '';
            $zip      = $parts[3] ?? '';

            if ($zip === '') {
                // "CA 94702" — split on last space
                $spacePos = strrpos($stateZip, ' ');
                if ($spacePos !== false) {
                    $zip      = substr($stateZip, $spacePos + 1);
                    $stateZip = substr($stateZip, 0, $spacePos);
                }
            }

            return array_filter([
                'street'       => $street,
                'city'         => $city,
                'state'        => trim($stateZip),
                'zip_code'     => trim($zip),
                'full_address' => $address,
            ], fn($v) => $v !== '');
        }

        // Fallback: just pass full_address and let DoorDash parse it
        return ['full_address' => $address];
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

        // Resolve phone numbers (null = could not be normalized — field will be omitted)
        $phPickup  = $this->normalizePhone($pickupPhone  ?? '');
        $phDropoff = $this->normalizePhone($dropoffPhone ?? '');

        // Cross-fallback: if one side has no valid phone, use the other side's number.
        // For a quote, DoorDash only needs the format to be valid — the number isn't called.
        $phPickup  = $phPickup  ?? $phDropoff;
        $phDropoff = $phDropoff ?? $phPickup;

        // ── Attempt 1: Drive v1/estimates (Classic Drive API — proper endpoint) ──
        // Addresses must be objects; pickup_time or delivery_time is required.
        $v1Payload = [
            'pickup_address'  => ['full_address' => $pickupAddress],
            'dropoff_address' => ['full_address' => $dropoffAddress],
            'order_value'     => $orderValue,
            'pickup_time'     => now()->addMinutes(30)->utc()->format('Y-m-d\TH:i:s\Z'),
        ];

        Log::info('DoorDash getQuote: trying v1/estimates', [
            'url'     => "{$host}/drive/v1/estimates",
            'payload' => $v1Payload,
        ]);

        $response = Http::withHeaders($headers)
            ->asJson()
            ->post("{$host}/drive/v1/estimates", $v1Payload);

        Log::info('DoorDash v1/estimates response', [
            'status' => $response->status(),
            'body'   => $response->body(),
        ]);

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
            || str_contains($msgLower, 'drive/v2')
            || str_contains($msgLower, 'drive api')
            || str_contains($msgLower, 'request url prefix')
            || str_contains($msgLower, 'body serialization failed') // sandbox limitation
            || $response->status() === 404;

        Log::info('DoorDash v1/estimates failed', [
            'code'               => $code,
            'msg'                => $msg,
            'is_endpoint_missing'=> $isEndpointMissing,
            'http_status'        => $response->status(),
        ]);

        if (! $isEndpointMissing) {
            Log::error("DoorDash v1/estimates error [{$response->status()}]: {$body}");
            throw new DoorDashApiException($msg ?: 'DoorDash quote failed.', $json);
        }

        Log::info('DoorDash v1/estimates not available. Falling back to v2 quotes.');

        // ── Attempt 2: Drive v2 quotes (newer accounts) ───────────────────────
        $v2Payload = array_filter([
            'external_delivery_id'  => 'quote-' . uniqid(),
            'pickup_address'        => $pickupAddress,
            'pickup_business_name'  => 'Pickup Location',
            'pickup_phone_number'   => $phPickup,   // null → field omitted by array_filter
            'dropoff_address'       => $dropoffAddress,
            'dropoff_business_name' => 'Dropoff Location',
            'dropoff_phone_number'  => $phDropoff,
            'order_value'           => $orderValue,
            'currency'              => 'USD',
        ], fn($v) => $v !== null);

        $response = Http::withHeaders($headers)
            ->asJson()
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

        $isV2QuotesMissing = in_array($code, ['unknown_path', 'not_found', 'authorization_error'], true)
            || str_contains(strtolower($msg), 'unknown path')
            || str_contains(strtolower($msg), 'drive (classic)')
            || str_contains(strtolower($msg), 'drive/v1')
            || $response->status() === 404
            || $response->status() === 403;

        if (! $isV2QuotesMissing) {
            Log::error("DoorDash v2/quotes error [{$response->status()}]: {$body}");
            throw new DoorDashApiException($msg ?: 'DoorDash quote failed.', $json);
        }

        Log::info('DoorDash v2/deliveries/quotes not available. Falling back to create+cancel to get fee.');

        // ── Attempt 3: Create a temporary delivery, read its fee, cancel immediately ──
        // Uses v1 (Classic) or v2 depending on baseUrl config.
        $tempId = 'fee-check-' . uniqid();

        $createPayload = array_filter([
            'external_delivery_id'  => $tempId,
            'pickup_address'        => $pickupAddress,
            'pickup_business_name'  => 'Pickup Location',
            'pickup_phone_number'   => $phPickup,
            'dropoff_address'       => $dropoffAddress,
            'dropoff_business_name' => 'Dropoff Location',
            'dropoff_phone_number'  => $phDropoff,
            'order_value'           => $orderValue ?: null,
            'currency'              => 'USD',
        ], fn($v) => $v !== null);

        // Try v1 (Classic) first, fall back to v2 if sandbox limitation
        foreach (["{$this->baseUrl}/deliveries", "{$host}/drive/v2/deliveries"] as $createUrl) {
            $createResp = Http::withHeaders($headers)
                ->asJson()
                ->post($createUrl, $createPayload);

            if ($createResp->successful()) {
                $delivery = $createResp->json() ?? [];

                // Cancel immediately — fire and forget (ignore errors)
                $isV1 = str_contains($createUrl, '/drive/v1/');
                $cancelUrl = $isV1
                    ? "{$this->baseUrl}/deliveries/{$tempId}/cancel"
                    : "{$host}/drive/v2/deliveries/{$tempId}/cancel";
                try {
                    Http::withHeaders([
                        'Authorization' => 'Bearer ' . $this->generateJwt(),
                        'Content-Type'  => 'application/json',
                    ])->asJson()->put($cancelUrl);
                } catch (\Throwable) {}

                $delivery['_source'] = $isV1 ? 'v1_create_cancel' : 'v2_create_cancel';
                return $delivery;
            }

            $errBody = $createResp->body();
            $errMsg  = strtolower($errBody);
            // If not a sandbox/serialization issue, stop trying
            if (! str_contains($errMsg, 'serialization failed') && $createResp->status() !== 403) {
                break;
            }
            Log::info("DoorDash create failed at {$createUrl} [{$createResp->status()}], trying next.");
        }

        $body = $createResp->body();
        $json = json_decode($body, true) ?? [];
        $msg  = $json['message'] ?? $body;
        Log::error("DoorDash create-cancel quote error [{$createResp->status()}]: {$body}");
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
     * Normalize a phone number to E.164 format.
     * Returns null when the input is empty, malformed, non-US, or has extra
     * digits (e.g. extensions) — callers must omit the field in that case.
     * Never returns a placeholder; DoorDash production validates real numbers.
     */
    private function normalizePhone(?string $phone): ?string
    {
        if (! $phone || trim($phone) === '') return null;

        // Strip everything except digits
        $digits = preg_replace('/\D/', '', $phone);

        // 10-digit US number → prepend country code
        if (strlen($digits) === 10) $digits = '1' . $digits;

        // Valid US/Canada: exactly 11 digits starting with '1'
        if (strlen($digits) !== 11 || $digits[0] !== '1') {
            Log::warning("DoorDash: phone '{$phone}' could not be normalized to E.164 — omitting field.");
            return null;
        }

        return '+' . $digits;
    }

    /**
     * Map a DoorDash delivery status string to a human-readable label.
     * REST API response uses `status`; webhooks use `delivery_status` (same values).
     */
    public static function statusLabel(string $status): string
    {
        return match ($status) {
            'scheduled'            => 'Scheduled',
            'created'              => 'Order Received',
            'confirmed'            => 'Order Confirmed',
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
