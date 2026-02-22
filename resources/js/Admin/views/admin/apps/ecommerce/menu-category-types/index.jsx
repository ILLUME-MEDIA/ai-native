import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import DataTable from '@admin/components/table/DataTable';
import axios from 'axios';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import {
    Alert, Card, CardBody, CardHeader, Col, Form, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
    Row, Spinner,
} from 'react-bootstrap';

const api = (path, opts = {}) => axios({ url: `/api/ecommerce/${path}`, ...opts });
const columnHelper = createColumnHelper();

export default function MenuCategoryTypesPage() {
    const [types, setTypes]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState('');
    const [form, setForm]         = useState({ name: '', description: '', sort_order: 0, is_active: true });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api('menu-category-types?all=1');
            setTypes(Array.isArray(data) ? data : (data.data || []));
        } catch (e) {
            setTypes([]);
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setForm({ name: '', description: '', sort_order: types.length, is_active: true });
        setError(''); setEditTarget(null); setShowModal(true);
    };

    const openEdit = (row) => {
        setForm({
            name: row.name || '',
            description: row.description || '',
            sort_order: row.sort_order ?? 0,
            is_active: row.is_active ?? true,
        });
        setError(''); setEditTarget(row); setShowModal(true);
    };

    const save = async (e) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            if (!editTarget) {
                await api('menu-category-types', { method: 'post', data: form });
            } else {
                await api(`menu-category-types/${editTarget.id}`, { method: 'patch', data: form });
            }
            setShowModal(false);
            load();
        } catch (err) {
            const errs = err.response?.data?.errors;
            setError(errs ? Object.values(errs).flat().join(' | ') : (err.response?.data?.message || 'Save failed.'));
        } finally { setSaving(false); }
    };

    const toggleActive = async (row) => {
        try {
            await api(`menu-category-types/${row.id}`, { method: 'patch', data: { is_active: !row.is_active } });
            load();
        } catch (e) { setError(e.response?.data?.message || 'Update failed'); }
    };

    const del = async (row) => {
        if (!confirm(`Delete "${row.name}"?`)) return;
        try {
            await api(`menu-category-types/${row.id}`, { method: 'delete' });
            load();
        } catch (e) { setError(e.response?.data?.message || 'Delete failed'); }
    };

    const columns = useMemo(() => [
        columnHelper.accessor('name', {
            header: 'Type',
            cell: ({ row }) => (
                <div>
                    <strong>{row.original.name}</strong>
                    {row.original.description && <small className="text-muted d-block">{row.original.description}</small>}
                </div>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('slug', {
            header: 'Slug',
            cell: ({ row }) => <small className="text-muted">{row.original.slug}</small>,
            enableSorting: false,
        }),
        columnHelper.accessor('sort_order', {
            header: 'Sort',
            cell: ({ row }) => <small className="text-muted">{row.original.sort_order ?? 0}</small>,
            enableSorting: false,
        }),
        columnHelper.accessor('is_active', {
            header: 'Active',
            cell: ({ row }) => (
                <Form.Check
                    type="switch"
                    checked={!!row.original.is_active}
                    onChange={() => toggleActive(row.original)}
                    label={<small className={row.original.is_active ? 'text-success' : 'text-muted'}>{row.original.is_active ? 'Yes' : 'No'}</small>}
                />
            ),
            enableSorting: false,
        }),
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="d-flex gap-1">
                    <button type="button" className="btn btn-default btn-sm btn-icon" onClick={() => openEdit(row.original)}><Icon icon="edit" className="fs-lg" /></button>
                    <button type="button" className="btn btn-default btn-sm btn-icon" onClick={() => del(row.original)}><Icon icon="trash" className="fs-lg text-danger" /></button>
                </div>
            ),
            enableSorting: false,
        },
    ], []);

    const table = useReactTable({
        data: types,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <>
            <PageBreadcrumb title="Menu Category Types" subtitle="Ecommerce" />
            <p className="text-muted mb-3">
                Global types for menu items (e.g. Kids Cuisine, Vegetarian, Halal). Assign one to each product in <strong>Products</strong>.
            </p>

            <Card>
                <CardHeader className="border-light d-flex justify-content-between">
                    <h5 className="card-title mb-0">Menu Category Types</h5>
                    <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
                        <Icon icon="plus" className="me-1" /> Add Type
                    </button>
                </CardHeader>

                <CardBody className="p-0" style={{ minHeight: 120 }}>
                    {loading ? (
                        <div className="d-flex align-items-center justify-content-center py-5">
                            <Spinner animation="border" size="sm" className="text-primary" />
                        </div>
                    ) : (
                        <DataTable table={table} emptyMessage="No types yet. Add Kids Cuisine, Vegetarian, etc." />
                    )}
                </CardBody>
            </Card>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <ModalHeader closeButton>
                    <ModalTitle as="h5">{editTarget ? `Edit: ${editTarget.name}` : 'Add Menu Category Type'}</ModalTitle>
                </ModalHeader>
                <Form onSubmit={save}>
                    <ModalBody>
                        {error && <Alert variant="danger" className="py-2 mb-3">{error}</Alert>}
                        <Row className="g-3">
                            <Col xs={12}>
                                <Form.Label>Name <span className="text-danger">*</span></Form.Label>
                                <Form.Control value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kids Cuisine, Vegetarian" required />
                            </Col>
                            <Col xs={12}>
                                <Form.Label>Description</Form.Label>
                                <Form.Control as="textarea" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
                            </Col>
                            <Col xs={6}>
                                <Form.Label>Sort Order</Form.Label>
                                <Form.Control type="number" min="0" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
                            </Col>
                            <Col xs={12}>
                                <Form.Check type="switch" id="typeActive" label="Active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving || !form.name}>
                            {saving ? <><Spinner animation="border" size="sm" className="me-1" />Saving…</> : 'Save'}
                        </button>
                    </ModalFooter>
                </Form>
            </Modal>
        </>
    );
}
