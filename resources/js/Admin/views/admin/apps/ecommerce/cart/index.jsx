import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle,
  Col, Form, Row, Spinner, Table
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

export default function CartPage() {
  const navigate = useNavigate();

  // Browser state
  const [businesses, setBusinesses] = useState([]);
  const [selectedBiz, setSelectedBiz] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [loadingBiz, setLoadingBiz] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(false);

  // Cart state
  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load businesses
  useEffect(() => {
    setLoadingBiz(true);
    axios.get('/api/ecommerce/businesses?per_page=50')
      .then(r => setBusinesses(r.data.data || r.data))
      .finally(() => setLoadingBiz(false));
  }, []);

  // Load cart
  const loadCart = useCallback(() => {
    setLoadingCart(true);
    api('get', '/api/ecommerce/cart')
      .then(r => setCartItems(r.data))
      .finally(() => setLoadingCart(false));
  }, []);

  useEffect(() => { loadCart(); }, [loadCart]);

  // Load menu when business selected
  useEffect(() => {
    if (!selectedBiz) return;
    setLoadingMenu(true);
    setActiveCat(null);
    Promise.all([
      axios.get(`/api/ecommerce/businesses/${selectedBiz.id}/menu-categories`),
      axios.get(`/api/ecommerce/businesses/${selectedBiz.id}/menu-items`),
    ]).then(([catRes, itemRes]) => {
      setMenuCategories(catRes.data);
      setMenuItems(itemRes.data);
    }).finally(() => setLoadingMenu(false));
  }, [selectedBiz]);

  const addToCart = (item) => {
    api('post', '/api/ecommerce/cart', {
      business_id: selectedBiz.id,
      menu_item_id: item.id,
      quantity: 1,
    }).then(() => {
      showToast(`${item.name} added to cart`);
      loadCart();
    }).catch(() => showToast('Failed to add item', 'danger'));
  };

  const updateQty = (cartItem, qty) => {
    if (qty < 1) { removeItem(cartItem); return; }
    setUpdatingId(cartItem.id);
    api('patch', `/api/ecommerce/cart/${cartItem.id}`, { quantity: qty })
      .then(() => loadCart())
      .catch(() => showToast('Update failed', 'danger'))
      .finally(() => setUpdatingId(null));
  };

  const removeItem = (cartItem) => {
    setUpdatingId(cartItem.id);
    api('delete', `/api/ecommerce/cart/${cartItem.id}`)
      .then(() => { showToast('Item removed'); loadCart(); })
      .catch(() => showToast('Remove failed', 'danger'))
      .finally(() => setUpdatingId(null));
  };

  const clearCart = () => {
    api('delete', '/api/ecommerce/cart')
      .then(() => { showToast('Cart cleared'); setCartItems([]); })
      .catch(() => showToast('Failed to clear', 'danger'));
  };

  const filteredItems = activeCat
    ? menuItems.filter(i => i.menu_category_id === activeCat)
    : menuItems;

  const subtotal = cartItems.reduce(
    (sum, i) => sum + parseFloat(i.menu_item?.price || 0) * i.quantity, 0
  );

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const inCart = (itemId) => cartItems.find(c => c.menu_item_id === itemId);

  return (
    <>
      <PageBreadcrumb title="Cart" subtitle="Ecommerce" />

      {toast && (
        <Alert
          variant={toast.type}
          className="position-fixed top-0 end-0 m-3 shadow"
          style={{ zIndex: 9999, minWidth: 260 }}
        >
          {toast.msg}
        </Alert>
      )}

      <Row>
        {/* Left: Business Browser + Menu */}
        <Col lg={8}>
          {/* Business selector */}
          <Card className="mb-3">
            <CardHeader className="d-flex align-items-center justify-content-between">
              <CardTitle as="h5" className="mb-0">
                <Icon name="store" size={18} className="me-2" />
                Browse Businesses
              </CardTitle>
              {selectedBiz && (
                <Button size="sm" variant="outline-secondary" onClick={() => setSelectedBiz(null)}>
                  <Icon name="x" size={14} className="me-1" />
                  Back to list
                </Button>
              )}
            </CardHeader>
            <CardBody>
              {loadingBiz ? (
                <div className="text-center py-3"><Spinner size="sm" /> Loading...</div>
              ) : !selectedBiz ? (
                <Row className="g-2">
                  {businesses.map(biz => (
                    <Col key={biz.id} xs={6} sm={4} md={3}>
                      <div
                        className="border rounded p-3 text-center cursor-pointer h-100 d-flex flex-column align-items-center justify-content-center"
                        style={{ cursor: 'pointer', transition: 'all .2s' }}
                        onClick={() => setSelectedBiz(biz)}
                        onMouseEnter={e => e.currentTarget.classList.add('border-primary', 'bg-light')}
                        onMouseLeave={e => e.currentTarget.classList.remove('border-primary', 'bg-light')}
                      >
                        {biz.logo ? (
                          <img src={biz.logo} alt={biz.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} className="mb-2" />
                        ) : (
                          <div className="bg-primary bg-opacity-10 rounded d-flex align-items-center justify-content-center mb-2" style={{ width: 48, height: 48 }}>
                            <Icon name="store" size={22} className="text-primary" />
                          </div>
                        )}
                        <small className="fw-semibold text-center">{biz.name}</small>
                        <Badge bg="secondary" className="mt-1" style={{ fontSize: '0.65rem' }}>
                          {biz.category?.name || biz.type || '—'}
                        </Badge>
                      </div>
                    </Col>
                  ))}
                  {businesses.length === 0 && (
                    <Col xs={12}>
                      <p className="text-muted text-center mb-0">No businesses found. Add some first.</p>
                    </Col>
                  )}
                </Row>
              ) : (
                <>
                  {/* Category tabs */}
                  {menuCategories.length > 0 && (
                    <div className="d-flex gap-2 flex-wrap mb-3">
                      <Button
                        size="sm"
                        variant={activeCat === null ? 'primary' : 'outline-primary'}
                        onClick={() => setActiveCat(null)}
                      >
                        All
                      </Button>
                      {menuCategories.map(cat => (
                        <Button
                          key={cat.id}
                          size="sm"
                          variant={activeCat === cat.id ? 'primary' : 'outline-primary'}
                          onClick={() => setActiveCat(cat.id)}
                        >
                          {cat.name}
                        </Button>
                      ))}
                    </div>
                  )}

                  {loadingMenu ? (
                    <div className="text-center py-4"><Spinner size="sm" /> Loading menu...</div>
                  ) : filteredItems.length === 0 ? (
                    <Alert variant="info">No menu items available.</Alert>
                  ) : (
                    <Row className="g-3">
                      {filteredItems.filter(i => i.is_available).map(item => {
                        const existing = inCart(item.id);
                        return (
                          <Col key={item.id} xs={12} sm={6} md={4}>
                            <Card className="h-100 shadow-sm">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  style={{ height: 120, objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
                                />
                              )}
                              <CardBody className="p-3">
                                <div className="fw-semibold">{item.name}</div>
                                {item.description && (
                                  <small className="text-muted d-block mb-1" style={{ fontSize: '0.75rem' }}>
                                    {item.description}
                                  </small>
                                )}
                                <div className="d-flex align-items-center justify-content-between mt-2">
                                  <span className="fw-bold text-success">${parseFloat(item.price).toFixed(2)}</span>
                                  {existing ? (
                                    <div className="d-flex align-items-center gap-1">
                                      <Button size="sm" variant="outline-danger" style={{ padding: '1px 7px' }}
                                        onClick={() => updateQty(existing, existing.quantity - 1)}>
                                        <Icon name="minus" size={12} />
                                      </Button>
                                      <span className="fw-bold px-1">{existing.quantity}</span>
                                      <Button size="sm" variant="outline-success" style={{ padding: '1px 7px' }}
                                        onClick={() => updateQty(existing, existing.quantity + 1)}>
                                        <Icon name="plus" size={12} />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="primary" onClick={() => addToCart(item)}>
                                      <Icon name="plus" size={14} className="me-1" />
                                      Add
                                    </Button>
                                  )}
                                </div>
                              </CardBody>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          {/* Cart Items */}
          <Card>
            <CardHeader className="d-flex align-items-center justify-content-between">
              <CardTitle as="h5" className="mb-0">
                <Icon name="shopping-cart" size={18} className="me-2" />
                Cart Items
                {cartCount > 0 && <Badge bg="primary" className="ms-2">{cartCount}</Badge>}
              </CardTitle>
              {cartItems.length > 0 && (
                <Button size="sm" variant="outline-danger" onClick={clearCart}>
                  <Icon name="trash" size={14} className="me-1" />
                  Clear Cart
                </Button>
              )}
            </CardHeader>
            <CardBody className="p-0">
              {loadingCart ? (
                <div className="text-center py-4"><Spinner size="sm" /> Loading cart...</div>
              ) : cartItems.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <Icon name="shopping-cart" size={40} className="mb-3 opacity-50" />
                  <p>Your cart is empty. Browse a business and add items.</p>
                </div>
              ) : (
                <Table responsive className="mb-0">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map(item => (
                      <tr key={item.id}>
                        <td>
                          <div className="fw-semibold">{item.menu_item?.name || '—'}</div>
                          <small className="text-muted">{item.business?.name}</small>
                        </td>
                        <td>${parseFloat(item.menu_item?.price || 0).toFixed(2)}</td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            <Button
                              size="sm" variant="outline-secondary" style={{ padding: '1px 7px' }}
                              disabled={updatingId === item.id}
                              onClick={() => updateQty(item, item.quantity - 1)}
                            >
                              <Icon name="minus" size={12} />
                            </Button>
                            <span className="px-2">{item.quantity}</span>
                            <Button
                              size="sm" variant="outline-secondary" style={{ padding: '1px 7px' }}
                              disabled={updatingId === item.id}
                              onClick={() => updateQty(item, item.quantity + 1)}
                            >
                              <Icon name="plus" size={12} />
                            </Button>
                          </div>
                        </td>
                        <td className="fw-semibold">
                          ${(parseFloat(item.menu_item?.price || 0) * item.quantity).toFixed(2)}
                        </td>
                        <td>
                          <Button
                            size="sm" variant="outline-danger"
                            disabled={updatingId === item.id}
                            onClick={() => removeItem(item)}
                          >
                            {updatingId === item.id
                              ? <Spinner size="sm" />
                              : <Icon name="trash" size={14} />}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
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
              {cartItems.length === 0 ? (
                <p className="text-muted mb-0">Add items to see your summary.</p>
              ) : (
                <>
                  {cartItems.map(item => (
                    <div key={item.id} className="d-flex justify-content-between mb-2">
                      <span className="text-muted">
                        {item.menu_item?.name} × {item.quantity}
                      </span>
                      <span>${(parseFloat(item.menu_item?.price || 0) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <hr />
                  <div className="d-flex justify-content-between mb-2">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 text-muted">
                    <span>Tax (est.)</span>
                    <span>${(subtotal * 0.1).toFixed(2)}</span>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between fw-bold fs-5 mb-3">
                    <span>Total</span>
                    <span>${(subtotal * 1.1).toFixed(2)}</span>
                  </div>
                  <Button
                    variant="primary"
                    className="w-100"
                    onClick={() => navigate('/apps/ecommerce/checkout')}
                  >
                    <Icon name="credit-card" size={16} className="me-2" />
                    Proceed to Checkout
                  </Button>
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
