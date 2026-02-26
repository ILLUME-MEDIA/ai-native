<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\PosCatalogMap;
use App\Models\PosConnection;
use App\Services\Pos\CloverService;
use App\Services\Pos\SquareService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PosCatalogController extends Controller
{
    // ── List catalog maps ─────────────────────────────────────────────────────

    public function maps(PosConnection $connection): JsonResponse
    {
        $maps = PosCatalogMap::where('business_id', $connection->business_id)
                             ->where('provider', $connection->provider)
                             ->with('menuItem:id,name,price,image,is_available')
                             ->orderBy('pos_item_name')
                             ->get();

        return response()->json($maps);
    }

    // ── Push local menu → POS ─────────────────────────────────────────────────

    public function push(PosConnection $connection): JsonResponse
    {
        abort_unless($connection->is_active, 422, 'POS connection is inactive.');

        $connection->ensureAccessToken();
        $token = $connection->decryptedAccessToken();

        $items = MenuItem::where('business_id', $connection->business_id)
                         ->with(['menuCategory', 'modifierGroups.options'])
                         ->where('is_available', true)
                         ->get();

        [$pushed, $errors] = match ($connection->provider) {
            'square' => $this->pushSquare($connection, $token, $items),
            'clover' => $this->pushClover($connection, $token, $items),
            default  => [0, ['Unsupported provider']],
        };

        return response()->json([
            'message' => "Pushed {$pushed} of {$items->count()} items to " . ucfirst($connection->provider) . '.',
            'pushed'  => $pushed,
            'errors'  => $errors,
        ]);
    }

    // ── Pull POS catalog → local ──────────────────────────────────────────────

    public function pull(PosConnection $connection): JsonResponse
    {
        abort_unless($connection->is_active, 422, 'POS connection is inactive.');

        $connection->ensureAccessToken();
        $token = $connection->decryptedAccessToken();

        [$imported, $errors] = match ($connection->provider) {
            'square' => $this->pullSquare($connection, $token),
            'clover' => $this->pullClover($connection, $token),
            default  => [0, ['Unsupported provider']],
        };

        return response()->json([
            'message'  => "Imported/updated {$imported} items from " . ucfirst($connection->provider) . '.',
            'imported' => $imported,
            'errors'   => $errors,
        ]);
    }

    // ── Unlink a map entry ────────────────────────────────────────────────────

    public function unlink(PosConnection $connection, PosCatalogMap $map): JsonResponse
    {
        abort_unless($map->business_id === $connection->business_id, 403);
        $map->delete();

        return response()->json(['message' => 'Catalog map unlinked.']);
    }

    // ── Square push ───────────────────────────────────────────────────────────

    private function pushSquare(PosConnection $conn, string $token, $items): array
    {
        $square  = app(SquareService::class);
        $pushed  = 0;
        $errors  = [];

        foreach ($items as $item) {
            try {
                $map     = PosCatalogMap::where('business_id', $conn->business_id)
                                        ->where('provider', 'square')
                                        ->where('menu_item_id', $item->id)
                                        ->first();

                $itemId  = $map?->pos_item_id   ?? '#item_' . $item->id;
                $varId   = $map?->pos_variant_id ?? '#var_'  . $item->id;

                $obj = [
                    'type' => 'ITEM',
                    'id'   => $itemId,
                    'item_data' => [
                        'name'        => $item->name,
                        'description' => $item->description ?? '',
                        'variations'  => [[
                            'type' => 'ITEM_VARIATION',
                            'id'   => $varId,
                            'item_variation_data' => [
                                'name'         => 'Regular',
                                'pricing_type' => 'FIXED_PRICING',
                                'price_money'  => [
                                    'amount'   => (int) round($item->price * 100),
                                    'currency' => 'USD',
                                ],
                            ],
                        ]],
                    ],
                ];

                // Add category name
                if ($item->menuCategory) {
                    $obj['item_data']['category'] = ['name' => $item->menuCategory->name];
                }

                $result  = $square->upsertCatalogObjects($token, [$obj]);
                $idMaps  = $result['id_mappings'] ?? [];

                $newItemId = $itemId;
                $newVarId  = $varId;

                foreach ($idMaps as $m) {
                    if ($m['client_object_id'] === $itemId) $newItemId = $m['object_id'];
                    if ($m['client_object_id'] === $varId)  $newVarId  = $m['object_id'];
                }

                PosCatalogMap::updateOrCreate(
                    ['business_id' => $conn->business_id, 'provider' => 'square', 'menu_item_id' => $item->id],
                    [
                        'pos_item_id'    => $newItemId,
                        'pos_variant_id' => $newVarId,
                        'pos_item_name'  => $item->name,
                        'pos_item_price' => $item->price,
                        'synced_at'      => now(),
                    ]
                );

                $pushed++;
            } catch (\Throwable $e) {
                $errors[] = "#{$item->id} {$item->name}: " . $e->getMessage();
            }
        }

        return [$pushed, $errors];
    }

    // ── Square pull ───────────────────────────────────────────────────────────

    private function pullSquare(PosConnection $conn, string $token): array
    {
        $square   = app(SquareService::class);
        $objects  = $square->listCatalogItems($token);
        $imported = 0;
        $errors   = [];

        foreach ($objects as $obj) {
            if (($obj['type'] ?? '') !== 'ITEM') continue;

            try {
                $itemData  = $obj['item_data'];
                $firstVar  = $itemData['variations'][0]['item_variation_data'] ?? null;
                $price     = $firstVar ? (($firstVar['price_money']['amount'] ?? 0) / 100) : 0;
                $varId     = $itemData['variations'][0]['id'] ?? null;

                $map = PosCatalogMap::where('business_id', $conn->business_id)
                                    ->where('provider', 'square')
                                    ->where('pos_item_id', $obj['id'])
                                    ->first();

                if ($map?->menu_item_id) {
                    MenuItem::where('id', $map->menu_item_id)->update([
                        'name'  => $itemData['name'],
                        'price' => $price,
                    ]);
                } else {
                    $menuItem = MenuItem::create([
                        'business_id'  => $conn->business_id,
                        'name'         => $itemData['name'],
                        'description'  => $itemData['description'] ?? null,
                        'price'        => $price,
                        'is_available' => true,
                    ]);

                    PosCatalogMap::updateOrCreate(
                        ['business_id' => $conn->business_id, 'provider' => 'square', 'pos_item_id' => $obj['id']],
                        [
                            'menu_item_id'   => $menuItem->id,
                            'pos_variant_id' => $varId,
                            'pos_item_name'  => $itemData['name'],
                            'pos_item_price' => $price,
                            'synced_at'      => now(),
                        ]
                    );
                }

                $imported++;
            } catch (\Throwable $e) {
                $errors[] = "Square obj {$obj['id']}: " . $e->getMessage();
            }
        }

        return [$imported, $errors];
    }

    // ── Clover push ───────────────────────────────────────────────────────────

    private function pushClover(PosConnection $conn, string $token, $items): array
    {
        $clover  = app(CloverService::class);
        $mid     = $conn->merchant_id;
        $pushed  = 0;
        $errors  = [];

        foreach ($items as $item) {
            try {
                $map = PosCatalogMap::where('business_id', $conn->business_id)
                                    ->where('provider', 'clover')
                                    ->where('menu_item_id', $item->id)
                                    ->first();

                $payload = [
                    'name'      => $item->name,
                    'price'     => (int) round($item->price * 100),
                    'available' => $item->is_available,
                    'hidden'    => false,
                ];

                $result = $map?->pos_item_id
                    ? $clover->updateItem($token, $mid, $map->pos_item_id, $payload)
                    : $clover->createItem($token, $mid, $payload);

                PosCatalogMap::updateOrCreate(
                    ['business_id' => $conn->business_id, 'provider' => 'clover', 'menu_item_id' => $item->id],
                    [
                        'pos_item_id'   => $result['id'],
                        'pos_item_name' => $item->name,
                        'pos_item_price'=> $item->price,
                        'synced_at'     => now(),
                    ]
                );

                $pushed++;
            } catch (\Throwable $e) {
                $errors[] = "#{$item->id} {$item->name}: " . $e->getMessage();
            }
        }

        return [$pushed, $errors];
    }

    // ── Clover pull ───────────────────────────────────────────────────────────

    private function pullClover(PosConnection $conn, string $token): array
    {
        $clover   = app(CloverService::class);
        $items    = $clover->getItems($token, $conn->merchant_id);
        $imported = 0;
        $errors   = [];

        foreach ($items as $ci) {
            try {
                $price = ($ci['price'] ?? 0) / 100;

                $map = PosCatalogMap::where('business_id', $conn->business_id)
                                    ->where('provider', 'clover')
                                    ->where('pos_item_id', $ci['id'])
                                    ->first();

                if ($map?->menu_item_id) {
                    MenuItem::where('id', $map->menu_item_id)->update([
                        'name'  => $ci['name'],
                        'price' => $price,
                    ]);
                } else {
                    $menuItem = MenuItem::create([
                        'business_id'  => $conn->business_id,
                        'name'         => $ci['name'],
                        'price'        => $price,
                        'is_available' => $ci['available'] ?? true,
                    ]);

                    PosCatalogMap::updateOrCreate(
                        ['business_id' => $conn->business_id, 'provider' => 'clover', 'pos_item_id' => $ci['id']],
                        [
                            'menu_item_id'   => $menuItem->id,
                            'pos_item_name'  => $ci['name'],
                            'pos_item_price' => $price,
                            'synced_at'      => now(),
                        ]
                    );
                }

                $imported++;
            } catch (\Throwable $e) {
                $errors[] = "Clover item {$ci['id']}: " . $e->getMessage();
            }
        }

        return [$imported, $errors];
    }
}
