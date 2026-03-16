<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\Cuisine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CuisineController extends Controller
{
    /**
     * List cuisines.
     * - ?admin=1  → all cuisines (incl. inactive) + muzzs_count + paginated
     * - default   → active only, flat array (used by public storefront / sellers form)
     */
    public function index(Request $request): JsonResponse
    {
        if ($request->boolean('admin')) {
            $q = Cuisine::withCount('muzzs')
                ->orderBy('sort_order')
                ->orderBy('name');

            if ($request->filled('search')) {
                $q->where('name', 'like', '%' . $request->search . '%');
            }

            return response()->json($q->paginate($request->input('per_page', 15)));
        }

        $cuisines = Cuisine::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'icon', 'hover_icon']);

        return response()->json($cuisines);
    }

    /** PUT /api/ecommerce/cuisines/activate-all — set all cuisines is_active = true */
    public function activateAll(): JsonResponse
    {
        $count = Cuisine::where('is_active', false)->count();
        Cuisine::query()->update(['is_active' => true]);
        return response()->json(['message' => "All cuisines activated. ({$count} updated)"]);
    }

    /** POST /api/ecommerce/cuisines/dedup — merge duplicate cuisine entries (same name, case-insensitive) */
    public function dedup(): JsonResponse
    {
        $groups = \DB::table('cuisines')
            ->selectRaw('LOWER(name) as norm_name, MIN(id) as keep_id, COUNT(*) as cnt')
            ->groupByRaw('LOWER(name)')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        $merged = 0;

        foreach ($groups as $group) {
            $keepId = $group->keep_id;
            $dupes  = Cuisine::whereRaw('LOWER(name) = ?', [$group->norm_name])
                ->where('id', '!=', $keepId)
                ->pluck('id')
                ->toArray();

            foreach ($dupes as $dupeId) {
                $muzzhubIds = \DB::table('muzzhub_cuisine')
                    ->where('cuisine_id', $dupeId)
                    ->pluck('muzzhub_id');

                foreach ($muzzhubIds as $mid) {
                    \DB::table('muzzhub_cuisine')->insertOrIgnore([
                        'muzzhub_id' => $mid,
                        'cuisine_id' => $keepId,
                    ]);
                }

                \DB::table('muzzhub_cuisine')->where('cuisine_id', $dupeId)->delete();
                Cuisine::where('id', $dupeId)->delete();
                $merged++;
            }
        }

        return response()->json(['message' => "Dedup complete. Removed {$merged} duplicate(s).", 'removed' => $merged]);
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
