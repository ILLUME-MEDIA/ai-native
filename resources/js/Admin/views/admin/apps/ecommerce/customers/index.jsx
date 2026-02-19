import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import MediaUpload from '../_components/MediaUpload';
import axios from 'axios';
import { useState, useEffect } from 'react';
import {
  Alert, Badge, Button, Card, CardBody, CardHeader,
  Col, FormControl, FormSelect, Modal, Row, Spinner, Table
} from 'react-bootstrap';

const DEVICE_ICONS  = { desktop: 'device-desktop', mobile: 'device-mobile', tablet: 'device-tablet' };
const DEVICE_COLORS = { desktop: 'primary', mobile: 'success', tablet: 'info' };

const loc = (user, field) => user?.location?.[field] ?? null;

export default function CustomersPage() {
  const [users, setUsers]           = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [page, setPage]             = useState(1);
  const [selected, setSelected]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [deleteId, setDeleteId]     = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, per_page: 25 });
    if (search)        params.set('search', search);
    if (deviceFilter)  params.set('device_type', deviceFilter);
    if (countryFilter) params.set('country_code', countryFilter);
    axios.get(`/api/ecommerce/discovery-users?${params}`)
      .then(r => { setUsers(r.data.data || []); setPagination(r.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, deviceFilter, countryFilter]);

  const handleSearchKey = (e) => { if (e.key === 'Enter') { setPage(1); load(); } };

  const patchUser = (field, value) => {
    if (!selected) return;
    setSaving(true);
    axios.patch(`/api/ecommerce/discovery-users/${selected.id}`, { [field]: value })
      .then(r => {
        setSelected(r.data);
        setUsers(prev => prev.map(u => u.id === r.data.id ? r.data : u));
        showToast('Saved');
      })
      .catch(() => showToast('Save failed', 'danger'))
      .finally(() => setSaving(false));
  };

  const handleDelete = (id) => {
    axios.delete(`/api/ecommerce/discovery-users/${id}`)
      .then(() => { showToast('Deleted'); load(); })
      .catch(() => showToast('Delete failed', 'danger'))
      .finally(() => setDeleteId(null));
  };

  const totalPages = pagination.last_page || 1;
  const total      = pagination.total || 0;

  return (
    <>
      <PageBreadcrumb title="Customers" subtitle="Ecommerce" />

      {toast && (
        <Alert variant={toast.type} className="position-fixed top-0 end-0 m-3 shadow" style={{ zIndex: 9999, minWidth: 260 }}>
          {toast.msg}
        </Alert>
      )}

      {/* Stats */}
      <Row className="g-3 mb-3">
        {[
          { label: 'Total Visitors', value: total,                                                   icon: 'users',         color: 'primary' },
          { label: 'Mobile',         value: users.filter(u => u.device_type === 'mobile').length,   icon: 'device-mobile', color: 'success' },
          { label: 'Desktop',        value: users.filter(u => u.device_type === 'desktop').length,  icon: 'device-desktop',color: 'info'    },
          { label: 'Countries',      value: [...new Set(users.map(u => loc(u,'country_code')).filter(Boolean))].length, icon: 'world', color: 'warning' },
        ].map(stat => (
          <Col key={stat.label} sm={6} xl={3}>
            <Card>
              <CardBody className="d-flex align-items-center gap-3">
                <div className={`bg-${stat.color} bg-opacity-10 rounded p-2`}>
                  <Icon name={stat.icon} size={22} className={`text-${stat.color}`} />
                </div>
                <div>
                  <h4 className="mb-0 fw-bold">{stat.value}</h4>
                  <small className="text-muted">{stat.label}</small>
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <CardHeader className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <div className="d-flex gap-2 flex-wrap">
            <div style={{ position: 'relative' }}>
              <FormControl
                placeholder="Search by name, email, IP, city..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearchKey}
                style={{ paddingRight: 36, minWidth: 240 }}
              />
              <Icon name="search" size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            </div>
            <FormSelect style={{ width: 130 }} value={deviceFilter} onChange={e => { setDeviceFilter(e.target.value); setPage(1); }}>
              <option value="">All Devices</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
            </FormSelect>
          </div>
          <small className="text-muted">{total} total visitors</small>
        </CardHeader>

        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : users.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <Icon name="users" size={40} className="mb-2 opacity-50" />
              <p>No visitors yet.</p>
            </div>
          ) : (
            <Table responsive hover className="mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light">
                <tr>
                  <th>Visitor</th>
                  <th>Device</th>
                  <th>Location</th>
                  <th>Network</th>
                  <th>Browser / OS</th>
                  <th>Last Seen</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ cursor: 'pointer' }}>
                    <td onClick={() => setSelected(user)}>
                      <div className="d-flex align-items-center gap-2">
                        {user.photo
                          ? <img src={user.photo} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                          : <div className="bg-secondary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                              <Icon name="user" size={14} className="text-muted" />
                            </div>
                        }
                        <div>
                          <div className="fw-semibold">{user.name || <span className="text-muted fst-italic">Anonymous</span>}</div>
                          <small className="text-muted">{user.email || user.ip_address || '—'}</small>
                        </div>
                      </div>
                    </td>
                    <td onClick={() => setSelected(user)}>
                      <Icon name={DEVICE_ICONS[user.device_type] || 'device-desktop'} size={16}
                        className={`text-${DEVICE_COLORS[user.device_type] || 'secondary'} me-1`} />
                      <Badge bg={DEVICE_COLORS[user.device_type] || 'secondary'} className="text-capitalize">
                        {user.device_type || '—'}
                      </Badge>
                    </td>
                    <td onClick={() => setSelected(user)}>
                      <div>{[loc(user,'city'), loc(user,'country_code')].filter(Boolean).join(', ') || '—'}</div>
                      <small className="text-muted">{user.timezone || ''}</small>
                    </td>
                    <td onClick={() => setSelected(user)}>
                      <div>{user.isp || '—'}</div>
                      <small className="text-muted">{user.ip_address}</small>
                    </td>
                    <td onClick={() => setSelected(user)}>
                      <div>{user.browser || '—'} {user.browser_version || ''}</div>
                      <small className="text-muted">{user.os || ''} {user.os_version || ''}</small>
                    </td>
                    <td onClick={() => setSelected(user)}>
                      <small className="text-muted">
                        {user.last_seen_at
                          ? new Date(user.last_seen_at).toLocaleString()
                          : new Date(user.created_at).toLocaleString()}
                      </small>
                    </td>
                    <td>
                      <Button size="sm" variant="outline-danger" onClick={() => setDeleteId(user.id)}>
                        <Icon name="trash" size={13} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>

        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center p-3 border-top">
            <small className="text-muted">Page {pagination.current_page} of {totalPages} ({total} total)</small>
            <div className="d-flex gap-1">
              <Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <Icon name="chevron-left" size={14} />
              </Button>
              <Button size="sm" variant="outline-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <Icon name="chevron-right" size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {selected && (
        <Modal show onHide={() => setSelected(null)} size="lg" scrollable>
          <Modal.Header closeButton>
            <Modal.Title className="d-flex align-items-center gap-2">
              {selected.photo
                ? <img src={selected.photo} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                : <div className="bg-secondary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                    <Icon name="user" size={18} className="text-muted" />
                  </div>
              }
              <span>{selected.name || 'Anonymous Visitor'} <small className="text-muted">#{selected.id}</small></span>
              {saving && <Spinner size="sm" className="ms-2 text-muted" />}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>

            {/* Photo + Audio Upload */}
            <Row className="g-3 mb-3 pb-3 border-bottom">
              <Col sm={6}>
                <MediaUpload
                  label="Profile Photo"
                  value={selected.photo || ''}
                  onChange={url => patchUser('photo', url)}
                  folder="discovery-users"
                  type="image"
                />
              </Col>
              <Col sm={6}>
                <MediaUpload
                  label="Audio"
                  value={selected.audio || ''}
                  onChange={url => patchUser('audio', url)}
                  folder="discovery-users"
                  type="audio"
                />
              </Col>
            </Row>

            {/* Info Fields */}
            <Row className="g-3">
              {[
                ['Email',        selected.email],
                ['Phone',        selected.phone],
                ['IP Address',   selected.ip_address],
                ['ISP',          selected.isp],
                ['City',         loc(selected,'city')],
                ['State',        loc(selected,'state')],
                ['Country',      loc(selected,'country')],
                ['Country Code', loc(selected,'country_code')],
                ['Lat / Lng',    loc(selected,'lat') ? `${loc(selected,'lat')}, ${loc(selected,'lng')}` : null],
                ['Timezone',     selected.timezone],
                ['Device',       selected.device_type],
                ['OS',           [selected.os, selected.os_version].filter(Boolean).join(' ') || null],
                ['Browser',      [selected.browser, selected.browser_version].filter(Boolean).join(' ') || null],
                ['Platform',     selected.platform],
                ['Screen',       selected.screen_width ? `${selected.screen_width}×${selected.screen_height}` : null],
                ['CPU Cores',    selected.hardware_concurrency],
                ['RAM',          selected.device_memory ? `${selected.device_memory} GB` : null],
                ['Connection',   selected.connection_type],
                ['Language',     selected.language],
                ['Referrer',     selected.referrer],
                ['Last Seen',    selected.last_seen_at ? new Date(selected.last_seen_at).toLocaleString() : null],
                ['Created',      selected.created_at ? new Date(selected.created_at).toLocaleString() : null],
              ].map(([label, value]) => value ? (
                <Col key={label} sm={6}>
                  <div className="d-flex justify-content-between border-bottom pb-1">
                    <small className="text-muted">{label}</small>
                    <small className="fw-semibold text-end" style={{ maxWidth: '60%', wordBreak: 'break-all' }}>{value}</small>
                  </div>
                </Col>
              ) : null)}
            </Row>

            {selected.fingerprint && (
              <div className="mt-3 border-top pt-2">
                <small className="text-muted d-block mb-1">Fingerprint</small>
                <code style={{ fontSize: '0.75rem' }}>{selected.fingerprint}</code>
              </div>
            )}
            {selected.webgl_renderer && (
              <div className="mt-2">
                <small className="text-muted d-block mb-1">WebGL Renderer</small>
                <small>{selected.webgl_renderer}</small>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button size="sm" variant="outline-danger" onClick={() => { setDeleteId(selected.id); setSelected(null); }}>
              <Icon name="trash" size={13} className="me-1" /> Delete
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setSelected(null)}>Close</Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Delete Confirm */}
      <Modal show={!!deleteId} onHide={() => setDeleteId(null)} centered size="sm">
        <Modal.Header closeButton><Modal.Title>Delete Visitor</Modal.Title></Modal.Header>
        <Modal.Body>Remove this visitor record permanently?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => handleDelete(deleteId)}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
