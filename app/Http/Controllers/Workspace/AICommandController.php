<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\AIConversation;
use App\Models\AIConversationEvent;
use App\Models\AICommandApproval;
use App\Models\Workspace;
use App\Services\AI\AIManager;
use App\Services\AI\AIOrchestrator;
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
        protected AIOrchestrator $orchestrator,
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
     * C-02: Whiteboard sketch-to-code conversion
     * Accepts an SVG string from Excalidraw and returns AI-generated code.
     */
    public function sketchToCode(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $data = $request->validate([
            'svg'    => 'required|string|max:200000',
            'format' => 'required|in:react,css,tokens',
        ]);

        $prompts = [
            'react'  => "Convert this SVG wireframe/sketch into a React functional component using JSX and Tailwind CSS utility classes. Return ONLY the component code — no markdown fences, no explanations.",
            'css'    => "Convert this SVG wireframe/sketch into a complete CSS stylesheet that recreates the layout and visual style. Return ONLY the CSS — no markdown fences, no explanations.",
            'tokens' => "Extract all design tokens (colours, spacing values, font sizes, border radii, shadows) visible in this SVG sketch and output them as CSS custom properties (--token-name: value). Return ONLY the :root { } block — no markdown fences, no explanations.",
        ];

        $prompt = $prompts[$data['format']] . "\n\nSVG sketch:\n" . mb_substr($data['svg'], 0, 12000);

        try {
            $result = $this->aiManager->chatWithCode([
                'message'     => $prompt,
                'endpoint_id' => null,
                'model_id'    => 'AUTO',
                'ui_target'   => 'ask',
                'workspace'   => $workspace,
                'open_files'  => [],
            ]);

            $code = $this->stripFences($result['text'] ?? '');

            return response()->json(['success' => true, 'code' => $code]);
        } catch (\Exception) {
            return response()->json(['success' => false, 'code' => '', 'error' => 'AI conversion failed'], 500);
        }
    }

    /**
     * B-06: AI Inline Ghost Text completion
     * Takes cursor position + file content, returns a short code completion.
     */
    public function complete(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $data = $request->validate([
            'path'    => 'required|string',
            'content' => 'required|string',
            'line'    => 'required|integer|min:1',
            'column'  => 'required|integer|min:1',
        ]);

        // Build context: last 40 lines before cursor + current line prefix
        $allLines  = preg_split('/\r\n|\r|\n/', $data['content']);
        $lineIdx   = $data['line'] - 1;
        $col       = max(0, $data['column'] - 1);

        $beforeLines       = array_slice($allLines, max(0, $lineIdx - 40), min($lineIdx, 40));
        $currentLinePrefix = substr($allLines[$lineIdx] ?? '', 0, $col);
        $contextBefore     = implode("\n", $beforeLines) . "\n" . $currentLinePrefix;

        // Include a small look-ahead so the model knows what comes after
        $afterLines    = array_slice($allLines, $lineIdx + 1, 8);
        $contextAfter  = implode("\n", $afterLines);

        $prompt = <<<EOT
Code completion task. Return ONLY the text to insert at <cursor>. No explanations, no markdown fences, no extra lines.

File: {$data['path']}

Code before cursor:
{$contextBefore}<cursor>

Code after cursor:
{$contextAfter}
EOT;

        try {
            $result     = $this->aiManager->chatWithCode([
                'message'     => $prompt,
                'endpoint_id' => null,
                'model_id'    => 'AUTO',
                'ui_target'   => 'ask',
                'workspace'   => $workspace,
                'open_files'  => [],
            ]);

            $completion = $this->stripFences($result['text'] ?? '');

            return response()->json(['success' => true, 'completion' => trim($completion)]);
        } catch (\Exception) {
            return response()->json(['success' => false, 'completion' => '']);
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
            'message'         => 'nullable|string',
            'endpoint_id'     => 'nullable|exists:ai_endpoints,id',
            'model_id'        => 'nullable|string',
            'conversation_id' => 'nullable|integer',
            'ui_target'       => 'nullable|in:ask,react,html,blade',
            'agent_mode'      => 'nullable|in:coder,architect,reviewer,debugger,documenter,refactorer,security',
            'current_file'    => 'nullable|array',
            'open_files'      => 'nullable|array',
            'pinned_context'  => 'nullable|array',
            'images'          => 'nullable|array',
            'images.*.name'   => 'nullable|string|max:255',
            'images.*.data'   => 'nullable|string|max:20971520', // 20 MB base64
            'images.*.mime'   => 'nullable|string|max:50',
        ]);

        // Prevent PHP timeout for long-running AI requests
        set_time_limit(0);
        // Allow client disconnect to stop the agent (cancel/new-message scenario).
        // The should_stop callback checks connection_aborted() so cancellation still works.
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

        // Auto-generate title from first user message if not set
        if (!$conversation->title) {
            $autoTitle = mb_substr(trim($message), 0, 60);
            if (mb_strlen($message) > 60) {
                $autoTitle = mb_substr($autoTitle, 0, mb_strrpos($autoTitle, ' ') ?: 60) . '…';
            }
            $conversation->update(['title' => $autoTitle, 'last_activity_at' => now()]);
        } else {
            $conversation->update(['last_activity_at' => now()]);
        }

        // Classify message before streaming (orchestration)
        $classification = $this->orchestrator->classify($message);
        $orchestratorAddendum = $this->orchestrator->getOrchestratorSystemAddendum(
            $classification['needs_planning'],
            $classification['is_vague']
        );

        // Append agent mode addendum
        $agentMode = $request->input('agent_mode', 'coder');
        $modeAddendum = $this->orchestrator->getModeSystemAddendum($agentMode);
        if ($modeAddendum) {
            $orchestratorAddendum = $modeAddendum . ($orchestratorAddendum ? "\n\n" . $orchestratorAddendum : '');
        }

        // A-01: Inject .airules project rules file if it exists
        $airulesPath = rtrim($workspace->full_path, '/\\') . '/.airules';
        $airulesContent = @file_get_contents($airulesPath);
        if ($airulesContent !== false) {
            $airulesContent = trim($airulesContent);
            if ($airulesContent !== '') {
                $projectRulesAddendum = "## PROJECT RULES (.airules)\nThe following rules are specific to this project and must be followed at all times:\n{$airulesContent}";
                $orchestratorAddendum = $projectRulesAddendum . ($orchestratorAddendum ? "\n\n" . $orchestratorAddendum : '');
            }
        }

        // Release session lock BEFORE streaming — otherwise every concurrent
        // request (file tree, conversation list, etc.) blocks on the session row.
        $request->session()->save();

        // SSE headers
        return response()->stream(function () use ($request, $workspace, $conversation, $orchestratorAddendum) {
            // ob_implicit_flush: makes each flush() call go directly to the SAPI output.
            // On cPanel (output_buffering=4096), sendSSE() already calls ob_flush()+flush()
            // after every event — so buffering is handled per-event, not here.
            // Do NOT call ob_end_flush() here: it would send buffered headers to the client
            // making subsequent header() calls emit "headers already sent" warnings that
            // corrupt the SSE stream.
            @ob_implicit_flush(true);

            try {
                // Send initial connection success event
                $this->sendSSE('connected', [
                    'status' => 'connected',
                    'timestamp' => now()->toIso8601String(),
                    'conversation_id' => $conversation?->id,
                ]);

                // Chunk buffer for first-line prefix detection (PLAN: / CLARIFY:)
                $chunkBuffer = '';
                $prefixResolved = false;

                // Stream AI response
                $this->aiManager->chatWithCodeStream([
                    'message' => (string) ($request->message ?? ''),
                    'endpoint_id' => $request->endpoint_id,
                    'model_id' => $request->model_id ?? 'AUTO',
                    'ui_target' => $request->input('ui_target', 'ask'),
                    'current_file' => $request->current_file,
                    'open_files' => $request->open_files ?? [],
                    'pinned_context' => $request->pinned_context ?? [],
                    'images' => $request->input('images', []),
                    'workspace' => $workspace,
                    'user' => auth()->user(),
                    'extra_system' => $orchestratorAddendum,
                    'conversation_obj' => $conversation,
                    'should_stop' => function () use ($conversation) {
                        if (connection_aborted()) {
                            return true;
                        }
                        return (bool) cache()->get("ai_cancel:conversation:{$conversation->id}", false);
                    },
                ], function ($event, $data) use ($workspace, $conversation, &$chunkBuffer, &$prefixResolved) {
                    // ── Chunk buffering: intercept until first newline for prefix detection ──
                    if ($event === 'chunk' && !$prefixResolved) {
                        $chunkBuffer .= $data['text'] ?? '';

                        if (!str_contains($chunkBuffer, "\n")) {
                            return; // Still building the first line — don't forward yet
                        }

                        $prefixResolved = true;
                        $firstLineEnd = strpos($chunkBuffer, "\n");
                        $firstLine = substr($chunkBuffer, 0, $firstLineEnd);

                        // Check CLARIFY: prefix
                        $clarify = $this->orchestrator->parseClarifyPrefix($firstLine);
                        if ($clarify) {
                            $this->sendSSE('clarification_needed', $clarify);
                            AIConversationEvent::create([
                                'conversation_id' => $conversation->id,
                                'type' => 'clarification_needed',
                                'payload' => $clarify,
                            ]);
                            $conversation->update(['last_activity_at' => now()]);
                            $chunkBuffer = ''; // Discard the prefix line
                            return;
                        }

                        // Check PLAN: prefix
                        $plan = $this->orchestrator->parsePlanPrefix($firstLine);
                        if ($plan) {
                            $taskList = $this->orchestrator->createTaskList($conversation->id, $plan['tasks']);
                            $payload = [
                                'task_list_id' => $taskList->id,
                                'tasks' => $taskList->tasks->map(fn($t) => [
                                    'id'          => $t->id,
                                    'title'       => $t->title,
                                    'description' => $t->description,
                                    'status'      => $t->status,
                                ])->toArray(),
                            ];
                            $this->sendSSE('plan_created', $payload);
                            AIConversationEvent::create([
                                'conversation_id' => $conversation->id,
                                'type' => 'plan_created',
                                'payload' => $payload,
                            ]);
                            $conversation->update(['last_activity_at' => now()]);

                            // Forward remainder (text after the PLAN: line)
                            $rest = ltrim(substr($chunkBuffer, $firstLineEnd + 1));
                            if ($rest !== '') {
                                $this->sendSSE('chunk', ['text' => $rest]);
                            }
                            $chunkBuffer = '';
                            return;
                        }

                        // No recognized prefix — forward everything buffered as a normal chunk
                        $this->sendSSE('chunk', ['text' => $chunkBuffer]);
                        $chunkBuffer = '';
                        return;
                    }

                    // ── For non-chunk events, flush any remaining buffer first ──
                    if (!$prefixResolved && $chunkBuffer !== '') {
                        $prefixResolved = true;
                        $this->sendSSE('chunk', ['text' => $chunkBuffer]);
                        $chunkBuffer = '';
                    }

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

            // Final flush — suppress warning if no ob level exists
            if (ob_get_level() > 0) { @ob_end_flush(); }
            @flush();
        }, 200, [
            'Content-Type'               => 'text/event-stream',
            'Cache-Control'              => 'no-cache',
            'Connection'                 => 'keep-alive',
            'X-Accel-Buffering'          => 'no',
            'X-LiteSpeed-Cache-Control'  => 'no-store',
        ]);
    }

    /**
     * Strip accidental markdown code fences from AI output.
     */
    private function stripFences(string $text): string
    {
        $text = preg_replace('/^```[a-z]*\n?/i', '', $text);
        $text = preg_replace('/\n?```$/i', '', $text);
        return trim($text);
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

    /**
     * A-04: AI Code Review — returns structured findings for the given file.
     */
    public function review(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $data = $request->validate([
            'path'    => 'required|string',
            'content' => 'required|string|max:500000',
        ]);

        $systemPrompt = <<<'SYS'
## AGENT MODE: CODE REVIEWER
You are acting as a Senior Code Reviewer. Analyse the provided code for bugs, security vulnerabilities (OWASP Top 10), performance issues, and code smells.

Return ONLY a valid JSON array of findings. Each finding must have:
- "line": integer (line number, or null if file-level)
- "severity": one of "critical", "error", "warning", "info"
- "message": string (concise description of the issue)
- "suggestion": string (how to fix it, in plain text)
- "fix_diff": string or null (optional: show the corrected code snippet)

Example output:
[{"line":42,"severity":"error","message":"SQL injection risk","suggestion":"Use parameter binding","fix_diff":null}]

Return ONLY the JSON array. No markdown fences, no preamble, no explanation outside the array.
SYS;

        $userPrompt = $systemPrompt . "\n\nReview this file and return ONLY the JSON array of findings:\n\nFile: {$data['path']}\n\n```\n" . mb_substr($data['content'], 0, 80000) . "\n```";

        try {
            $result = $this->aiManager->chatWithCode([
                'message'     => $userPrompt,
                'endpoint_id' => null,
                'model_id'    => 'AUTO',
                'ui_target'   => 'ask',
                'workspace'   => $workspace,
                'open_files'  => [],
            ]);

            $text = $this->stripFences($result['text'] ?? '');

            $findings = json_decode($text, true);
            if (!is_array($findings)) {
                $findings = [];
            }

            return response()->json(['findings' => $findings]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage(), 'findings' => []], 500);
        }
    }

    /**
     * E-03: AI-Assisted Merge Conflict Resolution
     * Takes both sides of a conflict and returns an AI-proposed merged result.
     */
    public function resolveConflict(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $data = $request->validate([
            'ours'           => 'required|string|max:50000',
            'theirs'         => 'required|string|max:50000',
            'context_before' => 'nullable|string|max:20000',
            'context_after'  => 'nullable|string|max:20000',
            'file_path'      => 'nullable|string|max:500',
        ]);

        $contextBefore = $data['context_before'] ?? '';
        $contextAfter  = $data['context_after']  ?? '';
        $filePath      = $data['file_path']       ?? 'unknown';

        $prompt = <<<EOT
You are a senior developer resolving a Git merge conflict.

File: {$filePath}

Context before the conflict:
```
{$contextBefore}
```

CURRENT branch (ours):
```
{$data['ours']}
```

INCOMING branch (theirs):
```
{$data['theirs']}
```

Context after the conflict:
```
{$contextAfter}
```

Provide the best merged resolution that preserves the intent of both sides. Return ONLY the merged code — no explanations, no markdown fences, no conflict markers. Just the resolved code that should replace the entire conflict block.
EOT;

        try {
            $result = $this->aiManager->chatWithCode([
                'message'     => $prompt,
                'endpoint_id' => null,
                'model_id'    => 'AUTO',
                'ui_target'   => 'ask',
                'workspace'   => $workspace,
                'open_files'  => [],
            ]);

            $resolved = $this->stripFences($result['text'] ?? '');

            return response()->json(['resolved' => $resolved]);
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

        // Execute the approved command — writes files immediately
        $result = $this->executeApprovedCommand($approval);

        $approval->update(['execution_result' => $result]);

        $writtenFiles = collect($result)
            ->where('success', true)
            ->pluck('file')
            ->filter()
            ->values()
            ->toArray();

        return response()->json([
            'success'       => true,
            'approval'      => $approval,
            'result'        => $result,
            'written_files' => $writtenFiles,
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

                // Guard: never overwrite an existing file with empty content —
                // this prevents data loss when the AI puts code in the chat
                // message instead of in the code_changes[].content field.
                if ($content === '' && $this->fs->exists($filePath)) {
                    $results[] = [
                        'file'    => $relativePath,
                        'success' => false,
                        'error'   => 'Approval has no content — file not overwritten. Re-ask the AI to regenerate the file.',
                    ];
                    continue;
                }

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
