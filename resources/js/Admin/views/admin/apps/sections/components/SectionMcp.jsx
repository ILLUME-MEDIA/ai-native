import Icon from '@admin/components/wrappers/Icon';
import { useState } from 'react';
import { Alert, Card, CardBody, CardHeader, Form } from 'react-bootstrap';
import axios from 'axios';

const SectionMcp = ({ entityId, mcpConfig, onUpdate }) => {
    const [config, setConfig] = useState(mcpConfig || {
        enabled: false,
        read: false,
        create: false,
        update: false,
        delete: false,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleToggle = async (field, value) => {
        setSaving(true);
        setError(null);
        setSuccess(false);

        const newConfig = { ...config, [field]: value };

        // Map frontend field names to backend
        const backendData = {
            mcp_enabled: newConfig.enabled,
            mcp_can_read: newConfig.read,
            mcp_can_create: newConfig.create,
            mcp_can_update: newConfig.update,
            mcp_can_delete: newConfig.delete,
        };

        try {
            await axios.patch(`/api/section-builder/entities/${entityId}`, backendData);
            setConfig(newConfig);
            setSuccess(true);
            if (onUpdate) {
                onUpdate(newConfig);
            }
            setTimeout(() => setSuccess(false), 3000);
        } catch (e) {
            console.error('Failed to update MCP config', e);
            setError(e.response?.data?.message || 'Failed to update MCP configuration');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <h5 className="mb-0">
                    <Icon icon="shield-check" className="me-2" />
                    MCP Access Control
                </h5>
            </CardHeader>
            <CardBody>
                {error && (
                    <Alert variant="danger" dismissible onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert variant="success" dismissible onClose={() => setSuccess(false)}>
                        MCP configuration updated successfully
                    </Alert>
                )}

                <div className="mb-4">
                    <p className="text-muted mb-3">
                        Control API access for this entity. When MCP is enabled, you can specify which operations are allowed.
                    </p>
                </div>

                <Form.Group className="mb-4">
                    <div className="d-flex align-items-center justify-content-between p-3 border rounded">
                        <div>
                            <Form.Label className="mb-0 fw-semibold">
                                <Icon icon="power" className="me-2" />
                                Enable MCP Access
                            </Form.Label>
                            <div className="text-muted small">
                                Allow API access through MCP gateway
                            </div>
                        </div>
                        <Form.Check
                            type="switch"
                            id="mcp-enabled"
                            checked={config.enabled}
                            onChange={(e) => handleToggle('enabled', e.target.checked)}
                            disabled={saving}
                            className="fs-4"
                        />
                    </div>
                </Form.Group>

                {config.enabled && (
                    <>
                        <h6 className="mb-3">Permissions</h6>

                        <Form.Group className="mb-3">
                            <div className="d-flex align-items-center justify-content-between p-3 border rounded">
                                <div>
                                    <Form.Label className="mb-0">
                                        <Icon icon="eye" className="me-2 text-success" />
                                        Allow Read (GET)
                                    </Form.Label>
                                    <div className="text-muted small">
                                        List and view records
                                    </div>
                                </div>
                                <Form.Check
                                    type="switch"
                                    id="mcp-read"
                                    checked={config.read}
                                    onChange={(e) => handleToggle('read', e.target.checked)}
                                    disabled={saving}
                                />
                            </div>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <div className="d-flex align-items-center justify-content-between p-3 border rounded">
                                <div>
                                    <Form.Label className="mb-0">
                                        <Icon icon="plus-circle" className="me-2 text-primary" />
                                        Allow Create (POST)
                                    </Form.Label>
                                    <div className="text-muted small">
                                        Create new records
                                    </div>
                                </div>
                                <Form.Check
                                    type="switch"
                                    id="mcp-create"
                                    checked={config.create}
                                    onChange={(e) => handleToggle('create', e.target.checked)}
                                    disabled={saving}
                                />
                            </div>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <div className="d-flex align-items-center justify-content-between p-3 border rounded">
                                <div>
                                    <Form.Label className="mb-0">
                                        <Icon icon="pencil" className="me-2 text-warning" />
                                        Allow Update (PUT/PATCH)
                                    </Form.Label>
                                    <div className="text-muted small">
                                        Modify existing records
                                    </div>
                                </div>
                                <Form.Check
                                    type="switch"
                                    id="mcp-update"
                                    checked={config.update}
                                    onChange={(e) => handleToggle('update', e.target.checked)}
                                    disabled={saving}
                                />
                            </div>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <div className="d-flex align-items-center justify-content-between p-3 border rounded">
                                <div>
                                    <Form.Label className="mb-0">
                                        <Icon icon="trash" className="me-2 text-danger" />
                                        Allow Delete (DELETE)
                                    </Form.Label>
                                    <div className="text-muted small">
                                        Remove records permanently
                                    </div>
                                </div>
                                <Form.Check
                                    type="switch"
                                    id="mcp-delete"
                                    checked={config.delete}
                                    onChange={(e) => handleToggle('delete', e.target.checked)}
                                    disabled={saving}
                                />
                            </div>
                        </Form.Group>
                    </>
                )}

                {!config.enabled && (
                    <Alert variant="info" className="mb-0">
                        <Icon icon="info-circle" className="me-2" />
                        MCP access is currently disabled. Enable it to configure API permissions.
                    </Alert>
                )}
            </CardBody>
        </Card>
    );
};

export default SectionMcp;
