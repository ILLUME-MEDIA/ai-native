<?php

namespace App\Services\Git;

use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Illuminate\Support\Facades\Log;

/**
 * GitService - Production-ready Git command execution
 *
 * Handles Git operations safely within workspace boundaries
 * with proper error handling, security, and streaming support.
 */
class GitService
{
    /**
     * Git binary path (auto-detected or from config)
     */
    private string $gitBinary;

    /**
     * Maximum execution time for Git commands (seconds)
     */
    private int $timeout = 300;

    /**
     * Allowed Git commands (whitelist for security)
     */
    private array $allowedCommands = [
        'init', 'status', 'add', 'commit', 'push', 'pull', 'fetch',
        'branch', 'checkout', 'merge', 'log', 'diff', 'clone',
        'remote', 'tag', 'stash', 'reset', 'revert', 'show',
        'config', 'ls-files', 'rev-parse', 'describe'
    ];

    /**
     * Blocked dangerous commands
     */
    private array $blockedCommands = [
        'filter-branch', 'gc', 'prune', 'reflog', 'fsck'
    ];

    public function __construct()
    {
        $this->gitBinary = $this->detectGitBinary();
    }

    /**
     * Detect Git binary location
     */
    private function detectGitBinary(): string
    {
        // Check config first
        $configPath = config('git.binary_path');
        if ($configPath && file_exists($configPath)) {
            return $configPath;
        }

        // Try common locations on Windows
        $commonPaths = [
            'C:\\Program Files\\Git\\cmd\\git.exe',
            'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
        ];

        foreach ($commonPaths as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        // Fallback to PATH
        return 'git';
    }

    /**
     * Execute a Git command in a workspace
     *
     * @param string $workspacePath Absolute path to workspace directory
     * @param array $arguments Git command arguments ['status', '--short']
     * @param callable|null $outputCallback Callback for streaming output
     * @return array ['success' => bool, 'output' => string, 'error' => string, 'exit_code' => int]
     */
    public function execute(
        string $workspacePath,
        array $arguments,
        ?callable $outputCallback = null
    ): array {
        // Validate workspace path
        if (!$this->isValidWorkspacePath($workspacePath)) {
            return $this->errorResponse('Invalid workspace path', 1);
        }

        // Validate command
        if (!$this->isAllowedCommand($arguments)) {
            return $this->errorResponse('Command not allowed for security reasons', 1);
        }

        // Ensure Git binary exists
        if (!$this->isGitAvailable()) {
            return $this->errorResponse('Git is not installed or not in PATH', 127);
        }

        try {
            // Prepare command
            $command = array_merge([$this->gitBinary], $arguments);

            // Create process
            $process = new Process(
                $command,
                $workspacePath,
                null,
                null,
                $this->timeout
            );

            // Run with optional streaming
            if ($outputCallback) {
                $process->run($outputCallback);
            } else {
                $process->run();
            }

            // Log the command (without sensitive data)
            $this->logGitCommand($workspacePath, $arguments, $process->getExitCode());

            return [
                'success' => $process->isSuccessful(),
                'output' => $process->getOutput(),
                'error' => $process->getErrorOutput(),
                'exit_code' => $process->getExitCode(),
                'working_directory' => $workspacePath,
            ];

        } catch (ProcessFailedException $e) {
            Log::error('Git command failed', [
                'workspace' => $workspacePath,
                'command' => $arguments,
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse($e->getMessage(), 1);

        } catch (\Exception $e) {
            Log::error('Git execution exception', [
                'workspace' => $workspacePath,
                'command' => $arguments,
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse('Git execution failed: ' . $e->getMessage(), 1);
        }
    }

    /**
     * Execute Git command with streaming output (for terminal)
     *
     * @param string $workspacePath
     * @param array $arguments
     * @param callable $streamCallback Function to call with output chunks
     * @return array
     */
    public function executeStreaming(
        string $workspacePath,
        array $arguments,
        callable $streamCallback
    ): array {
        return $this->execute($workspacePath, $arguments, function ($type, $buffer) use ($streamCallback) {
            $isError = $type === Process::ERR;
            $streamCallback($buffer, $isError);
        });
    }

    /**
     * Initialize a Git repository
     */
    public function init(string $workspacePath, string $defaultBranch = 'main'): array
    {
        $result = $this->execute($workspacePath, ['init', '--initial-branch', $defaultBranch]);

        if ($result['success']) {
            // Set basic configuration
            $this->execute($workspacePath, ['config', 'user.name', config('git.default_user_name', 'Workspace User')]);
            $this->execute($workspacePath, ['config', 'user.email', config('git.default_user_email', 'workspace@example.com')]);
        }

        return $result;
    }

    /**
     * Get Git status
     */
    public function status(string $workspacePath, bool $short = true): array
    {
        $args = $short ? ['status', '--short', '--branch'] : ['status'];
        return $this->execute($workspacePath, $args);
    }

    /**
     * Stage files
     */
    public function add(string $workspacePath, array $files = ['.']): array
    {
        return $this->execute($workspacePath, array_merge(['add'], $files));
    }

    /**
     * Commit changes
     */
    public function commit(string $workspacePath, string $message, array $options = []): array
    {
        $args = ['commit', '-m', $message];

        if (isset($options['amend']) && $options['amend']) {
            $args[] = '--amend';
        }

        if (isset($options['allow_empty']) && $options['allow_empty']) {
            $args[] = '--allow-empty';
        }

        return $this->execute($workspacePath, $args);
    }

    /**
     * Get commit log
     */
    public function log(string $workspacePath, int $limit = 10, array $options = []): array
    {
        $args = ['log', "--max-count={$limit}", '--pretty=format:%H|%an|%ae|%at|%s'];

        if (isset($options['branch'])) {
            $args[] = $options['branch'];
        }

        return $this->execute($workspacePath, $args);
    }

    /**
     * Create a branch
     */
    public function createBranch(string $workspacePath, string $branchName): array
    {
        return $this->execute($workspacePath, ['branch', $branchName]);
    }

    /**
     * Checkout a branch
     */
    public function checkout(string $workspacePath, string $branchName, bool $create = false): array
    {
        $args = ['checkout'];

        if ($create) {
            $args[] = '-b';
        }

        $args[] = $branchName;

        return $this->execute($workspacePath, $args);
    }

    /**
     * Get diff
     */
    public function diff(string $workspacePath, ?string $file = null, bool $cached = false): array
    {
        $args = ['diff'];

        if ($cached) {
            $args[] = '--cached';
        }

        if ($file) {
            $args[] = '--';
            $args[] = $file;
        }

        return $this->execute($workspacePath, $args);
    }

    /**
     * Add remote
     */
    public function addRemote(string $workspacePath, string $name, string $url): array
    {
        return $this->execute($workspacePath, ['remote', 'add', $name, $url]);
    }

    /**
     * Push to remote
     */
    public function push(
        string $workspacePath,
        string $remote = 'origin',
        ?string $branch = null,
        array $options = []
    ): array {
        $args = ['push', $remote];

        if ($branch) {
            $args[] = $branch;
        }

        if (isset($options['set_upstream']) && $options['set_upstream']) {
            array_splice($args, 1, 0, ['-u']);
        }

        if (isset($options['force']) && $options['force']) {
            $args[] = '--force';
        }

        return $this->execute($workspacePath, $args);
    }

    /**
     * Pull from remote
     */
    public function pull(string $workspacePath, string $remote = 'origin', ?string $branch = null): array
    {
        $args = ['pull', $remote];

        if ($branch) {
            $args[] = $branch;
        }

        return $this->execute($workspacePath, $args);
    }

    /**
     * Check if a path is a valid workspace
     */
    private function isValidWorkspacePath(string $path): bool
    {
        // Must be absolute path
        if (!$this->isAbsolutePath($path)) {
            return false;
        }

        // Must exist
        if (!is_dir($path)) {
            return false;
        }

        // Must be within allowed workspace root
        $workspaceRoot = realpath(storage_path('workspaces'));
        $resolvedPath = realpath($path);

        if ($resolvedPath === false) {
            return false;
        }

        // Path traversal prevention
        return str_starts_with($resolvedPath, $workspaceRoot);
    }

    /**
     * Check if path is absolute
     */
    private function isAbsolutePath(string $path): bool
    {
        // Windows: C:\ or \\server\share
        if (preg_match('/^[A-Za-z]:\\\\/', $path) || preg_match('/^\\\\\\\\/', $path)) {
            return true;
        }

        // Unix: /path
        if (str_starts_with($path, '/')) {
            return true;
        }

        return false;
    }

    /**
     * Check if command is allowed
     */
    private function isAllowedCommand(array $arguments): bool
    {
        if (empty($arguments)) {
            return false;
        }

        $command = $arguments[0];

        // Check if command is blocked
        if (in_array($command, $this->blockedCommands)) {
            Log::warning('Blocked dangerous Git command', ['command' => $command]);
            return false;
        }

        // Check if command is in whitelist
        if (!in_array($command, $this->allowedCommands)) {
            Log::warning('Git command not in whitelist', ['command' => $command]);
            return false;
        }

        return true;
    }

    /**
     * Check if Git is available
     */
    public function isGitAvailable(): bool
    {
        try {
            $process = new Process([$this->gitBinary, '--version']);
            $process->run();
            return $process->isSuccessful();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get Git version
     */
    public function getVersion(): ?string
    {
        try {
            $process = new Process([$this->gitBinary, '--version']);
            $process->run();

            if ($process->isSuccessful()) {
                return trim($process->getOutput());
            }
        } catch (\Exception $e) {
            // Ignore
        }

        return null;
    }

    /**
     * Log Git command execution
     */
    private function logGitCommand(string $workspacePath, array $arguments, int $exitCode): void
    {
        Log::info('Git command executed', [
            'workspace' => basename($workspacePath),
            'command' => implode(' ', $arguments),
            'exit_code' => $exitCode,
            'success' => $exitCode === 0,
        ]);
    }

    /**
     * Create error response
     */
    private function errorResponse(string $message, int $exitCode = 1): array
    {
        return [
            'success' => false,
            'output' => '',
            'error' => $message,
            'exit_code' => $exitCode,
            'working_directory' => null,
        ];
    }

    /**
     * Set execution timeout
     */
    public function setTimeout(int $seconds): self
    {
        $this->timeout = $seconds;
        return $this;
    }

    /**
     * Get allowed commands list
     */
    public function getAllowedCommands(): array
    {
        return $this->allowedCommands;
    }

    /**
     * Check if workspace is a Git repository
     */
    public function isGitRepository(string $workspacePath): bool
    {
        $gitDir = $workspacePath . DIRECTORY_SEPARATOR . '.git';
        return is_dir($gitDir);
    }
}
