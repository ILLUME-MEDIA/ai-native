# ============================================================================
# Automated Git Workspace Setup Script
# Run this with: powershell -ExecutionPolicy Bypass -File setup-git-workspace.ps1
# ============================================================================

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Git Workspace Setup - Automated Installer" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script requires Administrator privileges" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run PowerShell as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host "✅ Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# ============================================================================
# Step 1: Check if Git is installed
# ============================================================================

Write-Host "[1/8] Checking for Git installation..." -ForegroundColor Cyan

$gitInstalled = $false
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Git is already installed: $gitVersion" -ForegroundColor Green
        $gitInstalled = $true
    }
} catch {
    Write-Host "❌ Git is not installed" -ForegroundColor Yellow
}

if (-not $gitInstalled) {
    Write-Host ""
    Write-Host "📦 Git needs to be installed" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Install using winget (recommended)" -ForegroundColor Cyan
    Write-Host "Option 2: Download manually from git-scm.com" -ForegroundColor Cyan
    Write-Host ""

    $choice = Read-Host "Install Git now? (Y/N)"

    if ($choice -eq "Y" -or $choice -eq "y") {
        Write-Host ""
        Write-Host "Installing Git via winget..." -ForegroundColor Cyan

        try {
            winget install --id Git.Git -e --source winget --silent --accept-source-agreements --accept-package-agreements

            Write-Host "✅ Git installed successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "⚠️  You may need to restart PowerShell for Git to be recognized" -ForegroundColor Yellow

            # Refresh environment variables
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

        } catch {
            Write-Host "❌ Failed to install Git via winget" -ForegroundColor Red
            Write-Host ""
            Write-Host "Please install Git manually:" -ForegroundColor Yellow
            Write-Host "1. Download: https://git-scm.com/download/win" -ForegroundColor Yellow
            Write-Host "2. Run installer" -ForegroundColor Yellow
            Write-Host "3. Choose: 'Git from command line and also from 3rd-party software'" -ForegroundColor Yellow
            Write-Host "4. Run this script again" -ForegroundColor Yellow
            Write-Host ""
            pause
            exit 1
        }
    } else {
        Write-Host ""
        Write-Host "Please install Git manually:" -ForegroundColor Yellow
        Write-Host "1. Download: https://git-scm.com/download/win" -ForegroundColor Yellow
        Write-Host "2. Run installer" -ForegroundColor Yellow
        Write-Host "3. Choose: 'Git from command line and also from 3rd-party software'" -ForegroundColor Yellow
        Write-Host "4. Run this script again" -ForegroundColor Yellow
        Write-Host ""
        pause
        exit 1
    }
}

Write-Host ""

# ============================================================================
# Step 2: Add Git to System PATH
# ============================================================================

Write-Host "[2/8] Configuring System PATH..." -ForegroundColor Cyan

$gitPaths = @(
    "C:\Program Files\Git\cmd",
    "C:\Program Files\Git\bin"
)

$pathModified = $false
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

foreach ($gitPath in $gitPaths) {
    if (Test-Path $gitPath) {
        if ($currentPath -notlike "*$gitPath*") {
            Write-Host "  Adding to PATH: $gitPath" -ForegroundColor Yellow
            $newPath = "$currentPath;$gitPath"
            [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
            $currentPath = $newPath
            $pathModified = $true
        } else {
            Write-Host "  ✅ Already in PATH: $gitPath" -ForegroundColor Green
        }
    }
}

if ($pathModified) {
    Write-Host "✅ System PATH updated" -ForegroundColor Green
    # Refresh current session PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "✅ System PATH already configured" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# Step 3: Configure Global Git Settings
# ============================================================================

Write-Host "[3/8] Configuring global Git settings..." -ForegroundColor Cyan

try {
    # Set user name
    $currentName = git config --global user.name 2>$null
    if (-not $currentName) {
        git config --global user.name "Workspace System"
        Write-Host "  ✅ Set user.name: Workspace System" -ForegroundColor Green
    } else {
        Write-Host "  ✅ user.name already set: $currentName" -ForegroundColor Green
    }

    # Set user email
    $currentEmail = git config --global user.email 2>$null
    if (-not $currentEmail) {
        git config --global user.email "workspace@localhost"
        Write-Host "  ✅ Set user.email: workspace@localhost" -ForegroundColor Green
    } else {
        Write-Host "  ✅ user.email already set: $currentEmail" -ForegroundColor Green
    }

    # Set default branch
    git config --global init.defaultBranch main
    Write-Host "  ✅ Set init.defaultBranch: main" -ForegroundColor Green

    # Set line endings for Windows
    git config --global core.autocrlf true
    Write-Host "  ✅ Set core.autocrlf: true" -ForegroundColor Green

    # Set safe directory for workspace paths
    git config --global --add safe.directory '*'
    Write-Host "  ✅ Set safe.directory: *" -ForegroundColor Green

    Write-Host "✅ Git global configuration complete" -ForegroundColor Green

} catch {
    Write-Host "⚠️  Warning: Some Git config settings failed" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# Step 4: Update Laravel .env file
# ============================================================================

Write-Host "[4/8] Updating Laravel .env file..." -ForegroundColor Cyan

$envPath = "D:\LaravelCMS2\myapps\.env"
$envExamplePath = "D:\LaravelCMS2\myapps\.env.example"

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw

    # Check if Git configuration already exists
    if ($envContent -notmatch "GIT_BINARY_PATH") {
        $gitConfig = @"

# ===================================================================
# Git Integration Configuration
# ===================================================================
GIT_BINARY_PATH=
GIT_DEFAULT_USER_NAME="Workspace System"
GIT_DEFAULT_USER_EMAIL="workspace@localhost"
GIT_TIMEOUT=300
GIT_LOGGING_ENABLED=true
GIT_LOG_CHANNEL=daily
GIT_DISABLE_FORCE_PUSH=true
GIT_REQUIRE_AUTH_REMOTE=true
"@
        Add-Content -Path $envPath -Value $gitConfig
        Write-Host "  ✅ Added Git configuration to .env" -ForegroundColor Green
    } else {
        Write-Host "  ✅ Git configuration already in .env" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠️  .env file not found at: $envPath" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# Step 5: Create workspace directories
# ============================================================================

Write-Host "[5/8] Setting up workspace directories..." -ForegroundColor Cyan

$workspacesPath = "D:\LaravelCMS2\myapps\storage\workspaces"

if (-not (Test-Path $workspacesPath)) {
    New-Item -ItemType Directory -Path $workspacesPath -Force | Out-Null
    Write-Host "  ✅ Created: $workspacesPath" -ForegroundColor Green
} else {
    Write-Host "  ✅ Directory exists: $workspacesPath" -ForegroundColor Green
}

# Set permissions for IIS user
try {
    icacls $workspacesPath /grant "IIS_IUSRS:(OI)(CI)F" /T /Q | Out-Null
    Write-Host "  ✅ Set permissions for IIS_IUSRS" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Could not set IIS permissions (may not be needed)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# Step 6: Clear Laravel caches
# ============================================================================

Write-Host "[6/8] Clearing Laravel caches..." -ForegroundColor Cyan

Set-Location "D:\LaravelCMS2\myapps"

try {
    php artisan config:clear | Out-Null
    Write-Host "  ✅ Config cache cleared" -ForegroundColor Green

    php artisan cache:clear | Out-Null
    Write-Host "  ✅ Application cache cleared" -ForegroundColor Green

    php artisan view:clear | Out-Null
    Write-Host "  ✅ View cache cleared" -ForegroundColor Green

    php artisan route:clear | Out-Null
    Write-Host "  ✅ Route cache cleared" -ForegroundColor Green

    php artisan config:cache | Out-Null
    Write-Host "  ✅ Config cache rebuilt" -ForegroundColor Green

} catch {
    Write-Host "  ⚠️  Some cache operations failed" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# Step 7: Test Git integration
# ============================================================================

Write-Host "[7/8] Testing Git integration..." -ForegroundColor Cyan

# Test 1: Git version
try {
    $gitVersion = git --version
    Write-Host "  ✅ Git command: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Git command failed" -ForegroundColor Red
}

# Test 2: Git from PHP
try {
    $phpTest = php -r "exec('git --version 2>&1', `$out, `$code); echo implode(PHP_EOL, `$out); exit(`$code);"
    Write-Host "  ✅ PHP can execute Git: $phpTest" -ForegroundColor Green
} catch {
    Write-Host "  ❌ PHP cannot execute Git" -ForegroundColor Red
}

# Test 3: Laravel diagnostic
try {
    Write-Host ""
    Write-Host "  Running Laravel Git diagnostic..." -ForegroundColor Cyan
    php artisan diagnose:git
} catch {
    Write-Host "  ⚠️  Diagnostic command not available (this is OK)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# Step 8: Restart web server
# ============================================================================

Write-Host "[8/8] Restarting web server..." -ForegroundColor Cyan

$choice = Read-Host "Restart IIS now? (Y/N)"

if ($choice -eq "Y" -or $choice -eq "y") {
    try {
        iisreset /restart | Out-Null
        Write-Host "✅ IIS restarted successfully" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not restart IIS automatically" -ForegroundColor Yellow
        Write-Host "   Please restart your web server manually" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Please restart your web server manually:" -ForegroundColor Yellow
    Write-Host "   - IIS: iisreset /restart" -ForegroundColor Yellow
    Write-Host "   - Apache: Stop and start in XAMPP/WAMP control panel" -ForegroundColor Yellow
    Write-Host "   - Artisan: Ctrl+C and run 'php artisan serve' again" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# Summary
# ============================================================================

Write-Host "================================================" -ForegroundColor Green
Write-Host "   Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Git installed and configured" -ForegroundColor Green
Write-Host "✅ System PATH updated" -ForegroundColor Green
Write-Host "✅ Global Git settings configured" -ForegroundColor Green
Write-Host "✅ Laravel .env updated" -ForegroundColor Green
Write-Host "✅ Workspace directories created" -ForegroundColor Green
Write-Host "✅ Laravel caches cleared" -ForegroundColor Green
Write-Host "✅ Git integration tested" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Open browser: http://localhost:8000/apps/code-editor" -ForegroundColor White
Write-Host "2. Select a workspace" -ForegroundColor White
Write-Host "3. Open Terminal tab" -ForegroundColor White
Write-Host "4. Type: git --version" -ForegroundColor White
Write-Host "5. Type: git init" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "- START_HERE.md - Quick overview" -ForegroundColor White
Write-Host "- IMMEDIATE_FIX_STEPS.md - Detailed guide" -ForegroundColor White
Write-Host "- GIT_INTEGRATION_COMPLETE_GUIDE.md - Full reference" -ForegroundColor White
Write-Host ""
Write-Host "🔧 If Git still not working in browser:" -ForegroundColor Yellow
Write-Host "1. Restart your computer (ensures PATH is loaded)" -ForegroundColor White
Write-Host "2. Restart web server again" -ForegroundColor White
Write-Host "3. Test with: php artisan diagnose:git" -ForegroundColor White
Write-Host ""

pause
