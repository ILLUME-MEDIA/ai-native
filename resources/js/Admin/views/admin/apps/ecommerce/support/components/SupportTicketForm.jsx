import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * SupportTicketForm
 * -----------------
 * User-facing form to open a support ticket.
 * Flow:
 *   1. Optional: pick an order from recent orders
 *   2. If order picked: select affected items + modifiers
 *   3. Fill subject / category / priority
 *   4. Preview auto-generated message (editable)
 *   5. Submit → POST /api/ecommerce/support/tickets
 *
 * Props:
 *   bearerToken  — OTP Bearer token string (pass null for session-based)
 *   sessionId    — X-Session-Id header value (used when no bearerToken)
 *   onSuccess    — callback(ticket) when ticket is created
 *   onCancel     — callback when user dismisses the form
 */
export default function SupportTicketForm({ bearerToken, sessionId, onSuccess, onCancel }) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [step, setStep]                   = useState(1); // 1=order 2=items 3=details
    const [orders, setOrders]               = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedItems, setSelectedItems] = useState({}); // { orderItemId: {checked, modifiers:[]} }
    const [subject, setSubject]             = useState('');
    const [category, setCategory]           = useState('general');
    const [priority, setPriority]           = useState('medium');
    const [message, setMessage]             = useState('');
    const [submitting, setSubmitting]       = useState(false);
    const [error, setError]                 = useState(null);

    // ── Auth headers ──────────────────────────────────────────────────────────
    const authHeaders = useCallback(() => {
        const h = {};
        if (bearerToken) h['Authorization'] = `Bearer ${bearerToken}`;
        if (sessionId)   h['X-Session-Id']  = sessionId;
        return h;
    }, [bearerToken, sessionId]);

    // ── Load orders ───────────────────────────────────────────────────────────
    useEffect(() => {
        setOrdersLoading(true);
        axios.get('/api/ecommerce/my-orders', {
            headers: authHeaders(),
            params: { per_page: 20 },
        })
            .then(r => setOrders(r.data.data ?? []))
            .catch(() => setOrders([]))
            .finally(() => setOrdersLoading(false));
    }, [authHeaders]);

    // ── Auto-build preview message from selected items ────────────────────────
    useEffect(() => {
        if (!selectedOrder) return;

        const checkedItems = (selectedOrder.items ?? []).filter(item =>
            selectedItems[item.id]?.checked
        );

        if (checkedItems.length === 0) {
            setMessage('');
            return;
        }

        const lines = checkedItems.map(item => {
            const state = selectedItems[item.id] ?? {};
            const mods  = (state.modifiers ?? []).filter(Boolean);
            const qty   = (item.quantity ?? 1) > 1 ? ` x${item.quantity}` : '';
            const modStr = mods.length ? ` (${mods.join(', ')})` : '';
            return `- ${item.name}${qty}${modStr}`;
        });

        const orderNum = selectedOrder.order_number ?? '';
        setMessage(`Affected items:\n${lines.join('\n')}${orderNum ? `\n\n${orderNum}` : ''}`);
    }, [selectedItems, selectedOrder]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const toggleItem = (item) => {
        setSelectedItems(prev => {
            const cur = prev[item.id];
            if (cur?.checked) {
                const next = { ...prev };
                delete next[item.id];
                return next;
            }
            // Pre-fill modifiers from order item's saved modifiers
            const savedMods = Array.isArray(item.modifiers)
                ? item.modifiers.map(m => (typeof m === 'object' ? m.name ?? m.label ?? '' : m))
                : [];
            return { ...prev, [item.id]: { checked: true, modifiers: savedMods } };
        });
    };

    const toggleModifier = (itemId, mod) => {
        setSelectedItems(prev => {
            const cur  = prev[itemId] ?? { checked: true, modifiers: [] };
            const mods = cur.modifiers ?? [];
            const next = mods.includes(mod) ? mods.filter(m => m !== mod) : [...mods, mod];
            return { ...prev, [itemId]: { ...cur, modifiers: next } };
        });
    };

    const buildAffectedItems = () => {
        if (!selectedOrder) return undefined;
        return (selectedOrder.items ?? [])
            .filter(item => selectedItems[item.id]?.checked)
            .map(item => ({
                order_item_id: item.id,
                menu_item_id:  item.menu_item_id ?? null,
                name:          item.name,
                quantity:      item.quantity ?? 1,
                modifiers:     selectedItems[item.id]?.modifiers ?? [],
            }));
    };

    const handleSubmit = async () => {
        setError(null);
        if (!subject.trim()) { setError('Subject is required.'); return; }
        if (!message.trim() && Object.keys(selectedItems).length === 0) {
            setError('Select affected items or write a message.');
            return;
        }

        const affectedItems = buildAffectedItems();
        const body = {
            subject,
            category,
            priority,
            order_id:       selectedOrder?.id ?? undefined,
            affected_items: affectedItems?.length ? affectedItems : undefined,
            message:        message.trim() || undefined,
        };

        setSubmitting(true);
        try {
            const res = await axios.post('/api/ecommerce/support/tickets', body, {
                headers: authHeaders(),
            });
            onSuccess?.(res.data.ticket);
        } catch (e) {
            setError(e.response?.data?.message ?? 'Failed to create ticket. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Styles (dark theme) ───────────────────────────────────────────────────
    const s = {
        wrap:    { background: '#0d0f14', color: '#e2e8f0', fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto', borderRadius: 12, border: '1px solid #2a2d35', overflow: 'hidden' },
        header:  { background: '#161920', padding: '16px 20px', borderBottom: '1px solid #2a2d35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        title:   { margin: 0, fontSize: 17, fontWeight: 600 },
        steps:   { display: 'flex', gap: 8, padding: '12px 20px', borderBottom: '1px solid #1e2128', background: '#12141a' },
        stepBtn: (active, done) => ({
            padding: '4px 12px', borderRadius: 20, fontSize: 13, border: 'none', cursor: 'pointer',
            background: active ? '#ff6b35' : done ? '#1a2a1a' : '#1e2230',
            color: active ? '#fff' : done ? '#4ade80' : '#94a3b8',
            fontWeight: active ? 600 : 400,
        }),
        body:    { padding: 20 },
        label:   { display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6, fontWeight: 500 },
        input:   { width: '100%', background: '#1a1d24', border: '1px solid #2a2d35', color: '#e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' },
        select:  { width: '100%', background: '#1a1d24', border: '1px solid #2a2d35', color: '#e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', appearance: 'none' },
        textarea:{ width: '100%', background: '#1a1d24', border: '1px solid #2a2d35', color: '#e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, minHeight: 110, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace', lineHeight: 1.5 },
        row:     { marginBottom: 16 },
        orderCard: (sel) => ({
            border: `1px solid ${sel ? '#ff6b35' : '#2a2d35'}`, borderRadius: 8, padding: '10px 14px',
            cursor: 'pointer', marginBottom: 8, background: sel ? '#1a1208' : '#161920',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }),
        itemCard: (checked) => ({
            border: `1px solid ${checked ? '#ff6b35' : '#2a2d35'}`, borderRadius: 8, padding: '10px 14px',
            cursor: 'pointer', marginBottom: 8, background: checked ? '#1a1208' : '#161920',
        }),
        modBadge: (active) => ({
            display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
            marginRight: 6, marginTop: 6, border: `1px solid ${active ? '#ff6b35' : '#374151'}`,
            background: active ? '#2a1200' : '#1e2230', color: active ? '#ff6b35' : '#94a3b8',
        }),
        btn:     (primary) => ({
            padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            background: primary ? '#ff6b35' : '#1e2230', color: '#fff',
        }),
        footer:  { padding: '12px 20px', borderTop: '1px solid #2a2d35', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
        error:   { background: '#2a1215', border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 12 },
        badge:   (color) => ({ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: color === 'green' ? '#14532d' : color === 'yellow' ? '#713f12' : '#1e3a5f', color: color === 'green' ? '#4ade80' : color === 'yellow' ? '#fbbf24' : '#60a5fa' }),
    };

    const statusColor = (s) => s === 'delivered' || s === 'completed' ? 'green' : s === 'pending' || s === 'processing' ? 'yellow' : 'blue';

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div style={s.wrap}>
            {/* Header */}
            <div style={s.header}>
                <h3 style={s.title}>Open Support Ticket</h3>
                {onCancel && (
                    <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>×</button>
                )}
            </div>

            {/* Step tabs */}
            <div style={s.steps}>
                <button style={s.stepBtn(step === 1, step > 1)} onClick={() => setStep(1)}>1. Order</button>
                <button style={s.stepBtn(step === 2, step > 2)} onClick={() => selectedOrder && setStep(2)} disabled={!selectedOrder}>2. Items</button>
                <button style={s.stepBtn(step === 3, false)} onClick={() => setStep(3)}>3. Details</button>
            </div>

            <div style={s.body}>
                {error && <div style={s.error}>{error}</div>}

                {/* ── Step 1: Pick Order ─────────────────────────────────────── */}
                {step === 1 && (
                    <div>
                        <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 0 }}>
                            Select the order this ticket is about, or skip to open a general ticket.
                        </p>
                        {ordersLoading && <p style={{ color: '#64748b', fontSize: 13 }}>Loading orders…</p>}
                        {orders.map(order => (
                            <div
                                key={order.id}
                                style={s.orderCard(selectedOrder?.id === order.id)}
                                onClick={() => {
                                    setSelectedOrder(order);
                                    setSelectedItems({});
                                    setStep(2);
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{order.order_number}</div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                                        {order.items?.length ?? 0} item{order.items?.length !== 1 ? 's' : ''} · ${parseFloat(order.total ?? 0).toFixed(2)}
                                    </div>
                                </div>
                                <span style={s.badge(statusColor(order.status))}>{order.status}</span>
                            </div>
                        ))}
                        {!ordersLoading && orders.length === 0 && (
                            <p style={{ color: '#64748b', fontSize: 13 }}>No orders found.</p>
                        )}
                        <div style={{ marginTop: 16 }}>
                            <button style={s.btn(false)} onClick={() => { setSelectedOrder(null); setSelectedItems({}); setStep(3); }}>
                                Skip — General Issue
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 2: Select Items ───────────────────────────────────── */}
                {step === 2 && selectedOrder && (
                    <div>
                        <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 0 }}>
                            Select which items are affected. Tap modifiers to include/exclude them.
                        </p>
                        {(selectedOrder.items ?? []).map(item => {
                            const state   = selectedItems[item.id];
                            const checked = !!state?.checked;
                            // Collect available modifier names from the order item
                            const availableMods = Array.isArray(item.modifiers)
                                ? item.modifiers.map(m => typeof m === 'object' ? (m.name ?? m.label ?? '') : m).filter(Boolean)
                                : [];

                            return (
                                <div key={item.id} style={s.itemCard(checked)}>
                                    <div onClick={() => toggleItem(item)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>
                                                {checked ? '✓ ' : ''}{item.name}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                                                Qty: {item.quantity ?? 1} · ${parseFloat(item.subtotal ?? item.price ?? 0).toFixed(2)}
                                            </div>
                                        </div>
                                        <div style={{
                                            width: 20, height: 20, borderRadius: 4,
                                            border: `2px solid ${checked ? '#ff6b35' : '#374151'}`,
                                            background: checked ? '#ff6b35' : 'transparent',
                                            flexShrink: 0, marginTop: 2,
                                        }} />
                                    </div>

                                    {/* Modifier chips — only shown when item is checked */}
                                    {checked && availableMods.length > 0 && (
                                        <div style={{ marginTop: 10, borderTop: '1px solid #2a2d35', paddingTop: 8 }}>
                                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Modifiers (tap to include):</div>
                                            {availableMods.map(mod => {
                                                const active = (state?.modifiers ?? []).includes(mod);
                                                return (
                                                    <span key={mod} style={s.modBadge(active)} onClick={() => toggleModifier(item.id, mod)}>
                                                        {active ? '✓ ' : ''}{mod}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Message preview */}
                        {message && (
                            <div style={{ marginTop: 16 }}>
                                <label style={s.label}>Message preview</label>
                                <pre style={{ ...s.input, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', color: '#94a3b8', padding: '10px 12px', borderRadius: 8, margin: 0 }}>
                                    {message}
                                </pre>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Step 3: Ticket Details ─────────────────────────────────── */}
                {step === 3 && (
                    <div>
                        <div style={s.row}>
                            <label style={s.label}>Subject *</label>
                            <input
                                style={s.input}
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder="e.g. I would like to request a refund"
                                maxLength={200}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                            <div style={{ flex: 1 }}>
                                <label style={s.label}>Category</label>
                                <select style={s.select} value={category} onChange={e => setCategory(e.target.value)}>
                                    <option value="general">General</option>
                                    <option value="refund">Refund</option>
                                    <option value="delivery">Delivery</option>
                                    <option value="quality">Quality</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={s.label}>Priority</label>
                                <select style={s.select} value={priority} onChange={e => setPriority(e.target.value)}>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                        </div>

                        <div style={s.row}>
                            <label style={s.label}>
                                Message {!Object.keys(selectedItems).length && '*'}
                                <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 6 }}>
                                    {message && selectedOrder ? '(auto-generated from selected items — editable)' : ''}
                                </span>
                            </label>
                            <textarea
                                style={s.textarea}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Describe your issue…"
                                maxLength={2000}
                            />
                            <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right', marginTop: 4 }}>
                                {message.length}/2000
                            </div>
                        </div>

                        {/* Summary chip */}
                        {(selectedOrder || Object.keys(selectedItems).length > 0) && (
                            <div style={{ background: '#12141a', border: '1px solid #2a2d35', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 4 }}>
                                {selectedOrder && <span style={{ color: '#94a3b8' }}>Order: <strong style={{ color: '#e2e8f0' }}>{selectedOrder.order_number}</strong></span>}
                                {Object.keys(selectedItems).length > 0 && (
                                    <span style={{ color: '#94a3b8', marginLeft: selectedOrder ? 16 : 0 }}>
                                        Affected items: <strong style={{ color: '#ff6b35' }}>{Object.keys(selectedItems).length}</strong>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer nav */}
            <div style={s.footer}>
                <div style={{ display: 'flex', gap: 8 }}>
                    {step > 1 && (
                        <button style={s.btn(false)} onClick={() => setStep(s => s - 1)}>← Back</button>
                    )}
                    {onCancel && step === 1 && (
                        <button style={s.btn(false)} onClick={onCancel}>Cancel</button>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    {step === 1 && (
                        <button style={s.btn(true)} onClick={() => setStep(3)}>Skip to Details →</button>
                    )}
                    {step === 2 && (
                        <button style={s.btn(true)} onClick={() => setStep(3)}>Next: Details →</button>
                    )}
                    {step === 3 && (
                        <button style={s.btn(true)} onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'Submitting…' : 'Submit Ticket'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
