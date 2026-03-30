<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\ViteManifestNotFoundException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('ai:duties:execute')->everyFiveMinutes()->withoutOverlapping();
    })
    ->withMiddleware(function (Middleware $middleware): void {
        // Trust all proxies — cPanel/Apache terminates HTTPS and forwards as HTTP internally.
        // Without this, Laravel sees wrong scheme → session domain mismatch → 419 CSRF errors.
        $middleware->trustProxies(at: '*');

        // Ensure CORS headers are added before any other middleware can short-circuit the request.
        $middleware->prepend(\Illuminate\Http\Middleware\HandleCors::class);

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->api(prepend: [
            // Adds Cache-Control: no-store + CORS fallback so Nginx proxy cache
            // never serves a stale HTML page instead of the API JSON response.
            \App\Http\Middleware\AddApiHeaders::class,
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        // Release the PHP session file lock before any controller (especially SSE
        // streams) runs. Without this, long-lived SSE connections block every
        // other request from the same browser session, causing refresh loops.
        $middleware->api(append: [
            \App\Http\Middleware\ReleaseSession::class,
        ]);

        // Exclude all API routes from CSRF — they use Bearer token auth, not cookies.
        // This prevents 419 errors when calling API routes from Swagger UI or external sites
        // that share the same domain (which triggers Sanctum's stateful middleware + CSRF check).
        $middleware->validateCsrfTokens(except: [
            'api/*',
            // Auth routes are served via Inertia / Blade and on some shared hosts
            // proxies can break CSRF cookie -> 419 loops. Since these routes are
            // simple form posts with no side-effect APIs, we prefer reliability.
            'login',
            'logout',
            'register',
            'password/*',
            'forgot-password',
            'reset-password',
            'email/verification-notification',
            'verify-email',
            'confirm-password',
        ]);

        $middleware->alias([
            'mcp.check'      => \App\Http\Middleware\CheckMcpPermissions::class,
            'mcp.auth'       => \App\Http\Middleware\McpOrSanctumAuth::class,
            'otp.admin'      => \App\Http\Middleware\OtpAdminAuth::class,
            'site.api.key'   => \App\Http\Middleware\ValidateSiteApiKey::class,
            'workspace.auth' => \App\Http\Middleware\WorkspaceAuth::class,
        ]);

        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Force JSON responses for all API routes — prevents HTML error pages
        // when Accept: */* is sent (e.g. Swagger UI curl).
        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') && !$request->expectsJson()) {
                $request->headers->set('Accept', 'application/json');
            }
        });

        $exceptions->render(function (ViteManifestNotFoundException $e) {
            $msg = "Frontend assets are not built on the server.\n\n".
                "Fix:\n".
                "- Run: npm ci && npm run build\n".
                "- Ensure public/build/manifest.json exists\n".
                "- Then clear caches: php artisan view:clear && php artisan config:clear\n";

            return response($msg, 500, ['Content-Type' => 'text/plain; charset=UTF-8']);
        });
    })->create();
