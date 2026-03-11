import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import MediaUpload from '../../_components/MediaUpload';
import axios from 'axios';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { createColumnHelper, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import {
  Alert, Button, Card, CardBody, CardFooter, CardHeader,
  Col, Form, FormControl, FormLabel, FormSelect,
  Modal, Nav, Row, Spinner, Tab,
} from 'react-bootstrap';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

const emptyForm = {
  // Basic
  category_id: '',
  business_id: '',
  name: '', slug: '', type: '', cuisine: '', description: '', price: '',
  yelp_verified: false, is_active: true,
  // Location
  address: '', address_2: '', city: '', state: '', zip: '', country: 'US',
  latitude: '', longitude: '',
  // Contact
  phone: '', mobile_phone: '', email: '', website: '',
  // Media
  logo: '', cover_image: '', permalink: '', restHash: '',
  // Halal
  compliance: '', slaughter_method: '', halal_authority: '', halal_info: '',
  halal_options: '', halal_chain: '', halal_items: '', halal_menu: '', description_halal: '',
  // Hours
  monday_open: '', monday_close: '', tuesday_open: '', tuesday_close: '',
  wednesday_open: '', wednesday_close: '', thursday_open: '', thursday_close: '',
  friday_open: '', friday_close: '', saturday_open: '', saturday_close: '',
  sunday_open: '', sunday_close: '',
  // Boolean features
  alcohol: false, kids_menu: false, pray_space: false, organic: false,
  catering: false, delivery: false, wheelchair_access: false, wifi: false,
  cash_only: false, pork: false, featured: false, sponsored: false,
  enable_order: false, enable_order_print: false, enable_stripe: false,
  adjust_platform_fee: false, platform_fee_override: 'inherit', platform_fee_value: '',
  is_online: false, restrict_checkin: false,
  created_app_user: false, auto_accept: false,
  // Text features
  shisha: '', drive_thru: '', reservations: '', outdoor_seating: '',
  prayer: '', restrooms: '', wheelchair: '', credit_cards: '', amenities: '',
  alcohol_options: '',
  // Stats
  rating: '', review_count: '', followers: '', following: '',
  total_ratings: '', photo_count: '',
  // Other details
  parking: '', parking_zhalal: '', transit: '', timezone: '', comments: '',
  ownedBy: '', related: '', capacity: '', to_go: '', demographics: '', kitchen: '',
  associated_listings: '', featured_heading: '', featured_tiles: '',
  // Order / booking
  booking: '', booking_slot_value: '', platforms: '', order_online_link: '',
  delivery_fee_discount: '', offline_record_time: '',
  // Dates
  checkin_start: '', checkin_end: '', start_date: '', end_date: '', closedDate: '',
};

const PRICE_OPTIONS = [
  { v: '1', l: '$ (Cheap)' },
  { v: '2', l: '$$ (Moderate)' },
  { v: '3', l: '$$$ (Expensive)' },
  { v: '4', l: '$$$$ (Very Expensive)' },
];

const BOOL_FEATURES = [
  { key: 'delivery',          label: 'Delivery' },
  { key: 'catering',          label: 'Catering' },
  { key: 'wifi',              label: 'WiFi' },
  { key: 'kids_menu',         label: 'Kids Menu' },
  { key: 'pray_space',        label: 'Prayer Space' },
  { key: 'organic',           label: 'Organic' },
  { key: 'wheelchair_access', label: 'Wheelchair Access' },
  { key: 'cash_only',         label: 'Cash Only' },
  { key: 'pork',              label: 'Pork Served' },
  { key: 'alcohol',           label: 'Alcohol Served' },
  { key: 'featured',          label: 'Featured' },
  { key: 'sponsored',         label: 'Sponsored' },
  { key: 'is_online',         label: 'Online' },
  { key: 'enable_order',      label: 'Enable Orders' },
  { key: 'enable_order_print',label: 'Enable Order Print' },
  { key: 'enable_stripe',     label: 'Enable Stripe' },
  { key: 'adjust_platform_fee',label: 'Adjust Platform Fee' },
  { key: 'restrict_checkin',  label: 'Restrict Check-in' },
  { key: 'created_app_user',  label: 'Created App User' },
  { key: 'yelp_verified',     label: 'Yelp Verified' },
  { key: 'auto_accept',      label: 'Auto-Accept Orders' },
];

const columnHelper = createColumnHelper();

export default function SellersPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [pagination, setPagination] = useState({});
  const [page, setPage]             = useState(1);
  const [showModal, setShowModal]   = useState(false);
  const [editBiz, setEditBiz]       = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [deleteId, setDeleteId]     = useState(null);
  const [slugLocked, setSlugLocked] = useState(false);
  const navigate                    = useNavigate();
  const [sorting, setSorting]       = useState([]);
  const [activeTab, setActiveTab]   = useState('basic');
  const [categories, setCategories] = useState([]);
  const [perPage, setPerPage]       = useState(25);
  const [creatingBiz, setCreatingBiz] = useState(false);

  const toSlug = (str) => str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const createAndLinkBusiness = () => {
    if (!form.name) { showToast('Enter a Business Name first', 'warning'); return; }
    setCreatingBiz(true);
    axios.post('/api/ecommerce/businesses', { name: form.name })
      .then(r => {
        set('business_id', r.data.id);
        showToast(`Business #${r.data.id} created & linked!`);
      })
      .catch(e => showToast(e.response?.data?.message || 'Failed to create business', 'danger'))
      .finally(() => setCreatingBiz(false));
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, per_page: perPage });
    if (search) params.set('search', search);
    axios.get(`/api/ecommerce/muzzhub?${params}`)
      .then(r => { setBusinesses(r.data.data || []); setPagination(r.data); })
      .finally(() => setLoading(false));
  }, [page, search, perPage]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    axios.get('/api/ecommerce/muzzhub-categories?all=1&active_only=1')
      .then(r => setCategories(Array.isArray(r.data) ? r.data : (r.data.data || [])));
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const openAdd = () => {
    setEditBiz(null);
    setForm(emptyForm);
    setSlugLocked(false);
    setActiveTab('basic');
    setShowModal(true);
  };

  const openEdit = (biz) => {
    setEditBiz(biz);
    // Date fields with MySQL zero-date should become empty string
    const zeroDate = /^0000-00-00/;
    const dateFields = ['checkin_start', 'checkin_end', 'start_date', 'end_date', 'closedDate'];
    const f = {};
    Object.keys(emptyForm).forEach(k => {
      // Skip computed accessor (amenities is built server-side from other fields)
      if (k === 'amenities') { f[k] = ''; return; }
      let val = biz[k] !== undefined && biz[k] !== null ? biz[k] : emptyForm[k];
      // Nullify zero-dates so datetime-local input doesn't get invalid value
      if (dateFields.includes(k) && typeof val === 'string' && zeroDate.test(val)) val = '';
      f[k] = val;
    });
    setForm(f);
    setSlugLocked(true);
    setActiveTab('basic');
    setShowModal(true);
  };

  const handleSave = () => {
    setSaving(true);
    const req = editBiz
      ? axios.patch(`/api/ecommerce/muzzhub/${editBiz.id}`, form)
      : axios.post('/api/ecommerce/muzzhub', form);
    req
      .then(() => {
        showToast(editBiz ? 'Updated successfully!' : 'Created successfully!');
        setShowModal(false);
        load();
      })
      .catch(e => {
        const data = e.response?.data;
        if (data?.errors) {
          const msgs = Object.values(data.errors).flat().join(' • ');
          showToast(msgs, 'danger');
        } else {
          showToast(data?.message || 'Error saving. Please try again.', 'danger');
        }
      })
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    axios.delete(`/api/ecommerce/muzzhub/${deleteId}`)
      .then(() => { showToast('Deleted'); load(); })
      .catch(() => showToast('Delete failed', 'danger'))
      .finally(() => setDeleteId(null));
  };

  const toggleActive = useCallback((biz) => {
    axios.patch(`/api/ecommerce/muzzhub/${biz.id}`, { is_active: !biz.is_active })
      .then(() => load())
      .catch(() => showToast('Update failed', 'danger'));
  }, [load]);

  const totalPages = pagination.last_page || 1;
  const totalItems = pagination.total || 0;
  const start      = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const end        = Math.min(page * perPage, totalItems);

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'Seller',
      cell: ({ row }) => {
        const biz = row.original;
        return (
          <div className="d-flex align-items-center gap-2">
            {biz.logo ? (
              <img src={biz.logo} alt={biz.name} style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 8 }} />
            ) : (
              <div className="bg-primary bg-opacity-10 rounded d-flex align-items-center justify-content-center" style={{ width: 42, height: 42, flexShrink: 0 }}>
                <Icon icon="building-store" size={18} className="text-primary" />
              </div>
            )}
            <div>
              <div className="fw-semibold">{biz.name}</div>
              <div className="d-flex align-items-center gap-1 flex-wrap mt-1">
                {biz.category && (
                  <span className="badge rounded-pill" style={{ background: biz.category.color || '#6366f1', fontSize: 10 }}>
                    {biz.category.name}
                  </span>
                )}
                <small className="text-muted">{biz.cuisine || biz.type || '—'}</small>
              </div>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor(row => [row.city, row.state, row.country].filter(Boolean).join(', '), {
      id: 'location',
      header: 'Location',
      enableSorting: false,
      cell: ({ getValue }) => <small className="text-muted">{getValue() || '—'}</small>,
    }),
    columnHelper.accessor('phone', {
      header: 'Contact',
      enableSorting: false,
      cell: ({ row }) => (
        <>
          <small className="d-block">{row.original.phone || '—'}</small>
          <small className="text-muted">{row.original.email || '—'}</small>
        </>
      ),
    }),
    columnHelper.accessor('is_active', {
      header: 'Active',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="form-check form-switch mb-0" style={{ cursor: 'pointer' }} onClick={() => toggleActive(row.original)}>
          <input className="form-check-input" type="checkbox" checked={!!row.original.is_active} onChange={() => {}} style={{ cursor: 'pointer' }} />
        </div>
      ),
    }),
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="d-flex gap-1">
          <Button size="sm" variant="outline-info" title="View Details"
            onClick={() => navigate(`/apps/ecommerce/seller-details?id=${row.original.id}`)}>
            <Icon icon="eye" size={14} />
          </Button>
          <Button size="sm" variant="outline-primary" title="Edit"
            onClick={() => openEdit(row.original)}>
            <Icon icon="pencil" size={14} />
          </Button>
          <Button size="sm" variant="outline-danger" title="Delete"
            onClick={() => setDeleteId(row.original.id)}>
            <Icon icon="trash" size={14} />
          </Button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [toggleActive, navigate]);

  const table = useReactTable({
    data: businesses,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  return (
    <>
      <PageBreadcrumb title="Sellers" subtitle="Ecommerce" />

      {toast && (
        <Alert variant={toast.type} className="position-fixed top-0 end-0 m-3 shadow" style={{ zIndex: 9999, minWidth: 260 }}>
          {toast.msg}
        </Alert>
      )}

      <Card>
        <CardHeader className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <div style={{ position: 'relative' }}>
            <FormControl
              placeholder="Search businesses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(); } }}
              style={{ paddingRight: 36, minWidth: 220 }}
            />
            <Icon icon="search" size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          </div>
          <div className="d-flex gap-2">
            <Link to="/apps/ecommerce/registrations">
              <Button variant="success">
                <Icon icon="rocket" size={15} className="me-1" />
                Get Started
              </Button>
            </Link>
            <Button variant="primary" onClick={openAdd}>
              <Icon icon="plus" size={15} className="me-1" />
              Add Seller
            </Button>
          </div>
        </CardHeader>

        <CardBody className="p-0" style={{ position: 'relative', minHeight: 120 }}>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'rgba(255,255,255,0.65)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Spinner />
            </div>
          )}
          <DataTable table={table} emptyMessage={loading ? '' : 'No businesses found.'} />
        </CardBody>

        <CardFooter className="border-0">
          <TablePagination
            totalItems={totalItems} start={start} end={end}
            itemsName="businesses" showInfo
            previousPage={() => setPage(p => p - 1)} canPreviousPage={page > 1}
            pageCount={totalPages} pageIndex={page - 1}
            setPageIndex={(idx) => setPage(idx + 1)}
            nextPage={() => setPage(p => p + 1)} canNextPage={page < totalPages}
            perPage={perPage}
            onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
          />
        </CardFooter>
      </Card>

      {/* Add / Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            <Icon icon={editBiz ? 'pencil' : 'plus'} size={16} className="me-2" />
            {editBiz ? `Edit Seller: ${editBiz.name}` : 'Add Seller'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-0">
          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Nav variant="tabs" className="px-3 pt-2 border-bottom">
              {[
                { k: 'basic',    l: 'Basic' },
                { k: 'location', l: 'Location' },
                { k: 'contact',  l: 'Contact' },
                { k: 'halal',    l: 'Halal' },
                { k: 'hours',    l: 'Hours' },
                { k: 'features', l: 'Features' },
                { k: 'media',    l: 'Media' },
                { k: 'advanced', l: 'Advanced' },
              ].map(t => (
                <Nav.Item key={t.k}>
                  <Nav.Link eventKey={t.k} className="pb-2">{t.l}</Nav.Link>
                </Nav.Item>
              ))}
            </Nav>

            <Tab.Content className="p-3">

              {/* ── BASIC ── */}
              <Tab.Pane eventKey="basic">
                <Row className="g-3">
                  <Col md={6}>
                    <FormLabel>Category</FormLabel>
                    <FormSelect value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                      <option value="">— No Category —</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </FormSelect>
                  </Col>

                  <Col md={6} className="d-flex align-items-end">
                    {form.category_id && (() => {
                      const cat = categories.find(c => String(c.id) === String(form.category_id));
                      return cat ? (
                        <div className="d-flex align-items-center gap-2 p-2 rounded border w-100">
                          <div className="d-flex align-items-center justify-content-center rounded"
                            style={{ width: 30, height: 30, background: cat.color || '#6366f1', flexShrink: 0 }}>
                            <Icon icon={cat.icon || 'tag'} size={14} style={{ color: '#fff' }} />
                          </div>
                          <span className="fw-semibold">{cat.name}</span>
                        </div>
                      ) : null;
                    })()}
                  </Col>

                  <Col md={4}>
                    <FormLabel>
                      Linked Business ID
                      <small className="text-muted ms-1">(for menu &amp; orders)</small>
                    </FormLabel>
                    <div className="d-flex gap-2">
                      <FormControl
                        type="number"
                        min="1"
                        value={form.business_id}
                        onChange={e => set('business_id', e.target.value)}
                        placeholder="e.g. 3"
                      />
                      {!form.business_id && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          style={{ whiteSpace: 'nowrap' }}
                          disabled={creatingBiz}
                          onClick={createAndLinkBusiness}
                        >
                          {creatingBiz ? <Spinner size="sm" /> : <><Icon icon="plus" size={13} className="me-1" />Create</>}
                        </Button>
                      )}
                    </div>
                    <small className="text-muted">Link to a Business record to enable menu and order flow.</small>
                  </Col>

                  <Col md={8}>
                    <FormLabel>Business Name <span className="text-danger">*</span></FormLabel>
                    <FormControl
                      value={form.name}
                      onChange={e => {
                        const name = e.target.value;
                        setForm(f => ({ ...f, name, ...(slugLocked ? {} : { slug: toSlug(name) }) }));
                      }}
                      placeholder="e.g. Ali Biryani House"
                    />
                  </Col>

                  <Col md={4}>
                    <FormLabel>
                      Slug {!slugLocked && <small className="text-muted">(auto)</small>}
                      {slugLocked && (
                        <button type="button" className="btn btn-link btn-sm p-0 ms-1 text-muted" style={{ fontSize: 11 }}
                          onClick={() => { setSlugLocked(false); setForm(f => ({ ...f, slug: toSlug(f.name) })); }}>
                          reset
                        </button>
                      )}
                    </FormLabel>
                    <FormControl
                      value={form.slug}
                      onChange={e => { setSlugLocked(true); set('slug', e.target.value); }}
                      placeholder="ali-biryani-house"
                    />
                  </Col>

                  <Col md={4}>
                    <FormLabel>Type</FormLabel>
                    <FormControl value={form.type} onChange={e => set('type', e.target.value)} placeholder="e.g. restaurant, store, service" />
                  </Col>

                  <Col md={4}>
                    <FormLabel>Cuisine / Specialty</FormLabel>
                    <FormControl value={form.cuisine} onChange={e => set('cuisine', e.target.value)} placeholder="e.g. Pakistani, Indian, Halal..." />
                  </Col>

                  <Col md={2}>
                    <FormLabel>Price Range</FormLabel>
                    <FormSelect value={form.price} onChange={e => set('price', e.target.value)}>
                      <option value="">—</option>
                      {PRICE_OPTIONS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                    </FormSelect>
                  </Col>

                  <Col md={2} className="d-flex flex-column justify-content-end pb-1">
                    <div className="d-flex flex-column gap-1">
                      <Form.Check type="switch" label="Active" checked={!!form.is_active}
                        onChange={e => set('is_active', e.target.checked)} />
                      <Form.Check type="switch" label="Yelp Verified" checked={!!form.yelp_verified}
                        onChange={e => set('yelp_verified', e.target.checked)} />
                    </div>
                  </Col>

                  <Col xs={12}>
                    <FormLabel>Description</FormLabel>
                    <FormControl as="textarea" rows={3} value={form.description}
                      onChange={e => set('description', e.target.value)} />
                  </Col>

                  <Col xs={12}>
                    <FormLabel>Halal Description</FormLabel>
                    <FormControl as="textarea" rows={2} value={form.description_halal}
                      onChange={e => set('description_halal', e.target.value)}
                      placeholder="Describe halal certifications or practices..." />
                  </Col>

                  <Col md={4}>
                    <FormLabel>Rating</FormLabel>
                    <FormControl value={form.rating} onChange={e => set('rating', e.target.value)} placeholder="e.g. 4.5" />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Review Count</FormLabel>
                    <FormControl value={form.review_count} onChange={e => set('review_count', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Photo Count</FormLabel>
                    <FormControl value={form.photo_count} onChange={e => set('photo_count', e.target.value)} />
                  </Col>
                </Row>
              </Tab.Pane>

              {/* ── LOCATION ── */}
              <Tab.Pane eventKey="location">
                <Row className="g-3">
                  <Col xs={12}>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
                  </Col>
                  <Col xs={12}>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl value={form.address_2} onChange={e => set('address_2', e.target.value)} placeholder="Apt, suite, unit..." />
                  </Col>
                  <Col md={5}>
                    <FormLabel>City</FormLabel>
                    <FormControl value={form.city} onChange={e => set('city', e.target.value)} />
                  </Col>
                  <Col md={3}>
                    <FormLabel>State</FormLabel>
                    <FormControl value={form.state} onChange={e => set('state', e.target.value)} />
                  </Col>
                  <Col md={2}>
                    <FormLabel>ZIP</FormLabel>
                    <FormControl value={form.zip} onChange={e => set('zip', e.target.value)} />
                  </Col>
                  <Col md={2}>
                    <FormLabel>Country</FormLabel>
                    <FormControl value={form.country} onChange={e => set('country', e.target.value)} placeholder="US" />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl value={form.latitude} onChange={e => set('latitude', e.target.value)} placeholder="e.g. 37.7749" />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl value={form.longitude} onChange={e => set('longitude', e.target.value)} placeholder="e.g. -122.4194" />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl value={form.timezone} onChange={e => set('timezone', e.target.value)} placeholder="e.g. America/New_York" />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Transit Info</FormLabel>
                    <FormControl value={form.transit} onChange={e => set('transit', e.target.value)} />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Parking</FormLabel>
                    <FormControl value={form.parking} onChange={e => set('parking', e.target.value)} />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Parking (Zhalal)</FormLabel>
                    <FormControl value={form.parking_zhalal} onChange={e => set('parking_zhalal', e.target.value)} />
                  </Col>
                </Row>
              </Tab.Pane>

              {/* ── CONTACT ── */}
              <Tab.Pane eventKey="contact">
                <Row className="g-3">
                  <Col md={6}>
                    <FormLabel>Phone</FormLabel>
                    <FormControl value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 234 567 8900" />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Mobile Phone</FormLabel>
                    <FormControl value={form.mobile_phone} onChange={e => set('mobile_phone', e.target.value)} placeholder="+1 234 567 8901" />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Email</FormLabel>
                    <FormControl type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Website</FormLabel>
                    <FormControl type="url" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
                  </Col>
                  <Col xs={12}>
                    <FormLabel>Comments / Notes</FormLabel>
                    <FormControl as="textarea" rows={3} value={form.comments} onChange={e => set('comments', e.target.value)} />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Owned By</FormLabel>
                    <FormControl value={form.ownedBy} onChange={e => set('ownedBy', e.target.value)} />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl value={form.capacity} onChange={e => set('capacity', e.target.value)} />
                  </Col>
                </Row>
              </Tab.Pane>

              {/* ── HALAL ── */}
              <Tab.Pane eventKey="halal">
                <Row className="g-3">
                  <Col md={6}>
                    <FormLabel>Compliance</FormLabel>
                    <FormControl value={form.compliance} onChange={e => set('compliance', e.target.value)} placeholder="e.g. Fully Halal, Partially Halal" />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Slaughter Method</FormLabel>
                    <FormControl value={form.slaughter_method} onChange={e => set('slaughter_method', e.target.value)} placeholder="e.g. Hand slaughtered, Machine cut" />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Halal Authority</FormLabel>
                    <FormControl value={form.halal_authority} onChange={e => set('halal_authority', e.target.value)} placeholder="e.g. ISNA, IFANCA" />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Halal Chain</FormLabel>
                    <FormControl value={form.halal_chain} onChange={e => set('halal_chain', e.target.value)} />
                  </Col>
                  <Col xs={12}>
                    <FormLabel>Halal Info</FormLabel>
                    <FormControl as="textarea" rows={2} value={form.halal_info} onChange={e => set('halal_info', e.target.value)} />
                  </Col>
                  <Col xs={12}>
                    <FormLabel>Halal Options</FormLabel>
                    <FormControl as="textarea" rows={2} value={form.halal_options} onChange={e => set('halal_options', e.target.value)} placeholder="e.g. Halal chicken, Halal beef, Halal lamb" />
                  </Col>
                  <Col xs={12}>
                    <FormLabel>Halal Items</FormLabel>
                    <FormControl as="textarea" rows={2} value={form.halal_items} onChange={e => set('halal_items', e.target.value)} />
                  </Col>
                  <Col xs={12}>
                    <FormLabel>Halal Menu URL / Notes</FormLabel>
                    <FormControl value={form.halal_menu} onChange={e => set('halal_menu', e.target.value)} />
                  </Col>
                </Row>
              </Tab.Pane>

              {/* ── HOURS ── */}
              <Tab.Pane eventKey="hours">
                <div className="table-responsive">
                  <table className="table table-sm table-borderless align-middle mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: 110 }}>Day</th>
                        <th>Open</th>
                        <th>Close</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map(day => (
                        <tr key={day}>
                          <td className="text-capitalize fw-semibold">{day}</td>
                          <td>
                            <FormControl
                              size="sm"
                              type="time"
                              value={form[`${day}_open`]}
                              onChange={e => set(`${day}_open`, e.target.value)}
                            />
                          </td>
                          <td>
                            <FormControl
                              size="sm"
                              type="time"
                              value={form[`${day}_close`]}
                              onChange={e => set(`${day}_close`, e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Tab.Pane>

              {/* ── FEATURES ── */}
              <Tab.Pane eventKey="features">
                <Row className="g-3">
                  <Col xs={12}>
                    <div className="d-flex flex-wrap gap-3">
                      {BOOL_FEATURES.map(f => (
                        <Form.Check
                          key={f.key}
                          type="switch"
                          id={`feat-${f.key}`}
                          label={f.label}
                          checked={!!form[f.key]}
                          onChange={e => set(f.key, e.target.checked)}
                        />
                      ))}
                    </div>
                  </Col>

                  <Col xs={12}><hr className="my-1" /></Col>

                  {/* ── Platform Fee Override ── */}
                  <Col xs={12}>
                    <FormLabel className="fw-semibold">Platform Fee Override</FormLabel>
                    <p className="text-muted fs-sm mb-2">
                      Override the global platform fee for this seller. "Inherit" uses the global setting.
                    </p>
                    <div className="d-flex flex-wrap gap-3 mb-2">
                      {[
                        { v: 'inherit',    l: 'Inherit Global' },
                        { v: 'none',       l: 'No Fee' },
                        { v: 'percentage', l: '% Percentage' },
                        { v: 'fixed',      l: '$ Fixed' },
                      ].map(opt => (
                        <Form.Check
                          key={opt.v}
                          type="radio"
                          id={`pf-${opt.v}`}
                          name="platform_fee_override"
                          label={opt.l}
                          value={opt.v}
                          checked={form.platform_fee_override === opt.v}
                          onChange={e => set('platform_fee_override', e.target.value)}
                        />
                      ))}
                    </div>
                    {['percentage', 'fixed'].includes(form.platform_fee_override) && (
                      <div className="input-group" style={{ maxWidth: 200 }}>
                        {form.platform_fee_override === 'fixed' && (
                          <span className="input-group-text">$</span>
                        )}
                        <FormControl
                          type="number"
                          min="0"
                          step={form.platform_fee_override === 'percentage' ? '0.5' : '0.01'}
                          placeholder={form.platform_fee_override === 'percentage' ? 'e.g. 5' : 'e.g. 1.99'}
                          value={form.platform_fee_value}
                          onChange={e => set('platform_fee_value', e.target.value)}
                        />
                        {form.platform_fee_override === 'percentage' && (
                          <span className="input-group-text">%</span>
                        )}
                      </div>
                    )}
                  </Col>

                  <Col xs={12}><hr className="my-1" /></Col>

                  <Col md={4}>
                    <FormLabel>Shisha</FormLabel>
                    <FormControl value={form.shisha} onChange={e => set('shisha', e.target.value)} placeholder="Available / Not Available" />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Drive Thru</FormLabel>
                    <FormControl value={form.drive_thru} onChange={e => set('drive_thru', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Reservations</FormLabel>
                    <FormControl value={form.reservations} onChange={e => set('reservations', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Outdoor Seating</FormLabel>
                    <FormControl value={form.outdoor_seating} onChange={e => set('outdoor_seating', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Prayer Facilities</FormLabel>
                    <FormControl value={form.prayer} onChange={e => set('prayer', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Restrooms</FormLabel>
                    <FormControl value={form.restrooms} onChange={e => set('restrooms', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Wheelchair Access (details)</FormLabel>
                    <FormControl value={form.wheelchair} onChange={e => set('wheelchair', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Credit Cards</FormLabel>
                    <FormControl value={form.credit_cards} onChange={e => set('credit_cards', e.target.value)} placeholder="Visa, Mastercard, Amex..." />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Alcohol Options</FormLabel>
                    <FormControl value={form.alcohol_options} onChange={e => set('alcohol_options', e.target.value)} />
                  </Col>
                  <Col xs={12}>
                    <FormLabel>Amenities</FormLabel>
                    <FormControl as="textarea" rows={2} value={form.amenities} onChange={e => set('amenities', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>To-Go</FormLabel>
                    <FormControl value={form.to_go} onChange={e => set('to_go', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Demographics</FormLabel>
                    <FormControl value={form.demographics} onChange={e => set('demographics', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Kitchen</FormLabel>
                    <FormControl value={form.kitchen} onChange={e => set('kitchen', e.target.value)} />
                  </Col>
                </Row>
              </Tab.Pane>

              {/* ── MEDIA ── */}
              <Tab.Pane eventKey="media">
                <Row className="g-3">
                  <Col md={6}>
                    <MediaUpload label="Logo" value={form.logo} onChange={url => set('logo', url)} folder="businesses" aspect="square" />
                  </Col>
                  <Col md={6}>
                    <MediaUpload label="Cover Image" value={form.cover_image} onChange={url => set('cover_image', url)} folder="businesses" aspect="wide" />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Permalink</FormLabel>
                    <FormControl value={form.permalink} onChange={e => set('permalink', e.target.value)} />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Rest Hash</FormLabel>
                    <FormControl value={form.restHash} onChange={e => set('restHash', e.target.value)} />
                  </Col>
                  <Col xs={12}>
                    <FormLabel>Featured Heading</FormLabel>
                    <FormControl value={form.featured_heading} onChange={e => set('featured_heading', e.target.value)} />
                  </Col>
                  <Col xs={12}>
                    <FormLabel>Featured Tiles</FormLabel>
                    <FormControl as="textarea" rows={2} value={form.featured_tiles} onChange={e => set('featured_tiles', e.target.value)} />
                  </Col>
                </Row>
              </Tab.Pane>

              {/* ── ADVANCED ── */}
              <Tab.Pane eventKey="advanced">
                <Row className="g-3">
                  <Col md={6}>
                    <FormLabel>Order Online Link</FormLabel>
                    <FormControl value={form.order_online_link} onChange={e => set('order_online_link', e.target.value)} placeholder="https://..." />
                  </Col>
                  <Col md={6}>
                    <FormLabel>Platforms</FormLabel>
                    <FormControl value={form.platforms} onChange={e => set('platforms', e.target.value)} placeholder="UberEats, DoorDash..." />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Booking</FormLabel>
                    <FormControl value={form.booking} onChange={e => set('booking', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Booking Slot Value</FormLabel>
                    <FormControl value={form.booking_slot_value} onChange={e => set('booking_slot_value', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Delivery Fee Discount</FormLabel>
                    <FormControl value={form.delivery_fee_discount} onChange={e => set('delivery_fee_discount', e.target.value)} />
                  </Col>

                  <Col xs={12}><hr className="my-1" /></Col>

                  <Col md={4}>
                    <FormLabel>Followers</FormLabel>
                    <FormControl value={form.followers} onChange={e => set('followers', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Following</FormLabel>
                    <FormControl value={form.following} onChange={e => set('following', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Total Ratings</FormLabel>
                    <FormControl value={form.total_ratings} onChange={e => set('total_ratings', e.target.value)} />
                  </Col>

                  <Col xs={12}><hr className="my-1" /></Col>

                  <Col md={4}>
                    <FormLabel>Check-in Start</FormLabel>
                    <FormControl type="datetime-local" value={form.checkin_start} onChange={e => set('checkin_start', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Check-in End</FormLabel>
                    <FormControl type="datetime-local" value={form.checkin_end} onChange={e => set('checkin_end', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Offline Record Time</FormLabel>
                    <FormControl value={form.offline_record_time} onChange={e => set('offline_record_time', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl type="datetime-local" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>End Date</FormLabel>
                    <FormControl type="datetime-local" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <FormLabel>Closed Date</FormLabel>
                    <FormControl type="datetime-local" value={form.closedDate} onChange={e => set('closedDate', e.target.value)} />
                  </Col>

                  <Col xs={12}><hr className="my-1" /></Col>

                  <Col xs={12}>
                    <FormLabel>Related Listings</FormLabel>
                    <FormControl value={form.related} onChange={e => set('related', e.target.value)} />
                  </Col>
                  <Col xs={12}>
                    <FormLabel>Associated Listings</FormLabel>
                    <FormControl value={form.associated_listings} onChange={e => set('associated_listings', e.target.value)} />
                  </Col>
                </Row>
              </Tab.Pane>

            </Tab.Content>
          </Tab.Container>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || !form.name}>
            {saving && <Spinner size="sm" className="me-1" />}
            {editBiz ? 'Update' : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>

      <DeleteConfirmationModal
        show={!!deleteId}
        onHide={() => setDeleteId(null)}
        onConfirm={handleDelete}
        itemName="business"
      />
    </>
  );
}
