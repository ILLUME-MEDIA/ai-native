<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Muzzhub;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    // ── Menu Categories ───────────────────────────────────────────────────────

    public function categories(Business $business): JsonResponse
    {
        return response()->json(
            $business->menuCategories()->orderBy('sort_order')->orderBy('name')->withCount('menuItems')->get()
        );
    }

    public function storeCategory(Request $request, Business $business): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string|max:300',
            'sort_order'  => 'integer|min:0',
            'is_active'   => 'boolean',
        ]);
        $data['business_id'] = $business->id;
        $cat = MenuCategory::create($data);
        return response()->json($cat, 201);
    }

    public function updateCategory(Request $request, Business $business, MenuCategory $category): JsonResponse
    {
        abort_unless($category->business_id === $business->id, 403);
        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'description' => 'nullable|string|max:300',
            'sort_order'  => 'integer|min:0',
            'is_active'   => 'boolean',
        ]);
        $category->update($data);
        return response()->json($category);
    }

    public function destroyCategory(Business $business, MenuCategory $category): JsonResponse
    {
        abort_unless($category->business_id === $business->id, 403);
        $category->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    // ── Menu Items ────────────────────────────────────────────────────────────

    public function allItems(Request $request): JsonResponse
    {
        $q = MenuItem::with(['business', 'menuCategory', 'menuCategoryType'])->orderBy('name');
        if ($request->filled('business_id'))   $q->where('business_id', $request->business_id);
        if ($request->filled('category_id'))   $q->where('menu_category_id', $request->category_id);
        if ($request->filled('search'))        $q->where(function ($qb) use ($request) {
            $qb->where('name', 'like', '%' . $request->search . '%')
               ->orWhere('description', 'like', '%' . $request->search . '%');
        });
        if ($request->has('is_available'))      $q->where('is_available', $request->boolean('is_available'));
        return response()->json($q->paginate((int) $request->input('per_page', 30)));
    }

    public function items(Request $request, Business $business): JsonResponse
    {
        $q = $business->menuItems()->with(['menuCategory', 'menuCategoryType'])->orderBy('sort_order')->orderBy('name');
        if ($request->filled('category_id')) {
            $q->where('menu_category_id', $request->category_id);
        }
        return response()->json($q->get());
    }

    public function storeItem(Request $request, Business $business): JsonResponse
    {
        $data = $request->validate([
            'name'                   => 'required|string|max:200',
            'description'            => 'nullable|string',
            'price'                  => 'required|numeric|min:0',
            'image'                  => 'nullable|string',
            'menu_category_id'       => 'nullable|exists:menu_categories,id',
            'menu_category_type_id'  => 'nullable|exists:menu_category_types,id',
            'is_available'           => 'boolean',
            'sort_order'             => 'integer|min:0',
        ]);
        $data['business_id'] = $business->id;
        $item = MenuItem::create($data);
        return response()->json($item->load(['menuCategory', 'menuCategoryType']), 201);
    }

    public function updateItem(Request $request, Business $business, MenuItem $item): JsonResponse
    {
        abort_unless($item->business_id === $business->id, 403);
        $data = $request->validate([
            'business_id'             => 'sometimes|exists:businesses,id',
            'name'                    => 'sometimes|string|max:200',
            'description'             => 'nullable|string',
            'price'                   => 'sometimes|numeric|min:0',
            'image'                   => 'nullable|string',
            'menu_category_id'        => 'nullable|exists:menu_categories,id',
            'menu_category_type_id'   => 'nullable|exists:menu_category_types,id',
            'is_available'            => 'boolean',
            'sort_order'              => 'integer|min:0',
        ]);

        if (isset($data['business_id']) && (int) $data['business_id'] !== (int) $item->business_id) {
            $newBusinessId = (int) $data['business_id'];
            $data['business_id'] = $newBusinessId;
            if (!empty($data['menu_category_id'])) {
                $catBelongsToNewBiz = MenuCategory::where('id', $data['menu_category_id'])->where('business_id', $newBusinessId)->exists();
                if (!$catBelongsToNewBiz) {
                    $data['menu_category_id'] = null;
                }
            } else {
                $data['menu_category_id'] = null;
            }
        }

        $item->update($data);
        return response()->json($item->load(['menuCategory', 'menuCategoryType']));
    }

    public function showItem(Business $business, MenuItem $item): JsonResponse
    {
        abort_unless($item->business_id === $business->id, 404);
        return response()->json($item->load(['menuCategory', 'menuCategoryType', 'modifierGroups.options']));
    }

    public function destroyItem(Business $business, MenuItem $item): JsonResponse
    {
        abort_unless($item->business_id === $business->id, 403);
        $item->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    // ── Menu by Muzzhub (order flow: menu via linked Business) ─────────────────

    public function muzzhubCategories(Muzzhub $muzzhub): JsonResponse
    {
        $business = $muzzhub->business;
        if (!$business) {
            return response()->json(['message' => 'No business linked for this seller. Link a business to enable menu and orders.'], 404);
        }
        return response()->json(
            $business->menuCategories()->orderBy('sort_order')->orderBy('name')->withCount('menuItems')->get()
        );
    }

    public function muzzhubItems(Request $request, Muzzhub $muzzhub): JsonResponse
    {
        $business = $muzzhub->business;
        if (!$business) {
            return response()->json(['message' => 'No business linked for this seller.'], 404);
        }
        $q = $business->menuItems()->with('menuCategory')->orderBy('sort_order')->orderBy('name');
        if ($request->filled('category_id')) {
            $q->where('menu_category_id', $request->category_id);
        }
        return response()->json($q->get());
    }
}
