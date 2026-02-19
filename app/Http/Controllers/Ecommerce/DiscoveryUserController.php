<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\DiscoveryUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiscoveryUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = DiscoveryUser::with('location');

        if ($request->filled('search')) {
            $s = $request->search;
            $q->where(function ($q) use ($s) {
                $q->where('name', 'like', "%$s%")
                  ->orWhere('email', 'like', "%$s%")
                  ->orWhere('ip_address', 'like', "%$s%")
                  ->orWhereHas('location', fn($lq) =>
                      $lq->where('city', 'like', "%$s%")
                         ->orWhere('country', 'like', "%$s%")
                  );
            });
        }

        if ($request->filled('device_type')) {
            $q->where('device_type', $request->device_type);
        }

        if ($request->filled('browser')) {
            $q->where('browser', $request->browser);
        }

        if ($request->filled('country_code')) {
            $q->whereHas('location', fn($lq) =>
                $lq->where('country_code', $request->country_code)
            );
        }

        return response()->json(
            $q->orderByDesc('last_seen_at')->orderByDesc('id')->paginate(25)
        );
    }

    public function show(DiscoveryUser $discoveryUser): JsonResponse
    {
        return response()->json($discoveryUser->load('location'));
    }

    public function update(Request $request, DiscoveryUser $discoveryUser): JsonResponse
    {
        $discoveryUser->update($request->only(['name', 'email', 'phone', 'photo', 'audio', 'bio']));
        return response()->json($discoveryUser->load('location'));
    }

    public function destroy(DiscoveryUser $discoveryUser): JsonResponse
    {
        $discoveryUser->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
