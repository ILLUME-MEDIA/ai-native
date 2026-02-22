<?php

namespace Database\Seeders;

use App\Models\Business;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use Illuminate\Database\Seeder;

class MenuSeeder extends Seeder
{
    /**
     * Sample menu with categories and items for a demo restaurant.
     */
    public function run(): void
    {
        $business = Business::firstOrCreate(
            ['slug' => 'sample-halal-restaurant'],
            [
                'name'        => 'Sample Halal Restaurant',
                'description' => 'Best halal food in town. Fresh ingredients, authentic recipes.',
                'cuisine'     => 'Halal, Pakistani, Indian',
                'address'     => '123 Main Street',
                'city'        => 'New York',
                'state'       => 'NY',
                'zip'         => '10001',
                'country'     => 'US',
                'phone'       => '+1-555-0100',
                'email'       => 'info@samplehalal.com',
                'website'     => 'https://samplehalal.com',
                'delivery'    => true,
                'featured'    => true,
                'is_active'   => true,
            ]
        );

        $categories = [
            [
                'name'        => 'Starters',
                'description' => 'Light bites and appetizers',
                'sort_order'  => 1,
                'items'       => [
                    ['name' => 'Chicken Spring Rolls', 'description' => 'Crispy rolls with spiced chicken', 'price' => 6.99],
                    ['name' => 'Samosas (4 pcs)', 'description' => 'Vegetable or chicken, with chutney', 'price' => 5.99],
                    ['name' => 'Pakora Platter', 'description' => 'Mixed vegetable fritters', 'price' => 7.99],
                    ['name' => 'Hummus with Pita', 'description' => 'Creamy chickpea dip', 'price' => 4.99],
                ],
            ],
            [
                'name'        => 'Main Course',
                'description' => 'Hearty halal mains',
                'sort_order'  => 2,
                'items'       => [
                    ['name' => 'Chicken Biryani', 'description' => 'Fragrant basmati rice with tender chicken', 'price' => 14.99],
                    ['name' => 'Lamb Karahi', 'description' => 'Traditional wok-style lamb curry', 'price' => 16.99],
                    ['name' => 'Beef Seekh Kebab', 'description' => 'Grilled minced beef kebabs (2 pcs)', 'price' => 12.99],
                    ['name' => 'Vegetable Pulao', 'description' => 'Rice with mixed vegetables', 'price' => 11.99],
                    ['name' => 'Butter Chicken', 'description' => 'Creamy tomato curry with naan', 'price' => 13.99],
                ],
            ],
            [
                'name'        => 'Drinks',
                'description' => 'Beverages and desserts',
                'sort_order'  => 3,
                'items'       => [
                    ['name' => 'Mango Lassi', 'description' => 'Sweet yogurt drink', 'price' => 3.99],
                    ['name' => 'Masala Chai', 'description' => 'Spiced tea', 'price' => 2.99],
                    ['name' => 'Fresh Lime Soda', 'description' => 'Chilled lime with soda', 'price' => 3.49],
                    ['name' => 'Gulab Jamun (2 pcs)', 'description' => 'Sweet milk dumplings in syrup', 'price' => 4.99],
                ],
            ],
        ];

        foreach ($categories as $catData) {
            $items = $catData['items'];
            unset($catData['items']);

            $cat = MenuCategory::firstOrCreate(
                [
                    'business_id' => $business->id,
                    'name'        => $catData['name'],
                ],
                array_merge($catData, [
                    'business_id' => $business->id,
                    'is_active'   => true,
                ])
            );

            foreach ($items as $idx => $item) {
                MenuItem::firstOrCreate(
                    [
                        'business_id' => $business->id,
                        'name'        => $item['name'],
                    ],
                    [
                        'business_id'      => $business->id,
                        'menu_category_id' => $cat->id,
                        'name'             => $item['name'],
                        'description'      => $item['description'],
                        'price'            => $item['price'],
                        'is_available'     => true,
                        'sort_order'       => $idx + 1,
                    ]
                );
            }
        }
    }
}
