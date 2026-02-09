import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { slugify } from '@admin/utils/stringUtils';
import { useState } from 'react';
import { Alert, Button, Card, CardBody, CardFooter, CardHeader, Col, Form, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router';
import axios from 'axios';

const SectionCreate = () => {
  const [form, setForm] = useState({ name: '', table_name: '', slug: '', mcp_enabled: false });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm((prev) => {
      const currentSlug = prev.slug || '';
      const expectedSlug = slugify(prev.name || '');
      const isSlugSync = currentSlug === expectedSlug || currentSlug === '';

      const currentTable = prev.table_name || '';
      const expectedTable = slugify(prev.name || '').replace(/-/g, '_');
      const isTableSync = currentTable === expectedTable || currentTable === '';

      return {
        ...prev,
        name,
        slug: isSlugSync ? slugify(name) : currentSlug,
        table_name: isTableSync ? slugify(name).replace(/-/g, '_') : currentTable
      };
    });
  };

  const handleSlugChange = (e) => {
    setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await axios.post('/api/section-builder/entities', form);
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

  return (
    <>
      <PageBreadcrumb title="Create Section" subtitle="Admin" />

      <Row className="justify-content-center">
        <Col xs={12} lg={6}>
          <Card>
            <CardHeader className="border-light">
              <h5 className="mb-0">New Section</h5>
            </CardHeader>
            <Form onSubmit={submit}>
              <CardBody>
                {Object.keys(errors).length > 0 && (
                  <Alert variant="danger" className="mb-3">
                    <strong>Validation Failed:</strong> Please check the form for errors.
                  </Alert>
                )}
                <Form.Group className="mb-3">
                  <Form.Label>Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    value={form.name}
                    onChange={handleNameChange}
                    isInvalid={!!errors.name}
                    placeholder="e.g. Blog Posts"
                  />
                  <Form.Control.Feedback type="invalid">{errors.name?.[0]}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Table Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    value={form.table_name}
                    onChange={(e) => setForm({ ...form, table_name: slugify(e.target.value).replace(/-/g, '_') })}
                    isInvalid={!!errors.table_name}
                    placeholder="e.g. blog_posts"
                  />
                  <Form.Text className="text-muted">Database table name (auto-formatted)</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.table_name?.[0]}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Slug</Form.Label>
                  <Form.Control
                    value={form.slug}
                    readOnly
                    className="bg-light"
                    placeholder="Auto-generated"
                  />
                  <Form.Text className="text-muted">Auto-generated from Name</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.slug?.[0]}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="mcp-enabled"
                    label="Enable MCP (Model Context Protocol)"
                    checked={!!form.mcp_enabled}
                    onChange={(e) => setForm({ ...form, mcp_enabled: e.target.checked })}
                  />
                </Form.Group>
              </CardBody>

              <CardFooter className="border-0 d-flex justify-content-end gap-2">
                <Button variant="light" onClick={() => navigate('/apps/sections')}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  <Icon icon="device-floppy" className="me-1" />
                  Save Section
                </Button>
              </CardFooter>
            </Form>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default SectionCreate;
