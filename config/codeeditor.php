<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Code Editor Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration options for the online code editor
    |
    */

    // Maximum file size in bytes (default: 10MB)
    'max_file_size' => env('CODE_EDITOR_MAX_FILE_SIZE', 10485760),

    // Allowed file extensions
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
    'allow_extensionless' => env('CODE_EDITOR_ALLOW_EXTENSIONLESS', true),

    // Excluded directories (won't show in file tree)
    'excluded_directories' => [
        'node_modules',
        'vendor',
        '.git',
        'storage/framework',
        'storage/logs',
        'bootstrap/cache',
        '.idea',
        '.vscode',
        'dist',
        'build'
    ],

    // Limits
    'max_tree_depth' => env('CODE_EDITOR_MAX_TREE_DEPTH', 6),
    'max_list_depth' => env('CODE_EDITOR_MAX_LIST_DEPTH', 4),
    'max_search_depth' => env('CODE_EDITOR_MAX_SEARCH_DEPTH', 6),
    'max_scan_items' => env('CODE_EDITOR_MAX_SCAN_ITEMS', 20000),
    'max_search_results' => env('CODE_EDITOR_MAX_SEARCH_RESULTS', 200),
    'max_search_results_per_file' => env('CODE_EDITOR_MAX_SEARCH_RESULTS_PER_FILE', 10),

    // Monaco editor theme
    'theme' => env('CODE_EDITOR_THEME', 'vs-dark'), // vs, vs-dark, hc-black

    // Auto-save interval in seconds (0 = disabled)
    'auto_save_interval' => env('CODE_EDITOR_AUTO_SAVE', 0),
];
