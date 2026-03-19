<?php

namespace App\Http\Controllers\SectionBuilder;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\SectionEntity;
use App\Models\YelpAccount;
use App\Models\YelpClosedBusiness;
use App\Models\YelpJob;
use App\Models\YelpJobLog;
use App\Models\YelpMatchDiff;
use App\Models\YelpMatchMenuItem;
use App\Models\YelpNotFoundBusiness;
use App\Models\YelpRowLog;
use App\Services\YelpService;
use App\Services\YelpSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class YelpController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // Accounts
    // ─────────────────────────────────────────────────────────────────────────

    public function accountsIndex(): JsonResponse
    {
        $accounts = YelpAccount::all()->map(function ($a) {
            $a->resetIfStale();
            $a->refresh();
            return array_merge($a->toArray(), [
                'api_key'            => '•••••••••••••••',
                'remaining_requests' => $a->remaining_requests,
            ]);
        });

        return response()->json($accounts);
    }

    public function accountsStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'api_key'     => ['required', 'string'],
            'daily_limit' => ['required', 'integer', 'min:1', 'max:100000'],
            'is_active'   => ['boolean'],
        ]);

        $account = YelpAccount::create($data);

        return response()->json(array_merge($account->toArray(), ['api_key' => '•••••••••••••••']), 201);
    }

    public function accountsUpdate(Request $request, YelpAccount $account): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['sometimes', 'string', 'max:255'],
            'api_key'     => ['sometimes', 'string'],
            'daily_limit' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'is_active'   => ['sometimes', 'boolean'],
        ]);

        $account->update($data);
        $account->resetIfStale();
        $account->refresh();

        return response()->json(array_merge($account->toArray(), [
            'api_key'            => '•••••••••••••••',
            'remaining_requests' => $account->remaining_requests,
        ]));
    }

    public function accountsDestroy(YelpAccount $account): JsonResponse
    {
        $account->delete();
        return response()->json(['status' => 'deleted']);
    }

    public function accountsReveal(YelpAccount $account): JsonResponse
    {
        return response()->json(['api_key' => $account->api_key]);
    }

    /**
     * Verify a Yelp API key by making a lightweight test search.
     * Accepts either a saved account ID or a raw api_key string.
     */
    public function accountsVerify(Request $request): JsonResponse
    {
        $apiKey = null;

        if ($request->filled('account_id')) {
            $account = YelpAccount::findOrFail($request->account_id);
            $apiKey  = $account->api_key;
        } elseif ($request->filled('api_key')) {
            $apiKey = $request->api_key;
        } else {
            return response()->json(['error' => 'Provide account_id or api_key.'], 422);
        }

        $yelp   = new YelpService($apiKey);
        $result = $yelp->searchBusiness('coffee', 'New York, NY', 1);

        if ($result && isset($result['id'])) {
            return response()->json(['status' => 'valid', 'message' => 'API key is working correctly.']);
        }

        return response()->json(['status' => 'invalid', 'message' => 'API key is invalid or has no quota remaining.'], 422);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Jobs
    // ─────────────────────────────────────────────────────────────────────────

    public function jobsIndex(): JsonResponse
    {
        $jobs = YelpJob::with(['entity:id,name,table_name', 'latestLog'])->get();
        return response()->json($jobs);
    }

    public function jobsStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                => ['required', 'string', 'max:255'],
            'entity_id'           => ['required', 'integer', 'exists:section_entities,id'],
            'search_columns'               => ['required', 'array'],
            'search_columns.term'          => ['required', 'string'],
            'search_columns.address'       => ['sometimes', 'nullable', 'string'],
            'search_columns.city'          => ['sometimes', 'nullable', 'string'],
            'search_columns.state'         => ['sometimes', 'nullable', 'string'],
            'search_columns.zip'           => ['sometimes', 'nullable', 'string'],
            'search_columns.country'       => ['sometimes', 'nullable', 'string'],
            'search_columns.country_value' => ['sometimes', 'nullable', 'string'],
            'column_mapping'      => ['required', 'array', 'min:1'],
            'schedule'            => ['required', 'string'],
            'mode'                => ['sometimes', 'in:smart,full,verify_only'],
            'auto_merge'          => ['sometimes', 'boolean'],
            'is_active'           => ['boolean'],
            'max_calls_per_run'   => ['sometimes', 'integer', 'min:0'],
        ]);

        $job = YelpJob::create($data);
        $job->updateNextRunAt();

        return response()->json($job->load('entity:id,name,table_name'), 201);
    }

    public function jobsUpdate(Request $request, YelpJob $job): JsonResponse
    {
        $data = $request->validate([
            'name'              => ['sometimes', 'string', 'max:255'],
            'entity_id'         => ['sometimes', 'integer', 'exists:section_entities,id'],
            'search_columns'               => ['sometimes', 'array'],
            'search_columns.term'          => ['sometimes', 'required_with:search_columns', 'string'],
            'search_columns.address'       => ['sometimes', 'nullable', 'string'],
            'search_columns.city'          => ['sometimes', 'nullable', 'string'],
            'search_columns.state'         => ['sometimes', 'nullable', 'string'],
            'search_columns.zip'           => ['sometimes', 'nullable', 'string'],
            'search_columns.country'       => ['sometimes', 'nullable', 'string'],
            'search_columns.country_value' => ['sometimes', 'nullable', 'string'],
            'column_mapping'    => ['sometimes', 'array'],
            'schedule'          => ['sometimes', 'string'],
            'mode'              => ['sometimes', 'in:smart,full,verify_only'],
            'auto_merge'        => ['sometimes', 'boolean'],
            'is_active'         => ['sometimes', 'boolean'],
            'max_calls_per_run' => ['sometimes', 'integer', 'min:0'],
        ]);

        $job->update($data);
        $job->updateNextRunAt();

        return response()->json($job->load('entity:id,name,table_name'));
    }

    public function jobsDestroy(YelpJob $job): JsonResponse
    {
        $job->delete();
        return response()->json(['status' => 'deleted']);
    }

    /**
     * Run a job in the background (dispatched after HTTP response).
     * Returns immediately with the log record so the frontend can start polling.
     */
    public function jobsRun(YelpJob $job): JsonResponse
    {
        // Prevent duplicate runs — return existing active log if already running/pending
        $existing = YelpJobLog::where('job_id', $job->id)
            ->whereIn('status', ['running', 'pending'])
            ->latest()
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Job is already running.', 'log' => $existing], 409);
        }

        // Check if any account has quota
        $hasQuota = YelpAccount::where('is_active', true)->get()
            ->contains(fn ($a) => $a->hasQuota());

        if (!$hasQuota) {
            return response()->json(['error' => 'No Yelp account has remaining quota for today.'], 422);
        }

        $log = YelpJobLog::create([
            'job_id'     => $job->id,
            'status'     => 'pending',
            'started_at' => now(),
        ]);

        // Run after HTTP response is sent, directly in the terminating phase
        // (not via queue — works regardless of QUEUE_CONNECTION setting).
        app()->terminating(function () use ($job, $log) {
            try {
                (new YelpSyncService())->run($job, $log);
            } catch (\Throwable $e) {
                $log->update([
                    'status'        => 'failed',
                    'error_message' => $e->getMessage(),
                    'completed_at'  => now(),
                ]);
            }
        });

        return response()->json($log->fresh());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Logs
    // ─────────────────────────────────────────────────────────────────────────

    public function logsIndex(Request $request): JsonResponse
    {
        $query = YelpJobLog::with(['job:id,name', 'account:id,name'])
            ->latest();

        if ($request->filled('job_id')) {
            $query->where('job_id', $request->job_id);
        }

        $logs = $query->paginate(50);
        return response()->json($logs);
    }

    /** Get a single log's current state (for progress polling) */
    public function logProgress(YelpJobLog $log): JsonResponse
    {
        $log->refresh();
        return response()->json($log);
    }

    /** Get per-row logs for a given job log (paginated, 100/page) */
    public function logRows(Request $request, YelpJobLog $log): JsonResponse
    {
        $query = YelpRowLog::where('log_id', $log->id)->orderBy('id');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $rows = $query->paginate(100);
        return response()->json($rows);
    }

    /** Full detail for a single row: row log + match diff (source payload, yelp payload, diffs) */
    public function rowDetail(YelpJobLog $log, int $rowId): JsonResponse
    {
        $rowLog = YelpRowLog::where('log_id', $log->id)
            ->where('row_id', $rowId)
            ->first();

        $diff = YelpMatchDiff::where('log_id', $log->id)
            ->where('source_row_id', $rowId)
            ->first();

        // For skipped/not-found rows there is no diff, so source_payload is null.
        // Fall back to fetching the live row directly from the source table.
        $sourcePayload = $diff?->source_payload;
        if ($sourcePayload === null && $rowLog) {
            $log->loadMissing('job.entity');
            $tableName = $log->job?->entity?->table_name;
            if ($tableName && Schema::hasTable($tableName)) {
                $liveRow = DB::table($tableName)->where('id', $rowId)->first();
                if ($liveRow) {
                    $sourcePayload = (array) $liveRow;
                }
            }
        }

        return response()->json([
            'row_log'        => $rowLog,
            'source_payload' => $sourcePayload,
            'yelp_payload'   => $diff?->yelp_payload,
            'field_diffs'    => $diff?->field_diffs,
            'mapped_updates' => $diff?->mapped_updates,
            'merge_status'   => $diff?->merge_status,
            'yelp_business_id'   => $diff?->yelp_business_id,
            'yelp_business_name' => $diff?->yelp_business_name,
        ]);
    }

    /** Signal a running log to stop. Force-sets status to paused for any stuck/orphaned jobs. */
    public function logStop(YelpJobLog $log): JsonResponse
    {
        $log->update([
            'stop_requested_at' => now()->toISOString(),
            'status'            => 'paused',
            'completed_at'      => now()->toISOString(),
        ]);

        return response()->json(['status' => 'stopped']);
    }

    public function reconciliationSummary(Request $request): JsonResponse
    {
        $jobId = $request->integer('job_id');

        $diffQuery = YelpMatchDiff::query();
        $closedQuery = YelpClosedBusiness::query();
        $notFoundQuery = YelpNotFoundBusiness::query();
        $menuQuery = YelpMatchMenuItem::query();

        if ($jobId) {
            $diffQuery->where('job_id', $jobId);
            $closedQuery->where('job_id', $jobId);
            $notFoundQuery->where('job_id', $jobId);
            $menuQuery->where('job_id', $jobId);
        }

        $skippedSyncQuery = YelpRowLog::whereHas('log', fn ($q) => $q->when($jobId, fn ($q2) => $q2->where('job_id', $jobId)))
            ->where('status', 'skipped');

        return response()->json([
            'pending_diffs'    => (clone $diffQuery)->where('merge_status', 'pending')->count(),
            'merged_diffs'     => (clone $diffQuery)->where('merge_status', 'merged')->count(),
            'skipped_diffs'    => (clone $diffQuery)->where('merge_status', 'skipped')->count(),
            'closed_rows'      => $closedQuery->count(),
            'not_found_rows'   => $notFoundQuery->count(),
            'skipped_sync_rows'=> $skippedSyncQuery->count(),
            'menu_items'       => $menuQuery->count(),
        ]);
    }

    public function reconciliationMatches(Request $request): JsonResponse
    {
        $query = YelpMatchDiff::with('job:id,name')->withCount('menuItems')->latest();

        if ($request->filled('job_id')) {
            $query->where('job_id', $request->integer('job_id'));
        }

        if ($request->filled('merge_status')) {
            $query->where('merge_status', $request->string('merge_status'));
        }

        return response()->json($query->paginate(100));
    }

    public function reconciliationMenuItems(Request $request): JsonResponse
    {
        $query = YelpMatchMenuItem::with('matchDiff:id,job_id,source_table,source_row_id,yelp_business_name')
            ->orderByDesc('id');

        if ($request->filled('job_id')) {
            $query->where('job_id', $request->integer('job_id'));
        }

        if ($request->filled('source_row_id')) {
            $query->where('source_row_id', $request->integer('source_row_id'));
        }

        return response()->json($query->paginate(200));
    }

    public function reconciliationClosed(Request $request): JsonResponse
    {
        $query = YelpClosedBusiness::with('job:id,name')->latest();

        if ($request->filled('job_id')) {
            $query->where('job_id', $request->integer('job_id'));
        }

        return response()->json($query->paginate(100));
    }

    public function reconciliationNotFound(Request $request): JsonResponse
    {
        $query = YelpNotFoundBusiness::with('job:id,name')->latest();

        if ($request->filled('job_id')) {
            $query->where('job_id', $request->integer('job_id'));
        }

        return response()->json($query->paginate(100));
    }

    public function reconciliationSkipped(Request $request): JsonResponse
    {
        $jobId = $request->integer('job_id');

        $query = YelpRowLog::with(['log:id,job_id'])
            ->whereHas('log', fn ($q) => $q->when($jobId, fn ($q2) => $q2->where('job_id', $jobId)))
            ->where('status', 'skipped')
            ->orderByDesc('id');

        return response()->json($query->paginate(100));
    }

    public function reconciliationMerge(Request $request): JsonResponse
    {
        $data = $request->validate([
            'job_id'      => ['required', 'integer', 'exists:yelp_jobs,id'],
            'match_ids'   => ['sometimes', 'array'],
            'match_ids.*' => ['integer', 'exists:yelp_match_diffs,id'],
            'all_pending' => ['sometimes', 'boolean'],
        ]);

        $query = YelpMatchDiff::where('job_id', $data['job_id']);

        if (!empty($data['match_ids'])) {
            $query->whereIn('id', $data['match_ids']);
        } elseif (($data['all_pending'] ?? true) === true) {
            $query->where('merge_status', 'pending');
        }

        $rows = $query->get();
        $merged = 0;
        $skipped = 0;
        $failed = 0;
        $menuInserted = 0;
        $menuUpdated = 0;

        foreach ($rows as $row) {
            $updates = $row->mapped_updates ?? [];

            try {
                if (!Schema::hasTable($row->source_table)) {
                    $row->update([
                        'merge_status' => 'skipped',
                        'merge_note'   => "Source table `{$row->source_table}` no longer exists.",
                    ]);
                    $skipped++;
                    continue;
                }

                $exists = DB::table($row->source_table)
                    ->where('id', $row->source_row_id)
                    ->exists();

                if (!$exists) {
                    $row->update([
                        'merge_status' => 'skipped',
                        'merge_note'   => 'Source row no longer exists.',
                    ]);
                    $skipped++;
                    continue;
                }

                if (Schema::hasColumn($row->source_table, 'yelp_verified')) {
                    $updates['yelp_verified'] = 1;
                }

                if (!empty($updates)) {
                    DB::table($row->source_table)
                        ->where('id', $row->source_row_id)
                        ->update($updates);
                }

                $menuResult = $this->mergeMenuForDiff($row);
                $menuInserted += $menuResult['inserted'];
                $menuUpdated += $menuResult['updated'];

                $noteParts = [];
                if (empty($updates)) {
                    $noteParts[] = 'No column diff updates.';
                }
                if ($menuResult['skipped'] > 0) {
                    $noteParts[] = "Menu skipped: {$menuResult['skipped']}.";
                }
                if (!empty($menuResult['message'])) {
                    $noteParts[] = $menuResult['message'];
                }

                $row->update([
                    'merge_status' => 'merged',
                    'merge_note'   => empty($noteParts) ? null : implode(' ', $noteParts),
                    'merged_at'    => now(),
                ]);
                $merged++;
            } catch (\Throwable $e) {
                $row->update([
                    'merge_status' => 'skipped',
                    'merge_note'   => $e->getMessage(),
                ]);
                $failed++;
            }
        }

        return response()->json([
            'status'  => 'ok',
            'total'   => $rows->count(),
            'merged'  => $merged,
            'skipped' => $skipped,
            'failed'  => $failed,
            'menu_inserted' => $menuInserted,
            'menu_updated' => $menuUpdated,
        ]);
    }

    protected function mergeMenuForDiff(YelpMatchDiff $row): array
    {
        $menuRows = YelpMatchMenuItem::where('match_diff_id', $row->id)
            ->orderBy('sort_order')
            ->get();

        if ($menuRows->isEmpty()) {
            return ['inserted' => 0, 'updated' => 0, 'skipped' => 0, 'message' => 'No Yelp menu snapshot found.'];
        }

        if (!Schema::hasTable('menu_items') || !Schema::hasTable('menu_categories') || !Schema::hasTable('businesses')) {
            return ['inserted' => 0, 'updated' => 0, 'skipped' => $menuRows->count(), 'message' => 'Menu tables are not available.'];
        }

        $businessId = $menuRows->firstWhere('business_id', '!=', null)?->business_id;
        if (!$businessId && Schema::hasTable($row->source_table) && Schema::hasColumn($row->source_table, 'business_id')) {
            $businessId = DB::table($row->source_table)->where('id', $row->source_row_id)->value('business_id');
        }
        if (!$businessId && $row->source_table === 'businesses') {
            $businessId = $row->source_row_id;
        }
        if (!$businessId || !DB::table('businesses')->where('id', $businessId)->exists()) {
            return ['inserted' => 0, 'updated' => 0, 'skipped' => $menuRows->count(), 'message' => 'business_id not mapped for menu merge.'];
        }

        $inserted = 0;
        $updated = 0;
        $skipped = 0;

        $hasYelpBusinessId = Schema::hasColumn('menu_items', 'yelp_business_id');
        $hasYelpMenuItemId = Schema::hasColumn('menu_items', 'yelp_menu_item_id');
        $hasYelpSourceTable = Schema::hasColumn('menu_items', 'yelp_source_table');
        $hasYelpSourceRow = Schema::hasColumn('menu_items', 'yelp_source_row_id');
        $hasYelpSyncedAt = Schema::hasColumn('menu_items', 'yelp_synced_at');
        $hasModifiersJson = Schema::hasColumn('menu_items', 'modifiers_json');

        foreach ($menuRows as $menuRow) {
            $categoryName = trim((string) ($menuRow->category ?: 'Yelp Imported'));
            $category = MenuCategory::firstOrCreate(
                ['business_id' => $businessId, 'name' => $categoryName],
                ['description' => 'Imported from Yelp', 'sort_order' => 0, 'is_active' => true]
            );

            $payload = [
                'business_id' => $businessId,
                'menu_category_id' => $category->id,
                'name' => $menuRow->name,
                'description' => $menuRow->description,
                'price' => $menuRow->price ?? 0,
                'image' => $menuRow->image,
                'is_available' => $menuRow->is_available,
            ];

            if ($hasYelpBusinessId) {
                $payload['yelp_business_id'] = $menuRow->yelp_business_id;
            }
            if ($hasYelpMenuItemId) {
                $payload['yelp_menu_item_id'] = $menuRow->yelp_menu_item_id;
            }
            if ($hasYelpSourceTable) {
                $payload['yelp_source_table'] = $menuRow->source_table;
            }
            if ($hasYelpSourceRow) {
                $payload['yelp_source_row_id'] = $menuRow->source_row_id;
            }
            if ($hasYelpSyncedAt) {
                $payload['yelp_synced_at'] = now();
            }
            if ($hasModifiersJson && $menuRow->modifiers_json !== null) {
                $payload['modifiers_json'] = is_array($menuRow->modifiers_json)
                    ? json_encode($menuRow->modifiers_json)
                    : $menuRow->modifiers_json;
            }

            $existingQuery = MenuItem::where('business_id', $businessId);
            if ($menuRow->yelp_menu_item_id && $hasYelpMenuItemId) {
                $existingQuery->where('yelp_menu_item_id', $menuRow->yelp_menu_item_id);
                if ($menuRow->yelp_business_id && $hasYelpBusinessId) {
                    $existingQuery->where('yelp_business_id', $menuRow->yelp_business_id);
                }
            } else {
                $existingQuery->where('name', $menuRow->name)
                    ->where('menu_category_id', $category->id);
            }

            $existing = $existingQuery->first();
            if ($existing) {
                $existing->update($payload);
                $updated++;
            } else {
                MenuItem::create($payload);
                $inserted++;
            }
        }

        return ['inserted' => $inserted, 'updated' => $updated, 'skipped' => $skipped, 'message' => null];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Meta
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * On-demand: scrape Yelp menu page for a given alias.
     * POST /api/yelp/scrape-menu   { alias: "mirchi-cafe-fremont" }
     */
    public function scrapeMenu(Request $request): JsonResponse
    {
        $alias = $request->validate(['alias' => ['required', 'string', 'max:255']])['alias'];

        $items = (new \App\Services\YelpScraperService())->scrapeMenu($alias);

        $categories = collect($items)->pluck('category')->filter()->unique()->values();

        return response()->json([
            'alias'       => $alias,
            'item_count'  => count($items),
            'categories'  => $categories,
            'items'       => $items,
        ]);
    }

    /** Return all available Yelp fields for the mapping UI */
    public function yelpFields(): JsonResponse
    {
        return response()->json(YelpService::availableFields());
    }

    /** Return all SectionEntities with their columns (always fresh from DB schema). */
    public function entities(): JsonResponse
    {
        $entities = SectionEntity::select('id', 'name', 'table_name')->get();

        if ($entities->isEmpty()) {
            return response()->json([]);
        }

        $db     = DB::connection()->getDatabaseName();
        $tables = $entities->pluck('table_name')->toArray();
        $in     = implode(',', array_fill(0, count($tables), '?'));

        $rows = DB::select(
            "SELECT table_name, column_name
             FROM information_schema.columns
             WHERE table_schema = ? AND table_name IN ({$in})
             ORDER BY table_name, ordinal_position",
            array_merge([$db], $tables)
        );

        $byTable = collect($rows)->groupBy(
            fn ($c) => strtolower($c->table_name ?? $c->TABLE_NAME ?? '')
        );

        $result = $entities->map(function ($entity) use ($byTable) {
            $cols   = $byTable->get(strtolower($entity->table_name), collect());
            $fields = $cols->values()->map(fn ($c) => [
                'id'          => null,
                'entity_id'   => $entity->id,
                'column_name' => $c->column_name ?? $c->COLUMN_NAME,
                'label'       => ucwords(str_replace('_', ' ', $c->column_name ?? $c->COLUMN_NAME)),
                'type'        => 'text',
            ]);
            return array_merge($entity->toArray(), ['fields' => $fields]);
        });

        return response()->json($result);
    }
}
