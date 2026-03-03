import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const getCookieValue = (name) => {
    const prefix = `${name}=`;
    const cookie = document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix));

    if (!cookie) {
        return '';
    }

    try {
        return decodeURIComponent(cookie.slice(prefix.length));
    } catch {
        return cookie.slice(prefix.length);
    }
};

// Attach CSRF headers on non-GET visits. Prefer XSRF-TOKEN cookie (works well
// behind proxies/CDNs), while keeping meta token as a fallback.
router.on('before', (event) => {
    const method = event.detail.visit.method?.toUpperCase() ?? 'GET';
    if (method !== 'GET') {
        const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
        const xsrfToken = getCookieValue('XSRF-TOKEN');
        const headers = { ...event.detail.visit.headers };

        if (metaToken) {
            headers['X-CSRF-TOKEN'] = metaToken;
        }

        if (xsrfToken) {
            headers['X-XSRF-TOKEN'] = xsrfToken;
        }

        event.detail.visit.headers = headers;
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
