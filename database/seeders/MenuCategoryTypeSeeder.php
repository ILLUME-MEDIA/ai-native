<?php

namespace Database\Seeders;

use App\Models\MenuCategoryType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MenuCategoryTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            // ── Menu sections ────────────────────────────────────────────────
            ['name' => 'Appetizers',   'description' => 'Starters and small plates',         'sort_order' => 1],
            ['name' => 'Entrees',      'description' => 'Main course dishes',                 'sort_order' => 2],
            ['name' => 'Soups',        'description' => 'Soups and broths',                   'sort_order' => 3],
            ['name' => 'Salads',       'description' => 'Fresh salads and greens',            'sort_order' => 4],
            ['name' => 'Sides',        'description' => 'Side dishes and accompaniments',     'sort_order' => 5],
            ['name' => 'Drinks',       'description' => 'Beverages and drinks',               'sort_order' => 6],
            ['name' => 'Pastas',       'description' => 'Pasta dishes',                       'sort_order' => 7],
            ['name' => 'Pizzas',       'description' => 'Pizza varieties',                    'sort_order' => 8],
            // ── Protein types ────────────────────────────────────────────────
            ['name' => 'Beef',         'description' => 'Beef dishes',                        'sort_order' => 9],
            ['name' => 'Chicken',      'description' => 'Chicken dishes',                     'sort_order' => 10],
            ['name' => 'Duck',         'description' => 'Duck dishes',                        'sort_order' => 11],
            ['name' => 'Seafood',      'description' => 'Fish and seafood',                   'sort_order' => 12],
            ['name' => 'Lamb',         'description' => 'Lamb dishes',                        'sort_order' => 13],
            ['name' => 'Goat',         'description' => 'Goat dishes',                        'sort_order' => 14],
            ['name' => 'Turkey',       'description' => 'Turkey dishes',                      'sort_order' => 15],
            ['name' => 'Deer',         'description' => 'Venison / deer dishes',              'sort_order' => 16],
            ['name' => 'Camel',        'description' => 'Camel meat dishes',                  'sort_order' => 17],
            ['name' => 'Pigeon',       'description' => 'Pigeon / squab dishes',              'sort_order' => 18],
            ['name' => 'Rabbit',       'description' => 'Rabbit dishes',                      'sort_order' => 19],
            // ── Dietary ──────────────────────────────────────────────────────
            ['name' => 'Vegan',        'description' => 'Vegan options',                      'sort_order' => 20],
            ['name' => 'Vegetarian',   'description' => 'Vegetarian options',                 'sort_order' => 21],
            ['name' => 'Burgers',      'description' => 'Burgers and sandwiches',             'sort_order' => 22],
            ['name' => 'Subs',         'description' => 'Submarine sandwiches',               'sort_order' => 23],
            ['name' => 'Wraps',        'description' => 'Wraps and rolls',                    'sort_order' => 24],
            // ── Legacy types (keep existing) ─────────────────────────────────
            ['name' => 'Kids Cuisine', 'description' => 'Kid-friendly items',                 'sort_order' => 25],
            ['name' => 'Halal',        'description' => 'Halal certified',                    'sort_order' => 26],
            ['name' => 'Spicy',        'description' => 'Spicy / hot items',                  'sort_order' => 27],
            ['name' => 'Gluten Free',  'description' => 'Gluten-free options',                'sort_order' => 28],
            ['name' => 'Chef Special', 'description' => 'Chef\'s special / signature',        'sort_order' => 29],
        ];

        foreach ($types as $t) {
            MenuCategoryType::firstOrCreate(
                ['slug' => Str::slug($t['name'])],
                array_merge($t, ['is_active' => true])
            );
        }
    }
}
