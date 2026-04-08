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
    /** Set before buildSystemPrompt() — used to scope AI rules */
    protected ?int $contextUserId = null;
    protected ?int $contextWorkspaceId = null;

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
    private function formatRules(\Illuminate\Support\Collection $rules): string
    {
        $out = '';
        foreach ($rules as $rule) {
            $out .= "\n### [RULE: {$rule->name}]\n" . $rule->rule_content;
        }
        return $out;
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

        // Inject Rules — scoped to system + this user + this workspace
        $rules = AiRule::forContext($this->contextUserId, $this->contextWorkspaceId);

        $systemRules    = $rules->filter(fn ($r) => is_null($r->user_id) && is_null($r->workspace_id));
        $globalRules    = $rules->filter(fn ($r) => !is_null($r->user_id) && is_null($r->workspace_id));
        $workspaceRules = $rules->filter(fn ($r) => !is_null($r->workspace_id));

        if ($systemRules->count())
            $prompt .= "\n\n### SYSTEM RULES\n" . $this->formatRules($systemRules);
        if ($globalRules->count())
            $prompt .= "\n\n### YOUR RULES\n" . $this->formatRules($globalRules);
        if ($workspaceRules->count())
            $prompt .= "\n\n### PROJECT RULES\n" . $this->formatRules($workspaceRules);

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

                // If tool created/updated a FILE (not a directory), add to code changes
                if (
                    isset($toolResult['success']) && $toolResult['success'] &&
                    isset($toolResult['path']) &&
                    ($toolResult['type'] ?? '') !== 'directory'
                ) {
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
        $instructions .= "\n### CRITICAL FILE CREATION RULES\n";
        $instructions .= "1. NEVER create empty files. Always include FULL, COMPLETE, WORKING code in the `content` parameter.\n";
        $instructions .= "2. When creating a file with `createFile`, the `content` field MUST contain the entire file contents — not a placeholder, not a TODO, not an empty string.\n";
        $instructions .= "3. If a file already exists and needs updating, use `writeFile` with the full new content.\n";
        $instructions .= "4. After creating/writing all files, always provide a final summary response explaining what was done.\n";
        $instructions .= "5. If creating multiple files (e.g., full auth system), create ALL files in sequence before giving the final response.\n";
        $instructions .= "6. CODE QUALITY: Every component/module MUST import ALL symbols it uses. Before writing a file, mentally verify every identifier is imported. For React: import Navigate, Link, useNavigate etc. from 'react-router-dom' if used.\n";
        $instructions .= "7. DOTFILES: You CAN create .gitignore, .prettierrc, .eslintrc etc. — these are allowed. Use path like '.gitignore' (with the dot prefix).\n";
        $instructions .= "\n### EXECUTION RULES — MUST FOLLOW\n";
        $instructions .= "- NEVER stop mid-task and ask 'Would you like me to...?' or 'Should I also...?' — just DO IT.\n";
        $instructions .= "- NEVER ask for confirmation before creating files or running commands.\n";
        $instructions .= "- Complete the ENTIRE requested task in one go. If the user asks for a full auth system, create ALL files without stopping.\n";
        $instructions .= "- Use `runCommand` to install packages and run the app when needed — do not ask permission.\n";
        $instructions .= "- Only stop when the task is 100% complete, then give a brief summary.\n";
        $instructions .= "\n### COMPLETE PROJECT STRUCTURE RULES\n";
        $instructions .= "When creating any app/project/system, you MUST create ALL of these files (not just the feature files):\n\n";
        $instructions .= "**React/Vite project — required files:**\n";
        $instructions .= "- package.json (with all dependencies: react, react-dom, react-router-dom, axios, etc.)\n";
        $instructions .= "- vite.config.js (IMPORTANT: set server.port to 3000 — port 5173 is reserved)\n";
        $instructions .= "- index.html (entry HTML with <div id='root'>)\n";
        $instructions .= "- src/main.jsx (ReactDOM.createRoot entry point)\n";
        $instructions .= "- src/App.jsx (with all routes using react-router-dom)\n";
        $instructions .= "- src/index.css (basic reset styles)\n";
        $instructions .= "- .gitignore\n";
        $instructions .= "- README.md with run instructions\n\n";
        $instructions .= "**Then create the feature files** (pages, components, context, hooks, api, etc.)\n\n";
        $instructions .= "**After creating all files**, run these commands in sequence:\n";
        $instructions .= "1. `npm install` (install all dependencies)\n";
        $instructions .= "2. `npm run dev` (start dev server)\n\n";
        $instructions .= "**PORT RULE**: ALWAYS use port 3000 for workspace projects. NEVER use 5173 (reserved by the editor).\n";
        $instructions .= "In vite.config.js always include:\n";
        $instructions .= "  server: { port: 3000, host: '0.0.0.0', strictPort: false }\n\n";

        $instructions .= "### ⚠️ CRITICAL: DEV SERVER RULE\n";
        $instructions .= "NEVER run `npm run dev`, `vite`, `node server.js`, or ANY long-running server command via runCommand.\n";
        $instructions .= "These WILL fail with 'listen UNKNOWN' because they cannot bind sockets as PHP child processes on Windows.\n";
        $instructions .= "Instead, after creating all files and running `npm install`:\n";
        $instructions .= "1. Confirm all files are created and npm install succeeded.\n";
        $instructions .= "2. Tell the user: 'Open a new CMD window, go to [workspace path], and run: npm run dev'\n";
        $instructions .= "3. DO NOT attempt to start the server yourself via runCommand.\n\n";

        $instructions .= "### ALLOWED via runCommand (one-time commands only):\n";
        $instructions .= "- npm install / npm install <package>\n";
        $instructions .= "- npm run build\n";
        $instructions .= "- git commands\n";
        $instructions .= "- file operations (ls, cat, find, grep)\n";
        $instructions .= "- taskkill, netstat (for process management)\n\n";

        $instructions .= "**STOP RULES — must follow exactly:**\n";
        $instructions .= "- If a command fails with the SAME error twice → STOP trying that command, move on.\n";
        $instructions .= "- If runCommand returns 'STOP' in the error → immediately give final summary to user, do not call any more tools.\n";
        $instructions .= "- If netstat/taskkill/port-scan fails → STOP port scanning, it won't help. Use strictPort:false instead.\n";
        $instructions .= "- NEVER repeat the same command more than once.\n";
        $instructions .= "**Node/Express project — required files:**\n";
        $instructions .= "- package.json (with express, cors, dotenv, etc.)\n";
        $instructions .= "- .env (PORT=3000)\n";
        $instructions .= "- server.js or index.js (main entry)\n";
        $instructions .= "- All route files, model files, middleware, etc.\n\n";
        $instructions .= "REMEMBER: A project is only complete when `npm install && npm run dev` (or equivalent) works without errors.\n";

        return $instructions;
    }

    /**
     * Build code context for AI
     *
     * @param array|null $currentFile
     * @param array $openFiles
     * @return string
     */
    protected function buildCodeContext($currentFile, array $openFiles, array $pinnedContext = []): string
    {
        $context = "# Code Editor Context\n\n";

        // Pinned context — always included regardless of open tabs
        if (!empty($pinnedContext)) {
            $context .= "## Pinned Context (always relevant)\n\n";
            foreach ($pinnedContext as $pin) {
                $type    = $pin['type'] ?? 'file';
                $label   = $pin['label'] ?? ($pin['path'] ?? 'snippet');
                $content = $pin['content'] ?? '';
                $lang    = $pin['language'] ?? 'text';

                $context .= "### 📌 {$label}\n";
                if ($type === 'snippet') {
                    $context .= "```{$lang}\n{$content}\n```\n\n";
                } else {
                    $context .= "**Path:** `{$label}`\n\n```{$lang}\n{$content}\n```\n\n";
                }
            }
        }

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
        $pinnedContext = $data['pinned_context'] ?? [];
        $shouldStop = $data['should_stop'] ?? null;
        $extraSystem = (string) ($data['extra_system'] ?? '');
        $conversationObj = $data['conversation_obj'] ?? null;

        // Set context so buildSystemPrompt() can scope rules correctly
        $this->contextUserId      = $user?->id;
        $this->contextWorkspaceId = $workspace?->id;

        try {
            // Required UX protocol: show liveness immediately — BEFORE any DB/network calls
            $streamCallback('status', ['message' => '🤔 Thinking...']);
            $streamCallback('status', ['message' => '🧠 Planning...']);
            $streamCallback('status', ['message' => 'Connecting to AI...']);

            // Load prior conversation history for context (last 10 exchanges = 20 messages)
            $priorHistory = [];
            try {
                if ($conversationObj) {
                    $events = \App\Models\AIConversationEvent::where('conversation_id', $conversationObj->id)
                        ->whereIn('type', ['user_message', 'assistant_message'])
                        ->orderBy('id')
                        ->limit(20)
                        ->get();

                    foreach ($events as $ev) {
                        $payload = $ev->payload ?? [];
                        if ($ev->type === 'user_message' && !empty($payload['message'])) {
                            // Cap user messages at 1000 chars to avoid context overflow
                            $content = mb_substr((string) $payload['message'], 0, 1000);
                            $priorHistory[] = ['role' => 'user', 'content' => $content];
                        } elseif ($ev->type === 'assistant_message' && !empty($payload['message'])) {
                            // Cap assistant messages at 2000 chars (they can be very long)
                            $content = mb_substr((string) $payload['message'], 0, 2000);
                            $priorHistory[] = ['role' => 'assistant', 'content' => $content];
                        }
                    }

                    // Remove the last user message from history if it matches current message
                    // (it was just saved to DB before this call, so it would be duplicated)
                    if (!empty($priorHistory) && end($priorHistory)['role'] === 'user') {
                        array_pop($priorHistory);
                    }
                }
            } catch (\Exception $e) {
                $priorHistory = []; // safe fallback — no history is better than a crash
            }

            // Get endpoints (support failover for streaming)
            $endpoints = $endpointId
                ? AIEndpoint::where('id', $endpointId)->where('is_active', true)->get()
                : AIEndpoint::where('is_active', true)->get();

            if ($endpoints->isEmpty()) {
                throw new \Exception('No active AI endpoint available');
            }

            // Build context
            $context = $this->buildCodeContext($currentFile, $openFiles, $pinnedContext);
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

            if ($endpoints->isEmpty()) {
                throw new \Exception('No active AI endpoint available');
            }

            // Build the ordered list of (endpoint, model) pairs to try
            $endpointList = [];
            foreach ($endpoints as $ep) {
                $m = $modelId;
                if ($m === 'AUTO' || !$m) {
                    $m = $this->selectBestModel($ep);
                }
                $endpointList[] = ['endpoint' => $ep, 'model' => $m];
            }

            $streamCallback('status', ['message' => 'Endpoint selected', 'endpoint' => $endpointList[0]['endpoint']->name]);
            $streamCallback('status', ['message' => 'Model selected', 'model' => $endpointList[0]['model']]);

            $this->runToolsStreamWithFailover(
                $endpointList,
                $message,
                $baseSystemPrompt,
                $toolDefinitions,
                $toolExecutor,
                $workspace,
                $user,
                $streamCallback,
                is_callable($shouldStop) ? $shouldStop : null,
                $priorHistory
            );

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
    /**
     * Run the tool-calling loop with automatic endpoint failover on any turn failure.
     * $endpointList = [['endpoint' => AIEndpoint, 'model' => string], ...]
     */
    protected function runToolsStreamWithFailover(
        array $endpointList,
        string $message,
        string $systemPrompt,
        array $toolDefinitions,
        ?ToolExecutor $toolExecutor,
        $workspace,
        $user,
        callable $streamCallback,
        ?callable $shouldStop = null,
        array $priorHistory = []
    ): void {
        // Build conversation: system → history → current user message
        $conversation = [['role' => 'system', 'content' => $systemPrompt]];
        foreach ($priorHistory as $h) {
            $conversation[] = $h;
        }

        // Build user message — multimodal array if images are attached
        $images = $data['images'] ?? [];
        if (!empty($images)) {
            $userContent = [['type' => 'text', 'text' => $message ?: 'Please analyze the attached image(s).']];
            foreach ($images as $img) {
                if (empty($img['data'])) continue;
                $userContent[] = [
                    'type'      => 'image_url',
                    'image_url' => ['url' => $img['data'], 'detail' => 'high'],
                ];
            }
            $conversation[] = ['role' => 'user', 'content' => $userContent];
        } else {
            $conversation[] = ['role' => 'user', 'content' => $message];
        }

        $toolCalls    = [];
        $codeChanges  = [];
        $fullResponse = '';
        $maxTurns     = config('ai_tools.max_execution_turns', 20);

        // Current endpoint index — incremented on failure
        $epIdx    = 0;
        $ep       = $endpointList[$epIdx]['endpoint'];
        $modelId  = $endpointList[$epIdx]['model'];
        $adapter  = AIProviderFactory::make($ep);
        $adapter->setModel($modelId);

        for ($turn = 0; $turn < $maxTurns; $turn++) {
            if ($shouldStop && $shouldStop()) {
                $streamCallback('cancelled', ['status' => 'cancelled', 'message' => 'Cancelled by user']);
                return;
            }

            $streamCallback('turn_start', ['turn' => $turn + 1, 'max' => $maxTurns]);
            $streamCallback('status', ['message' => $turn === 0 ? '🤖 Calling AI...' : '🔄 Continuing (turn ' . ($turn + 1) . ')...']);
            if (ob_get_level() > 0) { @ob_flush(); }
            @flush();

            $result = null;
            $turnFailed = false;
            $startTime = microtime(true);

            // Try current endpoint, then each fallback
            for ($tryEp = $epIdx; $tryEp < count($endpointList); $tryEp++) {
                if ($tryEp > $epIdx) {
                    // Switching to next endpoint mid-task
                    $ep      = $endpointList[$tryEp]['endpoint'];
                    $modelId = $endpointList[$tryEp]['model'];
                    $adapter = AIProviderFactory::make($ep);
                    $adapter->setModel($modelId);
                    $epIdx   = $tryEp;
                    $streamCallback('status', ['message' => "🔀 Switching to {$ep->name} ({$modelId})..."]);
                    if (ob_get_level() > 0) { @ob_flush(); }
                    @flush();
                }

                try {
                    if (method_exists($adapter, 'generateTextStream')) {
                        $result = $adapter->generateTextStream(
                            $conversation,
                            $toolDefinitions,
                            // onChunk — called for every text token
                            function($chunk) use ($streamCallback, $shouldStop) {
                                if ($shouldStop && $shouldStop()) throw new \RuntimeException('Cancelled');
                                $streamCallback('chunk', ['text' => $chunk]);
                            },
                            // onProgress — called every ~2s when only tool_call deltas arrive.
                            // Sends a named SSE keepalive so the browser resets its silence timer.
                            function() use ($streamCallback, $shouldStop) {
                                if ($shouldStop && $shouldStop()) throw new \RuntimeException('Cancelled');
                                $streamCallback('keepalive', ['ts' => time()]);
                            }
                        );
                    } else {
                        $result = $this->callAdapterWithTools($adapter, $conversation, $toolDefinitions);
                        if (!empty($result['text'])) {
                            $streamCallback('chunk', ['text' => $result['text']]);
                        }
                    }
                    $turnFailed = false;
                    break; // success — stop trying more endpoints

                } catch (\RuntimeException $e) {
                    if ($e->getMessage() === 'Cancelled') {
                        $streamCallback('cancelled', ['status' => 'cancelled', 'message' => 'Cancelled by user']);
                        return;
                    }
                    throw $e;
                } catch (\Exception $e) {
                    $errMsg = $e->getMessage();
                    Log::error("AI turn {$turn} failed on endpoint {$ep->name}", ['error' => $errMsg]);
                    $isRateLimit = str_contains(strtolower($errMsg), 'rate limit') || str_contains($errMsg, '429');

                    if ($tryEp + 1 < count($endpointList)) {
                        // More endpoints to try
                        $streamCallback('status', ['message' => ($isRateLimit ? '⏱️ Rate limited' : '⚠️ Error') . ' — switching to next provider...']);
                    } else {
                        // No more endpoints
                        $streamCallback('status', ['message' => $isRateLimit
                            ? '⏱️ All providers rate limited. Task paused — please retry in 30s.'
                            : '⚠️ All providers failed: ' . mb_substr($errMsg, 0, 100)]);
                        $turnFailed = true;
                    }
                }
            }

            if ($turnFailed) {
                break; // all endpoints exhausted → fall through to summary
            }

            $duration = microtime(true) - $startTime;

            // If no more tool calls, we're done
            if (!isset($result['tool_calls']) || empty($result['tool_calls'])) {
                $finalText = $result['text'] ?? $result['content'] ?? '';
                $fullResponse .= $finalText;

                $parsedCodeChanges = $this->parseCodeChanges($finalText);
                $codeChanges = array_merge($codeChanges, $parsedCodeChanges);

                $this->logAction($ep, 'chat_stream', 'success', [
                    'duration' => $duration,
                    'model' => $modelId,
                    'turns' => $turn + 1,
                    'tool_calls' => count($toolCalls)
                ]);

                $streamCallback('status', ['message' => '🔄 Updating preview...']);
                $streamCallback('complete', [
                    'message' => $fullResponse,
                    'code_changes' => $codeChanges,
                    'tool_calls' => $toolCalls,
                    'model_used' => $modelId,
                    'provider' => $ep->provider,
                    'original_message' => $message
                ]);
                return;
            }

            // ── CRITICAL: Add assistant message WITH tool_calls to conversation ──
            // Without this, the API call on the next turn sees a malformed history
            // (tool results without a preceding assistant message) and fails silently.
            $assistantToolCalls = array_map(function($tc) {
                return [
                    'id'       => $tc['id'] ?? ('call_' . uniqid()),
                    'type'     => 'function',
                    'function' => [
                        'name'      => $tc['name'] ?? ($tc['function']['name'] ?? 'unknown'),
                        'arguments' => is_string($tc['arguments'] ?? ($tc['function']['arguments'] ?? '{}'))
                            ? ($tc['arguments'] ?? ($tc['function']['arguments'] ?? '{}'))
                            : json_encode($tc['arguments'] ?? ($tc['function']['arguments'] ?? [])),
                    ],
                ];
            }, $result['tool_calls']);

            $conversation[] = [
                'role'       => 'assistant',
                'content'    => $result['text'] ?? null,
                'tool_calls' => $assistantToolCalls,
            ];

            // Execute tool calls
            foreach ($result['tool_calls'] as $toolCall) {
                if ($shouldStop && $shouldStop()) {
                    $streamCallback('cancelled', ['status' => 'cancelled', 'message' => 'Cancelled by user']);
                    return;
                }

                $toolName = $toolCall['name'] ?? $toolCall['function']['name'] ?? 'unknown';
                $toolArgs = $toolCall['arguments'] ?? $toolCall['function']['arguments'] ?? [];
                if (is_string($toolArgs)) {
                    $toolArgs = json_decode($toolArgs, true) ?? [];
                }

                // UX status messages
                if ($toolName === 'createFile') {
                    $t = (string) ($toolArgs['type'] ?? 'file');
                    $streamCallback('status', ['message' => $t === 'directory' ? '📁 Creating directories...' : '🛠 Creating files...']);
                } elseif ($toolName === 'writeFile') {
                    $streamCallback('status', ['message' => '✏️ Editing code...']);
                } elseif ($toolName === 'deleteFile') {
                    $streamCallback('status', ['message' => '🗑️ Removing files...']);
                } elseif ($toolName === 'runCommand') {
                    $streamCallback('status', ['message' => '🖥 Running command...']);
                } elseif (in_array($toolName, ['readFile', 'listFiles'], true)) {
                    $streamCallback('status', ['message' => '🔎 Reading files...']);
                }

                $streamCallback('tool_call', ['tool' => $toolName, 'status' => 'executing', 'arguments' => $toolArgs]);

                $toolResult = (!$toolExecutor || !$workspace)
                    ? ['success' => false, 'error' => 'Tool execution not available']
                    : $toolExecutor->execute($toolCall, $workspace, $user);

                $toolCallId = $toolCall['id'] ?? ('call_' . uniqid());

                $toolCalls[] = [
                    'name'      => $toolName,
                    'arguments' => $toolCall['arguments'] ?? $toolCall['function']['arguments'] ?? [],
                    'result'    => $toolResult,
                ];

                $streamCallback('tool_result', ['tool' => $toolName, 'result' => $toolResult]);

                // Add tool result to conversation (must match the tool_call_id above)
                $conversation[] = [
                    'role'         => 'tool',
                    'tool_call_id' => $toolCallId,
                    'name'         => $toolName,
                    'content'      => json_encode($toolResult),
                ];

                // Keepalive: flush after every tool to prevent browser connection drop
                if (ob_get_level() > 0) { @ob_flush(); }
                @flush();

                if (isset($toolResult['success']) && $toolResult['success'] && isset($toolResult['path'])) {
                    $codeChanges[] = [
                        'path'    => $toolResult['path'],
                        'action'  => $toolResult['type'] ?? 'update',
                        'content' => $toolResult['content'] ?? '',
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
            'provider' => $ep->provider,
            'original_message' => $message
        ]);
    }

    /**
     * Legacy single-endpoint wrapper — kept for non-streaming callers.
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
        ?callable $shouldStop = null,
        array $priorHistory = []
    ): void {
        $this->runToolsStreamWithFailover(
            [['endpoint' => $endpoint, 'model' => $modelId]],
            $message,
            $systemPrompt,
            $toolDefinitions,
            $toolExecutor,
            $workspace,
            $user,
            $streamCallback,
            $shouldStop,
            $priorHistory
        );
    }
}
