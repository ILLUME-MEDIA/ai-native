<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\DeliveryZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin CRUD for delivery zones.
 * All routes require auth:sanctum.
 */
class DeliveryZoneController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $zones = DeliveryZone::with('business')
            ->when($request->filled('business_id'), fn($q) => $q->where('business_id', $request->business_id))
            ->when($request->filled('is_active'), fn($q) => $q->where('is_active', (bool)$request->is_active))
            ->orderBy('sort_order')
            ->get();

        return response()->json($zones);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id'          => 'required|exists:businesses,id',
            'name'                 => 'required|string|max:200',
            'description'          => 'nullable|string',
            'zone_type'            => 'required|in:circle,polygon,city',
            'center_lat'           => 'required_if:zone_type,circle|nullable|numeric',
            'center_lng'           => 'required_if:zone_type,circle|nullable|numeric',
            'radius_km'            => 'required_if:zone_type,circle|nullable|numeric|min:0.1',
            'polygon_coordinates'  => 'required_if:zone_type,polygon|nullable|array',
            'polygon_coordinates.*'=> 'array|size:2',
            'city_name'            => 'required_if:zone_type,city|nullable|string|max:200',
            'zip_codes'            => 'nullable|string',
            'delivery_fee'         => 'required|numeric|min:0',
            'min_order_amount'     => 'nullable|numeric|min:0',
            'estimated_minutes'    => 'nullable|integer|min:1',
            'is_active'            => 'boolean',
            'sort_order'           => 'nullable|integer',
        ]);

        $zone = DeliveryZone::create($data);

        return response()->json($zone, 201);
    }

    public function show(DeliveryZone $deliveryZone): JsonResponse
    {
        return response()->json($deliveryZone->load('business'));
    }

    public function update(Request $request, DeliveryZone $deliveryZone): JsonResponse
    {
        $data = $request->validate([
            'name'                 => 'sometimes|string|max:200',
            'description'          => 'nullable|string',
            'zone_type'            => 'in:circle,polygon,city',
            'center_lat'           => 'nullable|numeric',
            'center_lng'           => 'nullable|numeric',
            'radius_km'            => 'nullable|numeric|min:0.1',
            'polygon_coordinates'  => 'nullable|array',
            'city_name'            => 'nullable|string|max:200',
            'zip_codes'            => 'nullable|string',
            'delivery_fee'         => 'nullable|numeric|min:0',
            'min_order_amount'     => 'nullable|numeric|min:0',
            'estimated_minutes'    => 'nullable|integer|min:1',
            'is_active'            => 'boolean',
            'sort_order'           => 'nullable|integer',
        ]);

        $deliveryZone->update($data);

        return response()->json($deliveryZone->fresh());
    }

    public function destroy(DeliveryZone $deliveryZone): JsonResponse
    {
        $deliveryZone->delete();
        return response()->json(['message' => 'Zone deleted.']);
    }

    /**
     * Reorder zones (drag-and-drop from admin UI).
     * Expects: { order: [3, 1, 2] } — array of zone IDs in new order.
     */
    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'order'   => 'required|array',
            'order.*' => 'integer|exists:delivery_zones,id',
        ]);

        foreach ($request->order as $position => $id) {
            DeliveryZone::where('id', $id)->update(['sort_order' => $position]);
        }

        return response()->json(['message' => 'Order updated.']);
    }

    /**
     * Public endpoint: check if a coordinate is in any zone for a business.
     * Used by storefront to show delivery fee estimates.
     */
    public function checkPoint(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id' => 'required|exists:businesses,id',
            'lat'         => 'required|numeric',
            'lng'         => 'required|numeric',
        ]);

        $zones = DeliveryZone::where('business_id', $data['business_id'])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        foreach ($zones as $zone) {
            if ($zone->containsPoint((float)$data['lat'], (float)$data['lng'])) {
                return response()->json([
                    'in_zone'           => true,
                    'zone'              => $zone,
                    'delivery_fee'      => $zone->delivery_fee,
                    'estimated_minutes' => $zone->estimated_minutes,
                ]);
            }
        }

        return response()->json(['in_zone' => false, 'message' => 'No delivery zone covers your location.'], 200);
    }
}
