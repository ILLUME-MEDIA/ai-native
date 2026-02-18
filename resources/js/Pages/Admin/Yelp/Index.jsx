import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// ─── tiny helpers ──────────────────────────────────────────────────────────
const api = (path, options = {}) => axios({ url: `/api/yelp/${path}`, ...options });

function Badge({ color, children }) {
    const colors = {
        green: 'bg-green-100 text-green-800',
        red:   'bg-red-100 text-red-800',
        gray:  'bg-gray-100 text-gray-600',
        blue:  'bg-blue-100 text-blue-800',
        yellow:'bg-yellow-100 text-yellow-800',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color] ?? colors.gray}`}>
            {children}
        </span>
    );
}

function Btn({ onClick, disabled, variant = 'primary', size = 'sm', children, className = '' }) {
    const base = 'inline-flex items-center font-semibold rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed';
    const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
    const variants = {
        primary:  'bg-indigo-600 text-white hover:bg-indigo-500',
        danger:   'bg-red-600 text-white hover:bg-red-500',
        ghost:    'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
        success:  'bg-green-600 text-white hover:bg-green-500',
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
        >
            {children}
        </button>
    );
}

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>
                <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
            </div>
        </div>
    );
}

// ─── ACCOUNTS TAB ──────────────────────────────────────────────────────────
function AccountsTab() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [modal, setModal]       = useState(null); // null | 'add' | account object
    const [form, setForm]         = useState({ name: '', api_key: '', daily_limit: 500, is_active: true });
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const { data } = await api('accounts');
        setAccounts(data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setForm({ name: '', api_key: '', daily_limit: 500, is_active: true });
        setError('');
        setModal('add');
    };

    const openEdit = (acc) => {
        setForm({ name: acc.name, api_key: '', daily_limit: acc.daily_limit, is_active: acc.is_active });
        setError('');
        setModal(acc);
    };

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            if (modal === 'add') {
                await api('accounts', { method: 'post', data: form });
            } else {
                const payload = { ...form };
                if (!payload.api_key) delete payload.api_key;
                await api(`accounts/${modal.id}`, { method: 'patch', data: payload });
            }
            setModal(null);
            load();
        } catch (e) {
            setError(e.response?.data?.message || 'Save failed.');
        } finally {
            setSaving(false);
        }
    };

    const del = async (acc) => {
        if (!confirm(`Delete account "${acc.name}"?`)) return;
        await api(`accounts/${acc.id}`, { method: 'delete' });
        load();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">Manage multiple Yelp API keys. Requests are distributed across accounts.</p>
                <Btn onClick={openAdd}>+ Add Account</Btn>
            </div>

            {loading ? (
                <p className="text-sm text-gray-500">Loading…</p>
            ) : (
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            {['Name', 'Daily Limit', 'Used Today', 'Remaining', 'Status', ''].map(h => (
                                <th key={h} className="px-4 py-2 text-left font-semibold text-gray-700">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {accounts.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No accounts yet.</td></tr>
                        )}
                        {accounts.map(acc => (
                            <tr key={acc.id}>
                                <td className="px-4 py-2 font-medium">{acc.name}</td>
                                <td className="px-4 py-2">{acc.daily_limit.toLocaleString()}</td>
                                <td className="px-4 py-2">{acc.requests_today.toLocaleString()}</td>
                                <td className="px-4 py-2 font-semibold text-green-700">{acc.remaining_requests.toLocaleString()}</td>
                                <td className="px-4 py-2">
                                    <Badge color={acc.is_active ? 'green' : 'gray'}>
                                        {acc.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </td>
                                <td className="px-4 py-2 flex gap-2">
                                    <Btn variant="ghost" onClick={() => openEdit(acc)}>Edit</Btn>
                                    <Btn variant="danger" onClick={() => del(acc)}>Delete</Btn>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {modal && (
                <Modal title={modal === 'add' ? 'Add Yelp Account' : 'Edit Account'} onClose={() => setModal(null)}>
                    {error && <p className="mb-3 text-red-600 text-sm">{error}</p>}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                            <input className="w-full border rounded-md px-3 py-2 text-sm" value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Account 1" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Yelp API Key {modal !== 'add' && <span className="text-gray-400">(leave blank to keep current)</span>}
                            </label>
                            <input className="w-full border rounded-md px-3 py-2 text-sm font-mono" value={form.api_key}
                                onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                                placeholder="Bearer token from Yelp Fusion dashboard" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Request Limit</label>
                            <input type="number" min="1" className="w-full border rounded-md px-3 py-2 text-sm"
                                value={form.daily_limit}
                                onChange={e => setForm(f => ({ ...f, daily_limit: parseInt(e.target.value) || 500 }))} />
                            <p className="text-xs text-gray-500 mt-1">Yelp free tier: 500/day. Check your plan for actual limits.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="acc_active" checked={form.is_active}
                                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                            <label htmlFor="acc_active" className="text-sm text-gray-700">Active</label>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                            <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ─── JOBS TAB ──────────────────────────────────────────────────────────────
const SCHEDULES = [
    { value: 'manual',  label: 'Manual only' },
    { value: 'hourly',  label: 'Every hour' },
    { value: 'daily',   label: 'Every day (midnight)' },
    { value: 'weekly',  label: 'Every week (Sunday)' },
    { value: 'monthly', label: 'Every month (1st)' },
    { value: 'custom',  label: 'Custom cron…' },
];

function JobsTab() {
    const [jobs, setJobs]       = useState([]);
    const [entities, setEntities] = useState([]);
    const [yelpFields, setYelpFields] = useState({});
    const [loading, setLoading] = useState(true);
    const [modal, setModal]     = useState(null);
    const [running, setRunning] = useState({});
    const [error, setError]     = useState('');
    const [saving, setSaving]   = useState(false);

    // Form state
    const emptyForm = {
        name: '', entity_id: '', search_columns: { term: '', address: '', city: '', state: '', zip: '' },
        column_mapping: {}, schedule: 'daily', custom_cron: '', is_active: true,
    };
    const [form, setForm] = useState(emptyForm);
    const selectedEntity  = entities.find(e => String(e.id) === String(form.entity_id));

    const load = useCallback(async () => {
        setLoading(true);
        const [j, e, yf] = await Promise.all([
            api('jobs'),
            api('entities'),
            api('fields'),
        ]);
        setJobs(j.data);
        setEntities(e.data);
        setYelpFields(yf.data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => { setForm(emptyForm); setError(''); setModal('add'); };

    const openEdit = (job) => {
        const sc = job.search_columns || {};
        const cm = job.column_mapping || {};
        const isCustom = !['manual','hourly','daily','weekly','monthly'].includes(job.schedule);
        setForm({
            name:           job.name,
            entity_id:      String(job.entity_id),
            search_columns: { term: sc.term||'', address: sc.address||'', city: sc.city||'', state: sc.state||'', zip: sc.zip||'' },
            column_mapping: cm,
            schedule:       isCustom ? 'custom' : job.schedule,
            custom_cron:    isCustom ? job.schedule : '',
            is_active:      job.is_active,
        });
        setError('');
        setModal(job);
    };

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            const payload = {
                name:           form.name,
                entity_id:      parseInt(form.entity_id),
                search_columns: form.search_columns,
                column_mapping: form.column_mapping,
                schedule:       form.schedule === 'custom' ? form.custom_cron : form.schedule,
                is_active:      form.is_active,
            };
            if (modal === 'add') {
                await api('jobs', { method: 'post', data: payload });
            } else {
                await api(`jobs/${modal.id}`, { method: 'patch', data: payload });
            }
            setModal(null);
            load();
        } catch (e) {
            const errs = e.response?.data?.errors;
            setError(errs ? Object.values(errs).flat().join(' | ') : (e.response?.data?.message || 'Save failed.'));
        } finally {
            setSaving(false);
        }
    };

    const del = async (job) => {
        if (!confirm(`Delete job "${job.name}"?`)) return;
        await api(`jobs/${job.id}`, { method: 'delete' });
        load();
    };

    const runNow = async (job) => {
        setRunning(r => ({ ...r, [job.id]: true }));
        try {
            await api(`jobs/${job.id}/run`, { method: 'post' });
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Run failed.');
        } finally {
            setRunning(r => ({ ...r, [job.id]: false }));
        }
    };

    const toggleMapping = (yelpKey, dbCol) => {
        setForm(f => {
            const cm = { ...f.column_mapping };
            if (cm[yelpKey]) {
                delete cm[yelpKey];
            } else {
                cm[yelpKey] = dbCol || yelpKey;
            }
            return { ...f, column_mapping: cm };
        });
    };

    const setMappingCol = (yelpKey, dbCol) => {
        setForm(f => ({ ...f, column_mapping: { ...f.column_mapping, [yelpKey]: dbCol } }));
    };

    const statusColor = (log) => {
        if (!log) return 'gray';
        return { completed: 'green', failed: 'red', running: 'blue', paused: 'yellow', pending: 'gray' }[log.status] ?? 'gray';
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">Configure which tables to sync with Yelp and how often.</p>
                <Btn onClick={openAdd}>+ New Job</Btn>
            </div>

            {loading ? <p className="text-sm text-gray-500">Loading…</p> : (
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            {['Job Name', 'Table', 'Schedule', 'Last Run', 'Status', ''].map(h => (
                                <th key={h} className="px-4 py-2 text-left font-semibold text-gray-700">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {jobs.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No jobs yet.</td></tr>
                        )}
                        {jobs.map(job => {
                            const log = job.latest_log?.[0];
                            return (
                                <tr key={job.id}>
                                    <td className="px-4 py-2 font-medium">{job.name}</td>
                                    <td className="px-4 py-2">
                                        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{job.entity?.table_name}</code>
                                    </td>
                                    <td className="px-4 py-2 capitalize">{job.schedule}</td>
                                    <td className="px-4 py-2 text-gray-500 text-xs">
                                        {job.last_run_at ? new Date(job.last_run_at).toLocaleString() : '—'}
                                    </td>
                                    <td className="px-4 py-2">
                                        <Badge color={statusColor(log)}>{log?.status ?? 'never run'}</Badge>
                                        {log?.processed_rows > 0 && (
                                            <span className="ml-1 text-xs text-gray-500">({log.processed_rows} rows)</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex gap-1 flex-wrap">
                                            <Btn variant="success" disabled={running[job.id]} onClick={() => runNow(job)}>
                                                {running[job.id] ? 'Running…' : '▶ Run Now'}
                                            </Btn>
                                            <Btn variant="ghost" onClick={() => openEdit(job)}>Edit</Btn>
                                            <Btn variant="danger" onClick={() => del(job)}>Delete</Btn>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            {modal && (
                <Modal
                    title={modal === 'add' ? 'New Yelp Sync Job' : `Edit: ${modal.name}`}
                    onClose={() => setModal(null)}
                >
                    {error && <p className="mb-3 text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
                    <div className="space-y-5">
                        {/* Job Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Job Name</label>
                            <input className="w-full border rounded-md px-3 py-2 text-sm" value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sync Restaurants" />
                        </div>

                        {/* Table */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Table (Entity)</label>
                            <select className="w-full border rounded-md px-3 py-2 text-sm"
                                value={form.entity_id}
                                onChange={e => setForm(f => ({ ...f, entity_id: e.target.value, search_columns: { term:'',address:'',city:'',state:'',zip:'' }, column_mapping: {} }))}>
                                <option value="">— Select a table —</option>
                                {entities.map(e => (
                                    <option key={e.id} value={e.id}>{e.name} ({e.table_name})</option>
                                ))}
                            </select>
                        </div>

                        {selectedEntity && (
                            <>
                                {/* Search Column Mapping */}
                                <div className="border rounded-lg p-4 bg-gray-50">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Yelp Search Columns</h3>
                                    <p className="text-xs text-gray-500 mb-3">Map your table columns to Yelp search parameters.</p>
                                    {[
                                        { key: 'term',    label: 'Business Name *', required: true },
                                        { key: 'address', label: 'Street Address' },
                                        { key: 'city',    label: 'City' },
                                        { key: 'state',   label: 'State / Province' },
                                        { key: 'zip',     label: 'Zip Code' },
                                    ].map(({ key, label, required }) => (
                                        <div key={key} className="flex items-center gap-3 mb-2">
                                            <span className="w-36 text-xs text-gray-600 shrink-0">{label}</span>
                                            <select className="flex-1 border rounded px-2 py-1 text-xs"
                                                value={form.search_columns[key] || ''}
                                                onChange={e => setForm(f => ({ ...f, search_columns: { ...f.search_columns, [key]: e.target.value } }))}>
                                                <option value="">— none —</option>
                                                {selectedEntity.fields?.map(field => (
                                                    <option key={field.id} value={field.column_name}>{field.label} ({field.column_name})</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>

                                {/* Yelp Fields to Sync Back */}
                                <div className="border rounded-lg p-4 bg-gray-50">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-1">Yelp Fields to Sync</h3>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Check a field to sync it. Set the DB column name (auto-created if it doesn't exist).
                                    </p>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {Object.entries(yelpFields).map(([yelpKey, meta]) => {
                                            const checked = yelpKey in form.column_mapping;
                                            const dbCol   = form.column_mapping[yelpKey] ?? yelpKey;
                                            return (
                                                <div key={yelpKey} className="flex items-center gap-2">
                                                    <input type="checkbox" id={`fy_${yelpKey}`} checked={checked}
                                                        onChange={() => toggleMapping(yelpKey, dbCol)} />
                                                    <label htmlFor={`fy_${yelpKey}`} className="text-xs w-44 shrink-0 text-gray-700">
                                                        {meta.label}
                                                        <span className="ml-1 text-gray-400">({meta.type})</span>
                                                    </label>
                                                    {checked && (
                                                        <input
                                                            className="flex-1 border rounded px-2 py-0.5 text-xs font-mono"
                                                            value={dbCol}
                                                            onChange={e => setMappingCol(yelpKey, e.target.value)}
                                                            placeholder="db_column_name"
                                                        />
                                                    )}
                                                    {checked && !selectedEntity.fields?.find(f => f.column_name === dbCol) && (
                                                        <span className="text-xs text-orange-600 shrink-0">will be created</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Schedule */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
                            <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.schedule}
                                onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}>
                                {SCHEDULES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            {form.schedule === 'custom' && (
                                <input className="mt-2 w-full border rounded-md px-3 py-2 text-sm font-mono"
                                    value={form.custom_cron}
                                    onChange={e => setForm(f => ({ ...f, custom_cron: e.target.value }))}
                                    placeholder="e.g. 0 6 * * *" />
                            )}
                        </div>

                        {/* Active toggle */}
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="job_active" checked={form.is_active}
                                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                            <label htmlFor="job_active" className="text-sm text-gray-700">Active (runs on schedule)</label>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                            <Btn onClick={save} disabled={saving || !form.entity_id || !form.name}>
                                {saving ? 'Saving…' : 'Save Job'}
                            </Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ─── LOGS TAB ──────────────────────────────────────────────────────────────
function LogsTab() {
    const [logs, setLogs]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [jobFilter, setJobFilter] = useState('');
    const [jobs, setJobs]     = useState([]);

    const load = useCallback(async () => {
        setLoading(true);
        const [l, j] = await Promise.all([
            api(`logs${jobFilter ? `?job_id=${jobFilter}` : ''}`),
            api('jobs'),
        ]);
        setLogs(l.data.data || l.data);
        setJobs(j.data);
        setLoading(false);
    }, [jobFilter]);

    useEffect(() => { load(); }, [load]);

    const statusColor = (s) => ({ completed: 'green', failed: 'red', running: 'blue', paused: 'yellow', pending: 'gray' }[s] ?? 'gray');

    return (
        <div>
            <div className="flex items-center gap-3 mb-4">
                <select className="border rounded-md px-3 py-1.5 text-sm"
                    value={jobFilter} onChange={e => setJobFilter(e.target.value)}>
                    <option value="">All Jobs</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                </select>
                <Btn variant="ghost" onClick={load}>Refresh</Btn>
            </div>

            {loading ? <p className="text-sm text-gray-500">Loading…</p> : (
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            {['Job', 'Account Used', 'Status', 'Rows', 'New Columns', 'Duration', 'Started'].map(h => (
                                <th key={h} className="px-4 py-2 text-left font-semibold text-gray-700">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {logs.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No logs yet.</td></tr>
                        )}
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td className="px-4 py-2 font-medium">{log.job?.name ?? `Job #${log.job_id}`}</td>
                                <td className="px-4 py-2 text-gray-500">{log.account?.name ?? '—'}</td>
                                <td className="px-4 py-2">
                                    <Badge color={statusColor(log.status)}>{log.status}</Badge>
                                    {log.error_message && (
                                        <p className="text-xs text-red-500 mt-0.5 max-w-xs truncate" title={log.error_message}>
                                            {log.error_message}
                                        </p>
                                    )}
                                </td>
                                <td className="px-4 py-2 text-xs">
                                    <span className="text-green-700">{log.processed_rows} ok</span>
                                    {log.failed_rows > 0 && <span className="text-red-600 ml-1">{log.failed_rows} fail</span>}
                                    {log.skipped_rows > 0 && <span className="text-gray-400 ml-1">{log.skipped_rows} skip</span>}
                                    <span className="text-gray-400 ml-1">/ {log.total_rows} total</span>
                                </td>
                                <td className="px-4 py-2">
                                    {log.new_columns_added?.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {log.new_columns_added.map(c => (
                                                <span key={c} className="text-xs bg-orange-100 text-orange-700 px-1 py-0.5 rounded">{c}</span>
                                            ))}
                                        </div>
                                    ) : '—'}
                                </td>
                                <td className="px-4 py-2 text-gray-500">{log.duration ?? '—'}</td>
                                <td className="px-4 py-2 text-gray-500 text-xs">
                                    {log.started_at ? new Date(log.started_at).toLocaleString() : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────
const TABS = [
    { id: 'jobs',     label: 'Sync Jobs' },
    { id: 'accounts', label: 'API Accounts' },
    { id: 'logs',     label: 'Run Logs' },
];

export default function YelpIndex() {
    const [tab, setTab] = useState('jobs');

    return (
        <div className="py-6">
            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">Yelp Integration</h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    Verify & enrich any table's data using Yelp Fusion API.
                                    Missing columns are auto-created.
                                </p>
                            </div>
                            <span className="text-2xl">🍽</span>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-gray-200 mb-6">
                            <nav className="-mb-px flex gap-4">
                                {TABS.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTab(t.id)}
                                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
                                            tab === t.id
                                                ? 'border-indigo-600 text-indigo-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {tab === 'accounts' && <AccountsTab />}
                        {tab === 'jobs'     && <JobsTab />}
                        {tab === 'logs'     && <LogsTab />}
                    </div>
                </div>
            </div>
        </div>
    );
}
