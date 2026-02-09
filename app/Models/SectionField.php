<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SectionField extends Model
{
    use HasFactory;

    protected $fillable = [
        'entity_id',
        'column_name',
        'label',
        'type',
        'related_entity_id',
        'relation_type',
        'relation_display_column',
        'options',
        'nullable',
        'required',
        'default_value',
        'list_visible',
        'detail_visible',
        'is_searchable',
        'is_sortable',
        'sort_order',
        'mcp_readable',
        'mcp_writable',
        'storage_disk',
        'storage_path_pattern',
    ];

    protected $casts = [
        'options' => 'array',
        'nullable' => 'boolean',
        'required' => 'boolean',
        'list_visible' => 'boolean',
        'detail_visible' => 'boolean',
        'is_searchable' => 'boolean',
        'is_sortable' => 'boolean',
        'mcp_readable' => 'boolean',
        'mcp_writable' => 'boolean',
    ];

    public function entity()
    {
        return $this->belongsTo(SectionEntity::class, 'entity_id');
    }

    public function relatedEntity()
    {
        return $this->belongsTo(SectionEntity::class, 'related_entity_id');
    }
}

