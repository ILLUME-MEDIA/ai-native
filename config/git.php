<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Git Binary Path
    |--------------------------------------------------------------------------
    |
    | Full path to the Git executable. Leave null for auto-detection.
    | Auto-detection will check common Windows locations and fallback to PATH.
    |
    | Examples:
    | - Windows: 'C:\Program Files\Git\cmd\git.exe'
    | - Linux: '/usr/bin/git'
    | - macOS: '/usr/local/bin/git'
    |
    */

    'binary_path' => env('GIT_BINARY_PATH', null),

    /*
    |--------------------------------------------------------------------------
    | Default User Configuration
    |--------------------------------------------------------------------------
    |
    | Default Git user.name and user.email for workspace repositories.
    | These will be set when initializing new repositories.
    |
    */

    'default_user_name' => env('GIT_DEFAULT_USER_NAME', 'Workspace User'),
    'default_user_email' => env('GIT_DEFAULT_USER_EMAIL', 'workspace@example.com'),

    /*
    |--------------------------------------------------------------------------
    | Command Timeout
    |--------------------------------------------------------------------------
    |
    | Maximum execution time for Git commands in seconds.
    | Increase for large repositories or slow network operations.
    |
    */

    'timeout' => env('GIT_TIMEOUT', 300),

    /*
    |--------------------------------------------------------------------------
    | Allowed Commands
    |--------------------------------------------------------------------------
    |
    | Whitelist of Git commands that can be executed.
    | Commands not in this list will be blocked for security.
    |
    */

    'allowed_commands' => [
        'init', 'status', 'add', 'commit', 'push', 'pull', 'fetch',
        'branch', 'checkout', 'merge', 'log', 'diff', 'clone',
        'remote', 'tag', 'stash', 'reset', 'revert', 'show',
        'config', 'ls-files', 'rev-parse', 'describe', 'blame'
    ],

    /*
    |--------------------------------------------------------------------------
    | Blocked Commands
    |--------------------------------------------------------------------------
    |
    | Commands that are explicitly blocked for security reasons.
    | These commands can potentially damage the repository or system.
    |
    */

    'blocked_commands' => [
        'filter-branch', 'gc', 'prune', 'reflog', 'fsck',
        'daemon', 'serve', 'instaweb', 'fast-import', 'fast-export'
    ],

    /*
    |--------------------------------------------------------------------------
    | Security Settings
    |--------------------------------------------------------------------------
    |
    | Additional security configurations for Git operations.
    |
    */

    'security' => [
        // Restrict Git operations to workspace directory only
        'restrict_to_workspaces' => true,

        // Root workspace directory
        'workspace_root' => storage_path('workspaces'),

        // Disable certain features in production
        'disable_force_push' => env('GIT_DISABLE_FORCE_PUSH', true),

        // Require authentication for remote operations
        'require_auth_for_remote' => env('GIT_REQUIRE_AUTH_REMOTE', true),

        // Maximum file size for diff operations (MB)
        'max_diff_size' => 10,
    ],

    /*
    |--------------------------------------------------------------------------
    | Logging
    |--------------------------------------------------------------------------
    |
    | Configure Git command logging.
    |
    */

    'logging' => [
        'enabled' => env('GIT_LOGGING_ENABLED', true),
        'channel' => env('GIT_LOG_CHANNEL', 'daily'),
        'log_commands' => true,
        'log_output' => false, // Set to true for debugging
    ],

];
