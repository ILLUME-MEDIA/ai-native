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
            ['name' => 'Kids Cuisine',     'description' => 'Kid-friendly items',           'sort_order' => 1],
            ['name' => 'Vegetarian',      'description' => 'Vegetarian options',           'sort_order' => 2],
            ['name' => 'Vegan',           'description' => 'Vegan options',                 'sort_order' => 3],
            ['name' => 'Halal',           'description' => 'Halal certified',              'sort_order' => 4],
            ['name' => 'Spicy',           'description' => 'Spicy / hot items',             'sort_order' => 5],
            ['name' => 'Gluten Free',     'description' => 'Gluten-free options',           'sort_order' => 6],
            ['name' => 'Chef Special',    'description' => 'Chef’s special / signature',    'sort_order' => 7],
        ];

        foreach ($types as $t) {
            MenuCategoryType::firstOrCreate(
                ['slug' => Str::slug($t['name'])],
                array_merge($t, ['is_active' => true])
            );
        }
    }
}
