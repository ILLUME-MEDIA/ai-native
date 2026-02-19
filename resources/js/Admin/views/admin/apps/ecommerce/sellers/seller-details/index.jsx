import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import {
  Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle,
  Col, Row, Spinner, Table
} from 'react-bootstrap';

const TYPE_COLORS = { restaurant: 'danger', store: 'primary', service: 'success' };
const STATUS_COLORS = {
  pending: 'warning', confirmed: 'info', preparing: 'primary',
  ready: 'success', out_for_delivery: 'info', delivered: 'success', cancelled: 'danger'
};

export default function SellerDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bizId = searchParams.get('id');

  const [biz, setBiz]         = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!bizId) return;
    setLoading(true);
    Promise.all([
      axios.get(`/api/ecommerce/businesses/${bizId}`),
      axios.get(`/api/ecommerce/businesses/${bizId}/menu-items`),
      axios.get(`/api/ecommerce/orders?business_id=${bizId}&per_page=10`),
    ]).then(([bizRes, menuRes, ordersRes]) => {
      setBiz(bizRes.data);
      setMenuItems(menuRes.data || []);
      setOrders(ordersRes.data?.data || []);
    }).catch(() => showToast('Failed to load business', 'danger'))
      .finally(() => setLoading(false));
  }, [bizId]);

  if (!bizId) {
    return (
      <>
        <PageBreadcrumb title="Seller Details" subtitle="Ecommerce" />
        <Alert variant="warning">
          No business selected.{' '}
          <Button variant="link" className="p-0" onClick={() => navigate('/apps/ecommerce/sellers')}>
            Go to Sellers
          </Button>
        </Alert>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <PageBreadcrumb title="Seller Details" subtitle="Ecommerce" />
        <div className="text-center py-5"><Spinner /> Loading...</div>
      </>
    );
  }

  if (!biz) {
    return (
      <>
        <PageBreadcrumb title="Seller Details" subtitle="Ecommerce" />
        <Alert variant="danger">Business not found.</Alert>
      </>
    );
  }

  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  const activeItems  = menuItems.filter(i => i.is_available).length;

  return (
    <>
      <PageBreadcrumb title={biz.name} subtitle="Sellers" />

      {toast && (
        <Alert variant={toast.type} className="position-fixed top-0 end-0 m-3 shadow" style={{ zIndex: 9999, minWidth: 260 }}>
          {toast.msg}
        </Alert>
      )}

      <Row>
        {/* Left: Contact Card */}
        <Col xl={3}>
          <Card className="sticky-top" style={{ top: 80 }}>
            <CardBody>
              {biz.cover_image && (
                <img src={biz.cover_image} alt="cover" className="w-100 rounded mb-3" style={{ height: 100, objectFit: 'cover' }} />
              )}
              <div className="d-flex align-items-center gap-3 mb-3">
                {biz.logo ? (
                  <img src={biz.logo} alt={biz.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 12 }} />
                ) : (
                  <div className="bg-primary bg-opacity-10 rounded d-flex align-items-center justify-content-center" style={{ width: 56, height: 56 }}>
                    <Icon name="store" size={26} className="text-primary" />
                  </div>
                )}
                <div>
                  <h5 className="mb-0 fw-bold">{biz.name}</h5>
                  <Badge bg={TYPE_COLORS[biz.category?.type] || 'secondary'} className="mt-1">
                    {biz.category?.name || '—'}
                  </Badge>
                </div>
              </div>

              {[
                { icon: 'map-pin', label: [biz.address, biz.city, biz.state].filter(Boolean).join(', ') || '—' },
                { icon: 'phone', label: biz.phone || '—' },
                { icon: 'mail', label: biz.email || '—' },
              ].map(({ icon, label }) => (
                <div key={icon} className="d-flex align-items-start gap-2 mb-2">
                  <Icon name={icon} size={15} className="text-muted mt-1 flex-shrink-0" />
                  <small className="text-muted">{label}</small>
                </div>
              ))}

              {biz.description && (
                <p className="text-muted small mt-2 border-top pt-2">{biz.description}</p>
              )}

              <div className="mt-2">
                <Badge bg={biz.is_active ? 'success' : 'secondary'}>
                  {biz.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="mt-3 border-top pt-3">
                <Button variant="outline-secondary" size="sm" className="w-100" onClick={() => navigate('/apps/ecommerce/sellers')}>
                  <Icon name="arrow-left" size={14} className="me-1" />
                  Back to Sellers
                </Button>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Right: Stats + Menu + Orders */}
        <Col xl={9}>
          <Row className="g-3 mb-3">
            {[
              { label: 'Menu Items', value: menuItems.length, icon: 'clipboard-list', color: 'primary' },
              { label: 'Available', value: activeItems, icon: 'circle-check', color: 'success' },
              { label: 'Recent Orders', value: orders.length, icon: 'shopping-bag', color: 'warning' },
              { label: 'Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: 'currency-dollar', color: 'info' },
            ].map(stat => (
              <Col key={stat.label} sm={6} xxl={3}>
                <Card>
                  <CardBody className="d-flex align-items-center gap-3">
                    <div className={`bg-${stat.color} bg-opacity-10 rounded p-2`}>
                      <Icon name={stat.icon} size={22} className={`text-${stat.color}`} />
                    </div>
                    <div>
                      <h4 className="mb-0 fw-bold">{stat.value}</h4>
                      <small className="text-muted">{stat.label}</small>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Menu Items */}
          <Card className="mb-3">
            <CardHeader className="d-flex justify-content-between align-items-center">
              <CardTitle as="h5" className="mb-0">
                <Icon name="clipboard-list" size={16} className="me-2" />
                Menu / Products
              </CardTitle>
              <small className="text-muted">{menuItems.length} total</small>
            </CardHeader>
            <CardBody className="p-0">
              {menuItems.length === 0 ? (
                <p className="text-muted text-center py-4">No menu items yet.</p>
              ) : (
                <Table responsive hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map(item => (
                      <tr key={item.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {item.image && (
                              <img src={item.image} alt={item.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
                            )}
                            <div>
                              <div className="fw-semibold">{item.name}</div>
                              {item.description && <small className="text-muted">{item.description}</small>}
                            </div>
                          </div>
                        </td>
                        <td><small className="text-muted">{item.menu_category?.name || '—'}</small></td>
                        <td className="fw-semibold text-success">${parseFloat(item.price).toFixed(2)}</td>
                        <td>
                          <Badge bg={item.is_available ? 'success' : 'secondary'}>
                            {item.is_available ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle as="h5" className="mb-0">
                <Icon name="shopping-bag" size={16} className="me-2" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {orders.length === 0 ? (
                <p className="text-muted text-center py-4">No orders yet.</p>
              ) : (
                <Table responsive hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Type</th>
                      <th>Vendor</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td><span className="fw-semibold">{order.order_number}</span></td>
                        <td>{order.customer_name || '—'}</td>
                        <td className="fw-semibold">${parseFloat(order.total).toFixed(2)}</td>
                        <td><Badge bg="secondary" className="text-capitalize">{order.order_type}</Badge></td>
                        <td>
                          {order.delivery_vendor
                            ? <Badge bg="info">{order.delivery_vendor}</Badge>
                            : <small className="text-muted">—</small>}
                        </td>
                        <td>
                          <Badge bg={STATUS_COLORS[order.status] || 'secondary'} className="text-capitalize">
                            {order.status?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td><small className="text-muted">{new Date(order.created_at).toLocaleDateString()}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
