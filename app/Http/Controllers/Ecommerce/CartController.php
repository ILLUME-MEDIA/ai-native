<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    protected function sessionId(Request $request): string
    {
        return $request->header('X-Session-Id')
            ?? (session()->isStarted() ? session()->getId() : \Illuminate\Support\Str::uuid());
    }

    public function index(Request $request): JsonResponse
    {
        $items = CartItem::where('session_id', $this->sessionId($request))
            ->with(['menuItem', 'business.category'])
            ->get();

        $subtotal = $items->sum(fn ($i) => ($i->menuItem->price ?? 0) * $i->quantity);

        return response()->json(['items' => $items, 'subtotal' => round($subtotal, 2), 'count' => $items->count()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'menu_item_id' => 'required|exists:menu_items,id',
            'quantity'     => 'integer|min:1|max:99',
            'notes'        => 'nullable|string|max:300',
        ]);

        $menuItem = MenuItem::findOrFail($data['menu_item_id']);
        $sid      = $this->sessionId($request);

        $cart = CartItem::updateOrCreate(
            ['session_id' => $sid, 'menu_item_id' => $menuItem->id],
            [
                'business_id' => $menuItem->business_id,
                'quantity'    => $data['quantity'] ?? 1,
                'notes'       => $data['notes'] ?? null,
            ]
        );

        return response()->json($cart->load(['menuItem', 'business']), 201);
    }

    public function update(Request $request, CartItem $cartItem): JsonResponse
    {
        $data = $request->validate([
            'quantity' => 'required|integer|min:1|max:99',
            'notes'    => 'nullable|string|max:300',
        ]);
        $cartItem->update($data);
        return response()->json($cartItem->load('menuItem'));
    }

    public function destroy(CartItem $cartItem): JsonResponse
    {
        $cartItem->delete();
        return response()->json(['message' => 'Removed from cart.']);
    }

    public function clear(Request $request): JsonResponse
    {
        CartItem::where('session_id', $this->sessionId($request))->delete();
        return response()->json(['message' => 'Cart cleared.']);
    }
}
