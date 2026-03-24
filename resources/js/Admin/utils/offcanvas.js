/**
 * Global openOffcanvas utility — call from anywhere (components, API handlers, outside React)
 *
 * Usage:
 *   import { openOffcanvas } from '@admin/utils/offcanvas';
 *
 *   openOffcanvas({ title: 'Details', body: 'Some content here' });
 *   openOffcanvas.start('Left Panel', 'Content here');
 *   openOffcanvas.end('Right Panel', 'Content here');
 *   openOffcanvas.top('Top Panel', 'Content here');
 *   openOffcanvas.bottom('Bottom Panel', 'Content here');
 *
 * Options:
 *   { title, body, placement, variant, scroll, backdrop }
 *   variant: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'dark' | 'light'
 *   placement: 'start' | 'end' | 'top' | 'bottom'  (default: 'start')
 */

// Module-level ref — OffcanvasProvider registers its show fn here
const _ref = { show: null };

export function _registerOffcanvasShow(fn) {
  _ref.show = fn;
}

export function openOffcanvas(options = {}) {
  if (_ref.show) {
    _ref.show({ placement: 'start', ...options });
  } else {
    console.warn('[openOffcanvas] OffcanvasProvider is not mounted.');
  }
}

openOffcanvas.start  = (title, body, opts = {}) => openOffcanvas({ title, body, placement: 'start',  ...opts });
openOffcanvas.end    = (title, body, opts = {}) => openOffcanvas({ title, body, placement: 'end',    ...opts });
openOffcanvas.top    = (title, body, opts = {}) => openOffcanvas({ title, body, placement: 'top',    ...opts });
openOffcanvas.bottom = (title, body, opts = {}) => openOffcanvas({ title, body, placement: 'bottom', ...opts });
