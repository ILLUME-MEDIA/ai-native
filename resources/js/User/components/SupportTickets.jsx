/**
 * SupportTickets — list user's tickets + open new ticket form.
 * Props:
 *   apiBase     {string}
 *   authHeader  {string}
 *   sessionId   {string}
 *   onOpenChat  {fn(ticketId)}
 */

import { useEffect, useState } from 'react';

const STATUS_COLOR = { open: '#0dcaf0', in_progress: '#ffc107', resolved: '#198754', closed: '#6c757d' };
const CATEGORIES   = ['general','refund','delivery','quality','other'];
const PRIORITIES   = ['low','medium','high','urgent'];

const SupportTickets = ({ apiBase, authHeader, sessionId, onOpenChat, orders = [] }) => {
  const [tickets,  setTickets]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState('list'); // 'list' | 'new'
  const [form,     setForm]     = useState({ order_id: '', subject: '', category: 'general', priority: 'medium', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(authHeader ? { Authorization: authHeader }   : {}),
    ...(sessionId  ? { 'X-Session-Id': sessionId }  : {}),
  };

  const load = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${apiBase}/api/ecommerce/support/tickets`, { headers });
      const data = await res.json();
      setTickets(data.data ?? []);
    } catch { setError('Could not load tickets.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.subject.trim() || !form.message.trim()) { setError('Subject and message are required.'); return; }
    setSubmitting(true); setError('');
    try {
      const body = { ...form };
      if (!body.order_id) delete body.order_id;
      const res  = await fetch(`${apiBase}/api/ecommerce/support/tickets`, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Failed.'); return; }
      setSuccess('Ticket created! Our team will respond shortly.');
      setForm({ order_id: '', subject: '', category: 'general', priority: 'medium', message: '' });
      setView('list');
      load();
    } catch { setError('Failed to submit ticket.'); }
    finally { setSubmitting(false); }
  };

  if (view === 'new') return (
    <div style={{ padding: '16px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6c757d' }}>←</button>
        <span style={{ fontWeight: 600 }}>Open New Ticket</span>
      </div>

      {error   && <div style={{ background: '#f8d7da', color: '#842029', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: '0.82rem' }}>{error}</div>}
      {success && <div style={{ background: '#d1e7dd', color: '#0a3622', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: '0.82rem' }}>{success}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {orders.length > 0 && (
          <div>
            <label style={lbl}>Related Order (optional)</label>
            <select value={form.order_id} onChange={e => setForm(f => ({...f, order_id: e.target.value}))} style={inp}>
              <option value="">— No specific order —</option>
              {orders.map(o => <option key={o.id} value={o.id}>#{o.order_number} — ${parseFloat(o.total).toFixed(2)}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={lbl}>Category</label>
          <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} style={inp}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Subject <span style={{ color: 'red' }}>*</span></label>
          <input value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} style={inp} placeholder="Briefly describe your issue" maxLength={200} />
        </div>
        <div>
          <label style={lbl}>Message <span style={{ color: 'red' }}>*</span></label>
          <textarea rows={4} value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} style={{...inp, resize: 'vertical'}} placeholder="Describe the issue in detail…" maxLength={2000} />
        </div>
        <button onClick={submit} disabled={submitting} style={btn}>{submitting ? 'Submitting…' : 'Submit Ticket'}</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #e9ecef' }}>
        <span style={{ fontWeight: 600 }}>My Support Tickets</span>
        <button onClick={() => { setError(''); setView('new'); }} style={{ ...btn, padding: '5px 12px', fontSize: '0.82rem' }}>+ New Ticket</button>
      </div>

      {success && <div style={{ background: '#d1e7dd', color: '#0a3622', margin: '10px 14px', borderRadius: 6, padding: '8px 12px', fontSize: '0.82rem' }}>{success}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#888' }}>Loading tickets…</div>
      ) : tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎫</div>
          No tickets yet. Click "+ New Ticket" if you need help.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {tickets.map(t => (
            <div key={t.id}
              onClick={() => onOpenChat(t.id)}
              style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>#{t.ticket_number}</div>
                <div style={{ fontSize: '0.8rem', color: '#555', marginTop: 2 }}>{t.subject}</div>
                <div style={{ marginTop: 4 }}>
                  <span style={{ fontSize: '0.7rem', background: STATUS_COLOR[t.status] ?? '#6c757d', color: '#fff', borderRadius: 4, padding: '1px 7px', textTransform: 'capitalize' }}>
                    {t.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              {t.unread_user > 0 && (
                <div style={{ background: '#dc3545', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                  {t.unread_user}
                </div>
              )}
              <span style={{ color: '#ccc' }}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const lbl = { display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, color: '#444' };
const inp = { width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #dee2e6', fontSize: '0.87rem', outline: 'none', boxSizing: 'border-box' };
const btn = { background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: '0.87rem' };

export default SupportTickets;
