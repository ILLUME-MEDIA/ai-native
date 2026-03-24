<?php

namespace App\Http\Controllers;

use App\Models\SectionEntity;
use App\Services\DynamicEntityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

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

        // Debug: ?debug_search=1 returns which columns will be searched
        if ($request->boolean('debug_search') && $request->filled('search')) {
            return response()->json(
                $this->service->debugSearch($resolved, $request->string('search')->toString())
            );
        }

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
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Record not found.'], 404);
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
            $result = $this->service->showByField($resolved, $field, $value, ['actor' => 'user']);

            // Numeric → single record; string keyword → collection of matches
            if ($result instanceof \Illuminate\Support\Collection) {
                return response()->json(['data' => $result->values(), 'total' => $result->count()]);
            }

            return response()->json($result);
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
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Record not found.'], 404);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => config('app.debug') ? $e->getMessage() : 'Failed to update record.'], 500);
        }
    }

    /**
     * GET /api/entities/{entity}/relation-debug
     * Shows exact relationship field config and whether FK columns exist.
     */
    public function relationDebug(Request $request, string $entity)
    {
        $resolved = $this->resolveEntityOrFail($entity);
        $resolved->load(['fields' => fn($q) => $q->with('relatedEntity:id,name,table_name')]);

        $relationFields = $resolved->fields->filter(fn($f) => $f->related_entity_id);

        $result = $relationFields->map(function ($f) use ($resolved) {
            $relatedTable = $f->relatedEntity?->table_name;
            $effectiveFk  = $f->relation_display_column
                ?: (Str::singular($resolved->table_name) . '_id');

            $fkExistsInRelated  = $relatedTable ? Schema::hasColumn($relatedTable, $effectiveFk) : false;

            // Sample 3 rows from related table to show available columns
            $sampleRow = $relatedTable && Schema::hasTable($relatedTable)
                ? (array) DB::table($relatedTable)->first()
                : null;

            // Count matching records for a quick sanity check (use first 5 local ids)
            $sampleLocalKeys = DB::table($resolved->table_name)->limit(5)->pluck(
                $this->service->detectPk($resolved->table_name)
            )->all();

            $matchCount = ($relatedTable && $fkExistsInRelated)
                ? DB::table($relatedTable)->whereIn($effectiveFk, $sampleLocalKeys)->count()
                : null;

            return [
                'field_id'                      => $f->id,
                'column_name'                   => $f->column_name,
                'type'                          => $f->type,
                'relation_type'                 => $f->relation_type,
                'related_entity_id'             => $f->related_entity_id,
                'related_entity_name'           => $f->relatedEntity?->name,
                'related_table'                 => $relatedTable,
                'relation_display_column_saved' => $f->relation_display_column,
                'effective_fk_used'             => $effectiveFk,
                'fk_column_exists'              => $fkExistsInRelated,
                'sample_related_columns'        => $sampleRow ? array_keys($sampleRow) : null,
                'matches_in_first_5_records'    => $matchCount,
                'diagnosis'                     => ! $fkExistsInRelated
                    ? "❌ FK column [{$effectiveFk}] NOT FOUND in [{$relatedTable}]. Fix: set 'Foreign Key Column' in Section Builder."
                    : ($matchCount === 0
                        ? "⚠️  FK column exists but 0 matches found for sample records."
                        : "✅ OK — {$matchCount} matches found in first 5 records."),
            ];
        })->values();

        return response()->json([
            'entity'          => $resolved->table_name,
            'relation_fields' => $result,
        ]);
    }

    public function destroy(Request $request, string $entity, int $id)
    {
        $resolved = $this->resolveEntityOrFail($entity);
        try {
            $this->service->destroy($resolved, $id, ['actor' => 'user']);
            return response()->json(['message' => 'Record deleted successfully.']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Record not found.'], 404);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => config('app.debug') ? $e->getMessage() : 'Failed to delete record.'], 500);
        }
    }
}

