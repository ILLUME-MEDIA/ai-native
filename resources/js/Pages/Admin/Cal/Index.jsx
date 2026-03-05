import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

const api = (path, options = {}) => axios({ url: `/api/admin/cal/${path}`, ...options });

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Btn({ onClick, disabled, variant = 'primary', size = 'sm', children }) {
    const v = {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
        danger:  'bg-red-600 text-white hover:bg-red-500',
        ghost:   'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
        success: 'bg-green-600 text-white hover:bg-green-500',
        warning: 'bg-amber-500 text-white hover:bg-amber-400',
    };
    const s = size === 'xs' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs';
    return (
        <button onClick={onClick} disabled={disabled}
            className={`inline-flex items-center gap-1 font-semibold rounded-md transition disabled:opacity-50 ${v[variant]} ${s}`}>
            {children}
        </button>
    );
}

function Badge({ status }) {
    const map = {
        upcoming:    'bg-blue-100 text-blue-800',
        completed:   'bg-green-100 text-green-800',
        cancelled:   'bg-red-100 text-red-800',
        rescheduled: 'bg-yellow-100 text-yellow-800',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
            {status}
        </span>
    );
}

function Modal({ title, onClose, wide, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className={`bg-white rounded-xl shadow-2xl flex flex-col w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh]`}>
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
                </div>
                <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
            </div>
        </div>
    );
}

function Field({ label, error, children }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            {children}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}

function Input({ value, onChange, placeholder, type = 'text', disabled }) {
    return (
        <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder} disabled={disabled}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50" />
    );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
    return (
        <textarea value={value ?? ''} onChange={onChange} placeholder={placeholder} rows={rows}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
    );
}

function Select({ value, onChange, children }) {
    return (
        <select value={value ?? ''} onChange={onChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {children}
        </select>
    );
}

// ── Platforms Tab ─────────────────────────────────────────────────────────────

const EMPTY_PLATFORM = { name: '', slug: '', api_key: '', base_url: 'https://api.cal.com/v2', color: '#6366f1', is_active: true };

function PlatformsTab() {
    const [platforms, setPlatforms] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [modal, setModal]         = useState(null); // null | 'create' | 'edit'
    const [form, setForm]           = useState(EMPTY_PLATFORM);
    const [editing, setEditing]     = useState(null);
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState('');
    const [syncing, setSyncing]     = useState(null);
    const [testing, setTesting]     = useState(null);
    const [revealedKey, setRevealedKey] = useState({});

    const load = useCallback(async () => {
        setLoading(true);
        const { data } = await api('platforms');
        setPlatforms(data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => { setForm(EMPTY_PLATFORM); setEditing(null); setError(''); setModal('create'); };
    const openEdit   = (p) => { setForm({ ...p, api_key: '' }); setEditing(p); setError(''); setModal('edit'); };

    const save = async () => {
        setSaving(true); setError('');
        try {
            if (modal === 'create') {
                await api('platforms', { method: 'POST', data: form });
            } else {
                await api(`platforms/${editing.id}`, { method: 'PUT', data: form });
            }
            setModal(null);
            load();
        } catch (e) {
            setError(e.response?.data?.message || JSON.stringify(e.response?.data?.errors || 'Error'));
        } finally {
            setSaving(false);
        }
    };

    const destroy = async (p) => {
        if (!confirm(`Delete platform "${p.name}"? All meetings will be deleted.`)) return;
        await api(`platforms/${p.id}`, { method: 'DELETE' });
        load();
    };

    const sync = async (p) => {
        setSyncing(p.id);
        try {
            const { data } = await api(`platforms/${p.id}/sync`, { method: 'POST' });
            alert(`Synced ${data.synced} meetings from Cal.com`);
            load();
        } catch (e) {
            alert(e.response?.data?.message || 'Sync failed');
        } finally {
            setSyncing(null);
        }
    };

    const testConn = async (p) => {
        setTesting(p.id);
        try {
            const { data } = await api(`platforms/${p.id}/test`, { method: 'POST' });
            alert(data.ok ? '✓ Connection successful!' : `✗ Failed: ${data.message}`);
        } catch (e) {
            alert('Connection failed: ' + (e.response?.data?.message || e.message));
        } finally {
            setTesting(null);
        }
    };

    const revealKey = async (p) => {
        const { data } = await api(`platforms/${p.id}/reveal-key`, { method: 'POST' });
        setRevealedKey(prev => ({ ...prev, [p.id]: data.api_key }));
    };

    const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">{platforms.length} platform(s)</p>
                <Btn onClick={openCreate}>+ Add Platform</Btn>
            </div>

            {loading ? (
                <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
            ) : platforms.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-sm">No Cal.com platforms yet. Add one to get started.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {platforms.map(p => (
                        <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                                    <h3 className="font-semibold text-gray-900 text-sm">{p.name}</h3>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {p.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 font-mono mb-1">/{p.slug}</p>
                            <div className="text-xs text-gray-500 mb-1">
                                API Key: <span className="font-mono">{revealedKey[p.id] ?? p.api_key_masked ?? '—'}</span>
                                {!revealedKey[p.id] && p.api_key_masked && (
                                    <button onClick={() => revealKey(p)} className="ml-2 text-indigo-500 hover:underline text-xs">Reveal</button>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mb-3">{p.meetings_count} meeting(s)</p>
                            <div className="flex flex-wrap gap-1.5">
                                <Btn size="xs" variant="ghost" onClick={() => openEdit(p)}>Edit</Btn>
                                <Btn size="xs" variant="ghost" onClick={() => testConn(p)} disabled={testing === p.id}>
                                    {testing === p.id ? 'Testing…' : 'Test'}
                                </Btn>
                                <Btn size="xs" variant="success" onClick={() => sync(p)} disabled={syncing === p.id}>
                                    {syncing === p.id ? 'Syncing…' : 'Sync'}
                                </Btn>
                                <Btn size="xs" variant="danger" onClick={() => destroy(p)}>Delete</Btn>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modal && (
                <Modal title={modal === 'create' ? 'Add Cal.com Platform' : `Edit: ${editing?.name}`} onClose={() => setModal(null)}>
                    <div className="space-y-4">
                        <Field label="Name *">
                            <Input value={form.name} onChange={f('name')} placeholder="My Platform" />
                        </Field>
                        {modal === 'create' && (
                            <Field label="Slug (auto if empty)">
                                <Input value={form.slug} onChange={f('slug')} placeholder="my-platform" />
                            </Field>
                        )}
                        <Field label="API Key">
                            <Input value={form.api_key} onChange={f('api_key')} type="password" placeholder={modal === 'edit' ? 'Leave blank to keep existing' : 'cal_live_...'} />
                        </Field>
                        <Field label="Cal.com API Base URL">
                            <Input value={form.base_url} onChange={f('base_url')} placeholder="https://api.cal.com/v2" />
                        </Field>
                        <Field label="Color">
                            <div className="flex items-center gap-2">
                                <input type="color" value={form.color || '#6366f1'} onChange={f('color')} className="w-10 h-9 rounded border border-gray-300 cursor-pointer" />
                                <Input value={form.color} onChange={f('color')} placeholder="#6366f1" />
                            </div>
                        </Field>
                        <Field label="">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                                    className="rounded" />
                                Active
                            </label>
                        </Field>
                        {error && <p className="text-red-500 text-xs bg-red-50 p-3 rounded-lg">{error}</p>}
                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                            <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ── Meetings Tab ──────────────────────────────────────────────────────────────

const EMPTY_MEETING = {
    cal_platform_id: '', title: '', description: '', attendee_name: '',
    attendee_email: '', attendee_timezone: '', start_time: '', end_time: '',
    status: 'upcoming', meeting_url: '',
};

function MeetingsTab({ platforms }) {
    const [meetings, setMeetings]   = useState([]);
    const [meta, setMeta]           = useState({});
    const [loading, setLoading]     = useState(true);
    const [filter, setFilter]       = useState({ platform_id: '', status: '', search: '' });
    const [modal, setModal]         = useState(null);
    const [form, setForm]           = useState(EMPTY_MEETING);
    const [editing, setEditing]     = useState(null);
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState('');

    const load = useCallback(async (params = filter) => {
        setLoading(true);
        const query = Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
        const { data } = await api(`meetings?${query}`);
        setMeetings(data.data ?? data);
        setMeta({ total: data.total, last_page: data.last_page });
        setLoading(false);
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    const applyFilter = (key, val) => {
        const f = { ...filter, [key]: val };
        setFilter(f);
        load(f);
    };

    const openCreate = () => { setForm({ ...EMPTY_MEETING, cal_platform_id: platforms[0]?.id || '' }); setEditing(null); setError(''); setModal('form'); };
    const openEdit   = (m) => { setForm({ ...m, start_time: m.start_time?.slice(0, 16), end_time: m.end_time?.slice(0, 16) }); setEditing(m); setError(''); setModal('form'); };

    const save = async () => {
        setSaving(true); setError('');
        try {
            if (!editing) {
                await api('meetings', { method: 'POST', data: form });
            } else {
                await api(`meetings/${editing.id}`, { method: 'PUT', data: form });
            }
            setModal(null);
            load();
        } catch (e) {
            setError(e.response?.data?.message || JSON.stringify(e.response?.data?.errors || 'Error'));
        } finally {
            setSaving(false);
        }
    };

    const destroy = async (m) => {
        if (!confirm(`Delete meeting "${m.title}"?`)) return;
        await api(`meetings/${m.id}`, { method: 'DELETE' });
        load();
    };

    const cancelViaApi = async (m) => {
        const reason = prompt('Cancellation reason (optional):') ?? '';
        try {
            await api(`meetings/${m.id}/cancel`, { method: 'POST', data: { reason } });
            load();
        } catch (e) {
            alert(e.response?.data?.message || 'Cancel failed');
        }
    };

    const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

    const platformColor = (id) => platforms.find(p => p.id === id)?.color ?? '#6366f1';
    const platformName  = (id) => platforms.find(p => +p.id === +id)?.name ?? '—';

    return (
        <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5">
                <input value={filter.search} onChange={e => applyFilter('search', e.target.value)}
                    placeholder="Search name / email…"
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56" />
                <select value={filter.platform_id} onChange={e => applyFilter('platform_id', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">All Platforms</option>
                    {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={filter.status} onChange={e => applyFilter('status', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">All Statuses</option>
                    <option>upcoming</option>
                    <option>completed</option>
                    <option>cancelled</option>
                    <option>rescheduled</option>
                </select>
                <div className="ml-auto">
                    <Btn onClick={openCreate}>+ Add Meeting</Btn>
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
            ) : meetings.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-sm">No meetings found.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Platform', 'Title', 'Attendee', 'Start Time', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {meetings.map(m => (
                                <tr key={m.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full" style={{ background: platformColor(m.cal_platform_id) }} />
                                            <span className="text-xs text-gray-600">{platformName(m.cal_platform_id)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{m.title}</td>
                                    <td className="px-4 py-3">
                                        <div className="text-xs">
                                            <div className="font-medium text-gray-900">{m.attendee_name}</div>
                                            <div className="text-gray-400">{m.attendee_email}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                                        {m.start_time ? new Date(m.start_time).toLocaleString() : '—'}
                                    </td>
                                    <td className="px-4 py-3"><Badge status={m.status} /></td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1">
                                            <Btn size="xs" variant="ghost" onClick={() => openEdit(m)}>Edit</Btn>
                                            {m.booking_uid && m.status === 'upcoming' && (
                                                <Btn size="xs" variant="warning" onClick={() => cancelViaApi(m)}>Cancel</Btn>
                                            )}
                                            <Btn size="xs" variant="danger" onClick={() => destroy(m)}>Del</Btn>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Form Modal */}
            {modal === 'form' && (
                <Modal title={editing ? 'Edit Meeting' : 'Add Meeting'} onClose={() => setModal(null)}>
                    <div className="space-y-4">
                        <Field label="Platform *">
                            <Select value={form.cal_platform_id} onChange={f('cal_platform_id')}>
                                <option value="">Select platform…</option>
                                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </Select>
                        </Field>
                        <Field label="Title *">
                            <Input value={form.title} onChange={f('title')} placeholder="Meeting title" />
                        </Field>
                        <Field label="Description">
                            <Textarea value={form.description} onChange={f('description')} placeholder="Optional description" />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Attendee Name *">
                                <Input value={form.attendee_name} onChange={f('attendee_name')} placeholder="John Doe" />
                            </Field>
                            <Field label="Attendee Email *">
                                <Input value={form.attendee_email} onChange={f('attendee_email')} type="email" placeholder="john@example.com" />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Start Time *">
                                <Input value={form.start_time} onChange={f('start_time')} type="datetime-local" />
                            </Field>
                            <Field label="End Time *">
                                <Input value={form.end_time} onChange={f('end_time')} type="datetime-local" />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Status">
                                <Select value={form.status} onChange={f('status')}>
                                    <option value="upcoming">Upcoming</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="rescheduled">Rescheduled</option>
                                </Select>
                            </Field>
                            <Field label="Meeting URL">
                                <Input value={form.meeting_url} onChange={f('meeting_url')} placeholder="https://…" />
                            </Field>
                        </div>
                        {error && <p className="text-red-500 text-xs bg-red-50 p-3 rounded-lg">{error}</p>}
                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                            <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CalIndex() {
    const [tab, setTab]           = useState('platforms');
    const [platforms, setPlatforms] = useState([]);

    useEffect(() => {
        api('platforms').then(({ data }) => setPlatforms(data)).catch(() => {});
    }, []);

    const tabs = [
        { id: 'platforms', label: '⚙️ Platforms' },
        { id: 'meetings',  label: '📅 Meetings'  },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Cal.com Integration</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage multiple Cal.com platforms with separate API keys and meetings.</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    {tab === 'platforms' && <PlatformsTab />}
                    {tab === 'meetings'  && <MeetingsTab platforms={platforms} />}
                </div>
            </div>
        </div>
    );
}
