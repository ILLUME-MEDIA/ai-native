<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Console\Scheduling\Schedule;

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
        // Ensure CORS headers are added before any other middleware can short-circuit the request.
        $middleware->prepend(\Illuminate\Http\Middleware\HandleCors::class);

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        // Exclude all API routes from CSRF — they use Bearer token auth, not cookies.
        // This prevents 419 errors when calling API routes from Swagger UI or external sites
        // that share the same domain (which triggers Sanctum's stateful middleware + CSRF check).
        $middleware->validateCsrfTokens(except: [
            'api/*',
            'logout',
        ]);

        $middleware->alias([
            'mcp.check'    => \App\Http\Middleware\CheckMcpPermissions::class,
            'mcp.auth'     => \App\Http\Middleware\McpOrSanctumAuth::class,
            'otp.admin'    => \App\Http\Middleware\OtpAdminAuth::class,
            'site.api.key' => \App\Http\Middleware\ValidateSiteApiKey::class,
        ]);

        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
