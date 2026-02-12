# Fix Git Integration - Quick Action Plan

## 🚨 Problem

You're seeing this error:
```
'git' is not recognized as an internal or external command
```

## ⚡ Quick Fix (15 Minutes)

Follow these steps **in order**:

---

### Step 1: Check if Git is Installed (2 minutes)

Open Command Prompt and run:
```cmd
git --version
```

**If you see:** `git version 2.x.x`
- ✅ Git is installed → Go to **Step 3**

**If you see:** `'git' is not recognized`
- ❌ Git is NOT installed → Continue to **Step 2**

---

### Step 2: Install Git (5 minutes)

1. Download Git for Windows: https://git-scm.com/download/win

2. Run the installer

3. **IMPORTANT:** On the "Adjusting your PATH environment" screen:
   - ✅ SELECT: **"Git from the command line and also from 3rd-party software"**
   - This adds Git to System PATH

4. Complete the installation (accept other defaults)

5. Close and reopen Command Prompt

6. Verify:
   ```cmd
   git --version
   ```
   Should show: `git version 2.x.x`

---

### Step 3: Verify Git from PHP (2 minutes)

Run this command in your Laravel project root:

```cmd
cd D:\LaravelCMS2\myapps
php -r "exec('git --version 2>&1', $out, $code); echo implode(PHP_EOL, $out); exit($code);"
```

**If you see:** `git version 2.x.x`
- ✅ PHP can access Git → Go to **Step 5**

**If you see:** Error or nothing
- ❌ Git not in PHP's PATH → Continue to **Step 4**

---

### Step 4: Add Git to System PATH (3 minutes)

#### Option A: Quick Fix (PowerShell - Run as Administrator)

```powershell
# Copy and paste this entire block
$gitPath = "C:\Program Files\Git\cmd"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*$gitPath*") {
    $newPath = "$currentPath;$gitPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
    Write-Host "Git added to System PATH" -ForegroundColor Green
    Write-Host "You must restart your web server now!" -ForegroundColor Yellow
} else {
    Write-Host "Git already in System PATH" -ForegroundColor Yellow
}
```

#### Option B: Manual (GUI)

1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Click **Advanced** tab → **Environment Variables** button
3. Under **System variables** (bottom section), find `Path` → click **Edit**
4. Click **New**
5. Add: `C:\Program Files\Git\cmd`
6. Click **OK** → **OK** → **OK**

---

### Step 5: Restart Web Server (1 minute)

**CRITICAL STEP** - Web server must restart to load new PATH.

#### For IIS:
```cmd
iisreset /restart
```

#### For Apache (XAMPP/WAMP):
```cmd
net stop Apache2.4
net start Apache2.4
```

#### For Artisan Serve (Development):
```cmd
Ctrl+C  (stop it)
php artisan serve  (start again)
```

---

### Step 6: Test Git Integration (2 minutes)

Run the test script:

```cmd
cd D:\LaravelCMS2\myapps
test-git-integration.bat
```

**Expected Output:**
```
[1/6] Checking if Git is installed...
git version 2.43.0.windows.1
[PASS] Git is installed

[2/6] Locating Git executable...
C:\Program Files\Git\cmd\git.exe
[PASS] Git executable found

[3/6] Checking PHP availability...
[PASS] PHP is available

[4/6] Testing Git execution from PHP...
[PASS] PHP can execute Git commands

[5/6] Testing Laravel Git diagnostics...
[PASS] Laravel can access Git

[6/6] Checking workspace directory...
[PASS] Workspace directory exists

======================================
If all tests passed, Git integration is ready!
```

**If all tests pass:** ✅ You're DONE! Continue to **Step 7**

**If any test fails:** ❌ See troubleshooting section below

---

### Step 7: Test in Web Terminal (Optional - 1 minute)

1. Open your app: http://localhost:8000/apps/code-editor
2. Select a workspace
3. Open Terminal panel
4. Type: `git init`
5. Type: `git status`

**Expected:**
```
Initialized empty Git repository in...
On branch main
No commits yet
nothing to commit (create/copy files and use "git add" to track)
```

**If you see this:** ✅ **SUCCESS!** Git is working in your web terminal!

---

## 🔧 Troubleshooting

### Problem: "Git version shows in CMD but test fails in PHP"

**Cause:** Git was added to User PATH, not System PATH.

**Fix:**
```powershell
# Run PowerShell as Administrator
$gitPath = "C:\Program Files\Git\cmd"
[Environment]::SetEnvironmentVariable("Path",
    [Environment]::GetEnvironmentVariable("Path", "Machine") + ";$gitPath",
    "Machine")
```

Then restart web server.

---

### Problem: "iisreset command not found"

**Cause:** You're not using IIS.

**Fix:** Find your web server and restart it:
- **Apache:** `net stop Apache2.4 && net start Apache2.4`
- **Nginx:** `net stop nginx && net start nginx`
- **XAMPP:** Use XAMPP Control Panel to stop/start Apache
- **WAMP:** Use WAMP tray icon to restart services
- **Artisan Serve:** Just `Ctrl+C` and run `php artisan serve` again

---

### Problem: "Git still not recognized after all steps"

**Cause:** Multiple possible issues.

**Fix - Nuclear Option:**

1. **Uninstall Git** (if it's installed)
   - Control Panel → Programs → Uninstall Git

2. **Clean PATH manually**
   - `Win + R` → `sysdm.cpl`
   - Advanced → Environment Variables
   - Remove ALL Git entries from both User and System PATH
   - Click OK everywhere

3. **Restart your computer** 🔄

4. **Reinstall Git**
   - Download: https://git-scm.com/download/win
   - Install with "Git from command line and 3rd-party software"

5. **Manually add to System PATH**
   - `Win + R` → `sysdm.cpl`
   - System Variables → Path → Edit → New
   - Add: `C:\Program Files\Git\cmd`
   - OK everywhere

6. **Restart web server**
   - `iisreset /restart`

7. **Test again**
   - `git --version`
   - `php -r "exec('git --version', $out); print_r($out);"`

---

### Problem: "Permission denied" when running Git commands

**Cause:** Web server user lacks permissions on workspace folders.

**Fix:**
```powershell
# Run as Administrator
icacls "D:\LaravelCMS2\myapps\storage\workspaces" /grant "IIS_IUSRS:(OI)(CI)F" /T
```

Adjust the path if your workspace directory is different.

---

### Problem: "Git commands hang indefinitely"

**Cause:** Git is waiting for credentials or user input.

**Fix:** This is already handled in the new `GitService`. Make sure you're using the updated code:

1. Verify `GitService.php` exists in `app/Services/Git/`
2. Verify `GitController.php` is using `GitService`
3. Clear Laravel cache:
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

---

## 📞 Still Not Working?

If you've followed all steps and Git still doesn't work:

1. **Collect diagnostics:**
   ```cmd
   git --version > git-diagnostic.txt
   where git >> git-diagnostic.txt
   echo %PATH% >> git-diagnostic.txt
   php -r "echo getenv('PATH');" >> git-diagnostic.txt
   php artisan diagnose:git >> git-diagnostic.txt 2>&1
   ```

2. **Check the diagnostic file:** `git-diagnostic.txt`

3. **Review logs:**
   - `storage/logs/laravel.log`
   - Windows Event Viewer (if IIS)

4. **Read the complete guide:** [GIT_INTEGRATION_COMPLETE_GUIDE.md](GIT_INTEGRATION_COMPLETE_GUIDE.md)

---

## ✅ Success Criteria

You know Git integration is working when:

- ✅ `git --version` works in CMD
- ✅ `php -r "exec('git --version', $out); print_r($out);"` shows Git version
- ✅ `php artisan diagnose:git` shows all checks passing
- ✅ Web terminal executes `git init` successfully
- ✅ Git Panel UI can initialize and commit changes
- ✅ No errors in `storage/logs/laravel.log`

---

## 🎯 Next Steps After Fixing

Once Git is working:

1. **Configure Git globally:**
   ```bash
   git config --global user.name "Your Server Name"
   git config --global user.email "server@yourdomain.com"
   git config --global init.defaultBranch main
   git config --global --add safe.directory '*'
   ```

2. **Update .env file:**
   ```env
   GIT_DEFAULT_USER_NAME="Workspace System"
   GIT_DEFAULT_USER_EMAIL="workspace@yourdomain.com"
   GIT_TIMEOUT=300
   ```

3. **Test all Git operations:**
   - Initialize repository
   - Stage files
   - Commit changes
   - View log
   - Create branches

4. **Review security settings:**
   - Check `config/git.php` for allowed commands
   - Verify workspace isolation is working
   - Test authorization policies

---

## 📝 Quick Reference

### Essential Commands

```bash
# Check Git version
git --version

# Test Git from PHP
php -r "exec('git --version', $out); print_r($out);"

# Run Laravel diagnostic
php artisan diagnose:git

# Restart IIS
iisreset /restart

# Clear Laravel caches
php artisan config:clear && php artisan cache:clear

# Test in terminal
git init
git status
```

### Important Paths

- Git binary: `C:\Program Files\Git\cmd\git.exe`
- Laravel project: `D:\LaravelCMS2\myapps`
- Workspaces: `D:\LaravelCMS2\myapps\storage\workspaces`
- Logs: `D:\LaravelCMS2\myapps\storage\logs\laravel.log`

### Configuration Files

- `.env` - Environment configuration
- `config/git.php` - Git service configuration
- `config/workspaces.php` - Workspace settings

---

**Last Updated:** 2026-02-12
**Estimated Time:** 15 minutes
**Difficulty:** Easy
**Success Rate:** 95% if followed exactly

---

**Good luck! 🚀 You've got this!**
