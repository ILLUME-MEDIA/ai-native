import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import {
    Alert, Badge, Button, Card, CardBody, CardHeader,
    Col, Form, Nav, Row, Spinner, Tab, Table,
} from 'react-bootstrap';

// ─── API (no auth header required) ───────────────────────────────────────────
const api = (path, opts = {}) =>
    axios({ url: `/api/otp-auth/${path}`, ...opts });

// ─── DEFAULT VERIFY OPTIONS ───────────────────────────────────────────────────
const defaultOpts = () => ({
    check_email: true,
    on_found: 'token',
    on_not_found: 'profile',
    found_message: '',
    not_found_message: '',
    skip_token: false,
});

const ON_NOT_FOUND_OPTIONS = [
    { value: 'message', label: 'Message only',     desc: 'Return message only — no token, no further action' },
    { value: 'profile', label: 'Complete Profile', desc: 'Return otp_token → user calls /complete-profile to register' },
    { value: 'token',   label: 'Auto Auth',        desc: 'Return full auth token even without a DB record' },
    { value: 'create',  label: 'Auto Create',      desc: 'Insert row in table and return auth token' },
];

const ON_FOUND_OPTIONS = [
    { value: 'token',   label: 'Token + User',  desc: 'Return auth token and user data' },
    { value: 'message', label: 'Message only',  desc: 'Return user data only — no auth token' },
];

// ─── SETTINGS TAB ─────────────────────────────────────────────────────────────
function SettingsTab({ onSaved }) {
    const [settings, setSettings]       = useState(null);
    const [tables, setTables]           = useState([]);
    const [loading, setLoading]         = useState(true);
    const [saving, setSaving]           = useState(false);
    const [allowed, setAllowed]         = useState([]);
    const [tableOptions, setTableOptions] = useState({});  // per-table verify options
    const [expandedTable, setExpandedTable] = useState(null);
    const [savingTable, setSavingTable] = useState(null); // which table is being saved individually
    const [error, setError]             = useState('');
    const [success, setSuccess]         = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [s, t] = await Promise.all([
                api('settings'),
                api('tables'),
            ]);
            setSettings(s.data);
            setAllowed(s.data.allowed_tables || []);
            setTableOptions(s.data.table_options || {});
            setTables(t.data);
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to load settings.');
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const toggleTable = (name) =>
        setAllowed(prev =>
            prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
        );

    // Update one field of one table's verify options
    const setOpt = (tbl, key, val) =>
        setTableOptions(prev => ({
            ...prev,
            [tbl]: { ...(prev[tbl] || defaultOpts()), [key]: val },
        }));

    const getOpt = (tbl, key) =>
        tableOptions[tbl]?.[key] ?? defaultOpts()[key];

    const save = async () => {
        if (!allowed.length) { setError('At least one table must be selected.'); return; }
        setSaving(true); setError(''); setSuccess('');
        try {
            // Build table_options only for allowed tables
            const opts = {};
            allowed.forEach(tbl => {
                opts[tbl] = tableOptions[tbl] || defaultOpts();
            });
            await api('settings', { method: 'put', data: { allowed_tables: allowed, table_options: opts } });
            setSuccess('Settings saved successfully.');
            onSaved?.();
        } catch (e) {
            setError(e.response?.data?.message || 'Save failed.');
        }
        setSaving(false);
    };

    // Save options for a single table only
    const saveTable = async (tbl) => {
        setSavingTable(tbl); setError(''); setSuccess('');
        try {
            const opts = {};
            allowed.forEach(t => {
                opts[t] = tableOptions[t] || defaultOpts();
            });
            await api('settings', { method: 'put', data: { allowed_tables: allowed, table_options: opts } });
            setSuccess(`"${tbl}" options saved.`);
            onSaved?.();
        } catch (e) {
            setError(e.response?.data?.message || 'Save failed.');
        }
        setSavingTable(null);
    };

    return (
        <>
            {error   && <Alert variant="danger"  dismissible onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

            {loading ? <div className="text-center py-5"><Spinner /></div> : settings && (
                <Row className="g-3">

                    {/* Resend Status Card */}
                    <Col md={12}>
                        <Card className="border-0 bg-light">
                            <CardBody className="py-3">
                                <Row className="align-items-center g-3">
                                    <Col sm="auto">
                                        <div className="d-flex align-items-center gap-2">
                                            <Icon name="mail" size={18} />
                                            <strong>Resend Email Service</strong>
                                            {settings.resend_configured
                                                ? <Badge bg="success">Connected</Badge>
                                                : <Badge bg="danger">Not Configured</Badge>
                                            }
                                        </div>
                                        {!settings.resend_configured && (
                                            <div className="text-danger small mt-1">
                                                Add <code>RESEND_API_KEY</code> and <code>RESEND_FROM_EMAIL</code> in your <code>.env</code> file.
                                            </div>
                                        )}
                                    </Col>
                                    {settings.resend_configured && (
                                        <Col>
                                            <code className="text-muted small">{settings.from_name} &lt;{settings.from_email}&gt;</code>
                                        </Col>
                                    )}
                                    <Col sm="auto" className="ms-auto">
                                        <div className="d-flex flex-wrap gap-2">
                                            <span className="badge bg-secondary-subtle text-secondary">
                                                {settings.otp_length}-digit OTP
                                            </span>
                                            <span className="badge bg-secondary-subtle text-secondary">
                                                Expires {settings.otp_expires_minutes}min
                                            </span>
                                            <span className="badge bg-secondary-subtle text-secondary">
                                                Max {settings.max_attempts} attempts
                                            </span>
                                            <span className="badge bg-secondary-subtle text-secondary">
                                                Token {settings.token_expires_days}d
                                            </span>
                                        </div>
                                    </Col>
                                </Row>
                            </CardBody>
                        </Card>
                    </Col>

                    {/* Allowed Tables */}
                    <Col md={4}>
                        <Card className="border-0 shadow-sm h-100">
                            <CardHeader className="bg-transparent border-bottom py-2">
                                <strong>Select Tables</strong>
                                <div className="text-muted small mt-1">
                                    Tick tables to allow for OTP auth.
                                </div>
                            </CardHeader>
                            <CardBody>
                                {tables.length === 0
                                    ? <p className="text-muted small">No tables found.</p>
                                    : <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                                        {tables.map(t => (
                                            <div key={t.table} className="d-flex align-items-center justify-content-between py-1 border-bottom">
                                                <Form.Check
                                                    type="checkbox"
                                                    id={`tbl-${t.table}`}
                                                    label={<code>{t.table}</code>}
                                                    checked={allowed.includes(t.table)}
                                                    onChange={() => toggleTable(t.table)}
                                                />
                                                {t.has_email
                                                    ? <Badge bg="success-subtle" text="success" className="small">email ✓</Badge>
                                                    : <Badge bg="warning-subtle" text="warning" className="small">no email</Badge>
                                                }
                                            </div>
                                        ))}
                                    </div>
                                }
                                <div className="mt-3 d-flex gap-2 align-items-center">
                                    <Button variant="primary" size="sm" onClick={save} disabled={saving}>
                                        {saving && <Spinner size="sm" className="me-1" />}
                                        Save All
                                    </Button>
                                    <span className="text-muted small">{allowed.length} selected</span>
                                </div>
                            </CardBody>
                        </Card>
                    </Col>

                    {/* Per-table Verify Options */}
                    <Col md={8}>
                        <Card className="border-0 shadow-sm h-100">
                            <CardHeader className="bg-transparent border-bottom py-2">
                                <strong>Verify Options per Table</strong>
                                <div className="text-muted small mt-1">
                                    Set default verify behaviour for each allowed table. Test tab will load these automatically.
                                </div>
                            </CardHeader>
                            <CardBody>
                                {allowed.length === 0 ? (
                                    <p className="text-muted small">Select at least one table on the left.</p>
                                ) : (
                                    <div className="d-flex flex-column gap-2">
                                        {allowed.map(tbl => {
                                            const open = expandedTable === tbl;
                                            return (
                                                <div key={tbl} className="border rounded">
                                                    {/* Accordion Header */}
                                                    <div
                                                        className="d-flex align-items-center justify-content-between px-3 py-2 bg-light rounded-top"
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => setExpandedTable(open ? null : tbl)}
                                                    >
                                                        <div className="d-flex align-items-center gap-2">
                                                            <code className="fw-semibold">{tbl}</code>
                                                            <Badge bg={getOpt(tbl, 'check_email') ? 'primary' : 'secondary'} className="small">
                                                                {getOpt(tbl, 'check_email') ? `found→${getOpt(tbl,'on_found')} / not→${getOpt(tbl,'on_not_found')}` : 'OTP only'}
                                                            </Badge>
                                                        </div>
                                                        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} />
                                                    </div>

                                                    {/* Accordion Body */}
                                                    {open && (
                                                        <div className="px-3 py-3 border-top">
                                                            <Row className="g-3">
                                                                {/* check_email */}
                                                                <Col md={12}>
                                                                    <div className="d-flex align-items-center justify-content-between">
                                                                        <div>
                                                                            <span className="fw-medium small">Check Email in Table</span>
                                                                            <div className="text-muted" style={{ fontSize: 11 }}>
                                                                                <code>check_email</code> — Disable to just verify OTP, no table lookup
                                                                            </div>
                                                                        </div>
                                                                        <Form.Check type="switch" id={`ce-${tbl}`}
                                                                            checked={getOpt(tbl, 'check_email')}
                                                                            onChange={e => setOpt(tbl, 'check_email', e.target.checked)} />
                                                                    </div>
                                                                </Col>

                                                                {getOpt(tbl, 'check_email') && (<>
                                                                    {/* on_found */}
                                                                    <Col md={6}>
                                                                        <Form.Label className="small fw-medium mb-1">
                                                                            Email <span className="text-success">FOUND</span>
                                                                            <code className="ms-1" style={{ fontSize: 10 }}>on_found</code>
                                                                        </Form.Label>
                                                                        <Form.Select size="sm" value={getOpt(tbl, 'on_found')}
                                                                            onChange={e => setOpt(tbl, 'on_found', e.target.value)}>
                                                                            {ON_FOUND_OPTIONS.map(o => (
                                                                                <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>
                                                                            ))}
                                                                        </Form.Select>
                                                                    </Col>

                                                                    {/* on_not_found */}
                                                                    <Col md={6}>
                                                                        <Form.Label className="small fw-medium mb-1">
                                                                            Email <span className="text-danger">NOT FOUND</span>
                                                                            <code className="ms-1" style={{ fontSize: 10 }}>on_not_found</code>
                                                                        </Form.Label>
                                                                        <Form.Select size="sm" value={getOpt(tbl, 'on_not_found')}
                                                                            onChange={e => setOpt(tbl, 'on_not_found', e.target.value)}>
                                                                            {ON_NOT_FOUND_OPTIONS.map(o => (
                                                                                <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>
                                                                            ))}
                                                                        </Form.Select>
                                                                    </Col>

                                                                    {/* found_message */}
                                                                    <Col md={6}>
                                                                        <Form.Label className="small fw-medium mb-1">
                                                                            Found Message <span className="text-muted">(optional)</span>
                                                                        </Form.Label>
                                                                        <Form.Control size="sm" type="text" placeholder='e.g. "Welcome back!"'
                                                                            value={getOpt(tbl, 'found_message')}
                                                                            onChange={e => setOpt(tbl, 'found_message', e.target.value)} />
                                                                    </Col>

                                                                    {/* not_found_message */}
                                                                    <Col md={6}>
                                                                        <Form.Label className="small fw-medium mb-1">
                                                                            Not Found Message <span className="text-muted">(optional)</span>
                                                                        </Form.Label>
                                                                        <Form.Control size="sm" type="text" placeholder='e.g. "Complete your profile"'
                                                                            value={getOpt(tbl, 'not_found_message')}
                                                                            onChange={e => setOpt(tbl, 'not_found_message', e.target.value)} />
                                                                    </Col>

                                                                    {/* skip_token */}
                                                                    <Col md={12}>
                                                                        <div className="d-flex align-items-center justify-content-between">
                                                                            <div>
                                                                                <span className="fw-medium small">Skip Token in Response</span>
                                                                                <div className="text-muted" style={{ fontSize: 11 }}>
                                                                                    <code>skip_token</code> — Don't return auth token
                                                                                </div>
                                                                            </div>
                                                                            <Form.Check type="switch" id={`st-${tbl}`}
                                                                                checked={getOpt(tbl, 'skip_token')}
                                                                                onChange={e => setOpt(tbl, 'skip_token', e.target.checked)} />
                                                                        </div>
                                                                    </Col>
                                                                </>)}

                                                                {/* Per-table Save button */}
                                                                <Col md={12}>
                                                                    <div className="d-flex justify-content-end pt-1 border-top mt-1">
                                                                        <Button
                                                                            variant="primary" size="sm"
                                                                            disabled={savingTable === tbl}
                                                                            onClick={() => saveTable(tbl)}
                                                                        >
                                                                            {savingTable === tbl
                                                                                ? <><Spinner size="sm" className="me-1" />Saving…</>
                                                                                : <><Icon name="save" size={13} className="me-1" />Save "{tbl}"</>
                                                                            }
                                                                        </Button>
                                                                    </div>
                                                                </Col>
                                                            </Row>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </Col>

                    {/* API Reference */}
                    <Col md={12}>
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="bg-transparent border-bottom py-2">
                                <strong>API Reference</strong>
                                <span className="text-muted small ms-2">— Use from any website / app</span>
                            </CardHeader>
                            <CardBody>
                                <ApiReference allowedTables={allowed} />
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            )}
        </>
    );
}

// ─── API REFERENCE ────────────────────────────────────────────────────────────
function ApiReference({ allowedTables = [] }) {
    const base  = `${window.location.origin}/api/otp-auth`;
    const table = allowedTables[0] || 'users';

    const eps = [
        {
            method: 'POST', path: '/send',
            desc: 'Step 1 — Send OTP to email',
            body: `{\n  "email": "user@example.com",\n  "table": "${table}"   // optional\n}`,
            resp: `{ "success": true, "expires_in_minutes": 10 }`,
        },
        {
            method: 'POST', path: '/verify',
            desc: 'Step 2 — Verify OTP (all options optional)',
            body:
`{
  "email": "user@example.com",
  "otp": "1234",

  // ── Optional controls ──────────────────────
  "table": "${table}",          // which table to check
  "check_email": true,          // false = skip table check, just verify OTP
  "on_found": "token",          // "token" | "message"
  "on_not_found": "profile",    // "message"|"profile"|"token"|"create"
  "found_message": "Welcome!",  // custom msg when email found
  "not_found_message": "Complete your profile",
  "skip_token": false,          // true = no token in response
  "create_data": {              // used when on_not_found="create"
    "name": "New User",
    "phone": "03001234567"
  }
}`,
            resp:
`// Email FOUND + on_found="token" (default):
{ "status": "authenticated", "token": "...", "user": {...},
  "message": "Welcome!" }

// Email FOUND + on_found="message":
{ "status": "authenticated", "user": {...}, "message": "Welcome!" }

// Email NOT FOUND + on_not_found="message":
{ "status": "not_found", "message": "Email not found." }

// Email NOT FOUND + on_not_found="profile" (default):
{ "status": "profile_incomplete", "otp_token": "...",
  "message": "Complete your profile" }

// Email NOT FOUND + on_not_found="token":
{ "status": "authenticated", "token": "..." }

// Email NOT FOUND + on_not_found="create":
{ "status": "created", "token": "...", "user": {...} }

// check_email=false (just verify OTP):
{ "status": "otp_verified", "otp_token": "...", "email": "..." }`,
        },
        {
            method: 'POST', path: '/resend',
            desc: 'Resend OTP (60s cooldown)',
            body: `{ "email": "user@example.com" }`,
            resp: `{ "success": true }`,
        },
        {
            method: 'POST', path: '/complete-profile',
            desc: 'Register user after profile_incomplete',
            body:
`{
  "otp_token": "...",      // from verify response
  "email": "user@example.com",
  "name": "John Doe",
  "table": "${table}",
  // ...any extra fields for the table
}`,
            resp: `{ "status": "registered", "token": "...", "user": {...} }`,
        },
    ];

    return (
        <>
            <p className="small text-muted mb-2">
                Base: <code>{base}</code>
                {allowedTables.length > 0 && (
                    <> &nbsp;·&nbsp; Allowed: {allowedTables.map(t => <code key={t} className="me-1">{t}</code>)}</>
                )}
            </p>
            {eps.map((ep, i) => (
                <div key={i} className="mb-3 pb-3 border-bottom">
                    <div className="d-flex align-items-center gap-2 mb-1">
                        <Badge bg="primary">{ep.method}</Badge>
                        <code className="small">{ep.path}</code>
                        <span className="text-muted small">— {ep.desc}</span>
                    </div>
                    <Row className="g-1">
                        <Col md={6}>
                            <div className="text-muted" style={{ fontSize: 10 }}>REQUEST</div>
                            <pre className="bg-light p-2 rounded mb-0" style={{ fontSize: 10, maxHeight: 200, overflow: 'auto' }}>{ep.body}</pre>
                        </Col>
                        <Col md={6}>
                            <div className="text-muted" style={{ fontSize: 10 }}>RESPONSE</div>
                            <pre className="bg-light p-2 rounded mb-0" style={{ fontSize: 10, maxHeight: 200, overflow: 'auto' }}>{ep.resp}</pre>
                        </Col>
                    </Row>
                </div>
            ))}
        </>
    );
}

// ─── TEST TAB ─────────────────────────────────────────────────────────────────
function TestTab({ settingsVersion }) {
    const [step, setStep]               = useState(1);
    const [email, setEmail]             = useState('');
    const [table, setTable]             = useState('');
    const [otp, setOtp]                 = useState('');
    const [tables, setTables]           = useState([]);
    const [loading, setLoading]         = useState(false);
    const [result, setResult]           = useState(null);
    const [error, setError]             = useState('');
    const [countdown, setCountdown]     = useState(0);
    const [showOptions, setShowOptions] = useState(false);

    // Verify options state
    const [checkEmail, setCheckEmail]           = useState(true);
    const [onFound, setOnFound]                 = useState('token');
    const [onNotFound, setOnNotFound]           = useState('message');
    const [foundMessage, setFoundMessage]       = useState('');
    const [notFoundMessage, setNotFoundMessage] = useState('');
    const [skipToken, setSkipToken]             = useState(false);
    const [createData, setCreateData]           = useState('{\n  "name": ""\n}');
    const [createDataError, setCreateDataError] = useState('');

    const [tableOptionsMap, setTableOptionsMap] = useState({});

    useEffect(() => {
        Promise.all([api('settings'), api('tables')])
            .then(([s, t]) => {
                const allowed  = s.data.allowed_tables || [];
                const optsMap  = s.data.table_options  || {};
                const filtered = t.data.filter(row => allowed.includes(row.table));
                setTables(filtered);
                setTableOptionsMap(optsMap);
                if (filtered.length > 0) {
                    // keep currently selected table if it's still allowed, otherwise reset to first
                    setTable(prev => {
                        const current = filtered.find(r => r.table === prev);
                        const target  = current ? prev : filtered[0].table;
                        applyTableOpts(optsMap, target);
                        return target;
                    });
                }
            })
            .catch(() => setTables([{ table: 'users', has_email: true }]));
    }, [settingsVersion]); // eslint-disable-line

    // Load saved options when table dropdown changes
    const applyTableOpts = (optsMap, tbl) => {
        const o = optsMap[tbl] || defaultOpts();
        setCheckEmail(o.check_email ?? true);
        setOnFound(o.on_found || 'token');
        setOnNotFound(o.on_not_found || 'message');
        setFoundMessage(o.found_message || '');
        setNotFoundMessage(o.not_found_message || '');
        setSkipToken(o.skip_token ?? false);
    };

    const handleTableChange = (tbl) => {
        setTable(tbl);
        applyTableOpts(tableOptionsMap, tbl);
    };

    useEffect(() => {
        if (countdown <= 0) return;
        const t = setInterval(() => setCountdown(c => c - 1), 1000);
        return () => clearInterval(t);
    }, [countdown]);

    const sendOtp = async (e) => {
        if (e) e.preventDefault();
        setLoading(true); setError(''); setResult(null);
        try {
            const r = await api('send', { method: 'post', data: { email, table } });
            setResult({ type: 'send', data: r.data });
            setStep(2);
            setCountdown(60);
        } catch (e) {
            const d = e.response?.data;
            setError(d?.message || 'Failed to send OTP.');
            if (d?.wait_seconds) setCountdown(d.wait_seconds);
        }
        setLoading(false);
    };

    const verifyOtp = async (e) => {
        e.preventDefault();
        setCreateDataError('');

        // Build request payload
        const payload = { email, otp, table };
        payload.check_email = checkEmail;
        if (checkEmail) {
            payload.on_found    = onFound;
            payload.on_not_found = onNotFound;
            if (foundMessage.trim())    payload.found_message    = foundMessage.trim();
            if (notFoundMessage.trim()) payload.not_found_message = notFoundMessage.trim();
            if (skipToken)              payload.skip_token = true;
            if (onNotFound === 'create') {
                try {
                    payload.create_data = JSON.parse(createData);
                    payload.create_data.email = email; // always include email
                } catch {
                    setCreateDataError('Invalid JSON in create_data.');
                    return;
                }
            }
        }

        setLoading(true); setError(''); setResult(null);
        try {
            const r = await api('verify', { method: 'post', data: payload });
            setResult({ type: 'verify', data: r.data });
        } catch (e) {
            setError(e.response?.data?.message || 'Verification failed.');
        }
        setLoading(false);
    };

    const reset = () => {
        setStep(1); setOtp(''); setResult(null);
        setError(''); setCountdown(0); setShowOptions(false);
    };

    // Build live preview of the exact payload that will be sent
    const buildPreviewPayload = () => {
        const p = {
            email: email || 'user@example.com',
            otp:   otp   || '••••',
            table: table || 'users',
        };
        p.check_email = checkEmail;
        if (checkEmail) {
            p.on_found     = onFound;
            p.on_not_found = onNotFound;
            if (foundMessage.trim())    p.found_message    = foundMessage.trim();
            if (notFoundMessage.trim()) p.not_found_message = notFoundMessage.trim();
            if (skipToken)              p.skip_token = true;
            if (onNotFound === 'create') {
                try {
                    p.create_data = { ...JSON.parse(createData), email: email || 'user@example.com' };
                } catch {
                    p.create_data = '(invalid JSON)';
                }
            }
        }
        return p;
    };

    const statusVariant = (s) => ({
        authenticated: 'success', otp_verified: 'info',
        profile_incomplete: 'warning', not_found: 'danger',
        created: 'primary', registered: 'primary',
    }[s] || 'secondary');

    return (
        <Row className="justify-content-center">
            <Col md={7}>
                <Card className="border-0 shadow-sm">
                    <CardHeader className="bg-transparent border-bottom py-2">
                        <strong>Test OTP Flow</strong>
                        <span className="text-muted small ms-2">Live test with real Resend email</span>
                    </CardHeader>
                    <CardBody>
                        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

                        {step === 1 && (
                            <Form onSubmit={sendOtp}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control type="email" placeholder="test@example.com" value={email}
                                        onChange={e => setEmail(e.target.value)} required />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Table to Check</Form.Label>
                                    <Form.Select value={table} onChange={e => handleTableChange(e.target.value)}>
                                        {tables.map(t => (
                                            <option key={t.table} value={t.table}>{t.table}</option>
                                        ))}
                                        {!tables.length && <option value="users">users</option>}
                                    </Form.Select>
                                    <Form.Text className="text-muted">
                                        Verify options auto-load from Settings.
                                    </Form.Text>
                                </Form.Group>
                                <Button type="submit" className="w-100" disabled={loading}>
                                    {loading ? <Spinner size="sm" className="me-2" /> : <Icon name="send" size={15} className="me-2" />}
                                    Send OTP via Resend
                                </Button>
                            </Form>
                        )}

                        {step === 2 && (
                            <Form onSubmit={verifyOtp}>
                                <Alert variant="info" className="py-2 small">
                                    OTP sent to <strong>{email}</strong> (table: <code>{table || '—'}</code>)
                                </Alert>

                                <Form.Group className="mb-3">
                                    <Form.Label>Enter 4-digit OTP</Form.Label>
                                    <Form.Control
                                        type="text" inputMode="numeric" placeholder="1234"
                                        value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        maxLength={4} className="text-center fs-3" required autoFocus
                                    />
                                </Form.Group>

                                {/* Verify Options Toggle */}
                                <div className="mb-3">
                                    <Button variant="outline-secondary" size="sm"
                                        onClick={() => setShowOptions(o => !o)}>
                                        <Icon name={showOptions ? 'chevron-up' : 'chevron-down'} size={13} className="me-1" />
                                        {showOptions ? 'Hide' : 'Show'} Verify Options
                                    </Button>
                                </div>

                                {showOptions && (
                                    <div className="border rounded p-3 mb-3 bg-light">
                                        <div className="small fw-semibold text-muted mb-3 text-uppercase" style={{ letterSpacing: 1 }}>
                                            Verify Options
                                        </div>

                                        {/* check_email */}
                                        <Form.Group className="mb-3 d-flex align-items-center justify-content-between">
                                            <div>
                                                <Form.Label className="mb-0 fw-medium">Check Email in Table</Form.Label>
                                                <div className="text-muted" style={{ fontSize: 11 }}>
                                                    <code>check_email</code> — Disable to just verify OTP without table lookup
                                                </div>
                                            </div>
                                            <Form.Check type="switch" id="opt-check-email"
                                                checked={checkEmail} onChange={e => setCheckEmail(e.target.checked)} />
                                        </Form.Group>

                                        {checkEmail && (
                                            <>
                                                {/* on_found */}
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="fw-medium mb-1">
                                                        When email <span className="text-success">IS FOUND</span>
                                                        <code className="ms-1 small">on_found</code>
                                                    </Form.Label>
                                                    <Form.Select size="sm" value={onFound} onChange={e => setOnFound(e.target.value)}>
                                                        {ON_FOUND_OPTIONS.map(o => (
                                                            <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>
                                                        ))}
                                                    </Form.Select>
                                                </Form.Group>

                                                {/* found_message */}
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="fw-medium mb-1">
                                                        Found Message <code className="small">found_message</code>
                                                        <span className="text-muted small ms-1">(optional)</span>
                                                    </Form.Label>
                                                    <Form.Control size="sm" type="text" placeholder='e.g. "Welcome back!"'
                                                        value={foundMessage} onChange={e => setFoundMessage(e.target.value)} />
                                                </Form.Group>

                                                {/* on_not_found */}
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="fw-medium mb-1">
                                                        When email <span className="text-danger">NOT FOUND</span>
                                                        <code className="ms-1 small">on_not_found</code>
                                                    </Form.Label>
                                                    <Form.Select size="sm" value={onNotFound} onChange={e => setOnNotFound(e.target.value)}>
                                                        {ON_NOT_FOUND_OPTIONS.map(o => (
                                                            <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>
                                                        ))}
                                                    </Form.Select>
                                                </Form.Group>

                                                {/* not_found_message */}
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="fw-medium mb-1">
                                                        Not Found Message <code className="small">not_found_message</code>
                                                        <span className="text-muted small ms-1">(optional)</span>
                                                    </Form.Label>
                                                    <Form.Control size="sm" type="text" placeholder='e.g. "Please complete your profile"'
                                                        value={notFoundMessage} onChange={e => setNotFoundMessage(e.target.value)} />
                                                </Form.Group>

                                                {/* create_data (shown only when on_not_found=create) */}
                                                {onNotFound === 'create' && (  // eslint-disable-line no-constant-condition
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="fw-medium mb-1">
                                                            Create Data <code className="small">create_data</code>
                                                            <span className="text-muted small ms-1">— JSON fields to insert (email added auto)</span>
                                                        </Form.Label>
                                                        <Form.Control as="textarea" rows={4} size="sm"
                                                            value={createData}
                                                            onChange={e => { setCreateData(e.target.value); setCreateDataError(''); }}
                                                            style={{ fontFamily: 'monospace', fontSize: 12 }}
                                                            isInvalid={!!createDataError}
                                                        />
                                                        {createDataError && (
                                                            <Form.Control.Feedback type="invalid">{createDataError}</Form.Control.Feedback>
                                                        )}
                                                    </Form.Group>
                                                )}

                                                {/* skip_token */}
                                                <Form.Group className="d-flex align-items-center justify-content-between">
                                                    <div>
                                                        <Form.Label className="mb-0 fw-medium">Skip Token in Response</Form.Label>
                                                        <div className="text-muted" style={{ fontSize: 11 }}>
                                                            <code>skip_token</code> — Don't include auth token even if authenticated
                                                        </div>
                                                    </div>
                                                    <Form.Check type="switch" id="opt-skip-token"
                                                        checked={skipToken} onChange={e => setSkipToken(e.target.checked)} />
                                                </Form.Group>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Live Request Preview */}
                                <div className="mb-3">
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <Badge bg="primary" className="fw-normal">POST</Badge>
                                        <code className="small text-muted">/api/otp-auth/verify</code>
                                        <span className="text-muted ms-auto" style={{ fontSize: 10 }}>LIVE PREVIEW</span>
                                    </div>
                                    <pre
                                        className="rounded mb-0 p-2"
                                        style={{
                                            fontSize: 11,
                                            background: '#1e1e2e',
                                            color: '#cdd6f4',
                                            maxHeight: 200,
                                            overflow: 'auto',
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        {JSON.stringify(buildPreviewPayload(), null, 2)}
                                    </pre>
                                </div>

                                <div className="d-flex gap-2">
                                    <Button type="submit" className="flex-fill" disabled={loading}>
                                        {loading && <Spinner size="sm" className="me-1" />} Verify OTP
                                    </Button>
                                    <Button variant="outline-secondary" disabled={countdown > 0 || loading}
                                        onClick={sendOtp}>
                                        {countdown > 0 ? `${countdown}s` : 'Resend'}
                                    </Button>
                                    <Button variant="outline-danger" onClick={reset}>Reset</Button>
                                </div>
                            </Form>
                        )}

                        {result && (
                            <div className="mt-4">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <strong>Response</strong>
                                    <Badge bg={statusVariant(result.data.status)}>
                                        {result.data.status || 'sent'}
                                    </Badge>
                                    {result.data.token && (
                                        <Badge bg="secondary" className="text-truncate" style={{ maxWidth: 160 }}>
                                            token: {result.data.token.slice(0, 20)}…
                                        </Badge>
                                    )}
                                </div>
                                {result.data.status === 'not_found' && (
                                    <Alert variant="danger" className="py-2 small mb-2">
                                        <strong>{email}</strong> not found in <code>{table}</code>.
                                        No token returned — message only response.
                                    </Alert>
                                )}
                                {result.data.status === 'profile_incomplete' && (
                                    <Alert variant="warning" className="py-2 small mb-2">
                                        <strong>{email}</strong> not found. Use <code>otp_token</code> to call <code>/complete-profile</code>.
                                    </Alert>
                                )}
                                {result.data.status === 'otp_verified' && (
                                    <Alert variant="info" className="py-2 small mb-2">
                                        OTP verified (table check skipped). Use <code>otp_token</code> for next step.
                                    </Alert>
                                )}
                                {result.data.status === 'created' && (
                                    <Alert variant="success" className="py-2 small mb-2">
                                        User auto-created in <code>{table}</code> and token issued.
                                    </Alert>
                                )}
                                <pre className="bg-light p-3 rounded small" style={{ maxHeight: 280, overflow: 'auto' }}>
                                    {JSON.stringify(result.data, null, 2)}
                                </pre>
                                <Button variant="outline-primary" size="sm" onClick={reset} className="mt-2">
                                    Test Again
                                </Button>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </Col>
        </Row>
    );
}

// ─── LOGS TAB ─────────────────────────────────────────────────────────────────
function LogsTab() {
    const [logs, setLogs]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');
    const [page, setPage]       = useState(1);

    const load = useCallback(async (p = 1) => {
        setLoading(true); setError('');
        try {
            const r = await api(`logs?per_page=20&page=${p}`);
            setLogs(r.data);
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to load logs.');
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(page); }, [load, page]);

    const badge = (log) => {
        if (log.verified_at) return <Badge bg="success">Verified</Badge>;
        if (new Date(log.expires_at) < new Date()) return <Badge bg="secondary">Expired</Badge>;
        return <Badge bg="warning" text="dark">Pending</Badge>;
    };

    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <strong>OTP Verification Logs</strong>
                <Button size="sm" variant="outline-secondary" onClick={() => load(page)}>
                    <Icon name="refresh-cw" size={14} className="me-1" /> Refresh
                </Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {loading ? <div className="text-center py-5"><Spinner /></div> : logs && (
                <>
                    <div className="table-responsive">
                        <Table hover size="sm" className="align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>#</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Attempts</th>
                                    <th>IP</th>
                                    <th>Expires</th>
                                    <th>Verified</th>
                                    <th>Sent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!logs.data?.length && (
                                    <tr><td colSpan={8} className="text-center text-muted py-4">No OTP records yet.</td></tr>
                                )}
                                {logs.data?.map(log => (
                                    <tr key={log.id}>
                                        <td className="text-muted small">{log.id}</td>
                                        <td><code className="small">{log.email}</code></td>
                                        <td>{badge(log)}</td>
                                        <td>
                                            <Badge bg={log.attempts > 3 ? 'danger' : 'secondary'}>{log.attempts}</Badge>
                                        </td>
                                        <td className="text-muted small">{log.ip_address || '—'}</td>
                                        <td className="text-muted small">{log.expires_at ? new Date(log.expires_at).toLocaleTimeString() : '—'}</td>
                                        <td className="text-muted small">{log.verified_at ? new Date(log.verified_at).toLocaleTimeString() : '—'}</td>
                                        <td className="text-muted small">{new Date(log.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>

                    {logs.last_page > 1 && (
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className="text-muted small">{logs.from}–{logs.to} of {logs.total}</span>
                            <div className="d-flex gap-1">
                                <Button size="sm" variant="outline-secondary" disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}>‹ Prev</Button>
                                <Button size="sm" variant="outline-secondary" disabled={page === logs.last_page}
                                    onClick={() => setPage(p => p + 1)}>Next ›</Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function OtpAuthPage() {
    const [settingsVersion, setSettingsVersion] = useState(0);

    return (
        <>
            <PageBreadcrumb title="OTP Auth" subName="Apps" />
            <Tab.Container defaultActiveKey="settings">
                <Card className="border-0 shadow-sm">
                    <CardHeader className="bg-transparent border-bottom">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                                <Icon name="mail-check" size={20} />
                                <strong>OTP Auth — Resend Integration</strong>
                            </div>
                            <Nav variant="pills" className="card-header-pills">
                                <Nav.Item>
                                    <Nav.Link eventKey="settings">
                                        <Icon name="settings" size={14} className="me-1" />Settings
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="test">
                                        <Icon name="flask-conical" size={14} className="me-1" />Test OTP
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="logs">
                                        <Icon name="scroll-text" size={14} className="me-1" />Logs
                                    </Nav.Link>
                                </Nav.Item>
                            </Nav>
                        </div>
                    </CardHeader>
                    <CardBody>
                        <Tab.Content>
                            <Tab.Pane eventKey="settings">
                                <SettingsTab onSaved={() => setSettingsVersion(v => v + 1)} />
                            </Tab.Pane>
                            <Tab.Pane eventKey="test">
                                <TestTab settingsVersion={settingsVersion} />
                            </Tab.Pane>
                            <Tab.Pane eventKey="logs"><LogsTab /></Tab.Pane>
                        </Tab.Content>
                    </CardBody>
                </Card>
            </Tab.Container>
        </>
    );
}
