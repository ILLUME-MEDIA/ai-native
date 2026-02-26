<?php

namespace Database\Seeders;

use App\Models\Business;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\MenuItemModifierGroup;
use App\Models\MenuItemModifierOption;
use Illuminate\Database\Seeder;

/**
 * Seeds 5 menu items + modifier groups/options for businesses 3090 and 167175.
 * Safe to run multiple times (firstOrCreate everywhere).
 */
class RestaurantSampleDataSeeder extends Seeder
{
    public function run(): void
    {
        $businessIds = [3090, 167175];

        // Each restaurant gets its own themed menu
        $menus = [
            3090   => $this->menuFor3090(),
            167175 => $this->menuFor167175(),
        ];

        foreach ($businessIds as $bizId) {
            $business = Business::find($bizId);
            if (! $business) {
                $this->command?->warn("Business #{$bizId} not found — skipping.");
                continue;
            }

            foreach ($menus[$bizId] as $catData) {
                $items = $catData['items'];
                unset($catData['items']);

                $category = MenuCategory::firstOrCreate(
                    ['business_id' => $business->id, 'name' => $catData['name']],
                    array_merge($catData, ['business_id' => $business->id, 'is_active' => true])
                );

                foreach ($items as $idx => $itemData) {
                    $modifierGroups = $itemData['modifiers'] ?? [];
                    unset($itemData['modifiers']);

                    $item = MenuItem::firstOrCreate(
                        ['business_id' => $business->id, 'name' => $itemData['name']],
                        array_merge($itemData, [
                            'business_id'      => $business->id,
                            'menu_category_id' => $category->id,
                            'is_available'     => true,
                            'sort_order'       => $idx + 1,
                        ])
                    );

                    // Modifier groups
                    foreach ($modifierGroups as $gIdx => $groupData) {
                        $options = $groupData['options'];
                        unset($groupData['options']);

                        $group = MenuItemModifierGroup::firstOrCreate(
                            ['menu_item_id' => $item->id, 'name' => $groupData['name']],
                            array_merge($groupData, [
                                'menu_item_id' => $item->id,
                                'sort_order'   => $gIdx + 1,
                                'is_active'    => true,
                            ])
                        );

                        foreach ($options as $oIdx => $optData) {
                            MenuItemModifierOption::firstOrCreate(
                                ['modifier_group_id' => $group->id, 'name' => $optData['name']],
                                array_merge($optData, [
                                    'modifier_group_id' => $group->id,
                                    'sort_order'        => $oIdx + 1,
                                    'is_active'         => true,
                                ])
                            );
                        }
                    }
                }
            }
        }
    }

    // ── Menu for business 3090 (Pakistani / Halal Restaurant) ─────────────────

    private function menuFor3090(): array
    {
        return [
            [
                'name'       => 'Main Course',
                'description'=> 'Signature halal mains',
                'sort_order' => 1,
                'items'      => [
                    [
                        'name'        => 'Chicken Biryani',
                        'description' => 'Fragrant basmati rice layered with spiced chicken, caramelized onions and saffron',
                        'price'       => 14.99,
                        'modifiers'   => [
                            [
                                'name'        => 'Portion Size',
                                'is_required' => true,
                                'min_select'  => 1,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => 'Half',    'price_adjustment' => -3.00, 'is_default' => false],
                                    ['name' => 'Regular', 'price_adjustment' =>  0.00, 'is_default' => true],
                                    ['name' => 'Large',   'price_adjustment' =>  4.00, 'is_default' => false],
                                ],
                            ],
                            [
                                'name'        => 'Spice Level',
                                'is_required' => false,
                                'min_select'  => 0,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => 'Mild',   'price_adjustment' => 0.00, 'is_default' => true],
                                    ['name' => 'Medium', 'price_adjustment' => 0.00, 'is_default' => false],
                                    ['name' => 'Hot',    'price_adjustment' => 0.00, 'is_default' => false],
                                ],
                            ],
                            [
                                'name'        => 'Extras',
                                'is_required' => false,
                                'min_select'  => 0,
                                'max_select'  => 3,
                                'options'     => [
                                    ['name' => 'Extra Raita',    'price_adjustment' => 1.00, 'is_default' => false],
                                    ['name' => 'Seekh Kebab',    'price_adjustment' => 3.50, 'is_default' => false],
                                    ['name' => 'Boiled Egg',     'price_adjustment' => 0.50, 'is_default' => false],
                                ],
                            ],
                        ],
                    ],
                    [
                        'name'        => 'Lamb Karahi',
                        'description' => 'Tender lamb cooked wok-style in tomatoes, ginger and whole spices',
                        'price'       => 18.99,
                        'modifiers'   => [
                            [
                                'name'        => 'Portion Size',
                                'is_required' => true,
                                'min_select'  => 1,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => 'Half Kg',  'price_adjustment' =>  0.00, 'is_default' => true],
                                    ['name' => 'Full Kg',  'price_adjustment' => 16.00, 'is_default' => false],
                                ],
                            ],
                            [
                                'name'        => 'Spice Level',
                                'is_required' => false,
                                'min_select'  => 0,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => 'Mild',   'price_adjustment' => 0.00, 'is_default' => false],
                                    ['name' => 'Medium', 'price_adjustment' => 0.00, 'is_default' => true],
                                    ['name' => 'Hot',    'price_adjustment' => 0.00, 'is_default' => false],
                                ],
                            ],
                            [
                                'name'        => 'Add Bread',
                                'is_required' => false,
                                'min_select'  => 0,
                                'max_select'  => 2,
                                'options'     => [
                                    ['name' => 'Naan',    'price_adjustment' => 1.50, 'is_default' => false],
                                    ['name' => 'Chapati', 'price_adjustment' => 1.00, 'is_default' => false],
                                    ['name' => 'Paratha', 'price_adjustment' => 2.00, 'is_default' => false],
                                ],
                            ],
                        ],
                    ],
                    [
                        'name'        => 'Butter Chicken',
                        'description' => 'Boneless chicken in a creamy, mildly spiced tomato-butter sauce, served with naan',
                        'price'       => 13.99,
                        'modifiers'   => [
                            [
                                'name'        => 'Sauce Richness',
                                'is_required' => false,
                                'min_select'  => 0,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => 'Light',  'price_adjustment' => 0.00, 'is_default' => false],
                                    ['name' => 'Regular','price_adjustment' => 0.00, 'is_default' => true],
                                    ['name' => 'Extra Creamy', 'price_adjustment' => 1.00, 'is_default' => false],
                                ],
                            ],
                            [
                                'name'        => 'Bread Choice',
                                'is_required' => true,
                                'min_select'  => 1,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => 'Naan',    'price_adjustment' => 0.00, 'is_default' => true],
                                    ['name' => 'Rice',    'price_adjustment' => 0.00, 'is_default' => false],
                                    ['name' => 'Paratha', 'price_adjustment' => 1.00, 'is_default' => false],
                                ],
                            ],
                        ],
                    ],
                    [
                        'name'        => 'Beef Seekh Kebab',
                        'description' => 'Minced beef mixed with fresh herbs and spices, grilled on skewer (2 pcs)',
                        'price'       => 12.99,
                        'modifiers'   => [
                            [
                                'name'        => 'Quantity',
                                'is_required' => true,
                                'min_select'  => 1,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => '2 pcs', 'price_adjustment' =>  0.00, 'is_default' => true],
                                    ['name' => '4 pcs', 'price_adjustment' =>  9.00, 'is_default' => false],
                                    ['name' => '6 pcs', 'price_adjustment' => 17.00, 'is_default' => false],
                                ],
                            ],
                            [
                                'name'        => 'Dipping Sauce',
                                'is_required' => false,
                                'min_select'  => 0,
                                'max_select'  => 2,
                                'options'     => [
                                    ['name' => 'Mint Chutney',    'price_adjustment' => 0.50, 'is_default' => false],
                                    ['name' => 'Tamarind Chutney','price_adjustment' => 0.50, 'is_default' => false],
                                    ['name' => 'Garlic Sauce',    'price_adjustment' => 0.50, 'is_default' => false],
                                ],
                            ],
                        ],
                    ],
                    [
                        'name'        => 'Vegetable Pulao',
                        'description' => 'Aromatic basmati rice cooked with seasonal vegetables and whole spices',
                        'price'       => 11.99,
                        'modifiers'   => [
                            [
                                'name'        => 'Add Protein',
                                'is_required' => false,
                                'min_select'  => 0,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => 'Add Chicken', 'price_adjustment' => 4.00, 'is_default' => false],
                                    ['name' => 'Add Paneer',  'price_adjustment' => 3.00, 'is_default' => false],
                                    ['name' => 'Add Egg',     'price_adjustment' => 1.50, 'is_default' => false],
                                ],
                            ],
                            [
                                'name'        => 'Side',
                                'is_required' => false,
                                'min_select'  => 0,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => 'Plain Yogurt', 'price_adjustment' => 1.00, 'is_default' => false],
                                    ['name' => 'Raita',        'price_adjustment' => 1.50, 'is_default' => false],
                                    ['name' => 'Salad',        'price_adjustment' => 2.00, 'is_default' => false],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    // ── Menu for business 167175 (American / Burger Restaurant) ──────────────

    private function menuFor167175(): array
    {
        return [
            [
                'name'       => 'Burgers',
                'description'=> 'Hand-crafted halal beef burgers',
                'sort_order' => 1,
                'items'      => [
                    [
                        'name'        => 'Classic Smash Burger',
                        'description' => 'Double smashed halal beef patty, American cheese, pickles, onion and house sauce',
                        'price'       => 11.99,
                        'modifiers'   => [
                            [
                                'name'        => 'Patty',
                                'is_required' => true,
                                'min_select'  => 1,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => 'Single',  'price_adjustment' => -2.00, 'is_default' => false],
                                    ['name' => 'Double',  'price_adjustment' =>  0.00, 'is_default' => true],
                                    ['name' => 'Triple',  'price_adjustment' =>  3.00, 'is_default' => false],
                                ],
                            ],
                            [
                                'name'        => 'Cheese',
                                'is_required' => false,
                                'min_select'  => 0,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => 'American Cheese', 'price_adjustment' => 0.00, 'is_default' => true],
                                    ['name' => 'Cheddar',         'price_adjustment' => 0.50, 'is_default' => false],
                                    ['name' => 'No Cheese',       'price_adjustment' => 0.00, 'is_default' => false],
                                ],
                            ],
                            [
                                'name'        => 'Extras',
                                'is_required' => false,
                                'min_select'  => 0,
                                'max_select'  => 4,
                                'options'     => [
                                    ['name' => 'Extra Patty',     'price_adjustment' => 3.00, 'is_default' => false],
                                    ['name' => 'Bacon (Halal)',   'price_adjustment' => 2.00, 'is_default' => false],
                                    ['name' => 'Avocado',         'price_adjustment' => 1.50, 'is_default' => false],
                                    ['name' => 'Fried Egg',       'price_adjustment' => 1.00, 'is_default' => false],
                                ],
                            ],
                        ],
                    ],
                    [
                        'name'        => 'BBQ Bacon Burger',
                        'description' => 'Halal beef patty, smoky BBQ sauce, crispy halal turkey bacon, onion rings',
                        'price'       => 13.99,
                        'modifiers'   => [
                            [
                                'name'        => 'Doneness',
                                'is_required' => true,
                                'min_select'  => 1,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => 'Medium',      'price_adjustment' => 0.00, 'is_default' => true],
                                    ['name' => 'Well Done',   'price_adjustment' => 0.00, 'is_default' => false],
                                ],
                            ],
                            [
                                'name'        => 'Sauce',
                                'is_required' => false,
                                'min_select'  => 0,
                                'max_select'  => 2,
                                'options'     => [
                                    ['name' => 'Extra BBQ',   'price_adjustment' => 0.50, 'is_default' => false],
                                    ['name' => 'Ranch',       'price_adjustment' => 0.50, 'is_default' => false],
                                    ['name' => 'Sriracha',    'price_adjustment' => 0.50, 'is_default' => false],
                                ],
                            ],
                        ],
                    ],
                    [
                        'name'        => 'Crispy Chicken Sandwich',
                        'description' => 'Crispy fried chicken fillet, coleslaw, pickles, spicy mayo on a brioche bun',
                        'price'       => 12.49,
                        'modifiers'   => [
                            [
                                'name'        => 'Heat Level',
                                'is_required' => true,
                                'min_select'  => 1,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => 'Classic',      'price_adjustment' => 0.00, 'is_default' => true],
                                    ['name' => 'Spicy',        'price_adjustment' => 0.00, 'is_default' => false],
                                    ['name' => 'Nashville Hot','price_adjustment' => 0.50, 'is_default' => false],
                                ],
                            ],
                            [
                                'name'        => 'Add-ons',
                                'is_required' => false,
                                'min_select'  => 0,
                                'max_select'  => 3,
                                'options'     => [
                                    ['name' => 'Extra Cheese', 'price_adjustment' => 1.00, 'is_default' => false],
                                    ['name' => 'Avocado',      'price_adjustment' => 1.50, 'is_default' => false],
                                    ['name' => 'Jalapeños',    'price_adjustment' => 0.50, 'is_default' => false],
                                ],
                            ],
                        ],
                    ],
                    [
                        'name'        => 'Loaded Fries',
                        'description' => 'Crispy fries loaded with cheese sauce, jalapeños and sour cream',
                        'price'       => 8.99,
                        'modifiers'   => [
                            [
                                'name'        => 'Size',
                                'is_required' => true,
                                'min_select'  => 1,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => 'Regular', 'price_adjustment' =>  0.00, 'is_default' => true],
                                    ['name' => 'Large',   'price_adjustment' =>  2.00, 'is_default' => false],
                                ],
                            ],
                            [
                                'name'        => 'Toppings',
                                'is_required' => false,
                                'min_select'  => 0,
                                'max_select'  => 4,
                                'options'     => [
                                    ['name' => 'Extra Cheese Sauce', 'price_adjustment' => 1.00, 'is_default' => false],
                                    ['name' => 'Chili',              'price_adjustment' => 1.50, 'is_default' => false],
                                    ['name' => 'Sour Cream',         'price_adjustment' => 0.50, 'is_default' => false],
                                    ['name' => 'Bacon Bits',         'price_adjustment' => 1.00, 'is_default' => false],
                                ],
                            ],
                        ],
                    ],
                    [
                        'name'        => 'Milkshake',
                        'description' => 'Thick creamy hand-spun milkshake made with real ice cream',
                        'price'       => 6.99,
                        'modifiers'   => [
                            [
                                'name'        => 'Flavor',
                                'is_required' => true,
                                'min_select'  => 1,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => 'Vanilla',       'price_adjustment' => 0.00, 'is_default' => true],
                                    ['name' => 'Chocolate',     'price_adjustment' => 0.00, 'is_default' => false],
                                    ['name' => 'Strawberry',    'price_adjustment' => 0.00, 'is_default' => false],
                                    ['name' => 'Oreo Cookie',   'price_adjustment' => 1.00, 'is_default' => false],
                                ],
                            ],
                            [
                                'name'        => 'Size',
                                'is_required' => true,
                                'min_select'  => 1,
                                'max_select'  => 1,
                                'options'     => [
                                    ['name' => 'Regular (16oz)', 'price_adjustment' =>  0.00, 'is_default' => true],
                                    ['name' => 'Large (24oz)',   'price_adjustment' =>  2.00, 'is_default' => false],
                                ],
                            ],
                            [
                                'name'        => 'Add-ons',
                                'is_required' => false,
                                'min_select'  => 0,
                                'max_select'  => 2,
                                'options'     => [
                                    ['name' => 'Whipped Cream', 'price_adjustment' => 0.50, 'is_default' => false],
                                    ['name' => 'Extra Scoop',   'price_adjustment' => 1.50, 'is_default' => false],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}
