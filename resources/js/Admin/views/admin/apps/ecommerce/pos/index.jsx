import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Container, Row, Col, Card, Button, Badge, Table, Alert, Spinner,
  Modal, Form, ListGroup, Nav, Tab, Dropdown, OverlayTrigger, Tooltip,
} from 'react-bootstrap';
import axios from 'axios';
import { Icon as IconifyIcon } from '@iconify/react';

const api = (path, opts = {}) =>
  axios({ url: `/api${path}`, withCredentials: true, ...opts });

// ── Icon helpers ───────────────────────────────────────────────────────────────
const PROVIDER_ICONS = {
  square:     'simple-icons:square',
  clover:     'tabler:leaf',
  toast:      'tabler:tools-kitchen-2',
  spoton:     'tabler:map-pin-filled',
  poslavu:    'tabler:device-ipad',
  deliverect: 'tabler:truck-delivery',
};

function ProviderIcon({ provider, size = 20, style = {} }) {
  const icon = PROVIDER_ICONS[provider] ?? 'tabler:plug';
  return <IconifyIcon icon={icon} width={size} height={size} style={style} />;
}

function Ico({ icon, size = 16, className = '', style = {} }) {
  return <IconifyIcon icon={icon} width={size} height={size} className={className} style={style} />;
}

// ── Provider metadata ──────────────────────────────────────────────────────────
const PROVIDER_META = {
  square: {
    label: 'Square',
    color: '#1a1a1a',
    badge: 'dark',
    authType: 'oauth',
    description: 'Card readers + Web payments',
    features: ['Terminal', 'Catalog', 'OAuth'],
    setupHints: ['Create app at developer.squareup.com', 'Set OAuth callback URL', 'Add SQUARE_APP_ID + SQUARE_APP_SECRET to App Secrets'],
  },
  clover: {
    label: 'Clover',
    color: '#28a745',
    badge: 'success',
    authType: 'oauth',
    description: 'In-store POS terminal',
    features: ['Catalog', 'Orders', 'OAuth'],
    setupHints: ['Create app at clover.com/developers', 'Note your Merchant ID from dashboard URL', 'Add CLOVER_APP_ID + CLOVER_APP_SECRET to App Secrets'],
  },
  toast: {
    label: 'Toast',
    color: '#e07b39',
    badge: 'warning',
    authType: 'direct',
    description: 'Restaurant POS + Kitchen Display',
    features: ['Menu', 'Orders', 'KDS'],
    setupHints: ['Get Client ID/Secret from Toast developer portal', 'Note your Restaurant GUID from Toast Admin', 'Add TOAST_CLIENT_ID + TOAST_CLIENT_SECRET to App Secrets'],
  },
  spoton: {
    label: 'SpotOn',
    color: '#0d6efd',
    badge: 'primary',
    authType: 'oauth',
    description: 'Restaurant & retail POS',
    features: ['Catalog', 'Orders', 'OAuth'],
    setupHints: ['Register at developer.spoton.com', 'Set OAuth callback URL in app settings', 'Add SPOTON_CLIENT_ID + SPOTON_CLIENT_SECRET to App Secrets'],
  },
  poslavu: {
    label: 'POSLavu',
    color: '#0dcaf0',
    badge: 'info',
    authType: 'direct',
    description: 'iPad-based restaurant POS',
    features: ['Items', 'Orders', 'API Key'],
    setupHints: ['Get API key from POSLavu Admin → Integrations', 'Note your Restaurant ID from settings', 'No app-level secret needed — per-connection API key'],
  },
  deliverect: {
    label: 'Deliverect',
    color: '#dc3545',
    badge: 'danger',
    authType: 'direct',
    description: 'Delivery channel aggregator',
    features: ['Menu Push', 'Orders', 'Channels'],
    setupHints: ['Get Client ID/Secret from Deliverect developer portal', 'Note your Account ID from dashboard', 'Add DELIVERECT_CLIENT_ID + DELIVERECT_CLIENT_SECRET to App Secrets'],
  },
};

const OAUTH_NEEDS_MERCHANT_ID = ['clover'];

// ── Days until expiry helper ───────────────────────────────────────────────────
function daysUntilExpiry(expiresAt) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt) - new Date();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function PosPage() {
  const [connections,  setConnections]  = useState([]);
  const [businesses,   setBusinesses]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [flash,        setFlash]        = useState(null);
  const [connectModal, setConnectModal] = useState(false);
  const [connectForm,  setConnectForm]  = useState({
    provider: 'square', business_id: '', merchant_id: '',
    api_key: '', restaurant_id: '', restaurant_guid: '', account_id: '',
  });
  const [connecting,   setConnecting]   = useState(false);
  const [checkResult,  setCheckResult]  = useState(null);
  const [checking,     setChecking]     = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [filterProv,   setFilterProv]   = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const showFlash = useCallback((msg, variant = 'success') => {
    setFlash({ msg, variant });
    setTimeout(() => setFlash(null), 5000);
  }, []);

  const loadConnections = useCallback(async () => {
    try {
      const [connRes, bizRes] = await Promise.all([
        api('/ecommerce/pos'),
        api('/ecommerce/businesses?per_page=200'),
      ]);
      setConnections(Array.isArray(connRes.data) ? connRes.data : []);
      setBusinesses(bizRes.data?.data ?? bizRes.data);
    } catch {
      showFlash('Failed to load POS connections.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showFlash]);

  useEffect(() => {
    loadConnections();
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'connected') {
      showFlash(`${params.get('provider') ?? 'POS'} connected successfully!`);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('error')) {
      showFlash('Connection error: ' + params.get('error'), 'danger');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadConnections, showFlash]);

  const handleCheck = async () => {
    setChecking(true); setCheckResult(null);
    try {
      const res = await api('/ecommerce/pos/check');
      setCheckResult(res.data);
    } catch (e) {
      showFlash(e.response?.data?.message ?? 'Check failed.', 'danger');
    } finally {
      setChecking(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    const { provider, business_id, merchant_id, api_key, restaurant_id, restaurant_guid, account_id } = connectForm;
    const meta = PROVIDER_META[provider];
    try {
      if (meta.authType === 'oauth') {
        let res;
        if (provider === 'square')  res = await api(`/ecommerce/pos/square/auth-url?business_id=${business_id}`);
        if (provider === 'clover')  res = await api(`/ecommerce/pos/clover/auth-url?business_id=${business_id}&merchant_id=${merchant_id}`);
        if (provider === 'spoton')  res = await api(`/ecommerce/pos/spoton/auth-url?business_id=${business_id}`);
        window.location.href = res.data.url;
      } else {
        const map = {
          toast:      ['/ecommerce/pos/toast/connect',      { business_id, restaurant_guid }],
          poslavu:    ['/ecommerce/pos/poslavu/connect',     { business_id, api_key, restaurant_id }],
          deliverect: ['/ecommerce/pos/deliverect/connect',  { business_id, account_id }],
        };
        const [endpoint, payload] = map[provider];
        const res = await api(endpoint, { method: 'POST', data: payload });
        showFlash(res.data.message ?? `${meta.label} connected!`);
        setConnectModal(false);
        loadConnections();
      }
    } catch (e) {
      showFlash(e.response?.data?.message ?? 'Failed to connect.', 'danger');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (conn) => {
    const label = PROVIDER_META[conn.provider]?.label ?? conn.provider;
    if (!confirm(`Disconnect ${label} from "${conn.business_name}"?\n\nThis will remove all catalog maps for this connection.`)) return;
    try {
      await api(`/ecommerce/pos/${conn.id}`, { method: 'DELETE' });
      showFlash(`${label} disconnected.`);
      if (selected?.id === conn.id) setSelected(null);
      loadConnections();
    } catch {
      showFlash('Failed to disconnect.', 'danger');
    }
  };

  const handleToggleActive = async (conn) => {
    try {
      const res = await api(`/ecommerce/pos/${conn.id}`, { method: 'PATCH', data: { is_active: !conn.is_active } });
      setConnections(prev => prev.map(c => c.id === conn.id ? res.data : c));
    } catch {
      showFlash('Failed to update.', 'danger');
    }
  };

  // ── Derived stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    connections.length,
    active:   connections.filter(c => c.is_active).length,
    synced:   connections.reduce((s, c) => s + (c.catalog_count ?? 0), 0),
    expiring: connections.filter(c => {
      const d = daysUntilExpiry(c.expires_at);
      return d !== null && d <= 7 && d >= 0;
    }).length,
  }), [connections]);

  // ── Filtered connections ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return connections.filter(c => {
      if (filterProv   !== 'all' && c.provider  !== filterProv)  return false;
      if (filterStatus === 'active'   && !c.is_active) return false;
      if (filterStatus === 'inactive' &&  c.is_active) return false;
      if (filterStatus === 'expiring' && (daysUntilExpiry(c.expires_at) ?? 999) > 7) return false;
      return true;
    });
  }, [connections, filterProv, filterStatus]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <Container fluid className="py-4">

      {/* ── Header ── */}
      <Row className="mb-3 align-items-center">
        <Col>
          <h4 className="mb-0 fw-bold">POS Integration</h4>
          <small className="text-muted">
            Square · Clover · Toast · SpotOn · POSLavu · Deliverect — menu sync, payments, order management
          </small>
        </Col>
        <Col xs="auto" className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={handleCheck} disabled={checking}>
            {checking ? <><Spinner size="sm" className="me-1" />Checking…</> : <><Ico icon="tabler:shield-check" className="me-1" />Check Credentials</>}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setConnectModal(true)}>
            + Connect POS
          </Button>
        </Col>
      </Row>

      {/* ── Stats bar ── */}
      {connections.length > 0 && (
        <Row className="g-3 mb-4">
          {[
            { label: 'Total Connections', value: stats.total,   color: 'primary', icon: 'tabler:plug' },
            { label: 'Active',            value: stats.active,  color: 'success', icon: 'tabler:circle-check-filled' },
            { label: 'Items Synced',      value: stats.synced,  color: 'info',    icon: 'tabler:package' },
            { label: 'Tokens Expiring',   value: stats.expiring, color: stats.expiring > 0 ? 'warning' : 'secondary', icon: 'tabler:clock-exclamation' },
          ].map(s => (
            <Col xs={6} md={3} key={s.label}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="py-3 px-3 d-flex align-items-center gap-3">
                  <div className={`text-${s.color}`}><Ico icon={s.icon} size={28} /></div>
                  <div>
                    <div className="fw-bold fs-5 lh-1">{s.value}</div>
                    <div className="small text-muted">{s.label}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* ── Flash ── */}
      {flash && (
        <Alert variant={flash.variant} dismissible onClose={() => setFlash(null)} className="mb-3">
          {flash.msg}
        </Alert>
      )}

      {/* ── Credentials check panel ── */}
      {checkResult && (
        <CredentialCheckPanel result={checkResult} onClose={() => setCheckResult(null)} />
      )}

      {/* ── Filter bar (only when there are connections) ── */}
      {connections.length > 0 && (
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <small className="text-muted fw-semibold me-1">Filter:</small>

          {/* Provider filter */}
          <div className="d-flex gap-1 flex-wrap">
            {['all', ...Object.keys(PROVIDER_META)].map(key => (
              <Button
                key={key}
                size="sm"
                variant={filterProv === key ? 'dark' : 'outline-secondary'}
                className="py-0 px-2"
                style={{ fontSize: '0.75rem' }}
                onClick={() => setFilterProv(key)}
              >
                {key === 'all' ? 'All' : <><ProviderIcon provider={key} size={13} className="me-1" />{PROVIDER_META[key]?.label}</>}
              </Button>
            ))}
          </div>

          <div className="vr mx-1" style={{ height: 20 }} />

          {/* Status filter */}
          {['all', 'active', 'inactive', 'expiring'].map(key => (
            <Button
              key={key}
              size="sm"
              variant={filterStatus === key ? 'secondary' : 'outline-secondary'}
              className="py-0 px-2"
              style={{ fontSize: '0.75rem' }}
              onClick={() => setFilterStatus(key)}
            >
              {key === 'all' ? 'All Status' : key.charAt(0).toUpperCase() + key.slice(1)}
            </Button>
          ))}

          {(filterProv !== 'all' || filterStatus !== 'all') && (
            <Button
              size="sm"
              variant="link"
              className="text-muted py-0 px-1"
              style={{ fontSize: '0.75rem' }}
              onClick={() => { setFilterProv('all'); setFilterStatus('all'); }}
            >
              ✕ Clear
            </Button>
          )}

          <span className="ms-auto small text-muted">{filtered.length} of {connections.length}</span>
        </div>
      )}

      {/* ── Main content ── */}
      <Row>
        <Col lg={selected ? 4 : 12}>
          {filtered.length === 0 && connections.length === 0 ? (
            <EmptyState onConnect={() => setConnectModal(true)} />
          ) : filtered.length === 0 ? (
            <Alert variant="secondary" className="text-center py-4">
              <div className="mb-2 text-muted"><Ico icon="tabler:filter-off" size={32} /></div>
              <div>No connections match the current filter.</div>
              <Button variant="link" size="sm" onClick={() => { setFilterProv('all'); setFilterStatus('all'); }}>
                Clear filter
              </Button>
            </Alert>
          ) : (
            <Row className="g-3">
              {filtered.map(conn => (
                <Col key={conn.id} md={selected ? 12 : 4} lg={selected ? 12 : 4} xl={selected ? 12 : 3}>
                  <ConnectionCard
                    conn={conn}
                    selected={selected?.id === conn.id}
                    onSelect={() => setSelected(conn.id === selected?.id ? null : conn)}
                    onDisconnect={handleDisconnect}
                    onToggleActive={handleToggleActive}
                    onFlash={showFlash}
                    onReload={loadConnections}
                  />
                </Col>
              ))}
            </Row>
          )}
        </Col>

        {selected && (
          <Col lg={8}>
            <ConnectionDetail
              connection={selected}
              onFlash={showFlash}
              onClose={() => setSelected(null)}
              onReload={() => {
                loadConnections();
                setSelected(prev => connections.find(c => c.id === prev?.id) ?? null);
              }}
            />
          </Col>
        )}
      </Row>

      <ConnectModal
        show={connectModal}
        form={connectForm}
        setForm={setConnectForm}
        businesses={businesses}
        connecting={connecting}
        onConnect={handleConnect}
        onHide={() => setConnectModal(false)}
      />
    </Container>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
function EmptyState({ onConnect }) {
  return (
    <Card className="text-center border-0 shadow-sm py-5">
      <Card.Body>
        <div className="mb-3 d-flex justify-content-center gap-2 flex-wrap">
          {Object.entries(PROVIDER_META).map(([k]) => (
            <span key={k} title={PROVIDER_META[k].label} className="text-secondary">
              <ProviderIcon provider={k} size={32} />
            </span>
          ))}
        </div>
        <h5 className="fw-bold">No POS systems connected</h5>
        <p className="text-muted mb-4 mx-auto" style={{ maxWidth: 420 }}>
          Connect Square, Clover, Toast, SpotOn, POSLavu or Deliverect to sync
          your menu catalog, process payments, and push orders.
        </p>
        <Button variant="primary" onClick={onConnect}>
          + Connect your first POS
        </Button>

        <Row className="g-3 mt-4 text-start">
          {Object.entries(PROVIDER_META).map(([key, m]) => (
            <Col md={4} key={key}>
              <div className="border rounded p-3 h-100">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <ProviderIcon provider={key} size={20} />
                  <span className="fw-semibold small">{m.label}</span>
                  <Badge bg={m.badge} className="ms-auto small">{m.authType === 'oauth' ? 'OAuth' : 'API Key'}</Badge>
                </div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>{m.description}</div>
                <div className="d-flex gap-1 flex-wrap mt-2">
                  {m.features.map(f => (
                    <span key={f} className="badge bg-light text-dark border" style={{ fontSize: '0.65rem' }}>{f}</span>
                  ))}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card.Body>
    </Card>
  );
}

// ── Credentials Check Panel ────────────────────────────────────────────────────
function CredentialCheckPanel({ result, onClose }) {
  const [showWebhooks, setShowWebhooks] = useState(false);
  const providerKeys = Object.keys(PROVIDER_META);

  return (
    <Card className="mb-4 border-0 shadow-sm">
      <Card.Body className="py-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0 fw-semibold d-flex align-items-center gap-2"><Ico icon="tabler:shield-lock" size={18} /> Credentials & Connection Status</h6>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" size="sm" onClick={() => setShowWebhooks(v => !v)}>
              {showWebhooks ? 'Hide' : 'Show'} Webhook URLs
            </Button>
            <Button variant="link" size="sm" className="p-0 text-muted" onClick={onClose}>✕</Button>
          </div>
        </div>

        <Row className="g-2 mb-3">
          {providerKeys.map(prov => {
            const d = result[prov];
            if (!d) return null;
            const m = PROVIDER_META[prov];
            return (
              <Col xs={6} md={4} lg={2} key={prov}>
                <div className={`border rounded p-2 h-100 ${d.credentials_ok ? '' : 'border-danger-subtle bg-danger-subtle bg-opacity-10'}`}>
                  <div className="d-flex align-items-center gap-1 mb-2">
                    <ProviderIcon provider={prov} size={16} />
                    <span className="fw-semibold small">{m.label}</span>
                  </div>
                  <div className="small d-flex justify-content-between mb-1">
                    <span className="text-muted">App ID</span>
                    <span className={d.app_id ? 'text-success' : 'text-danger'}>
                      <Ico icon={d.app_id ? 'tabler:check' : 'tabler:x'} size={14} />
                    </span>
                  </div>
                  <div className="small d-flex justify-content-between mb-1">
                    <span className="text-muted">Secret</span>
                    <span className={d.app_secret ? 'text-success' : 'text-danger'}>
                      <Ico icon={d.app_secret ? 'tabler:check' : 'tabler:x'} size={14} />
                    </span>
                  </div>
                  <div className="small d-flex justify-content-between mb-2">
                    <span className="text-muted">Env</span>
                    <Badge bg={d.environment === 'production' ? 'success' : 'warning'} style={{ fontSize: '0.6rem' }}>
                      {d.environment ?? '—'}
                    </Badge>
                  </div>
                  {d.credentials_ok
                    ? <span className="badge bg-success-subtle text-success w-100 text-center d-flex align-items-center justify-content-center gap-1"><Ico icon="tabler:check" size={12} />Ready</span>
                    : <span className="badge bg-danger-subtle text-danger w-100 text-center d-flex align-items-center justify-content-center gap-1"><Ico icon="tabler:x" size={12} />Missing</span>
                  }
                </div>
              </Col>
            );
          })}
        </Row>

        {/* Live API tests */}
        {result.connections?.length > 0 && (
          <div className="border rounded p-3 mb-3">
            <div className="fw-semibold mb-2 small d-flex align-items-center gap-2"><Ico icon="tabler:wifi" size={15} />Live API Ping Results</div>
            <Row className="g-2">
              {result.connections.map((c, i) => {
                const m = PROVIDER_META[c.provider];
                return (
                  <Col xs={12} sm={6} md={4} key={i}>
                    <div className={`rounded px-3 py-2 border small d-flex align-items-center gap-2 ${c.status === 'ok' ? 'border-success-subtle bg-success-subtle bg-opacity-10' : 'border-danger-subtle bg-danger-subtle bg-opacity-10'}`}>
                      <ProviderIcon provider={c.provider} size={16} />
                      <div className="flex-grow-1">
                        <div className="fw-semibold">{m?.label ?? c.provider}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>Biz #{c.business_id}</div>
                      </div>
                      {c.status === 'ok'
                        ? <Badge bg="success" className="ms-auto d-flex align-items-center gap-1">
                            <Ico icon="tabler:check" size={11} />{c.locations != null ? `${c.locations} loc` : c.merchant ?? 'Live'}
                          </Badge>
                        : <OverlayTrigger overlay={<Tooltip>{c.error}</Tooltip>}>
                            <Badge bg="danger" className="ms-auto d-flex align-items-center gap-1" style={{ cursor: 'help' }}><Ico icon="tabler:x" size={11} />Error</Badge>
                          </OverlayTrigger>
                      }
                    </div>
                  </Col>
                );
              })}
            </Row>
          </div>
        )}

        {/* Webhook URLs (collapsible) */}
        {showWebhooks && result.oauth_callback_url && (
          <div className="border rounded p-3">
            <div className="fw-semibold mb-2 small d-flex align-items-center gap-2"><Ico icon="tabler:link" size={15} />OAuth Callback & Webhook URLs</div>
            <p className="text-muted small mb-2">Register these in each provider's developer portal:</p>
            <Table size="sm" className="mb-0">
              <thead className="table-light">
                <tr><th style={{ width: 100 }}>Provider</th><th>Callback / Webhook URL</th><th></th></tr>
              </thead>
              <tbody>
                {Object.entries(result.oauth_callback_url).map(([k, v]) => (
                  <tr key={k}>
                    <td className="fw-semibold text-capitalize small">{PROVIDER_META[k]?.label ?? k}</td>
                    <td><code className="small">{v}</code></td>
                    <td>
                      <Button size="sm" variant="link" className="p-0" onClick={() => navigator.clipboard?.writeText(v)}>
                        <Ico icon="tabler:clipboard" size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
                {Object.keys(PROVIDER_META).map(k => (
                  <tr key={'wh_' + k}>
                    <td className="small text-muted">{PROVIDER_META[k].label} WH</td>
                    <td><code className="small">{window.location.origin}/api/webhooks/pos/{k}</code></td>
                    <td>
                      <Button size="sm" variant="link" className="p-0" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/api/webhooks/pos/${k}`)}>
                        <Ico icon="tabler:clipboard" size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

// ── Connection Card ────────────────────────────────────────────────────────────
function ConnectionCard({ conn, selected, onSelect, onDisconnect, onToggleActive, onFlash, onReload }) {
  const meta        = PROVIDER_META[conn.provider] ?? { label: conn.provider, badge: 'secondary' };
  const expDays     = daysUntilExpiry(conn.expires_at);
  const isExpiring  = expDays !== null && expDays <= 7 && expDays >= 0;
  const isExpired   = expDays !== null && expDays < 0;
  const [syncing,   setSyncing] = useState(false);

  const quickSync = async (e) => {
    e.stopPropagation();
    setSyncing(true);
    try {
      const res = await api(`/ecommerce/pos/${conn.id}/push-catalog`, { method: 'POST' });
      onFlash(res.data.message);
      onReload();
    } catch (ex) {
      onFlash(ex.response?.data?.message ?? 'Sync failed.', 'danger');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card
      className={`h-100 transition-shadow ${selected ? 'border-primary shadow' : 'shadow-sm'}`}
      onClick={onSelect}
      style={{ cursor: 'pointer', borderWidth: selected ? 2 : 1 }}
    >
      {/* ── Token expiry warning banner ── */}
      {(isExpiring || isExpired) && (
        <div className={`px-3 py-1 small d-flex align-items-center gap-1 ${isExpired ? 'bg-danger text-white' : 'bg-warning text-dark'}`}
          style={{ borderRadius: '4px 4px 0 0', fontSize: '0.7rem' }}>
          <Ico icon={isExpired ? 'tabler:alert-triangle' : 'tabler:clock-exclamation'} size={13} />
          {isExpired ? 'Token expired — reconnect required' : `Token expires in ${expDays} day${expDays !== 1 ? 's' : ''}`}
        </div>
      )}

      <Card.Header className="d-flex align-items-center gap-2 py-2" style={{ background: 'transparent' }}>
        <ProviderIcon provider={conn.provider} size={20} />
        <span className="fw-bold small">{meta.label}</span>
        <Badge bg={conn.is_active ? 'success' : 'secondary'} className="ms-auto small">
          {conn.is_active ? 'Active' : 'Paused'}
        </Badge>
      </Card.Header>

      <Card.Body className="py-2 px-3">
        <div className="small text-muted">Business</div>
        <div className="fw-semibold mb-2 text-truncate" style={{ maxWidth: '100%' }}>
          {conn.business_name ?? `#${conn.business_id}`}
        </div>

        {conn.location_name && (
          <div className="small text-muted mb-2 text-truncate d-flex align-items-center gap-1">
            <Ico icon="tabler:map-pin" size={13} />{conn.location_name}
          </div>
        )}

        {/* Stats row */}
        <div className="d-flex gap-2 align-items-center flex-wrap mb-2">
          <span className="badge bg-light text-dark border small d-inline-flex align-items-center gap-1">
            <Ico icon="tabler:package" size={12} />{conn.catalog_count ?? 0} synced
          </span>
          <span className="badge bg-light text-dark border small d-inline-flex align-items-center gap-1">
            <Ico icon={meta.authType === 'oauth' ? 'tabler:key' : 'tabler:lock'} size={12} />{meta.authType === 'oauth' ? 'OAuth' : 'API Key'}
          </span>
        </div>

        <div className="small text-muted">
          Connected {conn.connected_at ? new Date(conn.connected_at).toLocaleDateString() : '—'}
        </div>
      </Card.Body>

      <Card.Footer className="bg-transparent d-flex align-items-center gap-1 py-2 px-3"
        onClick={e => e.stopPropagation()}>
        <OverlayTrigger overlay={<Tooltip>Quick sync menu → POS</Tooltip>}>
          <Button size="sm" variant="outline-primary" onClick={quickSync} disabled={syncing || !conn.is_active}
            style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
            {syncing ? <Spinner size="sm" style={{ width: 10, height: 10 }} /> : <Ico icon="tabler:refresh" size={13} />}
          </Button>
        </OverlayTrigger>
        <Button
          size="sm"
          variant={conn.is_active ? 'outline-warning' : 'outline-success'}
          onClick={() => onToggleActive(conn)}
          style={{ fontSize: '0.7rem', padding: '2px 6px' }}
        >
          {conn.is_active ? 'Pause' : 'Resume'}
        </Button>
        <Button
          size="sm"
          variant="outline-danger"
          onClick={() => onDisconnect(conn)}
          style={{ fontSize: '0.7rem', padding: '2px 6px' }}
          className="ms-auto"
        >
          Disconnect
        </Button>
      </Card.Footer>
    </Card>
  );
}

// ── Connection Detail Panel ────────────────────────────────────────────────────
function ConnectionDetail({ connection, onFlash, onClose, onReload }) {
  const [tab, setTab] = useState('catalog');
  const prov     = connection.provider;
  const meta     = PROVIDER_META[prov] ?? {};
  const expDays  = daysUntilExpiry(connection.expires_at);

  return (
    <Card className="shadow-sm">
      {/* ── Detail header ── */}
      <Card.Header className="py-3">
        <div className="d-flex align-items-start">
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2 mb-1">
              <ProviderIcon provider={prov} size={28} />
              <span className="fw-bold fs-5">{meta.label}</span>
              <Badge bg={connection.is_active ? 'success' : 'secondary'}>
                {connection.is_active ? 'Active' : 'Paused'}
              </Badge>
              {expDays !== null && expDays <= 7 && (
                <Badge bg={expDays < 0 ? 'danger' : 'warning'} text={expDays < 0 ? undefined : 'dark'}>
                  {expDays < 0 ? 'Token Expired' : `Expires in ${expDays}d`}
                </Badge>
              )}
            </div>
            <div className="d-flex gap-3 small text-muted flex-wrap">
              <span className="d-flex align-items-center gap-1"><Ico icon="tabler:building-store" size={14} />{connection.business_name ?? `#${connection.business_id}`}</span>
              {connection.location_name && <span className="d-flex align-items-center gap-1"><Ico icon="tabler:map-pin" size={14} />{connection.location_name}</span>}
              {connection.merchant_id   && <span className="d-flex align-items-center gap-1"><Ico icon="tabler:id" size={14} /><code>{connection.merchant_id}</code></span>}
              <span className="d-flex align-items-center gap-1"><Ico icon="tabler:package" size={14} />{connection.catalog_count ?? 0} items mapped</span>
            </div>
          </div>
          <Button variant="link" size="sm" className="text-muted p-0 ms-2" onClick={onClose}>✕</Button>
        </div>
      </Card.Header>

      <Tab.Container activeKey={tab} onSelect={setTab}>
        <Nav variant="tabs" className="px-3 pt-2 border-bottom-0">
          <Nav.Item><Nav.Link eventKey="catalog" className="d-flex align-items-center gap-1"><Ico icon="tabler:refresh" size={14} />Menu Sync</Nav.Link></Nav.Item>
          {prov === 'square' && <Nav.Item><Nav.Link eventKey="payment" className="d-flex align-items-center gap-1"><Ico icon="tabler:credit-card" size={14} />Terminal</Nav.Link></Nav.Item>}
          {['toast', 'spoton', 'poslavu', 'clover', 'deliverect'].includes(prov) && (
            <Nav.Item><Nav.Link eventKey="checkout" className="d-flex align-items-center gap-1"><Ico icon="tabler:send" size={14} />Create Order</Nav.Link></Nav.Item>
          )}
          <Nav.Item><Nav.Link eventKey="maps" className="d-flex align-items-center gap-1"><Ico icon="tabler:map-2" size={14} />Catalog Maps</Nav.Link></Nav.Item>
          {prov === 'square'     && <Nav.Item><Nav.Link eventKey="locations" className="d-flex align-items-center gap-1"><Ico icon="tabler:map-pin" size={14} />Locations</Nav.Link></Nav.Item>}
          {prov === 'deliverect' && <Nav.Item><Nav.Link eventKey="channels" className="d-flex align-items-center gap-1"><Ico icon="tabler:rocket" size={14} />Channels</Nav.Link></Nav.Item>}
          <Nav.Item><Nav.Link eventKey="orders" className="d-flex align-items-center gap-1"><Ico icon="tabler:receipt" size={14} />POS Orders</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="setup" className="d-flex align-items-center gap-1"><Ico icon="tabler:settings" size={14} />Setup</Nav.Link></Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="catalog" className="p-3">
            <CatalogSyncPanel connection={connection} onFlash={onFlash} onReload={onReload} />
          </Tab.Pane>
          {prov === 'square' && (
            <Tab.Pane eventKey="payment" className="p-3">
              <TerminalPaymentPanel connection={connection} onFlash={onFlash} />
            </Tab.Pane>
          )}
          {['toast', 'spoton', 'poslavu', 'clover', 'deliverect'].includes(prov) && (
            <Tab.Pane eventKey="checkout" className="p-3">
              <CreateOrderPanel connection={connection} onFlash={onFlash} />
            </Tab.Pane>
          )}
          <Tab.Pane eventKey="maps" className="p-3">
            <CatalogMapsPanel connection={connection} onFlash={onFlash} />
          </Tab.Pane>
          {prov === 'square' && (
            <Tab.Pane eventKey="locations" className="p-3">
              <LocationsPanel connection={connection} onFlash={onFlash} onReload={onReload} />
            </Tab.Pane>
          )}
          {prov === 'deliverect' && (
            <Tab.Pane eventKey="channels" className="p-3">
              <ChannelLinksPanel connection={connection} onFlash={onFlash} />
            </Tab.Pane>
          )}
          <Tab.Pane eventKey="orders" className="p-3">
            <PosOrdersPanel connection={connection} onFlash={onFlash} />
          </Tab.Pane>
          <Tab.Pane eventKey="setup" className="p-3">
            <SetupGuidePanel connection={connection} />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Card>
  );
}

// ── Catalog Sync Panel ─────────────────────────────────────────────────────────
function CatalogSyncPanel({ connection, onFlash, onReload }) {
  const [pushing, setPushing]   = useState(false);
  const [pulling, setPulling]   = useState(false);
  const [result,  setResult]    = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const provider = PROVIDER_META[connection.provider]?.label ?? connection.provider;

  const run = async (action) => {
    const setter = action === 'push' ? setPushing : setPulling;
    setter(true); setResult(null);
    try {
      const endpoint = action === 'push' ? 'push-catalog' : 'pull-catalog';
      const res = await api(`/ecommerce/pos/${connection.id}/${endpoint}`, { method: 'POST' });
      setResult({ type: action, ...res.data });
      setLastSync(new Date().toLocaleTimeString());
      onFlash(res.data.message);
      onReload();
    } catch (e) {
      onFlash(e.response?.data?.message ?? `${action === 'push' ? 'Push' : 'Pull'} failed.`, 'danger');
    } finally {
      setter(false);
    }
  };

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <p className="text-muted small mb-0">
          Sync your menu items with {provider}.
          {connection.provider === 'deliverect' && (
            <span className="ms-1 text-warning fw-semibold d-inline-flex align-items-center gap-1"><Ico icon="tabler:alert-triangle" size={13} />Push replaces the entire menu for the active location.</span>
          )}
        </p>
        {lastSync && <small className="text-muted">Last sync: {lastSync}</small>}
      </div>

      <Row className="g-3 mb-3">
        <Col sm={6}>
          <Card className="h-100 border text-center p-3">
            <div className="text-primary"><Ico icon="tabler:cloud-upload" size={40} /></div>
            <h6 className="mt-2 mb-1">Push to {provider}</h6>
            <p className="small text-muted mb-3">
              Upload your active local menu items to {provider}.<br />
              Creates or updates existing catalog entries.
            </p>
            <Button variant="primary" onClick={() => run('push')} disabled={pushing || pulling}>
              {pushing ? <><Spinner size="sm" className="me-2" />Pushing…</> : `Push Menu → ${provider}`}
            </Button>
          </Card>
        </Col>
        <Col sm={6}>
          <Card className="h-100 border text-center p-3">
            <div className="text-info"><Ico icon="tabler:cloud-download" size={40} /></div>
            <h6 className="mt-2 mb-1">Pull from {provider}</h6>
            <p className="small text-muted mb-3">
              Import {provider}'s catalog into your local menu.<br />
              Updates prices on existing matches.
            </p>
            <Button variant="outline-primary" onClick={() => run('pull')} disabled={pushing || pulling}>
              {pulling ? <><Spinner size="sm" className="me-2" />Pulling…</> : `Pull ${provider} → Menu`}
            </Button>
          </Card>
        </Col>
      </Row>

      {result && (
        <Alert variant={result.errors?.length ? 'warning' : 'success'} className="mb-0">
          <div className="d-flex align-items-center gap-2 mb-1">
            <strong>{result.message}</strong>
            {result.type === 'push' && result.pushed != null && (
              <Badge bg="success">{result.pushed} pushed</Badge>
            )}
            {result.type === 'pull' && result.imported != null && (
              <Badge bg="info">{result.imported} imported</Badge>
            )}
          </div>
          {result.errors?.length > 0 && (
            <details className="mt-2">
              <summary className="small text-muted" style={{ cursor: 'pointer' }}>
                {result.errors.length} error{result.errors.length > 1 ? 's' : ''} — click to expand
              </summary>
              <ul className="mb-0 mt-2 small">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </Alert>
      )}
    </>
  );
}

// ── Square Terminal Payment Panel ─────────────────────────────────────────────
function TerminalPaymentPanel({ connection, onFlash }) {
  const [orderId,  setOrderId]  = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [devices,  setDevices]  = useState([]);
  const [checkout, setCheckout] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    api(`/ecommerce/pos/${connection.id}/devices`)
      .then(r => setDevices(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    return () => clearInterval(pollRef.current);
  }, [connection.id]);

  const startCheckout = async () => {
    if (!orderId) return onFlash('Enter an order ID.', 'warning');
    setLoading(true);
    try {
      const res = await api(`/ecommerce/pos/${connection.id}/checkout`, {
        method: 'POST',
        data: { order_id: parseInt(orderId), device_id: deviceId || undefined },
      });
      setCheckout(res.data);
      onFlash('Terminal checkout started — waiting for card on device.');
      pollRef.current = setInterval(async () => {
        try {
          const sr = await api(`/ecommerce/pos/${connection.id}/checkout/${res.data.checkout_id}/status`);
          setCheckout(prev => ({ ...prev, status: sr.data.status, payment_id: sr.data.payment_id }));
          if (['COMPLETED', 'CANCELED'].includes(sr.data.status)) {
            clearInterval(pollRef.current);
            if (sr.data.status === 'COMPLETED') onFlash('Payment completed!');
          }
        } catch { clearInterval(pollRef.current); }
      }, 3000);
    } catch (e) {
      onFlash(e.response?.data?.message ?? 'Failed to start checkout.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const cancelCheckout = async () => {
    if (!checkout?.checkout_id) return;
    try {
      await api(`/ecommerce/pos/${connection.id}/checkout/${checkout.checkout_id}/cancel`, { method: 'POST' });
      setCheckout(prev => ({ ...prev, status: 'CANCEL_REQUESTED' }));
      clearInterval(pollRef.current);
    } catch { onFlash('Failed to cancel.', 'danger'); }
  };

  const STATUS_COLOR = {
    PENDING: 'warning', IN_PROGRESS: 'info', COMPLETED: 'success',
    CANCELED: 'secondary', CANCEL_REQUESTED: 'secondary',
  };

  return (
    <>
      <p className="text-muted small mb-3">
        Send an order to a Square Terminal reader for in-person card / NFC payment.
        The terminal displays the total and handles the payment flow.
      </p>
      <Row className="g-3 mb-3">
        <Col sm={6}>
          <Form.Group>
            <Form.Label className="small fw-semibold">Order ID</Form.Label>
            <Form.Control type="number" placeholder="e.g. 42" value={orderId}
              onChange={e => setOrderId(e.target.value)} />
          </Form.Group>
        </Col>
        <Col sm={6}>
          <Form.Group>
            <Form.Label className="small fw-semibold">
              Terminal Device
              {devices.length === 0 && <span className="text-muted ms-1">(no devices found)</span>}
            </Form.Label>
            <Form.Select value={deviceId} onChange={e => setDeviceId(e.target.value)}>
              <option value="">— Any available device —</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.name ?? d.id}</option>)}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Button variant="success" onClick={startCheckout}
        disabled={loading || checkout?.status === 'IN_PROGRESS'}>
        {loading ? <><Spinner size="sm" className="me-2" />Starting…</> : <><Ico icon="tabler:credit-card" className="me-1" />Send to Terminal</>}
      </Button>

      {checkout && (
        <Card className="mt-3 border">
          <Card.Header className="py-2 d-flex align-items-center gap-2">
            <span className="small fw-semibold">Checkout</span>
            <Badge bg={STATUS_COLOR[checkout.status] ?? 'secondary'} className="ms-auto">
              {checkout.status}
              {['PENDING', 'IN_PROGRESS'].includes(checkout.status) && (
                <Spinner size="sm" className="ms-1" style={{ width: 10, height: 10 }} />
              )}
            </Badge>
            {['PENDING', 'IN_PROGRESS'].includes(checkout.status) && (
              <Button size="sm" variant="outline-danger" onClick={cancelCheckout}>Cancel</Button>
            )}
          </Card.Header>
          <Card.Body className="py-2">
            <Row className="g-2 small">
              <Col xs={6}><span className="text-muted">Checkout ID</span><br /><code>{checkout.checkout_id}</code></Col>
              <Col xs={3}><span className="text-muted">Amount</span><br /><strong>${checkout.amount}</strong></Col>
              <Col xs={3}>
                <span className="text-muted">POS Order</span><br />
                <code className="small">{checkout.pos_order_id?.slice(0, 8)}…</code>
              </Col>
              {checkout.payment_id && (
                <Col xs={12}><span className="text-muted">Payment ID: </span><code>{checkout.payment_id}</code></Col>
              )}
            </Row>
          </Card.Body>
        </Card>
      )}
    </>
  );
}

// ── Generic Create Order Panel ─────────────────────────────────────────────────
function CreateOrderPanel({ connection, onFlash }) {
  const [orderId, setOrderId] = useState('');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const provider = PROVIDER_META[connection.provider]?.label ?? connection.provider;

  const createOrder = async () => {
    if (!orderId) return onFlash('Enter an order ID.', 'warning');
    setLoading(true); setResult(null);
    try {
      const res = await api(`/ecommerce/pos/${connection.id}/checkout`, {
        method: 'POST', data: { order_id: parseInt(orderId) },
      });
      setResult(res.data);
      onFlash(`Order sent to ${provider} successfully.`);
    } catch (e) {
      onFlash(e.response?.data?.message ?? 'Failed to send order.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const notes = {
    toast:      { desc: 'Creates a Toast order and sends it to the KDS. Payment is completed by staff at the Toast terminal.' },
    spoton:     { desc: 'Creates a SpotOn order visible in the SpotOn dashboard. Staff completes payment at the SpotOn terminal.' },
    poslavu:    { desc: 'Creates a POSLavu order on the iPad POS. Staff selects payment method at the device.' },
    clover:     { desc: 'Creates a Clover order. Staff completes payment at the Clover station. Use the Clover POS URL to open it directly.' },
    deliverect: { desc: 'Injects this order into Deliverect to be dispatched to delivery channels (Uber Eats, DoorDash, etc.).' },
  };

  const note = notes[connection.provider];

  return (
    <>
      {note && (
        <Alert variant="secondary" className="py-2 mb-3 small d-flex align-items-start gap-2">
          <ProviderIcon provider={connection.provider} size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{note.desc}</span>
        </Alert>
      )}
      <Row className="g-3 mb-3">
        <Col sm={5}>
          <Form.Group>
            <Form.Label className="small fw-semibold">Order ID</Form.Label>
            <Form.Control type="number" placeholder="e.g. 42" value={orderId}
              onChange={e => setOrderId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createOrder()} />
          </Form.Group>
        </Col>
        <Col sm={4} className="d-flex align-items-end">
          <Button variant="primary" onClick={createOrder} disabled={loading} className="w-100">
            {loading ? <><Spinner size="sm" className="me-2" />Sending…</> : <><Ico icon="tabler:send" className="me-1" />Send to {provider}</>}
          </Button>
        </Col>
      </Row>

      {result && (
        <Card className="border">
          <Card.Header className="py-2 d-flex align-items-center gap-2 small fw-semibold">
            <Ico icon="tabler:circle-check-filled" size={16} className="text-success" />Order Created
            {result.status && <Badge bg="info" className="ms-auto">{result.status}</Badge>}
          </Card.Header>
          <Card.Body className="py-2">
            <Row className="g-2 small">
              {result.pos_order_id && (
                <Col xs={12} sm={6}>
                  <span className="text-muted">POS Order ID</span><br />
                  <code>{result.pos_order_id}</code>
                </Col>
              )}
              {result.check_guid && (
                <Col xs={12} sm={6}>
                  <span className="text-muted">Check GUID (Toast)</span><br />
                  <code>{result.check_guid}</code>
                </Col>
              )}
              {result.amount && (
                <Col xs={6} sm={3}>
                  <span className="text-muted">Amount</span><br />
                  <strong>${result.amount}</strong>
                </Col>
              )}
              {result.clover_url && (
                <Col xs={12}>
                  <span className="text-muted">Open in Clover → </span>
                  <a href={result.clover_url} target="_blank" rel="noreferrer">{result.clover_url}</a>
                </Col>
              )}
            </Row>
          </Card.Body>
        </Card>
      )}
    </>
  );
}

// ── Catalog Maps Panel ─────────────────────────────────────────────────────────
function CatalogMapsPanel({ connection, onFlash }) {
  const [maps,    setMaps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api(`/ecommerce/pos/${connection.id}/catalog-maps`);
      setMaps(Array.isArray(res.data) ? res.data : []);
    } catch { onFlash('Failed to load catalog maps.', 'danger'); }
    finally { setLoading(false); }
  }, [connection.id]);

  useEffect(() => { load(); }, [load]);

  const unlink = async (map) => {
    if (!confirm('Unlink this catalog map? The POS item will not be deleted.')) return;
    try {
      await api(`/ecommerce/pos/${connection.id}/catalog-maps/${map.id}`, { method: 'DELETE' });
      setMaps(prev => prev.filter(m => m.id !== map.id));
      onFlash('Map unlinked.');
    } catch { onFlash('Failed to unlink.', 'danger'); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? maps.filter(m => m.pos_item_name?.toLowerCase().includes(q) || m.menu_item?.name?.toLowerCase().includes(q)) : maps;
  }, [maps, search]);

  if (loading) return <div className="py-3 text-center"><Spinner size="sm" /></div>;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="small text-muted">
          {maps.length} item{maps.length !== 1 ? 's' : ''} mapped between local menu and {PROVIDER_META[connection.provider]?.label ?? connection.provider}
        </div>
        <Button size="sm" variant="outline-secondary" onClick={load} className="d-flex align-items-center gap-1"><Ico icon="tabler:refresh" size={13} />Refresh</Button>
      </div>

      {maps.length === 0 ? (
        <Alert variant="info" className="mb-0">
          No catalog maps yet. Use <strong>Menu Sync → Push</strong> to create mappings.
        </Alert>
      ) : (
        <>
          <Form.Control
            size="sm"
            placeholder="Search items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-2"
          />
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            <Table size="sm" hover className="mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th>Local Item</th>
                  <th>POS Item ID</th>
                  <th>Price</th>
                  <th>Synced</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const stale = !m.synced_at;
                  return (
                    <tr key={m.id} className={stale ? 'table-warning' : ''}>
                      <td>
                        {m.menu_item
                          ? <span>{m.menu_item.name} <span className="text-muted small">#{m.menu_item_id}</span></span>
                          : <span className="text-muted fst-italic">Unlinked POS item</span>
                        }
                      </td>
                      <td>
                        <code className="small">{m.pos_item_id?.length > 20
                          ? m.pos_item_id.slice(0, 10) + '…' + m.pos_item_id.slice(-6)
                          : m.pos_item_id}
                        </code>
                      </td>
                      <td className="fw-semibold">${Number(m.pos_item_price).toFixed(2)}</td>
                      <td className="text-muted small">
                        {stale
                          ? <Badge bg="warning" text="dark" style={{ fontSize: '0.65rem' }}>Stale</Badge>
                          : new Date(m.synced_at).toLocaleDateString()
                        }
                      </td>
                      <td>
                        <Button size="sm" variant="link" className="text-danger p-0" onClick={() => unlink(m)}>
                          unlink
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            {filtered.length === 0 && (
              <div className="text-center py-3 text-muted small">No items match "{search}"</div>
            )}
          </div>
          <div className="small text-muted mt-1">
            Showing {filtered.length} of {maps.length} —
            <span className="ms-1 text-warning">yellow rows</span> = stale (need re-sync)
          </div>
        </>
      )}
    </>
  );
}

// ── POS Orders Panel ───────────────────────────────────────────────────────────
function PosOrdersPanel({ connection }) {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/ecommerce/orders/0/pos-orders`)
      .then(() => {})
      .catch(() => {});
    // Load POS orders for this connection's provider from stored pos_orders
    api(`/ecommerce/pos/orders?business_id=${connection.business_id}&provider=${connection.provider}`)
      .then(r => setOrders(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [connection.id, connection.business_id, connection.provider]);

  const STATUS_COLORS = {
    COMPLETED: 'success', completed: 'success', delivered: 'success',
    OPEN: 'warning',      open: 'warning',      received: 'warning',
    paid: 'success',      in_kitchen: 'info',   ready: 'primary',
    cancelled: 'secondary', CANCELLED: 'secondary',
  };

  if (loading) return <div className="py-3 text-center"><Spinner size="sm" /></div>;

  return (
    <>
      <p className="text-muted small mb-3">
        Orders that have been sent to {PROVIDER_META[connection.provider]?.label ?? connection.provider} from this system.
      </p>
      {orders.length === 0 ? (
        <Alert variant="secondary" className="mb-0">
          No POS orders yet. Use <strong>Create Order</strong> or <strong>Terminal</strong> to send orders to the POS.
        </Alert>
      ) : (
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <Table size="sm" hover className="mb-0">
            <thead className="table-light sticky-top">
              <tr>
                <th>Local Order</th>
                <th>POS Order ID</th>
                <th>Payment ID</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>{o.order_id ? <code>#{o.order_id}</code> : <span className="text-muted">—</span>}</td>
                  <td><code className="small">{o.pos_order_id?.slice(0, 16)}…</code></td>
                  <td>
                    {o.pos_payment_id
                      ? <code className="small">{o.pos_payment_id.slice(0, 12)}…</code>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td>
                    <Badge bg={STATUS_COLORS[o.pos_status] ?? 'secondary'} style={{ fontSize: '0.65rem' }}>
                      {o.pos_status}
                    </Badge>
                  </td>
                  <td className="text-muted small">
                    {o.synced_at ? new Date(o.synced_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </>
  );
}

// ── Setup Guide Panel ─────────────────────────────────────────────────────────
function SetupGuidePanel({ connection }) {
  const prov = connection.provider;
  const meta = PROVIDER_META[prov] ?? {};

  return (
    <>
      <p className="text-muted small mb-3">
        Setup reference for <strong>{meta.label}</strong> integration.
      </p>

      {/* Setup steps */}
      <h6 className="fw-semibold small mb-2 d-flex align-items-center gap-2"><Ico icon="tabler:checklist" size={16} />Setup Checklist</h6>
      <ListGroup className="mb-4" variant="flush">
        {(meta.setupHints ?? []).map((hint, i) => (
          <ListGroup.Item key={i} className="px-0 py-2 small d-flex align-items-start gap-2 border-0 border-bottom">
            <Ico icon="tabler:check" size={15} className="text-success mt-1 flex-shrink-0" />
            <span>{hint}</span>
          </ListGroup.Item>
        ))}
      </ListGroup>

      {/* Connection details */}
      <h6 className="fw-semibold small mb-2 d-flex align-items-center gap-2"><Ico icon="tabler:plug-connected" size={16} />Connection Details</h6>
      <Table size="sm" borderless>
        <tbody>
          <tr>
            <td className="text-muted small" style={{ width: 150 }}>Provider</td>
            <td><Badge bg={meta.badge ?? 'secondary'} className="d-inline-flex align-items-center gap-1"><ProviderIcon provider={prov} size={12} />{meta.label}</Badge></td>
          </tr>
          <tr>
            <td className="text-muted small">Auth Type</td>
            <td><code className="small">{meta.authType}</code></td>
          </tr>
          {connection.merchant_id && (
            <tr>
              <td className="text-muted small">Merchant / Account ID</td>
              <td>
                <code className="small">{connection.merchant_id}</code>
                <Button size="sm" variant="link" className="p-0 ms-1"
                  onClick={() => navigator.clipboard?.writeText(connection.merchant_id)}><Ico icon="tabler:clipboard" size={13} /></Button>
              </td>
            </tr>
          )}
          {connection.location_id && (
            <tr>
              <td className="text-muted small">Location ID</td>
              <td><code className="small">{connection.location_id}</code></td>
            </tr>
          )}
          {connection.expires_at && (
            <tr>
              <td className="text-muted small">Token Expires</td>
              <td>
                <span className={daysUntilExpiry(connection.expires_at) <= 7 ? 'text-warning fw-semibold' : ''}>
                  {new Date(connection.expires_at).toLocaleString()}
                </span>
                {daysUntilExpiry(connection.expires_at) <= 7 && (
                  <Badge bg="warning" text="dark" className="ms-2 small">Reconnect soon</Badge>
                )}
              </td>
            </tr>
          )}
          <tr>
            <td className="text-muted small">Connected</td>
            <td className="small">{connection.connected_at ? new Date(connection.connected_at).toLocaleString() : '—'}</td>
          </tr>
          <tr>
            <td className="text-muted small">Items Mapped</td>
            <td><Badge bg="info">{connection.catalog_count ?? 0}</Badge></td>
          </tr>
        </tbody>
      </Table>

      {/* Webhook URLs */}
      <h6 className="fw-semibold small mb-2 mt-3 d-flex align-items-center gap-2"><Ico icon="tabler:webhook" size={16} />Webhook URL</h6>
      <p className="text-muted small mb-2">Register this in your {meta.label} developer portal to receive real-time events:</p>
      <div className="d-flex align-items-center gap-2">
        <code className="small border rounded px-2 py-1 bg-light flex-grow-1">
          {window.location.origin}/api/webhooks/pos/{prov}
        </code>
        <Button size="sm" variant="outline-secondary"
          onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/api/webhooks/pos/${prov}`)}>
          <Ico icon="tabler:clipboard" size={14} className="me-1" />Copy
        </Button>
      </div>
    </>
  );
}

// ── Locations Panel (Square) ───────────────────────────────────────────────────
function LocationsPanel({ connection, onFlash, onReload }) {
  const [locations, setLocations] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    api(`/ecommerce/pos/${connection.id}/locations`)
      .then(r => setLocations(Array.isArray(r.data) ? r.data : []))
      .catch(() => onFlash('Failed to load locations.', 'danger'))
      .finally(() => setLoading(false));
  }, [connection.id]);

  const choose = async (loc) => {
    try {
      await api(`/ecommerce/pos/${connection.id}/location`, {
        method: 'PATCH',
        data: { location_id: loc.id, location_name: loc.name },
      });
      onFlash(`Active location set to "${loc.name}".`);
      onReload();
    } catch { onFlash('Failed to set location.', 'danger'); }
  };

  if (loading) return <div className="py-3 text-center"><Spinner size="sm" /></div>;

  return (
    <>
      <p className="text-muted small mb-3">
        Active location: <strong>{connection.location_name ?? '—'}</strong><br />
        All catalog syncs and orders use the active location.
      </p>
      <ListGroup>
        {locations.map(loc => (
          <ListGroup.Item key={loc.id} action active={loc.id === connection.location_id}
            onClick={() => choose(loc)} className="d-flex align-items-center">
            <div className="flex-grow-1">
              <div className="fw-semibold">{loc.name}</div>
              <small className="text-muted">
                {[loc.address?.address_line_1, loc.address?.locality].filter(Boolean).join(', ')}
              </small>
            </div>
            {loc.id === connection.location_id && <Badge bg="success">Active</Badge>}
          </ListGroup.Item>
        ))}
      </ListGroup>
    </>
  );
}

// ── Channel Links Panel (Deliverect) ───────────────────────────────────────────
function ChannelLinksPanel({ connection, onFlash }) {
  const [links,   setLinks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/ecommerce/pos/${connection.id}/channel-links`)
      .then(r => setLinks(Array.isArray(r.data) ? r.data : []))
      .catch(() => onFlash('Failed to load channel links.', 'danger'))
      .finally(() => setLoading(false));
  }, [connection.id]);

  if (loading) return <div className="py-3 text-center"><Spinner size="sm" /></div>;
  if (!links.length) return (
    <Alert variant="info">No channel links found in this Deliverect account.</Alert>
  );

  return (
    <>
      <p className="text-muted small mb-3">
        Channel links are your virtual restaurant locations connected to delivery platforms (Uber Eats, DoorDash, etc.).
      </p>
      <Table size="sm" hover>
        <thead className="table-light">
          <tr><th>Name</th><th>Channel / Platform</th><th>Status</th><th>ID</th></tr>
        </thead>
        <tbody>
          {links.map((link, i) => (
            <tr key={i}>
              <td className="fw-semibold">{link.name ?? link._id}</td>
              <td className="small text-muted">{link.channelName ?? link.type ?? '—'}</td>
              <td>
                <Badge bg={link.isActive !== false ? 'success' : 'secondary'}>
                  {link.isActive !== false ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td><code className="small">{(link._id ?? link.id ?? '').slice(0, 16)}…</code></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function ConnectModal({ show, form, setForm, businesses, connecting, onConnect, onHide }) {
  const [bizSearch, setBizSearch] = useState('');
  const [step,      setStep]      = useState(1);   // 1 = pick provider, 2 = fill details
  const allBiz = Array.isArray(businesses) ? businesses : [];
  const meta   = PROVIDER_META[form.provider] ?? {};

  const filteredBiz = useMemo(() => {
    const q = bizSearch.trim().toLowerCase();
    return q ? allBiz.filter(b => b.name.toLowerCase().includes(q)) : allBiz;
  }, [allBiz, bizSearch]);

  const selectedBiz = allBiz.find(b => String(b.id) === String(form.business_id));

  useEffect(() => { if (!show) { setBizSearch(''); setStep(1); } }, [show]);

  const canConnect = (() => {
    if (!form.business_id) return false;
    if (OAUTH_NEEDS_MERCHANT_ID.includes(form.provider) && !form.merchant_id) return false;
    if (form.provider === 'toast'      && !form.restaurant_guid) return false;
    if (form.provider === 'poslavu'    && (!form.api_key || !form.restaurant_id)) return false;
    if (form.provider === 'deliverect' && !form.account_id) return false;
    return true;
  })();

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton className="pb-2">
        <Modal.Title>
          {step === 1
            ? <span className="d-flex align-items-center gap-2"><Ico icon="tabler:plug" size={20} />Choose POS Provider</span>
            : <span className="d-flex align-items-center gap-2"><ProviderIcon provider={form.provider} size={20} />Connect {meta.label}</span>
          }
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>

        {step === 1 && (
          <>
            <p className="text-muted small mb-3">Select the POS system you want to connect to your business.</p>
            <Row className="g-3">
              {Object.entries(PROVIDER_META).map(([key, m]) => (
                <Col xs={12} sm={6} md={4} key={key}>
                  <Card
                    className={`h-100 p-0 ${form.provider === key ? 'border-primary shadow-sm' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => { setForm(f => ({ ...f, provider: key })); setStep(2); }}
                  >
                    <Card.Body className="p-3">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <ProviderIcon provider={key} size={28} />
                        <div>
                          <div className="fw-bold">{m.label}</div>
                          <Badge bg={m.authType === 'oauth' ? 'info' : 'secondary'} style={{ fontSize: '0.65rem' }} className="d-inline-flex align-items-center gap-1">
                            <Ico icon={m.authType === 'oauth' ? 'tabler:key' : 'tabler:lock'} size={10} />{m.authType === 'oauth' ? 'OAuth' : 'API Key'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-muted small mb-2">{m.description}</div>
                      <div className="d-flex gap-1 flex-wrap">
                        {m.features.map(f => (
                          <span key={f} className="badge bg-light text-dark border" style={{ fontSize: '0.65rem' }}>{f}</span>
                        ))}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}

        {step === 2 && (
          <>
            {/* ── Business picker ── */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Business</Form.Label>
              <Form.Control
                size="sm" placeholder="Search business…" value={bizSearch}
                onChange={e => { setBizSearch(e.target.value); if (form.business_id) setForm(f => ({ ...f, business_id: '' })); }}
                className="mb-1"
              />
              {selectedBiz ? (
                <div className="d-flex align-items-center gap-2 px-2 py-1 rounded bg-primary bg-opacity-10 border border-primary">
                  <span className="small fw-semibold text-primary d-flex align-items-center gap-1"><Ico icon="tabler:building-store" size={14} />{selectedBiz.name}</span>
                  <button type="button" className="btn-close ms-auto" style={{ fontSize: '0.6rem' }}
                    onClick={() => { setForm(f => ({ ...f, business_id: '' })); setBizSearch(''); }} />
                </div>
              ) : (
                <div className="border rounded" style={{ maxHeight: 150, overflowY: 'auto' }}>
                  {filteredBiz.length === 0
                    ? <div className="px-3 py-2 text-muted small">{bizSearch ? `No results for "${bizSearch}"` : 'No businesses found'}</div>
                    : filteredBiz.map(b => (
                      <div key={b.id} className="px-3 py-2 small border-bottom"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                        onClick={() => { setForm(f => ({ ...f, business_id: b.id })); setBizSearch(''); }}>
                        <span className="d-flex align-items-center gap-1"><Ico icon="tabler:building-store" size={13} />{b.name}</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </Form.Group>

            {/* ── Provider-specific fields ── */}
            {form.provider === 'clover' && (
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Clover Merchant ID</Form.Label>
                <Form.Control placeholder="e.g. ABCD1234EFGH5678"
                  value={form.merchant_id} onChange={e => setForm(f => ({ ...f, merchant_id: e.target.value }))} />
                <Form.Text className="text-muted">
                  Found in your Clover dashboard URL: <code>/merchants/<strong>YOUR_MERCHANT_ID</strong></code>
                </Form.Text>
              </Form.Group>
            )}

            {form.provider === 'toast' && (
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Toast Restaurant GUID</Form.Label>
                <Form.Control placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={form.restaurant_guid} onChange={e => setForm(f => ({ ...f, restaurant_guid: e.target.value }))} />
                <Form.Text className="text-muted">
                  Toast Admin → General Settings → <strong>Restaurant GUID</strong>
                </Form.Text>
              </Form.Group>
            )}

            {form.provider === 'poslavu' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">POSLavu API Key</Form.Label>
                  <Form.Control type="password" placeholder="Your POSLavu API key"
                    value={form.api_key} onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Restaurant ID</Form.Label>
                  <Form.Control placeholder="e.g. 12345"
                    value={form.restaurant_id} onChange={e => setForm(f => ({ ...f, restaurant_id: e.target.value }))} />
                  <Form.Text className="text-muted">POSLavu Admin → Restaurant Settings → Restaurant ID</Form.Text>
                </Form.Group>
              </>
            )}

            {form.provider === 'deliverect' && (
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Deliverect Account ID</Form.Label>
                <Form.Control placeholder="e.g. 5f9d8c7b6a5e4d3c2b1a0f9e"
                  value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} />
                <Form.Text className="text-muted">Deliverect Dashboard → Account Settings → Account ID</Form.Text>
              </Form.Group>
            )}

            {/* ── Setup hints ── */}
            {meta.setupHints?.length > 0 && (
              <Alert variant="secondary" className="small py-2 mb-3">
                <div className="fw-semibold mb-1 d-flex align-items-center gap-1"><Ico icon="tabler:checklist" size={14} />Setup checklist for {meta.label}:</div>
                <ul className="mb-0 ps-3">
                  {meta.setupHints.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </Alert>
            )}

            <Alert variant={meta.authType === 'oauth' ? 'info' : 'secondary'} className="small mb-0 py-2">
              {meta.authType === 'oauth'
                ? <span className="d-flex align-items-center gap-1"><Ico icon="tabler:key" size={14} />You'll be redirected to {meta.label} to authorize access, then returned here automatically.</span>
                : <span className="d-flex align-items-center gap-1"><Ico icon="tabler:lock" size={14} />Credentials are verified immediately and stored encrypted in the database.</span>
              }
            </Alert>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        {step === 2 && (
          <Button variant="outline-secondary" onClick={() => setStep(1)} className="me-auto">
            ← Back
          </Button>
        )}
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        {step === 2 && (
          <Button variant="primary" onClick={onConnect} disabled={connecting || !canConnect}>
            {connecting
              ? <><Spinner size="sm" className="me-2" />{meta.authType === 'oauth' ? 'Redirecting…' : 'Connecting…'}</>
              : <span className="d-flex align-items-center gap-1"><ProviderIcon provider={form.provider} size={16} />Connect {meta.label}</span>
            }
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
