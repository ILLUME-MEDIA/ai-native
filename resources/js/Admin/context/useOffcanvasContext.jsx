import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Button, Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle } from 'react-bootstrap';
import { _registerOffcanvasShow } from '@admin/utils/offcanvas';

// ── Variant config ────────────────────────────────────────────────────────────
const VARIANT_CLASSES = {
  primary: { header: 'bg-primary text-white',  closeBtn: 'btn-close-white' },
  success: { header: 'bg-success text-white',  closeBtn: 'btn-close-white' },
  danger:  { header: 'bg-danger text-white',   closeBtn: 'btn-close-white' },
  warning: { header: 'bg-warning',             closeBtn: '' },
  info:    { header: 'bg-info text-white',     closeBtn: 'btn-close-white' },
  dark:    { header: 'bg-dark text-white',     closeBtn: 'btn-close-white' },
  light:   { header: 'bg-light',              closeBtn: '' },
};

const defaultState = {
  show:      false,
  title:     '',
  body:      null,
  placement: 'start',
  variant:   null,
  scroll:    false,
  backdrop:  true,
};

// ── Context ───────────────────────────────────────────────────────────────────
const OffcanvasContext = createContext(undefined);

export function useOffcanvasContext() {
  const ctx = useContext(OffcanvasContext);
  if (!ctx) throw new Error('useOffcanvasContext must be used within an OffcanvasProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function OffcanvasProvider({ children }) {
  const [config, setConfig] = useState(defaultState);

  const showOffcanvas = useCallback((opts = {}) => {
    setConfig({ ...defaultState, ...opts, show: true });
  }, []);

  const hideOffcanvas = useCallback(() => {
    setConfig(prev => ({ ...prev, show: false }));
  }, []);

  // Register global openOffcanvas() utility
  useEffect(() => {
    _registerOffcanvasShow(showOffcanvas);
    return () => _registerOffcanvasShow(null);
  }, [showOffcanvas]);

  const variantCls = config.variant ? (VARIANT_CLASSES[config.variant] ?? {}) : {};

  return (
    <OffcanvasContext.Provider value={{ showOffcanvas, hideOffcanvas }}>
      {children}

      <Offcanvas
        show={config.show}
        onHide={hideOffcanvas}
        placement={config.placement}
        scroll={config.scroll}
        backdrop={config.backdrop}
      >
        <OffcanvasHeader className={variantCls.header ?? ''}>
          {config.title && (
            <OffcanvasTitle as="h5">{config.title}</OffcanvasTitle>
          )}
          <Button
            className={`btn-close ms-auto ${variantCls.closeBtn ?? ''}`}
            onClick={hideOffcanvas}
            aria-label="Close"
          />
        </OffcanvasHeader>
        <OffcanvasBody>
          {typeof config.body === 'string'
            ? <p className="text-muted">{config.body}</p>
            : config.body}
        </OffcanvasBody>
      </Offcanvas>
    </OffcanvasContext.Provider>
  );
}
