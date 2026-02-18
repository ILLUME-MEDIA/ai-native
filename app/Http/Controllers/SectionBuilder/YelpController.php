<?php

namespace App\Http\Controllers\SectionBuilder;

use App\Http\Controllers\Controller;
use App\Models\SectionEntity;
use App\Models\YelpAccount;
use App\Models\YelpJob;
use App\Models\YelpJobLog;
use App\Models\YelpRowLog;
use App\Services\YelpService;
use App\Services\YelpSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            'search_columns'      => ['required', 'array'],
            'search_columns.term' => ['required', 'string'],
            'column_mapping'      => ['required', 'array', 'min:1'],
            'schedule'            => ['required', 'string'],
            'mode'                => ['sometimes', 'in:smart,full,verify_only'],
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
            'search_columns'    => ['sometimes', 'array'],
            'column_mapping'    => ['sometimes', 'array'],
            'schedule'          => ['sometimes', 'string'],
            'mode'              => ['sometimes', 'in:smart,full,verify_only'],
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

        // Run after the HTTP response is sent — no queue worker required.
        dispatch(function () use ($job, $log) {
            try {
                (new YelpSyncService())->run($job, $log);
            } catch (\Throwable $e) {
                $log->update([
                    'status'        => 'failed',
                    'error_message' => $e->getMessage(),
                    'completed_at'  => now(),
                ]);
            }
        })->afterResponse();

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

    /** Signal a running log to stop (sets stop_requested_at) */
    public function logStop(YelpJobLog $log): JsonResponse
    {
        if ($log->status !== 'running') {
            return response()->json(['error' => 'Job is not currently running.'], 422);
        }

        $log->update(['stop_requested_at' => now()->toISOString()]);
        return response()->json(['status' => 'stop_requested']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Meta
    // ─────────────────────────────────────────────────────────────────────────

    /** Return all available Yelp fields for the mapping UI */
    public function yelpFields(): JsonResponse
    {
        return response()->json(YelpService::availableFields());
    }

    /** Return all SectionEntities for the job creation dropdown */
    public function entities(): JsonResponse
    {
        $entities = SectionEntity::select('id', 'name', 'table_name')
            ->with('fields:id,entity_id,column_name,label,type')
            ->get();
        return response()->json($entities);
    }
}
