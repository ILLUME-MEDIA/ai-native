import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import {
    Card, CardBody, CardHeader, Col,
    Collapse, Form, Row, Spinner,
} from 'react-bootstrap';

const api = (path, opts = {}) => axios({ url: `/api/ecommerce/${path}`, ...opts });

const STATUS_FLOW = ['pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled'];
const STATUS_BADGE = {
    pending:          'bg-warning-subtle text-warning',
    confirmed:        'bg-info-subtle text-info',
    preparing:        'bg-primary-subtle text-primary',
    ready:            'bg-success-subtle text-success',
    out_for_delivery: 'bg-primary-subtle text-primary',
    delivered:        'bg-success-subtle text-success',
    cancelled:        'bg-danger-subtle text-danger',
};
const STATUS_LABEL = {
    pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing',
    ready: 'Ready', out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered', cancelled: 'Cancelled',
};

export default function OrdersPage() {
    const navigate = useNavigate();
    const [orders, setOrders]         = useState([]);
    const [loading, setLoading]       = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [meta, setMeta]             = useState(null);
    const [page, setPage]             = useState(1);
    const [perPage, setPerPage]       = useState(15);
    const [expandedId, setExpandedId] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    const load = useCallback(async (pg = 1, pp = perPage) => {
        setLoading(true);
        const params = new URLSearchParams({ page: pg, per_page: pp });
        if (statusFilter) params.append('status', statusFilter);
        const { data } = await api(`orders?${params}`);
        setOrders(data.data);
        setMeta({ total: data.total, lastPage: data.last_page, currentPage: data.current_page, perPage: pp });
        setPage(pg);
        setLoading(false);
    }, [statusFilter, perPage]);

    useEffect(() => { load(1); }, [load]);

    const updateStatus = async (order, status) => {
        setUpdatingId(order.id);
        await api(`orders/${order.id}/status`, { method: 'patch', data: { status } });
        setUpdatingId(null);
        load(page);
    };

    const statCounts = STATUS_FLOW.reduce((acc, s) => {
        acc[s] = orders.filter(o => o.status === s).length;
        return acc;
    }, {});

    return (
        <>
            <PageBreadcrumb title="Orders" subtitle="Ecommerce" />

            {/* Quick stats */}
            <Row className="g-2 mb-4">
                {[
                    { label: 'Pending',   status: 'pending',   color: 'text-warning', icon: 'clock'       },
                    { label: 'Preparing', status: 'preparing', color: 'text-primary', icon: 'chef-hat'    },
                    { label: 'Ready',     status: 'ready',     color: 'text-success', icon: 'circle-check' },
                    { label: 'Delivered', status: 'delivered', color: 'text-info',    icon: 'truck'        },
                ].map(({ label, status, color, icon }) => (
                    <Col key={status} xs={6} md={3}>
                        <Card style={{ cursor: 'pointer' }} onClick={() => setStatusFilter(statusFilter === status ? '' : status)}>
                            <CardBody className={`d-flex align-items-center gap-3 p-3 ${statusFilter === status ? 'border border-primary' : ''}`}>
                                <span className={`avatar avatar-sm rounded d-flex align-items-center justify-content-center bg-light ${color}`}>
                                    <Icon icon={icon} className="fs-xl" />
                                </span>
                                <div>
                                    <h5 className={`mb-0 fw-bold ${color}`}>{statCounts[status] ?? 0}</h5>
                                    <small className="text-muted">{label}</small>
                                </div>
                            </CardBody>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card>
                <CardHeader className="border-light justify-content-between">
                    <h5 className="card-title mb-0">Order List {meta && <small className="text-muted fw-normal">({meta.total} total)</small>}</h5>
                    <div className="d-flex gap-2">
                        <Form.Select size="sm" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="">All Statuses</option>
                            {STATUS_FLOW.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </Form.Select>
                        <button className="btn btn-light btn-sm btn-icon" onClick={() => load(page)} title="Refresh">
                            <Icon icon="refresh" className="fs-lg" />
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/apps/ecommerce/order-add')}>
                            <Icon icon="plus" className="me-1" />
                            Add Order
                        </button>
                    </div>
                </CardHeader>

                {loading ? (
                    <CardBody className="text-center py-5"><Spinner animation="border" size="sm" className="text-primary" /></CardBody>
                ) : orders.length === 0 ? (
                    <CardBody className="text-center text-muted py-5">No orders found.</CardBody>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr><th>Order</th><th>Business</th><th>Customer</th><th>Type</th><th>Total</th><th>Status</th><th>POS</th><th>Date</th><th></th></tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <React.Fragment key={order.id}>
                                        <tr onClick={() => setExpandedId(expandedId === order.id ? null : order.id)} style={{ cursor: 'pointer' }}>
                                            <td><strong className="font-monospace">{order.order_number}</strong></td>
                                            <td><small>{order.business?.name || `#${order.business_id}`}</small></td>
                                            <td>
                                                <div>
                                                    <small className="fw-semibold">{order.customer_name || '—'}</small>
                                                    {order.customer_phone && <small className="text-muted d-block">{order.customer_phone}</small>}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge bg-secondary-subtle text-secondary">{order.order_type}</span>
                                                {order.delivery_vendor && (
                                                    <span className="ms-1 badge bg-info-subtle text-info" style={{ fontSize: '0.7rem' }}>
                                                        {order.delivery_vendor === 'doordash' ? 'DoorDash' : order.delivery_vendor === 'uber_direct' ? 'Uber Direct' : order.delivery_vendor}
                                                    </span>
                                                )}
                                            </td>
                                            <td><strong className="text-success">${parseFloat(order.total).toFixed(2)}</strong></td>
                                            <td>
                                                <span className={`badge ${STATUS_BADGE[order.status] || 'bg-secondary-subtle text-secondary'}`}>
                                                    {STATUS_LABEL[order.status] || order.status}
                                                </span>
                                            </td>
                                            <td>
                                                {(order.pos_orders || []).length > 0
                                                    ? (order.pos_orders || []).map(po => (
                                                        <span key={po.id} className={`badge me-1 ${po.provider === 'square' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`} style={{ fontSize: '0.7rem' }}>
                                                            {po.provider === 'square' ? 'Square' : 'Clover'}
                                                            <span className="ms-1 opacity-75 text-capitalize">{(po.pos_status || '').toLowerCase()}</span>
                                                        </span>
                                                    ))
                                                    : <span className="text-muted small">—</span>
                                                }
                                            </td>
                                            <td><small className="text-muted">{order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</small></td>
                                            <td><Icon icon={expandedId === order.id ? 'chevron-up' : 'chevron-down'} className="text-muted" /></td>
                                        </tr>
                                        {expandedId === order.id && (
                                            <tr key={`${order.id}-detail`}>
                                                <td colSpan={9} className="p-0">
                                                    <div className="p-3 bg-light">
                                                        <Row>
                                                            <Col md={6}>
                                                                <p className="mb-1 fw-semibold">Order Items</p>
                                                                <table className="table table-sm table-borderless mb-0">
                                                                    <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
                                                                    <tbody>
                                                                        {(order.items || []).map(it => (
                                                                            <tr key={it.id}>
                                                                                <td>{it.name}</td>
                                                                                <td>{it.quantity}</td>
                                                                                <td>${parseFloat(it.price).toFixed(2)}</td>
                                                                                <td>${parseFloat(it.subtotal).toFixed(2)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                                <div className="d-flex justify-content-end mt-2 gap-3">
                                                                    <small>Subtotal: <strong>${parseFloat(order.subtotal).toFixed(2)}</strong></small>
                                                                    <small>Tax: <strong>${parseFloat(order.tax).toFixed(2)}</strong></small>
                                                                    <small>Total: <strong className="text-success">${parseFloat(order.total).toFixed(2)}</strong></small>
                                                                </div>
                                                            </Col>
                                                            <Col md={6}>
                                                                <p className="mb-1 fw-semibold">Update Status</p>
                                                                <div className="d-flex flex-wrap gap-2">
                                                                    {STATUS_FLOW.filter(s => s !== order.status).map(s => (
                                                                        <button key={s} className={`btn btn-sm btn-light`}
                                                                            disabled={updatingId === order.id}
                                                                            onClick={e => { e.stopPropagation(); updateStatus(order, s); }}>
                                                                            {updatingId === order.id ? <Spinner animation="border" size="sm" /> : STATUS_LABEL[s]}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                {order.delivery_address && (
                                                                    <div className="mt-2">
                                                                        <small className="text-muted">Delivery: {order.delivery_address}</small>
                                                                    </div>
                                                                )}
                                                                {order.notes && (
                                                                    <div className="mt-1">
                                                                        <small className="text-muted">Notes: {order.notes}</small>
                                                                    </div>
                                                                )}
                                                                <div className="mt-3">
                                                                    <Link
                                                                        to={`/apps/ecommerce/order-details?id=${order.id}`}
                                                                        className="btn btn-sm btn-outline-primary"
                                                                        onClick={e => e.stopPropagation()}
                                                                    >
                                                                        <Icon icon="eye" className="me-1" />
                                                                        View Full Details
                                                                    </Link>
                                                                </div>
                                                            </Col>
                                                        </Row>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {meta && (
                    <TablePagination
                        totalItems={meta.total}
                        start={meta.total === 0 ? 0 : (meta.currentPage - 1) * (meta.perPage || perPage) + 1}
                        end={Math.min(meta.currentPage * (meta.perPage || perPage), meta.total)}
                        itemsName="orders"
                        showInfo
                        pageIndex={meta.currentPage - 1}
                        pageCount={meta.lastPage}
                        setPageIndex={p => load(p + 1, perPage)}
                        previousPage={() => load(meta.currentPage - 1, perPage)}
                        canPreviousPage={meta.currentPage > 1}
                        nextPage={() => load(meta.currentPage + 1, perPage)}
                        canNextPage={meta.currentPage < meta.lastPage}
                        perPage={perPage}
                        onPerPageChange={n => { setPerPage(n); load(1, n); }}
                        perPageOptions={[10, 15, 25, 50]}
                    />
                )}
            </Card>
        </>
    );
}
