import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table, Modal, Form, Badge } from 'react-bootstrap';
import axios from 'axios';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';

const Rules = () => {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editRule, setEditRule] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        rule_content: '',
        type: 'system',
        is_active: true,
        priority: 0
    });

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const response = await axios.get('/api/ai/rules');
            setRules(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching rules:', error);
            setLoading(false);
        }
    };

    const handleOpenModal = async (rule = null) => {
        if (rule) {
            setShowModal(true);
            try {
                const { data: full } = await axios.get(`/api/ai/rules/${rule.id}`);
                setEditRule(full);
                setFormData({
                    name: full.name,
                    description: full.description || '',
                    rule_content: full.rule_content || '',
                    type: full.type || 'system',
                    is_active: full.is_active,
                    priority: full.priority ?? 0
                });
            } catch (e) {
                console.error(e);
                setEditRule(rule);
                setFormData({
                    name: rule.name,
                    description: rule.description || '',
                    rule_content: '',
                    type: rule.type || 'system',
                    is_active: rule.is_active,
                    priority: rule.priority ?? 0
                });
            }
        } else {
            setEditRule(null);
            setFormData({
                name: '',
                description: '',
                rule_content: '',
                type: 'system',
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
            if (editRule) {
                await axios.patch(`/api/ai/rules/${editRule.id}`, formData);
            } else {
                await axios.post('/api/ai/rules', formData);
            }
            fetchRules();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving rule:', error);
            alert('Failed to save rule');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this rule?')) {
            try {
                await axios.delete(`/api/ai/rules/${id}`);
                fetchRules();
            } catch (error) {
                console.error('Error deleting rule:', error);
            }
        }
    };

    return (
        <>
            <PageBreadcrumb title="AI behavioral Rules" subtitle="Global AI System" />
            <Row>
                <Col xs={12}>
                    <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <Card.Title as="h5">Global Rules List</Card.Title>
                            <Button variant="primary" size="sm" onClick={() => handleOpenModal()}>
                                Add Rule
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Table responsive className="table-centered table-nowrap mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rules.map((rule) => (
                                        <tr key={rule.id}>
                                            <td>
                                                <strong>{rule.name}</strong>
                                                <br /><small>{rule.description}</small>
                                            </td>
                                            <td><Badge bg="soft-primary" className="text-primary capitalize">{rule.type}</Badge></td>
                                            <td>{rule.priority}</td>
                                            <td>
                                                {rule.is_active ? <Badge bg="success">Active</Badge> : <Badge bg="danger">Inactive</Badge>}
                                            </td>
                                            <td>
                                                <Button variant="soft-info" size="sm" className="me-1" onClick={() => handleOpenModal(rule)}>
                                                    <Icon icon="edit" className="icon-xs" />
                                                </Button>
                                                <Button variant="soft-danger" size="sm" onClick={() => handleDelete(rule.id)}>
                                                    <Icon icon="trash" className="icon-xs" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{editRule ? 'Edit' : 'Add'} AI Rule</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Rule Name</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Type</Form.Label>
                            <Form.Select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="system">System (Highest Priority)</option>
                                <option value="behavioral">Behavioral</option>
                                <option value="safety">Safety/Guardrail</option>
                                <option value="formatting">Formatting</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Rule Content (Prompt Injection)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={8}
                                required
                                value={formData.rule_content}
                                onChange={(e) => setFormData({ ...formData, rule_content: e.target.value })}
                            />
                        </Form.Group>
                        <Row>
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
                            <Col md={6}>
                                <Form.Group className="mb-3 mt-4">
                                    <Form.Check
                                        type="switch"
                                        label="Is Active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <div className="text-end">
                            <Button variant="secondary" className="me-1" onClick={handleCloseModal}>Cancel</Button>
                            <Button variant="primary" type="submit">{editRule ? 'Update' : 'Add'} Rule</Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default Rules;
