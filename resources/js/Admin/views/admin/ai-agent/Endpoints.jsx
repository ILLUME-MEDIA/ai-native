import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table, Modal, Form, Badge, Spinner } from 'react-bootstrap';
import axios from 'axios';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';

const Endpoints = () => {
    const [endpoints, setEndpoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editEndpoint, setEditEndpoint] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        provider: 'openai',
        api_key: '',
        base_url: '',
        default_model: '',
        auto_model_selection: true,
        is_active: true
    });
    const [availableModels, setAvailableModels] = useState([]);
    const [fetchingModels, setFetchingModels] = useState(false);

    useEffect(() => {
        fetchEndpoints();
    }, []);

    const fetchEndpoints = async () => {
        try {
            const response = await axios.get('/api/ai/endpoints');
            setEndpoints(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching endpoints:', error);
            setLoading(false);
        }
    };

    const handleOpenModal = async (endpoint = null) => {
        if (endpoint) {
            setShowModal(true);
            try {
                const { data: full } = await axios.get(`/api/ai/endpoints/${endpoint.id}`);
                setEditEndpoint(full);
                setFormData({
                    name: full.name,
                    provider: full.provider,
                    api_key: '',
                    base_url: full.base_url || '',
                    default_model: full.default_model || '',
                    auto_model_selection: full.auto_model_selection ?? true,
                    is_active: full.is_active
                });
                setAvailableModels(full.metadata?.available_models || []);
            } catch (e) {
                console.error(e);
                setEditEndpoint(endpoint);
                setFormData({
                    name: endpoint.name,
                    provider: endpoint.provider,
                    api_key: '',
                    base_url: '',
                    default_model: endpoint.default_model || '',
                    auto_model_selection: endpoint.auto_model_selection ?? true,
                    is_active: endpoint.is_active
                });
                setAvailableModels([]);
            }
        } else {
            setEditEndpoint(null);
            setFormData({
                name: '',
                provider: 'openai',
                api_key: '',
                base_url: '',
                default_model: '',
                auto_model_selection: true,
                is_active: true
            });
            setAvailableModels([]);
            setShowModal(true);
        }
    };

    const handleCloseModal = () => setShowModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editEndpoint) {
                const data = { ...formData };
                if (!data.api_key) delete data.api_key;
                await axios.patch(`/api/ai/endpoints/${editEndpoint.id}`, data);
            } else {
                await axios.post('/api/ai/endpoints', formData);
            }
            fetchEndpoints();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving endpoint:', error);
            alert('Failed to save endpoint');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this endpoint?')) {
            try {
                await axios.delete(`/api/ai/endpoints/${id}`);
                fetchEndpoints();
            } catch (error) {
                console.error('Error deleting endpoint:', error);
            }
        }
    };

    const handleFetchModels = async (id) => {
        setFetchingModels(true);
        try {
            const response = await axios.post(`/api/ai/endpoints/${id}/fetch-models`);
            if (response.data.success) {
                const models = response.data.models;
                setAvailableModels(models);
                if (showModal) {
                    // If modal is open, we're likely editing/fetching for current
                    setFormData(prev => ({ ...prev }));
                }
                fetchEndpoints(); // Refresh list to get updated metadata
                return models;
            } else {
                alert('Models fetch failed: ' + response.data.error);
                return [];
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            alert('Failed to fetch models');
            return [];
        } finally {
            setFetchingModels(false);
        }
    };

    return (
        <>
            <PageBreadcrumb title="Manage LLM Endpoints" subtitle="Global AI System" />
            <Row>
                <Col xs={12}>
                    <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center text-bg-warning py-2">
                            <Card.Title as="h5" className="mb-0 text-white">Endpoints List</Card.Title>
                            <Button variant="light" size="sm" onClick={() => handleOpenModal()}>
                                Add Endpoint
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Table responsive className="table-centered table-nowrap mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Name</th>
                                        <th>Provider</th>
                                        <th>Default Model</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {endpoints.map((endpoint) => (
                                        <tr key={endpoint.id}>
                                            <td>{endpoint.name}</td>
                                            <td>
                                                <Badge bg="soft-info" className="text-info capitalize">
                                                    {endpoint.provider}
                                                </Badge>
                                            </td>
                                            <td>
                                                {endpoint.default_model ? (
                                                    <Badge bg="soft-primary" className="text-primary">{endpoint.default_model}</Badge>
                                                ) : (
                                                    <span className="text-muted italic">Auto Select</span>
                                                )}
                                            </td>
                                            <td>
                                                {endpoint.is_active ? (
                                                    <Badge bg="success">Active</Badge>
                                                ) : (
                                                    <Badge bg="danger">Inactive</Badge>
                                                )}
                                            </td>
                                            <td>
                                                <Button
                                                    variant="soft-primary"
                                                    size="sm"
                                                    className="me-1"
                                                    onClick={() => handleFetchModels(endpoint.id)}
                                                    title="Fetch Models"
                                                    disabled={fetchingModels}
                                                >
                                                    {fetchingModels ? <Spinner size="sm" animation="border" /> : <Icon icon="refresh" className="icon-xs" />}
                                                </Button>
                                                <Button
                                                    variant="soft-info"
                                                    size="sm"
                                                    className="me-1"
                                                    onClick={() => handleOpenModal(endpoint)}
                                                >
                                                    <Icon icon="edit" className="icon-xs" />
                                                </Button>
                                                <Button
                                                    variant="soft-danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(endpoint.id)}
                                                >
                                                    <Icon icon="trash" className="icon-xs" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {endpoints.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan="5" className="text-center">No endpoints found.</td>
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
                    <Modal.Title>{editEndpoint ? 'Edit' : 'Add'} Endpoint</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Endpoint Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        required
                                        placeholder="e.g. Primary OpenAI"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Provider</Form.Label>
                                    <Form.Select
                                        value={formData.provider}
                                        onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                                    >
                                        <option value="openai">OpenAI</option>
                                        <option value="google">Google Gemini</option>
                                        <option value="mistral">Mistral AI</option>
                                        <option value="custom">Custom (OpenAI Compatible)</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>API Key</Form.Label>
                            <Form.Control
                                type="password"
                                required={!editEndpoint}
                                placeholder={editEndpoint ? 'Leave blank to keep current' : 'Enter provider API key'}
                                value={formData.api_key}
                                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Base URL (Optional)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g. http://localhost:11434/v1"
                                value={formData.base_url}
                                onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                            />
                            <Form.Text className="text-muted italic">Only required for 'Custom' or proxy endpoints.</Form.Text>
                        </Form.Group>

                        <hr />

                        <Row className="align-items-end">
                            <Col md={8}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="d-flex justify-content-between">
                                        Default Model (Optional)
                                        {fetchingModels && <Spinner size="sm" animation="border" className="ms-2" />}
                                    </Form.Label>
                                    <Form.Select
                                        value={formData.default_model}
                                        onChange={(e) => setFormData({ ...formData, default_model: e.target.value })}
                                        disabled={fetchingModels}
                                    >
                                        <option value="">Auto (No default model)</option>
                                        {availableModels.map((model, idx) => (
                                            <option key={`${model}-${idx}`} value={model}>{model}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                {editEndpoint && (
                                    <Button
                                        variant="soft-warning"
                                        className="mb-3 w-100"
                                        onClick={() => handleFetchModels(editEndpoint.id)}
                                        disabled={fetchingModels}
                                    >
                                        <Icon icon="refresh" className="me-1" /> Fetch Available Models
                                    </Button>
                                )}
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Check
                                        type="switch"
                                        label="Auto Model Selection"
                                        checked={formData.auto_model_selection}
                                        onChange={(e) => setFormData({ ...formData, auto_model_selection: e.target.checked })}
                                    />
                                    <Form.Text className="text-muted">If active, system will pick best model automatically.</Form.Text>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Check
                                        type="switch"
                                        label="Is Active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <div className="text-end border-top pt-3">
                            <Button variant="light" className="me-1" onClick={handleCloseModal}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit">
                                {editEndpoint ? 'Update Endpoint' : 'Create Endpoint'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default Endpoints;
