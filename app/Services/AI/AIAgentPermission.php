<?php

namespace App\Services\AI;

use App\Models\User;
use App\Models\Workspace;

class AIAgentPermission
{
    /**
     * Check if AI agent can perform an action on a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @param string $action (read, write, execute, delete, git)
     * @param string|null $path
     * @return bool
     */
    public static function canPerform(User $user, Workspace $workspace, string $action, ?string $path = null): bool
    {
        // Check if AI tools are enabled globally
        if (!config('ai_tools.enabled', true)) {
            return false;
        }

        // Check workspace ownership
        if ($workspace->user_id !== $user->id && !$user->isAdmin()) {
            return false;
        }

        // Check workspace settings (if AI is disabled for this workspace)
        $settings = $workspace->settings ?? [];
        if (isset($settings['ai_enabled']) && !$settings['ai_enabled']) {
            return false;
        }

        // Check action-specific permissions
        $actionPermissions = $settings['ai_permissions'] ?? [];

        switch ($action) {
            case 'read':
                // Read is generally always allowed
                return true;

            case 'write':
                // Check if AI can write files
                if (isset($actionPermissions['can_write_files']) && !$actionPermissions['can_write_files']) {
                    return false;
                }
                break;

            case 'execute':
                // Check if AI can run commands
                if (isset($actionPermissions['can_run_commands']) && !$actionPermissions['can_run_commands']) {
                    return false;
                }
                break;

            case 'delete':
                // Deletes always require approval by default
                if (isset($actionPermissions['can_delete_files']) && !$actionPermissions['can_delete_files']) {
                    return false;
                }
                break;

            case 'git':
                // Check if AI can use git
                if (isset($actionPermissions['can_use_git']) && !$actionPermissions['can_use_git']) {
                    return false;
                }
                break;
        }

        // Check path-specific restrictions
        if ($path) {
            $blockedPaths = $actionPermissions['blocked_paths'] ?? config('ai_tools.security.blocked_paths', []);

            foreach ($blockedPaths as $blocked) {
                if (str_starts_with($path, $blocked) || str_contains($path, $blocked)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Get default AI permissions for a new workspace
     *
     * @return array
     */
    public static function getDefaultPermissions(): array
    {
        return [
            'ai_enabled' => true,
            'ai_permissions' => [
                'can_write_files' => true,
                'can_run_commands' => false, // Disabled by default for security
                'can_delete_files' => false, // Requires approval
                'can_use_git' => true,
                'blocked_paths' => [
                    '.env',
                    'config/database.php',
                    '.git/config'
                ]
            ]
        ];
    }

    /**
     * Check if a specific tool requires approval for the given arguments
     *
     * @param string $toolName
     * @param array $args
     * @param Workspace $workspace
     * @return bool
     */
    public static function requiresApproval(string $toolName, array $args, Workspace $workspace): bool
    {
        $settings = $workspace->settings ?? [];
        $approvalSettings = $settings['ai_approval_settings'] ?? [];

        // Check tool-specific approval requirements
        switch ($toolName) {
            case 'createFile':
                // Check if path matches approval patterns
                if (isset($args['path'])) {
                    return self::pathRequiresApproval($args['path'], $approvalSettings);
                }
                return false;

            case 'writeFile':
                // Edits usually require approval unless explicitly allowed
                if (isset($args['path'])) {
                    return self::pathRequiresApproval($args['path'], $approvalSettings);
                }
                return true;

            case 'deleteFile':
                // Deletes always require approval
                return true;

            case 'runCommand':
                // Commands always require approval by default
                return true;

            default:
                return false;
        }
    }

    /**
     * Check if a path requires approval based on patterns
     *
     * @param string $path
     * @param array $approvalSettings
     * @return bool
     */
    protected static function pathRequiresApproval(string $path, array $approvalSettings): bool
    {
        // Paths that never require approval (safe patterns)
        $autoApprovePatterns = $approvalSettings['auto_approve_patterns'] ?? [
            'src/**/*.js',
            'src/**/*.jsx',
            'src/**/*.css',
            'public/**/*',
            '*.md',
            'README*',
            'docs/**/*'
        ];

        foreach ($autoApprovePatterns as $pattern) {
            if (self::matchesGlobPattern($path, $pattern)) {
                return false; // Auto-approve
            }
        }

        // Paths that always require approval
        $requireApprovalPatterns = $approvalSettings['require_approval_patterns'] ?? [
            '*.env*',
            'config/**/*.php',
            '.git/**/*',
            'database/**/*',
            'vendor/**/*'
        ];

        foreach ($requireApprovalPatterns as $pattern) {
            if (self::matchesGlobPattern($path, $pattern)) {
                return true; // Require approval
            }
        }

        // Default: require approval for unknown paths
        return $approvalSettings['default_requires_approval'] ?? true;
    }

    /**
     * Match path against glob pattern
     *
     * @param string $path
     * @param string $pattern
     * @return bool
     */
    protected static function matchesGlobPattern(string $path, string $pattern): bool
    {
        // Convert glob to regex
        $pattern = str_replace('/', '\/', $pattern);
        $pattern = str_replace('**', '.*', $pattern);
        $pattern = str_replace('*', '[^\/]*', $pattern);
        $pattern = str_replace('?', '.', $pattern);

        return (bool) preg_match('/^' . $pattern . '$/', $path);
    }
}
