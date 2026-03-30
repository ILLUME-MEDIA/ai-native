/**
 * RefundWidget — user can request a refund or check refund status for an order.
 * Props:
 *   apiBase    {string}
 *   authHeader {string}
 *   sessionId  {string}
 *   orders     {array}  — list of user orders [{id, order_number, total, payment_status, status}]
 */

import { useEffect, useState } from 'react';

const ISSUE_TYPES = [
  { value: 'wrong_item',   label: '❌ Wrong item received' },
  { value: 'missing_item', label: '📦 Missing item' },
  { value: 'damaged',      label: '💔 Damaged on arrival' },
  { value: 'late',         label: '⏰ Arrived too late' },
  { value: 'quality',      label: '⭐ Quality issue' },
  { value: 'other',        label: '💬 Other' },
];

const STATUS_STYLE = {
  pending:  { bg: '#fff3cd', color: '#856404', label: '⏳ Pending Review' },
  approved: { bg: '#cfe2ff', color: '#084298', label: '✅ Approved' },
  rejected: { bg: '#f8d7da', color: '#842029', label: '❌ Rejected' },
  refunded: { bg: '#d1e7dd', color: '#0a3622', label: '💰 Refunded' },
};

const RefundWidget = ({ apiBase, authHeader, sessionId, orders = [] }) => {
  const [view,       setView]       = useState('list');   // 'list' | 'request' | 'status'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundData, setRefundData] = useState(null);
  const [form,       setForm]       = useState({ issue_type: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(authHeader ? { Authorization: authHeader }  : {}),
    ...(sessionId  ? { 'X-Session-Id': sessionId } : {}),
  };

  const checkStatus = async (order) => {
    setLoadingStatus(true); setError('');
    try {
      const res  = await fetch(`${apiBase}/api/my-orders/${order.id}/refund`, { headers });
      const data = await res.json();
      setRefundData(data);
      setSelectedOrder(order);
      setView('status');
    } catch { setError('Could not check refund status.'); }
    finally { setLoadingStatus(false); }
  };

  const openRequest = (order) => {
    setSelectedOrder(order);
    setForm({ issue_type: '', reason: '' });
    setError(''); setSuccess('');
    setView('request');
  };

  const submit = async () => {
    if (!form.issue_type || !form.reason.trim()) { setError('Please select issue type and enter a reason.'); return; }
    setSubmitting(true); setError('');
    try {
      const res  = await fetch(`${apiBase}/api/my-orders/${selectedOrder.id}/refund-request`, {
        method: 'POST', headers,
        body: JSON.stringify({ issue_type: form.issue_type, reason: form.reason }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Failed to submit.'); return; }
      setSuccess('Your refund request has been submitted! We will review it shortly.');
      setView('list');
    } catch { setError('Failed to submit refund request.'); }
    finally { setSubmitting(false); }
  };

  // ── Status View ──────────────────────────────────────────────────────────
  if (view === 'status') {
    const r = refundData?.refund;
    const s = r ? (STATUS_STYLE[r.status] ?? { bg: '#e9ecef', color: '#495057', label: r.status }) : null;
    return (
      <div style={{ padding: '16px 14px' }}>
        <button onClick={() => setView('list')} style={backBtn}>← Back</button>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Refund Status — #{selectedOrder?.order_number}</div>
        {!r ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#888' }}>No refund request found for this order.</div>
        ) : (
          <div style={{ background: s.bg, color: s.color, borderRadius: 10, padding: '16px 14px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div><strong>Issue:</strong> {r.issue_type?.replace('_', ' ')}</div>
              <div><strong>Reason:</strong> {r.reason}</div>
              {r.amount > 0 && <div><strong>Amount:</strong> ${parseFloat(r.amount).toFixed(2)}</div>}
              {r.admin_note && <div><strong>Admin Note:</strong> {r.admin_note}</div>}
              {r.stripe_refund_id && <div style={{ fontSize: '0.75rem', marginTop: 4, opacity: 0.8 }}>Stripe: {r.stripe_refund_id}</div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Request View ─────────────────────────────────────────────────────────
  if (view === 'request') return (
    <div style={{ padding: '16px 14px' }}>
      <button onClick={() => setView('list')} style={backBtn}>← Back</button>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Request Refund</div>
      <div style={{ color: '#888', fontSize: '0.82rem', marginBottom: 14 }}>Order #{selectedOrder?.order_number} — ${parseFloat(selectedOrder?.total ?? 0).toFixed(2)}</div>

      {error && <div style={errBox}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={lbl}>Issue Type <span style={{ color: 'red' }}>*</span></label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ISSUE_TYPES.map(t => (
              <label key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, border: `2px solid ${form.issue_type === t.value ? '#0d6efd' : '#dee2e6'}`, background: form.issue_type === t.value ? '#e8f4fd' : '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="radio" name="issue" value={t.value} checked={form.issue_type === t.value} onChange={() => setForm(f => ({...f, issue_type: t.value}))} />
                {t.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label style={lbl}>Describe the Issue <span style={{ color: 'red' }}>*</span></label>
          <textarea rows={3} value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} style={{...inp, resize: 'vertical'}} placeholder="Please describe the problem in detail…" maxLength={1000} />
        </div>
        <button onClick={submit} disabled={submitting} style={btnPrimary}>{submitting ? 'Submitting…' : 'Submit Refund Request'}</button>
      </div>
    </div>
  );

  // ── List View ────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #e9ecef', fontWeight: 600 }}>Refund Requests</div>
      {error   && <div style={{ ...errBox, margin: '10px 14px' }}>{error}</div>}
      {success && <div style={{ background: '#d1e7dd', color: '#0a3622', borderRadius: 6, padding: '8px 12px', margin: '10px 14px', fontSize: '0.82rem' }}>{success}</div>}

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>No orders available for refund.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {orders.map(o => {
            const canRefund = ['paid', 'delivered'].includes(o.payment_status ?? o.status);
            return (
              <div key={o.id} style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>#{o.order_number}</div>
                  <div style={{ fontSize: '0.78rem', color: '#888' }}>${parseFloat(o.total ?? 0).toFixed(2)} · {o.status}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => checkStatus(o)} style={{ ...btnSmall, background: '#6c757d' }} disabled={loadingStatus}>
                    {loadingStatus ? '…' : 'Status'}
                  </button>
                  {canRefund && (
                    <button onClick={() => openRequest(o)} style={btnSmall}>Refund</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const lbl      = { display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, color: '#444' };
const inp      = { width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #dee2e6', fontSize: '0.87rem', outline: 'none', boxSizing: 'border-box' };
const btnPrimary = { background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: '0.87rem', opacity: 1 };
const btnSmall = { background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 };
const backBtn  = { background: 'none', border: 'none', cursor: 'pointer', color: '#0d6efd', fontSize: '0.85rem', padding: 0, marginBottom: 10, display: 'block' };
const errBox   = { background: '#f8d7da', color: '#842029', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: '0.82rem' };

export default RefundWidget;
