import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import Icon from '@admin/components/wrappers/Icon';
import {
  createColumnHelper, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, useReactTable,
} from '@tanstack/react-table';
import { useState, useEffect, useCallback } from 'react';
import {
  Row, Col, Card, CardHeader, CardFooter, Button, Modal, ModalHeader,
  ModalTitle, ModalBody, ModalFooter, Form, Badge, FormSelect,
} from 'react-bootstrap';

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? '';
const columnHelper = createColumnHelper();

const FEE_OVERRIDE_COLORS = {
  inherit:    'secondary',
  none:       'warning',
  percentage: 'primary',
  fixed:      'success',
};

const FEE_OVERRIDE_LABELS = {
  inherit:    'Inherit Global',
  none:       'No Fee',
  percentage: '% Override',
  fixed:      '$ Override',
};

// ── Business Form Modal ───────────────────────────────────────────────────────
const BusinessModal = ({ show, onHide, onSaved, editing }) => {
  const isEdit = !!editing;
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const blank = {
    name: '', slug: '', description: '', cuisine: '',
    address: '', city: '', state: '', zip: '', country: '',
    phone: '', email: '', website: '',
    delivery: false, featured: false, is_active: true, auto_accept: false,
    platform_fee_override: 'inherit', platform_fee_value: '',
  };

  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (show) {
      setForm(editing ? {
        name:                   editing.name                   ?? '',
        slug:                   editing.slug                   ?? '',
        description:            editing.description            ?? '',
        cuisine:                editing.cuisine                ?? '',
        address:                editing.address                ?? '',
        city:                   editing.city                   ?? '',
        state:                  editing.state                  ?? '',
        zip:                    editing.zip                    ?? '',
        country:                editing.country                ?? '',
        phone:                  editing.phone                  ?? '',
        email:                  editing.email                  ?? '',
        website:                editing.website                ?? '',
        delivery:               !!editing.delivery,
        featured:               !!editing.featured,
        is_active:              editing.is_active !== false,
        auto_accept:            !!editing.auto_accept,
        platform_fee_override:  editing.platform_fee_override  ?? 'inherit',
        platform_fee_value:     editing.platform_fee_value     ?? '',
      } : blank);
      setErrors({});
    }
  }, [show, editing]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    setSaving(true);
    setErrors({});
    try {
      const url    = isEdit ? `/api/ecommerce/businesses/${editing.id}` : '/api/ecommerce/businesses';
      const method = isEdit ? 'PATCH' : 'POST';

      const body = { ...form };
      if (!body.platform_fee_value && body.platform_fee_value !== 0) {
        delete body.platform_fee_value;
      } else {
        body.platform_fee_value = parseFloat(body.platform_fee_value) || 0;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept:         'application/json',
          'X-CSRF-TOKEN': csrf(),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.errors) { setErrors(err.errors); return; }
        throw new Error(err.message ?? 'Save failed');
      }

      const saved = await res.json();
      onSaved(saved, isEdit);
      onHide();
    } catch (e) {
      setErrors({ _general: e.message || 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  const showFeeValue = ['percentage', 'fixed'].includes(form.platform_fee_override);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <ModalHeader closeButton>
        <ModalTitle as="h5">{isEdit ? 'Edit' : 'Add'} Business</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {errors._general && (
          <div className="alert alert-danger py-2 mb-3">{errors._general}</div>
        )}

        <Row className="g-3">
          {/* Basic Info */}
          <Col xs={12}>
            <h6 className="text-muted text-uppercase fs-xs mb-2">Basic Info</h6>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Name <span className="text-danger">*</span></Form.Label>
              <Form.Control value={form.name} onChange={e => set('name', e.target.value)} isInvalid={!!errors.name} />
              <Form.Control.Feedback type="invalid">{errors.name?.[0]}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Slug</Form.Label>
              <Form.Control value={form.slug} onChange={e => set('slug', e.target.value)} isInvalid={!!errors.slug} placeholder="auto-generated if empty" />
              <Form.Control.Feedback type="invalid">{errors.slug?.[0]}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Cuisine</Form.Label>
              <Form.Control value={form.cuisine} onChange={e => set('cuisine', e.target.value)} placeholder="e.g. Italian, Chinese" />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Phone</Form.Label>
              <Form.Control value={form.phone} onChange={e => set('phone', e.target.value)} />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={form.email} onChange={e => set('email', e.target.value)} isInvalid={!!errors.email} />
              <Form.Control.Feedback type="invalid">{errors.email?.[0]}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Website</Form.Label>
              <Form.Control value={form.website} onChange={e => set('website', e.target.value)} />
            </Form.Group>
          </Col>

          {/* Address */}
          <Col xs={12}>
            <h6 className="text-muted text-uppercase fs-xs mb-2 mt-2">Address</h6>
          </Col>
          <Col xs={12}>
            <Form.Control value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
          </Col>
          <Col md={4}>
            <Form.Control value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />
          </Col>
          <Col md={3}>
            <Form.Control value={form.state} onChange={e => set('state', e.target.value)} placeholder="State" />
          </Col>
          <Col md={2}>
            <Form.Control value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="ZIP" />
          </Col>
          <Col md={3}>
            <Form.Control value={form.country} onChange={e => set('country', e.target.value)} placeholder="Country" />
          </Col>

          {/* ── Platform Fee Override ───────────────────────────────────── */}
          <Col xs={12}>
            <h6 className="text-muted text-uppercase fs-xs mb-2 mt-2">Platform Fee Override</h6>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Fee Override</Form.Label>
              <FormSelect
                value={form.platform_fee_override}
                onChange={e => set('platform_fee_override', e.target.value)}
              >
                <option value="inherit">Inherit Global Setting</option>
                <option value="none">No Platform Fee</option>
                <option value="percentage">Custom Percentage</option>
                <option value="fixed">Custom Fixed Amount</option>
              </FormSelect>
              <Form.Text className="text-muted">
                {form.platform_fee_override === 'inherit' && 'Uses the global fee setting for all orders.'}
                {form.platform_fee_override === 'none'    && 'No platform fee will be charged for this restaurant.'}
                {form.platform_fee_override === 'percentage' && 'Enter the % to charge (overrides global).'}
                {form.platform_fee_override === 'fixed'   && 'Enter a flat fee per order (overrides global).'}
              </Form.Text>
            </Form.Group>
          </Col>
          {showFeeValue && (
            <Col md={4}>
              <Form.Group>
                <Form.Label>
                  Fee Value
                  <span className="text-muted fw-normal ms-1 fs-sm">
                    {form.platform_fee_override === 'percentage' ? '(%)' : '($)'}
                  </span>
                </Form.Label>
                <div className="input-group">
                  {form.platform_fee_override === 'fixed' && (
                    <span className="input-group-text">$</span>
                  )}
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.platform_fee_value}
                    onChange={e => set('platform_fee_value', e.target.value)}
                    isInvalid={!!errors.platform_fee_value}
                  />
                  {form.platform_fee_override === 'percentage' && (
                    <span className="input-group-text">%</span>
                  )}
                  <Form.Control.Feedback type="invalid">
                    {errors.platform_fee_value?.[0]}
                  </Form.Control.Feedback>
                </div>
              </Form.Group>
            </Col>
          )}

          {/* Flags */}
          <Col xs={12}>
            <h6 className="text-muted text-uppercase fs-xs mb-2 mt-2">Options</h6>
          </Col>
          {[
            { key: 'is_active',    label: 'Active' },
            { key: 'delivery',     label: 'Delivery' },
            { key: 'featured',     label: 'Featured' },
            { key: 'auto_accept',  label: 'Auto Accept Orders' },
          ].map(({ key, label }) => (
            <Col md={3} key={key}>
              <Form.Check
                type="switch"
                id={`biz-${key}`}
                label={label}
                checked={!!form[key]}
                onChange={e => set(key, e.target.checked)}
              />
            </Col>
          ))}
        </Row>
      </ModalBody>
      <ModalFooter>
        <Button variant="light" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={saving} style={{ minWidth: 100 }}>
          {saving ? <span className="spinner-border spinner-border-sm" /> : isEdit ? 'Update' : 'Create'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const Businesses = () => {
  const [data, setData]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [editingRow, setEditingRow]     = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId]     = useState(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting]           = useState([]);
  const [pagination, setPagination]     = useState({ pageIndex: 0, pageSize: 20 });
  const [toast, setToast]               = useState(null);

  const showToast = (msg, variant = 'success') => {
    setToast({ msg, variant });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ecommerce/businesses?per_page=500', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json.data ?? json);
    } catch {
      showToast('Failed to load businesses.', 'danger');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      setData(prev => prev.map(b => b.id === saved.id ? saved : b));
    } else {
      setData(prev => [saved, ...prev]);
    }
    showToast(`Business ${isEdit ? 'updated' : 'created'} successfully.`);
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/ecommerce/businesses/${deletingId}`, {
        method:  'DELETE',
        headers: { 'X-CSRF-TOKEN': csrf() },
      });
      setData(prev => prev.filter(b => b.id !== deletingId));
      showToast('Business deleted.');
    } catch {
      showToast('Failed to delete.', 'danger');
    } finally {
      setShowDeleteModal(false);
      setDeletingId(null);
    }
  };

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: ({ row: { original: b } }) => (
        <div>
          <div className="fw-semibold">{b.name}</div>
          {b.cuisine && <small className="text-muted">{b.cuisine}</small>}
        </div>
      ),
    }),
    columnHelper.accessor('city', {
      header: 'Location',
      cell: ({ row: { original: b } }) => (
        <span className="text-muted fs-sm">
          {[b.city, b.state, b.country].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    }),
    columnHelper.accessor('platform_fee_override', {
      header: 'Platform Fee',
      cell: ({ row: { original: b } }) => {
        const ov  = b.platform_fee_override ?? 'inherit';
        const col = FEE_OVERRIDE_COLORS[ov] ?? 'secondary';
        const lbl = FEE_OVERRIDE_LABELS[ov]  ?? ov;
        return (
          <div className="d-flex align-items-center gap-1">
            <Badge bg={`${col}-subtle`} text={col} className="text-capitalize">
              {lbl}
            </Badge>
            {b.platform_fee_value != null && ['percentage', 'fixed'].includes(ov) && (
              <span className="text-muted fs-sm">
                {ov === 'percentage'
                  ? `${b.platform_fee_value}%`
                  : `$${parseFloat(b.platform_fee_value).toFixed(2)}`
                }
              </span>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('is_active', {
      header: 'Status',
      cell: ({ row: { original: b } }) => (
        <Badge bg={b.is_active ? 'success-subtle' : 'secondary-subtle'}
               text={b.is_active ? 'success' : 'secondary'}>
          {b.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    }),
    {
      id: 'flags',
      header: 'Options',
      cell: ({ row: { original: b } }) => (
        <div className="d-flex gap-1">
          {b.delivery    && <Badge bg="info-subtle"    text="info">Delivery</Badge>}
          {b.featured    && <Badge bg="warning-subtle" text="warning">Featured</Badge>}
          {b.auto_accept && <Badge bg="primary-subtle" text="primary">Auto Accept</Badge>}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row: { original: b } }) => (
        <div className="d-flex gap-1">
          <button
            className="btn btn-default btn-icon btn-sm"
            title="Edit"
            onClick={() => { setEditingRow(b); setShowModal(true); }}
          >
            <Icon icon="edit" className="fs-lg" />
          </button>
          <button
            className="btn btn-default btn-icon btn-sm text-danger"
            title="Delete"
            onClick={() => { setDeletingId(b.id); setShowDeleteModal(true); }}
          >
            <Icon icon="trash" className="fs-lg" />
          </button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state:                  { sorting, globalFilter, pagination },
    onSortingChange:        setSorting,
    onGlobalFilterChange:   setGlobalFilter,
    onPaginationChange:     setPagination,
    getCoreRowModel:        getCoreRowModel(),
    getSortedRowModel:      getSortedRowModel(),
    getFilteredRowModel:    getFilteredRowModel(),
    getPaginationRowModel:  getPaginationRowModel(),
    globalFilterFn:         'includesString',
  });

  const pageIndex  = table.getState().pagination.pageIndex;
  const pageSize   = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
  const start      = pageIndex * pageSize + 1;
  const end        = Math.min(start + pageSize - 1, totalItems);

  return (
    <>
      <PageBreadcrumb title="Businesses" subtitle="Ecommerce" />

      {toast && (
        <div
          className={`alert alert-${toast.variant} py-2 px-3 position-fixed bottom-0 end-0 m-3 shadow`}
          style={{ zIndex: 9999, minWidth: 280 }}
        >
          {toast.msg}
        </div>
      )}

      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="border-light justify-content-between flex-wrap gap-2">
              <div className="d-flex gap-2 align-items-center">
                <div className="app-search">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search businesses…"
                    value={globalFilter ?? ''}
                    onChange={e => setGlobalFilter(e.target.value)}
                  />
                  <Icon icon="search" className="app-search-icon text-muted" />
                </div>
                <Button
                  variant="secondary"
                  className="btn-icon"
                  title="Add business"
                  onClick={() => { setEditingRow(null); setShowModal(true); }}
                >
                  <Icon icon="plus" className="fs-lg" />
                </Button>
              </div>
              <div className="d-flex align-items-center gap-2">
                <FormSelect
                  className="form-control"
                  style={{ width: 70 }}
                  value={pageSize}
                  onChange={e => table.setPageSize(Number(e.target.value))}
                >
                  {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                </FormSelect>
              </div>
            </CardHeader>

            {loading
              ? <div className="text-center py-5"><span className="spinner-border" /></div>
              : <DataTable table={table} emptyMessage="No businesses found." />
            }

            {!loading && table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <TablePagination
                  totalItems={totalItems}
                  start={start}
                  end={end}
                  itemsName="businesses"
                  showInfo
                  previousPage={table.previousPage}
                  canPreviousPage={table.getCanPreviousPage()}
                  pageCount={table.getPageCount()}
                  pageIndex={pageIndex}
                  setPageIndex={table.setPageIndex}
                  nextPage={table.nextPage}
                  canNextPage={table.getCanNextPage()}
                />
              </CardFooter>
            )}
          </Card>
        </Col>
      </Row>

      <BusinessModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSaved={handleSaved}
        editing={editingRow}
      />

      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={() => { setShowDeleteModal(false); setDeletingId(null); }}
        onConfirm={handleDelete}
        selectedCount={1}
        itemName="business"
      />
    </>
  );
};

export default Businesses;
