import axios from 'axios';
window.axios = axios;

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
    return config;
});
