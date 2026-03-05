<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CalPlatform extends Model
{
    protected $fillable = [
        'name', 'slug', 'api_key', 'base_url', 'webhook_secret',
        'color', 'settings', 'is_active', 'users_entity_id',
    ];

    protected $hidden = ['api_key', 'webhook_secret'];

    protected $casts = [
        'api_key'        => 'encrypted',
        'webhook_secret' => 'encrypted',
        'settings'       => 'array',
        'is_active'      => 'boolean',
    ];

    public function meetings(): HasMany
    {
        return $this->hasMany(CalMeeting::class);
    }

    public function openorgUsers(): HasMany
    {
        return $this->hasMany(OpenorgUser::class);
    }

    public function usersEntity(): BelongsTo
    {
        return $this->belongsTo(SectionEntity::class, 'users_entity_id');
    }

    /**
     * Returns the DB table name to use for this platform's users.
     * If a Section Builder entity is linked, use its table; otherwise openorg_users.
     */
    public function getUsersTable(): string
    {
        if ($this->users_entity_id && $this->relationLoaded('usersEntity') && $this->usersEntity) {
            return $this->usersEntity->table_name;
        }
        if ($this->users_entity_id) {
            $entity = SectionEntity::find($this->users_entity_id);
            if ($entity) return $entity->table_name;
        }
        return 'openorg_users';
    }

    public function getMaskedApiKey(): ?string
    {
        $plain = $this->api_key;
        if (!$plain) return null;
        $len = strlen($plain);
        if ($len <= 4) return str_repeat('*', $len);
        return str_repeat('*', max(8, $len - 4)) . substr($plain, -4);
    }

    public function getPlainApiKey(): ?string
    {
        return $this->api_key;
    }

    public function getPlainWebhookSecret(): ?string
    {
        return $this->webhook_secret;
    }

    public function getMaskedWebhookSecret(): ?string
    {
        $plain = $this->webhook_secret;
        if (!$plain) return null;
        $len = strlen($plain);
        if ($len <= 4) return str_repeat('*', $len);
        return str_repeat('*', max(8, $len - 4)) . substr($plain, -4);
    }

    /** Full webhook URL for this platform (to copy into Cal.com dashboard). */
    public function getWebhookUrl(): string
    {
        return url("/api/webhooks/cal/{$this->slug}");
    }
}
