import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import AppProvidersWrapper from './components/wrappers/AppProvidersWrapper';
import './assets/scss/app.scss';
// Global styles are loaded by Laravel Vite (resources/css/app.css)
// Admin assets scss imports the admin theme so it gets bundled by Vite

// Determine basename based on current path
// Login/auth routes are outside /admin, so no basename for them
const getBasename = () => {
  const path = window.location.pathname;
  // If path starts with /login, /register, /forgot-password, etc., no basename
  if (path.startsWith('/login') || path.startsWith('/register') || 
      path.startsWith('/forgot-password') || path.startsWith('/reset-password') ||
      path.startsWith('/verify-email') || path.startsWith('/confirm-password')) {
    return '';
  }
  // Otherwise use /admin basename
  return '/admin';
};

// Mount to the Blade admin root element
createRoot(document.getElementById('admin-root')).render(
  <StrictMode>
    <BrowserRouter basename={getBasename()}>
      <AppProvidersWrapper>
        <App />
      </AppProvidersWrapper>
    </BrowserRouter>
  </StrictMode>
);
