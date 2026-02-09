<?php

namespace App\Http\Controllers\SectionBuilder;

use App\Http\Controllers\Controller;
use App\Models\SectionEntity;
use App\Services\SchemaSyncService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SectionBuilderController extends Controller
{
    /**
     * Display the Section Builder main page and ensure schema is in sync.
     */
    public function index(Request $request, SchemaSyncService $schemaSyncService)
    {
        // Avoid heavy sync on every request; refresh periodically instead.
        $schemaSyncService->syncIfStale();

        $entities = SectionEntity::query()
            ->withCount('fields')
            ->orderBy('name')
            ->get();

        // Pass initial props to the Blade view so the React app can hydrate with server data.
        return view('admin', [
            'initialProps' => [
                'entities' => $entities,
            ],
        ]);
    }
}

