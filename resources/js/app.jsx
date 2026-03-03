import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

// Inertia v2 does NOT auto-send CSRF tokens. Attach X-CSRF-TOKEN from the
// meta tag on every non-GET request so Laravel's VerifyCsrfToken passes.
router.on('before', (event) => {
    const method = event.detail.visit.method?.toUpperCase() ?? 'GET';
    if (method !== 'GET') {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
        if (token) {
            event.detail.visit.headers = { ...event.detail.visit.headers, 'X-CSRF-TOKEN': token };
        }
    }
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
