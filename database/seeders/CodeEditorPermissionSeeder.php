<?php

namespace Database\Seeders;

use App\Models\CodeEditorPermission;
use Illuminate\Database\Seeder;

class CodeEditorPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            // Application code - Full access
            [
                'path_pattern' => '/app/**/*.php',
                'can_read' => true,
                'can_write' => true,
                'can_delete' => true,
                'can_execute' => false,
                'description' => 'Application code - Full access',
                'priority' => 50
            ],

            // Resources - Full access
            [
                'path_pattern' => '/resources/**/*',
                'can_read' => true,
                'can_write' => true,
                'can_delete' => true,
                'can_execute' => false,
                'description' => 'Frontend resources - Full access',
                'priority' => 50
            ],

            // Routes - Full access
            [
                'path_pattern' => '/routes/*.php',
                'can_read' => true,
                'can_write' => true,
                'can_delete' => false,
                'can_execute' => false,
                'description' => 'Route files - Read/Write',
                'priority' => 50
            ],

            // Config files - Read only
            [
                'path_pattern' => '/config/**/*.php',
                'can_read' => true,
                'can_write' => false,
                'can_delete' => false,
                'can_execute' => false,
                'description' => 'Configuration files - Read only',
                'priority' => 60
            ],

            // Database migrations - Read only (safety)
            [
                'path_pattern' => '/database/migrations/*.php',
                'can_read' => true,
                'can_write' => false,
                'can_delete' => false,
                'can_execute' => false,
                'description' => 'Database migrations - Read only (prevent accidental changes)',
                'priority' => 70
            ],

            // Database seeders - Full access
            [
                'path_pattern' => '/database/seeders/*.php',
                'can_read' => true,
                'can_write' => true,
                'can_delete' => true,
                'can_execute' => false,
                'description' => 'Database seeders - Full access',
                'priority' => 50
            ],

            // Tests - Full access
            [
                'path_pattern' => '/tests/**/*.php',
                'can_read' => true,
                'can_write' => true,
                'can_delete' => true,
                'can_execute' => false,
                'description' => 'Test files - Full access',
                'priority' => 50
            ],

            // Vendor directory - Read only
            [
                'path_pattern' => '/vendor/**/*',
                'can_read' => true,
                'can_write' => false,
                'can_delete' => false,
                'can_execute' => false,
                'description' => 'Vendor dependencies - Read only',
                'priority' => 80
            ],

            // Node modules - Read only
            [
                'path_pattern' => '/node_modules/**/*',
                'can_read' => true,
                'can_write' => false,
                'can_delete' => false,
                'can_execute' => false,
                'description' => 'Node modules - Read only',
                'priority' => 80
            ],

            // Package files - Read/Write
            [
                'path_pattern' => '/package.json',
                'can_read' => true,
                'can_write' => true,
                'can_delete' => false,
                'can_execute' => false,
                'description' => 'Package.json - Read/Write',
                'priority' => 55
            ],

            [
                'path_pattern' => '/package-lock.json',
                'can_read' => true,
                'can_write' => true,
                'can_delete' => false,
                'can_execute' => false,
                'description' => 'Package-lock.json - Read/Write',
                'priority' => 55
            ],

            [
                'path_pattern' => '/composer.json',
                'can_read' => true,
                'can_write' => true,
                'can_delete' => false,
                'can_execute' => false,
                'description' => 'Composer.json - Read/Write',
                'priority' => 55
            ],

            [
                'path_pattern' => '/composer.lock',
                'can_read' => true,
                'can_write' => true,
                'can_delete' => false,
                'can_execute' => false,
                'description' => 'Composer.lock - Read/Write',
                'priority' => 55
            ],

            // Environment files - FORBIDDEN (highest priority)
            [
                'path_pattern' => '/.env*',
                'can_read' => false,
                'can_write' => false,
                'can_delete' => false,
                'can_execute' => false,
                'description' => 'Environment files - FORBIDDEN for security',
                'priority' => 100
            ],

            // Git directory - Read only
            [
                'path_pattern' => '/.git/**/*',
                'can_read' => true,
                'can_write' => false,
                'can_delete' => false,
                'can_execute' => false,
                'description' => 'Git directory - Read only',
                'priority' => 90
            ],

            // Storage - Limited access
            [
                'path_pattern' => '/storage/logs/*.log',
                'can_read' => true,
                'can_write' => false,
                'can_delete' => false,
                'can_execute' => false,
                'description' => 'Log files - Read only',
                'priority' => 70
            ],

            // README and documentation - Full access
            [
                'path_pattern' => '/*.md',
                'can_read' => true,
                'can_write' => true,
                'can_delete' => false,
                'can_execute' => false,
                'description' => 'Root markdown files - Read/Write',
                'priority' => 50
            ],

            // Public directory - Full access
            [
                'path_pattern' => '/public/**/*',
                'can_read' => true,
                'can_write' => true,
                'can_delete' => true,
                'can_execute' => false,
                'description' => 'Public assets - Full access',
                'priority' => 50
            ],
        ];

        foreach ($permissions as $permission) {
            CodeEditorPermission::updateOrCreate(
                ['path_pattern' => $permission['path_pattern']],
                $permission
            );
        }

        $this->command->info('Code editor permissions seeded successfully!');
        $this->command->info('Total permissions: ' . count($permissions));
    }
}
