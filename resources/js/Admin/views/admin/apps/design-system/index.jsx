import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { useLayoutContext } from '@admin/context/useLayoutContext';
import Direction from '@admin/layouts/components/Customizer/components/Dir';
import Orientation from '@admin/layouts/components/Customizer/components/Orientation';
import Position from '@admin/layouts/components/Customizer/components/Position';
import SidenavColor from '@admin/layouts/components/Customizer/components/SidenavColor';
import SidenavSize from '@admin/layouts/components/Customizer/components/SidenavSize';
import SidenavUser from '@admin/layouts/components/Customizer/components/SidenavUser';
import Skin from '@admin/layouts/components/Customizer/components/Skin';
import Theme from '@admin/layouts/components/Customizer/components/Theme';
import TopbarColor from '@admin/layouts/components/Customizer/components/TopbarColor';
import Width from '@admin/layouts/components/Customizer/components/Width';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, Col, Nav, Row, Tab } from 'react-bootstrap';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_DEFS = [
  { key: 'primary',   label: 'Primary',   desc: 'Buttons, links, active states',      def: '#405189' },
  { key: 'secondary', label: 'Secondary', desc: 'Supporting / neutral actions',        def: '#74788d' },
  { key: 'success',   label: 'Success',   desc: 'Positive confirmations, badges',      def: '#0ab39c' },
  { key: 'danger',    label: 'Danger',    desc: 'Errors, delete, destructive actions', def: '#f06548' },
  { key: 'warning',   label: 'Warning',   desc: 'Alerts, caution indicators',          def: '#f7b84b' },
  { key: 'info',      label: 'Info',      desc: 'Informational messages, hints',       def: '#299cdb' },
];

const STRUCTURAL_COLOR_DEFS = [
  { key: 'sidenavBg', label: 'Sidebar BG',  desc: 'Sidebar panel background',    def: '#1e1f27', icon: 'ri-sidebar-fill' },
  { key: 'topbarBg',  label: 'Topbar BG',   desc: 'Top navigation background',   def: '#ffffff', icon: 'ri-layout-top-fill' },
  { key: 'bodyBg',    label: 'Page BG',     desc: 'Main content area background', def: '#f6f7fb', icon: 'ri-layout-fill' },
];

const FONT_OPTIONS = [
  { name: 'Nunito',            tag: 'default' },
  { name: 'Inter',             tag: 'google' },
  { name: 'Roboto',            tag: 'google' },
  { name: 'Poppins',           tag: 'google' },
  { name: 'Outfit',            tag: 'google' },
  { name: 'DM Sans',           tag: 'google' },
  { name: 'Figtree',           tag: 'google' },
  { name: 'Plus Jakarta Sans', tag: 'google' },
  { name: 'Lato',              tag: 'google' },
  { name: 'Montserrat',        tag: 'google' },
  { name: 'Open Sans',         tag: 'google' },
  { name: 'Raleway',           tag: 'google' },
  { name: 'Source Sans 3',     tag: 'google' },
  { name: 'Ubuntu',            tag: 'google' },
  { name: 'Georgia',           tag: 'system' },
  { name: 'Arial',             tag: 'system' },
];

const SHADOW_OPTIONS = [
  { key: 'none',    label: 'None',    desc: 'Flat design' },
  { key: 'subtle',  label: 'Subtle',  desc: 'Barely visible' },
  { key: 'default', label: 'Default', desc: 'Theme default' },
  { key: 'medium',  label: 'Medium',  desc: 'Noticeable' },
  { key: 'bold',    label: 'Bold',    desc: 'Dramatic depth' },
];

const SHADOW_VALUES = {
  none:    'none',
  subtle:  '0 1px 3px rgba(0,0,0,0.08)',
  default: '0px 1px 4px 0px rgba(130,143,163,0.15)',
  medium:  '0 4px 14px rgba(0,0,0,0.12)',
  bold:    '0 8px 30px rgba(0,0,0,0.18)',
};

const RADIUS_PRESETS = [
  { label: 'Sharp',   value: 0 },
  { label: 'Slight',  value: 0.15 },
  { label: 'Default', value: 0.3 },
  { label: 'Rounded', value: 0.6 },
  { label: 'Roomy',   value: 1.0 },
  { label: 'Pill',    value: 1.5 },
];

const SPACING_PRESETS = [
  { key: 'dense',       label: 'Dense',       desc: 'Very compact',         multiplier: 0.6  },
  { key: 'compact',     label: 'Compact',     desc: 'Tighter spacing',      multiplier: 0.8  },
  { key: 'default',     label: 'Default',     desc: 'Standard spacing',     multiplier: 1.0  },
  { key: 'comfortable', label: 'Comfortable', desc: 'Relaxed breathing',    multiplier: 1.25 },
  { key: 'spacious',    label: 'Spacious',    desc: 'Maximum whitespace',   multiplier: 1.5  },
];

const ANIM_SPEEDS = [
  { key: 'off',    label: 'Off',    ms: 0,   icon: '⊘' },
  { key: 'fast',   label: 'Fast',   ms: 100, icon: '⚡' },
  { key: 'normal', label: 'Normal', ms: 200, icon: '◉' },
  { key: 'slow',   label: 'Slow',   ms: 400, icon: '🐢' },
];

const ANIM_EASINGS = [
  { key: 'ease-in-out', label: 'Smooth' },
  { key: 'ease',        label: 'Ease' },
  { key: 'linear',      label: 'Linear' },
  { key: 'ease-out',    label: 'Ease Out' },
];

const CSS_SNIPPETS = [
  { label: 'Hide scrollbar',    code: '/* Hide scrollbar but keep scrolling */\n::-webkit-scrollbar { display: none; }\n* { scrollbar-width: none; }' },
  { label: 'Card hover lift',   code: '.card { transition: transform 0.2s ease, box-shadow 0.2s ease; }\n.card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }' },
  { label: 'Smooth page fade',  code: '.page-content { animation: pageFadeIn 0.25s ease; }\n@keyframes pageFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }' },
  { label: 'Custom link color', code: 'a { color: var(--bs-primary); }\na:hover { filter: brightness(1.2); }' },
  { label: 'Sidebar width',     code: ':root {\n  --theme-sidenav-width: 220px;\n  --theme-sidenav-collapsed-width: 60px;\n}' },
];

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const SPACING_KEY = '__DESIGN_SPACING__';
const ANIM_KEY    = '__DESIGN_ANIMATION__';
const CSS_KEY     = '__DESIGN_CUSTOM_CSS__';
const PRESETS_KEY = '__DESIGN_SAVED_PRESETS__';

// ─── Persistence Helpers ──────────────────────────────────────────────────────

const loadJSON = (key, def) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? def; }
  catch { return def; }
};

const saveJSON = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

// ─── DOM Apply Helpers ────────────────────────────────────────────────────────

const applySpacingToDom = (multiplier) => {
  const root = document.documentElement;
  root.style.setProperty('--bs-spacer', `${multiplier}rem`);
  root.style.setProperty('--theme-card-body-padding-x', `${(1.3 * multiplier).toFixed(3)}rem`);
  root.style.setProperty('--theme-card-body-padding-y', `${(1.0 * multiplier).toFixed(3)}rem`);
};

const applyAnimationToDom = ({ speed, easing }) => {
  const root = document.documentElement;
  const found = ANIM_SPEEDS.find(s => s.key === speed);
  const ms = found ? found.ms : 200;
  if (ms === 0) {
    root.style.setProperty('--bs-transition-base', 'none');
    root.style.setProperty('--theme-transition', 'none');
    root.style.setProperty('--theme-transition-speed', '0ms');
  } else {
    root.style.setProperty('--bs-transition-base', `all ${ms}ms ${easing}`);
    root.style.setProperty('--theme-transition', `all ${ms}ms ${easing}`);
    root.style.setProperty('--theme-transition-speed', `${ms}ms`);
  }
};

const CUSTOM_CSS_STYLE_ID = '__design-custom-css__';
const applyCustomCSSToDOM = (css) => {
  let el = document.getElementById(CUSTOM_CSS_STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = CUSTOM_CSS_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
};

// ─── Accessibility Helper ─────────────────────────────────────────────────────

const getLuminance = (hex) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return 0;
  return [r[1], r[2], r[3]].reduce((acc, c, i) => {
    const v = parseInt(c, 16) / 255;
    const lin = v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    return acc + lin * [0.2126, 0.7152, 0.0722][i];
  }, 0);
};

const getContrast = (hex1, hex2) => {
  const L1 = getLuminance(hex1), L2 = getLuminance(hex2);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
};

// ─── Colors Tab ───────────────────────────────────────────────────────────────

const ColorsTab = () => {
  const { customColors, updateCustomColors, resetCustomColors } = useLayoutContext();
  const hasAny = Object.keys(customColors || {}).length > 0;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h5 className="fw-bold mb-1">Custom Colors</h5>
          <p className="text-muted small mb-0">Override theme colors. Changes apply instantly. WCAG contrast ratios shown below each swatch.</p>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={resetCustomColors} disabled={!hasAny}>Reset Colors</Button>
      </div>

      <Row className="g-3 mb-4">
        {COLOR_DEFS.map(({ key, label, desc, def }) => {
          const val = customColors?.[key] || '';
          const hex = val || def;
          const onWhite = getContrast(hex, '#ffffff');
          const onDark  = getContrast(hex, '#1a1a2e');
          return (
            <Col md={6} xl={4} key={key}>
              <div className="border rounded p-3 h-100">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="rounded border flex-shrink-0" style={{ width: 32, height: 32, backgroundColor: hex, transition: 'background-color 0.2s' }} />
                  <div className="flex-grow-1">
                    <div className="fw-semibold" style={{ fontSize: 13 }}>{label}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{desc}</div>
                  </div>
                  {val && <span className="badge bg-primary" style={{ fontSize: 9 }}>Custom</span>}
                </div>
                <div className="input-group input-group-sm mb-2">
                  <input type="color" className="form-control form-control-color border-end-0"
                    style={{ maxWidth: 38, padding: '2px 3px', cursor: 'pointer' }}
                    value={hex}
                    onChange={e => updateCustomColors({ [key]: e.target.value })} />
                  <input type="text" className="form-control font-monospace"
                    placeholder={def} value={val} maxLength={7}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '' || /^#[0-9a-fA-F]{0,6}$/.test(v))
                        updateCustomColors({ [key]: v.length === 7 ? v : '' });
                    }} />
                  {val && <button className="btn btn-outline-secondary" type="button" onClick={() => updateCustomColors({ [key]: '' })}>×</button>}
                </div>
                <div className="d-flex gap-1 flex-wrap">
                  <span className={`badge ${onWhite >= 4.5 ? 'bg-success' : onWhite >= 3 ? 'bg-warning text-dark' : 'bg-danger'}`} style={{ fontSize: 9 }}>
                    /{onWhite.toFixed(1)} on white {onWhite >= 4.5 ? '✓AA' : '✗AA'}
                  </span>
                  <span className={`badge ${onDark >= 4.5 ? 'bg-success' : onDark >= 3 ? 'bg-warning text-dark' : 'bg-danger'}`} style={{ fontSize: 9 }}>
                    /{onDark.toFixed(1)} on dark {onDark >= 4.5 ? '✓AA' : '✗AA'}
                  </span>
                </div>
                {!val && <div className="text-muted mt-1" style={{ fontSize: 10 }}>Using skin default</div>}
              </div>
            </Col>
          );
        })}
      </Row>

      <hr className="my-4" />
      <div className="mb-3">
        <h6 className="fw-bold mb-1">Structural Colors</h6>
        <p className="text-muted small mb-0">Override sidebar, topbar and page background. Works on top of any active skin.</p>
      </div>
      <Row className="g-3 mb-4">
        {STRUCTURAL_COLOR_DEFS.map(({ key, label, desc, def, icon }) => {
          const val = customColors?.[key] || '';
          return (
            <Col md={4} key={key}>
              <div className="border rounded p-3 h-100">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="rounded border flex-shrink-0 d-flex align-items-center justify-content-center"
                    style={{ width: 32, height: 32, backgroundColor: val || def, transition: 'background-color 0.2s' }}>
                    <i className={`${icon} text-white`} style={{ fontSize: 12, opacity: 0.9 }} />
                  </div>
                  <div>
                    <div className="fw-semibold" style={{ fontSize: 13 }}>{label}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{desc}</div>
                  </div>
                </div>
                <div className="input-group input-group-sm">
                  <input type="color" className="form-control form-control-color border-end-0"
                    style={{ maxWidth: 38, padding: '2px 3px', cursor: 'pointer' }}
                    value={val || def}
                    onChange={e => updateCustomColors({ [key]: e.target.value })} />
                  <input type="text" className="form-control font-monospace"
                    placeholder={def} value={val} maxLength={7}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '' || /^#[0-9a-fA-F]{0,6}$/.test(v))
                        updateCustomColors({ [key]: v.length === 7 ? v : '' });
                    }} />
                  {val && <button className="btn btn-outline-secondary" type="button" onClick={() => updateCustomColors({ [key]: '' })}>×</button>}
                </div>
                {!val && <div className="text-muted mt-1" style={{ fontSize: 10 }}>Using skin default</div>}
              </div>
            </Col>
          );
        })}
      </Row>

      {/* Tint palette preview */}
      <hr className="my-4" />
      <div className="mb-2">
        <h6 className="fw-bold mb-1">Color Tint Palette</h6>
        <p className="text-muted small mb-3">Auto-generated tints for each semantic color at 15%, 30%, 50%, 75%, 100%.</p>
      </div>
      <div className="d-flex gap-3 flex-wrap mb-4">
        {COLOR_DEFS.map(({ key, label, def }) => {
          const hex = customColors?.[key] || def;
          return (
            <div key={key} style={{ minWidth: 70 }}>
              <div className="fw-semibold text-center mb-1" style={{ fontSize: 10 }}>{label}</div>
              {[0.12, 0.3, 0.5, 0.75, 1].map((op, i) => (
                <div key={i} style={{ height: 18, backgroundColor: hex, opacity: op, marginBottom: 2, borderRadius: 3 }}
                  title={`${label} ${Math.round(op * 100)}%`} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Live preview */}
      <div className="border rounded p-3 bg-light">
        <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Live Color Preview</div>
        <div className="d-flex gap-2 flex-wrap mb-2">
          {COLOR_DEFS.map(({ key, label, def }) => (
            <button key={key} className="btn btn-sm text-white fw-semibold"
              style={{ backgroundColor: customColors?.[key] || def, borderColor: customColors?.[key] || def, fontSize: 11, padding: '3px 12px' }}>
              {label}
            </button>
          ))}
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {COLOR_DEFS.map(({ key, label, def }) => {
            const c = customColors?.[key] || def;
            return <span key={key} className="badge" style={{ backgroundColor: c + '22', color: c, border: `1px solid ${c}55`, fontSize: 10 }}>{label}</span>;
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Typography Tab ───────────────────────────────────────────────────────────

const TypographyTab = () => {
  const { customStyles, updateCustomStyles } = useLayoutContext();
  const currentFont = customStyles?.fontFamily || '';
  const currentSize = customStyles?.fontSize != null ? customStyles.fontSize : 14;
  const currentLH   = customStyles?.lineHeight != null ? parseFloat(customStyles.lineHeight) : 1.5;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h5 className="fw-bold mb-1">Typography</h5>
          <p className="text-muted small mb-0">Font family, size and line-height across the entire admin.</p>
        </div>
        <Button variant="outline-secondary" size="sm"
          onClick={() => updateCustomStyles({ fontFamily: null, fontSize: null, lineHeight: null })}>
          Reset Typography
        </Button>
      </div>

      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Font Family</div>
      <Row className="g-2 mb-4">
        {FONT_OPTIONS.map(({ name, tag }) => {
          const isSelected = currentFont === name || (!currentFont && name === 'Nunito');
          return (
            <Col xs={6} sm={4} md={3} xl={2} key={name}>
              <div onClick={() => updateCustomStyles({ fontFamily: name === 'Nunito' ? null : name })}
                className={`border rounded p-2 text-center ${isSelected ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                style={{ cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ fontFamily: `"${name}", sans-serif`, fontSize: 20, lineHeight: 1.2, fontWeight: 600 }}>Aa</div>
                <div style={{ fontSize: 10, marginTop: 3, lineHeight: 1.2 }}>{name}</div>
                {tag !== 'google' && <div style={{ fontSize: 9, color: '#aaa' }}>{tag}</div>}
              </div>
            </Col>
          );
        })}
      </Row>

      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Base Font Size</div>
      <div className="mb-4">
        <div className="d-flex justify-content-between mb-1">
          <span className="text-muted small">12px</span>
          <span className="badge bg-primary">{currentSize}px</span>
          <span className="text-muted small">18px</span>
        </div>
        <input type="range" className="form-range" min={12} max={18} step={1} value={currentSize}
          onChange={e => updateCustomStyles({ fontSize: Number(e.target.value) })} />
        <div className="d-flex gap-2 mt-2">
          {[12, 13, 14, 15, 16, 17, 18].map(sz => (
            <button key={sz} className={`btn btn-sm ${currentSize === sz ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{ fontSize: 10, padding: '2px 8px' }}
              onClick={() => updateCustomStyles({ fontSize: sz })}>{sz}px</button>
          ))}
        </div>
      </div>

      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Line Height</div>
      <div className="mb-4">
        <div className="d-flex justify-content-between mb-1">
          <span className="text-muted small">1.2 — Tight</span>
          <span className="badge bg-primary">{currentLH.toFixed(1)}</span>
          <span className="text-muted small">2.0 — Loose</span>
        </div>
        <input type="range" className="form-range" min={1.2} max={2.0} step={0.1} value={currentLH}
          onChange={e => updateCustomStyles({ lineHeight: parseFloat(e.target.value).toFixed(1) })} />
        <div className="d-flex gap-2 mt-2">
          {[1.2, 1.4, 1.5, 1.6, 1.8, 2.0].map(lh => (
            <button key={lh} className={`btn btn-sm ${Math.abs(currentLH - lh) < 0.05 ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{ fontSize: 10, padding: '2px 8px' }}
              onClick={() => updateCustomStyles({ lineHeight: lh.toFixed(1) })}>{lh.toFixed(1)}</button>
          ))}
        </div>
      </div>

      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Live Preview</div>
      <div className="border rounded p-4" style={{ fontFamily: currentFont ? `"${currentFont}", sans-serif` : undefined, fontSize: `${currentSize}px`, lineHeight: currentLH }}>
        <h4 style={{ fontFamily: 'inherit', fontSize: `${Math.round(currentSize * 1.5)}px`, marginBottom: '0.5em' }}>The Quick Brown Fox Jumps Over</h4>
        <p style={{ marginBottom: '0.75em' }}>This paragraph shows how your selected font, size and line-height affect the readability of the admin dashboard. Good typography makes interfaces feel polished and professional.</p>
        <p className="text-muted mb-0" style={{ fontSize: `${currentSize - 1}px` }}>Supporting text • Metadata • Secondary information • Labels</p>
      </div>
    </div>
  );
};

// ─── Shape & Depth Tab ────────────────────────────────────────────────────────

const ShapeTab = () => {
  const { customStyles, updateCustomStyles } = useLayoutContext();
  const currentRadius = customStyles?.borderRadius != null ? parseFloat(customStyles.borderRadius) : 0.3;
  const currentShadow = customStyles?.boxShadow || 'default';

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h5 className="fw-bold mb-1">Shape &amp; Depth</h5>
          <p className="text-muted small mb-0">Control border radius, shadows and visual elevation across all components.</p>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={() => updateCustomStyles({ borderRadius: null, boxShadow: null })}>Reset Shape</Button>
      </div>

      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Border Radius</div>
      <div className="mb-2">
        <div className="d-flex justify-content-between mb-1">
          <span className="text-muted small">0 — Sharp corners</span>
          <span className="badge bg-primary">{currentRadius.toFixed(2)}rem</span>
          <span className="text-muted small">1.5rem — Pill</span>
        </div>
        <input type="range" className="form-range" min={0} max={1.5} step={0.05} value={currentRadius}
          onChange={e => updateCustomStyles({ borderRadius: parseFloat(e.target.value) })} />
      </div>
      <div className="d-flex gap-2 flex-wrap mb-4">
        {RADIUS_PRESETS.map(({ label, value }) => (
          <button key={label}
            className={`btn btn-sm ${Math.abs(currentRadius - value) < 0.01 ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ fontSize: 11, borderRadius: `${value}rem` }}
            onClick={() => updateCustomStyles({ borderRadius: value })}>{label}</button>
        ))}
      </div>

      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Box Shadow / Elevation</div>
      <Row className="g-2 mb-4">
        {SHADOW_OPTIONS.map(({ key, label, desc }) => (
          <Col xs={6} sm={4} md={3} xl={2} key={key}>
            <div onClick={() => updateCustomStyles({ boxShadow: key })}
              className={`border rounded p-2 text-center ${currentShadow === key ? 'border-primary bg-primary bg-opacity-10' : ''}`}
              style={{ cursor: 'pointer' }}>
              <div className="rounded mx-auto mb-2" style={{ width: 36, height: 36, background: 'white', boxShadow: SHADOW_VALUES[key], border: '1px solid #e7e9eb' }} />
              <div className="fw-semibold" style={{ fontSize: 11 }}>{label}</div>
              <div className="text-muted" style={{ fontSize: 10 }}>{desc}</div>
            </div>
          </Col>
        ))}
      </Row>

      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Live Preview</div>
      <Row className="g-3">
        <Col md={4}>
          <div className="bg-white border p-3" style={{ borderRadius: `${currentRadius}rem`, boxShadow: SHADOW_VALUES[currentShadow] }}>
            <div className="fw-semibold mb-1" style={{ fontSize: 13 }}>Card Component</div>
            <div className="text-muted" style={{ fontSize: 11 }}>Shadow + radius preview</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="d-flex flex-column gap-2">
            <button className="btn btn-primary btn-sm" style={{ borderRadius: `${currentRadius}rem` }}>Primary Action</button>
            <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius: `${currentRadius}rem` }}>Secondary Action</button>
            <span className="badge bg-primary" style={{ borderRadius: `${currentRadius}rem`, alignSelf: 'start', padding: '4px 10px' }}>Badge</span>
          </div>
        </Col>
        <Col md={4}>
          <div>
            <input type="text" className="form-control form-control-sm mb-2" style={{ borderRadius: `${currentRadius}rem` }} placeholder="Text input" readOnly />
            <select className="form-select form-select-sm mb-2" style={{ borderRadius: `${currentRadius}rem` }}><option>Dropdown select</option></select>
            <div className="input-group input-group-sm">
              <span className="input-group-text" style={{ borderRadius: `${currentRadius}rem 0 0 ${currentRadius}rem` }}>@</span>
              <input type="text" className="form-control" placeholder="Input group" style={{ borderRadius: `0 ${currentRadius}rem ${currentRadius}rem 0` }} readOnly />
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

// ─── Spacing Tab ──────────────────────────────────────────────────────────────

const SpacingTab = ({ spacing, setSpacing }) => {
  const handlePreset = (preset) => {
    const sp = { preset: preset.key, multiplier: preset.multiplier };
    setSpacing(sp);
    saveJSON(SPACING_KEY, sp);
    applySpacingToDom(preset.multiplier);
  };

  const handleSlider = (val) => {
    const sp = { preset: 'custom', multiplier: val };
    setSpacing(sp);
    saveJSON(SPACING_KEY, sp);
    applySpacingToDom(val);
  };

  const m = spacing.multiplier;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h5 className="fw-bold mb-1">Spacing Scale</h5>
          <p className="text-muted small mb-0">Controls padding and gaps across cards, tables, forms and the topbar. Applies instantly.</p>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={() => handlePreset(SPACING_PRESETS[2])}>Reset Spacing</Button>
      </div>

      <Row className="g-2 mb-4">
        {SPACING_PRESETS.map(preset => (
          <Col key={preset.key} style={{ flex: '1 1 130px' }}>
            <div onClick={() => handlePreset(preset)}
              className={`border rounded p-3 text-center h-100 ${spacing.preset === preset.key ? 'border-primary bg-primary bg-opacity-10' : ''}`}
              style={{ cursor: 'pointer', transition: 'all 0.15s' }}>
              <div className="fw-semibold" style={{ fontSize: 13 }}>{preset.label}</div>
              <div className="text-muted" style={{ fontSize: 10 }}>{preset.desc}</div>
              <div className="badge bg-secondary mt-1" style={{ fontSize: 9 }}>{preset.multiplier}×</div>
            </div>
          </Col>
        ))}
      </Row>

      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Fine-tune Multiplier</div>
      <div className="mb-4">
        <div className="d-flex justify-content-between mb-1">
          <span className="text-muted small">0.5× Micro</span>
          <span className="badge bg-primary">{m.toFixed(2)}×</span>
          <span className="text-muted small">2.0× Macro</span>
        </div>
        <input type="range" className="form-range" min={0.5} max={2.0} step={0.05} value={m}
          onChange={e => handleSlider(parseFloat(e.target.value))} />
      </div>

      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Live Preview</div>
      <Row className="g-3">
        <Col md={4}>
          <div className="border rounded bg-white" style={{ padding: `${m}rem` }}>
            <div className="fw-semibold mb-1" style={{ fontSize: 13 }}>Card Body</div>
            <div className="text-muted" style={{ fontSize: 11, marginBottom: `${m * 0.5}rem` }}>Padding = {m.toFixed(2)}rem</div>
            <button className="btn btn-primary btn-sm" style={{ padding: `${0.25 * m}rem ${0.75 * m}rem` }}>Action</button>
          </div>
        </Col>
        <Col md={4}>
          <div className="border rounded overflow-hidden">
            {['Row One', 'Row Two', 'Row Three'].map((row, i) => (
              <div key={i} className={i < 2 ? 'border-bottom' : ''} style={{ padding: `${0.5 * m}rem ${0.75 * m}rem`, fontSize: 12 }}>
                <span className="badge bg-primary me-2" style={{ fontSize: 9 }}>#{i + 1}</span>{row}
              </div>
            ))}
          </div>
        </Col>
        <Col md={4}>
          <div className="d-flex flex-column" style={{ gap: `${m * 0.5}rem` }}>
            <input type="text" className="form-control form-control-sm" placeholder="Input field" readOnly
              style={{ padding: `${0.25 * m}rem ${0.5 * m}rem` }} />
            <button className="btn btn-outline-primary btn-sm" style={{ padding: `${0.375 * m}rem ${0.75 * m}rem` }}>
              Button — {m.toFixed(2)}× spacing
            </button>
            <div className="d-flex" style={{ gap: `${m * 0.25}rem` }}>
              <span className="badge bg-primary" style={{ padding: `${0.25 * m}rem ${0.5 * m}rem`, fontSize: 10 }}>Tag A</span>
              <span className="badge bg-secondary" style={{ padding: `${0.25 * m}rem ${0.5 * m}rem`, fontSize: 10 }}>Tag B</span>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

// ─── Animations Tab ───────────────────────────────────────────────────────────

const HoverCard = ({ animStyle }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="border rounded p-3 bg-white" style={{ ...animStyle, transform: hovered ? 'translateY(-3px)' : 'none', boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="fw-semibold" style={{ fontSize: 13 }}>Hover me</div>
      <div className="text-muted" style={{ fontSize: 11 }}>Card lifts on hover</div>
    </div>
  );
};

const AnimationsTab = ({ anim, setAnim }) => {
  const handleUpdate = (patch) => {
    const next = { ...anim, ...patch };
    setAnim(next);
    saveJSON(ANIM_KEY, next);
    applyAnimationToDom(next);
  };

  const ms = ANIM_SPEEDS.find(s => s.key === anim.speed)?.ms ?? 200;
  const animStyle = ms > 0 ? { transition: `all ${ms}ms ${anim.easing}` } : {};

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h5 className="fw-bold mb-1">Animations &amp; Transitions</h5>
          <p className="text-muted small mb-0">Control transition speed and easing for all interactive components.</p>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={() => handleUpdate({ speed: 'normal', easing: 'ease-in-out' })}>Reset</Button>
      </div>

      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Transition Speed</div>
      <Row className="g-2 mb-4">
        {ANIM_SPEEDS.map(sp => (
          <Col xs={6} sm={3} key={sp.key}>
            <div onClick={() => handleUpdate({ speed: sp.key })}
              className={`border rounded p-3 text-center ${anim.speed === sp.key ? 'border-primary bg-primary bg-opacity-10' : ''}`}
              style={{ cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{sp.icon}</div>
              <div className="fw-semibold" style={{ fontSize: 12 }}>{sp.label}</div>
              <div className="text-muted" style={{ fontSize: 10 }}>{sp.ms === 0 ? 'No animation' : `${sp.ms}ms`}</div>
            </div>
          </Col>
        ))}
      </Row>

      {anim.speed !== 'off' && (
        <>
          <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Easing Curve</div>
          <div className="d-flex gap-2 flex-wrap mb-4">
            {ANIM_EASINGS.map(e => (
              <button key={e.key} className={`btn btn-sm ${anim.easing === e.key ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => handleUpdate({ easing: e.key })}>
                {e.label} <span className="text-muted" style={{ fontSize: 9 }}>({e.key})</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Hover Preview</div>
      <Row className="g-3 mb-4">
        <Col md={4}><HoverCard animStyle={animStyle} /></Col>
        <Col md={4}>
          <div className="d-flex flex-column gap-2">
            {[['Primary', 'btn-primary'], ['Success', 'btn-success'], ['Danger', 'btn-danger']].map(([label, cls]) => (
              <button key={label} className={`btn ${cls} btn-sm`} style={animStyle}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; }}>{label} Button</button>
            ))}
          </div>
        </Col>
        <Col md={4}>
          <div className="d-flex flex-wrap gap-2">
            {[['Active', 'bg-primary'], ['Pending', 'bg-warning'], ['Done', 'bg-success'], ['Error', 'bg-danger']].map(([tag, bg]) => (
              <span key={tag} className={`badge ${bg}`} style={{ ...animStyle, fontSize: 11, padding: '5px 10px', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; }}>{tag}</span>
            ))}
          </div>
        </Col>
      </Row>

      <div className="p-3 rounded bg-light border font-monospace" style={{ fontSize: 11 }}>
        <div className="text-uppercase fw-bold text-muted mb-1" style={{ fontSize: 9, letterSpacing: 1.2 }}>Applied CSS Variables</div>
        {ms === 0
          ? <div>--bs-transition-base: <span className="text-danger">none</span></div>
          : <>
              <div>--bs-transition-base: all {ms}ms {anim.easing}</div>
              <div>--theme-transition-speed: {ms}ms</div>
            </>
        }
      </div>
    </div>
  );
};

// ─── Custom CSS Tab ───────────────────────────────────────────────────────────

const CustomCSSTab = ({ css, setCss }) => {
  const timerRef = useRef(null);

  const handleChange = (val) => {
    setCss(val);
    localStorage.setItem(CSS_KEY, val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => applyCustomCSSToDOM(val), 300);
  };

  const insertSnippet = (code) => handleChange(css ? `${css}\n\n${code}` : code);
  const lineCount = css ? css.split('\n').length : 0;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h5 className="fw-bold mb-1">Custom CSS</h5>
          <p className="text-muted small mb-0">Inject raw CSS — applied instantly with 300ms debounce. Stored in browser localStorage.</p>
        </div>
        {css && <Button variant="outline-danger" size="sm" onClick={() => { handleChange(''); applyCustomCSSToDOM(''); }}>Clear CSS</Button>}
      </div>

      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Quick Snippets</div>
      <div className="d-flex flex-wrap gap-2 mb-3">
        {CSS_SNIPPETS.map((snippet, i) => (
          <button key={i} className="btn btn-outline-secondary btn-sm" style={{ fontSize: 11 }}
            onClick={() => insertSnippet(snippet.code)}>
            <i className="ri-add-line me-1" />{snippet.label}
          </button>
        ))}
      </div>

      <div className="position-relative mb-2">
        <textarea className="form-control font-monospace"
          style={{ minHeight: 300, fontSize: 12, lineHeight: 1.6, resize: 'vertical' }}
          value={css}
          onChange={e => handleChange(e.target.value)}
          placeholder={`/* Write your custom CSS here */\n/* Changes apply automatically with 300ms debounce */\n\n.my-class {\n  color: var(--bs-primary);\n}`}
          spellCheck={false} />
        <div className="position-absolute bottom-0 end-0 p-2 text-muted" style={{ fontSize: 10, pointerEvents: 'none' }}>
          {lineCount} lines · {css.length} chars
        </div>
      </div>

      {css && (
        <div className="alert alert-info py-2 px-3 d-flex align-items-center gap-2 mb-0" style={{ fontSize: 12 }}>
          <i className="ri-information-line" />
          <span>Custom CSS active — {lineCount} lines applied</span>
          <button className="btn btn-sm btn-outline-info ms-auto" style={{ fontSize: 10 }} onClick={() => applyCustomCSSToDOM(css)}>Force Apply</button>
        </div>
      )}
    </div>
  );
};

// ─── Sites Tab ────────────────────────────────────────────────────────────────

const SvgCode    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
const SvgEdit    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const SvgTrash   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const SvgEye     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const SvgEyeOff  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const SvgRefresh = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const SvgTokens  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>;

// ─── Token category metadata ───────────────────────────────────────────────────
const TOKEN_COLOR_DEFS = [
  { name: 'color.primary',   label: 'Primary',   desc: 'Main brand color' },
  { name: 'color.secondary', label: 'Secondary', desc: 'Supporting color' },
  { name: 'color.success',   label: 'Success',   desc: 'Positive states' },
  { name: 'color.danger',    label: 'Danger',    desc: 'Error / destructive' },
  { name: 'color.warning',   label: 'Warning',   desc: 'Caution / alerts' },
  { name: 'color.info',      label: 'Info',      desc: 'Informational' },
];

const TOKEN_RADIUS_DEFS = [
  { name: 'radius.sm', label: 'Small',  hint: '0.2rem' },
  { name: 'radius.md', label: 'Medium', hint: '0.375rem' },
  { name: 'radius.lg', label: 'Large',  hint: '0.5rem' },
];

// ─── Site Token Editor ─────────────────────────────────────────────────────────

function callDS(path, opts = {}) {
  const xsrf = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
  return fetch('/api/admin/design-system' + path, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrf },
    credentials: 'include',
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  }).then(r => r.status === 204 ? null : r.json());
}

const SiteTokenEditor = ({ site, onClose }) => {
  const [tokens, setTokens]     = useState([]);  // raw token objects from API
  const [vals, setVals]         = useState({});   // { tokenName: value } — live edits
  const [saving, setSaving]     = useState(null); // tokenName being saved
  const [saved, setSaved]       = useState(null); // tokenName just saved (flash)
  const [loading, setLoading]   = useState(true);
  const saveTimers              = useRef({});

  // Load tokens for site's theme
  useEffect(() => {
    if (!site) return;
    setLoading(true);
    // resolve theme: site.theme_id OR default
    const themeId = site.theme_id;
    const url = themeId
      ? `/api/admin/design-system/tokens?theme_id=${themeId}`
      : '/api/admin/design-system/tokens';
    callDS(themeId ? `/tokens?theme_id=${themeId}` : '/tokens')
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setTokens(list);
        const map = {};
        list.forEach(t => { map[t.name] = t.value; });
        setVals(map);
      })
      .finally(() => setLoading(false));
  }, [site]);

  // Build live preview CSS
  const previewCss = useCallback(() => {
    const lines = [':root {'];
    TOKEN_COLOR_DEFS.forEach(({ name }) => {
      const v = vals[name]; if (!v) return;
      const cssProp = `--preview-${name.replace('.', '-')}`;
      lines.push(`  ${cssProp}: ${v};`);
      // Also map to BS vars for preview buttons
      if (name.startsWith('color.')) {
        const key = name.split('.')[1];
        lines.push(`  --bs-preview-${key}: ${v};`);
      }
    });
    TOKEN_RADIUS_DEFS.forEach(({ name }) => {
      const v = vals[name]; if (!v) return;
      if (name === 'radius.md') lines.push(`  --preview-radius: ${v};`);
    });
    lines.push('}');
    return lines.join('\n');
  }, [vals]);

  // Save a single token with debounce
  const handleChange = useCallback((tokenName, newValue) => {
    setVals(prev => ({ ...prev, [tokenName]: newValue }));
    clearTimeout(saveTimers.current[tokenName]);
    saveTimers.current[tokenName] = setTimeout(async () => {
      const token = tokens.find(t => t.name === tokenName);
      if (!token) return;
      setSaving(tokenName);
      try {
        await callDS(`/tokens/${token.id}`, { method: 'PUT', body: { value: newValue } });
        // fetch updated map and broadcast
        const themeId = site.theme_id;
        const list = await callDS(themeId ? `/tokens?theme_id=${themeId}` : '/tokens');
        const map = {};
        (Array.isArray(list) ? list : (list?.data ?? [])).forEach(t => { map[t.name] = t.value; });
        const { broadcastTokenChange } = await import('@admin/utils/designSystemSync');
        broadcastTokenChange(map);
        setSaved(tokenName);
        setTimeout(() => setSaved(null), 1500);
      } finally {
        setSaving(null);
      }
    }, 600);
  }, [tokens, site]);

  // Live preview: inject into a scoped preview element via CSS vars
  const previewStyle = (colorName) => {
    const v = vals[`color.${colorName}`];
    return v ? { backgroundColor: v, borderColor: v } : {};
  };
  const outlineStyle = (colorName) => {
    const v = vals[`color.${colorName}`];
    return v ? { color: v, borderColor: v } : {};
  };
  const radiusVal = vals['radius.md'] || '0.375rem';

  if (!site) return null;

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header border-bottom py-3">
            <div>
              <h5 className="modal-title fw-bold mb-0">
                Token Editor — {site.name}
              </h5>
              <div className="text-muted small mt-1">
                Theme: <strong>{site.theme?.name || 'Default'}</strong>
                <span className="ms-3 text-success">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="5"/></svg>
                  {' '}Changes auto-save · API updates instantly
                </span>
              </div>
            </div>
            <button className="btn-close" onClick={onClose} />
          </div>

          {loading ? (
            <div className="modal-body text-center py-5">
              <div className="spinner-border text-primary" />
              <div className="text-muted mt-2 small">Loading tokens…</div>
            </div>
          ) : (
            <div className="modal-body p-0">
              <div className="row g-0" style={{ minHeight: 500 }}>

                {/* LEFT: Token editors */}
                <div className="col-lg-7 border-end p-4" style={{ overflowY: 'auto', maxHeight: '70vh' }}>

                  {/* Color tokens */}
                  <div className="mb-2 text-uppercase fw-bold text-muted" style={{ fontSize: 10, letterSpacing: 1.2 }}>Color Tokens</div>
                  <div className="row g-2 mb-4">
                    {TOKEN_COLOR_DEFS.map(({ name, label, desc }) => {
                      const val = vals[name] || '#cccccc';
                      const isSaving = saving === name;
                      const isSaved  = saved  === name;
                      return (
                        <div key={name} className="col-6">
                          <div className="border rounded p-2">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <div className="rounded border flex-shrink-0"
                                style={{ width: 28, height: 28, backgroundColor: val, transition: 'background .2s' }} />
                              <div className="flex-grow-1 overflow-hidden">
                                <div className="fw-semibold" style={{ fontSize: 12 }}>{label}</div>
                                <div className="text-muted text-truncate" style={{ fontSize: 10 }}>{name}</div>
                              </div>
                              {isSaving && <div className="spinner-border spinner-border-sm text-primary flex-shrink-0" style={{ width: 12, height: 12, borderWidth: 2 }} />}
                              {isSaved  && <span className="text-success flex-shrink-0" style={{ fontSize: 11 }}>✓</span>}
                            </div>
                            <div className="input-group input-group-sm">
                              <input type="color"
                                className="form-control form-control-color border-end-0 flex-shrink-0"
                                style={{ maxWidth: 34, padding: '2px 3px', cursor: 'pointer' }}
                                value={val.startsWith('#') ? val : '#cccccc'}
                                onChange={e => handleChange(name, e.target.value)} />
                              <input type="text"
                                className="form-control font-monospace"
                                style={{ fontSize: 11 }}
                                value={vals[name] || ''}
                                maxLength={7}
                                placeholder="#000000"
                                onChange={e => {
                                  const v = e.target.value;
                                  if (v === '' || /^#[0-9a-fA-F]{0,6}$/.test(v)) {
                                    if (v.length === 7) handleChange(name, v);
                                    else setVals(p => ({ ...p, [name]: v }));
                                  }
                                }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Radius tokens */}
                  <div className="mb-2 text-uppercase fw-bold text-muted" style={{ fontSize: 10, letterSpacing: 1.2 }}>Border Radius</div>
                  <div className="row g-2 mb-4">
                    {TOKEN_RADIUS_DEFS.map(({ name, label, hint }) => {
                      const val = vals[name] || hint;
                      const isSaving = saving === name;
                      const isSaved  = saved  === name;
                      const numVal   = parseFloat(val) || 0.375;
                      return (
                        <div key={name} className="col-4">
                          <div className="border rounded p-2">
                            <div className="d-flex align-items-center justify-content-between mb-1">
                              <span className="fw-semibold" style={{ fontSize: 11 }}>{label}</span>
                              <span className="badge bg-primary" style={{ fontSize: 9 }}>{val || hint}</span>
                              {isSaving && <div className="spinner-border spinner-border-sm text-primary" style={{ width: 10, height: 10, borderWidth: 2 }} />}
                              {isSaved  && <span className="text-success" style={{ fontSize: 10 }}>✓</span>}
                            </div>
                            <input type="range" className="form-range mb-1"
                              min={0} max={2} step={0.05} value={numVal}
                              onChange={e => handleChange(name, `${parseFloat(e.target.value).toFixed(2)}rem`)} />
                            <div className="bg-primary rounded" style={{ height: 24, borderRadius: `${numVal}rem`, opacity: 0.4 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Other tokens (non-color, non-radius) */}
                  {(() => {
                    const others = tokens.filter(t =>
                      !t.name.startsWith('color.') &&
                      !t.name.startsWith('radius.') &&
                      t.category !== 'color' && t.category !== 'radius'
                    );
                    if (!others.length) return null;
                    return (
                      <>
                        <div className="mb-2 text-uppercase fw-bold text-muted" style={{ fontSize: 10, letterSpacing: 1.2 }}>Other Tokens</div>
                        <div className="d-flex flex-column gap-1 mb-4">
                          {others.map(t => {
                            const isSaving = saving === t.name;
                            const isSaved  = saved  === t.name;
                            return (
                              <div key={t.id} className="border rounded px-3 py-2 d-flex align-items-center gap-2">
                                <div className="flex-grow-1">
                                  <span className="fw-semibold font-monospace" style={{ fontSize: 11 }}>{t.name}</span>
                                  <span className="badge bg-secondary-subtle text-secondary ms-1" style={{ fontSize: 9 }}>{t.category}</span>
                                </div>
                                <input type="text" className="form-control form-control-sm font-monospace"
                                  style={{ maxWidth: 140, fontSize: 11 }}
                                  value={vals[t.name] || ''}
                                  onChange={e => handleChange(t.name, e.target.value)} />
                                {isSaving && <div className="spinner-border spinner-border-sm text-primary" style={{ width: 12, height: 12, borderWidth: 2 }} />}
                                {isSaved  && <span className="text-success" style={{ fontSize: 11 }}>✓</span>}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* RIGHT: Live Preview */}
                <div className="col-lg-5 p-4 bg-light" style={{ overflowY: 'auto', maxHeight: '70vh' }}>
                  <div className="mb-3 text-uppercase fw-bold text-muted" style={{ fontSize: 10, letterSpacing: 1.2 }}>Live Preview</div>

                  {/* Buttons */}
                  <div className="mb-3 p-3 bg-white rounded border">
                    <div className="text-muted mb-2" style={{ fontSize: 10 }}>BUTTONS</div>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      {TOKEN_COLOR_DEFS.slice(0, 4).map(({ name, label }) => (
                        <button key={name} className="btn btn-sm text-white fw-semibold"
                          style={{ ...previewStyle(name.split('.')[1]), borderRadius: radiusVal, fontSize: 11 }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {TOKEN_COLOR_DEFS.slice(0, 4).map(({ name, label }) => (
                        <button key={name} className="btn btn-sm"
                          style={{ ...outlineStyle(name.split('.')[1]), borderRadius: radiusVal, fontSize: 11, background: 'transparent', border: '1px solid' }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="mb-3 p-3 bg-white rounded border">
                    <div className="text-muted mb-2" style={{ fontSize: 10 }}>BADGES</div>
                    <div className="d-flex flex-wrap gap-2">
                      {TOKEN_COLOR_DEFS.map(({ name, label }) => {
                        const v = vals[name];
                        return (
                          <span key={name} className="badge"
                            style={{ backgroundColor: v || undefined, borderRadius: radiusVal, fontSize: 10, padding: '4px 10px' }}>
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color swatches */}
                  <div className="mb-3 p-3 bg-white rounded border">
                    <div className="text-muted mb-2" style={{ fontSize: 10 }}>COLOR PALETTE</div>
                    <div className="d-flex gap-1 flex-wrap">
                      {TOKEN_COLOR_DEFS.map(({ name, label }) => {
                        const v = vals[name];
                        return (
                          <div key={name} className="d-flex flex-column align-items-center" style={{ width: 44 }}>
                            <div className="rounded border mb-1" style={{ width: 36, height: 36, backgroundColor: v || '#ccc' }} />
                            <div style={{ fontSize: 9, textAlign: 'center', color: '#666' }}>{label}</div>
                            <div className="font-monospace" style={{ fontSize: 8, color: '#999' }}>{v || '—'}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card sample */}
                  <div className="mb-3 p-3 bg-white rounded border">
                    <div className="text-muted mb-2" style={{ fontSize: 10 }}>CARD SAMPLE</div>
                    <div className="border rounded p-3" style={{ borderRadius: radiusVal }}>
                      <div className="fw-semibold mb-1" style={{ fontSize: 13, color: vals['color.primary'] || undefined }}>Card Title</div>
                      <div className="text-muted mb-2" style={{ fontSize: 12 }}>Supporting body text</div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm text-white"
                          style={{ ...previewStyle('primary'), borderRadius: radiusVal, fontSize: 11 }}>Save</button>
                        <button className="btn btn-sm"
                          style={{ ...outlineStyle('secondary'), borderRadius: radiusVal, fontSize: 11, background: 'transparent', border: '1px solid' }}>Cancel</button>
                      </div>
                    </div>
                  </div>

                  {/* API endpoint */}
                  <div className="p-3 bg-white rounded border">
                    <div className="text-muted mb-2" style={{ fontSize: 10 }}>API ENDPOINTS</div>
                    {[
                      { label: 'JSON', url: site.endpoints?.tokens },
                      { label: 'CSS',  url: site.endpoints?.css },
                    ].map(({ label, url }) => (
                      <div key={label} className="d-flex align-items-center gap-2 mb-1">
                        <span className="badge bg-primary" style={{ fontSize: 9, minWidth: 32 }}>{label}</span>
                        <a href={url} target="_blank" rel="noreferrer"
                          className="text-truncate text-decoration-none text-muted font-monospace"
                          style={{ fontSize: 10 }}>{url}</a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="modal-footer border-top py-2">
            <span className="text-muted small me-auto">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="#0ab39c"><circle cx="5" cy="5" r="5"/></svg>
              {' '}Auto-saves on change · Broadcasts to all connected apps
            </span>
            <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BASE = '/api/admin/design-system/sites';

const SitesTab = () => {
  const [sites, setSites]       = useState([]);
  const [themes, setThemes]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [modal, setModal]       = useState(null);   // null | 'create' | 'edit' | 'snippet'
  const [active, setActive]     = useState(null);   // site being edited / viewed
  const [revealed, setRevealed] = useState({});     // { siteId: plainKey }
  const [editorSite, setEditorSite] = useState(null); // site open in token editor
  const [form, setForm]         = useState({ name: '', slug: '', domain: '', theme_id: '', description: '', is_active: true });
  const [err, setErr]           = useState('');

  const call = useCallback(async (url, opts = {}) => {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'include',
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message || 'Request failed');
    }
    return res.json();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        call(BASE),
        call('/api/admin/design-system/themes'),
      ]);
      setSites(s);
      setThemes(t);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ name: '', slug: '', domain: '', theme_id: '', description: '', is_active: true });
    setErr('');
    setModal('create');
  };

  const openEdit = (site) => {
    setActive(site);
    setForm({ name: site.name, slug: site.slug, domain: site.domain || '', theme_id: site.theme_id || '', description: site.description || '', is_active: site.is_active });
    setErr('');
    setModal('edit');
  };

  const openSnippet = (site) => { setActive(site); setModal('snippet'); };

  const handleSlugify = (name) => {
    if (modal === 'edit') return;
    setForm(f => ({ ...f, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }));
  };

  const handleSubmit = async () => {
    setSaving(true); setErr('');
    try {
      const isEdit = modal === 'edit';
      const site = await call(isEdit ? `${BASE}/${active.id}` : BASE, {
        method: isEdit ? 'PUT' : 'POST',
        body: { ...form, theme_id: form.theme_id || null },
      });
      await load();
      setModal(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (site) => {
    if (!confirm(`Delete site "${site.name}"?`)) return;
    try { await call(`${BASE}/${site.id}`, { method: 'DELETE' }); await load(); } catch {}
  };

  const handleGenKey = async (site) => {
    try {
      const res = await call(`${BASE}/${site.id}/generate-key`, { method: 'POST' });
      setRevealed(r => ({ ...r, [site.id]: res.api_key }));
      await load();
    } catch (e) { alert(e.message); }
  };

  const handleRevealKey = async (site) => {
    if (revealed[site.id]) { setRevealed(r => { const n = {...r}; delete n[site.id]; return n; }); return; }
    try {
      const res = await call(`${BASE}/${site.id}/reveal-key`, { method: 'POST' });
      setRevealed(r => ({ ...r, [site.id]: res.api_key }));
    } catch (e) { alert(e.message); }
  };

  const toggleActive = async (site) => {
    try { await call(`${BASE}/${site.id}`, { method: 'PUT', body: { is_active: !site.is_active } }); await load(); } catch {}
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h5 className="fw-bold mb-1">Connected Sites</h5>
          <p className="text-muted small mb-0">Each site gets its own API key and can be linked to any theme. Fetch tokens via the public API from any app.</p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}><i className="ri-add-line me-1" />Add Site</Button>
      </div>

      {/* How it works */}
      <div className="alert alert-info d-flex gap-2 mb-4 p-3" style={{ fontSize: 13 }}>
        <i className="ri-information-line fs-5 flex-shrink-0 mt-1" />
        <div>
          <strong>How to use:</strong> Create a site, assign a theme, generate an API key. Then fetch tokens from your external app:<br />
          <code className="d-block mt-1 text-dark bg-white px-2 py-1 rounded border" style={{ fontSize: 11 }}>
            GET /api/design-tokens/<em>&#123;slug&#125;</em> &nbsp;|&nbsp; GET /api/design-tokens/<em>&#123;slug&#125;</em>/css &nbsp;|&nbsp; header: X-DS-Key: …
          </code>
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="text-center text-muted py-5 border rounded">
          <i className="ri-global-line fs-1 d-block mb-2 opacity-50" />
          No sites yet. Click <strong>Add Site</strong> to get started.
        </div>
      ) : (
        <div className="row g-3">
          {sites.map(site => (
            <div key={site.id} className="col-12 col-lg-6">
              <div className={`border rounded p-3 h-100 ${!site.is_active ? 'opacity-50' : ''}`}>
                <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                  <div>
                    <div className="fw-semibold d-flex align-items-center gap-2">
                      {site.name}
                      <span className={`badge ${site.is_active ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: 9 }}>
                        {site.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      <code>{site.slug}</code>
                      {site.domain && <span className="ms-2">{site.domain}</span>}
                    </div>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <Button variant="outline-success"   size="sm" title="Edit Tokens"  onClick={() => setEditorSite(site)}><SvgTokens /></Button>
                    <Button variant="outline-secondary" size="sm" title="Code snippet" onClick={() => openSnippet(site)}><SvgCode /></Button>
                    <Button variant="outline-primary"   size="sm" title="Edit site"    onClick={() => openEdit(site)}><SvgEdit /></Button>
                    <Button variant="outline-danger"    size="sm" title="Delete"       onClick={() => handleDelete(site)}><SvgTrash /></Button>
                  </div>
                </div>

                {/* Theme badge */}
                <div className="mb-2" style={{ fontSize: 12 }}>
                  <span className="text-muted me-1">Theme:</span>
                  {site.theme ? <span className="badge bg-primary-subtle text-primary">{site.theme.name}</span>
                    : <span className="badge bg-secondary-subtle text-secondary">Default theme</span>}
                </div>

                {/* API Key row */}
                <div className="d-flex align-items-center gap-1 mt-2">
                  {site.has_api_key ? (
                    <>
                      <code className="flex-grow-1 text-truncate border rounded px-2 py-1 bg-light" style={{ fontSize: 10 }}>
                        {revealed[site.id] || site.masked_api_key}
                      </code>
                      <Button variant="outline-secondary" size="sm" title={revealed[site.id] ? 'Hide key' : 'Reveal key'} onClick={() => handleRevealKey(site)}>
                        {revealed[site.id] ? <SvgEyeOff /> : <SvgEye />}
                      </Button>
                      <Button variant="outline-warning" size="sm" title="Regenerate key" onClick={() => handleGenKey(site)}>
                        <SvgRefresh />
                      </Button>
                    </>
                  ) : (
                    <button className="btn btn-sm btn-outline-secondary w-100 py-1" onClick={() => handleGenKey(site)}>
                      <i className="ri-key-line me-1" />Generate API Key
                    </button>
                  )}
                </div>

                {/* Endpoints */}
                <div className="mt-2 d-flex gap-1 flex-wrap">
                  <a href={site.endpoints.tokens} target="_blank" rel="noreferrer" className="badge bg-secondary-subtle text-secondary text-decoration-none" style={{ fontSize: 9 }}>JSON</a>
                  <a href={site.endpoints.css}    target="_blank" rel="noreferrer" className="badge bg-secondary-subtle text-secondary text-decoration-none" style={{ fontSize: 9 }}>CSS</a>
                  <a href={site.endpoints.theme}  target="_blank" rel="noreferrer" className="badge bg-secondary-subtle text-secondary text-decoration-none" style={{ fontSize: 9 }}>Theme</a>
                  <button className="badge bg-light border text-muted" style={{ fontSize: 9, cursor: 'pointer' }} onClick={() => toggleActive(site)}>
                    {site.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{modal === 'edit' ? 'Edit Site' : 'Add Site'}</h5>
                <button className="btn-close" onClick={() => setModal(null)} />
              </div>
              <div className="modal-body">
                {err && <div className="alert alert-danger py-2 small">{err}</div>}
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Site Name *</label>
                  <input className="form-control form-control-sm" value={form.name}
                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); handleSlugify(e.target.value); }} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Slug * <span className="text-muted fw-normal">(lowercase, hyphens only)</span></label>
                  <input className="form-control form-control-sm font-monospace" value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
                  <div className="text-muted mt-1" style={{ fontSize: 10 }}>/api/design-tokens/<strong>{form.slug || 'my-site'}</strong></div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Domain <span className="text-muted fw-normal">(optional, for auto-detect)</span></label>
                  <input className="form-control form-control-sm" placeholder="e.g. myapp.com" value={form.domain}
                    onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Assign Theme</label>
                  <select className="form-select form-select-sm" value={form.theme_id}
                    onChange={e => setForm(f => ({ ...f, theme_id: e.target.value }))}>
                    <option value="">Default theme</option>
                    {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Description</label>
                  <textarea className="form-control form-control-sm" rows={2} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="site-active" checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <label className="form-check-label small" htmlFor="site-active">Active</label>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
                <Button variant="primary" size="sm" disabled={saving || !form.name || !form.slug} onClick={handleSubmit}>
                  {saving ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Create Site'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Token Editor */}
      {editorSite && <SiteTokenEditor site={editorSite} onClose={() => setEditorSite(null)} />}

      {/* Code Snippet Modal */}
      {modal === 'snippet' && active && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="ri-code-line me-2" />Integration Snippets — {active.name}</h5>
                <button className="btn-close" onClick={() => setModal(null)} />
              </div>
              <div className="modal-body">
                {[
                  { label: 'Fetch token map (JSON) — vanilla JS', code: `fetch('${active.endpoints.tokens}')\n  .then(r => r.json())\n  .then(tokens => console.log(tokens));` },
                  { label: 'Inject CSS variables — vanilla JS', code: `fetch('${active.endpoints.css}')\n  .then(r => r.text())\n  .then(css => {\n    const s = document.createElement('style');\n    s.textContent = css;\n    document.head.appendChild(s);\n  });` },
                  { label: 'With API key header', code: `fetch('${active.endpoints.tokens}', {\n  headers: { 'X-DS-Key': 'ds_your_api_key_here' }\n}).then(r => r.json()).then(console.log);` },
                  { label: 'React hook', code: `import { useEffect, useState } from 'react';\n\nexport function useDesignTokens() {\n  const [tokens, setTokens] = useState({});\n  useEffect(() => {\n    fetch('${active.endpoints.tokens}')\n      .then(r => r.json()).then(setTokens);\n  }, []);\n  return tokens;\n}` },
                  { label: 'Next.js — inject in layout (SSR)', code: `// app/layout.tsx\nconst css = await fetch('${active.endpoints.css}').then(r => r.text());\n\nexport default function RootLayout({ children }) {\n  return (\n    <html>\n      <head><style dangerouslySetInnerHTML={{ __html: css }} /></head>\n      <body>{children}</body>\n    </html>\n  );\n}` },
                ].map(({ label, code }) => (
                  <div key={label} className="mb-3">
                    <div className="fw-semibold small mb-1">{label}</div>
                    <pre className="bg-dark text-white rounded p-3 mb-0" style={{ fontSize: 11, overflowX: 'auto' }}>
                      <code>{code}</code>
                    </pre>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Export / Presets Tab ─────────────────────────────────────────────────────

const ExportTab = ({ spacing, anim, css, onRestore }) => {
  const layoutCtx = useLayoutContext();
  const [savedPresets, setSavedPresets] = useState(() => loadJSON(PRESETS_KEY, []));
  const [presetName, setPresetName]     = useState('');
  const [importText, setImportText]     = useState('');
  const [importError, setImportError]   = useState('');
  const [copied, setCopied]             = useState('');

  const getFullConfig = useCallback(() => ({
    version: 1,
    timestamp: Date.now(),
    layout: {
      skin: layoutCtx.skin, theme: layoutCtx.theme, orientation: layoutCtx.orientation,
      sidenavSize: layoutCtx.sidenavSize, sidenavColor: layoutCtx.sidenavColor,
      sidenavUser: layoutCtx.sidenavUser, topbarColor: layoutCtx.topbarColor,
      width: layoutCtx.width, position: layoutCtx.position, dir: layoutCtx.dir,
      customColors: layoutCtx.customColors, customStyles: layoutCtx.customStyles,
    },
    spacing, animation: anim, customCSS: css,
  }), [layoutCtx, spacing, anim, css]);

  const getCSSExport = useCallback(() => {
    const { customColors: cc, customStyles: cs } = layoutCtx;
    const lines = [':root {'];
    if (cc?.primary)   lines.push(`  --bs-primary: ${cc.primary};`);
    if (cc?.secondary) lines.push(`  --bs-secondary: ${cc.secondary};`);
    if (cc?.success)   lines.push(`  --bs-success: ${cc.success};`);
    if (cc?.danger)    lines.push(`  --bs-danger: ${cc.danger};`);
    if (cc?.warning)   lines.push(`  --bs-warning: ${cc.warning};`);
    if (cc?.info)      lines.push(`  --bs-info: ${cc.info};`);
    if (cc?.bodyBg)    lines.push(`  --bs-body-bg: ${cc.bodyBg};`);
    if (cs?.fontFamily) lines.push(`  --bs-body-font-family: "${cs.fontFamily}", sans-serif;`);
    if (cs?.fontSize)   lines.push(`  --bs-body-font-size: ${cs.fontSize}px;`);
    if (cs?.lineHeight) lines.push(`  --bs-body-line-height: ${cs.lineHeight};`);
    if (cs?.borderRadius != null) {
      const r = parseFloat(cs.borderRadius);
      lines.push(`  --bs-border-radius: ${r}rem;`);
      lines.push(`  --bs-border-radius-sm: ${(r * 0.75).toFixed(3)}rem;`);
      lines.push(`  --bs-border-radius-lg: ${(r * 1.5).toFixed(3)}rem;`);
    }
    lines.push('}');
    if (css) lines.push('\n/* Custom CSS */\n' + css);
    return lines.join('\n');
  }, [layoutCtx, css]);

  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 2000); } catch {}
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    const preset = { id: Date.now(), name: presetName.trim(), timestamp: Date.now(), config: getFullConfig() };
    const next = [preset, ...savedPresets];
    setSavedPresets(next);
    saveJSON(PRESETS_KEY, next);
    setPresetName('');
  };

  const restorePreset = (config) => {
    const { layout, spacing: sp, animation: an, customCSS: cc } = config;
    if (layout) {
      layoutCtx.updateSettings({
        skin: layout.skin, theme: layout.theme, orientation: layout.orientation,
        sidenavSize: layout.sidenavSize, sidenavColor: layout.sidenavColor,
        sidenavUser: layout.sidenavUser, topbarColor: layout.topbarColor,
        width: layout.width, position: layout.position, dir: layout.dir,
      });
      layoutCtx.resetCustomColors();
      if (layout.customColors && Object.keys(layout.customColors).length) layoutCtx.updateCustomColors(layout.customColors);
      layoutCtx.resetCustomStyles();
      if (layout.customStyles && Object.keys(layout.customStyles).length) layoutCtx.updateCustomStyles(layout.customStyles);
    }
    if (sp) { saveJSON(SPACING_KEY, sp); applySpacingToDom(sp.multiplier); onRestore?.({ spacing: sp }); }
    if (an) { saveJSON(ANIM_KEY, an); applyAnimationToDom(an); onRestore?.({ anim: an }); }
    if (cc !== undefined) { localStorage.setItem(CSS_KEY, cc); applyCustomCSSToDOM(cc); onRestore?.({ css: cc }); }
  };

  const deletePreset = (id) => {
    const next = savedPresets.filter(p => p.id !== id);
    setSavedPresets(next);
    saveJSON(PRESETS_KEY, next);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText);
      if (!parsed.version || !parsed.layout) throw new Error('Invalid format — missing version or layout');
      restorePreset(parsed);
      setImportText(''); setImportError('');
    } catch (e) { setImportError(`Import error: ${e.message}`); }
  };

  const cssExport  = getCSSExport();
  const jsonExport = JSON.stringify(getFullConfig(), null, 2);

  return (
    <div>
      <div className="mb-4">
        <h5 className="fw-bold mb-1">Export &amp; Saved Presets</h5>
        <p className="text-muted small mb-0">Save named snapshots of your full design config, export as CSS or JSON, or import a config.</p>
      </div>

      {/* Save preset */}
      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Saved Presets ({savedPresets.length})</div>
      <div className="d-flex gap-2 mb-3">
        <input type="text" className="form-control form-control-sm" placeholder='Preset name — e.g. "Dark Marketing"'
          style={{ maxWidth: 300 }} value={presetName}
          onChange={e => setPresetName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && savePreset()} />
        <Button variant="primary" size="sm" onClick={savePreset} disabled={!presetName.trim()}>
          <i className="ri-save-line me-1" />Save Current
        </Button>
      </div>

      {savedPresets.length === 0 && (
        <div className="text-muted small p-3 border rounded text-center mb-4">No saved presets yet. Configure your design and click Save Current.</div>
      )}
      <div className="d-flex flex-column gap-2 mb-4">
        {savedPresets.map(preset => (
          <div key={preset.id} className="border rounded p-3 d-flex align-items-center gap-3">
            <div className="d-flex gap-1 flex-shrink-0">
              {COLOR_DEFS.map(({ key, def }) => (
                <div key={key} className="rounded" style={{ width: 12, height: 12, backgroundColor: preset.config?.layout?.customColors?.[key] || def, border: '1px solid rgba(0,0,0,0.1)' }} />
              ))}
            </div>
            <div className="flex-grow-1">
              <div className="fw-semibold" style={{ fontSize: 13 }}>{preset.name}</div>
              <div className="text-muted" style={{ fontSize: 10 }}>
                {preset.config?.layout?.skin} · {preset.config?.layout?.theme} · spacing {preset.config?.spacing?.multiplier ?? 1}× · {new Date(preset.timestamp).toLocaleDateString()}
              </div>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-primary" size="sm" style={{ fontSize: 11 }} onClick={() => restorePreset(preset.config)}>
                <i className="ri-download-line me-1" />Restore
              </Button>
              <button className="btn btn-outline-danger btn-sm" style={{ fontSize: 11 }} onClick={() => deletePreset(preset.id)}>
                <i className="ri-delete-bin-line" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <hr className="my-4" />

      {/* CSS Export */}
      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>CSS Variables Export</div>
      <div className="position-relative mb-4">
        <pre className="border rounded p-3 mb-0 bg-light font-monospace" style={{ fontSize: 11, maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
          {cssExport || '/* No custom overrides active */'}
        </pre>
        <button className="btn btn-sm btn-primary position-absolute top-0 end-0 m-2" style={{ fontSize: 10 }} onClick={() => copy(cssExport, 'css')}>
          {copied === 'css' ? <><i className="ri-check-line me-1" />Copied!</> : <><i className="ri-clipboard-line me-1" />Copy CSS</>}
        </button>
      </div>

      {/* JSON Export */}
      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>JSON Export</div>
      <div className="position-relative mb-4">
        <pre className="border rounded p-3 mb-0 bg-light font-monospace" style={{ fontSize: 10, maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
          {jsonExport}
        </pre>
        <button className="btn btn-sm btn-primary position-absolute top-0 end-0 m-2" style={{ fontSize: 10 }} onClick={() => copy(jsonExport, 'json')}>
          {copied === 'json' ? <><i className="ri-check-line me-1" />Copied!</> : <><i className="ri-clipboard-line me-1" />Copy JSON</>}
        </button>
      </div>

      {/* JSON Import */}
      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Import JSON</div>
      <textarea className="form-control font-monospace mb-2" style={{ fontSize: 11, height: 100 }}
        placeholder="Paste exported JSON here and click Apply..."
        value={importText} onChange={e => { setImportText(e.target.value); setImportError(''); }} />
      {importError && <div className="text-danger mb-2" style={{ fontSize: 12 }}>{importError}</div>}
      <Button variant="success" size="sm" onClick={handleImport} disabled={!importText.trim()}>
        <i className="ri-upload-line me-1" />Apply Imported Config
      </Button>
    </div>
  );
};

// ─── Presets Tab ──────────────────────────────────────────────────────────────

const PresetsTab = () => (
  <div>
    <h5 className="fw-bold mb-1">Theme Presets</h5>
    <p className="text-muted small mb-3">Choose one of 25 built-in skins, then fine-tune color scheme, sidebar and topbar styles below.</p>
    <Row className="g-4">
      <Col xl={8}>
        <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Skin</div>
        <Skin />
      </Col>
      <Col xl={4}>
        <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Color Scheme</div>
        <Theme />
        <div className="text-uppercase fw-bold text-muted mb-2 mt-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Topbar Style</div>
        <TopbarColor />
        <div className="text-uppercase fw-bold text-muted mb-2 mt-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Sidebar Color</div>
        <SidenavColor />
      </Col>
    </Row>
    <hr className="my-3" />
    <Row className="g-4">
      <Col md={6} xl={4}>
        <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Sidebar Size</div>
        <SidenavSize />
      </Col>
      <Col md={6} xl={4}>
        <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Orientation &amp; Layout</div>
        <Orientation />
        <Width />
        <Position />
      </Col>
      <Col md={6} xl={4}>
        <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Direction &amp; User Panel</div>
        <Direction />
        <SidenavUser />
      </Col>
    </Row>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const DesignSystemPage = () => {
  const { reset, skin, theme, customColors, customStyles, resetCustomColors, resetCustomStyles } = useLayoutContext();
  const [activeTab, setActiveTab] = useState('presets');

  const [spacing, setSpacing] = useState(() => loadJSON(SPACING_KEY, { preset: 'default', multiplier: 1.0 }));
  const [anim, setAnim]       = useState(() => loadJSON(ANIM_KEY, { speed: 'normal', easing: 'ease-in-out' }));
  const [css, setCss]         = useState(() => { try { return localStorage.getItem(CSS_KEY) || ''; } catch { return ''; } });

  // Apply all persisted non-context settings on mount
  useEffect(() => {
    applySpacingToDom(spacing.multiplier);
    applyAnimationToDom(anim);
    applyCustomCSSToDOM(css);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Callback for ExportTab to sync state after restore
  const handleRestore = useCallback(({ spacing: sp, anim: an, css: cc } = {}) => {
    if (sp) setSpacing(sp);
    if (an) setAnim(an);
    if (cc !== undefined) setCss(cc);
  }, []);

  const colorCount  = Object.keys(customColors || {}).length;
  const styleCount  = Object.keys(customStyles || {}).length;
  const totalCustom = colorCount + styleCount;
  const hasSpacing  = spacing.preset !== 'default';
  const hasAnim     = anim.speed !== 'normal' || anim.easing !== 'ease-in-out';
  const hasCss      = css.length > 0;

  const handleFullReset = () => {
    reset();
    const defSpacing = { preset: 'default', multiplier: 1.0 };
    const defAnim    = { speed: 'normal', easing: 'ease-in-out' };
    setSpacing(defSpacing); setAnim(defAnim); setCss('');
    saveJSON(SPACING_KEY, defSpacing);
    saveJSON(ANIM_KEY, defAnim);
    localStorage.removeItem(CSS_KEY);
    applySpacingToDom(1.0);
    applyAnimationToDom(defAnim);
    applyCustomCSSToDOM('');
  };

  return (
    <>
      <PageBreadcrumb title="Design System" subtitle="Settings" />

      {/* Status bar */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3 p-2 rounded border">
        <i className="ri-palette-line text-primary" />
        <span className="fw-semibold small">Active:</span>
        <span className="badge bg-primary">{skin}</span>
        <span className="badge bg-secondary">{theme}</span>
        {totalCustom > 0 && <span className="badge bg-success">{totalCustom} color/style override{totalCustom !== 1 ? 's' : ''}</span>}
        {hasSpacing && <span className="badge bg-info text-dark">spacing: {spacing.preset}</span>}
        {hasAnim    && <span className="badge bg-warning text-dark">anim: {anim.speed}</span>}
        {hasCss     && <span className="badge bg-dark">custom CSS</span>}
        <span className="ms-auto text-muted small"><i className="ri-database-2-line me-1" />Auto-saved to localStorage + DB · real-time sync across tabs</span>
      </div>

      <Card>
        <Card.Body>
          <Tab.Container activeKey={activeTab} onSelect={k => setActiveTab(k)}>
            <div style={{ overflowX: 'auto' }}>
              <Nav variant="tabs" className="mb-4 flex-nowrap">
                <Nav.Item><Nav.Link eventKey="presets" style={{ whiteSpace: 'nowrap' }}><i className="ri-layout-2-line me-1" />Presets</Nav.Link></Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="colors" style={{ whiteSpace: 'nowrap' }}>
                    <i className="ri-palette-line me-1" />Colors
                    {colorCount > 0 && <span className="badge bg-primary ms-1" style={{ fontSize: 9 }}>{colorCount}</span>}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="typography" style={{ whiteSpace: 'nowrap' }}>
                    <i className="ri-text me-1" />Typography
                    {customStyles?.fontFamily && <span className="badge bg-primary ms-1" style={{ fontSize: 9 }}>!</span>}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="shape" style={{ whiteSpace: 'nowrap' }}>
                    <i className="ri-artboard-line me-1" />Shape &amp; Depth
                    {(customStyles?.borderRadius != null || customStyles?.boxShadow) && <span className="badge bg-primary ms-1" style={{ fontSize: 9 }}>!</span>}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="spacing" style={{ whiteSpace: 'nowrap' }}>
                    <i className="ri-layout-row-line me-1" />Spacing
                    {hasSpacing && <span className="badge bg-info text-dark ms-1" style={{ fontSize: 9 }}>!</span>}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="animations" style={{ whiteSpace: 'nowrap' }}>
                    <i className="ri-speed-line me-1" />Animations
                    {hasAnim && <span className="badge bg-warning text-dark ms-1" style={{ fontSize: 9 }}>!</span>}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="css" style={{ whiteSpace: 'nowrap' }}>
                    <i className="ri-code-line me-1" />Custom CSS
                    {hasCss && <span className="badge bg-dark ms-1" style={{ fontSize: 9 }}>!</span>}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="export" style={{ whiteSpace: 'nowrap' }}>
                    <i className="ri-share-box-line me-1" />Export
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="sites" style={{ whiteSpace: 'nowrap' }}>
                    <i className="ri-global-line me-1" />Sites
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </div>

            <Tab.Content>
              <Tab.Pane eventKey="presets"><PresetsTab /></Tab.Pane>
              <Tab.Pane eventKey="colors"><ColorsTab /></Tab.Pane>
              <Tab.Pane eventKey="typography"><TypographyTab /></Tab.Pane>
              <Tab.Pane eventKey="shape"><ShapeTab /></Tab.Pane>
              <Tab.Pane eventKey="spacing"><SpacingTab spacing={spacing} setSpacing={setSpacing} /></Tab.Pane>
              <Tab.Pane eventKey="animations"><AnimationsTab anim={anim} setAnim={setAnim} /></Tab.Pane>
              <Tab.Pane eventKey="css"><CustomCSSTab css={css} setCss={setCss} /></Tab.Pane>
              <Tab.Pane eventKey="export"><ExportTab spacing={spacing} anim={anim} css={css} onRestore={handleRestore} /></Tab.Pane>
              <Tab.Pane eventKey="sites"><SitesTab /></Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>

        <Card.Footer className="d-flex align-items-center gap-3">
          <Button variant="danger" onClick={handleFullReset}>
            <i className="ri-restart-line me-1" />Reset Everything
          </Button>
          <span className="text-muted small">Clears skin, colors, typography, shape, spacing, animations and custom CSS.</span>
        </Card.Footer>
      </Card>
    </>
  );
};

export default DesignSystemPage;
