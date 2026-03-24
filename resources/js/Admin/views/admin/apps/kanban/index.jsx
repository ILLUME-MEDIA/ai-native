import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import Icon from '@admin/components/wrappers/Icon';
import { SimpleBar } from '@admin/components/wrappers/SimpleBar';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import axios from 'axios';
import clsx from 'clsx';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert, Button, Card, CardBody, CardHeader,
    Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle,
    Form, FormControl, FormGroup, FormLabel, FormSelect,
    Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
    OverlayTrigger, Row, Spinner, Tooltip,
} from 'react-bootstrap';

const api = (path, opts = {}) => axios({ url: `/api/admin/kanban/${path}`, ...opts });

// ── Priority badge classes (exact match to reference HTML) ───────────────────
const PRIORITY_MAP = {
    low:    { cls: 'bg-success-subtle text-success badge-label', label: 'Normal'  },
    medium: { cls: 'bg-warning-subtle text-warning badge-label', label: 'Medium'  },
    high:   { cls: 'bg-danger-subtle text-danger badge-label',   label: 'High'    },
    urgent: { cls: 'bg-danger text-white badge-label',           label: 'Urgent'  },
};

// ── Avatar initials ──────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
function Avatar({ name, size = 28 }) {
    if (!name) return null;
    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const bg       = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
    return (
        <OverlayTrigger placement="top" overlay={<Tooltip>{name}</Tooltip>}>
            <span className="rounded-circle d-inline-flex align-items-center justify-content-center text-white fw-semibold flex-shrink-0"
                style={{ width: size, height: size, fontSize: size * 0.38, background: bg, cursor: 'default' }}>
                {initials}
            </span>
        </OverlayTrigger>
    );
}

// ── Due date helper: "X Days" ─────────────────────────────────────────────────
function dueDaysLabel(due_date) {
    if (!due_date) return null;
    const diff = Math.ceil((new Date(due_date) - new Date()) / 86400000);
    if (diff < 0)  return { text: `${Math.abs(diff)}d overdue`, cls: 'text-danger' };
    if (diff === 0) return { text: 'Today',  cls: 'text-warning' };
    return { text: `${diff} Days`, cls: '' };
}

// ── Kanban Card Item — exact reference HTML structure ─────────────────────────
function KanbanCardItem({ card, index, onEdit, onDelete }) {
    const prio      = PRIORITY_MAP[card.priority] ?? PRIORITY_MAP.medium;
    const due       = dueDaysLabel(card.due_date);
    const isMeeting = card.is_meeting_card;
    // Prefer openorg_user name over string assignee
    const assigneeName = card.openorg_user?.name ?? card.assignee;

    return (
        <Draggable draggableId={String(card.id)} index={index}>
            {(provided, snapshot) => (
                <li className="kanban-item" ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                    <Card className={clsx('mb-2', snapshot.isDragging && 'shadow', isMeeting ? 'border-primary border-opacity-25' : 'border border-light')}>
                        <CardBody>
                            {/* Row 1: Priority badge + (meeting icon) + dots dropdown */}
                            <div className="d-flex align-items-center mb-2">
                                <span className={`badge ${prio.cls}`}>{prio.label}</span>
                                {isMeeting && (
                                    <OverlayTrigger placement="top" overlay={<Tooltip>Meeting card — drag only</Tooltip>}>
                                        <span className="badge bg-info-subtle text-info badge-label ms-1">
                                            <Icon icon="calendar-event" style={{ fontSize: 11 }} className="me-1" />Meeting
                                        </span>
                                    </OverlayTrigger>
                                )}
                                <div className="ms-auto mt-n2">
                                    <Dropdown>
                                        <DropdownToggle className="btn btn-icon btn-sm btn-ghost-light text-muted drop-arrow-none">
                                            <Icon icon="dots-vertical" className="fs-lg" />
                                        </DropdownToggle>
                                        <DropdownMenu align="end">
                                            {!isMeeting && (
                                                <DropdownItem onClick={() => onEdit(card)}>
                                                    <Icon icon="edit" className="me-2" />Edit
                                                </DropdownItem>
                                            )}
                                            <DropdownItem className="text-danger" onClick={() => onDelete(card)}>
                                                <Icon icon="trash" className="me-2" />Delete
                                            </DropdownItem>
                                        </DropdownMenu>
                                    </Dropdown>
                                </div>
                            </div>

                            {/* Row 2: Title */}
                            <h5 className="mb-2">
                                <span className="link-reset">{card.title}</span>
                            </h5>

                            {/* Row 3: Labels (if any) */}
                            {card.labels?.length > 0 && (
                                <div className="d-flex flex-wrap gap-1 mb-2">
                                    {card.labels.map((l, i) => (
                                        <span key={i} className="badge bg-primary-subtle text-primary">{l}</span>
                                    ))}
                                </div>
                            )}

                            {/* Row 4: Assignee avatar + name */}
                            {assigneeName && (
                                <div className="d-flex align-items-center mb-2">
                                    <Avatar name={assigneeName} size={28} />
                                    <span className="text-muted fw-medium ms-2">{assigneeName}</span>
                                </div>
                            )}

                            {/* Row 5: Stats — due days / tasks / links / messages */}
                            <div className="d-flex justify-content-between align-items-center mb-n1 text-muted">
                                <span className={due?.cls ?? ''}>{due ? due.text : `#${card.id}`}</span>
                                <span><Icon icon="list-check" /> {card.labels?.length ?? 0}</span>
                                <span><Icon icon="link" /> 0</span>
                                <span><Icon icon="message" /> 0</span>
                            </div>
                        </CardBody>
                    </Card>
                </li>
            )}
        </Draggable>
    );
}

// ── Board Modal ─────────────────────────────────────────────────────────────
function BoardModal({ show, board, onHide, onSave, platforms = [] }) {
    const [form, setForm]     = useState({ name: '', description: '', color: '#6366f1', is_active: true, cal_platform_id: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    useEffect(() => {
        if (show) { setForm(board ?? { name: '', description: '', color: '#6366f1', is_active: true, cal_platform_id: '' }); setError(''); }
    }, [show, board]);

    const save = async () => {
        setSaving(true); setError('');
        try {
            if (board) await api(`boards/${board.id}`, { method: 'PUT', data: form });
            else        await api('boards', { method: 'POST', data: form });
            onSave();
        } catch (e) { setError(e.response?.data?.message || 'Error saving board.'); }
        finally { setSaving(false); }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <ModalHeader closeButton>
                <ModalTitle as="h6">{board ? 'Edit Board' : 'Create New Board'}</ModalTitle>
            </ModalHeader>
            <ModalBody>
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                <Row className="g-3">
                    <Col xs={12}>
                        <FormGroup>
                            <FormLabel className="small fw-semibold">Board Name <span className="text-danger">*</span></FormLabel>
                            <FormControl value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Sprint Board" />
                        </FormGroup>
                    </Col>
                    <Col xs={12}>
                        <FormGroup>
                            <FormLabel className="small fw-semibold">Description</FormLabel>
                            <FormControl as="textarea" rows={2} value={form.description ?? ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
                        </FormGroup>
                    </Col>
                    <Col xs={12}>
                        <FormGroup>
                            <FormLabel className="small fw-semibold">Link to Platform <small className="text-muted fw-normal">(meetings auto-added)</small></FormLabel>
                            <FormSelect value={form.cal_platform_id ?? ''} onChange={e => setForm(p => ({ ...p, cal_platform_id: e.target.value || null }))}>
                                <option value="">— No platform link —</option>
                                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </FormSelect>
                        </FormGroup>
                    </Col>
                    <Col xs={7}>
                        <FormGroup>
                            <FormLabel className="small fw-semibold">Board Color</FormLabel>
                            <div className="d-flex gap-2">
                                <Form.Control type="color" value={form.color || '#6366f1'} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ width: 44, height: 38, padding: 2 }} />
                                <FormControl value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} placeholder="#6366f1" />
                            </div>
                        </FormGroup>
                    </Col>
                    <Col xs={5} className="d-flex align-items-end pb-1">
                        <Form.Check type="switch" id="board-active" label="Active" checked={!!form.is_active}
                            onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
                    </Col>
                </Row>
            </ModalBody>
            <ModalFooter className="border-0 pt-0">
                <Button variant="light" onClick={onHide}>Cancel</Button>
                <Button variant="primary" onClick={save} disabled={saving}>
                    {saving && <Spinner size="sm" animation="border" className="me-2" />}
                    {board ? 'Save Changes' : 'Create Board'}
                </Button>
            </ModalFooter>
        </Modal>
    );
}

// ── Column Modal ────────────────────────────────────────────────────────────
function ColumnModal({ show, column, boardId, onHide, onSave }) {
    const [form, setForm]     = useState({ name: '', color: '#6366f1', wip_limit: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    useEffect(() => {
        if (show) { setForm(column ?? { name: '', color: '#6366f1', wip_limit: '' }); setError(''); }
    }, [show, column]);

    const save = async () => {
        setSaving(true); setError('');
        try {
            if (column) await api(`columns/${column.id}`, { method: 'PUT', data: form });
            else         await api(`boards/${boardId}/columns`, { method: 'POST', data: form });
            onSave();
        } catch (e) { setError(e.response?.data?.message || 'Error.'); }
        finally { setSaving(false); }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <ModalHeader closeButton>
                <ModalTitle as="h6">{column ? 'Edit Column' : 'Add Column'}</ModalTitle>
            </ModalHeader>
            <ModalBody>
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                <Row className="g-3">
                    <Col xs={12}>
                        <FormGroup>
                            <FormLabel className="small fw-semibold">Column Name <span className="text-danger">*</span></FormLabel>
                            <FormControl value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. In Review" />
                        </FormGroup>
                    </Col>
                    <Col xs={7}>
                        <FormGroup>
                            <FormLabel className="small fw-semibold">Color</FormLabel>
                            <div className="d-flex gap-2">
                                <Form.Control type="color" value={form.color || '#6366f1'} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ width: 44, height: 38, padding: 2 }} />
                                <FormControl value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
                            </div>
                        </FormGroup>
                    </Col>
                    <Col xs={5}>
                        <FormGroup>
                            <FormLabel className="small fw-semibold">WIP Limit</FormLabel>
                            <FormControl type="number" value={form.wip_limit ?? ''} onChange={e => setForm(p => ({ ...p, wip_limit: e.target.value }))} placeholder="Unlimited" min={1} />
                        </FormGroup>
                    </Col>
                </Row>
            </ModalBody>
            <ModalFooter className="border-0 pt-0">
                <Button variant="light" onClick={onHide}>Cancel</Button>
                <Button variant="primary" onClick={save} disabled={saving}>
                    {saving && <Spinner size="sm" animation="border" className="me-2" />}
                    {column ? 'Save Changes' : 'Add Column'}
                </Button>
            </ModalFooter>
        </Modal>
    );
}

// ── Card Modal ──────────────────────────────────────────────────────────────
const CARD_INIT = { title: '', description: '', priority: 'medium', due_date: '', assignee: '', openorg_user_id: null, labels: [] };

function CardModal({ show, card, columnId, boardUsers = [], onHide, onSave }) {
    const [form, setForm]             = useState(CARD_INIT);
    const [labelInput, setLabelInput] = useState('');
    const [saving, setSaving]         = useState(false);
    const [error, setError]           = useState('');

    useEffect(() => {
        if (show) { setForm(card ?? CARD_INIT); setLabelInput(''); setError(''); }
    }, [show, card]);

    const save = async () => {
        setSaving(true); setError('');
        try {
            if (card) await api(`cards/${card.id}`, { method: 'PUT', data: form });
            else       await api(`columns/${columnId}/cards`, { method: 'POST', data: form });
            onSave();
        } catch (e) { setError(e.response?.data?.message || 'Error saving card.'); }
        finally { setSaving(false); }
    };

    const addLabel = () => {
        if (!labelInput.trim()) return;
        setForm(p => ({ ...p, labels: [...(p.labels || []), labelInput.trim()] }));
        setLabelInput('');
    };
    const removeLabel = (i) => setForm(p => ({ ...p, labels: p.labels.filter((_, idx) => idx !== i) }));

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <ModalHeader closeButton>
                <ModalTitle as="h6">{card ? 'Edit Card' : 'Add New Card'}</ModalTitle>
            </ModalHeader>
            <ModalBody>
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                <Row className="g-3">
                    <Col xs={12}>
                        <FormGroup>
                            <FormLabel className="small fw-semibold">Title <span className="text-danger">*</span></FormLabel>
                            <FormControl value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="What needs to be done?" autoFocus />
                        </FormGroup>
                    </Col>
                    <Col xs={12}>
                        <FormGroup>
                            <FormLabel className="small fw-semibold">Description</FormLabel>
                            <FormControl as="textarea" rows={3} value={form.description ?? ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Add more details…" />
                        </FormGroup>
                    </Col>
                    <Col xs={12}>
                        <FormGroup>
                            <FormLabel className="small fw-semibold">Priority</FormLabel>
                            <FormSelect value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </FormSelect>
                        </FormGroup>
                    </Col>
                    <Col md={6}>
                        <FormGroup>
                            <FormLabel className="small fw-semibold">Due Date</FormLabel>
                            <FormControl type="date" value={form.due_date ?? ''} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                        </FormGroup>
                    </Col>
                    <Col md={6}>
                        <FormGroup>
                            <FormLabel className="small fw-semibold">Assignee</FormLabel>
                            {boardUsers.length > 0 ? (
                                <FormSelect value={form.openorg_user_id ?? ''} onChange={e => setForm(p => ({ ...p, openorg_user_id: e.target.value || null }))}>
                                    <option value="">— Not assigned —</option>
                                    {boardUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </FormSelect>
                            ) : (
                                <FormControl value={form.assignee ?? ''} onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))} placeholder="Name or email" />
                            )}
                        </FormGroup>
                    </Col>
                    <Col xs={12}>
                        <FormLabel className="small fw-semibold">Labels</FormLabel>
                        <div className="d-flex gap-2 mb-2">
                            <FormControl size="sm" value={labelInput} onChange={e => setLabelInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLabel())}
                                placeholder="Type and press Enter…" />
                            <Button size="sm" variant="outline-secondary" onClick={addLabel}>Add</Button>
                        </div>
                        {form.labels?.length > 0 && (
                            <div className="d-flex flex-wrap gap-1">
                                {form.labels.map((l, i) => (
                                    <span key={i} className="badge bg-primary-subtle text-primary d-inline-flex align-items-center gap-1">
                                        {l}
                                        <button type="button" onClick={() => removeLabel(i)}
                                            className="btn-close" style={{ fontSize: '0.45rem' }} />
                                    </span>
                                ))}
                            </div>
                        )}
                    </Col>
                </Row>
            </ModalBody>
            <ModalFooter className="border-0 pt-0">
                <Button variant="light" onClick={onHide}>Cancel</Button>
                <Button variant="primary" onClick={save} disabled={saving}>
                    {saving && <Spinner size="sm" animation="border" className="me-2" />}
                    {card ? 'Save Changes' : 'Add Card'}
                </Button>
            </ModalFooter>
        </Modal>
    );
}

// ── Main Kanban Page ────────────────────────────────────────────────────────
export default function KanbanPage() {
    const [boards, setBoards]             = useState([]);
    const [board, setBoard]               = useState(null);
    const [loading, setLoading]           = useState(false);
    const [modal, setModal]               = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [search, setSearch]             = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterUser, setFilterUser]     = useState('');
    const [platforms, setPlatforms]       = useState([]);
    const [boardUsers, setBoardUsers]     = useState([]);  // users for current board's platform

    // Load Cal platforms for board creation
    useEffect(() => {
        axios.get('/api/admin/cal/platforms').then(({ data }) => setPlatforms(data)).catch(() => {});
    }, []);

    // Load platform users when board changes
    useEffect(() => {
        const pid = board?.cal_platform_id;
        if (!pid) { setBoardUsers([]); setFilterUser(''); return; }
        axios.get(`/api/admin/platforms/${pid}/users?active_only=1`)
            .then(({ data }) => setBoardUsers(data.data ?? data)).catch(() => setBoardUsers([]));
    }, [board?.cal_platform_id]);

    const loadBoards = useCallback(async () => {
        const { data } = await api('boards');
        setBoards(data);
        return data;
    }, []);

    const loadBoard = useCallback(async (id) => {
        setLoading(true);
        const { data } = await api(`boards/${id}`);
        setBoard(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadBoards().then(bs => { if (bs.length > 0) loadBoard(bs[0].id); });
    }, [loadBoards, loadBoard]);

    const refresh    = () => { loadBoards(); if (board) loadBoard(board.id); };
    const closeModal = () => setModal(null);
    const saveModal  = () => { closeModal(); refresh(); };

    // ── Drag & Drop ──────────────────────────────────────────────────────────
    const onDragEnd = async ({ destination, source, draggableId }) => {
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const cardId   = parseInt(draggableId, 10);
        const newColId = parseInt(destination.droppableId, 10);

        setBoard(prev => {
            if (!prev) return prev;
            const cols   = prev.columns.map(col => ({ ...col, cards: [...col.cards] }));
            const srcCol = cols.find(c => String(c.id) === source.droppableId);
            const dstCol = cols.find(c => String(c.id) === destination.droppableId);
            if (!srcCol || !dstCol) return prev;
            const [moved] = srcCol.cards.splice(source.index, 1);
            dstCol.cards.splice(destination.index, 0, { ...moved, column_id: dstCol.id });
            return { ...prev, columns: cols };
        });

        try {
            await api(`cards/${cardId}/move`, { method: 'PATCH', data: { column_id: newColId, position: destination.index } });
        } catch { loadBoard(board.id); }
    };

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleAddCard      = col  => setModal({ type: 'card-create', column: col });
    const handleEditCard     = card => setModal({ type: 'card-edit', card });
    const handleDeleteCard   = card => setDeleteTarget({ type: 'card', item: card });
    const handleEditColumn   = col  => setModal({ type: 'column-edit', column: col });
    const handleDeleteColumn = col  => setDeleteTarget({ type: 'column', item: col });

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        if (deleteTarget.type === 'card')   await api(`cards/${deleteTarget.item.id}`, { method: 'DELETE' });
        if (deleteTarget.type === 'column') await api(`columns/${deleteTarget.item.id}`, { method: 'DELETE' });
        if (deleteTarget.type === 'board')  {
            await api(`boards/${deleteTarget.item.id}`, { method: 'DELETE' });
            setBoard(null);
            loadBoards().then(bs => { if (bs.length > 0) loadBoard(bs[0].id); });
            setDeleteTarget(null); return;
        }
        setDeleteTarget(null); refresh();
    };

    // ── Filter cards ─────────────────────────────────────────────────────────
    const filterCards = (cards) => cards.filter(c => {
        const q = search.toLowerCase();
        const assigneeName = c.openorg_user?.name ?? c.assignee ?? '';
        const matchSearch    = !q || c.title?.toLowerCase().includes(q) || assigneeName.toLowerCase().includes(q);
        const matchPriority  = !filterPriority || c.priority === filterPriority;
        const matchUser      = !filterUser || String(c.openorg_user_id) === String(filterUser);
        return matchSearch && matchPriority && matchUser;
    });

    return (
        <>
            <PageBreadcrumb title="Kanban Board" subName="Apps" />

            <div className="outlook-box kanban-app">
                <Card className="h-100 mb-0 flex-grow-1">

                    {/* ── Header ── */}
                    <CardHeader className="border-light align-items-center gap-2">
                        {/* Search */}
                        <div className="app-search">
                            <FormControl type="search" placeholder="Search by task name, assignee..." value={search} onChange={e => setSearch(e.target.value)} />
                            <Icon icon="search" className="app-search-icon text-muted" />
                        </div>

                        <div className="d-flex flex-wrap align-items-center gap-2">
                            {/* Board selector */}
                            <div className="app-search">
                                <FormSelect className="form-control" value={board?.id ?? ''} onChange={e => loadBoard(Number(e.target.value))}>
                                    <option value="" disabled>Board</option>
                                    {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </FormSelect>
                                <Icon icon="layout-kanban" className="app-search-icon text-muted" />
                            </div>

                            {/* Priority filter */}
                            <div className="app-search">
                                <FormSelect className="form-control" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                                    <option value="">Priority</option>
                                    <option value="low">Normal</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </FormSelect>
                                <Icon icon="flag" className="app-search-icon text-muted" />
                            </div>

                            {/* User filter — only shows when board is linked to a platform */}
                            {boardUsers.length > 0 && (
                                <div className="app-search">
                                    <FormSelect className="form-control" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                                        <option value="">All Users</option>
                                        {boardUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </FormSelect>
                                    <Icon icon="user" className="app-search-icon text-muted" />
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="d-flex align-items-center gap-2 ms-lg-auto flex-shrink-0">
                            <Button variant="primary" onClick={() => setModal({ type: 'card-create-quick' })}>
                                <Icon icon="plus" className="me-1" />Add New Task
                            </Button>
                            <Button variant="light" size="sm" onClick={() => setModal({ type: 'board-create' })} title="New Board">
                                <Icon icon="plus" />
                            </Button>
                            {board && (
                                <>
                                    <Button variant="light" size="sm" onClick={() => setModal({ type: 'column-create' })} title="Add Column">
                                        <Icon icon="columns" />
                                    </Button>
                                    <Button variant="light" size="sm" onClick={() => setModal({ type: 'board-edit', board })} title="Board Settings">
                                        <Icon icon="settings" />
                                    </Button>
                                    <Button variant="outline-danger" size="sm" onClick={() => setDeleteTarget({ type: 'board', item: board })} title="Delete Board">
                                        <Icon icon="trash" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardHeader>

                    {/* ── Board ── */}
                    <CardBody className="p-0" style={{ overflow: 'hidden', minHeight: 0, flex: '1 1 auto' }}>
                        {loading ? (
                            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
                                <Spinner animation="border" variant="primary" />
                            </div>
                        ) : !board ? (
                            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 400 }}>
                                <div className="text-center">
                                    <Icon icon="layout-kanban" className="text-muted mb-3" style={{ fontSize: 52 }} />
                                    <h5 className="text-muted fw-semibold">No board selected</h5>
                                    <p className="text-muted small">Create your first board to start tracking work.</p>
                                    <Button variant="primary" onClick={() => setModal({ type: 'board-create' })}>
                                        <Icon icon="plus" className="me-1" />Create Board
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <DragDropContext onDragEnd={onDragEnd}>
                                <div className="kanban-content bg-light bg-opacity-40" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', height: '100%', overflowX: 'auto', alignItems: 'stretch' }}>
                                    {(board.columns ?? []).map(col => {
                                        const cards       = filterCards(col.cards ?? []);
                                        const wipExceeded = col.wip_limit && cards.length > col.wip_limit;
                                        const countLabel  = col.wip_limit
                                            ? `${cards.length} OF ${col.wip_limit}`
                                            : cards.length;

                                        return (
                                            <Droppable key={col.id} droppableId={String(col.id)}>
                                                {(provided, snapshot) => (
                                                    <div className="kanban-board d-flex flex-column"
                                                        style={{ background: 'transparent', flex: '1 1 0', minWidth: 220, width: 'auto' }}>

                                                        {/* Column header */}
                                                        <div className="kanban-item py-2 px-3 d-flex align-items-center">
                                                            <h5 className={clsx('m-0', wipExceeded && 'text-danger')}>
                                                                {col.name}
                                                                <span className="text-muted fw-normal ms-1" style={{ fontSize: '0.9em' }}>
                                                                    ({col.wip_limit ? `${cards.length}/${col.wip_limit}` : cards.length})
                                                                </span>
                                                            </h5>
                                                            <Dropdown className="ms-auto">
                                                                <DropdownToggle className="btn btn-icon btn-sm btn-ghost-light text-muted drop-arrow-none">
                                                                    <Icon icon="dots-vertical" className="fs-lg" />
                                                                </DropdownToggle>
                                                                <DropdownMenu align="end">
                                                                    <DropdownItem onClick={() => handleAddCard(col)}>
                                                                        <Icon icon="plus" className="me-2" />Add Card
                                                                    </DropdownItem>
                                                                    <DropdownItem onClick={() => handleEditColumn(col)}>
                                                                        <Icon icon="edit" className="me-2" />Edit Column
                                                                    </DropdownItem>
                                                                    <DropdownItem className="text-danger" onClick={() => handleDeleteColumn(col)}>
                                                                        <Icon icon="trash" className="me-2" />Delete Column
                                                                    </DropdownItem>
                                                                </DropdownMenu>
                                                            </Dropdown>
                                                            <button className="btn btn-sm btn-icon rounded-circle btn-primary ms-1"
                                                                onClick={() => handleAddCard(col)}>
                                                                <Icon icon="plus" />
                                                            </button>
                                                        </div>

                                                        {/* Cards scrollable area — droppable ref on ul */}
                                                        <SimpleBar className="kanban-board-group px-2"
                                                            style={{ flex: '1 1 auto', backgroundColor: snapshot.isDraggingOver ? 'rgba(99,102,241,0.05)' : 'transparent', transition: 'background 0.15s' }}>
                                                            <ul ref={provided.innerRef} {...provided.droppableProps}
                                                                style={{ minHeight: 60, padding: 0, margin: 0 }}>
                                                                {cards.map((card, idx) => (
                                                                    <KanbanCardItem
                                                                        key={card.id}
                                                                        card={card}
                                                                        index={idx}
                                                                        onEdit={handleEditCard}
                                                                        onDelete={handleDeleteCard}
                                                                    />
                                                                ))}
                                                                {provided.placeholder}
                                                                {cards.length === 0 && !snapshot.isDraggingOver && (
                                                                    <li className="text-center py-5 text-muted" style={{ fontSize: '0.78rem', listStyle: 'none' }}>
                                                                        No cards yet
                                                                    </li>
                                                                )}
                                                            </ul>
                                                        </SimpleBar>

                                                        {/* + Create button */}
                                                        <div className="px-3 py-2 border-top" style={{ flexShrink: 0 }}>
                                                            <button className="btn btn-link btn-sm text-muted p-0 d-flex align-items-center gap-1"
                                                                style={{ fontSize: '0.8rem', textDecoration: 'none' }}
                                                                onClick={() => handleAddCard(col)}>
                                                                <Icon icon="plus" style={{ fontSize: 14 }} />
                                                                Create
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </Droppable>
                                        );
                                    })}

                                    {/* Add column — "+" ghost */}
                                    <div className="kanban-board d-flex align-items-start justify-content-center pt-3"
                                        style={{ background: 'transparent', cursor: 'pointer', flex: '0 0 auto', width: 52, minWidth: 52 }}
                                        onClick={() => setModal({ type: 'column-create' })}>
                                        <button className="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center"
                                            style={{ width: 32, height: 32 }}>
                                            <Icon icon="plus" />
                                        </button>
                                    </div>
                                </div>
                            </DragDropContext>
                        )}
                    </CardBody>

                </Card>
            </div>

            {/* ── Modals ── */}
            <BoardModal  show={modal?.type === 'board-create'} platforms={platforms} onHide={closeModal} onSave={saveModal} />
            <BoardModal  show={modal?.type === 'board-edit'}   board={modal?.board} platforms={platforms} onHide={closeModal} onSave={saveModal} />
            <ColumnModal show={modal?.type === 'column-create'} boardId={board?.id} onHide={closeModal} onSave={saveModal} />
            <ColumnModal show={modal?.type === 'column-edit'}   column={modal?.column} boardId={board?.id} onHide={closeModal} onSave={saveModal} />
            <CardModal   show={modal?.type === 'card-create' || modal?.type === 'card-create-quick'}
                         columnId={modal?.column?.id ?? board?.columns?.[0]?.id}
                         boardUsers={boardUsers}
                         onHide={closeModal} onSave={saveModal} />
            <CardModal   show={modal?.type === 'card-edit'}     card={modal?.card} boardUsers={boardUsers} onHide={closeModal} onSave={saveModal} />

            <DeleteConfirmationModal
                show={!!deleteTarget}
                onHide={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                itemName={deleteTarget?.type ?? 'item'}>
                Delete <strong>{deleteTarget?.item?.name ?? deleteTarget?.item?.title}</strong>?
                {deleteTarget?.type === 'column' && ' All cards in this column will also be deleted.'}
                {deleteTarget?.type === 'board'  && ' All columns and cards will also be deleted.'}
            </DeleteConfirmationModal>
        </>
    );
}
