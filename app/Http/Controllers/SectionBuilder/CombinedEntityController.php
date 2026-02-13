<?php

namespace App\Http\Controllers\SectionBuilder;

use App\Http\Controllers\Controller;
use App\Services\DynamicEntityService;
use Illuminate\Http\Request;

class CombinedEntityController extends Controller
{
    public function __construct(protected DynamicEntityService $service)
    {
    }

    /**
     * Generic endpoint: ek hi API se 2 entities ka data.
     *
     * Example:
     *   GET /api/section-builder/entities-combined/posts/categories
     *
     * Yahan "posts" aur "categories" Section Editor ke entity slug
     * ya table name ho sakte hain.
     */
    public function index(Request $request, string $first, string $second)
    {
        // First entity resolve + data
        $firstEntity = $this->service->resolveEntity($first);
        abort_unless($firstEntity, 404, "Entity not found: {$first}");

        $firstData = $this->service->index($firstEntity, $request, ['actor' => 'user']);

        // Second entity resolve + data
        $secondEntity = $this->service->resolveEntity($second);
        abort_unless($secondEntity, 404, "Entity not found: {$second}");

        $secondData = $this->service->index($secondEntity, $request, ['actor' => 'user']);

        return response()->json([
            'first' => [
                'entity' => $firstEntity->only(['id', 'name', 'table_name', 'slug']),
                'data' => $firstData,
            ],
            'second' => [
                'entity' => $secondEntity->only(['id', 'name', 'table_name', 'slug']),
                'data' => $secondData,
            ],
        ]);
    }
}

