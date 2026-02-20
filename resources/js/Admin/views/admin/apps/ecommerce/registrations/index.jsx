import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import { createColumnHelper, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import {
  Alert, Badge, Button, Card, CardBody, CardFooter, CardHeader,
  Col, Form, FormControl, FormLabel, FormSelect, Modal, Row, Spinner,
} from 'react-bootstrap';

// ── constants ─────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:  { label: 'Pending',  badge: 'bg-warning-subtle text-warning', icon: 'hourglass'    },
  approved: { label: 'Approved', badge: 'bg-success-subtle text-success',  icon: 'circle-check' },
  rejected: { label: 'Rejected', badge: 'bg-danger-subtle text-danger',    icon: 'circle-x'     },
};

const SOURCE_CFG = {
  businesses:  { label: 'Businesses',  badge: 'bg-primary-subtle text-primary',   icon: 'building-store' },
  muzzhub:     { label: 'MuzzHub',     badge: 'bg-info-subtle text-info',          icon: 'globe'          },
  pakistanhub: { label: 'PakistanHub', badge: 'bg-success-subtle text-success',    icon: 'map-pin'        },
};

function SourceBadge({ source }) {
  const cfg = SOURCE_CFG[source] || SOURCE_CFG.businesses;
  return (
    <span className={`badge rounded-pill ${cfg.badge}`}>
      <Icon icon={cfg.icon} size={11} className="me-1" />{cfg.label}
    </span>
  );
}

const TABS = ['pending', 'approved', 'rejected'];

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_SHORT = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };

const columnHelper = createColumnHelper();

// ── small helpers ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  return <span className={`badge rounded-pill ${cfg.badge}`}>{cfg.label}</span>;
}

function StatCard({ icon, label, value, color }) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <CardBody className="d-flex align-items-center gap-3 py-3">
        <div className={`rounded-circle d-flex align-items-center justify-content-center bg-${color}-subtle flex-shrink-0`}
             style={{ width: 48, height: 48 }}>
          <Icon icon={icon} className={`text-${color} fs-5`} />
        </div>
        <div>
          <div className="fs-3 fw-bold lh-1 mb-1">{value}</div>
          <div className="text-muted small">{label}</div>
        </div>
      </CardBody>
    </Card>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function RegistrationsPage() {
  const [tab, setTab]         = useState('pending');
  const [rows, setRows]       = useState([]);
  const [pagMeta, setPagMeta] = useState({ total: 0, current_page: 1, last_page: 1 });
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [counts, setCounts]   = useState({ pending: 0, approved: 0, rejected: 0 });
  const [toast, setToast]     = useState(null);

  // detail modal
  const [detail, setDetail]     = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // approve modal
  const [approveReg, setApproveReg]   = useState(null);
  const [extUrl, setExtUrl]           = useState('');
  const [approving, setApproving]     = useState(false);

  // reject modal
  const [rejectReg, setRejectReg]     = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting]     = useState(false);

  // delete
  const [deleteReg, setDeleteReg]     = useState(null);

  // ── helpers ──────────────────────────────────────────────────────────────

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── data fetching ────────────────────────────────────────────────────────

  const fetchCounts = useCallback(async () => {
    try {
      const [p, a, r] = await Promise.all([
        axios.get('/api/ecommerce/registrations?status=pending&per_page=1'),
        axios.get('/api/ecommerce/registrations?status=approved&per_page=1'),
        axios.get('/api/ecommerce/registrations?status=rejected&per_page=1'),
      ]);
      setCounts({ pending: p.data.total, approved: a.data.total, rejected: r.data.total });
    } catch {}
  }, []);

  const fetchRows = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const res = await axios.get('/api/ecommerce/registrations', {
        params: { status: tab, page: pg, per_page: 15 },
      });
      setRows(res.data.data || []);
      setPagMeta({ total: res.data.total, current_page: res.data.current_page, last_page: res.data.last_page });
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to load.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { setPage(1); fetchRows(1); fetchCounts(); }, [tab]);
  useEffect(() => { fetchRows(page); }, [page]);

  // ── detail ───────────────────────────────────────────────────────────────

  const openDetail = async (reg) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await axios.get(`/api/ecommerce/registrations/${reg.id}`);
      setDetail(res.data);
    } catch {}
    setDetailLoading(false);
  };

  // ── approve ──────────────────────────────────────────────────────────────

  const openApprove = (reg) => { setApproveReg(reg); setExtUrl(reg.external_site_url || ''); };

  const doApprove = async () => {
    setApproving(true);
    try {
      await axios.post(`/api/ecommerce/registrations/${approveReg.id}/approve`, {
        external_site_url: extUrl || undefined,
      });
      showToast(`"${approveReg.business_name}" approved — Business created!`);
      setApproveReg(null);
      fetchRows(page);
      fetchCounts();
    } catch (e) {
      showToast(e.response?.data?.message || 'Approval failed.', 'danger');
    } finally {
      setApproving(false);
    }
  };

  // ── reject ───────────────────────────────────────────────────────────────

  const openReject = (reg) => { setRejectReg(reg); setRejectReason(''); };

  const doReject = async () => {
    setRejecting(true);
    try {
      await axios.post(`/api/ecommerce/registrations/${rejectReg.id}/reject`, {
        reason: rejectReason || undefined,
      });
      showToast(`"${rejectReg.business_name}" rejected.`, 'warning');
      setRejectReg(null);
      fetchRows(page);
      fetchCounts();
    } catch (e) {
      showToast(e.response?.data?.message || 'Rejection failed.', 'danger');
    } finally {
      setRejecting(false);
    }
  };

  // ── delete ───────────────────────────────────────────────────────────────

  const doDelete = async () => {
    try {
      await axios.delete(`/api/ecommerce/registrations/${deleteReg.id}`);
      showToast('Registration deleted.');
      setDeleteReg(null);
      fetchRows(page);
      fetchCounts();
    } catch {
      showToast('Delete failed.', 'danger');
    }
  };

  // ── TanStack columns ──────────────────────────────────────────────────────

  const columns = [
    columnHelper.accessor('business_name', {
      header: 'Business',
      cell: ({ row }) => {
        const reg = row.original;
        return (
          <div>
            <div className="fw-semibold">{reg.business_name}</div>
            {reg.website_url && (
              <a href={reg.website_url} target="_blank" rel="noreferrer"
                 className="small text-muted text-decoration-none">
                <Icon icon="link" className="me-1" style={{ fontSize: 11 }} />
                {reg.website_url.replace(/^https?:\/\//, '').slice(0, 30)}
              </a>
            )}
          </div>
        );
      },
    }),

    columnHelper.accessor('contact_name', {
      header: 'Contact',
      enableSorting: false,
      cell: ({ row }) => {
        const reg = row.original;
        return (
          <>
            <div className="small fw-semibold">{reg.contact_name}</div>
            <div className="small text-muted">{reg.contact_email}</div>
            {reg.contact_phone && <div className="small text-muted">{reg.contact_phone}</div>}
          </>
        );
      },
    }),

    columnHelper.accessor(row => [row.city, row.state].filter(Boolean).join(', '), {
      id: 'location',
      header: 'Location',
      enableSorting: false,
      cell: ({ getValue }) => <small className="text-muted">{getValue() || '—'}</small>,
    }),

    columnHelper.accessor('target_source', {
      header: 'Platform',
      enableSorting: false,
      cell: ({ getValue }) => <SourceBadge source={getValue() || 'businesses'} />,
    }),

    columnHelper.accessor('created_at', {
      header: 'Submitted',
      cell: ({ getValue }) => (
        <small className="text-muted">
          {new Date(getValue()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
        </small>
      ),
    }),

    columnHelper.accessor('status', {
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    }),

    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const reg = row.original;
        return (
          <div className="d-flex gap-1">
            <Button size="sm" variant="outline-secondary" title="View Details"
                    onClick={() => openDetail(reg)}>
              <Icon icon="eye" size={14} />
            </Button>

            {reg.status === 'pending' && (
              <>
                <Button size="sm" variant="outline-success" title="Approve"
                        onClick={() => openApprove(reg)}>
                  <Icon icon="circle-check" size={14} />
                </Button>
                <Button size="sm" variant="outline-danger" title="Reject"
                        onClick={() => openReject(reg)}>
                  <Icon icon="circle-x" size={14} />
                </Button>
              </>
            )}

            {reg.status === 'approved' && reg.external_site_url && (
              <a href={reg.external_site_url} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline-primary" title="View on Site">
                  <Icon icon="external-link" size={14} />
                </Button>
              </a>
            )}

            <Button size="sm" variant="outline-danger" title="Delete"
                    onClick={() => setDeleteReg(reg)}>
              <Icon icon="trash" size={14} />
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  // pagination helpers
  const totalItems = pagMeta.total;
  const totalPages = pagMeta.last_page;
  const start      = totalItems === 0 ? 0 : (page - 1) * 15 + 1;
  const end        = Math.min(page * 15, totalItems);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <PageBreadcrumb title="Get Started Requests" subtitle="Ecommerce" />

      {/* Toast */}
      {toast && (
        <Alert variant={toast.type} dismissible onClose={() => setToast(null)}
               className="position-fixed top-0 end-0 m-3 shadow" style={{ zIndex: 9999, minWidth: 280 }}>
          {toast.msg}
        </Alert>
      )}

      {/* Stats */}
      <Row className="g-3 mb-3">
        <Col sm={4}>
          <StatCard icon="hourglass" label="Pending Review" value={counts.pending} color="warning" />
        </Col>
        <Col sm={4}>
          <StatCard icon="circle-check" label="Approved" value={counts.approved} color="success" />
        </Col>
        <Col sm={4}>
          <StatCard icon="circle-x" label="Rejected" value={counts.rejected} color="danger" />
        </Col>
      </Row>

      {/* Main Card */}
      <Card>
        <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          {/* Status Tabs */}
          <div className="d-flex gap-1">
            {TABS.map(t => (
              <button key={t}
                type="button"
                onClick={() => { setTab(t); setPage(1); }}
                className={`btn btn-sm px-3 pb-2 rounded-0 border-0 border-bottom border-2 text-capitalize
                  ${tab === t
                    ? 'border-primary text-primary fw-semibold'
                    : 'border-transparent text-muted'}`}
              >
                {t}
                {t === 'pending' && counts.pending > 0 && (
                  <Badge bg="warning" text="dark" pill className="ms-1" style={{ fontSize: 10 }}>
                    {counts.pending}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          <small className="text-muted">{totalItems} total</small>
        </CardHeader>

        <CardBody className="p-0">
          {loading
            ? <div className="text-center py-5"><Spinner animation="border" /></div>
            : <DataTable table={table} emptyMessage={`No ${tab} registrations.`} />
          }
        </CardBody>

        {totalPages > 1 && (
          <CardFooter className="border-0">
            <TablePagination
              totalItems={totalItems}
              start={start}
              end={end}
              itemsName="registrations"
              showInfo
              previousPage={() => setPage(p => p - 1)}
              canPreviousPage={page > 1}
              pageCount={totalPages}
              pageIndex={page - 1}
              setPageIndex={idx => setPage(idx + 1)}
              nextPage={() => setPage(p => p + 1)}
              canNextPage={page < totalPages}
            />
          </CardFooter>
        )}
      </Card>

      {/* ── Detail Modal ──────────────────────────────────────────────────── */}
      <Modal show={!!detail || detailLoading} onHide={() => setDetail(null)} size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            {detailLoading ? 'Loading…' : detail?.business_name}
            {detail && <StatusBadge status={detail.status} />}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailLoading && <div className="text-center py-4"><Spinner /></div>}
          {detail && (
            <Row className="g-3">

              {/* Basic */}
              <Col md={6}>
                <Card className="h-100 border">
                  <CardHeader className="py-2 fw-semibold small text-uppercase text-muted">Basic Info</CardHeader>
                  <CardBody className="small">
                    <div className="d-flex gap-2 mb-2">
                      <span className="text-muted" style={{ minWidth: 72 }}>Platform:</span>
                      <SourceBadge source={detail.target_source || 'businesses'} />
                    </div>
                    {[
                      ['Address', detail.address],
                      ['Address 2', detail.address_2],
                      ['City', detail.city],
                      ['State', detail.state],
                      ['Zip', detail.zip],
                      ['Country', detail.country],
                    ].map(([k, v]) => v ? (
                      <div key={k} className="d-flex gap-2 mb-1">
                        <span className="text-muted" style={{ minWidth: 72 }}>{k}:</span>
                        <span>{v}</span>
                      </div>
                    ) : null)}
                  </CardBody>
                </Card>
              </Col>

              {/* Contact */}
              <Col md={6}>
                <Card className="h-100 border">
                  <CardHeader className="py-2 fw-semibold small text-uppercase text-muted">Contact</CardHeader>
                  <CardBody className="small">
                    {[
                      ['Name', detail.contact_name],
                      ['Email', detail.contact_email],
                      ['Phone', detail.contact_phone],
                      ['Website', detail.website_url],
                      ['Menu URL', detail.menu_url],
                    ].map(([k, v]) => v ? (
                      <div key={k} className="d-flex gap-2 mb-1">
                        <span className="text-muted" style={{ minWidth: 72 }}>{k}:</span>
                        {k.includes('URL') || k === 'Website'
                          ? <a href={v} target="_blank" rel="noreferrer" className="text-truncate">{v}</a>
                          : <span>{v}</span>}
                      </div>
                    ) : null)}
                  </CardBody>
                </Card>
              </Col>

              {/* Hours */}
              <Col md={6}>
                <Card className="h-100 border">
                  <CardHeader className="py-2 fw-semibold small text-uppercase text-muted">Business Hours</CardHeader>
                  <CardBody className="p-0">
                    <table className="table table-sm table-bordered mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="small">Day</th>
                          <th className="small">Open</th>
                          <th className="small">Close</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS.map(d => (
                          <tr key={d}>
                            <td className="small text-muted">{DAY_SHORT[d]}</td>
                            <td className="small">{detail[`${d}_open`]  || '—'}</td>
                            <td className="small">{detail[`${d}_close`] || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardBody>
                </Card>
              </Col>

              {/* Bio & Media */}
              <Col md={6}>
                <Card className="h-100 border">
                  <CardHeader className="py-2 fw-semibold small text-uppercase text-muted">Bio & Media</CardHeader>
                  <CardBody>
                    {detail.bio && <p className="small mb-3 text-muted">{detail.bio}</p>}
                    {detail.image_url && (
                      <div className="mb-2">
                        <div className="text-muted small mb-1">Image / Video</div>
                        <img src={detail.image_url} alt="business"
                             className="img-fluid rounded border" style={{ maxHeight: 110 }} />
                      </div>
                    )}
                    {detail.audio_url && (
                      <div>
                        <div className="text-muted small mb-1">Audio</div>
                        <audio controls src={detail.audio_url} className="w-100" />
                      </div>
                    )}
                    {!detail.bio && !detail.image_url && !detail.audio_url && (
                      <span className="text-muted small">No media uploaded.</span>
                    )}
                  </CardBody>
                </Card>
              </Col>

              {/* Agreement */}
              <Col md={12}>
                <Card className="border">
                  <CardHeader className="py-2 fw-semibold small text-uppercase text-muted">Agreement & Signature</CardHeader>
                  <CardBody className="d-flex align-items-center gap-4 flex-wrap">
                    <Badge bg={detail.agreement_accepted ? 'success' : 'danger'}>
                      {detail.agreement_accepted ? '✓ Agreed' : '✗ Not Agreed'}
                    </Badge>
                    <div className="small">
                      <span className="text-muted me-1">Signed as:</span>
                      <strong>{detail.signature_name || '—'}</strong>
                    </div>
                    {detail.signature_data && (
                      <img src={detail.signature_data} alt="signature"
                           className="border rounded bg-white" style={{ maxHeight: 56 }} />
                    )}
                  </CardBody>
                </Card>
              </Col>

              {/* Approved / Rejected info */}
              {detail.status === 'approved' && (
                <Col md={12}>
                  <Card className="border-success border">
                    <CardBody className="d-flex align-items-center gap-3 flex-wrap py-2">
                      <Badge bg="success">Approved</Badge>
                      {detail.business_id && (
                        <span className="small text-muted">Business ID: <strong>{detail.business_id}</strong></span>
                      )}
                      {detail.external_site_url && (
                        <a href={detail.external_site_url} target="_blank" rel="noreferrer"
                           className="btn btn-sm btn-outline-primary">
                          <Icon icon="external-link" size={13} className="me-1" />
                          View on Site
                        </a>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              )}

              {detail.status === 'rejected' && (
                <Col md={12}>
                  <Card className="border-danger border">
                    <CardBody className="py-2">
                      <Badge bg="danger" className="mb-2">Rejected</Badge>
                      {detail.rejection_reason && (
                        <p className="mb-0 small text-muted">{detail.rejection_reason}</p>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              )}
            </Row>
          )}
        </Modal.Body>

        {detail?.status === 'pending' && (
          <Modal.Footer>
            <Button variant="success" onClick={() => { setDetail(null); openApprove(detail); }}>
              <Icon icon="circle-check" size={15} className="me-1" />Approve
            </Button>
            <Button variant="danger" onClick={() => { setDetail(null); openReject(detail); }}>
              <Icon icon="circle-x" size={15} className="me-1" />Reject
            </Button>
          </Modal.Footer>
        )}
      </Modal>

      {/* ── Approve Modal ─────────────────────────────────────────────────── */}
      <Modal show={!!approveReg} onHide={() => setApproveReg(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Approve Registration</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            Approve <strong>{approveReg?.business_name}</strong>?
            This will create a live Business record immediately.
          </p>
          <div className="mb-3 d-flex align-items-center gap-2">
            <small className="text-muted">Target Platform:</small>
            <SourceBadge source={approveReg?.target_source || 'businesses'} />
          </div>
          <Form.Group>
            <FormLabel className="small fw-semibold">
              External Site URL <span className="text-muted fw-normal">(optional)</span>
            </FormLabel>
            <FormControl
              type="url"
              placeholder="https://muzzhub.com/restaurant/my-halal-restaurant"
              value={extUrl}
              onChange={e => setExtUrl(e.target.value)}
            />
            <Form.Text className="text-muted">
              The URL on your external site where this business will be listed.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setApproveReg(null)}>Cancel</Button>
          <Button variant="success" disabled={approving} onClick={doApprove}>
            {approving ? <Spinner size="sm" className="me-1" /> : <Icon icon="circle-check" size={15} className="me-1" />}
            Approve & Create Business
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Reject Modal ──────────────────────────────────────────────────── */}
      <Modal show={!!rejectReg} onHide={() => setRejectReg(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reject Registration</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            Reject registration from <strong>{rejectReg?.business_name}</strong>?
          </p>
          <Form.Group>
            <FormLabel className="small fw-semibold">
              Reason <span className="text-muted fw-normal">(optional)</span>
            </FormLabel>
            <FormControl
              as="textarea" rows={3}
              placeholder="e.g. Incomplete information, duplicate entry…"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setRejectReg(null)}>Cancel</Button>
          <Button variant="danger" disabled={rejecting} onClick={doReject}>
            {rejecting ? <Spinner size="sm" className="me-1" /> : <Icon icon="circle-x" size={15} className="me-1" />}
            Reject
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      <DeleteConfirmationModal
        show={!!deleteReg}
        onHide={() => setDeleteReg(null)}
        onConfirm={doDelete}
        itemName="registration"
        modalTitle="Delete Registration"
      >
        Delete registration from <strong>{deleteReg?.business_name}</strong>? This cannot be undone.
      </DeleteConfirmationModal>
    </>
  );
}
