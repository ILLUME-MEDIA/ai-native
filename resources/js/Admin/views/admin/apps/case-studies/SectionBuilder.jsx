import Icon from '@admin/components/wrappers/Icon';
import { useRef, useState } from 'react';
import { Badge, Button, Card, CardBody, CardHeader, Col, Form, InputGroup, Row, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { Editor } from '@tinymce/tinymce-react';

// ─── Section type config (Tabler icons) ─────────────────────────────────
const SECTION_TYPES = {
  text:            { label: 'Text & Body',    icon: 'align-left',       color: 'primary',   defaultContent: { text_items: [{ heading: '', body: '', media_url: '' }] } },
  text_with_media: { label: 'Text + Media',   icon: 'file-description', color: 'success',   defaultContent: { body: '', media_url: '' } },
  video:           { label: 'Video Player',   icon: 'player-play',      color: 'danger',    defaultContent: { video_url: '' } },
  carousel:        { label: 'Carousel',       icon: 'slideshow',        color: 'info',      defaultContent: { slides: [{ type: 'image', image: '', video: '', text: '' }] } },
  roi:             { label: 'ROI / Stats',    icon: 'chart-bar',        color: 'warning',   defaultContent: { body: '', metrics: [{ value: '', label: '' }] } },
  project_info:    { label: 'Project Info',  icon: 'info-circle',      color: 'secondary', defaultContent: { fields: [{ label: '', value: '' }] } },
};

// ─── Deep clone helper ───────────────────────────────────────────────────
const clone = (obj) => JSON.parse(JSON.stringify(obj));

// ─── Media Upload Input ──────────────────────────────────────────────────
// Combined URL input + upload button for image/video fields
function MediaUploadInput({ value, onChange, accept = 'image/*,video/*', placeholder = 'https://...', size = 'sm' }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post('/api/admin/case-studies/upload-media', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(res.data.url);
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept={accept} className="d-none" onChange={handleFile} />
      <InputGroup size={size}>
        <Form.Control
          size={size}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <Button
          variant="outline-secondary"
          size={size}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Upload file"
        >
          {uploading
            ? <Spinner animation="border" size="sm" />
            : <Icon icon="upload" />}
        </Button>
      </InputGroup>
    </>
  );
}

// ─── Normalize content from DB to expected React structure ───────────────
export function normalizeSection(section) {
  const type    = section.type ?? 'text';
  const content = section.content ?? {};

  let normalized = { ...(SECTION_TYPES[type]?.defaultContent ?? {}), ...content };

  // ── text ──────────────────────────────────────────────────────────────
  if (type === 'text') {
    if (!Array.isArray(normalized.text_items) || normalized.text_items.length === 0) {
      normalized.text_items = [{
        heading:   section.heading ?? '',
        body:      normalized.body ?? '',
        media_url: normalized.media_url ?? '',
      }];
    }
  }

  // ── roi ───────────────────────────────────────────────────────────────
  if (type === 'roi') {
    // DB uses `roi_items`, our editor uses `metrics`
    if (Array.isArray(content.roi_items) && content.roi_items.length > 0) {
      normalized.metrics = content.roi_items.map((item) => ({
        value: item.value ?? '',
        label: item.label ?? '',
      }));
    } else if (!Array.isArray(normalized.metrics) || normalized.metrics.length === 0) {
      // Legacy metric_1/label_1 pairs
      const metrics = [];
      for (let i = 1; i <= 10; i++) {
        const v = content[`metric_${i}`];
        const l = content[`label_${i}`];
        if (v || l) metrics.push({ value: v ?? '', label: l ?? '' });
      }
      normalized.metrics = metrics.length > 0 ? metrics : [{ value: '', label: '' }];
    }
  }

  // ── project_info ──────────────────────────────────────────────────────
  if (type === 'project_info') {
    // DB uses `project_info_items` with {title, links[], value}
    if (Array.isArray(content.project_info_items) && content.project_info_items.length > 0) {
      normalized.fields = content.project_info_items.map((item) => ({
        label: item.title ?? '',
        value: Array.isArray(item.links) && item.links.length > 0
          ? item.links.map((l) => l.name ?? '').filter(Boolean).join(', ')
          : (item.value ?? ''),
      }));
    } else if (!Array.isArray(normalized.fields) || normalized.fields.length === 0) {
      normalized.fields = [{ label: '', value: '' }];
    }
  }

  // ── carousel ──────────────────────────────────────────────────────────
  if (type === 'carousel') {
    if (!Array.isArray(normalized.slides) || normalized.slides.length === 0) {
      normalized.slides = [{ type: 'image', image: '', video: '', text: '' }];
    } else {
      // DB slides use `url` key instead of `image`/`video`
      normalized.slides = normalized.slides.map((s) => {
        const slideType = s.type ?? 'image';
        const url = s.url ?? s.image ?? s.video ?? '';
        return {
          type:  slideType,
          image: slideType === 'image' ? url : (s.image ?? ''),
          video: slideType === 'video' ? url : (s.video ?? ''),
          text:  s.text ?? '',
        };
      });
    }
  }

  return { ...section, content: normalized };
}

// ─── Individual section editors ─────────────────────────────────────────

function TextEditor({ content, onChange }) {
  const items = Array.isArray(content.text_items) && content.text_items.length > 0
    ? content.text_items
    : [{ heading: '', body: '', media_url: '' }];

  const update = (idx, field, value) => {
    const next = clone(items);
    next[idx][field] = value;
    onChange({ ...content, text_items: next });
  };

  const add = () => onChange({ ...content, text_items: [...items, { heading: '', body: '', media_url: '' }] });
  const remove = (idx) => onChange({ ...content, text_items: items.filter((_, i) => i !== idx) });

  return (
    <div>
      {items.map((item, idx) => (
        <div key={idx} className="border rounded p-3 mb-3 bg-light position-relative">
          <button
            type="button"
            className="btn btn-sm btn-soft-danger btn-icon position-absolute top-0 end-0 m-2"
            onClick={() => remove(idx)}
            title="Remove"
          >
            <Icon icon="trash" />
          </button>
          <Form.Group className="mb-2">
            <Form.Label className="fw-semibold" style={{ fontSize: '0.78rem' }}>Heading</Form.Label>
            <Form.Control size="sm" value={item.heading ?? ''} onChange={(e) => update(idx, 'heading', e.target.value)} placeholder="Block heading..." />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label className="fw-semibold" style={{ fontSize: '0.78rem' }}>Body</Form.Label>
            <Editor
              apiKey="jskpspufidaq4lur64d5se6fsad1c7d6adqbod38hinjldf5"
              value={item.body ?? ''}
              init={{
                height: 260,
                menubar: false,
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'charmap',
                  'preview', 'anchor', 'searchreplace', 'visualblocks',
                  'code', 'fullscreen', 'insertdatetime', 'media',
                  'table', 'help', 'wordcount',
                ],
                toolbar:
                  'undo redo | blocks | ' +
                  'bold italic underline forecolor | alignleft aligncenter ' +
                  'alignright alignjustify | bullist numlist outdent indent | ' +
                  'removeformat | link table | code',
                content_style: 'body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size:14px }',
              }}
              onEditorChange={(value) => update(idx, 'body', value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label className="fw-semibold" style={{ fontSize: '0.78rem' }}>Media URL (optional)</Form.Label>
            <MediaUploadInput value={item.media_url ?? ''} onChange={(v) => update(idx, 'media_url', v)} placeholder="https://... or upload" />
            {item.media_url && (
              <div className="mt-2">
                <small className="text-muted d-block mb-1">Preview</small>
                <img
                  src={item.media_url}
                  alt="Media preview"
                  className="img-fluid rounded border"
                  style={{ maxHeight: 180, objectFit: 'cover' }}
                  onError={(ev) => { ev.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}
          </Form.Group>
        </div>
      ))}
      <Button size="sm" variant="outline-primary" onClick={add}>
        <Icon icon="plus" className="me-1" /> Add Text Block
      </Button>
    </div>
  );
}

function TextWithMediaEditor({ content, onChange }) {
  return (
    <>
      <Form.Group className="mb-3">
        <Form.Label className="fw-semibold" style={{ fontSize: '0.78rem' }}>Body Content</Form.Label>
        <Editor
          apiKey="jskpspufidaq4lur64d5se6fsad1c7d6adqbod38hinjldf5"
          value={content.body ?? ''}
          init={{
            height: 260,
            menubar: false,
            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'charmap',
              'preview', 'anchor', 'searchreplace', 'visualblocks',
              'code', 'fullscreen', 'insertdatetime', 'media',
              'table', 'help', 'wordcount',
            ],
            toolbar:
              'undo redo | blocks | ' +
              'bold italic underline forecolor | alignleft aligncenter ' +
              'alignright alignjustify | bullist numlist outdent indent | ' +
              'removeformat | link table | code',
            content_style: 'body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size:14px }',
          }}
          onEditorChange={(value) => onChange({ ...content, body: value })}
        />
      </Form.Group>
      <Form.Group>
        <Form.Label className="fw-semibold" style={{ fontSize: '0.78rem' }}>Media URL</Form.Label>
        <MediaUploadInput value={content.media_url ?? ''} onChange={(v) => onChange({ ...content, media_url: v })} placeholder="Video/image URL or upload..." />
        {content.media_url && (
          <div className="mt-2">
            <small className="text-muted d-block mb-1">Preview</small>
            <img
              src={content.media_url}
              alt="Media preview"
              className="img-fluid rounded border"
              style={{ maxHeight: 180, objectFit: 'cover' }}
              onError={(ev) => { ev.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}
      </Form.Group>
    </>
  );
}

function VideoEditor({ content, onChange }) {
  return (
    <Form.Group>
      <Form.Label className="fw-semibold" style={{ fontSize: '0.78rem' }}>Video URL / Path</Form.Label>
      <MediaUploadInput value={content.video_url ?? ''} onChange={(v) => onChange({ ...content, video_url: v })} accept="video/*" placeholder="YouTube, Vimeo, local path or upload..." size="md" />
      {content.video_url && (
        <div className="mt-2">
          <small className="text-muted d-block mb-1">Preview</small>
          <video
            src={content.video_url}
            controls
            className="w-100 rounded border"
            style={{ maxHeight: 220, objectFit: 'cover' }}
            onError={(ev) => { ev.currentTarget.style.display = 'none'; }}
          />
        </div>
      )}
    </Form.Group>
  );
}

function CarouselEditor({ content, onChange }) {
  const slides = Array.isArray(content.slides) ? content.slides : [];

  const update = (idx, field, value) => {
    const next = clone(slides);
    next[idx][field] = value;
    onChange({ ...content, slides: next });
  };

  const add = () => onChange({ ...content, slides: [...slides, { type: 'image', image: '', video: '', text: '' }] });
  const remove = (idx) => onChange({ ...content, slides: slides.filter((_, i) => i !== idx) });

  return (
    <div>
      {slides.map((slide, idx) => (
        <div key={idx} className="border rounded p-3 mb-3 bg-light position-relative">
          <button
            type="button"
            className="btn btn-sm btn-soft-danger btn-icon position-absolute top-0 end-0 m-2"
            onClick={() => remove(idx)}
            title="Remove Slide"
          >
            <Icon icon="trash" />
          </button>
          <Row className="g-2 align-items-start">
            <Col xs={3}>
              <Form.Label className="fw-semibold" style={{ fontSize: '0.78rem' }}>Type</Form.Label>
              <Form.Select size="sm" value={slide.type ?? 'image'} onChange={(e) => {
                const next = clone(slides);
                next[idx] = { type: e.target.value, image: '', video: '', text: next[idx].text ?? '' };
                onChange({ ...content, slides: next });
              }}>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="text">Text</option>
              </Form.Select>
            </Col>
            <Col xs={9}>
              {(slide.type ?? 'image') === 'image' && (
                <Form.Group>
                  <Form.Label className="fw-semibold" style={{ fontSize: '0.78rem' }}>Image URL</Form.Label>
                  <MediaUploadInput value={slide.image ?? ''} onChange={(v) => update(idx, 'image', v)} accept="image/*" placeholder="Image URL or upload..." />
                  {slide.image && (
                    <div className="mt-2">
                      <small className="text-muted d-block mb-1">Preview</small>
                      <img
                        src={slide.image}
                        alt="Slide preview"
                        className="img-fluid rounded border"
                        style={{ maxHeight: 180, objectFit: 'cover' }}
                        onError={(ev) => { ev.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  )}
                </Form.Group>
              )}
              {slide.type === 'video' && (
                <Form.Group>
                  <Form.Label className="fw-semibold" style={{ fontSize: '0.78rem' }}>Video URL</Form.Label>
                  <MediaUploadInput value={slide.video ?? ''} onChange={(v) => update(idx, 'video', v)} accept="video/*" placeholder="Video URL or upload..." />
                  {slide.video && (
                    <div className="mt-2">
                      <small className="text-muted d-block mb-1">Preview</small>
                      <video
                        src={slide.video}
                        controls
                        className="w-100 rounded border"
                        style={{ maxHeight: 220, objectFit: 'cover' }}
                        onError={(ev) => { ev.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  )}
                </Form.Group>
              )}
              {slide.type === 'text' && (
                <Form.Group>
                  <Form.Label className="fw-semibold" style={{ fontSize: '0.78rem' }}>Text Content</Form.Label>
                  <Form.Control as="textarea" rows={2} size="sm" value={slide.text ?? ''} onChange={(e) => update(idx, 'text', e.target.value)} placeholder="Slide text..." />
                </Form.Group>
              )}
            </Col>
          </Row>
        </div>
      ))}
      <Button size="sm" variant="outline-info" onClick={add}>
        <Icon icon="plus" className="me-1" /> Add Slide
      </Button>
    </div>
  );
}

function RoiEditor({ content, onChange }) {
  const metrics = Array.isArray(content.metrics) ? content.metrics : [];

  const updateMetric = (idx, field, value) => {
    const next = clone(metrics);
    next[idx][field] = value;
    onChange({ ...content, metrics: next });
  };

  const addMetric = () => onChange({ ...content, metrics: [...metrics, { value: '', label: '' }] });
  const removeMetric = (idx) => onChange({ ...content, metrics: metrics.filter((_, i) => i !== idx) });

  return (
    <>
      <Form.Group className="mb-3">
        <Form.Label className="fw-semibold" style={{ fontSize: '0.78rem' }}>Body / Impact Description</Form.Label>
        <Editor
          apiKey="1sfzxm1s0wav9yrxfp1zi9d3fhorw99wx3n3y7hlly9mod1f"
          value={content.body ?? ''}
          init={{
            height: 220,
            menubar: false,
            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'charmap',
              'preview', 'anchor', 'searchreplace', 'visualblocks',
              'code', 'fullscreen', 'insertdatetime', 'media',
              'table', 'help', 'wordcount',
            ],
            toolbar:
              'undo redo | blocks | ' +
              'bold italic underline forecolor | alignleft aligncenter ' +
              'alignright alignjustify | bullist numlist outdent indent | ' +
              'removeformat | link table | code',
            content_style: 'body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size:14px }',
          }}
          onEditorChange={(value) => onChange({ ...content, body: value })}
        />
      </Form.Group>
      <div className="mb-2">
        <Form.Label className="fw-semibold" style={{ fontSize: '0.78rem' }}>Metrics</Form.Label>
        {metrics.map((metric, idx) => (
          <Row key={idx} className="g-2 mb-2 align-items-center">
            <Col xs={4}>
              <Form.Control size="sm" value={metric.value ?? ''} onChange={(e) => updateMetric(idx, 'value', e.target.value)} placeholder="e.g. 400%" />
            </Col>
            <Col xs={6}>
              <Form.Control size="sm" value={metric.label ?? ''} onChange={(e) => updateMetric(idx, 'label', e.target.value)} placeholder="e.g. Revenue Growth" />
            </Col>
            <Col xs={2}>
              <button type="button" className="btn btn-sm btn-soft-danger btn-icon w-100" onClick={() => removeMetric(idx)}>
                <Icon icon="trash" />
              </button>
            </Col>
          </Row>
        ))}
        <Button size="sm" variant="outline-warning" onClick={addMetric}>
          <Icon icon="plus" className="me-1" /> Add Metric
        </Button>
      </div>
    </>
  );
}

function ProjectInfoEditor({ content, onChange }) {
  const fields = Array.isArray(content.fields) ? content.fields : [];

  const updateField = (idx, key, value) => {
    const next = clone(fields);
    next[idx][key] = value;
    onChange({ ...content, fields: next });
  };

  const add = () => onChange({ ...content, fields: [...fields, { label: '', value: '' }] });
  const remove = (idx) => onChange({ ...content, fields: fields.filter((_, i) => i !== idx) });

  return (
    <div>
      <Form.Label className="fw-semibold" style={{ fontSize: '0.78rem' }}>Key-Value Fields</Form.Label>
      {fields.map((field, idx) => (
        <Row key={idx} className="g-2 mb-2 align-items-center">
          <Col xs={4}>
            <Form.Control size="sm" value={field.label ?? ''} onChange={(e) => updateField(idx, 'label', e.target.value)} placeholder="Label (e.g. Client)" />
          </Col>
          <Col xs={6}>
            <Form.Control size="sm" value={field.value ?? ''} onChange={(e) => updateField(idx, 'value', e.target.value)} placeholder="Value..." />
          </Col>
          <Col xs={2}>
            <button type="button" className="btn btn-sm btn-soft-danger btn-icon w-100" onClick={() => remove(idx)}>
              <Icon icon="trash" />
            </button>
          </Col>
        </Row>
      ))}
      <Button size="sm" variant="outline-secondary" onClick={add}>
        <Icon icon="plus" className="me-1" /> Add Field
      </Button>
    </div>
  );
}

// ─── Section Card ────────────────────────────────────────────────────────

function SectionCard({ section, index, total, onChange, onRemove, onMove }) {
  const [collapsed, setCollapsed] = useState(false);
  const cfg = SECTION_TYPES[section.type] ?? SECTION_TYPES.text;

  const updateContent = (newContent) => onChange({ ...section, content: newContent });

  const renderEditor = () => {
    switch (section.type) {
      case 'text':            return <TextEditor content={section.content} onChange={updateContent} />;
      case 'text_with_media': return <TextWithMediaEditor content={section.content} onChange={updateContent} />;
      case 'video':           return <VideoEditor content={section.content} onChange={updateContent} />;
      case 'carousel':        return <CarouselEditor content={section.content} onChange={updateContent} />;
      case 'roi':             return <RoiEditor content={section.content} onChange={updateContent} />;
      case 'project_info':    return <ProjectInfoEditor content={section.content} onChange={updateContent} />;
      default:                return null;
    }
  };

  return (
    <Card className="mb-3 shadow-sm">
      <CardHeader className="py-2 px-3 d-flex align-items-center gap-2">
        <button type="button" className="btn btn-sm btn-light btn-icon p-1" onClick={() => setCollapsed(!collapsed)}>
          <Icon icon={collapsed ? 'chevron-right' : 'chevron-down'} />
        </button>
        <Badge bg={cfg.color} className={`bg-${cfg.color}-subtle text-${cfg.color} fw-normal px-2`}>
          <Icon icon={cfg.icon} className="me-1" style={{ fontSize: '0.75rem' }} />
          {cfg.label}
        </Badge>
        <Form.Control
          size="sm"
          className="border-0 bg-transparent fw-semibold shadow-none"
          style={{ maxWidth: 280 }}
          value={section.heading ?? ''}
          onChange={(e) => onChange({ ...section, heading: e.target.value })}
          placeholder="Section heading..."
        />
        <div className="ms-auto d-flex align-items-center gap-1">
          <Form.Check
            type="switch"
            checked={!!section.is_active}
            onChange={(e) => onChange({ ...section, is_active: e.target.checked ? 1 : 0 })}
            title="Active"
            className="mb-0"
          />
          <button type="button" className="btn btn-sm btn-light btn-icon p-1" onClick={() => onMove(index, -1)} disabled={index === 0} title="Move up">
            <Icon icon="arrow-up" />
          </button>
          <button type="button" className="btn btn-sm btn-light btn-icon p-1" onClick={() => onMove(index, 1)} disabled={index === total - 1} title="Move down">
            <Icon icon="arrow-down" />
          </button>
          <button type="button" className="btn btn-sm btn-soft-danger btn-icon p-1" onClick={onRemove} title="Delete">
            <Icon icon="trash" />
          </button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardBody className="pt-3">
          {renderEditor()}
        </CardBody>
      )}
    </Card>
  );
}

// ─── Main SectionBuilder ─────────────────────────────────────────────────

const SectionBuilder = ({ sections = [], onChange }) => {
  const addSection = (type) => {
    const cfg = SECTION_TYPES[type];
    const newSection = {
      id: null,
      type,
      heading: '',
      is_active: 1,
      order: sections.length,
      content: clone(cfg.defaultContent),
    };
    onChange([...sections, newSection]);
  };

  const updateSection = (idx, updated) => {
    const next = [...sections];
    next[idx] = { ...updated, order: idx };
    onChange(next);
  };

  const removeSection = (idx) => {
    onChange(sections.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));
  };

  const moveSection = (idx, direction) => {
    const next = [...sections];
    const target = idx + direction;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next.map((s, i) => ({ ...s, order: i })));
  };

  return (
    <div>
      {/* Add section toolbar */}
      <div className="d-flex flex-wrap gap-2 mb-4 p-3 border rounded bg-light">
        <span className="text-muted fw-semibold align-self-center me-1" style={{ fontSize: '0.82rem' }}>Add Section:</span>
        {Object.entries(SECTION_TYPES).map(([type, cfg]) => (
          <button
            key={type}
            type="button"
            className={`btn btn-sm btn-outline-${cfg.color}`}
            onClick={() => addSection(type)}
          >
            <Icon icon={cfg.icon} className="me-1" />
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Section list */}
      {sections.length === 0 ? (
        <div className="text-center py-5 text-muted border rounded bg-light">
          <Icon icon="stack-2" style={{ fontSize: '2rem' }} className="mb-2 d-block mx-auto" />
          <p className="mb-0">No sections yet. Add one above.</p>
        </div>
      ) : (
        sections.map((section, idx) => (
          <SectionCard
            key={idx}
            section={section}
            index={idx}
            total={sections.length}
            onChange={(updated) => updateSection(idx, updated)}
            onRemove={() => removeSection(idx)}
            onMove={moveSection}
          />
        ))
      )}
    </div>
  );
};

export default SectionBuilder;
