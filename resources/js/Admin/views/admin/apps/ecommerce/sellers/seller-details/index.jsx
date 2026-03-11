import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import DataTable from '@admin/components/table/DataTable';
import axios from 'axios';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import {
  Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle,
  Col, Row, Spinner,
} from 'react-bootstrap';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const PRICE_MAP = { '1': '$', '2': '$$', '3': '$$$', '4': '$$$$' };

const BOOL_FEATURES = [
  { key: 'delivery',           label: 'Delivery' },
  { key: 'catering',           label: 'Catering' },
  { key: 'wifi',               label: 'WiFi' },
  { key: 'kids_menu',          label: 'Kids Menu' },
  { key: 'pray_space',         label: 'Prayer Space' },
  { key: 'organic',            label: 'Organic' },
  { key: 'wheelchair_access',  label: 'Wheelchair' },
  { key: 'cash_only',          label: 'Cash Only' },
  { key: 'pork',               label: 'Pork Served' },
  { key: 'alcohol',            label: 'Alcohol' },
  { key: 'featured',           label: 'Featured' },
  { key: 'sponsored',          label: 'Sponsored' },
  { key: 'is_online',          label: 'Online' },
  { key: 'enable_order',       label: 'Orders Enabled' },
  { key: 'enable_stripe',      label: 'Stripe Enabled' },
];

const TEXT_FEATURES = [
  { key: 'shisha',          label: 'Shisha' },
  { key: 'drive_thru',      label: 'Drive Thru' },
  { key: 'reservations',    label: 'Reservations' },
  { key: 'outdoor_seating', label: 'Outdoor Seating' },
  { key: 'prayer',          label: 'Prayer Facilities' },
  { key: 'restrooms',       label: 'Restrooms' },
  { key: 'credit_cards',    label: 'Credit Cards' },
  { key: 'amenities',       label: 'Amenities' },
  { key: 'alcohol_options', label: 'Alcohol Options' },
  { key: 'parking',         label: 'Parking' },
  { key: 'transit',         label: 'Transit' },
];

// ── Stable column definitions outside component ──────────────────────────────
const colH = createColumnHelper();
const hoursColumns = [
  colH.accessor('day', {
    header: 'Day',
    enableSorting: false,
    cell: ({ getValue }) => <span className="text-capitalize fw-semibold">{getValue()}</span>,
  }),
  colH.accessor('open', {
    header: 'Opens',
    enableSorting: false,
    cell: ({ getValue }) => getValue()
      ? <span className="text-success fw-semibold">{getValue()}</span>
      : <span className="text-muted">—</span>,
  }),
  colH.accessor('close', {
    header: 'Closes',
    enableSorting: false,
    cell: ({ getValue }) => getValue()
      ? <span className="text-danger fw-semibold">{getValue()}</span>
      : <span className="text-muted">—</span>,
  }),
  colH.display({
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const { open, close } = row.original;
      return (!open && !close)
        ? <Badge bg="secondary">Closed</Badge>
        : <Badge bg="success">Open</Badge>;
    },
  }),
];
// ─────────────────────────────────────────────────────────────────────────────

const InfoRow = ({ icon, value }) => !value ? null : (
  <div className="d-flex align-items-start gap-2 mb-2">
    <Icon icon={icon} size={15} className="text-muted mt-1 flex-shrink-0" />
    <small>{value}</small>
  </div>
);

export default function SellerDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bizId = searchParams.get('id');

  const [biz, setBiz]               = useState(null);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);
  const [menuCats, setMenuCats]     = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!bizId) { setLoading(false); return; }
    setLoading(true);
    axios.get(`/api/ecommerce/muzzhub/${bizId}`)
      .then(r => setBiz(r.data))
      .catch(() => showToast('Failed to load seller', 'danger'))
      .finally(() => setLoading(false));
  }, [bizId]);

  useEffect(() => {
    if (!bizId) return;
    setMenuLoading(true);
    axios.get(`/api/ecommerce/muzzhub/${bizId}/menu-categories`)
      .then(r => setMenuCats(Array.isArray(r.data) ? r.data : []))
      .catch(() => setMenuCats([]))
      .finally(() => setMenuLoading(false));
  }, [bizId]);

  // Stable memoized hours rows — always 7 rows (Mon–Sun)
  const hoursData = useMemo(() => DAYS.map(day => ({
    day,
    open:  biz?.[`${day}_open`]  || '',
    close: biz?.[`${day}_close`] || '',
  })), [biz]);

  // Table created once, updates when hoursData changes
  const hoursTable = useReactTable({
    data: hoursData,
    columns: hoursColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  // No bizId at all
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

  const enabledFeatures = biz ? BOOL_FEATURES.filter(f => biz[f.key]) : [];
  const textFeatures    = biz ? TEXT_FEATURES.filter(f => biz[f.key])  : [];
  const hasHalal        = biz && (biz.compliance || biz.slaughter_method || biz.halal_authority || biz.halal_options);
  const hasFeatures     = enabledFeatures.length > 0 || textFeatures.length > 0;
  const hasOrder        = biz && (biz.order_online_link || biz.platforms || biz.booking);
  const hasExtra        = biz && (biz.comments || biz.ownedBy || biz.capacity || biz.timezone);

  return (
    <>
      <PageBreadcrumb title={biz?.name || 'Seller Details'} subtitle="Sellers" />

      {toast && (
        <Alert variant={toast.type} className="position-fixed top-0 end-0 m-3 shadow" style={{ zIndex: 9999, minWidth: 260 }}>
          {toast.msg}
        </Alert>
      )}

      {/* Full-page loading overlay — no unmount/remount */}
      {loading && (
        <div className="text-center py-5 d-flex align-items-center justify-content-center gap-2 text-muted">
          <Spinner size="sm" /> Loading business...
        </div>
      )}

      {!loading && !biz && (
        <Alert variant="danger">Business not found.</Alert>
      )}

      {!loading && biz && (
        <Row className="g-3">
          {/* ── LEFT SIDEBAR ── */}
          <Col xl={3} lg={4}>
            <Card className="sticky-top" style={{ top: 80 }}>
              <CardBody>
                {biz.cover_image && (
                  <img src={biz.cover_image} alt="cover" className="w-100 rounded mb-3"
                    style={{ height: 110, objectFit: 'cover' }} />
                )}

                <div className="d-flex align-items-center gap-3 mb-3">
                  {biz.logo ? (
                    <img src={biz.logo} alt={biz.name}
                      style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 12 }} />
                  ) : (
                    <div className="bg-primary bg-opacity-10 rounded d-flex align-items-center justify-content-center"
                      style={{ width: 60, height: 60 }}>
                      <Icon icon="building-store" size={28} className="text-primary" />
                    </div>
                  )}
                  <div>
                    <h5 className="mb-1 fw-bold">{biz.name}</h5>
                    <div className="d-flex flex-wrap gap-1">
                      {biz.category && (
                        <span className="badge rounded-pill"
                          style={{ background: biz.category.color || '#6366f1', fontSize: 11 }}>
                          {biz.category.name}
                        </span>
                      )}
                      {biz.type && <Badge bg="secondary" className="text-capitalize">{biz.type}</Badge>}
                      {biz.price && <Badge bg="light" text="dark">{PRICE_MAP[biz.price] || biz.price}</Badge>}
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-wrap gap-1 mb-3">
                  <Badge bg={biz.is_active ? 'success' : 'secondary'}>
                    {biz.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {biz.delivery  && <Badge bg="info">Delivery</Badge>}
                  {biz.featured  && <Badge bg="warning" text="dark">Featured</Badge>}
                  {biz.sponsored && <Badge bg="primary">Sponsored</Badge>}
                  {biz.is_online && <Badge bg="success">Online</Badge>}
                </div>

                <InfoRow icon="map-pin" value={[biz.address, biz.city, biz.state, biz.zip, biz.country].filter(Boolean).join(', ')} />
                <InfoRow icon="phone"   value={biz.phone || biz.mobile_phone} />
                <InfoRow icon="mail"    value={biz.email} />
                <InfoRow icon="world"   value={biz.website} />
                {biz.cuisine && <InfoRow icon="tools-kitchen-2" value={biz.cuisine} />}

                {biz.description && (
                  <p className="text-muted small mt-2 border-top pt-2 mb-2">{biz.description}</p>
                )}

                <div className="border-top pt-3 mt-2 d-flex gap-2">
                  <Button variant="outline-secondary" size="sm" className="flex-grow-1"
                    onClick={() => navigate('/apps/ecommerce/sellers')}>
                    <Icon icon="arrow-left" size={14} className="me-1" />
                    Back
                  </Button>
                  {biz?.business_id && (
                    <Button variant="outline-success" size="sm" className="flex-grow-1"
                      as={Link} to={`/apps/ecommerce/products?biz=${biz.business_id}`}>
                      <Icon icon="tools-kitchen-2" size={14} className="me-1" />
                      Menu
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* ── RIGHT CONTENT ── */}
          <Col xl={9} lg={8}>

            {/* Stats row */}
            <Row className="g-3 mb-3">
              {[
                { label: 'Rating',        value: biz.rating && typeof biz.rating !== 'object' ? biz.rating : '—', icon: 'star', color: 'warning' },
                { label: 'Reviews',       value: biz.review_count  || '0', icon: 'message-circle',  color: 'info' },
                { label: 'Followers',     value: biz.followers     || '0', icon: 'users',           color: 'primary' },
                { label: 'Total Ratings', value: biz.total_ratings || '0', icon: 'chart-bar',       color: 'success' },
              ].map(stat => (
                <Col key={stat.label} sm={6} xxl={3}>
                  <Card>
                    <CardBody className="d-flex align-items-center gap-3 py-3">
                      <div className={`bg-${stat.color} bg-opacity-10 rounded p-2`}>
                        <Icon icon={stat.icon} size={22} className={`text-${stat.color}`} />
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

            {/* Hours — DataTable (always rendered, stable) */}
            <Card className="mb-3">
              <CardHeader>
                <CardTitle as="h6" className="mb-0">
                  <Icon icon="clock" size={16} className="me-2 text-info" />
                  Business Hours
                </CardTitle>
              </CardHeader>
              <DataTable table={hoursTable} emptyMessage="No hours set." />
            </Card>

            {/* Halal Info */}
            {hasHalal && (
              <Card className="mb-3">
                <CardHeader>
                  <CardTitle as="h6" className="mb-0">
                    <Icon icon="leaf" size={16} className="me-2 text-success" />
                    Halal Information
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <Row className="g-3">
                    {[
                      { label: 'Compliance',       val: biz.compliance },
                      { label: 'Slaughter Method', val: biz.slaughter_method },
                      { label: 'Halal Authority',  val: biz.halal_authority },
                      { label: 'Halal Chain',      val: biz.halal_chain },
                    ].filter(r => r.val).map(r => (
                      <Col key={r.label} md={6}>
                        <small className="text-muted d-block">{r.label}</small>
                        <span className="fw-semibold">{r.val}</span>
                      </Col>
                    ))}
                    {biz.halal_options && (
                      <Col xs={12}>
                        <small className="text-muted d-block">Halal Options</small>
                        <span>{biz.halal_options}</span>
                      </Col>
                    )}
                    {biz.halal_info && (
                      <Col xs={12}>
                        <small className="text-muted d-block">Halal Info</small>
                        <span>{biz.halal_info}</span>
                      </Col>
                    )}
                    {biz.description_halal && (
                      <Col xs={12}>
                        <small className="text-muted d-block">Halal Description</small>
                        <p className="mb-0">{biz.description_halal}</p>
                      </Col>
                    )}
                  </Row>
                </CardBody>
              </Card>
            )}

            {/* Features */}
            {hasFeatures && (
              <Card className="mb-3">
                <CardHeader>
                  <CardTitle as="h6" className="mb-0">
                    <Icon icon="sparkles" size={16} className="me-2 text-primary" />
                    Features & Amenities
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  {enabledFeatures.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {enabledFeatures.map(f => (
                        <Badge key={f.key} bg="success" className="fw-normal">
                          <Icon icon="check" size={11} className="me-1" />
                          {f.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {textFeatures.length > 0 && (
                    <Row className="g-2">
                      {textFeatures.map(f => (
                        <Col key={f.key} sm={6} md={4}>
                          <small className="text-muted d-block">{f.label}</small>
                          <span className="small">{biz[f.key]}</span>
                        </Col>
                      ))}
                    </Row>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Order & Booking */}
            {hasOrder && (
              <Card className="mb-3">
                <CardHeader>
                  <CardTitle as="h6" className="mb-0">
                    <Icon icon="shopping-bag" size={16} className="me-2 text-warning" />
                    Order & Booking
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <Row className="g-2">
                    {biz.order_online_link && (
                      <Col xs={12}>
                        <small className="text-muted d-block">Order Online</small>
                        <a href={biz.order_online_link} target="_blank" rel="noreferrer" className="small">
                          {biz.order_online_link}
                        </a>
                      </Col>
                    )}
                    {biz.platforms && (
                      <Col md={6}>
                        <small className="text-muted d-block">Platforms</small>
                        <span className="small">{biz.platforms}</span>
                      </Col>
                    )}
                    {biz.booking && (
                      <Col md={6}>
                        <small className="text-muted d-block">Booking</small>
                        <span className="small">{biz.booking}</span>
                      </Col>
                    )}
                    {biz.delivery_fee_discount && (
                      <Col md={6}>
                        <small className="text-muted d-block">Delivery Fee Discount</small>
                        <span className="small">{biz.delivery_fee_discount}</span>
                      </Col>
                    )}
                  </Row>
                </CardBody>
              </Card>
            )}

            {/* Additional Info */}
            {hasExtra && (
              <Card className="mb-3">
                <CardHeader>
                  <CardTitle as="h6" className="mb-0">
                    <Icon icon="info-circle" size={16} className="me-2 text-secondary" />
                    Additional Info
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <Row className="g-2">
                    {biz.ownedBy  && <Col md={6}><small className="text-muted d-block">Owned By</small><span>{biz.ownedBy}</span></Col>}
                    {biz.capacity && <Col md={6}><small className="text-muted d-block">Capacity</small><span>{biz.capacity}</span></Col>}
                    {biz.timezone && <Col md={6}><small className="text-muted d-block">Timezone</small><span>{biz.timezone}</span></Col>}
                    {biz.kitchen  && <Col md={6}><small className="text-muted d-block">Kitchen</small><span>{biz.kitchen}</span></Col>}
                    {biz.comments && <Col xs={12}><small className="text-muted d-block">Comments</small><p className="mb-0 small">{biz.comments}</p></Col>}
                  </Row>
                </CardBody>
              </Card>
            )}

            {/* Menu Overview */}
            <Card>
              <CardHeader className="d-flex align-items-center justify-content-between">
                <CardTitle as="h6" className="mb-0">
                  <Icon icon="tools-kitchen-2" size={16} className="me-2 text-success" />
                  Menu
                </CardTitle>
                {biz.business_id ? (
                  <div className="d-flex gap-2">
                    <Button size="sm" variant="outline-secondary" as={Link}
                      to={`/apps/ecommerce/menu-categories`}>
                      <Icon icon="tags" size={13} className="me-1" />Categories
                    </Button>
                    <Button size="sm" variant="outline-primary" as={Link}
                      to={`/apps/ecommerce/products`}>
                      <Icon icon="plus" size={13} className="me-1" />Items
                    </Button>
                  </div>
                ) : null}
              </CardHeader>
              <CardBody>
                {!biz.business_id ? (
                  <div className="text-muted small">
                    <Icon icon="info-circle" size={13} className="me-1" />
                    No Business linked. Set a <strong>Linked Business ID</strong> in the Sellers page to enable menu management.
                  </div>
                ) : menuLoading ? (
                  <div className="text-center py-2"><Spinner size="sm" /></div>
                ) : menuCats.length === 0 ? (
                  <div className="text-muted small">No menu categories yet.{' '}
                    <Link to="/apps/ecommerce/menu-categories" className="link-primary">Add categories</Link>
                  </div>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    {menuCats.map(cat => (
                      <div key={cat.id} className="border rounded px-3 py-2 d-flex align-items-center gap-2">
                        <Icon icon="tag" size={13} className="text-muted" />
                        <div>
                          <div className="fw-semibold small">{cat.name}</div>
                          <small className="text-muted">{cat.menu_items_count ?? 0} items</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

          </Col>
        </Row>
      )}
    </>
  );
}
