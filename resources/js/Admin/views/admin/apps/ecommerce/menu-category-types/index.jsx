import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import DataTable from '@admin/components/table/DataTable';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import axios from 'axios';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import {
    Alert, Badge, Button, Card, CardBody, CardHeader,
    Col, Form, FormControl, FormLabel, Modal, Row, Spinner,
} from 'react-bootstrap';

const columnHelper = createColumnHelper();
const emptyForm = { name: '', description: '', icon: '', hover_icon: '', sort_order: 0, is_active: true };

const isUrl = (val) => val && (val.startsWith('http') || val.startsWith('/') || val.startsWith('data:'));

const IconPreview = ({ icon, hoverIcon, size = 36 }) => {
    const [hovered, setHovered] = useState(false);
    const current = hovered && hoverIcon ? hoverIcon : icon;
    return (
        <div
            className="d-flex align-items-center justify-content-center rounded border bg-light"
            style={{ width: size, height: size, flexShrink: 0, cursor: hoverIcon ? 'pointer' : 'default', overflow: 'hidden' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={hoverIcon ? 'Hover to preview hover icon' : undefined}
        >
            {current ? (
                isUrl(current)
                    ? <img src={current} alt="" style={{ width: size - 8, height: size - 8, objectFit: 'contain' }} />
                    : <Icon icon={current} size={size * 0.5} className="text-primary" />
            ) : (
                <Icon icon="category" size={size * 0.5} className="text-muted" />
            )}
        </div>
    );
};

const IconField = ({ label, value, onChange }) => {
    const fileRef = useRef();
    const [uploading, setUploading] = useState(false);

    const doUpload = async (file) => {
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'menu-category-types');
        try {
            const { data } = await axios.post('/api/ecommerce/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onChange(data.url);
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    return (
        <div>
            <FormLabel>{label}</FormLabel>
            <div className="d-flex gap-2 align-items-start">
                <IconPreview icon={value} size={38} />
                <div className="flex-grow-1">
                    <FormControl
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder="Icon name (e.g. salad) or paste URL"
                        size="sm"
                    />
                    <div className="d-flex gap-1 mt-1">
                        <Button size="sm" variant="outline-secondary" onClick={() => fileRef.current?.click()}
                            disabled={uploading} style={{ fontSize: 11 }}>
                            {uploading ? <Spinner size="sm" /> : <><Icon icon="upload" size={12} className="me-1" />Upload SVG/PNG</>}
                        </Button>
                        {value && (
                            <Button size="sm" variant="outline-danger" onClick={() => onChange('')} style={{ fontSize: 11 }}>
                                <Icon icon="x" size={12} />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            <input ref={fileRef} type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" className="d-none"
                onChange={e => doUpload(e.target.files?.[0])} />
        </div>
    );
};

export default function MenuCategoryTypesPage() {
    const [types, setTypes]           = useState([]);
    const [loading, setLoading]       = useState(true);
    const [showModal, setShowModal]   = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm]             = useState(emptyForm);
    const [saving, setSaving]         = useState(false);
    const [toast, setToast]           = useState(null);
    const [deleteId, setDeleteId]     = useState(null);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/ecommerce/menu-category-types?all=1');
            setTypes(Array.isArray(data) ? data : (data.data || []));
        } catch {
            setTypes([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { if (!showModal) load(); }, [showModal]);

    const openAdd = () => {
        setEditTarget(null);
        setForm({ ...emptyForm, sort_order: types.length });
        setShowModal(true);
    };

    const openEdit = (row) => {
        setEditTarget(row);
        setForm({
            name: row.name || '',
            description: row.description || '',
            icon: row.icon || '',
            hover_icon: row.hover_icon || '',
            sort_order: row.sort_order ?? 0,
            is_active: row.is_active ?? true,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editTarget) {
                await axios.patch(`/api/ecommerce/menu-category-types/${editTarget.id}`, form);
                showToast('Updated!');
            } else {
                await axios.post('/api/ecommerce/menu-category-types', form);
                showToast('Created!');
            }
            setShowModal(false);
        } catch (err) {
            const errs = err.response?.data?.errors;
            showToast(errs ? Object.values(errs).flat().join(' | ') : (err.response?.data?.message || 'Save failed.'), 'danger');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`/api/ecommerce/menu-category-types/${deleteId}`);
            showToast('Deleted');
        } catch {
            showToast('Delete failed', 'danger');
        } finally {
            setDeleteId(null);
            load();
        }
    };

    const toggleActive = async (row) => {
        try {
            await axios.patch(`/api/ecommerce/menu-category-types/${row.id}`, { is_active: !row.is_active });
            if (!showModal) load();
        } catch {
            showToast('Update failed', 'danger');
        }
    };

    const columns = useMemo(() => [
        columnHelper.accessor('name', {
            header: 'Type',
            enableSorting: false,
            cell: ({ row }) => {
                const r = row.original;
                return (
                    <div className="d-flex align-items-center gap-3">
                        <IconPreview icon={r.icon} hoverIcon={r.hover_icon} size={40} />
                        <div>
                            <div className="fw-semibold">{r.name}</div>
                            <small className="text-muted">{r.slug}</small>
                        </div>
                    </div>
                );
            },
        }),
        columnHelper.accessor('icon', {
            header: 'Default Icon',
            enableSorting: false,
            cell: ({ getValue }) => {
                const v = getValue();
                return v ? (
                    isUrl(v)
                        ? <img src={v} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                        : <code className="small">{v}</code>
                ) : <span className="text-muted">—</span>;
            },
        }),
        columnHelper.accessor('hover_icon', {
            header: 'Hover Icon',
            enableSorting: false,
            cell: ({ getValue }) => {
                const v = getValue();
                return v ? (
                    isUrl(v)
                        ? <img src={v} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                        : <code className="small">{v}</code>
                ) : <span className="text-muted">—</span>;
            },
        }),
        columnHelper.accessor('description', {
            header: 'Description',
            enableSorting: false,
            cell: ({ getValue }) => <small className="text-muted">{getValue() || '—'}</small>,
        }),
        columnHelper.accessor('sort_order', {
            header: 'Order',
            enableSorting: false,
            cell: ({ getValue }) => <Badge bg="light" text="dark">{getValue()}</Badge>,
        }),
        columnHelper.accessor('is_active', {
            header: 'Active',
            enableSorting: false,
            cell: ({ row }) => (
                <div className="form-check form-switch mb-0" style={{ cursor: 'pointer' }}
                    onClick={() => toggleActive(row.original)}>
                    <input className="form-check-input" type="checkbox"
                        checked={!!row.original.is_active} onChange={() => {}} style={{ cursor: 'pointer' }} />
                </div>
            ),
        }),
        {
            id: 'actions', header: 'Actions', enableSorting: false,
            cell: ({ row }) => (
                <div className="d-flex gap-1">
                    <Button size="sm" variant="outline-primary" onClick={() => openEdit(row.original)}>
                        <Icon icon="pencil" size={14} />
                    </Button>
                    <Button size="sm" variant="outline-danger" onClick={() => setDeleteId(row.original.id)}>
                        <Icon icon="trash" size={14} />
                    </Button>
                </div>
            ),
        },
    ], [types]);

    const table = useReactTable({ data: types, columns, getCoreRowModel: getCoreRowModel() });

    return (
        <>
            <PageBreadcrumb title="Menu Category Types" subtitle="Ecommerce" />

            {toast && (
                <Alert variant={toast.type} className="position-fixed top-0 end-0 m-3 shadow" style={{ zIndex: 9999, minWidth: 260 }}>
                    {toast.msg}
                </Alert>
            )}

            <Card>
                <CardHeader className="d-flex align-items-center justify-content-between">
                    <h5 className="card-title mb-0">Menu Category Types</h5>
                    <Button variant="primary" onClick={openAdd}>
                        <Icon icon="plus" size={15} className="me-1" />Add Type
                    </Button>
                </CardHeader>

                <CardBody className="p-0">
                    {loading
                        ? <div className="text-center py-5"><Spinner /></div>
                        : <DataTable table={table} emptyMessage="No types yet." />
                    }
                </CardBody>
            </Card>

            {/* Add / Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <Icon icon={editTarget ? 'pencil' : 'plus'} size={16} className="me-2" />
                        {editTarget ? `Edit: ${editTarget.name}` : 'Add Menu Category Type'}
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Row className="g-3">
                        <Col xs={12}>
                            <FormLabel>Name <span className="text-danger">*</span></FormLabel>
                            <FormControl value={form.name} onChange={e => set('name', e.target.value)}
                                placeholder="e.g. Appetizers, Beef, Vegan" />
                        </Col>

                        <Col xs={12}>
                            <FormLabel>Description</FormLabel>
                            <FormControl as="textarea" rows={2} value={form.description}
                                onChange={e => set('description', e.target.value)} placeholder="Optional" />
                        </Col>

                        <Col md={6}>
                            <IconField label="Default Icon" value={form.icon} onChange={v => set('icon', v)} />
                        </Col>

                        <Col md={6}>
                            <IconField label="Hover Icon (optional)" value={form.hover_icon} onChange={v => set('hover_icon', v)} />
                        </Col>

                        {/* Live preview */}
                        <Col xs={12}>
                            <div className="d-flex align-items-center gap-3 p-3 rounded border bg-light">
                                <IconPreview icon={form.icon} hoverIcon={form.hover_icon} size={52} />
                                <div>
                                    <div className="fw-semibold">{form.name || <span className="text-muted">Type Name</span>}</div>
                                    <small className="text-muted">
                                        {form.hover_icon ? 'Hover over icon to preview hover state' : 'No hover icon set'}
                                    </small>
                                </div>
                            </div>
                        </Col>

                        <Col xs={6}>
                            <FormLabel>Sort Order</FormLabel>
                            <FormControl type="number" min="0" value={form.sort_order}
                                onChange={e => set('sort_order', parseInt(e.target.value) || 0)} />
                        </Col>

                        <Col xs={6} className="d-flex flex-column justify-content-end pb-1">
                            <Form.Check type="switch" label="Active"
                                checked={!!form.is_active} onChange={e => set('is_active', e.target.checked)} />
                        </Col>
                    </Row>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave} disabled={saving || !form.name}>
                        {saving && <Spinner size="sm" className="me-1" />}
                        {editTarget ? 'Update' : 'Create'}
                    </Button>
                </Modal.Footer>
            </Modal>

            <DeleteConfirmationModal show={!!deleteId} onHide={() => setDeleteId(null)}
                onConfirm={handleDelete} itemName="menu category type" />
        </>
    );
}
