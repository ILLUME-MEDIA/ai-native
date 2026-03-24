<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSecret extends Model
{
    protected $fillable = [
        'key',
        'value',
        'group',
        'label',
        'description',
        'is_active',
    ];

    protected $hidden = ['value'];

    protected $casts = [
        'value'     => 'encrypted',
        'is_active' => 'boolean',
    ];

    /**
     * Returns value masked as ****...xxxx (last 4 chars visible).
     */
    public function getMaskedValue(): ?string
    {
        $plain = $this->value;

        if ($plain === null || $plain === '') {
            return null;
        }

        $len = strlen($plain);

        if ($len <= 4) {
            return str_repeat('*', $len);
        }

        return str_repeat('*', max(8, $len - 4)) . substr($plain, -4);
    }

    /**
     * Returns the plain (decrypted) value — use only for internal service use.
     */
    public function getPlainValue(): ?string
    {
        return $this->value;
    }
}
