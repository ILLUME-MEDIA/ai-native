import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Play, Plus, Pencil, Trash2, Check, X, Loader } from 'lucide-react';

const PRESET_COLORS = [
    '#ff6b35', // orange (default)
    '#3fb950', // green
    '#58a6ff', // blue
    '#d29922', // yellow
    '#f85149', // red
    '#bc8cff', // purple
    '#8b949e', // gray
];

const EMPTY_FORM = { name: '', command: '', cwd: '', color: '#ff6b35' };

export default function RunConfigPanel({ workspace, onRunConfig }) {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [running, setRunning] = useState(null); // id of currently-running config
    const [editingId, setEditingId] = useState(null); // null = none, 'new' = new form
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!workspace?.id) return;
        setLoading(true);
        try {
            const resp = await axios.get(`/api/workspaces/${workspace.id}/run-configs`);
            setConfigs(resp.data || []);
        } catch {
            // non-fatal
        } finally {
            setLoading(false);
        }
    }, [workspace?.id]);

    useEffect(() => { load(); }, [load]);

    function startNew() {
        setEditingId('new');
        setForm(EMPTY_FORM);
    }

    function startEdit(cfg) {
        setEditingId(cfg.id);
        setForm({ name: cfg.name, command: cfg.command, cwd: cfg.cwd || '', color: cfg.color || '#ff6b35' });
    }

    function cancelEdit() {
        setEditingId(null);
        setForm(EMPTY_FORM);
    }

    async function handleSave() {
        if (!form.name.trim() || !form.command.trim()) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                command: form.command.trim(),
                cwd: form.cwd.trim() || null,
                color: form.color,
            };
            if (editingId === 'new') {
                const resp = await axios.post(`/api/workspaces/${workspace.id}/run-configs`, payload);
                setConfigs(prev => [...prev, resp.data]);
            } else {
                const resp = await axios.patch(
                    `/api/workspaces/${workspace.id}/run-configs/${editingId}`,
                    payload
                );
                setConfigs(prev => prev.map(c => c.id === editingId ? resp.data : c));
            }
            cancelEdit();
        } catch {
            // non-fatal
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this run configuration?')) return;
        try {
            await axios.delete(`/api/workspaces/${workspace.id}/run-configs/${id}`);
            setConfigs(prev => prev.filter(c => c.id !== id));
            if (editingId === id) cancelEdit();
        } catch {
            // non-fatal
        }
    }

    async function handleRun(cfg) {
        if (running) return;
        setRunning(cfg.id);
        try {
            await onRunConfig?.(cfg);
        } finally {
            setRunning(null);
        }
    }

    const inputStyle = {
        background: '#0a0c0f',
        border: '1px solid #1c2128',
        borderRadius: '4px',
        color: '#c9d1d9',
        fontSize: '11px',
        fontFamily: "'JetBrains Mono', monospace",
        padding: '4px 8px',
        outline: 'none',
        width: '100%',
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            background: '#0d0f14', color: '#c9d1d9',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center',
                padding: '6px 10px', flexShrink: 0,
                borderBottom: '1px solid #1c2128',
                background: '#0d0f14',
            }}>
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', color: '#8b949e', textTransform: 'uppercase', flex: 1 }}>
                    Run Configurations
                </span>
                <button
                    onClick={startNew}
                    disabled={editingId === 'new'}
                    title="New configuration"
                    style={{
                        background: editingId === 'new' ? 'rgba(255,107,53,0.1)' : 'none',
                        border: editingId === 'new' ? '1px solid rgba(255,107,53,0.3)' : '1px solid transparent',
                        color: editingId === 'new' ? '#ff6b35' : '#8b949e',
                        cursor: editingId === 'new' ? 'default' : 'pointer',
                        padding: '3px', borderRadius: '4px',
                        display: 'flex', alignItems: 'center',
                    }}
                >
                    <Plus size={13} />
                </button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                        <Loader size={16} style={{ color: '#484f58' }} className="spinning" />
                    </div>
                ) : (
                    <>
                        {/* New config form */}
                        {editingId === 'new' && (
                            <ConfigForm
                                form={form}
                                setForm={setForm}
                                onSave={handleSave}
                                onCancel={cancelEdit}
                                saving={saving}
                                inputStyle={inputStyle}
                                isNew
                            />
                        )}

                        {configs.length === 0 && editingId !== 'new' ? (
                            <div style={{
                                padding: '24px 14px', textAlign: 'center',
                                fontSize: '11px', color: '#484f58', lineHeight: 1.6,
                            }}>
                                No run configurations yet.
                                <br />
                                <span style={{ fontSize: '10px' }}>
                                    Click + to add a command.
                                </span>
                            </div>
                        ) : (
                            configs.map(cfg => (
                                <div key={cfg.id}>
                                    {/* Config row */}
                                    <div
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '7px 10px',
                                            borderBottom: '1px solid rgba(28,33,40,0.6)',
                                            borderLeft: `2px solid ${cfg.color || '#ff6b35'}`,
                                            background: editingId === cfg.id ? 'rgba(255,107,53,0.04)' : 'transparent',
                                        }}
                                    >
                                        {/* Run button */}
                                        <button
                                            onClick={() => handleRun(cfg)}
                                            disabled={!!running}
                                            title={`Run: ${cfg.command}`}
                                            style={{
                                                flexShrink: 0,
                                                background: running === cfg.id
                                                    ? 'rgba(63,185,80,0.15)'
                                                    : `rgba(${hexToRgb(cfg.color || '#ff6b35')},0.12)`,
                                                border: `1px solid ${running === cfg.id ? 'rgba(63,185,80,0.4)' : `rgba(${hexToRgb(cfg.color || '#ff6b35')},0.35)`}`,
                                                borderRadius: '50%',
                                                width: '22px', height: '22px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: running ? 'wait' : 'pointer',
                                                color: running === cfg.id ? '#3fb950' : (cfg.color || '#ff6b35'),
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            {running === cfg.id
                                                ? <Loader size={10} className="spinning" />
                                                : <Play size={9} style={{ marginLeft: '1px' }} />
                                            }
                                        </button>

                                        {/* Name + command */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '11px', color: '#e6edf3',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {cfg.name}
                                            </div>
                                            <div style={{
                                                fontSize: '10px', color: '#484f58',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                marginTop: '1px',
                                            }}>
                                                {cfg.cwd ? <span style={{ color: '#30363d' }}>{cfg.cwd} $ </span> : '$ '}
                                                {cfg.command}
                                            </div>
                                        </div>

                                        {/* Edit / Delete */}
                                        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                                            <button
                                                onClick={() => editingId === cfg.id ? cancelEdit() : startEdit(cfg)}
                                                title="Edit"
                                                style={{
                                                    background: editingId === cfg.id ? 'rgba(255,107,53,0.1)' : 'none',
                                                    border: 'none', cursor: 'pointer',
                                                    color: editingId === cfg.id ? '#ff6b35' : '#484f58',
                                                    padding: '2px', borderRadius: '3px',
                                                    display: 'flex', alignItems: 'center',
                                                }}
                                                onMouseEnter={e => { if (editingId !== cfg.id) e.currentTarget.style.color = '#8b949e'; }}
                                                onMouseLeave={e => { if (editingId !== cfg.id) e.currentTarget.style.color = '#484f58'; }}
                                            >
                                                <Pencil size={11} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cfg.id)}
                                                title="Delete"
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    color: '#484f58', padding: '2px', borderRadius: '3px',
                                                    display: 'flex', alignItems: 'center',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.color = '#f85149'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = '#484f58'; }}
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Inline edit form */}
                                    {editingId === cfg.id && (
                                        <ConfigForm
                                            form={form}
                                            setForm={setForm}
                                            onSave={handleSave}
                                            onCancel={cancelEdit}
                                            saving={saving}
                                            inputStyle={inputStyle}
                                        />
                                    )}
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function ConfigForm({ form, setForm, onSave, onCancel, saving, inputStyle, isNew }) {
    return (
        <div style={{
            padding: '10px',
            borderBottom: '1px solid #1c2128',
            background: '#161b22',
            display: 'flex', flexDirection: 'column', gap: '7px',
        }}>
            {isNew && (
                <div style={{ fontSize: '10px', color: '#ff6b35', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '2px' }}>
                    NEW CONFIGURATION
                </div>
            )}

            {/* Name */}
            <div>
                <label style={{ display: 'block', fontSize: '9px', color: '#484f58', marginBottom: '3px', letterSpacing: '0.05em' }}>NAME</label>
                <input
                    autoFocus
                    type="text"
                    placeholder="e.g. Dev Server"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,107,53,0.5)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#1c2128'; }}
                />
            </div>

            {/* Command */}
            <div>
                <label style={{ display: 'block', fontSize: '9px', color: '#484f58', marginBottom: '3px', letterSpacing: '0.05em' }}>COMMAND</label>
                <input
                    type="text"
                    placeholder="e.g. npm run dev"
                    value={form.command}
                    onChange={e => setForm(f => ({ ...f, command: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,107,53,0.5)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#1c2128'; }}
                />
            </div>

            {/* CWD */}
            <div>
                <label style={{ display: 'block', fontSize: '9px', color: '#484f58', marginBottom: '3px', letterSpacing: '0.05em' }}>WORKING DIR <span style={{ color: '#30363d' }}>(optional)</span></label>
                <input
                    type="text"
                    placeholder="e.g. /src/frontend"
                    value={form.cwd}
                    onChange={e => setForm(f => ({ ...f, cwd: e.target.value }))}
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,107,53,0.5)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#1c2128'; }}
                />
            </div>

            {/* Color */}
            <div>
                <label style={{ display: 'block', fontSize: '9px', color: '#484f58', marginBottom: '5px', letterSpacing: '0.05em' }}>COLOR</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                    {['#ff6b35', '#3fb950', '#58a6ff', '#d29922', '#f85149', '#bc8cff', '#8b949e'].map(c => (
                        <button
                            key={c}
                            onClick={() => setForm(f => ({ ...f, color: c }))}
                            style={{
                                width: '16px', height: '16px', borderRadius: '50%',
                                background: c, border: 'none', cursor: 'pointer', padding: 0,
                                outline: form.color === c ? `2px solid ${c}` : 'none',
                                outlineOffset: '2px',
                                opacity: form.color === c ? 1 : 0.55,
                                transition: 'opacity 0.15s',
                            }}
                            title={c}
                        />
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <button
                    onClick={onSave}
                    disabled={saving || !form.name.trim() || !form.command.trim()}
                    style={{
                        flex: 1, padding: '4px', borderRadius: '4px',
                        background: 'rgba(255,107,53,0.12)',
                        border: '1px solid rgba(255,107,53,0.3)',
                        color: '#ff6b35', cursor: 'pointer',
                        fontSize: '10px', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        opacity: saving || !form.name.trim() || !form.command.trim() ? 0.5 : 1,
                    }}
                >
                    {saving ? <Loader size={10} className="spinning" /> : <Check size={10} />}
                    Save
                </button>
                <button
                    onClick={onCancel}
                    style={{
                        padding: '4px 10px', borderRadius: '4px',
                        background: 'none', border: '1px solid #1c2128',
                        color: '#8b949e', cursor: 'pointer',
                        fontSize: '10px', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                >
                    <X size={10} />
                    Cancel
                </button>
            </div>
        </div>
    );
}

// Convert hex color to "r,g,b" string for rgba()
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '255,107,53';
    return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
