import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import {
    Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle,
    Col, Modal, Nav, Row, Spinner, Table
} from 'react-bootstrap';

// ── DoorDash status maps ───────────────────────────────────────────────────────
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

// ── Uber Direct status maps ────────────────────────────────────────────────────
const UD_STATUS_BADGE = {
    pending:         'bg-secondary-subtle text-secondary',
    pickup:          'bg-primary-subtle text-primary',
    pickup_complete: 'bg-primary-subtle text-primary',
    dropoff:         'bg-warning-subtle text-warning',
    delivered:       'bg-success-subtle text-success',
    canceled:        'bg-danger-subtle text-danger',
    returned:        'bg-danger-subtle text-danger',
};
const UD_STATUS_LABEL = {
    pending:         'Pending',
    pickup:          'Courier Heading to Pickup',
    pickup_complete: 'Picked Up',
    dropoff:         'Out for Delivery',
    delivered:       'Delivered',
    canceled:        'Cancelled',
    returned:        'Returned',
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

const VENDOR_META = {
    doordash:      { label: 'DoorDash',          icon: 'truck',    color: 'warning'  },
    doordash_shop: { label: 'DD Shop & Deliver',  icon: 'shopping-cart', color: 'orange' },
    uber_direct:   { label: 'Uber Direct',        icon: 'bolt',     color: 'info'     },
    shipengine:    { label: 'ShipEngine',          icon: 'package',  color: 'primary'  },
};

const DD_SHOP_STATUS_BADGE = {
    created:            'bg-secondary-subtle text-secondary',
    confirmed:          'bg-info-subtle text-info',
    enroute_to_pickup:  'bg-primary-subtle text-primary',
    arrived_at_pickup:  'bg-primary-subtle text-primary',
    picked_up:          'bg-warning-subtle text-warning',
    enroute_to_dropoff: 'bg-warning-subtle text-warning',
    delivered:          'bg-success-subtle text-success',
    delivery_cancelled: 'bg-danger-subtle text-danger',
};

const SE_STATUS_BADGE = {
    in_transit: 'bg-primary-subtle text-primary',
    delivered:  'bg-success-subtle text-success',
    exception:  'bg-danger-subtle text-danger',
    unknown:    'bg-secondary-subtle text-secondary',
};

const isDdDone   = s => ['delivered', 'delivery_cancelled', 'returned'].includes(s);
const isUdDone   = s => ['delivered', 'canceled', 'returned'].includes(s);
const isDdShDone = s => ['delivered', 'delivery_cancelled', 'returned'].includes(s);

export default function DeliveriesPage() {
    const [orders,      setOrders]      = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [tab,         setTab]         = useState('all');
    const [toast,       setToast]       = useState(null);
    const [actionId,    setActionId]    = useState(null);
    const [ddEnv,       setDdEnv]       = useState(null);
    const [ddShEnv,     setDdShEnv]     = useState(null);
    const [udEnv,       setUdEnv]       = useState(null);
    const [quoteOrder,  setQuoteOrder]  = useState(null);
    const [quoteVendor, setQuoteVendor] = useState('doordash');
    const [quoteLoad,   setQuoteLoad]   = useState(false);
    const [quoteResult, setQuoteResult] = useState(null);
    const [quoteError,  setQuoteError]  = useState(null);

    // Pagination
    const [page,    setPage]    = useState(1);
    const [perPage, setPerPage] = useState(100);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 5000);
    };

    useEffect(() => {
        axios.get('/api/delivery/doordash/env').then(r => setDdEnv(r.data.env)).catch(() => {});
        axios.get('/api/delivery/doordash-shop/env').then(r => setDdShEnv(r.data.env)).catch(() => {});
        axios.get('/api/delivery/uber-direct/config').then(r => setUdEnv(r.data.env)).catch(() => {});
    }, []);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/ecommerce/orders?per_page=200');
            setOrders((data.data || []).filter(o =>
                o.doordash_delivery_id || o.doordash_shop_delivery_id ||
                o.uber_direct_delivery_id || o.shipengine_label_id ||
                ['doordash','doordash_shop','uber_direct','shipengine'].includes(o.delivery_vendor)
            ));
        } catch {
            showToast('Failed to load orders.', 'danger');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    const filtered = orders.filter(o => {
        if (tab === 'doordash')      return o.delivery_vendor === 'doordash'      || !!o.doordash_delivery_id;
        if (tab === 'doordash_shop') return o.delivery_vendor === 'doordash_shop' || !!o.doordash_shop_delivery_id;
        if (tab === 'uber_direct')   return o.delivery_vendor === 'uber_direct'   || !!o.uber_direct_delivery_id;
        if (tab === 'shipengine')    return o.delivery_vendor === 'shipengine'     || !!o.shipengine_label_id;
        return true;
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const safePage   = Math.min(page, totalPages);
    const visible    = filtered.slice((safePage - 1) * perPage, safePage * perPage);

    const ddCount  = orders.filter(o => o.delivery_vendor === 'doordash'      || o.doordash_delivery_id).length;
    const ddShCount= orders.filter(o => o.delivery_vendor === 'doordash_shop' || o.doordash_shop_delivery_id).length;
    const udCount  = orders.filter(o => o.delivery_vendor === 'uber_direct'   || o.uber_direct_delivery_id).length;
    const seCount  = orders.filter(o => o.delivery_vendor === 'shipengine'    || o.shipengine_label_id).length;

    const stats = [
        { label: 'Total',     count: orders.length, color: 'primary', icon: 'package' },
        {
            label: 'Active',
            count: orders.filter(o =>
                (o.doordash_status      && !isDdDone(o.doordash_status))     ||
                (o.doordash_shop_status && !isDdShDone(o.doordash_shop_status)) ||
                (o.uber_direct_status   && !isUdDone(o.uber_direct_status))
            ).length,
            color: 'warning', icon: 'truck',
        },
        {
            label: 'Delivered',
            count: orders.filter(o =>
                o.doordash_status === 'delivered' || o.doordash_shop_status === 'delivered' ||
                o.uber_direct_status === 'delivered' || o.shipengine_tracking_number
            ).length,
            color: 'success', icon: 'circle-check',
        },
        {
            label: 'Cancelled',
            count: orders.filter(o =>
                o.doordash_status === 'delivery_cancelled' || o.doordash_shop_status === 'delivery_cancelled' ||
                o.uber_direct_status === 'canceled'
            ).length,
            color: 'danger', icon: 'circle-x',
        },
    ];

    // ── Generic API caller ─────────────────────────────────────────────────────
    const act = async (order, actionKey, fn) => {
        setActionId(`${order.id}-${actionKey}`);
        try { await fn(); } catch (err) {
            showToast(err.response?.data?.message || 'Action failed.', 'danger');
        } finally { setActionId(null); }
    };

    // DoorDash actions
    const ddDispatch = (order) => act(order, 'dispatch', async () => {
        const { data } = await axios.post(`/api/delivery/doordash/dispatch/${order.id}`);
        setOrders(prev => prev.map(o => o.id === order.id
            ? { ...o, doordash_delivery_id: data.delivery_id, doordash_status: data.status, doordash_tracking_url: data.tracking_url, tracking_url: data.tracking_url }
            : o));
        showToast('DoorDash delivery dispatched!');
    });
    const ddRefresh = (order) => act(order, 'refresh', async () => {
        const { data } = await axios.get(`/api/delivery/doordash/status/${order.id}`);
        setOrders(prev => prev.map(o => o.id === order.id
            ? { ...o, doordash_status: data.dd_status, doordash_tracking_url: data.tracking_url, tracking_url: data.tracking_url || o.tracking_url }
            : o));
        showToast(`DoorDash: ${data.dd_label}`);
    });
    const ddCancel = (order) => {
        if (!window.confirm(`Cancel DoorDash delivery for ${order.order_number}?`)) return;
        act(order, 'cancel', async () => {
            await axios.post(`/api/delivery/doordash/cancel/${order.id}`);
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, doordash_status: 'delivery_cancelled' } : o));
            showToast('DoorDash delivery cancelled.');
        });
    };

    // Uber Direct actions
    const udDispatch = (order) => act(order, 'dispatch', async () => {
        const { data } = await axios.post(`/api/delivery/uber-direct/dispatch/${order.id}`);
        setOrders(prev => prev.map(o => o.id === order.id
            ? { ...o, uber_direct_delivery_id: data.delivery_id, uber_direct_status: data.status, uber_direct_tracking_url: data.tracking_url, tracking_url: data.tracking_url }
            : o));
        showToast('Uber Direct delivery dispatched!');
    });

    const udCppDispatch = (order) => act(order, 'cpp', async () => {
        const manifestItems = (order.items || []).map(item => ({
            name:             item.name,
            quantity:         item.quantity || 1,
            price:            Math.round((parseFloat(item.price) || 0) * 100),
            replacement_type: 'contact_customer',
        }));
        if (!manifestItems.length) { showToast('No items on order for CPP dispatch.', 'warning'); return; }
        const { data } = await axios.post(`/api/delivery/uber-direct/cpp/dispatch/${order.id}`, { manifest_items: manifestItems });
        const upd = data.order || {};
        setOrders(prev => prev.map(o => o.id === order.id
            ? { ...o, uber_direct_delivery_id: upd.uber_direct_delivery_id, uber_direct_status: upd.uber_direct_status, uber_direct_tracking_url: upd.uber_direct_tracking_url, tracking_url: upd.tracking_url }
            : o));
        showToast('Uber CPP (Pick & Pack) dispatched!');
    });
    const udRefresh = (order) => act(order, 'refresh', async () => {
        const { data } = await axios.get(`/api/delivery/uber-direct/status/${order.id}`);
        setOrders(prev => prev.map(o => o.id === order.id
            ? { ...o, uber_direct_status: data.status, uber_direct_tracking_url: data.tracking_url, tracking_url: data.tracking_url || o.tracking_url }
            : o));
        showToast(`Uber Direct: ${data.status}`);
    });
    const udCancel = (order) => {
        if (!window.confirm(`Cancel Uber Direct delivery for ${order.order_number}?`)) return;
        act(order, 'cancel', async () => {
            await axios.post(`/api/delivery/uber-direct/cancel/${order.id}`);
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, uber_direct_status: 'canceled' } : o));
            showToast('Uber Direct delivery cancelled.');
        });
    };

    // DoorDash Shop & Deliver actions
    const ddShDispatch = (order) => act(order, 'dispatch', async () => {
        const { data } = await axios.post(`/api/delivery/doordash-shop/dispatch/${order.id}`);
        setOrders(prev => prev.map(o => o.id === order.id
            ? { ...o, doordash_shop_delivery_id: data.delivery_id, doordash_shop_status: data.status, doordash_shop_tracking_url: data.tracking_url, tracking_url: data.tracking_url }
            : o));
        showToast('DoorDash Shop & Deliver dispatched!');
    });
    const ddShRefresh = (order) => act(order, 'refresh', async () => {
        const { data } = await axios.get(`/api/delivery/doordash-shop/status/${order.id}`);
        setOrders(prev => prev.map(o => o.id === order.id
            ? { ...o, doordash_shop_status: data.status, doordash_shop_tracking_url: data.tracking_url }
            : o));
        showToast(`DD Shop: ${data.status_label || data.status}`);
    });
    const ddShCancel = (order) => {
        if (!window.confirm(`Cancel DoorDash Shop delivery for ${order.order_number}?`)) return;
        act(order, 'cancel', async () => {
            await axios.post(`/api/delivery/doordash-shop/cancel/${order.id}`);
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, doordash_shop_status: 'delivery_cancelled' } : o));
            showToast('DoorDash Shop delivery cancelled.');
        });
    };

    // ShipEngine (modal state for carrier/service selection)
    const [seOrder,   setSeOrder]   = useState(null);
    const [seCarriers,setSeCarriers]= useState([]);
    const [seCarrier, setSeCarrier] = useState('');
    const [seService, setSeService] = useState('');
    const [seServices,setSeServices]= useState([]);
    const [seLoading, setSeLoading] = useState(false);

    const openSeModal = async (order) => {
        setSeOrder(order);
        setSeCarrier(''); setSeService(''); setSeServices([]);
        if (!seCarriers.length) {
            try {
                const { data } = await axios.get('/api/delivery/shipengine/carriers');
                setSeCarriers(data.carriers || []);
            } catch { setSeCarriers([]); }
        }
    };
    const onSeCarrierChange = async (carrierId) => {
        setSeCarrier(carrierId); setSeService(''); setSeServices([]);
        if (carrierId) {
            try {
                const { data } = await axios.get(`/api/shipengine/carriers/${carrierId}/services`);
                setSeServices(data.services || []);
            } catch { setSeServices([]); }
        }
    };
    const seDispatch = async () => {
        if (!seOrder || !seCarrier || !seService) return;
        setSeLoading(true);
        try {
            const { data } = await axios.post(`/api/delivery/shipengine/dispatch/${seOrder.id}`, {
                carrier_id: seCarrier, service_code: seService,
            });
            setOrders(prev => prev.map(o => o.id === seOrder.id
                ? { ...o, shipengine_label_id: data.label_id, shipengine_tracking_number: data.tracking_number, shipengine_carrier_code: data.carrier_code, shipengine_label_url: data.label_url, tracking_url: data.tracking_url, delivery_vendor: 'shipengine' }
                : o));
            showToast(`Label created! Tracking: ${data.tracking_number}`);
            setSeOrder(null);
        } catch (err) {
            showToast(err.response?.data?.message || 'ShipEngine error.', 'danger');
        } finally { setSeLoading(false); }
    };
    const seRefresh = (order) => act(order, 'refresh', async () => {
        const { data } = await axios.get(`/api/delivery/shipengine/status/${order.id}`);
        showToast(`ShipEngine: ${data.status_label || data.status}`);
    });
    const seVoid = (order) => {
        if (!window.confirm(`Void shipping label for ${order.order_number}?`)) return;
        act(order, 'void', async () => {
            const { data } = await axios.post(`/api/delivery/shipengine/void/${order.id}`);
            if (data.approved) {
                setOrders(prev => prev.map(o => o.id === order.id ? { ...o, shipengine_label_id: null, shipengine_tracking_number: null } : o));
                showToast('Label voided.');
            } else {
                showToast(data.message || 'Void not approved.', 'warning');
            }
        });
    };

    const openQuote = (order) => {
        setQuoteOrder(order);
        setQuoteVendor(order.delivery_vendor || 'doordash');
        setQuoteResult(null);
        setQuoteError(null);
    };

    const handleGetQuote = async () => {
        if (!quoteOrder) return;
        setQuoteLoad(true); setQuoteResult(null); setQuoteError(null);
        try {
            const biz    = quoteOrder.business;
            const pickup = [biz?.address, biz?.city, biz?.state, biz?.zip].filter(Boolean).join(', ');
            const url    = quoteVendor === 'uber_direct' ? '/api/delivery/uber-direct/quote'
                         : quoteVendor === 'doordash_shop' ? '/api/delivery/doordash-shop/quote'
                         : '/api/delivery/doordash/quote';
            const { data } = await axios.post(url, { pickup_address: pickup, dropoff_address: quoteOrder.delivery_address || '', order_value: quoteOrder.total || 0 });
            setQuoteResult(data);
        } catch (err) {
            setQuoteError(err.response?.data?.message || 'Failed to get quote.');
        } finally { setQuoteLoad(false); }
    };

    const busy   = (id, key) => actionId === `${id}-${key}`;
    const anyAct = (id)      => actionId?.startsWith(`${id}-`);

    // ── Cell renderers ─────────────────────────────────────────────────────────
    const renderStatus = (order) => {
        const trackUrl = order.tracking_url || order.doordash_tracking_url || order.doordash_shop_tracking_url || order.uber_direct_tracking_url;
        const trackLink = trackUrl && (
            <a href={trackUrl} target="_blank" rel="noopener noreferrer"
               className="d-block mt-1 text-primary" style={{ fontSize: '0.75rem' }}>
                <Icon name="map-pin" size={11} className="me-1" />Track
            </a>
        );

        if (order.delivery_vendor === 'doordash' || order.doordash_delivery_id) {
            const s = order.doordash_status;
            return s
                ? <>{<span className={`badge ${DD_STATUS_BADGE[s] || 'bg-secondary-subtle text-secondary'}`}>{DD_STATUS_LABEL[s] || s.replace(/_/g, ' ')}</span>}{trackLink}</>
                : <span className="text-muted" style={{ fontSize: '0.8rem' }}>Not dispatched</span>;
        }
        if (order.delivery_vendor === 'doordash_shop' || order.doordash_shop_delivery_id) {
            const s = order.doordash_shop_status;
            return s
                ? <>{<span className={`badge ${DD_SHOP_STATUS_BADGE[s] || 'bg-secondary-subtle text-secondary'}`}>{s.replace(/_/g, ' ')}</span>}{trackLink}</>
                : <span className="text-muted" style={{ fontSize: '0.8rem' }}>Not dispatched</span>;
        }
        if (order.delivery_vendor === 'uber_direct' || order.uber_direct_delivery_id) {
            const s = order.uber_direct_status;
            return s
                ? <>{<span className={`badge ${UD_STATUS_BADGE[s] || 'bg-secondary-subtle text-secondary'}`}>{UD_STATUS_LABEL[s] || s.replace(/_/g, ' ')}</span>}{trackLink}</>
                : <span className="text-muted" style={{ fontSize: '0.8rem' }}>Not dispatched</span>;
        }
        if (order.delivery_vendor === 'shipengine' || order.shipengine_label_id) {
            return order.shipengine_tracking_number
                ? <><span className="badge bg-primary-subtle text-primary">{order.shipengine_carrier_code?.toUpperCase()}</span>
                    <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>{order.shipengine_tracking_number}</div>
                    {trackLink}</>
                : <span className="text-muted" style={{ fontSize: '0.8rem' }}>Label pending</span>;
        }
        return <span className="text-muted">—</span>;
    };

    const renderActions = (order) => {
        const isBusy = anyAct(order.id);
        if (order.delivery_vendor === 'doordash' || order.doordash_delivery_id) {
            const dispatched = !!order.doordash_delivery_id;
            const done       = isDdDone(order.doordash_status);
            return (
                <div className="d-flex gap-1 flex-wrap">
                    {!dispatched && <Button size="sm" variant="warning" disabled={isBusy} onClick={() => ddDispatch(order)}>
                        {busy(order.id,'dispatch') ? <Spinner size="sm" /> : <><Icon name="send" size={12} className="me-1" />Dispatch</>}
                    </Button>}
                    {dispatched && <Button size="sm" variant="outline-primary" disabled={isBusy} onClick={() => ddRefresh(order)} title="Refresh status">
                        {busy(order.id,'refresh') ? <Spinner size="sm" /> : <Icon name="reload" size={12} />}
                    </Button>}
                    {dispatched && !done && <Button size="sm" variant="outline-danger" disabled={isBusy} onClick={() => ddCancel(order)} title="Cancel">
                        <Icon name="x" size={12} />
                    </Button>}
                    <Button size="sm" variant="outline-secondary" disabled={isBusy} onClick={() => openQuote(order)} title="Get quote">
                        <Icon name="currency-dollar" size={12} />
                    </Button>
                </div>
            );
        }
        if (order.delivery_vendor === 'doordash_shop' || order.doordash_shop_delivery_id) {
            const dispatched = !!order.doordash_shop_delivery_id;
            const done       = isDdShDone(order.doordash_shop_status);
            return (
                <div className="d-flex gap-1 flex-wrap">
                    {!dispatched && <Button size="sm" style={{ backgroundColor: '#ff6900', borderColor: '#ff6900', color: '#fff' }} disabled={isBusy} onClick={() => ddShDispatch(order)}>
                        {busy(order.id,'dispatch') ? <Spinner size="sm" /> : <><Icon name="send" size={12} className="me-1" />Dispatch</>}
                    </Button>}
                    {dispatched && <Button size="sm" variant="outline-primary" disabled={isBusy} onClick={() => ddShRefresh(order)} title="Refresh">
                        {busy(order.id,'refresh') ? <Spinner size="sm" /> : <Icon name="reload" size={12} />}
                    </Button>}
                    {dispatched && !done && <Button size="sm" variant="outline-danger" disabled={isBusy} onClick={() => ddShCancel(order)} title="Cancel">
                        <Icon name="x" size={12} />
                    </Button>}
                    <Button size="sm" variant="outline-secondary" disabled={isBusy} onClick={() => openQuote(order)} title="Get quote">
                        <Icon name="currency-dollar" size={12} />
                    </Button>
                </div>
            );
        }
        if (order.delivery_vendor === 'uber_direct' || order.uber_direct_delivery_id) {
            const dispatched = !!order.uber_direct_delivery_id;
            const done       = isUdDone(order.uber_direct_status);
            return (
                <div className="d-flex gap-1 flex-wrap">
                    {!dispatched && <>
                        <Button size="sm" variant="info" disabled={isBusy} onClick={() => udDispatch(order)} title="Uber Direct dispatch">
                            {busy(order.id,'dispatch') ? <Spinner size="sm" /> : <><Icon name="send" size={12} className="me-1" />Dispatch</>}
                        </Button>
                        <Button size="sm" variant="outline-info" disabled={isBusy} onClick={() => udCppDispatch(order)} title="Dispatch via Courier Pick & Pack (CPP)">
                            {busy(order.id,'cpp') ? <Spinner size="sm" /> : <>CPP</>}
                        </Button>
                    </>}
                    {dispatched && <Button size="sm" variant="outline-primary" disabled={isBusy} onClick={() => udRefresh(order)} title="Refresh status">
                        {busy(order.id,'refresh') ? <Spinner size="sm" /> : <Icon name="reload" size={12} />}
                    </Button>}
                    {dispatched && !done && <Button size="sm" variant="outline-danger" disabled={isBusy} onClick={() => udCancel(order)} title="Cancel">
                        <Icon name="x" size={12} />
                    </Button>}
                    <Button size="sm" variant="outline-secondary" disabled={isBusy} onClick={() => openQuote(order)} title="Get quote">
                        <Icon name="currency-dollar" size={12} />
                    </Button>
                </div>
            );
        }
        if (order.delivery_vendor === 'shipengine' || order.shipengine_label_id) {
            const hasLabel = !!order.shipengine_label_id;
            return (
                <div className="d-flex gap-1 flex-wrap">
                    {!hasLabel && <Button size="sm" variant="primary" disabled={isBusy} onClick={() => openSeModal(order)}>
                        <Icon name="tag" size={12} className="me-1" />Create Label
                    </Button>}
                    {hasLabel && <Button size="sm" variant="outline-primary" disabled={isBusy} onClick={() => seRefresh(order)} title="Refresh tracking">
                        {busy(order.id,'refresh') ? <Spinner size="sm" /> : <Icon name="reload" size={12} />}
                    </Button>}
                    {hasLabel && order.shipengine_label_url && (
                        <a href={order.shipengine_label_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary" title="Download label">
                            <Icon name="download" size={12} />
                        </a>
                    )}
                    {hasLabel && <Button size="sm" variant="outline-danger" disabled={isBusy} onClick={() => seVoid(order)} title="Void label">
                        <Icon name="x" size={12} />
                    </Button>}
                </div>
            );
        }
        return null;
    };

    return (
        <>
            <PageBreadcrumb title="Deliveries" subtitle="Ecommerce" />

            {toast && (
                <Alert variant={toast.type} className="position-fixed top-0 end-0 m-3 shadow" style={{ zIndex: 9999, minWidth: 300 }}>
                    {toast.msg}
                </Alert>
            )}

            {/* Stats */}
            <Row className="g-3 mb-3">
                {stats.map(s => (
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

            {/* Main card */}
            <Card>
                <CardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <CardTitle as="h5" className="mb-0">
                            <Icon name="truck" size={17} className="me-2 text-warning" />
                            Deliveries
                        </CardTitle>
                        {ddEnv && (
                            <span className={`badge ${ddEnv === 'sandbox' ? 'bg-warning text-dark' : 'bg-success'}`} style={{ fontSize: '0.68rem' }}>
                                DD {ddEnv === 'sandbox' ? '⚠ SANDBOX' : '✓ PROD'}
                            </span>
                        )}
                        {ddShEnv && (
                            <span className={`badge ${ddShEnv === 'sandbox' ? 'bg-warning text-dark' : 'bg-success'}`} style={{ fontSize: '0.68rem' }}>
                                DD Shop {ddShEnv === 'sandbox' ? '⚠ SANDBOX' : '✓ PROD'}
                            </span>
                        )}
                        {udEnv && (
                            <span className={`badge ${udEnv === 'sandbox' ? 'bg-info text-dark' : 'bg-success'}`} style={{ fontSize: '0.68rem' }}>
                                Uber {udEnv === 'sandbox' ? '⚠ SANDBOX' : '✓ PROD'}
                            </span>
                        )}
                    </div>
                    <Button variant="outline-secondary" size="sm" onClick={loadOrders} disabled={loading}>
                        <Icon name="reload" size={14} className="me-1" />Reload
                    </Button>
                </CardHeader>

                {/* Tabs */}
                <div className="border-bottom px-3 pt-2">
                    <Nav variant="tabs" className="border-0">
                        {[
                            { key: 'all',          label: `All (${orders.length})` },
                            { key: 'doordash',     label: `DoorDash (${ddCount})` },
                            { key: 'doordash_shop',label: `DD Shop (${ddShCount})` },
                            { key: 'uber_direct',  label: `Uber Direct (${udCount})` },
                            { key: 'shipengine',   label: `ShipEngine (${seCount})` },
                        ].map(t => (
                            <Nav.Item key={t.key}>
                                <Nav.Link active={tab === t.key}
                                    className={`pb-2 ${tab === t.key ? 'fw-semibold' : ''}`}
                                    style={{ cursor: 'pointer', fontSize: '0.875rem' }}
                                    onClick={() => { setTab(t.key); setPage(1); }}>
                                    {t.label}
                                </Nav.Link>
                            </Nav.Item>
                        ))}
                    </Nav>

                </div>

                <CardBody className="p-0">
                    {loading ? (
                        <div className="text-center py-5"><Spinner className="me-2" />Loading...</div>
                    ) : visible.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <Icon name="package" size={32} className="mb-2 d-block mx-auto opacity-50" />
                            No deliveries found.
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Order</th>
                                        <th>Customer</th>
                                        <th>Vendor</th>
                                        <th>Order Status</th>
                                        <th>Delivery Status</th>
                                        <th>Total</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map(order => {
                                        const vm      = VENDOR_META[order.delivery_vendor] || { label: order.delivery_vendor || 'Unknown', icon: 'truck', color: 'secondary' };
                                        const delivId = order.doordash_delivery_id || order.doordash_shop_delivery_id || order.uber_direct_delivery_id || order.shipengine_tracking_number;
                                        return (
                                            <tr key={order.id}>
                                                <td>
                                                    <div className="fw-semibold">{order.order_number}</div>
                                                    {delivId && <div className="text-muted" style={{ fontSize: '0.72rem' }}>ID: {delivId}</div>}
                                                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                        {new Date(order.created_at).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div>{order.customer_name || '—'}</div>
                                                    {order.customer_phone && <div className="text-muted" style={{ fontSize: '0.75rem' }}>{order.customer_phone}</div>}
                                                    {order.delivery_address && (
                                                        <div className="text-muted" style={{ fontSize: '0.72rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {order.delivery_address}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`badge bg-${vm.color}-subtle text-${vm.color} border border-${vm.color}-subtle`} style={{ fontSize: '0.75rem' }}>
                                                        <Icon name={vm.icon} size={11} className="me-1" />{vm.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${ORDER_STATUS_BADGE[order.status] || 'bg-secondary-subtle text-secondary'}`}>
                                                        {order.status?.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td>{renderStatus(order)}</td>
                                                <td>${parseFloat(order.total || 0).toFixed(2)}</td>
                                                <td>{renderActions(order)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination footer */}
                    {!loading && filtered.length > 0 && (
                        <TablePagination
                            totalItems={filtered.length}
                            start={filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1}
                            end={Math.min(safePage * perPage, filtered.length)}
                            itemsName="deliveries"
                            showInfo
                            pageIndex={safePage - 1}
                            pageCount={totalPages}
                            setPageIndex={p => setPage(p + 1)}
                            previousPage={() => setPage(p => p - 1)}
                            canPreviousPage={safePage > 1}
                            nextPage={() => setPage(p => p + 1)}
                            canNextPage={safePage < totalPages}
                            perPage={perPage}
                            onPerPageChange={n => { setPerPage(n); setPage(1); }}
                            perPageOptions={[25, 50, 100, 200]}
                        />
                    )}
                </CardBody>
            </Card>

            {/* Quote Modal */}
            <Modal show={!!quoteOrder} onHide={() => setQuoteOrder(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title><Icon name="currency-dollar" size={16} className="me-2 text-info" />Delivery Quote</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {quoteOrder && (
                        <>
                            <div className="mb-3 d-flex gap-2 flex-wrap">
                                {['doordash', 'doordash_shop', 'uber_direct'].map(v => (
                                    <Button key={v} size="sm"
                                        variant={quoteVendor === v ? (v === 'uber_direct' ? 'info' : 'warning') : 'outline-secondary'}
                                        onClick={() => { setQuoteVendor(v); setQuoteResult(null); setQuoteError(null); }}>
                                        {VENDOR_META[v].label}
                                    </Button>
                                ))}
                            </div>
                            <div className="bg-light rounded p-2 mb-3" style={{ fontSize: '0.85rem' }}>
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="text-muted">Order</span><strong>{quoteOrder.order_number}</strong>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="text-muted">Pickup</span>
                                    <span>{[quoteOrder.business?.address, quoteOrder.business?.city, quoteOrder.business?.state].filter(Boolean).join(', ')}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="text-muted">Dropoff</span>
                                    <span style={{ maxWidth: 200, textAlign: 'right' }}>{quoteOrder.delivery_address}</span>
                                </div>
                            </div>
                            {quoteResult && (
                                <Alert variant="success" className="py-2">
                                    <div className="d-flex justify-content-between">
                                        <span className="fw-semibold">Estimated Fee</span>
                                        <span className="fs-5 fw-bold">
                                            {quoteResult.fee != null ? `$${parseFloat(quoteResult.fee).toFixed(2)}` : '—'}
                                        </span>
                                    </div>
                                </Alert>
                            )}
                            {quoteError && <Alert variant="danger" className="py-2" style={{ fontSize: '0.85rem' }}>{quoteError}</Alert>}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" size="sm" onClick={() => setQuoteOrder(null)}>Close</Button>
                    <Button variant="info" size="sm" onClick={handleGetQuote} disabled={quoteLoad}>
                        {quoteLoad ? <><Spinner size="sm" className="me-1" />Getting...</> : <><Icon name="bolt" size={13} className="me-1" />Get Quote</>}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ShipEngine Label Modal */}
            <Modal show={!!seOrder} onHide={() => setSeOrder(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title><Icon name="package" size={16} className="me-2 text-primary" />Create Shipping Label</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {seOrder && (
                        <>
                            <div className="bg-light rounded p-2 mb-3" style={{ fontSize: '0.85rem' }}>
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="text-muted">Order</span><strong>{seOrder.order_number}</strong>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="text-muted">Ship To</span>
                                    <span style={{ maxWidth: 200, textAlign: 'right' }}>{seOrder.delivery_address}</span>
                                </div>
                            </div>
                            <div className="mb-2">
                                <label className="form-label form-label-sm">Carrier</label>
                                <select className="form-select form-select-sm" value={seCarrier} onChange={e => onSeCarrierChange(e.target.value)}>
                                    <option value="">Select carrier...</option>
                                    {seCarriers.map(c => <option key={c.carrier_id} value={c.carrier_id}>{c.friendly_name || c.carrier_id}</option>)}
                                </select>
                            </div>
                            {seCarrier && (
                                <div className="mb-2">
                                    <label className="form-label form-label-sm">Service</label>
                                    <select className="form-select form-select-sm" value={seService} onChange={e => setSeService(e.target.value)}>
                                        <option value="">Select service...</option>
                                        {seServices.map(s => <option key={s.service_code} value={s.service_code}>{s.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" size="sm" onClick={() => setSeOrder(null)}>Close</Button>
                    <Button variant="primary" size="sm" onClick={seDispatch} disabled={seLoading || !seCarrier || !seService}>
                        {seLoading ? <><Spinner size="sm" className="me-1" />Creating...</> : <><Icon name="tag" size={13} className="me-1" />Create Label</>}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}
