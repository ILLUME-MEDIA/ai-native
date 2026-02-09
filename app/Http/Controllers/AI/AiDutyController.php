<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Models\AiDuty;
use App\Services\AI\DutyExecutionService;
use App\Jobs\ExecuteAiDutyJob;
use Illuminate\Http\Request;

class AiDutyController extends Controller
{
    public function __construct(protected DutyExecutionService $dutyService)
    {
    }

    public function index()
    {
        return response()->json(
            AiDuty::query()
                ->select([
                    'id', 'name', 'description', 'schedule_type', 'schedule_value',
                    'is_active', 'priority', 'status', 'last_executed_at', 'next_execution_at',
                    'execution_count', 'success_count', 'failure_count', 'error_message',
                ])
                ->orderBy('priority', 'desc')
                ->limit(200)
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'description' => 'nullable|string',
            'instructions' => 'required|string',
            'schedule_type' => 'required|in:interval,daily,weekly,monthly,cron',
            'schedule_value' => 'nullable|string',
            'is_active' => 'boolean',
            'priority' => 'integer',
        ]);

        $duty = AiDuty::create($validated);
        $duty->update(['next_execution_at' => $duty->calculateNextExecution()]);

        return response()->json($duty, 201);
    }

    public function show(AiDuty $duty)
    {
        return response()->json($duty);
    }

    public function update(Request $request, AiDuty $duty)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'description' => 'nullable|string',
            'instructions' => 'sometimes|string',
            'schedule_type' => 'sometimes|in:interval,daily,weekly,monthly,cron',
            'schedule_value' => 'nullable|string',
            'is_active' => 'boolean',
            'priority' => 'integer',
        ]);

        $duty->update($validated);
        $duty->update(['next_execution_at' => $duty->calculateNextExecution()]);

        return response()->json($duty);
    }

    public function destroy(AiDuty $duty)
    {
        $duty->delete();
        return response()->noContent();
    }

    /**
     * Trigger a duty execution manually (asynchronous)
     */
    public function execute(AiDuty $duty)
    {
        ExecuteAiDutyJob::dispatch($duty);
        return response()->json(['message' => "Duty [{$duty->name}] scheduled for execution."]);
    }

    /**
     * Trigger a duty execution synchronously (for instant feedback)
     */
    public function executeNow(AiDuty $duty)
    {
        try {
            $result = $this->dutyService->execute($duty);
            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
