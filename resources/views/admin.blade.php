<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Admin</title>
    @viteReactRefresh
    @vite(['resources/js/Admin/main.jsx'])
</head>
<body>
    <script>
        (function() {
            try {
                var raw = window.sessionStorage && sessionStorage.getItem('__THEME_CONFIG__');
                if (!raw) return;
                var s = JSON.parse(raw);
                var html = document.documentElement;
                var theme = s.theme === 'system' ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : (s.theme || 'light');
                if (s.theme) html.setAttribute('data-bs-theme', theme);
                if (s.skin) html.setAttribute('data-skin', s.skin);
                if (s.orientation === 'horizontal') html.setAttribute('data-layout', 'topnav'); else html.removeAttribute('data-layout');
                if (s.sidenavUser !== undefined) html.setAttribute('data-sidenav-user', String(s.sidenavUser));
                if (s.position) html.setAttribute('data-layout-position', s.position);
                if (s.topbarColor) html.setAttribute('data-topbar-color', s.topbarColor);
                if (s.sidenavColor) html.setAttribute('data-menu-color', s.sidenavColor);
                if (s.sidenavSize) html.setAttribute('data-sidenav-size', s.sidenavSize);
                if (s.width) html.setAttribute('data-layout-width', s.width);
                if (s.dir) html.setAttribute('dir', s.dir);
            } catch (e) {}
        })();
    </script>
    <div id="admin-root"></div>

    <script>
        // Provide initial server-side props for hydration
        window.__INITIAL_PROPS__ = @json($initialProps ?? []);
        
        // Cleanup Bootstrap modals and backdrops on page load (fixes login modal issue)
        (function() {
            // Remove all Bootstrap modal backdrops
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(function(backdrop) {
                backdrop.remove();
            });
            
            // Remove modal-open class from body
            document.body.classList.remove('modal-open');
            
            // Reset body padding and overflow
            document.body.style.paddingRight = '';
            document.body.style.overflow = '';
            
            // Close any open Bootstrap modals
            const openModals = document.querySelectorAll('.modal.show');
            openModals.forEach(function(modal) {
                modal.classList.remove('show');
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
                modal.removeAttribute('aria-modal');
            });
        })();
    </script>
</body>
</html>
