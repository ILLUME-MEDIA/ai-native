<?php

namespace App\Services;

use App\Models\SectionEntity;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Schema;

class DynamicEntityService
{
    public function resolveEntity(string $slugOrTable): ?SectionEntity
    {
        return SectionEntity::with('fields')
            ->where('slug', $slugOrTable)
            ->orWhere('table_name', $slugOrTable)
            ->first();
    }

    public function index(SectionEntity $entity, Request $request, array $context = []): LengthAwarePaginator
    {
        if (! Schema::hasTable($entity->table_name)) {
            throw new \RuntimeException("Table [{$entity->table_name}] does not exist. Create it via Section Builder or run migrations.");
        }

        $model = $this->makeBaseQuery($entity, $context);

        $this->applySearch($model, $entity, $request->string('search')->toString());
        $this->applySorting($model, $entity, $request->string('sort')->toString(), $request->string('direction')->toString());

        $perPage = (int) $request->input('per_page', 15);

        return $model->paginate($perPage);
    }

    public function show(SectionEntity $entity, int|string $id, array $context = [])
    {
        if (! Schema::hasTable($entity->table_name)) {
            throw new \RuntimeException("Table [{$entity->table_name}] does not exist.");
        }

        /** @var Builder $model */
        $model = $this->makeBaseQuery($entity, $context);

        return $model->findOrFail($id);
    }

    public function store(SectionEntity $entity, array $payload, array $context = [])
    {
        if (! Schema::hasTable($entity->table_name)) {
            throw new \RuntimeException("Table [{$entity->table_name}] does not exist.");
        }

        $modelClass = $this->resolveModelClass($entity);

        $fillable = $this->writableFields($entity, $context);
        $data = Arr::only($payload, $fillable);

        return $modelClass->newQuery()->create($data);
    }

    public function update(SectionEntity $entity, int|string $id, array $payload, array $context = [])
    {
        if (! Schema::hasTable($entity->table_name)) {
            throw new \RuntimeException("Table [{$entity->table_name}] does not exist.");
        }

        $modelClass = $this->resolveModelClass($entity);
        $record = $modelClass->newQuery()->findOrFail($id);

        $fillable = $this->writableFields($entity, $context);
        $data = Arr::only($payload, $fillable);

        $record->fill($data);
        $record->save();

        return $record;
    }

    public function destroy(SectionEntity $entity, int|string $id, array $context = []): void
    {
        if (! Schema::hasTable($entity->table_name)) {
            throw new \RuntimeException("Table [{$entity->table_name}] does not exist.");
        }

        $modelClass = $this->resolveModelClass($entity);
        $record = $modelClass->newQuery()->findOrFail($id);

        $record->delete();
    }

    protected function makeBaseQuery(SectionEntity $entity, array $context = []): Builder
    {
        $modelClass = $this->resolveModelClass($entity);

        /** @var Builder $query */
        $query = $modelClass->newQuery();

        // MCP context: restrict selected fields to MCP-readable only
        if (Arr::get($context, 'actor') === 'mcp') {
            $selectable = $entity->fields
                ->where('mcp_readable', true)
                ->pluck('column_name')
                ->all();

            if (!empty($selectable)) {
                $query->select($selectable);
            }
        }

        return $query;
    }

    protected function applySearch(Builder $query, SectionEntity $entity, ?string $term): void
    {
        if (!$term) {
            return;
        }

        $searchable = $entity->fields->where('is_searchable', true)->pluck('column_name')->all();

        if (empty($searchable)) {
            return;
        }

        $query->where(function (Builder $inner) use ($searchable, $term) {
            foreach ($searchable as $col) {
                $inner->orWhere($col, 'like', "%{$term}%");
            }
        });
    }

    protected function applySorting(Builder $query, SectionEntity $entity, ?string $sort, ?string $direction): void
    {
        if (! $sort) {
            $sort = $entity->default_sort_field ?? 'id';
        }

        $direction = in_array(strtolower($direction ?? ''), ['asc', 'desc'], true) ? $direction : 'asc';

        $sortableField = $entity->fields->where('column_name', $sort)->where('is_sortable', true)->first();
        $columnExists = Schema::hasTable($entity->table_name) && Schema::hasColumn($entity->table_name, $sort);
        if ($sortableField || $columnExists) {
            $query->orderBy($sort, $direction);
        }
    }

    /**
     * Resolve the underlying Eloquent model for an entity.
     * For now, we use the query builder directly on the table; this can later be
     * evolved to custom model classes per entity if needed.
     */
    protected function resolveModelClass(SectionEntity $entity)
    {
        // Use an anonymous model bound to the entity's table.
        $instance = new class extends \Illuminate\Database\Eloquent\Model {};
        $instance->setTable($entity->table_name);

        return $instance;
    }

    /**
     * Determine which fields can be written in the current context.
     */
    protected function writableFields(SectionEntity $entity, array $context = []): array
    {
        $fields = $entity->fields;

        if (Arr::get($context, 'actor') === 'mcp') {
            $fields = $fields->where('mcp_writable', true);
        }

        return $fields->pluck('column_name')->all();
    }
}

