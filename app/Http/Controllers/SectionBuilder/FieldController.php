<?php

namespace App\Http\Controllers\SectionBuilder;

use App\Http\Controllers\Controller;
use App\Models\SectionEntity;
use App\Models\SectionField;
use App\Services\DynamicEntityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class FieldController extends Controller
{
    public function __construct(protected DynamicEntityService $entityService)
    {
    }
    
    /**
     * Resolve entity by ID, slug, or table name - auto-creates if table exists.
     */
    protected function resolveEntity($entity): SectionEntity
    {
        $resolved = null;
        
        if (is_numeric($entity)) {
            $resolved = SectionEntity::find($entity);
        } else {
            // Try slug or table name
            $resolved = SectionEntity::where('slug', $entity)
                ->orWhere('table_name', $entity)
                ->first();
        }
        
        // If not found but table exists in database, auto-create it
        if (!$resolved && Schema::hasTable($entity)) {
            $resolved = $this->entityService->resolveEntity($entity);
        }
        
        if (!$resolved) {
            abort(404, "Entity not found: {$entity}");
        }
        
        return $resolved;
    }
    
    public function index($entity)
    {
        $resolved = $this->resolveEntity($entity);
        $resolved->load('fields');

        return response()->json($resolved->fields);
    }

    public function store(Request $request, $entity)
    {
        $resolved = $this->resolveEntity($entity);
        $data = $request->validate([
            'column_name' => [
                'required',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('section_fields', 'column_name')->where('entity_id', $resolved->id),
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

        $data['entity_id'] = $resolved->id;

        $field = SectionField::create($data);

        return response()->json($field, 201);
    }

    public function update(Request $request, $entity, SectionField $field)
    {
        $resolved = $this->resolveEntity($entity);
        abort_unless($field->entity_id === $resolved->id, 404);

        $data = $request->validate([
            'column_name' => [
                'sometimes',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('section_fields', 'column_name')
                    ->where('entity_id', $resolved->id)
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

        // Agar column_name change hua hai to database column bhi rename karo
        if (isset($data['column_name']) && $data['column_name'] !== $field->column_name) {
            $tableName  = $resolved->table_name;
            $oldColumn  = $field->column_name;
            $newColumn  = $data['column_name'];

            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, $oldColumn)) {
                Schema::table($tableName, function (\Illuminate\Database\Schema\Blueprint $table) use ($oldColumn, $newColumn) {
                    $table->renameColumn($oldColumn, $newColumn);
                });
            }
        }

        $field->fill($data);
        $field->save();

        return response()->json($field);
    }

    public function reorder(Request $request, $entity)
    {
        $resolved = $this->resolveEntity($entity);
        
        $data = $request->validate([
            'order' => ['required', 'array'],
            'order.*.id' => ['required', 'integer', 'exists:section_fields,id'],
            'order.*.sort_order' => ['required', 'integer'],
        ]);

        foreach ($data['order'] as $item) {
            SectionField::where('entity_id', $resolved->id)
                ->where('id', $item['id'])
                ->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json(['status' => 'ok']);
    }
}

