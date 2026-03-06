import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import DataTable from '@admin/components/table/DataTable';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
// Note: platforms table uses client pagination; meetings table uses server-side pagination
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert, Badge, Button, Card, CardBody, CardHeader,
    Col, Form, FormControl, FormGroup, FormLabel, FormSelect,
    Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
    Nav, Row, Spinner, Tab,
} from 'react-bootstrap';

const api = (path, opts = {}) => axios({ url: `/api/admin/cal/${path}`, ...opts });

const columnHelper = createColumnHelper();

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_MAP = {
    upcoming:    { cls: 'bg-primary-subtle text-primary',   label: 'Upcoming'    },
    completed:   { cls: 'bg-success-subtle text-success',   label: 'Completed'   },
    cancelled:   { cls: 'bg-danger-subtle text-danger',     label: 'Cancelled'   },
    rescheduled: { cls: 'bg-warning-subtle text-warning',   label: 'Rescheduled' },
};
const StatusBadge = ({ status }) => {
    const s = STATUS_MAP[status] ?? { cls: 'bg-secondary-subtle text-secondary', label: status };
    return <span className={`badge badge-label ${s.cls}`}>{s.label}</span>;
};

// ── Platforms Tab ─────────────────────────────────────────────────────────────
const PLATFORM_INIT = { name: '', slug: '', api_key: '', webhook_secret: '', base_url: 'https://api.cal.com/v2', color: '#6366f1', is_active: true };

const toSlug = (str) => str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

function PlatformsTab() {
    const [platforms, setPlatforms]     = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState('');
    const [showModal, setShowModal]     = useState(false);
    const [showDelete, setShowDelete]   = useState(false);
    const [editing, setEditing]         = useState(null);
    const [form, setForm]               = useState(PLATFORM_INIT);
    const [saving, setSaving]           = useState(false);
    const [formError, setFormError]     = useState('');
    const [slugEdited, setSlugEdited]   = useState(false);
    const [actionId, setActionId]       = useState(null); // syncing/testing
    const [revealedKeys, setRevealedKeys] = useState({});
    const [alertMsg, setAlertMsg]       = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const { data } = await api('platforms');
            setPlatforms(data);
        } catch { setError('Failed to load platforms.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => { setForm(PLATFORM_INIT); setEditing(null); setFormError(''); setSlugEdited(false); setShowModal(true); };
    const openEdit   = (p)  => { setForm({ ...p, api_key: '' }); setEditing(p); setFormError(''); setSlugEdited(true); setShowModal(true); };
    const openDelete = (p)  => { setEditing(p); setShowDelete(true); };

    const save = async () => {
        setSaving(true); setFormError('');
        try {
            if (editing) {
                await api(`platforms/${editing.id}`, { method: 'PUT', data: form });
            } else {
                await api('platforms', { method: 'POST', data: form });
            }
            setShowModal(false); load();
        } catch (e) {
            const errs = e.response?.data?.errors;
            setFormError(errs ? Object.values(errs).flat().join(' ') : (e.response?.data?.message || 'Save failed.'));
        } finally { setSaving(false); }
    };

    const destroy = async () => {
        await api(`platforms/${editing.id}`, { method: 'DELETE' });
        setShowDelete(false); load();
    };

    const sync = async (p) => {
        setActionId(`sync-${p.id}`);
        try {
            const { data } = await api(`platforms/${p.id}/sync`, { method: 'POST' });
            setAlertMsg(`✓ Synced ${data.synced} meeting(s) from ${p.name}`);
            load();
        } catch (e) { setAlertMsg('✗ ' + (e.response?.data?.message || 'Sync failed')); }
        finally { setActionId(null); }
    };

    const testConn = async (p) => {
        setActionId(`test-${p.id}`);
        try {
            const { data } = await api(`platforms/${p.id}/test`, { method: 'POST' });
            setAlertMsg(data.ok ? `✓ ${p.name}: Connection successful!` : `✗ ${p.name}: ${data.message}`);
        } catch (e) { setAlertMsg('✗ Connection failed: ' + (e.response?.data?.message || e.message)); }
        finally { setActionId(null); }
    };

    const revealKey = async (p) => {
        const { data } = await api(`platforms/${p.id}/reveal-key`, { method: 'POST' });
        setRevealedKeys(prev => ({ ...prev, [p.id]: data.api_key }));
    };

    const copyWebhookUrl = (url) => {
        navigator.clipboard.writeText(url).then(() => setAlertMsg('✓ Webhook URL copied to clipboard!'));
    };

    const columns = [
        columnHelper.accessor('name', {
            header: 'Platform',
            cell: ({ row }) => {
                const p = row.original;
                return (
                    <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle d-inline-block flex-shrink-0" style={{ width: 10, height: 10, background: p.color }} />
                        <div>
                            <div className="fw-semibold text-dark">{p.name}</div>
                            <small className="text-muted font-monospace">/{p.slug}</small>
                        </div>
                    </div>
                );
            },
        }),
        columnHelper.accessor('api_key_masked', {
            header: 'API Key',
            cell: ({ row }) => {
                const p = row.original;
                const revealed = revealedKeys[p.id];
                return (
                    <div className="d-flex align-items-center gap-2">
                        <code className="text-muted small">{revealed ?? p.api_key_masked ?? '—'}</code>
                        {!revealed && p.api_key_masked && (
                            <Button size="sm" variant="link" className="p-0 text-primary" onClick={() => revealKey(p)}>Reveal</Button>
                        )}
                    </div>
                );
            },
        }),
        columnHelper.accessor('webhook_url', {
            header: 'Webhook URL',
            cell: ({ row }) => {
                const p = row.original;
                return (
                    <div className="d-flex align-items-center gap-1">
                        <code className="text-muted small text-truncate" style={{ maxWidth: 180 }} title={p.webhook_url}>{p.webhook_url}</code>
                        <Button size="sm" variant="link" className="p-0 text-secondary flex-shrink-0" title="Copy URL" onClick={() => copyWebhookUrl(p.webhook_url)}>
                            <Icon icon="copy" />
                        </Button>
                    </div>
                );
            },
        }),
        columnHelper.accessor('meetings_count', {
            header: 'Meetings',
            cell: ({ getValue }) => <span className="badge badge-label bg-secondary-subtle text-secondary">{getValue()}</span>,
        }),
        columnHelper.accessor('is_active', {
            header: 'Status',
            cell: ({ getValue }) => (
                <span className={`badge badge-label ${getValue() ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                    {getValue() ? 'Active' : 'Inactive'}
                </span>
            ),
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const p = row.original;
                return (
                    <div className="d-flex gap-1 flex-wrap">
                        <Button size="sm" variant="light" onClick={() => openEdit(p)}>
                            <Icon icon="edit" className="me-1" />Edit
                        </Button>
                        <Button size="sm" variant="outline-primary" disabled={actionId === `test-${p.id}`} onClick={() => testConn(p)}>
                            {actionId === `test-${p.id}` ? <Spinner size="sm" animation="border" /> : <Icon icon="plug" className="me-1" />}Test
                        </Button>
                        <Button size="sm" variant="outline-success" disabled={actionId === `sync-${p.id}`} onClick={() => sync(p)}>
                            {actionId === `sync-${p.id}` ? <Spinner size="sm" animation="border" /> : <Icon icon="refresh" className="me-1" />}Sync
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => openDelete(p)}>
                            <Icon icon="trash" />
                        </Button>
                    </div>
                );
            },
        }),
    ];

    const table = useReactTable({
        data: platforms,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            {alertMsg && (
                <Alert variant={alertMsg.startsWith('✓') ? 'success' : 'danger'} dismissible onClose={() => setAlertMsg('')} className="mb-3">
                    {alertMsg}
                </Alert>
            )}

            <Card>
                <CardHeader className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Cal.com Platforms</h5>
                    <Button variant="primary" size="sm" onClick={openCreate}>
                        <Icon icon="plus" className="me-1" />Add Platform
                    </Button>
                </CardHeader>
                <CardBody className="p-0">
                    {loading ? (
                        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
                    ) : error ? (
                        <Alert variant="danger" className="m-3">{error}</Alert>
                    ) : (
                        <>
                            <DataTable table={table} emptyMessage="No platforms yet. Add one to get started." />
                            <TablePagination table={table} className="px-3 pb-3" />
                        </>
                    )}
                </CardBody>
            </Card>

            {/* Create/Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                <ModalHeader closeButton>
                    <ModalTitle>{editing ? `Edit: ${editing.name}` : 'Add Cal.com Platform'}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {formError && <Alert variant="danger">{formError}</Alert>}
                    <Row className="g-3">
                        <Col md={6}>
                            <FormGroup>
                                <FormLabel>Platform Name <span className="text-danger">*</span></FormLabel>
                                <FormControl value={form.name} onChange={e => {
                                    const name = e.target.value;
                                    setForm(p => ({ ...p, name, ...(!slugEdited ? { slug: toSlug(name) } : {}) }));
                                }} placeholder="My Platform" />
                            </FormGroup>
                        </Col>
                        {!editing && (
                            <Col md={6}>
                                <FormGroup>
                                    <FormLabel>Slug <small className="text-muted">(auto-generated from name)</small></FormLabel>
                                    <FormControl value={form.slug} placeholder="my-platform"
                                        onChange={e => { setSlugEdited(true); setForm(p => ({ ...p, slug: toSlug(e.target.value) })); }} />
                                </FormGroup>
                            </Col>
                        )}
                        <Col md={6}>
                            <FormGroup>
                                <FormLabel>API Key {editing && <small className="text-muted">(blank = keep existing)</small>}</FormLabel>
                                <FormControl type="password" value={form.api_key} onChange={e => setForm(p => ({ ...p, api_key: e.target.value }))} placeholder="cal_live_..." />
                            </FormGroup>
                        </Col>
                        <Col md={6}>
                            <FormGroup>
                                <FormLabel>
                                    Webhook Secret
                                    {editing
                                        ? <small className="text-muted ms-1">(blank = keep existing)</small>
                                        : <small className="text-muted ms-1">(from Cal.com webhook settings)</small>
                                    }
                                </FormLabel>
                                <FormControl type="password" value={form.webhook_secret ?? ''} onChange={e => setForm(p => ({ ...p, webhook_secret: e.target.value }))} placeholder="whsec_..." />
                            </FormGroup>
                        </Col>
                        <Col md={8}>
                            <FormGroup>
                                <FormLabel>Cal.com API Base URL</FormLabel>
                                <FormControl value={form.base_url} onChange={e => setForm(p => ({ ...p, base_url: e.target.value }))} placeholder="https://api.cal.com/v2" />
                            </FormGroup>
                        </Col>
                        <Col md={4}>
                            <FormGroup>
                                <FormLabel>Color</FormLabel>
                                <div className="d-flex gap-2 align-items-center">
                                    <Form.Control type="color" value={form.color || '#6366f1'} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ width: 44, height: 38, padding: 2 }} />
                                    <FormControl value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} placeholder="#6366f1" />
                                </div>
                            </FormGroup>
                        </Col>
                        <Col md={12}>
                            <Form.Check type="switch" id="platform-active" label="Active"
                                checked={!!form.is_active}
                                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
                        </Col>
                    </Row>
                </ModalBody>
                <ModalFooter>
                    <Button variant="light" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={save} disabled={saving}>
                        {saving ? <Spinner size="sm" animation="border" className="me-1" /> : null}Save
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Delete Confirmation */}
            <DeleteConfirmationModal
                show={showDelete}
                onHide={() => setShowDelete(false)}
                onConfirm={destroy}
                itemName="platform"
            >
                Delete platform <strong>{editing?.name}</strong>? All its meetings will also be deleted.
            </DeleteConfirmationModal>
        </>
    );
}

// ── Meetings Tab ──────────────────────────────────────────────────────────────
const MEETING_INIT = {
    cal_platform_id: '', openorg_user_id: '', title: '', description: '', attendee_name: '',
    attendee_email: '', start_time: '', end_time: '', status: 'upcoming', meeting_url: '',
};

function MeetingsTab({ platforms }) {
    const [meetings, setMeetings]         = useState([]);
    const [total, setTotal]               = useState(0);
    const [pageIndex, setPageIndex]       = useState(0);
    const [pageSize, setPageSize]         = useState(15);
    const [loading, setLoading]           = useState(true);
    const [filter, setFilter]             = useState({ platform_id: '', status: '', search: '' });
    const [showModal, setShowModal]       = useState(false);
    const [showDelete, setShowDelete]     = useState(false);
    const [editing, setEditing]           = useState(null);
    const [form, setForm]                 = useState(MEETING_INIT);
    const [saving, setSaving]             = useState(false);
    const [formError, setFormError]       = useState('');
    const [platformUsers, setPlatformUsers] = useState([]);

    // Load users when platform changes in the form
    const loadPlatformUsers = useCallback(async (platformId) => {
        if (!platformId) { setPlatformUsers([]); return; }
        try {
            const { data } = await axios.get(`/api/admin/platforms/${platformId}/users?active_only=1`);
            setPlatformUsers(data.data ?? data);
        } catch { setPlatformUsers([]); }
    }, []);

    const load = useCallback(async (f = filter, pg = pageIndex, ps = pageSize) => {
        setLoading(true);
        const params = new URLSearchParams({
            ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)),
            page: pg + 1,
            per_page: ps,
        }).toString();
        try {
            const { data } = await api(`meetings?${params}`);
            setMeetings(data.data ?? data);
            setTotal(data.total ?? (data.data ?? data).length);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [filter, pageIndex, pageSize]);

    useEffect(() => { load(); }, [load]);

    const applyFilter = (key, val) => {
        const f = { ...filter, [key]: val };
        setFilter(f);
        setPageIndex(0);
        load(f, 0, pageSize);
    };

    const handlePageChange = (pg) => {
        setPageIndex(pg);
        load(filter, pg, pageSize);
    };

    const handlePageSizeChange = (ps) => {
        setPageSize(ps);
        setPageIndex(0);
        load(filter, 0, ps);
    };

    const openCreate = () => {
        const defaultPlatformId = platforms[0]?.id ?? '';
        setForm({ ...MEETING_INIT, cal_platform_id: defaultPlatformId });
        loadPlatformUsers(defaultPlatformId);
        setEditing(null); setFormError(''); setShowModal(true);
    };
    const openEdit = (m) => {
        setForm({ ...m, start_time: m.start_time?.slice(0, 16) ?? '', end_time: m.end_time?.slice(0, 16) ?? '' });
        loadPlatformUsers(m.cal_platform_id);
        setEditing(m); setFormError(''); setShowModal(true);
    };
    const openDelete = (m)  => { setEditing(m); setShowDelete(true); };

    const save = async () => {
        setSaving(true); setFormError('');
        try {
            if (editing) {
                await api(`meetings/${editing.id}`, { method: 'PUT', data: form });
            } else {
                await api('meetings', { method: 'POST', data: form });
            }
            setShowModal(false); load();
        } catch (e) {
            const errs = e.response?.data?.errors;
            setFormError(errs ? Object.values(errs).flat().join(' ') : (e.response?.data?.message || 'Save failed.'));
        } finally { setSaving(false); }
    };

    const destroy = async () => {
        await api(`meetings/${editing.id}`, { method: 'DELETE' });
        setShowDelete(false); load();
    };

    const cancelViaApi = async (m) => {
        const reason = prompt('Cancellation reason (optional):') ?? '';
        try {
            await api(`meetings/${m.id}/cancel`, { method: 'POST', data: { reason } });
            load();
        } catch (e) { alert(e.response?.data?.message || 'Cancel failed'); }
    };

    const platformName  = (id) => platforms.find(p => +p.id === +id)?.name ?? '—';
    const platformColor = (id) => platforms.find(p => +p.id === +id)?.color ?? '#999';

    const columns = [
        columnHelper.accessor('cal_platform_id', {
            header: 'Platform',
            cell: ({ getValue }) => {
                const id = getValue();
                return (
                    <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle" style={{ width: 8, height: 8, display: 'inline-block', background: platformColor(id) }} />
                        <span className="small">{platformName(id)}</span>
                    </div>
                );
            },
        }),
        columnHelper.accessor('title', {
            header: 'Title',
            cell: ({ getValue }) => <span className="fw-semibold">{getValue()}</span>,
        }),
        columnHelper.accessor('attendee_name', {
            header: 'Attendee',
            cell: ({ row }) => (
                <div>
                    <div className="fw-medium">{row.original.attendee_name}</div>
                    <small className="text-muted">{row.original.attendee_email}</small>
                </div>
            ),
        }),
        columnHelper.accessor('start_time', {
            header: 'Start Time',
            cell: ({ getValue }) => <small>{getValue() ? new Date(getValue()).toLocaleString() : '—'}</small>,
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: ({ getValue }) => <StatusBadge status={getValue()} />,
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const m = row.original;
                return (
                    <div className="d-flex gap-1">
                        <Button size="sm" variant="light" onClick={() => openEdit(m)}>
                            <Icon icon="edit" />
                        </Button>
                        {m.booking_uid && m.status === 'upcoming' && (
                            <Button size="sm" variant="outline-warning" onClick={() => cancelViaApi(m)}>
                                <Icon icon="calendar-x" />
                            </Button>
                        )}
                        <Button size="sm" variant="outline-danger" onClick={() => openDelete(m)}>
                            <Icon icon="trash" />
                        </Button>
                    </div>
                );
            },
        }),
    ];

    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    const table = useReactTable({
        data: meetings,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        manualPagination: true,
        pageCount,
        state: { pagination: { pageIndex, pageSize } },
        onPaginationChange: (updater) => {
            const next = typeof updater === 'function' ? updater({ pageIndex, pageSize }) : updater;
            if (next.pageIndex !== pageIndex) handlePageChange(next.pageIndex);
            if (next.pageSize !== pageSize) handlePageSizeChange(next.pageSize);
        },
    });

    return (
        <>
            <Card>
                <CardHeader>
                    <Row className="g-2 align-items-center">
                        <Col md={4}>
                            <FormControl placeholder="Search name, email…" value={filter.search}
                                onChange={e => applyFilter('search', e.target.value)} size="sm" />
                        </Col>
                        <Col md={3}>
                            <FormSelect size="sm" value={filter.platform_id} onChange={e => applyFilter('platform_id', e.target.value)}>
                                <option value="">All Platforms</option>
                                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </FormSelect>
                        </Col>
                        <Col md={2}>
                            <FormSelect size="sm" value={filter.status} onChange={e => applyFilter('status', e.target.value)}>
                                <option value="">All Status</option>
                                <option value="upcoming">Upcoming</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="rescheduled">Rescheduled</option>
                            </FormSelect>
                        </Col>
                        <Col md="auto" className="ms-auto">
                            <small className="text-muted me-2">{total} meeting(s)</small>
                            <Button size="sm" variant="primary" onClick={openCreate}>
                                <Icon icon="plus" className="me-1" />Add Meeting
                            </Button>
                        </Col>
                    </Row>
                </CardHeader>
                <CardBody className="p-0">
                    {loading ? (
                        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
                    ) : (
                        <>
                            <DataTable table={table} emptyMessage="No meetings found." />
                            <TablePagination
                                totalItems={total}
                                start={total === 0 ? 0 : pageIndex * pageSize + 1}
                                end={Math.min((pageIndex + 1) * pageSize, total)}
                                showInfo
                                previousPage={() => handlePageChange(pageIndex - 1)}
                                canPreviousPage={pageIndex > 0}
                                pageCount={pageCount}
                                pageIndex={pageIndex}
                                setPageIndex={handlePageChange}
                                nextPage={() => handlePageChange(pageIndex + 1)}
                                canNextPage={pageIndex < pageCount - 1}
                                perPage={pageSize}
                                onPerPageChange={handlePageSizeChange}
                                perPageOptions={[10, 15, 25, 50]}
                            />
                        </>
                    )}
                </CardBody>
            </Card>

            {/* Form Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                <ModalHeader closeButton>
                    <ModalTitle>{editing ? 'Edit Meeting' : 'Add Meeting'}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {formError && <Alert variant="danger">{formError}</Alert>}
                    <Row className="g-3">
                        <Col md={6}>
                            <FormGroup>
                                <FormLabel>Platform <span className="text-danger">*</span></FormLabel>
                                <FormSelect value={form.cal_platform_id} onChange={e => {
                                    const pid = e.target.value;
                                    setForm(p => ({ ...p, cal_platform_id: pid, openorg_user_id: '' }));
                                    loadPlatformUsers(pid);
                                }}>
                                    <option value="">Select platform…</option>
                                    {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </FormSelect>
                            </FormGroup>
                        </Col>
                        <Col md={6}>
                            <FormGroup>
                                <FormLabel>Assign User <small className="text-muted">(optional)</small></FormLabel>
                                <FormSelect value={form.openorg_user_id ?? ''} onChange={e => setForm(p => ({ ...p, openorg_user_id: e.target.value || null }))}
                                    disabled={!form.cal_platform_id}>
                                    <option value="">— No user assigned —</option>
                                    {platformUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                                </FormSelect>
                            </FormGroup>
                        </Col>
                        <Col md={12}>
                            <FormGroup>
                                <FormLabel>Title <span className="text-danger">*</span></FormLabel>
                                <FormControl value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Meeting title" />
                            </FormGroup>
                        </Col>
                        <Col md={6}>
                            <FormGroup>
                                <FormLabel>Attendee Name <span className="text-danger">*</span></FormLabel>
                                <FormControl value={form.attendee_name} onChange={e => setForm(p => ({ ...p, attendee_name: e.target.value }))} placeholder="John Doe" />
                            </FormGroup>
                        </Col>
                        <Col md={6}>
                            <FormGroup>
                                <FormLabel>Attendee Email <span className="text-danger">*</span></FormLabel>
                                <FormControl type="email" value={form.attendee_email} onChange={e => setForm(p => ({ ...p, attendee_email: e.target.value }))} placeholder="john@example.com" />
                            </FormGroup>
                        </Col>
                        <Col md={6}>
                            <FormGroup>
                                <FormLabel>Start Time <span className="text-danger">*</span></FormLabel>
                                <FormControl type="datetime-local" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
                            </FormGroup>
                        </Col>
                        <Col md={6}>
                            <FormGroup>
                                <FormLabel>End Time <span className="text-danger">*</span></FormLabel>
                                <FormControl type="datetime-local" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
                            </FormGroup>
                        </Col>
                        <Col md={6}>
                            <FormGroup>
                                <FormLabel>Status</FormLabel>
                                <FormSelect value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                                    <option value="upcoming">Upcoming</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="rescheduled">Rescheduled</option>
                                </FormSelect>
                            </FormGroup>
                        </Col>
                        <Col md={6}>
                            <FormGroup>
                                <FormLabel>Meeting URL</FormLabel>
                                <FormControl value={form.meeting_url} onChange={e => setForm(p => ({ ...p, meeting_url: e.target.value }))} placeholder="https://…" />
                            </FormGroup>
                        </Col>
                    </Row>
                </ModalBody>
                <ModalFooter>
                    <Button variant="light" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={save} disabled={saving}>
                        {saving ? <Spinner size="sm" animation="border" className="me-1" /> : null}Save
                    </Button>
                </ModalFooter>
            </Modal>

            <DeleteConfirmationModal
                show={showDelete}
                onHide={() => setShowDelete(false)}
                onConfirm={destroy}
                itemName="meeting"
            />
        </>
    );
}


// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CalPage() {
    const [platforms, setPlatforms] = useState([]);

    useEffect(() => {
        api('platforms').then(({ data }) => setPlatforms(data)).catch(() => {});
    }, []);

    return (
        <>
            <PageBreadcrumb title="Cal.com Integration" subName="Apps" />

            <Tab.Container defaultActiveKey="platforms">
                <Nav variant="tabs" className="mb-3">
                    <Nav.Item>
                        <Nav.Link eventKey="platforms">
                            <Icon icon="settings" className="me-1" />Platforms
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="meetings">
                            <Icon icon="calendar-event" className="me-1" />Meetings
                        </Nav.Link>
                    </Nav.Item>
                </Nav>

                <Tab.Content>
                    <Tab.Pane eventKey="platforms">
                        <PlatformsTab />
                    </Tab.Pane>
                    <Tab.Pane eventKey="meetings">
                        <MeetingsTab platforms={platforms} />
                    </Tab.Pane>
                </Tab.Content>
            </Tab.Container>
        </>
    );
}
