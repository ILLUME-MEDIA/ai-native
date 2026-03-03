import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { slugify } from '@admin/utils/stringUtils';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardBody, CardFooter, CardHeader, Col, Form, Nav, Row, Tab } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router';
import axios from 'axios';
import SectionFields from './components/SectionFields';
import SectionMcp from './components/SectionMcp';
import SectionRelations from './components/SectionRelations';

const SectionEdit = () => {
  const { id } = useParams();
  const [entities, setEntities] = useState([]);
  const [form, setForm] = useState({
    name: '',
    table_name: '',
    slug: '',
    mcp_enabled: false,
    mcp_can_read: false,
    mcp_can_create: false,
    mcp_can_update: false,
    mcp_can_delete: false,
    fields: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [entityRes, entitiesRes] = await Promise.all([
          axios.get(`/api/section-builder/entities/${id}`),
          axios.get('/api/section-builder/entities'),
        ]);
        const json = entityRes.data;
        setEntities(entitiesRes.data || []);

        let fields = [];
        if (json.fields) {
          // Check if fields is a JSON string or already an object/array
          if (typeof json.fields === 'string') {
            try {
              fields = JSON.parse(json.fields);
            } catch (e) {
              console.error("Error parsing fields JSON", e);
              fields = [];
            }
          } else {
            fields = json.fields;
          }

          // Transform database field structure to frontend format
          fields = fields.map(field => ({
            id: field.id || null,
            name: field.label || field.name || '',
            slug: field.column_name || field.slug || '',
            type: field.type || 'string',
            required: field.required ?? false,
            nullable: field.nullable ?? true,
            default_value: field.default_value || '',
            is_listing_visible: field.list_visible ?? field.is_listing_visible ?? true,
            is_detail_visible: field.detail_visible ?? field.is_detail_visible ?? true,
            related_entity_id: field.related_entity_id ?? null,
            relation_type: field.relation_type || 'belongsTo',
            relation_display_column: field.relation_display_column || '',
          }));
        }

        setForm({
          name: json.name || '',
          table_name: json.table_name || '',
          slug: json.slug || '',
          mcp_enabled: !!json.mcp_enabled,
          mcp_can_read: !!json.mcp_can_read,
          mcp_can_create: !!json.mcp_can_create,
          mcp_can_update: !!json.mcp_can_update,
          mcp_can_delete: !!json.mcp_can_delete,
          fields: Array.isArray(fields) ? fields : [],
        });
      } catch (e) {
        console.error("Failed to load section", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = { ...form };
      // Ensure fields is valid array
      if (!Array.isArray(payload.fields)) {
        payload.fields = [];
      }

      await axios.patch(`/api/section-builder/entities/${id}`, payload);

      navigate('/apps/sections');
    } catch (e) {
      if (e.response && e.response.status === 422) {
        setErrors(e.response.data.errors ?? {});
        console.error('Validation Errors:', e.response.data.errors);
      } else {
        console.error(e);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm((prev) => {
      const currentSlug = prev.slug || '';
      const expectedSlug = slugify(prev.name || '');
      const isSlugSync = currentSlug === expectedSlug || currentSlug === '';

      return {
        ...prev,
        name,
        slug: isSlugSync ? slugify(name) : currentSlug,
      };
    });
  };

  return (
    <>
      <PageBreadcrumb title="Edit Section" subtitle="Admin" />

      <Row className="justify-content-center">
        <Col xs={12}>
          <Form onSubmit={submit}>
            <Tab.Container defaultActiveKey="details">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Nav variant="pills" className="nav-pills-custom">
                  <Nav.Item>
                    <Nav.Link eventKey="details">
                      <Icon icon="info-circle" className="me-1" /> Details
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="fields">
                      <Icon icon="list-details" className="me-1" /> Fields
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="relations">
                      <Icon icon="arrows-join" className="me-1" /> Relations
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="mcp">
                      <Icon icon="shield-check" className="me-1" /> MCP Access
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
                <Link to={`/api/${id}`} className="btn btn-info">
                  <Icon icon="api" className="me-1" /> API Docs
                </Link>
              </div>

              <Card>
                <CardBody>
                  {Object.keys(errors).length > 0 && (
                    <Alert variant="danger" className="mb-3">
                      <strong>Validation Failed:</strong> Please check the inputs for errors.
                    </Alert>
                  )}

                  <Tab.Content>
                    <Tab.Pane eventKey="details">
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Name <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              value={form.name}
                              onChange={handleNameChange}
                              isInvalid={!!errors.name}
                              disabled={loading}
                            />
                            <Form.Control.Feedback type="invalid">{errors.name?.[0]}</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Table Name <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              value={form.table_name}
                              onChange={(e) => setForm({ ...form, table_name: slugify(e.target.value).replace(/-/g, '_') })}
                              isInvalid={!!errors.table_name}
                              disabled={loading}
                            />
                            <Form.Control.Feedback type="invalid">{errors.table_name?.[0]}</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Slug</Form.Label>
                            <Form.Control
                              value={form.slug}
                              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                              isInvalid={!!errors.slug}
                              disabled={loading}
                            />
                            <Form.Control.Feedback type="invalid">{errors.slug?.[0]}</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3 pt-4">
                            <Form.Check
                              type="switch"
                              id="mcp-enabled-edit"
                              label="Enable MCP (Model Context Protocol)"
                              checked={form.mcp_enabled}
                              onChange={(e) => setForm({ ...form, mcp_enabled: e.target.checked })}
                              disabled={loading}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </Tab.Pane>
                    <Tab.Pane eventKey="fields">
                      <SectionFields
                        fields={form.fields}
                        onChange={(fields) => setForm((prev) => ({ ...prev, fields }))}
                        entities={entities}
                      />
                    </Tab.Pane>
                    <Tab.Pane eventKey="relations">
                      <SectionRelations
                        entityId={id}
                        entities={entities}
                      />
                    </Tab.Pane>
                    <Tab.Pane eventKey="mcp">
                      <SectionMcp
                        entityId={id}
                        mcpConfig={{
                          enabled: form.mcp_enabled,
                          read: form.mcp_can_read || false,
                          create: form.mcp_can_create || false,
                          update: form.mcp_can_update || false,
                          delete: form.mcp_can_delete || false,
                        }}
                        onUpdate={(config) => {
                          setForm((prev) => ({
                            ...prev,
                            mcp_enabled: config.enabled,
                            mcp_can_read: config.read,
                            mcp_can_create: config.create,
                            mcp_can_update: config.update,
                            mcp_can_delete: config.delete,
                          }));
                        }}
                      />
                    </Tab.Pane>
                  </Tab.Content>
                </CardBody>
              </Card>
            </Tab.Container>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button variant="secondary" onClick={() => navigate('/apps/sections')}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={saving || loading}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </Form>
        </Col>
      </Row>
    </>
  );
};

export default SectionEdit;
