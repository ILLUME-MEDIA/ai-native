import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import MediaUpload from '../../_components/MediaUpload';
import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import {
    Alert, Card, CardBody, CardHeader, Col,
    Form, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
    Row, Spinner,
} from 'react-bootstrap';

const api = (path, opts = {}) => axios({ url: `/api/ecommerce/${path}`, ...opts });

export default function MenuItemsPage() {
    const [items, setItems]           = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [menuCats, setMenuCats]     = useState([]);
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
        business_id: '', menu_category_id: '', name: '', description: '',
        price: '', image: '', is_available: true, sort_order: 0,
    });

    const loadItems = useCallback(async (pg = 1) => {
        setLoading(true);
        const params = new URLSearchParams({ page: pg });
        if (bizFilter) params.append('business_id', bizFilter);
        if (catFilter) params.append('category_id', catFilter);
        const { data } = await api(`menu-items?${params}`);
        setItems(data.data);
        setMeta({ total: data.total, lastPage: data.last_page, currentPage: data.current_page });
        setPage(pg);
        setLoading(false);
    }, [bizFilter, catFilter]);

    const loadBusinesses = useCallback(async () => {
        const { data } = await api('businesses?active_only=1');
        setBusinesses(data.data || data);
    }, []);

    useEffect(() => { loadBusinesses(); }, [loadBusinesses]);
    useEffect(() => { loadItems(1); }, [loadItems]);

    const loadMenuCats = async (bizId) => {
        if (!bizId) { setMenuCats([]); return; }
        const { data } = await api(`businesses/${bizId}/menu-categories`);
        setMenuCats(data);
    };

    const openAdd = () => {
        setForm({ business_id: '', menu_category_id: '', name: '', description: '', price: '', image: '', is_available: true, sort_order: 0 });
        setMenuCats([]); setError(''); setEditTarget(null); setShowModal(true);
    };
    const openEdit = (item) => {
        setForm({
            business_id: String(item.business_id || ''),
            menu_category_id: String(item.menu_category_id || ''),
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
            if (!editTarget) {
                await api(`businesses/${form.business_id}/menu-items`, { method: 'post', data: payload });
            } else {
                await api(`businesses/${editTarget.business_id}/menu-items/${editTarget.id}`, { method: 'patch', data: payload });
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

    return (
        <>
            <PageBreadcrumb title="Menu Items / Products" subtitle="Ecommerce" />

            <Card>
                <CardHeader className="border-light">
                    <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                        <h5 className="card-title mb-0">Menu Items</h5>
                        <div className="d-flex gap-2 flex-wrap">
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
                            <button className="btn btn-primary btn-sm" onClick={openAdd}>
                                <Icon icon="plus" className="me-1" /> Add Item
                            </button>
                        </div>
                    </div>
                </CardHeader>

                {loading ? (
                    <CardBody className="text-center py-5"><Spinner animation="border" size="sm" className="text-primary" /></CardBody>
                ) : items.length === 0 ? (
                    <CardBody className="text-center text-muted py-5">No menu items yet.</CardBody>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr><th>Item</th><th>Business</th><th>Category</th><th>Price</th><th>Available</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                {item.image
                                                    ? <img src={item.image} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                                                    : <div style={{ width: 40, height: 40, background: '#f1f3f5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon icon="photo" className="text-muted" /></div>}
                                                <div>
                                                    <strong>{item.name}</strong>
                                                    {item.description && <small className="text-muted d-block" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</small>}
                                                </div>
                                            </div>
                                        </td>
                                        <td><small>{item.business?.name ?? `#${item.business_id}`}</small></td>
                                        <td><small className="text-muted">{item.menu_category?.name || '—'}</small></td>
                                        <td><strong className="text-success">${parseFloat(item.price).toFixed(2)}</strong></td>
                                        <td>
                                            <Form.Check type="switch" checked={!!item.is_available} onChange={() => toggleAvail(item)}
                                                label={<small className={item.is_available ? 'text-success' : 'text-muted'}>{item.is_available ? 'Yes' : 'No'}</small>} />
                                        </td>
                                        <td>
                                            <div className="d-flex gap-1">
                                                <button className="btn btn-default btn-sm btn-icon" onClick={() => openEdit(item)}><Icon icon="edit" className="fs-lg" /></button>
                                                <button className="btn btn-default btn-sm btn-icon" onClick={() => del(item)}><Icon icon="trash" className="fs-lg text-danger" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {meta && meta.lastPage > 1 && (
                    <CardBody className="d-flex justify-content-between align-items-center pt-3">
                        <small className="text-muted">Page {meta.currentPage} of {meta.lastPage} ({meta.total} items)</small>
                        <div className="d-flex gap-1">
                            <button className="btn btn-light btn-sm" disabled={meta.currentPage <= 1} onClick={() => loadItems(meta.currentPage - 1)}>‹ Prev</button>
                            <button className="btn btn-light btn-sm" disabled={meta.currentPage >= meta.lastPage} onClick={() => loadItems(meta.currentPage + 1)}>Next ›</button>
                        </div>
                    </CardBody>
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
                                    required disabled={!!editTarget}>
                                    <option value="">— Select Business —</option>
                                    {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
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
