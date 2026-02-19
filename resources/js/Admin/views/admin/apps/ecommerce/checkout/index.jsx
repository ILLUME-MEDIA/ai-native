import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle,
  Col, Form, FormControl, FormGroup, FormLabel, FormSelect,
  Row, Spinner
} from 'react-bootstrap';

const SESSION_KEY = 'ecom_session_id';

function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

const api = (method, url, data = null) =>
  axios({ method, url, data, headers: { 'X-Session-Id': getSessionId() } });

const DELIVERY_VENDORS = [
  { value: '', label: 'In-house / Self' },
  { value: 'doordash', label: 'DoorDash' },
  { value: 'uber_eats', label: 'Uber Eats' },
  { value: 'grubhub', label: 'GrubHub' },
  { value: 'instacart', label: 'Instacart' },
  { value: 'postmates', label: 'Postmates' },
];

const initialForm = {
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  order_type: 'delivery',
  item_delivery_type: 'delivery',
  delivery_vendor: '',
  delivery_address: '',
  notes: '',
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    setLoadingCart(true);
    api('get', '/api/ecommerce/cart')
      .then(r => setCartItems(r.data))
      .finally(() => setLoadingCart(false));
  }, []);

  const subtotal = cartItems.reduce(
    (sum, i) => sum + parseFloat(i.menu_item?.price || 0) * i.quantity, 0
  );
  const tax = subtotal * 0.1;
  const deliveryFee = form.order_type === 'delivery' ? 3.99 : 0;
  const total = subtotal + tax + deliveryFee;

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.customer_name.trim()) errs.customer_name = 'Name is required';
    if (!form.customer_email.trim()) errs.customer_email = 'Email is required';
    if (!form.customer_phone.trim()) errs.customer_phone = 'Phone is required';
    if (form.order_type === 'delivery' && !form.delivery_address.trim())
      errs.delivery_address = 'Delivery address is required';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (cartItems.length === 0) { showToast('Cart is empty', 'warning'); return; }

    setSubmitting(true);
    api('post', '/api/ecommerce/orders', {
      ...form,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      delivery_fee: deliveryFee.toFixed(2),
      total: total.toFixed(2),
    }).then(r => {
      setSuccessOrder(r.data);
      setCartItems([]);
    }).catch(err => {
      const msg = err.response?.data?.message || 'Failed to place order';
      showToast(msg, 'danger');
    }).finally(() => setSubmitting(false));
  };

  // Success screen
  if (successOrder) {
    return (
      <>
        <PageBreadcrumb title="Order Placed" subtitle="Ecommerce" />
        <Row className="justify-content-center">
          <Col md={6}>
            <Card className="text-center shadow">
              <CardBody className="py-5">
                <div className="mb-4">
                  <div
                    className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center"
                    style={{ width: 80, height: 80 }}
                  >
                    <Icon name="check-circle" size={40} className="text-success" />
                  </div>
                </div>
                <h3 className="fw-bold mb-2">Order Placed!</h3>
                <p className="text-muted mb-1">Thank you, {successOrder.customer_name}!</p>
                <p className="text-muted mb-4">
                  Your order <strong>#{successOrder.order_number}</strong> has been received.
                </p>
                <div className="bg-light rounded p-3 mb-4 text-start">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Order Total</span>
                    <span className="fw-bold">${parseFloat(successOrder.total).toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Status</span>
                    <Badge bg="warning" text="dark">{successOrder.status}</Badge>
                  </div>
                  {successOrder.delivery_vendor && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Via</span>
                      <Badge bg="info" className="text-capitalize">{successOrder.delivery_vendor.replace('_', ' ')}</Badge>
                    </div>
                  )}
                </div>
                <div className="d-flex gap-2 justify-content-center">
                  <Button variant="outline-primary" onClick={() => navigate('/apps/ecommerce/orders')}>
                    <Icon name="list" size={15} className="me-1" />
                    View Orders
                  </Button>
                  <Button variant="primary" onClick={() => navigate('/apps/ecommerce/cart')}>
                    <Icon name="shopping-cart" size={15} className="me-1" />
                    New Order
                  </Button>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </>
    );
  }

  return (
    <>
      <PageBreadcrumb title="Checkout" subtitle="Ecommerce" />

      {toast && (
        <Alert
          variant={toast.type}
          className="position-fixed top-0 end-0 m-3 shadow"
          style={{ zIndex: 9999, minWidth: 280 }}
        >
          {toast.msg}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Row>
          {/* Left: Form */}
          <Col lg={8}>
            {/* Customer Info */}
            <Card className="mb-3">
              <CardHeader>
                <CardTitle as="h5" className="mb-0">
                  <Icon name="user" size={17} className="me-2" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardBody>
                <Row className="g-3">
                  <Col md={6}>
                    <FormGroup>
                      <FormLabel>Full Name <span className="text-danger">*</span></FormLabel>
                      <FormControl
                        type="text"
                        placeholder="John Doe"
                        value={form.customer_name}
                        onChange={e => handleChange('customer_name', e.target.value)}
                        isInvalid={!!errors.customer_name}
                      />
                      <Form.Control.Feedback type="invalid">{errors.customer_name}</Form.Control.Feedback>
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup>
                      <FormLabel>Email <span className="text-danger">*</span></FormLabel>
                      <FormControl
                        type="email"
                        placeholder="john@example.com"
                        value={form.customer_email}
                        onChange={e => handleChange('customer_email', e.target.value)}
                        isInvalid={!!errors.customer_email}
                      />
                      <Form.Control.Feedback type="invalid">{errors.customer_email}</Form.Control.Feedback>
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup>
                      <FormLabel>Phone <span className="text-danger">*</span></FormLabel>
                      <FormControl
                        type="tel"
                        placeholder="+1 234 567 8900"
                        value={form.customer_phone}
                        onChange={e => handleChange('customer_phone', e.target.value)}
                        isInvalid={!!errors.customer_phone}
                      />
                      <Form.Control.Feedback type="invalid">{errors.customer_phone}</Form.Control.Feedback>
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup>
                      <FormLabel>Order Type</FormLabel>
                      <div className="d-flex gap-2">
                        {['delivery', 'pickup', 'dine_in'].map(type => (
                          <Button
                            key={type}
                            type="button"
                            size="sm"
                            variant={form.order_type === type ? 'primary' : 'outline-secondary'}
                            onClick={() => handleChange('order_type', type)}
                          >
                            <Icon
                              name={type === 'delivery' ? 'truck' : type === 'pickup' ? 'package' : 'utensils'}
                              size={13}
                              className="me-1"
                            />
                            {type === 'dine_in' ? 'Dine In' : type.charAt(0).toUpperCase() + type.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </FormGroup>
                  </Col>
                </Row>
              </CardBody>
            </Card>

            {/* Delivery Address + Vendor */}
            {form.order_type === 'delivery' && (
              <Card className="mb-3">
                <CardHeader>
                  <CardTitle as="h5" className="mb-0">
                    <Icon name="truck" size={17} className="me-2" />
                    Delivery Details
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <Row className="g-3">
                    <Col md={6}>
                      <FormGroup>
                        <FormLabel>Delivery Type</FormLabel>
                        <div className="d-flex gap-2">
                          {['delivery', 'pickup'].map(dt => (
                            <Button
                              key={dt}
                              type="button"
                              size="sm"
                              variant={form.item_delivery_type === dt ? 'primary' : 'outline-secondary'}
                              onClick={() => handleChange('item_delivery_type', dt)}
                            >
                              <Icon name={dt === 'delivery' ? 'truck' : 'package'} size={13} className="me-1" />
                              {dt.charAt(0).toUpperCase() + dt.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <FormLabel>Delivery Vendor</FormLabel>
                        <FormSelect
                          value={form.delivery_vendor}
                          onChange={e => handleChange('delivery_vendor', e.target.value)}
                        >
                          {DELIVERY_VENDORS.map(v => (
                            <option key={v.value} value={v.value}>{v.label}</option>
                          ))}
                        </FormSelect>
                      </FormGroup>
                    </Col>
                    <Col md={12}>
                      <FormGroup>
                        <FormLabel>Delivery Address <span className="text-danger">*</span></FormLabel>
                        <FormControl
                          as="textarea"
                          rows={3}
                          placeholder="Enter full delivery address..."
                          value={form.delivery_address}
                          onChange={e => handleChange('delivery_address', e.target.value)}
                          isInvalid={!!errors.delivery_address}
                        />
                        <Form.Control.Feedback type="invalid">{errors.delivery_address}</Form.Control.Feedback>
                      </FormGroup>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            )}

            {/* Notes */}
            <Card className="mb-3">
              <CardHeader>
                <CardTitle as="h5" className="mb-0">
                  <Icon name="message-square" size={17} className="me-2" />
                  Order Notes
                </CardTitle>
              </CardHeader>
              <CardBody>
                <FormControl
                  as="textarea"
                  rows={2}
                  placeholder="Special instructions, allergies, etc. (optional)"
                  value={form.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                />
              </CardBody>
            </Card>
          </Col>

          {/* Right: Order Summary */}
          <Col lg={4}>
            <Card className="sticky-top" style={{ top: 80 }}>
              <CardHeader>
                <CardTitle as="h5" className="mb-0">Order Summary</CardTitle>
              </CardHeader>
              <CardBody>
                {loadingCart ? (
                  <div className="text-center py-3"><Spinner size="sm" /> Loading...</div>
                ) : cartItems.length === 0 ? (
                  <Alert variant="warning" className="mb-3">
                    Your cart is empty.{' '}
                    <Button variant="link" className="p-0" onClick={() => navigate('/apps/ecommerce/cart')}>
                      Go to Cart
                    </Button>
                  </Alert>
                ) : (
                  <>
                    <div className="mb-3" style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {cartItems.map(item => (
                        <div key={item.id} className="d-flex justify-content-between mb-2">
                          <span className="text-muted">
                            {item.menu_item?.name} × {item.quantity}
                          </span>
                          <span>${(parseFloat(item.menu_item?.price || 0) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1 text-muted">
                      <span>Tax (10%)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    {form.order_type === 'delivery' && (
                      <div className="d-flex justify-content-between mb-1 text-muted">
                        <span>Delivery Fee</span>
                        <span>${deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    <hr />
                    <div className="d-flex justify-content-between fw-bold fs-5 mb-4">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100"
                  disabled={submitting || cartItems.length === 0}
                >
                  {submitting ? (
                    <><Spinner size="sm" className="me-2" /> Placing Order...</>
                  ) : (
                    <><Icon name="check-circle" size={16} className="me-2" />Place Order</>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline-secondary"
                  className="w-100 mt-2"
                  onClick={() => navigate('/apps/ecommerce/cart')}
                >
                  <Icon name="arrow-left" size={14} className="me-1" />
                  Back to Cart
                </Button>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Form>
    </>
  );
}
