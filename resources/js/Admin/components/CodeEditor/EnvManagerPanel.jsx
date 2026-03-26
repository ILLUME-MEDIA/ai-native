import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Eye, EyeOff, RefreshCw, Save, Key, AlertTriangle, CheckCircle, Info, Plus, Trash2, Loader } from 'lucide-react';
import { toast } from 'react-toastify';

const STATUS_CONFIG = {
    set:     { color: '#3fb950', label: '✓ set',     title: 'Set in .env' },
    extra:   { color: '#388bfd', label: '+ extra',   title: 'In .env but not in .env.example' },
    missing: { color: '#d29922', label: '⚠ missing', title: 'In .env.example but missing from .env' },
};

const TYPE_ICONS = {
    secret:  <Key size={10} />,
    base64:  <Key size={10} />,
    url:     <Info size={10} />,
    boolean: <Info size={10} />,
};

export default function EnvManagerPanel({ workspace }) {
    const [entries, setEntries]           = useState([]);
    const [loading, setLoading]           = useState(false);
    const [saving, setSaving]             = useState(false);
    const [dirty, setDirty]               = useState(false);
    const [masked, setMasked]             = useState({});   // { key: bool } — true = hide
    const [generatingKey, setGeneratingKey] = useState(false);

    const load = useCallback(async () => {
        if (!workspace) return;
        setLoading(true);
        setDirty(false);
        try {
            const resp = await axios.get(`/api/workspaces/${workspace.id}/env`);
            const raw  = resp.data.entries || [];
            // Default: mask secrets
            const initMask = {};
            raw.forEach(e => { if (e.type === 'secret' || e.type === 'base64') initMask[e.key] = true; });
            setEntries(raw.map(e => ({ ...e, value: e.value ?? '' })));
            setMasked(initMask);
        } catch {
            toast.error('Failed to load .env file');
        } finally {
            setLoading(false);
        }
    }, [workspace]);

    useEffect(() => { load(); }, [load]);

    function updateValue(key, value) {
        setEntries(prev => prev.map(e => e.key === key ? { ...e, value, status: value !== '' ? 'set' : 'missing' } : e));
        setDirty(true);
    }

    function addEntry() {
        setEntries(prev => [
            ...prev,
            { key: '', value: '', status: 'extra', type: 'string', in_example: false, _isNew: true }
        ]);
        setDirty(true);
    }

    function updateKey(idx, newKey) {
        setEntries(prev => prev.map((e, i) => i === idx ? { ...e, key: newKey } : e));
        setDirty(true);
    }

    function removeEntry(idx) {
        setEntries(prev => prev.filter((_, i) => i !== idx));
        setDirty(true);
    }

    async function handleSave() {
        const valid = entries.filter(e => e.key.trim());
        setSaving(true);
        try {
            await axios.put(`/api/workspaces/${workspace.id}/env`, { entries: valid });
            toast.success('.env saved');
            setDirty(false);
            await load();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Save failed');
        } finally {
            setSaving(false);
        }
    }

    async function handleGenerateKey() {
        setGeneratingKey(true);
        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/env/generate-key`);
            const key  = resp.data.key;
            setEntries(prev => prev.map(e => e.key === 'APP_KEY' ? { ...e, value: key, status: 'set' } : e));
            setDirty(true);
            toast.success('APP_KEY generated — save to apply');
        } catch {
            toast.error('Failed to generate key');
        } finally {
            setGeneratingKey(false);
        }
    }

    const hasAppKey = entries.some(e => e.key === 'APP_KEY');

    if (!workspace) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484f58', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>
                Select a workspace
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d0f14', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#c9d1d9' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderBottom: '1px solid #1c2128', flexShrink: 0 }}>
                <Key size={13} style={{ color: '#ff6b35' }} />
                <span style={{ flex: 1, fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', color: '#8b949e', textTransform: 'uppercase' }}>
                    .env Manager
                </span>
                <button onClick={load} title="Reload" style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                    <RefreshCw size={12} />
                </button>
            </div>

            {/* Actions toolbar */}
            <div style={{ display: 'flex', gap: '5px', padding: '6px 12px', borderBottom: '1px solid #1c2128', flexShrink: 0, flexWrap: 'wrap' }}>
                {hasAppKey && (
                    <button
                        onClick={handleGenerateKey}
                        disabled={generatingKey}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.25)', borderRadius: '4px', color: '#ff6b35', fontSize: '10px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                        {generatingKey ? <Loader size={9} /> : <Key size={9} />}
                        Generate App Key
                    </button>
                )}
                <button
                    onClick={addEntry}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(56,139,253,0.08)', border: '1px solid rgba(56,139,253,0.25)', borderRadius: '4px', color: '#388bfd', fontSize: '10px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                    <Plus size={9} /> Add key
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving || !dirty}
                    style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', background: dirty ? 'rgba(255,107,53,0.12)' : 'transparent', border: '1px solid rgba(255,107,53,0.3)', borderRadius: '4px', color: dirty ? '#ff6b35' : '#484f58', fontSize: '10px', padding: '3px 8px', cursor: dirty ? 'pointer' : 'default', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}
                >
                    {saving ? <Loader size={9} /> : <Save size={9} />}
                    {saving ? 'Saving…' : 'Save .env'}
                </button>
            </div>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 70px', gap: '4px', padding: '5px 12px', borderBottom: '1px solid #1c2128', flexShrink: 0 }}>
                {['KEY', 'VALUE', 'STATUS'].map(h => (
                    <span key={h} style={{ fontSize: '9px', color: '#484f58', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</span>
                ))}
            </div>

            {/* Entries list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#484f58', fontSize: '11px' }}>Loading…</div>
                )}
                {!loading && entries.map((entry, idx) => {
                    const statusCfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.set;
                    const isSecret  = entry.type === 'secret' || entry.type === 'base64';
                    const hide      = isSecret && masked[entry.key];

                    return (
                        <div
                            key={`${entry.key}-${idx}`}
                            style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr 70px', gap: '4px',
                                alignItems: 'center', padding: '4px 12px',
                                borderBottom: '1px solid rgba(28,33,40,0.5)',
                                background: entry.status === 'missing' ? 'rgba(210,153,34,0.04)' : 'transparent',
                            }}
                        >
                            {/* Key */}
                            <input
                                value={entry.key}
                                onChange={e => updateKey(idx, e.target.value)}
                                readOnly={!entry._isNew}
                                style={{
                                    background: 'transparent', border: 'none',
                                    color: '#c9d1d9', fontSize: '11px', fontFamily: 'inherit',
                                    outline: 'none', width: '100%',
                                    cursor: entry._isNew ? 'text' : 'default',
                                }}
                                placeholder="KEY_NAME"
                            />

                            {/* Value */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0 }}>
                                <input
                                    value={entry.value}
                                    onChange={e => updateValue(entry.key || String(idx), e.target.value)}
                                    type={hide ? 'password' : 'text'}
                                    style={{
                                        flex: 1, background: '#0a0c0f', border: '1px solid #1c2128',
                                        borderRadius: '3px', color: '#8b949e', fontSize: '10px',
                                        padding: '2px 5px', fontFamily: 'inherit', outline: 'none',
                                        minWidth: 0,
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,107,53,0.4)'}
                                    onBlur={e => e.currentTarget.style.borderColor = '#1c2128'}
                                    placeholder={entry.status === 'missing' ? '(not set)' : ''}
                                />
                                {isSecret && (
                                    <button
                                        onClick={() => setMasked(prev => ({ ...prev, [entry.key]: !prev[entry.key] }))}
                                        style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', padding: '1px', flexShrink: 0, display: 'flex' }}
                                    >
                                        {hide ? <Eye size={10} /> : <EyeOff size={10} />}
                                    </button>
                                )}
                            </div>

                            {/* Status + delete */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span style={{ fontSize: '9px', color: statusCfg.color, whiteSpace: 'nowrap' }} title={statusCfg.title}>
                                    {statusCfg.label}
                                </span>
                                {entry._isNew && (
                                    <button
                                        onClick={() => removeEntry(idx)}
                                        style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', padding: '1px', display: 'flex', marginLeft: 'auto' }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#f85149'}
                                        onMouseLeave={e => e.currentTarget.style.color = '#484f58'}
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer hint */}
            <div style={{ padding: '5px 12px', fontSize: '9px', color: '#30363d', borderTop: '1px solid #1c2128', flexShrink: 0 }}>
                Values are read/written directly to workspace .env — never logged or stored.
            </div>
        </div>
    );
}
