import { useState, useEffect, useCallback, useRef } from 'react';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import {
  Button, Card, CardBody, CardHeader, CardTitle,
  Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row
} from 'react-bootstrap';

// ─────────────────────────────────────────────────────────────────────────────
// CSS injection engine
// ─────────────────────────────────────────────────────────────────────────────

const DS_API = '/api/admin/design-system';

function apiCall(path, opts = {}) {
  const xsrf = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
  return fetch(DS_API + path, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrf },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  }).then(r => r.status === 204 ? null : r.json());
}

function hexToRgb(hex) {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? `${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}` : null;
}

const COLOR_NAMES = ['primary','secondary','success','danger','warning','info','light','dark'];

/**
 * Two-pronged injection for maximum priority:
 *
 * 1. document.documentElement.style.setProperty()
 *    Sets CSS vars as INLINE styles on <html> — highest possible specificity.
 *    Beats Vite HMR <style> injections, Bootstrap, and theme overrides.
 *
 * 2. <style> tag moved to last position in <head>
 *    Handles per-component rules (.btn-primary { --bs-btn-bg }) that can't
 *    be set via inline style on :root alone.
 */
const PREVIEW_ID = 'ds-preview-scope';

function applyTokenMap(map) {
  const container = document.getElementById(PREVIEW_ID);
  if (!container) return;

  // ── 1. Set CSS vars on the preview container only (not <html>) ───────────
  for (const n of COLOR_NAMES) {
    const v = map[`color.${n}`]; if (!v) continue;
    container.style.setProperty(`--bs-${n}`, v);
    const rgb = hexToRgb(v); if (rgb) container.style.setProperty(`--bs-${n}-rgb`, rgb);
  }
  const setProp = (k, bv) => { if (map[k]) container.style.setProperty(bv, map[k]); };
  setProp('radius.sm',          '--bs-border-radius-sm');
  setProp('radius.md',          '--bs-border-radius');
  setProp('radius.lg',          '--bs-border-radius-lg');
  setProp('radius.full',        '--bs-border-radius-pill');
  setProp('font.btn.md',        '--bs-btn-font-size');
  setProp('font.weight.medium', '--bs-btn-font-weight');

  // ── 2. Scoped <style> tag — all rules prefixed with #ds-preview-scope ─────
  const S = `#${PREVIEW_ID}`;
  const lines = [];
  for (const n of COLOR_NAMES) {
    const v = map[`color.${n}`]; if (!v || !v.startsWith('#')) continue;
    const rgb = hexToRgb(v);
    const softBg  = rgb ? `rgba(${rgb},0.15)` : 'transparent';
    const softHov = rgb ? `rgba(${rgb},0.25)` : 'transparent';
    // Solid
    lines.push(`${S} .btn-${n}{--bs-btn-bg:${v}!important;--bs-btn-border-color:${v}!important;--bs-btn-hover-bg:${v}!important;--bs-btn-hover-border-color:${v}!important;--bs-btn-active-bg:${v}!important;background-color:${v}!important;border-color:${v}!important}`);
    // Outline
    lines.push(`${S} .btn-outline-${n}{--bs-btn-color:${v}!important;--bs-btn-border-color:${v}!important;--bs-btn-hover-bg:${v}!important;color:${v}!important;border-color:${v}!important}`);
    // Soft — light tinted bg + colored text
    lines.push(`${S} .btn-soft-${n}{color:${v}!important;background-color:${softBg}!important;border-color:transparent!important}${S} .btn-soft-${n}:hover{background-color:${softHov}!important}`);
    // Ghost — transparent bg, colored text
    lines.push(`${S} .btn-ghost-${n}{color:${v}!important;background-color:transparent!important;border-color:transparent!important}${S} .btn-ghost-${n}:hover{background-color:${softBg}!important}`);
  }

  let el = document.getElementById('ds-btn-tokens');
  if (!el) { el = document.createElement('style'); el.id = 'ds-btn-tokens'; }
  document.head.appendChild(el); // always last in <head>
  el.textContent = lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// useDesignTokens
// ─────────────────────────────────────────────────────────────────────────────

function useDesignTokens() {
  const [tokens,  setTokens]  = useState([]);
  const [saving,  setSaving]  = useState(null);
  const mapRef  = useRef({});
  const timers  = useRef({});

  useEffect(() => {
    apiCall('/themes').then(themes => {
      const theme = themes?.find(t => t.is_default) ?? themes?.[0];
      if (!theme) return;
      apiCall(`/tokens?theme_id=${theme.id}`).then(rows => {
        const map = {};
        (rows ?? []).forEach(t => { map[t.name] = t.value; });
        mapRef.current = map;
        setTokens(rows ?? []);
        applyTokenMap(map);
      });
    });
  }, []);

  const updateToken = useCallback((id, newValue) => {
    const row = tokens.find(t => t.id === id);
    if (row) {
      mapRef.current = { ...mapRef.current, [row.name]: newValue };
      applyTokenMap(mapRef.current); // synchronous — instant
    }
    setTokens(prev => prev.map(t => t.id === id ? { ...t, value: newValue } : t));
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => {
      setSaving(id);
      apiCall(`/tokens/${id}`, { method: 'PUT', body: { value: newValue } }).finally(() => setSaving(null));
    }, 600);
  }, [tokens]);

  return { tokens, updateToken, saving };
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Editor Sidebar
// ─────────────────────────────────────────────────────────────────────────────

const CAT_ORDER  = ['color','radius','font','spacing','shadow','opacity','border'];
const CAT_LABELS = { color:'Colors', radius:'Radius', font:'Typography', spacing:'Spacing', shadow:'Shadows', opacity:'Opacity', border:'Border' };

function TokenSidebar({ tokens, saving, onUpdate }) {
  const [search,  setSearch]  = useState('');
  const [cat,     setCat]     = useState('all');

  const available = ['all', ...CAT_ORDER.filter(c => tokens.some(t => t.category === c))];
  const filtered  = tokens.filter(t =>
    (cat === 'all' || t.category === cat) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()))
  );
  const grouped = filtered.reduce((acc, t) => { (acc[t.category] ??= []).push(t); return acc; }, {});

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

      {/* Sidebar header */}
      <div style={{ padding:'16px 16px 10px', borderBottom:'1px solid #e5e7eb', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ fontWeight:700, fontSize:13, color:'#111827' }}>Design Tokens</span>
          <span style={{ fontSize:11, color:'#9ca3af' }}>{tokens.length} total</span>
        </div>
        <input
          placeholder="Search tokens…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width:'100%', padding:'6px 10px', border:'1px solid #d1d5db', borderRadius:6, fontSize:12, marginBottom:8 }}
        />
        <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
          {available.map(c => (
            <button key={c} onClick={() => setCat(c)}
              style={{ padding:'2px 8px', borderRadius:4, border:'none', cursor:'pointer', fontSize:11,
                background: cat===c ? '#3b82f6' : '#f3f4f6',
                color: cat===c ? '#fff' : '#374151', fontWeight: cat===c ? 700 : 400 }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Token list */}
      <div style={{ overflowY:'auto', flex:1, padding:'8px 12px' }}>
        {Object.entries(grouped).map(([category, rows]) => (
          <div key={category} style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#9ca3af', margin:'8px 0 6px' }}>
              {CAT_LABELS[category] ?? category}
            </div>
            {rows.map(t => <TokenItem key={t.id} token={t} onUpdate={onUpdate} isSaving={saving === t.id} />)}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign:'center', color:'#9ca3af', fontSize:12, padding:24 }}>No tokens found.</div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:'10px 16px', borderTop:'1px solid #e5e7eb', flexShrink:0 }}>
        <Link to="/apps/design-system-manager" className="btn btn-sm btn-outline-primary w-100">
          Full Design System Manager →
        </Link>
      </div>
    </div>
  );
}

function TokenItem({ token, onUpdate, isSaving }) {
  const [draft,   setDraft]   = useState(token.value);
  const [editing, setEditing] = useState(false);
  const isColor = token.category === 'color' && /^#[0-9a-f]{3,6}$/i.test(token.value);

  useEffect(() => { setDraft(token.value); }, [token.value]);

  const handleColor = hex => { setDraft(hex); onUpdate(token.id, hex); };
  const commit = () => { setEditing(false); if (draft !== token.value) onUpdate(token.id, draft); };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', borderBottom:'1px solid #f3f4f6' }}>
      {/* Swatch */}
      {isColor ? (
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:24, height:24, borderRadius:4, background:draft, border:'2px solid rgba(0,0,0,0.12)', boxShadow:'0 1px 2px rgba(0,0,0,0.08)' }} />
          <input type="color" value={draft.length===7 ? draft : '#000000'} onChange={e => handleColor(e.target.value)}
            style={{ position:'absolute', inset:0, opacity:0, width:'100%', height:'100%', cursor:'pointer', border:'none', padding:0 }} />
        </div>
      ) : (
        <div style={{ width:24, height:24, flexShrink:0, background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:4,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#9ca3af', fontFamily:'monospace' }}>ab</div>
      )}

      {/* Name */}
      <code style={{ fontSize:11, color:'#374151', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {token.name}
      </code>

      {/* Value / inline edit */}
      {editing ? (
        <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key==='Enter') commit(); if (e.key==='Escape') { setDraft(token.value); setEditing(false); } }}
          style={{ width:90, fontSize:11, fontFamily:'monospace', padding:'2px 5px', border:'1px solid #3b82f6', borderRadius:3, outline:'none' }} />
      ) : (
        <span onClick={() => setEditing(true)} title="Click to edit"
          style={{ fontSize:11, fontFamily:'monospace', color:'#6b7280', cursor:'text', minWidth:60, textAlign:'right', flexShrink:0 }}>
          {draft}
        </span>
      )}

      {isSaving && (
        <span style={{ width:8, height:8, borderRadius:'50%', border:'2px solid #3b82f6', borderTopColor:'transparent',
          display:'inline-block', animation:'ds-spin .6s linear infinite', flexShrink:0 }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page — split layout: sidebar left, button sections right
// ─────────────────────────────────────────────────────────────────────────────

const Page = () => {
  const { tokens, updateToken, saving } = useDesignTokens();

  return (
    <>
      <style>{`@keyframes ds-spin { to { transform:rotate(360deg); } }`}</style>
      <PageBreadcrumb title="Buttons" subtitle="UI" />

      <div style={{ display:'flex', gap:0, height:'calc(100vh - 130px)', minHeight:600, background:'#f8fafc', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>

        {/* ── LEFT: Token Editor Sidebar ── */}
        <div style={{ width:300, flexShrink:0, background:'#fff', borderRight:'1px solid #e5e7eb', display:'flex', flexDirection:'column' }}>
          {tokens.length === 0 ? (
            <div style={{ padding:24, textAlign:'center', color:'#9ca3af', fontSize:12 }}>Loading tokens…</div>
          ) : (
            <TokenSidebar tokens={tokens} saving={saving} onUpdate={updateToken} />
          )}
        </div>

        {/* ── RIGHT: Live Button Preview ── */}
        <div id="ds-preview-scope" style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          <Row>
            <Col xl={6}><DefultButton /></Col>
            <Col xl={6}><ButtonRounded /></Col>
            <Col xl={6}><ButtonOutline /></Col>
            <Col xl={6}><ButtonOutlineRounded /></Col>
            <Col xl={6}><SoftButtons /></Col>
            <Col xl={6}><SoftRoundedButtons /></Col>
            <Col xl={6}><GhostButtons /></Col>
            <Col xl={6}><GhostRoundedButtons /></Col>
            <Col xl={6}><GradientButtons /></Col>
            <Col xl={6}><GradientRoundedButtons /></Col>
            <Col xl={6}><ButtonSizes /></Col>
            <Col xl={6}><DisabledButtons /></Col>
            <Col xl={6}><BlockButtons /></Col>
            <Col xl={6}><ToggleButtons /></Col>
            <Col xl={6}><IconButtons /><ButtonTags /></Col>
            <Col xl={6}><ButtonGroup /></Col>
          </Row>
        </div>

      </div>
    </>
  );
};
export default Page;

// ─────────────────────────────────────────────────────────────────────────────
// Button sections — all unchanged
// ─────────────────────────────────────────────────────────────────────────────

const DefultButton = () => <Card>
  <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Default Buttons</CardTitle></div></CardHeader>
  <CardBody>
    <p className="text-muted">Use any of the available <code>&lt;a&gt;</code>, <code>&lt;button&gt;</code>, or <code>&lt;input&gt;</code> classes <code>.btn</code> to quickly create a styled button.</p>
    <div className="d-flex flex-wrap gap-2">
      <Button variant="default">Default</Button>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="success">Success</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="info">Info</Button>
      <Button variant="light">Light</Button>
      <Button variant="dark">Dark</Button>
    </div>
  </CardBody>
</Card>;

const ButtonRounded = () => <Card>
  <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Button Rounded</CardTitle></div></CardHeader>
  <CardBody>
    <p className="text-muted">Use <code>.rounded-pill</code> with a default button to give it pill-shaped rounded corners.</p>
    <div className="d-flex flex-wrap gap-2">
      <Button variant="default" className="rounded-pill">Default</Button>
      <Button variant="primary" className="rounded-pill">Primary</Button>
      <Button variant="secondary" className="rounded-pill">Secondary</Button>
      <Button variant="success" className="rounded-pill">Success</Button>
      <Button variant="danger" className="rounded-pill">Danger</Button>
      <Button variant="warning" className="rounded-pill">Warning</Button>
      <Button variant="info" className="rounded-pill">Info</Button>
      <Button variant="light" className="rounded-pill">Light</Button>
      <Button variant="dark" className="rounded-pill">Dark</Button>
    </div>
  </CardBody>
</Card>;

const ButtonOutline = () => <Card>
  <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Button Outline</CardTitle></div></CardHeader>
  <CardBody>
    <p className="text-muted">Use the <code>.btn-outline-**</code> classes to quickly create buttons with borders.</p>
    <div className="d-flex flex-wrap gap-2">
      <Button variant="outline-primary">Primary</Button>
      <Button variant="outline-secondary">Secondary</Button>
      <Button variant="outline-success">Success</Button>
      <Button variant="outline-danger">Danger</Button>
      <Button variant="outline-warning">Warning</Button>
      <Button variant="outline-info">Info</Button>
      <Button variant="outline-light">Light</Button>
      <Button variant="outline-dark">Dark</Button>
    </div>
  </CardBody>
</Card>;

const ButtonOutlineRounded = () => <Card>
  <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Button Outline Rounded</CardTitle></div></CardHeader>
  <CardBody>
    <p className="text-muted">Use <code>.rounded-pill</code> with an outline button to give it pill-shaped rounded corners.</p>
    <div className="d-flex flex-wrap gap-2">
      <Button variant="outline-primary" className="rounded-pill">Primary</Button>
      <Button variant="outline-secondary" className="rounded-pill">Secondary</Button>
      <Button variant="outline-success" className="rounded-pill">Success</Button>
      <Button variant="outline-danger" className="rounded-pill">Danger</Button>
      <Button variant="outline-warning" className="rounded-pill">Warning</Button>
      <Button variant="outline-info" className="rounded-pill">Info</Button>
      <Button variant="outline-light" className="rounded-pill">Light</Button>
      <Button variant="outline-dark" className="rounded-pill">Dark</Button>
    </div>
  </CardBody>
</Card>;

const SoftButtons = () => <Card>
  <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Soft Buttons</CardTitle></div></CardHeader>
  <CardBody>
    <p className="text-muted">Use <code>btn-soft-**</code> class with the below-mentioned variation to create a button with the soft background.</p>
    <div className="d-flex flex-wrap gap-2">
      <Button className="btn-soft-primary">Primary</Button>
      <Button className="btn-soft-secondary">Secondary</Button>
      <Button className="btn-soft-success">Success</Button>
      <Button className="btn-soft-danger">Danger</Button>
      <Button className="btn-soft-warning">Warning</Button>
      <Button className="btn-soft-info">Info</Button>
      <Button className="btn-soft-dark">Dark</Button>
    </div>
  </CardBody>
</Card>;

const SoftRoundedButtons = () => <Card>
  <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Soft Rounded Buttons</CardTitle></div></CardHeader>
  <CardBody>
    <p className="text-muted">Use the <code>btn-soft-**</code> class along with <code>.rounded-pill</code> to create a softly styled button with rounded corners.</p>
    <div className="d-flex flex-wrap gap-2">
      <Button className="btn-soft-primary rounded-pill">Primary</Button>
      <Button className="btn-soft-secondary rounded-pill">Secondary</Button>
      <Button className="btn-soft-success rounded-pill">Success</Button>
      <Button className="btn-soft-danger rounded-pill">Danger</Button>
      <Button className="btn-soft-warning rounded-pill">Warning</Button>
      <Button className="btn-soft-info rounded-pill">Info</Button>
      <Button className="btn-soft-dark rounded-pill">Dark</Button>
    </div>
  </CardBody>
</Card>;

const GhostButtons = () => <Card>
  <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Ghost Buttons</CardTitle></div></CardHeader>
  <CardBody>
    <p className="text-muted">Use the <code>btn-ghost-**</code> class to create buttons with a transparent background that highlight with color on hover.</p>
    <div className="d-flex flex-wrap gap-2">
      <Button className="btn-ghost-primary">Primary</Button>
      <Button className="btn-ghost-secondary">Secondary</Button>
      <Button className="btn-ghost-success">Success</Button>
      <Button className="btn-ghost-danger">Danger</Button>
      <Button className="btn-ghost-warning">Warning</Button>
      <Button className="btn-ghost-info">Info</Button>
      <Button className="btn-ghost-dark">Dark</Button>
    </div>
  </CardBody>
</Card>;

const GhostRoundedButtons = () => <Card>
  <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Ghost Rounded Buttons</CardTitle></div></CardHeader>
  <CardBody>
    <p className="text-muted">Use <code>btn-ghost-**</code> with <code>.rounded-pill</code> for rounded ghost buttons that highlight on hover.</p>
    <div className="d-flex flex-wrap gap-2">
      <Button className="btn-ghost-primary rounded-pill">Primary</Button>
      <Button className="btn-ghost-secondary rounded-pill">Secondary</Button>
      <Button className="btn-ghost-success rounded-pill">Success</Button>
      <Button className="btn-ghost-danger rounded-pill">Danger</Button>
      <Button className="btn-ghost-warning rounded-pill">Warning</Button>
      <Button className="btn-ghost-info rounded-pill">Info</Button>
      <Button className="btn-ghost-dark rounded-pill">Dark</Button>
    </div>
  </CardBody>
</Card>;

const ButtonSizes = () => <Card>
  <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Button Sizes</CardTitle></div></CardHeader>
  <CardBody>
    <p className="text-muted">Want larger or smaller buttons? Use <code>.btn-lg</code> or <code>.btn-sm</code> to adjust the button size.</p>
    <div className="d-flex flex-wrap align-items-center gap-2">
      <Button variant="primary" size="lg">Large</Button>
      <Button variant="info">Normal</Button>
      <Button variant="success" size="sm">Small</Button>
    </div>
  </CardBody>
</Card>;

const DisabledButtons = () => <Card>
  <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Disabled Buttons</CardTitle></div></CardHeader>
  <CardBody>
    <p className="text-muted">Use the <code>disabled</code> attribute on a <code>&lt;button&gt;</code> to make it inactive and non-interactive.</p>
    <div className="d-flex flex-wrap gap-2">
      <Button variant="info" disabled>Info</Button>
      <Button variant="success" className="btn-soft-success" disabled>Success</Button>
      <Button variant="danger" disabled>Danger</Button>
      <Button variant="dark" disabled>Dark</Button>
    </div>
  </CardBody>
</Card>;

const BlockButtons = () => <Card>
  <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Block Button</CardTitle></div></CardHeader>
  <CardBody>
    <p className="text-muted font-14">To create block-level buttons, add the <code>.d-grid</code> class to the parent <code>&lt;div&gt;</code>.</p>
    <div className="d-grid gap-2">
      <Button variant="primary" size="sm">Block Button</Button>
      <Button variant="success" size="lg">Block Button</Button>
    </div>
  </CardBody>
</Card>;

const ToggleButtons = () => <Card>
  <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Toggle Button</CardTitle></div></CardHeader>
  <CardBody>
    <p className="text-muted">Add <code>data-bs-toggle=&quot;button&quot;</code> to toggle a button's <code>active</code> state. For pre-toggled buttons, also add <code>.active</code> and <code>aria-pressed=&quot;true&quot;</code>.</p>
    <div className="d-flex flex-wrap gap-2">
      <Button variant="primary">Toggle button</Button>
      <Button variant="primary" active>Active toggle button</Button>
      <Button variant="primary" disabled>Disabled toggle button</Button>
    </div>
  </CardBody>
</Card>;

const ButtonTags = () => <Card>
  <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Button Tags</CardTitle></div></CardHeader>
  <CardBody>
    <p className="text-muted">Use <code>.btn</code> classes with <code>&lt;button&gt;</code>, <code>&lt;a&gt;</code>, or <code>&lt;input&gt;</code> elements, though rendering may vary slightly across browsers.</p>
    <div className="d-flex flex-wrap gap-2">
      <Link className="btn btn-primary" to="" role="button">Link</Link>
      <Button variant="primary" type="submit">Button</Button>
      <input className="btn btn-primary" type="button" value="Input" />
      <input className="btn btn-primary" type="submit" value="Submit" />
      <input className="btn btn-primary" type="reset" value="Reset" />
    </div>
  </CardBody>
</Card>;

const IconButtons = () => <Card>
  <CardHeader><CardTitle as="h4">Icon Buttons</CardTitle></CardHeader>
  <CardBody>
    <p className="text-muted">Icon only button. Use it when you want a button with just an icon and no text, ideal for compact UI elements or toolbars.</p>
    <div className="d-flex flex-wrap gap-2">
      <Button variant="primary" className="btn-icon"><Icon icon="star" className="fs-xl" /></Button>
      <Button variant="secondary" className="btn-icon"><Icon icon="leaf" className="fs-xl" /></Button>
      <Button variant="warning" className="btn-icon"><Icon icon="settings" className="fs-xl" /></Button>
      <Button variant="soft-info" className="rounded-circle btn-icon"><Icon icon="bell" className="fs-xl" /></Button>
      <Button variant="secondary" className="rounded-circle btn-icon"><Icon icon="rocket" className="fs-xl" /></Button>
      <Button variant="outline-dark" className="rounded-circle btn-icon"><Icon icon="plane" className="fs-xl" /></Button>
      <Button variant="soft-secondary" className="btn-icon"><Icon icon="microphone" className="fs-xl" /></Button>
      <Button variant="light"><Icon icon="hand-stop" className="fs-xl me-1" />Stop</Button>
      <Button variant="dark"><Icon icon="bolt" className="fs-xl me-1" />Boost</Button>
      <Button variant="outline-info"><Icon icon="credit-card" className="fs-xl me-1" />Payment</Button>
      <Button variant="danger"><Icon icon="tools" className="fs-xl me-1" />Tools</Button>
    </div>
    <div className="d-flex flex-wrap gap-2 mt-3">
      <Button variant="outline-secondary" size="sm" className="btn-icon"><Icon icon="star" /></Button>
      <Button variant="primary" size="sm" className="btn-icon"><Icon icon="leaf" /></Button>
      <Button variant="success" size="sm" className="btn-icon rounded-circle"><Icon icon="settings" /></Button>
      <Button variant="outline-secondary" size="lg" className="btn-icon"><Icon icon="bell" className="fs-xxl" /></Button>
      <Button variant="primary" size="lg" className="btn-icon rounded-circle"><Icon icon="rocket" className="fs-xxl" /></Button>
      <Button variant="success" size="lg" className="btn btn-icon rounded-circle"><Icon icon="share" className="fs-xxl" /></Button>
      <Button variant="info" size="lg" className="btn-icon"><Icon icon="star" className="fs-xxl" /></Button>
      <Button variant="warning" size="lg" className="btn-icon"><Icon icon="alert-octagon" className="fs-xxl" /></Button>
    </div>
  </CardBody>
</Card>;

const ButtonGroup = () => <Card>
  <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Button Group</CardTitle></div></CardHeader>
  <CardBody>
    <p className="text-muted">Group multiple buttons together by wrapping them with the <code>.btn</code> class inside a <code>.btn-group</code> container.</p>
    <div className="btn-group mb-2">
      <Button variant="light">Left</Button><Button variant="light">Middle</Button><Button variant="light">Right</Button>
    </div><br />
    <div className="btn-group mb-2">
      <Button variant="light">1</Button><Button variant="light">2</Button><Button variant="light">3</Button><Button variant="light">4</Button>
    </div>&nbsp;
    <div className="btn-group mb-2">
      <Button variant="light">5</Button><Button variant="light">6</Button><Button variant="light">7</Button>
    </div>&nbsp;
    <div className="btn-group mb-2"><Button variant="light">8</Button></div><br />
    <div className="btn-group mb-2">
      <Button variant="light">1</Button><Button variant="primary">2</Button><Button variant="light">3</Button>
      <div className="btn-group">
        <Dropdown>
          <DropdownToggle variant="light">Dropdown <span className="caret" /></DropdownToggle>
          <DropdownMenu><DropdownItem href="#">Dropdown link</DropdownItem><DropdownItem href="#">Dropdown link</DropdownItem></DropdownMenu>
        </Dropdown>
      </div>
    </div>
    <Row>
      <Col md={3}>
        <div className="btn-group-vertical mb-2">
          <Button variant="light">Top</Button><Button variant="light">Middle</Button><Button variant="light">Bottom</Button>
        </div>
      </Col>
      <Col md={3}>
        <div className="btn-group-vertical mb-2">
          <Button variant="light">Button 1</Button><Button variant="light">Button 2</Button>
          <Dropdown>
            <DropdownToggle type="button" variant="light">Button 3 <span className="caret" /></DropdownToggle>
            <DropdownMenu><DropdownItem href="#">Dropdown link</DropdownItem><DropdownItem href="#">Dropdown link</DropdownItem></DropdownMenu>
          </Dropdown>
        </div>
      </Col>
    </Row>
  </CardBody>
</Card>;

const GradientButtons = () => <Card>
  <CardHeader>
    <div className="flex-grow-1"><CardTitle as="h4">Gradient Buttons</CardTitle></div>
    <Icon icon="smart-home" />
  </CardHeader>
  <CardBody>
    <p className="text-muted">Use the <code>.bg-gradient</code> class to apply a gradient style to buttons.</p>
    <div className="d-flex flex-wrap gap-2">
      <Button className="btn-default bg-gradient">Default</Button>
      <Button variant="primary" className="bg-gradient">Primary</Button>
      <Button variant="secondary" className="bg-gradient">Secondary</Button>
      <Button variant="success" className="bg-gradient">Success</Button>
      <Button variant="danger" className="bg-gradient">Danger</Button>
      <Button variant="warning" className="bg-gradient">Warning</Button>
      <Button variant="info" className="bg-gradient">Info</Button>
      <Button variant="light" className="bg-gradient">Light</Button>
      <Button variant="dark" className="bg-gradient">Dark</Button>
    </div>
  </CardBody>
</Card>;

const GradientRoundedButtons = () => <Card>
  <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Gradient Rounded Buttons</CardTitle></div></CardHeader>
  <CardBody>
    <p className="text-muted">Use the <code>.bg-gradient</code> and <code>.rounded-pill</code> classes to apply a gradient style with rounded edges to buttons.</p>
    <div className="d-flex flex-wrap gap-2">
      <Button className="btn-default rounded-pill bg-gradient">Default</Button>
      <Button variant="primary" className="bg-gradient">Primary</Button>
      <Button variant="secondary" className="rounded-pill bg-gradient">Secondary</Button>
      <Button variant="success" className="rounded-pill bg-gradient">Success</Button>
      <Button variant="danger" className="rounded-pill bg-gradient">Danger</Button>
      <Button variant="warning" className="rounded-pill bg-gradient">Warning</Button>
      <Button variant="info" className="rounded-pill bg-gradient">Info</Button>
      <Button variant="light" className="rounded-pill bg-gradient">Light</Button>
      <Button variant="dark" className="rounded-pill bg-gradient">Dark</Button>
    </div>
  </CardBody>
</Card>;
