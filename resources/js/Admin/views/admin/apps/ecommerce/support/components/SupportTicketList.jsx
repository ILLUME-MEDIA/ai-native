import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * SupportTicketList
 * -----------------
 * User-facing list of their support tickets.
 * Shows unread badge, status, category, last message preview.
 * Click → opens SupportChat.
 *
 * Props:
 *   bearerToken  — OTP Bearer token (null for session-based)
 *   sessionId    — X-Session-Id header (null if using bearerToken)
 *   onOpenChat   — callback(ticketId) — caller shows SupportChat
 *   onNewTicket  — callback() — caller shows SupportTicketForm
 *   refreshKey   — increment this to force re-fetch (e.g. after creating a ticket)
 */
export default function SupportTicketList({ bearerToken, sessionId, onOpenChat, onNewTicket, refreshKey }) {
    const [tickets, setTickets]   = useState([]);
    const [loading, setLoading]   = useState(true);
    const [page, setPage]         = useState(1);
    const [lastPage, setLastPage] = useState(1);

    const authHeaders = useCallback(() => {
        const h = { Accept: 'application/json' };
        if (bearerToken) h['Authorization'] = `Bearer ${bearerToken}`;
        if (sessionId)   h['X-Session-Id']  = sessionId;
        return h;
    }, [bearerToken, sessionId]);

    const load = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await axios.get('/api/ecommerce/support/tickets', {
                headers: authHeaders(),
                params:  { per_page: 20, page: p },
            });
            const data = res.data;
            setTickets(data.data ?? []);
            setLastPage(data.last_page ?? 1);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [authHeaders]);

    useEffect(() => { setPage(1); load(1); }, [load, refreshKey]);

    const goPage = (p) => { setPage(p); load(p); };

    // ── Styles ────────────────────────────────────────────────────────────────
    const statusInfo = {
        open:        { label: 'Open',        bg: '#1e3a5f', text: '#60a5fa' },
        in_progress: { label: 'In Progress', bg: '#713f12', text: '#fbbf24' },
        resolved:    { label: 'Resolved',    bg: '#14532d', text: '#4ade80' },
        closed:      { label: 'Closed',      bg: '#1c1c1c', text: '#6b7280' },
    };

    const categoryIcon = {
        refund:   '💳',
        delivery: '🚚',
        quality:  '⭐',
        general:  '💬',
        other:    '📋',
    };

    return (
        <div style={{ background: '#0d0f14', color: '#e2e8f0', fontFamily: 'sans-serif', borderRadius: 12, border: '1px solid #2a2d35', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ background: '#161920', padding: '14px 18px', borderBottom: '1px solid #2a2d35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>My Support Tickets</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {loading ? 'Loading…' : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`}
                    </div>
                </div>
                {onNewTicket && (
                    <button
                        onClick={onNewTicket}
                        style={{ background: '#ff6b35', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                        + New Ticket
                    </button>
                )}
            </div>

            {/* List */}
            <div>
                {loading && (
                    <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                        Loading…
                    </div>
                )}

                {!loading && tickets.length === 0 && (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
                        <div style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>
                            No tickets yet. Need help with an order?
                        </div>
                        {onNewTicket && (
                            <button
                                onClick={onNewTicket}
                                style={{ background: '#ff6b35', border: 'none', color: '#fff', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                            >
                                Open a Support Ticket
                            </button>
                        )}
                    </div>
                )}

                {!loading && tickets.map((ticket, idx) => {
                    const si         = statusInfo[ticket.status] ?? statusInfo.open;
                    const lastMsg    = ticket.latest_message?.[0] ?? null;
                    const isUnread   = (ticket.unread_user ?? 0) > 0;
                    const catIcon    = categoryIcon[ticket.category] ?? '📋';
                    const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';

                    return (
                        <div
                            key={ticket.id}
                            onClick={() => onOpenChat?.(ticket.id)}
                            style={{
                                borderBottom: idx < tickets.length - 1 ? '1px solid #1e2128' : 'none',
                                padding: '14px 18px',
                                cursor: 'pointer',
                                background: isUnread ? '#0f1520' : 'transparent',
                                display: 'flex',
                                gap: 14,
                                alignItems: 'flex-start',
                                transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#161920'}
                            onMouseLeave={e => e.currentTarget.style.background = isUnread ? '#0f1520' : 'transparent'}
                        >
                            {/* Category icon */}
                            <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{catIcon}</div>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                                    <div style={{ fontWeight: isUnread ? 700 : 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                        {ticket.subject}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                                        {isUnread && (
                                            <span style={{ background: '#ff6b35', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                                                {ticket.unread_user}
                                            </span>
                                        )}
                                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: si.bg, color: si.text }}>
                                            {si.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Last message preview */}
                                {lastMsg ? (
                                    <div style={{ fontSize: 13, color: isUnread ? '#94a3b8' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                                        {lastMsg.sender_type === 'admin' ? '⬅ Support: ' : 'You: '}
                                        {lastMsg.message}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>No messages yet.</div>
                                )}

                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <span style={{ fontSize: 11, color: '#374151' }}>#{ticket.ticket_number}</span>
                                    {ticket.order && (
                                        <span style={{ fontSize: 11, color: '#374151' }}>Order: {ticket.order.order_number}</span>
                                    )}
                                    <span style={{ fontSize: 11, color: '#374151', marginLeft: 'auto' }}>
                                        {ticket.updated_at ? new Date(ticket.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                    </span>
                                </div>

                                {/* Resolved note pill */}
                                {isResolved && ticket.resolution_note && (
                                    <div style={{ marginTop: 6, background: '#0f2318', border: '1px solid #166534', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#4ade80', display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span>✓</span>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.resolution_note}</span>
                                    </div>
                                )}
                            </div>

                            {/* Arrow */}
                            <div style={{ color: '#374151', fontSize: 16, flexShrink: 0, marginTop: 2 }}>›</div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            {lastPage > 1 && (
                <div style={{ padding: '10px 18px', borderTop: '1px solid #2a2d35', background: '#161920', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                        onClick={() => goPage(page - 1)}
                        disabled={page <= 1}
                        style={{ background: 'none', border: '1px solid #2a2d35', color: page <= 1 ? '#374151' : '#94a3b8', borderRadius: 6, padding: '4px 12px', cursor: page <= 1 ? 'default' : 'pointer', fontSize: 13 }}
                    >
                        ← Prev
                    </button>
                    <span style={{ fontSize: 13, color: '#64748b' }}>{page} / {lastPage}</span>
                    <button
                        onClick={() => goPage(page + 1)}
                        disabled={page >= lastPage}
                        style={{ background: 'none', border: '1px solid #2a2d35', color: page >= lastPage ? '#374151' : '#94a3b8', borderRadius: 6, padding: '4px 12px', cursor: page >= lastPage ? 'default' : 'pointer', fontSize: 13 }}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
