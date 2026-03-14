import { useState, useEffect, useCallback, useRef } from 'react';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import { Alert, AlertHeading, Button, Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
import { CustomButton, LiveAlert } from './components/Alerts';

// ─────────────────────────────────────────────────────────────────────────────
// Design token engine (scoped — no global CSS leaks)
// ─────────────────────────────────────────────────────────────────────────────

const DS_API    = '/api/admin/design-system';
const PREVIEW_ID = 'ds-alerts-preview';

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

  // 1. CSS vars scoped to preview container
  for (const n of COLOR_NAMES) {
    const v = map[`color.${n}`]; if (!v) continue;
    container.style.setProperty(`--bs-${n}`, v);
    const rgb = hexToRgb(v); if (rgb) container.style.setProperty(`--bs-${n}-rgb`, rgb);
  }
  if (map['radius.sm'])          container.style.setProperty('--bs-border-radius-sm',   map['radius.sm']);
  if (map['radius.md'])          container.style.setProperty('--bs-border-radius',       map['radius.md']);
  if (map['radius.lg'])          container.style.setProperty('--bs-border-radius-lg',    map['radius.lg']);

  // 2. Scoped per-component rules
  const S = `#${PREVIEW_ID}`;
  const lines = [];

  for (const n of COLOR_NAMES) {
    const v = map[`color.${n}`]; if (!v || !v.startsWith('#')) continue;
    const rgb     = hexToRgb(v);
    const alertBg  = rgb ? `rgba(${rgb},0.12)` : 'transparent';
    const alertBdr = rgb ? `rgba(${rgb},0.35)` : 'transparent';

    // Default alert — tinted bg + colored border + text
    lines.push(`${S} .alert-${n}{--bs-alert-bg:${alertBg}!important;--bs-alert-border-color:${alertBdr}!important;--bs-alert-color:${v}!important;background-color:${alertBg}!important;border-color:${alertBdr}!important;color:${v}!important}`);

    // Solid (text-bg-*) dismissible alerts
    lines.push(`${S} .text-bg-${n}{background-color:${v}!important;color:#fff!important}`);

    // Border utilities used in custom alerts
    lines.push(`${S} .border-${n}{border-color:${v}!important}`);
    lines.push(`${S} .text-${n}{color:${v}!important}`);

    // alert-link inside this variant
    lines.push(`${S} .alert-${n} .alert-link{color:${v}!important;font-weight:600}`);

    // .btn-* inside alerts (e.g. "Got it" button)
    lines.push(`${S} .btn-${n}{background-color:${v}!important;border-color:${v}!important;--bs-btn-bg:${v}!important}`);
  }

  let el = document.getElementById('ds-alerts-tokens');
  if (!el) { el = document.createElement('style'); el.id = 'ds-alerts-tokens'; }
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

      {/* Header */}
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

      <code style={{ fontSize:11, color:'#374151', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {token.name}
      </code>

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
// Page — split layout
// ─────────────────────────────────────────────────────────────────────────────

const Page = () => {
  const { tokens, updateToken, saving } = useDesignTokens();

  return (
    <>
      <style>{`@keyframes ds-spin { to { transform:rotate(360deg); } }`}</style>
      <PageBreadcrumb title="Alerts" subtitle="UI" />

      <div style={{ display:'flex', gap:0, height:'calc(100vh - 130px)', minHeight:600, background:'#f8fafc', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>

        {/* ── LEFT: Token Sidebar ── */}
        <div style={{ width:300, flexShrink:0, background:'#fff', borderRight:'1px solid #e5e7eb', display:'flex', flexDirection:'column' }}>
          {tokens.length === 0 ? (
            <div style={{ padding:24, textAlign:'center', color:'#9ca3af', fontSize:12 }}>Loading tokens…</div>
          ) : (
            <TokenSidebar tokens={tokens} saving={saving} onUpdate={updateToken} />
          )}
        </div>

        {/* ── RIGHT: Live Alert Preview ── */}
        <div id="ds-alerts-preview" style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          <Row>
            <Col xl={6}><DefaultAlert /></Col>
            <Col xl={6}><DismissingAlert /></Col>
            <Col xl={6}><LinkColor /></Col>
            <Col xl={6}><AdditionalContent /></Col>
            <Col xl={6}><CustomAlerts /></Col>
            <Col xl={6}><LiveAlert /></Col>
          </Row>
        </div>

      </div>
    </>
  );
};
export default Page;

// ─────────────────────────────────────────────────────────────────────────────
// Alert sections — unchanged
// ─────────────────────────────────────────────────────────────────────────────

const DefaultAlert = () => (
  <Card>
    <CardHeader><div className="flex-grow-1"><CardTitle as="h4" className="mb-0">Default Alert</CardTitle></div></CardHeader>
    <CardBody>
      <Alert variant="primary" role="alert">This is a primary alert—something important you should know!</Alert>
      <Alert variant="secondary" role="alert">This is a secondary alert—some additional context.</Alert>
      <Alert variant="success" role="alert">Success! Your operation was completed successfully.</Alert>
      <Alert variant="danger" role="alert">Error! Something went wrong—please try again.</Alert>
      <Alert variant="warning" role="alert">Warning! Please double-check your inputs.</Alert>
      <Alert variant="info" role="alert">Info: Here&apos;s something you might find useful.</Alert>
      <Alert variant="light" role="alert">Light alert—just a subtle notification.</Alert>
      <Alert variant="dark" role="alert">Dark alert—use for general-purpose messages.</Alert>
    </CardBody>
  </Card>
);

const DismissingAlert = () => (
  <Card>
    <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Dismissing Alert with Solid Colors</CardTitle></div></CardHeader>
    <CardBody>
      <Alert variant="primary"   dismissible className="text-bg-primary">  <div>Heads up! Primary alert with important information.</div></Alert>
      <Alert variant="secondary" dismissible className="text-bg-secondary"><div>Notice: Secondary alert with supporting details.</div></Alert>
      <Alert variant="success"   dismissible className="text-bg-success">  <div>Success! Your action was completed successfully.</div></Alert>
      <Alert variant="danger"    dismissible className="text-bg-danger">   <div>Error! Something went wrong—please try again later.</div></Alert>
      <Alert variant="warning"   dismissible className="text-bg-warning">  <div>Warning! Please review your input before proceeding.</div></Alert>
      <Alert variant="info"      dismissible className="text-bg-info">     <div>Info: Here's something you might find helpful.</div></Alert>
      <Alert variant="light"     dismissible className="text-bg-light">    <div>Note: This is a light alert with a subtle message.</div></Alert>
      <Alert variant="dark"      dismissible className="text-bg-dark">     <div>Notice: This dark alert is great for general messages.</div></Alert>
    </CardBody>
  </Card>
);

const LinkColor = () => (
  <Card>
    <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Link Color</CardTitle></div></CardHeader>
    <CardBody>
      <Alert variant="primary">  Need more info? Check out <Link to="" className="alert-link">this primary link</Link> for important details.</Alert>
      <Alert variant="secondary">Here&apos;s a secondary message with <Link to="" className="alert-link">a helpful link</Link> for context.</Alert>
      <Alert variant="success">  Operation successful! View results <Link to="" className="alert-link">by clicking here</Link></Alert>
      <Alert variant="danger">   Something went wrong. Learn more <Link to="" className="alert-link">through this alert link</Link>.</Alert>
      <Alert variant="warning">  Heads up! Check <Link to="" className="alert-link">this warning link</Link>.</Alert>
      <Alert variant="info">     Here's some info—click <Link to="" className="alert-link">this link</Link> to read more.</Alert>
      <Alert variant="light">    Just a light reminder with <Link to="" className="alert-link">a gentle link</Link> to explore.</Alert>
      <Alert variant="dark">     This is a general dark alert. Find out more <Link to="" className="alert-link">by clicking here</Link>.</Alert>
    </CardBody>
  </Card>
);

const AdditionalContent = () => (
  <Card>
    <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Additional Content</CardTitle></div></CardHeader>
    <CardBody>
      <Alert variant="success" className="p-3">
        <AlertHeading as="h4">Great job!</AlertHeading>
        <p>You've successfully read this important alert message. The text is intentionally a bit longer to demonstrate how spacing behaves in this kind of layout.</p>
        <hr className="border-success border-opacity-25" />
        <p className="mb-0">Use margin utilities to keep your content clean and organized.</p>
      </Alert>
      <Alert variant="secondary" className="p-3 d-flex">
        <Icon icon="alarm-snooze" className="fs-1 me-2" />
        <div>
          <AlertHeading as="h4" className="alert-heading">Heads up!</AlertHeading>
          <p>This alert message gives additional information with a longer message to show content spacing within an alert.</p>
          <hr className="border-secondary border-opacity-25" />
          <p className="mb-0">Apply spacing classes wisely to maintain structure and clarity.</p>
        </div>
      </Alert>
      <Alert variant="danger" className="d-flex p-3 mb-0">
        <Icon icon="phone-ringing" className="text-success fs-2 me-3" />
        <div>
          <AlertHeading as="h4">Notice!</AlertHeading>
          <p>You've just read through a primary alert message. The extra length helps show how well the layout handles content spacing.</p>
          <Button variant="danger" className="btn-sm">Got it</Button>
        </div>
      </Alert>
    </CardBody>
  </Card>
);

const CustomAlerts = () => (
  <Card>
    <CardHeader><div className="flex-grow-1"><CardTitle as="h4">Custom Alerts</CardTitle></div></CardHeader>
    <CardBody>
      <Alert variant="primary"   dismissible className="border border-primary" role="alert"><div>A primary alert with a full border!</div></Alert>
      <Alert variant="secondary" dismissible className="alert-bordered border-start border-secondary" role="alert"><div>A secondary alert with a left border only!</div></Alert>
      <Alert variant="dark"      dismissible className="alert-bordered border-bottom border-dark" role="alert"><div>A dark alert with a bottom border!</div></Alert>
      <Alert variant="success"   dismissible className="border-2 border border-dashed border-success" role="alert"><div>A success alert with a dashed border!</div></Alert>
      <Alert variant="danger"    dismissible className="border-2 border-danger" role="alert"><div>A danger alert with a thick border!</div></Alert>
      <CustomButton />
      <Alert variant="info"  dismissible className="d-flex align-items-center gap-2" role="alert">
        <Icon icon="alert-octagon" className="fs-xl" /> An info alert with a custom icon!
      </Alert>
      <Alert variant="light" dismissible className="border-2 d-flex align-items-center p-3 mb-0" role="alert">
        <Icon icon="phone-ringing" className="text-success fs-2 me-3" />
        <div>
          <AlertHeading as="h4">Notice!</AlertHeading>
          <p className="m-0">You've just read through a primary alert message. The extra length helps show how well the layout handles content spacing.</p>
        </div>
      </Alert>
    </CardBody>
  </Card>
);
