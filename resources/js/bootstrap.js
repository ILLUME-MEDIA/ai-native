import axios from 'axios';
window.axios = axios;

// ── Laravel Echo (Pusher / Reverb) — optional, only if VITE_PUSHER_APP_KEY set ──
// cPanel/shared hosting: leave VITE_PUSHER_APP_KEY empty → polling is used instead.
// VPS/Reverb:  set VITE_REVERB_APP_KEY in .env → Echo initialized with Reverb.
// Pusher.com:  set VITE_PUSHER_APP_KEY in .env → Echo initialized with Pusher.
import Echo   from 'laravel-echo';
import Pusher from 'pusher-js';
window.Pusher = Pusher;

const pusherKey  = import.meta.env.VITE_PUSHER_APP_KEY;
const reverbKey  = import.meta.env.VITE_REVERB_APP_KEY;

if (pusherKey) {
    // ── Pusher.com ──
    window.Echo = new Echo({
        broadcaster:       'pusher',
        key:               pusherKey,
        cluster:           import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1',
        forceTLS:          true,
        disableStats:      true,
    });
} else if (reverbKey) {
    // ── Laravel Reverb (VPS only) ──
    window.Echo = new Echo({
        broadcaster:       'reverb',
        key:               reverbKey,
        wsHost:            import.meta.env.VITE_REVERB_HOST   ?? '127.0.0.1',
        wsPort:            import.meta.env.VITE_REVERB_PORT   ?? 8080,
        wssPort:           import.meta.env.VITE_REVERB_PORT   ?? 8080,
        forceTLS:          (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
        enabledTransports: ['ws', 'wss'],
        disableStats:      true,
    });
}
// else: no Echo → polling fallback used automatically in TicketTable

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Set CSRF token from meta tag for all axios requests
const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
if (token) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
}

// Add interceptor to include CSRF token + SITE_API_KEY in every request.
// The Bearer token lets /api/entities/* work even when no Sanctum session is active.
window.axios.interceptors.request.use((config) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
        config.headers['X-CSRF-TOKEN'] = csrfToken;
    }
    // Attach site API key as Bearer token so admin SPA can reach protected
    // endpoints (/api/entities/*) without requiring a login session.
    if (!config.headers['Authorization'] && window.__SITE_API_KEY__) {
        config.headers['Authorization'] = `Bearer ${window.__SITE_API_KEY__}`;
    }
    // Bust browser + cPanel/LiteSpeed proxy cache on every GET request by
    // appending a timestamp. This ensures admin pages always fetch fresh data
    // from the database and never serve a stale cached response.
    if (!config.method || config.method.toLowerCase() === 'get') {
        config.params = { ...config.params, _t: Date.now() };
    }
    return config;
});
