/**
 * Design System Manager
 * Route: /apps/design-system-manager (basename /admin → /admin/apps/design-system-manager)
 *
 * Self-contained — no TokenEngine / DsButton dependency.
 * Uses CSS-variable injection for instant live preview.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';

const API = '/api/admin/design-system';

// ── API helper ────────────────────────────────────────────────────────────────
function call(path, opts = {}) {
    const xsrf = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
    return fetch(API + path, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrf },
        ...opts,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(r => r.status === 204 ? null : r.json());
}

// ── CSS injection (same engine as buttons page) ───────────────────────────────
function hexToRgb(hex) {
    const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : null;
}

const COLOR_NAMES = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];

function buildCss(map) {
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
    r('font.btn.md',        '--bs-btn-font-size');
    r('font.weight.medium', '--bs-btn-font-weight');
    lines.push('}');
    for (const n of COLOR_NAMES) {
        const v = map[`color.${n}`]; if (!v || !v.startsWith('#')) continue;
        lines.push(`.btn-${n}{--bs-btn-bg:${v};--bs-btn-border-color:${v};--bs-btn-hover-bg:${v};--bs-btn-active-bg:${v}}`);
        lines.push(`.btn-outline-${n}{--bs-btn-color:${v};--bs-btn-border-color:${v};--bs-btn-hover-bg:${v}}`);
    }
    return lines.join('\n');
}

function injectCss(css) {
    let el = document.getElementById('dsm-token-css');
    if (!el) { el = document.createElement('style'); el.id = 'dsm-token-css'; document.head.appendChild(el); }
    el.textContent = css;
}

// ── useTokens hook ────────────────────────────────────────────────────────────
function useTokens(themeId) {
    const [tokens, setTokens]   = useState([]);
    const [saving, setSaving]   = useState(null);
    const mapRef  = useRef({});
    const timers  = useRef({});

    useEffect(() => {
        if (!themeId) return;
        call(`/tokens?theme_id=${themeId}`).then(rows => {
            const map = {};
            (rows ?? []).forEach(t => { map[t.name] = t.value; });
            mapRef.current = map;
            setTokens(rows ?? []);
            injectCss(buildCss(map));
        });
    }, [themeId]);

    const update = useCallback((id, newValue) => {
        // 1. find token name
        const row = tokens.find(t => t.id === id);
        if (row) {
            // 2. update ref + inject CSS synchronously (instant preview)
            mapRef.current = { ...mapRef.current, [row.name]: newValue };
            injectCss(buildCss(mapRef.current));
        }
        // 3. update react state (panel UI)
        setTokens(prev => prev.map(t => t.id === id ? { ...t, value: newValue } : t));
        // 4. debounced API save
        clearTimeout(timers.current[id]);
        timers.current[id] = setTimeout(() => {
            setSaving(id);
            call(`/tokens/${id}`, { method: 'PUT', body: { value: newValue } })
                .finally(() => setSaving(null));
        }, 600);
    }, [tokens]);

    return { tokens, saving, update };
}

// ── Live Preview Panel ────────────────────────────────────────────────────────
const BTN_SECTIONS = [
    { label: 'Default',          cls: v => `btn btn-${v}` },
    { label: 'Rounded',          cls: v => `btn btn-${v} rounded-pill` },
    { label: 'Outline',          cls: v => `btn btn-outline-${v}` },
    { label: 'Outline Rounded',  cls: v => `btn btn-outline-${v} rounded-pill` },
    { label: 'Soft',             cls: v => `btn btn-soft-${v}` },
    { label: 'Soft Rounded',     cls: v => `btn btn-soft-${v} rounded-pill` },
    { label: 'Ghost',            cls: v => `btn btn-ghost-${v}` },
    { label: 'Ghost Rounded',    cls: v => `btn btn-ghost-${v} rounded-pill` },
    { label: 'Gradient',         cls: v => `btn btn-${v} bg-gradient` },
    { label: 'Gradient Rounded', cls: v => `btn btn-${v} rounded-pill bg-gradient` },
];
const VARIANTS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];

function PreviewPanel() {
    return (
        <div style={{ overflowY: 'auto', height: '100%', paddingRight: 4 }}>
            {/* Button sections */}
            {BTN_SECTIONS.map(({ label, cls }) => (
                <div key={label} style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 8 }}>{label}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {VARIANTS.map(v => (
                            <button key={v} className={cls(v)} style={{ fontSize: 13 }}>
                                {v.charAt(0).toUpperCase() + v.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            {/* Sizes */}
            <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 8 }}>Sizes</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-lg">Large</button>
                    <button className="btn btn-primary">Normal</button>
                    <button className="btn btn-primary btn-sm">Small</button>
                </div>
            </div>

            {/* Disabled */}
            <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 8 }}>Disabled</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['primary', 'success', 'danger', 'warning'].map(v => (
                        <button key={v} className={`btn btn-${v}`} disabled>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
                    ))}
                </div>
            </div>

            {/* Block */}
            <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 8 }}>Block</p>
                <div className="d-grid gap-2">
                    <button className="btn btn-primary">Block Primary</button>
                    <button className="btn btn-success bg-gradient">Block Gradient</button>
                </div>
            </div>
        </div>
    );
}

// ── Token Editor Panel ────────────────────────────────────────────────────────
const CAT_ORDER  = ['color', 'radius', 'font', 'spacing', 'shadow', 'opacity', 'border'];
const CAT_LABELS = { color: 'Colors', radius: 'Radius', font: 'Typography', spacing: 'Spacing', shadow: 'Shadows', opacity: 'Opacity', border: 'Border' };

function TokenEditorPanel({ tokens, saving, onUpdate }) {
    const [search,  setSearch]  = useState('');
    const [catFilter, setCat]   = useState('all');

    const filtered = tokens.filter(t =>
        (catFilter === 'all' || t.category === catFilter) &&
        (!search || t.name.toLowerCase().includes(search.toLowerCase()))
    );
    const grouped = filtered.reduce((acc, t) => { (acc[t.category] ??= []).push(t); return acc; }, {});
    const cats = ['all', ...CAT_ORDER.filter(c => tokens.some(t => t.category === c))];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                <input
                    placeholder="Search..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, width: 140, flexShrink: 0 }}
                />
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {cats.map(c => (
                        <button key={c} onClick={() => setCat(c)}
                            style={{ padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11,
                                background: catFilter === c ? '#3b82f6' : '#f3f4f6',
                                color: catFilter === c ? '#fff' : '#374151', fontWeight: catFilter === c ? 700 : 400 }}>
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {/* Token list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
                {Object.entries(grouped).map(([cat, rows]) => (
                    <div key={cat} style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: 6 }}>
                            {CAT_LABELS[cat] ?? cat}
                        </div>
                        {rows.map(t => <TokenEditorRow key={t.id} token={t} onUpdate={onUpdate} isSaving={saving === t.id} />)}
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 32 }}>No tokens found.</div>
                )}
            </div>
        </div>
    );
}

function TokenEditorRow({ token, onUpdate, isSaving }) {
    const [draft,   setDraft]   = useState(token.value);
    const [editing, setEditing] = useState(false);
    const isColor = token.category === 'color' && /^#[0-9a-f]{3,6}$/i.test(token.value);

    useEffect(() => { setDraft(token.value); }, [token.value]);

    const handleColor = (hex) => { setDraft(hex); onUpdate(token.id, hex); };
    const commit = () => { setEditing(false); if (draft !== token.value) onUpdate(token.id, draft); };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #f3f4f6' }}>
            {/* Swatch / color picker */}
            {isColor ? (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 4, background: draft, border: '2px solid rgba(0,0,0,0.12)' }} />
                    <input type="color" value={draft.length === 7 ? draft : '#000000'} onChange={e => handleColor(e.target.value)}
                        style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }} />
                </div>
            ) : (
                <div style={{ width: 26, height: 26, flexShrink: 0, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9ca3af' }}>ab</div>
            )}

            {/* Name */}
            <code style={{ fontSize: 11, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{token.name}</code>

            {/* Value */}
            {editing ? (
                <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                    onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(token.value); setEditing(false); } }}
                    style={{ width: 100, fontSize: 11, fontFamily: 'monospace', padding: '2px 6px', border: '1px solid #3b82f6', borderRadius: 3, outline: 'none' }} />
            ) : (
                <span onClick={() => setEditing(true)} title="Click to edit"
                    style={{ fontSize: 11, fontFamily: 'monospace', color: '#6b7280', cursor: 'text', minWidth: 70, textAlign: 'right' }}>
                    {draft}
                </span>
            )}

            {/* Saving spinner */}
            {isSaving && <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #3b82f6', borderTopColor: 'transparent', display: 'inline-block', animation: 'dsm-spin .6s linear infinite', flexShrink: 0 }} />}
        </div>
    );
}

// ── Export Tab ────────────────────────────────────────────────────────────────
function ExportPanel({ themeId }) {
    const [output, setOutput] = useState('');
    const [format, setFormat] = useState('json');
    const [copied, setCopied] = useState(false);

    const formats = [['json','Token JSON'],['css','CSS Variables'],['tailwind','Tailwind Config'],['dts','W3C DTS']];

    const doExport = async () => {
        const paths = { json: `/themes/${themeId}/export/json`, css: `/themes/${themeId}/export/css`, tailwind: `/themes/${themeId}/export/tailwind`, dts: `/themes/${themeId}/export/dts` };
        const res  = await fetch(API + paths[format]);
        const data = format === 'css' ? await res.text() : await res.json();
        setOutput(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    };
    const copy = () => { navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
    const dl   = () => {
        const ext = { json:'json', css:'css', tailwind:'js', dts:'json' }[format];
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([output], { type: 'text/plain' })), download: `design-tokens.${ext}` });
        a.click();
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {formats.map(([id, label]) => (
                    <button key={id} onClick={() => setFormat(id)}
                        style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
                            background: format === id ? '#3b82f6' : '#f3f4f6', color: format === id ? '#fff' : '#374151', fontWeight: format === id ? 600 : 400 }}>
                        {label}
                    </button>
                ))}
                <button onClick={doExport} style={{ marginLeft: 8, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Generate</button>
                {output && <>
                    <button onClick={copy} style={{ background: copied ? '#22c55e' : '#f3f4f6', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: copied ? '#fff' : '#374151' }}>{copied ? '✓ Copied' : 'Copy'}</button>
                    <button onClick={dl}   style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>Download</button>
                </>}
            </div>
            {output
                ? <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: 20, borderRadius: 8, fontSize: 12, lineHeight: 1.65, overflow: 'auto', maxHeight: 560, margin: 0 }}>{output}</pre>
                : <div style={{ background: '#f9fafb', border: '2px dashed #e5e7eb', borderRadius: 8, padding: 48, textAlign: 'center', color: '#9ca3af' }}>Select a format and click <strong>Generate</strong>.</div>
            }
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DesignSystemManager() {
    const [themes,  setThemes]  = useState([]);
    const [themeId, setThemeId] = useState(null);
    const [tab,     setTab]     = useState('editor');

    useEffect(() => {
        call('/themes').then(data => {
            setThemes(data ?? []);
            const def = (data ?? []).find(t => t.is_default) ?? data?.[0];
            if (def) setThemeId(def.id);
        });
    }, []);

    const { tokens, saving, update } = useTokens(themeId);

    if (!themeId) return <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Loading…</div>;

    const TABS = [
        { id: 'editor', label: 'Token Editor + Preview' },
        { id: 'export', label: 'Export' },
    ];

    return (
        <>
            <style>{`@keyframes dsm-spin { to { transform: rotate(360deg); } }`}</style>
            <PageBreadcrumb title="Design System Manager" subtitle="Apps" />

            <div style={{ padding: '0 4px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                        <h5 style={{ margin: 0, fontWeight: 700 }}>Design System Manager</h5>
                        <small className="text-muted">Edit any token — all buttons update instantly</small>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>Theme:</span>
                        <select value={themeId} onChange={e => setThemeId(Number(e.target.value))}
                            className="form-select form-select-sm" style={{ width: 160 }}>
                            {themes.map(t => <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' (default)' : ''}</option>)}
                        </select>
                        <span className="badge bg-light text-secondary border" style={{ fontSize: 11 }}>{tokens.length} tokens</span>
                    </div>
                </div>

                {/* Tab bar */}
                <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 20, gap: 2 }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            style={{ padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13,
                                fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? '#3b82f6' : '#6b7280',
                                borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent', marginBottom: -2 }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Token Editor + Live Preview — side by side */}
                {tab === 'editor' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, height: 'calc(100vh - 220px)', minHeight: 500 }}>
                        {/* Left: Token editor */}
                        <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
                                Design Tokens
                                <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>— changes apply instantly →</span>
                            </div>
                            <TokenEditorPanel tokens={tokens} saving={saving} onUpdate={update} />
                        </div>

                        {/* Right: Live preview */}
                        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 16 }}>
                                Live Preview
                                <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>— updates as you edit tokens</span>
                            </div>
                            <PreviewPanel />
                        </div>
                    </div>
                )}

                {tab === 'export' && <ExportPanel themeId={themeId} />}
            </div>
        </>
    );
}
