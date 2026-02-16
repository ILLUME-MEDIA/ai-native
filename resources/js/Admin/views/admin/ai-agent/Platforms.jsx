import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table, Modal, Form, Badge, Spinner } from 'react-bootstrap';
import axios from 'axios';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';

const Platforms = () => {
    const [platforms, setPlatforms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editPlatform, setEditPlatform] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'streaming',
        base_url: '',
        api_token: '',
        target_section: '',
        is_active: true
    });
    const [showApiToken, setShowApiToken] = useState(false);

    useEffect(() => {
        fetchPlatforms();
    }, []);

    const fetchPlatforms = async () => {
        try {
            const response = await axios.get('/api/ai/platforms');
            setPlatforms(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching platforms:', error);
            setLoading(false);
        }
    };

    const handleOpenModal = (platform = null) => {
        if (platform) {
            setEditPlatform(platform);
            setFormData({
                name: platform.name,
                type: platform.type,
                base_url: platform.base_url || '',
                api_token: platform.api_token || '', // Show existing token
                target_section: platform.target_section || '',
                is_active: platform.is_active
            });
        } else {
            setEditPlatform(null);
            setFormData({
                name: '',
                type: 'streaming',
                base_url: '',
                api_token: '',
                target_section: '',
                is_active: true
            });
        }
        setShowApiToken(false); // Reset token visibility
        setShowModal(true);
    };

    const handleCloseModal = () => setShowModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editPlatform) {
                const data = { ...formData };
                if (!data.api_token) delete data.api_token;
                await axios.patch(`/api/ai/platforms/${editPlatform.id}`, data);
            } else {
                await axios.post('/api/ai/platforms', formData);
            }
            fetchPlatforms();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving platform:', error);
            alert('Failed to save platform');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this platform? This will also disable associated automated duties.')) {
            try {
                await axios.delete(`/api/ai/platforms/${id}`);
                fetchPlatforms();
            } catch (error) {
                console.error('Error deleting platform:', error);
            }
        }
    };

    return (
        <>
            <PageBreadcrumb title="Platform Management" subtitle="Global AI System" />

            <Row>
                <Col md={12}>
                    <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <Card.Title as="h5">Integration Platforms</Card.Title>
                            <Button variant="primary" size="sm" onClick={() => handleOpenModal()}>
                                <Icon icon="plus" className="me-1" /> Add Platform
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" variant="primary" />
                                    <p className="mt-2 text-muted">Loading platforms...</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <Table className="table-centered table-nowrap mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Name</th>
                                                <th>Type</th>
                                                <th>Base URL</th>
                                                <th>API Token</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {platforms.map((platform) => (
                                                <tr key={platform.id}>
                                                    <td>
                                                        <span className="fw-semibold">{platform.name}</span>
                                                        {platform.target_section && (
                                                            <small className="text-muted d-block">Section: {platform.target_section}</small>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <Badge bg={platform.type === 'streaming' ? 'info' : 'warning'}>
                                                            {platform.type.toUpperCase()}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <small className="text-muted">
                                                            {platform.base_url || '—'}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <small className="font-monospace text-muted">
                                                            {platform.api_token
                                                                ? `${platform.api_token.substring(0, 8)}${'•'.repeat(20)}`
                                                                : '—'}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <Badge bg={platform.is_active ? 'success' : 'danger'}>
                                                            {platform.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <Button variant="soft-primary" size="sm" className="me-1" onClick={() => handleOpenModal(platform)}>
                                                            <Icon icon="edit" className="icon-xs" />
                                                        </Button>
                                                        <Button variant="soft-danger" size="sm" onClick={() => handleDelete(platform.id)}>
                                                            <Icon icon="trash" className="icon-xs" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {platforms.length === 0 && (
                                                <tr>
                                                    <td colSpan="6" className="text-center py-4">
                                                        <div className="text-muted">No platforms configured. Click "Add Platform" to get started.</div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Modal show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{editPlatform ? 'Edit Platform' : 'Add New Platform'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Platform Name</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g. My Music App"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Platform Type</Form.Label>
                            <Form.Select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="streaming">Streaming Platform</option>
                                <option value="watchlist">Watchlist Hub</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Base URL / Endpoint</Form.Label>
                            <Form.Control
                                type="url"
                                placeholder="https://api.myapp.com/v1"
                                value={formData.base_url}
                                onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                            />
                            <Form.Text className="text-muted">For both Streaming and Watchlist APIs.</Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Target Section / Category</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g. movies, music_videos"
                                value={formData.target_section}
                                onChange={(e) => setFormData({ ...formData, target_section: e.target.value })}
                            />
                            <Form.Text className="text-muted">Specify the target section or table name on the remote platform.</Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>API Token / Key</Form.Label>
                            <div className="position-relative">
                                <Form.Control
                                    type={showApiToken ? "text" : "password"}
                                    placeholder="Enter API Token"
                                    value={formData.api_token}
                                    onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
                                    required={!editPlatform}
                                />
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="position-absolute end-0 top-50 translate-middle-y text-muted"
                                    onClick={() => setShowApiToken(!showApiToken)}
                                    style={{ textDecoration: 'none', padding: '0.25rem 0.75rem' }}
                                >
                                    <Icon icon={showApiToken ? "eye-off" : "eye"} />
                                </Button>
                            </div>
                            {editPlatform && formData.api_token && (
                                <Form.Text className="text-success">
                                    <Icon icon="check-circle" className="me-1" />
                                    Current token is shown (you can edit or leave as is)
                                </Form.Text>
                            )}
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Check
                                type="switch"
                                label="Is Active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                        </Form.Group>

                        <div className="alert alert-info py-2 small mb-0">
                            <Icon icon="info-circle" className="me-1" />
                            An automated AI Duty will be created for this platform when you perform the first manual data push.
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button variant="primary" type="submit">
                            {editPlatform ? 'Update Platform' : 'Save Platform'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </>
    );
};

export default Platforms;
