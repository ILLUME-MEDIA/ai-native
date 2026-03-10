import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { Component } from 'react';

// Inject CSRF token into every Inertia visit via the 'before' event.
// This is more reliable than an axios interceptor because Inertia passes
// its own headers object explicitly to axios, which can bypass interceptor merging.
router.on('before', (event) => {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (token) {
        event.detail.visit.headers = {
            ...event.detail.visit.headers,
            'X-CSRF-TOKEN': token,
        };
    }
});

// Error boundary: catches render errors and shows a visible message instead of
// a silent white screen. Especially useful in production where React swallows errors.
class AppErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#333' }}>
                    <h2>Something went wrong loading the page.</h2>
                    <p>Please try refreshing. If the problem persists, contact support.</p>
                    {import.meta.env.DEV && (
                        <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', overflowX: 'auto' }}>
                            {String(this.state.error)}
                        </pre>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}

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

        root.render(
            <AppErrorBoundary>
                <App {...props} />
            </AppErrorBoundary>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
