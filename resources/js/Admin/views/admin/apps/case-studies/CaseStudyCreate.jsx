import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Badge, Button, Card, CardBody, CardHeader,
  Col, Form, Row,
} from 'react-bootstrap';
import { Link, useNavigate } from 'react-router';
import axios from 'axios';
import SectionBuilder from './SectionBuilder';

const slugify = (str) =>
  str.toString().toLowerCase().trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const CaseStudyCreate = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');
  const [groups, setGroups] = useState([]);
  const [sections, setSections] = useState([]);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    category: '',
    description: '',
    client_name: '',
    project_link: '',
    status: '1',
    tags: [],
    featured_image_url: '',
    group_ids: [],
  });
  const [featuredFile, setFeaturedFile] = useState(null);
  const [featuredPreview, setFeaturedPreview] = useState('');
  const [featuredIsVideo, setFeaturedIsVideo] = useState(false);

  useEffect(() => {
    axios.get('/api/admin/case-study-groups').then((r) => setGroups(r.data ?? [])).catch(() => {});
  }, []);

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setForm((prev) => ({
      ...prev,
      title,
      slug: prev.slug === slugify(prev.title) || prev.slug === '' ? slugify(title) : prev.slug,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().replace(/,$/, '');
      if (tag && !form.tags.includes(tag)) {
        setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tag) =>
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));

  const toggleGroup = (id) =>
    setForm((prev) => ({
      ...prev,
      group_ids: prev.group_ids.includes(id)
        ? prev.group_ids.filter((x) => x !== id)
        : [...prev.group_ids, id],
    }));

  const fileInputRef = React.useRef(null);
  const isVideoSrc = (src) => /\.(mp4|webm|ogg|mov|avi|mkv|m4v)(\?.*)?$/i.test(src);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFeaturedFile(file);
    setFeaturedPreview(URL.createObjectURL(file));
    setFeaturedIsVideo(file.type.startsWith('video/'));
    setForm((prev) => ({ ...prev, featured_image_url: '' }));
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setForm((prev) => ({ ...prev, featured_image_url: url }));
    setFeaturedIsVideo(isVideoSrc(url));
    if (featuredFile) {
      setFeaturedFile(null);
      setFeaturedPreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('slug', form.slug);
      fd.append('category', form.category);
      fd.append('description', form.description);
      fd.append('client_name', form.client_name);
      fd.append('project_link', form.project_link);
      fd.append('status', form.status);
      fd.append('featured_image_url', form.featured_image_url);
      fd.append('tags', JSON.stringify(form.tags));
      fd.append('sections', JSON.stringify(sections));
      fd.append('group_ids', JSON.stringify(form.group_ids));
      if (featuredFile) fd.append('featured_image', featuredFile);

      await axios.post('/api/admin/case-studies', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate('/apps/case-studies');
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {});
      } else {
        alert('Error: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageBreadcrumb title="Create Case Study" subtitle="Case Studies" />

      <Form onSubmit={submit}>
        <Row className="g-4">
          {/* ── Main ── */}
          <Col xs={12} lg={8}>

            {Object.keys(errors).length > 0 && (
              <Alert variant="danger" className="mb-4">
                <strong>Please fix:</strong>
                <ul className="mb-0 mt-1">
                  {Object.values(errors).flat().map((msg, i) => <li key={i}>{msg}</li>)}
                </ul>
              </Alert>
            )}

            {/* Basic Info */}
            <Card className="mb-4">
              <CardHeader className="border-light">
                <h5 className="mb-0">Page Details</h5>
              </CardHeader>
              <CardBody>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Title <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    size="lg"
                    name="title"
                    value={form.title}
                    onChange={handleTitleChange}
                    placeholder="Enter case study title..."
                    isInvalid={!!errors.title}
                    required
                  />
                  <Form.Control.Feedback type="invalid">{errors.title?.[0]}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Slug</Form.Label>
                  <Form.Control
                    name="slug"
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
                    placeholder="auto-generated-from-title"
                    isInvalid={!!errors.slug}
                  />
                  <Form.Text className="text-muted">Auto-generated from title.</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.slug?.[0]}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group>
                  <Form.Label className="fw-semibold">Short Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Brief summary for listings and SEO..."
                  />
                </Form.Group>
              </CardBody>
            </Card>

            {/* Sections Builder */}
            <Card>
              <CardHeader className="border-light d-flex align-items-center justify-content-between">
                <h5 className="mb-0">
                  <Icon icon="stack-2" className="me-2 text-primary" />
                  Page Sections
                </h5>
                <Badge bg="secondary" className="bg-secondary-subtle text-secondary">
                  {sections.length} section{sections.length !== 1 ? 's' : ''}
                </Badge>
              </CardHeader>
              <CardBody>
                <SectionBuilder sections={sections} onChange={setSections} />
              </CardBody>
            </Card>
          </Col>

          {/* ── Sidebar ── */}
          <Col xs={12} lg={4}>

            {/* Publish */}
            <Card className="mb-4">
              <CardBody>
                <div className="d-grid gap-2">
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving
                      ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</>
                      : <><Icon icon="device-floppy" className="me-2" />Publish Case Study</>}
                  </Button>
                  <Link to="/apps/case-studies" className="btn btn-outline-secondary">
                    <Icon icon="arrow-left" className="me-1" />Back to List
                  </Link>
                </div>
              </CardBody>
            </Card>

            {/* Settings */}
            <Card className="mb-4">
              <CardHeader className="border-light"><h5 className="mb-0">Settings</h5></CardHeader>
              <CardBody>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Status</Form.Label>
                  <Form.Select name="status" value={form.status} onChange={handleChange}>
                    <option value="1">Published</option>
                    <option value="0">Draft</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Category</Form.Label>
                  <Form.Control name="category" value={form.category} onChange={handleChange} placeholder="e.g. AI-ENTERPRISE" />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Client Name</Form.Label>
                  <Form.Control name="client_name" value={form.client_name} onChange={handleChange} placeholder="e.g. Acme Corp" />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Project / Live Link</Form.Label>
                  <Form.Control name="project_link" value={form.project_link} onChange={handleChange} placeholder="https://..." />
                </Form.Group>

                <Form.Group>
                  <Form.Label className="fw-semibold">Tags</Form.Label>
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {form.tags.map((tag) => (
                      <Badge key={tag} bg="primary" className="bg-primary-subtle text-primary d-flex align-items-center gap-1" style={{ cursor: 'default' }}>
                        {tag}
                        <span onClick={() => removeTag(tag)} style={{ cursor: 'pointer', fontWeight: 'bold' }}>&times;</span>
                      </Badge>
                    ))}
                  </div>
                  <Form.Control
                    size="sm"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    placeholder="Type tag + Enter..."
                  />
                  <Form.Text className="text-muted">Press Enter or comma to add.</Form.Text>
                </Form.Group>
              </CardBody>
            </Card>

            {/* Featured Image */}
            <Card className="mb-4">
              <CardHeader className="border-light"><h5 className="mb-0">Featured Image</h5></CardHeader>
              <CardBody>
                {(featuredPreview || form.featured_image_url) && (
                  <div className="mb-3">
                    {featuredIsVideo ? (
                      <video
                        src={featuredPreview || form.featured_image_url}
                        controls
                        className="rounded"
                        style={{ maxHeight: 180, width: '100%' }}
                      />
                    ) : (
                      <img
                        src={featuredPreview || form.featured_image_url}
                        alt="Preview"
                        className="img-fluid rounded"
                        style={{ maxHeight: 180, width: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                        onLoad={(e) => { e.target.style.display = ''; }}
                      />
                    )}
                  </div>
                )}
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Upload File</Form.Label>
                  <Form.Control ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} />
                </Form.Group>
                <Form.Group>
                  <Form.Label className="fw-semibold">Or paste URL</Form.Label>
                  <Form.Control
                    name="featured_image_url"
                    value={form.featured_image_url}
                    onChange={handleUrlChange}
                    placeholder="https://..."
                  />
                  <Form.Text className="text-muted">Paste image/video URL to preview and save.</Form.Text>
                </Form.Group>
              </CardBody>
            </Card>

            {/* Groups */}
            {groups.length > 0 && (
              <Card>
                <CardHeader className="border-light"><h5 className="mb-0">Groups</h5></CardHeader>
                <CardBody>
                  <div className="d-flex flex-column gap-2">
                    {groups.map((g) => (
                      <label key={g.id} className="d-flex align-items-center gap-2 p-2 rounded border" style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          className="form-check-input mt-0"
                          checked={form.group_ids.includes(g.id)}
                          onChange={() => toggleGroup(g.id)}
                        />
                        <span className="badge" style={{ background: (g.color ?? '#3b82f6') + '22', color: g.color ?? '#3b82f6', border: `1px solid ${(g.color ?? '#3b82f6')}44` }}>
                          {g.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </Col>
        </Row>
      </Form>
    </>
  );
};

export default CaseStudyCreate;
