import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import MediaUpload from '../../_components/MediaUpload';
import axios from 'axios';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import {
  Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle,
  Col, Form, FormControl, FormGroup, FormLabel, FormSelect,
  Modal, Row, Spinner, Table
} from 'react-bootstrap';

const TYPE_COLORS  = { restaurant: 'danger', store: 'primary', service: 'success' };
const TYPE_BADGES  = { restaurant: 'bg-danger-subtle text-danger', store: 'bg-primary-subtle text-primary', service: 'bg-success-subtle text-success' };
const TYPE_ICONS  = { restaurant: 'tools-kitchen-2', store: 'building-store', service: 'briefcase' };

const emptyForm = {
  name: '', slug: '', description: '', cuisine: '',
  address: '', address_2: '', city: '', state: '', zip: '', country: 'us',
  phone: '', email: '', website: '',
  logo: '', cover_image: '', category_id: '',
  compliance: '', slaughter_method: '', halal_authority: '', halal_info: '',
  price: '', parking: '',
  alcohol: false, kids_menu: false, pray_space: false, organic: false,
  catering: false, delivery: false, wheelchair_access: false, wifi: false,
  cash_only: false, drive_thru: false, reservations: false,
  outdoor_seating: false, shisha: false, featured: false,
  monday_open: '', monday_close: '', tuesday_open: '', tuesday_close: '',
  wednesday_open: '', wednesday_close: '', thursday_open: '', thursday_close: '',
  friday_open: '', friday_close: '', saturday_open: '', saturday_close: '',
  sunday_open: '', sunday_close: '',
  is_active: true,
};

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const COMPLIANCE_OPTIONS = ['Verbal confirmation','Halal sign visible','Certified','Unverified','Not Halal'];
const PRICE_OPTIONS = [{ v:'1', l:'$ (Cheap)' },{ v:'2', l:'$$ (Moderate)' },{ v:'3', l:'$$$ (Expensive)' },{ v:'4', l:'$$$$ (Very Expensive)' }];

export default function SellersPage() {
  const [businesses, setBusinesses]   = useState([]);
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [typeFilter, setTypeFilter]   = useState('');
  const [pagination, setPagination]   = useState({});
  const [page, setPage]               = useState(1);
  const [showModal, setShowModal]     = useState(false);
  const [editBiz, setEditBiz]         = useState(null);
  const [form, setForm]               = useState(emptyForm);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState(null);
  const [deleteId, setDeleteId]       = useState(null);
  const [slugLocked, setSlugLocked]   = useState(false);
  const [modalTab, setModalTab]       = useState('basic');

  const toSlug = (str) => str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, per_page: 15 });
    if (search)     params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    axios.get(`/api/ecommerce/businesses?${params}`)
      .then(r => { setBusinesses(r.data.data || []); setPagination(r.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, typeFilter]);
  useEffect(() => { axios.get('/api/ecommerce/categories').then(r => setCategories(r.data)); }, []);

  const openAdd = () => { setEditBiz(null); setForm(emptyForm); setSlugLocked(false); setModalTab('basic'); setShowModal(true); };
  const openEdit = (biz) => {
    setEditBiz(biz);
    setForm({
      name: biz.name || '', slug: biz.slug || '', description: biz.description || '',
      cuisine: biz.cuisine || '',
      address: biz.address || '', address_2: biz.address_2 || '',
      city: biz.city || '', state: biz.state || '', zip: biz.zip || '', country: biz.country || 'us',
      phone: biz.phone || '', email: biz.email || '', website: biz.website || '',
      logo: biz.logo || '', cover_image: biz.cover_image || '', category_id: biz.category_id || '',
      compliance: biz.compliance || '', slaughter_method: biz.slaughter_method || '',
      halal_authority: biz.halal_authority || '', halal_info: biz.halal_info || '',
      price: biz.price || '', parking: biz.parking || '',
      alcohol: !!biz.alcohol, kids_menu: !!biz.kids_menu, pray_space: !!biz.pray_space,
      organic: !!biz.organic, catering: !!biz.catering, delivery: !!biz.delivery,
      wheelchair_access: !!biz.wheelchair_access, wifi: !!biz.wifi, cash_only: !!biz.cash_only,
      drive_thru: !!biz.drive_thru, reservations: !!biz.reservations,
      outdoor_seating: !!biz.outdoor_seating, shisha: !!biz.shisha, featured: !!biz.featured,
      monday_open: biz.monday_open || '', monday_close: biz.monday_close || '',
      tuesday_open: biz.tuesday_open || '', tuesday_close: biz.tuesday_close || '',
      wednesday_open: biz.wednesday_open || '', wednesday_close: biz.wednesday_close || '',
      thursday_open: biz.thursday_open || '', thursday_close: biz.thursday_close || '',
      friday_open: biz.friday_open || '', friday_close: biz.friday_close || '',
      saturday_open: biz.saturday_open || '', saturday_close: biz.saturday_close || '',
      sunday_open: biz.sunday_open || '', sunday_close: biz.sunday_close || '',
      is_active: biz.is_active ?? true,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    setSaving(true);
    const req = editBiz
      ? axios.patch(`/api/ecommerce/businesses/${editBiz.id}`, form)
      : axios.post('/api/ecommerce/businesses', form);
    req.then(() => { showToast(editBiz ? 'Updated' : 'Created'); setShowModal(false); load(); })
       .catch(e => showToast(e.response?.data?.message || 'Error', 'danger'))
       .finally(() => setSaving(false));
  };

  const handleDelete = (id) => {
    axios.delete(`/api/ecommerce/businesses/${id}`)
      .then(() => { showToast('Deleted'); load(); })
      .catch(() => showToast('Delete failed', 'danger'))
      .finally(() => setDeleteId(null));
  };

  const toggleActive = (biz) => {
    axios.patch(`/api/ecommerce/businesses/${biz.id}`, { is_active: !biz.is_active })
      .then(() => load())
      .catch(() => showToast('Update failed', 'danger'));
  };

  const handleSearchKey = (e) => { if (e.key === 'Enter') { setPage(1); load(); } };

  const totalPages = pagination.last_page || 1;

  return (
    <>
      <PageBreadcrumb title="Sellers / Businesses" subtitle="Ecommerce" />

      {toast && (
        <Alert variant={toast.type} className="position-fixed top-0 end-0 m-3 shadow" style={{ zIndex: 9999, minWidth: 260 }}>
          {toast.msg}
        </Alert>
      )}

      {/* Stats */}
      <Row className="g-3 mb-3">
        {['restaurant', 'store', 'service'].map(type => {
          const count = businesses.filter(b => b.category?.type === type).length;
          return (
            <Col key={type} sm={4}>
              <Card className="text-center">
                <CardBody className="py-3">
                  <div className={`text-${TYPE_COLORS[type]} mb-1`}>
                    <Icon icon={TYPE_ICONS[type]} size={28} />
                  </div>
                  <h4 className="fw-bold mb-0">{count}</h4>
                  <small className="text-muted text-capitalize">{type}s</small>
                </CardBody>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card>
        <CardHeader className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <div className="d-flex gap-2">
            <div style={{ position: 'relative' }}>
              <FormControl
                placeholder="Search sellers..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearchKey}
                style={{ paddingRight: 36 }}
              />
              <Icon icon="search" size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            </div>
            <FormSelect style={{ width: 140 }} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              <option value="restaurant">Restaurant</option>
              <option value="store">Store</option>
              <option value="service">Service</option>
            </FormSelect>
          </div>
          <Button variant="primary" onClick={openAdd}>
            <Icon icon="plus" size={15} className="me-1" />
            Add Business
          </Button>
        </CardHeader>

        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <Icon icon="building-store" size={40} className="mb-2 opacity-50" />
              <p>No businesses found.</p>
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Business</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Contact</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map(biz => (
                  <tr key={biz.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {biz.logo ? (
                          <img src={biz.logo} alt={biz.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                        ) : (
                          <div className="bg-primary bg-opacity-10 rounded d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                            <Icon icon="store" size={18} className="text-primary" />
                          </div>
                        )}
                        <div>
                          <Link to={`/apps/ecommerce/seller-details?id=${biz.id}`} className="fw-semibold text-dark text-decoration-none">
                            {biz.name}
                          </Link>
                          <small className="d-block text-muted">{biz.category?.name || '—'}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge text-capitalize ${TYPE_BADGES[biz.category?.type] || 'bg-secondary-subtle text-secondary'}`}>
                        {biz.category?.type || '—'}
                      </span>
                    </td>
                    <td>
                      <small>{[biz.city, biz.state].filter(Boolean).join(', ') || '—'}</small>
                    </td>
                    <td>
                      <small className="d-block">{biz.phone || '—'}</small>
                      <small className="text-muted">{biz.email || '—'}</small>
                    </td>
                    <td>
                      <div
                        className={`form-check form-switch mb-0`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleActive(biz)}
                      >
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={!!biz.is_active}
                          onChange={() => {}}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <Link to={`/apps/ecommerce/seller-details?id=${biz.id}`}>
                          <Button size="sm" variant="outline-info">
                            <Icon icon="eye" size={14} />
                          </Button>
                        </Link>
                        <Button size="sm" variant="outline-primary" onClick={() => openEdit(biz)}>
                          <Icon icon="pencil" size={14} />
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => setDeleteId(biz.id)}>
                          <Icon icon="trash" size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>

        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center p-3 border-top">
            <small className="text-muted">Page {pagination.current_page} of {totalPages}</small>
            <div className="d-flex gap-1">
              <Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <Icon icon="chevron-left" size={14} />
              </Button>
              <Button size="sm" variant="outline-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <Icon icon="chevron-right" size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>{editBiz ? `Edit: ${editBiz.name}` : 'Add Business'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {/* Tabs */}
          <div className="border-bottom px-3 pt-2 d-flex gap-1 flex-wrap">
            {[
              { key:'basic', label:'Basic Info', icon:'building-store' },
              { key:'location', label:'Location', icon:'map-pin' },
              { key:'halal', label:'Halal', icon:'shield' },
              { key:'features', label:'Features', icon:'stars' },
              { key:'hours', label:'Hours', icon:'clock' },
              { key:'media', label:'Media', icon:'photo' },
            ].map(t => (
              <button key={t.key} type="button"
                className={`btn btn-sm px-3 pb-2 rounded-0 border-0 border-bottom border-2 ${modalTab === t.key ? 'border-primary text-primary fw-semibold' : 'border-transparent text-muted'}`}
                onClick={() => setModalTab(t.key)}>
                <Icon icon={t.icon} style={{ fontSize: 14 }} className="me-1" />{t.label}
              </button>
            ))}
          </div>

          <div className="p-3">
            <Row className="g-3">

              {/* ── BASIC INFO ── */}
              {modalTab === 'basic' && <>
                <Col md={6}>
                  <FormLabel>Business Name *</FormLabel>
                  <FormControl value={form.name} onChange={e => { const name = e.target.value; setForm(f => ({ ...f, name, ...(slugLocked ? {} : { slug: toSlug(name) }) })); }} placeholder="e.g. Pizza Palace" />
                </Col>
                <Col md={6}>
                  <FormLabel>
                    Slug
                    {!slugLocked && <small className="text-muted ms-1">(auto)</small>}
                    {slugLocked && <button type="button" className="btn btn-link btn-sm p-0 ms-1 text-muted" style={{ fontSize: 11 }} onClick={() => { setSlugLocked(false); setForm(f => ({ ...f, slug: toSlug(f.name) })); }}><Icon icon="refresh" style={{ fontSize: 13 }} /> reset</button>}
                  </FormLabel>
                  <FormControl value={form.slug} onChange={e => { setSlugLocked(true); setForm(f => ({ ...f, slug: e.target.value })); }} placeholder="pizza-palace" />
                </Col>
                <Col md={6}>
                  <FormLabel>Category</FormLabel>
                  <FormSelect value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                  </FormSelect>
                </Col>
                <Col md={6}>
                  <FormLabel>Cuisine</FormLabel>
                  <FormControl value={form.cuisine} onChange={e => setForm(f => ({ ...f, cuisine: e.target.value }))} placeholder="e.g. Pakistani, Indian" />
                </Col>
                <Col md={4}>
                  <FormLabel>Phone</FormLabel>
                  <FormControl value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 8900" />
                </Col>
                <Col md={4}>
                  <FormLabel>Email</FormLabel>
                  <FormControl type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </Col>
                <Col md={4}>
                  <FormLabel>Website</FormLabel>
                  <FormControl type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
                </Col>
                <Col md={3}>
                  <FormLabel>Price</FormLabel>
                  <FormSelect value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}>
                    <option value="">—</option>
                    {PRICE_OPTIONS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                  </FormSelect>
                </Col>
                <Col md={9}>
                  <FormLabel>Description</FormLabel>
                  <FormControl as="textarea" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </Col>
                <Col md={12}>
                  <Form.Check type="switch" label="Active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                </Col>
              </>}

              {/* ── LOCATION ── */}
              {modalTab === 'location' && <>
                <Col md={12}>
                  <FormLabel>Address</FormLabel>
                  <FormControl value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address" />
                </Col>
                <Col md={12}>
                  <FormLabel>Address 2</FormLabel>
                  <FormControl value={form.address_2} onChange={e => setForm(f => ({ ...f, address_2: e.target.value }))} placeholder="Apt, Suite, Floor..." />
                </Col>
                <Col md={4}><FormLabel>City</FormLabel><FormControl value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></Col>
                <Col md={3}><FormLabel>State</FormLabel><FormControl value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} /></Col>
                <Col md={2}><FormLabel>ZIP</FormLabel><FormControl value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} /></Col>
                <Col md={3}><FormLabel>Country</FormLabel><FormControl value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="us" /></Col>
                <Col md={6}><FormLabel>Parking</FormLabel><FormControl value={form.parking} onChange={e => setForm(f => ({ ...f, parking: e.target.value }))} /></Col>
                <Col md={6}><FormLabel>Transit</FormLabel><FormControl value={form.transit} onChange={e => setForm(f => ({ ...f, transit: e.target.value }))} /></Col>
              </>}

              {/* ── HALAL ── */}
              {modalTab === 'halal' && <>
                <Col md={6}>
                  <FormLabel>Compliance</FormLabel>
                  <FormSelect value={form.compliance} onChange={e => setForm(f => ({ ...f, compliance: e.target.value }))}>
                    <option value="">Select...</option>
                    {COMPLIANCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </FormSelect>
                </Col>
                <Col md={6}><FormLabel>Slaughter Method</FormLabel><FormControl value={form.slaughter_method} onChange={e => setForm(f => ({ ...f, slaughter_method: e.target.value }))} /></Col>
                <Col md={6}><FormLabel>Halal Authority</FormLabel><FormControl value={form.halal_authority} onChange={e => setForm(f => ({ ...f, halal_authority: e.target.value }))} /></Col>
                <Col md={6}><FormLabel>Halal Options</FormLabel><FormControl value={form.halal_options} onChange={e => setForm(f => ({ ...f, halal_options: e.target.value }))} /></Col>
                <Col md={12}><FormLabel>Halal Info</FormLabel><FormControl as="textarea" rows={3} value={form.halal_info} onChange={e => setForm(f => ({ ...f, halal_info: e.target.value }))} /></Col>
              </>}

              {/* ── FEATURES ── */}
              {modalTab === 'features' && <>
                <Col xs={12}><p className="text-muted mb-2 small">Toggle available features for this business:</p></Col>
                {[
                  ['delivery','Delivery','truck-delivery'],['catering','Catering','chef-hat'],
                  ['wifi','Wi-Fi','wifi'],['kids_menu','Kids Menu','baby-carriage'],
                  ['pray_space','Prayer Space','building-mosque'],['outdoor_seating','Outdoor Seating','trees'],
                  ['wheelchair_access','Wheelchair Access','wheelchair'],['reservations','Reservations','calendar'],
                  ['drive_thru','Drive Thru','car'],['cash_only','Cash Only','cash'],
                  ['organic','Organic','leaf'],['alcohol','Serves Alcohol','bottle'],
                  ['pork','Serves Pork','meat'],['shisha','Shisha','cloud'],
                  ['featured','Featured','star'],
                ].map(([key, label, icon]) => (
                  <Col key={key} md={4} xs={6}>
                    <div className={`border rounded p-2 d-flex align-items-center gap-2 cursor-pointer ${form[key] ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                      style={{ cursor:'pointer' }} onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}>
                      <Form.Check type="checkbox" checked={!!form[key]} onChange={() => {}} className="mb-0" />
                      <Icon icon={icon} style={{ fontSize: 16 }} className={form[key] ? 'text-primary' : 'text-muted'} />
                      <small>{label}</small>
                    </div>
                  </Col>
                ))}
              </>}

              {/* ── HOURS ── */}
              {modalTab === 'hours' && <>
                <Col xs={12}><p className="text-muted mb-1 small">Enter hours as 24h decimal (e.g. 11 = 11am, 22 = 10pm, 13.5 = 1:30pm)</p></Col>
                {DAYS.map(day => (
                  <Col md={6} key={day}>
                    <div className="border rounded p-2">
                      <div className="text-capitalize fw-semibold mb-2 small">{day}</div>
                      <div className="d-flex gap-2">
                        <FormControl size="sm" value={form[`${day}_open`]} onChange={e => setForm(f => ({ ...f, [`${day}_open`]: e.target.value }))} placeholder="Open (e.g. 11)" />
                        <span className="align-self-center text-muted">–</span>
                        <FormControl size="sm" value={form[`${day}_close`]} onChange={e => setForm(f => ({ ...f, [`${day}_close`]: e.target.value }))} placeholder="Close (e.g. 22)" />
                      </div>
                    </div>
                  </Col>
                ))}
              </>}

              {/* ── MEDIA ── */}
              {modalTab === 'media' && <>
                <Col md={5}>
                  <MediaUpload label="Logo" value={form.logo} onChange={url => setForm(f => ({ ...f, logo: url }))} folder="businesses" aspect="square" />
                </Col>
                <Col md={7}>
                  <MediaUpload label="Cover Image" value={form.cover_image} onChange={url => setForm(f => ({ ...f, cover_image: url }))} folder="businesses" aspect="wide" />
                </Col>
              </>}

            </Row>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size="sm" className="me-1" /> : null}
            {editBiz ? 'Update' : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirm */}
      <Modal show={!!deleteId} onHide={() => setDeleteId(null)} centered size="sm">
        <Modal.Header closeButton><Modal.Title>Delete Business</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to delete this business?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => handleDelete(deleteId)}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
