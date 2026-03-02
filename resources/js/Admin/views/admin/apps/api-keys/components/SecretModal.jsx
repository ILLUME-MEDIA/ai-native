import { useState, useEffect } from 'react';
import {
  Button, Col, Form, FormControl, FormGroup, FormLabel,
  FormSelect, FormText, Modal, ModalBody, ModalFooter,
  ModalHeader, ModalTitle, Row, InputGroup,
} from 'react-bootstrap';
import Icon from '@admin/components/wrappers/Icon';

const GROUPS = [
  { value: 'general',  label: 'General' },
  { value: 'stripe',   label: 'Stripe' },
  { value: 'doordash', label: 'DoorDash' },
  { value: 'square',   label: 'Square' },
  { value: 'clover',   label: 'Clover' },
  { value: 'resend',   label: 'Resend / Email' },
  { value: 'youtube',  label: 'YouTube' },
  { value: 'ai',       label: 'AI / LLM' },
  { value: 'other',    label: 'Other' },
];

const EMPTY_FORM = {
  key:         '',
  label:       '',
  group:       'general',
  value:       '',
  description: '',
  is_active:   true,
};

const SecretModal = ({ show, onHide, onSaved, editing = null }) => {
  const [form, setForm]         = useState(EMPTY_FORM);
  const [showVal, setShowVal]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [errors, setErrors]     = useState({});

  // Populate form when editing
  useEffect(() => {
    if (show) {
      setShowVal(false);
      setErrors({});
      if (editing) {
        setForm({
          key:         editing.key,
          label:       editing.label  ?? '',
          group:       editing.group  ?? 'general',
          value:       '',                 // never pre-fill the value
          description: editing.description ?? '',
          is_active:   editing.is_active,
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [show, editing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Auto-uppercase the key field
  const handleKeyChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    setForm(prev => ({ ...prev, key: val }));
  };

  const validate = () => {
    const errs = {};
    if (!form.key) errs.key = 'Key is required.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setErrors({});

    try {
      const payload = { ...form };
      // When editing, only send value if user typed something
      if (editing && payload.value === '') delete payload.value;

      const url    = editing ? `/api/admin/app-secrets/${editing.id}` : '/api/admin/app-secrets';
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type':     'application/json',
          'X-CSRF-TOKEN':     document.querySelector('meta[name="csrf-token"]')?.content ?? '',
          'Accept':           'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.errors) { setErrors(data.errors); return; }
        throw new Error(data.message ?? 'Save failed');
      }

      const saved = await res.json();
      onSaved(saved, !!editing);
      onHide();
    } catch (err) {
      setErrors({ _global: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <ModalHeader closeButton>
        <ModalTitle as="h5">
          {editing ? 'Edit Secret' : 'Add New Secret'}
        </ModalTitle>
      </ModalHeader>

      <Form onSubmit={handleSubmit}>
        <ModalBody>
          {errors._global && (
            <div className="alert alert-danger py-2">{errors._global}</div>
          )}

          <Row className="g-3">
            {/* Key */}
            <Col md={6}>
              <FormGroup controlId="secretKey">
                <FormLabel>
                  Key <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  name="key"
                  type="text"
                  value={form.key}
                  onChange={handleKeyChange}
                  placeholder="STRIPE_SECRET_KEY"
                  isInvalid={!!errors.key}
                  disabled={!!editing}  // key cannot change after creation
                  className="font-monospace"
                />
                {errors.key
                  ? <Form.Control.Feedback type="invalid">{errors.key}</Form.Control.Feedback>
                  : <FormText className="text-muted">Uppercase letters, digits and _ only.</FormText>
                }
              </FormGroup>
            </Col>

            {/* Label */}
            <Col md={6}>
              <FormGroup controlId="secretLabel">
                <FormLabel>Label</FormLabel>
                <FormControl
                  name="label"
                  type="text"
                  value={form.label}
                  onChange={handleChange}
                  placeholder="Stripe Secret Key"
                />
              </FormGroup>
            </Col>

            {/* Group */}
            <Col md={6}>
              <FormGroup controlId="secretGroup">
                <FormLabel>Group</FormLabel>
                <FormSelect name="group" value={form.group} onChange={handleChange}>
                  {GROUPS.map(g => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </FormSelect>
              </FormGroup>
            </Col>

            {/* Active */}
            <Col md={6} className="d-flex align-items-end pb-1">
              <Form.Check
                type="switch"
                id="is_active"
                name="is_active"
                label="Active"
                checked={form.is_active}
                onChange={handleChange}
              />
            </Col>

            {/* Value */}
            <Col xs={12}>
              <FormGroup controlId="secretValue">
                <FormLabel>
                  Value{editing && <span className="text-muted ms-1 fs-sm">(leave blank to keep current)</span>}
                </FormLabel>
                <InputGroup>
                  <FormControl
                    name="value"
                    type={showVal ? 'text' : 'password'}
                    value={form.value}
                    onChange={handleChange}
                    placeholder={editing ? '••••••••••••' : 'Enter secret value'}
                    className="font-monospace"
                  />
                  <Button
                    variant="outline-secondary"
                    type="button"
                    onClick={() => setShowVal(v => !v)}
                    title={showVal ? 'Hide' : 'Show'}
                  >
                    <Icon icon={showVal ? 'eye-off' : 'eye'} className="fs-sm" />
                  </Button>
                </InputGroup>
              </FormGroup>
            </Col>

            {/* Description */}
            <Col xs={12}>
              <FormGroup controlId="secretDescription">
                <FormLabel>Description</FormLabel>
                <FormControl
                  as="textarea"
                  rows={2}
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Optional notes about this secret"
                />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" type="button" onClick={onHide} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving
              ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
              : editing ? 'Save Changes' : 'Add Secret'
            }
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  );
};

export default SecretModal;
