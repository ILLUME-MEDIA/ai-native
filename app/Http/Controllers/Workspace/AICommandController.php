<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\AICommandApproval;
use App\Models\Workspace;
use App\Services\AI\AIManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class AICommandController extends Controller
{
    use AuthorizesRequests;
    public function __construct(protected AIManager $aiManager)
    {
    }

    public function chat(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $request->validate([
            'message' => 'required|string',
            'endpoint_id' => 'nullable|exists:ai_endpoints,id',
            'model_id' => 'nullable|string',
            'current_file' => 'nullable|array',
            'open_files' => 'nullable|array'
        ]);

        try {
            $result = $this->aiManager->chatWithCode([
                'message' => $request->message,
                'endpoint_id' => $request->endpoint_id,
                'model_id' => $request->model_id ?? 'AUTO',
                'current_file' => $request->current_file,
                'open_files' => $request->open_files ?? [],
                'workspace' => $workspace,
                'user' => auth()->user()
            ]);

            // Check if changes require approval
            if (!empty($result['code_changes'])) {
                $approval = AICommandApproval::create([
                    'workspace_id' => $workspace->id,
                    'user_id' => auth()->id(),
                    'command_type' => 'file_edit',
                    'command' => $request->message,
                    'affected_files' => array_map(fn($c) => $c['path'], $result['code_changes']),
                    'new_content' => json_encode($result['code_changes']),
                    'ai_explanation' => $result['message'],
                    'status' => 'pending'
                ]);

                $result['approval_id'] = $approval->id;
                $result['requires_approval'] = true;
            }

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function pendingApprovals(Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $approvals = AICommandApproval::where('workspace_id', $workspace->id)
            ->pending()
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($approvals);
    }

    public function approve(AICommandApproval $approval)
    {
        $this->authorize('update', $approval->workspace);

        if (!$approval->canBeApproved()) {
            return response()->json(['error' => 'Cannot approve this command'], 400);
        }

        $approval->approve(auth()->id());

        // Execute the approved command
        $result = $this->executeApprovedCommand($approval);

        $approval->update(['execution_result' => $result]);

        return response()->json([
            'success' => true,
            'approval' => $approval,
            'result' => $result
        ]);
    }

    public function reject(Request $request, AICommandApproval $approval)
    {
        $this->authorize('update', $approval->workspace);

        $request->validate(['reason' => 'nullable|string']);

        if (!$approval->canBeApproved()) {
            return response()->json(['error' => 'Cannot reject this command'], 400);
        }

        $approval->reject(auth()->id(), $request->reason);

        return response()->json([
            'success' => true,
            'approval' => $approval
        ]);
    }

    protected function executeApprovedCommand(AICommandApproval $approval): array
    {
        $workspace = $approval->workspace;
        $changes = json_decode($approval->new_content, true);

        $results = [];

        foreach ($changes as $change) {
            try {
                $filePath = $workspace->full_path . '/' . ltrim($change['path'], '/');

                // Ensure directory exists
                $directory = dirname($filePath);
                if (!File::isDirectory($directory)) {
                    File::makeDirectory($directory, 0755, true);
                }

                File::put($filePath, $change['content']);

                $results[] = [
                    'file' => $change['path'],
                    'success' => true
                ];
            } catch (\Exception $e) {
                $results[] = [
                    'file' => $change['path'],
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }
        }

        return $results;
    }
}
