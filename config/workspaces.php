<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Workspace File Management
    |--------------------------------------------------------------------------
    */
    'max_file_size' => env('WORKSPACE_MAX_FILE_SIZE', 10485760), // 10MB
    'max_scan_depth' => env('WORKSPACE_MAX_SCAN_DEPTH', 8),
    'max_scan_items' => env('WORKSPACE_MAX_SCAN_ITEMS', 20000),

    // Allowed file extensions for workspace file operations (empty = allow all)
    'allowed_extensions' => [
        'php', 'js', 'jsx', 'ts', 'tsx',
        'css', 'scss', 'sass', 'less',
        'html', 'htm', 'blade',
        'json', 'xml', 'yaml', 'yml',
        'md', 'txt', 'rst',
        'sql', 'sh', 'bash',
        'env', 'example', 'gitignore',
        'lock', 'log'
    ],
    'allow_extensionless' => env('WORKSPACE_ALLOW_EXTENSIONLESS', true),

    // Excluded directories during scans
    'excluded_dirs' => [
        'node_modules',
        'vendor',
        '.git',
        'storage',
        'bootstrap/cache',
        '.idea',
        '.vscode',
        'dist',
        'build'
    ],

    /*
    |--------------------------------------------------------------------------
    | Terminal & Git
    |--------------------------------------------------------------------------
    */
    'terminal_timeout' => env('WORKSPACE_TERMINAL_TIMEOUT', 300),
    'terminal_max_length' => env('WORKSPACE_TERMINAL_MAX_LENGTH', 4096),
    // On Windows, use Git Bash for Unix command support (ls, grep, npm, etc.)
    'git_bash_path' => env('GIT_BASH_PATH', 'C:\\Program Files\\Git\\bin\\bash.exe'),

    // Empty array means allow all commands. Add prefixes to restrict.
    'terminal_allowlist' => [],

    'terminal_dangerous_patterns' => [
        'rm ',
        'rm -',
        'del ',
        'format ',
        'mkfs',
        'dd if=',   // dangerous dd usage (was 'dd ' which falsely matched 'git add')
        'dd of=',   // dangerous dd usage
        'sudo ',
        'chmod 777',
        'chown ',
        'icacls ',
        'takeown '
    ],

    'git_timeout' => env('WORKSPACE_GIT_TIMEOUT', 60),
];
