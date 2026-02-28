<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\DeliveryAssignment;
use App\Models\DeliveryStaff;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Driver App API — used by the mobile driver app.
 * Auth: Bearer token generated via admin panel (DeliveryStaffController@generateToken).
 *
 * All routes prefixed with: /api/driver-app/
 */
class DriverAppController extends Controller
{
    /**
     * Resolve the authenticated driver from Bearer token.
     */
    private function resolveDriver(Request $request): ?DeliveryStaff
    {
        $auth = $request->header('Authorization', '');
        if (!str_starts_with($auth, 'Bearer ')) {
            return null;
        }
        $token = substr($auth, 7);
        return DeliveryStaff::findByToken($token);
    }

    /**
     * Driver login via phone + PIN.
     * POST /api/driver-app/login
     */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => 'required|string',
            'pin'   => 'required|string',
        ]);

        $driver = DeliveryStaff::where('phone', $data['phone'])
            ->where('pin', $data['pin'])
            ->where('is_active', true)
            ->first();

        if (!$driver) {
            return response()->json(['message' => 'Invalid phone or PIN.'], 401);
        }

        $token = $driver->generateToken();

        return response()->json([
            'token'  => $token,
            'driver' => [
                'id'           => $driver->id,
                'name'         => $driver->name,
                'phone'        => $driver->phone,
                'vehicle_type' => $driver->vehicle_type,
                'status'       => $driver->status,
                'rating'       => $driver->rating,
            ],
        ]);
    }

    /**
     * Get driver's own profile + current assignment.
     * GET /api/driver-app/me
     */
    public function me(Request $request): JsonResponse
    {
        $driver = $this->resolveDriver($request);
        if (!$driver) return response()->json(['message' => 'Unauthorized.'], 401);

        $assignment = DeliveryAssignment::where('driver_id', $driver->id)
            ->whereIn('status', ['assigned', 'accepted', 'picked_up', 'out_for_delivery'])
            ->where('is_current', true)
            ->with(['order.business', 'order.items'])
            ->latest()
            ->first();

        return response()->json([
            'driver'             => $driver,
            'current_assignment' => $assignment,
        ]);
    }

    /**
     * Update driver's online status and location.
     * PATCH /api/driver-app/status
     */
    public function updateStatus(Request $request): JsonResponse
    {
        $driver = $this->resolveDriver($request);
        if (!$driver) return response()->json(['message' => 'Unauthorized.'], 401);

        $data = $request->validate([
            'status'      => 'required|in:available,busy,offline',
            'current_lat' => 'nullable|numeric',
            'current_lng' => 'nullable|numeric',
        ]);

        $update = ['status' => $data['status']];
        if ($request->filled('current_lat')) {
            $update['current_lat']         = $data['current_lat'];
            $update['current_lng']         = $data['current_lng'];
            $update['location_updated_at'] = now();
        }

        $driver->update($update);

        return response()->json(['message' => 'Status updated.', 'driver' => $driver->fresh()]);
    }

    /**
     * Update driver location (called frequently by app).
     * POST /api/driver-app/location
     */
    public function updateLocation(Request $request): JsonResponse
    {
        $driver = $this->resolveDriver($request);
        if (!$driver) return response()->json(['message' => 'Unauthorized.'], 401);

        $data = $request->validate([
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
        ]);

        $driver->update([
            'current_lat'         => $data['lat'],
            'current_lng'         => $data['lng'],
            'location_updated_at' => now(),
        ]);

        return response()->json(['message' => 'Location updated.']);
    }

    /**
     * Get list of pending assignments for driver.
     * GET /api/driver-app/assignments
     */
    public function assignments(Request $request): JsonResponse
    {
        $driver = $this->resolveDriver($request);
        if (!$driver) return response()->json(['message' => 'Unauthorized.'], 401);

        $assignments = DeliveryAssignment::where('driver_id', $driver->id)
            ->whereIn('status', ['assigned', 'accepted', 'picked_up', 'out_for_delivery'])
            ->where('is_current', true)
            ->with(['order.business', 'order.items'])
            ->latest()
            ->get();

        return response()->json($assignments);
    }

    /**
     * Accept or reject an assignment.
     * PATCH /api/driver-app/assignments/{assignment}/respond
     */
    public function respondToAssignment(Request $request, int $assignmentId): JsonResponse
    {
        $driver = $this->resolveDriver($request);
        if (!$driver) return response()->json(['message' => 'Unauthorized.'], 401);

        $assignment = DeliveryAssignment::where('id', $assignmentId)
            ->where('driver_id', $driver->id)
            ->where('is_current', true)
            ->firstOrFail();

        $data = $request->validate([
            'action'           => 'required|in:accept,reject',
            'rejection_reason' => 'nullable|string|max:200',
        ]);

        if ($data['action'] === 'accept') {
            $assignment->update([
                'status'      => 'accepted',
                'accepted_at' => now(),
            ]);
            $assignment->order->update([
                'driver_status'      => 'accepted',
                'driver_accepted_at' => now(),
            ]);
            return response()->json(['message' => 'Assignment accepted.', 'assignment' => $assignment->fresh(['order.business'])]);
        }

        // Reject
        DB::transaction(function () use ($assignment, $data, $driver) {
            $assignment->update([
                'status'           => 'rejected',
                'rejected_at'      => now(),
                'rejection_reason' => $data['rejection_reason'] ?? null,
                'is_current'       => false,
            ]);
            $assignment->order->update([
                'driver_status'      => 'unassigned',
                'assigned_driver_id' => null,
            ]);
            // Free up driver
            if (!$driver->activeAssignment()->exists()) {
                $driver->update(['status' => 'available']);
            }
        });

        return response()->json(['message' => 'Assignment rejected. Admin will reassign.']);
    }

    /**
     * Update delivery progress (picked up / out for delivery / delivered).
     * PATCH /api/driver-app/assignments/{assignment}/progress
     */
    public function updateProgress(Request $request, int $assignmentId): JsonResponse
    {
        $driver = $this->resolveDriver($request);
        if (!$driver) return response()->json(['message' => 'Unauthorized.'], 401);

        $assignment = DeliveryAssignment::where('id', $assignmentId)
            ->where('driver_id', $driver->id)
            ->where('is_current', true)
            ->firstOrFail();

        $data = $request->validate([
            'status'       => 'required|in:picked_up,out_for_delivery,delivered,failed',
            'driver_notes' => 'nullable|string',
            'lat'          => 'nullable|numeric',
            'lng'          => 'nullable|numeric',
        ]);

        $update = ['status' => $data['status']];
        $orderUpdate = [];

        match ($data['status']) {
            'picked_up'        => ($update['picked_up_at'] = now()) && ($orderUpdate['driver_picked_up_at'] = now()),
            'delivered'        => ($update['delivered_at'] = now()) && ($orderUpdate['delivered_at'] = now()),
            'out_for_delivery' => null,
            'failed'           => ($update['is_current'] = false),
        };

        if ($request->filled('driver_notes')) $update['driver_notes'] = $data['driver_notes'];

        $assignment->update($update);

        // Map to order status
        $orderStatusMap = [
            'picked_up'        => ['driver_status' => 'picked_up'],
            'out_for_delivery' => ['driver_status' => 'out_for_delivery', 'status' => 'out_for_delivery'],
            'delivered'        => ['driver_status' => 'delivered', 'status' => 'delivered'],
            'failed'           => ['driver_status' => 'failed'],
        ];

        if (isset($orderStatusMap[$data['status']])) {
            $assignment->order->update(array_merge($orderUpdate, $orderStatusMap[$data['status']]));
        }

        // Update driver location
        if ($request->filled('lat')) {
            $driver->update(['current_lat' => $data['lat'], 'current_lng' => $data['lng'], 'location_updated_at' => now()]);
        }

        // After delivery, mark driver available
        if (in_array($data['status'], ['delivered', 'failed'])) {
            $driver->increment('total_deliveries');
            if (!$driver->activeAssignment()->exists()) {
                $driver->update(['status' => 'available']);
            }
        }

        return response()->json([
            'message'    => "Status updated to {$data['status']}.",
            'assignment' => $assignment->fresh('order'),
        ]);
    }

    /**
     * Driver delivery history.
     * GET /api/driver-app/history
     */
    public function history(Request $request): JsonResponse
    {
        $driver = $this->resolveDriver($request);
        if (!$driver) return response()->json(['message' => 'Unauthorized.'], 401);

        $history = DeliveryAssignment::where('driver_id', $driver->id)
            ->whereIn('status', ['delivered', 'failed', 'cancelled'])
            ->with('order.business')
            ->latest()
            ->paginate(20);

        return response()->json($history);
    }
}
