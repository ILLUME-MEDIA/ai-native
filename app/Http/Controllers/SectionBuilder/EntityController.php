<?php

namespace App\Http\Controllers\SectionBuilder;

use App\Http\Controllers\Controller;
use App\Models\SectionEntity;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class EntityController extends Controller
{
    public function index()
    {
        return response()->json(
            SectionEntity::query()
                ->select(['id', 'name', 'table_name', 'slug'])
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'table_name' => ['required', 'string', 'max:255', 'alpha_dash', 'unique:section_entities,table_name'],
            'slug' => ['nullable', 'string', 'max:255', 'alpha_dash', 'unique:section_entities,slug'],
        ]);

        $data['slug'] = $data['slug'] ?? Str::slug($data['table_name']);
        $data['source_type'] = 'frontend';
        $data['is_system'] = false;

        $entity = SectionEntity::create($data);

        return response()->json($entity, 201);
    }

    public function show(SectionEntity $entity)
    {
        $entity->load(['fields' => fn ($q) => $q->with('relatedEntity:id,name,table_name,slug')]);
        return response()->json($entity);
    }

    public function update(Request $request, SectionEntity $entity)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'table_name' => [
                'sometimes',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('section_entities', 'table_name')->ignore($entity->id),
            ],
            'slug' => [
                'sometimes',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('section_entities', 'slug')->ignore($entity->id),
            ],
            'mcp_enabled' => ['sometimes', 'boolean'],
            'mcp_can_read' => ['sometimes', 'boolean'],
            'mcp_can_create' => ['sometimes', 'boolean'],
            'mcp_can_update' => ['sometimes', 'boolean'],
            'mcp_can_delete' => ['sometimes', 'boolean'],
            'fields' => ['sometimes', 'array'],
            'fields.*.name' => ['required', 'string', 'max:255'],
            'fields.*.slug' => ['required', 'string', 'max:255'],
            'fields.*.type' => ['required', 'string', 'max:50'],
            'fields.*.required' => ['sometimes', 'boolean'],
            'fields.*.nullable' => ['sometimes', 'boolean'],
            'fields.*.default_value' => ['nullable', 'string'],
            'fields.*.is_listing_visible' => ['sometimes', 'boolean'],
            'fields.*.is_detail_visible' => ['sometimes', 'boolean'],
            'fields.*.related_entity_id' => ['nullable', 'integer', 'exists:section_entities,id'],
            'fields.*.relation_type' => ['nullable', 'string', 'max:32'],
            'fields.*.relation_display_column' => ['nullable', 'string', 'max:64'],
        ]);

        $entity->fill($data);
        $entity->save();

        // Sync fields if provided
        if (isset($data['fields'])) {
            // Delete existing fields
            $entity->fields()->delete();

            // Create new fields with sort order
            foreach ($data['fields'] as $index => $fieldData) {
                $entity->fields()->create([
                    'column_name' => $fieldData['slug'],
                    'label' => $fieldData['name'],
                    'type' => $fieldData['type'],
                    'related_entity_id' => $fieldData['related_entity_id'] ?? null,
                    'relation_type' => $fieldData['relation_type'] ?? null,
                    'relation_display_column' => $fieldData['relation_display_column'] ?? null,
                    'required' => $fieldData['required'] ?? false,
                    'nullable' => $fieldData['nullable'] ?? true,
                    'default_value' => $fieldData['default_value'] ?? null,
                    'list_visible' => $fieldData['is_listing_visible'] ?? true,
                    'detail_visible' => $fieldData['is_detail_visible'] ?? true,
                    'sort_order' => $index,
                ]);
            }
        }

        // Reload with fields
        $entity->load('fields');

        return response()->json($entity);
    }

    public function getMcpConfig(SectionEntity $entity)
    {
        return response()->json([
            'enabled' => $entity->mcp_enabled,
            'read' => $entity->mcp_can_read,
            'create' => $entity->mcp_can_create,
            'update' => $entity->mcp_can_update,
            'delete' => $entity->mcp_can_delete,
        ]);
    }
}

