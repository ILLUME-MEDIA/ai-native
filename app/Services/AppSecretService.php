<?php

namespace App\Services;

use App\Models\AppSecret;
use Illuminate\Support\Facades\Cache;

class AppSecretService
{
    /**
     * Per-request static cache so we don't hit the DB on every call.
     */
    protected static array $cache = [];

    /**
     * Get a secret value.
     *
     * Resolution order:
     *  1. In-memory cache (this request)
     *  2. app_secrets table (active rows only)
     *  3. env() fallback
     *  4. $default
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        if (array_key_exists($key, static::$cache)) {
            return static::$cache[$key];
        }

        try {
            $secret = AppSecret::where('key', $key)
                ->where('is_active', true)
                ->first();

            if ($secret && $secret->getPlainValue() !== null && $secret->getPlainValue() !== '') {
                static::$cache[$key] = $secret->getPlainValue();
                return static::$cache[$key];
            }
        } catch (\Throwable) {
            // DB might not be available (e.g. during migrations) — fall through
        }

        $envValue = env($key, $default);
        static::$cache[$key] = $envValue;

        return $envValue;
    }

    /**
     * Clear the in-memory cache (call after create/update/delete).
     */
    public static function clearCache(?string $key = null): void
    {
        if ($key !== null) {
            unset(static::$cache[$key]);
        } else {
            static::$cache = [];
        }
    }
}
