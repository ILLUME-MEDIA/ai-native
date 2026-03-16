<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\Cuisine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CuisineController extends Controller
{
    /** Public: list all active cuisines */
    public function index(Request $request): JsonResponse
    {
        $cuisines = Cuisine::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'icon']);

        return response()->json($cuisines);
    }

    /** Admin: list all cuisines (including inactive) */
    public function adminIndex(Request $request): JsonResponse
    {
        $cuisines = Cuisine::orderBy('sort_order')
            ->orderBy('name')
            ->withCount('muzzs')
            ->get();

        return response()->json($cuisines);
    }

    /** Admin: create */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'       => 'required|string|max:100|unique:cuisines,name',
            'icon'       => 'nullable|string|max:100',
            'hover_icon' => 'nullable|string|max:100',
            'is_active'  => 'boolean',
            'sort_order' => 'integer',
        ]);

        $data['slug'] = Str::slug($data['name']);

        // Ensure slug is unique
        $base = $data['slug'];
        $i    = 1;
        while (Cuisine::where('slug', $data['slug'])->exists()) {
            $data['slug'] = $base . '-' . $i++;
        }

        $cuisine = Cuisine::create($data);

        return response()->json($cuisine, 201);
    }

    /** Admin: update */
    public function update(Request $request, Cuisine $cuisine): JsonResponse
    {
        $data = $request->validate([
            'name'       => 'sometimes|string|max:100|unique:cuisines,name,' . $cuisine->id,
            'icon'       => 'nullable|string|max:100',
            'hover_icon' => 'nullable|string|max:100',
            'is_active'  => 'boolean',
            'sort_order' => 'integer',
        ]);

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
            $base = $data['slug'];
            $i    = 1;
            while (Cuisine::where('slug', $data['slug'])->where('id', '!=', $cuisine->id)->exists()) {
                $data['slug'] = $base . '-' . $i++;
            }
        }

        $cuisine->update($data);

        return response()->json($cuisine);
    }

    /** Admin: delete */
    public function destroy(Cuisine $cuisine): JsonResponse
    {
        $cuisine->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
