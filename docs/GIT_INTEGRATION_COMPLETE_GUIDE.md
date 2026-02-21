# Complete Git Integration Guide for VS Code-Like Workspace

## 🎯 Executive Summary

This guide provides a **production-ready solution** for integrating Git into your Laravel-based VS Code-like web workspace system. After following this guide, users will be able to:

- Execute Git commands through the web terminal
- Use Git UI panels (status, commit, push, pull)
- Have Git operations sandboxed per workspace
- Stream real-time Git output for long operations
- Maintain security and prevent unauthorized access

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Root Cause Analysis](#root-cause-analysis)
3. [Installation & Setup](#installation--setup)
4. [Backend Architecture](#backend-architecture)
5. [Security Implementation](#security-implementation)
6. [Testing & Verification](#testing--verification)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### For Impatient Developers (5 Minutes)

```bash
# Step 1: Install Git for Windows
# Download from: https://git-scm.com/download/win
# IMPORTANT: Select "Git from the command line and also from 3rd-party software"

# Step 2: Verify Git installation
git --version
where git

# Step 3: Test Git from PHP
php -r "exec('git --version', $out); print_r($out);"

# Step 4: Run diagnostic
php artisan diagnose:git

# Step 5: Restart web server
iisreset /restart  # For IIS
# OR
net stop Apache2.4 && net start Apache2.4  # For Apache

# Step 6: Test in your web terminal
# Navigate to Code Editor → Terminal
# Type: git init
# Type: git status
```

**If all commands work:** ✅ You're done! Git is integrated.

**If commands fail:** ⚠️ Continue reading this guide.

---

## 🔍 Root Cause Analysis

### Why `'git' is not recognized` Error Occurs

Your error shows:
```json
{
  "success": false,
  "output": "",
  "error": "'git' is not recognized as an internal or external command",
  "exit_code": 1,
  "working_directory": "/"
}
```

**Root Causes:**

1. **Git Not Installed**
   - Git for Windows is not installed on the server
   - Solution: Install from https://git-scm.com/download/win

2. **PATH Not Configured**
   - Git installed but not added to System PATH
   - Only added to User PATH (not visible to web server)
   - Solution: Add `C:\Program Files\Git\cmd` to System PATH

3. **Web Server Context**
   - IIS/Apache runs under different user account (NETWORK SERVICE, IIS APPPOOL\DefaultAppPool)
   - This user has different PATH environment than your user account
   - Git must be in **System PATH**, not just User PATH

4. **Service Not Restarted**
   - Even after adding to PATH, web server must be restarted to load new environment
   - Solution: `iisreset` or restart Apache service

5. **Working Directory Issue**
   - Your error shows `"working_directory": "/"` (root)
   - Commands should execute in workspace directory: `D:\workspaces\123\`
   - Our GitService fixes this automatically

### Environment Hierarchy

```
┌─────────────────────────────────────────────┐
│ Your User Account                            │
│ PATH: C:\Windows\System32;...;C:\Git\cmd    │ ← Git works here
└─────────────────────────────────────────────┘
                    ↓ Different user
┌─────────────────────────────────────────────┐
│ IIS Application Pool User                    │
│ (IIS APPPOOL\DefaultAppPool)                │
│ PATH: C:\Windows\System32;...               │ ← Git NOT here!
│       ❌ No Git path!                        │
└─────────────────────────────────────────────┘
                    ↓ Runs as
┌─────────────────────────────────────────────┐
│ PHP Process (php-cgi.exe)                   │
│ Inherits PATH from IIS user                 │
│ exec('git') → NOT FOUND ❌                   │
└─────────────────────────────────────────────┘
```

**Solution:** Add Git to **System PATH** so all users/services can access it.

---

## 🛠️ Installation & Setup

### Step 1: Install Git for Windows

See detailed guide: [docs/GIT_INSTALLATION_WINDOWS.md](docs/GIT_INSTALLATION_WINDOWS.md)

**Quick Version:**

1. Download: https://git-scm.com/download/win
2. Run installer
3. **CRITICAL:** Select "Git from the command line and also from 3rd-party software"
4. Complete installation
5. Verify: `git --version` in CMD

### Step 2: Configure System PATH

**Option A: Automatic (Run as Administrator)**

```powershell
# Run PowerShell as Administrator
$gitPath = "C:\Program Files\Git\cmd"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

if ($currentPath -notlike "*$gitPath*") {
    $newPath = "$currentPath;$gitPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
    Write-Host "✅ Git added to System PATH" -ForegroundColor Green
} else {
    Write-Host "Git already in System PATH" -ForegroundColor Yellow
}
```

**Option B: Manual (GUI)**

1. Press `Win + R`
2. Type: `sysdm.cpl`
3. Click **Advanced** tab → **Environment Variables**
4. Under **System variables**, select `Path` → **Edit**
5. Click **New** → Add: `C:\Program Files\Git\cmd`
6. Click **OK** on all windows

### Step 3: Restart Services

**CRITICAL:** Web server must be restarted for new PATH to take effect.

```powershell
# For IIS
iisreset /stop
iisreset /start

# For Apache (XAMPP/WAMP)
net stop Apache2.4
net start Apache2.4

# For Nginx
net stop nginx
net start nginx
```

### Step 4: Verify Installation

Run the test script:

```bash
cd D:\LaravelCMS2\myapps
test-git-integration.bat
```

**Expected Output:**
```
======================================
Git Integration Test Script
======================================

[1/6] Checking if Git is installed...
git version 2.43.0.windows.1
[PASS] Git is installed

[2/6] Locating Git executable...
C:\Program Files\Git\cmd\git.exe
[PASS] Git executable found

[3/6] Checking PHP availability...
PHP 8.2.12 (cli)
[PASS] PHP is available

[4/6] Testing Git execution from PHP...
git version 2.43.0.windows.1
[PASS] PHP can execute Git commands

[5/6] Testing Laravel Git diagnostics...
=== Git Environment Diagnostics ===
✅ Git command is available
✅ Git version: git version 2.43.0.windows.1
[PASS] Laravel can access Git

[6/6] Checking workspace directory...
[PASS] Workspace directory exists: storage\workspaces

======================================
Test Summary
======================================

If all tests passed, Git integration is ready!
```

### Step 5: Configure Laravel Environment

Update your `.env` file:

```env
# Git Configuration
GIT_BINARY_PATH=  # Leave empty for auto-detection
GIT_DEFAULT_USER_NAME="Workspace System"
GIT_DEFAULT_USER_EMAIL="workspace@yourdomain.com"
GIT_TIMEOUT=300

# Logging
GIT_LOGGING_ENABLED=true
GIT_LOG_CHANNEL=daily

# Security
GIT_DISABLE_FORCE_PUSH=true
GIT_REQUIRE_AUTH_REMOTE=true
```

### Step 6: Register GitService

The `GitService` is automatically available via dependency injection. No additional registration needed.

### Step 7: Configure Git Globally (Optional)

```bash
# Set global Git configuration for server
git config --global user.name "Workspace Server"
git config --global user.email "server@yourdomain.com"
git config --global init.defaultBranch main
git config --global core.autocrlf true  # For Windows
git config --global --add safe.directory '*'  # Allow all workspace directories
```

---

## 🏗️ Backend Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│                                                          │
│  Terminal.jsx → User types: git status                  │
│  GitPanel.jsx → User clicks: "Initialize Git"           │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP Request
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  Laravel Controllers                     │
│                                                          │
│  TerminalController  →  Handles: git status, git commit │
│  GitController       →  Handles: init(), push(), pull() │
└────────────────────────┬────────────────────────────────┘
                         │ Uses
                         ↓
┌─────────────────────────────────────────────────────────┐
│                      GitService                          │
│                                                          │
│  ✅ Command whitelisting (only safe commands)           │
│  ✅ Path validation (prevent path traversal)            │
│  ✅ Workspace isolation (each workspace separate)       │
│  ✅ Streaming support (real-time output)                │
│  ✅ Error handling & logging                            │
└────────────────────────┬────────────────────────────────┘
                         │ Executes
                         ↓
┌─────────────────────────────────────────────────────────┐
│             Symfony Process Component                    │
│                                                          │
│  Process(['git', 'status'], '/path/to/workspace')       │
└────────────────────────┬────────────────────────────────┘
                         │ Spawns
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  Git Binary (git.exe)                    │
│                                                          │
│  Executes in: D:\workspaces\123\                        │
│  Returns: stdout, stderr, exit code                     │
└─────────────────────────────────────────────────────────┘
```

### File Structure

```
app/
├── Console/Commands/
│   └── DiagnoseGit.php                    ← Diagnostic command
├── Http/Controllers/Workspace/
│   ├── GitController.php                  ← Updated to use GitService
│   └── TerminalController.php             ← Already handles shell commands
├── Services/Git/
│   └── GitService.php                     ← NEW: Core Git service
└── Support/
    └── ResolvesWorkspacePaths.php         ← Path validation trait

config/
└── git.php                                ← NEW: Git configuration

docs/
├── GIT_INSTALLATION_WINDOWS.md            ← Installation guide
├── GIT_TERMINAL_INTEGRATION.md            ← Integration guide
└── GIT_INTEGRATION_COMPLETE_GUIDE.md      ← This file

test-git-integration.bat                    ← Quick test script
```

### GitService API

```php
use App\Services\Git\GitService;

$gitService = app(GitService::class);

// Initialize repository
$result = $gitService->init($workspacePath);

// Get status
$result = $gitService->status($workspacePath, $short = true);

// Stage files
$result = $gitService->add($workspacePath, ['.']);

// Commit
$result = $gitService->commit($workspacePath, 'Initial commit');

// Push to remote
$result = $gitService->push($workspacePath, 'origin', 'main');

// Pull from remote
$result = $gitService->pull($workspacePath);

// Get log
$result = $gitService->log($workspacePath, $limit = 10);

// Get diff
$result = $gitService->diff($workspacePath, $file = null);

// Execute custom command
$result = $gitService->execute($workspacePath, ['log', '--oneline', '-5']);

// Streaming execution (for terminal)
$result = $gitService->executeStreaming(
    $workspacePath,
    ['clone', 'https://github.com/laravel/laravel.git', '.'],
    function($output, $isError) {
        echo $output;
    }
);
```

**Response Format:**
```php
[
    'success' => true,              // Command succeeded
    'output' => "...",              // Standard output
    'error' => "",                  // Error output (if any)
    'exit_code' => 0,               // Exit code (0 = success)
    'working_directory' => "..."    // Workspace path
]
```

---

## 🔒 Security Implementation

### 1. Command Whitelisting

Only safe Git commands are allowed:

```php
// config/git.php
'allowed_commands' => [
    'init', 'status', 'add', 'commit', 'push', 'pull', 'fetch',
    'branch', 'checkout', 'merge', 'log', 'diff', 'clone',
    'remote', 'tag', 'stash', 'reset', 'revert', 'show',
    // ...
],

'blocked_commands' => [
    'filter-branch',  // Can rewrite history
    'gc',            // Can delete objects
    'prune',         // Can delete refs
    'fsck',          // Internal operations
    // ...
],
```

**Why?** Prevents users from running dangerous commands that could:
- Corrupt repository history
- Delete important data
- Expose internal Git structures
- Cause server issues

### 2. Path Validation

All file paths are validated before execution:

```php
// Example of path traversal attack
$maliciousPath = "../../../../../../etc/passwd";

// GitService validates and blocks
if (!$this->isValidWorkspacePath($maliciousPath)) {
    return $this->errorResponse('Invalid workspace path', 1);
}

// Only paths within storage/workspaces/ are allowed
// D:\workspaces\123\file.txt ✅ Allowed
// D:\Windows\System32\cmd.exe ❌ Blocked
```

### 3. Workspace Isolation

Each workspace is completely isolated:

```
storage/workspaces/
├── workspace-1/           ← User A
│   ├── .git/
│   ├── src/
│   └── README.md
├── workspace-2/           ← User B
│   ├── .git/
│   ├── app/
│   └── package.json
└── workspace-3/           ← User C
    ├── .git/
    └── index.html
```

**Enforcement:**
- Laravel policies: `$this->authorize('update', $workspace)`
- Path resolution: `ResolvesWorkspacePaths` trait
- Git working directory: Always set to workspace path

### 4. Credential Protection

Git operations that require credentials are handled securely:

```php
$process = new Process(
    $command,
    $workspacePath,
    [
        'GIT_TERMINAL_PROMPT' => '0',  // Disable password prompts
        'GIT_ASKPASS' => 'echo',       // Auto-deny credentials
        'GIT_SSH_COMMAND' => 'ssh -o BatchMode=yes'  // No SSH interaction
    ]
);
```

**Why?** Prevents Git from:
- Hanging indefinitely waiting for credentials
- Exposing sensitive information
- Blocking the web server

### 5. Authorization Policies

```php
// app/Policies/WorkspacePolicy.php

class WorkspacePolicy
{
    public function update(User $user, Workspace $workspace): bool
    {
        // Only workspace owner can modify
        return $user->id === $workspace->user_id;
    }

    public function view(User $user, Workspace $workspace): bool
    {
        // Owner + collaborators can view
        return $user->id === $workspace->user_id
            || $workspace->collaborators->contains($user);
    }
}
```

### 6. Rate Limiting

Add to `app/Http/Kernel.php`:

```php
protected $middlewareGroups = [
    'api' => [
        \Illuminate\Routing\Middleware\ThrottleRequests::class.':60,1',
        // Git operations limited to 60 per minute
    ],
];
```

Or per-route:

```php
Route::post('git/push', [GitController::class, 'push'])
    ->middleware('throttle:10,1'); // 10 pushes per minute max
```

---

## ✅ Testing & Verification

### Test Suite

#### Test 1: System-Level Git

```bash
# Test 1.1: Git version
git --version
# Expected: git version 2.43.0.windows.1

# Test 1.2: Git location
where git
# Expected: C:\Program Files\Git\cmd\git.exe

# Test 1.3: Git from PHP
php -r "exec('git --version', $out); print_r($out);"
# Expected: Array([0] => git version 2.43.0.windows.1)
```

#### Test 2: Laravel Artisan

```bash
# Test 2.1: Diagnostic command
php artisan diagnose:git
# Expected: All checks pass with ✅

# Test 2.2: Tinker test
php artisan tinker
>>> app(\App\Services\Git\GitService::class)->isGitAvailable()
=> true
>>> app(\App\Services\Git\GitService::class)->getVersion()
=> "git version 2.43.0.windows.1"
```

#### Test 3: API Endpoints

```bash
# Test 3.1: Initialize Git (adjust workspace ID and token)
curl -X POST http://localhost:8000/api/workspaces/1/git/init \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Expected Response:
{
  "success": true,
  "output": "Initialized empty Git repository...",
  "error": "",
  "exit_code": 0
}

# Test 3.2: Git Status
curl -X GET http://localhost:8000/api/workspaces/1/git/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected Response:
{
  "success": true,
  "output": "## No commits yet on main\n",
  "branch": "main",
  "changes": []
}

# Test 3.3: Terminal Command
curl -X POST http://localhost:8000/api/workspaces/1/terminal/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"command": "git status"}'

# Expected Response:
{
  "success": true,
  "output": "On branch main\nNothing to commit...",
  "error": "",
  "exit_code": 0,
  "working_directory": "/"
}
```

#### Test 4: Web Terminal

1. Navigate to your Code Editor: http://localhost:8000/apps/code-editor
2. Select a workspace
3. Open Terminal panel
4. Execute commands:

```bash
# Initialize Git
git init

# Check status
git status

# Create a file
echo "# Test" > README.md

# Stage file
git add README.md

# Commit
git commit -m "Initial commit"

# View log
git log --oneline
```

**Expected:** All commands should execute successfully with proper output.

#### Test 5: Git Panel UI

1. Open GitPanel (Git icon in right sidebar)
2. Click "Initialize Git" button
3. Create/modify a file in editor
4. Git Panel should show file in "Changes" section
5. Stage the file (click checkbox or "Stage All")
6. Enter commit message: "Test commit"
7. Click "Commit" button
8. Git Panel should show success message
9. View commit history - should show your commit

#### Test 6: Security Tests

```bash
# Test 6.1: Path traversal protection
curl -X POST http://localhost:8000/api/workspaces/1/terminal/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"command": "git status", "cwd": "../../../"}'

# Expected: Error or restricted to workspace boundary

# Test 6.2: Blocked command
curl -X POST http://localhost:8000/api/workspaces/1/terminal/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"command": "git filter-branch --tree-filter \"rm -rf .\" HEAD"}'

# Expected: "Command not allowed" error

# Test 6.3: Unauthorized access
curl -X GET http://localhost:8000/api/workspaces/999/git/status \
  -H "Authorization: Bearer DIFFERENT_USER_TOKEN"

# Expected: 403 Forbidden
```

---

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] **Git installed on production server**
      ```bash
      git --version  # Should return version
      ```

- [ ] **Git in System PATH**
      ```powershell
      $env:PATH -split ';' | Select-String -Pattern 'Git'
      # Should show: C:\Program Files\Git\cmd
      ```

- [ ] **Web server restarted**
      ```powershell
      iisreset /restart  # Or appropriate service restart
      ```

- [ ] **Laravel .env configured**
      ```env
      GIT_BINARY_PATH=
      GIT_DEFAULT_USER_NAME="Production Workspace"
      GIT_DEFAULT_USER_EMAIL="workspace@yourdomain.com"
      GIT_TIMEOUT=300
      GIT_LOGGING_ENABLED=true
      GIT_DISABLE_FORCE_PUSH=true
      ```

- [ ] **Workspace directory permissions**
      ```powershell
      icacls "D:\workspaces" /grant "IIS_IUSRS:(OI)(CI)F" /T
      # Adjust path and user as needed
      ```

- [ ] **Git global config set**
      ```bash
      git config --global user.name "Production Server"
      git config --global user.email "server@yourdomain.com"
      git config --global init.defaultBranch main
      git config --global --add safe.directory '*'
      ```

- [ ] **GitService registered**
      - Automatically available via DI, no manual registration

- [ ] **All tests passing**
      ```bash
      php artisan diagnose:git
      # All checks should pass
      ```

- [ ] **Security audited**
      - Command whitelist reviewed: `config/git.php`
      - Authorization policies tested
      - Path traversal tests passed

- [ ] **Logging configured**
      ```php
      // config/logging.php
      'channels' => [
          'git' => [
              'driver' => 'daily',
              'path' => storage_path('logs/git.log'),
              'level' => 'info',
              'days' => 14,
          ],
      ],
      ```

- [ ] **Backups configured**
      - Workspace Git repositories backed up
      - Backup schedule: Daily/Weekly
      - Retention policy: defined

- [ ] **Monitoring configured**
      - Error rate tracking
      - Git operation latency
      - Failed authentication attempts

### Deployment Steps

#### Step 1: Pre-Deployment

```bash
# 1. Backup production data
php artisan backup:run --only-db
tar -czf workspaces-backup.tar.gz storage/workspaces/

# 2. Test in staging
git clone <repo> staging-server
cd staging-server
composer install --no-dev
php artisan config:cache
php artisan diagnose:git
# Verify all tests pass

# 3. Document rollback plan
# Keep previous release available for quick rollback
```

#### Step 2: Deploy Code

```bash
# 1. Deploy to production
git pull origin main
composer install --no-dev --optimize-autoloader

# 2. Clear caches
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# 3. Run migrations (if any)
php artisan migrate --force

# 4. Rebuild caches
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 5. Restart services
iisreset /restart  # Or php-fpm reload
```

#### Step 3: Post-Deployment Verification

```bash
# 1. Verify Git is available
php artisan diagnose:git

# 2. Test API endpoints
curl -X GET https://yourdomain.com/api/health

# 3. Test Git operations
# Login to production site and test:
# - Initialize Git in workspace
# - Commit a file
# - View Git log

# 4. Check logs for errors
tail -f storage/logs/laravel.log
tail -f storage/logs/git.log

# 5. Monitor for 24 hours
# Watch for:
# - Increased error rates
# - Slow Git operations
# - Failed authentications
```

### Rollback Procedure

If deployment fails:

```bash
# 1. Restore previous code version
git reset --hard <previous-commit>

# 2. Restore database (if needed)
php artisan backup:restore

# 3. Clear caches
php artisan config:clear
php artisan cache:clear

# 4. Restart services
iisreset /restart
```

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### Issue 1: `'git' is not recognized`

**Symptom:**
```json
{
  "success": false,
  "error": "'git' is not recognized as an internal or external command"
}
```

**Diagnosis:**
```bash
# Check if Git installed
git --version

# If works in CMD but not in Laravel:
php -r "exec('git --version', $out); print_r($out);"

# Check PHP PATH
php -r "echo getenv('PATH');"
```

**Solutions:**

1. **Git not installed:**
   - Install Git: https://git-scm.com/download/win
   - Select: "Git from the command line and also from 3rd-party software"

2. **Git not in PATH:**
   ```powershell
   # Add to System PATH (run as Administrator)
   $env:PATH += ";C:\Program Files\Git\cmd"
   [Environment]::SetEnvironmentVariable("Path", $env:PATH, "Machine")
   ```

3. **Service not restarted:**
   ```powershell
   iisreset /restart
   ```

4. **Set explicit path in .env:**
   ```env
   GIT_BINARY_PATH="C:\Program Files\Git\cmd\git.exe"
   ```

#### Issue 2: `Permission denied`

**Symptom:**
```
error: could not lock config file .git/config: Permission denied
```

**Solution:**
```powershell
# Grant permissions to IIS user
icacls "D:\workspaces" /grant "IIS_IUSRS:(OI)(CI)F" /T

# Or for specific user
icacls "D:\workspaces" /grant "NT AUTHORITY\NETWORK SERVICE:(OI)(CI)F" /T

# Verify permissions
icacls "D:\workspaces"
```

#### Issue 3: `fatal: not a git repository`

**Symptom:**
```
fatal: not a git repository (or any of the parent directories): .git
```

**Solution:**
```bash
# Initialize Git in workspace
POST /api/workspaces/1/git/init

# Or via terminal:
git init
```

#### Issue 4: Git commands hang indefinitely

**Symptom:**
- Git push/pull never completes
- No output, no error
- Request times out

**Solution:**

1. **Disable interactive prompts:**
   Already handled in `GitService`:
   ```php
   $process = new Process($command, $workspacePath, [
       'GIT_TERMINAL_PROMPT' => '0',
       'GIT_ASKPASS' => 'echo'
   ]);
   ```

2. **Use SSH keys instead of HTTPS:**
   ```bash
   # Generate SSH key
   ssh-keygen -t ed25519 -C "workspace@yourdomain.com"

   # Add to Git config
   git config core.sshCommand "ssh -i ~/.ssh/id_ed25519"
   ```

3. **Increase timeout:**
   ```env
   GIT_TIMEOUT=600  # 10 minutes
   ```

#### Issue 5: `SSL certificate problem`

**Symptom:**
```
fatal: unable to access 'https://github.com/...': SSL certificate problem
```

**Solution:**

1. **Install certificate bundle (recommended):**
   ```bash
   git config --global http.sslCAInfo "C:/Program Files/Git/mingw64/ssl/certs/ca-bundle.crt"
   ```

2. **Disable SSL verification (NOT recommended for production):**
   ```bash
   git config --global http.sslVerify false
   ```

#### Issue 6: Slow Git operations

**Symptom:**
- Git commands take >30 seconds
- Terminal feels laggy
- Users report timeouts

**Solutions:**

1. **Optimize repository:**
   ```bash
   git gc --aggressive --prune=now
   git repack -a -d --depth=250 --window=250
   ```

2. **Use shallow clones:**
   ```bash
   git clone --depth 1 <url>
   ```

3. **Increase buffer size:**
   ```bash
   git config --global http.postBuffer 524288000  # 500MB
   ```

4. **Check disk I/O:**
   ```powershell
   # Monitor disk performance
   Get-Counter '\PhysicalDisk(*)\Avg. Disk sec/Read'
   ```

#### Issue 7: Working directory is "/"

**Symptom:**
```json
{
  "working_directory": "/"
}
```

**Solution:**

Already fixed in updated `GitController` and `GitService`. Ensure you're using the new code:

```php
// GitController.php (updated)
protected function runGit(Workspace $workspace, ...$args)
{
    $result = $this->gitService->execute($workspace->full_path, $args);
    return $result;
}

// GitService.php
public function execute(string $workspacePath, array $arguments, ...)
{
    $process = new Process(
        $command,
        $workspacePath,  // ✅ Correct working directory
        null,
        null,
        $this->timeout
    );
    // ...
}
```

---

## 📊 Performance Optimization

### Database Optimization

```php
// Add index for faster workspace lookups
Schema::table('workspaces', function (Blueprint $table) {
    $table->index('user_id');
    $table->index(['user_id', 'git_enabled']);
});
```

### Caching

```php
// Cache Git status for 5 minutes
$status = Cache::remember(
    "workspace.{$workspace->id}.git.status",
    300,
    fn() => $this->gitService->status($workspace->full_path)
);
```

### Queue Long Operations

```php
// Queue long Git operations
use Illuminate\Support\Facades\Queue;

Queue::push(function() use ($workspace, $url) {
    $this->gitService->execute($workspace->full_path, [
        'clone', '--depth', '1', $url, '.'
    ]);
});
```

---

## 📈 Monitoring & Logging

### Log Git Operations

Already implemented in `GitService`:

```php
Log::info('Git command executed', [
    'workspace' => $workspace->id,
    'command' => 'git status',
    'exit_code' => 0,
    'success' => true,
    'duration_ms' => 125
]);
```

### Monitor Metrics

```php
// Track Git operation metrics
use Illuminate\Support\Facades\Event;

Event::listen('git.command.executed', function ($event) {
    // Send to monitoring service (DataDog, New Relic, etc.)
    app('metrics')->increment('git.commands', [
        'command' => $event->command,
        'success' => $event->success
    ]);
});
```

### Alert on Errors

```php
// config/logging.php
'channels' => [
    'git_errors' => [
        'driver' => 'slack',
        'url' => env('LOG_SLACK_WEBHOOK_URL'),
        'username' => 'Git Monitor',
        'level' => 'error',
    ],
],
```

---

## 🎓 Best Practices

### 1. Always Use GitService

❌ **Don't:**
```php
$process = new Process(['git', 'status']);
$process->run();
```

✅ **Do:**
```php
$gitService = app(GitService::class);
$result = $gitService->status($workspacePath);
```

### 2. Handle Errors Gracefully

```php
$result = $gitService->commit($workspacePath, $message);

if (!$result['success']) {
    Log::error('Git commit failed', [
        'error' => $result['error'],
        'workspace' => $workspace->id
    ]);

    return response()->json([
        'error' => 'Failed to commit changes. Please try again.'
    ], 500);
}
```

### 3. Validate User Input

```php
$request->validate([
    'message' => 'required|string|max:500',
    'files' => 'nullable|array',
    'files.*' => 'string|max:255'
]);
```

### 4. Use Transactions for Critical Operations

```php
DB::transaction(function() use ($workspace, $message) {
    // Stage files
    $gitService->add($workspace->full_path, ['.']);

    // Commit
    $result = $gitService->commit($workspace->full_path, $message);

    if (!$result['success']) {
        throw new \Exception('Commit failed');
    }

    // Update database
    $workspace->update(['last_commit_at' => now()]);
});
```

### 5. Set Reasonable Timeouts

```php
// Short timeout for quick operations
$gitService->setTimeout(30)->status($workspacePath);

// Long timeout for network operations
$gitService->setTimeout(600)->clone($workspacePath, $url);
```

---

## 📚 Additional Resources

### Documentation Files

- [GIT_INSTALLATION_WINDOWS.md](docs/GIT_INSTALLATION_WINDOWS.md) - Detailed Windows installation guide
- [GIT_TERMINAL_INTEGRATION.md](docs/GIT_TERMINAL_INTEGRATION.md) - Terminal integration architecture
- [AI_WORKSPACE_SYSTEM_IMPROVEMENTS.md](AI_WORKSPACE_SYSTEM_IMPROVEMENTS.md) - Overall system architecture

### External Resources

- **Git Documentation:** https://git-scm.com/doc
- **Git for Windows:** https://git-scm.com/download/win
- **Symfony Process Component:** https://symfony.com/doc/current/components/process.html
- **Laravel Policies:** https://laravel.com/docs/authorization#creating-policies
- **Security Best Practices:** https://cheatsheetseries.owasp.org/cheatsheets/Laravel_Cheat_Sheet.html

### Support

For issues or questions:

1. **Check logs:** `storage/logs/laravel.log`, `storage/logs/git.log`
2. **Run diagnostics:** `php artisan diagnose:git`
3. **Review documentation:** Read this guide thoroughly
4. **Test in isolation:** Try commands in terminal first
5. **Check GitHub Issues:** Search for similar issues in Laravel/Git repos

---

## ✅ Summary

After following this guide, you now have:

- ✅ Git properly installed and configured on Windows server
- ✅ Production-ready `GitService` for secure Git operations
- ✅ Updated `GitController` using `GitService`
- ✅ Security layers: whitelisting, path validation, isolation
- ✅ Comprehensive testing tools and procedures
- ✅ Monitoring and logging configured
- ✅ Troubleshooting guides for common issues
- ✅ Production deployment checklist

**Your VS Code-like workspace now supports Git operations securely and reliably!**

---

**Last Updated:** 2026-02-12
**Version:** 1.0.0
**Status:** Production-Ready
**Tested On:** Windows Server 2019/2022, Laravel 10/11, PHP 8.1/8.2
