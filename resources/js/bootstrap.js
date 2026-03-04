import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Axios reads XSRF-TOKEN cookie and sends it as X-XSRF-TOKEN header on every request.
// Required for CSRF protection on cPanel/reverse-proxy deployments with Inertia v2.
window.axios.defaults.withCredentials = true;
window.axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
window.axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';
