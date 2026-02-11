<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Workspace;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update existing workspaces to have AI settings
        $workspaces = Workspace::all();

        foreach ($workspaces as $workspace) {
            $settings = $workspace->settings ?? [];

            // Add AI settings if not present
            if (!isset($settings['ai_enabled'])) {
                $settings['ai_enabled'] = true;
            }

            if (!isset($settings['ai_permissions'])) {
                $settings['ai_permissions'] = [
                    'can_write_files' => true,
                    'can_run_commands' => false, // Disabled by default for security
                    'can_delete_files' => false, // Requires approval
                    'can_use_git' => true,
                    'blocked_paths' => [
                        '.env',
                        '.env.local',
                        'config/database.php',
                        '.git/config'
                    ]
                ];
            }

            if (!isset($settings['ai_approval_settings'])) {
                $settings['ai_approval_settings'] = [
                    'auto_approve_patterns' => [
                        'src/**/*.js',
                        'src/**/*.jsx',
                        'src/**/*.ts',
                        'src/**/*.tsx',
                        'src/**/*.css',
                        'src/**/*.scss',
                        'public/**/*',
                        'resources/**/*.js',
                        'resources/**/*.jsx',
                        '*.md',
                        'README*',
                        'docs/**/*'
                    ],
                    'require_approval_patterns' => [
                        '*.env*',
                        'config/**/*.php',
                        '.git/**/*',
                        'database/**/*',
                        'vendor/**/*'
                    ],
                    'default_requires_approval' => false // Auto-approve by default for better UX
                ];
            }

            $workspace->settings = $settings;
            $workspace->save();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove AI settings from workspaces
        $workspaces = Workspace::all();

        foreach ($workspaces as $workspace) {
            $settings = $workspace->settings ?? [];

            unset($settings['ai_enabled']);
            unset($settings['ai_permissions']);
            unset($settings['ai_approval_settings']);

            $workspace->settings = $settings;
            $workspace->save();
        }
    }
};
