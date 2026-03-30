/**
 * SupportChat — polling-based chat for a single support ticket.
 * Works on any hosting (cPanel, shared, VPS) — no WebSocket needed.
 * Poll interval: 4 seconds while chat is open.
 *
 * Props:
 *   ticketId    {number}   — ticket ID to load
 *   apiBase     {string}   — e.g. "https://admin.yourdomain.com"
 *   authHeader  {string}   — "Bearer <otp_token>" or ""
 *   sessionId   {string}   — X-Session-Id for guest users
 *   onClose     {fn}       — called when user clicks back
 */

import { useEffect, useRef, useState } from 'react';

const fmt = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

const SupportChat = ({ ticketId, apiBase, authHeader, sessionId, onClose }) => {
  const [ticket,   setTicket]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState('');
  const lastIdRef  = useRef(null);
  const endRef     = useRef(null);

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(authHeader  ? { Authorization: authHeader }    : {}),
    ...(sessionId   ? { 'X-Session-Id': sessionId }   : {}),
  };

  const loadTicket = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res  = await fetch(`${apiBase}/api/ecommerce/support/tickets/${ticketId}`, { headers });
      const data = await res.json();
      setTicket(data);
      const lastId = data.messages?.[(data.messages.length ?? 0) - 1]?.id ?? null;
      if (!silent || lastId !== lastIdRef.current) {
        lastIdRef.current = lastId;
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      }
    } catch { setError('Could not load messages.'); }
    finally { setLoading(false); }
  };

  // Initial load
  useEffect(() => { loadTicket(); }, [ticketId]);

  // Polling — every 4s while open
  useEffect(() => {
    const t = setInterval(() => loadTicket(true), 4000);
    return () => clearInterval(t);
  }, [ticketId]);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res  = await fetch(`${apiBase}/api/ecommerce/support/tickets/${ticketId}/messages`, {
        method: 'POST', headers,
        body: JSON.stringify({ message: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Failed to send.'); return; }
      setText('');
      setTicket(data.ticket);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    } catch { setError('Failed to send message.'); }
    finally { setSending(false); }
  };

  const STATUS_COLOR = { open: '#0dcaf0', in_progress: '#ffc107', resolved: '#198754', closed: '#6c757d' };
  const isClosed = ticket?.status === 'closed' || ticket?.status === 'resolved';

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading chat…</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #e9ecef', background: '#fff' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6c757d', padding: 0 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>#{ticket?.ticket_number} — {ticket?.subject}</div>
          <span style={{ fontSize: '0.72rem', background: STATUS_COLOR[ticket?.status] ?? '#6c757d', color: '#fff', borderRadius: 4, padding: '1px 7px' }}>
            {ticket?.status?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', background: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {error && <div style={{ background: '#f8d7da', color: '#842029', borderRadius: 6, padding: '8px 12px', fontSize: '0.82rem' }}>{error}</div>}
        {(ticket?.messages ?? []).map((msg, i) => {
          const isUser = msg.sender_type === 'user';
          return (
            <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '8px 12px',
                borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                background: isUser ? '#0d6efd' : '#fff',
                color: isUser ? '#fff' : '#212529',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                fontSize: '0.87rem', wordBreak: 'break-word',
              }}>
                {msg.message}
                <div style={{ fontSize: '0.68rem', opacity: 0.7, marginTop: 3, textAlign: 'right' }}>{fmt(msg.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Reply box */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #e9ecef', background: '#fff' }}>
        {isClosed ? (
          <div style={{ textAlign: 'center', color: '#6c757d', fontSize: '0.83rem', padding: '6px 0' }}>
            🔒 This ticket is {ticket?.status}. Open a new ticket if needed.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              rows={2} value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type a message… (Enter to send)"
              style={{ flex: 1, resize: 'none', borderRadius: 8, border: '1px solid #dee2e6', padding: '7px 10px', fontSize: '0.87rem', outline: 'none' }}
            />
            <button
              onClick={sendMessage} disabled={sending || !text.trim()}
              style={{ background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', cursor: 'pointer', opacity: (sending || !text.trim()) ? 0.6 : 1 }}
            >
              {sending ? '…' : '➤'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportChat;
