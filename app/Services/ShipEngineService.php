<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * ShipEngine API Service
 *
 * Proxies requests to the ShipEngine REST API.
 * API key is resolved from app_secrets (key: SHIPENGINE_API_KEY) or env().
 *
 * Base URL: https://api.shipengine.com
 * Auth:     API-Key header
 */
class ShipEngineService
{
    private string $apiKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey = (string) AppSecretService::get('SHIPENGINE_API_KEY', env('SHIPENGINE_API_KEY', ''));
        $this->baseUrl = rtrim((string) AppSecretService::get('SHIPENGINE_BASE_URL', env('SHIPENGINE_BASE_URL', 'https://api.shipengine.com')), '/');
    }

    // ── HTTP ──────────────────────────────────────────────────────────────────

    private function client(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withHeaders([
            'API-Key'      => $this->apiKey,
            'Content-Type' => 'application/json',
        ])->asJson()->baseUrl($this->baseUrl);
    }

    private function get(string $path, array $query = []): array
    {
        $response = $this->client()->get($path, $query);
        return $this->handle($response, 'GET', $path);
    }

    private function post(string $path, array $data = []): array
    {
        $response = $this->client()->post($path, $data);
        return $this->handle($response, 'POST', $path);
    }

    private function put(string $path, array $data = []): array
    {
        $response = $this->client()->put($path, $data);
        return $this->handle($response, 'PUT', $path);
    }

    private function patch(string $path, array $data = []): array
    {
        $response = $this->client()->patch($path, $data);
        return $this->handle($response, 'PATCH', $path);
    }

    private function delete(string $path): array
    {
        $response = $this->client()->delete($path);
        return $this->handle($response, 'DELETE', $path);
    }

    private function handle(\Illuminate\Http\Client\Response $response, string $method, string $path): array
    {
        if ($response->failed()) {
            $body = $response->body();
            Log::error("ShipEngine API error [{$method} {$path}] {$response->status()}: {$body}");
            $json = $response->json() ?? [];
            throw new \RuntimeException(
                $json['message'] ?? $json['error'] ?? "ShipEngine API error [{$response->status()}]",
            );
        }

        return $response->json() ?? [];
    }

    // ── Addresses ────────────────────────────────────────────────────────────

    /** Validate one or more addresses. */
    public function validateAddresses(array $addresses): array
    {
        return $this->post('/v1/addresses/validate', $addresses);
    }

    // ── Carriers ─────────────────────────────────────────────────────────────

    /** List all connected carriers. */
    public function listCarriers(): array
    {
        return $this->get('/v1/carriers');
    }

    /** Get a single carrier by ID. */
    public function getCarrier(string $carrierId): array
    {
        return $this->get("/v1/carriers/{$carrierId}");
    }

    /** List services for a carrier. */
    public function getCarrierServices(string $carrierId): array
    {
        return $this->get("/v1/carriers/{$carrierId}/services");
    }

    /** List packages for a carrier. */
    public function getCarrierPackageTypes(string $carrierId): array
    {
        return $this->get("/v1/carriers/{$carrierId}/packages");
    }

    /** List available options for a carrier. */
    public function getCarrierOptions(string $carrierId): array
    {
        return $this->get("/v1/carriers/{$carrierId}/options");
    }

    // ── Rates ─────────────────────────────────────────────────────────────────

    /** Get rates for a shipment (pass full shipment object). */
    public function getRates(array $shipmentOrRateRequest): array
    {
        return $this->post('/v1/rates', $shipmentOrRateRequest);
    }

    /** Get bulk rates for multiple shipments. */
    public function getBulkRates(array $payload): array
    {
        return $this->post('/v1/rates/bulk', $payload);
    }

    /** Estimate rates with minimal address info (no account required). */
    public function estimateRates(array $payload): array
    {
        return $this->post('/v1/rates/estimate', $payload);
    }

    /** Get rates by rate ID. */
    public function getRate(string $rateId): array
    {
        return $this->get("/v1/rates/{$rateId}");
    }

    // ── Shipments ────────────────────────────────────────────────────────────

    /** Create one or more shipments. */
    public function createShipments(array $shipments): array
    {
        return $this->post('/v1/shipments', ['shipments' => $shipments]);
    }

    /** List shipments with optional filters. */
    public function listShipments(array $filters = []): array
    {
        return $this->get('/v1/shipments', $filters);
    }

    /** Get a single shipment. */
    public function getShipment(string $shipmentId): array
    {
        return $this->get("/v1/shipments/{$shipmentId}");
    }

    /** Update a shipment. */
    public function updateShipment(string $shipmentId, array $data): array
    {
        return $this->put("/v1/shipments/{$shipmentId}", $data);
    }

    /** Cancel a shipment. */
    public function cancelShipment(string $shipmentId): array
    {
        return $this->put("/v1/shipments/{$shipmentId}/cancel");
    }

    /** Get rates for an existing shipment. */
    public function getShipmentRates(string $shipmentId): array
    {
        return $this->get("/v1/shipments/{$shipmentId}/rates");
    }

    // ── Labels ───────────────────────────────────────────────────────────────

    /** Create a label from a rate ID. */
    public function createLabelFromRate(string $rateId, array $options = []): array
    {
        return $this->post("/v1/labels/rates/{$rateId}", $options);
    }

    /** Create a label from a shipment ID. */
    public function createLabelFromShipment(string $shipmentId, array $options = []): array
    {
        return $this->post("/v1/labels/shipments/{$shipmentId}", $options);
    }

    /** Create a label directly (inline shipment details). */
    public function createLabel(array $labelRequest): array
    {
        return $this->post('/v1/labels', $labelRequest);
    }

    /** List labels. */
    public function listLabels(array $filters = []): array
    {
        return $this->get('/v1/labels', $filters);
    }

    /** Get a single label. */
    public function getLabel(string $labelId): array
    {
        return $this->get("/v1/labels/{$labelId}");
    }

    /** Void (cancel) a label. */
    public function voidLabel(string $labelId): array
    {
        return $this->put("/v1/labels/{$labelId}/void");
    }

    /** Get label tracking info. */
    public function getLabelTrackingInfo(string $labelId): array
    {
        return $this->get("/v1/labels/{$labelId}/track");
    }

    // ── Tracking ─────────────────────────────────────────────────────────────

    /** Track a package by carrier and tracking number. */
    public function trackByNumber(string $carrierCode, string $trackingNumber): array
    {
        return $this->get('/v1/tracking', [
            'carrier_code'    => $carrierCode,
            'tracking_number' => $trackingNumber,
        ]);
    }

    /** Start tracking a package (subscribe to webhooks). */
    public function startTracking(string $carrierCode, string $trackingNumber): array
    {
        return $this->post('/v1/tracking/start', [
            'carrier_code'    => $carrierCode,
            'tracking_number' => $trackingNumber,
        ]);
    }

    /** Stop tracking a package. */
    public function stopTracking(string $carrierCode, string $trackingNumber): array
    {
        return $this->post('/v1/tracking/stop', [
            'carrier_code'    => $carrierCode,
            'tracking_number' => $trackingNumber,
        ]);
    }

    // ── Service Points ────────────────────────────────────────────────────────

    /** Search for nearby service points (drop-off/pick-up locations). */
    public function searchServicePoints(array $payload): array
    {
        return $this->post('/v1/service_points/list', $payload);
    }

    /** Get a specific service point. */
    public function getServicePoint(string $carrierCode, string $countryCode, string $servicePointId): array
    {
        return $this->get("/v1/service_points/{$carrierCode}/{$countryCode}/{$servicePointId}");
    }

    // ── Warehouses ────────────────────────────────────────────────────────────

    /** List warehouses. */
    public function listWarehouses(): array
    {
        return $this->get('/v1/warehouses');
    }

    /** Create a warehouse. */
    public function createWarehouse(array $data): array
    {
        return $this->post('/v1/warehouses', $data);
    }

    /** Get a warehouse. */
    public function getWarehouse(string $warehouseId): array
    {
        return $this->get("/v1/warehouses/{$warehouseId}");
    }

    /** Update a warehouse. */
    public function updateWarehouse(string $warehouseId, array $data): array
    {
        return $this->put("/v1/warehouses/{$warehouseId}", $data);
    }

    /** Delete a warehouse. */
    public function deleteWarehouse(string $warehouseId): array
    {
        return $this->delete("/v1/warehouses/{$warehouseId}");
    }

    // ── Batches ───────────────────────────────────────────────────────────────

    /** Create a batch of labels. */
    public function createBatch(array $data): array
    {
        return $this->post('/v1/batches', $data);
    }

    /** Get a batch. */
    public function getBatch(string $batchId): array
    {
        return $this->get("/v1/batches/{$batchId}");
    }

    /** Add shipments to a batch. */
    public function addToBatch(string $batchId, array $shipmentIds): array
    {
        return $this->post("/v1/batches/{$batchId}/add", ['shipment_ids' => $shipmentIds]);
    }

    /** Remove shipments from a batch. */
    public function removeFromBatch(string $batchId, array $shipmentIds): array
    {
        return $this->post("/v1/batches/{$batchId}/remove", ['shipment_ids' => $shipmentIds]);
    }

    /** Process a batch (generate all labels). */
    public function processBatch(string $batchId, array $options = []): array
    {
        return $this->post("/v1/batches/{$batchId}/process/labels", $options);
    }

    // ── LTL / Manifests ──────────────────────────────────────────────────────

    /** Create a manifest (end-of-day close-out). */
    public function createManifest(array $data): array
    {
        return $this->post('/v1/manifests', $data);
    }

    /** List manifests. */
    public function listManifests(array $filters = []): array
    {
        return $this->get('/v1/manifests', $filters);
    }

    /** Get a manifest. */
    public function getManifest(string $manifestId): array
    {
        return $this->get("/v1/manifests/{$manifestId}");
    }

    // ── Pickups ───────────────────────────────────────────────────────────────

    /** Schedule a carrier pickup. */
    public function schedulePickup(array $data): array
    {
        return $this->post('/v1/pickups', $data);
    }

    /** List pickups. */
    public function listPickups(array $filters = []): array
    {
        return $this->get('/v1/pickups', $filters);
    }

    /** Delete (cancel) a pickup. */
    public function cancelPickup(string $pickupId): array
    {
        return $this->delete("/v1/pickups/{$pickupId}");
    }

    // ── Webhooks ──────────────────────────────────────────────────────────────

    /** List webhooks. */
    public function listWebhooks(): array
    {
        return $this->get('/v1/environment/webhooks');
    }

    /** Create a webhook. */
    public function createWebhook(array $data): array
    {
        return $this->post('/v1/environment/webhooks', $data);
    }

    /** Delete a webhook. */
    public function deleteWebhook(string $webhookId): array
    {
        return $this->delete("/v1/environment/webhooks/{$webhookId}");
    }

    // ── Account ───────────────────────────────────────────────────────────────

    /** Get account settings. */
    public function getAccountSettings(): array
    {
        return $this->get('/v1/account/settings');
    }
}
