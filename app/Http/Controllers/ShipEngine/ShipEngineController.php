<?php

namespace App\Http\Controllers\ShipEngine;

use App\Http\Controllers\Controller;
use App\Services\ShipEngineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * ShipEngine API Proxy Controller
 *
 * Wraps the ShipEngine REST API behind our authenticated admin routes.
 * All endpoints require Sanctum auth (auth:sanctum middleware applied in routes).
 *
 * Routes prefix: /api/shipengine
 */
class ShipEngineController extends Controller
{
    public function __construct(private ShipEngineService $se) {}

    // ── Addresses ────────────────────────────────────────────────────────────

    /**
     * POST /api/shipengine/addresses/validate
     * Validate one or more addresses.
     *
     * Body: array of address objects
     * [{ "name": "...", "address_line1": "...", "city_locality": "...",
     *    "state_province": "CA", "postal_code": "90001", "country_code": "US" }]
     */
    public function validateAddresses(Request $request): JsonResponse
    {
        $addresses = $request->validate([
            '*'                    => 'required|array',
            '*.name'               => 'nullable|string',
            '*.company_name'       => 'nullable|string',
            '*.address_line1'      => 'required|string',
            '*.address_line2'      => 'nullable|string',
            '*.address_line3'      => 'nullable|string',
            '*.city_locality'      => 'required|string',
            '*.state_province'     => 'required|string',
            '*.postal_code'        => 'required|string',
            '*.country_code'       => 'required|string|size:2',
            '*.phone'              => 'nullable|string',
            '*.address_residential_indicator' => 'nullable|string|in:yes,no,unknown',
        ]);

        return $this->proxy(fn() => $this->se->validateAddresses($addresses));
    }

    // ── Carriers ─────────────────────────────────────────────────────────────

    /** GET /api/shipengine/carriers */
    public function listCarriers(): JsonResponse
    {
        return $this->proxy(fn() => $this->se->listCarriers());
    }

    /** GET /api/shipengine/carriers/{carrierId} */
    public function getCarrier(string $carrierId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->getCarrier($carrierId));
    }

    /** GET /api/shipengine/carriers/{carrierId}/services */
    public function getCarrierServices(string $carrierId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->getCarrierServices($carrierId));
    }

    /** GET /api/shipengine/carriers/{carrierId}/packages */
    public function getCarrierPackageTypes(string $carrierId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->getCarrierPackageTypes($carrierId));
    }

    /** GET /api/shipengine/carriers/{carrierId}/options */
    public function getCarrierOptions(string $carrierId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->getCarrierOptions($carrierId));
    }

    // ── Rates ─────────────────────────────────────────────────────────────────

    /**
     * POST /api/shipengine/rates
     * Get rates for a shipment.
     *
     * Body: { "shipment": { ... }, "rate_options": { "carrier_ids": [...] } }
     */
    public function getRates(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shipment'                            => 'required|array',
            'shipment.ship_to'                    => 'required|array',
            'shipment.ship_from'                  => 'required|array',
            'shipment.packages'                   => 'required|array|min:1',
            'rate_options'                        => 'nullable|array',
            'rate_options.carrier_ids'            => 'nullable|array',
            'rate_options.service_codes'          => 'nullable|array',
            'rate_options.calculate_tax_amount'   => 'nullable|boolean',
            'rate_options.preferred_currency'     => 'nullable|string',
        ]);

        return $this->proxy(fn() => $this->se->getRates($data));
    }

    /**
     * POST /api/shipengine/rates/estimate
     * Estimate rates with minimal info (no carrier account needed for public rates).
     *
     * Body: { "carrier_id": "...", "from_country_code": "US", "from_postal_code": "...",
     *         "to_country_code": "US", "to_postal_code": "...",
     *         "weight": { "value": 1.0, "unit": "pound" } }
     */
    public function estimateRates(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carrier_id'        => 'nullable|string',
            'from_country_code' => 'required|string|size:2',
            'from_postal_code'  => 'required|string',
            'to_country_code'   => 'required|string|size:2',
            'to_postal_code'    => 'required|string',
            'to_city_locality'  => 'nullable|string',
            'to_state_province' => 'nullable|string',
            'weight'            => 'required|array',
            'weight.value'      => 'required|numeric|min:0',
            'weight.unit'       => 'required|string|in:pound,ounce,gram,kilogram',
            'dimensions'        => 'nullable|array',
            'ship_date'         => 'nullable|string',
        ]);

        return $this->proxy(fn() => $this->se->estimateRates($data));
    }

    // ── Shipments ────────────────────────────────────────────────────────────

    /**
     * POST /api/shipengine/shipments
     * Create one or more shipments.
     *
     * Body: { "shipments": [{ "ship_to": {...}, "ship_from": {...}, "packages": [...] }] }
     */
    public function createShipments(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shipments'              => 'required|array|min:1',
            'shipments.*.ship_to'   => 'required|array',
            'shipments.*.ship_from' => 'required|array',
            'shipments.*.packages'  => 'required|array|min:1',
        ]);

        return $this->proxy(fn() => $this->se->createShipments($data['shipments']));
    }

    /**
     * GET /api/shipengine/shipments
     * List shipments.
     */
    public function listShipments(Request $request): JsonResponse
    {
        $filters = $request->only([
            'batch_id', 'tag', 'status', 'page', 'page_size',
            'sort_dir', 'sort_by', 'modified_at_start', 'modified_at_end',
        ]);

        return $this->proxy(fn() => $this->se->listShipments($filters));
    }

    /** GET /api/shipengine/shipments/{shipmentId} */
    public function getShipment(string $shipmentId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->getShipment($shipmentId));
    }

    /**
     * PUT /api/shipengine/shipments/{shipmentId}
     * Update a shipment.
     */
    public function updateShipment(Request $request, string $shipmentId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->updateShipment($shipmentId, $request->all()));
    }

    /** PUT /api/shipengine/shipments/{shipmentId}/cancel */
    public function cancelShipment(string $shipmentId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->cancelShipment($shipmentId));
    }

    /** GET /api/shipengine/shipments/{shipmentId}/rates */
    public function getShipmentRates(string $shipmentId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->getShipmentRates($shipmentId));
    }

    // ── Labels ───────────────────────────────────────────────────────────────

    /**
     * POST /api/shipengine/labels
     * Create a label from inline shipment details.
     *
     * Body: full label request (ship_to, ship_from, packages, service_code, carrier_id, etc.)
     */
    public function createLabel(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shipment'                   => 'required|array',
            'shipment.ship_to'           => 'required|array',
            'shipment.ship_from'         => 'required|array',
            'shipment.packages'          => 'required|array|min:1',
            'shipment.service_code'      => 'nullable|string',
            'shipment.carrier_id'        => 'nullable|string',
            'label_format'               => 'nullable|string|in:pdf,png,zpl',
            'label_layout'               => 'nullable|string|in:4x6,letter',
            'label_download_type'        => 'nullable|string|in:url,inline',
        ]);

        return $this->proxy(fn() => $this->se->createLabel($data));
    }

    /**
     * POST /api/shipengine/labels/rates/{rateId}
     * Create a label from a rate ID.
     */
    public function createLabelFromRate(Request $request, string $rateId): JsonResponse
    {
        $options = $request->only(['label_format', 'label_layout', 'label_download_type']);
        return $this->proxy(fn() => $this->se->createLabelFromRate($rateId, $options));
    }

    /**
     * POST /api/shipengine/labels/shipments/{shipmentId}
     * Create a label from an existing shipment.
     */
    public function createLabelFromShipment(Request $request, string $shipmentId): JsonResponse
    {
        $options = $request->only(['label_format', 'label_layout', 'label_download_type', 'carrier_id', 'service_code']);
        return $this->proxy(fn() => $this->se->createLabelFromShipment($shipmentId, $options));
    }

    /**
     * GET /api/shipengine/labels
     * List labels.
     */
    public function listLabels(Request $request): JsonResponse
    {
        $filters = $request->only([
            'status', 'service_code', 'carrier_id', 'batch_id', 'warehouse_id',
            'created_at_start', 'created_at_end', 'page', 'page_size', 'sort_by', 'sort_dir',
        ]);

        return $this->proxy(fn() => $this->se->listLabels($filters));
    }

    /** GET /api/shipengine/labels/{labelId} */
    public function getLabel(string $labelId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->getLabel($labelId));
    }

    /** PUT /api/shipengine/labels/{labelId}/void */
    public function voidLabel(string $labelId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->voidLabel($labelId));
    }

    /** GET /api/shipengine/labels/{labelId}/track */
    public function getLabelTrackingInfo(string $labelId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->getLabelTrackingInfo($labelId));
    }

    // ── Tracking ─────────────────────────────────────────────────────────────

    /**
     * GET /api/shipengine/tracking
     * Track a package by carrier code + tracking number.
     *
     * Query: carrier_code, tracking_number
     */
    public function track(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carrier_code'    => 'required|string',
            'tracking_number' => 'required|string',
        ]);

        return $this->proxy(fn() => $this->se->trackByNumber($data['carrier_code'], $data['tracking_number']));
    }

    /**
     * POST /api/shipengine/tracking/start
     * Subscribe to real-time tracking webhooks for a package.
     */
    public function startTracking(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carrier_code'    => 'required|string',
            'tracking_number' => 'required|string',
        ]);

        return $this->proxy(fn() => $this->se->startTracking($data['carrier_code'], $data['tracking_number']));
    }

    /**
     * POST /api/shipengine/tracking/stop
     * Unsubscribe from tracking webhooks.
     */
    public function stopTracking(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carrier_code'    => 'required|string',
            'tracking_number' => 'required|string',
        ]);

        return $this->proxy(fn() => $this->se->stopTracking($data['carrier_code'], $data['tracking_number']));
    }

    // ── Service Points ────────────────────────────────────────────────────────

    /**
     * POST /api/shipengine/service-points/search
     * Find nearby carrier drop-off/pick-up locations.
     *
     * Body: { "carriers": [{ "carrier_code": "ups", "country_code": "US" }],
     *         "address_query": "123 Main St, Austin TX",
     *         "lat": 30.267, "long": -97.743, "radius": 5,
     *         "max_results": 25 }
     */
    public function searchServicePoints(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carriers'                     => 'required|array|min:1',
            'carriers.*.carrier_code'      => 'required|string',
            'carriers.*.country_code'      => 'required|string|size:2',
            'address_query'                => 'nullable|string',
            'lat'                          => 'nullable|numeric',
            'long'                         => 'nullable|numeric',
            'radius'                       => 'nullable|numeric|min:0',
            'max_results'                  => 'nullable|integer|min:1|max:50',
        ]);

        return $this->proxy(fn() => $this->se->searchServicePoints($data));
    }

    /** GET /api/shipengine/service-points/{carrierCode}/{countryCode}/{servicePointId} */
    public function getServicePoint(string $carrierCode, string $countryCode, string $servicePointId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->getServicePoint($carrierCode, $countryCode, $servicePointId));
    }

    // ── Warehouses ────────────────────────────────────────────────────────────

    /** GET /api/shipengine/warehouses */
    public function listWarehouses(): JsonResponse
    {
        return $this->proxy(fn() => $this->se->listWarehouses());
    }

    /**
     * POST /api/shipengine/warehouses
     * Create a warehouse (origin address).
     */
    public function createWarehouse(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                         => 'required|string',
            'origin_address'               => 'required|array',
            'origin_address.name'          => 'required|string',
            'origin_address.address_line1' => 'required|string',
            'origin_address.city_locality' => 'required|string',
            'origin_address.state_province'=> 'required|string',
            'origin_address.postal_code'   => 'required|string',
            'origin_address.country_code'  => 'required|string|size:2',
            'return_address'               => 'nullable|array',
        ]);

        return $this->proxy(fn() => $this->se->createWarehouse($data));
    }

    /** GET /api/shipengine/warehouses/{warehouseId} */
    public function getWarehouse(string $warehouseId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->getWarehouse($warehouseId));
    }

    /** PUT /api/shipengine/warehouses/{warehouseId} */
    public function updateWarehouse(Request $request, string $warehouseId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->updateWarehouse($warehouseId, $request->all()));
    }

    /** DELETE /api/shipengine/warehouses/{warehouseId} */
    public function deleteWarehouse(string $warehouseId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->deleteWarehouse($warehouseId));
    }

    // ── Batches ───────────────────────────────────────────────────────────────

    /**
     * POST /api/shipengine/batches
     * Create a batch for bulk label generation.
     */
    public function createBatch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'label_layout'   => 'nullable|string|in:4x6,letter',
            'label_format'   => 'nullable|string|in:pdf,png,zpl',
            'shipment_ids'   => 'nullable|array',
            'rate_ids'       => 'nullable|array',
        ]);

        return $this->proxy(fn() => $this->se->createBatch($data));
    }

    /** GET /api/shipengine/batches/{batchId} */
    public function getBatch(string $batchId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->getBatch($batchId));
    }

    /** POST /api/shipengine/batches/{batchId}/add */
    public function addToBatch(Request $request, string $batchId): JsonResponse
    {
        $data = $request->validate(['shipment_ids' => 'required|array']);
        return $this->proxy(fn() => $this->se->addToBatch($batchId, $data['shipment_ids']));
    }

    /** POST /api/shipengine/batches/{batchId}/remove */
    public function removeFromBatch(Request $request, string $batchId): JsonResponse
    {
        $data = $request->validate(['shipment_ids' => 'required|array']);
        return $this->proxy(fn() => $this->se->removeFromBatch($batchId, $data['shipment_ids']));
    }

    /** POST /api/shipengine/batches/{batchId}/process */
    public function processBatch(Request $request, string $batchId): JsonResponse
    {
        $options = $request->only(['label_layout', 'label_format', 'label_download_type']);
        return $this->proxy(fn() => $this->se->processBatch($batchId, $options));
    }

    // ── Manifests ────────────────────────────────────────────────────────────

    /**
     * POST /api/shipengine/manifests
     * Create an end-of-day manifest (carrier close-out).
     *
     * Body: { "carrier_id": "...", "warehouse_id": "...", "ship_date": "2026-03-09" }
     */
    public function createManifest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carrier_id'   => 'required|string',
            'warehouse_id' => 'nullable|string',
            'ship_date'    => 'nullable|string|date',
            'label_ids'    => 'nullable|array',
        ]);

        return $this->proxy(fn() => $this->se->createManifest($data));
    }

    /** GET /api/shipengine/manifests */
    public function listManifests(Request $request): JsonResponse
    {
        return $this->proxy(fn() => $this->se->listManifests($request->only(['carrier_id', 'warehouse_id', 'ship_date_start', 'ship_date_end'])));
    }

    /** GET /api/shipengine/manifests/{manifestId} */
    public function getManifest(string $manifestId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->getManifest($manifestId));
    }

    // ── Pickups ───────────────────────────────────────────────────────────────

    /**
     * POST /api/shipengine/pickups
     * Schedule a carrier pickup.
     */
    public function schedulePickup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carrier_id'   => 'required|string',
            'warehouse_id' => 'required|string',
            'pickup_window'=> 'required|array',
            'pickup_window.start_at' => 'required|string',
            'pickup_window.end_at'   => 'required|string',
            'label_ids'    => 'nullable|array',
            'contact_details' => 'nullable|array',
        ]);

        return $this->proxy(fn() => $this->se->schedulePickup($data));
    }

    /** GET /api/shipengine/pickups */
    public function listPickups(Request $request): JsonResponse
    {
        return $this->proxy(fn() => $this->se->listPickups($request->only(['carrier_id', 'warehouse_id', 'created_at_start', 'created_at_end', 'page', 'page_size'])));
    }

    /** DELETE /api/shipengine/pickups/{pickupId} */
    public function cancelPickup(string $pickupId): JsonResponse
    {
        return $this->proxy(fn() => $this->se->cancelPickup($pickupId));
    }

    // ── Account ───────────────────────────────────────────────────────────────

    /** GET /api/shipengine/account/settings */
    public function getAccountSettings(): JsonResponse
    {
        return $this->proxy(fn() => $this->se->getAccountSettings());
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private function proxy(\Closure $fn): JsonResponse
    {
        try {
            $result = $fn();
            return response()->json($result);
        } catch (\Throwable $e) {
            Log::error('ShipEngine proxy error: ' . $e->getMessage());
            return response()->json([
                'error'   => true,
                'message' => $e->getMessage(),
            ], 502);
        }
    }
}
