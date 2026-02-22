import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import MediaUpload from '../../_components/MediaUpload';
import axios from 'axios';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Alert, Card, CardBody, CardFooter, CardHeader, Col,
    Form, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
    Row, Spinner,
} from 'react-bootstrap';
import { Link } from 'react-router';
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Button } from 'react-bootstrap';

const api = (path, opts = {}) => axios({ url: `/api/ecommerce/${path}`, ...opts });

const columnHelper = createColumnHelper();

export default function MenuItemsPage() {
    const [items, setItems]             = useState([]);
    const [businesses, setBusinesses]   = useState([]);
    const [menuCats, setMenuCats]       = useState([]);
    const [menuCategoryTypes, setMenuCategoryTypes] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [showModal, setShowModal]   = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving]         = useState(false);
    const [error, setError]           = useState('');
    const [bizFilter, setBizFilter]   = useState('');
    const [catFilter, setCatFilter]   = useState('');
    const [meta, setMeta]             = useState(null);
    const [page, setPage]             = useState(1);

    const [form, setForm] = useState({
        business_id: '', menu_category_id: '', menu_category_type_id: '', name: '', description: '',
        price: '', image: '', is_available: true, sort_order: 0,
    });

    const loadItems = useCallback(async (pg = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: pg, per_page: 20 });
            if (bizFilter) params.append('business_id', bizFilter);
            if (catFilter) params.append('category_id', catFilter);
            const { data } = await api(`menu-items?${params}`);
            const list = Array.isArray(data) ? data : (data.data || []);
            setItems(list);
            setMeta(data?.total != null ? { total: data.total, lastPage: data.last_page ?? 1, currentPage: data.current_page ?? 1 } : null);
        } catch (e) {
            setItems([]);
            setMeta(null);
        }
        setPage(pg);
        setLoading(false);
    }, [bizFilter, catFilter]);

    const loadBusinesses = useCallback(async () => {
        try {
            const { data } = await api('businesses?per_page=500');
            const list = Array.isArray(data) ? data : (data.data || []);
            setBusinesses(list);
        } catch (e) {
            setBusinesses([]);
        }
    }, []);

    const loadMenuCategoryTypes = useCallback(async () => {
        try {
            const { data } = await api('menu-category-types?all=1&active_only=1');
            setMenuCategoryTypes(Array.isArray(data) ? data : (data.data || []));
        } catch (e) {
            setMenuCategoryTypes([]);
        }
    }, []);

    useEffect(() => { loadBusinesses(); }, [loadBusinesses]);
    useEffect(() => { loadMenuCategoryTypes(); }, [loadMenuCategoryTypes]);
    useEffect(() => { loadItems(1); }, [loadItems]);
    useEffect(() => {
        if (bizFilter) loadMenuCats(bizFilter);
        else setMenuCats([]);
    }, [bizFilter]);

    const loadMenuCats = async (bizId) => {
        if (!bizId) { setMenuCats([]); return; }
        const { data } = await api(`businesses/${bizId}/menu-categories`);
        setMenuCats(data);
    };

    const openAdd = () => {
        setForm({ business_id: '', menu_category_id: '', menu_category_type_id: '', name: '', description: '', price: '', image: '', is_available: true, sort_order: 0 });
        setMenuCats([]); setError(''); setEditTarget(null); setShowModal(true);
    };
    const openEdit = (item) => {
        setForm({
            business_id: String(item.business_id || ''),
            menu_category_id: String(item.menu_category_id || ''),
            menu_category_type_id: String(item.menu_category_type_id || ''),
            name: item.name, description: item.description || '',
            price: item.price, image: item.image || '',
            is_available: item.is_available, sort_order: item.sort_order || 0,
        });
        loadMenuCats(item.business_id);
        setError(''); setEditTarget(item); setShowModal(true);
    };

    const save = async (e) => {
        e.preventDefault(); setSaving(true); setError('');
        try {
            const payload = { ...form, price: parseFloat(form.price) || 0, sort_order: parseInt(form.sort_order) || 0 };
            if (!payload.menu_category_id) delete payload.menu_category_id;
            if (!payload.menu_category_type_id) delete payload.menu_category_type_id;
            if (!editTarget) {
                await api(`businesses/${form.business_id}/menu-items`, { method: 'post', data: payload });
            } else {
                const bizId = editTarget.business_id;
                await api(`businesses/${bizId}/menu-items/${editTarget.id}`, { method: 'patch', data: payload });
            }
            setShowModal(false); loadItems(page);
        } catch (err) {
            const errs = err.response?.data?.errors;
            setError(errs ? Object.values(errs).flat().join(' | ') : (err.response?.data?.message || 'Save failed.'));
        } finally { setSaving(false); }
    };

    const toggleAvail = async (item) => {
        await api(`businesses/${item.business_id}/menu-items/${item.id}`, { method: 'patch', data: { is_available: !item.is_available } });
        loadItems(page);
    };
    const del = async (item) => {
        if (!confirm(`Delete "${item.name}"?`)) return;
        await api(`businesses/${item.business_id}/menu-items/${item.id}`, { method: 'delete' });
        loadItems(page);
    };

    const columns = useMemo(() => [
        columnHelper.accessor(row => row.name, {
            id: 'item',
            header: 'Item',
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="d-flex align-items-center gap-2">
                        {item.image
                            ? <img src={item.image} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                            : <div style={{ width: 40, height: 40, background: '#f1f3f5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon icon="photo" className="text-muted" /></div>}
                        <div>
                            <strong>{item.name}</strong>
                            {item.description && <small className="text-muted d-block" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</small>}
                        </div>
                    </div>
                );
            },
            enableSorting: false,
        }),
        columnHelper.accessor(row => row.business?.name ?? row.business_id, {
            id: 'business',
            header: 'Business',
            cell: ({ row }) => <small>{row.original.business?.name ?? `#${row.original.business_id}`}</small>,
            enableSorting: false,
        }),
        columnHelper.accessor(row => row.menu_category?.name, {
            id: 'category',
            header: 'Category',
            cell: ({ row }) => <small className="text-muted">{row.original.menu_category?.name || '—'}</small>,
            enableSorting: false,
        }),
        columnHelper.accessor(row => row.menu_category_type?.name, {
            id: 'type',
            header: 'Type',
            cell: ({ row }) => <small className="text-muted">{row.original.menu_category_type?.name || '—'}</small>,
            enableSorting: false,
        }),
        columnHelper.accessor(row => row.price, {
            id: 'price',
            header: 'Price',
            cell: ({ row }) => <strong className="text-success">${parseFloat(row.original.price).toFixed(2)}</strong>,
            enableSorting: false,
        }),
        columnHelper.accessor(row => row.is_available, {
            id: 'available',
            header: 'Available',
            cell: ({ row }) => (
                <Form.Check
                    type="switch"
                    checked={!!row.original.is_available}
                    onChange={() => toggleAvail(row.original)}
                    label={<small className={row.original.is_available ? 'text-success' : 'text-muted'}>{row.original.is_available ? 'Yes' : 'No'}</small>}
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
        data: items,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const totalItems = meta?.total ?? 0;
    const totalPages = meta?.lastPage ?? 1;
    const currentPage = meta?.currentPage ?? 1;
    const pageSize = 20;
    const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);

    return (
        <>
            <PageBreadcrumb title="Menu Items / Products" subtitle="Ecommerce" />

            <Card>
                <CardHeader className="border-light">
                    <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                        <h5 className="card-title mb-0">Menu Items</h5>
                        <div className="d-flex gap-2 flex-wrap align-items-center">
                            <Form.Select size="sm" style={{ width: 180 }} value={bizFilter} onChange={e => { setBizFilter(e.target.value); setCatFilter(''); }}>
                                <option value="">All Businesses</option>
                                {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </Form.Select>
                            {bizFilter && (
                                <Form.Select size="sm" style={{ width: 160 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                                    <option value="">All Categories</option>
                                    {menuCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </Form.Select>
                            )}
                            <Button variant="outline-secondary" size="sm" as={Link} to="/apps/ecommerce/menu-categories">
                                <Icon icon="tags" className="me-1" /> Menu Categories
                            </Button>
                            <Button variant="outline-secondary" size="sm" as={Link} to="/apps/ecommerce/menu-category-types">
                                <Icon icon="circle" className="me-1" /> Menu Types
                            </Button>
                            <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
                                <Icon icon="plus" className="me-1" /> Add Item
                            </button>
                        </div>
                    </div>
                </CardHeader>

                <CardBody className="p-0" style={{ position: 'relative', minHeight: 120 }}>
                    {loading && (
                        <div style={{
                            position: 'absolute', inset: 0, zIndex: 10,
                            background: 'rgba(255,255,255,0.65)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Spinner />
                        </div>
                    )}
                    <DataTable table={table} emptyMessage={loading ? '' : 'No menu items yet.'} />
                </CardBody>

                {meta && totalPages > 1 && (
                    <CardFooter className="border-0">
                        <TablePagination
                            totalItems={totalItems}
                            start={start}
                            end={end}
                            itemsName="items"
                            showInfo
                            previousPage={() => loadItems(page - 1)}
                            canPreviousPage={page > 1}
                            pageCount={totalPages}
                            pageIndex={page - 1}
                            setPageIndex={(idx) => loadItems(idx + 1)}
                            nextPage={() => loadItems(page + 1)}
                            canNextPage={page < totalPages}
                        />
                    </CardFooter>
                )}
            </Card>

            {/* Add/Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <ModalHeader closeButton>
                    <ModalTitle as="h5">{editTarget ? `Edit: ${editTarget.name}` : 'Add Menu Item'}</ModalTitle>
                </ModalHeader>
                <Form onSubmit={save}>
                    <ModalBody>
                        {error && <Alert variant="danger" className="py-2 mb-3">{error}</Alert>}
                        <Row className="g-3">
                            <Col xs={12}>
                                <Form.Label>Business <span className="text-danger">*</span></Form.Label>
                                <Form.Select value={form.business_id}
                                    onChange={e => { setForm(f => ({ ...f, business_id: e.target.value, menu_category_id: '' })); loadMenuCats(e.target.value); }}
                                    required>
                                    <option value="">— Select Business —</option>
                                    {(() => {
                                        const list = [...businesses];
                                        if (editTarget?.business && !list.some(b => Number(b.id) === Number(editTarget.business_id))) {
                                            list.unshift(editTarget.business);
                                        }
                                        return list.map(b => <option key={b.id} value={b.id}>{b.name}</option>);
                                    })()}
                                </Form.Select>
                            </Col>
                            {menuCats.length > 0 && (
                                <Col xs={12}>
                                    <Form.Label>Menu Category</Form.Label>
                                    <Form.Select value={form.menu_category_id} onChange={e => setForm(f => ({ ...f, menu_category_id: e.target.value }))}>
                                        <option value="">— None —</option>
                                        {menuCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </Form.Select>
                                </Col>
                            )}
                            <Col xs={12}>
                                <Form.Label>Menu Type (e.g. Kids, Vegetarian)</Form.Label>
                                <Form.Select value={form.menu_category_type_id} onChange={e => setForm(f => ({ ...f, menu_category_type_id: e.target.value }))}>
                                    <option value="">— None —</option>
                                    {menuCategoryTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </Form.Select>
                            </Col>
                            <Col xs={12}>
                                <Form.Label>Item Name <span className="text-danger">*</span></Form.Label>
                                <Form.Control value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Chicken Burger" required />
                            </Col>
                            <Col xs={6}>
                                <Form.Label>Price <span className="text-danger">*</span></Form.Label>
                                <Form.Control type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" required />
                            </Col>
                            <Col xs={6}>
                                <Form.Label>Sort Order</Form.Label>
                                <Form.Control type="number" min="0" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
                            </Col>
                            <Col xs={12}>
                                <Form.Label>Description</Form.Label>
                                <Form.Control as="textarea" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </Col>
                            <Col xs={12}>
                                <MediaUpload
                                    label="Image"
                                    value={form.image}
                                    onChange={url => setForm(f => ({ ...f, image: url }))}
                                    folder="menu-items"
                                />
                            </Col>
                            <Col xs={12}>
                                <Form.Check type="switch" id="itemAvail" label="Available" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} />
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving || !form.name || !form.business_id}>
                            {saving ? <><Spinner animation="border" size="sm" className="me-1" />Saving…</> : 'Save Item'}
                        </button>
                    </ModalFooter>
                </Form>
            </Modal>
        </>
    );
}
