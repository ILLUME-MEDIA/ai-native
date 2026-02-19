import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import MediaUpload from '../../_components/MediaUpload';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle,
  Col, Form, FormControl, FormGroup, FormLabel, FormSelect,
  Modal, Row, Spinner, Table
} from 'react-bootstrap';

const TYPE_COLORS = { restaurant: 'danger', store: 'primary', service: 'success' };
const TYPE_ICONS  = { restaurant: 'tools-kitchen-2', store: 'building-store', service: 'briefcase' };

const emptyForm = { name: '', slug: '', description: '', address: '', city: '', state: '', phone: '', email: '', logo: '', cover_image: '', category_id: '', is_active: true };

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

  const openAdd = () => { setEditBiz(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (biz) => {
    setEditBiz(biz);
    setForm({
      name: biz.name || '', slug: biz.slug || '', description: biz.description || '',
      address: biz.address || '', city: biz.city || '', state: biz.state || '',
      phone: biz.phone || '', email: biz.email || '', logo: biz.logo || '',
      cover_image: biz.cover_image || '', category_id: biz.category_id || '',
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
                    <Icon name={TYPE_ICONS[type]} size={28} />
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
              <Icon name="search" size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            </div>
            <FormSelect style={{ width: 140 }} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              <option value="restaurant">Restaurant</option>
              <option value="store">Store</option>
              <option value="service">Service</option>
            </FormSelect>
          </div>
          <Button variant="primary" onClick={openAdd}>
            <Icon name="plus" size={15} className="me-1" />
            Add Business
          </Button>
        </CardHeader>

        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <Icon name="building-store" size={40} className="mb-2 opacity-50" />
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
                            <Icon name="store" size={18} className="text-primary" />
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
                      <Badge bg={TYPE_COLORS[biz.category?.type] || 'secondary'} className="text-capitalize">
                        {biz.category?.type || '—'}
                      </Badge>
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
                            <Icon name="eye" size={14} />
                          </Button>
                        </Link>
                        <Button size="sm" variant="outline-primary" onClick={() => openEdit(biz)}>
                          <Icon name="pencil" size={14} />
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => setDeleteId(biz.id)}>
                          <Icon name="trash" size={14} />
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
                <Icon name="chevron-left" size={14} />
              </Button>
              <Button size="sm" variant="outline-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <Icon name="chevron-right" size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editBiz ? 'Edit Business' : 'Add Business'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup>
                <FormLabel>Business Name *</FormLabel>
                <FormControl value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Pizza Palace" />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Slug</FormLabel>
                <FormControl value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="pizza-palace" />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Category</FormLabel>
                <FormSelect value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </FormSelect>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Phone</FormLabel>
                <FormControl value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 8900" />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Email</FormLabel>
                <FormControl type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>City</FormLabel>
                <FormControl value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>State</FormLabel>
                <FormControl value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
              </FormGroup>
            </Col>
            <Col md={12}>
              <FormGroup>
                <FormLabel>Address</FormLabel>
                <FormControl value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" />
              </FormGroup>
            </Col>
            <Col md={12}>
              <FormGroup>
                <FormLabel>Description</FormLabel>
                <FormControl as="textarea" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <MediaUpload
                label="Logo"
                value={form.logo}
                onChange={url => setForm(f => ({ ...f, logo: url }))}
                folder="businesses"
              />
            </Col>
            <Col md={6}>
              <MediaUpload
                label="Cover Image"
                value={form.cover_image}
                onChange={url => setForm(f => ({ ...f, cover_image: url }))}
                folder="businesses"
              />
            </Col>
            <Col md={12}>
              <Form.Check
                type="switch"
                label="Active"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              />
            </Col>
          </Row>
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
