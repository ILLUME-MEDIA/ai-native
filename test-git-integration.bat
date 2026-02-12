@echo off
REM ===================================================================
REM Git Integration Test Script for Windows
REM This script verifies that Git is properly installed and configured
REM ===================================================================

echo.
echo ======================================
echo Git Integration Test Script
echo ======================================
echo.

REM Test 1: Check if Git is installed
echo [1/6] Checking if Git is installed...
git --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Git is NOT installed or not in PATH
    echo.
    echo Action Required:
    echo 1. Download Git from: https://git-scm.com/download/win
    echo 2. Install with option: "Git from the command line and also from 3rd-party software"
    echo 3. Add to System PATH: C:\Program Files\Git\cmd
    echo 4. Restart this command prompt
    echo 5. Run this script again
    pause
    exit /b 1
) else (
    git --version
    echo [PASS] Git is installed
)
echo.

REM Test 2: Locate Git executable
echo [2/6] Locating Git executable...
where git
if %ERRORLEVEL% EQU 0 (
    echo [PASS] Git executable found
) else (
    echo [FAIL] Could not locate Git executable
)
echo.

REM Test 3: Check PHP availability
echo [3/6] Checking PHP availability...
php --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] PHP is NOT available in this command prompt
    echo Make sure you are running this from your Laravel project directory
    pause
    exit /b 1
) else (
    php --version | findstr /C:"PHP"
    echo [PASS] PHP is available
)
echo.

REM Test 4: Test Git from PHP
echo [4/6] Testing Git execution from PHP...
php -r "exec('git --version 2>&1', $output, $code); echo implode(PHP_EOL, $output); exit($code);"
if %ERRORLEVEL% EQU 0 (
    echo [PASS] PHP can execute Git commands
) else (
    echo [FAIL] PHP cannot execute Git commands
    echo.
    echo Action Required:
    echo 1. Ensure Git is in System PATH (not just User PATH)
    echo 2. Restart your web server (IIS/Apache)
    echo 3. Restart this command prompt
)
echo.

REM Test 5: Test Laravel Artisan
echo [5/6] Testing Laravel Git diagnostics...
if exist "artisan" (
    php artisan diagnose:git
    if %ERRORLEVEL% EQU 0 (
        echo [PASS] Laravel can access Git
    ) else (
        echo [WARN] Laravel Git diagnostics failed
        echo This might be normal if the command doesn't exist yet
    )
) else (
    echo [SKIP] Not in Laravel project directory
)
echo.

REM Test 6: Check workspace directory
echo [6/6] Checking workspace directory...
if exist "storage\workspaces" (
    echo [PASS] Workspace directory exists: storage\workspaces
) else (
    echo [INFO] Creating workspace directory...
    mkdir storage\workspaces
    if %ERRORLEVEL% EQU 0 (
        echo [PASS] Workspace directory created
    ) else (
        echo [FAIL] Could not create workspace directory
    )
)
echo.

echo ======================================
echo Test Summary
echo ======================================
echo.
echo If all tests passed, Git integration is ready!
echo.
echo Next steps:
echo 1. Restart your web server (IIS/Apache/Nginx)
echo 2. Test Git commands in your web terminal
echo 3. Try: git init, git status, git log
echo.
echo If tests failed:
echo 1. Review the error messages above
echo 2. Follow the action required steps
echo 3. See docs\GIT_INSTALLATION_WINDOWS.md for detailed guide
echo.
pause
