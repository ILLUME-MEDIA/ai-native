<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\MuzzhubCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MuzzhubCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = MuzzhubCategory::orderBy('name');

        if ($request->boolean('active_only')) {
            $q->where('is_active', true);
        }
        if ($request->filled('search')) {
            $q->where('name', 'like', '%' . $request->search . '%');
        }

        // If ?all=1, skip pagination (useful for dropdowns)
        if ($request->boolean('all')) {
            return response()->json($q->get());
        }

        return response()->json($q->paginate($request->input('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100|unique:muzzhub_categories,name',
            'slug'        => 'nullable|string|max:120|unique:muzzhub_categories,slug',
            'description' => 'nullable|string',
            'icon'        => 'nullable|string|max:80',
            'color'       => 'nullable|string|max:20',
            'is_active'   => 'boolean',
        ]);

        $data['slug'] = $this->resolveSlug($data['slug'] ?? null, $data['name']);

        $category = MuzzhubCategory::create($data);
        return response()->json($category, 201);
    }

    public function update(Request $request, MuzzhubCategory $muzzhubCategory): JsonResponse
    {
        $data = $request->validate([
            'name'        => "sometimes|string|max:100|unique:muzzhub_categories,name,{$muzzhubCategory->id}",
            'slug'        => "sometimes|string|max:120|unique:muzzhub_categories,slug,{$muzzhubCategory->id}",
            'description' => 'nullable|string',
            'icon'        => 'nullable|string|max:80',
            'color'       => 'nullable|string|max:20',
            'is_active'   => 'boolean',
        ]);

        if (isset($data['name']) && !isset($data['slug'])) {
            $data['slug'] = $this->resolveSlug(null, $data['name'], $muzzhubCategory->id);
        }

        $muzzhubCategory->update($data);
        return response()->json($muzzhubCategory);
    }

    public function destroy(MuzzhubCategory $muzzhubCategory): JsonResponse
    {
        $muzzhubCategory->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    private function resolveSlug(?string $provided, string $name, ?int $ignoreId = null): string
    {
        $base = $provided ? Str::slug($provided) : Str::slug($name);
        if (!$base) $base = 'category';
        $slug = $base;
        $i = 1;
        while (
            MuzzhubCategory::where('slug', $slug)
                ->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $base . '-' . $i++;
        }
        return $slug;
    }
}
