import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table, Modal, Form, Badge, ProgressBar, Spinner } from 'react-bootstrap';
import axios from 'axios';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';

const Duties = () => {
    const [duties, setDuties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editDuty, setEditDuty] = useState(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [resultDuty, setResultDuty] = useState(null);
    const [loadingResult, setLoadingResult] = useState(false);
    const [executingIds, setExecutingIds] = useState(new Set()); // per-duty loading state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        instructions: '',
        schedule_type: 'interval',
        schedule_value: 'every_12_hours',
        is_active: true,
        priority: 0
    });

    useEffect(() => {
        fetchDuties();
        const interval = setInterval(fetchDuties, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, []);

    const fetchDuties = async () => {
        try {
            const response = await axios.get('/api/ai/duties');
            setDuties(response.data);
        } catch (error) {
            console.error('Error fetching duties:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = async (duty = null) => {
        if (duty) {
            setShowModal(true);
            try {
                const { data: full } = await axios.get(`/api/ai/duties/${duty.id}`);
                setEditDuty(full);
                setFormData({
                    name: full.name,
                    description: full.description || '',
                    instructions: full.instructions || '',
                    schedule_type: full.schedule_type,
                    schedule_value: full.schedule_value || '',
                    is_active: full.is_active,
                    priority: full.priority ?? 0
                });
            } catch (e) {
                console.error(e);
                setEditDuty(duty);
                setFormData({
                    name: duty.name,
                    description: duty.description || '',
                    instructions: '',
                    schedule_type: duty.schedule_type,
                    schedule_value: duty.schedule_value || '',
                    is_active: duty.is_active,
                    priority: duty.priority ?? 0
                });
            }
        } else {
            setEditDuty(null);
            setFormData({
                name: '',
                description: '',
                instructions: '',
                schedule_type: 'interval',
                schedule_value: 'every_12_hours',
                is_active: true,
                priority: 0
            });
            setShowModal(true);
        }
    };

    const handleCloseModal = () => setShowModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editDuty) {
                await axios.patch(`/api/ai/duties/${editDuty.id}`, formData);
            } else {
                await axios.post('/api/ai/duties', formData);
            }
            fetchDuties();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving duty:', error);
            alert('Failed to save duty');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this duty?')) {
            try {
                await axios.delete(`/api/ai/duties/${id}`);
                fetchDuties();
            } catch (error) {
                console.error('Error deleting duty:', error);
            }
        }
    };

    const handleExecuteNow = async (dutyOrId) => {
        const id = typeof dutyOrId === 'object' ? dutyOrId.id : dutyOrId;

        // Mark as executing (shows spinner on button)
        setExecutingIds(prev => new Set([...prev, id]));

        try {
            const res = await axios.post(`/api/ai/duties/${id}/execute-now`);
            await fetchDuties();

            // Auto-open result modal with fresh data instead of alert
            const freshDuty = (await axios.get(`/api/ai/duties/${id}`)).data;
            setResultDuty(freshDuty);
            setShowResultModal(true);
        } catch (error) {
            console.error('Error executing duty:', error);
            alert('Failed to trigger duty: ' + (error.response?.data?.error || error.message));
        } finally {
            setExecutingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        }
    };

    const handleViewResult = async (duty) => {
        setLoadingResult(true);
        setShowResultModal(true);
        try {
            const { data } = await axios.get(`/api/ai/duties/${duty.id}`);
            setResultDuty(data);
        } catch (e) {
            setResultDuty(duty);
        } finally {
            setLoadingResult(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'running': return <Badge bg="primary">Running</Badge>;
            case 'completed': return <Badge bg="success">Completed</Badge>;
            case 'failed': return <Badge bg="danger">Failed</Badge>;
            default: return <Badge bg="secondary">Pending</Badge>;
        }
    };

    return (
        <>
            <PageBreadcrumb title="Automated AI Duties" subtitle="Global AI System" />
            <Row>
                <Col xs={12}>
                    <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <Card.Title as="h5">Duties List</Card.Title>
                            <Button variant="primary" size="sm" onClick={() => handleOpenModal()}>
                                Create New Duty
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Table responsive className="table-centered table-nowrap mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Name</th>
                                        <th>Schedule</th>
                                        <th>Status</th>
                                        <th>Last Run</th>
                                        <th>Next Run</th>
                                        <th>✓ / ✗ / Total</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {duties.map((duty) => (
                                        <tr key={duty.id}>
                                            <td>
                                                <div className="font-weight-bold">{duty.name}</div>
                                                <small className="text-muted">{duty.description}</small>
                                                {duty.error_message && (
                                                    <div className="text-danger small mt-1" style={{ maxWidth: 300, whiteSpace: 'normal' }}>
                                                        <Icon icon="alert-circle" className="icon-xs me-1" />
                                                        {duty.error_message.substring(0, 120)}{duty.error_message.length > 120 ? '…' : ''}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <Badge bg="soft-secondary" className="text-secondary">
                                                    {duty.schedule_type}: {duty.schedule_value}
                                                </Badge>
                                            </td>
                                            <td>{getStatusBadge(duty.status)}</td>
                                            <td>
                                                <small className="text-muted">
                                                    {duty.last_executed_at ? new Date(duty.last_executed_at).toLocaleString() : '—'}
                                                </small>
                                            </td>
                                            <td>
                                                <small>{duty.next_execution_at ? new Date(duty.next_execution_at).toLocaleString() : 'N/A'}</small>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center gap-1">
                                                    <span className="text-success small">{duty.success_count}</span>
                                                    <span className="text-muted small">/</span>
                                                    <span className="text-danger small">{duty.failure_count ?? 0}</span>
                                                    <span className="text-muted small">/</span>
                                                    <span className="text-muted small">{duty.execution_count}</span>
                                                    <ProgressBar
                                                        variant="success"
                                                        now={duty.execution_count > 0 ? (duty.success_count / duty.execution_count) * 100 : 0}
                                                        style={{ width: '50px', height: '5px' }}
                                                        className="ms-1"
                                                    />
                                                </div>
                                            </td>
                                            <td>
                                                <Button
                                                    variant="soft-success"
                                                    size="sm"
                                                    className="me-1"
                                                    onClick={() => handleExecuteNow(duty.id)}
                                                    title="Run Now"
                                                    disabled={duty.status === 'running' || executingIds.has(duty.id)}
                                                >
                                                    {executingIds.has(duty.id)
                                                        ? <Spinner animation="border" size="sm" style={{ width: '10px', height: '10px' }} />
                                                        : <Icon icon="play" className="icon-xs" />
                                                    }
                                                </Button>
                                                <Button
                                                    variant="soft-warning"
                                                    size="sm"
                                                    className="me-1"
                                                    onClick={() => handleViewResult(duty)}
                                                    title="View Last Result / Log"
                                                >
                                                    <Icon icon="file-text" className="icon-xs" />
                                                </Button>
                                                <Button
                                                    variant="soft-info"
                                                    size="sm"
                                                    className="me-1"
                                                    onClick={() => handleOpenModal(duty)}
                                                >
                                                    <Icon icon="edit" className="icon-xs" />
                                                </Button>
                                                <Button
                                                    variant="soft-danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(duty.id)}
                                                >
                                                    <Icon icon="trash" className="icon-xs" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {duties.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan="6" className="text-center">No automated duties configured.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* ─── Result / Log Modal ─── */}
            <Modal show={showResultModal} onHide={() => setShowResultModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <Icon icon="file-text" className="me-2" />
                        Duty Log: {resultDuty?.name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {loadingResult ? (
                        <div className="text-center py-4"><Spinner animation="border" size="sm" /> Loading...</div>
                    ) : resultDuty ? (
                        <>
                            {/* Status + counts */}
                            <div className="d-flex align-items-center gap-2 mb-3">
                                {getStatusBadge(resultDuty.status)}
                                <span className="text-success small">✓ {resultDuty.success_count} success</span>
                                <span className="text-danger small">✗ {resultDuty.failure_count ?? 0} failed</span>
                                <span className="text-muted small">/ {resultDuty.execution_count} total runs</span>
                            </div>

                            {/* Execution context (playlist + platform) */}
                            {resultDuty.execution_data && (
                                <div className="mb-3">
                                    <strong className="small text-muted d-block mb-1">Context</strong>
                                    <div className="border rounded p-2 bg-light small">
                                        {resultDuty.execution_data.playlist_title && (
                                            <div><strong>Playlist:</strong> {resultDuty.execution_data.playlist_title}</div>
                                        )}
                                        {resultDuty.execution_data.platform_name && (
                                            <div><strong>Platform:</strong> {resultDuty.execution_data.platform_name}</div>
                                        )}
                                        {resultDuty.execution_data.platform_album_id && (
                                            <div><strong>Album ID:</strong> {resultDuty.execution_data.platform_album_id}</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Timestamps */}
                            <div className="mb-3 small text-muted">
                                <strong>Last run:</strong> {resultDuty.last_executed_at ? new Date(resultDuty.last_executed_at).toLocaleString() : '—'}
                                &nbsp;&nbsp;
                                <strong>Next run:</strong> {resultDuty.next_execution_at ? new Date(resultDuty.next_execution_at).toLocaleString() : 'N/A'}
                            </div>

                            {/* Error message */}
                            {resultDuty.error_message && (
                                <div className="alert alert-danger small mb-3">
                                    <strong>Error:</strong> {resultDuty.error_message}
                                </div>
                            )}

                            {/* Last result */}
                            {resultDuty.last_result ? (
                                <div className="mb-3">
                                    <strong className="small text-muted d-block mb-1">Last Run Result</strong>
                                    {/* Summary row if it's a platform push */}
                                    {resultDuty.last_result.details && (
                                        <div className="d-flex gap-3 mb-2">
                                            <span className="badge bg-success">Pushed: {resultDuty.last_result.details.success ?? 0}</span>
                                            <span className="badge bg-danger">Failed: {resultDuty.last_result.details.failed ?? 0}</span>
                                            <span className="badge bg-secondary">Skipped: {resultDuty.last_result.details.skipped ?? 0}</span>
                                        </div>
                                    )}
                                    {/* Summary row if it's a youtube sync */}
                                    {resultDuty.last_result.videos_fetched !== undefined && (
                                        <div className="d-flex gap-3 mb-2">
                                            <span className="badge bg-info">Fetched: {resultDuty.last_result.videos_fetched ?? 0}</span>
                                            <span className="badge bg-success">New: {resultDuty.last_result.new_episodes ?? 0}</span>
                                            <span className="badge bg-secondary">Tags gen: {resultDuty.last_result.tags_genres_generated ?? 0}</span>
                                        </div>
                                    )}
                                    {resultDuty.last_result.message && (
                                        <div className="text-muted small mb-2">{resultDuty.last_result.message}</div>
                                    )}
                                    {/* Full JSON */}
                                    <details>
                                        <summary className="small text-muted" style={{ cursor: 'pointer' }}>View raw JSON</summary>
                                        <pre className="small bg-light p-2 rounded mt-1" style={{ maxHeight: 200, overflow: 'auto', fontSize: '11px' }}>
                                            {JSON.stringify(resultDuty.last_result, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            ) : (
                                <div className="text-muted small">No result data yet. Run the duty to see output here.</div>
                            )}

                            {/* Instructions (collapsed) */}
                            <details>
                                <summary className="small text-muted" style={{ cursor: 'pointer' }}>View instructions</summary>
                                <pre className="small bg-light p-2 rounded mt-1" style={{ maxHeight: 150, overflow: 'auto', fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                                    {resultDuty.instructions}
                                </pre>
                            </details>
                        </>
                    ) : null}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" size="sm" onClick={() => setShowResultModal(false)}>Close</Button>
                    {resultDuty && (
                        <Button
                            variant="success"
                            size="sm"
                            disabled={resultDuty.status === 'running' || executingIds.has(resultDuty.id)}
                            onClick={() => handleExecuteNow(resultDuty.id)}
                        >
                            {executingIds.has(resultDuty.id)
                                ? <><Spinner animation="border" size="sm" className="me-1" style={{ width: '12px', height: '12px' }} />Running...</>
                                : <><Icon icon="play" className="icon-xs me-1" />Run Now</>
                            }
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>

            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{editDuty ? 'Edit' : 'Create'} Automated Duty</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Duty Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        required
                                        placeholder="e.g. Sync YouTube Videos"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Priority</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Detailed Instructions (Prompt for AI duties)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={5}
                                required
                                value={formData.instructions}
                                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                            />
                        </Form.Group>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Schedule Type</Form.Label>
                                    <Form.Select
                                        value={formData.schedule_type}
                                        onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
                                    >
                                        <option value="interval">Interval (Every X minutes/hours)</option>
                                        <option value="daily">Daily (At specific time)</option>
                                        <option value="weekly">Weekly (At specific day/time)</option>
                                        <option value="monthly">Monthly (At specific date/time)</option>
                                        <option value="cron">Cron Expression</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Schedule Value</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g. every_12_hours, 14:30, Monday:09:00"
                                        value={formData.schedule_value}
                                        onChange={(e) => setFormData({ ...formData, schedule_value: e.target.value })}
                                    />
                                    <Form.Text className="text-muted">
                                        Examples: <code>every_30_minutes</code>, <code>10:00</code>, <code>Sunday:22:00</code>
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Check
                                type="switch"
                                label="Is Active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                        </Form.Group>

                        <div className="text-end">
                            <Button variant="secondary" className="me-1" onClick={handleCloseModal}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit">
                                {editDuty ? 'Update' : 'Create'} Duty
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default Duties;
