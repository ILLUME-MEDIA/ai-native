<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_merge(
        ['http://localhost:3000'],  // Local frontend
        array_filter(array_map(
            'trim',
            explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173,http://localhost:8080,http://localhost:4173,https://javed.io,https://development.illumemedia.app'))
        ))
    ),

    // Regex patterns for dynamic origins (e.g. all *.illumemedia.app subdomains).
    // Override via CORS_ALLOWED_ORIGIN_PATTERNS env (comma-separated regex list).
    'allowed_origins_patterns' => array_filter(array_map(
        'trim',
        explode(',', env('CORS_ALLOWED_ORIGIN_PATTERNS', '#^https://([a-z0-9-]+\.)?illumemedia\.app$#,#^http://localhost(:[0-9]+)?$#'))
    )),

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    // Cache preflight for 2 hours so browsers don't re-check on every request.
    'max_age' => 7200,

    'supports_credentials' => false,

];
