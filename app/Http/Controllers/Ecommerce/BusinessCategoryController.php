<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\BusinessCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BusinessCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $cats = BusinessCategory::withCount('businesses')->orderBy('sort_order')->orderBy('name')->get();
        return response()->json($cats);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'type'        => 'required|in:restaurant,store,service',
            'icon'        => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500',
            'is_active'   => 'boolean',
            'sort_order'  => 'integer|min:0',
        ]);
        $data['slug'] = Str::slug($data['name']) . '-' . Str::random(5);
        $cat = BusinessCategory::create($data);
        return response()->json($cat, 201);
    }

    public function update(Request $request, BusinessCategory $category): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'type'        => 'sometimes|in:restaurant,store,service',
            'icon'        => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500',
            'is_active'   => 'boolean',
            'sort_order'  => 'integer|min:0',
        ]);
        $category->update($data);
        return response()->json($category);
    }

    public function destroy(BusinessCategory $category): JsonResponse
    {
        $category->delete();
        return response()->json(['message' => 'Deleted.']);
    }
}
