<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\MenuCategoryType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MenuCategoryTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = MenuCategoryType::orderBy('sort_order')->orderBy('name');
        if ($request->boolean('active_only')) {
            $q->where('is_active', true);
        }
        if ($request->filled('search')) {
            $q->where('name', 'like', '%' . $request->search . '%');
        }
        if ($request->boolean('all')) {
            return response()->json($q->get());
        }
        return response()->json($q->paginate($request->input('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'slug'        => 'nullable|string|max:120|unique:menu_category_types,slug',
            'description' => 'nullable|string|max:300',
            'sort_order'  => 'integer|min:0',
            'is_active'   => 'boolean',
        ]);
        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);
        $type = MenuCategoryType::create($data);
        return response()->json($type, 201);
    }

    public function update(Request $request, MenuCategoryType $menuCategoryType): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'slug'        => 'nullable|string|max:120|unique:menu_category_types,slug,' . $menuCategoryType->id,
            'description' => 'nullable|string|max:300',
            'sort_order'  => 'integer|min:0',
            'is_active'   => 'boolean',
        ]);
        if (isset($data['name']) && empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }
        $menuCategoryType->update($data);
        return response()->json($menuCategoryType);
    }

    public function destroy(MenuCategoryType $menuCategoryType): JsonResponse
    {
        $menuCategoryType->delete();
        return response()->json(['message' => 'Deleted.']);
    }
}
