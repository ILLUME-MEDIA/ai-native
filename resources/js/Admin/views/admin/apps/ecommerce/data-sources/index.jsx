import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Badge, Button, Card, CardBody, CardHeader,
  Col, Form, FormControl, FormLabel, FormSelect,
  Modal, Row, Spinner, Table
} from 'react-bootstrap';

// ── helpers ───────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  idle:      { label: 'Idle',      cls: 'bg-secondary-subtle text-secondary' },
  syncing:   { label: 'Syncing…',  cls: 'bg-warning-subtle text-warning'     },
  completed: { label: 'Synced',    cls: 'bg-success-subtle text-success'      },
  failed:    { label: 'Failed',    cls: 'bg-danger-subtle text-danger'        },
};

const TYPE_MAP = {
  local_table: { label: 'Local DB Table', icon: 'database',     cls: 'bg-primary-subtle text-primary'  },
  api:         { label: 'REST API',       icon: 'api',          cls: 'bg-info-subtle text-info'         },
};

const emptyForm = {
  name: '',
  description: '',
  type: 'local_table',
  is_active: true,
  // local_table fields
  config_table: '',
  // api fields
  config_base_url: '',
  config_token: '',
  config_auth_type: 'bearer',
  config_endpoint: '/api/businesses',
  config_per_page: '50',
  config_data_key: 'data',
  // shared
  config_field_map: '',  // JSON string
};

function formToSource(form) {
  const config = {};

  if (form.type === 'local_table') {
    if (form.config_table)     config.table = form.config_table.trim();
  } else {
    if (form.config_base_url)  config.base_url  = form.config_base_url.trim();
    if (form.config_token)     config.token     = form.config_token.trim();
    if (form.config_auth_type) config.auth_type = form.config_auth_type;
    if (form.config_endpoint)  config.endpoint  = form.config_endpoint.trim();
    if (form.config_per_page)  config.per_page  = parseInt(form.config_per_page) || 50;
    if (form.config_data_key)  config.data_key  = form.config_data_key.trim();
  }

  // parse field_map JSON
  if (form.config_field_map.trim()) {
    try { config.field_map = JSON.parse(form.config_field_map); } catch (_) {}
  }

  return { name: form.name, description: form.description, type: form.type, is_active: form.is_active, config };
}

function sourceToForm(src) {
  const c = src.config || {};
  return {
    name: src.name || '',
    description: src.description || '',
    type: src.type || 'local_table',
    is_active: src.is_active ?? true,
    config_table:     c.table       || '',
    config_base_url:  c.base_url    || '',
    config_token:     c.token       || '',
    config_auth_type: c.auth_type   || 'bearer',
    config_endpoint:  c.endpoint    || '/api/businesses',
    config_per_page:  String(c.per_page || 50),
    config_data_key:  c.data_key    || 'data',
    config_field_map: c.field_map ? JSON.stringify(c.field_map, null, 2) : '',
  };
}

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString();
}

function fmtMs(ms) {
  if (!ms) return '';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// ── main component ────────────────────────────────────────────────────────────

export default function DataSourcesPage() {
  const [sources, setSources]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);
  const [showModal, setShowModal]   = useState(false);
  const [editSrc, setEditSrc]       = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [syncingId, setSyncingId]   = useState(null);
  const [deleteId, setDeleteId]     = useState(null);
  const [logsModal, setLogsModal]   = useState(null);  // { source }
  const [logs, setLogs]             = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(() => {
    setLoading(true);
    axios.get('/api/ecommerce/data-sources')
      .then(r => setSources(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll while any source is syncing
  useEffect(() => {
    const hasSyncing = sources.some(s => s.sync_status === 'syncing');
    if (!hasSyncing) return;
    const timer = setInterval(load, 2500);
    return () => clearInterval(timer);
  }, [sources, load]);

  // ── modal ──

  const openAdd = () => {
    setEditSrc(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (src) => {
    setEditSrc(src);
    setForm(sourceToForm(src));
    setShowModal(true);
  };

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSave = () => {
    setSaving(true);
    const payload = formToSource(form);
    const req = editSrc
      ? axios.patch(`/api/ecommerce/data-sources/${editSrc.id}`, payload)
      : axios.post('/api/ecommerce/data-sources', payload);
    req.then(() => { showToast(editSrc ? 'Source updated.' : 'Source created.'); setShowModal(false); load(); })
       .catch(e => showToast(e.response?.data?.message || 'Save failed.', 'danger'))
       .finally(() => setSaving(false));
  };

  // ── sync ──

  const handleSync = (src) => {
    setSyncingId(src.id);
    // Optimistically mark as syncing
    setSources(prev => prev.map(s => s.id === src.id ? { ...s, sync_status: 'syncing' } : s));
    axios.post(`/api/ecommerce/data-sources/${src.id}/sync`)
      .then(r => {
        showToast(`Sync done — ${r.data.imported} imported, ${r.data.skipped} skipped, ${r.data.failed} failed.`);
        load();
      })
      .catch(e => {
        showToast(e.response?.data?.message || 'Sync failed.', 'danger');
        load();
      })
      .finally(() => setSyncingId(null));
  };

  // ── delete ──

  const handleDelete = () => {
    axios.delete(`/api/ecommerce/data-sources/${deleteId}`)
      .then(() => { showToast('Source deleted.'); load(); })
      .catch(() => showToast('Delete failed.', 'danger'))
      .finally(() => setDeleteId(null));
  };

  // ── logs ──

  const openLogs = (src) => {
    setLogsModal(src);
    setLogsLoading(true);
    setLogs([]);
    axios.get(`/api/ecommerce/data-sources/${src.id}/logs`)
      .then(r => setLogs(r.data))
      .finally(() => setLogsLoading(false));
  };

  // ── stats ──

  const active   = sources.filter(s => s.is_active).length;
  const lastSync = sources.reduce((latest, s) => {
    if (!s.last_sync_at) return latest;
    return !latest || new Date(s.last_sync_at) > new Date(latest) ? s.last_sync_at : latest;
  }, null);
  const totalImported = sources.reduce((sum, s) => sum + (s.total_synced || 0), 0);

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <PageBreadcrumb title="Data Source Hub" subtitle="Ecommerce" />

      {toast && (
        <Alert variant={toast.type} dismissible onClose={() => setToast(null)}
          className="position-fixed top-0 end-0 m-3 shadow" style={{ zIndex: 9999, minWidth: 300 }}>
          {toast.msg}
        </Alert>
      )}

      {/* ── Stats ── */}
      <Row className="g-3 mb-3">
        {[
          { icon: 'plug-connected', label: 'Total Sources',    value: sources.length,   color: 'primary'  },
          { icon: 'circle-check',   label: 'Active Sources',   value: active,            color: 'success'  },
          { icon: 'database-import',label: 'Total Imported',   value: totalImported,     color: 'info'     },
          { icon: 'clock',          label: 'Last Sync',        value: fmtDate(lastSync), color: 'warning', small: true },
        ].map(({ icon, label, value, color, small }) => (
          <Col key={label} sm={6} lg={3}>
            <Card className="text-center h-100">
              <CardBody className="py-3">
                <div className={`text-${color} mb-1`}><Icon icon={icon} size={26} /></div>
                <h4 className={`fw-bold mb-0 ${small ? 'fs-6' : ''}`}>{value}</h4>
                <small className="text-muted">{label}</small>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Sources Table ── */}
      <Card>
        <CardHeader className="d-flex align-items-center justify-content-between">
          <h5 className="mb-0 fw-semibold">Connected Sources</h5>
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Icon icon="plus" size={14} className="me-1" /> Add Source
          </Button>
        </CardHeader>

        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : sources.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <Icon icon="plug-connected-x" size={40} className="mb-2 opacity-50" />
              <p className="mb-0">No data sources yet. Add your first source.</p>
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Last Sync</th>
                  <th>Imported</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sources.map(src => {
                  const status = STATUS_MAP[src.sync_status] || STATUS_MAP.idle;
                  const type   = TYPE_MAP[src.type]          || TYPE_MAP.local_table;
                  const isSyncing = src.sync_status === 'syncing' || syncingId === src.id;
                  return (
                    <tr key={src.id}>
                      <td>
                        <div className="fw-semibold">{src.name}</div>
                        {src.description && <small className="text-muted">{src.description}</small>}
                        {src.last_error && (
                          <small className="d-block text-danger mt-1" title={src.last_error}>
                            <Icon icon="alert-circle" size={11} className="me-1" />
                            {src.last_error.slice(0, 60)}…
                          </small>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${type.cls}`}>
                          <Icon icon={type.icon} size={11} className="me-1" />{type.label}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${status.cls} d-inline-flex align-items-center gap-1`}>
                          {isSyncing && <Spinner size="sm" style={{ width: 10, height: 10 }} />}
                          {status.label}
                        </span>
                      </td>
                      <td><small className="text-muted">{fmtDate(src.last_sync_at)}</small></td>
                      <td>
                        <span className="fw-semibold text-success">{(src.total_synced || 0).toLocaleString()}</span>
                        <small className="text-muted ms-1">records</small>
                      </td>
                      <td>
                        <Form.Check type="switch" checked={!!src.is_active} onChange={() =>
                          axios.patch(`/api/ecommerce/data-sources/${src.id}`, { is_active: !src.is_active }).then(load)
                        } />
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <Button size="sm" variant="outline-success"
                            disabled={isSyncing || !src.is_active}
                            onClick={() => handleSync(src)}
                            title="Sync now">
                            {isSyncing
                              ? <Spinner size="sm" style={{ width: 12, height: 12 }} />
                              : <Icon icon="refresh" size={13} />}
                          </Button>
                          <Button size="sm" variant="outline-info" onClick={() => openLogs(src)} title="Sync history">
                            <Icon icon="history" size={13} />
                          </Button>
                          <Button size="sm" variant="outline-primary" onClick={() => openEdit(src)} title="Edit">
                            <Icon icon="pencil" size={13} />
                          </Button>
                          <Button size="sm" variant="outline-danger" onClick={() => setDeleteId(src.id)} title="Delete">
                            <Icon icon="trash" size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* ── Add / Edit Modal ── */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center gap-2">
            <Icon icon="plug-connected" size={18} />
            {editSrc ? `Edit: ${editSrc.name}` : 'Add Data Source'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            {/* Basic */}
            <Col md={8}>
              <FormLabel>Source Name *</FormLabel>
              <FormControl value={form.name} onChange={f('name')} placeholder="e.g. Pakistan Hub" />
            </Col>
            <Col md={4}>
              <FormLabel>Type *</FormLabel>
              <FormSelect value={form.type} onChange={f('type')}>
                <option value="local_table">Local DB Table</option>
                <option value="api">REST API</option>
              </FormSelect>
            </Col>
            <Col md={12}>
              <FormLabel>Description</FormLabel>
              <FormControl value={form.description} onChange={f('description')} placeholder="Short note about this source" />
            </Col>

            <Col md={12}><hr className="my-1" /></Col>

            {/* ── Local Table Config ── */}
            {form.type === 'local_table' && (
              <>
                <Col md={12}>
                  <div className="alert alert-info py-2 px-3 mb-0 small">
                    <Icon icon="info-circle" size={13} className="me-1" />
                    Import a SQL file into your database first, then enter its table name here.
                    The sync engine will read all rows and import them as businesses.
                  </div>
                </Col>
                <Col md={6}>
                  <FormLabel>Table Name *</FormLabel>
                  <FormControl value={form.config_table} onChange={f('config_table')} placeholder="e.g. muzzhub, pakistanhub" />
                  <Form.Text className="text-muted">Must be a table that exists in your database.</Form.Text>
                </Col>
              </>
            )}

            {/* ── REST API Config ── */}
            {form.type === 'api' && (
              <>
                <Col md={8}>
                  <FormLabel>Base URL *</FormLabel>
                  <FormControl value={form.config_base_url} onChange={f('config_base_url')} placeholder="https://api.pakistanhub.com" />
                </Col>
                <Col md={4}>
                  <FormLabel>Auth Type</FormLabel>
                  <FormSelect value={form.config_auth_type} onChange={f('config_auth_type')}>
                    <option value="bearer">Bearer Token</option>
                    <option value="api_key">API Key Header</option>
                    <option value="basic">Basic Auth</option>
                    <option value="none">No Auth</option>
                  </FormSelect>
                </Col>
                <Col md={8}>
                  <FormLabel>API Token / Key</FormLabel>
                  <FormControl value={form.config_token} onChange={f('config_token')} placeholder="your-secret-key" type="password" autoComplete="off" />
                </Col>
                <Col md={4}>
                  <FormLabel>Businesses Endpoint</FormLabel>
                  <FormControl value={form.config_endpoint} onChange={f('config_endpoint')} placeholder="/api/businesses" />
                </Col>
                <Col md={4}>
                  <FormLabel>Per Page</FormLabel>
                  <FormControl type="number" value={form.config_per_page} onChange={f('config_per_page')} placeholder="50" />
                </Col>
                <Col md={4}>
                  <FormLabel>Data Key (JSON path)</FormLabel>
                  <FormControl value={form.config_data_key} onChange={f('config_data_key')} placeholder="data" />
                  <Form.Text className="text-muted">Key in response that holds the array (e.g. data, results, businesses)</Form.Text>
                </Col>
              </>
            )}

            {/* ── Field Map (both types) ── */}
            <Col md={12}><hr className="my-1" /></Col>
            <Col md={12}>
              <FormLabel>
                Field Map <small className="text-muted fw-normal">(optional — JSON object)</small>
              </FormLabel>
              <FormControl
                as="textarea"
                rows={4}
                value={form.config_field_map}
                onChange={f('config_field_map')}
                placeholder={'{\n  "business_name": "name",\n  "phone_number": "phone",\n  "location.city": "city"\n}'}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
              <Form.Text className="text-muted">
                Map source field names → local Business field names. Leave blank if column names already match.
                For local tables this defaults to the full muzzhub column mapping automatically.
              </Form.Text>
            </Col>

            <Col md={12}>
              <Form.Check type="switch" label="Active" checked={form.is_active} onChange={f('is_active')} />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving && <Spinner size="sm" className="me-1" />}
            {editSrc ? 'Update' : 'Create Source'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Sync Logs Modal ── */}
      <Modal show={!!logsModal} onHide={() => setLogsModal(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <Icon icon="history" size={16} className="me-2" />
            Sync History — {logsModal?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {logsLoading ? (
            <div className="text-center py-4"><Spinner /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-4 text-muted">No sync logs yet.</div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Status</th>
                  <th>Imported</th>
                  <th>Skipped</th>
                  <th>Failed</th>
                  <th>Duration</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id}>
                    <td><small className="text-muted">{i + 1}</small></td>
                    <td>
                      <span className={`badge ${log.status === 'completed' ? 'bg-success-subtle text-success' : log.status === 'running' ? 'bg-warning-subtle text-warning' : 'bg-danger-subtle text-danger'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td><span className="text-success fw-semibold">{log.imported}</span></td>
                    <td><span className="text-muted">{log.skipped}</span></td>
                    <td><span className={log.failed > 0 ? 'text-danger' : 'text-muted'}>{log.failed}</span></td>
                    <td><small className="text-muted">{fmtMs(log.duration_ms)}</small></td>
                    <td><small className="text-muted">{fmtDate(log.created_at)}</small></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {logs.some(l => l.error) && (
            <div className="p-3 border-top">
              <small className="text-danger fw-semibold">Last error:</small>
              <pre className="text-danger small mt-1 mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {logs.find(l => l.error)?.error}
              </pre>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setLogsModal(null)}>Close</Button>
          {logsModal && (
            <Button variant="success" onClick={() => { setLogsModal(null); handleSync(logsModal); }}>
              <Icon icon="refresh" size={14} className="me-1" /> Sync Now
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* ── Delete Confirm ── */}
      <Modal show={!!deleteId} onHide={() => setDeleteId(null)} centered size="sm">
        <Modal.Header closeButton><Modal.Title>Delete Source</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure? This will also delete all sync logs for this source. Imported businesses will remain.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
