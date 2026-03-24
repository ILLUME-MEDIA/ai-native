import { useEffect } from 'react';
import { useLocation, useRoutes } from 'react-router';
import { routes } from '@admin/routes';
import { listenTokenChanges } from '@admin/utils/designSystemSync';

// ── Design Token global injector ──────────────────────────────────────────────
function hexToRgb(hex) {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : null;
}
const COLOR_NAMES = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];

export function buildTokenCss(map) {
  const lines = [':root {'];
  for (const n of COLOR_NAMES) {
    const v = map[`color.${n}`]; if (!v) continue;
    lines.push(`  --bs-${n}: ${v};`);
    const rgb = hexToRgb(v); if (rgb) lines.push(`  --bs-${n}-rgb: ${rgb};`);
  }
  const r = (k, bv) => { if (map[k]) lines.push(`  ${bv}: ${map[k]};`); };
  r('radius.sm',          '--bs-border-radius-sm');
  r('radius.md',          '--bs-border-radius');
  r('radius.lg',          '--bs-border-radius-lg');
  r('radius.full',        '--bs-border-radius-pill');
  lines.push('}');
  for (const n of COLOR_NAMES) {
    const v = map[`color.${n}`]; if (!v || !v.startsWith('#')) continue;
    lines.push(`.btn-${n}{--bs-btn-bg:${v};--bs-btn-border-color:${v};--bs-btn-hover-bg:${v};--bs-btn-active-bg:${v}}`);
    lines.push(`.btn-outline-${n}{--bs-btn-color:${v};--bs-btn-border-color:${v};--bs-btn-hover-bg:${v}}`);
  }
  return lines.join('\n');
}

export function injectTokenCss(css) {
  let el = document.getElementById('dsm-token-css');
  if (!el) { el = document.createElement('style'); el.id = 'dsm-token-css'; document.head.appendChild(el); }
  el.textContent = css;
}

export async function loadAndInjectTokens() {
  try {
    const themes = await fetch('/api/admin/design-system/themes').then(r => r.json());
    const theme  = (themes ?? []).find(t => t.is_default) ?? themes?.[0];
    if (!theme) return;
    const tokens = await fetch(`/api/admin/design-system/tokens?theme_id=${theme.id}`).then(r => r.json());
    const map = {};
    for (const t of (tokens ?? [])) map[t.name] = t.value;
    injectTokenCss(buildTokenCss(map));
  } catch (_) { /* silently skip if API unavailable */ }
}

const App = () => {
  const location = useLocation();

  // Initial token injection on mount
  useEffect(() => { loadAndInjectTokens(); }, []);

  // Re-inject when tokens change (same tab via ColorsTab/DesignManager, or other tabs via BroadcastChannel)
  useEffect(() => {
    return listenTokenChanges((tokenMap) => {
      if (tokenMap) {
        // Immediate re-inject with provided map (no extra API call)
        injectTokenCss(buildTokenCss(tokenMap));
      } else {
        // Reload from DB (called when map not available)
        loadAndInjectTokens();
      }
    });
  }, []);

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