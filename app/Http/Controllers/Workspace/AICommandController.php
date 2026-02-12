<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\AIConversation;
use App\Models\AIConversationEvent;
use App\Models\AICommandApproval;
use App\Models\Workspace;
use App\Services\AI\AIManager;
use App\Support\ResolvesWorkspacePaths;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Validation\ValidationException;

class AICommandController extends Controller
{
    use AuthorizesRequests;
    use ResolvesWorkspacePaths;

    private array $allowedExtensions;
    private bool $allowExtensionless;

    public function __construct(
        protected AIManager $aiManager,
        private Filesystem $fs
    )
    {
        $this->allowedExtensions = config('workspaces.allowed_extensions', []);
        $this->allowExtensionless = (bool) config('workspaces.allow_extensionless', true);
    }

    /**
     * Non-streaming AI chat endpoint (legacy/fallback)
     */
    public function chat(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $request->validate([
            'message' => 'required|string',
            'endpoint_id' => 'nullable|exists:ai_endpoints,id',
            'model_id' => 'nullable|string',
            'ui_target' => 'nullable|in:ask,react,html,blade',
            'current_file' => 'nullable|array',
            'open_files' => 'nullable|array'
        ]);

        try {
            $result = $this->aiManager->chatWithCode([
                'message' => $request->message,
                'endpoint_id' => $request->endpoint_id,
                'model_id' => $request->model_id ?? 'AUTO',
                'ui_target' => $request->input('ui_target', 'ask'),
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

    /**
     * Streaming AI chat endpoint using Server-Sent Events (SSE)
     * This prevents PHP timeouts and provides real-time UI updates
     */
    public function chatStream(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $request->validate([
            'message' => 'required|string',
            'endpoint_id' => 'nullable|exists:ai_endpoints,id',
            'model_id' => 'nullable|string',
            'conversation_id' => 'nullable|integer',
            'ui_target' => 'nullable|in:ask,react,html,blade',
            'current_file' => 'nullable|array',
            'open_files' => 'nullable|array'
        ]);

        // Prevent PHP timeout for long-running AI requests
        set_time_limit(0);
        // Important: allow client disconnect to abort work (supports cancel/interrupt)
        ignore_user_abort(false);

        $userId = auth()->id();
        $message = (string) $request->message;

        // Attach or create conversation
        $conversationId = $request->input('conversation_id');
        if ($conversationId) {
            $conversation = AIConversation::where('id', (int) $conversationId)
                ->where('workspace_id', $workspace->id)
                ->where('user_id', $userId)
                ->first();

            if (!$conversation) {
                return response()->json(['error' => 'Conversation not found'], 404);
            }
        } else {
            $conversation = AIConversation::create([
                'workspace_id' => $workspace->id,
                'user_id' => $userId,
                'title' => null,
                'endpoint_id' => $request->endpoint_id,
                'model_id' => $request->model_id ?? 'AUTO',
                'last_activity_at' => now(),
            ]);
        }

        // Make conversation available inside streaming closure
        $request->attributes->set('_ai_conversation', $conversation);

        // Persist user message event
        AIConversationEvent::create([
            'conversation_id' => $conversation->id,
            'type' => 'user_message',
            'payload' => [
                'message' => $message,
                'ui_target' => $request->input('ui_target', 'ask'),
            ],
        ]);
        $conversation->update(['last_activity_at' => now()]);

        // SSE headers
        return response()->stream(function () use ($request, $workspace, $conversation) {
            // Send headers for SSE
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('X-Accel-Buffering: no'); // Disable nginx buffering

            try {
                // Send initial connection success event
                $this->sendSSE('connected', [
                    'status' => 'connected',
                    'timestamp' => now()->toIso8601String(),
                    'conversation_id' => $conversation?->id,
                ]);

                // Stream AI response
                $this->aiManager->chatWithCodeStream([
                    'message' => $request->message,
                    'endpoint_id' => $request->endpoint_id,
                    'model_id' => $request->model_id ?? 'AUTO',
                    'ui_target' => $request->input('ui_target', 'ask'),
                    'current_file' => $request->current_file,
                    'open_files' => $request->open_files ?? [],
                    'workspace' => $workspace,
                    'user' => auth()->user(),
                    'should_stop' => function () use ($conversation) {
                        if (connection_aborted()) {
                            return true;
                        }
                        return (bool) cache()->get("ai_cancel:conversation:{$conversation->id}", false);
                    },
                ], function ($event, $data) use ($workspace, $conversation) {
                    // Stream callback - send each chunk to frontend
                    $this->sendSSE($event, $data);

                    // Persist high-signal events (avoid storing every chunk token)
                    if (in_array($event, ['status', 'tool_call', 'tool_result', 'turn_start', 'approval_required', 'error'], true)) {
                        AIConversationEvent::create([
                            'conversation_id' => $conversation->id,
                            'type' => $event,
                            'payload' => $data,
                        ]);
                        $conversation->update(['last_activity_at' => now()]);
                    }

                    if ($event === 'complete') {
                        AIConversationEvent::create([
                            'conversation_id' => $conversation->id,
                            'type' => 'assistant_message',
                            'payload' => [
                                'message' => $data['message'] ?? null,
                                'code_changes' => $data['code_changes'] ?? [],
                                'tool_calls' => $data['tool_calls'] ?? [],
                                'model_used' => $data['model_used'] ?? null,
                                'provider' => $data['provider'] ?? null,
                            ],
                        ]);
                        $conversation->update(['last_activity_at' => now()]);
                    }

                    if ($event === 'cancelled') {
                        AIConversationEvent::create([
                            'conversation_id' => $conversation->id,
                            'type' => 'cancelled',
                            'payload' => $data,
                        ]);
                        $conversation->update(['last_activity_at' => now()]);
                    }

                    // Emit incremental file tree patches (avoid full refresh)
                    if ($event === 'tool_result' && isset($data['result']['success']) && $data['result']['success']) {
                        $patch = $data['result']['fs_patch'] ?? null;
                        if (is_array($patch) && isset($patch['op'])) {
                            $payload = ['patches' => [$patch]];
                            $this->sendSSE('file_tree_changed', $payload);

                            AIConversationEvent::create([
                                'conversation_id' => $conversation->id,
                                'type' => 'file_tree_changed',
                                'payload' => $payload,
                            ]);
                            $conversation->update(['last_activity_at' => now()]);
                        }
                    }

                    // Handle code changes requiring approval
                    if ($event === 'complete' && !empty($data['code_changes'])) {
                        $approval = AICommandApproval::create([
                            'workspace_id' => $workspace->id,
                            'user_id' => auth()->id(),
                            'command_type' => 'file_edit',
                            'command' => $data['original_message'] ?? '',
                            'affected_files' => array_map(fn($c) => $c['path'], $data['code_changes']),
                            'new_content' => json_encode($data['code_changes']),
                            'ai_explanation' => $data['message'] ?? '',
                            'status' => 'pending'
                        ]);

                        $this->sendSSE('approval_required', [
                            'approval_id' => $approval->id,
                            'requires_approval' => true
                        ]);
                    }
                });

                // Send completion event
                $this->sendSSE('done', ['status' => 'completed']);

            } catch (\Exception $e) {
                // Send error event
                $this->sendSSE('error', [
                    'error' => $e->getMessage(),
                    'trace' => config('app.debug') ? $e->getTraceAsString() : null
                ]);
            }

            // Close connection
            ob_end_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no'
        ]);
    }

    /**
     * Send Server-Sent Event
     */
    protected function sendSSE(string $event, $data): void
    {
        echo "event: {$event}\n";
        echo "data: " . json_encode($data) . "\n\n";

        // Force flush to send data immediately
        if (ob_get_level() > 0) {
            ob_flush();
        }
        flush();
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

        if (!is_array($changes)) {
            return [['success' => false, 'error' => 'Invalid approval payload']];
        }

        foreach ($changes as $change) {
            if (!is_array($change) || !isset($change['path'])) {
                $results[] = ['success' => false, 'error' => 'Invalid change payload'];
                continue;
            }

            try {
                [$filePath, $relativePath] = $this->resolveWorkspacePath($workspace, (string) $change['path']);
                $content = (string) ($change['content'] ?? '');

                $this->assertExtensionAllowed($filePath);

                // Ensure directory exists
                $directory = dirname($filePath);
                if (!$this->fs->isDirectory($directory)) {
                    $this->fs->makeDirectory($directory, 0755, true);
                }

                $this->fs->put($filePath, $content, true);

                $results[] = [
                    'file' => $relativePath,
                    'success' => true
                ];
            } catch (\Exception $e) {
                $results[] = [
                    'file' => $change['path'] ?? null,
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }
        }

        return $results;
    }

    protected function assertExtensionAllowed(string $path): void
    {
        if (empty($this->allowedExtensions)) {
            return;
        }

        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        if ($ext === '' && $this->allowExtensionless) {
            return;
        }
        if ($ext === '' || !in_array($ext, $this->allowedExtensions, true)) {
            throw ValidationException::withMessages(['path' => 'File extension not allowed']);
        }
    }
}
