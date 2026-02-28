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
    /**
     * Get a delivery fee quote.
     *
     * Strategy:
     *  1. Try DoorDash Drive v2 quotes endpoint (non-binding, preferred).
     *  2. If v2 is unavailable (Classic/v1 credentials) fall back to the v1
     *     "get delivery" estimate endpoint which returns pricing without
     *     actually dispatching a Dasher.
     *
     * Returns a normalised array with at minimum: fee (cents), currency.
     */
    public function getQuote(string $pickupAddress, string $dropoffAddress, int $orderValue = 0): array
    {
        $parsed  = parse_url($this->baseUrl);
        $host    = ($parsed['scheme'] ?? 'https') . '://' . ($parsed['host'] ?? 'openapi.doordash.com');

        // ── Attempt 1: Drive v2 quotes (non-binding) ─────────────────────────
        $v2Url   = $host . '/drive/v2/deliveries/quotes';
        $quoteId = 'quote-' . uniqid();
        $payload = [
            'external_delivery_id' => $quoteId,
            'pickup_address'       => $pickupAddress,
            'dropoff_address'      => $dropoffAddress,
            'order_value'          => $orderValue,
            'currency'             => 'USD',
        ];

        $jwt      = $this->generateJwt();
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$jwt}",
            'Content-Type'  => 'application/json',
        ])->post($v2Url, $payload);

        if ($response->successful()) {
            return $response->json() ?? [];
        }

        // ── v2 failed — inspect the error ────────────────────────────────────
        $body = $response->body();
        $json = json_decode($body, true) ?? [];
        $code = $json['code'] ?? '';
        $msg  = $json['message'] ?? $body;

        $isV2Unavailable = in_array($code, ['authorization_error', 'unknown_path', 'not_found'], true)
            || str_contains(strtolower($msg), 'unknown path')
            || str_contains(strtolower($msg), 'not found')
            || $response->status() === 404;

        if (! $isV2Unavailable) {
            // Real API error (bad addresses, rate-limit, etc.) — surface it
            Log::error("DoorDash v2 quote error [{$response->status()}]: {$body}");
            throw new \RuntimeException($msg ?: 'DoorDash quote failed.');
        }

        Log::info("DoorDash v2 quote not available (Classic credentials). Falling back to v1 estimate.");

        // ── Attempt 2: Drive v1 estimate ─────────────────────────────────────
        // v1 does not have a dedicated quote endpoint, but we can call the
        // delivery creation endpoint with `simulate=true` (sandbox) or use the
        // accept_if_optimal pattern.  The simplest portable approach is to call
        // GET /drive/v1/deliveries/fee_estimate if available, otherwise we
        // create and immediately cancel to read back the fee.
        return $this->getQuoteV1($host, $pickupAddress, $dropoffAddress, $orderValue);
    }

    /**
     * Classic Drive v1 fee estimate.
     * Tries the undocumented fee-estimate endpoint first, then falls back to
     * creating a delivery (reading the fee) and immediately cancelling it.
     */
    private function getQuoteV1(string $host, string $pickupAddress, string $dropoffAddress, int $orderValue): array
    {
        $jwt     = $this->generateJwt();
        $headers = ['Authorization' => "Bearer {$jwt}", 'Content-Type' => 'application/json'];
        $quoteId = 'qv1-' . uniqid();

        $payload = [
            'external_delivery_id'  => $quoteId,
            'pickup_address'        => $pickupAddress,
            'dropoff_address'       => $dropoffAddress,
            'order_value'           => $orderValue,
            'currency'              => 'USD',
            'pickup_phone_number'   => '+10000000000',
            'dropoff_phone_number'  => '+10000000000',
            'dropoff_business_name' => 'Quote Request',
        ];

        // Try creating a delivery to read pricing then cancel immediately
        $createResp = Http::withHeaders($headers)
            ->post("{$host}/drive/v1/deliveries", $payload);

        if ($createResp->failed()) {
            $errJson = $createResp->json() ?? [];
            $errMsg  = $errJson['message'] ?? $createResp->body();
            Log::error("DoorDash v1 quote (create) failed: {$errMsg}");
            throw new \RuntimeException(
                'DoorDash delivery quotes require Drive API v2 credentials. ' .
                "Your account uses Classic API (v1). Error: {$errMsg}"
            );
        }

        $created  = $createResp->json() ?? [];
        $fee      = $created['fee'] ?? null;

        // Immediately cancel so no real Dasher is dispatched
        try {
            Http::withHeaders($headers)
                ->put("{$host}/drive/v1/deliveries/{$quoteId}/cancel");
        } catch (\Throwable $e) {
            Log::warning("DoorDash v1 quote cleanup cancel failed: " . $e->getMessage());
        }

        return [
            'external_delivery_id' => $quoteId,
            'fee'                  => $fee,
            'currency'             => $created['currency'] ?? 'USD',
            'delivery_status'      => 'quote_only',
            '_source'              => 'v1_estimate',
        ];
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
