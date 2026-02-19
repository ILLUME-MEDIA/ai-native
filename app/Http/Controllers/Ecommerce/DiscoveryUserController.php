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
        $q = DiscoveryUser::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $q->where(function ($q) use ($s) {
                $q->where('name', 'like', "%$s%")
                  ->orWhere('email', 'like', "%$s%")
                  ->orWhere('ip_address', 'like', "%$s%")
                  ->orWhere('city', 'like', "%$s%")
                  ->orWhere('country', 'like', "%$s%");
            });
        }

        if ($request->filled('country_code')) $q->where('country_code', $request->country_code);
        if ($request->filled('device_type'))  $q->where('device_type', $request->device_type);
        if ($request->filled('browser'))      $q->where('browser', $request->browser);

        return response()->json(
            $q->orderByDesc('last_seen_at')->orderByDesc('id')->paginate(25)
        );
    }

    public function show(DiscoveryUser $discoveryUser): JsonResponse
    {
        return response()->json($discoveryUser);
    }

    public function destroy(DiscoveryUser $discoveryUser): JsonResponse
    {
        $discoveryUser->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
