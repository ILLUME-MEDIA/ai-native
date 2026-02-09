<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SectionEntity extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'table_name',
        'slug',
        'source_type',
        'is_system',
        'default_sort_field',
        'default_sort_direction',
        'mcp_enabled',
        'mcp_can_read',
        'mcp_can_create',
        'mcp_can_update',
        'mcp_can_delete',
    ];

    protected $casts = [
        'is_system' => 'boolean',
        'mcp_enabled' => 'boolean',
        'mcp_can_read' => 'boolean',
        'mcp_can_create' => 'boolean',
        'mcp_can_update' => 'boolean',
        'mcp_can_delete' => 'boolean',
    ];

    public function fields()
    {
        return $this->hasMany(SectionField::class, 'entity_id')->orderBy('sort_order');
    }

    public function parentRelations()
    {
        return $this->hasMany(SectionRelation::class, 'parent_entity_id');
    }

    public function childRelations()
    {
        return $this->hasMany(SectionRelation::class, 'child_entity_id');
    }
}

