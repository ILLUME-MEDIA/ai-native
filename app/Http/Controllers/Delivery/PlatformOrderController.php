<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\PlatformOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin: Unified view of all platform orders (UberEats + Instacart + etc.)
 * All routes require auth:sanctum.
 */
class PlatformOrderController extends Controller
{
    /**
     * GET /api/delivery/platform-orders
     * List all incoming orders from all delivery platforms.
     */
    public function index(Request $request): JsonResponse
    {
        $q = PlatformOrder::with(['business', 'order.assignedDriver'])
            ->when($request->filled('business_id'), fn($q) => $q->where('business_id', $request->business_id))
            ->when($request->filled('platform'),    fn($q) => $q->where('platform', $request->platform))
            ->when($request->filled('status'),      fn($q) => $q->where('status', $request->status))
            ->when($request->filled('date_from'),   fn($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->filled('date_to'),     fn($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->latest()
            ->paginate((int)$request->input('per_page', 25));

        return response()->json($q);
    }

    /**
     * GET /api/delivery/platform-orders/{platformOrder}
     */
    public function show(PlatformOrder $platformOrder): JsonResponse
    {
        return response()->json($platformOrder->load(['business', 'order.items', 'order.assignedDriver']));
    }

    /**
     * GET /api/delivery/platform-orders/summary?business_id=X
     * Dashboard summary: counts by platform and status.
     */
    public function summary(Request $request): JsonResponse
    {
        $businessId = $request->input('business_id');

        $q = PlatformOrder::query()
            ->when($businessId, fn($q) => $q->where('business_id', $businessId));

        $byPlatform = (clone $q)->selectRaw('platform, COUNT(*) as total, SUM(payout) as total_payout')
            ->groupBy('platform')
            ->get();

        $byStatus = (clone $q)->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->get();

        $today = (clone $q)
            ->whereDate('created_at', today())
            ->selectRaw('COUNT(*) as orders_today, SUM(payout) as revenue_today, SUM(platform_fee) as fees_today')
            ->first();

        $pending = (clone $q)->where('status', 'received')->count();

        return response()->json([
            'pending_orders' => $pending,
            'today'          => $today,
            'by_platform'    => $byPlatform,
            'by_status'      => $byStatus,
        ]);
    }

    /**
     * PATCH /api/delivery/platform-orders/{platformOrder}/status
     * Generic status update (admin).
     */
    public function updateStatus(Request $request, PlatformOrder $platformOrder): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|in:received,accepted,rejected,preparing,ready,picked_up,delivered,cancelled,failed',
            'reason' => 'nullable|string',
        ]);

        $platformOrder->update(['status' => $data['status']]);

        return response()->json($platformOrder->fresh());
    }
}
