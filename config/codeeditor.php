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

    // Monaco editor theme
    'theme' => env('CODE_EDITOR_THEME', 'vs-dark'), // vs, vs-dark, hc-black

    // Auto-save interval in seconds (0 = disabled)
    'auto_save_interval' => env('CODE_EDITOR_AUTO_SAVE', 0),
];
