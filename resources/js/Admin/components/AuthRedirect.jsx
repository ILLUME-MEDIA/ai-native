import { useEffect } from 'react';

/**
 * When Admin SPA is loaded but URL is an auth path (e.g. /login),
 * do a full page redirect so Laravel serves the correct Inertia login page.
 */
const AuthRedirect = () => {
  useEffect(() => {
    const path = window.location.pathname;
    // Strip /admin prefix so we redirect to /login not /admin/login
    const authPath = path.replace(/^\/admin/, '') || '/login';
    // Full page redirect so server serves Inertia auth pages
    window.location.replace(authPath);
  }, []);

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted mb-0">Redirecting to login...</p>
      </div>
    </div>
  );
};

export default AuthRedirect;
