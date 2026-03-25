import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
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

function getOtpToken() {
  return localStorage.getItem('otp_auth_token') || localStorage.getItem('otp_token') || null;
}

const api = (method, url, data = null) =>
  axios({ method, url, data, headers: { 'X-Session-Id': getSessionId() } });

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

// Vendors supported by POST /api/delivery/quote
const QUOTE_VENDORS = [
  { value: 'doordash',    label: 'DoorDash',      badge: 'danger',  api: true },
  { value: 'uber_direct', label: 'Uber Direct',   badge: 'dark',    api: true },
  { value: 'instacart',   label: 'Instacart',     badge: 'warning', api: true },
  { value: 'own',         label: 'Own Delivery',  badge: 'primary', api: true },
  { value: 'shipengine',  label: 'ShipEngine',    badge: 'info',    api: true },
];

const QUOTE_MODES = [
  { value: 'all',      label: 'Show All' },
  { value: 'cheapest', label: 'Cheapest Only' },
  { value: 'specific', label: 'Specific Vendor' },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
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

const initialAddr = { street: '', apt: '', city: '', state: 'CA', zip: '', country: 'US' };

export default function CheckoutPage() {
  const navigate = useNavigate();
  const cardRef  = useRef(null);

  // Cart
  const [cartItems,    setCartItems]    = useState([]);
  const [cartData,     setCartData]     = useState(null);
  const [loadingCart,  setLoadingCart]  = useState(true);

  // Form
  const [form,         setForm]         = useState(initialForm);
  const [errors,       setErrors]       = useState({});
  const [submitting,   setSubmitting]   = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [toast,        setToast]        = useState(null);

  // Structured address
  const [addrFields, setAddrFields] = useState(initialAddr);

  // Delivery quotes
  const [selectedVendors,     setSelectedVendors]     = useState(['doordash', 'uber_direct']);
  const [quoteMode,           setQuoteMode]           = useState('all');
  const [specificVendor,      setSpecificVendor]      = useState('doordash');
  const [quotes,              setQuotes]              = useState({});
  const [quoteErrors,         setQuoteErrors]         = useState({});
  const [quotesLoading,       setQuotesLoading]       = useState(false);
  const [selectedQuoteVendor, setSelectedQuoteVendor] = useState(null);
  const [quoteFetched,        setQuoteFetched]        = useState(false);

  // Tax
  const [taxRate,    setTaxRate]    = useState(10);
  const [taxLabel,   setTaxLabel]   = useState('10%');
  const [taxLoading, setTaxLoading] = useState(false);

  // Tips
  const [selectedTip, setSelectedTip] = useState(null);
  const [customTip,   setCustomTip]   = useState('');

  // Stripe
  const [stripePk,      setStripePk]      = useState(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [savedCards,    setSavedCards]    = useState([]);
  const [loadingCards,  setLoadingCards]  = useState(false);
  const [selectedCard,  setSelectedCard]  = useState('new');
  const [stripeObj,     setStripeObj]     = useState(null);
  const [cardElement,   setCardElement]   = useState(null);
  const [cardError,     setCardError]     = useState(null);

  // OTP
  const [isOtpLoggedIn, setIsOtpLoggedIn] = useState(() => !!getOtpToken());
  const [otpStep,       setOtpStep]       = useState('email');
  const [otpEmail,      setOtpEmail]      = useState('');
  const [otpCode,       setOtpCode]       = useState('');
  const [otpSending,    setOtpSending]    = useState(false);
  const [otpVerifying,  setOtpVerifying]  = useState(false);
  const [otpMsg,        setOtpMsg]        = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Load cart ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingCart(true);
    api('get', '/api/ecommerce/cart')
      .then(r => { setCartItems(r.data.items || []); setCartData(r.data); })
      .finally(() => setLoadingCart(false));
  }, []);

  // ── Stripe setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (stripePk) return;
    axios.get('/api/payment/stripe/config')
      .then(r => { if (r.data.publishable_key) setStripePk(r.data.publishable_key); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!stripePk) return;
    if (window.Stripe) { setStripeObj(window.Stripe(stripePk)); return; }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => setStripeObj(window.Stripe(stripePk));
    document.head.appendChild(script);
  }, [stripePk]);

  useEffect(() => {
    if (paymentMethod !== 'stripe' || !isOtpLoggedIn) return;
    loadSavedCards();
  }, [paymentMethod, isOtpLoggedIn]);

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

  // ── Sync address fields → form.delivery_address ───────────────────────────
  useEffect(() => {
    const parts = [
      addrFields.street,
      addrFields.apt ? `Apt ${addrFields.apt}` : '',
      addrFields.city,
      addrFields.state,
      addrFields.zip,
    ].filter(Boolean);
    setForm(f => ({ ...f, delivery_address: parts.join(', ') }));
    setErrors(e => ({ ...e, delivery_address: null }));
  }, [addrFields]);

  // ── Tax API lookup on ZIP change (debounced) ──────────────────────────────
  useEffect(() => {
    const zip = addrFields.zip;
    if (!/^\d{5}$/.test(zip)) { setTaxRate(10); setTaxLabel('10% (default)'); return; }
    const timer = setTimeout(() => {
      setTaxLoading(true);
      axios.get(`/api/ecommerce/tax?zip=${zip}&subtotal=1`)
        .then(r => {
          if (r.data.success && r.data.data?.tax_rate !== undefined) {
            const rate = parseFloat(r.data.data.tax_rate) * 100;
            setTaxRate(rate);
            setTaxLabel(`${rate.toFixed(2)}% (${r.data.data.tax_region ?? zip})`);
          }
        })
        .catch(() => {})
        .finally(() => setTaxLoading(false));
    }, 800);
    return () => clearTimeout(timer);
  }, [addrFields.zip]);

  // ── OTP email pre-fill ────────────────────────────────────────────────────
  useEffect(() => {
    if (form.customer_email && !otpEmail) setOtpEmail(form.customer_email);
  }, [form.customer_email]);

  // ── Computed totals ───────────────────────────────────────────────────────
  const businessId  = cartItems[0]?.business_id ?? null;
  const subtotal    = cartData?.subtotal ?? cartItems.reduce((s, i) => s + parseFloat(i.menu_item?.price || 0) * i.quantity, 0);
  const platformFee = cartData?.platform_fee ?? 0;
  const tipOptions  = cartData?.tip_options ?? null;
  const tipAmount   = selectedTip?.type === 'custom'
    ? Math.max(0, parseFloat(customTip || 0))
    : (selectedTip?.amount ?? 0);
  const tax = subtotal * (taxRate / 100);
  const selectedQuote = selectedQuoteVendor ? quotes[selectedQuoteVendor] : null;
  const deliveryFee = form.order_type === 'delivery' ? (selectedQuote?.fee ?? 0) : 0;
  const total = subtotal + platformFee + tipAmount + tax + deliveryFee;

  // ── Fetch delivery quotes ─────────────────────────────────────────────────
  const fetchQuotes = useCallback(async () => {
    if (!form.delivery_address.trim()) {
      showToast('Please enter a delivery address first', 'warning');
      return;
    }
    if (!businessId) {
      showToast('Cart is empty — cannot fetch quotes', 'warning');
      return;
    }

    const vendorsToFetch = (quoteMode === 'specific'
      ? [specificVendor]
      : selectedVendors
    ).filter(v => QUOTE_VENDORS.find(x => x.value === v)?.api);

    if (vendorsToFetch.length === 0) {
      showToast('No supported vendors selected', 'warning');
      return;
    }

    setQuotesLoading(true);
    setQuotes({});
    setQuoteErrors({});
    setSelectedQuoteVendor(null);
    setQuoteFetched(false);

    const results = {};
    const errs    = {};

    await Promise.allSettled(
      vendorsToFetch.map(vendor =>
        axios.post('/api/delivery/quote', {
          vendor,
          dropoff_address: form.delivery_address,
          order_value:     subtotal,
          business_id:     businessId,
          ...(form.customer_phone ? { customer_phone: form.customer_phone } : {}),
        })
          .then(r  => { results[vendor] = r.data; })
          .catch(e => { errs[vendor]    = e.response?.data?.message || e.message || 'Failed'; })
      )
    );

    setQuotes(results);
    setQuoteErrors(errs);
    setQuoteFetched(true);

    // Auto-select: cheapest successful vendor
    const successful = Object.keys(results).filter(v => results[v]?.success && results[v]?.fee != null);
    if (successful.length > 0) {
      const cheapest = successful.reduce((best, v) =>
        (results[v].fee ?? 999) < (results[best].fee ?? 999) ? v : best
      );
      setSelectedQuoteVendor(cheapest);
    }

    setQuotesLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.delivery_address, form.customer_phone, subtotal, businessId, quoteMode, specificVendor, selectedVendors]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: null }));
  };

  const handleAddrChange = (field, value) => {
    setAddrFields(a => ({ ...a, [field]: value }));
    if (['street', 'city', 'state', 'zip'].includes(field)) {
      setQuotes({});
      setSelectedQuoteVendor(null);
      setQuoteFetched(false);
    }
  };

  const toggleVendor = (v) => {
    setSelectedVendors(prev =>
      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
    );
    setQuotes({});
    setSelectedQuoteVendor(null);
    setQuoteFetched(false);
  };

  const loadSavedCards = () => {
    setLoadingCards(true);
    stripeApi('get', '/api/payment/stripe/methods')
      .then(r => {
        const cards = r.data.payment_methods || [];
        setSavedCards(cards);
        const def = cards.find(c => c.is_default) || cards[0];
        setSelectedCard(def ? def.stripe_pm_id : 'new');
      })
      .catch(() => { setSavedCards([]); setSelectedCard('new'); })
      .finally(() => setLoadingCards(false));
  };

  const handleSendOtp = async () => {
    if (!otpEmail.trim()) return;
    setOtpSending(true); setOtpMsg(null);
    try {
      await axios.post('/api/otp-auth/send', { email: otpEmail.trim() });
      setOtpStep('code');
      setOtpMsg({ text: `OTP sent to ${otpEmail}. Check your inbox.`, type: 'success' });
    } catch (err) {
      setOtpMsg({ text: err.response?.data?.message || 'Failed to send OTP.', type: 'danger' });
    } finally { setOtpSending(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) return;
    setOtpVerifying(true); setOtpMsg(null);
    try {
      const res = await axios.post('/api/otp-auth/verify', {
        email: otpEmail.trim(), otp: otpCode.trim(),
        on_not_found: 'create', create_data: { name: otpEmail.split('@')[0] },
      });
      const token = res.data.token;
      if (!token) throw new Error(res.data.message || 'Verification failed.');
      localStorage.setItem('otp_auth_token', token);
      setIsOtpLoggedIn(true); setOtpStep('done'); setOtpMsg(null);
      loadSavedCards();
    } catch (err) {
      setOtpMsg({ text: err.response?.data?.message || err.message || 'Invalid OTP.', type: 'danger' });
    } finally { setOtpVerifying(false); }
  };

  const validate = () => {
    const errs = {};
    if (!form.customer_name.trim())  errs.customer_name  = 'Name is required';
    if (!form.customer_email.trim()) errs.customer_email = 'Email is required';
    if (!form.customer_phone.trim()) errs.customer_phone = 'Phone is required';
    if (form.order_type === 'delivery' && !addrFields.street.trim())
      errs.delivery_address = 'Street address is required';
    return errs;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (cartItems.length === 0)   { showToast('Cart is empty', 'warning'); return; }
    if (!businessId)              { showToast('Could not determine business. Please reload your cart.', 'danger'); return; }

    setSubmitting(true);
    try {
      let pmId = null;
      if (paymentMethod === 'stripe' && selectedCard === 'new') {
        if (!stripeObj || !cardElement) throw new Error('Stripe not loaded yet. Please wait a moment.');
        if (!getOtpToken()) throw new Error('OTP login required for card payment.');
        const siRes = await stripeApi('post', '/api/payment/stripe/setup-intent');
        const { error: confirmError, setupIntent } = await stripeObj.confirmCardSetup(
          siRes.data.client_secret, { payment_method: { card: cardElement } }
        );
        if (confirmError) throw new Error(confirmError.message);
        const saveRes = await stripeApi('post', '/api/payment/stripe/save-method', {
          payment_method_id: setupIntent.payment_method, set_default: true,
        });
        pmId = saveRes.data.payment_method.stripe_pm_id;
      } else if (paymentMethod === 'stripe' && selectedCard !== 'new') {
        pmId = selectedCard;
      }

      let tipType = 'none', tipValue = 0;
      if (selectedTip) {
        if (selectedTip.type === 'custom')      { tipType = 'fixed';      tipValue = Math.max(0, parseFloat(customTip || 0)); }
        else if (selectedTip.type === 'percentage') { tipType = 'percentage'; tipValue = selectedTip.percent; }
      }

      const orderRes = await api('post', '/api/ecommerce/checkout', {
        business_id:              businessId,
        customer_name:            form.customer_name,
        customer_email:           form.customer_email,
        customer_phone:           form.customer_phone,
        order_type:               form.order_type,
        delivery_vendor:          selectedQuoteVendor || form.delivery_vendor || '',
        delivery_address:         form.delivery_address,
        notes:                    form.notes,
        tax_rate:                 taxRate,
        delivery_fee:             deliveryFee,
        tip_type:                 tipType,
        tip_value:                tipValue,
        payment_method:           paymentMethod,
        stripe_payment_method_id: pmId ?? undefined,
      });

      setSuccessOrder(orderRes.data.order ?? orderRes.data);
      setCartItems([]);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to place order';
      showToast(msg, 'danger');
    } finally { setSubmitting(false); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const vendorMeta  = (v) => QUOTE_VENDORS.find(x => x.value === v) ?? { label: v, badge: 'secondary' };

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
                  <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: 80, height: 80 }}>
                    <Icon name="check-circle" size={40} className="text-success" />
                  </div>
                </div>
                <h3 className="fw-bold mb-2">Order Placed!</h3>
                <p className="text-muted mb-1">Thank you, {successOrder.customer_name}!</p>
                <p className="text-muted mb-4">Your order <strong>#{successOrder.order_number}</strong> has been received.</p>
                <div className="bg-light rounded p-3 mb-4 text-start">
                  {[
                    ['Subtotal',     `$${parseFloat(successOrder.subtotal ?? 0).toFixed(2)}`],
                    parseFloat(successOrder.platform_fee ?? 0) > 0 && ['Platform Fee', `$${parseFloat(successOrder.platform_fee).toFixed(2)}`],
                    parseFloat(successOrder.tip ?? 0) > 0          && ['Tip',          `$${parseFloat(successOrder.tip).toFixed(2)}`],
                    parseFloat(successOrder.tax ?? 0) > 0          && ['Tax',          `$${parseFloat(successOrder.tax).toFixed(2)}`],
                    parseFloat(successOrder.delivery_fee ?? 0) > 0 && ['Delivery Fee', `$${parseFloat(successOrder.delivery_fee).toFixed(2)}`],
                  ].filter(Boolean).map(([label, val]) => (
                    <div key={label} className="d-flex justify-content-between mb-1">
                      <span className="text-muted">{label}</span><span>{val}</span>
                    </div>
                  ))}
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between fw-bold mb-1">
                    <span>Order Total</span>
                    <span>${parseFloat(successOrder.total).toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Status</span>
                    <Badge bg="warning" text="dark">{successOrder.status}</Badge>
                  </div>
                  {ps && (
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Payment</span>
                      <Badge bg={ps === 'paid' ? 'success' : ps === 'failed' ? 'danger' : 'secondary'}>{ps}</Badge>
                    </div>
                  )}
                  {successOrder.delivery_vendor && (
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Via</span>
                      <Badge bg={vendorMeta(successOrder.delivery_vendor).badge} className="text-capitalize">
                        {vendorMeta(successOrder.delivery_vendor).label}
                      </Badge>
                    </div>
                  )}
                  {successOrder.doordash_delivery_id && (
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">DoorDash ID</span>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>{successOrder.doordash_delivery_id}</span>
                    </div>
                  )}
                  {successOrder.uber_direct_delivery_id && (
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Uber Direct ID</span>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>{successOrder.uber_direct_delivery_id}</span>
                    </div>
                  )}
                </div>
                <div className="d-flex gap-2 justify-content-center flex-wrap">
                  <Button variant="outline-primary" onClick={() => navigate('/apps/ecommerce/orders')}>
                    <Icon name="list" size={15} className="me-1" />View Orders
                  </Button>
                  {(successOrder.tracking_url || successOrder.doordash_tracking_url || successOrder.uber_direct_tracking_url) && (
                    <Button
                      variant="warning"
                      as="a"
                      href={successOrder.tracking_url || successOrder.doordash_tracking_url || successOrder.uber_direct_tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon name="map-pin" size={15} className="me-1" />Track Delivery
                    </Button>
                  )}
                  <Button variant="primary" onClick={() => navigate('/apps/ecommerce/cart')}>
                    <Icon name="shopping-cart" size={15} className="me-1" />New Order
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
        <Alert variant={toast.type} className="position-fixed top-0 end-0 m-3 shadow" style={{ zIndex: 9999, minWidth: 280 }}>
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
                  <Icon name="user" size={17} className="me-2" />Customer Information
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
                      <div className="d-flex gap-2 flex-wrap">
                        {['delivery', 'pickup', 'dine_in'].map(type => (
                          <Button
                            key={type} type="button" size="sm"
                            variant={form.order_type === type ? 'primary' : 'outline-secondary'}
                            onClick={() => handleChange('order_type', type)}
                          >
                            <Icon name={type === 'delivery' ? 'truck' : type === 'pickup' ? 'package' : 'utensils'} size={13} className="me-1" />
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
                    <Icon name="truck" size={17} className="me-2" />Delivery Details
                  </CardTitle>
                </CardHeader>
                <CardBody>

                  {/* ── Structured Address ── */}
                  <div className="mb-3">
                    <FormLabel className="fw-semibold mb-2">
                      <Icon name="map-pin" size={14} className="me-1" />Delivery Address
                    </FormLabel>
                    <Row className="g-2">
                      <Col md={8}>
                        <FormControl
                          type="text"
                          placeholder="Street address *"
                          value={addrFields.street}
                          onChange={e => handleAddrChange('street', e.target.value)}
                          isInvalid={!!errors.delivery_address}
                        />
                        {errors.delivery_address && (
                          <div className="text-danger mt-1" style={{ fontSize: '0.875rem' }}>{errors.delivery_address}</div>
                        )}
                      </Col>
                      <Col md={4}>
                        <FormControl
                          type="text"
                          placeholder="Apt / Unit (optional)"
                          value={addrFields.apt}
                          onChange={e => handleAddrChange('apt', e.target.value)}
                        />
                      </Col>
                      <Col md={5}>
                        <FormControl
                          type="text"
                          placeholder="City *"
                          value={addrFields.city}
                          onChange={e => handleAddrChange('city', e.target.value)}
                        />
                      </Col>
                      <Col md={3}>
                        <FormSelect
                          value={addrFields.state}
                          onChange={e => handleAddrChange('state', e.target.value)}
                        >
                          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </FormSelect>
                      </Col>
                      <Col md={4}>
                        <div className="input-group">
                          <FormControl
                            type="text"
                            placeholder="ZIP code"
                            maxLength={5}
                            value={addrFields.zip}
                            onChange={e => handleAddrChange('zip', e.target.value.replace(/\D/g, ''))}
                          />
                          {taxLoading && (
                            <span className="input-group-text">
                              <Spinner size="sm" />
                            </span>
                          )}
                        </div>
                      </Col>
                    </Row>
                    {form.delivery_address && (
                      <div className="mt-2 text-muted" style={{ fontSize: '0.8rem' }}>
                        <Icon name="check-circle" size={12} className="me-1 text-success" />
                        {form.delivery_address}
                      </div>
                    )}
                  </div>

                  <hr />

                  {/* ── Vendor Selection + Quote Mode ── */}
                  <Row className="g-3">
                    <Col md={7}>
                      <FormLabel className="fw-semibold mb-2">
                        <Icon name="package" size={14} className="me-1" />Delivery Vendors
                      </FormLabel>
                      <div className="d-flex flex-wrap gap-2">
                        {QUOTE_VENDORS.map(v => (
                          <div
                            key={v.value}
                            className={`border rounded px-2 py-1 d-flex align-items-center gap-1 ${selectedVendors.includes(v.value) ? `border-${v.badge} bg-${v.badge} bg-opacity-10` : 'border-secondary'}`}
                            style={{ cursor: 'pointer', fontSize: '0.82rem', color: '#212529' }}
                            onClick={() => quoteMode !== 'specific' && toggleVendor(v.value)}
                          >
                            <Form.Check
                              type="checkbox"
                              checked={selectedVendors.includes(v.value)}
                              onChange={() => quoteMode !== 'specific' && toggleVendor(v.value)}
                              onClick={e => e.stopPropagation()}
                              disabled={quoteMode === 'specific'}
                              className="me-1"
                            />
                            <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#212529' }}>{v.label}</span>
                            {!v.api && <span style={{ fontSize: '0.7rem', color: '#6c757d' }}>(shipping)</span>}
                          </div>
                        ))}
                      </div>
                    </Col>
                    <Col md={5}>
                      <FormLabel className="fw-semibold mb-2">
                        <Icon name="settings" size={14} className="me-1" />Display Mode
                      </FormLabel>
                      <FormSelect
                        value={quoteMode}
                        onChange={e => { setQuoteMode(e.target.value); setQuotes({}); setSelectedQuoteVendor(null); setQuoteFetched(false); }}
                        size="sm"
                      >
                        {QUOTE_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </FormSelect>
                      {quoteMode === 'specific' && (
                        <FormSelect
                          className="mt-2"
                          value={specificVendor}
                          onChange={e => { setSpecificVendor(e.target.value); setQuotes({}); setSelectedQuoteVendor(null); setQuoteFetched(false); }}
                          size="sm"
                        >
                          {QUOTE_VENDORS.filter(v => v.api).map(v => (
                            <option key={v.value} value={v.value}>{v.label}</option>
                          ))}
                        </FormSelect>
                      )}
                    </Col>
                  </Row>

                  {/* ── Get Quotes Button ── */}
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline-primary"
                      onClick={fetchQuotes}
                      disabled={quotesLoading || !form.delivery_address.trim()}
                    >
                      {quotesLoading
                        ? <><Spinner size="sm" className="me-2" />Fetching Quotes...</>
                        : <><Icon name="zap" size={14} className="me-2" />Get Delivery Quotes</>
                      }
                    </Button>
                    {!form.delivery_address.trim() && (
                      <span className="text-muted ms-2" style={{ fontSize: '0.8rem' }}>Enter address first</span>
                    )}
                  </div>

                  {/* ── Quote Results ── */}
                  {quoteFetched && !quotesLoading && (
                    <div className="mt-3">
                      {Object.keys(quoteErrors).length > 0 && (
                        <div className="mb-2">
                          {Object.entries(quoteErrors).map(([v, err]) => (
                            <div key={v} className="text-danger" style={{ fontSize: '0.8rem' }}>
                              <Icon name="alert-circle" size={12} className="me-1" />
                              {vendorMeta(v).label}: {err}
                            </div>
                          ))}
                        </div>
                      )}
                      {Object.keys(quotes).filter(v => quotes[v]?.success).length === 0 ? (
                        <Alert variant="warning" className="py-2 mb-0" style={{ fontSize: '0.85rem' }}>
                          No delivery quotes available for this address.
                        </Alert>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {Object.entries(quotes)
                            .filter(([, q]) => q?.success)
                            .sort(([, a], [, b]) => (a.fee ?? 999) - (b.fee ?? 999))
                            .map(([v, q]) => {
                              const isSelected  = selectedQuoteVendor === v;
                              const meta        = vendorMeta(v);
                              return (
                                <div
                                  key={v}
                                  className={`border rounded p-2 ${isSelected ? `border-${meta.badge} bg-${meta.badge} bg-opacity-10` : ''}`}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => setSelectedQuoteVendor(v)}
                                >
                                  <div className="d-flex align-items-center gap-2">
                                    <input type="radio" readOnly checked={isSelected} className="me-1" />
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#212529' }}>{meta.label}</span>
                                    {q.carrier && (
                                      <span style={{ fontSize: '0.72rem', color: '#6c757d' }}>({q.carrier})</span>
                                    )}
                                    <span className="ms-auto fw-bold" style={{ color: '#212529', fontSize: '0.95rem' }}>${(q.fee ?? 0).toFixed(2)}</span>
                                    {q.fee === Math.min(...Object.values(quotes).filter(x => x?.success).map(x => x.fee ?? 999)) && (
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fff', background: '#198754', borderRadius: 4, padding: '1px 6px' }}>Cheapest</span>
                                    )}
                                  </div>
                                  <div className="d-flex align-items-center gap-3 mt-1 ms-4" style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                                    <span className="d-flex align-items-center gap-1">
                                      <Icon name="clock" size={11} />
                                      {q.delivery_days
                                        ? `${q.delivery_days} day${q.delivery_days > 1 ? 's' : ''}`
                                        : `~${q.estimated_minutes} min`}
                                    </span>
                                    {q.tax > 0 && (
                                      <span>+${q.tax.toFixed(2)} tax</span>
                                    )}
                                    {q.service && (
                                      <span>{q.service}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Payment Method */}
            <Card className="mb-3">
              <CardHeader>
                <CardTitle as="h5" className="mb-0">
                  <Icon name="credit-card" size={17} className="me-2" />Payment Method
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="d-flex gap-3 mb-3 flex-wrap">
                  <Button type="button" variant={paymentMethod === 'cod' ? 'primary' : 'outline-secondary'} onClick={() => setPaymentMethod('cod')}>
                    <Icon name="banknote" size={14} className="me-2" />Cash on Delivery
                  </Button>
                  <Button type="button" variant={paymentMethod === 'stripe' ? 'primary' : 'outline-secondary'} onClick={() => setPaymentMethod('stripe')}>
                    <Icon name="credit-card" size={14} className="me-2" />Credit / Debit Card
                  </Button>
                </div>

                {paymentMethod === 'stripe' && (
                  <>
                    {!stripePk && (
                      <Alert variant="warning" className="mb-3">
                        <Icon name="alert-triangle" size={14} className="me-1" />
                        Stripe not configured. Add <code>VITE_STRIPE_PUBLISHABLE_KEY</code> to your <code>.env</code> file.
                      </Alert>
                    )}
                    {!isOtpLoggedIn && (
                      <div className="border rounded p-3 mb-3" style={{ background: '#f8f9fa' }}>
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <Icon name="lock" size={15} className="text-primary" />
                          <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>Verify your email to pay by card</span>
                        </div>
                        {otpMsg && (
                          <Alert variant={otpMsg.type} className="py-2 mb-3" style={{ fontSize: '0.875rem' }}>{otpMsg.text}</Alert>
                        )}
                        {otpStep === 'email' && (
                          <Row className="g-2 align-items-end">
                            <Col>
                              <FormLabel style={{ fontSize: '0.85rem' }}>Your email address</FormLabel>
                              <FormControl type="email" size="sm" placeholder="you@example.com" value={otpEmail}
                                onChange={e => setOtpEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendOtp()} />
                            </Col>
                            <Col xs="auto">
                              <Button size="sm" onClick={handleSendOtp} disabled={otpSending || !otpEmail.trim()}>
                                {otpSending ? <Spinner size="sm" /> : 'Send OTP'}
                              </Button>
                            </Col>
                          </Row>
                        )}
                        {otpStep === 'code' && (
                          <>
                            <div className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>OTP sent to <strong>{otpEmail}</strong></div>
                            <Row className="g-2 align-items-end">
                              <Col>
                                <FormLabel style={{ fontSize: '0.85rem' }}>6-digit OTP code</FormLabel>
                                <FormControl type="text" size="sm" placeholder="123456" maxLength={6} value={otpCode}
                                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                  onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()} autoFocus />
                              </Col>
                              <Col xs="auto">
                                <Button size="sm" variant="success" onClick={handleVerifyOtp} disabled={otpVerifying || otpCode.length < 4}>
                                  {otpVerifying ? <Spinner size="sm" /> : 'Verify'}
                                </Button>
                              </Col>
                            </Row>
                            <Button variant="link" size="sm" className="p-0 mt-2 text-muted"
                              onClick={() => { setOtpStep('email'); setOtpCode(''); setOtpMsg(null); }}>
                              Change email / Resend
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                    {isOtpLoggedIn && loadingCards && (
                      <div className="text-muted py-2"><Spinner size="sm" className="me-2" />Loading saved cards...</div>
                    )}
                    {isOtpLoggedIn && !loadingCards && (
                      <>
                        {savedCards.length > 0 && (
                          <div className="mb-3">
                            <FormLabel className="fw-semibold mb-2">Saved Cards</FormLabel>
                            <div className="d-flex flex-column gap-2">
                              {savedCards.map(card => (
                                <div key={card.stripe_pm_id}
                                  className={`border rounded p-2 d-flex align-items-center gap-2 ${selectedCard === card.stripe_pm_id ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                                  style={{ cursor: 'pointer' }} onClick={() => setSelectedCard(card.stripe_pm_id)}>
                                  <input type="radio" readOnly checked={selectedCard === card.stripe_pm_id} className="me-1" />
                                  <Icon name="credit-card" size={14} className="text-muted" />
                                  <span className="text-capitalize">{card.brand}</span>
                                  <span className="text-muted">•••• {card.last4}</span>
                                  <span className="text-muted ms-auto" style={{ fontSize: '0.8rem' }}>{card.exp_month}/{card.exp_year}</span>
                                  {card.is_default && <Badge bg="success" className="ms-1">Default</Badge>}
                                </div>
                              ))}
                              <div className={`border rounded p-2 d-flex align-items-center gap-2 ${selectedCard === 'new' ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                                style={{ cursor: 'pointer' }} onClick={() => setSelectedCard('new')}>
                                <input type="radio" readOnly checked={selectedCard === 'new'} className="me-1" />
                                <Icon name="plus-circle" size={14} className="text-muted" />
                                <span>Use a new card</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {selectedCard === 'new' && stripePk && (
                          <div>
                            <FormLabel className="fw-semibold mb-2">Card Details</FormLabel>
                            <div ref={cardRef} className="form-control" style={{ padding: '10px 12px', minHeight: 42 }} />
                            {cardError && <div className="text-danger mt-1" style={{ fontSize: '0.875rem' }}>{cardError}</div>}
                            {!stripeObj && <div className="text-muted mt-1" style={{ fontSize: '0.875rem' }}><Spinner size="sm" className="me-1" />Loading Stripe...</div>}
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
                  <Icon name="message-square" size={17} className="me-2" />Order Notes
                </CardTitle>
              </CardHeader>
              <CardBody>
                <FormControl
                  as="textarea" rows={2}
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
                    <Button variant="link" className="p-0" onClick={() => navigate('/apps/ecommerce/cart')}>Go to Cart</Button>
                  </Alert>
                ) : (
                  <>
                    {/* Cart items */}
                    <div className="mb-3" style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {cartItems.map(item => (
                        <div key={item.id} className="d-flex justify-content-between mb-2">
                          <span className="text-muted">{item.menu_item?.name} × {item.quantity}</span>
                          <span>${(parseFloat(item.menu_item?.price || 0) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <hr />

                    {/* Subtotal */}
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>

                    {/* Platform fee */}
                    {platformFee > 0 && (
                      <div className="d-flex justify-content-between mb-1 text-muted">
                        <span>Platform Fee</span>
                        <span>${platformFee.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Tax — dynamic from ZIP */}
                    <div className="d-flex justify-content-between mb-1 text-muted">
                      <span className="d-flex align-items-center gap-1">
                        Tax{taxLoading && <Spinner size="sm" style={{ width: 10, height: 10 }} />}
                        <span style={{ fontSize: '0.72rem' }}>({taxLabel})</span>
                      </span>
                      <span>${tax.toFixed(2)}</span>
                    </div>

                    {/* Delivery fee — from selected quote */}
                    {form.order_type === 'delivery' && (
                      <div className="d-flex justify-content-between mb-1 text-muted">
                        <span className="d-flex align-items-center gap-1">
                          Delivery Fee
                          {selectedQuoteVendor && (
                            <Badge bg={vendorMeta(selectedQuoteVendor).badge} style={{ fontSize: '0.65rem' }}>
                              {vendorMeta(selectedQuoteVendor).label}
                            </Badge>
                          )}
                        </span>
                        <span>
                          {quotesLoading
                            ? <Spinner size="sm" style={{ width: 12, height: 12 }} />
                            : selectedQuote
                              ? `$${deliveryFee.toFixed(2)}`
                              : <span className="text-muted" style={{ fontSize: '0.8rem' }}>—</span>
                          }
                        </span>
                      </div>
                    )}

                    {/* Multi-vendor quote comparison in summary */}
                    {form.order_type === 'delivery' && quoteFetched && !quotesLoading && Object.keys(quotes).filter(v => quotes[v]?.success).length > 1 && (
                      <div className="mt-2 mb-2 p-2 rounded" style={{ background: '#f8f9fa', fontSize: '0.78rem' }}>
                        <div className="fw-semibold mb-1 text-muted">
                          <Icon name="layers" size={11} className="me-1" />Select delivery platform:
                        </div>
                        {Object.entries(quotes)
                          .filter(([, q]) => q?.success)
                          .sort(([, a], [, b]) => (a.fee ?? 999) - (b.fee ?? 999))
                          .map(([v, q]) => {
                            const meta       = vendorMeta(v);
                            const isSelected = selectedQuoteVendor === v;
                            return (
                              <div
                                key={v}
                                className={`d-flex align-items-center gap-1 px-2 py-1 rounded mb-1 ${isSelected ? `bg-${meta.badge} bg-opacity-10 border border-${meta.badge}` : 'border'}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSelectedQuoteVendor(v)}
                              >
                                <input type="radio" readOnly checked={isSelected} style={{ width: 12 }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#212529' }}>{meta.label}</span>
                                <span className="ms-auto fw-semibold" style={{ color: '#212529' }}>${(q.fee ?? 0).toFixed(2)}</span>
                                {(q.delivery_days || q.estimated_minutes) && (
                                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                    {q.delivery_days ? `${q.delivery_days}d` : `${q.estimated_minutes}m`}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {/* No quote fetched yet hint */}
                    {form.order_type === 'delivery' && !quoteFetched && !quotesLoading && (
                      <div className="text-muted mb-2" style={{ fontSize: '0.78rem' }}>
                        <Icon name="info" size={11} className="me-1" />
                        Click "Get Delivery Quotes" to fetch live rates
                      </div>
                    )}

                    {/* Tips */}
                    {tipOptions && (
                      <div className="mt-2 mb-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="text-muted small">Tip</span>
                          {selectedTip && (
                            <button type="button" className="btn btn-link btn-sm p-0 text-muted" style={{ fontSize: '0.75rem' }}
                              onClick={() => { setSelectedTip(null); setCustomTip(''); }}>
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="d-flex flex-wrap gap-1 mb-1">
                          {tipOptions.filter(o => o.type === 'percentage').map(opt => (
                            <button key={opt.percent} type="button"
                              className={`btn btn-sm ${selectedTip?.percent === opt.percent ? 'btn-primary' : 'btn-outline-secondary'}`}
                              style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                              onClick={() => { setSelectedTip(opt); setCustomTip(''); }}>
                              {opt.label}<br />
                              <span style={{ fontSize: '0.65rem' }}>${opt.amount.toFixed(2)}</span>
                            </button>
                          ))}
                          {tipOptions.some(o => o.type === 'custom') && (
                            <button type="button"
                              className={`btn btn-sm ${selectedTip?.type === 'custom' ? 'btn-primary' : 'btn-outline-secondary'}`}
                              style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                              onClick={() => setSelectedTip({ type: 'custom' })}>
                              Custom
                            </button>
                          )}
                        </div>
                        {selectedTip?.type === 'custom' && (
                          <div className="input-group input-group-sm">
                            <span className="input-group-text">$</span>
                            <input type="number" className="form-control" min="0" step="0.01" placeholder="0.00"
                              value={customTip} onChange={e => setCustomTip(e.target.value)} />
                          </div>
                        )}
                        {tipAmount > 0 && (
                          <div className="d-flex justify-content-between text-muted mt-1">
                            <span style={{ fontSize: '0.85rem' }}>Tip</span>
                            <span style={{ fontSize: '0.85rem' }}>${tipAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <hr />
                    <div className="d-flex justify-content-between fw-bold fs-5 mb-3">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                    {paymentMethod === 'stripe' && (
                      <div className="d-flex align-items-center gap-1 mb-3 text-muted" style={{ fontSize: '0.8rem' }}>
                        <Icon name="lock" size={12} />Secured by Stripe
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
                    <><Spinner size="sm" className="me-2" />{paymentMethod === 'stripe' ? 'Processing Payment...' : 'Placing Order...'}</>
                  ) : (
                    <><Icon name="check-circle" size={16} className="me-2" />{paymentMethod === 'stripe' ? 'Pay & Place Order' : 'Place Order'}</>
                  )}
                </Button>

                <Button type="button" variant="outline-secondary" className="w-100 mt-2"
                  onClick={() => navigate('/apps/ecommerce/cart')}>
                  <Icon name="arrow-left" size={14} className="me-1" />Back to Cart
                </Button>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Form>
    </>
  );
}
