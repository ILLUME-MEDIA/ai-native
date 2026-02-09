<?php

namespace App\Http\Controllers\SectionBuilder;

use App\Http\Controllers\Controller;
use App\Models\SectionEntity;
use App\Models\SectionField;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FieldController extends Controller
{
    public function index(SectionEntity $entity)
    {
        $entity->load('fields');

        return response()->json($entity->fields);
    }

    public function store(Request $request, SectionEntity $entity)
    {
        $data = $request->validate([
            'column_name' => [
                'required',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('section_fields', 'column_name')->where('entity_id', $entity->id),
            ],
            'label' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:50'],
            'nullable' => ['boolean'],
            'required' => ['boolean'],
            'default_value' => ['nullable', 'string'],
            'list_visible' => ['boolean'],
            'detail_visible' => ['boolean'],
            'is_searchable' => ['boolean'],
            'is_sortable' => ['boolean'],
            'sort_order' => ['integer'],
            'mcp_readable' => ['boolean'],
            'mcp_writable' => ['boolean'],
        ]);

        $data['entity_id'] = $entity->id;

        $field = SectionField::create($data);

        return response()->json($field, 201);
    }

    public function update(Request $request, SectionEntity $entity, SectionField $field)
    {
        abort_unless($field->entity_id === $entity->id, 404);

        $data = $request->validate([
            'column_name' => [
                'sometimes',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('section_fields', 'column_name')
                    ->where('entity_id', $entity->id)
                    ->ignore($field->id),
            ],
            'label' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', 'string', 'max:50'],
            'nullable' => ['sometimes', 'boolean'],
            'required' => ['sometimes', 'boolean'],
            'default_value' => ['sometimes', 'nullable', 'string'],
            'list_visible' => ['sometimes', 'boolean'],
            'detail_visible' => ['sometimes', 'boolean'],
            'is_searchable' => ['sometimes', 'boolean'],
            'is_sortable' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer'],
            'mcp_readable' => ['sometimes', 'boolean'],
            'mcp_writable' => ['sometimes', 'boolean'],
        ]);

        $field->fill($data);
        $field->save();

        return response()->json($field);
    }

    public function reorder(Request $request, SectionEntity $entity)
    {
        $data = $request->validate([
            'order' => ['required', 'array'],
            'order.*.id' => ['required', 'integer', 'exists:section_fields,id'],
            'order.*.sort_order' => ['required', 'integer'],
        ]);

        foreach ($data['order'] as $item) {
            SectionField::where('entity_id', $entity->id)
                ->where('id', $item['id'])
                ->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json(['status' => 'ok']);
    }
}

