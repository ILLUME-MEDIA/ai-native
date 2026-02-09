import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import AppProvidersWrapper from './components/wrappers/AppProvidersWrapper';
import './assets/scss/app.scss';
// Global styles are loaded by Laravel Vite (resources/css/app.css)
// Admin assets scss imports the admin theme so it gets bundled by Vite

// Mount to the Blade admin root element
createRoot(document.getElementById('admin-root')).render(
  <StrictMode>
    <BrowserRouter basename="/admin">
      <AppProvidersWrapper>
        <App />
      </AppProvidersWrapper>
    </BrowserRouter>
  </StrictMode>
);
