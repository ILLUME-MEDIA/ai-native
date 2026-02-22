import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useState, useEffect, useCallback, useRef } from 'react';

const COMMON_ICONS = [
    // Food & Restaurant
    'tools-kitchen-2','tools-kitchen','salad','burger','pizza','coffee','cup','bottle',
    'fish','meat','soup','cake','ice-cream','bread','carrot','egg','milk','cheese',
    'apple','candy','bowl-chopsticks','grill','lemon','mushroom','cookie',
    // Shopping & Store
    'building-store','shopping-cart','shopping-bag','basket','package','tag',
    'barcode','receipt','cash','credit-card','coin','wallet','gift','box',
    'truck-delivery','shirt','hanger','diamond','crown',
    // Services
    'briefcase','tool','tools','hammer','scissors','paint','brush','phone',
    'headset','heart','star','shield','lock','key','sparkles','wand',
    'clock','calendar','map-pin','navigation',
    // General
    'home','building','car','plane','train','bike','camera','music','movie',
    'device-tv','device-laptop','device-mobile','books','school','barbell','swimming',
    'ball-football','beach','trees','flower','paw','baby-carriage','user','users',
    'chart-bar','chart-line','bell','info-circle','help','settings','world',
    'sun','moon','cloud','umbrella','bolt','flame','droplet','leaf',
];
import { Link } from 'react-router';
import {
    Alert, Badge, Button, Card, CardBody, CardHeader, Col,
    Form, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
    Row, Spinner,
} from 'react-bootstrap';

const api = (path, opts = {}) => axios({ url: `/api/ecommerce/${path}`, ...opts });

const TYPE_BADGE = {
    restaurant: 'bg-danger-subtle text-danger',
    store:      'bg-success-subtle text-success',
    service:    'bg-info-subtle text-info',
};
const TYPES = [
    { value: 'restaurant', label: 'Restaurant', icon: 'tools-kitchen-2' },
    { value: 'store',      label: 'Store',      icon: 'building-store' },
    { value: 'service',    label: 'Service',    icon: 'briefcase' },
];

export default function CategoriesPage() {
    const [cats, setCats]             = useState([]);
    const [loading, setLoading]       = useState(true);
    const [showModal, setShowModal]   = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving]         = useState(false);
    const [error, setError]           = useState('');
    const [form, setForm] = useState({ name: '', type: 'restaurant', icon: '', description: '', is_active: true, sort_order: 0 });
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [iconSearch, setIconSearch]         = useState('');
    const iconPickerRef = useRef(null);

    // Close picker on outside click
    useEffect(() => {
        const handler = (e) => {
            if (iconPickerRef.current && !iconPickerRef.current.contains(e.target)) {
                setShowIconPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filteredIcons = iconSearch.trim()
        ? COMMON_ICONS.filter(ic => ic.includes(iconSearch.toLowerCase().trim()))
        : COMMON_ICONS;

    const load = useCallback(async () => {
        setLoading(true);
        const { data } = await api('categories');
        setCats(data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setForm({ name: '', type: 'restaurant', icon: '', description: '', is_active: true, sort_order: 0 });
        setError(''); setEditTarget(null); setShowModal(true); setShowIconPicker(false); setIconSearch('');
    };
    const openEdit = (c) => {
        setForm({ name: c.name, type: c.type, icon: c.icon || '', description: c.description || '', is_active: c.is_active, sort_order: c.sort_order || 0 });
        setError(''); setEditTarget(c); setShowModal(true); setShowIconPicker(false); setIconSearch('');
    };
    const save = async (e) => {
        e.preventDefault(); setSaving(true); setError('');
        try {
            if (!editTarget) await api('categories', { method: 'post', data: form });
            else             await api(`categories/${editTarget.id}`, { method: 'patch', data: form });
            setShowModal(false); load();
        } catch (err) {
            const errs = err.response?.data?.errors;
            setError(errs ? Object.values(errs).flat().join(' | ') : (err.response?.data?.message || 'Save failed.'));
        } finally { setSaving(false); }
    };
    const toggle = async (cat) => {
        await api(`categories/${cat.id}`, { method: 'patch', data: { is_active: !cat.is_active } });
        load();
    };
    const del = async (cat) => {
        if (!confirm(`Delete "${cat.name}"?`)) return;
        await api(`categories/${cat.id}`, { method: 'delete' });
        load();
    };

    const stats = [
        { label: 'Total',       value: cats.length,                                          color: 'text-primary', icon: 'layout-grid'   },
        { label: 'Restaurants', value: cats.filter(c => c.type === 'restaurant').length,     color: 'text-danger',  icon: 'tools-kitchen' },
        { label: 'Stores',      value: cats.filter(c => c.type === 'store').length,          color: 'text-success', icon: 'shopping-cart' },
        { label: 'Active',      value: cats.filter(c => c.is_active).length,                 color: 'text-warning', icon: 'circle-check'  },
    ];

    return (
        <>
            <PageBreadcrumb title="Business Categories" subtitle="Ecommerce" />

            <Row className="g-3 mb-4">
                {stats.map(({ label, value, color, icon }) => (
                    <Col key={label} xs={6} md={3}>
                        <Card><CardBody className="d-flex align-items-center gap-3 p-3">
                            <span className={`avatar avatar-sm rounded d-flex align-items-center justify-content-center bg-light ${color}`}>
                                <Icon icon={icon} className="fs-xl" />
                            </span>
                            <div><h5 className={`mb-0 fw-bold ${color}`}>{value}</h5><small className="text-muted">{label}</small></div>
                        </CardBody></Card>
                    </Col>
                ))}
            </Row>

            <Card>
                <CardHeader className="border-light justify-content-between">
                    <h5 className="card-title mb-0">Business Categories</h5>
                    <div className="d-flex gap-2">
                        <Link to="/apps/ecommerce/muzzhub-categories">
                            <Button variant="outline-secondary" size="sm">
                                <Icon icon="tags" className="me-1" /> Muzzhub Categories
                            </Button>
                        </Link>
                        <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
                            <Icon icon="plus" className="me-1" /> Add Category
                        </button>
                    </div>
                </CardHeader>
                {loading ? (
                    <CardBody className="text-center py-5"><Spinner animation="border" size="sm" className="text-primary" /></CardBody>
                ) : cats.length === 0 ? (
                    <CardBody className="text-center text-muted py-5">No categories yet.</CardBody>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr><th>Category</th><th>Type</th><th>Businesses</th><th>Status</th><th>Sort</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {cats.map(cat => (
                                    <tr key={cat.id}>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                <Icon icon={cat.icon || 'package'} style={{ fontSize: 22 }} />
                                                <div>
                                                    <strong>{cat.name}</strong>
                                                    {cat.description && <small className="text-muted d-block">{cat.description}</small>}
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className={`badge ${TYPE_BADGE[cat.type] || 'bg-secondary-subtle text-secondary'}`}>{TYPES.find(t => t.value === cat.type)?.label || cat.type}</span></td>
                                        <td><Badge bg="light" text="dark">{cat.businesses_count ?? 0}</Badge></td>
                                        <td>
                                            <Form.Check type="switch" checked={!!cat.is_active} onChange={() => toggle(cat)}
                                                label={<small className={cat.is_active ? 'text-success' : 'text-muted'}>{cat.is_active ? 'Active' : 'Inactive'}</small>} />
                                        </td>
                                        <td><small className="text-muted">{cat.sort_order}</small></td>
                                        <td>
                                            <div className="d-flex gap-1">
                                                <button className="btn btn-default btn-sm btn-icon" onClick={() => openEdit(cat)}><Icon icon="edit" className="fs-lg" /></button>
                                                <button className="btn btn-default btn-sm btn-icon" onClick={() => del(cat)}><Icon icon="trash" className="fs-lg text-danger" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <ModalHeader closeButton>
                    <ModalTitle as="h5">{editTarget ? `Edit: ${editTarget.name}` : 'Add Category'}</ModalTitle>
                </ModalHeader>
                <Form onSubmit={save}>
                    <ModalBody>
                        {error && <Alert variant="danger" className="py-2 mb-3">{error}</Alert>}
                        <Row className="g-3">
                            <Col xs={12}>
                                <Form.Label>Name <span className="text-danger">*</span></Form.Label>
                                <Form.Control value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Fast Food" required />
                            </Col>
                            <Col xs={12}>
                                <Form.Label>Type</Form.Label>
                                <div className="d-flex gap-2">
                                    {TYPES.map(t => (
                                        <button key={t.value} type="button"
                                            className={`btn btn-sm flex-fill ${form.type === t.value ? 'btn-primary' : 'btn-light'}`}
                                            onClick={() => setForm(f => ({ ...f, type: t.value }))}>
                                            <Icon icon={t.icon} className="me-1" /> {t.label}
                                        </button>
                                    ))}
                                </div>
                            </Col>
                            <Col xs={12}>
                                <Form.Label>Icon</Form.Label>
                                <div className="position-relative" ref={iconPickerRef}>
                                    <div className="d-flex align-items-center gap-2">
                                        {/* Preview */}
                                        <span className="d-flex align-items-center justify-content-center rounded border bg-light flex-shrink-0"
                                            style={{ width: 38, height: 38 }}>
                                            <Icon icon={form.icon || 'package'} style={{ fontSize: 22 }} />
                                        </span>
                                        {/* Search input */}
                                        <Form.Control
                                            value={iconSearch}
                                            onChange={e => setIconSearch(e.target.value)}
                                            onFocus={() => setShowIconPicker(true)}
                                            placeholder={form.icon ? form.icon : 'Search icon… (e.g. pizza)'}
                                        />
                                        {form.icon && (
                                            <button type="button" className="btn btn-sm btn-light flex-shrink-0"
                                                onClick={() => { setForm(f => ({ ...f, icon: '' })); setIconSearch(''); }}
                                                title="Clear icon">
                                                <Icon icon="x" />
                                            </button>
                                        )}
                                    </div>
                                    {showIconPicker && (
                                        <div className="border rounded shadow-sm bg-white p-2 mt-1"
                                            style={{ position: 'absolute', zIndex: 1050, width: '100%', maxHeight: 220, overflowY: 'auto' }}>
                                            {filteredIcons.length === 0 ? (
                                                <small className="text-muted px-1">No icons found.</small>
                                            ) : (
                                                <div className="d-flex flex-wrap gap-1">
                                                    {filteredIcons.map(ic => (
                                                        <button key={ic} type="button"
                                                            title={ic}
                                                            className={`btn btn-sm p-1 ${form.icon === ic ? 'btn-primary' : 'btn-light'}`}
                                                            style={{ width: 36, height: 36 }}
                                                            onClick={() => {
                                                                setForm(f => ({ ...f, icon: ic }));
                                                                setShowIconPicker(false);
                                                                setIconSearch('');
                                                            }}>
                                                            <Icon icon={ic} style={{ fontSize: 18 }} />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
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
                                <Form.Check type="switch" id="catActive" label="Active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving || !form.name}>
                            {saving ? <><Spinner animation="border" size="sm" className="me-1" />Saving…</> : 'Save Category'}
                        </button>
                    </ModalFooter>
                </Form>
            </Modal>
        </>
    );
}
