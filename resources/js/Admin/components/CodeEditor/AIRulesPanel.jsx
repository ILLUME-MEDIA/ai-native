import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, BookOpen, Globe, FolderOpen, FileText, Save } from 'lucide-react';
import { toast } from 'react-toastify';

const RULE_TYPES = [
    { value: 'system',     label: 'System' },
    { value: 'behavioral', label: 'Behavioral' },
    { value: 'safety',     label: 'Safety / Guardrail' },
    { value: 'formatting', label: 'Formatting' },
];

const s = {
    panel: {
        display: 'flex', flexDirection: 'column', height: '100%',
        background: '#0d0f14', fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden',
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderBottom: '1px solid #1c2128', flexShrink: 0,
    },
    headerTitle: {
        display: 'flex', alignItems: 'center', gap: '7px',
        fontSize: '11px', fontWeight: '600', color: '#8b949e',
        textTransform: 'uppercase', letterSpacing: '0.06em',
    },
    addBtn: {
        display: 'flex', alignItems: 'center', gap: '4px',
        background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)',
        borderRadius: '5px', color: '#ff6b35', cursor: 'pointer',
        fontSize: '10px', padding: '4px 8px', transition: 'all 0.15s',
    },
    tabs: {
        display: 'flex', borderBottom: '1px solid #1c2128', flexShrink: 0,
    },
    tab: (active) => ({
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
        padding: '8px 10px', fontSize: '11px', cursor: 'pointer', border: 'none',
        background: 'transparent', transition: 'all 0.15s',
        color: active ? '#ff6b35' : '#8b949e',
        borderBottom: active ? '2px solid #ff6b35' : '2px solid transparent',
        fontFamily: 'inherit',
    }),
    hint: {
        padding: '8px 12px', fontSize: '10px', color: '#484f58',
        borderBottom: '1px solid #1c2128', flexShrink: 0, lineHeight: 1.5,
    },
    list: {
        flex: 1, overflowY: 'auto', padding: '8px',
    },
    emptyState: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '8px', padding: '32px 16px', color: '#484f58', textAlign: 'center',
    },
    card: {
        background: '#161b22', border: '1px solid #1c2128', borderRadius: '7px',
        marginBottom: '6px', overflow: 'hidden',
    },
    cardHeader: {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 10px', cursor: 'default',
    },
    cardName: {
        flex: 1, fontSize: '12px', fontWeight: '600', color: '#c9d1d9',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    },
    cardActions: {
        display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0,
    },
    iconBtn: {
        background: 'none', border: 'none', cursor: 'pointer', padding: '3px',
        borderRadius: '4px', color: '#484f58', display: 'flex', alignItems: 'center',
        transition: 'color 0.15s',
    },
    cardBody: {
        padding: '0 10px 8px',
        fontSize: '11px', color: '#8b949e', lineHeight: 1.5,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    },
    toggle: (active) => ({
        width: '28px', height: '16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
        background: active ? '#ff6b35' : '#30363d', position: 'relative', flexShrink: 0,
        transition: 'background 0.2s',
    }),
    toggleDot: (active) => ({
        position: 'absolute', top: '2px',
        left: active ? '14px' : '2px',
        width: '12px', height: '12px', borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
    }),
    form: {
        background: '#0a0c0f', border: '1px solid #30363d', borderRadius: '7px',
        marginBottom: '6px', padding: '10px',
    },
    label: {
        display: 'block', fontSize: '10px', color: '#8b949e',
        marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em',
    },
    input: {
        width: '100%', background: '#161b22', border: '1px solid #30363d',
        borderRadius: '5px', color: '#c9d1d9', fontSize: '12px',
        padding: '5px 8px', fontFamily: 'inherit', outline: 'none',
        boxSizing: 'border-box',
    },
    textarea: {
        width: '100%', background: '#161b22', border: '1px solid #30363d',
        borderRadius: '5px', color: '#c9d1d9', fontSize: '11px', lineHeight: '1.5',
        padding: '6px 8px', fontFamily: "'JetBrains Mono', monospace", outline: 'none',
        resize: 'vertical', minHeight: '80px', boxSizing: 'border-box',
    },
    select: {
        width: '100%', background: '#161b22', border: '1px solid #30363d',
        borderRadius: '5px', color: '#c9d1d9', fontSize: '12px',
        padding: '5px 8px', fontFamily: 'inherit', outline: 'none',
        boxSizing: 'border-box',
    },
    row: { display: 'flex', gap: '8px', marginBottom: '8px' },
    formActions: { display: 'flex', gap: '6px', marginTop: '10px', justifyContent: 'flex-end' },
    btnSave: {
        background: '#ff6b35', border: 'none', borderRadius: '5px', color: '#fff',
        fontSize: '11px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit',
    },
    btnCancel: {
        background: 'none', border: '1px solid #30363d', borderRadius: '5px', color: '#8b949e',
        fontSize: '11px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit',
    },
};

const EMPTY_FORM = { name: '', description: '', rule_content: '', type: 'system', priority: 0, is_active: true };

export default function AIRulesPanel({ workspace }) {
    const [activeTab, setActiveTab] = useState('global');
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);  // rule id being edited, or 'new'
    const [form, setForm] = useState(EMPTY_FORM);
    const [expanded, setExpanded] = useState({});       // { [id]: bool }

    // A-01: .airules project file
    const [fileContent, setFileContent] = useState('');
    const [fileLoading, setFileLoading] = useState(false);
    const [fileSaving, setFileSaving] = useState(false);

    const isWorkspaceTab = activeTab === 'workspace';
    const isFileTab = activeTab === 'project-file';

    const apiBase = isWorkspaceTab && workspace?.id
        ? `/api/workspaces/${workspace.id}/ai/rules`
        : '/api/ai/rules';

    const load = useCallback(async () => {
        if (isWorkspaceTab && !workspace?.id) { setRules([]); return; }
        setLoading(true);
        try {
            const { data } = await axios.get(apiBase);
            setRules(data);
        } catch {
            toast.error('Failed to load AI rules');
        } finally {
            setLoading(false);
        }
    }, [apiBase, isWorkspaceTab, workspace?.id]);

    useEffect(() => { if (!isFileTab) load(); }, [load, isFileTab]);

    // Load .airules file when project-file tab is opened
    useEffect(() => {
        if (!isFileTab || !workspace?.id) return;
        setFileLoading(true);
        axios.get(`/api/workspaces/${workspace.id}/ai/rules-file`)
            .then(r => setFileContent(r.data.content || ''))
            .catch(() => toast.error('Failed to load .airules file'))
            .finally(() => setFileLoading(false));
    }, [isFileTab, workspace?.id]);

    async function saveRulesFile() {
        if (!workspace?.id) return;
        setFileSaving(true);
        try {
            await axios.put(`/api/workspaces/${workspace.id}/ai/rules-file`, { content: fileContent });
            toast.success('.airules saved');
        } catch {
            toast.error('Failed to save .airules file');
        } finally {
            setFileSaving(false);
        }
    }

    function startAdd() {
        setForm(EMPTY_FORM);
        setEditingId('new');
    }

    function startEdit(rule) {
        setForm({
            name: rule.name,
            description: rule.description || '',
            rule_content: rule.rule_content,
            type: rule.type || 'system',
            priority: rule.priority ?? 0,
            is_active: rule.is_active,
        });
        setEditingId(rule.id);
    }

    function cancelEdit() {
        setEditingId(null);
        setForm(EMPTY_FORM);
    }

    async function saveRule() {
        if (!form.name.trim() || !form.rule_content.trim()) {
            toast.error('Name and content are required');
            return;
        }
        try {
            if (editingId === 'new') {
                const { data } = await axios.post(apiBase, form);
                setRules(prev => [data, ...prev]);
                toast.success('Rule created');
            } else {
                const { data } = await axios.patch(`/api/ai/rules/${editingId}`, form);
                setRules(prev => prev.map(r => r.id === editingId ? data : r));
                toast.success('Rule updated');
            }
            setEditingId(null);
            setForm(EMPTY_FORM);
        } catch {
            toast.error('Failed to save rule');
        }
    }

    async function deleteRule(id) {
        if (!confirm('Delete this rule?')) return;
        try {
            await axios.delete(`/api/ai/rules/${id}`);
            setRules(prev => prev.filter(r => r.id !== id));
            toast.success('Rule deleted');
        } catch {
            toast.error('Failed to delete rule');
        }
    }

    async function toggleActive(rule) {
        try {
            const { data } = await axios.patch(`/api/ai/rules/${rule.id}`, { is_active: !rule.is_active });
            setRules(prev => prev.map(r => r.id === rule.id ? data : r));
        } catch {
            toast.error('Failed to update rule');
        }
    }

    function toggleExpand(id) {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    }

    const noWorkspace = isWorkspaceTab && !workspace?.id;

    return (
        <div style={s.panel}>
            {/* Header */}
            <div style={s.header}>
                <div style={s.headerTitle}>
                    <BookOpen size={13} />
                    <span>AI Rules</span>
                </div>
                {!noWorkspace && editingId !== 'new' && (
                    <button style={s.addBtn} onClick={startAdd}>
                        <Plus size={11} /> New
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div style={s.tabs}>
                <button style={s.tab(activeTab === 'global')} onClick={() => { setActiveTab('global'); setEditingId(null); }}>
                    <Globe size={11} /> Global
                </button>
                <button style={s.tab(activeTab === 'workspace')} onClick={() => { setActiveTab('workspace'); setEditingId(null); }}>
                    <FolderOpen size={11} /> Workspace
                </button>
                <button style={s.tab(activeTab === 'project-file')} onClick={() => { setActiveTab('project-file'); setEditingId(null); }}>
                    <FileText size={11} /> .airules
                </button>
            </div>

            {/* Hint */}
            <div style={s.hint}>
                {activeTab === 'global'
                    ? 'Applied to every AI prompt across all workspaces.'
                    : activeTab === 'project-file'
                        ? '.airules file in workspace root — auto-loaded on every AI prompt.'
                        : workspace?.id
                            ? `Applied only when working in "${workspace.name}".`
                            : 'Select a workspace to manage project-specific rules.'}
            </div>

            {/* A-01: .airules project file editor */}
            {isFileTab && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px', gap: '8px', overflow: 'hidden' }}>
                    {!workspace?.id ? (
                        <div style={s.emptyState}>
                            <FolderOpen size={28} style={{ opacity: 0.3 }} />
                            <span style={{ fontSize: '11px' }}>No workspace selected</span>
                        </div>
                    ) : fileLoading ? (
                        <div style={{ ...s.emptyState, fontSize: '11px', color: '#484f58' }}>Loading…</div>
                    ) : (
                        <>
                            <textarea
                                style={{ ...s.textarea, flex: 1, resize: 'none', minHeight: 0 }}
                                value={fileContent}
                                onChange={e => setFileContent(e.target.value)}
                                placeholder={'# Always use TypeScript strict mode\n# Never use var, always const/let\n# Prefer Tailwind over inline styles'}
                                spellCheck={false}
                            />
                            <button
                                style={{ ...s.btnSave, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '6px 14px', opacity: fileSaving ? 0.6 : 1 }}
                                onClick={saveRulesFile}
                                disabled={fileSaving}
                            >
                                <Save size={11} />
                                {fileSaving ? 'Saving…' : 'Save .airules'}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Content */}
            {!isFileTab && <div style={s.list}>
                {noWorkspace ? (
                    <div style={s.emptyState}>
                        <FolderOpen size={28} style={{ opacity: 0.3 }} />
                        <span style={{ fontSize: '11px' }}>No workspace selected</span>
                    </div>
                ) : (
                    <>
                        {/* New rule form */}
                        {editingId === 'new' && (
                            <RuleForm
                                form={form}
                                setForm={setForm}
                                onSave={saveRule}
                                onCancel={cancelEdit}
                                isNew
                            />
                        )}

                        {loading && rules.length === 0 && (
                            <div style={{ ...s.emptyState, fontSize: '11px', color: '#484f58' }}>Loading…</div>
                        )}

                        {!loading && rules.length === 0 && editingId !== 'new' && (
                            <div style={s.emptyState}>
                                <BookOpen size={28} style={{ opacity: 0.3 }} />
                                <span style={{ fontSize: '11px' }}>No rules yet</span>
                                <span style={{ fontSize: '10px', color: '#30363d' }}>Click "New" to add your first rule</span>
                            </div>
                        )}

                        {rules.map(rule => (
                            <div key={rule.id} style={s.card}>
                                {editingId === rule.id ? (
                                    <RuleForm
                                        form={form}
                                        setForm={setForm}
                                        onSave={saveRule}
                                        onCancel={cancelEdit}
                                    />
                                ) : (
                                    <>
                                        <div style={s.cardHeader}>
                                            {/* Active toggle */}
                                            <button
                                                style={s.toggle(rule.is_active)}
                                                onClick={() => toggleActive(rule)}
                                                title={rule.is_active ? 'Disable' : 'Enable'}
                                            >
                                                <div style={s.toggleDot(rule.is_active)} />
                                            </button>

                                            {/* Name */}
                                            <span
                                                style={{ ...s.cardName, opacity: rule.is_active ? 1 : 0.4 }}
                                                onClick={() => toggleExpand(rule.id)}
                                            >
                                                {rule.name}
                                            </span>

                                            {/* Priority badge */}
                                            {rule.priority !== 0 && (
                                                <span style={{ fontSize: '9px', color: '#484f58', flexShrink: 0 }}>
                                                    p{rule.priority}
                                                </span>
                                            )}

                                            <div style={s.cardActions}>
                                                <button
                                                    style={s.iconBtn}
                                                    onClick={() => toggleExpand(rule.id)}
                                                    title="Expand"
                                                >
                                                    {expanded[rule.id]
                                                        ? <ChevronUp size={12} />
                                                        : <ChevronDown size={12} />}
                                                </button>
                                                <button
                                                    style={s.iconBtn}
                                                    onClick={() => startEdit(rule)}
                                                    title="Edit"
                                                    onMouseEnter={e => e.currentTarget.style.color = '#c9d1d9'}
                                                    onMouseLeave={e => e.currentTarget.style.color = '#484f58'}
                                                >
                                                    <Pencil size={11} />
                                                </button>
                                                <button
                                                    style={s.iconBtn}
                                                    onClick={() => deleteRule(rule.id)}
                                                    title="Delete"
                                                    onMouseEnter={e => e.currentTarget.style.color = '#f85149'}
                                                    onMouseLeave={e => e.currentTarget.style.color = '#484f58'}
                                                >
                                                    <Trash2 size={11} />
                                                </button>
                                            </div>
                                        </div>

                                        {expanded[rule.id] && (
                                            <div style={s.cardBody}>{rule.rule_content}</div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </>
                )}
            </div>}
        </div>
    );
}

function RuleForm({ form, setForm, onSave, onCancel, isNew }) {
    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    return (
        <div style={s.form}>
            <div style={s.row}>
                <div style={{ flex: 1 }}>
                    <label style={s.label}>Name *</label>
                    <input
                        style={s.input}
                        value={form.name}
                        onChange={e => set('name', e.target.value)}
                        placeholder="e.g. Always use TypeScript"
                        autoFocus={isNew}
                    />
                </div>
                <div style={{ width: '60px' }}>
                    <label style={s.label}>Priority</label>
                    <input
                        style={s.input}
                        type="number"
                        value={form.priority}
                        onChange={e => set('priority', Number(e.target.value))}
                    />
                </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
                <label style={s.label}>Type</label>
                <select
                    style={s.select}
                    value={form.type}
                    onChange={e => set('type', e.target.value)}
                >
                    {RULE_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
            </div>

            <div style={{ marginBottom: '8px' }}>
                <label style={s.label}>Rule Content *</label>
                <textarea
                    style={s.textarea}
                    value={form.rule_content}
                    onChange={e => set('rule_content', e.target.value)}
                    placeholder="e.g. Always use functional React components. Never use class components."
                    rows={5}
                />
            </div>

            <div style={{ marginBottom: '0' }}>
                <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <button
                        style={s.toggle(form.is_active)}
                        onClick={() => set('is_active', !form.is_active)}
                        type="button"
                    >
                        <div style={s.toggleDot(form.is_active)} />
                    </button>
                    <span>Active</span>
                </label>
            </div>

            <div style={s.formActions}>
                <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
                <button style={s.btnSave} onClick={onSave}>Save Rule</button>
            </div>
        </div>
    );
}
