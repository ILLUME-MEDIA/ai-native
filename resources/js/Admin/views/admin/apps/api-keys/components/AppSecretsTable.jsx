import DataTable from '@admin/components/table/DataTable';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { useState, useEffect, useCallback } from 'react';
import { Button, Card, CardFooter, CardHeader, FormControl, FormSelect, Modal, ModalBody, ModalHeader, ModalTitle, InputGroup } from 'react-bootstrap';
import { useCopyToClipboard } from 'usehooks-ts';
import SecretModal from './SecretModal';

const GROUP_COLORS = {
  general:  'secondary',
  stripe:   'primary',
  doordash: 'danger',
  square:   'info',
  clover:   'success',
  resend:   'warning',
  youtube:  'danger',
  ai:       'dark',
  other:    'secondary',
};

const columnHelper = createColumnHelper();

// ── small helpers for API docs modal ─────────────────────────────────────────
const CopyLine = ({ text }) => {
  const [, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { copy(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <span className="d-inline-flex align-items-center gap-1">
      <code className="text-body fs-sm">{text}</code>
      <button className="btn btn-link btn-sm p-0 ms-1 text-muted" onClick={handleCopy} title="Copy URL">
        <Icon icon={copied ? 'check' : 'copy'} className="fs-sm" />
      </button>
    </span>
  );
};

const CodeBlock = ({ label, code }) => {
  const [, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { copy(code); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div className="mt-2 position-relative">
      {label && <p className="text-muted fs-sm mb-1 fw-semibold">{label}:</p>}
      <pre className="bg-light rounded p-2 fs-sm mb-0 overflow-auto" style={{ maxHeight: 180 }}>{code}</pre>
      <button
        className="btn btn-sm btn-outline-secondary position-absolute top-0 end-0 mt-1 me-1 py-0 px-1"
        style={{ fontSize: 11 }}
        onClick={handleCopy}
        title="Copy"
      >
        {copied ? 'Copied!' : <Icon icon="copy" className="fs-sm" />}
      </button>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const AppSecretsTable = () => {
  const [, copy] = useCopyToClipboard();
  const [data, setData]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editingRow, setEditingRow]   = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId]   = useState(null);
  const [showApiDocs, setShowApiDocs] = useState(false); // API docs modal
  const [viewRow, setViewRow]         = useState(null);   // for view modal
  const [viewValue, setViewValue]     = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [showViewVal, setShowViewVal] = useState(false);
  const [globalFilter, setGlobalFilter]   = useState('');
  const [columnFilters, setColumnFilters] = useState([]);
  const [sorting, setSorting]             = useState([]);
  const [pagination, setPagination]       = useState({ pageIndex: 0, pageSize: 10 });
  const [revealingId, setRevealingId]     = useState(null);
  const [toast, setToast]                 = useState(null);

  // ── Toast helper ─────────────────────────────────────────────────────────
  const showToast = (msg, variant = 'success') => {
    setToast({ msg, variant });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch secrets ─────────────────────────────────────────────────────────
  const fetchSecrets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/app-secrets', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setData(json);
    } catch {
      showToast('Failed to load secrets.', 'danger');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSecrets(); }, [fetchSecrets]);

  // ── Copy revealed value ───────────────────────────────────────────────────
  const handleRevealCopy = async (row) => {
    setRevealingId(row.id);
    try {
      const res = await fetch(`/api/admin/app-secrets/${row.id}/reveal`, {
        method: 'POST',
        headers: {
          Accept:         'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
        },
      });
      const { value } = await res.json();
      if (value) {
        await copy(value);
        showToast(`Copied ${row.key} to clipboard`);
      } else {
        showToast('No value set', 'warning');
      }
    } catch {
      showToast('Failed to reveal value', 'danger');
    } finally {
      setRevealingId(null);
    }
  };

  // ── Open view modal & reveal value ───────────────────────────────────────
  const handleView = async (row) => {
    setViewRow(row);
    setViewValue(null);
    setShowViewVal(false);
    setViewLoading(true);
    try {
      const res = await fetch(`/api/admin/app-secrets/${row.id}/reveal`, {
        method: 'POST',
        headers: {
          Accept:         'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
        },
      });
      const { value } = await res.json();
      setViewValue(value ?? null);
    } catch {
      setViewValue(null);
    } finally {
      setViewLoading(false);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────
  const handleToggleActive = async (row) => {
    try {
      const res = await fetch(`/api/admin/app-secrets/${row.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type':  'application/json',
          Accept:          'application/json',
          'X-CSRF-TOKEN':  document.querySelector('meta[name="csrf-token"]')?.content ?? '',
        },
        body: JSON.stringify({ is_active: !row.is_active }),
      });
      const updated = await res.json();
      setData(prev => prev.map(s => s.id === updated.id ? updated : s));
      showToast(`${updated.key} ${updated.is_active ? 'activated' : 'deactivated'}`);
    } catch {
      showToast('Failed to update', 'danger');
    }
  };

  // ── Saved callback (create/edit) ──────────────────────────────────────────
  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      setData(prev => prev.map(s => s.id === saved.id ? saved : s));
    } else {
      setData(prev => [...prev, saved]);
    }
    showToast(`Secret ${isEdit ? 'updated' : 'created'} successfully`);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await fetch(`/api/admin/app-secrets/${deletingId}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '' },
      });
      setData(prev => prev.filter(s => s.id !== deletingId));
      showToast('Secret deleted');
    } catch {
      showToast('Failed to delete', 'danger');
    } finally {
      setShowDeleteModal(false);
      setDeletingId(null);
    }
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    columnHelper.accessor('key', {
      header: 'Key',
      cell: ({ row }) => (
        <span className="font-monospace fw-semibold fs-sm">{row.original.key}</span>
      ),
    }),
    columnHelper.accessor('label', {
      header: 'Label',
      cell: ({ row }) => (
        <span className="text-muted fs-sm">{row.original.label || <em>—</em>}</span>
      ),
    }),
    columnHelper.accessor('group', {
      header: 'Group',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const g = row.original.group ?? 'general';
        const color = GROUP_COLORS[g] ?? 'secondary';
        return (
          <span className={`badge bg-${color}-subtle text-${color} text-capitalize badge-label`}>
            {g}
          </span>
        );
      },
    }),
    columnHelper.accessor('masked_value', {
      header: 'Value',
      cell: ({ row }) => {
        const { id, key, has_value, masked_value } = row.original;
        if (!has_value) {
          return <span className="text-muted fst-italic fs-sm">not set</span>;
        }
        return (
          <div className="d-flex align-items-center gap-1">
            <code className="fs-sm text-muted">••••{masked_value?.slice(-4)}</code>
            <button
              className="btn btn-link btn-sm p-0 ms-1"
              title="Copy value"
              disabled={revealingId === id}
              onClick={() => handleRevealCopy(row.original)}
            >
              {revealingId === id
                ? <span className="spinner-border spinner-border-sm" />
                : <Icon icon="copy" className="fs-sm" />
              }
            </button>
          </div>
        );
      },
    }),
    columnHelper.accessor('is_active', {
      header: 'Active',
      filterFn: 'equalsString',
      cell: ({ row }) => {
        const uid    = `toggle-${row.original.id}`;
        const active = !!row.original.is_active;
        return (
          <div
            onClick={() => handleToggleActive(row.original)}
            title={active ? 'Click to deactivate' : 'Click to activate'}
            style={{
              display:         'inline-flex',
              alignItems:      'center',
              width:           '2.5rem',
              height:          '1.25rem',
              borderRadius:    '999px',
              backgroundColor: active ? '#0d6efd' : '#adb5bd',
              padding:         '2px',
              cursor:          'pointer',
              transition:      'background-color .2s',
              flexShrink:       0,
            }}
          >
            <div style={{
              width:           '0.9rem',
              height:          '0.9rem',
              borderRadius:    '50%',
              backgroundColor: '#fff',
              marginLeft:      active ? 'auto' : '0',
              transition:      'margin .2s',
              flexShrink:       0,
            }} />
          </div>
        );
      },
    }),
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="d-flex gap-1">
          <button
            className="btn btn-default btn-icon btn-sm"
            title="View"
            onClick={() => handleView(row.original)}
          >
            <Icon icon="eye" className="fs-lg" />
          </button>
          <button
            className="btn btn-default btn-icon btn-sm"
            title="Edit"
            onClick={() => { setEditingRow(row.original); setShowModal(true); }}
          >
            <Icon icon="edit" className="fs-lg" />
          </button>
          <button
            className="btn btn-default btn-icon btn-sm text-danger"
            title="Delete"
            onClick={() => { setDeletingId(row.original.id); setShowDeleteModal(true); }}
          >
            <Icon icon="trash" className="fs-lg" />
          </button>
        </div>
      ),
    },
  ];

  // ── Table instance ────────────────────────────────────────────────────────
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
  });

  const pageIndex  = table.getState().pagination.pageIndex;
  const pageSize   = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
  const start      = pageIndex * pageSize + 1;
  const end        = Math.min(start + pageSize - 1, totalItems);

  // ── Unique groups for filter dropdown ─────────────────────────────────────
  const allGroups = [...new Set(data.map(s => s.group ?? 'general'))].sort();

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`alert alert-${toast.variant} py-2 px-3 position-fixed bottom-0 end-0 m-3 shadow`}
          style={{ zIndex: 9999, minWidth: 280 }}
        >
          {toast.msg}
        </div>
      )}

      <Card>
        <CardHeader className="border-light justify-content-between flex-wrap gap-2">
          {/* Left: search + add */}
          <div className="d-flex gap-2 align-items-center">
            <div className="app-search">
              <input
                type="text"
                className="form-control"
                placeholder="Search secrets…"
                value={globalFilter ?? ''}
                onChange={e => setGlobalFilter(e.target.value)}
              />
              <Icon icon="search" className="app-search-icon text-muted" />
            </div>

            <Button
              variant="secondary"
              className="btn-icon"
              title="Add secret"
              onClick={() => { setEditingRow(null); setShowModal(true); }}
            >
              <Icon icon="plus" className="fs-lg" />
            </Button>

            <Button
              variant="outline-secondary"
              className="btn-icon"
              title="API usage docs"
              onClick={() => setShowApiDocs(true)}
            >
              <Icon icon="api" className="fs-lg" />
            </Button>
          </div>

          {/* Right: group filter + per-page */}
          <div className="d-flex align-items-center gap-2">
            <span className="me-1 fw-semibold text-nowrap">Filter:</span>

            <div className="app-search">
              <FormSelect
                className="form-control my-1 my-md-0"
                value={table.getColumn('group')?.getFilterValue() ?? 'All'}
                onChange={e =>
                  table.getColumn('group')?.setFilterValue(
                    e.target.value === 'All' ? undefined : e.target.value
                  )
                }
              >
                <option value="All">All Groups</option>
                {allGroups.map(g => (
                  <option key={g} value={g} className="text-capitalize">{g}</option>
                ))}
              </FormSelect>
              <Icon icon="filter" className="app-search-icon text-muted" />
            </div>

            <FormSelect
              className="form-control my-1 my-md-0"
              style={{ width: 70 }}
              value={pageSize}
              onChange={e => table.setPageSize(Number(e.target.value))}
            >
              {[10, 20, 50].map(s => <option key={s} value={s}>{s}</option>)}
            </FormSelect>
          </div>
        </CardHeader>

        {loading
          ? <div className="text-center py-5"><span className="spinner-border" /></div>
          : <DataTable table={table} emptyMessage="No secrets found. Click + to add one." />
        }

        {!loading && table.getRowModel().rows.length > 0 && (
          <CardFooter className="border-0">
            <TablePagination
              totalItems={totalItems}
              start={start}
              end={end}
              itemsName="secrets"
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

      {/* Create / Edit modal */}
      <SecretModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSaved={handleSaved}
        editing={editingRow}
      />

      {/* View modal */}
      <Modal show={!!viewRow} onHide={() => setViewRow(null)} size="md" centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5" className="font-monospace">{viewRow?.key}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {viewRow && (
            <dl className="mb-0 row g-2">
              {viewRow.label && <>
                <dt className="col-4 text-muted fw-normal">Label</dt>
                <dd className="col-8 mb-0">{viewRow.label}</dd>
              </>}
              <dt className="col-4 text-muted fw-normal">Group</dt>
              <dd className="col-8 mb-0">
                <span className={`badge bg-${GROUP_COLORS[viewRow.group] ?? 'secondary'}-subtle text-${GROUP_COLORS[viewRow.group] ?? 'secondary'} text-capitalize`}>
                  {viewRow.group}
                </span>
              </dd>
              <dt className="col-4 text-muted fw-normal">Status</dt>
              <dd className="col-8 mb-0">
                <span className={`badge ${viewRow.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                  {viewRow.is_active ? 'Active' : 'Inactive'}
                </span>
              </dd>
              {viewRow.description && <>
                <dt className="col-4 text-muted fw-normal">Notes</dt>
                <dd className="col-8 mb-0 text-muted">{viewRow.description}</dd>
              </>}
              <dt className="col-4 text-muted fw-normal mt-2">Value</dt>
              <dd className="col-8 mb-0 mt-2">
                {viewLoading
                  ? <span className="spinner-border spinner-border-sm" />
                  : viewValue === null
                    ? <span className="text-muted fst-italic">not set</span>
                    : <InputGroup size="sm">
                        <FormControl
                          readOnly
                          type={showViewVal ? 'text' : 'password'}
                          value={viewValue}
                          className="font-monospace"
                        />
                        <Button variant="outline-secondary" onClick={() => setShowViewVal(v => !v)} title={showViewVal ? 'Hide' : 'Show'}>
                          <Icon icon={showViewVal ? 'eye-off' : 'eye'} className="fs-sm" />
                        </Button>
                        <Button variant="outline-secondary" onClick={() => { copy(viewValue); showToast('Copied!'); }} title="Copy">
                          <Icon icon="copy" className="fs-sm" />
                        </Button>
                      </InputGroup>
                }
              </dd>
            </dl>
          )}
        </ModalBody>
      </Modal>

      {/* API Docs modal */}
      <Modal show={showApiDocs} onHide={() => setShowApiDocs(false)} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5">API Usage — App Secrets</ModalTitle>
        </ModalHeader>
        <ModalBody className="p-0">
          {/* Endpoint list */}
          {[
            {
              method: 'GET', color: 'success',
              url: '/api/admin/app-secrets',
              desc: 'List all secrets (masked values)',
              params: [
                { name: 'group', example: 'stripe', desc: 'Filter by group (stripe, doordash, square, clover, resend, ai, general…)' },
              ],
              response: `[\n  {\n    "id": 1,\n    "key": "STRIPE_SECRET_KEY",\n    "label": "Stripe Secret Key",\n    "group": "stripe",\n    "masked_value": "••••xYz1",\n    "has_value": true,\n    "is_active": true,\n    "created_at": "2026-03-02 10:00:00"\n  }\n]`,
            },
            {
              method: 'POST', color: 'primary',
              url: '/api/admin/app-secrets',
              desc: 'Create a new secret',
              body: `{\n  "key": "STRIPE_SECRET_KEY",   // required, UPPERCASE_ONLY\n  "value": "sk_live_...",\n  "group": "stripe",\n  "label": "Stripe Secret Key",\n  "description": "optional notes",\n  "is_active": true\n}`,
            },
            {
              method: 'PUT', color: 'warning',
              url: '/api/admin/app-secrets/{id}',
              desc: 'Update an existing secret',
              body: `{\n  "value": "sk_live_new_value",\n  "is_active": false\n}`,
            },
            {
              method: 'DELETE', color: 'danger',
              url: '/api/admin/app-secrets/{id}',
              desc: 'Delete a secret',
            },
            {
              method: 'POST', color: 'primary',
              url: '/api/admin/app-secrets/{id}/reveal',
              desc: 'Get the plain-text value (for copy)',
              response: `{ "value": "sk_live_xxxxxxxx" }`,
            },
          ].map((ep, i) => (
            <div key={i} className="border-bottom px-4 py-3">
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className={`badge bg-${ep.color}-subtle text-${ep.color} fw-bold`} style={{ minWidth: 60 }}>{ep.method}</span>
                <CopyLine text={ep.url} />
                <span className="text-muted fs-sm ms-1">{ep.desc}</span>
              </div>
              {ep.params && (
                <div className="mt-2">
                  <p className="text-muted fs-sm mb-1 fw-semibold">Query params:</p>
                  {ep.params.map(p => (
                    <div key={p.name} className="d-flex gap-2 fs-sm ms-2">
                      <code className="text-primary">{p.name}=<span className="text-success">{p.example}</span></code>
                      <span className="text-muted">— {p.desc}</span>
                    </div>
                  ))}
                </div>
              )}
              {ep.body && <CodeBlock label="Request body" code={ep.body} />}
              {ep.response && <CodeBlock label="Response" code={ep.response} />}
            </div>
          ))}

          {/* PHP usage */}
          <div className="px-4 py-3">
            <p className="fw-semibold mb-2">PHP — Use in Laravel services</p>
            <CodeBlock code={`use App\\Services\\AppSecretService;\n\n// Resolves from DB first, falls back to env() if not set\n$key = AppSecretService::get('STRIPE_SECRET_KEY');\n$key = AppSecretService::get('DOORDASH_PROD_DEVELOPER_ID', 'fallback_value');`} />
          </div>
        </ModalBody>
      </Modal>

      {/* Delete confirmation */}
      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={() => { setShowDeleteModal(false); setDeletingId(null); }}
        onConfirm={handleDelete}
        selectedCount={1}
        itemName="secret"
      />
    </>
  );
};

export default AppSecretsTable;
