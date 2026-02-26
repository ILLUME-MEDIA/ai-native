<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'youtube' => [
        'key' => env('YOUTUBE_API_KEY'),
    ],

    'mistral' => [
        'key' => env('MISTRAL_API_KEY'),
    ],

    'stripe' => [
        'secret'         => env('STRIPE_SECRET_KEY'),
        'publishable'    => env('STRIPE_PUBLISHABLE_KEY'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

    'square' => [
        'app_id'                => env('SQUARE_APP_ID'),
        'app_secret'            => env('SQUARE_APP_SECRET'),
        'environment'           => env('SQUARE_ENVIRONMENT', 'sandbox'),
        'webhook_signature_key' => env('SQUARE_WEBHOOK_SIGNATURE_KEY'),
    ],

    'clover' => [
        'app_id'      => env('CLOVER_APP_ID'),
        'app_secret'  => env('CLOVER_APP_SECRET'),
        'environment' => env('CLOVER_ENVIRONMENT', 'sandbox'),
    ],

    'doordash' => [
        'env' => env('DOORDASH_ENV', 'sandbox'), // "sandbox" or "production"

        'sandbox' => [
            'developer_id'   => env('DOORDASH_SANDBOX_DEVELOPER_ID'),
            'key_id'         => env('DOORDASH_SANDBOX_KEY_ID'),
            'signing_secret' => env('DOORDASH_SANDBOX_SIGNING_SECRET'),
            'base_url'       => env('DOORDASH_SANDBOX_BASE_URL', 'https://openapi.doordash.com/drive/v1'),
        ],

        'production' => [
            'developer_id'   => env('DOORDASH_PROD_DEVELOPER_ID'),
            'key_id'         => env('DOORDASH_PROD_KEY_ID'),
            'signing_secret' => env('DOORDASH_PROD_SIGNING_SECRET'),
            'base_url'       => env('DOORDASH_PROD_BASE_URL', 'https://openapi.doordash.com/drive/v1'),
        ],
    ],

];
