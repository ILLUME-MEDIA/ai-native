import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';
import {
  Badge, Button, Card, CardBody, CardFooter, CardHeader,
  Col, FormControl, InputGroup, Modal, Row,
} from 'react-bootstrap';
import { Link } from 'react-router';
import axios from 'axios';

const columnHelper = createColumnHelper();

// ─── Assign Groups Modal ─────────────────────────────────────────────────
function AssignGroupsModal({ caseStudy, groups, onClose, onSaved }) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (caseStudy) {
      setSelected((caseStudy.groups ?? []).map((g) => g.id));
    }
  }, [caseStudy]);

  const toggle = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const save = async () => {
    setSaving(true);
    try {
      await axios.post(`/api/admin/case-studies/${caseStudy.id}/assign-groups`, { group_ids: selected });
      onSaved();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={!!caseStudy} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-6">Assign Groups — {caseStudy?.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {groups.length === 0 ? (
          <p className="text-muted text-center py-3">No groups found. Create groups first.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {groups.map((g) => (
              <label key={g.id} className="d-flex align-items-center gap-2 cursor-pointer p-2 rounded border" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  className="form-check-input mt-0"
                  checked={selected.includes(g.id)}
                  onChange={() => toggle(g.id)}
                />
                <span className="badge" style={{ background: g.color + '22', color: g.color, border: `1px solid ${g.color}44` }}>
                  {g.name}
                </span>
                {g.description && <small className="text-muted">{g.description}</small>}
              </label>
            ))}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={save} disabled={saving}>
          {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : 'Save Groups'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Manage Groups Panel ─────────────────────────────────────────────────
function ManageGroupsModal({ show, groups, onClose, onRefresh }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await axios.post('/api/admin/case-study-groups', { name, color, description });
      setName(''); setColor('#3b82f6'); setDescription('');
      onRefresh();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (id, groupName) => {
    if (!window.confirm(`Delete group "${groupName}"?`)) return;
    await axios.delete(`/api/admin/case-study-groups/${id}`);
    onRefresh();
  };

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-6">Manage Groups</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Create Group */}
        <div className="border rounded p-3 mb-4 bg-light-subtle">
          <p className="fw-semibold mb-2 fs-sm">Create New Group</p>
          <Row className="g-2">
            <Col xs={5}>
              <FormControl size="sm" placeholder="Group name..." value={name} onChange={(e) => setName(e.target.value)} />
            </Col>
            <Col xs={4}>
              <FormControl size="sm" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            </Col>
            <Col xs={2}>
              <input type="color" className="form-control form-control-sm p-1" value={color} onChange={(e) => setColor(e.target.value)} title="Group color" />
            </Col>
            <Col xs={1}>
              <Button size="sm" variant="primary" className="w-100" onClick={create} disabled={saving || !name.trim()}>
                <Icon icon="plus" />
              </Button>
            </Col>
          </Row>
        </div>

        {/* Existing groups */}
        <div>
          {groups.length === 0 ? (
            <p className="text-muted text-center py-3">No groups yet.</p>
          ) : (
            groups.map((g) => (
              <div key={g.id} className="d-flex align-items-center gap-2 p-2 border-bottom">
                <span className="badge" style={{ background: g.color + '22', color: g.color, border: `1px solid ${g.color}44`, minWidth: 80 }}>
                  {g.name}
                </span>
                <small className="text-muted flex-grow-1">{g.description}</small>
                <button type="button" className="btn btn-sm btn-soft-danger btn-icon" onClick={() => deleteGroup(g.id, g.name)} title="Delete">
                  <Icon icon="trash" />
                </button>
              </div>
            ))
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" size="sm" onClick={onClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────
const CaseStudyList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });
  const [total, setTotal] = useState(0);

  const [groups, setGroups] = useState([]);
  const [assignTarget, setAssignTarget] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/case-study-groups');
      setGroups(res.data ?? []);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/case-studies', {
        params: {
          search,
          status: statusFilter,
          group_id: groupFilter,
          page: pagination.pageIndex + 1,
          per_page: pagination.pageSize,
        },
      });
      setData(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, groupFilter, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await axios.delete(`/api/admin/case-studies/${id}`);
      fetchData();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const columns = [
    columnHelper.accessor('title', {
      header: 'Title',
      cell: ({ row }) => (
        <div>
          <Link to={`/apps/case-studies/${row.original.id}/edit`} className="fw-semibold text-primary text-decoration-none">
            {row.original.title}
          </Link>
          {row.original.slug && (
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>/{row.original.slug}</div>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('category', {
      header: 'Category',
      cell: ({ getValue }) => {
        const val = getValue();
        return val
          ? <Badge bg="primary" className="bg-primary-subtle text-primary fw-normal">{val}</Badge>
          : <span className="text-muted">—</span>;
      },
    }),
    columnHelper.accessor('client_name', {
      header: 'Client',
      cell: ({ getValue }) => getValue() || <span className="text-muted">—</span>,
    }),
    {
      id: 'groups',
      header: 'Groups',
      cell: ({ row }) => {
        const gs = row.original.groups ?? [];
        if (gs.length === 0) return <span className="text-muted fs-xs">No groups</span>;
        return (
          <div className="d-flex flex-wrap gap-1">
            {gs.map((g) => (
              <span
                key={g.id}
                className="badge"
                style={{ background: (g.color ?? '#3b82f6') + '22', color: g.color ?? '#3b82f6', border: `1px solid ${(g.color ?? '#3b82f6')}44`, fontSize: '0.7rem' }}
              >
                {g.name}
              </span>
            ))}
          </div>
        );
      },
    },
    columnHelper.accessor('status', {
      header: 'Status',
      cell: ({ getValue }) => {
        const val = parseInt(getValue());
        return val === 1
          ? <Badge bg="success" className="bg-success-subtle text-success fw-normal">Published</Badge>
          : <Badge bg="warning" className="bg-warning-subtle text-warning fw-normal">Draft</Badge>;
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'Created',
      cell: ({ getValue }) => {
        const v = getValue();
        return v ? <span className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(v).toLocaleDateString()}</span> : '—';
      },
    }),
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="d-flex gap-1">
          <button
            className="btn btn-soft-info btn-sm btn-icon"
            title="Assign Groups"
            onClick={() => setAssignTarget(row.original)}
          >
            <Icon icon="tag" className="fs-lg" />
          </button>
          <Link
            to={`/apps/case-studies/${row.original.id}/edit`}
            className="btn btn-soft-primary btn-sm btn-icon"
            title="Edit"
          >
            <Icon icon="edit" className="fs-lg" />
          </Link>
          <button
            className="btn btn-soft-danger btn-sm btn-icon"
            title="Delete"
            onClick={() => handleDelete(row.original.id, row.original.title)}
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
    state: { pagination },
    onPaginationChange: setPagination,
    pageCount: Math.ceil(total / pagination.pageSize),
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <PageBreadcrumb title="Case Studies" subtitle="Admin" />

      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="border-light d-flex flex-wrap align-items-center gap-2">
              <h5 className="mb-0 me-auto">
                <Icon icon="file-text" className="me-2 text-primary" />
                Case Studies
              </h5>
              <Button variant="outline-secondary" size="sm" onClick={() => setManageOpen(true)}>
                <Icon icon="stack-2" className="me-1" /> Groups
              </Button>
              <Link to="/apps/case-studies/create" className="btn btn-primary btn-sm">
                <Icon icon="plus" className="me-1" />
                New Case Study
              </Link>
            </CardHeader>

            <CardBody>
              {/* Filters */}
              <Row className="mb-3 g-2">
                <Col xs={12} md={4}>
                  <InputGroup size="sm">
                    <InputGroup.Text><Icon icon="search" /></InputGroup.Text>
                    <FormControl
                      placeholder="Search title, category, client..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
                    />
                  </InputGroup>
                </Col>
                <Col xs={6} md={2}>
                  <select
                    className="form-select form-select-sm"
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
                  >
                    <option value="">All Status</option>
                    <option value="1">Published</option>
                    <option value="0">Draft</option>
                  </select>
                </Col>
                <Col xs={6} md={3}>
                  <select
                    className="form-select form-select-sm"
                    value={groupFilter}
                    onChange={(e) => { setGroupFilter(e.target.value); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
                  >
                    <option value="">All Groups</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </Col>
                <Col xs={12} md={3} className="d-flex align-items-center justify-content-end">
                  <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                    Total: <strong>{total}</strong>
                  </span>
                </Col>
              </Row>

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status" />
                  <p className="mt-2 text-muted">Loading...</p>
                </div>
              ) : (
                <DataTable table={table} />
              )}
            </CardBody>

            <CardFooter className="border-light">
              <TablePagination
                totalItems={total}
                start={total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1}
                end={Math.min((pagination.pageIndex + 1) * pagination.pageSize, total)}
                itemsName="case studies"
                showInfo
                previousPage={table.previousPage}
                canPreviousPage={table.getCanPreviousPage()}
                pageCount={table.getPageCount()}
                pageIndex={table.getState().pagination.pageIndex}
                setPageIndex={table.setPageIndex}
                nextPage={table.nextPage}
                canNextPage={table.getCanNextPage()}
              />
            </CardFooter>
          </Card>
        </Col>
      </Row>

      {/* Assign Groups Modal */}
      <AssignGroupsModal
        caseStudy={assignTarget}
        groups={groups}
        onClose={() => setAssignTarget(null)}
        onSaved={() => { setAssignTarget(null); fetchData(); }}
      />

      {/* Manage Groups Modal */}
      <ManageGroupsModal
        show={manageOpen}
        groups={groups}
        onClose={() => setManageOpen(false)}
        onRefresh={fetchGroups}
      />
    </>
  );
};

export default CaseStudyList;
