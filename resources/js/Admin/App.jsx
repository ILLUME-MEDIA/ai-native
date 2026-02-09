import { useEffect } from 'react';
import { useLocation, useRoutes } from 'react-router';
import { routes } from '@admin/routes';

const App = () => {
  const location = useLocation();
  
  // Cleanup Bootstrap modals and backdrops on route change
  useEffect(() => {
    // Remove all Bootstrap modal backdrops
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    
    // Remove modal-open class from body
    document.body.classList.remove('modal-open');
    
    // Reset body padding and overflow
    document.body.style.paddingRight = '';
    document.body.style.overflow = '';
    
    // Close any open Bootstrap modals
    const openModals = document.querySelectorAll('.modal.show');
    openModals.forEach(modal => {
      const bsModal = window.bootstrap?.Modal?.getInstance(modal);
      if (bsModal) {
        bsModal.hide();
      } else {
        // Fallback: manually hide modal
        modal.classList.remove('show');
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        modal.removeAttribute('aria-modal');
      }
    });
  }, [location.pathname]);
  
  // Cleanup on initial mount
  useEffect(() => {
    // Remove any lingering modal backdrops
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    document.body.classList.remove('modal-open');
    document.body.style.paddingRight = '';
    document.body.style.overflow = '';
  }, []);
  
  return useRoutes(routes);
};
export default App;