@echo off
echo ================================================
echo    Restarting Laravel Development Server
echo ================================================
echo.

echo [1/3] Stopping current PHP processes...
taskkill /F /IM php.exe >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] PHP processes stopped
    timeout /t 2 >nul
) else (
    echo [OK] No PHP processes running
)
echo.

echo [2/3] Clearing Laravel caches...
php artisan config:clear >nul 2>&1
php artisan cache:clear >nul 2>&1
echo [OK] Caches cleared
echo.

echo [3/3] Starting Laravel server...
echo.
echo ================================================
echo    Server is starting...
echo    URL: http://localhost:8000
echo ================================================
echo.
echo Press Ctrl+C to stop the server
echo.

php artisan serve

pause
