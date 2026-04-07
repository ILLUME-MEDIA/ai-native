import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

/**
 * SupportChat
 * -----------
 * User-facing ticket conversation view with real-time admin replies.
 *
 * Features:
 * - Loads ticket + messages on mount
 * - Listens on Pusher channel "support.ticket.{id}" for admin replies
 * - Falls back to polling every 4s if Pusher not configured
 * - Marks messages as read automatically (calls GET /show)
 * - Blocks input if ticket is resolved/closed
 *
 * Props:
 *   ticketId    — integer
 *   bearerToken — OTP Bearer token string (null for session-based)
 *   sessionId   — X-Session-Id header (null if using bearerToken)
 *   onBack      — callback to go back to ticket list
 */
export default function SupportChat({ ticketId, bearerToken, sessionId, onBack }) {
    const [ticket, setTicket]     = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText]         = useState('');
    const [sending, setSending]   = useState(false);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);
    const bottomRef               = useRef(null);
    const lastMsgIdRef            = useRef(null);

    // ── Auth headers ──────────────────────────────────────────────────────────
    const headers = useCallback(() => {
        const h = { Accept: 'application/json', 'Content-Type': 'application/json' };
        if (bearerToken) h['Authorization'] = `Bearer ${bearerToken}`;
        if (sessionId)   h['X-Session-Id']  = sessionId;
        return h;
    }, [bearerToken, sessionId]);

    // ── Load / refresh ticket ─────────────────────────────────────────────────
    const loadTicket = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await axios.get(`/api/ecommerce/support/tickets/${ticketId}`, { headers: headers() });
            const t   = res.data;
            setTicket(t);
            setMessages(t.messages ?? []);
            lastMsgIdRef.current = (t.messages ?? []).at(-1)?.id ?? null;
        } catch (e) {
            setError(e.response?.data?.message ?? 'Failed to load ticket.');
        } finally {
            setLoading(false);
        }
    }, [ticketId, headers]);

    useEffect(() => { loadTicket(); }, [loadTicket]);

    // ── Auto-scroll on new message ────────────────────────────────────────────
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Real-time: Pusher OR polling fallback ─────────────────────────────────
    useEffect(() => {
        if (!ticketId) return;

        // WebSocket path (Pusher configured)
        if (window.Echo) {
            const ch = window.Echo.channel(`support.ticket.${ticketId}`);

            ch.listen('.message.sent', (e) => {
                // Only append admin messages (user's own go via optimistic update)
                if (e.message?.sender_type !== 'admin') return;
                setMessages(prev => {
                    if (prev.some(m => m.id === e.message.id)) return prev;
                    return [...prev, e.message];
                });
                setTicket(prev => prev ? { ...prev, status: e.status, unread_user: 0 } : prev);
            });

            ch.listen('.ticket.updated', (e) => {
                setTicket(prev => prev ? {
                    ...prev,
                    status:          e.status,
                    priority:        e.priority,
                    resolution_note: e.resolution_note ?? prev.resolution_note,
                    resolved_at:     e.resolved_at     ?? prev.resolved_at,
                } : prev);
            });

            return () => window.Echo.leaveChannel(`support.ticket.${ticketId}`);
        }

        // Polling fallback (cPanel / no Pusher)
        const poll = async () => {
            try {
                const res = await axios.get(`/api/ecommerce/support/tickets/${ticketId}`, { headers: headers() });
                const t   = res.data;
                const latest = (t.messages ?? []).at(-1)?.id ?? null;
                if (lastMsgIdRef.current !== null && latest !== lastMsgIdRef.current) {
                    setMessages(t.messages ?? []);
                    setTicket(t);
                }
                lastMsgIdRef.current = latest;
            } catch { /* silent */ }
        };
        const timer = setInterval(poll, 4000);
        return () => clearInterval(timer);
    }, [ticketId, headers]);

    // ── Send message ──────────────────────────────────────────────────────────
    const send = async () => {
        if (!text.trim() || sending) return;
        const body = text.trim();
        setText('');
        setSending(true);

        // Optimistic update
        const tmpMsg = { id: `tmp-${Date.now()}`, sender_type: 'user', message: body, created_at: new Date().toISOString(), is_read: false };
        setMessages(prev => [...prev, tmpMsg]);

        try {
            const res = await axios.post(
                `/api/ecommerce/support/tickets/${ticketId}/messages`,
                { message: body },
                { headers: headers() }
            );
            // Replace messages with server response (has real ID)
            setMessages(res.data.ticket?.messages ?? []);
            lastMsgIdRef.current = (res.data.ticket?.messages ?? []).at(-1)?.id ?? null;
        } catch (e) {
            // Roll back optimistic message
            setMessages(prev => prev.filter(m => m.id !== tmpMsg.id));
            setText(body);
            setError(e.response?.data?.message ?? 'Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    // ── Close ticket ──────────────────────────────────────────────────────────
    const closeTicket = async () => {
        if (!window.confirm('Close this ticket?')) return;
        try {
            await axios.post(`/api/ecommerce/support/tickets/${ticketId}/close`, {}, { headers: headers() });
            setTicket(prev => ({ ...prev, status: 'closed' }));
        } catch { /* silent */ }
    };

    // ── Styles ────────────────────────────────────────────────────────────────
    const isClosed = ['resolved', 'closed'].includes(ticket?.status);

    const statusColors = {
        open:        { bg: '#1e3a5f', text: '#60a5fa' },
        in_progress: { bg: '#713f12', text: '#fbbf24' },
        resolved:    { bg: '#14532d', text: '#4ade80' },
        closed:      { bg: '#1c1c1c', text: '#6b7280' },
    };
    const sc = statusColors[ticket?.status] ?? statusColors.open;

    const priorityDot = { low: '#4ade80', medium: '#fbbf24', high: '#f97316', urgent: '#ef4444' };

    if (loading) return (
        <div style={{ background: '#0d0f14', color: '#94a3b8', padding: 32, textAlign: 'center', borderRadius: 12 }}>
            Loading ticket…
        </div>
    );

    if (error && !ticket) return (
        <div style={{ background: '#0d0f14', color: '#fca5a5', padding: 32, borderRadius: 12 }}>
            {error}
        </div>
    );

    return (
        <div style={{ background: '#0d0f14', color: '#e2e8f0', display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 12, border: '1px solid #2a2d35', overflow: 'hidden', fontFamily: 'sans-serif' }}>

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div style={{ background: '#161920', padding: '14px 18px', borderBottom: '1px solid #2a2d35' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        {onBack && (
                            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                ← Back to tickets
                            </button>
                        )}
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ticket?.subject}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>{ticket?.ticket_number}</span>
                            <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text }}>
                                {ticket?.status?.replace('_', ' ')}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#94a3b8' }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: priorityDot[ticket?.priority] ?? '#94a3b8', display: 'inline-block' }} />
                                {ticket?.priority}
                            </span>
                            {ticket?.order && (
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>Order: {ticket.order.order_number}</span>
                            )}
                        </div>
                    </div>

                    {/* Close button — only for open/in_progress tickets */}
                    {!isClosed && (
                        <button onClick={closeTicket} style={{ background: '#1e2230', border: '1px solid #374151', color: '#94a3b8', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                            Close Ticket
                        </button>
                    )}
                </div>

                {/* Affected items chips */}
                {ticket?.affected_items?.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #1e2128' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Affected items:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {ticket.affected_items.map((item, i) => (
                                <span key={i} style={{ background: '#1a1208', border: '1px solid #2a2d35', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#fbbf24' }}>
                                    {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}
                                    {item.modifiers?.length ? ` (${item.modifiers.join(', ')})` : ''}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Resolved banner ──────────────────────────────────────────── */}
            {ticket?.status === 'resolved' && ticket?.resolution_note && (
                <div style={{ background: '#0f2318', borderBottom: '1px solid #166534', padding: '10px 18px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#4ade80', marginBottom: 2 }}>Issue Resolved</div>
                        <div style={{ fontSize: 13, color: '#86efac', lineHeight: 1.4 }}>{ticket.resolution_note}</div>
                        {ticket.resolved_at && (
                            <div style={{ fontSize: 11, color: '#166534', marginTop: 3 }}>
                                {new Date(ticket.resolved_at).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Messages ─────────────────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.map((msg) => {
                    const isUser = msg.sender_type === 'user';
                    return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                            <div style={{ maxWidth: '78%' }}>
                                {!isUser && (
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3, marginLeft: 4 }}>Support Team</div>
                                )}
                                <div style={{
                                    background: isUser ? '#ff6b35' : '#1e2230',
                                    color: '#fff',
                                    padding: '9px 14px',
                                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                    fontSize: 14,
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    opacity: String(msg.id).startsWith('tmp-') ? 0.6 : 1,
                                }}>
                                    {msg.message}
                                </div>
                                <div style={{ fontSize: 11, color: '#475569', marginTop: 3, textAlign: isUser ? 'right' : 'left', marginLeft: isUser ? 0 : 4, marginRight: isUser ? 4 : 0 }}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {isUser && msg.is_read && <span style={{ marginLeft: 4 }}>✓✓</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, marginTop: 24 }}>
                        No messages yet.
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* ── Input ────────────────────────────────────────────────────── */}
            {error && (
                <div style={{ background: '#2a1215', color: '#fca5a5', fontSize: 13, padding: '8px 18px', borderTop: '1px solid #7f1d1d' }}>
                    {error}
                </div>
            )}

            {isClosed ? (
                <div style={{ padding: '14px 18px', borderTop: '1px solid #2a2d35', background: '#12141a', textAlign: 'center', fontSize: 13, color: '#64748b' }}>
                    This ticket is {ticket?.status}. Open a new ticket if you need further help.
                </div>
            ) : (
                <div style={{ padding: '12px 18px', borderTop: '1px solid #2a2d35', background: '#161920', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <textarea
                        value={text}
                        onChange={e => { setText(e.target.value); setError(null); }}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                        placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                        rows={1}
                        style={{
                            flex: 1, background: '#1a1d24', border: '1px solid #2a2d35',
                            color: '#e2e8f0', borderRadius: 10, padding: '10px 14px',
                            fontSize: 14, resize: 'none', outline: 'none',
                            minHeight: 42, maxHeight: 120, overflowY: 'auto',
                            fontFamily: 'inherit', lineHeight: 1.4,
                        }}
                        onInput={e => {
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                        }}
                    />
                    <button
                        onClick={send}
                        disabled={!text.trim() || sending}
                        style={{
                            background: text.trim() && !sending ? '#ff6b35' : '#2a2d35',
                            border: 'none', borderRadius: 10, color: '#fff',
                            width: 44, height: 44, cursor: text.trim() && !sending ? 'pointer' : 'default',
                            fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'background 0.15s',
                        }}
                    >
                        {sending ? '…' : '↑'}
                    </button>
                </div>
            )}
        </div>
    );
}
