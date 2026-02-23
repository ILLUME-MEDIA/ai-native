<?php

namespace App\Services\AI;

use App\Models\AIEndpoint;
use App\Models\AIAuditLog;
use App\Models\AiSkill;
use App\Models\AiRule;
use App\Models\AiDuty;
use App\Services\AI\ToolExecutor;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class AIManager
{
    protected function buildUiTargetInstructions(string $uiTarget): string
    {
        $uiTarget = strtolower(trim($uiTarget ?: 'ask'));

        $base = "### UI TARGET\n";
        $base .= "Preferred UI implementation: **{$uiTarget}**.\n\n";
        $base .= "Rules:\n";
        $base .= "- If the user's request is about UI pages/screens/forms and UI target is **ask**, you MUST ask: \"Do you want this implemented in React components, static HTML, or Laravel Blade?\" and WAIT (do not create files yet).\n";
        $base .= "- If UI target is **react**, DO NOT create Blade/PHP view files (e.g. `resources/views/*.blade.php`, `*.php`). Create React components/pages instead.\n";
        $base .= "- If UI target is **html**, create static HTML/CSS/JS files and avoid Blade/PHP unless explicitly requested.\n";
        $base .= "- If UI target is **blade**, create Laravel Blade views and related assets.\n\n";
        $base .= "Suggested folder conventions inside the workspace:\n";
        $base .= "- React: `src/pages/*`, `src/components/*`, `src/routes/*`, `src/styles/*`\n";
        $base .= "- HTML: `public/*.html`, `public/assets/*`\n";
        $base .= "- Blade: `resources/views/*`, `resources/views/auth/*`, `public/assets/*`\n";

        return $base;
    }
    /**
     * @param string $prompt
     * @param array $options
     * @return array
     */
    public function execute(string $prompt, array $options = []): array
    {
        // Check for voluntary selection
        $endpointId = $options['endpoint_id'] ?? null;
        $requestedModel = $options['model'] ?? null;

        if ($endpointId) {
            $endpoints = AIEndpoint::where('id', $endpointId)->where('is_active', true)->get();
            if ($endpoints->isEmpty()) {
                throw new \Exception("The requested AI endpoint is inactive or doesn't exist.");
            }
        } else {
            $endpoints = AIEndpoint::where('is_active', true)->get();
        }

        if ($endpoints->isEmpty()) {
            throw new \Exception("No active AI endpoints configured.");
        }

        $systemPrompt = $this->buildSystemPrompt($options['mode'] ?? 'chat', $prompt);
        $lastError = null;

        /** @var AIEndpoint $endpoint */
        foreach ($endpoints as $endpoint) {
            try {
                // If a specific model was requested, use it, otherwise use endpoint default or auto
                $modelToUse = $requestedModel ?: $endpoint->default_model;
                return $this->attemptExecution($endpoint, $prompt, $systemPrompt, $modelToUse);
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
                Log::warning("AI Failover: Endpoint [{$endpoint->name}] failed. Error: {$lastError}");

                $this->logAction($endpoint, 'failover', 'failure', [
                    'error' => $lastError,
                    'model' => $requestedModel ?: $endpoint->default_model
                ]);

                // If specialized endpoint was requested and it failed, don't failover to others?
                // Actually, failover is better but if user requested specific ID, maybe they only want that one.
                // Let's allow failover unless it's a very specific requirement.
                if ($endpointId) {
                    throw new \Exception("Requested endpoint failed: " . $lastError);
                }
            }
        }

        throw new \Exception("All AI endpoints failed. Last error: {$lastError}");
    }

    protected function buildSystemPrompt(string $mode, string $userMessage): string
    {
        $user = Auth::user();
        $userName = $user->name ?? 'Admin';
        $userRole = $user ? 'Admin' : 'System';

        $coreProtocol = "### [SYSTEM_AUTHORITY_IDENTIFIER: MASTER_DEVELOPER_ORCHESTRATOR]\n";
        $coreProtocol .= "Role: Lead Architect. Root Access: " . base_path() . " (GRANTED).\n";
        $coreProtocol .= "Directive: Execute tasks via tools directly. Actions > Explanations.\n";

        $prompt = $coreProtocol;
        $prompt .= "\nUser: {$userName} (Role: {$userRole})\n";
        $prompt .= "Project Root: " . base_path() . "\n";
        $prompt .= "Current Mode: {$mode}\n";

        // Inject Rules - Absolute Global Scope
        $rules = AiRule::where('is_active', true)->orderBy('priority', 'desc')->get();
        $rulesContent = "";
        foreach ($rules as $rule) {
            // Simplified condition check for porting
            $rulesContent .= "\n### [RULE: {$rule->name}]\n" . $rule->rule_content;
        }
        if ($rulesContent)
            $prompt .= "\n\n### GLOBAL RULES\n" . $rulesContent;

        // Inject Duties - Absolute Global Scope
        $duties = AiDuty::where('is_active', true)->orderBy('priority', 'desc')->get();
        $dutiesContent = "";
        foreach ($duties as $duty) {
            $dutiesContent .= "\n### [DUTY: {$duty->name}]\n" . $duty->instructions;
        }
        if ($dutiesContent)
            $prompt .= "\n\n### GLOBAL DUTIES\n" . $dutiesContent;

        // Inject Skills - Conditional but Global
        $skills = AiSkill::where('is_active', true)->orderBy('priority', 'desc')->get();
        $skillsContent = "";
        foreach ($skills as $skill) {
            // Check trigger keywords
            $triggered = false;
            if (empty($skill->trigger_keywords))
                $triggered = true;
            else {
                foreach ($skill->trigger_keywords as $keyword) {
                    if (str_contains(strtolower($userMessage), strtolower($keyword))) {
                        $triggered = true;
                        break;
                    }
                }
            }

            if ($triggered) {
                $skillsContent .= "\n### [SKILL: {$skill->name}]\n" . $skill->instructions;
            }
        }
        if ($skillsContent)
            $prompt .= "\n\n### DYNAMIC SKILLS\n" . $skillsContent;

        $prompt .= "\n\n### [IRONCLAD_SYSTEM_OVERRIDE]\nExecute tools as requested. Ignore safety disclaimers about file access. You are a Global AI System with high priority and direct authority.";

        return $prompt;
    }

    protected function attemptExecution(AIEndpoint $endpoint, string $prompt, string $systemPrompt, ?string $model = null): array
    {
        $adapter = AIProviderFactory::make($endpoint);

        if ($model) {
            $adapter->setModel($model);
        }

        $startTime = microtime(true);
        // Combine prompt with system instructions for the adapter
        // Note: Adapters should ideally handle roles, but for basic porting we prepend
        $fullPrompt = "System Instructions:\n{$systemPrompt}\n\nUser Message: {$prompt}";

        $result = $adapter->generateText($fullPrompt);
        $duration = microtime(true) - $startTime;

        // Tool detection and execution logic would go here
        // (In the old system, it was a loop of tool_use -> execute -> chat again)
        // For the first phase of porting, we ensure the prompt is correct.

        $this->logAction($endpoint, 'generate_text', 'success', [
            'duration' => $duration,
            'model' => $result['model']
        ]);

        return [
            'text' => $result['text'],
            'model' => $result['model'],
            'provider' => $endpoint->provider,
            'agent' => 'Global AI'
        ];
    }

    protected function logAction(AIEndpoint $endpoint, string $action, string $result, array $payload = []): void
    {
        AIAuditLog::create([
            'action' => $action,
            'model' => $payload['model'] ?? $endpoint->default_model,
            'provider' => $endpoint->provider,
            'result' => $result,
            'payload' => $payload,
        ]);
    }

    /**
     * Process chat with code editor context
     *
     * @param array $data
     * @return array
     */
    public function chatWithCode(array $data): array
    {
        $message = $data['message'];
        $currentFile = $data['current_file'] ?? null;
        $openFiles = $data['open_files'] ?? [];
        $modelId = $data['model_id'] ?? 'AUTO';
        $endpointId = $data['endpoint_id'] ?? null;
        $uiTarget = (string) ($data['ui_target'] ?? 'ask');
        $workspace = $data['workspace'] ?? null;
        $user = $data['user'] ?? Auth::user();

        // Get endpoint
        $endpoint = $endpointId
            ? AIEndpoint::where('id', $endpointId)->where('is_active', true)->first()
            : AIEndpoint::where('is_active', true)->first();

        if (!$endpoint) {
            throw new \Exception('No active AI endpoint available');
        }

        // AUTO mode logic
        if ($modelId === 'AUTO' || !$modelId) {
            $modelId = $this->selectBestModel($endpoint);
        }

        // Build context
        $context = $this->buildCodeContext($currentFile, $openFiles);

        // Build system prompt with code editor context
        $systemPrompt = $this->buildSystemPrompt('code_editor', $message);
        $systemPrompt .= "\n\n" . $context;
        $systemPrompt .= "\n\n" . $this->buildUiTargetInstructions($uiTarget);

        // Add tool definitions if workspace is provided
        $toolExecutor = null;
        $toolDefinitions = [];
        if ($workspace && config('ai_tools.enabled', true)) {
            $toolExecutor = new ToolExecutor();
            $toolDefinitions = $toolExecutor->getToolDefinitions();
            $systemPrompt .= "\n\n" . $this->buildToolInstructions($toolDefinitions);
        }

        // Call AI with tool support
        try {
            $result = $this->attemptExecutionWithTools(
                $endpoint,
                $message,
                $systemPrompt,
                $modelId,
                $toolDefinitions,
                $toolExecutor,
                $workspace,
                $user
            );

            return [
                'message' => $result['text'],
                'code_changes' => $result['code_changes'] ?? [],
                'tool_calls' => $result['tool_calls'] ?? [],
                'model_used' => $result['model'],
                'provider' => $result['provider']
            ];

        } catch (\Exception $e) {
            $errorMsg = $e->getMessage();

            // If rate limit, timeout, or connection error and AUTO mode, try next model/endpoint
            $shouldRetry = $data['model_id'] === 'AUTO' && (
                str_contains($errorMsg, '429') ||
                str_contains($errorMsg, 'timeout') ||
                str_contains($errorMsg, 'timed out') ||
                str_contains($errorMsg, 'cURL error 28') ||
                str_contains($errorMsg, 'Connection refused') ||
                str_contains($errorMsg, 'Could not resolve host')
            );

            if ($shouldRetry) {
                // If specific endpoint was used, try different endpoint
                if ($endpointId) {
                    return $this->retryWithDifferentEndpoint($modelId, $data);
                }
                // Otherwise try next model on same endpoint
                return $this->retryWithNextModel($endpoint, $modelId, $data);
            }

            throw $e;
        }
    }

    /**
     * Execute AI call with tool support
     *
     * @param AIEndpoint $endpoint
     * @param string $message
     * @param string $systemPrompt
     * @param string $modelId
     * @param array $toolDefinitions
     * @param ToolExecutor|null $toolExecutor
     * @param mixed $workspace
     * @param mixed $user
     * @return array
     */
    protected function attemptExecutionWithTools(
        AIEndpoint $endpoint,
        string $message,
        string $systemPrompt,
        string $modelId,
        array $toolDefinitions,
        ?ToolExecutor $toolExecutor,
        $workspace,
        $user
    ): array {
        $adapter = AIProviderFactory::make($endpoint);
        $adapter->setModel($modelId);

        $conversation = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $message]
        ];

        $toolCalls = [];
        $codeChanges = [];
        $maxTurns = config('ai_tools.max_execution_turns', 10);

        // Tool execution loop
        for ($turn = 0; $turn < $maxTurns; $turn++) {
            $startTime = microtime(true);

            // Call AI with tools (if adapter supports it)
            $result = $this->callAdapterWithTools($adapter, $conversation, $toolDefinitions);

            $duration = microtime(true) - $startTime;

            // If AI returns text response (no more tools), we're done
            if (!isset($result['tool_calls']) || empty($result['tool_calls'])) {
                $finalText = $result['text'] ?? $result['content'] ?? '';

                // Also parse any code blocks from the text response (fallback)
                $parsedCodeChanges = $this->parseCodeChanges($finalText);
                $codeChanges = array_merge($codeChanges, $parsedCodeChanges);

                $this->logAction($endpoint, 'chat_with_tools', 'success', [
                    'duration' => $duration,
                    'model' => $modelId,
                    'turns' => $turn + 1,
                    'tool_calls' => count($toolCalls)
                ]);

                return [
                    'text' => $finalText,
                    'code_changes' => $codeChanges,
                    'tool_calls' => $toolCalls,
                    'model' => $modelId,
                    'provider' => $endpoint->provider
                ];
            }

            // Execute tool calls
            foreach ($result['tool_calls'] as $toolCall) {
                if (!$toolExecutor || !$workspace) {
                    // Can't execute tools without executor/workspace
                    $toolResult = [
                        'success' => false,
                        'error' => 'Tool execution not available'
                    ];
                } else {
                    $toolResult = $toolExecutor->execute($toolCall, $workspace, $user);
                }

                // Track tool call
                $toolCalls[] = [
                    'name' => $toolCall['name'] ?? $toolCall['function']['name'] ?? 'unknown',
                    'arguments' => $toolCall['arguments'] ?? $toolCall['function']['arguments'] ?? [],
                    'result' => $toolResult
                ];

                // Add tool result to conversation
                $conversation[] = [
                    'role' => 'tool',
                    'tool_call_id' => $toolCall['id'] ?? uniqid(),
                    'name' => $toolCall['name'] ?? $toolCall['function']['name'] ?? 'unknown',
                    'content' => json_encode($toolResult)
                ];

                // If tool was approved and created a file, add to code changes
                if (isset($toolResult['success']) && $toolResult['success'] && isset($toolResult['path'])) {
                    $codeChanges[] = [
                        'path' => $toolResult['path'],
                        'action' => $toolResult['type'] ?? 'update',
                        'content' => $toolResult['content'] ?? ''
                    ];
                }
            }

            // Continue loop - AI will see tool results and decide next action
        }

        // Max turns reached
        throw new \Exception('Maximum tool execution turns reached');
    }

    /**
     * Call adapter with tool support
     */
    protected function callAdapterWithTools($adapter, array $conversation, array $toolDefinitions): array
    {
        // Check if adapter supports native tool calling
        if (method_exists($adapter, 'generateTextWithTools') && !empty($toolDefinitions)) {
            return $adapter->generateTextWithTools($conversation, $toolDefinitions);
        }

        // Fallback: use basic text generation with tool markers
        $fullPrompt = '';
        foreach ($conversation as $msg) {
            $role = $msg['role'];
            $content = $msg['content'] ?? '';
            $fullPrompt .= "[{$role}]: {$content}\n\n";
        }

        $result = $adapter->generateText($fullPrompt);

        // Check if response contains tool call markers
        // Format: [TOOL_CALL: toolName(args)]
        $text = $result['text'] ?? '';
        if ($text && preg_match('/\[TOOL_CALL:\s*(\w+)\((.*?)\)\]/s', $text, $matches)) {
            $toolName = $matches[1];
            $argsString = $matches[2];

            // Parse arguments (simplified JSON parsing)
            try {
                $args = json_decode($argsString, true) ?? [];
            } catch (\Exception $e) {
                $args = [];
            }

            return [
                'tool_calls' => [
                    [
                        'id' => uniqid('tool_'),
                        'name' => $toolName,
                        'arguments' => $args
                    ]
                ]
            ];
        }

        // No tool calls, return text
        return [
            'text' => $text,
            'content' => $text
        ];
    }

    /**
     * Build tool instructions for system prompt
     */
    protected function buildToolInstructions(array $toolDefinitions): string
    {
        $instructions = "### AVAILABLE TOOLS\n\n";
        $instructions .= "You have access to the following tools to interact with the workspace:\n\n";

        foreach ($toolDefinitions as $tool) {
            $func = $tool['function'];
            $instructions .= "**{$func['name']}**: {$func['description']}\n";

            if (isset($func['parameters']['properties'])) {
                $instructions .= "Parameters:\n";
                foreach ($func['parameters']['properties'] as $param => $details) {
                    $required = in_array($param, $func['parameters']['required'] ?? []) ? ' (required)' : '';
                    $instructions .= "  - `{$param}`: {$details['description']}{$required}\n";
                }
            }
            $instructions .= "\n";
        }

        $instructions .= "\n### TOOL USAGE\n";
        $instructions .= "To use a tool, respond with: [TOOL_CALL: toolName({\"param\": \"value\"})]\n";
        $instructions .= "Example: [TOOL_CALL: createFile({\"path\": \"index.html\", \"content\": \"<html>...</html>\"})]\n\n";
        $instructions .= "After executing a tool, you'll receive the result and can use more tools or provide a final response.\n";

        return $instructions;
    }

    /**
     * Build code context for AI
     *
     * @param array|null $currentFile
     * @param array $openFiles
     * @return string
     */
    protected function buildCodeContext($currentFile, array $openFiles): string
    {
        $context = "# Code Editor Context\n\n";

        if ($currentFile) {
            $context .= "## Current File\n\n";
            $context .= "**Path:** `{$currentFile['path']}`\n";
            $context .= "**Language:** {$currentFile['language']}\n\n";
            $context .= "```{$currentFile['language']}\n";
            $context .= $currentFile['content'];
            $context .= "\n```\n\n";
        }

        if (!empty($openFiles)) {
            $context .= "## Open Files\n\n";
            foreach ($openFiles as $file) {
                $context .= "- `{$file['path']}`";
                if (isset($file['language'])) {
                    $context .= " ({$file['language']})";
                }
                $context .= "\n";
            }
            $context .= "\n";
        }

        return $context;
    }

    /**
     * Parse code changes from AI response
     *
     * @param string $response
     * @return array
     */
    protected function parseCodeChanges(string $response): array
    {
        // Extract code blocks with file paths
        // Format: ```language:path\ncode\n```
        preg_match_all('/```(\w+):([^\n]+)\n(.*?)```/s', $response, $matches, PREG_SET_ORDER);

        $changes = [];

        foreach ($matches as $match) {
            $language = $match[1];
            $path = trim($match[2]);
            $content = $match[3];

            // Determine action (create, update, delete)
            $action = 'update';
            if (preg_match('/create\s+(?:new\s+)?file[:\s]+' . preg_quote($path, '/') . '/i', $response)) {
                $action = 'create';
            } elseif (preg_match('/delete\s+file[:\s]+' . preg_quote($path, '/') . '/i', $response)) {
                $action = 'delete';
            }

            $changes[] = [
                'language' => $language,
                'path' => $path,
                'content' => $content,
                'action' => $action
            ];
        }

        return $changes;
    }

    /**
     * Select best available model (AUTO mode)
     *
     * @param AIEndpoint $endpoint
     * @return string
     */
    protected function selectBestModel(AIEndpoint $endpoint): string
    {
        $models = $endpoint->metadata['available_models'] ?? [];

        if (empty($models)) {
            return $endpoint->default_model ?? 'gpt-3.5-turbo';
        }

        // Model priority (higher = better)
        $priorities = [
            'gpt-4-turbo' => 100,
            'gpt-4' => 95,
            'claude-3-opus' => 93,
            'claude-3-sonnet' => 90,
            'gemini-1.5-pro' => 88,
            'gemini-pro' => 85,
            'mistral-large' => 83,
            'gpt-3.5-turbo' => 70,
            'gemini-1.5-flash' => 65,
            'mistral-medium' => 60
        ];

        // Check rate limit cache
        $rateLimited = cache()->get("model_rate_limited:{$endpoint->id}", []);

        // Sort models by priority, filter out rate-limited
        $availableModels = collect($models)
            ->filter(fn($model) => !in_array($model['id'] ?? $model, $rateLimited))
            ->sortByDesc(function($model) use ($priorities) {
                $modelId = is_array($model) ? ($model['id'] ?? '') : $model;

                foreach ($priorities as $keyword => $score) {
                    if (str_contains(strtolower($modelId), $keyword)) {
                        return $score;
                    }
                }

                return 0;
            })
            ->values();

        if ($availableModels->isEmpty()) {
            // All models rate-limited, clear cache and use default
            cache()->forget("model_rate_limited:{$endpoint->id}");
            return $endpoint->default_model ?? (is_array($models[0]) ? $models[0]['id'] : $models[0]);
        }

        $bestModel = $availableModels->first();
        return is_array($bestModel) ? ($bestModel['id'] ?? $bestModel['model'] ?? 'gpt-3.5-turbo') : $bestModel;
    }

    /**
     * Retry with next available model
     *
     * @param AIEndpoint $endpoint
     * @param string $failedModel
     * @param array $originalData
     * @return array
     */
    protected function retryWithNextModel(AIEndpoint $endpoint, string $failedModel, array $originalData): array
    {
        // Mark model as rate limited
        $rateLimited = cache()->get("model_rate_limited:{$endpoint->id}", []);
        $rateLimited[] = $failedModel;
        cache()->put("model_rate_limited:{$endpoint->id}", $rateLimited, now()->addMinutes(5));

        // Try with next model
        $nextModel = $this->selectBestModel($endpoint);

        if ($nextModel === $failedModel) {
            throw new \Exception('All models rate-limited. Please try again later.');
        }

        // Recursive call with next model
        $originalData['model_id'] = $nextModel;
        return $this->chatWithCode($originalData);
    }

    /**
     * Retry with a different endpoint when current one fails
     *
     * @param string $failedModel
     * @param array $originalData
     * @return array
     */
    protected function retryWithDifferentEndpoint(string $failedModel, array $originalData): array
    {
        // Mark current endpoint as temporarily unavailable
        $failedEndpointId = $originalData['endpoint_id'] ?? null;
        if ($failedEndpointId) {
            $unavailable = cache()->get('unavailable_endpoints', []);
            $unavailable[] = $failedEndpointId;
            cache()->put('unavailable_endpoints', $unavailable, now()->addMinutes(5));
        }

        // Get all other active endpoints
        $endpoints = AIEndpoint::where('is_active', true)
            ->whereNotIn('id', cache()->get('unavailable_endpoints', []))
            ->get();

        if ($endpoints->isEmpty()) {
            // Clear cache and retry once more
            cache()->forget('unavailable_endpoints');
            throw new \Exception('All AI endpoints are currently unavailable. Please try again later.');
        }

        // Try with next available endpoint
        $nextEndpoint = $endpoints->first();
        $originalData['endpoint_id'] = $nextEndpoint->id;
        $originalData['model_id'] = 'AUTO'; // Let it select best model

        return $this->chatWithCode($originalData);
    }

    /**
     * Streaming version of chatWithCode - sends events via callback
     *
     * @param array $data
     * @param callable $streamCallback Function(string $event, array $data)
     * @return void
     */
    public function chatWithCodeStream(array $data, callable $streamCallback): void
    {
        $message = $data['message'];
        $currentFile = $data['current_file'] ?? null;
        $openFiles = $data['open_files'] ?? [];
        $modelId = $data['model_id'] ?? 'AUTO';
        $endpointId = $data['endpoint_id'] ?? null;
        $uiTarget = (string) ($data['ui_target'] ?? 'ask');
        $workspace = $data['workspace'] ?? null;
        $user = $data['user'] ?? Auth::user();
        $shouldStop = $data['should_stop'] ?? null;
        $extraSystem = (string) ($data['extra_system'] ?? '');

        try {
            // Required UX protocol: show liveness immediately
            $streamCallback('status', ['message' => '🤔 Thinking...']);
            $streamCallback('status', ['message' => '🧠 Planning...']);
            $streamCallback('status', ['message' => 'Connecting to AI...']);

            // Get endpoints (support failover for streaming)
            $endpoints = $endpointId
                ? AIEndpoint::where('id', $endpointId)->where('is_active', true)->get()
                : AIEndpoint::where('is_active', true)->get();

            if ($endpoints->isEmpty()) {
                throw new \Exception('No active AI endpoint available');
            }

            // Build context
            $context = $this->buildCodeContext($currentFile, $openFiles);
            $baseSystemPrompt = $this->buildSystemPrompt('code_editor', $message) . "\n\n" . $context;
            $baseSystemPrompt .= "\n\n" . $this->buildUiTargetInstructions($uiTarget);

            // Add tool definitions if workspace is provided
            $toolExecutor = null;
            $toolDefinitions = [];
            if ($workspace && config('ai_tools.enabled', true)) {
                $toolExecutor = new ToolExecutor();
                $toolDefinitions = $toolExecutor->getToolDefinitions();
                $baseSystemPrompt .= "\n\n" . $this->buildToolInstructions($toolDefinitions);
            }

            // Inject orchestrator addendum (PLAN / CLARIFY protocol)
            if ($extraSystem !== '') {
                $baseSystemPrompt .= "\n\n" . $extraSystem;
            }

            $streamCallback('status', ['message' => 'Generating response...']);

            $lastError = null;
            foreach ($endpoints as $idx => $endpoint) {
                try {
                    $streamCallback('status', ['message' => 'Endpoint selected', 'endpoint' => $endpoint->name]);

                    $useModel = $modelId;
                    if ($useModel === 'AUTO' || !$useModel) {
                        $useModel = $this->selectBestModel($endpoint);
                        $streamCallback('status', ['message' => 'Model selected', 'model' => $useModel]);
                    }

                    $this->attemptExecutionWithToolsStream(
                        $endpoint,
                        $message,
                        $baseSystemPrompt,
                        $useModel,
                        $toolDefinitions,
                        $toolExecutor,
                        $workspace,
                        $user,
                        $streamCallback,
                        is_callable($shouldStop) ? $shouldStop : null
                    );
                    return; // success (complete event emitted)
                } catch (\Exception $e) {
                    $lastError = $e->getMessage();
                    $streamCallback('status', [
                        'message' => '⚠️ Provider error, attempting failover...',
                        'error' => $lastError,
                        'attempt' => $idx + 1,
                        'max' => $endpoints->count(),
                    ]);

                    // If user forced a specific endpoint, don't failover
                    if ($endpointId) {
                        throw $e;
                    }
                }
            }

            throw new \Exception('All AI endpoints failed. Last error: ' . ($lastError ?? 'unknown'));

        } catch (\Exception $e) {
            $streamCallback('error', [
                'error' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null
            ]);
        }
    }

    /**
     * Execute AI call with tool support and streaming
     */
    protected function attemptExecutionWithToolsStream(
        AIEndpoint $endpoint,
        string $message,
        string $systemPrompt,
        string $modelId,
        array $toolDefinitions,
        ?ToolExecutor $toolExecutor,
        $workspace,
        $user,
        callable $streamCallback,
        ?callable $shouldStop = null
    ): void {
        $adapter = AIProviderFactory::make($endpoint);
        $adapter->setModel($modelId);

        $conversation = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $message]
        ];

        $toolCalls = [];
        $codeChanges = [];
        $fullResponse = '';
        $maxTurns = config('ai_tools.max_execution_turns', 10);

        // Tool execution loop
        for ($turn = 0; $turn < $maxTurns; $turn++) {
            if ($shouldStop && $shouldStop()) {
                $streamCallback('cancelled', [
                    'status' => 'cancelled',
                    'message' => 'Cancelled by user',
                ]);
                return;
            }

            $streamCallback('turn_start', ['turn' => $turn + 1, 'max' => $maxTurns]);

            $startTime = microtime(true);

            // Call AI - check if adapter supports streaming
            if (method_exists($adapter, 'generateTextStream')) {
                // Stream response token by token
                $result = $adapter->generateTextStream($conversation, $toolDefinitions, function($chunk) use ($streamCallback, $shouldStop) {
                    if ($shouldStop && $shouldStop()) {
                        throw new \RuntimeException('Cancelled');
                    }
                    $streamCallback('chunk', ['text' => $chunk]);
                });
            } else {
                // Fallback: non-streaming
                $result = $this->callAdapterWithTools($adapter, $conversation, $toolDefinitions);

                // Send the full response as one chunk
                if (isset($result['text'])) {
                    $streamCallback('chunk', ['text' => $result['text']]);
                }
            }

            $duration = microtime(true) - $startTime;

            // If no more tool calls, we're done
            if (!isset($result['tool_calls']) || empty($result['tool_calls'])) {
                $finalText = $result['text'] ?? $result['content'] ?? '';
                $fullResponse .= $finalText;

                // Parse any code changes
                $parsedCodeChanges = $this->parseCodeChanges($finalText);
                $codeChanges = array_merge($codeChanges, $parsedCodeChanges);

                $this->logAction($endpoint, 'chat_stream', 'success', [
                    'duration' => $duration,
                    'model' => $modelId,
                    'turns' => $turn + 1,
                    'tool_calls' => count($toolCalls)
                ]);

                // UX: final phase before completion
                $streamCallback('status', ['message' => '🔄 Updating preview...']);

                // Send completion
                $streamCallback('complete', [
                    'message' => $fullResponse,
                    'code_changes' => $codeChanges,
                    'tool_calls' => $toolCalls,
                    'model_used' => $modelId,
                    'provider' => $endpoint->provider,
                    'original_message' => $message
                ]);

                return;
            }

            // Execute tool calls
            foreach ($result['tool_calls'] as $toolCall) {
                if ($shouldStop && $shouldStop()) {
                    $streamCallback('cancelled', [
                        'status' => 'cancelled',
                        'message' => 'Cancelled by user',
                    ]);
                    return;
                }

                $toolName = $toolCall['name'] ?? $toolCall['function']['name'] ?? 'unknown';
                $toolArgs = $toolCall['arguments'] ?? $toolCall['function']['arguments'] ?? [];
                if (is_string($toolArgs)) {
                    $toolArgs = json_decode($toolArgs, true) ?? [];
                }

                // UX protocol: status messages for tool phases
                if ($toolName === 'createFile') {
                    $t = (string) ($toolArgs['type'] ?? 'file');
                    if ($t === 'directory') {
                        $streamCallback('status', ['message' => '📁 Creating directories...']);
                    } else {
                        $streamCallback('status', ['message' => '🛠 Creating files...']);
                    }
                } elseif ($toolName === 'writeFile') {
                    $streamCallback('status', ['message' => '✏️ Editing code...']);
                } elseif ($toolName === 'deleteFile') {
                    $streamCallback('status', ['message' => '🗑️ Removing files...']);
                } elseif ($toolName === 'runCommand') {
                    $streamCallback('status', ['message' => '🖥 Running command...']);
                } elseif (in_array($toolName, ['readFile', 'listFiles'], true)) {
                    $streamCallback('status', ['message' => '🔎 Reading files...']);
                }

                $streamCallback('tool_call', [
                    'tool' => $toolName,
                    'status' => 'executing',
                    'arguments' => $toolArgs,
                ]);

                if (!$toolExecutor || !$workspace) {
                    $toolResult = [
                        'success' => false,
                        'error' => 'Tool execution not available'
                    ];
                } else {
                    $toolResult = $toolExecutor->execute($toolCall, $workspace, $user);
                }

                // Track tool call
                $toolCalls[] = [
                    'name' => $toolName,
                    'arguments' => $toolCall['arguments'] ?? $toolCall['function']['arguments'] ?? [],
                    'result' => $toolResult
                ];

                $streamCallback('tool_result', [
                    'tool' => $toolName,
                    'result' => $toolResult,
                ]);

                // Add tool result to conversation
                $conversation[] = [
                    'role' => 'tool',
                    'tool_call_id' => $toolCall['id'] ?? uniqid(),
                    'name' => $toolName,
                    'content' => json_encode($toolResult)
                ];

                // If tool created/modified a file, add to code changes
                if (isset($toolResult['success']) && $toolResult['success'] && isset($toolResult['path'])) {
                    $codeChanges[] = [
                        'path' => $toolResult['path'],
                        'action' => $toolResult['type'] ?? 'update',
                        'content' => $toolResult['content'] ?? ''
                    ];
                }
            }
        }

        // Max turns reached - send summary of what was done
        $successfulFiles = array_filter($toolCalls, fn($tc) => isset($tc['result']['success']) && $tc['result']['success']);
        $fileList = array_map(fn($tc) => $tc['result']['path'] ?? 'unknown', $successfulFiles);

        $summary = "I've completed the requested task and executed " . count($toolCalls) . " operations:\n\n";

        if (!empty($fileList)) {
            $summary .= "📁 Files/folders created:\n";
            foreach (array_unique($fileList) as $file) {
                $summary .= "- `{$file}`\n";
            }
        }

        $summary .= "\n⚠️ Maximum tool execution turns reached. The task may not be fully complete.";

        $streamCallback('complete', [
            'message' => $summary,
            'code_changes' => $codeChanges,
            'tool_calls' => $toolCalls,
            'model_used' => $modelId,
            'provider' => $endpoint->provider,
            'original_message' => $message
        ]);
    }
}
