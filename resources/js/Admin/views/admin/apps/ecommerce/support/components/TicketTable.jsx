import {
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Form, InputGroup, Modal, Spinner, Table } from 'react-bootstrap';

// ── helpers ───────────────────────────────────────────────────────────────────

const STATUS_BADGE   = { open: { bg: 'info', text: 'dark' }, in_progress: { bg: 'warning', text: 'dark' }, resolved: { bg: 'success', text: 'white' }, closed: { bg: 'secondary', text: 'white' } };
const STATUS_LABELS  = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };
const PRIORITY_BADGE = { low: { bg: 'secondary', text: 'white' }, medium: { bg: 'primary', text: 'white' }, high: { bg: 'warning', text: 'dark' }, urgent: { bg: 'danger', text: 'white' } };

const avatar = (name = '') => {
  const parts = String(name).trim().split(' ');
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

// ── TicketTable ───────────────────────────────────────────────────────────────

const TicketTable = ({ onTicketUpdated }) => {
  const [data,          setData]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [totalRows,     setTotalRows]     = useState(0);
  const [pageIndex,     setPageIndex]     = useState(0);
  const [pageSize,      setPageSize]      = useState(20);
  const [statusFilter,  setStatusFilter]  = useState('');
  const [priorityFilter,setPriorityFilter]= useState('');
  const [search,        setSearch]        = useState('');

  // active ticket (chat drawer)
  const [activeTicket,  setActiveTicket]  = useState(null);  // full ticket object
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [replyText,     setReplyText]     = useState('');
  const [replySending,  setReplySending]  = useState(false);
  const [resolveModal,  setResolveModal]  = useState(false);
  const [resolveNote,   setResolveNote]   = useState('');

  // Refund & Resolve state
  const [refundModal,     setRefundModal]     = useState(false);
  const [refundType,      setRefundType]      = useState('full');
  const [refundAmount,    setRefundAmount]    = useState('');
  const [refundNote,      setRefundNote]      = useState('');
  const [refundSending,   setRefundSending]   = useState(false);
  const [refundError,     setRefundError]     = useState(null);
  const [refundResult,    setRefundResult]    = useState(null); // last successful refund

  const chatEndRef = useRef(null);

  // ── load list ─────────────────────────────────────────────────────────────

  const loadData = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page:     pageIndex + 1,
      per_page: pageSize,
      ...(statusFilter   && { status:   statusFilter   }),
      ...(priorityFilter && { priority: priorityFilter }),
      ...(search         && { search                   }),
    });
    fetch(`/api/admin/support/tickets?${params}`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(res => {
        setData(res.data ?? []);
        setTotalRows(res.meta?.total ?? 0);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [pageIndex, pageSize, statusFilter, priorityFilter, search]);

  // ── Real-time: listen for new tickets from users ─────────────────────────────
  useEffect(() => {
    if (!window.Echo) return; // polling already covers new tickets via loadData interval
    const ch = window.Echo.channel('support.admin');
    ch.listen('.ticket.created', () => {
      // Refresh list so new ticket appears at top
      loadData();
      onTicketUpdated?.();
    });
    return () => window.Echo.leaveChannel('support.admin');
  }, []);

  // ── Real-time: WebSocket (Pusher/Reverb) OR polling fallback ────────────────
  // If window.Echo is available (Pusher configured) → use WebSocket.
  // Otherwise → poll every 4 seconds while chat is open (works on cPanel/shared hosting).

  const lastMsgIdRef = useRef(null);

  useEffect(() => {
    if (!activeTicket?.id) return;

    // ── WebSocket path ──
    if (window.Echo) {
      const ch = window.Echo.channel(`support.ticket.${activeTicket.id}`);
      ch.listen('.message.sent', (e) => {
        setActiveTicket(prev => {
          if (!prev) return prev;
          if ((prev.messages ?? []).some(m => m.id === e.message.id)) return prev;
          return { ...prev, status: e.status, unread_admin: e.unread_admin, messages: [...(prev.messages ?? []), e.message] };
        });
        setData(prev => prev.map(t => t.id === e.ticket_id ? { ...t, unread_admin: e.unread_admin, status: e.status } : t));
        onTicketUpdated?.();
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      });
      ch.listen('.ticket.updated', (e) => {
        setActiveTicket(prev => prev ? { ...prev, status: e.status, priority: e.priority } : prev);
        setData(prev => prev.map(t => t.id === e.ticket_id ? { ...t, status: e.status, priority: e.priority } : t));
      });
      return () => window.Echo.leaveChannel(`support.ticket.${activeTicket.id}`);
    }

    // ── Polling fallback (cPanel / shared hosting) ──
    const poll = async () => {
      try {
        const res  = await fetch(`/api/admin/support/tickets/${activeTicket.id}`, { headers: { Accept: 'application/json' } });
        const data = await res.json();
        if (!data?.messages) return;

        const latestId = data.messages[data.messages.length - 1]?.id ?? null;
        if (lastMsgIdRef.current !== null && latestId !== lastMsgIdRef.current) {
          // New messages arrived
          setActiveTicket(prev => prev ? {
            ...prev,
            status:       data.status,
            unread_admin: data.unread_admin,
            messages:     data.messages,
          } : prev);
          setData(prev => prev.map(t => t.id === data.id ? { ...t, unread_admin: data.unread_admin, status: data.status } : t));
          onTicketUpdated?.();
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
        lastMsgIdRef.current = latestId;
      } catch { /* silent */ }
    };

    // Set initial ref
    lastMsgIdRef.current = activeTicket.messages?.[(activeTicket.messages?.length ?? 0) - 1]?.id ?? null;

    const timer = setInterval(poll, 4000);
    return () => clearInterval(timer);
  }, [activeTicket?.id]);

  // ── open ticket chat ──────────────────────────────────────────────────────

  const openTicket = (id) => {
    setDrawerLoading(true);
    setActiveTicket({ id, messages: [], subject: '…' });
    fetch(`/api/admin/support/tickets/${id}`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(data => {
        setActiveTicket(data);
        setDrawerLoading(false);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
      })
      .catch(() => setDrawerLoading(false));
  };

  // ── reply ─────────────────────────────────────────────────────────────────

  const sendReply = () => {
    if (!replyText.trim() || !activeTicket) return;
    setReplySending(true);
    fetch(`/api/admin/support/tickets/${activeTicket.id}/reply`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: replyText.trim() }),
    })
      .then(r => r.json())
      .then(res => {
        setActiveTicket(res.ticket);
        setReplyText('');
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
        loadData(); onTicketUpdated?.();
      })
      .finally(() => setReplySending(false));
  };

  // ── resolve ───────────────────────────────────────────────────────────────

  const doResolve = () => {
    if (!resolveNote.trim()) return;
    fetch(`/api/admin/support/tickets/${activeTicket.id}/resolve`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution_note: resolveNote.trim() }),
    })
      .then(r => r.json())
      .then(res => {
        // res.ticket now includes messages (backend was updated to load them)
        if (res.ticket) setActiveTicket(res.ticket);
        setResolveModal(false); setResolveNote('');
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
        loadData(); onTicketUpdated?.();
      });
  };

  // ── refund & resolve ──────────────────────────────────────────────────────
  const doRefundAndResolve = () => {
    if (!refundNote.trim()) return;
    if (refundType === 'partial' && !(parseFloat(refundAmount) > 0)) {
      setRefundError('Enter a valid partial amount.');
      return;
    }
    setRefundError(null);
    setRefundSending(true);

    const body = {
      refund_type:     refundType,
      resolution_note: refundNote.trim(),
      process_stripe:  true,
      ...(refundType === 'partial' && { amount: parseFloat(refundAmount) }),
    };

    fetch(`/api/admin/support/tickets/${activeTicket.id}/refund-and-resolve`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(r => r.json())
      .then(res => {
        if (res.ticket) setActiveTicket(res.ticket);
        setRefundResult(res.refund ?? null);
        setRefundModal(false); setRefundNote(''); setRefundAmount(''); setRefundType('full');
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
        loadData(); onTicketUpdated?.();
      })
      .catch(() => setRefundError('Request failed. Check console.'))
      .finally(() => setRefundSending(false));
  };

  // ── close ticket ──────────────────────────────────────────────────────────

  const doClose = () => {
    fetch(`/api/admin/support/tickets/${activeTicket.id}/close`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    })
      .then(r => r.json())
      .then(res => {
        setActiveTicket(prev => ({ ...prev, status: 'closed' }));
        loadData(); onTicketUpdated?.();
      });
  };

  // ── change priority ───────────────────────────────────────────────────────

  const changePriority = (priority) => {
    fetch(`/api/admin/support/tickets/${activeTicket.id}/status`, {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority }),
    })
      .then(r => r.json())
      .then(res => {
        setActiveTicket(prev => ({ ...prev, priority }));
        loadData();
      });
  };

  // ── columns ───────────────────────────────────────────────────────────────

  const columns = useMemo(() => [
    {
      id: 'ticket',
      header: 'Ticket',
      cell: ({ row: { original: t } }) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>#{t.ticket_number}</div>
          <div className="text-muted" style={{ fontSize: '0.75rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
        </div>
      ),
    },
    {
      id: 'order',
      header: 'Order',
      cell: ({ row: { original: t } }) => t.order
        ? <span className="text-primary" style={{ fontSize: '0.82rem' }}>#{t.order.order_number}</span>
        : <span className="text-muted">—</span>,
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row: { original: t } }) => (
        <span style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>{t.category?.replace('_', ' ') ?? '—'}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row: { original: t } }) => (
        <Badge bg={(STATUS_BADGE[t.status] ?? STATUS_BADGE.closed).bg} text={(STATUS_BADGE[t.status] ?? STATUS_BADGE.closed).text} style={{ fontSize: '0.75rem' }}>
          {STATUS_LABELS[t.status] ?? t.status}
        </Badge>
      ),
    },
    {
      id: 'priority',
      header: 'Priority',
      cell: ({ row: { original: t } }) => (
        <Badge bg={(PRIORITY_BADGE[t.priority] ?? PRIORITY_BADGE.low).bg} text={(PRIORITY_BADGE[t.priority] ?? PRIORITY_BADGE.low).text} style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
          {t.priority}
        </Badge>
      ),
    },
    {
      id: 'unread',
      header: 'Unread',
      cell: ({ row: { original: t } }) => t.unread_admin > 0
        ? <Badge bg="danger" pill>{t.unread_admin}</Badge>
        : <span className="text-muted">—</span>,
    },
    {
      id: 'messages_count',
      header: 'Messages',
      cell: ({ row: { original: t } }) => <span className="text-muted">{t.messages_count ?? 0}</span>,
    },
    {
      id: 'updated',
      header: 'Last Update',
      cell: ({ row: { original: t } }) => (
        <div style={{ fontSize: '0.8rem' }}>
          <div>{fmtDate(t.updated_at)}</div>
          <div className="text-muted">{fmtTime(t.updated_at)}</div>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row: { original: t } }) => (
        <Button size="sm" variant="outline-primary" onClick={() => openTicket(t.id)}>
          <i className="ti ti-message me-1" />View Chat
        </Button>
      ),
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalRows / pageSize),
    state: { pagination: { pageIndex, pageSize } },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
  });

  const pageCount = Math.ceil(totalRows / pageSize);

  // ── skeleton ──────────────────────────────────────────────────────────────

  const Skeleton = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="placeholder-glow">
          {Array.from({ length: columns.length }).map((_, j) => (
            <td key={j}><span className="placeholder col-8 rounded" /></td>
          ))}
        </tr>
      ))}
    </>
  );

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Ticket List Card ── */}
      <div className="card">
        <div className="card-header d-flex flex-wrap align-items-center gap-2">
          <span className="fw-semibold me-auto">Support Tickets</span>

          <InputGroup size="sm" style={{ width: 220 }}>
            <InputGroup.Text><i className="ti ti-search" /></InputGroup.Text>
            <Form.Control
              placeholder="Search ticket / order…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPageIndex(0); }}
            />
          </InputGroup>

          <Form.Select size="sm" style={{ width: 150 }} value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPageIndex(0); }}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Form.Select>

          <Form.Select size="sm" style={{ width: 140 }} value={priorityFilter}
            onChange={e => { setPriorityFilter(e.target.value); setPageIndex(0); }}>
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Form.Select>

          <Form.Select size="sm" style={{ width: 80 }} value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPageIndex(0); }}>
            {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </Form.Select>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <Table hover className="mb-0" style={{ fontSize: '0.87rem' }}>
              <thead className="table-light">
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id}>
                    {hg.headers.map(h => (
                      <th key={h.id} style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        {h.column.columnDef.header}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {loading ? <Skeleton /> : table.getRowModel().rows.length === 0
                  ? (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-5 text-muted">
                        <i className="ti ti-ticket fs-2 d-block mb-2" />No tickets found.
                      </td>
                    </tr>
                  ) : table.getRowModel().rows.map(row => (
                    <tr key={row.id} style={{ cursor: 'default' }}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                          {cell.renderValue !== undefined
                            ? cell.column.columnDef.cell({ row, cell })
                            : null}
                        </td>
                      ))}
                    </tr>
                  ))
                }
              </tbody>
            </Table>
          </div>
        </div>

        {/* pagination */}
        {pageCount > 1 && (
          <div className="card-footer d-flex align-items-center justify-content-between py-2">
            <small className="text-muted">
              Showing {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, totalRows)} of {totalRows}
            </small>
            <div className="d-flex gap-1">
              <Button variant="outline-secondary" size="sm" disabled={pageIndex === 0}
                onClick={() => setPageIndex(0)}>&laquo;</Button>
              <Button variant="outline-secondary" size="sm" disabled={pageIndex === 0}
                onClick={() => setPageIndex(p => p - 1)}>&lsaquo;</Button>
              <span className="px-2 py-1 text-muted" style={{ fontSize: '0.82rem' }}>
                {pageIndex + 1} / {pageCount}
              </span>
              <Button variant="outline-secondary" size="sm" disabled={pageIndex >= pageCount - 1}
                onClick={() => setPageIndex(p => p + 1)}>&rsaquo;</Button>
              <Button variant="outline-secondary" size="sm" disabled={pageIndex >= pageCount - 1}
                onClick={() => setPageIndex(pageCount - 1)}>&raquo;</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Chat Drawer Modal ── */}
      <Modal show={!!activeTicket} onHide={() => { setActiveTicket(null); setReplyText(''); }} size="lg" scrollable>
        <Modal.Header closeButton className="py-2">
          {activeTicket && (
            <div className="d-flex align-items-center gap-3 flex-wrap w-100 me-2">
              <div>
                <div className="fw-semibold" style={{ fontSize: '0.95rem' }}>
                  #{activeTicket.ticket_number} — {activeTicket.subject}
                </div>
                <div className="d-flex gap-2 mt-1">
                  <Badge bg={(STATUS_BADGE[activeTicket.status] ?? STATUS_BADGE.closed).bg} text={(STATUS_BADGE[activeTicket.status] ?? STATUS_BADGE.closed).text} style={{ fontSize: '0.72rem' }}>
                    {STATUS_LABELS[activeTicket.status] ?? activeTicket.status}
                  </Badge>
                  <Badge bg={(PRIORITY_BADGE[activeTicket.priority] ?? PRIORITY_BADGE.low).bg} text={(PRIORITY_BADGE[activeTicket.priority] ?? PRIORITY_BADGE.low).text} style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>
                    {activeTicket.priority}
                  </Badge>
                  {activeTicket.category && (
                    <Badge bg="light" text="dark" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>
                      {activeTicket.category}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="ms-auto d-flex gap-2 flex-wrap">
                {/* priority changer */}
                <Form.Select size="sm" style={{ width: 110 }} value={activeTicket.priority ?? 'medium'}
                  onChange={e => changePriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Form.Select>

                {activeTicket.status !== 'resolved' && activeTicket.status !== 'closed' && activeTicket.order_id && (
                  <Button size="sm" variant="warning" onClick={() => { setRefundModal(true); setRefundError(null); setRefundResult(null); }}>
                    <i className="ti ti-cash-refund me-1" />Refund &amp; Resolve
                  </Button>
                )}
                {activeTicket.status !== 'resolved' && activeTicket.status !== 'closed' && (
                  <Button size="sm" variant="success" onClick={() => setResolveModal(true)}>
                    <i className="ti ti-circle-check me-1" />Resolve
                  </Button>
                )}
                {activeTicket.status !== 'closed' && (
                  <Button size="sm" variant="outline-secondary" onClick={doClose}>
                    <i className="ti ti-lock me-1" />Close
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal.Header>

        <Modal.Body style={{ background: '#f8f9fa', minHeight: 380 }}>
          {drawerLoading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : (
            <>
              {/* linked order info */}
              {activeTicket?.order && (
                <div className="alert alert-info py-2 px-3 mb-3" style={{ fontSize: '0.82rem' }}>
                  <i className="ti ti-shopping-cart me-1" />
                  Linked order: <strong>#{activeTicket.order.order_number}</strong>
                  {activeTicket.order.total && <> &mdash; ${Number(activeTicket.order.total).toFixed(2)}</>}
                  {activeTicket.order.status && (
                    <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.7rem' }}>{activeTicket.order.status}</Badge>
                  )}
                </div>
              )}

              {/* refund success banner */}
              {refundResult && (
                <div className="alert alert-success py-2 px-3 mb-3 d-flex align-items-center gap-2" style={{ fontSize: '0.82rem' }}>
                  <i className="ti ti-circle-check" />
                  <span>
                    Refund <strong>{refundResult.status}</strong>: <strong>${Number(refundResult.amount).toFixed(2)}</strong> ({refundResult.refund_type})
                    {refundResult.stripe_refund_id && <span className="text-muted ms-1">— Stripe #{refundResult.stripe_refund_id}</span>}
                  </span>
                </div>
              )}

              {/* messages */}
              <div className="d-flex flex-column gap-2">
                {(activeTicket?.messages ?? []).map((msg, idx) => {
                  const isAdmin = msg.sender_type === 'admin';
                  return (
                    <div key={idx} className={`d-flex ${isAdmin ? 'justify-content-end' : 'justify-content-start'}`}>
                      {!isAdmin && (
                        <div
                          style={{ width: 32, height: 32, borderRadius: '50%', background: '#6c757d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0, marginRight: 8, marginTop: 4 }}
                        >
                          U
                        </div>
                      )}
                      <div
                        style={{
                          maxWidth: '72%',
                          padding: '8px 12px',
                          borderRadius: isAdmin ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                          background: isAdmin ? '#0d6efd' : '#fff',
                          color: isAdmin ? '#fff' : '#212529',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          fontSize: '0.86rem',
                          wordBreak: 'break-word',
                        }}
                      >
                        {msg.message}
                        <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                          {fmtTime(msg.created_at)}
                        </div>
                      </div>
                      {isAdmin && (
                        <div
                          style={{ width: 32, height: 32, borderRadius: '50%', background: '#0d6efd', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0, marginLeft: 8, marginTop: 4 }}
                        >
                          A
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer className="p-2">
          {activeTicket?.status === 'closed' || activeTicket?.status === 'resolved' ? (
            <div className="w-100 text-center text-muted" style={{ fontSize: '0.85rem' }}>
              <i className="ti ti-lock me-1" />This ticket is {activeTicket?.status}. No further replies allowed.
            </div>
          ) : (
            <div className="d-flex gap-2 w-100">
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Type a reply…"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                style={{ resize: 'none', fontSize: '0.87rem' }}
              />
              <Button
                variant="primary"
                disabled={replySending || !replyText.trim()}
                onClick={sendReply}
                style={{ minWidth: 70 }}
              >
                {replySending ? <Spinner animation="border" size="sm" /> : <><i className="ti ti-send" /></>}
              </Button>
            </div>
          )}
        </Modal.Footer>
      </Modal>

      {/* ── Refund & Resolve Modal ── */}
      <Modal show={refundModal} onHide={() => setRefundModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '1rem' }}>
            <i className="ti ti-cash-refund me-2 text-warning" />Refund &amp; Resolve
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {activeTicket?.order && (
            <div className="alert alert-light py-2 mb-3" style={{ fontSize: '0.82rem' }}>
              Order <strong>#{activeTicket.order.order_number}</strong> &mdash; Total: <strong>${Number(activeTicket.order.total ?? 0).toFixed(2)}</strong>
            </div>
          )}

          <div className="mb-3">
            <Form.Label className="fw-semibold" style={{ fontSize: '0.87rem' }}>Refund Type <span className="text-danger">*</span></Form.Label>
            <Form.Select size="sm" value={refundType} onChange={e => { setRefundType(e.target.value); setRefundAmount(''); }}>
              <option value="full">Full Refund (entire order total)</option>
              <option value="subtotal">Subtotal only (no fees/tip)</option>
              <option value="platform_fee">Platform Fee only</option>
              <option value="tip">Tip only</option>
              <option value="partial">Partial — custom amount</option>
            </Form.Select>
          </div>

          {refundType === 'partial' && (
            <div className="mb-3">
              <Form.Label className="fw-semibold" style={{ fontSize: '0.87rem' }}>Amount ($) <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="number"
                size="sm"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={refundAmount}
                onChange={e => setRefundAmount(e.target.value)}
              />
            </div>
          )}

          <div className="mb-3">
            <Form.Label className="fw-semibold" style={{ fontSize: '0.87rem' }}>Resolution Note <span className="text-danger">*</span></Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Explain the resolution to the customer (shown in chat)…"
              value={refundNote}
              onChange={e => setRefundNote(e.target.value)}
            />
          </div>

          <div className="form-check">
            <input className="form-check-input" type="checkbox" checked readOnly id="stripeCheck" />
            <label className="form-check-label" htmlFor="stripeCheck" style={{ fontSize: '0.82rem' }}>
              Process Stripe refund automatically (if order has payment intent)
            </label>
          </div>

          {refundError && (
            <div className="alert alert-danger py-2 mt-3" style={{ fontSize: '0.82rem' }}>{refundError}</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" size="sm" onClick={() => setRefundModal(false)} disabled={refundSending}>Cancel</Button>
          <Button variant="warning" size="sm" disabled={!refundNote.trim() || refundSending} onClick={doRefundAndResolve}>
            {refundSending
              ? <><Spinner animation="border" size="sm" className="me-1" />Processing…</>
              : <><i className="ti ti-cash-refund me-1" />Refund &amp; Resolve</>
            }
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Resolve Modal ── */}
      <Modal show={resolveModal} onHide={() => setResolveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '1rem' }}>Resolve Ticket</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Label className="fw-semibold" style={{ fontSize: '0.87rem' }}>Resolution Note <span className="text-danger">*</span></Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Describe how the issue was resolved…"
            value={resolveNote}
            onChange={e => setResolveNote(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" size="sm" onClick={() => setResolveModal(false)}>Cancel</Button>
          <Button variant="success" size="sm" disabled={!resolveNote.trim()} onClick={doResolve}>
            <i className="ti ti-circle-check me-1" />Mark Resolved
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default TicketTable;
