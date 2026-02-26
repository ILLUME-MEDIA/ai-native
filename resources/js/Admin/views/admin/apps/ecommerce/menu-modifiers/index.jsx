import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import {
    Alert, Badge, Button, Card, CardBody, CardHeader, Col, Form,
    Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row, Spinner,
} from 'react-bootstrap';

const api = (method, path, data = null) => axios({ method, url: `/api/ecommerce/${path}`, data });

export default function MenuModifiersPage() {
    // Seller/business selection
    const [sellers, setSellers]       = useState([]);
    const [sellerId, setSellerId]     = useState('');
    const [businessId, setBusinessId] = useState('');

    // Menu items
    const [items, setItems]           = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Modifier groups (loaded with item detail)
    const [groups, setGroups]         = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [expandedGroup, setExpandedGroup] = useState(null);

    // Group modal
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [editGroup, setEditGroup]   = useState(null);
    const [groupForm, setGroupForm]   = useState({
        name: '', description: '', is_required: false,
        min_select: 0, max_select: 1, sort_order: 0, is_active: true,
    });
    const [savingGroup, setSavingGroup] = useState(false);

    // Option modal
    const [showOptionModal, setShowOptionModal] = useState(false);
    const [editOption, setEditOption] = useState(null);
    const [activeGroup, setActiveGroup] = useState(null);
    const [optionForm, setOptionForm] = useState({
        name: '', price_adjustment: 0, is_default: false, sort_order: 0, is_active: true,
    });
    const [savingOption, setSavingOption] = useState(false);

    const [error, setError] = useState('');

    // Load sellers once
    useEffect(() => {
        axios.get('/api/ecommerce/muzzhub?per_page=500&active_only=1')
            .then(r => setSellers(Array.isArray(r.data) ? r.data : (r.data.data || [])))
            .catch(() => setSellers([]));
    }, []);

    // Load menu items when business changes
    const loadItems = useCallback(async () => {
        if (!businessId) { setItems([]); setSelectedItem(null); return; }
        setLoadingItems(true);
        try {
            const { data } = await api('get', `businesses/${businessId}/menu-items`);
            setItems(Array.isArray(data) ? data : []);
        } catch {
            setItems([]);
        }
        setLoadingItems(false);
    }, [businessId]);

    useEffect(() => { loadItems(); }, [loadItems]);

    // Load modifier groups when item is selected
    const loadGroups = useCallback(async () => {
        if (!selectedItem || !businessId) { setGroups([]); return; }
        setLoadingGroups(true);
        try {
            const { data } = await api('get', `businesses/${businessId}/menu-items/${selectedItem.id}`);
            setGroups(data.modifier_groups || []);
        } catch {
            setGroups([]);
        }
        setLoadingGroups(false);
    }, [selectedItem, businessId]);

    useEffect(() => { loadGroups(); }, [loadGroups]);

    const handleSellerChange = (e) => {
        const id = e.target.value;
        setSellerId(id);
        setSelectedItem(null);
        setGroups([]);
        setExpandedGroup(null);
        if (!id) { setBusinessId(''); return; }
        const seller = sellers.find(s => String(s.id) === String(id));
        setBusinessId(seller?.business_id ? String(seller.business_id) : '');
    };

    const selectItem = (item) => {
        setSelectedItem(item);
        setExpandedGroup(null);
        setError('');
    };

    // ── Group CRUD ────────────────────────────────────────────────────────────

    const openAddGroup = () => {
        setGroupForm({
            name: '', description: '', is_required: false,
            min_select: 0, max_select: 1, sort_order: groups.length, is_active: true,
        });
        setEditGroup(null);
        setError('');
        setShowGroupModal(true);
    };

    const openEditGroup = (g) => {
        setGroupForm({
            name: g.name,
            description: g.description || '',
            is_required: !!g.is_required,
            min_select: g.min_select ?? 0,
            max_select: g.max_select ?? 1,
            sort_order: g.sort_order ?? 0,
            is_active: !!g.is_active,
        });
        setEditGroup(g);
        setError('');
        setShowGroupModal(true);
    };

    const saveGroup = async (e) => {
        e.preventDefault();
        setSavingGroup(true);
        setError('');
        try {
            if (!editGroup) {
                await api('post', `businesses/${businessId}/menu-items/${selectedItem.id}/modifier-groups`, groupForm);
            } else {
                await api('patch', `businesses/${businessId}/menu-items/${selectedItem.id}/modifier-groups/${editGroup.id}`, groupForm);
            }
            setShowGroupModal(false);
            loadGroups();
        } catch (err) {
            const errs = err.response?.data?.errors;
            setError(errs ? Object.values(errs).flat().join(' | ') : (err.response?.data?.message || 'Save failed.'));
        } finally {
            setSavingGroup(false);
        }
    };

    const deleteGroup = async (g) => {
        if (!confirm(`Delete group "${g.name}" and all its options?`)) return;
        try {
            await api('delete', `businesses/${businessId}/menu-items/${selectedItem.id}/modifier-groups/${g.id}`);
            if (expandedGroup === g.id) setExpandedGroup(null);
            loadGroups();
        } catch (err) {
            setError(err.response?.data?.message || 'Delete failed.');
        }
    };

    // ── Option CRUD ───────────────────────────────────────────────────────────

    const openAddOption = (group) => {
        setActiveGroup(group);
        setOptionForm({
            name: '', price_adjustment: 0, is_default: false,
            sort_order: group.options?.length ?? 0, is_active: true,
        });
        setEditOption(null);
        setError('');
        setShowOptionModal(true);
        setExpandedGroup(group.id);
    };

    const openEditOption = (group, option) => {
        setActiveGroup(group);
        setOptionForm({
            name: option.name,
            price_adjustment: option.price_adjustment ?? 0,
            is_default: !!option.is_default,
            sort_order: option.sort_order ?? 0,
            is_active: !!option.is_active,
        });
        setEditOption(option);
        setError('');
        setShowOptionModal(true);
    };

    const saveOption = async (e) => {
        e.preventDefault();
        setSavingOption(true);
        setError('');
        try {
            const base = `businesses/${businessId}/menu-items/${selectedItem.id}/modifier-groups/${activeGroup.id}/options`;
            if (!editOption) {
                await api('post', base, optionForm);
            } else {
                await api('patch', `${base}/${editOption.id}`, optionForm);
            }
            setShowOptionModal(false);
            loadGroups();
        } catch (err) {
            const errs = err.response?.data?.errors;
            setError(errs ? Object.values(errs).flat().join(' | ') : (err.response?.data?.message || 'Save failed.'));
        } finally {
            setSavingOption(false);
        }
    };

    const deleteOption = async (group, option) => {
        if (!confirm(`Delete option "${option.name}"?`)) return;
        try {
            await api('delete', `businesses/${businessId}/menu-items/${selectedItem.id}/modifier-groups/${group.id}/options/${option.id}`);
            loadGroups();
        } catch (err) {
            setError(err.response?.data?.message || 'Delete failed.');
        }
    };

    const noBizLinked = sellerId && !businessId;

    return (
        <>
            <PageBreadcrumb title="Menu Modifiers" subtitle="Ecommerce" />
            <p className="text-muted mb-3">
                Select a seller, then click a menu item to manage its modifier groups and options
                (e.g. Size → Small/Medium/Large, Toppings → Extra Cheese +$1.00).
            </p>

            {/* Seller selector */}
            <Card className="mb-3">
                <CardBody className="py-2">
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                        <Form.Select
                            size="sm"
                            style={{ width: 300 }}
                            value={sellerId}
                            onChange={handleSellerChange}
                        >
                            <option value="">— Select Seller —</option>
                            {sellers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </Form.Select>
                        {noBizLinked && (
                            <Badge bg="warning" text="dark">No Business linked — set it in Sellers page</Badge>
                        )}
                        {businessId && (
                            <span className="text-muted small">Business #{businessId}</span>
                        )}
                    </div>
                </CardBody>
            </Card>

            {!sellerId ? (
                <div className="text-center text-muted py-5">Select a seller above to begin.</div>
            ) : noBizLinked ? (
                <Alert variant="warning">
                    This seller has no linked Business. Go to <strong>Sellers</strong> and set the Linked Business ID.
                </Alert>
            ) : (
                <Row className="align-items-start">
                    {/* ── Left: Menu items list ── */}
                    <Col lg={5} className="mb-3">
                        <Card>
                            <CardHeader className="border-light d-flex align-items-center gap-2">
                                <strong className="me-auto">Menu Items</strong>
                                {loadingItems && <Spinner size="sm" />}
                                <small className="text-muted">{items.length} item{items.length !== 1 ? 's' : ''}</small>
                            </CardHeader>
                            <CardBody className="p-0">
                                {items.length === 0 && !loadingItems ? (
                                    <div className="text-muted text-center py-4">No menu items found.</div>
                                ) : (
                                    <div style={{ maxHeight: 580, overflowY: 'auto' }}>
                                        {items.map(item => (
                                            <div
                                                key={item.id}
                                                className={`p-3 border-bottom d-flex align-items-start gap-2 ${selectedItem?.id === item.id ? 'bg-primary bg-opacity-10' : ''}`}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => selectItem(item)}
                                            >
                                                {item.image_url && (
                                                    <img
                                                        src={item.image_url}
                                                        alt=""
                                                        className="rounded flex-shrink-0"
                                                        width={44}
                                                        height={44}
                                                        style={{ objectFit: 'cover' }}
                                                    />
                                                )}
                                                <div className="flex-grow-1 min-width-0">
                                                    <div className="fw-semibold text-truncate">{item.name}</div>
                                                    <small className="text-muted">
                                                        {item.menu_category?.name && (
                                                            <span className="me-2 text-primary">{item.menu_category.name}</span>
                                                        )}
                                                        ${parseFloat(item.price || 0).toFixed(2)}
                                                    </small>
                                                </div>
                                                <Badge
                                                    bg={item.is_available ? 'success-subtle' : 'secondary'}
                                                    text={item.is_available ? 'success' : undefined}
                                                    className="flex-shrink-0 border"
                                                    style={{ fontSize: '0.7rem' }}
                                                >
                                                    {item.is_available ? 'On' : 'Off'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </Col>

                    {/* ── Right: Modifier groups panel ── */}
                    <Col lg={7} className="mb-3">
                        {!selectedItem ? (
                            <div className="text-center text-muted py-5 border rounded bg-light">
                                <div style={{ fontSize: 36, opacity: 0.3 }}>⊞</div>
                                <div className="mt-2">Select a menu item to manage its modifiers</div>
                            </div>
                        ) : (
                            <Card>
                                <CardHeader className="border-light">
                                    <div className="d-flex align-items-center justify-content-between gap-2">
                                        <div>
                                            <strong>{selectedItem.name}</strong>
                                            <small className="text-muted ms-2">
                                                ${parseFloat(selectedItem.price || 0).toFixed(2)}
                                            </small>
                                        </div>
                                        <Button size="sm" variant="primary" onClick={openAddGroup}>
                                            <Icon icon="plus" className="me-1" />
                                            Add Group
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    {error && (
                                        <Alert variant="danger" className="py-2 mb-3" dismissible onClose={() => setError('')}>
                                            {error}
                                        </Alert>
                                    )}

                                    {loadingGroups ? (
                                        <div className="text-center py-4">
                                            <Spinner size="sm" /> Loading modifiers…
                                        </div>
                                    ) : groups.length === 0 ? (
                                        <div className="text-center text-muted py-4">
                                            <div style={{ fontSize: 28, opacity: 0.3 }}>⊞</div>
                                            <div>No modifier groups yet.</div>
                                            <Button size="sm" variant="outline-primary" className="mt-2" onClick={openAddGroup}>
                                                <Icon icon="plus" className="me-1" />
                                                Add First Group
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="d-flex flex-column gap-2">
                                            {groups.map(g => (
                                                <div key={g.id} className="border rounded">
                                                    {/* Group header */}
                                                    <div className="d-flex align-items-center gap-2 p-3 bg-light rounded-top">
                                                        <div className="flex-grow-1">
                                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                                <strong>{g.name}</strong>
                                                                {g.is_required && (
                                                                    <Badge bg="danger" style={{ fontSize: '0.65rem' }}>REQUIRED</Badge>
                                                                )}
                                                                {!g.is_active && (
                                                                    <Badge bg="secondary" style={{ fontSize: '0.65rem' }}>INACTIVE</Badge>
                                                                )}
                                                                <small className="text-muted">
                                                                    {g.options?.length ?? 0} option{(g.options?.length ?? 0) !== 1 ? 's' : ''}
                                                                    {(g.min_select > 0 || g.max_select > 0) && (
                                                                        <span className="ms-1">
                                                                            ({g.min_select > 0 ? `min ${g.min_select}` : ''}
                                                                            {g.min_select > 0 && g.max_select > 0 ? ', ' : ''}
                                                                            {g.max_select > 0 ? `max ${g.max_select}` : ''})
                                                                        </span>
                                                                    )}
                                                                </small>
                                                            </div>
                                                            {g.description && (
                                                                <small className="text-muted d-block">{g.description}</small>
                                                            )}
                                                        </div>
                                                        <div className="d-flex gap-1 flex-shrink-0">
                                                            <Button
                                                                size="sm"
                                                                variant="outline-primary"
                                                                className="btn-icon"
                                                                title="Add option"
                                                                onClick={() => openAddOption(g)}
                                                            >
                                                                <Icon icon="plus" className="fs-lg" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-secondary"
                                                                className="btn-icon"
                                                                title="Edit group"
                                                                onClick={() => openEditGroup(g)}
                                                            >
                                                                <Icon icon="edit" className="fs-lg" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-danger"
                                                                className="btn-icon"
                                                                title="Delete group"
                                                                onClick={() => deleteGroup(g)}
                                                            >
                                                                <Icon icon="trash" className="fs-lg" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="link"
                                                                className="text-muted p-1"
                                                                onClick={() => setExpandedGroup(expandedGroup === g.id ? null : g.id)}
                                                            >
                                                                <Icon icon={expandedGroup === g.id ? 'chevron-up' : 'chevron-down'} className="fs-lg" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Options list (expanded) */}
                                                    {expandedGroup === g.id && (
                                                        <div className="p-3">
                                                            {(!g.options || g.options.length === 0) ? (
                                                                <div className="text-muted text-center py-2">
                                                                    No options yet.
                                                                </div>
                                                            ) : (
                                                                <table className="table table-sm table-hover mb-2">
                                                                    <thead>
                                                                        <tr className="text-muted" style={{ fontSize: '0.78rem' }}>
                                                                            <th>Name</th>
                                                                            <th>Price Adj.</th>
                                                                            <th>Default</th>
                                                                            <th>Active</th>
                                                                            <th></th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {g.options.map(opt => (
                                                                            <tr key={opt.id}>
                                                                                <td className="fw-semibold align-middle">{opt.name}</td>
                                                                                <td className="align-middle">
                                                                                    <span className={
                                                                                        parseFloat(opt.price_adjustment) > 0 ? 'text-success' :
                                                                                        parseFloat(opt.price_adjustment) < 0 ? 'text-danger' : 'text-muted'
                                                                                    }>
                                                                                        {parseFloat(opt.price_adjustment) > 0 ? '+' : ''}
                                                                                        ${parseFloat(opt.price_adjustment || 0).toFixed(2)}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="align-middle">
                                                                                    {opt.is_default
                                                                                        ? <Badge bg="info">Yes</Badge>
                                                                                        : <span className="text-muted">—</span>
                                                                                    }
                                                                                </td>
                                                                                <td className="align-middle">
                                                                                    <span className={opt.is_active ? 'text-success' : 'text-muted'}>●</span>
                                                                                </td>
                                                                                <td className="align-middle">
                                                                                    <div className="d-flex gap-1">
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline-secondary"
                                                                                            className="py-0 px-1"
                                                                                            onClick={() => openEditOption(g, opt)}
                                                                                            title="Edit option"
                                                                                        >
                                                                                            <Icon icon="edit" style={{ fontSize: 12 }} />
                                                                                        </Button>
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline-danger"
                                                                                            className="py-0 px-1"
                                                                                            onClick={() => deleteOption(g, opt)}
                                                                                            title="Delete option"
                                                                                        >
                                                                                            <Icon icon="trash" style={{ fontSize: 12 }} />
                                                                                        </Button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="outline-primary"
                                                                onClick={() => openAddOption(g)}
                                                            >
                                                                <Icon icon="plus" className="me-1" />
                                                                Add Option
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        )}
                    </Col>
                </Row>
            )}

            {/* ── Modifier Group Modal ── */}
            <Modal show={showGroupModal} onHide={() => setShowGroupModal(false)} centered>
                <ModalHeader closeButton>
                    <ModalTitle as="h5">
                        {editGroup ? `Edit Group: ${editGroup.name}` : 'Add Modifier Group'}
                    </ModalTitle>
                </ModalHeader>
                <Form onSubmit={saveGroup}>
                    <ModalBody>
                        {error && (
                            <Alert variant="danger" className="py-2 mb-3">{error}</Alert>
                        )}
                        <Row className="g-3">
                            <Col xs={12}>
                                <Form.Label>Group Name <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    value={groupForm.name}
                                    onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Size, Toppings, Extras"
                                    required
                                />
                            </Col>
                            <Col xs={12}>
                                <Form.Label>Description</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={groupForm.description}
                                    onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Optional — shown to customers"
                                />
                            </Col>
                            <Col xs={4}>
                                <Form.Label>Min Select</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={groupForm.min_select}
                                    onChange={e => setGroupForm(f => ({ ...f, min_select: parseInt(e.target.value) || 0 }))}
                                />
                                <Form.Text className="text-muted">0 = any</Form.Text>
                            </Col>
                            <Col xs={4}>
                                <Form.Label>Max Select</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={groupForm.max_select}
                                    onChange={e => setGroupForm(f => ({ ...f, max_select: parseInt(e.target.value) || 0 }))}
                                />
                                <Form.Text className="text-muted">0 = unlimited</Form.Text>
                            </Col>
                            <Col xs={4}>
                                <Form.Label>Sort Order</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="0"
                                    value={groupForm.sort_order}
                                    onChange={e => setGroupForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                                />
                            </Col>
                            <Col xs={12} className="d-flex gap-4">
                                <Form.Check
                                    type="switch"
                                    id="grpRequired"
                                    label="Required"
                                    checked={groupForm.is_required}
                                    onChange={e => setGroupForm(f => ({ ...f, is_required: e.target.checked }))}
                                />
                                <Form.Check
                                    type="switch"
                                    id="grpActive"
                                    label="Active"
                                    checked={groupForm.is_active}
                                    onChange={e => setGroupForm(f => ({ ...f, is_active: e.target.checked }))}
                                />
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onClick={() => setShowGroupModal(false)}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={savingGroup || !groupForm.name}>
                            {savingGroup ? <><Spinner size="sm" className="me-1" />Saving…</> : 'Save Group'}
                        </Button>
                    </ModalFooter>
                </Form>
            </Modal>

            {/* ── Modifier Option Modal ── */}
            <Modal show={showOptionModal} onHide={() => setShowOptionModal(false)} centered>
                <ModalHeader closeButton>
                    <ModalTitle as="h5">
                        {editOption
                            ? `Edit: ${editOption.name}`
                            : `Add Option — ${activeGroup?.name}`
                        }
                    </ModalTitle>
                </ModalHeader>
                <Form onSubmit={saveOption}>
                    <ModalBody>
                        {error && (
                            <Alert variant="danger" className="py-2 mb-3">{error}</Alert>
                        )}
                        <Row className="g-3">
                            <Col xs={12}>
                                <Form.Label>Option Name <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    value={optionForm.name}
                                    onChange={e => setOptionForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Small, Medium, Extra Cheese"
                                    required
                                    autoFocus
                                />
                            </Col>
                            <Col xs={6}>
                                <Form.Label>Price Adjustment ($)</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.01"
                                    value={optionForm.price_adjustment}
                                    onChange={e => setOptionForm(f => ({ ...f, price_adjustment: parseFloat(e.target.value) || 0 }))}
                                    placeholder="0.00"
                                />
                                <Form.Text className="text-muted">
                                    +1.50 adds $1.50 · −1.00 reduces $1.00 · 0 = free
                                </Form.Text>
                            </Col>
                            <Col xs={6}>
                                <Form.Label>Sort Order</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="0"
                                    value={optionForm.sort_order}
                                    onChange={e => setOptionForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                                />
                            </Col>
                            <Col xs={12} className="d-flex gap-4">
                                <Form.Check
                                    type="switch"
                                    id="optDefault"
                                    label="Pre-selected (default)"
                                    checked={optionForm.is_default}
                                    onChange={e => setOptionForm(f => ({ ...f, is_default: e.target.checked }))}
                                />
                                <Form.Check
                                    type="switch"
                                    id="optActive"
                                    label="Active"
                                    checked={optionForm.is_active}
                                    onChange={e => setOptionForm(f => ({ ...f, is_active: e.target.checked }))}
                                />
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onClick={() => setShowOptionModal(false)}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={savingOption || !optionForm.name}>
                            {savingOption ? <><Spinner size="sm" className="me-1" />Saving…</> : 'Save Option'}
                        </Button>
                    </ModalFooter>
                </Form>
            </Modal>
        </>
    );
}
