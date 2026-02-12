# 🚀 RUN THIS NOW - Automated Setup

## ⚡ Option 1: Automatic Setup (Recommended)

**Run this ONE command in PowerShell as Administrator:**

```powershell
# Right-click PowerShell → "Run as Administrator"
# Then run:

cd D:\LaravelCMS2\myapps
powershell -ExecutionPolicy Bypass -File setup-git-workspace.ps1
```

**This will:**
- ✅ Install Git (if needed)
- ✅ Configure System PATH
- ✅ Set up Git global config
- ✅ Update .env file
- ✅ Create workspace directories
- ✅ Clear Laravel caches
- ✅ Test everything
- ✅ Restart web server

**Time:** 5 minutes (automated)

---

## ⚡ Option 2: Quick Batch Script

**Double-click this file:**

```
setup-git-quick.bat
```

**Right-click → "Run as administrator"**

This does the same as Option 1 but simpler.

---

## ⚡ Option 3: Manual Steps (If scripts fail)

### Step 1: Install Git (3 minutes)

1. Download: https://git-scm.com/download/win
2. Run installer
3. **IMPORTANT:** Choose "Git from command line and also from 3rd-party software"
4. Finish installation

### Step 2: Add to PATH (1 minute)

**PowerShell as Administrator:**

```powershell
$gitPath = "C:\Program Files\Git\cmd"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
[Environment]::SetEnvironmentVariable("Path", "$currentPath;$gitPath", "Machine")
```

### Step 3: Configure Git (1 minute)

```cmd
git config --global user.name "Workspace System"
git config --global user.email "workspace@localhost"
git config --global init.defaultBranch main
git config --global core.autocrlf true
git config --global --add safe.directory "*"
```

### Step 4: Update .env (1 minute)

Add this to your `.env` file:

```env
# Git Configuration
GIT_BINARY_PATH=
GIT_DEFAULT_USER_NAME="Workspace System"
GIT_DEFAULT_USER_EMAIL="workspace@localhost"
GIT_TIMEOUT=300
GIT_LOGGING_ENABLED=true
GIT_LOG_CHANNEL=daily
GIT_DISABLE_FORCE_PUSH=true
GIT_REQUIRE_AUTH_REMOTE=true
```

### Step 5: Clear Caches (1 minute)

```cmd
cd D:\LaravelCMS2\myapps
php artisan config:clear
php artisan cache:clear
php artisan config:cache
```

### Step 6: Restart Web Server (1 minute)

```cmd
iisreset /restart
```

Or:
- **XAMPP:** Stop/Start Apache in control panel
- **Artisan:** Ctrl+C, then `php artisan serve`

---

## ✅ Verification

After running setup, test:

```cmd
cd D:\LaravelCMS2\myapps

# Test 1
git --version

# Test 2
php -r "exec('git --version', $out); print_r($out);"

# Test 3
php artisan diagnose:git

# All should show Git version
```

---

## 🌐 Test in Browser

1. Open: http://localhost:8000/apps/code-editor
2. Select workspace "workspace-3" (or any)
3. Click Terminal tab (bottom)
4. Type: `git --version`
5. Press Enter

**Expected:** `git version 2.43.0.windows.1`

---

## 🎯 Quick Test Commands

Once in web terminal:

```bash
# Initialize Git
git init

# Configure workspace Git
git config user.name "Your Name"
git config user.email "your@email.com"

# Create test file
echo "# Test Project" > README.md

# Stage file
git add README.md

# Commit
git commit -m "Initial commit"

# Check status
git status

# View log
git log --oneline

# View branches
git branch

# Success! 🎉
```

---

## 🐛 Troubleshooting

### Problem: Scripts won't run

**Fix:**
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Problem: Git still not recognized after setup

**Fix:**
```cmd
# Restart computer (yes, really!)
# This ensures all PATH changes are loaded
```

### Problem: PHP can't see Git

**Fix:**
```cmd
# Add explicit path in .env
GIT_BINARY_PATH="C:\Program Files\Git\cmd\git.exe"

# Then clear cache
php artisan config:clear
php artisan config:cache

# Restart web server
iisreset /restart
```

---

## 📊 What Gets Set Up

### Files Created/Modified:

```
D:\LaravelCMS2\myapps\
├── .env                              ← Git config added
├── storage/workspaces/               ← Created with permissions
├── app/Services/Git/GitService.php   ← Already exists
├── config/git.php                    ← Already exists
└── app/Console/Commands/DiagnoseGit.php ← Already exists
```

### System Changes:

- ✅ Git installed in: `C:\Program Files\Git\`
- ✅ Added to System PATH: `C:\Program Files\Git\cmd`
- ✅ Git global config:
  - user.name: "Workspace System"
  - user.email: "workspace@localhost"
  - init.defaultBranch: main
  - core.autocrlf: true
  - safe.directory: "*"

### Laravel Changes:

- ✅ `.env` updated with Git configuration
- ✅ Caches cleared and rebuilt
- ✅ Workspace directories created
- ✅ Permissions set for web server

---

## 🎓 Understanding the Setup

### Why System PATH?

Your web server (IIS/Apache) runs as a different user than you. This user only sees the System PATH, not your User PATH. That's why we add Git to **System PATH** specifically.

### Why Restart Web Server?

The web server process loads environment variables (including PATH) when it starts. After changing PATH, the server must restart to see the new values.

### Why Clear Caches?

Laravel caches configuration files. After modifying `.env`, caches must be cleared so Laravel reads the new values.

---

## 🚀 After Setup Works

### Initialize Workspaces:

```bash
# Via API
POST /api/workspaces/{id}/git/init

# Via Terminal
git init
```

### Use Git Panel UI:

1. Click Git icon (🌿) in right sidebar
2. Click "Initialize Git" button
3. Create/modify files
4. Stage changes (click checkboxes)
5. Enter commit message
6. Click "Commit" button
7. View commit history

### Use Terminal:

```bash
git status
git add .
git commit -m "Your message"
git log
git branch
git checkout -b feature/new-feature
```

---

## 📞 Still Having Issues?

### Generate Diagnostic Report:

```cmd
cd D:\LaravelCMS2\myapps
test-git-integration.bat
```

This creates `diagnostic.txt` with full system info.

### Check Logs:

```cmd
# Laravel logs
type storage\logs\laravel.log | more

# Git logs (after running commands)
type storage\logs\git.log | more
```

### Run Full Diagnostic:

```cmd
php artisan diagnose:git
```

---

## 📚 Documentation

- **START_HERE.md** - Overview and quick links
- **IMMEDIATE_FIX_STEPS.md** - Detailed step-by-step guide
- **FIX_GIT_NOW.md** - 7-step quick fix
- **GIT_INTEGRATION_COMPLETE_GUIDE.md** - Complete reference (250+ pages)
- **docs/GIT_INSTALLATION_WINDOWS.md** - Windows installation details
- **docs/GIT_TERMINAL_INTEGRATION.md** - Architecture and integration

---

## ✨ Summary

**What You're Setting Up:**
- Production-ready Git integration
- Secure command execution (whitelisting, path validation)
- VS Code-like terminal with full Git support
- Git Panel UI for visual operations
- Workspace isolation and security

**Time Required:**
- Automatic setup: 5 minutes
- Manual setup: 10 minutes
- Verification: 2 minutes

**Your Next Action:**

**→ Run:** `setup-git-workspace.ps1` (PowerShell as Admin)

**OR**

**→ Double-click:** `setup-git-quick.bat` (Run as Administrator)

---

**Last Updated:** 2026-02-12
**Status:** Ready to Run
**Difficulty:** Easy (automated)
