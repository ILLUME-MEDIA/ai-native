<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts: load app.jsx (Inertia bootstrap) + admin Bootstrap CSS explicitly.
             The admin SCSS is a separate Vite entry used by admin.blade.php. Vite deduplicates
             it out of the Login/Register page chunks, so we must load it explicitly here or
             Bootstrap utility classes have no effect and the auth pages appear blank. -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', 'resources/js/Admin/assets/scss/app.scss'])
        @inertiaHead
    </head>
    <body>
        {{-- Restore Bootstrap theme (dark/light) saved by the Admin SPA --}}
        <script>
            (function () {
                try {
                    var raw = window.sessionStorage && sessionStorage.getItem('__THEME_CONFIG__');
                    if (!raw) return;
                    var s = JSON.parse(raw);
                    var html = document.documentElement;
                    var theme = s.theme === 'system'
                        ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                        : (s.theme || 'light');
                    if (s.theme) html.setAttribute('data-bs-theme', theme);
                } catch (e) {}
            })();
        </script>
        @inertia
    </body>
</html>
