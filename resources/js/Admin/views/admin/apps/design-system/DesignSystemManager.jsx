/**
 * Design System Manager — Improved UI
 * Route: /apps/design-system-manager
 *
 * All text colors hardcoded — safe in both dark and light admin themes.
 * Uses CSS-variable injection for instant live preview.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { broadcastTokenChange } from '@admin/utils/designSystemSync';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';

const API = '/api/admin/design-system';

// ── Design constants (all hardcoded — not inherited) ──────────────────────────
const C = {
    bg:          '#ffffff',
    bgSurface:   '#f8fafc',
    bgHover:     '#f1f5f9',
    border:      '#e2e8f0',
    borderLight: '#f1f5f9',
    text:        '#0f172a',
    textSecond:  '#475569',
    textMuted:   '#94a3b8',
    accent:      '#3b82f6',
    accentSoft:  '#eff6ff',
    accentText:  '#1d4ed8',
    green:       '#16a34a',
    greenSoft:   '#dcfce7',
    purple:      '#7c3aed',
    purpleSoft:  '#f5f3ff',
    shadow:      '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    shadowMd:    '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
    radius:      '10px',
    radiusSm:    '6px',
    radiusXs:    '4px',
};

const CAT_ICONS = {
    color:   '🎨',
    radius:  '⬜',
    font:    '𝐓',
    spacing: '↔',
    shadow:  '◻',
    opacity: '◑',
    border:  '▭',
    animation: '⚡',
};
const CAT_ORDER  = ['color', 'radius', 'font', 'spacing', 'shadow', 'opacity', 'border', 'animation'];
const CAT_LABELS = { color: 'Colors', radius: 'Radius', font: 'Typography', spacing: 'Spacing', shadow: 'Shadows', opacity: 'Opacity', border: 'Border', animation: 'Animation' };

// ── API helper ────────────────────────────────────────────────────────────────
function call(path, opts = {}) {
    const xsrf = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
    return fetch(API + path, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrf },
        ...opts,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(r => r.status === 204 ? null : r.json());
}

// ── CSS injection ─────────────────────────────────────────────────────────────
function hexToRgb(hex) {
    const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : null;
}

function getLuminance(hex) {
    const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) return 0;
    return 0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16);
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
        const btnTextColor = getLuminance(v) > 160 ? '#212529' : '#ffffff';
        lines.push(`.btn-${n}{--bs-btn-bg:${v};--bs-btn-border-color:${v};--bs-btn-hover-bg:${v};--bs-btn-active-bg:${v};--bs-btn-color:${btnTextColor};--bs-btn-hover-color:${btnTextColor};--bs-btn-active-color:${btnTextColor}}`);
        lines.push(`.btn-outline-${n}{--bs-btn-color:${v};--bs-btn-border-color:${v};--bs-btn-hover-bg:${v};--bs-btn-hover-color:${btnTextColor};--bs-btn-active-color:${btnTextColor}}`);
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
    const [tokens, setTokens] = useState([]);
    const [saving, setSaving] = useState(null);
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
        const row = tokens.find(t => t.id === id);
        if (row) {
            mapRef.current = { ...mapRef.current, [row.name]: newValue };
            injectCss(buildCss(mapRef.current));
        }
        setTokens(prev => prev.map(t => t.id === id ? { ...t, value: newValue } : t));
        clearTimeout(timers.current[id]);
        timers.current[id] = setTimeout(() => {
            setSaving(id);
            call(`/tokens/${id}`, { method: 'PUT', body: { value: newValue } })
                .then(() => broadcastTokenChange(mapRef.current))
                .finally(() => setSaving(null));
        }, 600);
    }, [tokens]);

    return { tokens, saving, update };
}

// ── Token Editor Row ──────────────────────────────────────────────────────────
function TokenEditorRow({ token, onUpdate, isSaving }) {
    const [draft,   setDraft]   = useState(token.value);
    const [editing, setEditing] = useState(false);
    const [copied,  setCopied]  = useState(false);
    const [hover,   setHover]   = useState(false);
    const isColor = token.category === 'color' && /^#[0-9a-fA-F]{3,6}$/.test(token.value);

    useEffect(() => { setDraft(token.value); }, [token.value]);

    const handleColor = (hex) => { setDraft(hex); onUpdate(token.id, hex); };
    const commit = () => {
        setEditing(false);
        if (draft !== token.value) onUpdate(token.id, draft);
    };
    const copyValue = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(draft).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: C.radiusSm,
                background: hover ? C.bgHover : 'transparent',
                transition: 'background 0.12s',
                cursor: 'default',
            }}
        >
            {/* Swatch or type icon */}
            {isColor ? (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: C.radiusSm,
                        background: draft,
                        border: '2px solid rgba(0,0,0,0.10)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        cursor: 'pointer',
                    }} />
                    <input
                        type="color"
                        value={draft.length === 7 ? draft : '#000000'}
                        onChange={e => handleColor(e.target.value)}
                        style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
                    />
                </div>
            ) : (
                <div style={{
                    width: 32, height: 32, flexShrink: 0, borderRadius: C.radiusSm,
                    background: C.bgSurface, border: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, color: C.textSecond, fontWeight: 700,
                }}>
                    {CAT_ICONS[token.category] ?? '•'}
                </div>
            )}

            {/* Token name */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <code style={{
                    fontSize: 12, color: C.text, fontWeight: 500,
                    display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontFamily: '"Fira Code", "Cascadia Code", monospace',
                }}>
                    {token.name}
                </code>
                {isColor && (
                    <span style={{ fontSize: 10, color: C.textMuted, fontFamily: 'monospace' }}>
                        {getLuminance(draft) > 160 ? '○ Light' : '● Dark'}
                    </span>
                )}
            </div>

            {/* Value chip / editor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                {editing ? (
                    <input
                        autoFocus
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onBlur={commit}
                        onKeyDown={e => {
                            if (e.key === 'Enter')  commit();
                            if (e.key === 'Escape') { setDraft(token.value); setEditing(false); }
                        }}
                        style={{
                            width: 130, fontSize: 11, fontFamily: 'monospace',
                            padding: '5px 8px', border: `2px solid ${C.accent}`,
                            borderRadius: C.radiusXs, outline: 'none',
                            color: C.text, background: C.bg,
                            boxShadow: `0 0 0 3px ${C.accentSoft}`,
                        }}
                    />
                ) : (
                    <span
                        onClick={() => setEditing(true)}
                        title="Click to edit"
                        style={{
                            fontSize: 11, fontFamily: 'monospace',
                            color: C.text, background: C.bgSurface,
                            border: `1px solid ${C.border}`,
                            padding: '4px 8px', borderRadius: C.radiusXs,
                            cursor: 'text', maxWidth: 140,
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', display: 'inline-block',
                            fontWeight: 500,
                            transition: 'border-color 0.12s, background 0.12s',
                        }}
                    >
                        {draft}
                    </span>
                )}

                {/* Copy button (visible on hover) */}
                {hover && !editing && (
                    <button
                        onClick={copyValue}
                        title="Copy value"
                        style={{
                            width: 24, height: 24, border: 'none', borderRadius: C.radiusXs,
                            background: copied ? C.greenSoft : C.bgHover,
                            color: copied ? C.green : C.textMuted,
                            cursor: 'pointer', fontSize: 11, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        {copied ? '✓' : '⎘'}
                    </button>
                )}

                {/* Saving spinner */}
                {isSaving && (
                    <span style={{
                        width: 14, height: 14, borderRadius: '50%',
                        border: `2px solid ${C.accent}`, borderTopColor: 'transparent',
                        display: 'inline-block', animation: 'dsm-spin .6s linear infinite',
                        flexShrink: 0,
                    }} />
                )}
            </div>
        </div>
    );
}

// ── Token Editor Panel ────────────────────────────────────────────────────────
function TokenEditorPanel({ tokens, saving, onUpdate }) {
    const [search,    setSearch]    = useState('');
    const [catFilter, setCatFilter] = useState('all');

    const filtered = tokens.filter(t =>
        (catFilter === 'all' || t.category === catFilter) &&
        (!search || t.name.toLowerCase().includes(search.toLowerCase()) || t.value.toLowerCase().includes(search.toLowerCase()))
    );
    const grouped  = filtered.reduce((acc, t) => { (acc[t.category] ??= []).push(t); return acc; }, {});
    const cats     = ['all', ...CAT_ORDER.filter(c => tokens.some(t => t.category === c))];
    const catCounts = cats.reduce((acc, c) => {
        acc[c] = c === 'all' ? tokens.length : tokens.filter(t => t.category === c).length;
        return acc;
    }, {});

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>

            {/* Search */}
            <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: C.textMuted, pointerEvents: 'none' }}>⌕</span>
                <input
                    placeholder="Search tokens or values…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: '100%', padding: '8px 10px 8px 30px',
                        border: `1.5px solid ${C.border}`, borderRadius: C.radiusSm,
                        fontSize: 12, outline: 'none', background: C.bg,
                        color: C.text, boxSizing: 'border-box',
                        transition: 'border-color 0.15s',
                        fontFamily: 'inherit',
                    }}
                    onFocus={e => e.target.style.borderColor = C.accent}
                    onBlur={e => e.target.style.borderColor = C.border}
                />
            </div>

            {/* Category pills */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {cats.map(c => {
                    const active = catFilter === c;
                    return (
                        <button
                            key={c}
                            onClick={() => setCatFilter(c)}
                            style={{
                                padding: '4px 10px', borderRadius: 20, border: 'none',
                                cursor: 'pointer', fontSize: 11, fontWeight: active ? 700 : 500,
                                background: active ? C.accent : C.bgSurface,
                                color: active ? '#fff' : C.textSecond,
                                display: 'flex', alignItems: 'center', gap: 4,
                                transition: 'all 0.12s',
                                boxShadow: active ? `0 1px 3px rgba(59,130,246,0.3)` : 'none',
                            }}
                        >
                            {c !== 'all' && <span style={{ fontSize: 10 }}>{CAT_ICONS[c] ?? ''}</span>}
                            {c === 'all' ? 'All' : CAT_LABELS[c] ?? c}
                            <span style={{
                                fontSize: 10, fontWeight: 700,
                                background: active ? 'rgba(255,255,255,0.25)' : C.border,
                                color: active ? '#fff' : C.textMuted,
                                padding: '1px 5px', borderRadius: 10,
                            }}>{catCounts[c]}</span>
                        </button>
                    );
                })}
            </div>

            {/* Token list */}
            <div style={{ overflowY: 'auto', flex: 1, marginRight: -4, paddingRight: 4 }}>
                {Object.entries(grouped).sort(([a], [b]) => CAT_ORDER.indexOf(a) - CAT_ORDER.indexOf(b)).map(([cat, rows]) => (
                    <div key={cat} style={{ marginBottom: 8 }}>
                        {/* Group header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 10px', marginBottom: 2,
                            borderRadius: C.radiusSm,
                            background: C.bgSurface,
                        }}>
                            <span style={{ fontSize: 13 }}>{CAT_ICONS[cat] ?? '•'}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.textSecond }}>
                                {CAT_LABELS[cat] ?? cat}
                            </span>
                            <span style={{ marginLeft: 'auto', fontSize: 10, color: C.textMuted, fontWeight: 600 }}>{rows.length}</span>
                        </div>
                        {rows.map(t => (
                            <TokenEditorRow key={t.id} token={t} onUpdate={onUpdate} isSaving={saving === t.id} />
                        ))}
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
                        <p style={{ color: C.textMuted, fontSize: 13, margin: 0, fontWeight: 500 }}>No tokens found</p>
                        <p style={{ color: C.textMuted, fontSize: 12, margin: '4px 0 0' }}>Try a different search</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Live Preview Panel ────────────────────────────────────────────────────────
const BTN_SECTIONS = [
    { label: 'Solid',            cls: v => `btn btn-${v}` },
    { label: 'Rounded Solid',    cls: v => `btn btn-${v} rounded-pill` },
    { label: 'Outline',          cls: v => `btn btn-outline-${v}` },
    { label: 'Outline Rounded',  cls: v => `btn btn-outline-${v} rounded-pill` },
    { label: 'Soft',             cls: v => `btn btn-soft-${v}` },
    { label: 'Ghost',            cls: v => `btn btn-ghost-${v}` },
    { label: 'Gradient',         cls: v => `btn btn-${v} bg-gradient` },
];
const VARIANTS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info'];

function SectionLabel({ label }) {
    return (
        <p style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: C.textMuted,
            margin: '0 0 8px',
        }}>
            {label}
        </p>
    );
}

function PreviewPanel() {
    const [previewTab, setPreviewTab] = useState('buttons');
    const PREVIEW_TABS = [
        { id: 'buttons', label: 'Buttons' },
        { id: 'sizes',   label: 'Sizes & States' },
        { id: 'ui',      label: 'UI Elements' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Preview sub-tabs */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: C.bgSurface, borderRadius: C.radiusSm, padding: 3 }}>
                {PREVIEW_TABS.map(t => (
                    <button key={t.id} onClick={() => setPreviewTab(t.id)}
                        style={{
                            flex: 1, padding: '6px 12px', border: 'none', cursor: 'pointer',
                            borderRadius: C.radiusXs, fontSize: 12, fontWeight: 600,
                            background: previewTab === t.id ? C.bg : 'transparent',
                            color: previewTab === t.id ? C.text : C.textMuted,
                            boxShadow: previewTab === t.id ? C.shadow : 'none',
                            transition: 'all 0.15s',
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>

                {/* Buttons tab */}
                {previewTab === 'buttons' && BTN_SECTIONS.map(({ label, cls }) => (
                    <div key={label} style={{ marginBottom: 20 }}>
                        <SectionLabel label={label} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {VARIANTS.map(v => (
                                <button key={v} className={cls(v)} style={{ fontSize: 12 }}>
                                    {v.charAt(0).toUpperCase() + v.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Sizes & States tab */}
                {previewTab === 'sizes' && (
                    <>
                        <div style={{ marginBottom: 20 }}>
                            <SectionLabel label="Sizes" />
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <button className="btn btn-primary btn-lg">Large</button>
                                <button className="btn btn-primary">Normal</button>
                                <button className="btn btn-primary btn-sm">Small</button>
                            </div>
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <SectionLabel label="Disabled" />
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {['primary', 'success', 'danger', 'warning', 'info'].map(v => (
                                    <button key={v} className={`btn btn-${v}`} disabled>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <SectionLabel label="Block" />
                            <div style={{ display: 'grid', gap: 6 }}>
                                <button className="btn btn-primary">Block Primary</button>
                                <button className="btn btn-success bg-gradient">Block Gradient</button>
                                <button className="btn btn-outline-secondary">Block Outline</button>
                            </div>
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <SectionLabel label="Loading (simulate)" />
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {['primary', 'success', 'danger'].map(v => (
                                    <button key={v} className={`btn btn-${v}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', display: 'inline-block', animation: 'dsm-spin .6s linear infinite' }} />
                                        Loading
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* UI Elements tab */}
                {previewTab === 'ui' && (
                    <>
                        {/* Badges */}
                        <div style={{ marginBottom: 20 }}>
                            <SectionLabel label="Badges" />
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {VARIANTS.map(v => (
                                    <span key={v} className={`badge bg-${v}`}>{v.charAt(0).toUpperCase() + v.slice(1)}</span>
                                ))}
                            </div>
                        </div>

                        {/* Alerts */}
                        <div style={{ marginBottom: 20 }}>
                            <SectionLabel label="Alerts" />
                            {['primary', 'success', 'danger', 'warning'].map(v => (
                                <div key={v} className={`alert alert-${v} py-2 px-3 mb-2`} style={{ fontSize: 12 }}>
                                    {v.charAt(0).toUpperCase() + v.slice(1)}: This is an alert message.
                                </div>
                            ))}
                        </div>

                        {/* Progress */}
                        <div style={{ marginBottom: 20 }}>
                            <SectionLabel label="Progress Bars" />
                            {[
                                { v: 'primary',   p: 75 },
                                { v: 'success',   p: 55 },
                                { v: 'warning',   p: 40 },
                                { v: 'danger',    p: 25 },
                            ].map(({ v, p }) => (
                                <div key={v} style={{ marginBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                        <span style={{ fontSize: 11, color: C.textSecond, fontWeight: 500 }}>{v.charAt(0).toUpperCase() + v.slice(1)}</span>
                                        <span style={{ fontSize: 11, color: C.textMuted }}>{p}%</span>
                                    </div>
                                    <div className={`progress`} style={{ height: 8 }}>
                                        <div className={`progress-bar bg-${v}`} style={{ width: `${p}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Card sample */}
                        <div style={{ marginBottom: 20 }}>
                            <SectionLabel label="Card" />
                            <div className="card" style={{ fontSize: 12 }}>
                                <div className="card-body p-3">
                                    <h6 className="card-title mb-1" style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>Sample Card</h6>
                                    <p className="card-text mb-2" style={{ color: C.textSecond, fontSize: 12 }}>Uses border-radius and shadow tokens.</p>
                                    <button className="btn btn-primary btn-sm">Action</button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ── Export Tab ────────────────────────────────────────────────────────────────
function ExportPanel({ themeId }) {
    const [output, setOutput] = useState('');
    const [format, setFormat] = useState('json');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);

    const formats = [
        { id: 'json',    label: 'Token JSON',     icon: '{ }' },
        { id: 'css',     label: 'CSS Variables',  icon: '#'   },
        { id: 'tailwind',label: 'Tailwind Config', icon: '⚙'  },
        { id: 'dts',     label: 'W3C DTS',        icon: '◈'   },
    ];

    const doExport = async () => {
        setLoading(true);
        const paths = {
            json:     `/themes/${themeId}/export/json`,
            css:      `/themes/${themeId}/export/css`,
            tailwind: `/themes/${themeId}/export/tailwind`,
            dts:      `/themes/${themeId}/export/dts`,
        };
        const res  = await fetch(API + paths[format]);
        const data = format === 'css' ? await res.text() : await res.json();
        setOutput(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
        setLoading(false);
    };

    const copy = () => {
        navigator.clipboard.writeText(output).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const dl = () => {
        const ext = { json: 'json', css: 'css', tailwind: 'js', dts: 'json' }[format];
        const a = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(new Blob([output], { type: 'text/plain' })),
            download: `design-tokens.${ext}`,
        });
        a.click();
    };

    return (
        <div>
            {/* Format selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {formats.map(f => {
                    const active = format === f.id;
                    return (
                        <button
                            key={f.id}
                            onClick={() => setFormat(f.id)}
                            style={{
                                padding: '10px 18px', borderRadius: C.radiusSm,
                                border: `2px solid ${active ? C.accent : C.border}`,
                                cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500,
                                background: active ? C.accentSoft : C.bg,
                                color: active ? C.accentText : C.textSecond,
                                display: 'flex', alignItems: 'center', gap: 7,
                                transition: 'all 0.15s',
                            }}
                        >
                            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800 }}>{f.icon}</span>
                            {f.label}
                        </button>
                    );
                })}

                <button
                    onClick={doExport}
                    disabled={loading}
                    style={{
                        marginLeft: 'auto', padding: '10px 22px',
                        background: C.purple, color: '#fff', border: 'none',
                        borderRadius: C.radiusSm, cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: 13, fontWeight: 700, opacity: loading ? 0.7 : 1,
                        display: 'flex', alignItems: 'center', gap: 6,
                        boxShadow: `0 2px 6px rgba(124,58,237,0.3)`,
                    }}
                >
                    {loading ? (
                        <>
                            <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', display: 'inline-block', animation: 'dsm-spin .6s linear infinite' }} />
                            Generating…
                        </>
                    ) : '⬇ Generate'}
                </button>
            </div>

            {/* Output */}
            {output ? (
                <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>
                            {output.split('\n').length} lines · {(output.length / 1024).toFixed(1)} KB
                        </span>
                        <button onClick={copy} style={{ marginLeft: 'auto', padding: '6px 14px', border: `1.5px solid ${C.border}`, borderRadius: C.radiusSm, background: copied ? C.greenSoft : C.bg, color: copied ? C.green : C.textSecond, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                            {copied ? '✓ Copied' : '⎘ Copy'}
                        </button>
                        <button onClick={dl} style={{ padding: '6px 14px', border: `1.5px solid ${C.border}`, borderRadius: C.radiusSm, background: C.bg, color: C.textSecond, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                            ↓ Download
                        </button>
                    </div>
                    <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 20, borderRadius: C.radius, fontSize: 12, lineHeight: 1.7, overflow: 'auto', maxHeight: 520, margin: 0, border: `1px solid ${C.border}` }}>
                        {output}
                    </pre>
                </div>
            ) : (
                <div style={{ background: C.bgSurface, border: `2px dashed ${C.border}`, borderRadius: C.radius, padding: '56px 32px', textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                    <p style={{ color: C.textSecond, fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Ready to export</p>
                    <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>Select a format above and click <strong style={{ color: C.text }}>Generate</strong></p>
                </div>
            )}
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

    if (!themeId) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.accent, animation: 'dsm-spin .8s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>Loading tokens…</p>
            </div>
        </div>
    );

    const TABS = [
        { id: 'editor', label: '✏ Token Editor', sub: 'Live preview' },
        { id: 'export', label: '📦 Export',       sub: 'JSON, CSS, Tailwind' },
    ];

    const colorCount   = tokens.filter(t => t.category === 'color').length;
    const savingCount  = saving ? 1 : 0;

    return (
        <>
            <style>{`
                @keyframes dsm-spin { to { transform: rotate(360deg); } }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: ${C.textMuted}; }
            `}</style>

            <PageBreadcrumb title="Design System Manager" subtitle="Apps" />

            <div style={{ padding: '0 2px' }}>

                {/* ── Page header ─────────────────────────────────────────── */}
                <div style={{
                    background: C.bg, borderRadius: C.radius,
                    border: `1px solid ${C.border}`,
                    padding: '16px 20px', marginBottom: 16,
                    display: 'flex', alignItems: 'center', gap: 16,
                    boxShadow: C.shadow,
                }}>
                    {/* Icon + title */}
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎨</div>
                    <div style={{ flex: 1 }}>
                        <h5 style={{ margin: 0, fontWeight: 800, fontSize: 16, color: C.text }}>Design System Manager</h5>
                        <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>Edit tokens — preview updates instantly in real-time</p>
                    </div>

                    {/* Stats chips */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ padding: '5px 12px', background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 20, fontSize: 12, color: C.textSecond, fontWeight: 600 }}>
                            🎨 {colorCount} colors
                        </div>
                        <div style={{ padding: '5px 12px', background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 20, fontSize: 12, color: C.textSecond, fontWeight: 600 }}>
                            ◈ {tokens.length} tokens
                        </div>
                        {savingCount > 0 && (
                            <div style={{ padding: '5px 12px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 20, fontSize: 12, color: '#854d0e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #854d0e', borderTopColor: 'transparent', display: 'inline-block', animation: 'dsm-spin .6s linear infinite' }} />
                                Saving…
                            </div>
                        )}
                    </div>

                    {/* Theme selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, whiteSpace: 'nowrap' }}>Theme:</label>
                        <select
                            value={themeId}
                            onChange={e => setThemeId(Number(e.target.value))}
                            style={{
                                padding: '7px 12px', border: `1.5px solid ${C.border}`,
                                borderRadius: C.radiusSm, fontSize: 13, outline: 'none',
                                color: C.text, background: C.bg, cursor: 'pointer', fontWeight: 600,
                            }}
                        >
                            {themes.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.name}{t.is_default ? ' ★' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Tab bar ─────────────────────────────────────────────── */}
                <div style={{
                    display: 'flex', gap: 4, marginBottom: 16,
                    background: C.bg, borderRadius: C.radius,
                    border: `1px solid ${C.border}`, padding: 5,
                    boxShadow: C.shadow,
                }}>
                    {TABS.map(t => {
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                style={{
                                    padding: '10px 20px', border: 'none', cursor: 'pointer',
                                    borderRadius: C.radiusSm, fontSize: 13, fontWeight: active ? 700 : 500,
                                    background: active ? C.accentSoft : 'transparent',
                                    color: active ? C.accentText : C.textSecond,
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    transition: 'all 0.15s',
                                    boxShadow: active ? `inset 0 0 0 1.5px ${C.accent}` : 'none',
                                }}
                            >
                                {t.label}
                                <span style={{ fontSize: 10, color: active ? C.accent : C.textMuted, fontWeight: 500 }}>{t.sub}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Token Editor + Live Preview ──────────────────────────── */}
                {tab === 'editor' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, height: 'calc(100vh - 260px)', minHeight: 500 }}>

                        {/* Left: Token editor */}
                        <div style={{
                            background: C.bg, borderRadius: C.radius, padding: '16px',
                            boxShadow: C.shadow, border: `1px solid ${C.border}`,
                            display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.borderLight}` }}>
                                <span style={{ fontSize: 14 }}>🧩</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Design Tokens</span>
                                <span style={{ marginLeft: 'auto', fontSize: 10, color: C.textMuted, background: C.bgSurface, border: `1px solid ${C.border}`, padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>
                                    click value to edit
                                </span>
                            </div>
                            <TokenEditorPanel tokens={tokens} saving={saving} onUpdate={update} />
                        </div>

                        {/* Right: Live preview */}
                        <div style={{
                            background: C.bg, borderRadius: C.radius, padding: '16px 20px',
                            boxShadow: C.shadow, border: `1px solid ${C.border}`,
                            overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.borderLight}` }}>
                                <span style={{ fontSize: 14 }}>👁</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Live Preview</span>
                                <span style={{ marginLeft: 'auto', fontSize: 10, color: C.green, background: C.greenSoft, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                                    ● Live
                                </span>
                            </div>
                            <PreviewPanel />
                        </div>
                    </div>
                )}

                {/* ── Export tab ───────────────────────────────────────────── */}
                {tab === 'export' && (
                    <div style={{ background: C.bg, borderRadius: C.radius, padding: 24, boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.borderLight}` }}>
                            <span style={{ fontSize: 14 }}>📦</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Export Tokens</span>
                            <span style={{ fontSize: 12, color: C.textMuted }}>— download your design system in multiple formats</span>
                        </div>
                        <ExportPanel themeId={themeId} />
                    </div>
                )}
            </div>
        </>
    );
}
