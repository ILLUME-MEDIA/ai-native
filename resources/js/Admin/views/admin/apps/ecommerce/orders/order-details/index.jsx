import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import {
  Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle,
  Col, Form, FormSelect, Modal, Row, Spinner, Table
} from 'react-bootstrap';

const STATUS_FLOW = ['pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled'];
const STATUS_BADGE = {
  pending:          'warning',
  confirmed:        'info',
  preparing:        'primary',
  ready:            'success',
  out_for_delivery: 'primary',
  delivered:        'success',
  cancelled:        'danger',
};
const STATUS_LABEL = {
  pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing',
  ready: 'Ready', out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered', cancelled: 'Cancelled',
};

export default function OrderDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('id');

  const [order, setOrder]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = () => {
    if (!orderId) return;
    setLoading(true);
    axios.get(`/api/ecommerce/orders/${orderId}`)
      .then(r => { setOrder(r.data); setNewStatus(r.data.status); })
      .catch(() => showToast('Order not found', 'danger'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [orderId]);

  const handleStatusUpdate = () => {
    if (!newStatus || newStatus === order.status) return;
    setUpdating(true);
    axios.patch(`/api/ecommerce/orders/${orderId}/status`, { status: newStatus })
      .then(r => { setOrder(r.data); showToast('Status updated'); })
      .catch(() => showToast('Update failed', 'danger'))
      .finally(() => setUpdating(false));
  };

  if (!orderId) {
    return (
      <>
        <PageBreadcrumb title="Order Details" subtitle="Ecommerce" />
        <Alert variant="warning">No order selected. <Link to="/apps/ecommerce/orders">← Back to Orders</Link></Alert>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <PageBreadcrumb title="Order Details" subtitle="Ecommerce" />
        <div className="text-center py-5"><Spinner /> Loading order...</div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <PageBreadcrumb title="Order Details" subtitle="Ecommerce" />
        <Alert variant="danger">Order not found. <Link to="/apps/ecommerce/orders">← Back</Link></Alert>
      </>
    );
  }

  const subtotal = (order.items || []).reduce((s, i) => s + parseFloat(i.subtotal || 0), 0);

  return (
    <>
      <PageBreadcrumb title={`Order #${order.order_number}`} subtitle="Orders" />

      {toast && (
        <Alert variant={toast.type} className="position-fixed top-0 end-0 m-3 shadow" style={{ zIndex: 9999, minWidth: 280 }}>
          {toast.msg}
        </Alert>
      )}

      {/* Top bar */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <Button variant="outline-secondary" size="sm" onClick={() => navigate('/apps/ecommerce/orders')}>
          <Icon name="arrow-left" size={14} className="me-1" />
          Back to Orders
        </Button>
        <div className="d-flex gap-2 align-items-center">
          <FormSelect
            size="sm"
            value={newStatus}
            onChange={e => setNewStatus(e.target.value)}
            style={{ width: 180 }}
          >
            {STATUS_FLOW.map(s => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </FormSelect>
          <Button
            variant="primary"
            size="sm"
            disabled={updating || newStatus === order.status}
            onClick={handleStatusUpdate}
          >
            {updating ? <Spinner size="sm" className="me-1" /> : <Icon name="check" size={14} className="me-1" />}
            Update Status
          </Button>
        </div>
      </div>

      <Row>
        {/* Left: Items + Timeline */}
        <Col xl={8}>
          {/* Order Items */}
          <Card className="mb-3">
            <CardHeader className="d-flex justify-content-between align-items-center">
              <CardTitle as="h5" className="mb-0">
                <Icon name="shopping-bag" size={16} className="me-2" />
                Order Items
              </CardTitle>
              <Badge bg={STATUS_BADGE[order.status] || 'secondary'}>
                {STATUS_LABEL[order.status] || order.status}
              </Badge>
            </CardHeader>
            <CardBody className="p-0">
              <Table responsive className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Subtotal</th>
                    {order.items?.some(i => i.notes) && <th>Notes</th>}
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map(item => (
                    <tr key={item.id}>
                      <td>
                        <div className="fw-semibold">{item.name}</div>
                      </td>
                      <td>${parseFloat(item.price).toFixed(2)}</td>
                      <td>{item.quantity}</td>
                      <td className="fw-semibold">${parseFloat(item.subtotal).toFixed(2)}</td>
                      {order.items?.some(i => i.notes) && (
                        <td><small className="text-muted">{item.notes || '—'}</small></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>

          {/* Totals */}
          <Card className="mb-3">
            <CardBody>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 text-muted">
                <span>Tax</span>
                <span>${parseFloat(order.tax || 0).toFixed(2)}</span>
              </div>
              {parseFloat(order.delivery_fee) > 0 && (
                <div className="d-flex justify-content-between mb-2 text-muted">
                  <span>Delivery Fee</span>
                  <span>${parseFloat(order.delivery_fee).toFixed(2)}</span>
                </div>
              )}
              <hr />
              <div className="d-flex justify-content-between fw-bold fs-5">
                <span>Total</span>
                <span>${parseFloat(order.total).toFixed(2)}</span>
              </div>
            </CardBody>
          </Card>

          {/* Status History / Timeline */}
          <Card>
            <CardHeader>
              <CardTitle as="h5" className="mb-0">
                <Icon name="timeline" size={16} className="me-2" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="d-flex flex-wrap gap-3">
                {STATUS_FLOW.filter(s => s !== 'cancelled').map((s, idx) => {
                  const flowIdx   = STATUS_FLOW.indexOf(order.status);
                  const thisIdx   = STATUS_FLOW.indexOf(s);
                  const isDone    = thisIdx <= flowIdx && order.status !== 'cancelled';
                  const isCurrent = s === order.status;
                  return (
                    <div key={s} className="d-flex align-items-center gap-2">
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center ${isCurrent ? 'bg-primary text-white' : isDone ? 'bg-success text-white' : 'bg-light text-muted'}`}
                        style={{ width: 32, height: 32, fontSize: 13, fontWeight: 600 }}
                      >
                        {isDone && !isCurrent ? <Icon name="check" size={14} /> : idx + 1}
                      </div>
                      <div>
                        <div className={`fw-semibold ${isCurrent ? 'text-primary' : isDone ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.8rem' }}>
                          {STATUS_LABEL[s]}
                        </div>
                      </div>
                      {idx < STATUS_FLOW.filter(s2 => s2 !== 'cancelled').length - 1 && (
                        <div style={{ width: 24, height: 2, background: isDone ? '#198754' : '#dee2e6', marginLeft: 4 }} />
                      )}
                    </div>
                  );
                })}
                {order.status === 'cancelled' && (
                  <Badge bg="danger" className="align-self-center">Cancelled</Badge>
                )}
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Right: Customer + Delivery info */}
        <Col xl={4}>
          {/* Business */}
          <Card className="mb-3">
            <CardHeader>
              <CardTitle as="h5" className="mb-0">
                <Icon name="store" size={15} className="me-2" />
                Business
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="fw-semibold">{order.business?.name || '—'}</div>
              <small className="text-muted">{order.business?.city || ''}</small>
            </CardBody>
          </Card>

          {/* Customer */}
          <Card className="mb-3">
            <CardHeader>
              <CardTitle as="h5" className="mb-0">
                <Icon name="user" size={15} className="me-2" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardBody>
              {[
                { icon: 'user', label: order.customer_name || '—' },
                { icon: 'mail', label: order.customer_email || '—' },
                { icon: 'phone', label: order.customer_phone || '—' },
              ].map(({ icon, label }) => (
                <div key={icon} className="d-flex align-items-center gap-2 mb-2">
                  <Icon name={icon} size={14} className="text-muted" />
                  <small>{label}</small>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Delivery */}
          <Card className="mb-3">
            <CardHeader>
              <CardTitle as="h5" className="mb-0">
                <Icon name="truck" size={15} className="me-2" />
                Delivery Info
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="d-flex gap-2 mb-2">
                <Badge bg="secondary" className="text-capitalize">{order.order_type?.replace('_', ' ')}</Badge>
                {order.item_delivery_type && order.item_delivery_type !== order.order_type && (
                  <Badge bg="secondary" className="text-capitalize">{order.item_delivery_type}</Badge>
                )}
                {order.delivery_vendor && (
                  <Badge bg="info" className="text-capitalize">{order.delivery_vendor.replace('_', ' ')}</Badge>
                )}
              </div>
              {order.delivery_address && (
                <div className="d-flex align-items-start gap-2">
                  <Icon name="map-pin" size={14} className="text-muted mt-1" />
                  <small className="text-muted">{order.delivery_address}</small>
                </div>
              )}
              {order.notes && (
                <div className="mt-2 border-top pt-2">
                  <small className="text-muted"><strong>Notes:</strong> {order.notes}</small>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Order Meta */}
          <Card>
            <CardHeader>
              <CardTitle as="h5" className="mb-0">
                <Icon name="info-circle" size={15} className="me-2" />
                Order Info
              </CardTitle>
            </CardHeader>
            <CardBody>
              {[
                { label: 'Order #', value: order.order_number },
                { label: 'Placed', value: new Date(order.created_at).toLocaleString() },
                { label: 'Updated', value: new Date(order.updated_at).toLocaleString() },
                { label: 'Session', value: order.session_id ? order.session_id.slice(0, 16) + '…' : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="d-flex justify-content-between border-bottom py-1">
                  <small className="text-muted">{label}</small>
                  <small className="fw-semibold">{value}</small>
                </div>
              ))}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
