import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, CardBody, CardHeader, Col, Row, Table, Tab, Nav, Form, FormControl, InputGroup } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';

const SectionApi = () => {
    const { id } = useParams();
    const [section, setSection] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Live "Try it" state for GET list endpoint
    const [listQuery, setListQuery] = useState({
        search: '',
        page: 1,
        per_page: 15,
        sort: '',
        direction: 'asc',
    });
    const [listFilters, setListFilters] = useState({});
    const [listContains, setListContains] = useState({});
    const [listResponse, setListResponse] = useState(null);
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState('');

    // Live "Try it" state for GET single endpoint
    const [singleMode, setSingleMode] = useState('id'); // 'id' | 'field'
    const [singleId, setSingleId] = useState('1');
    const [singleField, setSingleField] = useState('');
    const [singleValue, setSingleValue] = useState('');
    const [singleResponse, setSingleResponse] = useState(null);
    const [singleLoading, setSingleLoading] = useState(false);
    const [singleError, setSingleError] = useState('');

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

                // Auto-fetch live list data on mount (5 records preview)
                const slugOrTable = json.slug || json.table_name;
                try {
                    const liveRes = await axios.get(`/api/entities/${slugOrTable}`, {
                        params: { page: 1, per_page: 5, direction: 'desc' }
                    });
                    setListResponse(liveRes.data);
                } catch (_) {
                    // silently ignore — mock example will show instead
                }
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

    const slugOrTable = section.slug || section.table_name;
    const baseUrl = `${window.location.origin}/api/entities/${slugOrTable}`;
    const combinedExampleUrl = `${window.location.origin}/api/section-builder/entities-combined/${slugOrTable}/{other_slug_or_table}`;

    const handleCopy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (e) {
            // ignore clipboard errors
            console.error('Failed to copy', e);
        }
    };

    const buildListUrl = () => {
        const params = new URLSearchParams();

        // Global search
        if (listQuery.search) params.append('search', String(listQuery.search));

        // Always include pagination so URL clearly shows paging
        params.append('page', String(listQuery.page || 1));
        params.append('per_page', String(listQuery.per_page || 15));

        // Sorting
        if (listQuery.sort) params.append('sort', listQuery.sort);
        if (listQuery.direction) params.append('direction', listQuery.direction);

        // filters[column]=value
        Object.entries(listFilters).forEach(([column, value]) => {
            if (value != null && value !== '') {
                params.append(`filters[${column}]`, value);
            }
        });

        // contains[column]=value
        Object.entries(listContains).forEach(([column, value]) => {
            if (value != null && value !== '') {
                params.append(`contains[${column}]`, value);
            }
        });

        const qs = params.toString();
        return qs ? `${baseUrl}?${qs}` : baseUrl;
    };

    const buildSingleUrl = () => {
        if (singleMode === 'field' && singleField && singleValue) {
            return `${baseUrl}/by/${encodeURIComponent(singleField)}/${encodeURIComponent(singleValue)}`;
        }
        return `${baseUrl}/${singleId || 1}`;
    };

    const handleTrySingle = async (e) => {
        e.preventDefault();
        setSingleLoading(true);
        setSingleError('');
        setSingleResponse(null);
        try {
            let url;
            if (singleMode === 'field') {
                if (!singleField || !singleValue) {
                    setSingleError('Please select a field and enter a value.');
                    setSingleLoading(false);
                    return;
                }
                url = `/api/entities/${slugOrTable}/by/${encodeURIComponent(singleField)}/${encodeURIComponent(singleValue)}`;
            } else {
                url = `/api/entities/${slugOrTable}/${singleId || 1}`;
            }
            const res = await axios.get(url);
            setSingleResponse(res.data);
        } catch (err) {
            setSingleError(err.response?.data?.message || err.message || 'Request failed');
        } finally {
            setSingleLoading(false);
        }
    };

    const handleTryList = async (e) => {
        e.preventDefault();
        setListLoading(true);
        setListError('');
        setListResponse(null);
        try {
            const params = {
                search: listQuery.search || undefined,
                page: listQuery.page || undefined,
                per_page: listQuery.per_page || undefined,
                sort: listQuery.sort || undefined,
                direction: listQuery.direction || undefined,
            };
            Object.entries(listFilters).forEach(([column, value]) => {
                if (value != null && value !== '') {
                    params[`filters[${column}]`] = value;
                }
            });
            Object.entries(listContains).forEach(([column, value]) => {
                if (value != null && value !== '') {
                    params[`contains[${column}]`] = value;
                }
            });
            const res = await axios.get(`/api/entities/${slugOrTable}`, { params });
            setListResponse(res.data);
        } catch (err) {
            console.error(err);
            setListError(err.response?.data?.message || err.message || 'Request failed');
        } finally {
            setListLoading(false);
        }
    };

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
                            <h5 className="mb-0">Base Endpoint &amp; Authentication</h5>
                        </CardHeader>
                        <CardBody>
                            <div className="d-flex flex-column flex-md-row align-items-md-center gap-2 mb-3">
                                <div className="flex-grow-1 p-2 bg-light rounded font-monospace text-primary text-break">
                                    {baseUrl}
                                </div>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => handleCopy(baseUrl)}
                                >
                                    <Icon icon="copy" className="me-1" /> Copy URL
                                </Button>
                            </div>
                            <p className="text-muted small mb-1">
                                <strong>Authentication (required for ALL requests):</strong>
                            </p>
                            <ul className="text-muted small mb-0">
                                <li>
                                    <strong>Admin UI (browser):</strong> Laravel Sanctum cookie – handled automatically when you are logged in.
                                </li>
                                <li>
                                    <strong>Per-user API token (normal user via Sanctum):</strong>{' '}
                                    create a Sanctum personal access token for that user and call:
                                    {' '}
                                    <code>Authorization: Bearer &lt;USER_TOKEN&gt;</code>.
                                </li>
                                <li>
                                    <strong>Site API key (env SITE_API_KEY):</strong>{' '}
                                    for generic site/app integrations:
                                    {' '}
                                    <code>Authorization: Bearer &lt;SITE_API_KEY&gt;</code>.
                                </li>
                                <li>
                                    <strong>Global MCP key (env MCP_API_KEY – AI / system clients):</strong>{' '}
                                    <code>Authorization: Bearer &lt;MCP_API_KEY&gt;</code>.
                                </li>
                            </ul>
                        </CardBody>
                    </Card>

                    <Card className="mb-4">
                        <CardHeader>
                            <h5 className="mb-0">Available Fields</h5>
                        </CardHeader>
                        <CardBody style={{ maxHeight: '280px', overflowY: 'auto' }}>
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
                        <Card className="mb-4" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
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
                            <CardBody style={{ overflowY: 'auto', flex: 1 }}>
                                <Tab.Content>
                                    <Tab.Pane eventKey="list">
                                        <h6 className="mb-3">List All Records</h6>
                                        <div className="mb-3">
                                            <Badge bg="success" className="me-2">GET</Badge>
                                            <code className="d-block text-break">{buildListUrl()}</code>
                                            <div className="mt-2 d-flex flex-wrap gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline-secondary"
                                                    onClick={() => handleCopy(buildListUrl())}
                                                >
                                                    <Icon icon="copy" className="me-1" /> Copy URL
                                                </Button>
                                            </div>
                                        </div>

                                        <h6 className="mt-4">Query Parameters (Datatable style)</h6>
                                        <ul className="text-muted small mb-3">
                                            <li><code>search</code>: Global search across searchable columns.</li>
                                            <li><code>page</code>, <code>per_page</code>: Pagination.</li>
                                            <li><code>sort</code>, <code>direction</code>: Column sort (e.g. <code>sort=created_at&amp;direction=desc</code>).</li>
                                            <li>
                                                <code>filters[column]</code>: Per-column filter — supports 3 modes:
                                                <ul className="mt-1">
                                                    <li><strong>Single text</strong>: <code>filters[name]=John</code> → LIKE %John%</li>
                                                    <li><strong>Single number</strong>: <code>filters[featured]=1</code> → exact match</li>
                                                    <li><strong>Comma numbers</strong>: <code>filters[featured]=1,0</code> → IN (1,0)</li>
                                                    <li><strong>Comma text</strong>: <code>filters[title]=Nikki,Obama</code> → LIKE %Nikki% OR LIKE %Obama%</li>
                                                </ul>
                                            </li>
                                            <li>
                                                <code>contains[column]</code>: <strong>Always OR LIKE</strong> — for columns that store delimited values (e.g. tab/comma-separated IDs):
                                                <ul className="mt-1">
                                                    <li><code>contains[category]=208,107</code> → LIKE %208% OR LIKE %107%</li>
                                                    <li>Works even when category stores <code>&#9;208&#9;288&#9;322&#9;</code> (tab-separated)</li>
                                                </ul>
                                            </li>
                                        </ul>

                                        <Form onSubmit={handleTryList} className="border rounded p-3 mb-3 bg-light-subtle">
                                            <Row className="g-2">
                                                <Col md={4}>
                                                    <Form.Label className="small mb-1">Search</Form.Label>
                                                    <FormControl
                                                        size="sm"
                                                        placeholder="Global search..."
                                                        value={listQuery.search}
                                                        onChange={(e) =>
                                                            setListQuery((prev) => ({ ...prev, search: e.target.value }))
                                                        }
                                                    />
                                                </Col>
                                                <Col md={2}>
                                                    <Form.Label className="small mb-1">Page</Form.Label>
                                                    <FormControl
                                                        size="sm"
                                                        type="number"
                                                        min={1}
                                                        value={listQuery.page}
                                                        onChange={(e) =>
                                                            setListQuery((prev) => ({
                                                                ...prev,
                                                                page: Number(e.target.value) || 1,
                                                            }))
                                                        }
                                                    />
                                                </Col>
                                                <Col md={2}>
                                                    <Form.Label className="small mb-1">Per Page</Form.Label>
                                                    <Form.Select
                                                        size="sm"
                                                        value={listQuery.per_page}
                                                        onChange={(e) =>
                                                            setListQuery((prev) => ({
                                                                ...prev,
                                                                per_page: Number(e.target.value) || 15,
                                                            }))
                                                        }
                                                    >
                                                        {[10, 15, 25, 50, 100].map((n) => (
                                                            <option key={n} value={n}>
                                                                {n}
                                                            </option>
                                                        ))}
                                                    </Form.Select>
                                                </Col>
                                                <Col md={2}>
                                                    <Form.Label className="small mb-1">Sort Column</Form.Label>
                                                    <FormControl
                                                        size="sm"
                                                        placeholder="column name"
                                                        value={listQuery.sort}
                                                        onChange={(e) =>
                                                            setListQuery((prev) => ({ ...prev, sort: e.target.value }))
                                                        }
                                                    />
                                                </Col>
                                                <Col md={2}>
                                                    <Form.Label className="small mb-1">Direction</Form.Label>
                                                    <Form.Select
                                                        size="sm"
                                                        value={listQuery.direction}
                                                        onChange={(e) =>
                                                            setListQuery((prev) => ({
                                                                ...prev,
                                                                direction: e.target.value,
                                                            }))
                                                        }
                                                    >
                                                        <option value="asc">asc</option>
                                                        <option value="desc">desc</option>
                                                    </Form.Select>
                                                </Col>
                                            </Row>

                                            {fields.length > 0 && (
                                                <>
                                                    <hr className="my-3" />
                                                    <Form.Label className="small mb-2">
                                                        Exact/LIKE Filters <code className="text-muted">filters[column]</code>
                                                        <span className="text-muted ms-2" style={{ fontSize: '0.75rem' }}>numbers→exact, text→LIKE, comma→IN or OR LIKE</span>
                                                    </Form.Label>
                                                    <Row className="g-2">
                                                        {fields.map((f) => (
                                                            <Col md={4} key={f.slug}>
                                                                <InputGroup size="sm">
                                                                    <InputGroup.Text className="text-truncate" style={{ maxWidth: 120 }}>
                                                                        {f.slug}
                                                                    </InputGroup.Text>
                                                                    <FormControl
                                                                        placeholder="value"
                                                                        value={listFilters[f.slug] ?? ''}
                                                                        onChange={(e) =>
                                                                            setListFilters((prev) => ({
                                                                                ...prev,
                                                                                [f.slug]: e.target.value,
                                                                            }))
                                                                        }
                                                                    />
                                                                </InputGroup>
                                                            </Col>
                                                        ))}
                                                    </Row>

                                                    <hr className="my-3" />
                                                    <Form.Label className="small mb-2">
                                                        Contains / Partial Match <code className="text-muted">contains[column]</code>
                                                        <span className="text-muted ms-2" style={{ fontSize: '0.75rem' }}>always OR LIKE — use for tab/comma-delimited columns like category</span>
                                                    </Form.Label>
                                                    <Row className="g-2">
                                                        {fields.map((f) => (
                                                            <Col md={4} key={f.slug}>
                                                                <InputGroup size="sm">
                                                                    <InputGroup.Text className="text-truncate" style={{ maxWidth: 120, background: '#fff3cd' }}>
                                                                        {f.slug}
                                                                    </InputGroup.Text>
                                                                    <FormControl
                                                                        placeholder="208,107"
                                                                        value={listContains[f.slug] ?? ''}
                                                                        onChange={(e) =>
                                                                            setListContains((prev) => ({
                                                                                ...prev,
                                                                                [f.slug]: e.target.value,
                                                                            }))
                                                                        }
                                                                    />
                                                                </InputGroup>
                                                            </Col>
                                                        ))}
                                                    </Row>
                                                </>
                                            )}

                                            <div className="mt-3 d-flex justify-content-between align-items-center">
                                                <Button type="submit" size="sm" variant="primary" disabled={listLoading}>
                                                    {listLoading ? 'Sending...' : 'Try request'}
                                                </Button>
                                                {listError && (
                                                    <span className="text-danger small">
                                                        <Icon icon="alert-triangle" className="me-1" />
                                                        {listError}
                                                    </span>
                                                )}
                                            </div>
                                        </Form>

                                        <h6 className="mt-4">
                                            {listResponse ? '✅ Live Response (200 OK)' : 'Sample Response (press "Try request" for live data)'}
                                        </h6>
                                        <pre className="bg-light p-3 rounded small" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                            {JSON.stringify(listResponse ?? listResponseExample, null, 2)}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline-secondary"
                                            onClick={() =>
                                                handleCopy(
                                                    JSON.stringify(listResponse ?? listResponseExample, null, 2),
                                                )
                                            }
                                        >
                                            <Icon icon="copy" className="me-1" /> Copy Response JSON
                                        </Button>
                                    </Tab.Pane>

                                    <Tab.Pane eventKey="show">
                                        <h6 className="mb-3">Get Single Record</h6>

                                        {/* Mode toggle */}
                                        <div className="d-flex gap-2 mb-3">
                                            <Button
                                                size="sm"
                                                variant={singleMode === 'id' ? 'primary' : 'outline-secondary'}
                                                onClick={() => setSingleMode('id')}
                                            >
                                                By ID
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={singleMode === 'field' ? 'primary' : 'outline-secondary'}
                                                onClick={() => { setSingleMode('field'); if (!singleField && fields.length > 0) setSingleField(fields[0].slug); }}
                                            >
                                                By Any Field
                                            </Button>
                                        </div>

                                        {/* URL preview */}
                                        <div className="mb-3">
                                            <Badge bg="success" className="me-2">GET</Badge>
                                            <code className="text-break">{buildSingleUrl()}</code>
                                            <div className="mt-2">
                                                <Button size="sm" variant="outline-secondary" onClick={() => handleCopy(buildSingleUrl())}>
                                                    <Icon icon="copy" className="me-1" /> Copy URL
                                                </Button>
                                            </div>
                                        </div>

                                        {singleMode === 'field' && (
                                            <div className="mb-3 p-2 bg-light-subtle rounded border small text-muted">
                                                <strong>By Any Field:</strong> Fetch the first record where a specific column matches a value.<br />
                                                Route: <code>{baseUrl}/by/&#123;field&#125;/&#123;value&#125;</code>
                                            </div>
                                        )}

                                        {/* Try it form */}
                                        <Form onSubmit={handleTrySingle} className="border rounded p-3 mb-3 bg-light-subtle">
                                            <Row className="g-2 align-items-end">
                                                {singleMode === 'id' ? (
                                                    <Col md={4}>
                                                        <Form.Label className="small mb-1">Record ID</Form.Label>
                                                        <FormControl
                                                            size="sm"
                                                            type="number"
                                                            min={1}
                                                            value={singleId}
                                                            onChange={(e) => setSingleId(e.target.value)}
                                                            placeholder="e.g. 1"
                                                        />
                                                    </Col>
                                                ) : (
                                                    <>
                                                        <Col md={4}>
                                                            <Form.Label className="small mb-1">Field</Form.Label>
                                                            <Form.Select
                                                                size="sm"
                                                                value={singleField}
                                                                onChange={(e) => setSingleField(e.target.value)}
                                                            >
                                                                <option value="">-- select field --</option>
                                                                {fields.map((f) => (
                                                                    <option key={f.slug} value={f.slug}>{f.slug} ({f.type})</option>
                                                                ))}
                                                            </Form.Select>
                                                        </Col>
                                                        <Col md={4}>
                                                            <Form.Label className="small mb-1">Value</Form.Label>
                                                            <FormControl
                                                                size="sm"
                                                                value={singleValue}
                                                                onChange={(e) => setSingleValue(e.target.value)}
                                                                placeholder="search value"
                                                            />
                                                        </Col>
                                                    </>
                                                )}
                                                <Col md={4}>
                                                    <Button type="submit" size="sm" variant="primary" disabled={singleLoading}>
                                                        {singleLoading ? 'Sending...' : 'Try request'}
                                                    </Button>
                                                </Col>
                                            </Row>
                                            {singleError && (
                                                <div className="mt-2 text-danger small">
                                                    <Icon icon="alert-triangle" className="me-1" />{singleError}
                                                </div>
                                            )}
                                        </Form>

                                        <h6 className="mt-4">Response (200 OK)</h6>
                                        <pre className="bg-light p-3 rounded small" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                            {JSON.stringify(singleResponse ?? responseExample, null, 2)}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline-secondary"
                                            onClick={() => handleCopy(JSON.stringify(singleResponse ?? responseExample, null, 2))}
                                        >
                                            <Icon icon="copy" className="me-1" /> Copy Response JSON
                                        </Button>
                                    </Tab.Pane>

                                    <Tab.Pane eventKey="create">
                                        <h6 className="mb-3">Create New Record</h6>
                                        <div className="mb-3">
                                            <Badge bg="primary" className="me-2">POST</Badge>
                                            <code>{baseUrl}</code>
                                        </div>
                                        <h6 className="mt-4">Request Body</h6>
                                        <pre className="bg-light p-3 rounded small" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                            {JSON.stringify(requestBodyExample, null, 2)}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline-secondary"
                                            className="mb-3"
                                            onClick={() => handleCopy(JSON.stringify(requestBodyExample, null, 2))}
                                        >
                                            <Icon icon="copy" className="me-1" /> Copy Request Body
                                        </Button>
                                        <h6 className="mt-4">Response (201 Created)</h6>
                                        <pre className="bg-light p-3 rounded small" style={{ maxHeight: '280px', overflowY: 'auto' }}>
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
                                        <pre className="bg-light p-3 rounded small" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                            {JSON.stringify(requestBodyExample, null, 2)}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline-secondary"
                                            className="mb-3"
                                            onClick={() => handleCopy(JSON.stringify(requestBodyExample, null, 2))}
                                        >
                                            <Icon icon="copy" className="me-1" /> Copy Request Body
                                        </Button>
                                        <h6 className="mt-4">Response (200 OK)</h6>
                                        <pre className="bg-light p-3 rounded small" style={{ maxHeight: '280px', overflowY: 'auto' }}>
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

                    <Card className="mb-4">
                        <CardHeader>
                            <h5 className="mb-0">Combined Entities (2 Tables in One API)</h5>
                        </CardHeader>
                        <CardBody>
                            <p className="text-muted small">
                                Use this endpoint when you need data from <strong>two different tables</strong> in a single request.
                                This generic endpoint returns paginated data from any 2 entities registered in the Section Editor.
                            </p>

                            <div className="mb-3">
                                <Badge bg="success" className="me-2">GET</Badge>
                                <code className="d-block text-break">
                                    {combinedExampleUrl}
                                </code>
                            </div>

                            <ul className="text-muted small mb-3">
                                <li>
                                    Both <code>{'{first}'}</code> and <code>{'{second}'}</code> accept either an <strong>entity slug</strong> or
                                    a <strong>table name</strong> (auto-synced from the Section Editor).
                                </li>
                                <li>
                                    Example: if this section's slug is <code>{slugOrTable}</code> and the second section is
                                    <code>categories</code>, the URL would be:&nbsp;
                                    <code>{window.location.origin}/api/section-builder/entities-combined/{slugOrTable}/categories</code>
                                </li>
                                <li>
                                    Query params (<code>search</code>, <code>page</code>, <code>per_page</code>,{' '}
                                    <code>sort</code>, <code>direction</code>, <code>filters[column]</code>) are applied to both entities equally.
                                </li>
                            </ul>

                            <h6 className="mt-3">Response Structure</h6>
                            <p className="text-muted small mb-2">
                                The response contains <code>first</code> and <code>second</code> keys, each with entity metadata and paginated data:
                            </p>
                            <pre className="bg-light p-3 rounded small" style={{ maxHeight: '280px', overflowY: 'auto' }}>
{JSON.stringify({
    first: {
        entity: { id: 1, name: 'First Entity', table_name: 'first_table', slug: 'first-entity' },
        data: {
            current_page: 1,
            data: [responseExample],
            last_page: 1,
            per_page: 15
        }
    },
    second: {
        entity: { id: 2, name: 'Second Entity', table_name: 'second_table', slug: 'second-entity' },
        data: {
            current_page: 1,
            data: [responseExample],
            last_page: 1,
            per_page: 15
        }
    }
}, null, 2)}
                            </pre>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </>
    );
};

export default SectionApi;
