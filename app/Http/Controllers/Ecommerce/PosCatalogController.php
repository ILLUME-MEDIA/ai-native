<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\PosCatalogMap;
use App\Models\PosConnection;
use App\Services\Pos\CloverService;
use App\Services\Pos\DeliverectService;
use App\Services\Pos\PosLavuService;
use App\Services\Pos\SpotOnService;
use App\Services\Pos\SquareService;
use App\Services\Pos\ToastService;
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
            'square'     => $this->pushSquare($connection, $token, $items),
            'clover'     => $this->pushClover($connection, $token, $items),
            'toast'      => $this->pushToast($connection, $token, $items),
            'spoton'     => $this->pushSpotOn($connection, $token, $items),
            'poslavu'    => $this->pushPosLavu($connection, $token, $items),
            'deliverect' => $this->pushDeliverect($connection, $token, $items),
            default      => [0, ['Unsupported provider']],
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
            'square'     => $this->pullSquare($connection, $token),
            'clover'     => $this->pullClover($connection, $token),
            'toast'      => $this->pullToast($connection, $token),
            'spoton'     => $this->pullSpotOn($connection, $token),
            'poslavu'    => $this->pullPosLavu($connection, $token),
            'deliverect' => $this->pullDeliverect($connection, $token),
            default      => [0, ['Unsupported provider']],
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

    // ══════════════════════════════════════════════════════════════════════════
    // SQUARE
    // ══════════════════════════════════════════════════════════════════════════

    private function pushSquare(PosConnection $conn, string $token, $items): array
    {
        $square  = app(SquareService::class);
        $pushed  = 0;
        $errors  = [];

        foreach ($items as $item) {
            try {
                $map   = PosCatalogMap::where('business_id', $conn->business_id)
                                      ->where('provider', 'square')
                                      ->where('menu_item_id', $item->id)
                                      ->first();

                $itemId = $map?->pos_item_id   ?? '#item_' . $item->id;
                $varId  = $map?->pos_variant_id ?? '#var_'  . $item->id;

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

                if ($item->menuCategory) {
                    $obj['item_data']['category'] = ['name' => $item->menuCategory->name];
                }

                $result = $square->upsertCatalogObjects($token, [$obj]);
                $idMaps = $result['id_mappings'] ?? [];

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

    private function pullSquare(PosConnection $conn, string $token): array
    {
        $square   = app(SquareService::class);
        $objects  = $square->listCatalogItems($token);
        $imported = 0;
        $errors   = [];

        foreach ($objects as $obj) {
            if (($obj['type'] ?? '') !== 'ITEM') continue;

            try {
                $itemData = $obj['item_data'];
                $firstVar = $itemData['variations'][0]['item_variation_data'] ?? null;
                $price    = $firstVar ? (($firstVar['price_money']['amount'] ?? 0) / 100) : 0;
                $varId    = $itemData['variations'][0]['id'] ?? null;

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

    // ══════════════════════════════════════════════════════════════════════════
    // CLOVER
    // ══════════════════════════════════════════════════════════════════════════

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
                        'pos_item_id'    => $result['id'],
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

    // ══════════════════════════════════════════════════════════════════════════
    // TOAST
    // ══════════════════════════════════════════════════════════════════════════

    private function pushToast(PosConnection $conn, string $token, $items): array
    {
        $toast  = app(ToastService::class);
        $guid   = $conn->merchant_id;
        $pushed = 0;
        $errors = [];

        foreach ($items as $item) {
            try {
                $map = PosCatalogMap::where('business_id', $conn->business_id)
                                    ->where('provider', 'toast')
                                    ->where('menu_item_id', $item->id)
                                    ->first();

                // Toast uses GUID for items; generate a stable one if not mapped yet
                $itemGuid = $map?->pos_item_id ?? (string) Str::uuid();

                $payload = [
                    'guid'        => $itemGuid,
                    'name'        => $item->name,
                    'description' => $item->description ?? '',
                    'price'       => (int) round($item->price * 100), // in cents
                    'visibility'  => $item->is_available ? 'POS_AND_CONSUMER_FACING' : 'NONE',
                ];

                $result = $toast->upsertMenuItem($token, $guid, $payload);

                PosCatalogMap::updateOrCreate(
                    ['business_id' => $conn->business_id, 'provider' => 'toast', 'menu_item_id' => $item->id],
                    [
                        'pos_item_id'   => $result['guid'] ?? $itemGuid,
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

    private function pullToast(PosConnection $conn, string $token): array
    {
        $toast    = app(ToastService::class);
        $guid     = $conn->merchant_id;
        $imported = 0;
        $errors   = [];

        try {
            $menus = $toast->getMenuItems($token, $guid);
        } catch (\Throwable $e) {
            return [0, ['Toast getMenuItems failed: ' . $e->getMessage()]];
        }

        // Toast returns flat array or grouped — normalise
        $items = isset($menus[0]['guid']) ? $menus : array_merge(...array_map(fn($m) => $m['menuItems'] ?? [], $menus));

        foreach ($items as $ti) {
            try {
                $price    = ($ti['price'] ?? 0) / 100;
                $tiGuid   = $ti['guid'] ?? null;
                if (!$tiGuid) continue;

                $map = PosCatalogMap::where('business_id', $conn->business_id)
                                    ->where('provider', 'toast')
                                    ->where('pos_item_id', $tiGuid)
                                    ->first();

                if ($map?->menu_item_id) {
                    MenuItem::where('id', $map->menu_item_id)->update([
                        'name'  => $ti['name'],
                        'price' => $price,
                    ]);
                } else {
                    $menuItem = MenuItem::create([
                        'business_id'  => $conn->business_id,
                        'name'         => $ti['name'],
                        'description'  => $ti['description'] ?? null,
                        'price'        => $price,
                        'is_available' => ($ti['visibility'] ?? '') !== 'NONE',
                    ]);

                    PosCatalogMap::updateOrCreate(
                        ['business_id' => $conn->business_id, 'provider' => 'toast', 'pos_item_id' => $tiGuid],
                        [
                            'menu_item_id'   => $menuItem->id,
                            'pos_item_name'  => $ti['name'],
                            'pos_item_price' => $price,
                            'synced_at'      => now(),
                        ]
                    );
                }

                $imported++;
            } catch (\Throwable $e) {
                $errors[] = "Toast item {$ti['guid']}: " . $e->getMessage();
            }
        }

        return [$imported, $errors];
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SPOTON
    // ══════════════════════════════════════════════════════════════════════════

    private function pushSpotOn(PosConnection $conn, string $token, $items): array
    {
        $spoton  = app(SpotOnService::class);
        $mid     = $conn->merchant_id;
        $pushed  = 0;
        $errors  = [];

        foreach ($items as $item) {
            try {
                $map = PosCatalogMap::where('business_id', $conn->business_id)
                                    ->where('provider', 'spoton')
                                    ->where('menu_item_id', $item->id)
                                    ->first();

                $payload = [
                    'name'        => $item->name,
                    'description' => $item->description ?? '',
                    'price'       => (int) round($item->price * 100),
                    'available'   => $item->is_available,
                ];

                if ($item->menuCategory) {
                    $payload['category'] = $item->menuCategory->name;
                }

                $result = $map?->pos_item_id
                    ? $spoton->updateMenuItem($token, $mid, $map->pos_item_id, $payload)
                    : $spoton->createMenuItem($token, $mid, $payload);

                PosCatalogMap::updateOrCreate(
                    ['business_id' => $conn->business_id, 'provider' => 'spoton', 'menu_item_id' => $item->id],
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

    private function pullSpotOn(PosConnection $conn, string $token): array
    {
        $spoton   = app(SpotOnService::class);
        $items    = $spoton->getMenuItems($token, $conn->merchant_id);
        $imported = 0;
        $errors   = [];

        foreach ($items as $si) {
            try {
                $price = ($si['price'] ?? 0) / 100;
                $siId  = $si['id'] ?? null;
                if (!$siId) continue;

                $map = PosCatalogMap::where('business_id', $conn->business_id)
                                    ->where('provider', 'spoton')
                                    ->where('pos_item_id', $siId)
                                    ->first();

                if ($map?->menu_item_id) {
                    MenuItem::where('id', $map->menu_item_id)->update([
                        'name'  => $si['name'],
                        'price' => $price,
                    ]);
                } else {
                    $menuItem = MenuItem::create([
                        'business_id'  => $conn->business_id,
                        'name'         => $si['name'],
                        'description'  => $si['description'] ?? null,
                        'price'        => $price,
                        'is_available' => $si['available'] ?? true,
                    ]);

                    PosCatalogMap::updateOrCreate(
                        ['business_id' => $conn->business_id, 'provider' => 'spoton', 'pos_item_id' => $siId],
                        [
                            'menu_item_id'   => $menuItem->id,
                            'pos_item_name'  => $si['name'],
                            'pos_item_price' => $price,
                            'synced_at'      => now(),
                        ]
                    );
                }

                $imported++;
            } catch (\Throwable $e) {
                $errors[] = "SpotOn item {$si['id']}: " . $e->getMessage();
            }
        }

        return [$imported, $errors];
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POSLAVU
    // ══════════════════════════════════════════════════════════════════════════

    private function pushPosLavu(PosConnection $conn, string $token, $items): array
    {
        $lavu    = app(PosLavuService::class);
        $rid     = $conn->merchant_id;
        $pushed  = 0;
        $errors  = [];

        foreach ($items as $item) {
            try {
                $map = PosCatalogMap::where('business_id', $conn->business_id)
                                    ->where('provider', 'poslavu')
                                    ->where('menu_item_id', $item->id)
                                    ->first();

                $payload = [
                    'name'      => $item->name,
                    'price'     => round($item->price, 2),
                    'available' => $item->is_available,
                ];

                if ($item->menuCategory) {
                    $payload['category'] = $item->menuCategory->name;
                }

                $result = $map?->pos_item_id
                    ? $lavu->updateItem($token, $rid, $map->pos_item_id, $payload)
                    : $lavu->createItem($token, $rid, $payload);

                PosCatalogMap::updateOrCreate(
                    ['business_id' => $conn->business_id, 'provider' => 'poslavu', 'menu_item_id' => $item->id],
                    [
                        'pos_item_id'   => $result['id'] ?? $result['itemId'] ?? $map?->pos_item_id,
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

    private function pullPosLavu(PosConnection $conn, string $token): array
    {
        $lavu     = app(PosLavuService::class);
        $items    = $lavu->getItems($token, $conn->merchant_id);
        $imported = 0;
        $errors   = [];

        foreach ($items as $li) {
            try {
                $itemId = $li['id'] ?? $li['itemId'] ?? null;
                if (!$itemId) continue;

                $price = (float) ($li['price'] ?? 0);
                $name  = $li['name'] ?? $li['itemName'] ?? 'Item';

                $map = PosCatalogMap::where('business_id', $conn->business_id)
                                    ->where('provider', 'poslavu')
                                    ->where('pos_item_id', $itemId)
                                    ->first();

                if ($map?->menu_item_id) {
                    MenuItem::where('id', $map->menu_item_id)->update([
                        'name'  => $name,
                        'price' => $price,
                    ]);
                } else {
                    $menuItem = MenuItem::create([
                        'business_id'  => $conn->business_id,
                        'name'         => $name,
                        'price'        => $price,
                        'is_available' => $li['available'] ?? true,
                    ]);

                    PosCatalogMap::updateOrCreate(
                        ['business_id' => $conn->business_id, 'provider' => 'poslavu', 'pos_item_id' => $itemId],
                        [
                            'menu_item_id'   => $menuItem->id,
                            'pos_item_name'  => $name,
                            'pos_item_price' => $price,
                            'synced_at'      => now(),
                        ]
                    );
                }

                $imported++;
            } catch (\Throwable $e) {
                $errors[] = "POSLavu item {$li['id']}: " . $e->getMessage();
            }
        }

        return [$imported, $errors];
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DELIVERECT
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Deliverect push: builds a complete menu payload and pushes to the
     * active location (stored in location_id).
     */
    private function pushDeliverect(PosConnection $conn, string $token, $items): array
    {
        $deliverect = app(DeliverectService::class);
        $accountId  = $conn->merchant_id;
        $locationId = $conn->location_id ?? $accountId;

        // Build Deliverect menu structure
        $dlItems = [];
        foreach ($items as $item) {
            $dlItems[] = [
                'plu'         => (string) $item->id,
                'name'        => $item->name,
                'description' => $item->description ?? '',
                'price'       => (int) round($item->price * 100),
                'imageUrl'    => $item->image ?? null,
                'available'   => $item->is_available,
            ];
        }

        // Group by category
        $categories = $items->groupBy(fn($i) => $i->menuCategory?->name ?? 'Menu');
        $menus = [];
        foreach ($categories as $catName => $catItems) {
            $menus[] = [
                'name'  => $catName,
                'items' => $catItems->map(fn($i) => ['plu' => (string) $i->id])->values()->all(),
            ];
        }

        $menuPayload = [
            'name'        => 'Menu',
            'description' => 'Synced from local menu',
            'menus'       => $menus,
            'products'    => $dlItems,
        ];

        $pushed = 0;
        $errors = [];

        try {
            $deliverect->pushMenu($token, $accountId, $locationId, $menuPayload);

            // Update catalog maps for each item
            foreach ($items as $item) {
                PosCatalogMap::updateOrCreate(
                    ['business_id' => $conn->business_id, 'provider' => 'deliverect', 'menu_item_id' => $item->id],
                    [
                        'pos_item_id'   => (string) $item->id,   // PLU = local ID
                        'pos_item_name' => $item->name,
                        'pos_item_price'=> $item->price,
                        'synced_at'     => now(),
                    ]
                );
                $pushed++;
            }
        } catch (\Throwable $e) {
            $errors[] = 'Deliverect menu push failed: ' . $e->getMessage();
        }

        return [$pushed, $errors];
    }

    private function pullDeliverect(PosConnection $conn, string $token): array
    {
        $deliverect = app(DeliverectService::class);
        $accountId  = $conn->merchant_id;
        $locationId = $conn->location_id ?? $accountId;
        $imported   = 0;
        $errors     = [];

        try {
            $menu = $deliverect->getMenu($token, $accountId, $locationId);
        } catch (\Throwable $e) {
            return [0, ['Deliverect getMenu failed: ' . $e->getMessage()]];
        }

        $products = $menu['products'] ?? [];

        foreach ($products as $product) {
            try {
                $plu   = $product['plu'] ?? null;
                $name  = $product['name'] ?? '';
                $price = ($product['price'] ?? 0) / 100;

                if (!$plu) continue;

                $map = PosCatalogMap::where('business_id', $conn->business_id)
                                    ->where('provider', 'deliverect')
                                    ->where('pos_item_id', $plu)
                                    ->first();

                if ($map?->menu_item_id) {
                    MenuItem::where('id', $map->menu_item_id)->update([
                        'name'  => $name,
                        'price' => $price,
                    ]);
                } else {
                    $menuItem = MenuItem::create([
                        'business_id'  => $conn->business_id,
                        'name'         => $name,
                        'description'  => $product['description'] ?? null,
                        'price'        => $price,
                        'is_available' => $product['available'] ?? true,
                    ]);

                    PosCatalogMap::updateOrCreate(
                        ['business_id' => $conn->business_id, 'provider' => 'deliverect', 'pos_item_id' => $plu],
                        [
                            'menu_item_id'   => $menuItem->id,
                            'pos_item_name'  => $name,
                            'pos_item_price' => $price,
                            'synced_at'      => now(),
                        ]
                    );
                }

                $imported++;
            } catch (\Throwable $e) {
                $errors[] = "Deliverect product {$product['plu']}: " . $e->getMessage();
            }
        }

        return [$imported, $errors];
    }
}
