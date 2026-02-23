import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import {
    Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle,
    Col, Modal, Row, Spinner, Table
} from 'react-bootstrap';

const DD_STATUS_BADGE = {
    created:              'bg-secondary-subtle text-secondary',
    confirmed:            'bg-info-subtle text-info',
    enroute_to_pickup:    'bg-primary-subtle text-primary',
    arrived_at_pickup:    'bg-primary-subtle text-primary',
    picked_up:            'bg-warning-subtle text-warning',
    enroute_to_dropoff:   'bg-warning-subtle text-warning',
    arrived_at_dropoff:   'bg-warning-subtle text-warning',
    delivered:            'bg-success-subtle text-success',
    delivery_cancelled:   'bg-danger-subtle text-danger',
    returned:             'bg-danger-subtle text-danger',
};

const DD_STATUS_LABEL = {
    created:            'Order Received',
    confirmed:          'Confirmed',
    enroute_to_pickup:  'Heading to Restaurant',
    arrived_at_pickup:  'At Restaurant',
    picked_up:          'Out for Delivery',
    enroute_to_dropoff: 'Almost There',
    arrived_at_dropoff: 'Arrived',
    delivered:          'Delivered',
    delivery_cancelled: 'Cancelled',
    returned:           'Returned',
};

const ORDER_STATUS_BADGE = {
    pending:          'bg-warning-subtle text-warning',
    confirmed:        'bg-info-subtle text-info',
    preparing:        'bg-primary-subtle text-primary',
    ready:            'bg-success-subtle text-success',
    out_for_delivery: 'bg-primary-subtle text-primary',
    delivered:        'bg-success-subtle text-success',
    cancelled:        'bg-danger-subtle text-danger',
};

export default function DoorDashDeliveriesPage() {
    const [orders,    setOrders]    = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [toast,     setToast]     = useState(null);
    const [actionId,  setActionId]  = useState(null);
    const [ddEnv,     setDdEnv]     = useState(null); // "sandbox" | "production"

    // Quote modal state (reserved for future DoorDash Drive v2 upgrade)
    const [quoteOrder,    setQuoteOrder]    = useState(null);
    const [quoteLoading,  setQuoteLoading]  = useState(false);
    const [quoteResult,   setQuoteResult]   = useState(null);
    const [quoteError,    setQuoteError]    = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 5000);
    };

    // Load the active DoorDash environment (sandbox/production) once on mount
    useEffect(() => {
        axios.get('/api/delivery/doordash/env')
            .then(r => setDdEnv(r.data.env))
            .catch(() => {});
    }, []);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/ecommerce/orders?per_page=100');
            const ddOrders = (data.data || []).filter(
                o => o.doordash_delivery_id || o.delivery_vendor === 'doordash'
            );
            setOrders(ddOrders);
        } catch {
            showToast('Failed to load orders.', 'danger');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    const handleRefresh = async (order) => {
        setActionId(order.id);
        try {
            const { data } = await axios.get(`/api/delivery/doordash/status/${order.id}`);
            setOrders(prev => prev.map(o =>
                o.id === order.id
                    ? { ...o, doordash_status: data.dd_status, doordash_tracking_url: data.tracking_url }
                    : o
            ));
            showToast(`Status updated: ${data.dd_label}`);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to refresh status.', 'danger');
        } finally {
            setActionId(null);
        }
    };

    const handleDispatch = async (order) => {
        setActionId(order.id);
        try {
            const { data } = await axios.post(`/api/delivery/doordash/dispatch/${order.id}`);
            setOrders(prev => prev.map(o =>
                o.id === order.id
                    ? { ...o, doordash_delivery_id: data.delivery_id, doordash_status: data.status, doordash_tracking_url: data.tracking_url }
                    : o
            ));
            showToast('DoorDash delivery dispatched!');
        } catch (err) {
            showToast(err.response?.data?.message || 'Dispatch failed.', 'danger');
        } finally {
            setActionId(null);
        }
    };

    const handleCancel = async (order) => {
        if (!window.confirm(`Cancel DoorDash delivery for order ${order.order_number}?`)) return;
        setActionId(order.id);
        try {
            await axios.post(`/api/delivery/doordash/cancel/${order.id}`);
            setOrders(prev => prev.map(o =>
                o.id === order.id ? { ...o, doordash_status: 'delivery_cancelled' } : o
            ));
            showToast('Delivery cancelled.');
        } catch (err) {
            showToast(err.response?.data?.message || 'Cancel failed.', 'danger');
        } finally {
            setActionId(null);
        }
    };

    const openQuoteModal = (order) => {
        setQuoteOrder(order);
        setQuoteResult(null);
        setQuoteError(null);
    };

    const handleGetQuote = async () => {
        if (!quoteOrder) return;
        setQuoteLoading(true);
        setQuoteResult(null);
        setQuoteError(null);
        try {
            // Build pickup address from business
            const biz = quoteOrder.business;
            const pickupAddress = [biz?.address, biz?.city, biz?.state, biz?.zip]
                .filter(Boolean).join(', ');

            const { data } = await axios.post('/api/delivery/doordash/quote', {
                pickup_address:  pickupAddress || quoteOrder.business?.address || '',
                dropoff_address: quoteOrder.delivery_address || '',
                order_value:     quoteOrder.total || 0,
            });
            setQuoteResult(data);
        } catch (err) {
            setQuoteError(err.response?.data?.message || 'Failed to get quote.');
        } finally {
            setQuoteLoading(false);
        }
    };

    const canCancel = (status) =>
        status && !['delivered', 'delivery_cancelled', 'returned'].includes(status);

    const isActive = (id) => actionId === id;

    return (
        <>
            <PageBreadcrumb title="DoorDash Deliveries" subtitle="Ecommerce" />

            {toast && (
                <Alert
                    variant={toast.type}
                    className="position-fixed top-0 end-0 m-3 shadow"
                    style={{ zIndex: 9999, minWidth: 300 }}
                >
                    {toast.msg}
                </Alert>
            )}

            {/* ── Stats row ── */}
            <Row className="g-3 mb-3">
                {[
                    { label: 'Total',      count: orders.length,                                                          color: 'primary',  icon: 'package' },
                    { label: 'Active',     count: orders.filter(o => o.doordash_status && !['delivered','delivery_cancelled','returned'].includes(o.doordash_status)).length, color: 'warning', icon: 'truck' },
                    { label: 'Delivered',  count: orders.filter(o => o.doordash_status === 'delivered').length,           color: 'success',  icon: 'check-circle' },
                    { label: 'Cancelled',  count: orders.filter(o => o.doordash_status === 'delivery_cancelled').length,  color: 'danger',   icon: 'x-circle' },
                ].map(s => (
                    <Col xs={6} md={3} key={s.label}>
                        <Card>
                            <CardBody className="d-flex align-items-center gap-3">
                                <div className={`bg-${s.color} bg-opacity-10 rounded p-2`}>
                                    <Icon name={s.icon} size={22} className={`text-${s.color}`} />
                                </div>
                                <div>
                                    <div className="fw-bold fs-5">{s.count}</div>
                                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{s.label}</div>
                                </div>
                            </CardBody>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* ── Main table ── */}
            <Card>
                <CardHeader className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                        <CardTitle as="h5" className="mb-0">
                            <Icon name="truck" size={17} className="me-2 text-warning" />
                            DoorDash Deliveries
                        </CardTitle>
                        {ddEnv && (
                            <span className={`badge ${ddEnv === 'sandbox' ? 'bg-warning text-dark' : 'bg-success'}`}
                                style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                                {ddEnv === 'sandbox' ? '⚠ SANDBOX' : '✓ PRODUCTION'}
                            </span>
                        )}
                    </div>
                    <Button variant="outline-secondary" size="sm" onClick={loadOrders} disabled={loading}>
                        <Icon name="refresh-cw" size={14} className="me-1" />
                        Reload
                    </Button>
                </CardHeader>
                <CardBody className="p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner className="me-2" />Loading deliveries...
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <Icon name="package" size={32} className="mb-2 d-block mx-auto opacity-50" />
                            No DoorDash deliveries found.<br />
                            <span style={{ fontSize: '0.85rem' }}>
                                Place an order with DoorDash as delivery vendor to see it here.
                            </span>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Order</th>
                                        <th>Customer</th>
                                        <th>Business</th>
                                        <th>Order Status</th>
                                        <th>DoorDash Status</th>
                                        <th>Total</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map(order => (
                                        <tr key={order.id}>
                                            <td>
                                                <div className="fw-semibold">{order.order_number}</div>
                                                {order.doordash_delivery_id && (
                                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                        DD: {order.doordash_delivery_id}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div>{order.customer_name || '—'}</div>
                                                {order.customer_phone && (
                                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                        {order.customer_phone}
                                                    </div>
                                                )}
                                                {order.delivery_address && (
                                                    <div className="text-muted" style={{ fontSize: '0.75rem', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {order.delivery_address}
                                                    </div>
                                                )}
                                            </td>
                                            <td>{order.business?.name || '—'}</td>
                                            <td>
                                                <span className={`badge ${ORDER_STATUS_BADGE[order.status] || 'bg-secondary-subtle text-secondary'}`}>
                                                    {order.status?.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td>
                                                {order.doordash_status ? (
                                                    <>
                                                        <span className={`badge ${DD_STATUS_BADGE[order.doordash_status] || 'bg-secondary-subtle text-secondary'}`}>
                                                            {DD_STATUS_LABEL[order.doordash_status] || order.doordash_status.replace(/_/g, ' ')}
                                                        </span>
                                                        {order.doordash_tracking_url && (
                                                            <a
                                                                href={order.doordash_tracking_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="d-block mt-1 text-primary"
                                                                style={{ fontSize: '0.75rem' }}
                                                            >
                                                                <Icon name="map-pin" size={11} className="me-1" />
                                                                Track
                                                            </a>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-muted">Not dispatched</span>
                                                )}
                                            </td>
                                            <td>${parseFloat(order.total || 0).toFixed(2)}</td>
                                            <td>
                                                <div className="d-flex gap-1 flex-wrap">
                                                    {/* Delivery Fee (from order) */}
                                                    {order.delivery_fee > 0 && (
                                                        <span
                                                            className="badge bg-info-subtle text-info border border-info-subtle"
                                                            style={{ fontSize: '0.75rem', padding: '4px 7px' }}
                                                            title="Delivery fee set on this order"
                                                        >
                                                            <Icon name="dollar-sign" size={11} className="me-1" />
                                                            ${parseFloat(order.delivery_fee).toFixed(2)}
                                                        </span>
                                                    )}

                                                    {/* Dispatch — only if no delivery yet */}
                                                    {!order.doordash_delivery_id && (
                                                        <Button
                                                            size="sm"
                                                            variant="warning"
                                                            onClick={() => handleDispatch(order)}
                                                            disabled={isActive(order.id)}
                                                            title="Dispatch DoorDash delivery"
                                                        >
                                                            {isActive(order.id)
                                                                ? <Spinner size="sm" />
                                                                : <><Icon name="send" size={12} className="me-1" />Dispatch</>
                                                            }
                                                        </Button>
                                                    )}

                                                    {/* Refresh status */}
                                                    {order.doordash_delivery_id && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline-primary"
                                                            onClick={() => handleRefresh(order)}
                                                            disabled={isActive(order.id)}
                                                            title="Refresh live status from DoorDash"
                                                        >
                                                            {isActive(order.id)
                                                                ? <Spinner size="sm" />
                                                                : <Icon name="refresh-cw" size={12} />
                                                            }
                                                        </Button>
                                                    )}

                                                    {/* Cancel */}
                                                    {order.doordash_delivery_id && canCancel(order.doordash_status) && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline-danger"
                                                            onClick={() => handleCancel(order)}
                                                            disabled={isActive(order.id)}
                                                            title="Cancel delivery"
                                                        >
                                                            <Icon name="x" size={12} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* ── Delivery Quote Modal ── */}
            <Modal show={!!quoteOrder} onHide={() => setQuoteOrder(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <Icon name="dollar-sign" size={16} className="me-2 text-info" />
                        Delivery Quote
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {quoteOrder && (
                        <>
                            <div className="mb-3">
                                <div className="d-flex justify-content-between mb-1">
                                    <small className="text-muted">Order</small>
                                    <strong>{quoteOrder.order_number}</strong>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                    <small className="text-muted">Pickup</small>
                                    <span style={{ maxWidth: 220, textAlign: 'right', fontSize: '0.85rem' }}>
                                        {[quoteOrder.business?.address, quoteOrder.business?.city, quoteOrder.business?.state]
                                            .filter(Boolean).join(', ') || '—'}
                                    </span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <small className="text-muted">Dropoff</small>
                                    <span style={{ maxWidth: 220, textAlign: 'right', fontSize: '0.85rem' }}>
                                        {quoteOrder.delivery_address}
                                    </span>
                                </div>
                            </div>

                            {quoteResult && quoteResult.success && (
                                <div className="alert alert-success mb-3 py-2">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="fw-semibold">Estimated Delivery Fee</span>
                                        <span className="fs-5 fw-bold text-success">
                                            {quoteResult.fee !== null
                                                ? `$${parseFloat(quoteResult.fee).toFixed(2)} ${quoteResult.currency || 'USD'}`
                                                : 'See raw response'}
                                        </span>
                                    </div>
                                    {quoteResult.expires_at && (
                                        <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>
                                            Quote expires: {new Date(quoteResult.expires_at).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {quoteError && (
                                <div className={`alert mb-3 py-2 ${quoteError.includes('Classic API') ? 'alert-warning' : 'alert-danger'}`}>
                                    {quoteError.includes('Classic API') && (
                                        <div className="fw-semibold mb-1">
                                            <Icon name="alert-triangle" size={14} className="me-1" />
                                            Quote Not Available
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.85rem' }}>{quoteError}</div>
                                    {quoteError.includes('Classic API') && (
                                        <div className="mt-2" style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                            You can still dispatch deliveries normally using the Dispatch button.
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" size="sm" onClick={() => setQuoteOrder(null)}>Close</Button>
                    <Button
                        variant="info"
                        size="sm"
                        onClick={handleGetQuote}
                        disabled={quoteLoading}
                    >
                        {quoteLoading
                            ? <><Spinner size="sm" className="me-1" />Getting Quote...</>
                            : <><Icon name="zap" size={13} className="me-1" />Get Quote from DoorDash</>
                        }
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}
