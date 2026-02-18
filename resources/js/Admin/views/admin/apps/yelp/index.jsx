import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Alert, Card, CardBody, CardHeader, Col,
    Form, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
    Nav, ProgressBar, Row, Spinner, Tab,
} from 'react-bootstrap';

// ─── API helper ───────────────────────────────────────────────────────────────
const api = (path, opts = {}) => axios({ url: `/api/yelp/${path}`, ...opts });

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_MAP = {
    pending:   { cls: 'bg-secondary-subtle text-secondary', label: 'Pending'   },
    running:   { cls: 'bg-primary-subtle text-primary',     label: 'Running'   },
    completed: { cls: 'bg-success-subtle text-success',     label: 'Completed' },
    failed:    { cls: 'bg-danger-subtle text-danger',       label: 'Failed'    },
    paused:    { cls: 'bg-warning-subtle text-warning',     label: 'Paused'    },
    stopped:   { cls: 'bg-warning-subtle text-warning',     label: 'Stopped'   },
};
const getStatus = (s) => STATUS_MAP[s] ?? { cls: 'bg-secondary-subtle text-secondary', label: s ?? 'Never run' };

const SCHEDULES = [
    { value: 'manual',  label: 'Manual only (never auto-run)' },
    { value: 'hourly',  label: 'Every hour' },
    { value: 'daily',   label: 'Every day at midnight' },
    { value: 'weekly',  label: 'Every week (Sunday midnight)' },
    { value: 'monthly', label: 'Every month (1st midnight)' },
    { value: 'custom',  label: 'Custom cron expression…' },
];

const MODES = [
    { value: 'smart',       label: 'Smart (Recommended)', desc: 'Fetch Details for every row (2 calls). Permanently closed → mark only that column. Still operating → update all mapped fields.' },
    { value: 'full',        label: 'Full Sync',           desc: 'Same as Smart — always updates all mapped columns.' },
    { value: 'verify_only', label: 'Verify Only',         desc: 'Only writes the permanently_closed column. Fastest for a status-check run.' },
];

const scheduleLabel = (s) => ({ manual: 'Manual', hourly: 'Hourly', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }[s] ?? s);

// ─── ACCOUNTS TAB ─────────────────────────────────────────────────────────────
function AccountsTab() {
    const [accounts, setAccounts]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [showModal, setShowModal]       = useState(false);
    const [editTarget, setEditTarget]     = useState(null);
    const [form, setForm]                 = useState({ name: '', api_key: '', daily_limit: 500, is_active: true });
    const [saving, setSaving]             = useState(false);
    const [formError, setFormError]       = useState('');
    const [verifying, setVerifying]       = useState(false);
    const [verifyResult, setVerifyResult] = useState(null);
    const [cardVerify, setCardVerify]     = useState({});

    const load = useCallback(async () => {
        setLoading(true);
        const { data } = await api('accounts');
        setAccounts(data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setForm({ name: '', api_key: '', daily_limit: 500, is_active: true });
        setFormError(''); setVerifyResult(null); setEditTarget(null); setShowModal(true);
    };
    const openEdit = (a) => {
        setForm({ name: a.name, api_key: '', daily_limit: a.daily_limit, is_active: a.is_active });
        setFormError(''); setVerifyResult(null); setEditTarget(a); setShowModal(true);
    };

    const save = async (e) => {
        e.preventDefault();
        setSaving(true); setFormError('');
        try {
            if (!editTarget) {
                await api('accounts', { method: 'post', data: form });
            } else {
                const p = { ...form };
                if (!p.api_key) delete p.api_key;
                await api(`accounts/${editTarget.id}`, { method: 'patch', data: p });
            }
            setShowModal(false); load();
        } catch (e) {
            setFormError(e.response?.data?.message || 'Save failed.');
        } finally { setSaving(false); }
    };

    const verifyForm = async () => {
        if (!form.api_key) return;
        setVerifying(true); setVerifyResult(null);
        try {
            const { data } = await api('accounts/verify', { method: 'post', data: { api_key: form.api_key } });
            setVerifyResult({ ok: true, msg: data.message });
        } catch (e) {
            setVerifyResult({ ok: false, msg: e.response?.data?.message || 'Verification failed.' });
        } finally { setVerifying(false); }
    };

    const verifyAccount = async (acc) => {
        setCardVerify(v => ({ ...v, [acc.id]: { checking: true } }));
        try {
            const { data } = await api('accounts/verify', { method: 'post', data: { account_id: acc.id } });
            setCardVerify(v => ({ ...v, [acc.id]: { ok: true, msg: data.message } }));
        } catch (e) {
            setCardVerify(v => ({ ...v, [acc.id]: { ok: false, msg: e.response?.data?.message || 'Invalid key.' } }));
        }
    };

    const del = async (a) => {
        if (!confirm(`Delete "${a.name}"?`)) return;
        await api(`accounts/${a.id}`, { method: 'delete' }); load();
    };

    const totalUsed      = accounts.reduce((s, a) => s + (a.requests_today ?? 0), 0);
    const totalRemaining = accounts.reduce((s, a) => s + (a.remaining_requests ?? 0), 0);

    return (
        <>
            {/* Stats */}
            <Row className="g-3 mb-3">
                {[
                    { label: 'Active Accounts', value: accounts.filter(a => a.is_active).length, icon: 'key',          color: 'text-primary'  },
                    { label: 'Used Today',       value: totalUsed.toLocaleString(),               icon: 'chart-bar',    color: 'text-warning'  },
                    { label: 'Remaining Today',  value: totalRemaining.toLocaleString(),           icon: 'circle-check', color: 'text-success'  },
                ].map(({ label, value, icon, color }) => (
                    <Col key={label} md={4}>
                        <Card>
                            <CardBody className="d-flex align-items-center gap-3 p-3">
                                <span className={`avatar avatar-sm rounded d-flex align-items-center justify-content-center bg-light ${color}`}>
                                    <Icon icon={icon} className="fs-xl" />
                                </span>
                                <div>
                                    <h5 className={`mb-0 fw-bold ${color}`}>{value}</h5>
                                    <small className="text-muted">{label}</small>
                                </div>
                            </CardBody>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card>
                <CardHeader className="border-light justify-content-between">
                    <h5 className="card-title mb-0">API Accounts</h5>
                    <button className="btn btn-primary btn-sm" onClick={openAdd}>
                        <Icon icon="plus" className="me-1" /> Add Account
                    </button>
                </CardHeader>

                {loading ? (
                    <CardBody className="text-center py-5">
                        <Spinner animation="border" size="sm" className="text-primary" />
                    </CardBody>
                ) : accounts.length === 0 ? (
                    <CardBody className="text-center text-muted py-5">
                        No accounts yet. Add your first Yelp API key.
                    </CardBody>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover table-nowrap mb-0 align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Account</th>
                                    <th>Daily Limit</th>
                                    <th>Usage Today</th>
                                    <th style={{ width: 160 }}>Progress</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map(acc => {
                                    const used  = acc.requests_today ?? 0;
                                    const limit = acc.daily_limit ?? 500;
                                    const pct   = Math.round((used / limit) * 100);
                                    const cv    = cardVerify[acc.id];
                                    return (
                                        <tr key={acc.id}>
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: acc.is_active ? '#22c55e' : '#9ca3af' }} />
                                                    <strong>{acc.name}</strong>
                                                </div>
                                                {cv && !cv.checking && (
                                                    <small className={cv.ok ? 'text-success' : 'text-danger'}>
                                                        {cv.ok ? '✓ ' : '✗ '}{cv.msg}
                                                    </small>
                                                )}
                                            </td>
                                            <td>{limit.toLocaleString()} / day</td>
                                            <td>
                                                <span className="text-warning fw-semibold">{used.toLocaleString()}</span>
                                                <small className="text-muted ms-1">({(acc.remaining_requests ?? 0).toLocaleString()} left)</small>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    <ProgressBar now={pct} variant={pct > 80 ? 'warning' : 'success'} style={{ height: 6, flex: 1 }} />
                                                    <small className="text-muted">{pct}%</small>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${acc.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                                                    {acc.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    <button className="btn btn-soft-info btn-sm btn-icon" title="Verify API Key"
                                                        onClick={() => verifyAccount(acc)} disabled={cv?.checking}>
                                                        {cv?.checking ? <Spinner animation="border" size="sm" /> : <Icon icon="circle-check" className="fs-lg" />}
                                                    </button>
                                                    <button className="btn btn-default btn-sm btn-icon" title="Edit" onClick={() => openEdit(acc)}>
                                                        <Icon icon="edit" className="fs-lg" />
                                                    </button>
                                                    <button className="btn btn-default btn-sm btn-icon" title="Delete" onClick={() => del(acc)}>
                                                        <Icon icon="trash" className="fs-lg text-danger" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Account Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <ModalHeader closeButton>
                    <ModalTitle as="h5">{editTarget ? `Edit: ${editTarget.name}` : 'Add Yelp Account'}</ModalTitle>
                </ModalHeader>
                <Form onSubmit={save}>
                    <ModalBody>
                        {formError && <Alert variant="danger" className="py-2 mb-3">{formError}</Alert>}
                        <Form.Group className="mb-3">
                            <Form.Label>Account Name <span className="text-danger">*</span></Form.Label>
                            <Form.Control value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="e.g. Main Account" required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>
                                Yelp API Key{' '}
                                {editTarget && <small className="text-muted fw-normal">(leave blank to keep existing)</small>}
                            </Form.Label>
                            <div className="d-flex gap-2">
                                <Form.Control className="font-monospace"
                                    value={form.api_key}
                                    onChange={e => { setForm(f => ({ ...f, api_key: e.target.value })); setVerifyResult(null); }}
                                    placeholder="Bearer token from Yelp Fusion" />
                                <button type="button" className="btn btn-soft-info btn-sm text-nowrap"
                                    onClick={verifyForm} disabled={verifying || !form.api_key}>
                                    {verifying ? <Spinner animation="border" size="sm" /> : <><Icon icon="circle-check" className="me-1" />Test Key</>}
                                </button>
                            </div>
                            {verifyResult && (
                                <Alert variant={verifyResult.ok ? 'success' : 'danger'} className="mt-2 py-2 mb-0 fs-sm">
                                    {verifyResult.ok ? '✓ ' : '✗ '}{verifyResult.msg}
                                </Alert>
                            )}
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Daily Limit</Form.Label>
                            <Form.Control type="number" min="1"
                                value={form.daily_limit}
                                onChange={e => setForm(f => ({ ...f, daily_limit: parseInt(e.target.value) || 500 }))} />
                            <Form.Text className="text-muted">Yelp free tier: 500 calls/day</Form.Text>
                        </Form.Group>
                        <Form.Check type="switch" id="accActive" label="Active"
                            checked={form.is_active}
                            onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                    </ModalBody>
                    <ModalFooter>
                        <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving || !form.name}>
                            {saving ? <><Spinner animation="border" size="sm" className="me-1" />Saving…</> : 'Save Account'}
                        </button>
                    </ModalFooter>
                </Form>
            </Modal>
        </>
    );
}

// ─── JOBS TAB ─────────────────────────────────────────────────────────────────
function JobsTab() {
    const [jobs, setJobs]             = useState([]);
    const [entities, setEntities]     = useState([]);
    const [yelpFields, setYelpFields] = useState({});
    const [loading, setLoading]       = useState(true);
    const [showModal, setShowModal]   = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving]         = useState(false);
    const [formError, setFormError]   = useState('');
    const [activeLogs, setActiveLogs] = useState({});
    const pollRef                     = useRef({});

    const emptyForm = {
        name: '', entity_id: '', mode: 'smart', schedule: 'daily',
        custom_cron: '', is_active: true, max_calls_per_run: 0,
        search_columns: { term: '', address: '', city: '', state: '', zip: '' },
        column_mapping: {},
    };
    const [form, setForm] = useState(emptyForm);
    const selEnt = entities.find(e => String(e.id) === String(form.entity_id));

    const load = useCallback(async () => {
        setLoading(true);
        const [j, e, yf] = await Promise.all([api('jobs'), api('entities'), api('fields')]);
        setJobs(j.data); setEntities(e.data); setYelpFields(yf.data);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
        return () => { Object.values(pollRef.current).forEach(clearInterval); };
    }, [load]);

    const startPolling = (jobId, logId) => {
        if (pollRef.current[jobId]) clearInterval(pollRef.current[jobId]);
        pollRef.current[jobId] = setInterval(async () => {
            try {
                const { data } = await api(`logs/${logId}`);
                setActiveLogs(prev => ({ ...prev, [jobId]: data }));
                if (!['running', 'pending'].includes(data.status)) {
                    clearInterval(pollRef.current[jobId]);
                    delete pollRef.current[jobId];
                    load();
                }
            } catch { /* ignore */ }
        }, 2000);
    };

    const runNow = async (job) => {
        try {
            const { data: log } = await api(`jobs/${job.id}/run`, { method: 'post' });
            setActiveLogs(prev => ({ ...prev, [job.id]: log }));
            if (['running', 'pending'].includes(log.status)) startPolling(job.id, log.id);
        } catch (e) { alert(e.response?.data?.error || 'Run failed.'); }
    };

    const stopJob = async (job) => {
        const log = activeLogs[job.id];
        if (!log) return;
        try {
            await api(`logs/${log.id}/stop`, { method: 'post' });
            setActiveLogs(prev => ({ ...prev, [job.id]: { ...prev[job.id], status: 'stop_requested' } }));
        } catch (e) { alert(e.response?.data?.error || 'Stop failed.'); }
    };

    const openAdd = () => { setForm(emptyForm); setFormError(''); setEditTarget(null); setShowModal(true); };
    const openEdit = (job) => {
        const isCustom = !['manual','hourly','daily','weekly','monthly'].includes(job.schedule);
        const sc = job.search_columns || {};
        setForm({
            name: job.name, entity_id: String(job.entity_id),
            mode: job.mode || 'smart',
            schedule: isCustom ? 'custom' : job.schedule,
            custom_cron: isCustom ? job.schedule : '',
            is_active: job.is_active,
            max_calls_per_run: job.max_calls_per_run ?? 0,
            search_columns: { term: sc.term||'', address: sc.address||'', city: sc.city||'', state: sc.state||'', zip: sc.zip||'' },
            column_mapping: { ...(job.column_mapping || {}) },
        });
        setFormError(''); setEditTarget(job); setShowModal(true);
    };

    const save = async (e) => {
        e.preventDefault();
        setSaving(true); setFormError('');
        try {
            const payload = {
                name: form.name, entity_id: parseInt(form.entity_id), mode: form.mode,
                search_columns: form.search_columns, column_mapping: form.column_mapping,
                schedule: form.schedule === 'custom' ? form.custom_cron : form.schedule,
                is_active: form.is_active,
                max_calls_per_run: parseInt(form.max_calls_per_run) || 0,
            };
            if (!editTarget) { await api('jobs', { method: 'post', data: payload }); }
            else              { await api(`jobs/${editTarget.id}`, { method: 'patch', data: payload }); }
            setShowModal(false); load();
        } catch (e) {
            const errs = e.response?.data?.errors;
            setFormError(errs ? Object.values(errs).flat().join(' | ') : (e.response?.data?.message || 'Save failed.'));
        } finally { setSaving(false); }
    };

    const del = async (job) => {
        if (!confirm(`Delete job "${job.name}"?`)) return;
        await api(`jobs/${job.id}`, { method: 'delete' }); load();
    };
    const toggleActive = async (job) => {
        await api(`jobs/${job.id}`, { method: 'patch', data: { is_active: !job.is_active } }); load();
    };

    const toggleMapping = (yKey, dbCol) => {
        setForm(f => {
            const cm = { ...f.column_mapping };
            if (yKey in cm) delete cm[yKey]; else cm[yKey] = dbCol || yKey;
            return { ...f, column_mapping: cm };
        });
    };
    const setMapCol = (yKey, val) => setForm(f => ({ ...f, column_mapping: { ...f.column_mapping, [yKey]: val } }));

    const MODE_BADGE = { smart: 'bg-primary-subtle text-primary', full: 'bg-info-subtle text-info', verify_only: 'bg-warning-subtle text-warning' };

    return (
        <>
            <Card>
                <CardHeader className="border-light justify-content-between">
                    <h5 className="card-title mb-0">Sync Jobs</h5>
                    <button className="btn btn-primary btn-sm" onClick={openAdd}>
                        <Icon icon="plus" className="me-1" /> New Job
                    </button>
                </CardHeader>

                {loading ? (
                    <CardBody className="text-center py-5">
                        <Spinner animation="border" size="sm" className="text-primary" />
                    </CardBody>
                ) : jobs.length === 0 ? (
                    <CardBody className="text-center text-muted py-5">
                        No jobs yet. Create one to start syncing your data with Yelp.
                    </CardBody>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Job</th>
                                    <th>Mode</th>
                                    <th>Schedule</th>
                                    <th>Last Run</th>
                                    <th>Status / Progress</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map(job => {
                                    const hasResume  = (job.last_processed_id ?? 0) > 0;
                                    const activeLog  = activeLogs[job.id];
                                    const latestLog  = job.latest_log?.[0];
                                    const displayLog = activeLog || latestLog;
                                    const isRunning  = ['running', 'pending', 'stop_requested'].includes(displayLog?.status);
                                    const si         = getStatus(displayLog?.status);
                                    const total      = displayLog?.total_rows || 0;
                                    const done       = (displayLog?.processed_rows||0)+(displayLog?.skipped_rows||0)+(displayLog?.not_found_rows||0)+(displayLog?.closed_rows||0);
                                    const pct        = total > 0 ? Math.round((done / total) * 100) : 0;

                                    return (
                                        <tr key={job.id}>
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: job.is_active ? '#22c55e' : '#9ca3af', flexShrink: 0 }} />
                                                    <div>
                                                        <strong>{job.name}</strong>
                                                        <small className="text-muted d-block">{job.entity?.table_name}</small>
                                                        {hasResume && (
                                                            <small className="text-warning d-block">
                                                                ⟳ Resumes from row #{job.last_processed_id}
                                                            </small>
                                                        )}
                                                        {(job.max_calls_per_run ?? 0) > 0 && (
                                                            <small className="text-info d-block">
                                                                Limit: {job.max_calls_per_run} calls/run ({Math.floor(job.max_calls_per_run / 2)} rows)
                                                            </small>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${MODE_BADGE[job.mode] ?? 'bg-secondary-subtle text-secondary'}`}>
                                                    {job.mode === 'smart' ? '🧠 Smart' : job.mode === 'full' ? '🔁 Full' : '👁 Verify'}
                                                </span>
                                            </td>
                                            <td>
                                                <span>{scheduleLabel(job.schedule)}</span>
                                                {job.next_run_at && (
                                                    <small className="text-muted d-block">
                                                        Next: {new Date(job.next_run_at).toLocaleString()}
                                                    </small>
                                                )}
                                            </td>
                                            <td>
                                                <small>{job.last_run_at ? new Date(job.last_run_at).toLocaleString() : '—'}</small>
                                            </td>
                                            <td style={{ minWidth: 200 }}>
                                                {displayLog ? (
                                                    <>
                                                        <div className="d-flex align-items-center gap-2 mb-1">
                                                            <span className={`badge ${si.cls}`}>{si.label}</span>
                                                            {displayLog.error_message && (
                                                                <small className="text-danger text-truncate" style={{ maxWidth: 140 }} title={displayLog.error_message}>
                                                                    {displayLog.error_message}
                                                                </small>
                                                            )}
                                                        </div>
                                                        {total > 0 && (
                                                            <>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <ProgressBar now={pct} variant={isRunning ? 'primary' : 'success'}
                                                                        animated={isRunning} style={{ height: 5, flex: 1 }} />
                                                                    <small className="fw-semibold">{pct}%</small>
                                                                </div>
                                                                <small className="text-muted d-flex flex-wrap gap-1 mt-1">
                                                                    <span className="text-success">✓{displayLog.processed_rows}</span>
                                                                    {displayLog.closed_rows > 0 && <span className="text-danger">🔒{displayLog.closed_rows}</span>}
                                                                    {displayLog.not_found_rows > 0 && <span>?{displayLog.not_found_rows}</span>}
                                                                    {displayLog.failed_rows > 0 && <span className="text-danger">✗{displayLog.failed_rows}</span>}
                                                                    {displayLog.skipped_rows > 0 && <span>—{displayLog.skipped_rows}</span>}
                                                                    <span>/{total}</span>
                                                                </small>
                                                                {displayLog.new_columns_added?.length > 0 && (
                                                                    <small className="d-flex flex-wrap gap-1 mt-1">
                                                                        {displayLog.new_columns_added.map(c => (
                                                                            <span key={c} className="badge bg-warning-subtle text-warning">+{c}</span>
                                                                        ))}
                                                                    </small>
                                                                )}
                                                            </>
                                                        )}
                                                    </>
                                                ) : <small className="text-muted">—</small>}
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    {isRunning ? (
                                                        <button className="btn btn-warning btn-sm" onClick={() => stopJob(job)}>
                                                            <Icon icon="square" className="me-1 fs-sm" />Stop
                                                        </button>
                                                    ) : (
                                                        <button className="btn btn-success btn-sm" onClick={() => runNow(job)}>
                                                            <Icon icon="player-play" className="me-1 fs-sm" />Run
                                                        </button>
                                                    )}
                                                    <button className="btn btn-default btn-sm btn-icon" title="Edit" onClick={() => openEdit(job)}>
                                                        <Icon icon="edit" className="fs-lg" />
                                                    </button>
                                                    <button className="btn btn-default btn-sm btn-icon" title={job.is_active ? 'Disable' : 'Enable'} onClick={() => toggleActive(job)}>
                                                        <Icon icon={job.is_active ? 'toggle-right' : 'toggle-left'} className="fs-lg" />
                                                    </button>
                                                    <button className="btn btn-default btn-sm btn-icon" title="Delete" onClick={() => del(job)}>
                                                        <Icon icon="trash" className="fs-lg text-danger" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Job Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
                <ModalHeader closeButton>
                    <ModalTitle as="h5">{editTarget ? `Edit: ${editTarget.name}` : 'New Yelp Sync Job'}</ModalTitle>
                </ModalHeader>
                <Form onSubmit={save}>
                    <ModalBody>
                        {formError && <Alert variant="danger" className="py-2 mb-3">{formError}</Alert>}
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Job Name <span className="text-danger">*</span></Form.Label>
                                    <Form.Control value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g. Sync Restaurants" required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Table (Entity) <span className="text-danger">*</span></Form.Label>
                                    <Form.Select value={form.entity_id}
                                        onChange={e => setForm(f => ({ ...f, entity_id: e.target.value, search_columns: { term:'',address:'',city:'',state:'',zip:'' }, column_mapping: {} }))}>
                                        <option value="">— Select a table —</option>
                                        {entities.map(e => <option key={e.id} value={e.id}>{e.name} ({e.table_name})</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Label className="fw-semibold">Sync Mode</Form.Label>
                                {MODES.map(m => (
                                    <Form.Check key={m.value} type="radio" id={`mode_${m.value}`} name="mode"
                                        value={m.value} checked={form.mode === m.value}
                                        onChange={() => setForm(f => ({ ...f, mode: m.value }))}
                                        className="mb-2"
                                        label={<><span className="fw-semibold">{m.label}</span><br /><small className="text-muted">{m.desc}</small></>} />
                                ))}
                            </Col>
                            <Col md={6}>
                                <Form.Label className="fw-semibold">Schedule</Form.Label>
                                {SCHEDULES.map(s => (
                                    <Form.Check key={s.value} type="radio" id={`sched_${s.value}`} name="schedule"
                                        value={s.value} checked={form.schedule === s.value}
                                        onChange={() => setForm(f => ({ ...f, schedule: s.value }))}
                                        label={s.label} className="mb-1" />
                                ))}
                                {form.schedule === 'custom' && (
                                    <Form.Control className="font-monospace mt-2" value={form.custom_cron}
                                        onChange={e => setForm(f => ({ ...f, custom_cron: e.target.value }))}
                                        placeholder="e.g. 0 6 * * *" />
                                )}
                                <Form.Check type="switch" id="jobActive" className="mt-2" label="Enable auto-schedule"
                                    checked={form.is_active}
                                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />

                                {/* Per-run call limit */}
                                <hr className="my-2" />
                                <Form.Label className="fw-semibold">API Call Limit per Run</Form.Label>
                                <Form.Control type="number" min="0" value={form.max_calls_per_run}
                                    onChange={e => setForm(f => ({ ...f, max_calls_per_run: parseInt(e.target.value) || 0 }))} />
                                <Form.Text className="text-muted">
                                    0 = unlimited. Each row = 2 calls. e.g. 100 = 50 rows per cron run.
                                    Job auto-pauses when limit hit and resumes next run from where it stopped.
                                </Form.Text>
                            </Col>

                            {selEnt && (<>
                                <Col xs={12}><hr className="my-1" /></Col>
                                <Col xs={12}>
                                    <Form.Label className="fw-semibold">Search Columns</Form.Label>
                                    <p className="text-muted fs-sm mb-2">Map your table columns to Yelp search. Business Name is required.</p>
                                    <Row className="g-2">
                                        {[
                                            { key: 'term',    label: 'Business Name *' },
                                            { key: 'address', label: 'Street Address' },
                                            { key: 'city',    label: 'City' },
                                            { key: 'state',   label: 'State / Province' },
                                            { key: 'zip',     label: 'Zip Code' },
                                        ].map(({ key, label }) => (
                                            <Col key={key} md={4}>
                                                <Form.Label className="fs-sm mb-1">{label}</Form.Label>
                                                <Form.Select size="sm"
                                                    value={form.search_columns[key] || ''}
                                                    onChange={e => setForm(f => ({ ...f, search_columns: { ...f.search_columns, [key]: e.target.value } }))}>
                                                    <option value="">— none —</option>
                                                    {selEnt.fields?.map(f => (
                                                        <option key={f.id} value={f.column_name}>{f.label} ({f.column_name})</option>
                                                    ))}
                                                </Form.Select>
                                            </Col>
                                        ))}
                                    </Row>
                                </Col>
                                <Col xs={12}><hr className="my-1" /></Col>
                                <Col xs={12}>
                                    <Form.Label className="fw-semibold">Yelp Fields to Sync</Form.Label>
                                    <p className="text-muted fs-sm mb-2">Check a field to sync it. Columns missing in your table will be auto-created.</p>
                                    <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                                        <Row className="g-2">
                                            {Object.entries(yelpFields).map(([yKey, meta]) => {
                                                const checked = yKey in form.column_mapping;
                                                const dbCol   = form.column_mapping[yKey] ?? yKey;
                                                const exists  = !!selEnt.fields?.find(f => f.column_name === dbCol);
                                                return (
                                                    <Col key={yKey} md={6}>
                                                        <div className={`d-flex align-items-start gap-2 p-2 rounded border ${checked ? 'border-primary bg-primary-subtle' : ''}`}>
                                                            <Form.Check type="checkbox" id={`yf_${yKey}`}
                                                                checked={checked}
                                                                onChange={() => toggleMapping(yKey, dbCol)}
                                                                className="mt-1 flex-shrink-0" />
                                                            <label htmlFor={`yf_${yKey}`} className="flex-shrink-0" style={{ cursor: 'pointer', width: 120 }}>
                                                                <span className="fs-sm fw-semibold d-block">{meta.label}</span>
                                                                <span className="badge bg-secondary-subtle text-secondary">{meta.type}</span>
                                                            </label>
                                                            {checked && (
                                                                <div style={{ flex: 1 }}>
                                                                    <Form.Control size="sm" className="font-monospace"
                                                                        value={dbCol}
                                                                        onChange={e => setMapCol(yKey, e.target.value)} />
                                                                    {!exists && (
                                                                        <small className="text-warning">will auto-create</small>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </Col>
                                                );
                                            })}
                                        </Row>
                                    </div>
                                </Col>
                            </>)}
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary"
                            disabled={saving || !form.name || !form.entity_id || Object.keys(form.column_mapping).length === 0}>
                            {saving ? <><Spinner animation="border" size="sm" className="me-1" />Saving…</> : 'Save Job'}
                        </button>
                    </ModalFooter>
                </Form>
            </Modal>
        </>
    );
}

// ─── LOGS TAB ─────────────────────────────────────────────────────────────────
function LogsTab() {
    const [logs, setLogs]           = useState([]);
    const [jobs, setJobs]           = useState([]);
    const [loading, setLoading]     = useState(true);
    const [jobFilter, setJobFilter] = useState('');

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

    return (
        <Card>
            <CardHeader className="border-light justify-content-between">
                <h5 className="card-title mb-0">Run Logs</h5>
                <div className="d-flex align-items-center gap-2">
                    <Form.Select size="sm" style={{ width: 180 }} value={jobFilter} onChange={e => setJobFilter(e.target.value)}>
                        <option value="">All Jobs</option>
                        {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                    </Form.Select>
                    <button className="btn btn-light btn-sm btn-icon" title="Refresh" onClick={load}>
                        <Icon icon="refresh" className="fs-lg" />
                    </button>
                    <small className="text-muted">{logs.length} entries</small>
                </div>
            </CardHeader>

            {loading ? (
                <CardBody className="text-center py-5">
                    <Spinner animation="border" size="sm" className="text-primary" />
                </CardBody>
            ) : logs.length === 0 ? (
                <CardBody className="text-center text-muted py-5">
                    No logs yet. Run a job to see results here.
                </CardBody>
            ) : (
                <div className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>Job</th>
                                <th>Status</th>
                                <th>Progress</th>
                                <th>Row Breakdown</th>
                                <th>Duration</th>
                                <th>Started</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => {
                                const si       = getStatus(log.status);
                                const total    = log.total_rows || 0;
                                const done     = (log.processed_rows||0)+(log.skipped_rows||0)+(log.not_found_rows||0)+(log.closed_rows||0);
                                const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
                                const secs     = log.started_at && log.completed_at
                                    ? Math.round((new Date(log.completed_at) - new Date(log.started_at)) / 1000) : null;
                                const duration = secs !== null ? (secs < 60 ? `${secs}s` : `${(secs/60).toFixed(1)}m`) : '—';
                                return (
                                    <tr key={log.id}>
                                        <td>
                                            <strong>{log.job?.name ?? `Job #${log.job_id}`}</strong>
                                            {log.account && <small className="text-muted d-block">via {log.account.name}</small>}
                                            {log.error_message && <small className="text-danger d-block">{log.error_message}</small>}
                                            {log.new_columns_added?.length > 0 && (
                                                <div className="d-flex flex-wrap gap-1 mt-1">
                                                    {log.new_columns_added.map(c => (
                                                        <span key={c} className="badge bg-warning-subtle text-warning">+{c}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td><span className={`badge ${si.cls}`}>{si.label}</span></td>
                                        <td style={{ minWidth: 130 }}>
                                            {total > 0 ? (
                                                <div className="d-flex align-items-center gap-2">
                                                    <ProgressBar now={pct} variant="success" style={{ height: 5, flex: 1 }} />
                                                    <small className="fw-semibold">{pct}%</small>
                                                </div>
                                            ) : '—'}
                                        </td>
                                        <td>
                                            {total > 0 ? (
                                                <small className="d-flex flex-column gap-1">
                                                    <span className="text-success">✓ {log.processed_rows} updated</span>
                                                    {log.closed_rows > 0 && <span className="text-danger">🔒 {log.closed_rows} perm. closed</span>}
                                                    {log.not_found_rows > 0 && <span className="text-muted">? {log.not_found_rows} not found</span>}
                                                    {log.failed_rows > 0 && <span className="text-danger">✗ {log.failed_rows} failed</span>}
                                                    {log.skipped_rows > 0 && <span className="text-muted">— {log.skipped_rows} skipped</span>}
                                                    <span className="text-muted">/ {total} total</span>
                                                </small>
                                            ) : '—'}
                                        </td>
                                        <td>{duration}</td>
                                        <td><small>{log.started_at ? new Date(log.started_at).toLocaleString() : '—'}</small></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function YelpPage() {
    return (
        <>
            <PageBreadcrumb title="Yelp Integration" subtitle="Apps" />

            <Row className="justify-content-center">
                <Col xs={12}>
                    <Tab.Container defaultActiveKey="jobs">

                        {/* Tab nav — same style as SectionEdit */}
                        <div className="d-flex align-items-center mb-3">
                            <Nav variant="pills" className="nav-pills-custom">
                                <Nav.Item>
                                    <Nav.Link eventKey="jobs">
                                        <Icon icon="bolt" className="me-1" /> Sync Jobs
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="accounts">
                                        <Icon icon="key" className="me-1" /> API Accounts
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="logs">
                                        <Icon icon="file-text" className="me-1" /> Run Logs
                                    </Nav.Link>
                                </Nav.Item>
                            </Nav>

                            {/* Smart Mode info badge */}
                            <small className="text-muted ms-3">
                                <Icon icon="info-circle" className="me-1" />
                                Smart: Search (1 call) → Details (1 call) → perm. closed? → update fields
                            </small>
                        </div>

                        <Tab.Content>
                            <Tab.Pane eventKey="jobs">     <JobsTab />     </Tab.Pane>
                            <Tab.Pane eventKey="accounts"> <AccountsTab /> </Tab.Pane>
                            <Tab.Pane eventKey="logs">     <LogsTab />     </Tab.Pane>
                        </Tab.Content>

                    </Tab.Container>
                </Col>
            </Row>
        </>
    );
}
