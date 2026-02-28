<?php

namespace App\Http\Controllers;

use App\Models\SectionEntity;
use App\Services\DynamicEntityService;
use Illuminate\Http\Request;

class DynamicEntityController extends Controller
{
    public function __construct(protected DynamicEntityService $service)
    {
    }

    protected function resolveEntityOrFail(string $entity): SectionEntity
    {
        $resolved = $this->service->resolveEntity($entity);

        abort_unless($resolved, 404);

        return $resolved;
    }

    public function index(Request $request, string $entity)
    {
        $resolved = $this->resolveEntityOrFail($entity);

        try {
            $paginator = $this->service->index($resolved, $request, ['actor' => 'user']);
            return response()->json($paginator);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'message' => config('app.debug') ? $e->getMessage() : 'Failed to load entity data.',
            ], 500);
        }
    }

    public function show(Request $request, string $entity, int $id)
    {
        $resolved = $this->resolveEntityOrFail($entity);
        try {
            $record = $this->service->show($resolved, $id, ['actor' => 'user']);
            return response()->json($record);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => config('app.debug') ? $e->getMessage() : 'Failed to load record.'], 500);
        }
    }

    /**
     * GET /api/entities/{entity}/by/{field}/{value}
     * Fetch a single record by any field — e.g. /api/entities/users/by/email/john@example.com
     */
    public function showByField(Request $request, string $entity, string $field, string $value)
    {
        $resolved = $this->resolveEntityOrFail($entity);
        try {
            $record = $this->service->showByField($resolved, $field, $value, ['actor' => 'user']);
            return response()->json($record);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => config('app.debug') ? $e->getMessage() : 'Failed to load record.'], 500);
        }
    }

    public function store(Request $request, string $entity)
    {
        $resolved = $this->resolveEntityOrFail($entity);
        try {
            $record = $this->service->store($resolved, $request->all(), ['actor' => 'user']);
            return response()->json($record, 201);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => config('app.debug') ? $e->getMessage() : 'Failed to create record.'], 500);
        }
    }

    public function update(Request $request, string $entity, int $id)
    {
        $resolved = $this->resolveEntityOrFail($entity);
        try {
            $record = $this->service->update($resolved, $id, $request->all(), ['actor' => 'user']);
            return response()->json($record);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => config('app.debug') ? $e->getMessage() : 'Failed to update record.'], 500);
        }
    }

    public function destroy(Request $request, string $entity, int $id)
    {
        $resolved = $this->resolveEntityOrFail($entity);
        try {
            $this->service->destroy($resolved, $id, ['actor' => 'user']);
            return response()->noContent();
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => config('app.debug') ? $e->getMessage() : 'Failed to delete record.'], 500);
        }
    }
}

