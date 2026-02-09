<?php

namespace App\Http\Controllers\Mcp;

use App\Http\Controllers\Controller;
use App\Services\DynamicEntityService;
use App\Models\SectionEntity;
use Illuminate\Http\Request;

class McpEntityController extends Controller
{
    public function __construct(protected DynamicEntityService $service)
    {
    }

    public function list()
    {
        $entities = SectionEntity::with('fields')
            ->where('mcp_enabled', true)
            ->get();

        return response()->json($entities);
    }

    public function schema(string $entity)
    {
        $resolved = $this->service->resolveEntity($entity);

        abort_unless($resolved && $resolved->mcp_enabled, 404);

        $resolved->load('fields');

        return response()->json($resolved);
    }

    public function query(Request $request, string $entity)
    {
        $resolved = $this->service->resolveEntity($entity);

        abort_unless($resolved && $resolved->mcp_enabled && $resolved->mcp_can_read, 403);

        $paginator = $this->service->index($resolved, $request, ['actor' => 'mcp']);

        return response()->json($paginator);
    }

    public function store(Request $request, string $entity)
    {
        $resolved = $this->service->resolveEntity($entity);

        abort_unless($resolved && $resolved->mcp_enabled && $resolved->mcp_can_create, 403);

        $record = $this->service->store($resolved, $request->all(), ['actor' => 'mcp']);

        return response()->json($record, 201);
    }

    public function update(Request $request, string $entity, int $id)
    {
        $resolved = $this->service->resolveEntity($entity);

        abort_unless($resolved && $resolved->mcp_enabled && $resolved->mcp_can_update, 403);

        $record = $this->service->update($resolved, $id, $request->all(), ['actor' => 'mcp']);

        return response()->json($record);
    }

    public function destroy(Request $request, string $entity, int $id)
    {
        $resolved = $this->service->resolveEntity($entity);

        abort_unless($resolved && $resolved->mcp_enabled && $resolved->mcp_can_delete, 403);

        $this->service->destroy($resolved, $id, ['actor' => 'mcp']);

        return response()->noContent();
    }
}

