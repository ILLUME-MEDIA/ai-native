import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import axios from 'axios';
import { useState, useEffect, useRef } from 'react';
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import {
  Alert, Badge, Button, Card, CardBody, CardFooter, CardHeader,
  Col, Form, FormControl, FormLabel, Modal, Row, Spinner,
} from 'react-bootstrap';

const emptyForm = { name: '', icon: '', hover_icon: '', is_active: true, sort_order: 0 };

const columnHelper = createColumnHelper();

/** Detect if a value is an image URL or a Tabler icon name */
const isUrl = (val) => val && (val.startsWith('http') || val.startsWith('/') || val.startsWith('data:'));

/** Renders either an uploaded image or a Tabler icon, with hover swap */
const IconPreview = ({ icon, hoverIcon, size = 36 }) => {
  const [hovered, setHovered] = useState(false);
  const current = hovered && hoverIcon ? hoverIcon : icon;
  const s = size;
  return (
    <div
      className="d-flex align-items-center justify-content-center rounded border bg-light"
      style={{ width: s, height: s, flexShrink: 0, cursor: hoverIcon ? 'pointer' : 'default', overflow: 'hidden' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={hoverIcon ? 'Hover to see hover icon' : undefined}
    >
      {current ? (
        isUrl(current)
          ? <img src={current} alt="" style={{ width: s - 8, height: s - 8, objectFit: 'contain' }} />
          : <Icon icon={current} size={s * 0.5} className="text-primary" />
      ) : (
        <Icon icon="tools-kitchen-2" size={s * 0.5} className="text-muted" />
      )}
    </div>
  );
};

/** Small upload + text input combo for icon field */
const IconField = ({ label, value, onChange }) => {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);

  const doUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'cuisines');
    try {
      const { data } = await axios.post('/api/ecommerce/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <FormLabel>{label}</FormLabel>
      <div className="d-flex gap-2 align-items-start">
        {/* Preview */}
        <IconPreview icon={value} size={38} />
        <div className="flex-grow-1">
          <FormControl
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Icon name (e.g. flame) or paste URL"
            size="sm"
          />
          <div className="d-flex gap-1 mt-1">
            <Button size="sm" variant="outline-secondary" onClick={() => fileRef.current?.click()}
              disabled={uploading} style={{ fontSize: 11 }}>
              {uploading ? <Spinner size="sm" /> : <><Icon icon="upload" size={12} className="me-1" />Upload SVG/PNG</>}
            </Button>
            {value && (
              <Button size="sm" variant="outline-danger" onClick={() => onChange('')} style={{ fontSize: 11 }}>
                <Icon icon="x" size={12} />
              </Button>
            )}
          </div>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" className="d-none"
        onChange={e => doUpload(e.target.files?.[0])} />
    </div>
  );
};

export default function CuisinesPage() {
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [pagination, setPagination] = useState({});
  const [page, setPage]             = useState(1);
  const [perPage, setPerPage]       = useState(100);
  const [search, setSearch]         = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editRow, setEditRow]       = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [deleteId, setDeleteId]     = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ admin: 1, page, per_page: perPage });
    if (search) params.set('search', search);
    axios.get(`/api/ecommerce/cuisines?${params}`)
      .then(r => { setRows(r.data.data || []); setPagination(r.data); })
      .finally(() => setLoading(false));
  };

  // Only reload table when page changes AND modal is closed
  useEffect(() => { if (!showModal) load(); }, [page, perPage, showModal]);

  const handleActivateAll = () => {
    axios.put('/api/ecommerce/cuisines/activate-all')
      .then(r => { showToast(r.data.message); load(); })
      .catch(() => showToast('Failed', 'danger'));
  };

  const openAdd  = () => { setEditRow(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (row) => {
    setEditRow(row);
    setForm({ name: row.name || '', icon: row.icon || '', hover_icon: row.hover_icon || '',
      is_active: row.is_active ?? true, sort_order: row.sort_order ?? 0 });
    setShowModal(true);
  };

  const handleSave = () => {
    setSaving(true);
    const req = editRow
      ? axios.patch(`/api/ecommerce/cuisines/${editRow.id}`, form)
      : axios.post('/api/ecommerce/cuisines', form);
    req.then(() => { showToast(editRow ? 'Updated!' : 'Created!'); setShowModal(false); load(); })
       .catch(e => showToast(e.response?.data?.message || 'Error saving', 'danger'))
       .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    axios.delete(`/api/ecommerce/cuisines/${deleteId}`)
      .then(() => { showToast('Deleted'); load(); })
      .catch(() => showToast('Delete failed', 'danger'))
      .finally(() => setDeleteId(null));
  };

  const toggleActive = (row) => {
    axios.patch(`/api/ecommerce/cuisines/${row.id}`, { is_active: !row.is_active })
      .then(() => { if (!showModal) load(); })
      .catch(() => showToast('Update failed', 'danger'));
  };

  const columns = [
    columnHelper.accessor('name', {
      header: 'Cuisine',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="d-flex align-items-center gap-3">
            <IconPreview icon={r.icon} hoverIcon={r.hover_icon} size={40} />
            <div>
              <div className="fw-semibold">{r.name}</div>
              <small className="text-muted">{r.slug}</small>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('icon', {
      header: 'Default Icon',
      enableSorting: false,
      cell: ({ getValue }) => {
        const v = getValue();
        return v ? (
          isUrl(v)
            ? <img src={v} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            : <code className="small">{v}</code>
        ) : <span className="text-muted">—</span>;
      },
    }),
    columnHelper.accessor('hover_icon', {
      header: 'Hover Icon',
      enableSorting: false,
      cell: ({ getValue }) => {
        const v = getValue();
        return v ? (
          isUrl(v)
            ? <img src={v} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            : <code className="small">{v}</code>
        ) : <span className="text-muted">—</span>;
      },
    }),
    columnHelper.accessor('muzzs_count', {
      header: 'Restaurants',
      enableSorting: false,
      cell: ({ getValue }) => <Badge bg="secondary" className="fw-normal">{getValue() ?? 0}</Badge>,
    }),
    columnHelper.accessor('sort_order', {
      header: 'Order',
      enableSorting: false,
      cell: ({ getValue }) => <small className="text-muted">{getValue()}</small>,
    }),
    columnHelper.accessor('is_active', {
      header: 'Active',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="form-check form-switch mb-0" style={{ cursor: 'pointer' }}
          onClick={() => toggleActive(row.original)}>
          <input className="form-check-input" type="checkbox"
            checked={!!row.original.is_active} onChange={() => {}} style={{ cursor: 'pointer' }} />
        </div>
      ),
    }),
    {
      id: 'actions', header: 'Actions', enableSorting: false,
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

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel(), manualPagination: true });

  const totalPages = pagination.last_page || 1;
  const totalItems = pagination.total || rows.length;
  const start      = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const end        = Math.min(page * perPage, totalItems);

  return (
    <>
      <PageBreadcrumb title="Cuisines" subtitle="Ecommerce" />

      {toast && (
        <Alert variant={toast.type} className="position-fixed top-0 end-0 m-3 shadow" style={{ zIndex: 9999, minWidth: 260 }}>
          {toast.msg}
        </Alert>
      )}

      <Card>
        <CardHeader className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <div style={{ position: 'relative' }}>
            <FormControl placeholder="Search cuisines..." value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(); } }}
              style={{ paddingRight: 36, minWidth: 220 }} />
            <Icon icon="search" size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          </div>
          <div className="d-flex gap-2 align-items-center">
            <Form.Select size="sm" style={{ width: 'auto' }} value={perPage}
              onChange={e => { setPage(1); setPerPage(Number(e.target.value)); }}>
              {[50, 100, 200, 500].map(n => <option key={n} value={n}>{n} per page</option>)}
            </Form.Select>
            <Button variant="outline-success" onClick={handleActivateAll} title="Set all cuisines active">
              <Icon icon="check-all" size={15} className="me-1" />Activate All
            </Button>
            <Button variant="primary" onClick={openAdd}>
              <Icon icon="plus" size={15} className="me-1" />Add Cuisine
            </Button>
          </div>
        </CardHeader>

        <CardBody className="p-0">
          {loading ? <div className="text-center py-5"><Spinner /></div>
            : <DataTable table={table} emptyMessage="No cuisines found." />}
        </CardBody>

        {totalPages > 1 && (
          <CardFooter className="border-0">
            <TablePagination
              totalItems={totalItems} start={start} end={end} itemsName="cuisines" showInfo
              previousPage={() => setPage(p => p - 1)} canPreviousPage={page > 1}
              pageCount={totalPages} pageIndex={page - 1}
              setPageIndex={(idx) => setPage(idx + 1)}
              nextPage={() => setPage(p => p + 1)} canNextPage={page < totalPages}
            />
          </CardFooter>
        )}
      </Card>

      {/* Add / Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <Icon icon={editRow ? 'pencil' : 'plus'} size={16} className="me-2" />
            {editRow ? `Edit: ${editRow.name}` : 'Add Cuisine'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Row className="g-3">
            <Col xs={12}>
              <FormLabel>Cuisine Name <span className="text-danger">*</span></FormLabel>
              <FormControl value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Pakistani, Italian, Thai" />
            </Col>

            <Col md={6}>
              <IconField label="Default Icon" value={form.icon} onChange={v => set('icon', v)} />
            </Col>

            <Col md={6}>
              <IconField label="Hover Icon (optional)" value={form.hover_icon} onChange={v => set('hover_icon', v)} />
            </Col>

            {/* Live preview */}
            <Col xs={12}>
              <div className="d-flex align-items-center gap-3 p-3 rounded border bg-light">
                <IconPreview icon={form.icon} hoverIcon={form.hover_icon} size={52} />
                <div>
                  <div className="fw-semibold">{form.name || <span className="text-muted">Cuisine Name</span>}</div>
                  <small className="text-muted">
                    {form.hover_icon ? 'Hover over icon to preview hover state' : 'No hover icon set'}
                  </small>
                </div>
              </div>
            </Col>

            <Col xs={6}>
              <FormLabel>Sort Order</FormLabel>
              <FormControl type="number" value={form.sort_order}
                onChange={e => set('sort_order', parseInt(e.target.value) || 0)} placeholder="0" />
            </Col>

            <Col xs={6} className="d-flex flex-column justify-content-end pb-1">
              <Form.Check type="switch" label="Active"
                checked={!!form.is_active} onChange={e => set('is_active', e.target.checked)} />
            </Col>
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

      <DeleteConfirmationModal show={!!deleteId} onHide={() => setDeleteId(null)}
        onConfirm={handleDelete} itemName="cuisine" />
    </>
  );
}
