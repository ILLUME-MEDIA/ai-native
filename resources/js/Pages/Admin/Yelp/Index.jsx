import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

const api = (path, options = {}) => axios({ url: `/api/yelp/${path}`, ...options });

function Badge({ color, children }) {
    const colors = {
        green: 'bg-green-100 text-green-800',
        red: 'bg-red-100 text-red-800',
        gray: 'bg-gray-100 text-gray-600',
        blue: 'bg-blue-100 text-blue-800',
        yellow: 'bg-yellow-100 text-yellow-800',
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color] ?? colors.gray}`}>{children}</span>;
}

function Btn({ onClick, disabled, variant = 'primary', children }) {
    const variants = {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
        danger: 'bg-red-600 text-white hover:bg-red-500',
        ghost: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
        success: 'bg-green-600 text-white hover:bg-green-500',
        warning: 'bg-amber-600 text-white hover:bg-amber-500',
    };
    return <button onClick={onClick} disabled={disabled} className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md transition disabled:opacity-50 ${variants[variant]}`}>{children}</button>;
}

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>
                <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
            </div>
        </div>
    );
}

function AccountsTab() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ name: '', api_key: '', daily_limit: 500, is_active: true });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [revealing, setRevealing] = useState(false);
    const [keyVisible, setKeyVisible] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const { data } = await api('accounts');
        setAccounts(data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openEdit = (acc) => {
        setForm({ name: acc.name, api_key: '', daily_limit: acc.daily_limit, is_active: acc.is_active });
        setKeyVisible(false);
        setModal(acc);
    };

    const revealKey = async () => {
        setRevealing(true);
        try {
            const { data } = await api(`accounts/${modal.id}/reveal`, { method: 'post' });
            setForm(f => ({ ...f, api_key: data.api_key }));
            setKeyVisible(true);
        } catch {
            setError('Could not reveal API key.');
        } finally {
            setRevealing(false);
        }
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

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">Manage Yelp API accounts.</p>
                <Btn onClick={() => { setForm({ name: '', api_key: '', daily_limit: 500, is_active: true }); setKeyVisible(false); setModal('add'); }}>+ Add Account</Btn>
            </div>
            {loading ? <p className="text-sm text-gray-500">Loading...</p> : (
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50"><tr>{['Name', 'Daily', 'Used', 'Remain', 'Status', ''].map(h => <th key={h} className="px-4 py-2 text-left font-semibold text-gray-700">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {accounts.map(acc => (
                            <tr key={acc.id}>
                                <td className="px-4 py-2 font-medium">{acc.name}</td>
                                <td className="px-4 py-2">{acc.daily_limit}</td>
                                <td className="px-4 py-2">{acc.requests_today}</td>
                                <td className="px-4 py-2">{acc.remaining_requests}</td>
                                <td className="px-4 py-2"><Badge color={acc.is_active ? 'green' : 'gray'}>{acc.is_active ? 'Active' : 'Inactive'}</Badge></td>
                                <td className="px-4 py-2 flex gap-2">
                                    <Btn variant="ghost" onClick={() => openEdit(acc)}>Edit</Btn>
                                    <Btn variant="danger" onClick={async () => { if (confirm(`Delete "${acc.name}"?`)) { await api(`accounts/${acc.id}`, { method: 'delete' }); load(); } }}>Delete</Btn>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {modal && (
                <Modal title={modal === 'add' ? 'Add Yelp Account' : `Edit: ${modal.name}`} onClose={() => setModal(null)}>
                    {error && <p className="mb-3 text-red-600 text-sm">{error}</p>}
                    <div className="space-y-4">
                        <input className="w-full border rounded-md px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Account name" />
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                API Key {modal !== 'add' && !keyVisible && <span className="text-gray-400">(leave blank to keep existing)</span>}
                            </label>
                            {modal !== 'add' && !keyVisible ? (
                                <div className="flex gap-2">
                                    <div className="flex-1 border rounded-md px-3 py-2 text-sm font-mono bg-gray-50 text-gray-400 tracking-widest">••••••••••••••••••••</div>
                                    <Btn variant="ghost" onClick={revealKey} disabled={revealing}>{revealing ? 'Loading...' : 'Reveal Key'}</Btn>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 border rounded-md px-3 py-2 text-sm font-mono"
                                        type="text"
                                        value={form.api_key}
                                        onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                                        placeholder={modal === 'add' ? 'Enter Yelp API key' : 'Enter new key to replace'}
                                        autoFocus={keyVisible}
                                    />
                                    {modal !== 'add' && (
                                        <Btn variant="ghost" onClick={() => { setKeyVisible(false); setForm(f => ({ ...f, api_key: '' })); }}>Hide</Btn>
                                    )}
                                </div>
                            )}
                        </div>
                        <input type="number" min="1" className="w-full border rounded-md px-3 py-2 text-sm" value={form.daily_limit} onChange={e => setForm(f => ({ ...f, daily_limit: parseInt(e.target.value, 10) || 500 }))} placeholder="Daily limit" />
                        <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Active</label>
                        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Btn></div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

const SCHEDULES = [
    { value: 'manual', label: 'Manual only' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom cron...' },
];

function JobsTab() {
    const [jobs, setJobs] = useState([]);
    const [entities, setEntities] = useState([]);
    const [yelpFields, setYelpFields] = useState({});
    const [googleFields, setGoogleFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [stopping, setStopping] = useState({}); // { [job.id]: true }
    const pollRef = useRef(null);

    const empty = {
        name: '',
        entity_id: '',
        search_columns: { term: '', address: '', city: '', state: '', zip: '', country: '', country_value: 'us' },
        column_mapping: {},
        schedule: 'daily',
        custom_cron: '',
        auto_merge: false,
        google_enabled: false,
        google_column_mapping: {},
        is_active: true,
    };
    const [form, setForm] = useState(empty);
    const selectedEntity = useMemo(() => entities.find(e => String(e.id) === String(form.entity_id)), [entities, form.entity_id]);

    const load = useCallback(async () => {
        setLoading(true);
        const [j, e, yf, gf] = await Promise.all([api('jobs'), api('entities'), api('fields'), api('google/fields')]);
        setJobs(j.data);
        setEntities(e.data);
        setYelpFields(yf.data);
        setGoogleFields(gf.data || []);
        setLoading(false);
        return j.data;
    }, []);

    // Start polling if any job is running/pending
    const startPollingIfNeeded = useCallback((jobList) => {
        const hasActive = jobList.some(j => ['running', 'pending'].includes(j.latest_log?.[0]?.status));
        if (hasActive && !pollRef.current) {
            pollRef.current = setInterval(async () => {
                const { data } = await api('jobs');
                setJobs(data);
                const stillActive = data.some(j => ['running', 'pending'].includes(j.latest_log?.[0]?.status));
                if (!stillActive) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }
            }, 4000);
        }
    }, []);

    useEffect(() => {
        load().then(startPollingIfNeeded);
        return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    }, [load, startPollingIfNeeded]);

    const openEdit = (job) => {
        const sc = job.search_columns || {};
        const isCustom = !['manual', 'hourly', 'daily', 'weekly', 'monthly'].includes(job.schedule);
        setForm({
            name: job.name,
            entity_id: String(job.entity_id),
            search_columns: {
                term: sc.term || '',
                address: sc.address || '',
                city: sc.city || '',
                state: sc.state || '',
                zip: sc.zip || '',
                country: sc.country || '',
                country_value: sc.country_value || 'us',
            },
            column_mapping: job.column_mapping || {},
            schedule: isCustom ? 'custom' : job.schedule,
            custom_cron: isCustom ? job.schedule : '',
            auto_merge: !!job.auto_merge,
            google_enabled: !!job.google_enabled,
            google_column_mapping: job.google_column_mapping || {},
            is_active: job.is_active,
        });
        setModal(job);
    };

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            const payload = {
                name: form.name,
                entity_id: parseInt(form.entity_id, 10),
                search_columns: form.search_columns,
                column_mapping: form.column_mapping,
                schedule: form.schedule === 'custom' ? form.custom_cron : form.schedule,
                auto_merge: form.auto_merge,
                google_enabled: form.google_enabled,
                google_column_mapping: Object.keys(form.google_column_mapping).length > 0 ? form.google_column_mapping : null,
                is_active: form.is_active,
            };
            if (modal === 'add') await api('jobs', { method: 'post', data: payload });
            else await api(`jobs/${modal.id}`, { method: 'patch', data: payload });
            setModal(null);
            load();
        } catch (e) {
            const errs = e.response?.data?.errors;
            setError(errs ? Object.values(errs).flat().join(' | ') : (e.response?.data?.message || 'Save failed.'));
        } finally {
            setSaving(false);
        }
    };

    const runNow = async (job) => {
        try {
            await api(`jobs/${job.id}/run`, { method: 'post' });
        } catch (e) {
            // 409 = already running, just start polling to reflect current state
            if (e.response?.status !== 409) {
                alert(e.response?.data?.error || 'Failed to start job.');
                return;
            }
        }
        // Immediately refresh so status shows pending/running, then start polling
        const jobList = await load();
        startPollingIfNeeded(jobList);
    };

    const stopJob = async (job) => {
        const log = job.latest_log?.[0];
        if (!log) return;
        setStopping(s => ({ ...s, [job.id]: true }));
        try {
            await api(`logs/${log.id}/stop`, { method: 'post' });
        } catch { /* ignore */ }
        setStopping(s => { const n = { ...s }; delete n[job.id]; return n; });
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        load();
    };

    const toggleMapping = (yelpKey) => {
        setForm(f => {
            const cm = { ...f.column_mapping };
            if (cm[yelpKey]) delete cm[yelpKey];
            else cm[yelpKey] = yelpKey;
            return { ...f, column_mapping: cm };
        });
    };

    const setMappingCol = (yelpKey, dbCol) => setForm(f => ({ ...f, column_mapping: { ...f.column_mapping, [yelpKey]: dbCol } }));

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">US-only Yelp jobs with diff + merge workflow.</p>
                <Btn onClick={() => { setForm(empty); setError(''); setModal('add'); }}>+ New Job</Btn>
            </div>

            {loading ? <p className="text-sm text-gray-500">Loading...</p> : (
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>{['Job', 'Table', 'Schedule', 'Auto Merge', 'Google', 'Status', ''].map(h => <th key={h} className="px-4 py-2 text-left font-semibold text-gray-700">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {jobs.map(job => {
                            const log = job.latest_log?.[0];
                            const isActive = ['running', 'pending'].includes(log?.status);
                            return (
                                <tr key={job.id}>
                                    <td className="px-4 py-2 font-medium">{job.name}</td>
                                    <td className="px-4 py-2"><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{job.entity?.table_name}</code></td>
                                    <td className="px-4 py-2">{job.schedule}</td>
                                    <td className="px-4 py-2"><Badge color={job.auto_merge ? 'green' : 'yellow'}>{job.auto_merge ? 'On' : 'Manual'}</Badge></td>
                                    <td className="px-4 py-2"><Badge color={job.google_enabled ? 'blue' : 'gray'}>{job.google_enabled ? 'On' : 'Off'}</Badge></td>
                                    <td className="px-4 py-2"><Badge color={{ completed: 'green', failed: 'red', running: 'blue', paused: 'yellow', pending: 'gray' }[log?.status] ?? 'gray'}>{log?.status ?? 'never'}</Badge></td>
                                    <td className="px-4 py-2 flex gap-1">
                                        {isActive
                                            ? <Btn variant="danger" onClick={() => stopJob(job)} disabled={!!stopping[job.id]}>{stopping[job.id] ? 'Stopping...' : 'Stop'}</Btn>
                                            : <Btn variant="success" onClick={() => runNow(job)}>Run</Btn>
                                        }
                                        <Btn variant="ghost" onClick={() => openEdit(job)} disabled={isActive}>Edit</Btn>
                                        <Btn variant="danger" onClick={async () => { if (confirm(`Delete "${job.name}"?`)) { await api(`jobs/${job.id}`, { method: 'delete' }); load(); } }} disabled={isActive}>Delete</Btn>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            {modal && (
                <Modal title={modal === 'add' ? 'New Yelp Sync Job' : `Edit: ${modal.name}`} onClose={() => setModal(null)}>
                    {error && <p className="mb-3 text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
                    <div className="space-y-5">
                        <input className="w-full border rounded-md px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Job name" />
                        <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.entity_id} onChange={e => setForm(f => ({ ...f, entity_id: e.target.value, search_columns: { term: '', address: '', city: '', state: '', zip: '', country: '', country_value: 'us' }, column_mapping: {} }))}>
                            <option value="">- Select table -</option>
                            {entities.map(e => <option key={e.id} value={e.id}>{e.name} ({e.table_name})</option>)}
                        </select>

                        {selectedEntity && (
                            <>
                                <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
                                    {[
                                        ['term', 'Business Name *'],
                                        ['address', 'Address'],
                                        ['city', 'City'],
                                        ['state', 'State'],
                                        ['zip', 'Zip'],
                                        ['country', 'Country column (optional)'],
                                    ].map(([key, label]) => (
                                        <div key={key} className="flex items-center gap-3">
                                            <span className="w-48 text-xs text-gray-600">{label}</span>
                                            <select className="flex-1 border rounded px-2 py-1 text-xs" value={form.search_columns[key] || ''} onChange={e => setForm(f => ({ ...f, search_columns: { ...f.search_columns, [key]: e.target.value } }))}>
                                                <option value="">- none -</option>
                                                {selectedEntity.fields?.map(field => <option key={field.id} value={field.column_name}>{field.label} ({field.column_name})</option>)}
                                            </select>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-3">
                                        <span className="w-48 text-xs text-gray-600">Country value (manual)</span>
                                        <input
                                            className="flex-1 border rounded px-2 py-1 text-xs"
                                            value={form.search_columns.country_value || ''}
                                            onChange={e => setForm(f => ({ ...f, search_columns: { ...f.search_columns, country_value: e.target.value } }))}
                                            placeholder="us / usa / united states"
                                        />
                                    </div>
                                </div>

                                <div className="border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto space-y-2">
                                    {Object.entries(yelpFields).map(([yelpKey, meta]) => {
                                        const checked = yelpKey in form.column_mapping;
                                        const dbCol = form.column_mapping[yelpKey] ?? yelpKey;
                                        return (
                                            <div key={yelpKey} className="flex items-center gap-2">
                                                <input type="checkbox" checked={checked} onChange={() => toggleMapping(yelpKey)} />
                                                <span className="text-xs w-44 text-gray-700">{meta.label}</span>
                                                {checked && <input className="flex-1 border rounded px-2 py-0.5 text-xs font-mono" value={dbCol} onChange={e => setMappingCol(yelpKey, e.target.value)} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}>
                            {SCHEDULES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        {form.schedule === 'custom' && <input className="w-full border rounded-md px-3 py-2 text-sm font-mono" value={form.custom_cron} onChange={e => setForm(f => ({ ...f, custom_cron: e.target.value }))} placeholder="0 6 * * *" />}
                        <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={form.auto_merge} onChange={e => setForm(f => ({ ...f, auto_merge: e.target.checked }))} /> Auto merge</label>

                        {/* ── Google Enrichment ── */}
                        <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
                            <label className="text-sm font-medium text-blue-900 flex items-center gap-2">
                                <input type="checkbox" checked={form.google_enabled} onChange={e => setForm(f => ({ ...f, google_enabled: e.target.checked }))} />
                                Enable Google Places enrichment
                            </label>
                            {form.google_enabled && (
                                <div>
                                    <p className="text-xs text-blue-700 mb-2">
                                        After Yelp verifies each business, Google Places data will be fetched and written directly to the record.
                                        Leave all unchecked to auto-create <code>google_*</code> columns with every available field.
                                        Check individual fields to use custom column names instead.
                                    </p>
                                    <div className="max-h-56 overflow-y-auto space-y-1 bg-white border rounded p-2">
                                        {googleFields.map(gf => {
                                            const checked = gf.key in form.google_column_mapping;
                                            const dbCol = form.google_column_mapping[gf.key] ?? gf.key;
                                            return (
                                                <div key={gf.key} className="flex items-center gap-2">
                                                    <input type="checkbox" checked={checked} onChange={() => setForm(f => {
                                                        const gcm = { ...f.google_column_mapping };
                                                        if (gcm[gf.key]) delete gcm[gf.key];
                                                        else gcm[gf.key] = gf.key;
                                                        return { ...f, google_column_mapping: gcm };
                                                    })} />
                                                    <span className="text-xs w-52 text-gray-700">{gf.label}</span>
                                                    {checked && (
                                                        <input
                                                            className="flex-1 border rounded px-2 py-0.5 text-xs font-mono"
                                                            value={dbCol}
                                                            onChange={e => setForm(f => ({ ...f, google_column_mapping: { ...f.google_column_mapping, [gf.key]: e.target.value } }))}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Active</label>
                        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn><Btn onClick={save} disabled={saving || !form.entity_id || !form.name || !form.search_columns.term}>{saving ? 'Saving...' : 'Save Job'}</Btn></div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function LogsTab() {
    const [logs, setLogs] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [jobFilter, setJobFilter] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const [l, j] = await Promise.all([api(`logs${jobFilter ? `?job_id=${jobFilter}` : ''}`), api('jobs')]);
        setLogs(l.data.data || l.data);
        setJobs(j.data);
        setLoading(false);
    }, [jobFilter]);

    useEffect(() => { load(); }, [load]);

    return (
        <div>
            <div className="flex items-center gap-3 mb-4">
                <select className="border rounded-md px-3 py-1.5 text-sm" value={jobFilter} onChange={e => setJobFilter(e.target.value)}>
                    <option value="">All Jobs</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                </select>
                <Btn variant="ghost" onClick={load}>Refresh</Btn>
            </div>
            {loading ? <p className="text-sm text-gray-500">Loading...</p> : (
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50"><tr>{['Job', 'Status', 'Rows', 'Started'].map(h => <th key={h} className="px-4 py-2 text-left font-semibold text-gray-700">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td className="px-4 py-2">{log.job?.name ?? `Job #${log.job_id}`}</td>
                                <td className="px-4 py-2"><Badge color={{ completed: 'green', failed: 'red', running: 'blue', paused: 'yellow', pending: 'gray' }[log.status] ?? 'gray'}>{log.status}</Badge></td>
                                <td className="px-4 py-2 text-xs">{log.processed_rows} done, {log.closed_rows} closed, {log.not_found_rows} not-found, {log.skipped_rows ?? 0} skipped, {log.failed_rows} failed</td>
                                <td className="px-4 py-2 text-xs text-gray-500">{log.started_at ? new Date(log.started_at).toLocaleString() : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

function ReconciliationTab() {
    const [jobs, setJobs] = useState([]);
    const [jobFilter, setJobFilter] = useState('');
    const [summary, setSummary] = useState(null);
    const [matches, setMatches] = useState([]);
    const [closedRows, setClosedRows] = useState([]);
    const [notFoundRows, setNotFoundRows] = useState([]);
    const [skippedRows, setSkippedRows] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [expandedDiff, setExpandedDiff] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mergeLoading, setMergeLoading] = useState(false);

    const params = jobFilter ? `?job_id=${jobFilter}` : '';
    const load = useCallback(async () => {
        setLoading(true);
        const [j, s, m, c, n, sk, mi] = await Promise.all([
            api('jobs'),
            api(`reconciliation/summary${params}`),
            api(`reconciliation/matches${params}`),
            api(`reconciliation/closed${params}`),
            api(`reconciliation/not-found${params}`),
            api(`reconciliation/skipped${params}`),
            api(`reconciliation/menu-items${params}`),
        ]);
        setJobs(j.data);
        setSummary(s.data);
        setMatches(m.data.data || []);
        setClosedRows(c.data.data || []);
        setNotFoundRows(n.data.data || []);
        setSkippedRows(sk.data.data || []);
        setMenuItems(mi.data.data || []);
        setLoading(false);
    }, [params]);

    useEffect(() => { load(); }, [load]);

    const mergeAll = async () => {
        if (!jobFilter) return alert('Select a job first.');
        setMergeLoading(true);
        try {
            const { data } = await api('reconciliation/merge', { method: 'post', data: { job_id: parseInt(jobFilter, 10), all_pending: true } });
            alert(`Merged ${data.merged}/${data.total}. Menu inserted: ${data.menu_inserted ?? 0}, menu updated: ${data.menu_updated ?? 0}`);
            load();
        } finally {
            setMergeLoading(false);
        }
    };

    // Group menu items by match_diff_id for expandable rows
    const menuByDiff = useMemo(() => {
        const map = {};
        menuItems.forEach(item => {
            const key = item.match_diff_id;
            if (!map[key]) map[key] = [];
            map[key].push(item);
        });
        return map;
    }, [menuItems]);

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <select className="border rounded-md px-3 py-1.5 text-sm" value={jobFilter} onChange={e => setJobFilter(e.target.value)}>
                    <option value="">All Jobs</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                </select>
                <Btn variant="ghost" onClick={load}>Refresh</Btn>
                <Btn variant="warning" onClick={mergeAll} disabled={mergeLoading || !jobFilter}>{mergeLoading ? 'Merging...' : 'Merge Pending'}</Btn>
            </div>

            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
                    <div className="border rounded p-3 bg-yellow-50">Pending: <b>{summary.pending_diffs}</b></div>
                    <div className="border rounded p-3 bg-green-50">Merged: <b>{summary.merged_diffs}</b></div>
                    <div className="border rounded p-3 bg-gray-50">Diff skipped: <b>{summary.skipped_diffs}</b></div>
                    <div className="border rounded p-3 bg-amber-50">Closed: <b>{summary.closed_rows}</b></div>
                    <div className="border rounded p-3 bg-red-50">Not found: <b>{summary.not_found_rows}</b></div>
                    <div className="border rounded p-3 bg-orange-50">Sync skipped: <b>{summary.skipped_sync_rows ?? 0}</b></div>
                    <div className="border rounded p-3 bg-blue-50">Menu items: <b>{summary.menu_items ?? 0}</b></div>
                </div>
            )}

            {loading ? <p className="text-sm text-gray-500">Loading...</p> : (
                <>
                    {/* Matched Diffs with expandable menu items */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Matched Diffs</h3>
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50"><tr>{['Job', 'Row', 'Yelp Business', 'Diff', 'Menu', 'Merge'].map(h => <th key={h} className="px-4 py-2 text-left font-semibold text-gray-700">{h}</th>)}</tr></thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {matches.map(row => {
                                    const changed = (row.field_diffs || []).filter(d => d.changed);
                                    const diffMenuItems = menuByDiff[row.id] || [];
                                    const isExpanded = expandedDiff === row.id;
                                    return (
                                        <React.Fragment key={row.id}>
                                            <tr className={isExpanded ? 'bg-blue-50' : ''}>
                                                <td className="px-4 py-2">{row.job?.name ?? `Job #${row.job_id}`}</td>
                                                <td className="px-4 py-2 font-mono text-xs">{row.source_table}#{row.source_row_id}</td>
                                                <td className="px-4 py-2 font-medium">{row.yelp_business_name ?? <span className="text-gray-400">-</span>}</td>
                                                <td className="px-4 py-2 text-xs">{changed.slice(0, 2).map((d, i) => <div key={i}>{d.db_column}: "{String(d.local_value ?? '')}" → "{String(d.yelp_value ?? '')}"</div>)}</td>
                                                <td className="px-4 py-2 text-xs">
                                                    {diffMenuItems.length > 0
                                                        ? <button onClick={() => setExpandedDiff(isExpanded ? null : row.id)} className="text-blue-600 hover:underline font-medium">{diffMenuItems.length} items {isExpanded ? '▲' : '▼'}</button>
                                                        : <span className="text-gray-400">0</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-2"><Badge color={{ pending: 'yellow', merged: 'green', skipped: 'gray' }[row.merge_status] ?? 'gray'}>{row.merge_status}</Badge></td>
                                            </tr>
                                            {isExpanded && diffMenuItems.length > 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-3 bg-blue-50">
                                                        <p className="text-xs font-semibold text-blue-800 mb-2">Menu Items from Yelp — {row.yelp_business_name}</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                            {diffMenuItems.map(item => (
                                                                <div key={item.id} className="bg-white border rounded p-2 text-xs flex gap-2">
                                                                    {item.image && <img src={item.image} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />}
                                                                    <div className="min-w-0">
                                                                        <div className="font-medium truncate">{item.name}</div>
                                                                        {item.category && <div className="text-gray-500">{item.category}</div>}
                                                                        {item.price != null && <div className="text-green-700 font-semibold">${Number(item.price).toFixed(2)}</div>}
                                                                        {item.description && <div className="text-gray-400 truncate">{item.description}</div>}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">Closed on Yelp <span className="text-gray-400 font-normal">({closedRows.length})</span></h3>
                            <div className="border rounded p-3 text-xs max-h-64 overflow-y-auto">
                                {closedRows.length === 0 ? <span className="text-gray-400">None</span> : closedRows.map(r => (
                                    <div key={r.id} className="py-1 border-b last:border-b-0">
                                        <span className="font-medium">{r.search_term || <span className="text-gray-400">—</span>}</span>
                                        <span className="text-gray-400 ml-1">({r.source_table}#{r.source_row_id})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">Not Found on Yelp <span className="text-gray-400 font-normal">({notFoundRows.length})</span></h3>
                            <div className="border rounded p-3 text-xs max-h-64 overflow-y-auto">
                                {notFoundRows.length === 0 ? <span className="text-gray-400">None</span> : notFoundRows.map(r => (
                                    <div key={r.id} className="py-1 border-b last:border-b-0">
                                        <span className="font-medium">{r.search_term || <span className="text-gray-400">—</span>}</span>
                                        <span className="text-gray-400 ml-1">({r.source_table}#{r.source_row_id})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">Skipped (sync) <span className="text-gray-400 font-normal">({skippedRows.length})</span></h3>
                            <div className="border rounded p-3 text-xs max-h-64 overflow-y-auto">
                                {skippedRows.length === 0 ? <span className="text-gray-400">None</span> : skippedRows.map(r => (
                                    <div key={r.id} className="py-1 border-b last:border-b-0">
                                        <span className="font-medium">{r.search_term || <span className="italic text-gray-400">Row #{r.row_id}</span>}</span>
                                        <span className="text-gray-400 ml-1 block">{r.error}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function GoogleAccountsTab() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ name: '', api_key: '', daily_limit: 1000, is_active: true });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [revealing, setRevealing] = useState(false);
    const [keyVisible, setKeyVisible] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verifyResult, setVerifyResult] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        const { data } = await api('google/accounts');
        setAccounts(data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openEdit = (acc) => {
        setForm({ name: acc.name, api_key: '', daily_limit: acc.daily_limit, is_active: acc.is_active });
        setKeyVisible(false);
        setVerifyResult(null);
        setModal(acc);
    };

    const revealKey = async () => {
        setRevealing(true);
        try {
            const { data } = await api(`google/accounts/${modal.id}/reveal`, { method: 'post' });
            setForm(f => ({ ...f, api_key: data.api_key }));
            setKeyVisible(true);
        } catch {
            setError('Could not reveal API key.');
        } finally {
            setRevealing(false);
        }
    };

    const verifyKey = async () => {
        setVerifying(true);
        setVerifyResult(null);
        try {
            const payload = modal === 'add' ? { api_key: form.api_key } : { account_id: modal.id };
            const { data } = await api('google/accounts/verify', { method: 'post', data: payload });
            setVerifyResult({ ok: data.status === 'valid', msg: data.message });
        } catch (e) {
            setVerifyResult({ ok: false, msg: e.response?.data?.message || 'Verification failed.' });
        } finally {
            setVerifying(false);
        }
    };

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            if (modal === 'add') {
                await api('google/accounts', { method: 'post', data: form });
            } else {
                const payload = { ...form };
                if (!payload.api_key) delete payload.api_key;
                await api(`google/accounts/${modal.id}`, { method: 'patch', data: payload });
            }
            setModal(null);
            load();
        } catch (e) {
            setError(e.response?.data?.message || 'Save failed.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">Google Places API keys used to enrich Yelp-verified businesses.</p>
                <Btn onClick={() => { setForm({ name: '', api_key: '', daily_limit: 1000, is_active: true }); setKeyVisible(false); setVerifyResult(null); setModal('add'); }}>+ Add Account</Btn>
            </div>
            {loading ? <p className="text-sm text-gray-500">Loading...</p> : (
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50"><tr>{['Name', 'Daily Limit', 'Used', 'Remaining', 'Status', ''].map(h => <th key={h} className="px-4 py-2 text-left font-semibold text-gray-700">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {accounts.map(acc => (
                            <tr key={acc.id}>
                                <td className="px-4 py-2 font-medium">{acc.name}</td>
                                <td className="px-4 py-2">{acc.daily_limit}</td>
                                <td className="px-4 py-2">{acc.requests_today}</td>
                                <td className="px-4 py-2">{acc.remaining_requests}</td>
                                <td className="px-4 py-2"><Badge color={acc.is_active ? 'green' : 'gray'}>{acc.is_active ? 'Active' : 'Inactive'}</Badge></td>
                                <td className="px-4 py-2 flex gap-2">
                                    <Btn variant="ghost" onClick={() => openEdit(acc)}>Edit</Btn>
                                    <Btn variant="danger" onClick={async () => { if (confirm(`Delete "${acc.name}"?`)) { await api(`google/accounts/${acc.id}`, { method: 'delete' }); load(); } }}>Delete</Btn>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {modal && (
                <Modal title={modal === 'add' ? 'Add Google Account' : `Edit: ${modal.name}`} onClose={() => setModal(null)}>
                    {error && <p className="mb-3 text-red-600 text-sm">{error}</p>}
                    <div className="space-y-4">
                        <input className="w-full border rounded-md px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Account name" />
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                Google Places API Key {modal !== 'add' && !keyVisible && <span className="text-gray-400">(leave blank to keep existing)</span>}
                            </label>
                            {modal !== 'add' && !keyVisible ? (
                                <div className="flex gap-2">
                                    <div className="flex-1 border rounded-md px-3 py-2 text-sm font-mono bg-gray-50 text-gray-400 tracking-widest">••••••••••••••••••••</div>
                                    <Btn variant="ghost" onClick={revealKey} disabled={revealing}>{revealing ? 'Loading...' : 'Reveal Key'}</Btn>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 border rounded-md px-3 py-2 text-sm font-mono"
                                        type="text"
                                        value={form.api_key}
                                        onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                                        placeholder={modal === 'add' ? 'Enter Google Places API key' : 'Enter new key to replace'}
                                        autoFocus={keyVisible}
                                    />
                                    {modal !== 'add' && <Btn variant="ghost" onClick={() => { setKeyVisible(false); setForm(f => ({ ...f, api_key: '' })); }}>Hide</Btn>}
                                </div>
                            )}
                        </div>
                        <input type="number" min="1" className="w-full border rounded-md px-3 py-2 text-sm" value={form.daily_limit} onChange={e => setForm(f => ({ ...f, daily_limit: parseInt(e.target.value, 10) || 1000 }))} placeholder="Daily limit" />
                        <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Active</label>
                        {verifyResult && <p className={`text-sm ${verifyResult.ok ? 'text-green-700' : 'text-red-600'}`}>{verifyResult.msg}</p>}
                        <div className="flex justify-end gap-2">
                            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                            <Btn variant="ghost" onClick={verifyKey} disabled={verifying || (!form.api_key && modal === 'add')}>{verifying ? 'Verifying...' : 'Test Key'}</Btn>
                            <Btn onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

const TABS = [
    { id: 'jobs', label: 'Sync Jobs' },
    { id: 'reconciliation', label: 'Reconciliation' },
    { id: 'accounts', label: 'Yelp Accounts' },
    { id: 'google', label: 'Google Accounts' },
    { id: 'logs', label: 'Run Logs' },
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
                                <p className="text-sm text-gray-500 mt-1">US-only reconciliation, separate closed/not-found tables, and merge workflow.</p>
                            </div>
                        </div>
                        <div className="border-b border-gray-200 mb-6">
                            <nav className="-mb-px flex gap-4">
                                {TABS.map(t => (
                                    <button key={t.id} onClick={() => setTab(t.id)} className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t.label}</button>
                                ))}
                            </nav>
                        </div>
                        {tab === 'accounts' && <AccountsTab />}
                        {tab === 'google' && <GoogleAccountsTab />}
                        {tab === 'jobs' && <JobsTab />}
                        {tab === 'logs' && <LogsTab />}
                        {tab === 'reconciliation' && <ReconciliationTab />}
                    </div>
                </div>
            </div>
        </div>
    );
}
