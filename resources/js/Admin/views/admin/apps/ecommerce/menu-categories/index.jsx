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

export default function MenuCategoriesPage() {
    const [businesses, setBusinesses] = useState([]);
    const [businessId, setBusinessId]   = useState('');
    const [categories, setCategories]   = useState([]);
    const [loading, setLoading]         = useState(true);
    const [showModal, setShowModal]     = useState(false);
    const [editTarget, setEditTarget]   = useState(null);
    const [saving, setSaving]           = useState(false);
    const [error, setError]             = useState('');
    const [form, setForm]               = useState({ name: '', description: '', sort_order: 0, is_active: true });

    const loadBusinesses = useCallback(async () => {
        try {
            const { data } = await api('businesses?per_page=500');
            setBusinesses(Array.isArray(data) ? data : (data.data || []));
        } catch (e) {
            setBusinesses([]);
        }
    }, []);

    const loadCategories = useCallback(async () => {
        if (!businessId) { setCategories([]); setLoading(false); return; }
        setLoading(true);
        try {
            const { data } = await api(`businesses/${businessId}/menu-categories`);
            setCategories(Array.isArray(data) ? data : []);
        } catch (e) {
            setCategories([]);
        }
        setLoading(false);
    }, [businessId]);

    useEffect(() => { loadBusinesses(); }, [loadBusinesses]);
    useEffect(() => { loadCategories(); }, [loadCategories]);

    const openAdd = () => {
        setForm({ name: '', description: '', sort_order: categories.length, is_active: true });
        setError(''); setEditTarget(null); setShowModal(true);
    };

    const openEdit = (cat) => {
        setForm({
            name: cat.name || '',
            description: cat.description || '',
            sort_order: cat.sort_order ?? 0,
            is_active: cat.is_active ?? true,
        });
        setError(''); setEditTarget(cat); setShowModal(true);
    };

    const save = async (e) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            if (!editTarget) {
                await api(`businesses/${businessId}/menu-categories`, { method: 'post', data: form });
            } else {
                await api(`businesses/${businessId}/menu-categories/${editTarget.id}`, { method: 'patch', data: form });
            }
            setShowModal(false);
            loadCategories();
        } catch (err) {
            const errs = err.response?.data?.errors;
            setError(errs ? Object.values(errs).flat().join(' | ') : (err.response?.data?.message || 'Save failed.'));
        } finally { setSaving(false); }
    };

    const toggleActive = async (cat) => {
        try {
            await api(`businesses/${businessId}/menu-categories/${cat.id}`, { method: 'patch', data: { is_active: !cat.is_active } });
            loadCategories();
        } catch (e) { setError(e.response?.data?.message || 'Update failed'); }
    };

    const del = async (cat) => {
        if (!confirm(`Delete "${cat.name}"? Menu items in this category will have no category.`)) return;
        try {
            await api(`businesses/${businessId}/menu-categories/${cat.id}`, { method: 'delete' });
            loadCategories();
        } catch (e) { setError(e.response?.data?.message || 'Delete failed'); }
    };

    const columns = useMemo(() => [
        columnHelper.accessor('name', {
            header: 'Category',
            cell: ({ row }) => (
                <div>
                    <strong>{row.original.name}</strong>
                    {row.original.description && <small className="text-muted d-block">{row.original.description}</small>}
                </div>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('menu_items_count', {
            header: 'Items',
            cell: ({ row }) => <span className="badge bg-light text-dark">{row.original.menu_items_count ?? 0}</span>,
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
    ], [businessId]);

    const table = useReactTable({
        data: categories,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const selectedBusiness = businesses.find(b => String(b.id) === String(businessId));

    return (
        <>
            <PageBreadcrumb title="Menu Categories" subtitle="Ecommerce" />
            <p className="text-muted mb-3">
                Select a restaurant/business to manage its menu categories (e.g. Starters, Main Course, Drinks). These categories appear when adding or editing menu items in <strong>Products</strong>.
            </p>

            <Card>
                <CardHeader className="border-light">
                    <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                            <Form.Select
                                size="sm"
                                style={{ width: 280 }}
                                value={businessId}
                                onChange={e => setBusinessId(e.target.value)}
                            >
                                <option value="">— Select Business —</option>
                                {businesses.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </Form.Select>
                            {selectedBusiness && (
                                <span className="text-muted small">Manage categories for this business</span>
                            )}
                        </div>
                        {businessId && (
                            <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
                                <Icon icon="plus" className="me-1" /> Add Category
                            </button>
                        )}
                    </div>
                </CardHeader>

                <CardBody className="p-0" style={{ position: 'relative', minHeight: 120 }}>
                    {!businessId ? (
                        <div className="text-center text-muted py-5">Select a business to view and manage its menu categories.</div>
                    ) : loading ? (
                        <div className="d-flex align-items-center justify-content-center py-5">
                            <Spinner animation="border" size="sm" className="text-primary" />
                        </div>
                    ) : (
                        <DataTable table={table} emptyMessage="No menu categories yet. Click Add Category to create (e.g. Starters, Main Course, Drinks)." />
                    )}
                </CardBody>
            </Card>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <ModalHeader closeButton>
                    <ModalTitle as="h5">{editTarget ? `Edit: ${editTarget.name}` : 'Add Menu Category'}</ModalTitle>
                </ModalHeader>
                <Form onSubmit={save}>
                    <ModalBody>
                        {error && <Alert variant="danger" className="py-2 mb-3">{error}</Alert>}
                        <Row className="g-3">
                            <Col xs={12}>
                                <Form.Label>Name <span className="text-danger">*</span></Form.Label>
                                <Form.Control value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Starters, Main Course" required />
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
                                <Form.Check type="switch" id="catActive" label="Active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
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
