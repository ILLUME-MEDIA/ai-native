<?php

namespace Database\Seeders;

use App\Models\AppSecret;
use Illuminate\Database\Seeder;

/**
 * AppSecretsSeeder
 *
 * Creates ShipEngine key in app_secrets with empty value.
 * Re-running never overwrites an existing value.
 *
 * Run: php artisan db:seed --class=AppSecretsSeeder
 * Then: Admin → App Secrets → ShipEngine → fill in SHIPENGINE_API_KEY
 */
class AppSecretsSeeder extends Seeder
{
    public function run(): void
    {
        $secrets = [
            [
                'key'         => 'SHIPENGINE_API_KEY',
                'group'       => 'ShipEngine',
                'label'       => 'ShipEngine API Key',
                'description' => 'API key from app.shipengine.com → API Management. Used for shipping, labels, and tracking.',
                'is_active'   => false,
            ],
        ];

        foreach ($secrets as $secret) {
            $existing = AppSecret::where('key', $secret['key'])->first();

            if ($existing) {
                // Update metadata only — never overwrite the saved key value
                $existing->update([
                    'group'       => $secret['group'],
                    'label'       => $secret['label'],
                    'description' => $secret['description'],
                ]);
                $this->command->line("  Exists: {$secret['key']} (value preserved)");
            } else {
                AppSecret::create([
                    'key'         => $secret['key'],
                    'value'       => '',
                    'group'       => $secret['group'],
                    'label'       => $secret['label'],
                    'description' => $secret['description'],
                    'is_active'   => false,
                ]);
                $this->command->line("  Created: {$secret['key']}");
            }
        }

        $this->command->info('Done — go to Admin → App Secrets and set SHIPENGINE_API_KEY, then toggle is_active = true.');
    }
}
