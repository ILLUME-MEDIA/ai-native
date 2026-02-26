<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\MenuItem;
use App\Models\MenuItemModifierGroup;
use App\Models\MenuItemModifierOption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuItemModifierController extends Controller
{
    // ── Modifier Groups ───────────────────────────────────────────────────────

    public function storeGroup(Request $request, Business $business, MenuItem $item): JsonResponse
    {
        abort_unless($item->business_id === $business->id, 403);

        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string|max:300',
            'is_required' => 'boolean',
            'min_select'  => 'integer|min:0|max:20',
            'max_select'  => 'integer|min:0|max:20',
            'sort_order'  => 'integer|min:0',
            'is_active'   => 'boolean',
        ]);

        $data['menu_item_id'] = $item->id;
        $group = MenuItemModifierGroup::create($data);

        return response()->json($group->load('options'), 201);
    }

    public function updateGroup(Request $request, Business $business, MenuItem $item, MenuItemModifierGroup $group): JsonResponse
    {
        abort_unless($item->business_id === $business->id, 403);
        abort_unless($group->menu_item_id === $item->id, 404);

        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'description' => 'nullable|string|max:300',
            'is_required' => 'boolean',
            'min_select'  => 'integer|min:0|max:20',
            'max_select'  => 'integer|min:0|max:20',
            'sort_order'  => 'integer|min:0',
            'is_active'   => 'boolean',
        ]);

        $group->update($data);

        return response()->json($group->load('options'));
    }

    public function destroyGroup(Business $business, MenuItem $item, MenuItemModifierGroup $group): JsonResponse
    {
        abort_unless($item->business_id === $business->id, 403);
        abort_unless($group->menu_item_id === $item->id, 404);

        $group->delete();

        return response()->json(['message' => 'Modifier group deleted.']);
    }

    // ── Modifier Options ──────────────────────────────────────────────────────

    public function storeOption(Request $request, Business $business, MenuItem $item, MenuItemModifierGroup $group): JsonResponse
    {
        abort_unless($item->business_id === $business->id, 403);
        abort_unless($group->menu_item_id === $item->id, 404);

        $data = $request->validate([
            'name'             => 'required|string|max:100',
            'price_adjustment' => 'numeric',
            'is_default'       => 'boolean',
            'sort_order'       => 'integer|min:0',
            'is_active'        => 'boolean',
        ]);

        $data['modifier_group_id'] = $group->id;
        $option = MenuItemModifierOption::create($data);

        return response()->json($option, 201);
    }

    public function updateOption(Request $request, Business $business, MenuItem $item, MenuItemModifierGroup $group, MenuItemModifierOption $option): JsonResponse
    {
        abort_unless($item->business_id === $business->id, 403);
        abort_unless($group->menu_item_id === $item->id, 404);
        abort_unless($option->modifier_group_id === $group->id, 404);

        $data = $request->validate([
            'name'             => 'sometimes|string|max:100',
            'price_adjustment' => 'numeric',
            'is_default'       => 'boolean',
            'sort_order'       => 'integer|min:0',
            'is_active'        => 'boolean',
        ]);

        $option->update($data);

        return response()->json($option);
    }

    public function destroyOption(Business $business, MenuItem $item, MenuItemModifierGroup $group, MenuItemModifierOption $option): JsonResponse
    {
        abort_unless($item->business_id === $business->id, 403);
        abort_unless($group->menu_item_id === $item->id, 404);
        abort_unless($option->modifier_group_id === $group->id, 404);

        $option->delete();

        return response()->json(['message' => 'Option deleted.']);
    }
}
