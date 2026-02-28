<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\MenuItem;
use App\Models\MenuItemModifierOption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class CartController extends Controller
{
    /**
     * Resolve the session identifier for this request.
     *
     * Priority:
     *  1. OTP Bearer token (Authorization: Bearer <encrypted-otp-token>)
     *     → decrypts to { type:'otp_auth', table, id, exp }
     *     → returns "otp_{table}_{id}"  e.g. "otp_users_5"
     *     → same cart on every device as long as they use the same token
     *  2. X-Session-Id header (UUID) — anonymous / guest
     *  3. Laravel cookie session ID (browser fallback)
     */
    protected function sessionId(Request $request): string
    {
        $bearer = $this->extractBearer($request);

        if ($bearer) {
            try {
                $payload = decrypt($bearer);

                if (
                    isset($payload['type'], $payload['id'], $payload['exp']) &&
                    $payload['type'] === 'otp_auth' &&
                    ! Carbon::createFromTimestamp($payload['exp'])->isPast()
                ) {
                    $table = $payload['table'] ?? 'users';
                    return "otp_{$table}_{$payload['id']}";
                }
            } catch (\Throwable) {
                // Invalid/tampered token — fall through to X-Session-Id
            }
        }

        return $request->header('X-Session-Id')
            ?? (session()->isStarted() ? session()->getId() : Str::uuid());
    }

    /**
     * Extract the raw Bearer token string from Authorization header, or null.
     */
    private function extractBearer(Request $request): ?string
    {
        $auth = $request->header('Authorization', '');
        return str_starts_with($auth, 'Bearer ')
            ? substr($auth, 7)
            : null;
    }

    public function index(Request $request): JsonResponse
    {
        $items = CartItem::where('session_id', $this->sessionId($request))
            ->with(['menuItem', 'business'])
            ->get();

        $subtotal = $items->sum(function ($i) {
            $base   = $i->menuItem->price ?? 0;
            $modAdj = collect($i->modifiers ?? [])->sum('price_adjustment');
            return ($base + $modAdj) * $i->quantity;
        });

        return response()->json(['items' => $items, 'subtotal' => round($subtotal, 2), 'count' => $items->count()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'menu_item_id' => 'required|exists:menu_items,id',
            'quantity'     => 'integer|min:1|max:99',
            'notes'        => 'nullable|string|max:300',
            'modifiers'    => 'nullable|array',
            'modifiers.*'  => 'integer|exists:menu_item_modifier_options,id',
        ]);

        $menuItem = MenuItem::findOrFail($data['menu_item_id']);
        $sid      = $this->sessionId($request);

        $cart = CartItem::updateOrCreate(
            ['session_id' => $sid, 'menu_item_id' => $menuItem->id],
            [
                'business_id' => $menuItem->business_id,
                'quantity'    => $data['quantity'] ?? 1,
                'notes'       => $data['notes'] ?? null,
                'modifiers'   => $this->buildModifierSnapshot($data['modifiers'] ?? []),
            ]
        );

        return response()->json($cart->load(['menuItem', 'business']), 201);
    }

    public function update(Request $request, CartItem $cartItem): JsonResponse
    {
        abort_if($cartItem->session_id !== $this->sessionId($request), 403, 'Not your cart item.');

        $data = $request->validate([
            'quantity'    => 'sometimes|integer|min:1|max:99',
            'notes'       => 'nullable|string|max:300',
            'modifiers'   => 'nullable|array',
            'modifiers.*' => 'integer|exists:menu_item_modifier_options,id',
        ]);

        if (array_key_exists('modifiers', $data)) {
            $data['modifiers'] = $this->buildModifierSnapshot($data['modifiers'] ?? []);
        }

        $cartItem->update($data);
        return response()->json($cartItem->load(['menuItem', 'business']));
    }

    /**
     * Resolve selected modifier option IDs into a snapshot array.
     * [{group_id, group_name, option_id, option_name, price_adjustment}]
     */
    private function buildModifierSnapshot(array $optionIds): ?array
    {
        if (empty($optionIds)) {
            return null;
        }

        return MenuItemModifierOption::with('modifierGroup')
            ->whereIn('id', $optionIds)
            ->where('is_active', true)
            ->get()
            ->map(fn ($o) => [
                'group_id'         => $o->modifierGroup->id,
                'group_name'       => $o->modifierGroup->name,
                'option_id'        => $o->id,
                'option_name'      => $o->name,
                'price_adjustment' => $o->price_adjustment,
            ])
            ->values()
            ->all();
    }

    public function destroy(Request $request, CartItem $cartItem): JsonResponse
    {
        abort_if($cartItem->session_id !== $this->sessionId($request), 403, 'Not your cart item.');

        $cartItem->delete();
        return response()->json(['message' => 'Removed from cart.']);
    }

    public function clear(Request $request): JsonResponse
    {
        CartItem::where('session_id', $this->sessionId($request))->delete();
        return response()->json(['message' => 'Cart cleared.']);
    }
}
