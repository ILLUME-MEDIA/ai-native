<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Models\AIEndpoint;
use App\Services\AI\AIProviderFactory;
use Illuminate\Http\Request;

class AIEndpointController extends Controller
{
    public function index()
    {
        return response()->json(
            AIEndpoint::query()
                ->select(['id', 'name', 'provider', 'default_model', 'is_active'])
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'provider' => 'required|string',
            'api_key' => 'required|string',
            'base_url' => 'nullable|string',
            'default_model' => 'nullable|string',
            'auto_model_selection' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $endpoint = AIEndpoint::create($validated);

        return response()->json($endpoint, 201);
    }

    public function show(AIEndpoint $endpoint)
    {
        return response()->json($endpoint);
    }

    public function update(Request $request, AIEndpoint $endpoint)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'provider' => 'sometimes|string',
            'api_key' => 'sometimes|string',
            'base_url' => 'nullable|string',
            'default_model' => 'nullable|string',
            'auto_model_selection' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $endpoint->update($validated);

        return response()->json($endpoint);
    }

    public function destroy(AIEndpoint $endpoint)
    {
        $endpoint->delete();
        return response()->noContent();
    }

    public function fetchModels(AIEndpoint $endpoint)
    {
        try {
            $adapter = AIProviderFactory::make($endpoint);
            $models = $adapter->listModels();

            // Update metadata with fetched models
            $metadata = $endpoint->metadata ?? [];
            $metadata['available_models'] = $models;
            $endpoint->update(['metadata' => $metadata]);

            return response()->json([
                'success' => true,
                'models' => $models
            ]);
        } catch (\Exception $e) {
            \Log::error("Fetch Models failed for endpoint {$endpoint->id}: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'models' => []
            ], 200); // Return 200 with error flag to prevent frontend crash
        }
    }
}
