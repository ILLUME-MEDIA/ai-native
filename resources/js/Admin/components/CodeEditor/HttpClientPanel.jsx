import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Send, Plus, Trash2, FolderPlus, Save, ChevronRight, ChevronDown, Copy } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const METHOD_COLORS = { GET: '#3fb950', POST: '#ff9f1c', PUT: '#58a6ff', PATCH: '#bc8cff', DELETE: '#f85149', HEAD: '#8b949e', OPTIONS: '#8b949e' };
const BODY_TYPES = ['none', 'json', 'form', 'raw'];
const AUTH_TYPES = ['none', 'bearer', 'basic', 'apikey'];

const DEFAULT_REQ = { method: 'GET', url: '', headers: [], params: [], body: '', body_type: 'none', auth_type: 'none', auth_data: {} };

function KvEditor({ label, rows, onChange }) {
    const add    = () => onChange([...rows, { key: '', value: '', enabled: true }]);
    const remove = (i) => onChange(rows.filter((_, j) => j !== i));
    const set    = (i, field, val) => { const next = [...rows]; next[i] = { ...next[i], [field]: val }; onChange(next); };

    const t = { text: '#c9d1d9', text3: '#8b949e', bg2: '#161b22', border: '#30363d', accent: '#ff6b35' };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ color: t.text3, fontSize: '9px', letterSpacing: '0.06em' }}>{label}</span>
                <button onClick={add} style={{ background: 'none', border: 'none', color: t.text3, cursor: 'pointer', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Plus size={9} /> Add
                </button>
            </div>
            {rows.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: '4px', marginBottom: '3px', alignItems: 'center' }}>
                    <input type="checkbox" checked={row.enabled} onChange={e => set(i, 'enabled', e.target.checked)} style={{ accentColor: t.accent, flexShrink: 0 }} />
                    <input value={row.key} onChange={e => set(i, 'key', e.target.value)} placeholder="Key"
                        style={{ flex: 1, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: '3px', color: t.text, padding: '2px 6px', fontSize: '10px', outline: 'none', fontFamily: 'inherit' }} />
                    <input value={row.value} onChange={e => set(i, 'value', e.target.value)} placeholder="Value"
                        style={{ flex: 1, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: '3px', color: t.text, padding: '2px 6px', fontSize: '10px', outline: 'none', fontFamily: 'inherit' }} />
                    <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: '#f85149', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>
                        <Trash2 size={9} />
                    </button>
                </div>
            ))}
        </div>
    );
}

export default function HttpClientPanel({ workspace }) {
    const [collections, setCollections]   = useState([]);
    const [expanded, setExpanded]         = useState({});   // collection id → bool
    const [req, setReq]                   = useState(DEFAULT_REQ);
    const [reqName, setReqName]           = useState('');
    const [activeTab, setActiveTab]       = useState('params'); // params | headers | body | auth
    const [sending, setSending]           = useState(false);
    const [response, setResponse]         = useState(null);  // { status, headers, body, is_json, size, elapsed_ms }
    const [resTab, setResTab]             = useState('body'); // body | headers
    const [newCollName, setNewCollName]   = useState('');
    const [showNewColl, setShowNewColl]   = useState(false);
    const [saveTarget, setSaveTarget]     = useState(null);  // collection id to save into

    const updateReq = (patch) => setReq(r => ({ ...r, ...patch }));

    // ── Load collections ─────────────────────────────────────────────────────
    const loadCollections = useCallback(async () => {
        if (!workspace) return;
        try {
            const { data } = await axios.get(`/api/workspaces/${workspace.id}/http-client/collections`);
            setCollections(data.collections || []);
        } catch { /* no collections yet */ }
    }, [workspace]);

    useEffect(() => { loadCollections(); }, [loadCollections]);

    // ── Send request ─────────────────────────────────────────────────────────
    const send = useCallback(async () => {
        if (!workspace || sending || !req.url) return;
        setSending(true);
        setResponse(null);
        try {
            const enabledHeaders = Object.fromEntries((req.headers || []).filter(h => h.enabled && h.key).map(h => [h.key, h.value]));
            const enabledParams  = Object.fromEntries((req.params  || []).filter(p => p.enabled && p.key).map(p => [p.key, p.value]));

            const { data } = await axios.post(`/api/workspaces/${workspace.id}/http-client/send`, {
                method:    req.method,
                url:       req.url,
                headers:   enabledHeaders,
                params:    enabledParams,
                body:      req.body,
                body_type: req.body_type,
                auth_type: req.auth_type,
                auth_data: req.auth_data,
            });
            setResponse(data);
            setResTab('body');
        } catch (err) {
            toast.error(err.response?.data?.error || err.response?.data?.message || 'Request failed');
        } finally {
            setSending(false);
        }
    }, [workspace, req, sending]);

    // ── Save request ─────────────────────────────────────────────────────────
    const saveRequest = useCallback(async (collectionId) => {
        if (!reqName.trim()) { toast.error('Give the request a name first'); return; }
        const enabledHeaders = Object.fromEntries((req.headers || []).filter(h => h.enabled && h.key).map(h => [h.key, h.value]));
        const enabledParams  = Object.fromEntries((req.params  || []).filter(p => p.enabled && p.key).map(p => [p.key, p.value]));
        try {
            await axios.post(`/api/workspaces/${workspace.id}/http-client/collections/${collectionId}/requests`, {
                name: reqName, method: req.method, url: req.url,
                headers: enabledHeaders, params: enabledParams,
                body: req.body, body_type: req.body_type,
                auth_type: req.auth_type, auth_data: req.auth_data,
            });
            toast.success('Request saved');
            setSaveTarget(null);
            loadCollections();
        } catch { toast.error('Failed to save'); }
    }, [req, reqName, workspace, loadCollections]);

    // ── Create collection ─────────────────────────────────────────────────────
    const createCollection = useCallback(async () => {
        if (!newCollName.trim()) return;
        try {
            await axios.post(`/api/workspaces/${workspace.id}/http-client/collections`, { name: newCollName });
            setNewCollName('');
            setShowNewColl(false);
            loadCollections();
        } catch { toast.error('Failed to create collection'); }
    }, [newCollName, workspace, loadCollections]);

    // ── Delete collection ─────────────────────────────────────────────────────
    const deleteCollection = useCallback(async (id) => {
        try {
            await axios.delete(`/api/workspaces/${workspace.id}/http-client/collections/${id}`);
            loadCollections();
        } catch { toast.error('Failed to delete'); }
    }, [workspace, loadCollections]);

    // ── Load saved request into editor ────────────────────────────────────────
    const loadSavedRequest = useCallback((saved) => {
        const parseObj = (v) => {
            if (!v) return [];
            const obj = typeof v === 'string' ? JSON.parse(v) : v;
            return Object.entries(obj).map(([key, value]) => ({ key, value, enabled: true }));
        };
        setReq({
            method:    saved.method,
            url:       saved.url,
            headers:   parseObj(saved.headers),
            params:    parseObj(saved.params),
            body:      saved.body || '',
            body_type: saved.body_type || 'none',
            auth_type: saved.auth_type || 'none',
            auth_data: typeof saved.auth_data === 'string' ? JSON.parse(saved.auth_data || '{}') : (saved.auth_data || {}),
        });
        setReqName(saved.name);
        setResponse(null);
    }, []);

    // ── Status color ─────────────────────────────────────────────────────────
    const statusColor = (code) => {
        if (code >= 500) return '#f85149';
        if (code >= 400) return '#ff9f1c';
        if (code >= 300) return '#bc8cff';
        return '#3fb950';
    };

    // ── Styles ───────────────────────────────────────────────────────────────
    const t = { bg: '#0d0f14', bg2: '#161b22', border: '#30363d', text: '#c9d1d9', text3: '#8b949e', accent: '#ff6b35' };

    const inputStyle = {
        background: t.bg2, border: `1px solid ${t.border}`, borderRadius: '4px',
        color: t.text, padding: '4px 8px', fontSize: '11px', fontFamily: 'inherit', outline: 'none',
    };

    const tabBtn = (active) => ({
        background: 'none', border: 'none', cursor: 'pointer',
        color: active ? t.accent : t.text3,
        borderBottom: active ? `2px solid ${t.accent}` : '2px solid transparent',
        padding: '4px 10px', fontSize: '9px', fontWeight: '600', letterSpacing: '0.08em', fontFamily: 'inherit',
    });

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', height: '100%', background: t.bg, fontFamily: "'JetBrains Mono', monospace", color: t.text, fontSize: '11px' }}>

            {/* ── Left sidebar: Collections ── */}
            <div style={{ width: '220px', flexShrink: 0, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '9px', color: t.text3, letterSpacing: '0.08em' }}>COLLECTIONS</span>
                    <button onClick={() => setShowNewColl(v => !v)} title="New collection"
                        style={{ background: 'none', border: 'none', color: t.text3, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <FolderPlus size={12} />
                    </button>
                </div>

                {showNewColl && (
                    <div style={{ padding: '6px 8px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: '4px' }}>
                        <input
                            autoFocus
                            value={newCollName}
                            onChange={e => setNewCollName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') createCollection(); if (e.key === 'Escape') setShowNewColl(false); }}
                            placeholder="Collection name…"
                            style={{ ...inputStyle, flex: 1, padding: '2px 6px', fontSize: '10px' }}
                        />
                        <button onClick={createCollection} style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: '3px', color: t.accent, cursor: 'pointer', padding: '2px 6px', fontSize: '9px', fontFamily: 'inherit' }}>Add</button>
                    </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {collections.length === 0 && (
                        <div style={{ padding: '12px', color: t.text3, fontSize: '10px', textAlign: 'center' }}>No collections yet</div>
                    )}
                    {collections.map(coll => (
                        <div key={coll.id}>
                            <div
                                onClick={() => setExpanded(e => ({ ...e, [coll.id]: !e[coll.id] }))}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 8px', cursor: 'pointer', borderBottom: `1px solid ${t.border}` }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,53,0.06)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >
                                {expanded[coll.id] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px' }}>{coll.name}</span>
                                <button onClick={e => { e.stopPropagation(); deleteCollection(coll.id); }}
                                    style={{ background: 'none', border: 'none', color: '#f85149', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.6 }}>
                                    <Trash2 size={9} />
                                </button>
                            </div>
                            {expanded[coll.id] && (coll.requests || []).map(r => (
                                <div
                                    key={r.id}
                                    onClick={() => loadSavedRequest(r)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 8px 3px 20px', cursor: 'pointer', borderBottom: `1px solid rgba(48,54,61,0.4)` }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,53,0.06)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                >
                                    <span style={{ color: METHOD_COLORS[r.method] || t.text3, fontSize: '8px', fontWeight: 700, width: '32px', flexShrink: 0 }}>{r.method}</span>
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px' }}>{r.name}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Main area ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* URL bar */}
                <div style={{ display: 'flex', gap: '6px', padding: '8px 10px', borderBottom: `1px solid ${t.border}`, flexShrink: 0, alignItems: 'center' }}>
                    <select
                        value={req.method}
                        onChange={e => updateReq({ method: e.target.value })}
                        style={{ ...inputStyle, color: METHOD_COLORS[req.method] || t.text, fontWeight: 700, padding: '4px 6px', width: '90px' }}
                    >
                        {METHODS.map(m => <option key={m} value={m} style={{ color: METHOD_COLORS[m] }}>{m}</option>)}
                    </select>

                    <input
                        value={req.url}
                        onChange={e => updateReq({ url: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') send(); }}
                        placeholder="https://api.example.com/endpoint"
                        style={{ ...inputStyle, flex: 1 }}
                    />

                    <button
                        onClick={send}
                        disabled={sending || !req.url}
                        style={{
                            background: sending ? 'rgba(255,107,53,0.3)' : 'rgba(255,107,53,0.15)',
                            border: '1px solid rgba(255,107,53,0.4)', borderRadius: '4px',
                            color: t.accent, cursor: sending ? 'wait' : 'pointer',
                            padding: '4px 12px', fontSize: '10px', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
                        }}
                    >
                        <Send size={10} />
                        {sending ? 'Sending…' : 'Send'}
                    </button>
                </div>

                {/* Request tabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${t.border}`, flexShrink: 0, alignItems: 'center' }}>
                    {['params', 'headers', 'body', 'auth'].map(tab => (
                        <button key={tab} style={tabBtn(activeTab === tab)} onClick={() => setActiveTab(tab)}>
                            {tab.toUpperCase()}
                        </button>
                    ))}
                    {/* Save button */}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', padding: '0 8px', alignItems: 'center' }}>
                        <input value={reqName} onChange={e => setReqName(e.target.value)} placeholder="Request name…"
                            style={{ ...inputStyle, padding: '2px 6px', fontSize: '9px', width: '120px' }} />
                        <select value={saveTarget || ''} onChange={e => setSaveTarget(e.target.value || null)}
                            style={{ ...inputStyle, padding: '2px 4px', fontSize: '9px' }}>
                            <option value="">Collection…</option>
                            {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={() => saveTarget && saveRequest(saveTarget)} disabled={!saveTarget || !reqName}
                            style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: '3px', color: t.text3, cursor: 'pointer', padding: '2px 6px', fontSize: '9px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Save size={9} /> Save
                        </button>
                    </div>
                </div>

                {/* Tab content */}
                <div style={{ padding: '10px', flexShrink: 0, borderBottom: `1px solid ${t.border}`, maxHeight: '200px', overflowY: 'auto' }}>
                    {activeTab === 'params' && (
                        <KvEditor label="QUERY PARAMS" rows={req.params || []} onChange={v => updateReq({ params: v })} />
                    )}
                    {activeTab === 'headers' && (
                        <KvEditor label="HEADERS" rows={req.headers || []} onChange={v => updateReq({ headers: v })} />
                    )}
                    {activeTab === 'body' && (
                        <div>
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                                <span style={{ color: t.text3, fontSize: '9px' }}>BODY TYPE</span>
                                {BODY_TYPES.map(bt => (
                                    <button key={bt} onClick={() => updateReq({ body_type: bt })}
                                        style={{ background: req.body_type === bt ? 'rgba(255,107,53,0.15)' : 'none', border: `1px solid ${req.body_type === bt ? 'rgba(255,107,53,0.4)' : t.border}`, borderRadius: '3px', color: req.body_type === bt ? t.accent : t.text3, cursor: 'pointer', padding: '2px 6px', fontSize: '9px', fontFamily: 'inherit' }}>
                                        {bt}
                                    </button>
                                ))}
                            </div>
                            {req.body_type !== 'none' && (
                                <textarea value={req.body} onChange={e => updateReq({ body: e.target.value })}
                                    placeholder={req.body_type === 'json' ? '{\n  "key": "value"\n}' : req.body_type === 'form' ? 'key=value\nother=data' : 'Raw body…'}
                                    style={{ ...inputStyle, width: '100%', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }} />
                            )}
                        </div>
                    )}
                    {activeTab === 'auth' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{ color: t.text3, fontSize: '9px' }}>AUTH TYPE</span>
                                {AUTH_TYPES.map(at => (
                                    <button key={at} onClick={() => updateReq({ auth_type: at, auth_data: {} })}
                                        style={{ background: req.auth_type === at ? 'rgba(255,107,53,0.15)' : 'none', border: `1px solid ${req.auth_type === at ? 'rgba(255,107,53,0.4)' : t.border}`, borderRadius: '3px', color: req.auth_type === at ? t.accent : t.text3, cursor: 'pointer', padding: '2px 6px', fontSize: '9px', fontFamily: 'inherit' }}>
                                        {at}
                                    </button>
                                ))}
                            </div>
                            {req.auth_type === 'bearer' && (
                                <input value={req.auth_data.token || ''} onChange={e => updateReq({ auth_data: { token: e.target.value } })}
                                    placeholder="Bearer token…" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                            )}
                            {req.auth_type === 'basic' && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input value={req.auth_data.username || ''} onChange={e => updateReq({ auth_data: { ...req.auth_data, username: e.target.value } })}
                                        placeholder="Username" style={{ ...inputStyle, flex: 1 }} />
                                    <input type="password" value={req.auth_data.password || ''} onChange={e => updateReq({ auth_data: { ...req.auth_data, password: e.target.value } })}
                                        placeholder="Password" style={{ ...inputStyle, flex: 1 }} />
                                </div>
                            )}
                            {req.auth_type === 'apikey' && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input value={req.auth_data.key || ''} onChange={e => updateReq({ auth_data: { ...req.auth_data, key: e.target.value } })}
                                        placeholder="Header name (e.g. X-API-Key)" style={{ ...inputStyle, flex: 1 }} />
                                    <input value={req.auth_data.value || ''} onChange={e => updateReq({ auth_data: { ...req.auth_data, value: e.target.value } })}
                                        placeholder="Value" style={{ ...inputStyle, flex: 1 }} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Response */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {!response && !sending && (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text3, flexDirection: 'column', gap: '8px' }}>
                            <Send size={24} color="#30363d" />
                            <span>Send a request to see the response</span>
                        </div>
                    )}

                    {sending && (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff9f1c' }}>
                            Sending…
                        </div>
                    )}

                    {response && (
                        <>
                            {/* Response status bar */}
                            <div style={{ display: 'flex', gap: '12px', padding: '5px 10px', borderBottom: `1px solid ${t.border}`, flexShrink: 0, alignItems: 'center' }}>
                                <span style={{ color: statusColor(response.status), fontWeight: 700 }}>{response.status} {response.status_text}</span>
                                <span style={{ color: t.text3 }}>{response.elapsed_ms}ms</span>
                                <span style={{ color: t.text3 }}>{response.size > 1024 ? (response.size / 1024).toFixed(1) + ' KB' : response.size + ' B'}</span>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(response.body); toast.success('Copied'); }}
                                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: t.text3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontFamily: 'inherit' }}
                                >
                                    <Copy size={9} /> Copy
                                </button>

                                {/* Response tabs */}
                                {['body', 'headers'].map(tab => (
                                    <button key={tab} style={tabBtn(resTab === tab)} onClick={() => setResTab(tab)}>
                                        {tab.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            {/* Response body */}
                            <div style={{ flex: 1, overflow: 'auto', padding: '8px 10px' }}>
                                {resTab === 'body' && (
                                    <pre style={{ margin: 0, fontSize: '10px', color: t.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {response.is_json
                                            ? JSON.stringify(JSON.parse(response.body), null, 2)
                                            : response.body}
                                    </pre>
                                )}
                                {resTab === 'headers' && (
                                    <div>
                                        {Object.entries(response.headers || {}).map(([k, v]) => (
                                            <div key={k} style={{ display: 'flex', gap: '8px', padding: '2px 0', borderBottom: `1px solid rgba(48,54,61,0.4)` }}>
                                                <span style={{ color: t.accent, fontSize: '10px', minWidth: '160px' }}>{k}</span>
                                                <span style={{ color: t.text, fontSize: '10px' }}>{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
