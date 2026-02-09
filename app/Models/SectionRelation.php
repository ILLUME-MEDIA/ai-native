<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SectionRelation extends Model
{
    use HasFactory;

    protected $fillable = [
        'parent_entity_id',
        'child_entity_id',
        'relation_type',
        'foreign_key',
        'local_key',
        'pivot_table',
        'mcp_traversable',
    ];

    protected $casts = [
        'mcp_traversable' => 'boolean',
    ];

    public function parentEntity()
    {
        return $this->belongsTo(SectionEntity::class, 'parent_entity_id');
    }

    public function childEntity()
    {
        return $this->belongsTo(SectionEntity::class, 'child_entity_id');
    }
}

