# Git Installation & Configuration for Windows Server

## Prerequisites
- Windows Server or Windows 10/11
- Administrator access
- Restart permission for services

---

## Step 1: Download Git for Windows

1. Download from: https://git-scm.com/download/win
2. Choose **64-bit Git for Windows Setup**
3. Recommended version: 2.43.0 or later

---

## Step 2: Installation (Critical Settings)

### Important Installation Options:

1. **Destination**:
   ```
   C:\Program Files\Git
   ```

2. **Select Components**:
   - ✅ Windows Explorer integration (optional)
   - ✅ Git Bash Here (optional)
   - ✅ Git GUI Here (optional)
   - ✅ Associate .git* files
   - ✅ Associate .sh files (optional)

3. **Adjusting your PATH environment** (CRITICAL):
   - ✅ **SELECT: "Git from the command line and also from 3rd-party software"**
   - This adds Git to System PATH (not just User PATH)

4. **Choosing SSH executable**:
   - ✅ Use bundled OpenSSH

5. **Choosing HTTPS transport backend**:
   - ✅ Use the OpenSSL library

6. **Configuring line ending conversions**:
   - ✅ Checkout Windows-style, commit Unix-style line endings

7. **Configuring terminal emulator**:
   - ✅ Use MinTTY (default)

8. **Default branch name**:
   - ✅ Override: `main`

9. **Credential helper**:
   - ✅ Git Credential Manager

10. **Extra options**:
    - ✅ Enable file system caching
    - ✅ Enable symbolic links

---

## Step 3: Verify Installation

### 3.1 Command Prompt
```cmd
git --version
```
**Expected output:**
```
git version 2.43.0.windows.1
```

### 3.2 PowerShell
```powershell
git --version
where.exe git
```
**Expected output:**
```
git version 2.43.0.windows.1
C:\Program Files\Git\cmd\git.exe
```

### 3.3 System PATH Check
```powershell
$env:PATH -split ';' | Select-String -Pattern 'Git'
```
**Expected output:**
```
C:\Program Files\Git\cmd
```

---

## Step 4: Configure System PATH (If Not Auto-Added)

### Option A: GUI Method

1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Go to **Advanced** → **Environment Variables**
3. Under **System variables** (NOT User variables), find `Path`
4. Click **Edit**
5. Click **New** and add:
   ```
   C:\Program Files\Git\cmd
   C:\Program Files\Git\bin
   ```
6. Click **OK** → **OK** → **OK**

### Option B: PowerShell Method (Run as Administrator)

```powershell
# Add Git to System PATH
$gitPath = "C:\Program Files\Git\cmd"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

if ($currentPath -notlike "*$gitPath*") {
    $newPath = "$currentPath;$gitPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
    Write-Host "Git added to System PATH" -ForegroundColor Green
} else {
    Write-Host "Git already in System PATH" -ForegroundColor Yellow
}
```

---

## Step 5: Restart Services (CRITICAL)

Git won't be available to running services until they're restarted.

### For IIS
```powershell
# Run as Administrator
iisreset /stop
iisreset /start
```

### For Apache (XAMPP/WAMP)
```cmd
# Stop Apache
net stop Apache2.4

# Start Apache
net start Apache2.4
```

### For Artisan Serve (Development)
Just stop and restart:
```bash
Ctrl+C
php artisan serve
```

---

## Step 6: Configure Git Globally

```bash
# Set user identity
git config --global user.name "Your Server Name"
git config --global user.email "server@yourdomain.com"

# Set default branch
git config --global init.defaultBranch main

# Set credential helper
git config --global credential.helper manager-core

# Set autocrlf for Windows
git config --global core.autocrlf true

# Set safe directory (important for workspace paths)
git config --global --add safe.directory '*'
```

---

## Step 7: Verify Git Works in PHP

Create a test PHP file:

```php
<?php
// test-git.php

echo "Testing Git from PHP...\n\n";

// Method 1: exec
exec('git --version 2>&1', $output, $returnCode);
echo "exec(): " . implode("\n", $output) . " (Exit code: $returnCode)\n\n";

// Method 2: shell_exec
$shellOutput = shell_exec('git --version 2>&1');
echo "shell_exec(): " . $shellOutput . "\n\n";

// Method 3: Check PATH
echo "PHP PATH: " . getenv('PATH') . "\n\n";

// Method 4: which/where command
$whereGit = shell_exec('where git 2>&1');
echo "Git location: " . $whereGit . "\n";
```

Run:
```bash
php test-git.php
```

**Expected Output:**
```
Testing Git from PHP...

exec(): git version 2.43.0.windows.1 (Exit code: 0)

shell_exec(): git version 2.43.0.windows.1

PHP PATH: C:\Windows\system32;C:\Windows;...C:\Program Files\Git\cmd;...

Git location: C:\Program Files\Git\cmd\git.exe
```

---

## Step 8: Test from Laravel

```bash
# In your Laravel project root
php artisan tinker
```

In Tinker:
```php
$process = new \Symfony\Component\Process\Process(['git', '--version']);
$process->run();
echo $process->getOutput();
```

**Expected:**
```
git version 2.43.0.windows.1
```

---

## Troubleshooting

### Problem: Git still not found after installation

**Solution 1: Manually set PATH in Laravel `.env`**
```env
GIT_PATH="C:\Program Files\Git\cmd\git.exe"
```

**Solution 2: Update php.ini**
Add Git to PHP's environment:
```ini
; Add this line
variables_order = "EGPCS"
```

**Solution 3: Check web server user permissions**
```powershell
# Check which user is running PHP
whoami
```

Make sure this user has access to `C:\Program Files\Git\`

### Problem: Permission denied errors

```bash
# Run as Administrator
icacls "C:\Program Files\Git" /grant Users:RX /T
```

### Problem: SSL certificate errors

```bash
# Temporarily disable SSL verification (NOT for production)
git config --global http.sslVerify false

# OR add certificate
git config --global http.sslCAInfo "C:/path/to/cert.pem"
```

---

## Production Checklist

- ✅ Git installed in `C:\Program Files\Git`
- ✅ System PATH includes `C:\Program Files\Git\cmd`
- ✅ Web server restarted (IIS/Apache)
- ✅ `git --version` works in CMD/PowerShell
- ✅ `php test-git.php` shows Git version
- ✅ Laravel can execute Git commands
- ✅ Git config set (user.name, user.email)
- ✅ Safe directory configured for workspace paths

---

## Next Steps

After Git is working system-wide:
1. Implement Laravel GitService (see GIT_BACKEND_INTEGRATION.md)
2. Configure workspace-specific Git operations
3. Add security restrictions
4. Test Git commands in web terminal

---

**Documentation Date:** 2026-02-12
**Status:** Production-Ready
**Tested On:** Windows Server 2019/2022, Windows 10/11
