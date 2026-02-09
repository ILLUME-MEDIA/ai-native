<?php

namespace App\Providers;

use Illuminate\Auth\Middleware\RedirectIfAuthenticated;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

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
    }
}
