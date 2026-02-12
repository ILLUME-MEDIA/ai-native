@echo off
REM ============================================================================
REM Quick Git Workspace Setup Script
REM Double-click this file to run setup
REM ============================================================================

echo.
echo ================================================
echo    Quick Git Workspace Setup
echo ================================================
echo.

REM Check for admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script requires Administrator privileges
    echo.
    echo Please run as Administrator:
    echo 1. Right-click this file
    echo 2. Select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo [OK] Running with Administrator privileges
echo.

REM Step 1: Check Git installation
echo [1/7] Checking for Git...
git --version >nul 2>&1
if %errorLevel% equ 0 (
    git --version
    echo [OK] Git is installed
) else (
    echo [FAIL] Git is NOT installed
    echo.
    echo Please install Git manually:
    echo 1. Download: https://git-scm.com/download/win
    echo 2. Run installer
    echo 3. Choose: "Git from command line and also from 3rd-party software"
    echo 4. Run this script again
    echo.
    pause
    exit /b 1
)
echo.

REM Step 2: Add Git to System PATH
echo [2/7] Updating System PATH...
set "GIT_PATH=C:\Program Files\Git\cmd"
set "CURRENT_PATH=%PATH%"

echo %PATH% | find /I "%GIT_PATH%" >nul
if %errorLevel% neq 0 (
    setx /M PATH "%PATH%;%GIT_PATH%" >nul 2>&1
    echo [OK] Added Git to System PATH
) else (
    echo [OK] Git already in System PATH
)
echo.

REM Step 3: Configure Git globally
echo [3/7] Configuring Git...
git config --global user.name "Workspace System" 2>nul
git config --global user.email "workspace@localhost" 2>nul
git config --global init.defaultBranch main 2>nul
git config --global core.autocrlf true 2>nul
git config --global --add safe.directory "*" 2>nul
echo [OK] Git configured
echo.

REM Step 4: Create workspace directories
echo [4/7] Creating workspace directories...
if not exist "storage\workspaces" mkdir "storage\workspaces"
icacls "storage\workspaces" /grant "IIS_IUSRS:(OI)(CI)F" /T /Q >nul 2>&1
echo [OK] Workspace directories ready
echo.

REM Step 5: Update .env file
echo [5/7] Checking .env configuration...
findstr /C:"GIT_BINARY_PATH" .env >nul 2>&1
if %errorLevel% neq 0 (
    echo. >> .env
    echo # Git Configuration >> .env
    echo GIT_BINARY_PATH= >> .env
    echo GIT_DEFAULT_USER_NAME="Workspace System" >> .env
    echo GIT_DEFAULT_USER_EMAIL="workspace@localhost" >> .env
    echo GIT_TIMEOUT=300 >> .env
    echo [OK] Added Git configuration to .env
) else (
    echo [OK] Git configuration already in .env
)
echo.

REM Step 6: Clear Laravel caches
echo [6/7] Clearing Laravel caches...
php artisan config:clear >nul 2>&1
php artisan cache:clear >nul 2>&1
php artisan view:clear >nul 2>&1
php artisan config:cache >nul 2>&1
echo [OK] Caches cleared
echo.

REM Step 7: Test Git integration
echo [7/7] Testing Git integration...
echo.
echo Git version:
git --version
echo.
echo PHP Git test:
php -r "exec('git --version', $out); print_r($out);"
echo.

REM Prompt for web server restart
echo.
echo ================================================
echo    Setup Complete!
echo ================================================
echo.
echo [IMPORTANT] You must restart your web server:
echo.
echo For IIS:
echo    iisreset /restart
echo.
echo For Apache/XAMPP:
echo    Stop and start Apache in control panel
echo.
echo For Artisan Serve:
echo    Press Ctrl+C and run "php artisan serve" again
echo.

set /p restart="Restart IIS now? (Y/N): "
if /I "%restart%"=="Y" (
    iisreset /restart
    echo [OK] IIS restarted
) else (
    echo [!] Remember to restart your web server manually
)

echo.
echo Next steps:
echo 1. Open: http://localhost:8000/apps/code-editor
echo 2. Select a workspace
echo 3. Open Terminal tab
echo 4. Type: git --version
echo 5. Type: git init
echo.
pause
