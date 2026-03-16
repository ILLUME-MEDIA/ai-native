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

const emptyForm = { name: '', icon: '', hover_icon: '', is_active: true, sort_order: 0 };

const columnHelper = createColumnHelper();

// Small icon preview box
const IconBox = ({ icon, hoverIcon, size = 36 }) => {
  const [hovered, setHovered] = useState(false);
  const current = hovered && hoverIcon ? hoverIcon : icon;
  return (
    <div
      className="d-flex align-items-center justify-content-center rounded border bg-light"
      style={{ width: size, height: size, flexShrink: 0, cursor: hoverIcon ? 'pointer' : 'default', transition: 'background 0.2s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={hoverIcon ? `Hover: ${hoverIcon}` : undefined}
    >
      {current
        ? <Icon icon={current} size={size * 0.5} className="text-primary" />
        : <Icon icon="tools-kitchen-2" size={size * 0.5} className="text-muted" />
      }
    </div>
  );
};

export default function CuisinesPage() {
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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = () => {
    setLoading(true);
    axios.get('/api/ecommerce/cuisines')
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : (r.data.data || []);
        setRows(data);
        if (r.data.last_page) setPagination(r.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const filtered = search
    ? rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const openAdd = () => { setEditRow(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (row) => {
    setEditRow(row);
    setForm({ name: row.name || '', icon: row.icon || '', hover_icon: row.hover_icon || '', is_active: row.is_active ?? true, sort_order: row.sort_order ?? 0 });
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
      .then(() => load())
      .catch(() => showToast('Update failed', 'danger'));
  };

  const columns = [
    columnHelper.accessor('name', {
      header: 'Cuisine',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="d-flex align-items-center gap-3">
            <IconBox icon={r.icon} hoverIcon={r.hover_icon} size={40} />
            <div>
              <div className="fw-semibold">{r.name}</div>
              <small className="text-muted">{r.slug}</small>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('icon', {
      header: 'Icons',
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="d-flex align-items-center gap-2">
            <div className="text-center">
              <small className="text-muted d-block" style={{ fontSize: 10 }}>Default</small>
              <code className="small">{r.icon || '—'}</code>
            </div>
            {r.hover_icon && (
              <>
                <Icon icon="arrow-right" size={12} className="text-muted" />
                <div className="text-center">
                  <small className="text-muted d-block" style={{ fontSize: 10 }}>Hover</small>
                  <code className="small">{r.hover_icon}</code>
                </div>
              </>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('muzzs_count', {
      header: 'Restaurants',
      enableSorting: false,
      cell: ({ getValue }) => (
        <Badge bg="secondary" className="fw-normal">{getValue() ?? 0}</Badge>
      ),
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
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const totalPages = pagination.last_page || 1;
  const totalItems = pagination.total || filtered.length;
  const start      = totalItems === 0 ? 0 : (page - 1) * 15 + 1;
  const end        = Math.min(page * 15, totalItems);

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
            <FormControl
              placeholder="Search cuisines..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingRight: 36, minWidth: 220 }}
            />
            <Icon icon="search" size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          </div>
          <Button variant="primary" onClick={openAdd}>
            <Icon icon="plus" size={15} className="me-1" />
            Add Cuisine
          </Button>
        </CardHeader>

        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : (
            <DataTable table={table} emptyMessage="No cuisines found." />
          )}
        </CardBody>

        {totalPages > 1 && (
          <CardFooter className="border-0">
            <TablePagination
              totalItems={totalItems} start={start} end={end}
              itemsName="cuisines" showInfo
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
            {editRow ? `Edit: ${editRow.name}` : 'Add Cuisine'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Row className="g-3">
            <Col xs={12}>
              <FormLabel>Cuisine Name <span className="text-danger">*</span></FormLabel>
              <FormControl
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Pakistani, Italian, Thai"
              />
            </Col>

            <Col xs={6}>
              <FormLabel>
                Default Icon
                <small className="text-muted ms-1">(Tabler icon name)</small>
              </FormLabel>
              <FormControl
                value={form.icon}
                onChange={e => set('icon', e.target.value)}
                placeholder="e.g. tools-kitchen-2"
              />
            </Col>

            <Col xs={6}>
              <FormLabel>
                Hover Icon
                <small className="text-muted ms-1">(on mouse over)</small>
              </FormLabel>
              <FormControl
                value={form.hover_icon}
                onChange={e => set('hover_icon', e.target.value)}
                placeholder="e.g. flame"
              />
            </Col>

            {/* Live icon preview */}
            <Col xs={12}>
              <div className="d-flex align-items-center gap-3 p-3 rounded border bg-light">
                <IconBox icon={form.icon} hoverIcon={form.hover_icon} size={48} />
                <div>
                  <div className="fw-semibold">{form.name || <span className="text-muted">Cuisine Name</span>}</div>
                  <small className="text-muted">
                    {form.hover_icon ? 'Hover over icon to see hover state' : 'No hover icon set'}
                  </small>
                </div>
              </div>
            </Col>

            <Col xs={6}>
              <FormLabel>Sort Order</FormLabel>
              <FormControl
                type="number"
                value={form.sort_order}
                onChange={e => set('sort_order', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </Col>

            <Col xs={6} className="d-flex flex-column justify-content-end pb-1">
              <Form.Check
                type="switch"
                label="Active"
                checked={!!form.is_active}
                onChange={e => set('is_active', e.target.checked)}
              />
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

      <DeleteConfirmationModal
        show={!!deleteId}
        onHide={() => setDeleteId(null)}
        onConfirm={handleDelete}
        itemName="cuisine"
      />
    </>
  );
}
