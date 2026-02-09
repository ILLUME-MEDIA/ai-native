import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table, Modal, Form, Badge, ProgressBar } from 'react-bootstrap';
import axios from 'axios';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';

const Duties = () => {
    const [duties, setDuties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editDuty, setEditDuty] = useState(null);
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
            setLoading(false);
        } catch (error) {
            console.error('Error fetching duties:', error);
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

    const handleExecuteNow = async (id) => {
        try {
            await axios.post(`/api/ai/duties/${id}/execute-now`);
            alert('Duty execution started signal sent.');
            fetchDuties();
        } catch (error) {
            console.error('Error executing duty:', error);
            alert('Failed to trigger duty');
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
                                        <th>Next Execution</th>
                                        <th>Success/Total</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {duties.map((duty) => (
                                        <tr key={duty.id}>
                                            <td>
                                                <div className="font-weight-bold">{duty.name}</div>
                                                <small className="text-muted">{duty.description}</small>
                                            </td>
                                            <td>
                                                <Badge bg="soft-secondary" className="text-secondary">
                                                    {duty.schedule_type}: {duty.schedule_value}
                                                </Badge>
                                            </td>
                                            <td>{getStatusBadge(duty.status)}</td>
                                            <td>{duty.next_execution_at ? new Date(duty.next_execution_at).toLocaleString() : 'N/A'}</td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <span className="me-2">{duty.success_count}/{duty.execution_count}</span>
                                                    <ProgressBar
                                                        variant="success"
                                                        now={duty.execution_count > 0 ? (duty.success_count / duty.execution_count) * 100 : 0}
                                                        style={{ width: '60px', height: '5px' }}
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
                                                    disabled={duty.status === 'running'}
                                                >
                                                    <Icon icon="play" className="icon-xs" />
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
