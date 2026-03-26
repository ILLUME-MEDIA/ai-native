import React, { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2, Check, X, Loader, Zap } from 'lucide-react';

const LANGUAGES = [
    { value: '*',          label: 'All languages' },
    { value: 'php',        label: 'PHP' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'css',        label: 'CSS' },
    { value: 'scss',       label: 'SCSS' },
    { value: 'html',       label: 'HTML' },
    { value: 'json',       label: 'JSON' },
    { value: 'sql',        label: 'SQL' },
    { value: 'python',     label: 'Python' },
    { value: 'markdown',   label: 'Markdown' },
    { value: 'shell',      label: 'Shell' },
];

const LANG_LABEL = Object.fromEntries(LANGUAGES.map(l => [l.value, l.label]));

const EMPTY_FORM = { name: '', trigger: '', language: '*', body: '', description: '' };

const inputStyle = {
    background: '#0a0c0f', border: '1px solid #1c2128', borderRadius: '4px',
    color: '#c9d1d9', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace",
    padding: '4px 8px', outline: 'none', width: '100%',
};

const labelStyle = {
    display: 'block', fontSize: '9px', color: '#484f58',
    marginBottom: '3px', letterSpacing: '0.05em', textTransform: 'uppercase',
};

export default function SnippetsPanel({ workspace, snippets = [], onSnippetsChange }) {
    const [editingId, setEditingId] = useState(null); // null | 'new' | id
    const [form, setForm]           = useState(EMPTY_FORM);
    const [saving, setSaving]       = useState(false);
    const [search, setSearch]       = useState('');

    function startNew() {
        setEditingId('new');
        setForm(EMPTY_FORM);
    }

    function startEdit(s) {
        setEditingId(s.id);
        setForm({ name: s.name, trigger: s.trigger, language: s.language || '*', body: s.body, description: s.description || '' });
    }

    function cancelEdit() {
        setEditingId(null);
        setForm(EMPTY_FORM);
    }

    async function handleSave() {
        if (!form.name.trim() || !form.trigger.trim() || !form.body.trim()) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                trigger: form.trigger.trim(),
                language: form.language,
                body: form.body,
                description: form.description.trim() || null,
            };
            if (editingId === 'new') {
                const resp = await axios.post(`/api/workspaces/${workspace.id}/snippets`, payload);
                onSnippetsChange([...snippets, resp.data]);
            } else {
                const resp = await axios.patch(`/api/workspaces/${workspace.id}/snippets/${editingId}`, payload);
                onSnippetsChange(snippets.map(s => s.id === editingId ? resp.data : s));
            }
            cancelEdit();
        } catch {
            // non-fatal
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this snippet?')) return;
        try {
            await axios.delete(`/api/workspaces/${workspace.id}/snippets/${id}`);
            onSnippetsChange(snippets.filter(s => s.id !== id));
            if (editingId === id) cancelEdit();
        } catch {
            // non-fatal
        }
    }

    const filtered = useMemo(() => snippets.filter(s => {
        if (!search) return true;
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.trigger.toLowerCase().includes(q);
    }), [snippets, search]);

    // Group by language
    const groups = useMemo(() => {
        const g = {};
        for (const s of filtered) {
            const lang = s.language || '*';
            if (!g[lang]) g[lang] = [];
            g[lang].push(s);
        }
        return g;
    }, [filtered]);

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            background: '#0d0f14', color: '#c9d1d9',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '12px',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center',
                padding: '6px 10px', flexShrink: 0,
                borderBottom: '1px solid #1c2128',
            }}>
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', color: '#8b949e', textTransform: 'uppercase', flex: 1 }}>
                    Snippets
                </span>
                {/* Search */}
                <input
                    type="text"
                    placeholder="filter..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ ...inputStyle, width: '80px', padding: '2px 6px', fontSize: '10px', marginRight: '5px' }}
                />
                <button
                    onClick={startNew}
                    disabled={editingId === 'new'}
                    title="New snippet"
                    style={{
                        background: editingId === 'new' ? 'rgba(255,107,53,0.1)' : 'none',
                        border: editingId === 'new' ? '1px solid rgba(255,107,53,0.3)' : '1px solid transparent',
                        color: editingId === 'new' ? '#ff6b35' : '#8b949e',
                        cursor: editingId === 'new' ? 'default' : 'pointer',
                        padding: '3px', borderRadius: '4px', display: 'flex', alignItems: 'center',
                    }}
                >
                    <Plus size={13} />
                </button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* New form */}
                {editingId === 'new' && (
                    <SnippetForm form={form} setForm={setForm} onSave={handleSave} onCancel={cancelEdit} saving={saving} isNew />
                )}

                {snippets.length === 0 && editingId !== 'new' ? (
                    <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: '11px', color: '#484f58', lineHeight: 1.7 }}>
                        No snippets yet.
                        <br />
                        <span style={{ fontSize: '10px' }}>Click + to add a code snippet.</span>
                    </div>
                ) : (
                    Object.entries(groups).map(([lang, langSnippets]) => (
                        <div key={lang}>
                            {/* Language group header */}
                            <div style={{
                                padding: '4px 10px', fontSize: '9px', letterSpacing: '0.06em',
                                color: '#484f58', background: '#161b22',
                                borderBottom: '1px solid #1c2128', textTransform: 'uppercase',
                            }}>
                                {LANG_LABEL[lang] || lang}
                            </div>

                            {langSnippets.map(s => (
                                <div key={s.id}>
                                    {/* Snippet row */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '6px 10px',
                                        borderBottom: '1px solid rgba(28,33,40,0.6)',
                                        background: editingId === s.id ? 'rgba(255,107,53,0.04)' : 'transparent',
                                    }}>
                                        <Zap size={11} style={{ color: '#ff6b35', flexShrink: 0 }} />

                                        {/* Trigger */}
                                        <span style={{
                                            flexShrink: 0,
                                            padding: '1px 5px', borderRadius: '4px',
                                            background: 'rgba(255,107,53,0.1)',
                                            border: '1px solid rgba(255,107,53,0.25)',
                                            color: '#ff6b35', fontSize: '10px', fontWeight: 600,
                                        }}>
                                            {s.trigger}
                                        </span>

                                        {/* Name */}
                                        <span style={{ flex: 1, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {s.name}
                                        </span>

                                        {/* Edit / Delete */}
                                        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                                            <button
                                                onClick={() => editingId === s.id ? cancelEdit() : startEdit(s)}
                                                style={{
                                                    background: editingId === s.id ? 'rgba(255,107,53,0.1)' : 'none',
                                                    border: 'none', cursor: 'pointer',
                                                    color: editingId === s.id ? '#ff6b35' : '#484f58',
                                                    padding: '2px', borderRadius: '3px', display: 'flex', alignItems: 'center',
                                                }}
                                                onMouseEnter={e => { if (editingId !== s.id) e.currentTarget.style.color = '#8b949e'; }}
                                                onMouseLeave={e => { if (editingId !== s.id) e.currentTarget.style.color = '#484f58'; }}
                                            >
                                                <Pencil size={11} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(s.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#484f58', padding: '2px', borderRadius: '3px', display: 'flex', alignItems: 'center' }}
                                                onMouseEnter={e => e.currentTarget.style.color = '#f85149'}
                                                onMouseLeave={e => e.currentTarget.style.color = '#484f58'}
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Inline edit form */}
                                    {editingId === s.id && (
                                        <SnippetForm form={form} setForm={setForm} onSave={handleSave} onCancel={cancelEdit} saving={saving} />
                                    )}
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function SnippetForm({ form, setForm, onSave, onCancel, saving, isNew }) {
    const canSave = form.name.trim() && form.trigger.trim() && form.body.trim();

    return (
        <div style={{
            padding: '10px', borderBottom: '1px solid #1c2128',
            background: '#161b22', display: 'flex', flexDirection: 'column', gap: '7px',
        }}>
            {isNew && (
                <div style={{ fontSize: '10px', color: '#ff6b35', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '2px' }}>
                    NEW SNIPPET
                </div>
            )}

            {/* Name + Trigger row */}
            <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Name</label>
                    <input
                        autoFocus
                        type="text"
                        placeholder="e.g. Route Resource"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        style={inputStyle}
                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,107,53,0.5)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#1c2128'; }}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Trigger</label>
                    <input
                        type="text"
                        placeholder="e.g. lroute"
                        value={form.trigger}
                        onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}
                        style={inputStyle}
                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,107,53,0.5)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#1c2128'; }}
                    />
                </div>
            </div>

            {/* Language + Description row */}
            <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Language</label>
                    <select
                        value={form.language}
                        onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                        {LANGUAGES.map(l => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                    </select>
                </div>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Description <span style={{ color: '#30363d' }}>(optional)</span></label>
                    <input
                        type="text"
                        placeholder="Short description"
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        style={inputStyle}
                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,107,53,0.5)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#1c2128'; }}
                    />
                </div>
            </div>

            {/* Body */}
            <div>
                <label style={labelStyle}>
                    Body <span style={{ color: '#30363d' }}>($1, $2 = tab stops · $0 = final cursor)</span>
                </label>
                <textarea
                    value={form.body}
                    onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                    rows={5}
                    placeholder={"e.g. Route::resource('$1', $2Controller::class);"}
                    style={{
                        ...inputStyle,
                        resize: 'vertical', lineHeight: 1.6,
                        fontFamily: "'JetBrains Mono', monospace",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,107,53,0.5)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#1c2128'; }}
                />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '6px' }}>
                <button
                    onClick={onSave}
                    disabled={saving || !canSave}
                    style={{
                        flex: 1, padding: '4px', borderRadius: '4px',
                        background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.3)',
                        color: '#ff6b35', cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        opacity: saving || !canSave ? 0.5 : 1,
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
                        color: '#8b949e', cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit',
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
