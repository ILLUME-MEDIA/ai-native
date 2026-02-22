import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import {
  Alert, Badge, Button, Card, CardBody, CardFooter, CardHeader,
  Col, Form, FormControl, FormLabel, Modal, Row, Spinner,
} from 'react-bootstrap';

const emptyForm = { name: '', slug: '', description: '', icon: '', color: '#6366f1', is_active: true };

const columnHelper = createColumnHelper();

const toSlug = (str) => str.toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-');

export default function MuzzhubCategoriesPage() {
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [pagination, setPagination] = useState({});
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow]     = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);
  const [deleteId, setDeleteId]   = useState(null);
  const [slugLocked, setSlugLocked] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, per_page: 15 });
    if (search) params.set('search', search);
    axios.get(`/api/ecommerce/muzzhub-categories?${params}`)
      .then(r => { setRows(r.data.data || []); setPagination(r.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const openAdd = () => {
    setEditRow(null);
    setForm(emptyForm);
    setSlugLocked(false);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditRow(row);
    setForm({
      name: row.name || '', slug: row.slug || '',
      description: row.description || '', icon: row.icon || '',
      color: row.color || '#6366f1', is_active: row.is_active ?? true,
    });
    setSlugLocked(true);
    setShowModal(true);
  };

  const handleSave = () => {
    setSaving(true);
    const req = editRow
      ? axios.patch(`/api/ecommerce/muzzhub-categories/${editRow.id}`, form)
      : axios.post('/api/ecommerce/muzzhub-categories', form);
    req.then(() => { showToast(editRow ? 'Updated!' : 'Created!'); setShowModal(false); load(); })
       .catch(e => showToast(e.response?.data?.message || 'Error saving', 'danger'))
       .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    axios.delete(`/api/ecommerce/muzzhub-categories/${deleteId}`)
      .then(() => { showToast('Deleted'); load(); })
      .catch(() => showToast('Delete failed', 'danger'))
      .finally(() => setDeleteId(null));
  };

  const toggleActive = (row) => {
    axios.patch(`/api/ecommerce/muzzhub-categories/${row.id}`, { is_active: !row.is_active })
      .then(() => load())
      .catch(() => showToast('Update failed', 'danger'));
  };

  const totalPages = pagination.last_page || 1;
  const totalItems = pagination.total || 0;
  const start      = totalItems === 0 ? 0 : (page - 1) * 15 + 1;
  const end        = Math.min(page * 15, totalItems);

  const columns = [
    columnHelper.accessor('name', {
      header: 'Category',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-flex align-items-center justify-content-center rounded"
              style={{ width: 36, height: 36, background: r.color || '#6366f1', flexShrink: 0 }}
            >
              {r.icon
                ? <Icon icon={r.icon} size={16} style={{ color: '#fff' }} />
                : <Icon icon="tag" size={16} style={{ color: '#fff' }} />
              }
            </div>
            <div>
              <div className="fw-semibold">{r.name}</div>
              <small className="text-muted">{r.slug}</small>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      enableSorting: false,
      cell: ({ getValue }) => <small className="text-muted">{getValue()?.slice(0, 60) || '—'}</small>,
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
          <Button size="sm" variant="outline-primary" onClick={() => openEdit(row.original)}>
            <Icon icon="pencil" size={14} />
          </Button>
          <Button size="sm" variant="outline-danger" onClick={() => setDeleteId(row.original.id)}>
            <Icon icon="trash" size={14} />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <>
      <PageBreadcrumb title="Muzzhub Categories" subtitle="Ecommerce" />

      {toast && (
        <Alert variant={toast.type} className="position-fixed top-0 end-0 m-3 shadow" style={{ zIndex: 9999, minWidth: 260 }}>
          {toast.msg}
        </Alert>
      )}

      <Card>
        <CardHeader className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <div style={{ position: 'relative' }}>
            <FormControl
              placeholder="Search categories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(); } }}
              style={{ paddingRight: 36, minWidth: 220 }}
            />
            <Icon icon="search" size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          </div>
          <Button variant="primary" onClick={openAdd}>
            <Icon icon="plus" size={15} className="me-1" />
            Add Category
          </Button>
        </CardHeader>

        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : (
            <DataTable table={table} emptyMessage="No categories found." />
          )}
        </CardBody>

        {totalPages > 1 && (
          <CardFooter className="border-0">
            <TablePagination
              totalItems={totalItems} start={start} end={end}
              itemsName="categories" showInfo
              previousPage={() => setPage(p => p - 1)} canPreviousPage={page > 1}
              pageCount={totalPages} pageIndex={page - 1}
              setPageIndex={(idx) => setPage(idx + 1)}
              nextPage={() => setPage(p => p + 1)} canNextPage={page < totalPages}
            />
          </CardFooter>
        )}
      </Card>

      {/* Add / Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="md">
        <Modal.Header closeButton>
          <Modal.Title>
            <Icon icon={editRow ? 'pencil' : 'plus'} size={16} className="me-2" />
            {editRow ? `Edit: ${editRow.name}` : 'Add Category'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Row className="g-3">
            <Col xs={12}>
              <FormLabel>Category Name <span className="text-danger">*</span></FormLabel>
              <FormControl
                value={form.name}
                onChange={e => {
                  const name = e.target.value;
                  setForm(f => ({ ...f, name, ...(slugLocked ? {} : { slug: toSlug(name) }) }));
                }}
                placeholder="e.g. Restaurants, Grocery Stores"
              />
            </Col>

            <Col xs={8}>
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
                placeholder="restaurants"
              />
            </Col>

            <Col xs={4}>
              <FormLabel>Color</FormLabel>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="color"
                  value={form.color || '#6366f1'}
                  onChange={e => set('color', e.target.value)}
                  className="form-control form-control-color"
                  style={{ width: 48, height: 38, padding: 2 }}
                />
                <FormControl
                  value={form.color}
                  onChange={e => set('color', e.target.value)}
                  placeholder="#6366f1"
                />
              </div>
            </Col>

            <Col xs={8}>
              <FormLabel>Icon <small className="text-muted">(Tabler icon name)</small></FormLabel>
              <FormControl
                value={form.icon}
                onChange={e => set('icon', e.target.value)}
                placeholder="e.g. utensils, shopping-bag, coffee"
              />
            </Col>

            <Col xs={4} className="d-flex flex-column justify-content-end pb-1">
              <Form.Check
                type="switch"
                label="Active"
                checked={!!form.is_active}
                onChange={e => set('is_active', e.target.checked)}
              />
            </Col>

            <Col xs={12}>
              <FormLabel>Description</FormLabel>
              <FormControl
                as="textarea"
                rows={2}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Short description of this category..."
              />
            </Col>

            {/* Preview */}
            {form.name && (
              <Col xs={12}>
                <div className="d-flex align-items-center gap-2 p-2 rounded border">
                  <div
                    className="d-flex align-items-center justify-content-center rounded"
                    style={{ width: 36, height: 36, background: form.color || '#6366f1' }}
                  >
                    <Icon icon={form.icon || 'tag'} size={16} style={{ color: '#fff' }} />
                  </div>
                  <div>
                    <div className="fw-semibold">{form.name}</div>
                    <small className="text-muted">{form.slug}</small>
                  </div>
                </div>
              </Col>
            )}
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || !form.name}>
            {saving && <Spinner size="sm" className="me-1" />}
            {editRow ? 'Update' : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>

      <DeleteConfirmationModal
        show={!!deleteId}
        onHide={() => setDeleteId(null)}
        onConfirm={handleDelete}
        itemName="category"
      />
    </>
  );
}
