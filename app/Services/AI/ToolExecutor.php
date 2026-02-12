<?php

namespace App\Services\AI;

use App\Models\Workspace;
use App\Models\User;
use App\Models\AICommandApproval;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

class ToolExecutor
{
    protected array $tools;
    protected array $security;

    public function __construct()
    {
        $this->tools = config('ai_tools.tools', []);
        $this->security = config('ai_tools.security', []);
    }

    /**
     * Execute a tool call from the AI agent
     *
     * @param array $toolCall
     * @param Workspace $workspace
     * @param User $user
     * @return array
     */
    public function execute(array $toolCall, Workspace $workspace, User $user): array
    {
        $toolName = $toolCall['name'] ?? $toolCall['function'] ?? null;
        $args = $toolCall['arguments'] ?? $toolCall['args'] ?? [];

        // Parse JSON string if needed
        if (is_string($args)) {
            $args = json_decode($args, true) ?? [];
        }

        // Find tool definition
        $toolDef = $this->findTool($toolName);
        if (!$toolDef) {
            return [
                'success' => false,
                'error' => "Unknown tool: {$toolName}",
                'requires_approval' => false
            ];
        }

        // Permission check
        if (!$this->hasPermission($user, $workspace, $toolDef)) {
            return [
                'success' => false,
                'error' => 'Permission denied',
                'requires_approval' => true
            ];
        }

        // Security validation
        $validation = $this->validateToolCall($toolName, $args);
        if (!$validation['valid']) {
            return [
                'success' => false,
                'error' => $validation['error'],
                'requires_approval' => false
            ];
        }

        // Check if requires approval
        if ($this->requiresApproval($toolDef, $args, $workspace)) {
            return $this->queueForApproval($toolCall, $workspace, $user, $args);
        }

        // Execute tool directly
        try {
            $result = $this->executeToolDirect($toolName, $args, $workspace);

            // Log successful execution
            Log::info('AI Tool Executed', [
                'tool' => $toolName,
                'workspace' => $workspace->id,
                'user' => $user->id,
                'success' => true
            ]);

            return $result;
        } catch (\Exception $e) {
            Log::error('AI Tool Execution Failed', [
                'tool' => $toolName,
                'error' => $e->getMessage(),
                'workspace' => $workspace->id
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Execute tool directly without approval
     *
     * @param string $toolName
     * @param array $args
     * @param Workspace $workspace
     * @return array
     */
    protected function executeToolDirect(string $toolName, array $args, Workspace $workspace): array
    {
        return match($toolName) {
            'createFile' => $this->createFile($workspace, $args),
            'writeFile' => $this->writeFile($workspace, $args),
            'readFile' => $this->readFile($workspace, $args),
            'deleteFile' => $this->deleteFile($workspace, $args),
            'listFiles' => $this->listFiles($workspace, $args),
            'runCommand' => $this->runCommand($workspace, $args),
            default => ['success' => false, 'error' => 'Tool not implemented']
        };
    }

    /**
     * Create a new file or directory
     */
    protected function createFile(Workspace $workspace, array $args): array
    {
        $path = ltrim((string) ($args['path'] ?? ''), '/');
        $path = str_replace('\\', '/', $path);
        $path = trim($path);
        $content = (string) ($args['content'] ?? '');
        $type = (string) ($args['type'] ?? 'file');
        $overwrite = (bool) ($args['overwrite'] ?? false);

        if ($path === '') {
            return [
                'success' => false,
                'error' => 'Path is required'
            ];
        }

        // If path ends with "/", treat as directory
        if (str_ends_with($path, '/')) {
            $type = 'directory';
            $path = rtrim($path, '/');
        }

        $fullPath = $workspace->full_path . '/' . $path;

        // Idempotency: if already exists, do not error
        if (File::exists($fullPath)) {
            $isDir = File::isDirectory($fullPath);

            // Existing directory
            if ($type === 'directory' && $isDir) {
                return [
                    'success' => true,
                    'noop' => true,
                    'already_exists' => true,
                    'path' => $path,
                    'type' => 'directory',
                    'message' => "Directory already exists: {$path}",
                    'fs_patch' => [
                        'op' => 'create',
                        'path' => $path,
                        'type' => 'directory',
                        'noop' => true,
                        'node' => [
                            'name' => basename($path),
                            'path' => $path,
                            'type' => 'directory',
                            'size' => 0,
                            'extension' => '',
                        ],
                    ],
                ];
            }

            // Existing file
            if ($type === 'file' && !$isDir) {
                if ($overwrite) {
                    // Ensure parent directory exists (should, but safe)
                    $directory = dirname($fullPath);
                    if (!File::isDirectory($directory)) {
                        File::makeDirectory($directory, 0755, true);
                    }

                    File::put($fullPath, $content);

                    return [
                        'success' => true,
                        'path' => $path,
                        'type' => 'file',
                        'size' => strlen($content),
                        'message' => "File overwritten: {$path}",
                        'fs_patch' => [
                            'op' => 'update',
                            'path' => $path,
                            'type' => 'file',
                            'node' => [
                                'name' => basename($path),
                                'path' => $path,
                                'type' => 'file',
                                'size' => strlen($content),
                                'extension' => pathinfo($path, PATHINFO_EXTENSION),
                            ],
                        ],
                    ];
                }

                return [
                    'success' => true,
                    'noop' => true,
                    'already_exists' => true,
                    'path' => $path,
                    'type' => 'file',
                    'message' => "File already exists: {$path}",
                    'fs_patch' => [
                        'op' => 'create',
                        'path' => $path,
                        'type' => 'file',
                        'noop' => true,
                        'node' => [
                            'name' => basename($path),
                            'path' => $path,
                            'type' => 'file',
                            'size' => File::size($fullPath),
                            'extension' => pathinfo($path, PATHINFO_EXTENSION),
                        ],
                    ],
                ];
            }

            return [
                'success' => false,
                'error' => 'Path already exists with different type: ' . $path
            ];
        }

        if ($type === 'directory') {
            File::makeDirectory($fullPath, 0755, true);
            return [
                'success' => true,
                'path' => $path,
                'type' => 'directory',
                'message' => "Directory created: {$path}",
                'fs_patch' => [
                    'op' => 'create',
                    'path' => $path,
                    'type' => 'directory',
                    'node' => [
                        'name' => basename($path),
                        'path' => $path,
                        'type' => 'directory',
                        'size' => 0,
                        'extension' => '',
                    ],
                ],
            ];
        }

        // Create parent directory if needed
        $directory = dirname($fullPath);
        if (!File::isDirectory($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        File::put($fullPath, $content);

        return [
            'success' => true,
            'path' => $path,
            'type' => 'file',
            'size' => strlen($content),
            'message' => "File created: {$path}",
            'fs_patch' => [
                'op' => 'create',
                'path' => $path,
                'type' => 'file',
                'node' => [
                    'name' => basename($path),
                    'path' => $path,
                    'type' => 'file',
                    'size' => strlen($content),
                    'extension' => pathinfo($path, PATHINFO_EXTENSION),
                ],
            ],
        ];
    }

    /**
     * Write/update file content
     */
    protected function writeFile(Workspace $workspace, array $args): array
    {
        $path = ltrim($args['path'], '/');
        $content = $args['content'];
        $path = str_replace('\\', '/', $path);
        $createIfMissing = (bool) ($args['create_if_missing'] ?? false);

        $fullPath = $workspace->full_path . '/' . $path;

        if (!File::exists($fullPath)) {
            if (!$createIfMissing) {
                return [
                    'success' => false,
                    'error' => 'File not found: ' . $path
                ];
            }

            $directory = dirname($fullPath);
            if (!File::isDirectory($directory)) {
                File::makeDirectory($directory, 0755, true);
            }

            File::put($fullPath, $content);

            return [
                'success' => true,
                'path' => $path,
                'size' => strlen($content),
                'message' => "File created: {$path}",
                'fs_patch' => [
                    'op' => 'create',
                    'path' => $path,
                    'type' => 'file',
                    'node' => [
                        'name' => basename($path),
                        'path' => $path,
                        'type' => 'file',
                        'size' => strlen($content),
                        'extension' => pathinfo($path, PATHINFO_EXTENSION),
                    ],
                ],
            ];
        }

        if (File::isDirectory($fullPath)) {
            return [
                'success' => false,
                'error' => 'Cannot write to directory: ' . $path
            ];
        }

        // Backup before writing
        $backup = $fullPath . '.backup.' . time();
        File::copy($fullPath, $backup);

        try {
            File::put($fullPath, $content);
            File::delete($backup);

            return [
                'success' => true,
                'path' => $path,
                'size' => strlen($content),
                'message' => "File updated: {$path}",
                'fs_patch' => [
                    'op' => 'update',
                    'path' => $path,
                    'type' => 'file',
                    'node' => [
                        'name' => basename($path),
                        'path' => $path,
                        'type' => 'file',
                        'size' => strlen($content),
                        'extension' => pathinfo($path, PATHINFO_EXTENSION),
                    ],
                ],
            ];
        } catch (\Exception $e) {
            // Restore backup on failure
            if (File::exists($backup)) {
                File::move($backup, $fullPath);
            }
            throw $e;
        }
    }

    /**
     * Read file content
     */
    protected function readFile(Workspace $workspace, array $args): array
    {
        $path = ltrim($args['path'], '/');
        $fullPath = $workspace->full_path . '/' . $path;

        if (!File::exists($fullPath)) {
            return [
                'success' => false,
                'error' => 'File not found: ' . $path
            ];
        }

        if (File::isDirectory($fullPath)) {
            return [
                'success' => false,
                'error' => 'Cannot read directory: ' . $path
            ];
        }

        $size = File::size($fullPath);
        $maxSize = $this->security['max_file_size'] ?? 5242880;

        if ($size > $maxSize) {
            return [
                'success' => false,
                'error' => "File too large: {$path} ({$size} bytes)"
            ];
        }

        $content = File::get($fullPath);

        return [
            'success' => true,
            'path' => $path,
            'content' => $content,
            'size' => $size
        ];
    }

    /**
     * Delete file or directory
     */
    protected function deleteFile(Workspace $workspace, array $args): array
    {
        $path = ltrim($args['path'], '/');
        $path = str_replace('\\', '/', $path);
        $fullPath = $workspace->full_path . '/' . $path;

        if (!File::exists($fullPath)) {
            return [
                'success' => false,
                'error' => 'Path not found: ' . $path
            ];
        }

        $type = File::isDirectory($fullPath) ? 'directory' : 'file';

        if (File::isDirectory($fullPath)) {
            File::deleteDirectory($fullPath);
        } else {
            File::delete($fullPath);
        }

        return [
            'success' => true,
            'path' => $path,
            'type' => $type,
            'message' => ucfirst($type) . " deleted: {$path}",
            'fs_patch' => [
                'op' => 'delete',
                'path' => $path,
                'type' => $type,
            ],
        ];
    }

    /**
     * List files in directory
     */
    protected function listFiles(Workspace $workspace, array $args): array
    {
        $path = ltrim($args['path'] ?? '/', '/');
        $fullPath = $workspace->full_path . ($path ? '/' . $path : '');

        if (!File::isDirectory($fullPath)) {
            return [
                'success' => false,
                'error' => 'Not a directory: ' . $path
            ];
        }

        $items = [];

        foreach (scandir($fullPath) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $itemPath = $fullPath . '/' . $item;
            $relativePath = $path ? $path . '/' . $item : $item;

            $items[] = [
                'name' => $item,
                'path' => $relativePath,
                'type' => is_dir($itemPath) ? 'directory' : 'file',
                'size' => is_file($itemPath) ? filesize($itemPath) : 0
            ];
        }

        return [
            'success' => true,
            'path' => $path ?: '/',
            'items' => $items,
            'count' => count($items)
        ];
    }

    /**
     * Run terminal command (with restrictions)
     */
    protected function runCommand(Workspace $workspace, array $args): array
    {
        $command = $args['command'];
        $cwd = $workspace->full_path . '/' . ltrim($args['cwd'] ?? './', '/');

        // Validate command is whitelisted
        $validation = $this->validateCommand($command);
        if (!$validation['allowed']) {
            return [
                'success' => false,
                'error' => $validation['reason']
            ];
        }

        try {
            $result = Process::path($cwd)
                ->timeout(30)
                ->run($command);

            return [
                'success' => $result->successful(),
                'command' => $command,
                'output' => $result->output(),
                'error_output' => $result->errorOutput(),
                'exit_code' => $result->exitCode()
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Command execution failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Validate command against whitelist
     */
    protected function validateCommand(string $command): array
    {
        $allowedCommands = config('ai_tools.tools.5.allowed_commands', []); // runCommand tool
        $blockedPatterns = config('ai_tools.tools.5.blocked_patterns', []);

        // Check for blocked patterns
        foreach ($blockedPatterns as $pattern) {
            if (str_contains($command, $pattern)) {
                return [
                    'allowed' => false,
                    'reason' => "Blocked pattern detected: {$pattern}"
                ];
            }
        }

        // Extract command name
        $parts = explode(' ', trim($command));
        $cmd = $parts[0];

        // Check if command is whitelisted
        if (!isset($allowedCommands[$cmd])) {
            return [
                'allowed' => false,
                'reason' => "Command not whitelisted: {$cmd}"
            ];
        }

        // Check subcommands if specified
        $allowedSubcommands = $allowedCommands[$cmd];
        if (is_array($allowedSubcommands) && count($parts) > 1) {
            $subcommand = $parts[1];
            if (!in_array($subcommand, $allowedSubcommands)) {
                return [
                    'allowed' => false,
                    'reason' => "Subcommand not allowed: {$cmd} {$subcommand}"
                ];
            }
        }

        return ['allowed' => true];
    }

    /**
     * Validate tool call arguments
     */
    protected function validateToolCall(string $toolName, array $args): array
    {
        // Path traversal check
        if (isset($args['path']) && $this->security['block_path_traversal']) {
            if (str_contains($args['path'], '..')) {
                return [
                    'valid' => false,
                    'error' => 'Path traversal detected'
                ];
            }
        }

        // File extension check for write operations
        if (in_array($toolName, ['createFile', 'writeFile']) && isset($args['path'])) {
            $extension = pathinfo($args['path'], PATHINFO_EXTENSION);
            $allowedExtensions = $this->security['allowed_extensions'] ?? [];

            if ($extension && !in_array($extension, $allowedExtensions)) {
                return [
                    'valid' => false,
                    'error' => "File extension not allowed: {$extension}"
                ];
            }
        }

        // Blocked paths check
        if (isset($args['path'])) {
            $blockedPaths = $this->security['blocked_paths'] ?? [];
            foreach ($blockedPaths as $blocked) {
                if (str_starts_with($args['path'], $blocked) || str_contains($args['path'], $blocked)) {
                    return [
                        'valid' => false,
                        'error' => "Access to blocked path: {$blocked}"
                    ];
                }
            }
        }

        // File size check
        if (isset($args['content'])) {
            $size = strlen($args['content']);
            $maxSize = $this->security['max_file_size'] ?? 5242880;

            if ($size > $maxSize) {
                return [
                    'valid' => false,
                    'error' => "Content too large: {$size} bytes (max: {$maxSize})"
                ];
            }
        }

        return ['valid' => true];
    }

    /**
     * Check if tool call requires approval
     */
    protected function requiresApproval(array $toolDef, array $args, Workspace $workspace): bool
    {
        // Check base requirement
        if (!($toolDef['requires_approval'] ?? false)) {
            return false;
        }

        // Check approval rules (path patterns)
        if (isset($toolDef['approval_rules']['patterns']) && isset($args['path'])) {
            foreach ($toolDef['approval_rules']['patterns'] as $pattern => $requiresApproval) {
                if ($this->matchesPattern($args['path'], $pattern)) {
                    return $requiresApproval;
                }
            }
        }

        return $toolDef['requires_approval'] ?? false;
    }

    /**
     * Match path against pattern (supports wildcards)
     */
    protected function matchesPattern(string $path, string $pattern): bool
    {
        // Convert glob pattern to regex
        $regex = str_replace(
            ['*', '?', '{', '}', ','],
            ['.*', '.', '(', ')', '|'],
            $pattern
        );
        $regex = '#^' . $regex . '$#';

        return (bool) preg_match($regex, $path);
    }

    /**
     * Queue tool call for user approval
     */
    protected function queueForApproval(array $toolCall, Workspace $workspace, User $user, array $args): array
    {
        $approval = AICommandApproval::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'command_type' => $this->mapToolToCommandType($toolCall['name']),
            'command' => json_encode($toolCall),
            'affected_files' => isset($args['path']) ? [$args['path']] : [],
            'new_content' => json_encode($args),
            'ai_explanation' => "AI requested to execute: {$toolCall['name']}",
            'status' => 'pending'
        ]);

        return [
            'success' => false,
            'requires_approval' => true,
            'approval_id' => $approval->id,
            'message' => 'This action requires your approval. Check the Approvals panel.'
        ];
    }

    /**
     * Map tool name to command type
     */
    protected function mapToolToCommandType(string $toolName): string
    {
        return match($toolName) {
            'createFile' => 'file_create',
            'writeFile' => 'file_edit',
            'deleteFile' => 'file_delete',
            'runCommand' => 'terminal_command',
            default => 'other'
        };
    }

    /**
     * Find tool definition by name
     */
    protected function findTool(string $name): ?array
    {
        foreach ($this->tools as $tool) {
            if ($tool['name'] === $name) {
                return $tool;
            }
        }
        return null;
    }

    /**
     * Check if user has permission to execute tool
     */
    protected function hasPermission(User $user, Workspace $workspace, array $toolDef): bool
    {
        // Check workspace ownership
        if ($workspace->user_id !== $user->id && !$user->isAdmin()) {
            return false;
        }

        // All permissions granted for workspace owner
        return true;
    }

    /**
     * Get tool definitions in OpenAI function calling format
     */
    public function getToolDefinitions(): array
    {
        $definitions = [];

        foreach ($this->tools as $tool) {
            $definitions[] = [
                'type' => 'function',
                'function' => [
                    'name' => $tool['name'],
                    'description' => $tool['description'],
                    'parameters' => $tool['parameters']
                ]
            ];
        }

        return $definitions;
    }
}
