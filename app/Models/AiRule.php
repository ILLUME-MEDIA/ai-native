<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Collection;

class AiRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'workspace_id',
        'name',
        'description',
        'rule_content',
        'type',
        'is_active',
        'priority',
        'conditions'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'priority' => 'integer',
        'conditions' => 'array'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    /**
     * Fetch all rules that apply for a given user + workspace context:
     *   - System rules (no user_id, no workspace_id) — always apply
     *   - User global rules (user_id set, no workspace_id) — apply for this user everywhere
     *   - Workspace rules (user_id + workspace_id set) — apply only in this workspace
     */
    public static function forContext(?int $userId, ?int $workspaceId): Collection
    {
        return static::where('is_active', true)
            ->where(function ($q) use ($userId, $workspaceId) {
                // System rules — no owner
                $q->whereNull('user_id')->whereNull('workspace_id');

                // User global rules
                if ($userId) {
                    $q->orWhere(fn ($q2) => $q2->where('user_id', $userId)->whereNull('workspace_id'));
                }

                // Workspace-specific rules
                if ($userId && $workspaceId) {
                    $q->orWhere(fn ($q2) => $q2->where('user_id', $userId)->where('workspace_id', $workspaceId));
                }
            })
            ->orderBy('priority', 'desc')
            ->get();
    }
}
