<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EcommerceSetting extends Model
{
    protected $table = 'ecommerce_settings';

    protected $fillable = ['key', 'value', 'group', 'label', 'description'];

    /**
     * Get a setting value by key, with optional default.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();
        if (! $setting) return $default;

        $raw = $setting->value;

        // Auto-decode JSON values
        $decoded = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }

        return $raw;
    }

    /**
     * Set / upsert a setting value by key.
     */
    public static function set(string $key, mixed $value, array $meta = []): static
    {
        $encoded = is_array($value) || is_object($value)
            ? json_encode($value)
            : (string) $value;

        return static::updateOrCreate(
            ['key' => $key],
            array_merge(['value' => $encoded], $meta)
        );
    }

    /**
     * Return all settings in a given group as key => value map.
     */
    public static function group(string $group): array
    {
        return static::where('group', $group)
            ->get()
            ->mapWithKeys(function ($s) {
                $decoded = json_decode($s->value, true);
                return [$s->key => json_last_error() === JSON_ERROR_NONE ? $decoded : $s->value];
            })
            ->all();
    }
}
