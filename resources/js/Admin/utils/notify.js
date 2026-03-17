/**
 * Global notify utility — call from anywhere (components, API handlers, outside React)
 *
 * Usage:
 *   import { notify } from '@admin/utils/notify';
 *
 *   notify('Message saved');
 *   notify.success('Record created!');
 *   notify.error('Something went wrong', { title: 'Error', delay: 5000 });
 *   notify.warning('Check your inputs');
 *   notify.info('Syncing data...');
 *   notify.primary('Welcome back!');
 *   notify.dark('Dark notification');
 *
 * Options:
 *   { title, variant, delay, icon, position }
 */

export const NOTIFY_EVENT = 'admin:notify';

export function notify(message, options = {}) {
  window.dispatchEvent(
    new CustomEvent(NOTIFY_EVENT, {
      detail: { message, ...options },
    })
  );
}

notify.success = (message, opts = {}) => notify(message, { variant: 'success', icon: 'check-circle', ...opts });
notify.error   = (message, opts = {}) => notify(message, { variant: 'danger',  icon: 'x-circle',     ...opts });
notify.warning = (message, opts = {}) => notify(message, { variant: 'warning', icon: 'alert-triangle',...opts });
notify.info    = (message, opts = {}) => notify(message, { variant: 'info',    icon: 'info',          ...opts });
notify.primary = (message, opts = {}) => notify(message, { variant: 'primary', icon: 'bell',          ...opts });
notify.dark    = (message, opts = {}) => notify(message, { variant: 'dark',    icon: 'bell',          ...opts });
