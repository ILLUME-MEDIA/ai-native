<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\DeliveryAssignment;
use App\Models\DeliveryStaff;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

/**
 * Admin: assign orders to drivers, track status.
 */
class DeliveryAssignmentController extends Controller
{
    /**
     * List all assignments (admin view).
     */
    public function index(Request $request): JsonResponse
    {
        $q = DeliveryAssignment::with(['order.business', 'driver', 'zone'])
            ->when($request->filled('driver_id'),    fn($q) => $q->where('driver_id', $request->driver_id))
            ->when($request->filled('status'),       fn($q) => $q->where('status', $request->status))
            ->when($request->filled('is_current'),   fn($q) => $q->where('is_current', (bool)$request->is_current))
            ->when($request->filled('business_id'), function ($q) use ($request) {
                $q->whereHas('order', fn($q) => $q->where('business_id', $request->business_id));
            })
            ->latest()
            ->paginate((int)$request->input('per_page', 20));

        return response()->json($q);
    }

    /**
     * Assign a driver to an order.
     * If driver rejects, admin calls this again to reassign.
     */
    public function assign(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id'       => 'required|exists:orders,id',
            'driver_id'      => 'required|exists:delivery_staff,id',
            'zone_id'        => 'nullable|exists:delivery_zones,id',
            'driver_earnings'=> 'nullable|numeric|min:0',
        ]);

        $order  = Order::findOrFail($data['order_id']);
        $driver = DeliveryStaff::findOrFail($data['driver_id']);

        if ($driver->status === 'offline' || !$driver->is_active) {
            return response()->json(['message' => 'Driver is offline or inactive.'], 422);
        }

        DB::transaction(function () use ($data, $order, $driver) {
            // Mark all previous assignments for this order as not current
            DeliveryAssignment::where('order_id', $order->id)->update(['is_current' => false]);

            // Create new assignment
            DeliveryAssignment::create([
                'order_id'        => $order->id,
                'driver_id'       => $driver->id,
                'zone_id'         => $data['zone_id'] ?? null,
                'status'          => 'assigned',
                'assigned_at'     => now(),
                'driver_earnings' => $data['driver_earnings'] ?? 0,
                'is_current'      => true,
            ]);

            // Update order
            $order->update([
                'assigned_driver_id' => $driver->id,
                'driver_status'      => 'assigned',
            ]);

            // Mark driver as busy
            $driver->update(['status' => 'busy']);
        });

        return response()->json([
            'message'    => "Order #{$order->order_number} assigned to {$driver->name}.",
            'order'      => $order->fresh(['assignedDriver', 'currentAssignment']),
        ]);
    }

    /**
     * Unassign / cancel current assignment (admin action).
     */
    public function unassign(Request $request, Order $order): JsonResponse
    {
        $assignment = DeliveryAssignment::where('order_id', $order->id)
            ->where('is_current', true)
            ->first();

        if (!$assignment) {
            return response()->json(['message' => 'No active assignment found.'], 404);
        }

        DB::transaction(function () use ($assignment, $order) {
            $driver = $assignment->driver;

            $assignment->update([
                'status'     => 'cancelled',
                'is_current' => false,
            ]);

            $order->update([
                'assigned_driver_id' => null,
                'driver_status'      => 'unassigned',
            ]);

            // Free up driver only if they have no other active assignments
            if ($driver && !$driver->activeAssignment()->exists()) {
                $driver->update(['status' => 'available']);
            }
        });

        return response()->json(['message' => 'Assignment cancelled.']);
    }

    /**
     * Admin update assignment status.
     */
    public function updateStatus(Request $request, DeliveryAssignment $assignment): JsonResponse
    {
        $data = $request->validate([
            'status'          => 'required|in:assigned,accepted,rejected,picked_up,out_for_delivery,delivered,failed,cancelled',
            'driver_notes'    => 'nullable|string',
            'rejection_reason'=> 'nullable|string',
        ]);

        $timestamps = [
            'accepted'         => 'accepted_at',
            'rejected'         => 'rejected_at',
            'picked_up'        => 'picked_up_at',
            'out_for_delivery' => null,
            'delivered'        => 'delivered_at',
        ];

        $update = ['status' => $data['status']];
        if (isset($timestamps[$data['status']]) && $timestamps[$data['status']]) {
            $update[$timestamps[$data['status']]] = now();
        }
        if ($request->filled('driver_notes'))     $update['driver_notes']     = $data['driver_notes'];
        if ($request->filled('rejection_reason')) $update['rejection_reason'] = $data['rejection_reason'];

        $assignment->update($update);

        // Sync order driver_status
        $orderStatusMap = [
            'accepted'         => 'accepted',
            'picked_up'        => 'picked_up',
            'out_for_delivery' => 'out_for_delivery',
            'delivered'        => 'delivered',
            'failed'           => 'failed',
        ];
        if (isset($orderStatusMap[$data['status']])) {
            $assignment->order->update(['driver_status' => $orderStatusMap[$data['status']]]);
        }

        // If delivered, free up driver
        if (in_array($data['status'], ['delivered', 'failed', 'cancelled', 'rejected'])) {
            $driver = $assignment->driver;
            if ($driver && !$driver->activeAssignment()->exists()) {
                $driver->update(['status' => 'available']);
            }
            if ($data['status'] === 'delivered') {
                $driver?->increment('total_deliveries');
            }
        }

        return response()->json($assignment->fresh(['order', 'driver']));
    }

    /**
     * Auto-assign: find nearest available driver and assign.
     */
    public function autoAssign(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => 'required|exists:orders,id',
        ]);

        $order = Order::with('business')->findOrFail($data['order_id']);

        // Find available drivers for this business
        $driver = DeliveryStaff::available()
            ->where(fn($q) => $q
                ->where('business_id', $order->business_id)
                ->orWhereNull('business_id')
            )
            ->orderByRaw('RAND()')  // TODO: order by distance using Haversine
            ->first();

        if (!$driver) {
            return response()->json(['message' => 'No available drivers at this time.'], 422);
        }

        return $this->assign(new Request([
            'order_id'  => $order->id,
            'driver_id' => $driver->id,
        ]));
    }
}
