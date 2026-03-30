import Icon from '@admin/components/wrappers/Icon';
import { useEffect, useMemo, useState } from 'react';
import {
  Button, Form, FormControl, FormSelect, InputGroup,
  Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Spinner,
} from 'react-bootstrap';

const ISSUE_TYPES = [
  { value: 'wrong_item',   label: 'Wrong item received' },
  { value: 'missing_item', label: 'Missing item' },
  { value: 'damaged',      label: 'Damaged on arrival' },
  { value: 'late',         label: 'Arrived too late' },
  { value: 'quality',      label: 'Quality issue' },
  { value: 'other',        label: 'Other' },
];

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? '';

const CreateRefundModal = ({ show, onHide, onCreated }) => {
  const [allOrders,   setAllOrders]   = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [search,      setSearch]      = useState('');

  const [orderId,     setOrderId]     = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [issueType,   setIssueType]   = useState('');
  const [reason,      setReason]      = useState('');
  const [amount,      setAmount]      = useState('');
  const [adminNote,   setAdminNote]   = useState('');

  const [errors,      setErrors]      = useState({});
  const [submitting,  setSubmitting]  = useState(false);
  const [toast,       setToast]       = useState(null);

  // Load orders once when modal opens
  useEffect(() => {
    if (!show) return;
    setOrdersLoading(true);
    fetch('/api/ecommerce/orders?per_page=100', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(res => {
        const list = res.data ?? res.orders ?? res;
        setAllOrders(Array.isArray(list) ? list : []);
      })
      .catch(() => setAllOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [show]);

  // Client-side filter
  const orders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allOrders;
    return allOrders.filter(o =>
      (o.order_number ?? '').toLowerCase().includes(q) ||
      (o.customer_name  ?? '').toLowerCase().includes(q) ||
      (o.customer_email ?? '').toLowerCase().includes(q)
    );
  }, [allOrders, search]);

  // Auto-fill amount when order selected
  useEffect(() => {
    if (selectedOrder) {
      setAmount(parseFloat(selectedOrder.total ?? 0).toFixed(2));
    }
  }, [selectedOrder]);

  // Reset on close
  useEffect(() => {
    if (!show) {
      setAllOrders([]); setOrderId(''); setSelectedOrder(null);
      setIssueType(''); setReason(''); setAmount('');
      setAdminNote(''); setErrors({}); setSearch('');
    }
  }, [show]);

  const handleOrderChange = (e) => {
    const id = e.target.value;
    setOrderId(id);
    const found = orders.find(o => String(o.id) === String(id));
    setSelectedOrder(found ?? null);
  };

  const validate = () => {
    const e = {};
    if (!orderId)       e.order_id   = 'Please select an order.';
    if (!issueType)     e.issue_type = 'Please select an issue type.';
    if (!reason.trim()) e.reason     = 'Reason is required.';
    if (!amount || parseFloat(amount) <= 0) e.amount = 'Enter a valid amount.';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({
          order_id:   parseInt(orderId),
          issue_type: issueType,
          reason:     reason.trim(),
          amount:     parseFloat(amount),
          admin_note: adminNote.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 422 && json.errors) { setErrors(json.errors); return; }
        throw new Error(json.message ?? 'Failed to create refund.');
      }
      onCreated?.();
      onHide();
    } catch (err) {
      setToast(err.message);
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <ModalHeader closeButton>
        <ModalTitle as="h5" className="fw-semibold">
          <Icon icon="credit-card-refund" className="me-2 text-primary" /> Create Refund
        </ModalTitle>
      </ModalHeader>

      <ModalBody>
        {toast && (
          <div className="alert alert-danger py-2 px-3 mb-3" style={{ fontSize: '0.85rem' }}>{toast}</div>
        )}

        {/* Order search */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold">Search Order</Form.Label>
          <InputGroup size="sm" className="mb-1">
            <InputGroup.Text><Icon icon="search" style={{ fontSize: 14 }} /></InputGroup.Text>
            <FormControl
              placeholder="Order number / customer name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </InputGroup>
        </Form.Group>

        {/* Order select */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold">Order <span className="text-danger">*</span></Form.Label>
          <FormSelect
            value={orderId}
            onChange={handleOrderChange}
            isInvalid={!!errors.order_id}
          >
            <option value="">
              {ordersLoading ? 'Loading orders…' : '— Select Order —'}
            </option>
            {orders.map(o => (
              <option key={o.id} value={o.id}>
                #{o.order_number} — {o.customer_name ?? 'Unknown'} (${parseFloat(o.total ?? 0).toFixed(2)})
              </option>
            ))}
          </FormSelect>
          {errors.order_id && <div className="invalid-feedback">{errors.order_id}</div>}
        </Form.Group>

        {/* Customer info (auto-filled) */}
        {selectedOrder && (
          <div className="bg-light rounded p-2 mb-3 d-flex gap-3 flex-wrap" style={{ fontSize: '0.82rem' }}>
            <div><span className="text-muted">Customer:</span> <strong>{selectedOrder.customer_name ?? '—'}</strong></div>
            <div><span className="text-muted">Email:</span> <strong>{selectedOrder.customer_email ?? '—'}</strong></div>
            <div><span className="text-muted">Status:</span> <strong>{selectedOrder.status ?? '—'}</strong></div>
            <div><span className="text-muted">Payment:</span> <strong>{selectedOrder.payment_status ?? '—'}</strong></div>
            {selectedOrder.stripe_payment_intent_id && (
              <div className="w-100">
                <span className="badge bg-info text-white" style={{ fontSize: '0.72rem' }}>
                  <Icon icon="credit-card" className="me-1" style={{ fontSize: 12 }} />Stripe payment
                </span>
              </div>
            )}
          </div>
        )}

        {/* Issue type */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold">Issue Type <span className="text-danger">*</span></Form.Label>
          <FormSelect
            value={issueType}
            onChange={e => setIssueType(e.target.value)}
            isInvalid={!!errors.issue_type}
          >
            <option value="">— Select Issue —</option>
            {ISSUE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </FormSelect>
          {errors.issue_type && <div className="invalid-feedback">{errors.issue_type}</div>}
        </Form.Group>

        {/* Reason */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold">Reason <span className="text-danger">*</span></Form.Label>
          <Form.Control
            as="textarea" rows={2}
            placeholder="Describe the issue…"
            value={reason}
            onChange={e => setReason(e.target.value)}
            isInvalid={!!errors.reason}
          />
          {errors.reason && <div className="invalid-feedback">{errors.reason}</div>}
        </Form.Group>

        {/* Amount */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold">Refund Amount <span className="text-danger">*</span></Form.Label>
          <InputGroup>
            <InputGroup.Text>$</InputGroup.Text>
            <FormControl
              type="number" min="0.01" step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              isInvalid={!!errors.amount}
              placeholder="0.00"
            />
            {errors.amount && <div className="invalid-feedback">{errors.amount}</div>}
          </InputGroup>
          {selectedOrder && (
            <Form.Text className="text-muted">
              Order total: ${parseFloat(selectedOrder.total ?? 0).toFixed(2)}
            </Form.Text>
          )}
        </Form.Group>

        {/* Admin note */}
        <Form.Group>
          <Form.Label className="fw-semibold">Admin Note <span className="text-muted fw-normal">(optional)</span></Form.Label>
          <Form.Control
            as="textarea" rows={2}
            placeholder="Internal note…"
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
          />
        </Form.Group>
      </ModalBody>

      <ModalFooter>
        <Button variant="light" onClick={onHide} disabled={submitting}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting
            ? <><Spinner animation="border" size="sm" className="me-1" />Creating…</>
            : <><Icon icon="check" className="me-1" />Confirm Refund</>}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CreateRefundModal;
