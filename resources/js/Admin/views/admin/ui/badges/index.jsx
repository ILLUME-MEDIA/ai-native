import { useState, useEffect, useCallback, useRef } from 'react';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Link } from 'react-router';
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';

// ─────────────────────────────────────────────────────────────────────────────
// Design token engine (scoped)
// ─────────────────────────────────────────────────────────────────────────────

const DS_API     = '/api/admin/design-system';
const PREVIEW_ID = 'ds-badges-preview';

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

function applyTokenMap(map) {
  const container = document.getElementById(PREVIEW_ID);
  if (!container) return;

  // 1. CSS vars on preview container only
  for (const n of COLOR_NAMES) {
    const v = map[`color.${n}`]; if (!v) continue;
    container.style.setProperty(`--bs-${n}`, v);
    const rgb = hexToRgb(v); if (rgb) container.style.setProperty(`--bs-${n}-rgb`, rgb);
  }
  if (map['radius.sm'])   container.style.setProperty('--bs-border-radius-sm', map['radius.sm']);
  if (map['radius.md'])   container.style.setProperty('--bs-border-radius',    map['radius.md']);
  if (map['radius.full']) container.style.setProperty('--bs-border-radius-pill', map['radius.full']);

  // 2. Scoped rules
  const S = `#${PREVIEW_ID}`;
  const lines = [];

  for (const n of COLOR_NAMES) {
    const v = map[`color.${n}`]; if (!v || !v.startsWith('#')) continue;
    const rgb     = hexToRgb(v);
    const softBg  = rgb ? `rgba(${rgb},0.15)` : 'transparent';
    const softBdr = rgb ? `rgba(${rgb},0.4)`  : 'transparent';

    // Solid (text-bg-*)
    lines.push(`${S} .text-bg-${n}{background-color:${v}!important;color:#fff!important}`);
    // Outline badges
    lines.push(`${S} .badge-outline-${n}{color:${v}!important;border:1px solid ${v}!important;background-color:transparent!important}`);
    // Soft / lighten badges
    lines.push(`${S} .badge-soft-${n}{color:${v}!important;background-color:${softBg}!important;border-color:transparent!important}`);
    // Border utilities
    lines.push(`${S} .border-${n}{border-color:${v}!important}`);
    // bg-* utility (used in positioned badges)
    lines.push(`${S} .bg-${n}{--bs-bg-opacity:1;background-color:${v}!important}`);
    // Buttons (used in Positioned section)
    lines.push(`${S} .btn-${n}{background-color:${v}!important;border-color:${v}!important;--bs-btn-bg:${v}!important;--bs-btn-border-color:${v}!important;--bs-btn-hover-bg:${v}!important;--bs-btn-hover-border-color:${v}!important;--bs-btn-active-bg:${v}!important}`);
  }

  let el = document.getElementById('ds-badges-tokens');
  if (!el) { el = document.createElement('style'); el.id = 'ds-badges-tokens'; }
  document.head.appendChild(el);
  el.textContent = lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// useDesignTokens
// ─────────────────────────────────────────────────────────────────────────────

function useDesignTokens() {
  const [tokens, setTokens] = useState([]);
  const [saving, setSaving] = useState(null);
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
      applyTokenMap(mapRef.current);
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
// Token Sidebar
// ─────────────────────────────────────────────────────────────────────────────

const CAT_ORDER  = ['color','radius','font','spacing','shadow','opacity','border'];
const CAT_LABELS = { color:'Colors', radius:'Radius', font:'Typography', spacing:'Spacing', shadow:'Shadows', opacity:'Opacity', border:'Border' };

function TokenSidebar({ tokens, saving, onUpdate }) {
  const [search, setSearch] = useState('');
  const [cat,    setCat]    = useState('all');

  const available = ['all', ...CAT_ORDER.filter(c => tokens.some(t => t.category === c))];
  const filtered  = tokens.filter(t =>
    (cat === 'all' || t.category === cat) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()))
  );
  const grouped = filtered.reduce((acc, t) => { (acc[t.category] ??= []).push(t); return acc; }, {});

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'16px 16px 10px', borderBottom:'1px solid #e5e7eb', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ fontWeight:700, fontSize:13, color:'#111827' }}>Design Tokens</span>
          <span style={{ fontSize:11, color:'#9ca3af' }}>{tokens.length} total</span>
        </div>
        <input placeholder="Search tokens…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width:'100%', padding:'6px 10px', border:'1px solid #d1d5db', borderRadius:6, fontSize:12, marginBottom:8 }} />
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

      <div style={{ overflowY:'auto', flex:1, padding:'8px 12px' }}>
        {Object.entries(grouped).map(([category, rows]) => (
          <div key={category} style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#9ca3af', margin:'8px 0 6px' }}>
              {CAT_LABELS[category] ?? category}
            </div>
            {rows.map(t => <TokenItem key={t.id} token={t} onUpdate={onUpdate} isSaving={saving === t.id} />)}
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign:'center', color:'#9ca3af', fontSize:12, padding:24 }}>No tokens found.</div>}
      </div>

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
      {isColor ? (
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:24, height:24, borderRadius:4, background:draft, border:'2px solid rgba(0,0,0,0.12)' }} />
          <input type="color" value={draft.length===7 ? draft : '#000000'} onChange={e => handleColor(e.target.value)}
            style={{ position:'absolute', inset:0, opacity:0, width:'100%', height:'100%', cursor:'pointer', border:'none', padding:0 }} />
        </div>
      ) : (
        <div style={{ width:24, height:24, flexShrink:0, background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:4,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#9ca3af', fontFamily:'monospace' }}>ab</div>
      )}
      <code style={{ fontSize:11, color:'#374151', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{token.name}</code>
      {editing ? (
        <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={e => { if (e.key==='Enter') commit(); if (e.key==='Escape') { setDraft(token.value); setEditing(false); } }}
          style={{ width:90, fontSize:11, fontFamily:'monospace', padding:'2px 5px', border:'1px solid #3b82f6', borderRadius:3, outline:'none' }} />
      ) : (
        <span onClick={() => setEditing(true)} title="Click to edit"
          style={{ fontSize:11, fontFamily:'monospace', color:'#6b7280', cursor:'text', minWidth:60, textAlign:'right', flexShrink:0 }}>
          {draft}
        </span>
      )}
      {isSaving && <span style={{ width:8, height:8, borderRadius:'50%', border:'2px solid #3b82f6', borderTopColor:'transparent',
        display:'inline-block', animation:'ds-spin .6s linear infinite', flexShrink:0 }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page — split layout
// ─────────────────────────────────────────────────────────────────────────────

const Page = () => {
  const { tokens, updateToken, saving } = useDesignTokens();

  return (
    <>
      <style>{`@keyframes ds-spin { to { transform:rotate(360deg); } }`}</style>
      <PageBreadcrumb title="Badges" subtitle="UI" />

      <div style={{ display:'flex', gap:0, height:'calc(100vh - 130px)', minHeight:600, background:'#f8fafc', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>

        {/* ── LEFT: Token Sidebar ── */}
        <div style={{ width:300, flexShrink:0, background:'#fff', borderRight:'1px solid #e5e7eb', display:'flex', flexDirection:'column' }}>
          {tokens.length === 0 ? (
            <div style={{ padding:24, textAlign:'center', color:'#9ca3af', fontSize:12 }}>Loading tokens…</div>
          ) : (
            <TokenSidebar tokens={tokens} saving={saving} onUpdate={updateToken} />
          )}
        </div>

        {/* ── RIGHT: Live Badge Preview ── */}
        <div id="ds-badges-preview" style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          <Row>
            <Col xl={6}><BasicBadges /></Col>
            <Col xl={6}><BasicPillBadges /></Col>
            <Col xl={6}><OutlineBadges /></Col>
            <Col xl={6}><OutlinePillBadges /></Col>
            <Col xl={6}><LightenBadges /></Col>
            <Col xl={6}><LightenPillBadges /></Col>
            <Col xl={6}><LabelBadges /></Col>
            <Col xl={6}><SquareBadges /></Col>
            <Col xl={6}><CircleBadges /><Positioned /></Col>
            <Col xl={6}><HeadingswithBadges /></Col>
          </Row>
        </div>

      </div>
    </>
  );
};
export default Page;

// ─────────────────────────────────────────────────────────────────────────────
// Badge sections — unchanged
// ─────────────────────────────────────────────────────────────────────────────

const BasicBadges = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Basic Badges</CardTitle></CardHeader>
    <CardBody>
      <p className="text-muted">Use the <code>.badge</code> &amp; <code>.text-bg-*</code> classes to make badges.</p>
      <span className="badge me-1 badge-default">Default</span>
      <span className="badge me-1 text-bg-primary">Primary</span>
      <span className="badge me-1 text-bg-secondary">Secondary</span>
      <span className="badge me-1 text-bg-success">Success</span>
      <span className="badge me-1 text-bg-danger">Danger</span>
      <span className="badge me-1 text-bg-warning">Warning</span>
      <span className="badge me-1 text-bg-info">Info</span>
      <span className="badge me-1 text-bg-light">Light</span>
      <span className="badge me-1 text-bg-dark">Dark</span>
      <span className="badge text-bg-purple">Purple</span>
    </CardBody>
  </Card>
);

const BasicPillBadges = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Basic Pill Badges</CardTitle></CardHeader>
    <CardBody>
      <p className="text-muted">Use the <code>.rounded-pill</code> modifier class to make badges more rounded.</p>
      <span className="badge badge-default rounded-pill me-1">Default</span>
      <span className="badge text-bg-primary rounded-pill me-1">Primary</span>
      <span className="badge text-bg-secondary rounded-pill me-1">Secondary</span>
      <span className="badge text-bg-success rounded-pill me-1">Success</span>
      <span className="badge text-bg-danger rounded-pill me-1">Danger</span>
      <span className="badge text-bg-warning rounded-pill me-1">Warning</span>
      <span className="badge text-bg-info rounded-pill me-1">Info</span>
      <span className="badge text-bg-light rounded-pill me-1">Light</span>
      <span className="badge text-bg-dark rounded-pill me-1">Dark</span>
      <span className="badge text-bg-purple rounded-pill me-1">Purple</span>
    </CardBody>
  </Card>
);

const OutlineBadges = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Outline Badges</CardTitle></CardHeader>
    <CardBody>
      <p className="text-muted">Using the <code>.badge-outline-*</code> to quickly create a bordered badges.</p>
      <span className="badge me-1 badge-outline-primary">Primary</span>
      <span className="badge me-1 badge-outline-secondary">Secondary</span>
      <span className="badge me-1 badge-outline-success">Success</span>
      <span className="badge me-1 badge-outline-danger">Danger</span>
      <span className="badge me-1 badge-outline-warning">Warning</span>
      <span className="badge me-1 badge-outline-info">Info</span>
      <span className="badge me-1 badge-outline-dark">Dark</span>
      <span className="badge me-1 badge-outline-purple">Purple</span>
    </CardBody>
  </Card>
);

const OutlinePillBadges = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Outline Pill Badges</CardTitle></CardHeader>
    <CardBody>
      <p className="text-muted">Use the <code>.rounded-pill</code> modifier class to make badges more rounded.</p>
      <span className="badge me-1 badge-outline-primary rounded-pill me-1">Primary</span>
      <span className="badge me-1 badge-outline-secondary rounded-pill me-1">Secondary</span>
      <span className="badge me-1 badge-outline-success rounded-pill me-1">Success</span>
      <span className="badge me-1 badge-outline-danger rounded-pill me-1">Danger</span>
      <span className="badge me-1 badge-outline-warning rounded-pill me-1">Warning</span>
      <span className="badge me-1 badge-outline-info rounded-pill me-1">Info</span>
      <span className="badge me-1 badge-outline-dark rounded-pill me-1">Dark</span>
      <span className="badge me-1 badge-outline-purple rounded-pill me-1">Purple</span>
    </CardBody>
  </Card>
);

const LightenBadges = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Lighten Badges</CardTitle></CardHeader>
    <CardBody>
      <p className="text-muted">Use the <code>.badge-soft-*</code> modifier class to make badges lighten.</p>
      <span className="badge me-1 badge-soft-primary">Primary</span>
      <span className="badge me-1 badge-soft-secondary">Secondary</span>
      <span className="badge me-1 badge-soft-success">Success</span>
      <span className="badge me-1 badge-soft-danger">Danger</span>
      <span className="badge me-1 badge-soft-warning">Warning</span>
      <span className="badge me-1 badge-soft-info">Info</span>
      <span className="badge me-1 badge-soft-dark">Dark</span>
      <span className="badge me-1 badge-soft-purple">Purple</span>
    </CardBody>
  </Card>
);

const LightenPillBadges = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Lighten Pill Badges</CardTitle></CardHeader>
    <CardBody>
      <p className="text-muted">Use the <code>.badge-soft-*</code> modifier class to make badges lighten.</p>
      <span className="badge badge-soft-primary rounded-pill me-1">Primary</span>
      <span className="badge badge-soft-secondary rounded-pill me-1">Secondary</span>
      <span className="badge badge-soft-success rounded-pill me-1">Success</span>
      <span className="badge badge-soft-danger rounded-pill me-1">Danger</span>
      <span className="badge badge-soft-warning rounded-pill me-1">Warning</span>
      <span className="badge badge-soft-info rounded-pill me-1">Info</span>
      <span className="badge badge-soft-dark rounded-pill me-1">Dark</span>
      <span className="badge badge-soft-purple rounded-pill me-1">Purple</span>
    </CardBody>
  </Card>
);

const LabelBadges = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Label Badges</CardTitle></CardHeader>
    <CardBody>
      <p className="text-muted">Using the <code>.badge-label</code> to quickly create a square based badges.</p>
      <span className="badge me-1 badge-label badge-default">Default</span>
      <span className="badge me-1 badge-label text-bg-primary">Primary</span>
      <span className="badge me-1 badge-label text-bg-secondary">Secondary</span>
      <span className="badge me-1 badge-label text-bg-success">Success</span>
      <span className="badge me-1 badge-label text-bg-danger">Danger</span>
      <span className="badge me-1 badge-label text-bg-warning">Warning</span>
      <span className="badge me-1 badge-label text-bg-info">Info</span>
      <span className="badge me-1 badge-label text-bg-light">Light</span>
      <span className="badge me-1 badge-label text-bg-dark">Dark</span>
      <span className="badge me-1 badge-label text-bg-purple">Purple</span>
    </CardBody>
  </Card>
);

const SquareBadges = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Square Badges</CardTitle></CardHeader>
    <CardBody>
      <p className="text-muted">Using the <code>.badge-square</code> to quickly create a square based badges.</p>
      <span className="badge me-1 badge-square badge-default">0</span>
      <span className="badge me-1 badge-square text-bg-primary">1</span>
      <span className="badge me-1 badge-square text-bg-secondary">2</span>
      <span className="badge me-1 badge-square text-bg-success">3</span>
      <span className="badge me-1 badge-square text-bg-danger">4</span>
      <span className="badge me-1 badge-square text-bg-warning">5</span>
      <span className="badge me-1 badge-square text-bg-info">6</span>
      <span className="badge me-1 badge-square text-bg-light">7</span>
      <span className="badge me-1 badge-square text-bg-dark">8</span>
      <span className="badge me-1 badge-square text-bg-purple">9</span>
    </CardBody>
  </Card>
);

const CircleBadges = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Circle Badges</CardTitle></CardHeader>
    <CardBody>
      <p className="text-muted">Using the <code>.badge-circle</code> to quickly create a circle based badges.</p>
      <span className="badge me-1 badge-circle badge-default">0</span>
      <span className="badge me-1 badge-circle text-bg-primary">1</span>
      <span className="badge me-1 badge-circle text-bg-secondary">2</span>
      <span className="badge me-1 badge-circle text-bg-success">3</span>
      <span className="badge me-1 badge-circle text-bg-danger">4</span>
      <span className="badge me-1 badge-circle text-bg-warning">5</span>
      <span className="badge me-1 badge-circle text-bg-info">6</span>
      <span className="badge me-1 badge-circle text-bg-light">7</span>
      <span className="badge me-1 badge-circle text-bg-dark">8</span>
      <span className="badge me-1 badge-circle text-bg-purple">9</span>
    </CardBody>
  </Card>
);

const Positioned = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Positioned</CardTitle></CardHeader>
    <CardBody>
      <p className="text-muted">Use utilities to modify a <code>.badge</code> and position it in the corner of a link or button.</p>
      <div className="d-flex flex-wrap gap-3">
        <Button className="btn btn-primary position-relative">
          Inbox
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            99+<span className="visually-hidden">unread messages</span>
          </span>
        </Button>
        <Button className="btn btn-primary position-relative">
          Profile
          <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
            <span className="visually-hidden">New alerts</span>
          </span>
        </Button>
        <Button className="btn btn-success">
          Notifications <span className="badge text-bg-light ms-1">4</span>
        </Button>
      </div>
    </CardBody>
  </Card>
);

const HeadingswithBadges = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Headings with Badges</CardTitle></CardHeader>
    <CardBody>
      <h1>h1.Example heading <span className="badge text-bg-primary">New</span></h1>
      <h2>h2.Example heading <span className="badge text-bg-primary">New</span></h2>
      <h3>h3.Example heading <span className="badge text-bg-primary">New</span></h3>
      <h4>h4.Example heading <span className="badge text-bg-primary">New</span></h4>
      <h5>h5.Example heading <span className="badge text-bg-primary">New</span></h5>
      <h6>h6.Example heading <span className="badge text-bg-primary">New</span></h6>
    </CardBody>
  </Card>
);
