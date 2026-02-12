# Git Terminal Integration Guide

## Overview

This guide explains how Git commands work in your VS Code-like web terminal and how to properly integrate Git with your Laravel backend.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│                                                             │
│  ┌────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Terminal.jsx  │  │   GitPanel.jsx  │  │ FileExplorer│ │
│  │  (Command      │  │   (Git UI)      │  │             │ │
│  │   Input)       │  │                 │  │             │ │
│  └────────┬───────┘  └────────┬────────┘  └─────────────┘ │
│           │                   │                            │
└───────────┼───────────────────┼────────────────────────────┘
            │                   │
            │ POST /api/        │ POST /api/workspaces
            │ workspaces/{id}/  │ /{id}/git/{action}
            │ terminal/execute  │
            │                   │
┌───────────▼───────────────────▼────────────────────────────┐
│              Laravel Backend (PHP)                         │
│                                                            │
│  ┌──────────────────┐        ┌───────────────────────┐   │
│  │TerminalController│        │   GitController       │   │
│  │                  │        │                       │   │
│  │ - execute()      │        │ - init()              │   │
│  │ - streaming      │        │ - status()            │   │
│  └────────┬─────────┘        │ - commit()            │   │
│           │                  │ - push()              │   │
│           │                  └──────────┬────────────┘   │
│           │                             │                │
│           │          ┌──────────────────▼──────────┐    │
│           └─────────►│      GitService             │    │
│                      │                             │    │
│                      │ - execute()                 │    │
│                      │ - executeStreaming()        │    │
│                      │ - Command whitelisting      │    │
│                      │ - Path validation           │    │
│                      │ - Security checks           │    │
│                      └──────────┬──────────────────┘    │
│                                 │                       │
│                      ┌──────────▼──────────────────┐   │
│                      │ Symfony Process Component   │   │
│                      │                             │   │
│                      │ Executes Git commands       │   │
│                      │ with proper working dir     │   │
│                      └──────────┬──────────────────┘   │
└─────────────────────────────────┼──────────────────────┘
                                  │
                                  │
                      ┌───────────▼─────────────────┐
                      │  Git Binary (git.exe)      │
                      │                            │
                      │  C:\Program Files\Git\     │
                      │       cmd\git.exe          │
                      │                            │
                      │  Executes in workspace:    │
                      │  storage/workspaces/{id}/  │
                      └────────────────────────────┘
```

---

## How Git Commands Flow

### Scenario 1: User Types `git status` in Terminal

```
1. User types: git status
2. Frontend (Terminal.jsx) → POST /api/workspaces/123/terminal/execute
   {
     "command": "git status",
     "cwd": "/"
   }

3. TerminalController receives request
   - Validates command
   - Checks workspace permissions
   - Resolves working directory: D:\workspaces\123

4. TerminalController executes:
   Process::fromShellCommandline("git status", "D:\workspaces\123")

5. If Git NOT in PATH:
   ❌ Error: 'git' is not recognized as an internal or external command

6. If Git IN PATH:
   ✅ Git executes successfully
   ✅ Returns: On branch main, nothing to commit, working tree clean
```

### Scenario 2: User Clicks "Initialize Git" in GitPanel UI

```
1. User clicks "Initialize" button
2. Frontend (GitPanel.jsx) → POST /api/workspaces/123/git/init

3. GitController.init() receives request
   - Validates workspace permissions
   - Calls: $this->gitService->init($workspace->full_path)

4. GitService.init()
   - Validates workspace path is within allowed boundaries
   - Checks 'init' command is whitelisted
   - Executes: git init --initial-branch main
   - Sets user.name and user.email config

5. Returns to frontend:
   {
     "success": true,
     "output": "Initialized empty Git repository...",
     "error": "",
     "exit_code": 0
   }
```

---

## Security Layers

### 1. Command Whitelisting (GitService)

```php
private array $allowedCommands = [
    'init', 'status', 'add', 'commit', 'push', 'pull', // Safe commands
    // 'filter-branch', 'gc' // Blocked dangerous commands
];
```

**Why?** Prevents users from running destructive Git commands that could:
- Corrupt repository history (`filter-branch`, `gc --prune=now`)
- Delete branches forcefully
- Modify Git internals

### 2. Path Validation (ResolvesWorkspacePaths)

```php
// Before:
$userInput = "../../etc/passwd" // Path traversal attempt

// After validation:
$resolvedPath = D:\workspaces\123\etc\passwd // Within workspace boundary
// OR throws exception if outside workspace
```

**Why?** Prevents path traversal attacks accessing system files.

### 3. Workspace Isolation

```php
// Each workspace has isolated directory
storage/workspaces/
├── workspace-1/       ← User A's workspace
│   ├── .git/
│   └── files...
├── workspace-2/       ← User B's workspace
│   ├── .git/
│   └── files...
```

**Why?** Users can't access each other's files or Git repositories.

### 4. Authorization Checks

```php
public function init(Workspace $workspace)
{
    $this->authorize('update', $workspace); // Policy check
    // Only owner can modify workspace
}
```

**Why?** Laravel Policies ensure only authorized users can perform Git operations.

---

## Common Git Errors & Solutions

### Error 1: `'git' is not recognized`

**Root Cause:**
- Git not installed
- Git not in System PATH
- Web server hasn't reloaded PATH after Git installation

**Solution:**
```powershell
# 1. Verify Git is installed
git --version

# 2. Check if Git is in PATH
where git
# Expected: C:\Program Files\Git\cmd\git.exe

# 3. If not found, add to System PATH
$env:Path += ";C:\Program Files\Git\cmd"

# 4. Restart web server (IIS/Apache)
iisreset /restart  # For IIS
net stop Apache2.4 && net start Apache2.4  # For Apache

# 5. Verify from PHP
php -r "exec('git --version', $out); print_r($out);"
```

### Error 2: `fatal: not a git repository`

**Root Cause:**
- Git not initialized in workspace
- Working directory incorrect

**Solution:**
```bash
# Initialize Git in workspace
POST /api/workspaces/123/git/init

# Or via terminal:
cd /
git init
```

### Error 3: `Permission denied` (Windows)

**Root Cause:**
- Web server user lacks permissions on workspace directory
- Antivirus blocking Git operations

**Solution:**
```powershell
# Grant permissions to IIS user
icacls "D:\workspaces" /grant "IIS_IUSRS:(OI)(CI)F" /T

# Or for specific user (e.g., Apache)
icacls "D:\workspaces" /grant "NETWORK SERVICE:(OI)(CI)F" /T
```

### Error 4: `fatal: could not read Username`

**Root Cause:**
- Git prompting for credentials (push/pull operations)
- No credential helper configured

**Solution:**
```php
// In GitService, set environment to disable prompts
$process = new Process(
    $command,
    $workspacePath,
    [
        'GIT_TERMINAL_PROMPT' => '0',  // Disable prompts
        'GIT_ASKPASS' => 'echo'        // Auto-deny password prompts
    ]
);
```

---

## Environment Variables (.env)

Add these to your `.env` file:

```env
# Git Configuration
GIT_BINARY_PATH="C:\Program Files\Git\cmd\git.exe"  # Optional: explicit path
GIT_DEFAULT_USER_NAME="Workspace User"
GIT_DEFAULT_USER_EMAIL="workspace@yourdomain.com"
GIT_TIMEOUT=300  # Command timeout in seconds
GIT_LOGGING_ENABLED=true
GIT_LOG_CHANNEL=daily

# Security
GIT_DISABLE_FORCE_PUSH=true
GIT_REQUIRE_AUTH_REMOTE=true

# Workspace Configuration
WORKSPACE_GIT_TIMEOUT=60  # For legacy config/workspaces.php
```

---

## Testing Git Integration

### Test 1: Check Git Availability

```bash
php artisan diagnose:git
```

**Expected Output:**
```
=== Git Environment Diagnostics ===

1. Checking if Git is in PATH...
✅ Git command is available
   Output: git version 2.43.0.windows.1

2. Checking Git version...
✅ Git version: git version 2.43.0.windows.1
   Version is up to date ✓

3. Locating Git executable...
✅ Git found at:
   📍 C:\Program Files\Git\cmd\git.exe

4. Checking PHP PATH environment...
📂 PHP PATH environment:
   ✅ C:\Program Files\Git\cmd
```

### Test 2: Test via Laravel Tinker

```bash
php artisan tinker
```

```php
>>> $gitService = app(\App\Services\Git\GitService::class);
>>> $gitService->getVersion();
=> "git version 2.43.0.windows.1"

>>> $gitService->isGitAvailable();
=> true

>>> $workspacePath = storage_path('workspaces/test-workspace');
>>> if (!is_dir($workspacePath)) mkdir($workspacePath, 0755, true);
>>> $result = $gitService->init($workspacePath);
>>> $result['success'];
=> true
```

### Test 3: Test via API (Postman/cURL)

```bash
# Initialize Git
curl -X POST http://localhost:8000/api/workspaces/1/git/init \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Expected Response:
{
  "success": true,
  "output": "Initialized empty Git repository in D:/workspaces/1/.git/\n",
  "error": "",
  "exit_code": 0,
  "working_directory": "D:/workspaces/1"
}

# Check Git status
curl -X GET http://localhost:8000/api/workspaces/1/git/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected Response:
{
  "success": true,
  "output": "## No commits yet on main\n",
  "error": "",
  "branch": "main",
  "changes": []
}
```

### Test 4: Test via Web Terminal

1. Navigate to Code Editor
2. Open Terminal panel
3. Type: `git init`
4. Expected: "Initialized empty Git repository..."
5. Type: `git status`
6. Expected: "On branch main, No commits yet"

---

## Streaming Git Output (Real-Time)

For long-running Git operations (clone, pull, push), use streaming:

### Backend (Controller)

```php
use Symfony\Component\HttpFoundation\StreamedResponse;

public function cloneStream(Request $request, Workspace $workspace)
{
    $url = $request->input('url');

    return new StreamedResponse(function() use ($workspace, $url) {
        $this->gitService->executeStreaming(
            $workspace->full_path,
            ['clone', $url, '.'],
            function($output, $isError) {
                // Send SSE event
                echo "data: " . json_encode([
                    'type' => $isError ? 'stderr' : 'stdout',
                    'output' => $output
                ]) . "\n\n";

                ob_flush();
                flush();
            }
        );

        echo "event: done\ndata: {}\n\n";
    }, 200, [
        'Content-Type' => 'text/event-stream',
        'Cache-Control' => 'no-cache',
        'X-Accel-Buffering' => 'no',
    ]);
}
```

### Frontend (React)

```javascript
async function cloneRepository(url) {
    const response = await fetch(`/api/workspaces/${workspaceId}/git/clone-stream`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ url })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = JSON.parse(line.substring(6));
                console.log(data.output);
                // Update UI with streaming output
            }
        }
    }
}
```

---

## Production Checklist

Before deploying Git integration to production:

- [ ] Git installed on server: `git --version` works
- [ ] Git in System PATH (not just User PATH)
- [ ] Web server restarted after Git installation
- [ ] GitService registered in Laravel container
- [ ] Git config values set in `.env`
- [ ] Workspace permissions configured (755 or 775)
- [ ] Git user.name and user.email configured globally
- [ ] Safe directory configured: `git config --global --add safe.directory '*'`
- [ ] Command whitelisting reviewed in `config/git.php`
- [ ] Path validation tested (try `../../etc/passwd` - should fail)
- [ ] Authorization policies tested (other users can't access workspace)
- [ ] Tested Git operations: init, status, add, commit, push, pull
- [ ] Tested terminal Git commands: `git status`, `git log`, etc.
- [ ] Tested streaming for long operations (clone, push large repos)
- [ ] Error handling tested (invalid commands, network failures)
- [ ] Logging configured and working
- [ ] Backup strategy in place for workspace Git repositories

---

## Advanced Topics

### Custom Git Binary Path

If Git is installed in a non-standard location:

```php
// config/git.php
'binary_path' => 'D:\PortableApps\Git\cmd\git.exe',
```

### Per-Workspace Git Configuration

```php
// Set different user for specific workspace
$gitService->execute($workspacePath, [
    'config', 'user.name', 'Client A'
]);
$gitService->execute($workspacePath, [
    'config', 'user.email', 'client-a@example.com'
]);
```

### SSH Key Management

For GitHub/GitLab operations with SSH:

```bash
# Generate SSH key per workspace (optional)
ssh-keygen -t ed25519 -C "workspace-123@yourdomain.com" -f storage/workspaces/123/.ssh/id_ed25519

# Configure Git to use specific SSH key
git config core.sshCommand "ssh -i ~/.ssh/id_ed25519"
```

### Git Hooks in Workspaces

```php
// Copy Git hooks template to workspace
$hooksSource = resource_path('git-hooks');
$hooksTarget = $workspace->full_path . '/.git/hooks';

copy($hooksSource . '/pre-commit', $hooksTarget . '/pre-commit');
chmod($hooksTarget . '/pre-commit', 0755);
```

---

## Troubleshooting

### Git Works in CMD but Not in Laravel

**Problem:** `git --version` works in Command Prompt but fails in Laravel.

**Cause:** Different PATH environments.

**Solution:**
```php
// Check PHP's PATH
dd(getenv('PATH'));

// Compare with CMD PATH
// CMD: echo %PATH%

// If Git path missing, explicitly set in Laravel bootstrap
// bootstrap/app.php
putenv('PATH=' . getenv('PATH') . ';C:\Program Files\Git\cmd');
```

### Slow Git Operations

**Problem:** Git commands take too long or timeout.

**Solutions:**
- Increase timeout: `$gitService->setTimeout(600);`
- Use shallow clone: `git clone --depth 1 <url>`
- Optimize repository: `git gc --aggressive` (run manually)
- Use Git LFS for large files

### Git Hangs on Push/Pull

**Problem:** Git prompts for credentials, hangs indefinitely.

**Solution:**
```php
// Disable interactive prompts
$process = new Process(
    $command,
    $workspacePath,
    [
        'GIT_TERMINAL_PROMPT' => '0',
        'GIT_ASKPASS' => 'echo',
        'GIT_SSH_COMMAND' => 'ssh -o BatchMode=yes'
    ]
);
```

---

**Last Updated:** 2026-02-12
**Status:** Production-Ready
**Tested:** Windows Server 2019/2022, Laravel 10/11
