<?php

namespace App\Http\Controllers\SectionBuilder;

use App\Http\Controllers\Controller;
use App\Models\SectionEntity;
use App\Services\SchemaSyncService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SectionBuilderController extends Controller
{
    /**
     * Display the Section Builder main page and ensure schema is in sync.
     */
    public function index(Request $request, SchemaSyncService $schemaSyncService)
    {
        \Log::info('Admin route hit, Auth check: ' . (auth()->check() ? 'true' : 'false') . ', User: ' . (auth()->id() ?? 'null') . ', Session ID: ' . $request->session()->getId());

        // Ensure DB tables & Section Editor stay in sync whenever this page is opened.
        // TTL set to 0 so new tables appear immediately when you visit the page.
        $schemaSyncService->syncIfStale(0);

        $entities = SectionEntity::query()
            ->withCount('fields')
            ->orderBy('name')
            ->get();

        // Attach total row counts for each entity's underlying table so Section Editor
        // can display \"total records\" similar to a datatable summary.
        foreach ($entities as $entity) {
            $entity->total_rows = null;

            if (Schema::hasTable($entity->table_name)) {
                try {
                    $entity->total_rows = DB::table($entity->table_name)->count();
                } catch (\Throwable $e) {
                    // Fail softly – don't break the page if a table is misconfigured
                    $entity->total_rows = null;
                }
            }
        }

        // Pass initial props to the Blade view so the React app can hydrate with server data.
        // No-cache headers prevent the browser from serving a stale cached copy that
        // bypasses auth middleware and causes the session to appear invalid.
        return response()->view('admin', [
            'initialProps' => [
                'entities' => $entities,
            ],
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate')
          ->header('Pragma', 'no-cache')
          ->header('Expires', '0');
    }
}

