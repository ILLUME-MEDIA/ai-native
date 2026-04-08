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
            'content' => $content,
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
                'content' => $content,
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
                'content' => $content,
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
        $relCwd  = ltrim($args['cwd'] ?? './', '/');
        $cwd     = $relCwd === '' || $relCwd === './' || $relCwd === '.'
            ? $workspace->full_path
            : $workspace->full_path . '/' . $relCwd;

        // Validate command against blocklist
        $validation = $this->validateCommand($command);
        if (!$validation['allowed']) {
            return [
                'success' => false,
                'error' => $validation['reason']
            ];
        }

        try {
            $timeout = (int) config('workspaces.terminal_timeout', 300);

            if (PHP_OS_FAMILY === 'Windows') {
                $process = \Symfony\Component\Process\Process::fromShellCommandline(
                    $command, $cwd, $this->buildWindowsEnv(), null, $timeout
                );
            } else {
                // Linux/cPanel — build comprehensive PATH including nvm/nodevenv
                $homeDir     = getenv('HOME') ?: '';
                $currentPath = getenv('PATH') ?: '/usr/local/bin:/usr/bin:/bin';
                $nodeBinDir  = null;
                $whichNode   = @shell_exec('which node 2>/dev/null');
                if ($whichNode) $nodeBinDir = dirname(trim($whichNode));

                // nvm scan
                $nvmBin = null;
                $homeDirs = array_unique(array_filter(array_merge(
                    [$homeDir, '/root'],
                    (array) glob('/home/*', GLOB_ONLYDIR) ?: []
                )));
                foreach ($homeDirs as $hd) {
                    $nvmVersions = $hd . '/.nvm/versions/node';
                    if (!is_dir($nvmVersions)) continue;
                    $bins = array_filter((array) glob($nvmVersions . '/*/bin'), 'is_dir');
                    if ($bins) { rsort($bins); $nvmBin = $bins[0]; break; }
                }

                $pathParts = array_filter(array_unique(array_merge(
                    $nodeBinDir ? [$nodeBinDir] : [],
                    $nvmBin ? [$nvmBin] : [],
                    ['/usr/local/bin', '/usr/bin', '/bin'],
                    [$currentPath]
                )));

                $env = [
                    'PATH'        => implode(':', $pathParts),
                    'HOME'        => $homeDir ?: '/root',
                    'FORCE_COLOR' => '1',
                    'TERM'        => 'xterm-256color',
                ];
                $shell = is_executable('/bin/bash') ? '/bin/bash' : '/bin/sh';
                $shellArgs = ($shell === '/bin/bash')
                    ? [$shell, '-l', '-c', $command]
                    : [$shell, '-c', $command];
                $process = new \Symfony\Component\Process\Process($shellArgs, $cwd, $env, null, $timeout);
            }

            // Use start() + poll loop so the SSE stream stays alive during long
            // commands (npm install, composer install, etc.).  A plain run() would
            // block PHP for minutes with zero flushes → browser closes connection.
            $process->start();
            while ($process->isRunning()) {
                if (ob_get_level() > 0) { @ob_flush(); }
                @flush();
                usleep(200_000); // 200ms
            }

            $output = $this->stripAnsi($process->getOutput());
            $errorOutput = $this->stripAnsi($process->getErrorOutput());
            // Cap output to prevent context overflow (last 3000 chars = most relevant)
            if (mb_strlen($output) > 3000) {
                $output = '...[truncated]...' . mb_substr($output, -3000);
            }
            if (mb_strlen($errorOutput) > 1500) {
                $errorOutput = '...[truncated]...' . mb_substr($errorOutput, -1500);
            }

            return [
                'success'      => $process->isSuccessful(),
                'command'      => $command,
                'output'       => $output,
                'error_output' => $errorOutput,
                'exit_code'    => $process->getExitCode(),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error'   => 'Command execution failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Validate command against whitelist
     */
    protected function stripAnsi(string $text): string
    {
        // Strip all ANSI/VT100 escape sequences
        $clean = preg_replace('/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -\/]*[@-~])/', '', $text) ?? $text;
        // Strip remaining bracket sequences that slip through (e.g. [32m without ESC)
        $clean = preg_replace('/\[\d+(?:;\d+)*m/', '', $clean);
        // Strip carriage returns and other control characters except newline/tab
        $clean = preg_replace('/\r|\x00-\x08|\x0B|\x0C|\x0E-\x1F|\x7F/', '', $clean);
        return trim($clean);
    }

    /**
     * Build a complete Windows environment array for subprocesses (shared with TerminalController logic).
     * Ensures C:\Windows\System32 (netstat, findstr, tasklist…) and Node.js are always in PATH,
     * even when php artisan serve was started from Git Bash or another shell with an incomplete PATH.
     */
    protected function buildWindowsEnv(): array
    {
        $systemRoot  = getenv('SYSTEMROOT') ?: 'C:\\Windows';
        $currentPath = getenv('PATH') ?: '';
        $appData     = getenv('APPDATA') ?: '';

        $mustHave = [
            $systemRoot . '\\System32',
            $systemRoot,
            $systemRoot . '\\System32\\Wbem',
        ];

        // Node.js via direct detection
        $nodeDir = $this->detectWindowsNodeDir();
        if ($nodeDir) $mustHave[] = $nodeDir;

        // nvm-windows symlink folder
        if ($appData && is_dir($appData . '\\nvm\\nodejs')) $mustHave[] = $appData . '\\nvm\\nodejs';
        if ($appData && is_dir($appData . '\\npm'))          $mustHave[] = $appData . '\\npm';

        // Merge mustHave (first) with inherited PATH entries
        $parts = array_filter(explode(';', $currentPath));
        foreach (array_reverse($mustHave) as $dir) {
            $key = strtolower(rtrim(str_replace('/', '\\', $dir), '\\'));
            $found = false;
            foreach ($parts as $p) {
                if (strtolower(rtrim(str_replace('/', '\\', $p), '\\')) === $key) { $found = true; break; }
            }
            if (!$found) array_unshift($parts, $dir);
        }

        $env = ['PATH' => implode(';', $parts)];
        foreach ([
            'SYSTEMROOT', 'SYSTEMDRIVE', 'WINDIR', 'COMSPEC',
            'TEMP', 'TMP',
            'USERNAME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA',
            'HOMEDRIVE', 'HOMEPATH',
            'COMPUTERNAME', 'OS', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE',
        ] as $var) {
            $val = getenv($var);
            if ($val !== false && $val !== '') $env[$var] = $val;
        }

        // Defaults for vars missing when started from Git Bash / non-Windows shells
        $env += [
            'SYSTEMROOT'  => $systemRoot,
            'SYSTEMDRIVE' => getenv('SYSTEMDRIVE') ?: 'C:',
            'WINDIR'      => $systemRoot,
            'COMSPEC'     => $systemRoot . '\\system32\\cmd.exe',
            'OS'          => 'Windows_NT',
        ];

        return $env;
    }

    /**
     * Detect the Node.js binary directory on Windows for PATH injection.
     */
    protected function detectWindowsNodeDir(): string
    {
        // 1. Explicit config override
        $configured = (string) config('workspaces.node_path_windows', '');
        foreach (explode(';', $configured) as $p) {
            $p = trim($p);
            if ($p !== '' && is_dir($p)) return $p;
        }

        // 2. Ask where node is (fastest)
        $whereNode = @shell_exec('where node 2>NUL');
        if ($whereNode) {
            foreach (explode("\n", trim($whereNode)) as $line) {
                $line = trim($line);
                if ($line !== '' && is_file($line)) return dirname($line);
            }
        }

        // 3. Known install locations
        $userProfile = getenv('USERPROFILE') ?: 'C:\\Users\\User';
        $appData     = getenv('APPDATA')     ?: $userProfile . '\\AppData\\Roaming';
        foreach ([
            'C:\\Program Files\\nodejs',
            'C:\\Program Files (x86)\\nodejs',
            $appData . '\\nvm\\v20',   // nvm-windows
        ] as $dir) {
            if (is_dir($dir)) return $dir;
        }

        return 'C:\\Program Files\\nodejs'; // last-resort default
    }

    protected function validateCommand(string $command): array
    {
        // Find the runCommand tool config by name (not positional index)
        $runCommandConfig = collect(config('ai_tools.tools', []))->firstWhere('name', 'runCommand') ?? [];
        $allowedCommands  = $runCommandConfig['allowed_commands'] ?? [];
        $blockedPatterns  = $runCommandConfig['blocked_patterns'] ?? [];

        // Check blocked patterns first
        $devServerPatterns = ['npm run dev', 'npm start', 'node server', 'node index', 'nodemon', 'vite dev', 'vite preview'];
        foreach ($blockedPatterns as $pattern) {
            if (str_contains($command, $pattern)) {
                $isDevServer = in_array($pattern, $devServerPatterns, true);
                return [
                    'allowed' => false,
                    'reason'  => $isDevServer
                        ? "STOP. Do not retry this command. Dev servers cannot run inside PHP subprocesses on Windows. "
                          . "Your task is COMPLETE. npm install succeeded. "
                          . "Give the user a final summary and tell them to run 'npm run dev' manually in their own CMD window."
                        : "Blocked pattern detected: {$pattern}"
                ];
            }
        }

        // For chained commands (cmd1 && cmd2 | cmd3), validate EVERY sub-command.
        $subCommands = preg_split('/\s*(\|\|?|&&?|;)\s*/', $command);
        foreach ($subCommands as $sub) {
            $sub = trim($sub);
            if ($sub === '') continue;
            $firstToken = preg_split('/\s+/', $sub)[0];
            $cmd = basename($firstToken);
            if (!isset($allowedCommands[$cmd])) {
                return [
                    'allowed' => false,
                    'reason'  => "Command not in allowlist: {$cmd}. Allowed: " . implode(', ', array_keys($allowedCommands))
                ];
            }
        }

        // Re-extract first token for subcommand checks below
        $firstToken = preg_split('/\s+/', trim($command))[0];
        $cmd = basename($firstToken);

        // Check if command is whitelisted
        if (!isset($allowedCommands[$cmd])) {
            return [
                'allowed' => false,
                'reason'  => "Command not in allowlist: {$cmd}. Allowed: " . implode(', ', array_keys($allowedCommands))
            ];
        }

        // true means all subcommands allowed
        $allowedSubcommands = $allowedCommands[$cmd];
        if ($allowedSubcommands === true) {
            return ['allowed' => true];
        }

        $parts = explode(' ', trim($command));
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
