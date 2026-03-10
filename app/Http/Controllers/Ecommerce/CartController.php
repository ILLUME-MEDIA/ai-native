<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\CartItem;
use App\Models\MenuItem;
use App\Models\MenuItemModifierOption;
use App\Services\FeeService;
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
            // Each modifier has its own quantity: price_adjustment × modifier.quantity
            $modAdj = collect($i->modifiers ?? [])->sum(
                fn ($m) => ($m['price_adjustment'] ?? 0) * ($m['quantity'] ?? 1)
            );
            return ($base + $modAdj) * $i->quantity;
        });
        $subtotal = round($subtotal, 2);

        // Resolve business from cart items (first item wins); load muzzhub for fee resolution
        $businessId = $items->first()?->business_id;
        $business   = $businessId ? Business::with('muzzhub')->find($businessId) : null;

        // Platform fee
        $feeService  = app(FeeService::class);
        $platformFee = $feeService->calculatePlatformFee($subtotal, $business);
        $feeConfig   = $feeService->getFeeConfig($business);

        // Tip options
        $tipOptions  = $feeService->getTipOptions($subtotal);

        return response()->json([
            'items'        => $items,
            'subtotal'     => $subtotal,
            'platform_fee' => $platformFee,
            'fee_config'   => $feeConfig,
            'tip_options'  => $tipOptions,
            'count'        => $items->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'menu_item_id'               => 'required|exists:menu_items,id',
            'quantity'                   => 'integer|min:1|max:99',
            'notes'                      => 'nullable|string|max:300',
            'modifiers'                  => 'nullable|array',
            'modifiers.*.option_id'      => 'required|integer|exists:menu_item_modifier_options,id',
            'modifiers.*.quantity'       => 'integer|min:1|max:99',
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
            'quantity'               => 'sometimes|integer|min:1|max:99',
            'notes'                  => 'nullable|string|max:300',
            'modifiers'              => 'nullable|array',
            'modifiers.*.option_id'  => 'required|integer|exists:menu_item_modifier_options,id',
            'modifiers.*.quantity'   => 'integer|min:1|max:99',
        ]);

        if (array_key_exists('modifiers', $data)) {
            $data['modifiers'] = $this->buildModifierSnapshot($data['modifiers'] ?? []);
        }

        $cartItem->update($data);
        return response()->json($cartItem->load(['menuItem', 'business']));
    }

    /**
     * Resolve modifier input into a stored snapshot.
     *
     * Input:  [{ option_id: int, quantity?: int }, ...]
     * Output: [{ group_id, group_name, option_id, option_name,
     *            price_adjustment, quantity, line_total }, ...]
     *
     * - Only is_active options are included (inactive silently excluded).
     * - quantity defaults to 1 if omitted.
     * - line_total = price_adjustment × quantity (convenience field for frontend).
     * - Prices are ALWAYS from DB — client input is never trusted for prices.
     */
    private function buildModifierSnapshot(array $modifiers): ?array
    {
        if (empty($modifiers)) {
            return null;
        }

        // Build a qty map: option_id => quantity
        $qtyMap = collect($modifiers)->keyBy('option_id')->map(
            fn ($m) => (int) ($m['quantity'] ?? 1)
        );

        return MenuItemModifierOption::with('modifierGroup')
            ->whereIn('id', $qtyMap->keys())
            ->where('is_active', true)
            ->get()
            ->map(function ($o) use ($qtyMap) {
                $qty = $qtyMap->get($o->id, 1);
                return [
                    'group_id'         => $o->modifierGroup->id,
                    'group_name'       => $o->modifierGroup->name,
                    'option_id'        => $o->id,
                    'option_name'      => $o->name,
                    'price_adjustment' => $o->price_adjustment,
                    'quantity'         => $qty,
                    'line_total'       => round($o->price_adjustment * $qty, 2),
                ];
            })
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
