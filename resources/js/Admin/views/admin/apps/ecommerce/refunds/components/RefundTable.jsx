import DataTable from '@admin/components/table/DataTable';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
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
  Button,
  Card,
  CardFooter,
  CardHeader,
  Dropdown,
  DropdownDivider,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  FormControl,
  FormSelect,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from 'react-bootstrap';
import { useToggle } from 'usehooks-ts';
import CreateRefundModal from './CreateRefundModal';

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? '';

// Status badge colors
const STATUS_BADGE = {
  pending:  { bg: '#fff3cd', color: '#856404', label: 'Pending'  },
  approved: { bg: '#d1e7dd', color: '#0a3622', label: 'Approved' },
  rejected: { bg: '#f8d7da', color: '#842029', label: 'Rejected' },
  refunded: { bg: '#e2e3e5', color: '#41464b', label: 'Refunded' },
};

const ISSUE_LABELS = {
  wrong_item:   'Wrong item received',
  missing_item: 'Missing item',
  damaged:      'Damaged on arrival',
  late:         'Arrived too late',
  quality:      'Quality issue',
  other:        'Other',
};

const PAYMENT_LABEL = {
  stripe_card: 'Stripe Card',
  cod:         'Cash on Delivery',
  square:      'Square',
  clover:      'Clover',
  toast:       'Toast',
  paypal:      'PayPal',
};

// Initials avatar
const Avatar = ({ name, size = 34 }) => {
  const initials = (name || '?')
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const COLORS = ['#4f6ef7', '#0acf97', '#fa5c7c', '#ffbc00', '#39afd1', '#7b5ea7'];
  const bg = COLORS[initials.charCodeAt(0) % COLORS.length];
  return (
    <div
      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-semibold text-white"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const s = STATUS_BADGE[status] ?? { bg: '#e2e3e5', color: '#41464b', label: toPascalCase(status) };
  return (
    <span
      className="badge fw-semibold"
      style={{
        background: s.bg,
        color: s.color,
        fontSize: '0.72rem',
        padding: '4px 10px',
        borderRadius: 6,
      }}
    >
      {s.label}
    </span>
  );
};

const columnHelper = createColumnHelper();

const RefundTable = ({ onRefundProcessed }) => {
  const [data,         setData]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [totalRows,    setTotalRows]    = useState(0);
  const [pageIndex,    setPageIndex]    = useState(0);
  const [pageSize,     setPageSize]     = useState(8);
  const [statusFilter, setStatusFilter] = useState('');
  const [search,       setSearch]       = useState('');
  const [toast,        setToast]        = useState(null);

  const [showCreateModal, toggleCreateModal] = useToggle();

  const [actionModal,     setActionModal]     = useState(null);
  const [actionNote,      setActionNote]      = useState('');
  const [actionAmt,       setActionAmt]       = useState('');
  const [refundType,      setRefundType]      = useState('full');
  const [selectedItems,   setSelectedItems]   = useState([]);  // item IDs for 'items' type
  const [orderDetail,     setOrderDetail]     = useState(null); // full order with items
  const [processing,      setProcessing]      = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRowIds,  setSelectedRowIds]  = useState({});

  const showToast = (msg, variant = 'success') => {
    setToast({ msg, variant });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: pageIndex + 1, per_page: pageSize });
      if (statusFilter) p.set('status', statusFilter);
      if (search)       p.set('search', search);
      const res  = await fetch(`/api/admin/refunds?${p}`, { headers: { Accept: 'application/json' } });
      const json = await res.json();
      setData(json.data ?? []);
      setTotalRows(json.meta?.total ?? 0);
    } catch {
      showToast('Failed to load refunds.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  // Load full order detail (with items) when approve modal opens
  const loadOrderDetail = async (refundId) => {
    try {
      const res  = await fetch(`/api/admin/refunds/${refundId}`, { headers: { Accept: 'application/json' } });
      const json = await res.json();
      setOrderDetail(json);
    } catch { setOrderDetail(null); }
  };

  // Compute refund amount based on selected type
  const computeAmount = (type, ord, items) => {
    if (!ord) return 0;
    const o = ord.order ?? ord;
    switch (type) {
      case 'full':         return parseFloat(o.total        ?? 0);
      case 'platform_fee': return parseFloat(o.platform_fee ?? 0);
      case 'tip':          return parseFloat(o.tip          ?? 0);
      case 'subtotal':     return parseFloat(o.subtotal     ?? 0);
      case 'partial':      return parseFloat(actionAmt      || 0);
      case 'items':
        return (o.items ?? [])
          .filter(it => items.includes(it.id))
          .reduce((sum, it) => sum + parseFloat(it.subtotal ?? 0), 0);
      default: return parseFloat(o.total ?? 0);
    }
  };

  const doApprove = async () => {
    setProcessing(true);
    try {
      const body = { process_stripe: true, refund_type: refundType };
      if (actionNote.trim())           body.admin_note = actionNote;
      if (refundType === 'partial')    body.amount     = parseFloat(actionAmt);
      if (refundType === 'items')      body.refund_item_ids = selectedItems;
      const res  = await fetch(`/api/admin/refunds/${actionModal.refund.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      showToast(json.message);
      setActionModal(null);
      load(); onRefundProcessed?.();
    } catch (e) { showToast(e.message || 'Failed.', 'danger'); }
    finally { setProcessing(false); }
  };

  const doReject = async () => {
    if (!actionNote.trim()) { showToast('Rejection reason is required.', 'danger'); return; }
    setProcessing(true);
    try {
      const res  = await fetch(`/api/admin/refunds/${actionModal.refund.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({ admin_note: actionNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      showToast(json.message);
      setActionModal(null);
      load(); onRefundProcessed?.();
    } catch (e) { showToast(e.message || 'Failed.', 'danger'); }
    finally { setProcessing(false); }
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  // ── Table columns ────────────────────────────────────────────────────────

  const columns = [
    // Checkbox
    {
      id: 'select', maxSize: 40, size: 40,
      header: ({ table }) => (
        <input type="checkbox" className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />
      ),
      cell: ({ row }) => (
        <input type="checkbox" className="form-check-input form-check-input-light fs-14"
          checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
      ),
      enableSorting: false, enableColumnFilter: false,
    },

    // ORDER ID
    columnHelper.accessor(r => r.order?.order_number ?? '—', {
      id: 'orderId', header: 'Order Id',
      cell: ({ row }) => (
        <span className="fw-semibold" style={{ color: '#4f6ef7' }}>
          {row.original.order?.order_number ?? '—'}
        </span>
      ),
    }),

    // PRODUCT — Issue type as product-like block
    {
      id: 'product', header: 'Product',
      enableSorting: false, enableColumnFilter: false,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 34, height: 34, background: '#f3f4f6' }}
            >
              <Icon icon="credit-card-refund" style={{ color: '#4f6ef7', fontSize: 18 }} />
            </div>
            <div>
              <div className="fw-medium" style={{ fontSize: '0.875rem' }}>
                {ISSUE_LABELS[r.issue_type] ?? r.issue_type}
              </div>
              <small className="text-muted">
                {r.reason?.slice(0, 40)}{r.reason?.length > 40 ? '…' : ''}
              </small>
            </div>
          </div>
        );
      },
    },

    // CUSTOMER
    columnHelper.accessor(r => r.order?.customer_name ?? '—', {
      id: 'customer', header: 'Customer', enableColumnFilter: false,
      cell: ({ row }) => {
        const o = row.original.order;
        return (
          <div className="d-flex align-items-center gap-2">
            <Avatar name={o?.customer_name} />
            <div>
              <div className="fw-semibold text-nowrap" style={{ fontSize: '0.875rem' }}>
                {o?.customer_name ?? '—'}
              </div>
              <small className="text-muted">{o?.customer_email ?? ''}</small>
            </div>
          </div>
        );
      },
    }),

    // REASON
    columnHelper.accessor('reason', {
      header: 'Reason', enableColumnFilter: false,
      cell: ({ row }) => (
        <span className="text-muted" style={{ fontSize: '0.8rem', maxWidth: 160, display: 'block' }}>
          {row.original.reason?.slice(0, 55)}{row.original.reason?.length > 55 ? '…' : ''}
        </span>
      ),
    }),

    // PAYMENT
    columnHelper.accessor(r => r.order?.payment_method ?? '', {
      id: 'payment', header: 'Payment', enableColumnFilter: false,
      cell: ({ row }) => {
        const m = row.original.order?.payment_method;
        return (
          <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.85rem' }}>
            <Icon icon={m?.includes('card') || m?.includes('stripe') ? 'credit-card' : 'cash'}
              className="text-muted" style={{ fontSize: 16 }} />
            <span>{PAYMENT_LABEL[m] ?? (m ? m.replace(/_/g, ' ') : '—')}</span>
          </div>
        );
      },
    }),

    // AMOUNT
    columnHelper.accessor('amount', {
      header: 'Amount',
      cell: ({ row }) => (
        <span className="fw-semibold">${parseFloat(row.original.amount).toFixed(2)}</span>
      ),
    }),

    // STATUS
    columnHelper.accessor('status', {
      header: 'Status', filterFn: 'equalsString',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    }),

    // REQUESTED
    columnHelper.accessor('created_at', {
      header: 'Requested', enableColumnFilter: false,
      cell: ({ row }) => (
        <span style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
          {fmtDate(row.original.created_at)}
        </span>
      ),
    }),

    // PROCESSED
    columnHelper.accessor('processed_at', {
      header: 'Processed', enableColumnFilter: false,
      cell: ({ row }) => (
        <span style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', color: row.original.processed_at ? undefined : '#adb5bd' }}>
          {row.original.processed_at ? fmtDate(row.original.processed_at) : '—'}
        </span>
      ),
    }),

    // ACTIONS
    {
      header: 'Actions', enableSorting: false, enableColumnFilter: false,
      cell: ({ row }) => {
        const r = row.original;
        const ok = r.status === 'pending';
        return (
          <div className="d-flex gap-1 align-items-center">
            <button
              className="btn btn-icon btn-sm btn-default"
              title="Approve" disabled={!ok}
              style={{ opacity: ok ? 1 : 0.3 }}
              onClick={() => {
                if (!ok) return;
                setActionNote(''); setActionAmt(r.amount);
                setRefundType('full'); setSelectedItems([]); setOrderDetail(null);
                setActionModal({ type: 'approve', refund: r });
                loadOrderDetail(r.id);
              }}
            ><Icon icon="check" className="fs-lg" /></button>

            <button
              className="btn btn-icon btn-sm btn-default"
              title="Reject" disabled={!ok}
              style={{ opacity: ok ? 1 : 0.3 }}
              onClick={() => { if (!ok) return; setActionNote(''); setActionModal({ type: 'reject', refund: r }); }}
            ><Icon icon="x" className="fs-lg" /></button>

            <button
              className="btn btn-icon btn-sm btn-default"
              title="Delete"
              onClick={() => { setSelectedRowIds({ [row.id]: true }); setShowDeleteModal(true); }}
            ><Icon icon="trash" className="fs-lg" /></button>

            <Dropdown>
              <DropdownToggle variant="default" size="sm" className="btn-icon dropdown-toggle drop-arrow-none">
                <Icon icon="dots-vertical" className="fs-lg" />
              </DropdownToggle>
              <DropdownMenu align="end">
                <DropdownItem onClick={() => setActionModal({ type: 'detail', refund: r })}>
                  View order
                </DropdownItem>
                <DropdownItem>Contact customer</DropdownItem>
                <li><DropdownDivider /></li>
                {r.status === 'approved' && r.order?.stripe_payment_intent_id && (
                  <DropdownItem onClick={async () => {
                    const res = await fetch(`/api/admin/refunds/${r.id}/process-stripe`, {
                      method: 'POST', headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
                    });
                    const j = await res.json();
                    showToast(j.message, res.ok ? 'success' : 'danger');
                    if (res.ok) { load(); onRefundProcessed?.(); }
                  }}>Process via Stripe</DropdownItem>
                )}
                <DropdownItem>Add note</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data, columns,
    manualPagination: true,
    pageCount: Math.ceil(totalRows / pageSize),
    state: { pagination: { pageIndex, pageSize }, rowSelection: selectedRowIds },
    onPaginationChange: u => {
      const n = typeof u === 'function' ? u({ pageIndex, pageSize }) : u;
      setPageIndex(n.pageIndex); setPageSize(n.pageSize);
    },
    onRowSelectionChange: setSelectedRowIds,
    getCoreRowModel:       getCoreRowModel(),
    getSortedRowModel:     getSortedRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
  });

  const start = pageIndex * pageSize + 1;
  const end   = Math.min(start + data.length - 1, totalRows);

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`alert alert-${toast.variant} py-2 px-3 position-fixed bottom-0 end-0 m-3 shadow`}
          style={{ zIndex: 9999, minWidth: 300 }}
        >{toast.msg}</div>
      )}

      <Card>
        {/* ── Header ── */}
        <CardHeader className="border-light justify-content-between flex-wrap gap-2">
          {/* Left: search + bulk delete */}
          <div className="d-flex gap-2">
            <div className="app-search">
              <FormControl
                value={search}
                onChange={e => { setSearch(e.target.value); setPageIndex(0); }}
                type="search"
                placeholder="Search refunds..."
              />
              <Icon icon="search" className="app-search-icon text-muted" />
            </div>
            {Object.keys(selectedRowIds).length > 0 && (
              <Button variant="danger" onClick={() => setShowDeleteModal(true)}>Delete</Button>
            )}
          </div>

          {/* Center: filter + page size */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="fw-semibold me-1">Filter By:</span>
            <div className="app-search">
              <FormSelect
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPageIndex(0); }}
                className="form-control my-1 my-md-0"
              >
                <option value="">Refund Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="refunded">Refunded</option>
              </FormSelect>
              <Icon icon="credit-card-refund" className="app-search-icon text-muted" />
            </div>
            <FormSelect
              value={pageSize}
              className="form-control my-1 my-md-0"
              style={{ maxWidth: 80 }}
              onChange={e => { setPageSize(Number(e.target.value)); setPageIndex(0); }}
            >
              {[5, 8, 10, 15, 20].map(s => <option key={s} value={s}>{s}</option>)}
            </FormSelect>
          </div>

          {/* Right: create button */}
          <div>
            <Button variant="primary" onClick={toggleCreateModal}>
              <Icon icon="plus" className="fs-sm me-1" /> Create Refund
            </Button>
          </div>
        </CardHeader>

        {/* ── Table body ── */}
        {loading ? (
          <div className="p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="d-flex gap-3 align-items-center py-3 border-bottom placeholder-glow">
                <span className="placeholder rounded" style={{ width: 20, height: 20 }} />
                <span className="placeholder rounded col-1" style={{ height: 16 }} />
                <span className="placeholder rounded col-2" style={{ height: 32 }} />
                <span className="placeholder rounded col-2" style={{ height: 32 }} />
                <span className="placeholder rounded col-1" style={{ height: 16 }} />
                <span className="placeholder rounded col-1" style={{ height: 16 }} />
                <span className="placeholder rounded col-1" style={{ height: 16 }} />
                <span className="placeholder rounded col-1" style={{ height: 24 }} />
                <span className="placeholder rounded col-1" style={{ height: 16 }} />
                <span className="placeholder rounded col-1" style={{ height: 16 }} />
              </div>
            ))}
          </div>
        ) : (
          <DataTable table={table} emptyMessage="No records found" />
        )}

        {/* ── Pagination ── */}
        {!loading && data.length > 0 && (
          <CardFooter className="border-0">
            <TablePagination
              totalItems={totalRows} start={start} end={end}
              itemsName="refunds" showInfo
              previousPage={() => setPageIndex(i => Math.max(0, i - 1))}
              canPreviousPage={pageIndex > 0}
              pageCount={Math.ceil(totalRows / pageSize)}
              pageIndex={pageIndex} setPageIndex={setPageIndex}
              nextPage={() => setPageIndex(i => i + 1)}
              canNextPage={(pageIndex + 1) * pageSize < totalRows}
            />
          </CardFooter>
        )}
      </Card>

      {/* ── Create Refund ── */}
      <CreateRefundModal
        show={showCreateModal}
        onHide={toggleCreateModal}
        onCreated={() => { load(); onRefundProcessed?.(); }}
      />

      {/* ── Approve Modal ── */}
      <Modal show={actionModal?.type === 'approve'} onHide={() => setActionModal(null)} centered size="lg">
        <ModalHeader closeButton>
          <ModalTitle className="fs-5 fw-semibold">
            <Icon icon="check" className="me-2 text-success" />Approve Refund
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          {/* Order summary */}
          {(() => {
            const r   = actionModal?.refund;
            const ord = orderDetail?.order ?? r?.order;
            const computedAmt = computeAmount(refundType, ord, selectedItems);
            const TYPES = [
              { key: 'full',         label: 'Full Refund',        desc: ord ? `$${parseFloat(ord.total ?? 0).toFixed(2)}` : '' },
              { key: 'subtotal',     label: 'Subtotal Only',      desc: ord ? `$${parseFloat(ord.subtotal ?? 0).toFixed(2)} (no fees)` : '' },
              { key: 'platform_fee', label: 'Platform Fee',       desc: ord ? `$${parseFloat(ord.platform_fee ?? 0).toFixed(2)}` : '' },
              { key: 'tip',          label: 'Tip Only',           desc: ord ? `$${parseFloat(ord.tip ?? 0).toFixed(2)}` : '' },
              { key: 'items',        label: 'Specific Items',     desc: 'Select items below' },
              { key: 'partial',      label: 'Custom Amount',      desc: 'Enter amount manually' },
            ];
            return (
              <>
                <div className="bg-light rounded p-3 mb-3 row g-2" style={{ fontSize: '0.85rem' }}>
                  <div className="col-6"><span className="text-muted">Order:</span> <strong>{r?.order?.order_number}</strong></div>
                  <div className="col-6"><span className="text-muted">Customer:</span> <strong>{r?.order?.customer_name ?? '—'}</strong></div>
                  <div className="col-4"><span className="text-muted">Total:</span> <strong>${parseFloat(ord?.total ?? 0).toFixed(2)}</strong></div>
                  <div className="col-4"><span className="text-muted">Platform Fee:</span> <strong>${parseFloat(ord?.platform_fee ?? 0).toFixed(2)}</strong></div>
                  <div className="col-4"><span className="text-muted">Tip:</span> <strong>${parseFloat(ord?.tip ?? 0).toFixed(2)}</strong></div>
                </div>

                {r?.order?.stripe_payment_intent_id && (
                  <div className="alert alert-info py-2 fs-sm mb-3">
                    <Icon icon="credit-card" className="me-1" />
                    Stripe payment found — refund will be processed automatically.
                  </div>
                )}

                {/* Refund Type Selector */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Refund Type</label>
                  <div className="row g-2">
                    {TYPES.map(t => (
                      <div key={t.key} className="col-6 col-md-4">
                        <div
                          className="border rounded p-2 cursor-pointer"
                          style={{
                            cursor: 'pointer',
                            background: refundType === t.key ? '#e8f4fd' : '#fff',
                            borderColor: refundType === t.key ? '#4f6ef7' : '#dee2e6',
                            borderWidth: 2,
                          }}
                          onClick={() => {
                            setRefundType(t.key);
                            setSelectedItems([]);
                          }}
                        >
                          <div className="d-flex align-items-center gap-2">
                            <input type="radio" readOnly checked={refundType === t.key}
                              className="flex-shrink-0" style={{ accentColor: '#4f6ef7' }} />
                            <div>
                              <div className="fw-semibold" style={{ fontSize: '0.8rem' }}>{t.label}</div>
                              <div className="text-muted" style={{ fontSize: '0.72rem' }}>{t.desc}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Items checklist */}
                {refundType === 'items' && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Select Items to Refund</label>
                    {!orderDetail ? (
                      <div className="text-muted fs-sm"><span className="spinner-border spinner-border-sm me-1" />Loading items…</div>
                    ) : (
                      <div className="border rounded" style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {(orderDetail?.order?.items ?? []).map(item => {
                          const checked = selectedItems.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              className="d-flex align-items-center gap-2 px-3 py-2 border-bottom"
                              style={{ cursor: 'pointer', background: checked ? '#f0f7ff' : undefined }}
                            >
                              <input
                                type="checkbox" checked={checked}
                                className="form-check-input"
                                onChange={() => setSelectedItems(prev =>
                                  checked ? prev.filter(id => id !== item.id) : [...prev, item.id]
                                )}
                              />
                              <div className="flex-grow-1">
                                <span className="fw-medium" style={{ fontSize: '0.85rem' }}>{item.name}</span>
                                {item.quantity > 1 && <span className="text-muted ms-1 fs-xs">×{item.quantity}</span>}
                              </div>
                              <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>
                                ${parseFloat(item.subtotal).toFixed(2)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Partial amount input */}
                {refundType === 'partial' && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Custom Amount ($)</label>
                    <input type="number" className="form-control" min="0.01" step="0.01"
                      style={{ maxWidth: 200 }}
                      value={actionAmt} onChange={e => setActionAmt(e.target.value)}
                      placeholder="0.00" />
                    <small className="text-muted">Max: ${parseFloat(ord?.total ?? 0).toFixed(2)}</small>
                  </div>
                )}

                {/* Computed total */}
                <div className="d-flex align-items-center gap-2 mb-3 p-2 rounded"
                  style={{ background: '#f0f7ff', border: '1px solid #cfe2ff' }}>
                  <Icon icon="credit-card-refund" className="text-primary" />
                  <span className="fw-semibold">Refund Amount:</span>
                  <span className="fw-bold fs-5 text-primary">${computedAmt.toFixed(2)}</span>
                </div>

                {/* Admin Note */}
                <div>
                  <label className="form-label fw-semibold">Admin Note <span className="text-muted fw-normal">(optional)</span></label>
                  <textarea className="form-control" rows={2} value={actionNote}
                    onChange={e => setActionNote(e.target.value)} placeholder="Internal note…" />
                </div>
              </>
            );
          })()}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onClick={() => setActionModal(null)}>Cancel</Button>
          <Button variant="success" onClick={doApprove} disabled={processing}>
            {processing
              ? <><span className="spinner-border spinner-border-sm me-1" />Processing…</>
              : <><Icon icon="check" className="me-1" />Approve & Refund</>}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Reject Modal ── */}
      <Modal show={actionModal?.type === 'reject'} onHide={() => setActionModal(null)} centered>
        <ModalHeader closeButton>
          <ModalTitle className="fs-5 fw-semibold">
            <Icon icon="x" className="me-2 text-danger" />Reject Refund
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="bg-light rounded p-3 mb-3 fs-sm">
            <strong>Order:</strong> {actionModal?.refund?.order?.order_number}
          </div>
          <div>
            <label className="form-label fw-semibold">
              Rejection Reason <span className="text-danger">*</span>
            </label>
            <textarea className="form-control" rows={3} value={actionNote}
              onChange={e => setActionNote(e.target.value)}
              placeholder="Explain why this refund is being rejected…" />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onClick={() => setActionModal(null)}>Cancel</Button>
          <Button variant="danger" onClick={doReject} disabled={processing}>
            {processing
              ? <><span className="spinner-border spinner-border-sm me-1" />Rejecting…</>
              : <><Icon icon="x" className="me-1" />Reject</>}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Detail Modal ── */}
      <Modal show={actionModal?.type === 'detail'} onHide={() => setActionModal(null)} centered size="lg">
        <ModalHeader closeButton>
          <ModalTitle className="fs-5 fw-semibold">
            Refund — {actionModal?.refund?.order?.order_number}
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          {actionModal?.refund && (() => {
            const r = actionModal.refund;
            return (
              <div className="row g-3">
                <div className="col-sm-6">
                  <small className="text-muted text-uppercase fw-semibold d-block mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Issue Type</small>
                  <span>{ISSUE_LABELS[r.issue_type] ?? r.issue_type}</span>
                </div>
                <div className="col-sm-6">
                  <small className="text-muted text-uppercase fw-semibold d-block mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Refund Amount</small>
                  <span className="fw-bold fs-5">${parseFloat(r.amount).toFixed(2)}</span>
                </div>
                <div className="col-sm-6">
                  <small className="text-muted text-uppercase fw-semibold d-block mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Status</small>
                  <StatusBadge status={r.status} />
                </div>
                <div className="col-sm-6">
                  <small className="text-muted text-uppercase fw-semibold d-block mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Payment Method</small>
                  <span>{PAYMENT_LABEL[r.order?.payment_method] ?? (r.order?.payment_method?.replace(/_/g, ' ') ?? '—')}</span>
                </div>
                <div className="col-12">
                  <small className="text-muted text-uppercase fw-semibold d-block mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Customer Reason</small>
                  <p className="mb-0 bg-light rounded p-3 fs-sm">{r.reason}</p>
                </div>
                {r.admin_note && (
                  <div className="col-12">
                    <small className="text-muted text-uppercase fw-semibold d-block mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Admin Note</small>
                    <p className="mb-0 text-muted fst-italic">{r.admin_note}</p>
                  </div>
                )}
                {r.stripe_refund_id && (
                  <div className="col-12">
                    <small className="text-muted text-uppercase fw-semibold d-block mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Stripe Refund ID</small>
                    <code className="bg-light rounded px-2 py-1">{r.stripe_refund_id}</code>
                  </div>
                )}
              </div>
            );
          })()}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onClick={() => setActionModal(null)}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* ── Delete Confirm ── */}
      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={() => { setSelectedRowIds({}); setShowDeleteModal(false); }}
        selectedCount={Object.keys(selectedRowIds).length}
        itemName="refund"
      />
    </>
  );
};

export default RefundTable;
