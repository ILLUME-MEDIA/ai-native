/**
 * Design System Sync Utility
 *
 * Broadcasts token changes:
 *   - same tab   → CustomEvent  'dsm:tokens-changed'
 *   - other tabs → BroadcastChannel 'dsm_tokens'
 *
 * Usage:
 *   import { broadcastTokenChange, listenTokenChanges } from '@admin/utils/designSystemSync';
 *
 *   // After saving tokens to DB:
 *   broadcastTokenChange(tokenMap);   // tokenMap optional — if provided skips API refetch
 *
 *   // In App.jsx / any listener:
 *   const cleanup = listenTokenChanges((map) => reinjectCss(map));
 *   return cleanup; // in useEffect cleanup
 */

export const DSM_CHANGED_EVENT = 'dsm:tokens-changed';

const _channel = (() => {
  try { return typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dsm_tokens') : null; }
  catch { return null; }
})();

/**
 * Fire after any design token is updated in DB.
 * @param {Object|null} tokenMap  - flat map { 'color.primary': '#405189', ... }
 *                                  pass null to force a full API reload on listeners
 */
export function broadcastTokenChange(tokenMap = null) {
  // Same-tab notification
  window.dispatchEvent(new CustomEvent(DSM_CHANGED_EVENT, { detail: { tokenMap } }));
  // Cross-tab notification
  try { _channel?.postMessage({ type: 'tokens_changed', tokenMap, ts: Date.now() }); } catch {}
}

/**
 * Subscribe to token changes (same tab + other tabs).
 * @param {Function} fn  - called with (tokenMap|null)
 * @returns cleanup function
 */
export function listenTokenChanges(fn) {
  const winHandler = (e) => fn(e.detail?.tokenMap ?? null);
  window.addEventListener(DSM_CHANGED_EVENT, winHandler);

  const chHandler = (e) => {
    if (e.data?.type === 'tokens_changed') fn(e.data?.tokenMap ?? null);
  };
  try { _channel?.addEventListener('message', chHandler); } catch {}

  return () => {
    window.removeEventListener(DSM_CHANGED_EVENT, winHandler);
    try { _channel?.removeEventListener('message', chHandler); } catch {}
  };
}
