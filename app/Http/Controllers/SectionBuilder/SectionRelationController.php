<?php

namespace App\Http\Controllers\SectionBuilder;

use App\Http\Controllers\Controller;
use App\Models\SectionEntity;
use App\Models\SectionRelation;
use Illuminate\Http\Request;

class SectionRelationController extends Controller
{
    public function index($entityId)
    {
        $entity = SectionEntity::findOrFail($entityId);

        $relations = SectionRelation::where('parent_entity_id', $entity->id)
            ->with(['childEntity:id,name,table_name'])
            ->orderBy('id')
            ->get();

        return response()->json($relations);
    }

    public function store(Request $request, $entityId)
    {
        $entity = SectionEntity::findOrFail($entityId);

        $data = $request->validate([
            'child_entity_id'  => ['required', 'integer', 'exists:section_entities,id'],
            'relation_type'    => ['required', 'in:hasMany,hasOne,belongsTo,belongsToMany'],
            'foreign_key'      => ['nullable', 'string', 'max:64'],
            'local_key'        => ['nullable', 'string', 'max:64'],
            'pivot_table'      => ['nullable', 'string', 'max:128'],
            'mcp_traversable'  => ['sometimes', 'boolean'],
        ]);

        $data['parent_entity_id'] = $entity->id;

        $relation = SectionRelation::create($data);
        $relation->load('childEntity:id,name,table_name');

        return response()->json($relation, 201);
    }

    public function update(Request $request, $entityId, $relationId)
    {
        $entity   = SectionEntity::findOrFail($entityId);
        $relation = SectionRelation::where('parent_entity_id', $entity->id)->findOrFail($relationId);

        $data = $request->validate([
            'child_entity_id'  => ['sometimes', 'integer', 'exists:section_entities,id'],
            'relation_type'    => ['sometimes', 'in:hasMany,hasOne,belongsTo,belongsToMany'],
            'foreign_key'      => ['nullable', 'string', 'max:64'],
            'local_key'        => ['nullable', 'string', 'max:64'],
            'pivot_table'      => ['nullable', 'string', 'max:128'],
            'mcp_traversable'  => ['sometimes', 'boolean'],
        ]);

        $relation->update($data);
        $relation->load('childEntity:id,name,table_name');

        return response()->json($relation);
    }

    public function destroy($entityId, $relationId)
    {
        $entity   = SectionEntity::findOrFail($entityId);
        $relation = SectionRelation::where('parent_entity_id', $entity->id)->findOrFail($relationId);
        $relation->delete();

        return response()->json(['message' => 'Deleted.']);
    }
}
