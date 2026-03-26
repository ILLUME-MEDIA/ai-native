<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\AITask;
use App\Models\Workspace;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class AITaskController extends Controller
{
    use AuthorizesRequests;

    public function pause(Workspace $workspace, AITask $task)
    {
        $this->authorize('update', $workspace);
        $this->ensureBelongs($task, $workspace);
        $task->update(['status' => 'paused']);
        return response()->json(['id' => $task->id, 'status' => $task->status]);
    }

    public function resume(Workspace $workspace, AITask $task)
    {
        $this->authorize('update', $workspace);
        $this->ensureBelongs($task, $workspace);
        $task->update(['status' => 'pending']);
        return response()->json(['id' => $task->id, 'status' => $task->status]);
    }

    public function skip(Workspace $workspace, AITask $task)
    {
        $this->authorize('update', $workspace);
        $this->ensureBelongs($task, $workspace);
        $task->update(['status' => 'skipped']);
        return response()->json(['id' => $task->id, 'status' => $task->status]);
    }

    public function rerun(Workspace $workspace, AITask $task)
    {
        $this->authorize('update', $workspace);
        $this->ensureBelongs($task, $workspace);
        $task->update(['status' => 'pending', 'result' => null]);
        return response()->json(['id' => $task->id, 'status' => $task->status]);
    }

    private function ensureBelongs(AITask $task, Workspace $workspace): void
    {
        $wsId = $task->taskList?->conversation?->workspace_id;
        if ($wsId !== $workspace->id) {
            abort(403, 'Task does not belong to this workspace');
        }
    }
}
