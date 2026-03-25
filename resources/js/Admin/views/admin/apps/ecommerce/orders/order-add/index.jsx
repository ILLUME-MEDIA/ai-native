import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle,
  Col, Form, FormControl, FormGroup, FormLabel, FormSelect,
  Row, Spinner, Table
} from 'react-bootstrap';

const SESSION_KEY = 'ecom_session_id';
function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) { sid = 'sess_' + Math.random().toString(36).slice(2) + Date.now(); localStorage.setItem(SESSION_KEY, sid); }
  return sid;
}

const DELIVERY_VENDORS = [
  { value: '', label: 'In-house / Self' },
  { value: 'doordash', label: 'DoorDash' },
  { value: 'uber_direct', label: 'Uber Direct' },
];

const TAX_RATE = 10;

export default function OrderAddPage() {
  const navigate = useNavigate();

  const [businesses, setBusinesses] = useState([]);
  const [selectedBiz, setSelectedBiz] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [menuCats, setMenuCats] = useState([]);
  const [catFilter, setCatFilter] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [form, setForm] = useState({
    customer_name: '', customer_email: '', customer_phone: '',
    order_type: 'delivery', item_delivery_type: 'delivery',
    delivery_vendor: '', delivery_address: '', notes: '',
  });

  const [loadingMenu, setLoadingMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    axios.get('/api/ecommerce/businesses?per_page=100')
      .then(r => setBusinesses(r.data.data || []));
  }, []);

  useEffect(() => {
    if (!selectedBiz) { setMenuItems([]); setMenuCats([]); return; }
    setLoadingMenu(true);
    Promise.all([
      axios.get(`/api/ecommerce/businesses/${selectedBiz}/menu-items`),
      axios.get(`/api/ecommerce/businesses/${selectedBiz}/menu-categories`),
    ]).then(([itemsRes, catsRes]) => {
      setMenuItems(itemsRes.data || []);
      setMenuCats(catsRes.data || []);
    }).finally(() => setLoadingMenu(false));
  }, [selectedBiz]);

  const addItem = (item) => {
    setOrderItems(prev => {
      const exists = prev.find(i => i.menu_item_id === item.id);
      if (exists) return prev.map(i => i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menu_item_id: item.id, name: item.name, price: parseFloat(item.price), quantity: 1, notes: '' }];
    });
  };

  const updateQty = (id, qty) => {
    if (qty < 1) { setOrderItems(prev => prev.filter(i => i.menu_item_id !== id)); return; }
    setOrderItems(prev => prev.map(i => i.menu_item_id === id ? { ...i, quantity: qty } : i));
  };

  const filteredMenu = catFilter
    ? menuItems.filter(i => i.menu_category_id === parseInt(catFilter))
    : menuItems;

  const subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = subtotal * (TAX_RATE / 100);
  const deliveryFee = form.order_type === 'delivery' ? 3.99 : 0;
  const total = subtotal + tax + deliveryFee;

  const validate = () => {
    const errs = {};
    if (!selectedBiz) errs.business = 'Select a business';
    if (orderItems.length === 0) errs.items = 'Add at least one item';
    if (!form.customer_name.trim()) errs.customer_name = 'Required';
    if (!form.customer_phone.trim()) errs.customer_phone = 'Required';
    if (form.order_type === 'delivery' && !form.delivery_address.trim()) errs.delivery_address = 'Required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const sid = getSessionId();
      const headers = { 'X-Session-Id': sid };

      // Clear cart then add items
      await axios.delete('/api/ecommerce/cart', { headers });
      for (const item of orderItems) {
        await axios.post('/api/ecommerce/cart', {
          business_id: selectedBiz,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          notes: item.notes || null,
        }, { headers });
      }

      // Create order
      const res = await axios.post('/api/ecommerce/orders', {
        business_id: selectedBiz,
        ...form,
        tax_rate: TAX_RATE,
      }, { headers });

      showToast(`Order ${res.data.order_number} created!`);
      setTimeout(() => navigate(`/apps/ecommerce/order-details?id=${res.data.id}`), 1200);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create order', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const inOrder = (itemId) => orderItems.find(i => i.menu_item_id === itemId);

  return (
    <>
      <PageBreadcrumb title="Create Order" subtitle="Orders" />

      {toast && (
        <Alert variant={toast.type} className="position-fixed top-0 end-0 m-3 shadow" style={{ zIndex: 9999, minWidth: 280 }}>
          {toast.msg}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Row>
          <Col xl={8}>
            {/* Business + Menu Browser */}
            <Card className="mb-3">
              <CardHeader>
                <CardTitle as="h5" className="mb-0">
                  <Icon name="store" size={16} className="me-2" />
                  Select Business &amp; Items
                </CardTitle>
              </CardHeader>
              <CardBody>
                <FormGroup className="mb-3">
                  <FormLabel>Business <span className="text-danger">*</span></FormLabel>
                  <FormSelect
                    value={selectedBiz}
                    onChange={e => { setSelectedBiz(e.target.value); setOrderItems([]); setCatFilter(''); }}
                    isInvalid={!!errors.business}
                  >
                    <option value="">— Select Business —</option>
                    {businesses.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.category?.type || '—'})</option>
                    ))}
                  </FormSelect>
                  <Form.Control.Feedback type="invalid">{errors.business}</Form.Control.Feedback>
                </FormGroup>

                {selectedBiz && (
                  <>
                    {menuCats.length > 0 && (
                      <div className="d-flex gap-2 flex-wrap mb-3">
                        <Button type="button" size="sm" variant={!catFilter ? 'primary' : 'outline-primary'} onClick={() => setCatFilter('')}>All</Button>
                        {menuCats.map(c => (
                          <Button key={c.id} type="button" size="sm"
                            variant={catFilter == c.id ? 'primary' : 'outline-primary'}
                            onClick={() => setCatFilter(c.id)}>
                            {c.name}
                          </Button>
                        ))}
                      </div>
                    )}

                    {loadingMenu ? (
                      <div className="text-center py-3"><Spinner size="sm" /> Loading menu...</div>
                    ) : filteredMenu.filter(i => i.is_available).length === 0 ? (
                      <Alert variant="info">No items available.</Alert>
                    ) : (
                      <Row className="g-2">
                        {filteredMenu.filter(i => i.is_available).map(item => {
                          const inOrd = inOrder(item.id);
                          return (
                            <Col key={item.id} xs={6} sm={4} md={3}>
                              <div
                                className={`border rounded p-2 h-100 ${inOrd ? 'border-primary bg-primary bg-opacity-10' : 'border-light'}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => addItem(item)}
                              >
                                {item.image && (
                                  <img src={item.image} alt={item.name}
                                    style={{ width: '100%', height: 56, objectFit: 'cover', borderRadius: 4, marginBottom: 4 }} />
                                )}
                                <div className="fw-semibold" style={{ fontSize: '0.8rem', lineHeight: 1.2 }}>{item.name}</div>
                                <div className="text-success fw-bold" style={{ fontSize: '0.82rem' }}>${parseFloat(item.price).toFixed(2)}</div>
                                {inOrd && <Badge bg="primary" className="mt-1" style={{ fontSize: '0.7rem' }}>×{inOrd.quantity}</Badge>}
                              </div>
                            </Col>
                          );
                        })}
                      </Row>
                    )}
                  </>
                )}
                {errors.items && <div className="text-danger small mt-2">{errors.items}</div>}
              </CardBody>
            </Card>

            {/* Order Items Table */}
            {orderItems.length > 0 && (
              <Card className="mb-3">
                <CardHeader>
                  <CardTitle as="h5" className="mb-0">
                    <Icon name="clipboard-list" size={16} className="me-2" />
                    Order Items ({orderItems.length})
                  </CardTitle>
                </CardHeader>
                <CardBody className="p-0">
                  <Table responsive className="mb-0">
                    <thead className="table-light">
                      <tr><th>Item</th><th>Price</th><th>Qty</th><th>Subtotal</th><th>Notes</th><th></th></tr>
                    </thead>
                    <tbody>
                      {orderItems.map(item => (
                        <tr key={item.menu_item_id}>
                          <td className="fw-semibold">{item.name}</td>
                          <td>${item.price.toFixed(2)}</td>
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <Button type="button" size="sm" variant="outline-secondary" style={{ padding: '1px 7px' }}
                                onClick={() => updateQty(item.menu_item_id, item.quantity - 1)}>
                                <Icon name="minus" size={12} />
                              </Button>
                              <span className="px-1">{item.quantity}</span>
                              <Button type="button" size="sm" variant="outline-secondary" style={{ padding: '1px 7px' }}
                                onClick={() => updateQty(item.menu_item_id, item.quantity + 1)}>
                                <Icon name="plus" size={12} />
                              </Button>
                            </div>
                          </td>
                          <td className="fw-bold">${(item.price * item.quantity).toFixed(2)}</td>
                          <td>
                            <FormControl size="sm" placeholder="Notes..."
                              value={item.notes}
                              onChange={e => setOrderItems(prev => prev.map(i => i.menu_item_id === item.menu_item_id ? { ...i, notes: e.target.value } : i))}
                              style={{ minWidth: 110 }} />
                          </td>
                          <td>
                            <Button type="button" size="sm" variant="outline-danger"
                              onClick={() => setOrderItems(prev => prev.filter(i => i.menu_item_id !== item.menu_item_id))}>
                              <Icon name="trash" size={13} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            )}

            {/* Customer */}
            <Card className="mb-3">
              <CardHeader>
                <CardTitle as="h5" className="mb-0">
                  <Icon name="user" size={16} className="me-2" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardBody>
                <Row className="g-3">
                  <Col md={6}>
                    <FormGroup>
                      <FormLabel>Full Name <span className="text-danger">*</span></FormLabel>
                      <FormControl value={form.customer_name}
                        onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                        isInvalid={!!errors.customer_name} placeholder="John Doe" />
                      <Form.Control.Feedback type="invalid">{errors.customer_name}</Form.Control.Feedback>
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup>
                      <FormLabel>Phone <span className="text-danger">*</span></FormLabel>
                      <FormControl value={form.customer_phone}
                        onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                        isInvalid={!!errors.customer_phone} placeholder="+1 234 567 8900" />
                      <Form.Control.Feedback type="invalid">{errors.customer_phone}</Form.Control.Feedback>
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup>
                      <FormLabel>Email</FormLabel>
                      <FormControl type="email" value={form.customer_email}
                        onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
                        placeholder="john@example.com" />
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup>
                      <FormLabel>Order Type</FormLabel>
                      <div className="d-flex gap-2">
                        {['delivery', 'pickup', 'dine_in'].map(t => (
                          <Button key={t} type="button" size="sm"
                            variant={form.order_type === t ? 'primary' : 'outline-secondary'}
                            onClick={() => setForm(f => ({ ...f, order_type: t }))}>
                            {t === 'dine_in' ? 'Dine In' : t.charAt(0).toUpperCase() + t.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </FormGroup>
                  </Col>
                </Row>
              </CardBody>
            </Card>

            {/* Delivery */}
            {form.order_type === 'delivery' && (
              <Card className="mb-3">
                <CardHeader>
                  <CardTitle as="h5" className="mb-0">
                    <Icon name="truck" size={16} className="me-2" />
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
                            <Button key={dt} type="button" size="sm"
                              variant={form.item_delivery_type === dt ? 'primary' : 'outline-secondary'}
                              onClick={() => setForm(f => ({ ...f, item_delivery_type: dt }))}>
                              {dt.charAt(0).toUpperCase() + dt.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <FormLabel>Delivery Vendor</FormLabel>
                        <FormSelect value={form.delivery_vendor} onChange={e => setForm(f => ({ ...f, delivery_vendor: e.target.value }))}>
                          {DELIVERY_VENDORS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                        </FormSelect>
                      </FormGroup>
                    </Col>
                    <Col md={12}>
                      <FormGroup>
                        <FormLabel>Delivery Address <span className="text-danger">*</span></FormLabel>
                        <FormControl as="textarea" rows={2}
                          value={form.delivery_address}
                          onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))}
                          isInvalid={!!errors.delivery_address} placeholder="Full address..." />
                        <Form.Control.Feedback type="invalid">{errors.delivery_address}</Form.Control.Feedback>
                      </FormGroup>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            )}

            <Card className="mb-3">
              <CardBody>
                <FormGroup>
                  <FormLabel>Order Notes</FormLabel>
                  <FormControl as="textarea" rows={2} value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Special instructions..." />
                </FormGroup>
              </CardBody>
            </Card>
          </Col>

          {/* Right: Summary */}
          <Col xl={4}>
            <Card className="sticky-top" style={{ top: 80 }}>
              <CardHeader><CardTitle as="h5" className="mb-0">Order Summary</CardTitle></CardHeader>
              <CardBody>
                {orderItems.length === 0 ? (
                  <p className="text-muted small">Select a business and add items from the menu.</p>
                ) : (
                  <>
                    {orderItems.map(i => (
                      <div key={i.menu_item_id} className="d-flex justify-content-between mb-2">
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>{i.name} × {i.quantity}</span>
                        <span style={{ fontSize: '0.85rem' }}>${(i.price * i.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <hr />
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Subtotal</span><span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1 text-muted">
                      <span>Tax ({TAX_RATE}%)</span><span>${tax.toFixed(2)}</span>
                    </div>
                    {form.order_type === 'delivery' && (
                      <div className="d-flex justify-content-between mb-1 text-muted">
                        <span>Delivery Fee</span><span>${deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    <hr />
                    <div className="d-flex justify-content-between fw-bold fs-5 mb-4">
                      <span>Total</span><span>${total.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <Button type="submit" variant="primary" className="w-100" disabled={submitting}>
                  {submitting
                    ? <><Spinner size="sm" className="me-2" />Creating...</>
                    : <><Icon name="check-circle" size={15} className="me-2" />Create Order</>}
                </Button>
                <Button type="button" variant="outline-secondary" className="w-100 mt-2"
                  onClick={() => navigate('/apps/ecommerce/orders')}>
                  <Icon name="x" size={14} className="me-1" />Cancel
                </Button>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Form>
    </>
  );
}
