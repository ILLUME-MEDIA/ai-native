import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, CardBody, CardHeader, Col, Row, Table, Tab, Nav } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';

const SectionApi = () => {
    const { id } = useParams();
    const [section, setSection] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/section-builder/entities/${id}`);
                const json = res.data;

                // Transform fields from database format to frontend format
                let fields = [];
                if (json.fields) {
                    if (typeof json.fields === 'string') {
                        try {
                            fields = JSON.parse(json.fields);
                        } catch (e) {
                            console.error("Error parsing fields", e);
                        }
                    } else {
                        fields = json.fields;
                    }

                    // Map database columns to frontend format
                    fields = fields.map(field => ({
                        name: field.label || field.name || '',
                        slug: field.column_name || field.slug || '',
                        type: field.type || 'string',
                        required: field.required ?? false,
                        nullable: field.nullable ?? true,
                        default_value: field.default_value || '',
                        is_listing_visible: field.list_visible ?? field.is_listing_visible ?? true,
                        is_detail_visible: field.detail_visible ?? field.is_detail_visible ?? true,
                    }));
                }

                json.fields = fields;
                setSection(json);
            } catch (e) {
                console.error("Failed to load section", e);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [id]);

    if (loading) {
        return <div className="p-3">Loading API details...</div>;
    }

    if (!section) {
        return <div className="p-3">Section not found.</div>;
    }

    const fields = Array.isArray(section.fields) ? section.fields : [];

    // Generate example values based on field types
    const generateExampleValue = (type) => {
        switch (type) {
            case 'integer': return 123;
            case 'boolean': return true;
            case 'date': return '2024-01-15';
            case 'datetime': return '2024-01-15T10:30:00Z';
            case 'text': return 'This is a longer text content...';
            case 'file': return '/uploads/example-file.jpg';
            default: return 'example value';
        }
    };

    // Create request body example (only user-defined fields)
    const requestBodyExample = {};
    fields.forEach(f => {
        requestBodyExample[f.slug] = generateExampleValue(f.type);
    });

    // Create response example (includes id, timestamps, and user-defined fields)
    const responseExample = {
        id: 1,
        ...requestBodyExample,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z'
    };

    // List response example
    const listResponseExample = {
        data: [responseExample],
        meta: {
            current_page: 1,
            per_page: 15,
            total: 1,
            last_page: 1
        }
    };

    const baseUrl = `${window.location.origin}/api/entities/${section.slug || section.table_name}`;

    return (
        <>
            <PageBreadcrumb title="API Documentation" subtitle={section.name} />

            <Row className="justify-content-center">
                <Col xs={12}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <Button variant="outline-secondary" size="sm" onClick={() => navigate(`/apps/sections/${id}/edit`)}>
                            <Icon icon="arrow-left" className="me-1" /> Back to Editor
                        </Button>
                    </div>

                    <Card className="mb-4">
                        <CardHeader>
                            <h5 className="mb-0">Base Endpoint</h5>
                        </CardHeader>
                        <CardBody>
                            <div className="p-2 bg-light rounded font-monospace text-primary">
                                {baseUrl}
                            </div>
                        </CardBody>
                    </Card>

                    <Card className="mb-4">
                        <CardHeader>
                            <h5 className="mb-0">Available Fields</h5>
                        </CardHeader>
                        <CardBody>
                            {fields.length === 0 ? (
                                <p className="text-muted mb-0">No fields defined yet. Add fields in the Section Editor.</p>
                            ) : (
                                <Table responsive className="mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Field Name</th>
                                            <th>Slug</th>
                                            <th>Type</th>
                                            <th>Required</th>
                                            <th>Nullable</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fields.map((field, idx) => (
                                            <tr key={idx}>
                                                <td>{field.name}</td>
                                                <td><code>{field.slug}</code></td>
                                                <td><Badge bg="info-subtle" className="text-info">{field.type}</Badge></td>
                                                <td>{field.required ? <Badge bg="danger">Yes</Badge> : <Badge bg="secondary">No</Badge>}</td>
                                                <td>{field.nullable ? <Badge bg="success">Yes</Badge> : <Badge bg="secondary">No</Badge>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </CardBody>
                    </Card>

                    <Tab.Container defaultActiveKey="list">
                        <Card className="mb-4">
                            <CardHeader>
                                <Nav variant="tabs" className="card-header-tabs">
                                    <Nav.Item>
                                        <Nav.Link eventKey="list">GET (List)</Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="show">GET (Single)</Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="create">POST (Create)</Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="update">PUT/PATCH (Update)</Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="delete">DELETE</Nav.Link>
                                    </Nav.Item>
                                </Nav>
                            </CardHeader>
                            <CardBody>
                                <Tab.Content>
                                    <Tab.Pane eventKey="list">
                                        <h6 className="mb-3">List All Records</h6>
                                        <div className="mb-3">
                                            <Badge bg="success" className="me-2">GET</Badge>
                                            <code>{baseUrl}</code>
                                        </div>
                                        <h6 className="mt-4">Response (200 OK)</h6>
                                        <pre className="bg-light p-3 rounded">
                                            {JSON.stringify(listResponseExample, null, 2)}
                                        </pre>
                                    </Tab.Pane>

                                    <Tab.Pane eventKey="show">
                                        <h6 className="mb-3">Get Single Record</h6>
                                        <div className="mb-3">
                                            <Badge bg="success" className="me-2">GET</Badge>
                                            <code>{baseUrl}/1</code>
                                        </div>
                                        <h6 className="mt-4">Response (200 OK)</h6>
                                        <pre className="bg-light p-3 rounded">
                                            {JSON.stringify(responseExample, null, 2)}
                                        </pre>
                                    </Tab.Pane>

                                    <Tab.Pane eventKey="create">
                                        <h6 className="mb-3">Create New Record</h6>
                                        <div className="mb-3">
                                            <Badge bg="primary" className="me-2">POST</Badge>
                                            <code>{baseUrl}</code>
                                        </div>
                                        <h6 className="mt-4">Request Body</h6>
                                        <pre className="bg-light p-3 rounded">
                                            {JSON.stringify(requestBodyExample, null, 2)}
                                        </pre>
                                        <h6 className="mt-4">Response (201 Created)</h6>
                                        <pre className="bg-light p-3 rounded">
                                            {JSON.stringify(responseExample, null, 2)}
                                        </pre>
                                    </Tab.Pane>

                                    <Tab.Pane eventKey="update">
                                        <h6 className="mb-3">Update Existing Record</h6>
                                        <div className="mb-3">
                                            <Badge bg="warning" className="me-2">PUT/PATCH</Badge>
                                            <code>{baseUrl}/1</code>
                                        </div>
                                        <h6 className="mt-4">Request Body</h6>
                                        <pre className="bg-light p-3 rounded">
                                            {JSON.stringify(requestBodyExample, null, 2)}
                                        </pre>
                                        <h6 className="mt-4">Response (200 OK)</h6>
                                        <pre className="bg-light p-3 rounded">
                                            {JSON.stringify(responseExample, null, 2)}
                                        </pre>
                                    </Tab.Pane>

                                    <Tab.Pane eventKey="delete">
                                        <h6 className="mb-3">Delete Record</h6>
                                        <div className="mb-3">
                                            <Badge bg="danger" className="me-2">DELETE</Badge>
                                            <code>{baseUrl}/1</code>
                                        </div>
                                        <h6 className="mt-4">Response (204 No Content)</h6>
                                        <pre className="bg-light p-3 rounded">
                                            {/* Empty response */}
                                        </pre>
                                    </Tab.Pane>
                                </Tab.Content>
                            </CardBody>
                        </Card>
                    </Tab.Container>
                </Col>
            </Row>
        </>
    );
};

export default SectionApi;
