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
        // Web / JavaScript
        'php', 'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'vue',
        // Styles
        'css', 'scss', 'sass', 'less',
        // Markup / Templates
        'html', 'htm', 'blade', 'twig', 'ejs', 'hbs', 'njk',
        // Data / Config
        'json', 'json5', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf',
        // Docs
        'md', 'mdx', 'txt', 'rst', 'csv',
        // Scripts
        'sql', 'sh', 'bash', 'zsh', 'fish', 'ps1',
        // Environment / Git
        'env', 'example', 'gitignore', 'gitattributes', 'editorconfig', 'nvmrc',
        // Locks / Logs
        'lock', 'log',
        // Graphics (display only — Monaco shows them as text/path reference)
        'svg',
        // Other dev files
        'graphql', 'gql', 'prisma', 'tf', 'hcl', 'dockerfile', 'makefile',
    ],
    'allow_extensionless' => env('WORKSPACE_ALLOW_EXTENSIONLESS', true),

    // Excluded directories during scans.
    // NOTE: dist/ and build/ are intentionally NOT excluded so React/Vite/webpack
    // output is visible and editable. Only large auto-generated dirs are excluded.
    'excluded_dirs' => [
        'node_modules',
        'vendor',
        '.git',
        'storage',
        'bootstrap/cache',
        '.idea',
        '.vscode',
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

    // Extra PATH entries for Linux/macOS/cPanel live servers.
    // Add colon-separated paths where node, npm, python, etc. are installed.
    // The server auto-detects nvm, cPanel nodevenv, and /usr/local/bin automatically.
    // Only set this if auto-detection fails.
    // Example: WORKSPACE_EXTRA_PATH=/usr/local/node/bin:/opt/homebrew/bin
    'extra_path' => env('WORKSPACE_EXTRA_PATH', ''),

    // Windows only: explicit Node.js directory (semicolon-separated).
    // Auto-detected from `where node` and common install paths.
    // Set this in .env if auto-detection fails: WORKSPACE_NODE_PATH=C:\Program Files\nodejs
    'node_path_windows' => env('WORKSPACE_NODE_PATH', ''),

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
