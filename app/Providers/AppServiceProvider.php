<?php

namespace App\Providers;

use Illuminate\Auth\Middleware\RedirectIfAuthenticated;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // MySQL utf8mb4: index key max 1000 bytes; 255 chars = 1020 bytes. Use 191 to stay under limit.
        Schema::defaultStringLength(191);

        Vite::prefetch(concurrency: 3);

        // If a logged-in user hits /login or other guest pages, send them to admin dashboard.
        RedirectIfAuthenticated::redirectUsing(function () {
            return '/admin/dashboard/ecommerce';
        });

        // On cPanel / shared hosting, SESSION_DOMAIN / secure flags are frequently misconfigured
        // (e.g. cookie bound to a different domain or sent with SameSite rules that prevent it
        // from being sent after redirects). That results in "login → dashboard → back to login"
        // and CSRF 419 loops because every request starts a new anonymous session.
        //
        // For this project we prefer reliability over strict cookie settings, so we normalize
        // session cookies to the safest, most compatible configuration whenever handling HTTP
        // traffic (never in artisan / console).
        if (! $this->app->runningInConsole()) {
            config([
                // Host-only cookie – automatically matches the current subdomain.
                'session.domain' => null,
                // Allow cookie over both HTTP and HTTPS (still encrypted & httpOnly).
                'session.secure' => false,
                // Standard Lax SameSite which works well with redirects on the same site.
                'session.same_site' => 'lax',
            ]);
        }
    }
}
