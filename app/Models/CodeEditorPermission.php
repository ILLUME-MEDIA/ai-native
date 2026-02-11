<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CodeEditorPermission extends Model
{
    protected $fillable = [
        'path_pattern',
        'can_read',
        'can_write',
        'can_delete',
        'can_execute',
        'user_id',
        'description',
        'is_active',
        'priority'
    ];

    protected $casts = [
        'can_read' => 'boolean',
        'can_write' => 'boolean',
        'can_delete' => 'boolean',
        'can_execute' => 'boolean',
        'is_active' => 'boolean',
        'priority' => 'integer'
    ];

    /**
     * Get the user this permission applies to
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope to active permissions
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Check if user can perform action on path
     *
     * @param int|null $userId
     * @param string $path
     * @param string $action (read, write, delete, execute)
     * @return bool
     */
    public static function canPerform($userId, string $path, string $action): bool
    {
        // Admin bypass - check if user is admin
        $user = $userId ? User::find($userId) : auth()->user();
        if ($user && method_exists($user, 'isAdmin') && $user->isAdmin()) {
            return true;
        }

        // Check for SITE_API_KEY or MCP_API_KEY in request
        if (request()->bearerToken()) {
            $token = request()->bearerToken();
            if ($token === config('app.site_api_key') || $token === config('app.mcp_api_key')) {
                return true;
            }
        }

        // Get matching permission rules (ordered by priority)
        $permissions = static::where(function ($q) use ($userId) {
            $q->whereNull('user_id')->orWhere('user_id', $userId);
        })
        ->active()
        ->orderByDesc('priority')
        ->get();

        // Find first matching rule
        foreach ($permissions as $perm) {
            if (static::matchesPattern($perm->path_pattern, $path)) {
                return $perm->{"can_$action"} ?? false;
            }
        }

        // Default: deny (secure by default)
        return false;
    }

    /**
     * Check if path matches glob pattern
     *
     * @param string $pattern
     * @param string $path
     * @return bool
     */
    protected static function matchesPattern(string $pattern, string $path): bool
    {
        // Convert glob pattern to regex
        // Handle: * (any chars), ** (any path), ? (single char)

        // Escape special regex characters except glob wildcards
        $pattern = preg_quote($pattern, '#');

        // Replace glob wildcards with regex
        $pattern = str_replace(['\*\*', '\*', '\?'], ['.*', '[^/]*', '.'], $pattern);

        // Match pattern
        return (bool) preg_match("#^{$pattern}$#", $path);
    }

    /**
     * Test if a path matches this permission's pattern
     *
     * @param string $path
     * @return bool
     */
    public function matches(string $path): bool
    {
        return static::matchesPattern($this->path_pattern, $path);
    }
}
