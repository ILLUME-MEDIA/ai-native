import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle,
  Col, Form, FormControl, FormGroup, FormLabel, FormSelect,
  Row, Spinner
} from 'react-bootstrap';

const SESSION_KEY = 'ecom_session_id';
const STRIPE_PK   = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const TAX_RATE    = 10; // percent
const DELIVERY_FEE = 3.99;

function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function getOtpToken() {
  return localStorage.getItem('otp_auth_token') || localStorage.getItem('otp_token') || null;
}

// Cart / order requests use X-Session-Id only — must stay consistent with cart page
const api = (method, url, data = null) =>
  axios({ method, url, data, headers: { 'X-Session-Id': getSessionId() } });

// Stripe-specific requests need OTP Bearer token
const stripeApi = (method, url, data = null) => {
  const token = getOtpToken();
  return axios({
    method, url, data,
    headers: {
      'X-Session-Id': getSessionId(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

const DELIVERY_VENDORS = [
  { value: '',          label: 'In-house / Self' },
  { value: 'doordash',  label: 'DoorDash' },
  { value: 'uber_eats', label: 'Uber Eats' },
  { value: 'grubhub',   label: 'GrubHub' },
  { value: 'instacart', label: 'Instacart' },
  { value: 'postmates', label: 'Postmates' },
];

const initialForm = {
  customer_name:      '',
  customer_email:     '',
  customer_phone:     '',
  order_type:         'delivery',
  item_delivery_type: 'delivery',
  delivery_vendor:    '',
  delivery_address:   '',
  notes:              '',
};

export default function CheckoutPage() {
  const navigate  = useNavigate();
  const cardRef   = useRef(null);

  const [cartItems,    setCartItems]    = useState([]);
  const [loadingCart,  setLoadingCart]  = useState(true);
  const [form,         setForm]         = useState(initialForm);
  const [errors,       setErrors]       = useState({});
  const [submitting,   setSubmitting]   = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [toast,        setToast]        = useState(null);

  // payment state
  const [paymentMethod,  setPaymentMethod]  = useState('cod'); // 'cod' | 'stripe'
  const [savedCards,     setSavedCards]     = useState([]);
  const [loadingCards,   setLoadingCards]   = useState(false);
  const [selectedCard,   setSelectedCard]   = useState('new'); // stripe_pm_id or 'new'
  const [stripeObj,      setStripeObj]      = useState(null);
  const [cardElement,    setCardElement]    = useState(null);
  const [cardError,      setCardError]      = useState(null);

  // inline OTP login state
  const [isOtpLoggedIn, setIsOtpLoggedIn]  = useState(() => !!getOtpToken());
  const [otpStep,       setOtpStep]        = useState('email'); // 'email' | 'code' | 'done'
  const [otpEmail,      setOtpEmail]       = useState('');
  const [otpCode,       setOtpCode]        = useState('');
  const [otpSending,    setOtpSending]     = useState(false);
  const [otpVerifying,  setOtpVerifying]   = useState(false);
  const [otpMsg,        setOtpMsg]         = useState(null); // { text, type }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Load cart ────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingCart(true);
    api('get', '/api/ecommerce/cart')
      .then(r => setCartItems(r.data.items || []))
      .finally(() => setLoadingCart(false));
  }, []);

  // ── Load Stripe.js ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!STRIPE_PK) return;
    if (window.Stripe) { setStripeObj(window.Stripe(STRIPE_PK)); return; }
    const script = document.createElement('script');
    script.src   = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => setStripeObj(window.Stripe(STRIPE_PK));
    document.head.appendChild(script);
  }, []);

  // ── Load saved cards when Stripe tab selected and logged in ─────────────
  useEffect(() => {
    if (paymentMethod !== 'stripe' || !isOtpLoggedIn) return;
    loadSavedCards();
  }, [paymentMethod, isOtpLoggedIn]);

  // ── Mount / unmount Stripe card element ──────────────────────────────────
  useEffect(() => {
    if (paymentMethod !== 'stripe' || selectedCard !== 'new' || !stripeObj || !cardRef.current) {
      if (cardElement) { cardElement.unmount(); setCardElement(null); }
      return;
    }
    const elements = stripeObj.elements();
    const card = elements.create('card', {
      style: { base: { fontSize: '16px', color: '#495057', '::placeholder': { color: '#6c757d' } } },
    });
    card.mount(cardRef.current);
    card.on('change', e => setCardError(e.error?.message || null));
    setCardElement(card);
    return () => { card.unmount(); setCardElement(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, selectedCard, stripeObj]);

  // ── Totals ───────────────────────────────────────────────────────────────
  const businessId  = cartItems[0]?.business_id ?? null;
  const subtotal    = cartItems.reduce((s, i) => s + parseFloat(i.menu_item?.price || 0) * i.quantity, 0);
  const tax         = subtotal * (TAX_RATE / 100);
  const deliveryFee = form.order_type === 'delivery' ? DELIVERY_FEE : 0;
  const total       = subtotal + tax + deliveryFee;

  // Pre-fill OTP email from customer email field
  useEffect(() => {
    if (form.customer_email && !otpEmail) setOtpEmail(form.customer_email);
  }, [form.customer_email]);

  // ── Inline OTP login handlers ────────────────────────────────────────────
  const loadSavedCards = () => {
    setLoadingCards(true);
    stripeApi('get', '/api/payment/stripe/methods').then(r => {
      const cards = r.data.payment_methods || [];
      setSavedCards(cards);
      if (cards.length > 0) {
        const def = cards.find(c => c.is_default) || cards[0];
        setSelectedCard(def.stripe_pm_id);
      } else {
        setSelectedCard('new');
      }
    }).catch(() => {
      setSavedCards([]);
      setSelectedCard('new');
    }).finally(() => setLoadingCards(false));
  };

  const handleSendOtp = async () => {
    if (!otpEmail.trim()) return;
    setOtpSending(true);
    setOtpMsg(null);
    try {
      await axios.post('/api/otp-auth/send', { email: otpEmail.trim() });
      setOtpStep('code');
      setOtpMsg({ text: `OTP sent to ${otpEmail}. Check your inbox.`, type: 'success' });
    } catch (err) {
      setOtpMsg({ text: err.response?.data?.message || 'Failed to send OTP. Try again.', type: 'danger' });
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) return;
    setOtpVerifying(true);
    setOtpMsg(null);
    try {
      const res = await axios.post('/api/otp-auth/verify', {
        email:        otpEmail.trim(),
        otp:          otpCode.trim(),
        on_not_found: 'create',
        create_data:  { name: otpEmail.split('@')[0] },
      });
      const token = res.data.token;
      if (!token) throw new Error(res.data.message || 'Verification failed. Please try again.');
      localStorage.setItem('otp_auth_token', token);
      setIsOtpLoggedIn(true);
      setOtpStep('done');
      setOtpMsg(null);
      loadSavedCards();
    } catch (err) {
      setOtpMsg({ text: err.response?.data?.message || err.message || 'Invalid OTP.', type: 'danger' });
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.customer_name.trim())  errs.customer_name  = 'Name is required';
    if (!form.customer_email.trim()) errs.customer_email = 'Email is required';
    if (!form.customer_phone.trim()) errs.customer_phone = 'Phone is required';
    if (form.order_type === 'delivery' && !form.delivery_address.trim())
      errs.delivery_address = 'Delivery address is required';
    return errs;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (cartItems.length === 0)   { showToast('Cart is empty', 'warning'); return; }
    if (!businessId)              { showToast('Could not determine business. Please reload your cart.', 'danger'); return; }

    setSubmitting(true);
    try {
      let pmId = null;

      // Step 1 — new card: setup-intent → confirmCardSetup → save-method
      if (paymentMethod === 'stripe' && selectedCard === 'new') {
        if (!stripeObj || !cardElement) throw new Error('Stripe not loaded yet. Please wait a moment and try again.');
        if (!getOtpToken()) throw new Error('OTP login required for card payment.');

        const siRes = await stripeApi('post', '/api/payment/stripe/setup-intent');

        const { error: confirmError, setupIntent } = await stripeObj.confirmCardSetup(
          siRes.data.client_secret,
          { payment_method: { card: cardElement } }
        );
        if (confirmError) throw new Error(confirmError.message);

        const saveRes = await stripeApi('post', '/api/payment/stripe/save-method', {
          payment_method_id: setupIntent.payment_method,
          set_default: true,
        });

        pmId = saveRes.data.payment_method.stripe_pm_id;

      } else if (paymentMethod === 'stripe' && selectedCard !== 'new') {
        pmId = selectedCard;
      }

      // Step 2 — place order
      const orderRes = await api('post', '/api/ecommerce/orders', {
        business_id:        businessId,
        customer_name:      form.customer_name,
        customer_email:     form.customer_email,
        customer_phone:     form.customer_phone,
        order_type:         form.order_type,
        item_delivery_type: form.item_delivery_type,
        delivery_vendor:    form.delivery_vendor,
        delivery_address:   form.delivery_address,
        notes:              form.notes,
        tax_rate:           TAX_RATE,
        delivery_fee:       deliveryFee,
      });
      const order = orderRes.data;

      // Step 3 — charge if Stripe
      if (paymentMethod === 'stripe') {
        const chargePayload = { order_id: order.id };
        if (pmId) chargePayload.payment_method_id = pmId;
        const chargeRes = await stripeApi('post', '/api/payment/stripe/charge', chargePayload);
        order.payment_status = chargeRes.data.payment_status;
      }

      setSuccessOrder(order);
      setCartItems([]);

    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to place order';
      showToast(msg, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (successOrder) {
    const ps = successOrder.payment_status;
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
                  {ps && (
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Payment</span>
                      <Badge bg={ps === 'paid' ? 'success' : ps === 'failed' ? 'danger' : 'secondary'}>
                        {ps}
                      </Badge>
                    </div>
                  )}
                  {successOrder.delivery_vendor && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Via</span>
                      <Badge bg="info" className="text-capitalize">
                        {successOrder.delivery_vendor.replace('_', ' ')}
                      </Badge>
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

  // ── Main form ─────────────────────────────────────────────────────────────
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
          {/* ── Left column ── */}
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

            {/* Delivery Details */}
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

            {/* Payment Method */}
            <Card className="mb-3">
              <CardHeader>
                <CardTitle as="h5" className="mb-0">
                  <Icon name="credit-card" size={17} className="me-2" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="d-flex gap-3 mb-3">
                  <Button
                    type="button"
                    variant={paymentMethod === 'cod' ? 'primary' : 'outline-secondary'}
                    onClick={() => setPaymentMethod('cod')}
                  >
                    <Icon name="banknote" size={14} className="me-2" />
                    Cash on Delivery
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === 'stripe' ? 'primary' : 'outline-secondary'}
                    onClick={() => setPaymentMethod('stripe')}
                  >
                    <Icon name="credit-card" size={14} className="me-2" />
                    Credit / Debit Card
                  </Button>
                </div>

                {paymentMethod === 'stripe' && (
                  <>
                    {!STRIPE_PK && (
                      <Alert variant="warning" className="mb-3">
                        <Icon name="alert-triangle" size={14} className="me-1" />
                        Stripe not configured. Add <code>VITE_STRIPE_PUBLISHABLE_KEY</code> to your <code>.env</code> file.
                      </Alert>
                    )}
                    {/* ── Inline OTP login when not authenticated ── */}
                    {!isOtpLoggedIn && (
                      <div className="border rounded p-3 mb-3" style={{ background: '#f8f9fa' }}>
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <Icon name="lock" size={15} className="text-primary" />
                          <span className="fw-semibold">Login to pay by card</span>
                        </div>

                        {otpMsg && (
                          <Alert variant={otpMsg.type} className="py-2 mb-3" style={{ fontSize: '0.875rem' }}>
                            {otpMsg.text}
                          </Alert>
                        )}

                        {otpStep === 'email' && (
                          <Row className="g-2 align-items-end">
                            <Col>
                              <FormLabel style={{ fontSize: '0.85rem' }}>Your email address</FormLabel>
                              <FormControl
                                type="email"
                                size="sm"
                                placeholder="you@example.com"
                                value={otpEmail}
                                onChange={e => setOtpEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                              />
                            </Col>
                            <Col xs="auto">
                              <Button
                                size="sm"
                                onClick={handleSendOtp}
                                disabled={otpSending || !otpEmail.trim()}
                              >
                                {otpSending ? <Spinner size="sm" /> : 'Send OTP'}
                              </Button>
                            </Col>
                          </Row>
                        )}

                        {otpStep === 'code' && (
                          <>
                            <div className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
                              OTP sent to <strong>{otpEmail}</strong>
                            </div>
                            <Row className="g-2 align-items-end">
                              <Col>
                                <FormLabel style={{ fontSize: '0.85rem' }}>6-digit OTP code</FormLabel>
                                <FormControl
                                  type="text"
                                  size="sm"
                                  placeholder="123456"
                                  maxLength={6}
                                  value={otpCode}
                                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                  onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                                  autoFocus
                                />
                              </Col>
                              <Col xs="auto">
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={handleVerifyOtp}
                                  disabled={otpVerifying || otpCode.length < 4}
                                >
                                  {otpVerifying ? <Spinner size="sm" /> : 'Verify'}
                                </Button>
                              </Col>
                            </Row>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 mt-2 text-muted"
                              onClick={() => { setOtpStep('email'); setOtpCode(''); setOtpMsg(null); }}
                            >
                              Change email / Resend
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    {/* ── Saved cards + new card (only when logged in) ── */}
                    {isOtpLoggedIn && loadingCards && (
                      <div className="text-muted py-2">
                        <Spinner size="sm" className="me-2" />Loading saved cards...
                      </div>
                    )}
                    {isOtpLoggedIn && !loadingCards && (
                      <>
                        {savedCards.length > 0 && (
                          <div className="mb-3">
                            <FormLabel className="fw-semibold mb-2">Saved Cards</FormLabel>
                            <div className="d-flex flex-column gap-2">
                              {savedCards.map(card => (
                                <div
                                  key={card.stripe_pm_id}
                                  className={`border rounded p-2 d-flex align-items-center gap-2 ${selectedCard === card.stripe_pm_id ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => setSelectedCard(card.stripe_pm_id)}
                                >
                                  <input type="radio" readOnly checked={selectedCard === card.stripe_pm_id} className="me-1" />
                                  <Icon name="credit-card" size={14} className="text-muted" />
                                  <span className="text-capitalize">{card.brand}</span>
                                  <span className="text-muted">•••• {card.last4}</span>
                                  <span className="text-muted ms-auto" style={{ fontSize: '0.8rem' }}>
                                    {card.exp_month}/{card.exp_year}
                                  </span>
                                  {card.is_default && (
                                    <Badge bg="success" className="ms-1">Default</Badge>
                                  )}
                                </div>
                              ))}
                              <div
                                className={`border rounded p-2 d-flex align-items-center gap-2 ${selectedCard === 'new' ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSelectedCard('new')}
                              >
                                <input type="radio" readOnly checked={selectedCard === 'new'} className="me-1" />
                                <Icon name="plus-circle" size={14} className="text-muted" />
                                <span>Use a new card</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedCard === 'new' && STRIPE_PK && (
                          <div>
                            <FormLabel className="fw-semibold mb-2">Card Details</FormLabel>
                            <div
                              ref={cardRef}
                              className="form-control"
                              style={{ padding: '10px 12px', minHeight: 42 }}
                            />
                            {cardError && (
                              <div className="text-danger mt-1" style={{ fontSize: '0.875rem' }}>{cardError}</div>
                            )}
                            {!stripeObj && (
                              <div className="text-muted mt-1" style={{ fontSize: '0.875rem' }}>
                                <Spinner size="sm" className="me-1" />Loading Stripe...
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </CardBody>
            </Card>

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

          {/* ── Right column — Order Summary ── */}
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
                      <span>Tax ({TAX_RATE}%)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    {form.order_type === 'delivery' && (
                      <div className="d-flex justify-content-between mb-1 text-muted">
                        <span>Delivery Fee</span>
                        <span>${deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    <hr />
                    <div className="d-flex justify-content-between fw-bold fs-5 mb-3">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                    {paymentMethod === 'stripe' && (
                      <div className="d-flex align-items-center gap-1 mb-3 text-muted" style={{ fontSize: '0.8rem' }}>
                        <Icon name="lock" size={12} />
                        Secured by Stripe
                      </div>
                    )}
                  </>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100"
                  disabled={submitting || cartItems.length === 0 || (paymentMethod === 'stripe' && !isOtpLoggedIn)}
                >
                  {submitting ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      {paymentMethod === 'stripe' ? 'Processing Payment...' : 'Placing Order...'}
                    </>
                  ) : (
                    <>
                      <Icon name="check-circle" size={16} className="me-2" />
                      {paymentMethod === 'stripe' ? 'Pay & Place Order' : 'Place Order'}
                    </>
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
