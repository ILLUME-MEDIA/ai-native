import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const api = (path, options = {}) => axios({ url: `/api/admin/kanban/${path}`, ...options });

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Btn({ onClick, disabled, variant = 'primary', size = 'sm', children, type = 'button' }) {
    const v = {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
        danger:  'bg-red-600 text-white hover:bg-red-500',
        ghost:   'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
        success: 'bg-green-600 text-white hover:bg-green-500',
        flat:    'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
    };
    const s = size === 'xs' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs';
    return (
        <button type={type} onClick={onClick} disabled={disabled}
            className={`inline-flex items-center gap-1 font-semibold rounded-md transition disabled:opacity-50 ${v[variant]} ${s}`}>
            {children}
        </button>
    );
}

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-lg max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
                </div>
                <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            {children}
        </div>
    );
}

function Input({ value, onChange, placeholder, type = 'text' }) {
    return (
        <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
    return (
        <textarea value={value ?? ''} onChange={onChange} placeholder={placeholder} rows={rows}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
    );
}

// ── Priority colors ───────────────────────────────────────────────────────────

const PRIORITY = {
    low:    { label: 'Low',    cls: 'bg-gray-100 text-gray-600' },
    medium: { label: 'Medium', cls: 'bg-blue-100 text-blue-700' },
    high:   { label: 'High',   cls: 'bg-orange-100 text-orange-700' },
    urgent: { label: 'Urgent', cls: 'bg-red-100 text-red-700' },
};

function PriorityBadge({ p }) {
    const c = PRIORITY[p] ?? PRIORITY.medium;
    return <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${c.cls}`}>{c.label}</span>;
}

// ── Card Component ────────────────────────────────────────────────────────────

function KanbanCard({ card, index, onEdit, onDelete }) {
    const isOverdue = card.due_date && new Date(card.due_date) < new Date() && card.status !== 'done';
    return (
        <Draggable draggableId={String(card.id)} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`bg-white rounded-lg border shadow-sm p-3 mb-2 cursor-grab active:cursor-grabbing select-none transition-shadow ${
                        snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-400 rotate-1' : 'hover:shadow-md border-gray-200'
                    }`}>
                    {/* Labels */}
                    {card.labels?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {card.labels.map((l, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-600">{l}</span>
                            ))}
                        </div>
                    )}

                    <p className="text-sm font-medium text-gray-900 mb-1 leading-tight">{card.title}</p>

                    {card.description && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{card.description}</p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                        <PriorityBadge p={card.priority} />
                        <div className="flex items-center gap-2">
                            {card.due_date && (
                                <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                    📅 {card.due_date}
                                </span>
                            )}
                            {card.assignee && (
                                <span className="text-xs text-gray-400 truncate max-w-[80px]" title={card.assignee}>
                                    👤 {card.assignee}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(card)}
                            className="text-xs text-indigo-600 hover:underline">Edit</button>
                        <span className="text-gray-200">|</span>
                        <button onClick={() => onDelete(card)}
                            className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                    {/* Always show edit/delete on hover via parent */}
                </div>
            )}
        </Draggable>
    );
}

// Override: show actions always on small screens
function KanbanCardWrapper({ card, index, onEdit, onDelete }) {
    const isOverdue = card.due_date && new Date(card.due_date) < new Date();
    const isMeeting = card.is_meeting_card;
    const meetingUrl = card.metadata?.meeting_url;
    const attendeeEmail = card.metadata?.attendee_email;

    return (
        <Draggable draggableId={String(card.id)} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`rounded-lg border shadow-sm p-3 mb-2 select-none transition-all group ${
                        isMeeting ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'
                    } ${
                        snapshot.isDragging
                            ? 'shadow-xl ring-2 ring-indigo-400 rotate-1 scale-105'
                            : 'hover:shadow-md cursor-grab active:cursor-grabbing'
                    }`}>

                    {/* Meeting badge */}
                    {isMeeting && (
                        <div className="flex items-center gap-1 mb-2">
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">📅 Cal Meeting</span>
                        </div>
                    )}

                    {card.labels?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {card.labels.map((l, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-600">{l}</span>
                            ))}
                        </div>
                    )}

                    <p className="text-sm font-medium text-gray-900 mb-1 leading-tight">{card.title}</p>

                    {card.description && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{card.description}</p>
                    )}

                    {/* Meeting-specific info */}
                    {isMeeting && (
                        <div className="mb-2 space-y-1">
                            {attendeeEmail && (
                                <p className="text-xs text-indigo-600 truncate" title={attendeeEmail}>✉️ {attendeeEmail}</p>
                            )}
                            {meetingUrl && (
                                <a href={meetingUrl} target="_blank" rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline truncate block">
                                    🔗 Join Meeting
                                </a>
                            )}
                        </div>
                    )}

                    <div className="flex items-center justify-between flex-wrap gap-1">
                        <PriorityBadge p={card.priority} />
                        <div className="flex items-center gap-2">
                            {card.due_date && (
                                <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                    📅 {card.due_date}
                                </span>
                            )}
                            {card.assignee && (
                                <span className="text-xs text-gray-400" title={card.assignee}>👤 {card.assignee.split(' ')[0]}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                        {isMeeting ? (
                            <span className="text-xs text-gray-400 italic">Read-only (drag to move)</span>
                        ) : (
                            <button onClick={() => onEdit(card)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                        )}
                        <button onClick={() => onDelete(card)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium ml-auto">Delete</button>
                    </div>
                </div>
            )}
        </Draggable>
    );
}

// ── Column ────────────────────────────────────────────────────────────────────

function KanbanColumnComp({ column, cards, onAddCard, onEditCard, onDeleteCard, onEditColumn, onDeleteColumn }) {
    const wipExceeded = column.wip_limit && cards.length > column.wip_limit;
    return (
        <div className="flex-shrink-0 w-72">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: column.color || '#e5e7eb' }} />
                    <span className="text-sm font-semibold text-gray-800">{column.name}</span>
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded-full ${wipExceeded ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                        {cards.length}{column.wip_limit ? `/${column.wip_limit}` : ''}
                    </span>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => onEditColumn(column)} className="text-gray-400 hover:text-gray-700 text-xs p-1 rounded">✏️</button>
                    <button onClick={() => onDeleteColumn(column)} className="text-gray-400 hover:text-red-500 text-xs p-1 rounded">🗑️</button>
                </div>
            </div>

            {/* Droppable area */}
            <Droppable droppableId={String(column.id)}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[120px] rounded-xl p-2 transition-colors ${
                            snapshot.isDraggingOver ? 'bg-indigo-50 border-2 border-dashed border-indigo-300' : 'bg-gray-100 border-2 border-transparent'
                        }`}>
                        {cards.map((card, idx) => (
                            <KanbanCardWrapper
                                key={card.id}
                                card={card}
                                index={idx}
                                onEdit={onEditCard}
                                onDelete={onDeleteCard}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

            {/* Add card button */}
            <button onClick={() => onAddCard(column)}
                className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border-2 border-dashed border-gray-200 hover:border-indigo-300 transition-colors">
                + Add card
            </button>
        </div>
    );
}

// ── Board Modal ───────────────────────────────────────────────────────────────

function BoardModal({ board, onClose, onSave }) {
    const [form, setForm]         = useState(board ?? { name: '', description: '', color: '#6366f1', is_active: true, cal_platform_id: '' });
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState('');
    const [calPlatforms, setCalPlatforms] = useState([]);

    useEffect(() => {
        axios.get('/api/admin/cal/platforms').then(r => setCalPlatforms(r.data)).catch(() => {});
    }, []);

    const save = async () => {
        setSaving(true); setError('');
        try {
            const payload = { ...form, cal_platform_id: form.cal_platform_id || null };
            if (board) {
                await api(`boards/${board.id}`, { method: 'PUT', data: payload });
            } else {
                await api('boards', { method: 'POST', data: payload });
            }
            onSave();
        } catch (e) {
            setError(e.response?.data?.message || 'Error');
        } finally {
            setSaving(false);
        }
    };

    const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

    return (
        <Modal title={board ? 'Edit Board' : 'Create Board'} onClose={onClose}>
            <div className="space-y-4">
                <Field label="Board Name *">
                    <Input value={form.name} onChange={f('name')} placeholder="My Kanban Board" />
                </Field>
                <Field label="Description">
                    <Textarea value={form.description} onChange={f('description')} placeholder="Optional description" />
                </Field>
                <Field label="Link to Cal.com Platform (optional)">
                    <select value={form.cal_platform_id ?? ''} onChange={f('cal_platform_id')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">— None (manual board) —</option>
                        {calPlatforms.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    {form.cal_platform_id && (
                        <p className="text-xs text-indigo-600 mt-1">New Cal.com bookings from this platform will auto-create cards in the first column.</p>
                    )}
                </Field>
                <Field label="Color">
                    <div className="flex gap-2">
                        <input type="color" value={form.color || '#6366f1'} onChange={f('color')} className="w-10 h-9 rounded border border-gray-300" />
                        <Input value={form.color} onChange={f('color')} placeholder="#6366f1" />
                    </div>
                </Field>
                <Field label="">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="rounded" />
                        Active
                    </label>
                </Field>
                {error && <p className="text-red-500 text-xs bg-red-50 p-3 rounded-lg">{error}</p>}
                <div className="flex justify-end gap-2 pt-2 border-t">
                    <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
                    <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
                </div>
            </div>
        </Modal>
    );
}

// ── Column Modal ──────────────────────────────────────────────────────────────

function ColumnModal({ column, boardId, onClose, onSave }) {
    const [form, setForm] = useState(column ?? { name: '', color: '#e5e7eb', wip_limit: '' });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            if (column) {
                await api(`columns/${column.id}`, { method: 'PUT', data: form });
            } else {
                await api(`boards/${boardId}/columns`, { method: 'POST', data: form });
            }
            onSave();
        } catch (e) {
            alert(e.response?.data?.message || 'Error');
        } finally {
            setSaving(false);
        }
    };

    const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

    return (
        <Modal title={column ? 'Edit Column' : 'Add Column'} onClose={onClose}>
            <div className="space-y-4">
                <Field label="Column Name *">
                    <Input value={form.name} onChange={f('name')} placeholder="In Progress" />
                </Field>
                <Field label="Color">
                    <div className="flex gap-2">
                        <input type="color" value={form.color || '#e5e7eb'} onChange={f('color')} className="w-10 h-9 rounded border border-gray-300" />
                        <Input value={form.color} onChange={f('color')} placeholder="#e5e7eb" />
                    </div>
                </Field>
                <Field label="WIP Limit (optional)">
                    <Input value={form.wip_limit} onChange={f('wip_limit')} type="number" placeholder="Max cards (leave blank for unlimited)" />
                </Field>
                <div className="flex justify-end gap-2 pt-2 border-t">
                    <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
                    <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
                </div>
            </div>
        </Modal>
    );
}

// ── Card Modal ────────────────────────────────────────────────────────────────

const EMPTY_CARD = { title: '', description: '', priority: 'medium', due_date: '', assignee: '', labels: [] };

function CardModal({ card, columnId, onClose, onSave }) {
    const [form, setForm]     = useState(card ?? EMPTY_CARD);
    const [labelInput, setLabelInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    const save = async () => {
        setSaving(true); setError('');
        try {
            if (card) {
                await api(`cards/${card.id}`, { method: 'PUT', data: form });
            } else {
                await api(`columns/${columnId}/cards`, { method: 'POST', data: form });
            }
            onSave();
        } catch (e) {
            setError(e.response?.data?.message || 'Error');
        } finally {
            setSaving(false);
        }
    };

    const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

    const addLabel = () => {
        if (!labelInput.trim()) return;
        setForm(p => ({ ...p, labels: [...(p.labels || []), labelInput.trim()] }));
        setLabelInput('');
    };

    const removeLabel = (i) => setForm(p => ({ ...p, labels: p.labels.filter((_, idx) => idx !== i) }));

    return (
        <Modal title={card ? 'Edit Card' : 'Add Card'} onClose={onClose}>
            <div className="space-y-4">
                <Field label="Title *">
                    <Input value={form.title} onChange={f('title')} placeholder="Card title" />
                </Field>
                <Field label="Description">
                    <Textarea value={form.description} onChange={f('description')} placeholder="Details…" rows={3} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Priority">
                        <select value={form.priority} onChange={f('priority')}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </Field>
                    <Field label="Due Date">
                        <Input value={form.due_date} onChange={f('due_date')} type="date" />
                    </Field>
                </div>
                <Field label="Assignee">
                    <Input value={form.assignee} onChange={f('assignee')} placeholder="Name or email" />
                </Field>
                <Field label="Labels">
                    <div className="flex gap-2 mb-2">
                        <input value={labelInput} onChange={e => setLabelInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLabel())}
                            placeholder="Add label…"
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <Btn variant="ghost" onClick={addLabel}>Add</Btn>
                    </div>
                    {form.labels?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {form.labels.map((l, i) => (
                                <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                                    {l}
                                    <button onClick={() => removeLabel(i)} className="text-indigo-400 hover:text-indigo-700 leading-none">&times;</button>
                                </span>
                            ))}
                        </div>
                    )}
                </Field>
                {error && <p className="text-red-500 text-xs bg-red-50 p-3 rounded-lg">{error}</p>}
                <div className="flex justify-end gap-2 pt-2 border-t">
                    <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
                    <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
                </div>
            </div>
        </Modal>
    );
}

// ── Board Selector ────────────────────────────────────────────────────────────

function BoardSelector({ boards, selected, onSelect, onCreateBoard }) {
    return (
        <div className="flex items-center gap-3 flex-wrap">
            {boards.map(b => (
                <button key={b.id} onClick={() => onSelect(b)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition border ${
                        selected?.id === b.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                    }`}>
                    <span className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                    {b.name}
                    <span className="text-xs opacity-70">({b.cards_count})</span>
                    {b.cal_platform_id && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-normal">📅 Cal</span>
                    )}
                </button>
            ))}
            <Btn onClick={onCreateBoard} variant="ghost">+ New Board</Btn>
        </div>
    );
}

// ── Main Kanban Page ──────────────────────────────────────────────────────────

export default function KanbanIndex() {
    const [boards, setBoards]     = useState([]);
    const [board, setBoard]       = useState(null);   // active board with columns + cards
    const [loading, setLoading]   = useState(false);
    const [modal, setModal]       = useState(null);   // { type, data }

    // Load all boards
    const loadBoards = useCallback(async () => {
        const { data } = await api('boards');
        setBoards(data);
        return data;
    }, []);

    // Load a single board with columns + cards
    const loadBoard = useCallback(async (id) => {
        setLoading(true);
        const { data } = await api(`boards/${id}`);
        setBoard(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadBoards().then(bs => {
            if (bs.length > 0) loadBoard(bs[0].id);
        });
    }, [loadBoards, loadBoard]);

    const refreshBoard = () => { loadBoards(); if (board) loadBoard(board.id); };

    // ── Drag and Drop ──────────────────────────────────────────────────────────

    const onDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const cardId   = parseInt(draggableId, 10);
        const newColId = parseInt(destination.droppableId, 10);

        // Optimistic update
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

        // Persist to backend
        try {
            await api(`cards/${cardId}/move`, {
                method: 'PATCH',
                data: { column_id: newColId, position: destination.index },
            });
        } catch {
            // Revert on error
            loadBoard(board.id);
        }
    };

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleAddCard     = (col)  => setModal({ type: 'card-create', column: col });
    const handleEditCard    = (card) => setModal({ type: 'card-edit', card });
    const handleDeleteCard  = async (card) => {
        if (!confirm(`Delete card "${card.title}"?`)) return;
        await api(`cards/${card.id}`, { method: 'DELETE' });
        refreshBoard();
    };
    const handleEditColumn  = (col)  => setModal({ type: 'column-edit', column: col });
    const handleDeleteColumn = async (col) => {
        if (!confirm(`Delete column "${col.name}" and all its cards?`)) return;
        await api(`columns/${col.id}`, { method: 'DELETE' });
        refreshBoard();
    };

    const handleSelectBoard  = (b)   => loadBoard(b.id);
    const handleCreateBoard  = ()    => setModal({ type: 'board-create' });
    const handleEditBoard    = ()    => { if (board) setModal({ type: 'board-edit', board }); };
    const handleDeleteBoard  = async () => {
        if (!board || !confirm(`Delete board "${board.name}" and everything in it?`)) return;
        await api(`boards/${board.id}`, { method: 'DELETE' });
        setBoard(null);
        loadBoards().then(bs => { if (bs.length > 0) loadBoard(bs[0].id); });
    };

    const closeModal = () => setModal(null);
    const saveModal  = () => { closeModal(); refreshBoard(); };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Kanban Board</h1>
                        <p className="text-gray-500 text-sm mt-1">Drag & drop cards between columns to update status.</p>
                    </div>
                    {board && (
                        <div className="flex gap-2">
                            <Btn variant="ghost" onClick={handleEditBoard}>✏️ Edit Board</Btn>
                            <Btn variant="ghost" onClick={() => setModal({ type: 'column-create' })}>+ Column</Btn>
                            <Btn variant="danger" onClick={handleDeleteBoard}>Delete Board</Btn>
                        </div>
                    )}
                </div>

                {/* Board Selector */}
                <div className="mb-6">
                    <BoardSelector
                        boards={boards}
                        selected={board}
                        onSelect={handleSelectBoard}
                        onCreateBoard={handleCreateBoard}
                    />
                </div>

                {/* Board Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-24 text-gray-400">
                        <div className="text-center">
                            <div className="text-4xl mb-3 animate-bounce">🔄</div>
                            <p className="text-sm">Loading board…</p>
                        </div>
                    </div>
                ) : !board ? (
                    <div className="flex items-center justify-center py-24 text-gray-400">
                        <div className="text-center">
                            <div className="text-5xl mb-4">📋</div>
                            <p className="text-lg font-medium text-gray-500">No board selected</p>
                            <p className="text-sm mt-1">Create a new board to get started</p>
                            <div className="mt-4">
                                <Btn onClick={handleCreateBoard}>+ Create Board</Btn>
                            </div>
                        </div>
                    </div>
                ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex gap-4 overflow-x-auto pb-6" style={{ minHeight: '70vh' }}>
                            {(board.columns ?? []).map(col => {
                                const cards = col.cards ?? [];
                                return (
                                    <KanbanColumnComp
                                        key={col.id}
                                        column={col}
                                        cards={cards}
                                        onAddCard={handleAddCard}
                                        onEditCard={handleEditCard}
                                        onDeleteCard={handleDeleteCard}
                                        onEditColumn={handleEditColumn}
                                        onDeleteColumn={handleDeleteColumn}
                                    />
                                );
                            })}
                            {/* Add column button */}
                            <div className="flex-shrink-0 w-72">
                                <button onClick={() => setModal({ type: 'column-create' })}
                                    className="w-full h-24 border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl text-gray-400 hover:text-indigo-600 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                    + Add Column
                                </button>
                            </div>
                        </div>
                    </DragDropContext>
                )}
            </div>

            {/* Modals */}
            {modal?.type === 'board-create' && (
                <BoardModal onClose={closeModal} onSave={saveModal} />
            )}
            {modal?.type === 'board-edit' && (
                <BoardModal board={modal.board} onClose={closeModal} onSave={saveModal} />
            )}
            {modal?.type === 'column-create' && (
                <ColumnModal boardId={board?.id} onClose={closeModal} onSave={saveModal} />
            )}
            {modal?.type === 'column-edit' && (
                <ColumnModal column={modal.column} boardId={board?.id} onClose={closeModal} onSave={saveModal} />
            )}
            {modal?.type === 'card-create' && (
                <CardModal columnId={modal.column?.id} onClose={closeModal} onSave={saveModal} />
            )}
            {modal?.type === 'card-edit' && (
                <CardModal card={modal.card} onClose={closeModal} onSave={saveModal} />
            )}
        </div>
    );
}
