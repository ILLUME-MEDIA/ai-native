<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Models\AiPlatform;
use Illuminate\Http\Request;

class AiPlatformController extends Controller
{
    public function index()
    {
        return response()->json(
            AiPlatform::query()
                ->select(['id', 'name', 'type', 'is_active'])
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'type' => 'required|in:streaming,watchlist',
            'base_url' => 'nullable|url',
            'api_token' => 'nullable|string',
            'target_section' => 'nullable|string',
            'settings' => 'nullable|array',
            'is_active' => 'boolean'
        ]);

        $platform = AiPlatform::create($validated);
        return response()->json($platform, 201);
    }

    public function show(AiPlatform $platform)
    {
        return response()->json($platform);
    }

    public function update(Request $request, AiPlatform $platform)
    {
        $validated = $request->validate([
            'name' => 'string',
            'type' => 'in:streaming,watchlist',
            'base_url' => 'nullable|url',
            'api_token' => 'nullable|string',
            'target_section' => 'nullable|string',
            'settings' => 'nullable|array',
            'is_active' => 'boolean'
        ]);

        $platform->update($validated);
        return response()->json($platform);
    }

    public function destroy(AiPlatform $platform)
    {
        $platform->delete();
        return response()->json(null, 204);
    }
}
