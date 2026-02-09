import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Alert } from 'react-bootstrap';
import axios from 'axios';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';

const JiraConfig = () => {
    const [formData, setFormData] = useState({
        domain: '',
        email: '',
        api_token: '',
        project_key: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await axios.get('/api/ai/jira-config');
            if (response.data) {
                setFormData({
                    domain: response.data.domain || '',
                    email: response.data.email || '',
                    api_token: '', // Don't show token
                    project_key: response.data.project_key || ''
                });
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching Jira config:', error);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const data = { ...formData };
            if (!data.api_token) delete data.api_token;
            await axios.post('/api/ai/jira-config', data);
            setMessage({ type: 'success', text: 'Jira configuration updated successfully' });
        } catch (error) {
            console.error('Error saving Jira config:', error);
            setMessage({ type: 'danger', text: 'Failed to update Jira configuration' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <PageBreadcrumb title="Jira Integration Settings" subtitle="Global AI System" />
            <Row className="justify-content-center">
                <Col md={8}>
                    <Card>
                        <Card.Header>
                            <Card.Title as="h5">Global Jira Configuration</Card.Title>
                        </Card.Header>
                        <Card.Body>
                            {message && (
                                <Alert variant={message.type} onClose={() => setMessage(null)} dismissible>
                                    {message.text}
                                </Alert>
                            )}
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Jira Domain</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g. your-domain.atlassian.net"
                                        required
                                        value={formData.domain}
                                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                    />
                                    <Form.Text className="text-muted">
                                        The full domain URL of your Jira instance.
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Email Address</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder="your-email@example.com"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>API Token</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Enter Jira API Token"
                                        value={formData.api_token}
                                        onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
                                    />
                                    <Form.Text className="text-muted">
                                        You can generate an API token in your Atlassian account security settings.
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Default Project Key</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g. PROJ"
                                        required
                                        value={formData.project_key}
                                        onChange={(e) => setFormData({ ...formData, project_key: e.target.value })}
                                    />
                                </Form.Group>

                                <div className="text-end">
                                    <Button variant="primary" type="submit" disabled={saving}>
                                        {saving ? 'Saving...' : 'Save Configuration'}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </>
    );
};

export default JiraConfig;
