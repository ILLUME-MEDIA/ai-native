<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Resend API Configuration
    |--------------------------------------------------------------------------
    | Get your API key from https://resend.com/api-keys
    */
    'resend_api_key' => env('RESEND_API_KEY', ''),

    'from_email' => env('RESEND_FROM_EMAIL', 'noreply@example.com'),

    'from_name' => env('RESEND_FROM_NAME', env('APP_NAME', 'App')),

    /*
    |--------------------------------------------------------------------------
    | OTP Settings
    |--------------------------------------------------------------------------
    */
    'otp_expires_minutes' => env('OTP_EXPIRES_MINUTES', 10),

    'otp_length' => env('OTP_LENGTH', 4),

    // Max failed verify attempts before OTP is invalidated
    'max_attempts' => env('OTP_MAX_ATTEMPTS', 5),

    // Resend cooldown in seconds (prevent spam)
    'resend_cooldown_seconds' => env('OTP_RESEND_COOLDOWN', 60),

    /*
    |--------------------------------------------------------------------------
    | Token Settings
    |--------------------------------------------------------------------------
    | After successful OTP + email check → JWT/Sanctum token lifetime in days.
    */
    'token_expires_days' => env('OTP_TOKEN_EXPIRES_DAYS', 30),

    /*
    |--------------------------------------------------------------------------
    | Allowed Tables
    |--------------------------------------------------------------------------
    | Security: Only tables listed here are allowed for the email lookup.
    | Prevents arbitrary DB table access from the frontend.
    | Add '*' to allow all tables (not recommended for production).
    */
    'allowed_tables' => [
        'users',
        // 'customers',
        // 'vendors',
    ],

];
