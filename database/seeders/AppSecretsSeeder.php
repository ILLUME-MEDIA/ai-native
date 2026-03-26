<?php

namespace Database\Seeders;

use App\Models\AppSecret;
use Illuminate\Database\Seeder;

/**
 * AppSecretsSeeder
 *
 * Seeds placeholder app_secrets rows for all delivery vendors + ShipEngine.
 * Re-running never overwrites an existing value — only updates metadata.
 *
 * Run: php artisan db:seed --class=AppSecretsSeeder
 * Then: Admin → App Secrets → fill in values → toggle is_active = true
 */
class AppSecretsSeeder extends Seeder
{
    public function run(): void
    {
        $secrets = [

            // ── ShipEngine ───────────────────────────────────────────────────
            [
                'key'         => 'SHIPENGINE_API_KEY',
                'group'       => 'ShipEngine',
                'label'       => 'ShipEngine API Key',
                'description' => 'API key from app.shipengine.com → API Management. Used for shipping labels and tracking.',
                'is_active'   => false,
            ],

            // ── DoorDash Drive Classic ────────────────────────────────────────
            // Used for standard restaurant/food delivery dispatch (Drive v1 Classic API).
            // Get credentials from: developer.doordash.com → Drive → API Keys
            [
                'key'         => 'DOORDASH_ENV',
                'group'       => 'DoorDash Drive Classic',
                'label'       => 'DoorDash Environment',
                'description' => 'Set to "sandbox" for testing or "production" for live deliveries.',
                'is_active'   => true,
            ],
            [
                'key'         => 'DOORDASH_SANDBOX_DEVELOPER_ID',
                'group'       => 'DoorDash Drive Classic',
                'label'       => 'Sandbox Developer ID',
                'description' => 'Developer ID (UUID) from DoorDash Developer Portal → Sandbox credentials.',
                'is_active'   => false,
            ],
            [
                'key'         => 'DOORDASH_SANDBOX_KEY_ID',
                'group'       => 'DoorDash Drive Classic',
                'label'       => 'Sandbox Key ID',
                'description' => 'Key ID (UUID) from DoorDash Developer Portal → Sandbox credentials.',
                'is_active'   => false,
            ],
            [
                'key'         => 'DOORDASH_SANDBOX_SIGNING_SECRET',
                'group'       => 'DoorDash Drive Classic',
                'label'       => 'Sandbox Signing Secret',
                'description' => 'Base64url-encoded signing secret from DoorDash Developer Portal → Sandbox credentials.',
                'is_active'   => false,
            ],
            [
                'key'         => 'DOORDASH_PROD_DEVELOPER_ID',
                'group'       => 'DoorDash Drive Classic',
                'label'       => 'Production Developer ID',
                'description' => 'Developer ID (UUID) from DoorDash Developer Portal → Production credentials.',
                'is_active'   => false,
            ],
            [
                'key'         => 'DOORDASH_PROD_KEY_ID',
                'group'       => 'DoorDash Drive Classic',
                'label'       => 'Production Key ID',
                'description' => 'Key ID (UUID) from DoorDash Developer Portal → Production credentials.',
                'is_active'   => false,
            ],
            [
                'key'         => 'DOORDASH_PROD_SIGNING_SECRET',
                'group'       => 'DoorDash Drive Classic',
                'label'       => 'Production Signing Secret',
                'description' => 'Base64url-encoded signing secret from DoorDash Developer Portal → Production credentials.',
                'is_active'   => false,
            ],

            // ── DoorDash Drive Shop & Deliver ─────────────────────────────────
            // Used for grocery/retail: Dashers shop for items then deliver.
            // Separate developer account/keys from Drive Classic.
            // Get credentials from: developer.doordash.com → Shop & Deliver → API Keys
            [
                'key'         => 'DOORDASH_SHOP_ENV',
                'group'       => 'DoorDash Shop & Deliver',
                'label'       => 'Shop & Deliver Environment',
                'description' => 'Set to "sandbox" or "production". Separate from Drive Classic environment.',
                'is_active'   => false,
            ],
            [
                'key'         => 'DOORDASH_SHOP_SANDBOX_DEVELOPER_ID',
                'group'       => 'DoorDash Shop & Deliver',
                'label'       => 'Sandbox Developer ID',
                'description' => 'Developer ID for Shop & Deliver sandbox. Different from Drive Classic keys.',
                'is_active'   => false,
            ],
            [
                'key'         => 'DOORDASH_SHOP_SANDBOX_KEY_ID',
                'group'       => 'DoorDash Shop & Deliver',
                'label'       => 'Sandbox Key ID',
                'description' => 'Key ID for Shop & Deliver sandbox.',
                'is_active'   => false,
            ],
            [
                'key'         => 'DOORDASH_SHOP_SANDBOX_SIGNING_SECRET',
                'group'       => 'DoorDash Shop & Deliver',
                'label'       => 'Sandbox Signing Secret',
                'description' => 'Signing secret for Shop & Deliver sandbox.',
                'is_active'   => false,
            ],
            [
                'key'         => 'DOORDASH_SHOP_PROD_DEVELOPER_ID',
                'group'       => 'DoorDash Shop & Deliver',
                'label'       => 'Production Developer ID',
                'description' => 'Developer ID for Shop & Deliver production.',
                'is_active'   => false,
            ],
            [
                'key'         => 'DOORDASH_SHOP_PROD_KEY_ID',
                'group'       => 'DoorDash Shop & Deliver',
                'label'       => 'Production Key ID',
                'description' => 'Key ID for Shop & Deliver production.',
                'is_active'   => false,
            ],
            [
                'key'         => 'DOORDASH_SHOP_PROD_SIGNING_SECRET',
                'group'       => 'DoorDash Shop & Deliver',
                'label'       => 'Production Signing Secret',
                'description' => 'Signing secret for Shop & Deliver production.',
                'is_active'   => false,
            ],

            // ── Uber Direct ───────────────────────────────────────────────────
            // Standard on-demand delivery. OAuth2 client credentials flow.
            // Get credentials from: developer.uber.com → My Apps → Uber Direct
            [
                'key'         => 'UBER_DIRECT_ENV',
                'group'       => 'Uber Direct',
                'label'       => 'Uber Direct Environment',
                'description' => 'Set to "sandbox" for testing or "production" for live deliveries.',
                'is_active'   => true,
            ],
            [
                'key'         => 'UBER_DIRECT_CLIENT_ID',
                'group'       => 'Uber Direct',
                'label'       => 'Client ID',
                'description' => 'OAuth2 Client ID from Uber Developer Dashboard → Credentials.',
                'is_active'   => false,
            ],
            [
                'key'         => 'UBER_DIRECT_CLIENT_SECRET',
                'group'       => 'Uber Direct',
                'label'       => 'Client Secret',
                'description' => 'OAuth2 Client Secret from Uber Developer Dashboard → Credentials.',
                'is_active'   => false,
            ],
            [
                'key'         => 'UBER_DIRECT_CUSTOMER_ID',
                'group'       => 'Uber Direct',
                'label'       => 'Customer ID',
                'description' => 'Your Uber Direct customer_id (organization ID). Found in the Uber Developer Dashboard.',
                'is_active'   => false,
            ],

            // ── Uber CCP (Courier Connection Platform) ────────────────────────
            // Enterprise-grade courier API — separate app credentials from Uber Direct.
            // Get credentials from: developer.uber.com → My Apps → CCP App
            [
                'key'         => 'UBER_CCP_ENV',
                'group'       => 'Uber CCP',
                'label'       => 'Uber CCP Environment',
                'description' => 'Set to "sandbox" or "production". Uses different API endpoints than Uber Direct.',
                'is_active'   => false,
            ],
            [
                'key'         => 'UBER_CCP_CLIENT_ID',
                'group'       => 'Uber CCP',
                'label'       => 'CCP Client ID',
                'description' => 'OAuth2 Client ID for the CCP app (separate from Uber Direct app).',
                'is_active'   => false,
            ],
            [
                'key'         => 'UBER_CCP_CLIENT_SECRET',
                'group'       => 'Uber CCP',
                'label'       => 'CCP Client Secret',
                'description' => 'OAuth2 Client Secret for the CCP app.',
                'is_active'   => false,
            ],
            [
                'key'         => 'UBER_CCP_CUSTOMER_ID',
                'group'       => 'Uber CCP',
                'label'       => 'CCP Customer ID',
                'description' => 'Organization/customer ID for CCP. May differ from Uber Direct customer_id.',
                'is_active'   => false,
            ],
        ];

        foreach ($secrets as $secret) {
            $existing = AppSecret::where('key', $secret['key'])->first();

            if ($existing) {
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
                    'is_active'   => $secret['is_active'],
                ]);
                $this->command->line("  Created: {$secret['key']}");
            }
        }

        $this->command->info('Done — go to Admin → App Secrets to fill in credentials.');
    }
}
