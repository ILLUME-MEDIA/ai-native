<?php

namespace Database\Seeders;

use App\Models\EcommerceSetting;
use Illuminate\Database\Seeder;

class EcommerceSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            [
                'key'         => 'platform_fee_type',
                'value'       => 'percentage',
                'group'       => 'fees',
                'label'       => 'Platform Fee Type',
                'description' => 'percentage = % of subtotal, fixed = flat amount per order',
            ],
            [
                'key'         => 'platform_fee_value',
                'value'       => '0',
                'group'       => 'fees',
                'label'       => 'Platform Fee Value',
                'description' => 'Percentage (e.g. 5 for 5%) or fixed dollar amount',
            ],
            [
                'key'         => 'tip_enabled',
                'value'       => 'true',
                'group'       => 'tips',
                'label'       => 'Tips Enabled',
                'description' => 'Show tip options at checkout',
            ],
            [
                'key'         => 'tip_suggested_percentages',
                'value'       => json_encode([10, 20, 30]),
                'group'       => 'tips',
                'label'       => 'Suggested Tip Percentages',
                'description' => 'Array of suggested percentage values shown to customer',
            ],
            [
                'key'         => 'tip_allow_custom',
                'value'       => 'true',
                'group'       => 'tips',
                'label'       => 'Allow Custom Tip',
                'description' => 'Let customer enter a custom tip amount or percentage',
            ],
        ];

        foreach ($defaults as $row) {
            EcommerceSetting::updateOrCreate(
                ['key' => $row['key']],
                $row
            );
        }
    }
}
