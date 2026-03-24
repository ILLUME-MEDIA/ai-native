<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\DeliveryStaff;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin CRUD for delivery staff (drivers).
 * All routes require auth:sanctum.
 */
class DeliveryStaffController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = DeliveryStaff::with('business')
            ->when($request->filled('business_id'), fn($q) => $q->where('business_id', $request->business_id))
            ->when($request->filled('status'),      fn($q) => $q->where('status', $request->status))
            ->when($request->filled('is_active'),   fn($q) => $q->where('is_active', (bool)$request->is_active))
            ->when($request->filled('search'), function ($q) use ($request) {
                $s = $request->search;
                $q->where(fn($q) => $q->where('name', 'like', "%$s%")->orWhere('phone', 'like', "%$s%"));
            })
            ->orderBy('name');

        return response()->json($q->paginate((int)$request->input('per_page', 20)));
    }

    public function show(DeliveryStaff $deliveryStaff): JsonResponse
    {
        return response()->json($deliveryStaff->load(['business', 'assignments' => fn($q) => $q->latest()->limit(10)->with('order')]));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id'   => 'nullable|exists:businesses,id',
            'name'          => 'required|string|max:200',
            'phone'         => 'required|string|max:30|unique:delivery_staff,phone',
            'email'         => 'nullable|email|max:200',
            'pin'           => 'nullable|digits_between:4,6',
            'vehicle_type'  => 'in:bike,motorcycle,car,van,walk',
            'vehicle_model' => 'nullable|string|max:100',
            'vehicle_plate' => 'nullable|string|max:20',
            'photo'         => 'nullable|url',
            'is_active'     => 'boolean',
            'notes'         => 'nullable|string',
        ]);

        $staff = DeliveryStaff::create($data);

        return response()->json($staff, 201);
    }

    public function update(Request $request, DeliveryStaff $deliveryStaff): JsonResponse
    {
        $data = $request->validate([
            'business_id'   => 'nullable|exists:businesses,id',
            'name'          => 'sometimes|string|max:200',
            'phone'         => "sometimes|string|max:30|unique:delivery_staff,phone,{$deliveryStaff->id}",
            'email'         => 'nullable|email|max:200',
            'pin'           => 'nullable|digits_between:4,6',
            'vehicle_type'  => 'in:bike,motorcycle,car,van,walk',
            'vehicle_model' => 'nullable|string|max:100',
            'vehicle_plate' => 'nullable|string|max:20',
            'photo'         => 'nullable|url',
            'status'        => 'in:available,busy,offline',
            'is_active'     => 'boolean',
            'notes'         => 'nullable|string',
        ]);

        $deliveryStaff->update($data);

        return response()->json($deliveryStaff->fresh());
    }

    public function destroy(DeliveryStaff $deliveryStaff): JsonResponse
    {
        $deliveryStaff->delete();
        return response()->json(['message' => 'Driver deleted.']);
    }

    /**
     * Generate a new API token for the driver (for driver app login).
     */
    public function generateToken(DeliveryStaff $deliveryStaff): JsonResponse
    {
        $plainToken = $deliveryStaff->generateToken();
        return response()->json([
            'token'      => $plainToken,
            'driver_id'  => $deliveryStaff->id,
            'driver_name'=> $deliveryStaff->name,
            'message'    => 'New token generated. Share this with the driver app. It will not be shown again.',
        ]);
    }

    /**
     * Get available drivers (for assignment modal).
     */
    public function available(Request $request): JsonResponse
    {
        $drivers = DeliveryStaff::available()
            ->when($request->filled('business_id'), fn($q) => $q->where('business_id', $request->business_id))
            ->orderBy('name')
            ->get(['id', 'name', 'phone', 'vehicle_type', 'status', 'current_lat', 'current_lng', 'rating']);

        return response()->json($drivers);
    }

    /**
     * Get real-time locations of all active drivers for a business.
     */
    public function locations(Request $request): JsonResponse
    {
        $q = DeliveryStaff::where('is_active', true)
            ->whereNotNull('current_lat')
            ->when($request->filled('business_id'), fn($q) => $q->where('business_id', $request->business_id))
            ->select(['id', 'name', 'phone', 'vehicle_type', 'status', 'current_lat', 'current_lng', 'location_updated_at', 'rating'])
            ->get();

        return response()->json($q);
    }
}
