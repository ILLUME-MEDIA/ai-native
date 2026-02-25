import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle,
  Col, Form, Row, Spinner, Table
} from 'react-bootstrap';

const SESSION_KEY = 'ecom_session_id';

function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

const api = (method, url, data = null) =>
  axios({ method, url, data, headers: { 'X-Session-Id': getSessionId() } });

export default function CartPage() {
  const navigate = useNavigate();

  // Seller search
  const [sellers, setSellers]         = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingBiz, setLoadingBiz]   = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const searchTimer = useRef(null);

  // Menu state
  const [menuItems, setMenuItems]         = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [activeCat, setActiveCat]         = useState(null);
  const [loadingMenu, setLoadingMenu]     = useState(false);

  // Cart state
  const [cartItems, setCartItems]   = useState([]);
  const [loadingCart, setLoadingCart] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast]           = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load sellers (debounced search)
  const loadSellers = useCallback(async (search = '') => {
    setLoadingBiz(true);
    try {
      const r = await axios.get(
        `/api/ecommerce/muzzhub?per_page=50&active_only=1${search ? `&search=${encodeURIComponent(search)}` : ''}`
      );
      setSellers(Array.isArray(r.data) ? r.data : (r.data.data || []));
    } catch {
      setSellers([]);
    } finally {
      setLoadingBiz(false);
    }
  }, []);

  // Initial load
  useEffect(() => { loadSellers(); }, [loadSellers]);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadSellers(searchQuery), 350);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery, loadSellers]);

  // Load cart
  const loadCart = useCallback(() => {
    setLoadingCart(true);
    api('get', '/api/ecommerce/cart')
      .then(r => setCartItems(r.data.items || []))
      .finally(() => setLoadingCart(false));
  }, []);

  useEffect(() => { loadCart(); }, [loadCart]);

  // Load menu when seller selected
  useEffect(() => {
    if (!selectedSeller?.business_id) return;
    setLoadingMenu(true);
    setActiveCat(null);
    const bizId = selectedSeller.business_id;
    Promise.all([
      axios.get(`/api/ecommerce/businesses/${bizId}/menu-categories`),
      axios.get(`/api/ecommerce/businesses/${bizId}/menu-items`),
    ]).then(([catRes, itemRes]) => {
      setMenuCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setMenuItems(Array.isArray(itemRes.data) ? itemRes.data : []);
    }).catch(() => {
      setMenuCategories([]);
      setMenuItems([]);
    }).finally(() => setLoadingMenu(false));
  }, [selectedSeller]);

  const selectSeller = (seller) => {
    if (!seller.business_id) {
      showToast(`"${seller.name}" has no linked Business — set Linked Business ID in Sellers page first.`, 'warning');
      return;
    }
    setSelectedSeller(seller);
  };

  const backToList = () => {
    setSelectedSeller(null);
    setMenuItems([]);
    setMenuCategories([]);
    setActiveCat(null);
  };

  const addToCart = (item) => {
    api('post', '/api/ecommerce/cart', {
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
    api('delete', '/api/ecommerce/cart/clear')
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
          style={{ zIndex: 9999, minWidth: 280 }}
        >
          {toast.msg}
        </Alert>
      )}

      <Row>
        {/* Left: Seller Browser + Menu */}
        <Col lg={8}>
          <Card className="mb-3">
            <CardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
              <CardTitle as="h5" className="mb-0">
                <Icon icon="store" size={18} className="me-2" />
                {selectedSeller ? selectedSeller.name : 'Browse Restaurants'}
              </CardTitle>
              <div className="d-flex align-items-center gap-2">
                {!selectedSeller && (
                  <Form.Control
                    size="sm"
                    placeholder="Search restaurants…"
                    style={{ width: 220 }}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    autoComplete="off"
                  />
                )}
                {selectedSeller && (
                  <Button size="sm" variant="outline-secondary" onClick={backToList}>
                    <Icon icon="arrow-left" size={14} className="me-1" />
                    All Restaurants
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardBody>
              {/* Seller grid */}
              {!selectedSeller && (
                loadingBiz ? (
                  <div className="text-center py-3"><Spinner size="sm" /> Loading...</div>
                ) : sellers.length === 0 ? (
                  <p className="text-muted text-center mb-0">
                    {searchQuery ? `No results for "${searchQuery}"` : 'No sellers found.'}
                  </p>
                ) : (
                  <Row className="g-2">
                    {sellers.map(seller => (
                      <Col key={seller.id} xs={6} sm={4} md={3}>
                        <div
                          className={`border rounded p-3 text-center h-100 d-flex flex-column align-items-center justify-content-center ${!seller.business_id ? 'opacity-50' : ''}`}
                          style={{ cursor: seller.business_id ? 'pointer' : 'not-allowed', transition: 'all .15s' }}
                          onClick={() => selectSeller(seller)}
                          onMouseEnter={e => seller.business_id && e.currentTarget.classList.add('border-primary', 'bg-light')}
                          onMouseLeave={e => e.currentTarget.classList.remove('border-primary', 'bg-light')}
                          title={!seller.business_id ? 'No Business linked — set in Sellers page' : seller.name}
                        >
                          {seller.logo ? (
                            <img src={seller.logo} alt={seller.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} className="mb-2" />
                          ) : (
                            <div className="bg-primary bg-opacity-10 rounded d-flex align-items-center justify-content-center mb-2" style={{ width: 48, height: 48 }}>
                              <Icon icon="tools-kitchen-2" size={22} className="text-primary" />
                            </div>
                          )}
                          <small className="fw-semibold text-center lh-sm">{seller.name}</small>
                          <Badge bg="secondary" className="mt-1" style={{ fontSize: '0.62rem' }}>
                            {seller.category?.name || seller.cuisine || seller.type || '—'}
                          </Badge>
                          {seller.city && (
                            <small className="text-muted mt-1" style={{ fontSize: '0.65rem' }}>
                              <Icon icon="map-pin" size={10} className="me-1" />{seller.city}
                            </small>
                          )}
                          {!seller.business_id && (
                            <Badge bg="warning" text="dark" className="mt-1" style={{ fontSize: '0.6rem' }}>No menu</Badge>
                          )}
                        </div>
                      </Col>
                    ))}
                  </Row>
                )
              )}

              {/* Menu */}
              {selectedSeller && (
                <>
                  {menuCategories.length > 0 && (
                    <div className="d-flex gap-2 flex-wrap mb-3">
                      <Button size="sm" variant={activeCat === null ? 'primary' : 'outline-primary'} onClick={() => setActiveCat(null)}>
                        All
                      </Button>
                      {menuCategories.map(cat => (
                        <Button
                          key={cat.id} size="sm"
                          variant={activeCat === cat.id ? 'primary' : 'outline-primary'}
                          onClick={() => setActiveCat(cat.id)}
                        >
                          {cat.name}
                          {cat.menu_items_count != null && (
                            <Badge bg="light" text="dark" className="ms-1" style={{ fontSize: '0.65rem' }}>{cat.menu_items_count}</Badge>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}

                  {loadingMenu ? (
                    <div className="text-center py-4"><Spinner size="sm" /> Loading menu…</div>
                  ) : filteredItems.length === 0 ? (
                    <Alert variant="info" className="mb-0">No menu items available in this category.</Alert>
                  ) : (
                    <Row className="g-3">
                      {filteredItems.filter(i => i.is_available !== false).map(item => {
                        const existing = inCart(item.id);
                        return (
                          <Col key={item.id} xs={12} sm={6} md={4}>
                            <Card className="h-100 shadow-sm">
                              {item.image && (
                                <img src={item.image} alt={item.name} style={{ height: 110, objectFit: 'cover', borderRadius: '8px 8px 0 0' }} />
                              )}
                              <CardBody className="p-3">
                                <div className="fw-semibold lh-sm">{item.name}</div>
                                {item.description && (
                                  <small className="text-muted d-block mb-1" style={{ fontSize: '0.73rem' }}>{item.description}</small>
                                )}
                                {item.menu_category && (
                                  <Badge bg="light" text="dark" className="mb-2" style={{ fontSize: '0.62rem' }}>{item.menu_category.name}</Badge>
                                )}
                                <div className="d-flex align-items-center justify-content-between mt-1">
                                  <span className="fw-bold text-success">${parseFloat(item.price).toFixed(2)}</span>
                                  {existing ? (
                                    <div className="d-flex align-items-center gap-1">
                                      <Button size="sm" variant="outline-danger" style={{ padding: '1px 7px' }}
                                        onClick={() => updateQty(existing, existing.quantity - 1)}>
                                        <Icon icon="minus" size={12} />
                                      </Button>
                                      <span className="fw-bold px-1">{existing.quantity}</span>
                                      <Button size="sm" variant="outline-success" style={{ padding: '1px 7px' }}
                                        onClick={() => updateQty(existing, existing.quantity + 1)}>
                                        <Icon icon="plus" size={12} />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="primary" onClick={() => addToCart(item)}>
                                      <Icon icon="plus" size={14} className="me-1" />Add
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

          {/* Cart Items Table */}
          <Card>
            <CardHeader className="d-flex align-items-center justify-content-between">
              <CardTitle as="h5" className="mb-0">
                <Icon icon="shopping-cart" size={18} className="me-2" />
                Cart Items
                {cartCount > 0 && <Badge bg="primary" className="ms-2">{cartCount}</Badge>}
              </CardTitle>
              {cartItems.length > 0 && (
                <Button size="sm" variant="outline-danger" onClick={clearCart}>
                  <Icon icon="trash" size={14} className="me-1" />Clear Cart
                </Button>
              )}
            </CardHeader>
            <CardBody className="p-0">
              {loadingCart ? (
                <div className="text-center py-4"><Spinner size="sm" /> Loading cart...</div>
              ) : cartItems.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <Icon icon="shopping-cart" size={40} className="mb-3 opacity-50" />
                  <p>Cart is empty. Browse a restaurant and add items.</p>
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
                            <Button size="sm" variant="outline-secondary" style={{ padding: '1px 7px' }}
                              disabled={updatingId === item.id}
                              onClick={() => updateQty(item, item.quantity - 1)}>
                              <Icon icon="minus" size={12} />
                            </Button>
                            <span className="px-2">{item.quantity}</span>
                            <Button size="sm" variant="outline-secondary" style={{ padding: '1px 7px' }}
                              disabled={updatingId === item.id}
                              onClick={() => updateQty(item, item.quantity + 1)}>
                              <Icon icon="plus" size={12} />
                            </Button>
                          </div>
                        </td>
                        <td className="fw-semibold">
                          ${(parseFloat(item.menu_item?.price || 0) * item.quantity).toFixed(2)}
                        </td>
                        <td>
                          <Button size="sm" variant="outline-danger"
                            disabled={updatingId === item.id}
                            onClick={() => removeItem(item)}>
                            {updatingId === item.id ? <Spinner size="sm" /> : <Icon icon="trash" size={14} />}
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
                      <span className="text-muted small">{item.menu_item?.name} × {item.quantity}</span>
                      <span className="small">${(parseFloat(item.menu_item?.price || 0) * item.quantity).toFixed(2)}</span>
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
                  <Button variant="primary" className="w-100" onClick={() => navigate('/apps/ecommerce/checkout')}>
                    <Icon icon="credit-card" size={16} className="me-2" />
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
