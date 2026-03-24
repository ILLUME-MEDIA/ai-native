import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Toast, ToastBody, ToastContainer, ToastHeader } from 'react-bootstrap';
import Icon from '@admin/components/wrappers/Icon';
import { NOTIFY_EVENT } from '@admin/utils/notify';

// ── Variant config ────────────────────────────────────────────────────────────
const VARIANT_META = {
  success: { icon: 'check-circle',  textWhite: true  },
  danger:  { icon: 'x-circle',      textWhite: true  },
  warning: { icon: 'alert-triangle',textWhite: false },
  info:    { icon: 'info',          textWhite: true  },
  primary: { icon: 'bell',          textWhite: true  },
  dark:    { icon: 'bell',          textWhite: true  },
  light:   { icon: 'bell',          textWhite: false },
};

let _idCounter = 0;
function newId() { return ++_idCounter; }

// ── Single Toast item ─────────────────────────────────────────────────────────
function ToastItem({ item, onClose }) {
  const meta    = VARIANT_META[item.variant] ?? VARIANT_META.light;
  const icon    = item.icon ?? meta.icon;
  const isWhite = meta.textWhite;

  return (
    <Toast
      bg={item.variant ?? 'light'}
      show={item.show}
      onClose={() => onClose(item.id)}
      delay={item.delay ?? 3000}
      autohide
      className="mb-2 shadow"
    >
      {item.title && (
        <ToastHeader className={isWhite ? 'text-white border-0 bg-transparent' : 'border-0'}>
          {icon && <Icon icon={icon} className={`me-2 ${isWhite ? 'text-white' : ''}`} size={15} />}
          <strong className="me-auto">{item.title}</strong>
        </ToastHeader>
      )}
      <ToastBody className={isWhite ? 'text-white d-flex align-items-center gap-2' : 'd-flex align-items-center gap-2'}>
        {!item.title && icon && (
          <Icon icon={icon} size={16} className={isWhite ? 'text-white flex-shrink-0' : 'flex-shrink-0'} />
        )}
        <span>{item.message}</span>
      </ToastBody>
    </Toast>
  );
}

// ── Context ───────────────────────────────────────────────────────────────────
const NotificationContext = createContext(undefined);

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotificationContext must be used within a NotificationProvider');
  return context;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const positionRef = useRef('top-end');

  const addToast = useCallback(({ message, title, variant = 'light', delay = 3000, icon, position } = {}) => {
    if (position) positionRef.current = position;
    const id = newId();
    setToasts(prev => [...prev, { id, show: true, message, title, variant, delay, icon }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, delay + 400); // cleanup after animation
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, show: false } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 400);
  }, []);

  // Listen to global notify() calls from anywhere
  useEffect(() => {
    const handler = (e) => addToast(e.detail);
    window.addEventListener(NOTIFY_EVENT, handler);
    return () => window.removeEventListener(NOTIFY_EVENT, handler);
  }, [addToast]);

  // Legacy API: showNotification({title, message, variant, delay})
  const showNotification = useCallback((opts) => addToast(opts), [addToast]);

  return (
    <NotificationContext.Provider value={{ showNotification, notify: addToast }}>
      <ToastContainer
        position={positionRef.current}
        className="position-fixed p-3"
        style={{ zIndex: 9999 }}
      >
        {toasts.map(item => (
          <ToastItem key={item.id} item={item} onClose={removeToast} />
        ))}
      </ToastContainer>
      {children}
    </NotificationContext.Provider>
  );
}
