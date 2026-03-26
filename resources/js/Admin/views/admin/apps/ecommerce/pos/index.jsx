import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Row, Col, Card, Button, Badge, Table, Alert, Spinner,
  Modal, Form, ListGroup, Nav, Tab,
} from 'react-bootstrap';
import axios from 'axios';

const api = (path, opts = {}) =>
  axios({ url: `/api${path}`, withCredentials: true, ...opts });

const PROVIDER_META = {
  square: {
    label: 'Square',
    color: 'dark',
    logo: 'https://cdn.worldvectorlogo.com/logos/square-2.svg',
    docsUrl: 'https://developer.squareup.com/docs/commerce',
  },
  clover: {
    label: 'Clover',
    color: 'success',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Clover_Network_logo.svg/1200px-Clover_Network_logo.svg.png',
    docsUrl: 'https://docs.clover.com',
  },
};

// ── Main POS Management Page ───────────────────────────────────────────────────
export default function PosPage() {
  const [connections, setConnections]   = useState([]);
  const [businesses,  setBusinesses]    = useState([]);
  const [loading,     setLoading]       = useState(true);
  const [activeTab,   setActiveTab]     = useState('connections');
  const [flash,       setFlash]         = useState(null);

  // Connection modal state
  const [connectModal, setConnectModal] = useState(false);
  const [connectForm,  setConnectForm]  = useState({ provider: 'square', business_id: '', merchant_id: '' });
  const [connecting,   setConnecting]   = useState(false);
  const [checkResult,  setCheckResult]  = useState(null);
  const [checking,     setChecking]     = useState(false);

  // Selected connection for detail / catalog / payment tabs
  const [selected, setSelected] = useState(null);

  const showFlash = (msg, variant = 'success') => {
    setFlash({ msg, variant });
    setTimeout(() => setFlash(null), 5000);
  };

  const loadConnections = useCallback(async () => {
    try {
      const [connRes, bizRes] = await Promise.all([
        api('/ecommerce/pos'),
        api('/ecommerce/businesses?per_page=200'),
      ]);
      setConnections(connRes.data);
      setBusinesses(bizRes.data?.data ?? bizRes.data);
    } catch {
      showFlash('Failed to load POS connections.', 'danger');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();

    // Handle OAuth callback query params
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'connected') {
      showFlash(`${params.get('provider') ?? 'POS'} connected successfully!`);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('error')) {
      showFlash('Connection error: ' + params.get('error'), 'danger');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadConnections]);

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
    try {
      if (connectForm.provider === 'square') {
        const res = await api(`/ecommerce/pos/square/auth-url?business_id=${connectForm.business_id}`);
        window.location.href = res.data.url;
      } else {
        const res = await api(
          `/ecommerce/pos/clover/auth-url?business_id=${connectForm.business_id}&merchant_id=${connectForm.merchant_id}`
        );
        window.location.href = res.data.url;
      }
    } catch (e) {
      showFlash(e.response?.data?.message ?? 'Failed to start OAuth.', 'danger');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (conn) => {
    if (!confirm(`Disconnect ${PROVIDER_META[conn.provider].label} from ${conn.business_name}? This will remove all catalog maps.`)) return;
    try {
      await api(`/ecommerce/pos/${conn.id}`, { method: 'DELETE' });
      showFlash(`${PROVIDER_META[conn.provider].label} disconnected.`);
      loadConnections();
      if (selected?.id === conn.id) setSelected(null);
    } catch {
      showFlash('Failed to disconnect.', 'danger');
    }
  };

  const handleToggleActive = async (conn) => {
    try {
      const res = await api(`/ecommerce/pos/${conn.id}`, {
        method: 'PATCH',
        data: { is_active: !conn.is_active },
      });
      setConnections(prev => prev.map(c => c.id === conn.id ? res.data : c));
    } catch {
      showFlash('Failed to update.', 'danger');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h4 className="mb-0 fw-bold">POS Integration</h4>
          <small className="text-muted">Connect Square & Clover — sync menus, process payments, manage orders</small>
        </Col>
        <Col xs="auto" className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={handleCheck} disabled={checking}>
            {checking ? <><Spinner size="sm" className="me-1" />Checking…</> : '🔍 Check Credentials'}
          </Button>
          <Button variant="primary" onClick={() => setConnectModal(true)}>
            + Connect POS
          </Button>
        </Col>
      </Row>

      {flash && (
        <Alert variant={flash.variant} dismissible onClose={() => setFlash(null)}>
          {flash.msg}
        </Alert>
      )}

      {checkResult && (
        <Card className="mb-4 border-0 shadow-sm">
          <Card.Body className="py-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 fw-semibold">Credentials & Connection Status</h6>
              <Button variant="link" size="sm" className="p-0 text-muted" onClick={() => setCheckResult(null)}>✕</Button>
            </div>
            <Row className="g-3">
              {['square', 'clover'].map(prov => {
                const d = checkResult[prov];
                return (
                  <Col md={3} key={prov}>
                    <div className="border rounded p-3">
                      <div className="fw-semibold text-capitalize mb-2">{prov}</div>
                      <div className="small d-flex justify-content-between">
                        <span className="text-muted">App ID</span>
                        <span className={d.app_id ? 'text-success' : 'text-danger'}>{d.app_id ? '✓ Set' : '✗ Missing'}</span>
                      </div>
                      <div className="small d-flex justify-content-between">
                        <span className="text-muted">App Secret</span>
                        <span className={d.app_secret ? 'text-success' : 'text-danger'}>{d.app_secret ? '✓ Set' : '✗ Missing'}</span>
                      </div>
                      <div className="small d-flex justify-content-between">
                        <span className="text-muted">Environment</span>
                        <span className="text-info">{d.environment}</span>
                      </div>
                      <div className="mt-2">
                        {d.credentials_ok
                          ? <span className="badge bg-success-subtle text-success">Ready to Connect</span>
                          : <span className="badge bg-danger-subtle text-danger">Credentials Missing</span>
                        }
                      </div>
                    </div>
                  </Col>
                );
              })}

              {checkResult.connections?.length > 0 && (
                <Col md={6}>
                  <div className="border rounded p-3">
                    <div className="fw-semibold mb-2">Live API Test</div>
                    {checkResult.connections.map((c, i) => (
                      <div key={i} className="small d-flex align-items-center gap-2 mb-1">
                        <span className="text-capitalize fw-medium">{c.provider}</span>
                        <span className="text-muted">Biz #{c.business_id}</span>
                        {c.status === 'ok'
                          ? <span className="badge bg-success-subtle text-success ms-auto">
                              ✓ Live {c.locations != null ? `(${c.locations} locations)` : c.merchant ?? ''}
                            </span>
                          : <span className="badge bg-danger-subtle text-danger ms-auto" title={c.error}>✗ Failed</span>
                        }
                      </div>
                    ))}
                  </div>
                </Col>
              )}
            </Row>

            {checkResult.oauth_callback_url && (
              <div className="mt-3 small text-muted">
                <strong>OAuth Callback URLs</strong> (add these in developer portals):<br />
                Square: <code>{checkResult.oauth_callback_url.square}</code><br />
                Clover: <code>{checkResult.oauth_callback_url.clover}</code>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      <Row>
        {/* ── Connection cards ── */}
        <Col lg={selected ? 4 : 12}>
          {connections.length === 0 ? (
            <Card className="text-center py-5 border-dashed">
              <Card.Body>
                <div className="fs-1 mb-3">🔌</div>
                <h5>No POS systems connected</h5>
                <p className="text-muted mb-4">
                  Connect Square or Clover to sync your menu and accept payments through POS terminals.
                </p>
                <Button variant="primary" onClick={() => setConnectModal(true)}>
                  Connect your first POS
                </Button>
              </Card.Body>
            </Card>
          ) : (
            <Row className="g-3">
              {connections.map(conn => (
                <Col key={conn.id} md={selected ? 12 : 4}>
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

        {/* ── Connection detail panel ── */}
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

      {/* ── Connect POS Modal ── */}
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

// ── Connection Card ────────────────────────────────────────────────────────────
function ConnectionCard({ conn, selected, onSelect, onDisconnect, onToggleActive, onFlash, onReload }) {
  const meta = PROVIDER_META[conn.provider];

  return (
    <Card
      className={`h-100 cursor-pointer ${selected ? 'border-primary shadow-sm' : ''}`}
      onClick={onSelect}
      style={{ cursor: 'pointer' }}
    >
      <Card.Header className="d-flex align-items-center gap-2 bg-white border-bottom">
        <span className="fw-semibold">{meta.label}</span>
        <Badge bg={conn.is_active ? 'success' : 'secondary'} className="ms-auto">
          {conn.is_active ? 'Active' : 'Paused'}
        </Badge>
      </Card.Header>
      <Card.Body className="py-3">
        <div className="small text-muted mb-1">Business</div>
        <div className="fw-semibold mb-2">{conn.business_name ?? `#${conn.business_id}`}</div>

        {conn.location_name && (
          <>
            <div className="small text-muted mb-1">Location</div>
            <div className="mb-2">{conn.location_name}</div>
          </>
        )}

        <div className="d-flex gap-2 mt-2">
          <Badge bg="light" text="dark" className="border">
            📦 {conn.catalog_count} items synced
          </Badge>
        </div>

        <div className="small text-muted mt-2">
          Connected {conn.connected_at ? new Date(conn.connected_at).toLocaleDateString() : '—'}
        </div>
      </Card.Body>
      <Card.Footer className="bg-white d-flex gap-2 justify-content-end" onClick={e => e.stopPropagation()}>
        <Button
          size="sm"
          variant={conn.is_active ? 'outline-warning' : 'outline-success'}
          onClick={() => onToggleActive(conn)}
        >
          {conn.is_active ? 'Pause' : 'Resume'}
        </Button>
        <Button size="sm" variant="outline-danger" onClick={() => onDisconnect(conn)}>
          Disconnect
        </Button>
      </Card.Footer>
    </Card>
  );
}

// ── Connection Detail Panel ────────────────────────────────────────────────────
function ConnectionDetail({ connection, onFlash, onClose, onReload }) {
  const [tab, setTab] = useState('catalog');

  return (
    <Card>
      <Card.Header className="d-flex align-items-center">
        <span className="fw-semibold">
          {PROVIDER_META[connection.provider].label} — {connection.business_name}
        </span>
        <Button variant="link" size="sm" className="ms-auto text-muted p-0" onClick={onClose}>✕</Button>
      </Card.Header>

      <Tab.Container activeKey={tab} onSelect={setTab}>
        <Nav variant="tabs" className="px-3 pt-2">
          <Nav.Item><Nav.Link eventKey="catalog">Menu Sync</Nav.Link></Nav.Item>
          {connection.provider === 'square' && (
            <Nav.Item><Nav.Link eventKey="payment">Terminal Payment</Nav.Link></Nav.Item>
          )}
          <Nav.Item><Nav.Link eventKey="maps">Catalog Maps</Nav.Link></Nav.Item>
          {connection.provider === 'square' && (
            <Nav.Item><Nav.Link eventKey="locations">Locations</Nav.Link></Nav.Item>
          )}
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="catalog" className="p-3">
            <CatalogSyncPanel connection={connection} onFlash={onFlash} onReload={onReload} />
          </Tab.Pane>
          {connection.provider === 'square' && (
            <Tab.Pane eventKey="payment" className="p-3">
              <TerminalPaymentPanel connection={connection} onFlash={onFlash} />
            </Tab.Pane>
          )}
          <Tab.Pane eventKey="maps" className="p-3">
            <CatalogMapsPanel connection={connection} onFlash={onFlash} />
          </Tab.Pane>
          {connection.provider === 'square' && (
            <Tab.Pane eventKey="locations" className="p-3">
              <LocationsPanel connection={connection} onFlash={onFlash} onReload={onReload} />
            </Tab.Pane>
          )}
        </Tab.Content>
      </Tab.Container>
    </Card>
  );
}

// ── Catalog Sync Panel ─────────────────────────────────────────────────────────
function CatalogSyncPanel({ connection, onFlash, onReload }) {
  const [pushing,   setPushing]   = useState(false);
  const [pulling,   setPulling]   = useState(false);
  const [result,    setResult]    = useState(null);
  const provider = PROVIDER_META[connection.provider].label;

  const push = async () => {
    setPushing(true); setResult(null);
    try {
      const res = await api(`/ecommerce/pos/${connection.id}/push-catalog`, { method: 'POST' });
      setResult({ type: 'push', ...res.data });
      onFlash(res.data.message);
      onReload();
    } catch (e) {
      onFlash(e.response?.data?.message ?? 'Push failed.', 'danger');
    } finally {
      setPushing(false);
    }
  };

  const pull = async () => {
    setPulling(true); setResult(null);
    try {
      const res = await api(`/ecommerce/pos/${connection.id}/pull-catalog`, { method: 'POST' });
      setResult({ type: 'pull', ...res.data });
      onFlash(res.data.message);
      onReload();
    } catch (e) {
      onFlash(e.response?.data?.message ?? 'Pull failed.', 'danger');
    } finally {
      setPulling(false);
    }
  };

  return (
    <>
      <p className="text-muted small mb-3">
        Sync your menu items with {provider}. Push sends your local items to {provider}.
        Pull imports {provider}'s catalog into your menu.
      </p>

      <Row className="g-3 mb-3">
        <Col sm={6}>
          <Card className="text-center p-3 border">
            <div className="fs-2 mb-2">⬆️</div>
            <h6>Push to {provider}</h6>
            <p className="small text-muted">Upload your active menu items to {provider} catalog</p>
            <Button variant="primary" onClick={push} disabled={pushing || pulling}>
              {pushing ? <><Spinner size="sm" className="me-2" />Pushing…</> : `Push Menu → ${provider}`}
            </Button>
          </Card>
        </Col>
        <Col sm={6}>
          <Card className="text-center p-3 border">
            <div className="fs-2 mb-2">⬇️</div>
            <h6>Pull from {provider}</h6>
            <p className="small text-muted">Import {provider} items into your local menu</p>
            <Button variant="outline-primary" onClick={pull} disabled={pushing || pulling}>
              {pulling ? <><Spinner size="sm" className="me-2" />Pulling…</> : `Pull ${provider} → Menu`}
            </Button>
          </Card>
        </Col>
      </Row>

      {result && (
        <Alert variant={result.errors?.length ? 'warning' : 'success'} className="small mb-0">
          <strong>{result.message}</strong>
          {result.errors?.length > 0 && (
            <ul className="mb-0 mt-2">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </Alert>
      )}
    </>
  );
}

// ── Terminal Payment Panel (Square only) ──────────────────────────────────────
function TerminalPaymentPanel({ connection, onFlash }) {
  const [orderId,    setOrderId]    = useState('');
  const [deviceId,   setDeviceId]   = useState('');
  const [devices,    setDevices]    = useState([]);
  const [checkout,   setCheckout]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    api(`/ecommerce/pos/${connection.id}/devices`)
      .then(r => setDevices(r.data))
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
      onFlash('Terminal checkout started — waiting for payment on device.');
      startPolling(res.data.checkout_id);
    } catch (e) {
      onFlash(e.response?.data?.message ?? 'Failed to start checkout.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (checkoutId) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await api(`/ecommerce/pos/${connection.id}/checkout/${checkoutId}/status`);
        setCheckout(prev => ({ ...prev, status: res.data.status, payment_id: res.data.payment_id }));
        if (['COMPLETED', 'CANCELED'].includes(res.data.status)) {
          clearInterval(pollRef.current);
          if (res.data.status === 'COMPLETED') onFlash('Payment completed successfully!');
        }
      } catch {
        clearInterval(pollRef.current);
      }
    }, 3000);
  };

  const cancelCheckout = async () => {
    if (!checkout?.checkout_id) return;
    try {
      await api(`/ecommerce/pos/${connection.id}/checkout/${checkout.checkout_id}/cancel`, { method: 'POST' });
      setCheckout(prev => ({ ...prev, status: 'CANCEL_REQUESTED' }));
      clearInterval(pollRef.current);
    } catch (e) {
      onFlash('Failed to cancel.', 'danger');
    }
  };

  const statusColor = {
    PENDING: 'warning', IN_PROGRESS: 'info', COMPLETED: 'success',
    CANCELED: 'secondary', CANCEL_REQUESTED: 'secondary',
  };

  return (
    <>
      <p className="text-muted small mb-3">
        Send an order to a Square Terminal for in-person payment.
        The terminal will display the total and accept card/NFC payment.
      </p>

      <Row className="g-3 mb-3">
        <Col sm={6}>
          <Form.Group>
            <Form.Label className="small fw-semibold">Order ID</Form.Label>
            <Form.Control
              type="number" placeholder="e.g. 42"
              value={orderId} onChange={e => setOrderId(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col sm={6}>
          <Form.Group>
            <Form.Label className="small fw-semibold">Terminal Device (optional)</Form.Label>
            <Form.Select value={deviceId} onChange={e => setDeviceId(e.target.value)}>
              <option value="">— Any available device —</option>
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.name ?? d.id}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Button variant="success" onClick={startCheckout} disabled={loading || checkout?.status === 'IN_PROGRESS'}>
        {loading ? <><Spinner size="sm" className="me-2" />Starting…</> : '💳 Send to Terminal'}
      </Button>

      {checkout && (
        <Card className="mt-3 border">
          <Card.Body className="py-2">
            <div className="d-flex align-items-center gap-3">
              <div>
                <div className="small text-muted">Checkout ID</div>
                <code className="small">{checkout.checkout_id}</code>
              </div>
              <div>
                <div className="small text-muted">Amount</div>
                <span className="fw-semibold">${checkout.amount}</span>
              </div>
              <div>
                <div className="small text-muted">Status</div>
                <Badge bg={statusColor[checkout.status] ?? 'secondary'}>
                  {checkout.status}
                  {['PENDING', 'IN_PROGRESS'].includes(checkout.status) && (
                    <Spinner size="sm" className="ms-1" style={{ width: 10, height: 10 }} />
                  )}
                </Badge>
              </div>
              {['PENDING', 'IN_PROGRESS'].includes(checkout.status) && (
                <Button size="sm" variant="outline-danger" onClick={cancelCheckout}>Cancel</Button>
              )}
            </div>
            {checkout.payment_id && (
              <div className="small text-muted mt-1">Payment ID: <code>{checkout.payment_id}</code></div>
            )}
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

  const load = useCallback(async () => {
    try {
      const res = await api(`/ecommerce/pos/${connection.id}/catalog-maps`);
      setMaps(res.data);
    } catch {
      onFlash('Failed to load catalog maps.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [connection.id]);

  useEffect(() => { load(); }, [load]);

  const unlink = async (map) => {
    if (!confirm('Unlink this catalog map?')) return;
    try {
      await api(`/ecommerce/pos/${connection.id}/catalog-maps/${map.id}`, { method: 'DELETE' });
      setMaps(prev => prev.filter(m => m.id !== map.id));
      onFlash('Map unlinked.');
    } catch {
      onFlash('Failed to unlink.', 'danger');
    }
  };

  if (loading) return <div className="py-3 text-center"><Spinner size="sm" /></div>;
  if (!maps.length) return (
    <Alert variant="info" className="mb-0">
      No catalog maps yet. Use "Push to {PROVIDER_META[connection.provider].label}" to sync your menu.
    </Alert>
  );

  return (
    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
      <Table size="sm" hover className="mb-0">
        <thead className="table-light">
          <tr>
            <th>Local Item</th>
            <th>POS Item</th>
            <th>Price</th>
            <th>Synced</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {maps.map(m => (
            <tr key={m.id}>
              <td>
                {m.menu_item
                  ? <span>{m.menu_item.name} <Badge bg="light" text="dark" className="border small">#{m.menu_item_id}</Badge></span>
                  : <span className="text-muted">—</span>
                }
              </td>
              <td><code className="small">{m.pos_item_id}</code></td>
              <td>${Number(m.pos_item_price).toFixed(2)}</td>
              <td className="text-muted small">
                {m.synced_at ? new Date(m.synced_at).toLocaleDateString() : '—'}
              </td>
              <td>
                <Button size="sm" variant="link" className="text-danger p-0" onClick={() => unlink(m)}>
                  unlink
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

// ── Locations Panel (Square only) ─────────────────────────────────────────────
function LocationsPanel({ connection, onFlash, onReload }) {
  const [locations, setLocations] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    api(`/ecommerce/pos/${connection.id}/locations`)
      .then(r => setLocations(r.data))
      .catch(() => onFlash('Failed to load locations.', 'danger'))
      .finally(() => setLoading(false));
  }, [connection.id]);

  const setLocation = async (loc) => {
    try {
      await api(`/ecommerce/pos/${connection.id}/location`, {
        method: 'PATCH',
        data: { location_id: loc.id, location_name: loc.name },
      });
      onFlash(`Active location set to "${loc.name}".`);
      onReload();
    } catch {
      onFlash('Failed to set location.', 'danger');
    }
  };

  if (loading) return <div className="py-3 text-center"><Spinner size="sm" /></div>;

  return (
    <>
      <p className="text-muted small mb-3">
        Select which Square location to use for orders and catalog sync.
        Currently active: <strong>{connection.location_name ?? '—'}</strong>
      </p>
      <ListGroup>
        {locations.map(loc => (
          <ListGroup.Item
            key={loc.id}
            className="d-flex align-items-center"
            action
            active={loc.id === connection.location_id}
            onClick={() => setLocation(loc)}
          >
            <div>
              <div className="fw-semibold">{loc.name}</div>
              <small className="text-muted">{loc.address?.address_line_1} {loc.address?.locality}</small>
            </div>
            {loc.id === connection.location_id && (
              <Badge bg="success" className="ms-auto">Active</Badge>
            )}
          </ListGroup.Item>
        ))}
      </ListGroup>
    </>
  );
}

// ── Connect POS Modal ─────────────────────────────────────────────────────────
function ConnectModal({ show, form, setForm, businesses, connecting, onConnect, onHide }) {
  const [bizSearch, setBizSearch] = React.useState('');

  const allBiz = Array.isArray(businesses) ? businesses : [];

  const filteredBiz = React.useMemo(() => {
    const q = bizSearch.trim().toLowerCase();
    return q ? allBiz.filter(b => b.name.toLowerCase().includes(q)) : allBiz;
  }, [allBiz, bizSearch]);

  const selectedBiz = allBiz.find(b => String(b.id) === String(form.business_id));

  React.useEffect(() => { if (!show) setBizSearch(''); }, [show]);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Connect POS System</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold">POS Provider</Form.Label>
          <div className="d-flex gap-3">
            {Object.entries(PROVIDER_META).map(([key, meta]) => (
              <Card
                key={key}
                className={`flex-fill text-center p-3 ${form.provider === key ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setForm(f => ({ ...f, provider: key }))}
              >
                <div className="fw-semibold">{meta.label}</div>
                <small className="text-muted">{key === 'square' ? 'Readers + Web' : 'In-store POS'}</small>
              </Card>
            ))}
          </div>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold">Business</Form.Label>

          {/* Search input */}
          <Form.Control
            size="sm"
            placeholder="Search business…"
            value={bizSearch}
            onChange={e => {
              setBizSearch(e.target.value);
              // clear selection if user is typing a new search
              if (form.business_id) setForm(f => ({ ...f, business_id: '' }));
            }}
            className="mb-1"
          />

          {/* Selected badge */}
          {selectedBiz && (
            <div className="d-flex align-items-center gap-2 px-2 py-1 mb-1 rounded bg-primary bg-opacity-10 border border-primary">
              <span className="small fw-semibold text-primary">{selectedBiz.name}</span>
              <button
                type="button"
                className="btn-close btn-close ms-auto"
                style={{ fontSize: '0.6rem' }}
                onClick={() => { setForm(f => ({ ...f, business_id: '' })); setBizSearch(''); }}
              />
            </div>
          )}

          {/* List — only show when no selection */}
          {!selectedBiz && (
            <div
              className="border rounded"
              style={{ maxHeight: 180, overflowY: 'auto', background: '#fff' }}
            >
              {filteredBiz.length === 0 ? (
                <div className="px-3 py-2 text-muted small">
                  {bizSearch ? `No results for "${bizSearch}"` : 'No businesses found'}
                </div>
              ) : (
                filteredBiz.map(b => (
                  <div
                    key={b.id}
                    className="px-3 py-2 small border-bottom"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                    onClick={() => { setForm(f => ({ ...f, business_id: b.id })); setBizSearch(''); }}
                  >
                    {b.name}
                  </div>
                ))
              )}
            </div>
          )}
        </Form.Group>

        {form.provider === 'clover' && (
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Clover Merchant ID</Form.Label>
            <Form.Control
              placeholder="e.g. ABCD1234EFGH5678"
              value={form.merchant_id}
              onChange={e => setForm(f => ({ ...f, merchant_id: e.target.value }))}
            />
            <Form.Text className="text-muted">
              Found in your Clover dashboard URL: /merchants/<strong>YOUR_MERCHANT_ID</strong>
            </Form.Text>
          </Form.Group>
        )}

        <Alert variant="info" className="small mb-0">
          You'll be redirected to {PROVIDER_META[form.provider]?.label} to authorize access, then returned here automatically.
        </Alert>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button
          variant="primary"
          onClick={onConnect}
          disabled={connecting || !form.business_id || (form.provider === 'clover' && !form.merchant_id)}
        >
          {connecting ? <><Spinner size="sm" className="me-2" />Redirecting…</> : `Connect ${PROVIDER_META[form.provider]?.label}`}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
