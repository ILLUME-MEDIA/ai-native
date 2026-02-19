<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\DataSource;
use App\Services\DataSync\DataSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DataSourceController extends Controller
{
    public function __construct(private readonly DataSyncService $syncService) {}

    // ── CRUD ─────────────────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        $sources = DataSource::withCount('logs')
            ->orderBy('name')
            ->get();

        return response()->json($sources);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $data['slug'] = Str::slug($data['name']);

        // Ensure slug uniqueness
        $base = $data['slug'];
        $i    = 1;
        while (DataSource::where('slug', $data['slug'])->exists()) {
            $data['slug'] = $base . '-' . $i++;
        }

        $source = DataSource::create($data);
        return response()->json($source, 201);
    }

    public function show(DataSource $dataSource): JsonResponse
    {
        return response()->json($dataSource->load('logs'));
    }

    public function update(Request $request, DataSource $dataSource): JsonResponse
    {
        $data = $request->validate($this->rules('update'));
        $dataSource->update($data);
        return response()->json($dataSource);
    }

    public function destroy(DataSource $dataSource): JsonResponse
    {
        $dataSource->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    // ── Sync ─────────────────────────────────────────────────────────────

    public function sync(DataSource $dataSource): JsonResponse
    {
        if ($dataSource->sync_status === 'syncing') {
            return response()->json(['message' => 'Sync already in progress.'], 409);
        }

        if (!$dataSource->is_active) {
            return response()->json(['message' => 'Source is inactive.'], 422);
        }

        try {
            $result = $this->syncService->sync($dataSource);
            return response()->json([
                'message'     => 'Sync completed.',
                'imported'    => $result['imported'],
                'skipped'     => $result['skipped'],
                'failed'      => $result['failed'],
                'duration_ms' => $result['durationMs'],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Sync failed: ' . $e->getMessage()], 500);
        }
    }

    public function logs(DataSource $dataSource): JsonResponse
    {
        $logs = $dataSource->logs()->limit(20)->get();
        return response()->json($logs);
    }

    // ── Validation ───────────────────────────────────────────────────────

    private function rules(string $mode = 'create'): array
    {
        $req = $mode === 'create' ? 'required' : 'sometimes';
        return [
            'name'        => "{$req}|string|max:200",
            'description' => 'nullable|string|max:500',
            'type'        => "{$req}|in:local_table,api",
            'config'      => 'nullable|array',
            'is_active'   => 'boolean',
        ];
    }
}
