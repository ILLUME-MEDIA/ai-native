import Icon from '@admin/components/wrappers/Icon';
import { slugify } from '@admin/utils/stringUtils';
import { useState } from 'react';
import { Badge, Button, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { ReactSortable } from 'react-sortablejs';

const FIELD_TYPES = [
    { value: 'string', label: 'String (Short Text)' },
    { value: 'text', label: 'Text (Long Text)' },
    { value: 'integer', label: 'Integer (Number)' },
    { value: 'boolean', label: 'Boolean (Yes/No)' },
    { value: 'date', label: 'Date' },
    { value: 'datetime', label: 'DateTime' },
    { value: 'file', label: 'File / Image' },
    { value: 'select', label: 'Select (Dropdown)' },
    { value: 'relationship', label: 'Relationship (Link to another table)' },
];

const EMPTY_FIELD = {
    id: null,
    name: '',
    slug: '',
    type: 'string',
    required: false,
    nullable: true,
    default_value: '',
    is_listing_visible: true,
    is_detail_visible: true,
    related_entity_id: null,
    relation_type: 'belongsTo',
    relation_display_column: '',
};

// Show what key will appear in the API response for a relationship field
function apiKeyPreview(field) {
    if (!field.slug) return null;
    if (field.relation_type === 'belongsTo') return `${field.slug}_relation`;
    return field.slug;
}

const SectionFields = ({ fields, onChange, entities = [] }) => {
    const [showModal, setShowModal]     = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [slugEdited, setSlugEdited]   = useState(false);   // true = user manually changed the slug
    const [currentField, setCurrentField] = useState(EMPTY_FIELD);

    const openAdd = () => {
        setEditingIndex(null);
        setSlugEdited(false);
        setCurrentField({ ...EMPTY_FIELD });
        setShowModal(true);
    };

    const openEdit = (index) => {
        setEditingIndex(index);
        setSlugEdited(true); // keep existing slug when editing
        setCurrentField({ ...fields[index] });
        setShowModal(true);
    };

    const handleDelete = (index) => {
        if (confirm('Are you sure you want to delete this field?')) {
            const next = [...fields];
            next.splice(index, 1);
            onChange(next);
        }
    };

    const handleSave = () => {
        const next = [...fields];
        if (editingIndex !== null) {
            next[editingIndex] = currentField;
        } else {
            next.push(currentField);
        }
        onChange(next);
        setShowModal(false);
    };

    const handleNameChange = (e) => {
        const name = e.target.value;
        setCurrentField((prev) => ({
            ...prev,
            name,
            slug: slugEdited ? prev.slug : slugify(name),
        }));
    };

    const handleSlugChange = (e) => {
        setSlugEdited(true);
        setCurrentField((prev) => ({ ...prev, slug: e.target.value }));
    };

    // Pick an existing column from the fields list
    const handleExistingColumnPick = (e) => {
        const slug = e.target.value;
        if (!slug) return;
        const matched = fields.find((f) => f.slug === slug);
        setSlugEdited(true);
        setCurrentField((prev) => ({
            ...prev,
            slug,
            name: prev.name || (matched?.name ?? slug),
        }));
    };

    const set = (key, value) => setCurrentField((prev) => ({ ...prev, [key]: value }));

    const isRelation      = currentField.type === 'relationship';
    const isBelongsTo     = currentField.relation_type === 'belongsTo';
    const existingSlugs   = fields.map((f) => f.slug).filter(Boolean);
    const slugAlreadyInDB = editingIndex === null && existingSlugs.includes(currentField.slug);
    const apiKey          = apiKeyPreview(currentField);

    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Fields Management</h5>
                <Button variant="primary" size="sm" onClick={openAdd}>
                    <Icon icon="plus" className="me-1" />
                    Add Field
                </Button>
            </div>

            <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <Table className="table-centered table-nowrap mb-0" hover>
                    <thead className="table-light">
                        <tr>
                            <th style={{ width: '20px' }}></th>
                            <th>Name</th>
                            <th>Column</th>
                            <th>Type</th>
                            <th>Attributes</th>
                            <th>Visibility</th>
                            <th className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <ReactSortable list={fields} setList={onChange} tag="tbody" handle=".drag-handle" animation={150}>
                        {fields.map((field, index) => (
                            <tr key={index}>
                                <td className="align-middle">
                                    <Icon icon="grip-vertical" className="drag-handle fs-lg text-muted" style={{ cursor: 'grab' }} />
                                </td>
                                <td className="align-middle">
                                    <div className="fw-semibold">{field.name}</div>
                                    {field.relation_type === 'belongsTo' && field.related_entity_id && (
                                        <small className="text-muted">→ {field.slug}_relation</small>
                                    )}
                                </td>
                                <td className="align-middle">
                                    <code className="small text-secondary">{field.slug}</code>
                                </td>
                                <td className="align-middle">
                                    <Badge bg="info-subtle" className="text-info border border-info-subtle">
                                        {field.type}
                                    </Badge>
                                </td>
                                <td className="align-middle">
                                    <div className="d-flex gap-1 flex-wrap">
                                        {field.required && <Badge bg="danger-subtle" className="text-danger">Required</Badge>}
                                        {field.nullable && <Badge bg="secondary-subtle" className="text-secondary">Nullable</Badge>}
                                    </div>
                                </td>
                                <td className="align-middle">
                                    <div className="d-flex flex-column gap-1">
                                        <Form.Check type="switch" id={`list-vis-${index}`} label={<small>List</small>}
                                            checked={field.is_listing_visible}
                                            onChange={(e) => { const n = [...fields]; n[index].is_listing_visible = e.target.checked; onChange(n); }} />
                                        <Form.Check type="switch" id={`detail-vis-${index}`} label={<small>Detail</small>}
                                            checked={field.is_detail_visible}
                                            onChange={(e) => { const n = [...fields]; n[index].is_detail_visible = e.target.checked; onChange(n); }} />
                                    </div>
                                </td>
                                <td className="align-middle text-end">
                                    <div className="d-flex gap-1 justify-content-end">
                                        <Button variant="light" size="sm" className="btn-icon" onClick={() => openEdit(index)}>
                                            <Icon icon="edit" />
                                        </Button>
                                        <Button variant="light" size="sm" className="btn-icon text-danger" onClick={() => handleDelete(index)}>
                                            <Icon icon="trash" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </ReactSortable>
                    {fields.length === 0 && (
                        <tbody>
                            <tr>
                                <td colSpan="7" className="text-center py-4 text-muted">
                                    No fields added yet. Click "Add Field" to start.
                                </td>
                            </tr>
                        </tbody>
                    )}
                </Table>
            </div>

            {/* Add / Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{editingIndex !== null ? 'Edit Field' : 'Add Field'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row>
                        {/* ── Label ── */}
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Label <span className="text-danger">*</span></Form.Label>
                                <Form.Control value={currentField.name} onChange={handleNameChange} placeholder="e.g. Author" />
                            </Form.Group>
                        </Col>

                        {/* ── Column Name (slug) ── */}
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Column Name
                                    {slugAlreadyInDB && (
                                        <Badge bg="warning-subtle" className="text-warning ms-2 border border-warning-subtle">existing column</Badge>
                                    )}
                                </Form.Label>
                                <div className="d-flex gap-2">
                                    <Form.Control
                                        value={currentField.slug}
                                        onChange={handleSlugChange}
                                        placeholder="auto from label"
                                        className="font-monospace"
                                    />
                                    {/* Quick-pick from existing columns */}
                                    {existingSlugs.length > 0 && (
                                        <Form.Select style={{ maxWidth: 44 }} title="Pick existing column"
                                            value=""
                                            onChange={handleExistingColumnPick}
                                        >
                                            <option value="">↓</option>
                                            {existingSlugs.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </Form.Select>
                                    )}
                                </div>
                                <Form.Text className="text-muted">
                                    DB column name. If the column already exists it won't be recreated.
                                </Form.Text>
                            </Form.Group>
                        </Col>

                        {/* ── Type ── */}
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Type</Form.Label>
                                <Form.Select value={currentField.type}
                                    onChange={(e) => set('type', e.target.value)}>
                                    {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* ── Default Value (non-relation) ── */}
                        {!isRelation && (
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Default Value</Form.Label>
                                    <Form.Control value={currentField.default_value}
                                        onChange={(e) => set('default_value', e.target.value)}
                                        placeholder="Optional" />
                                </Form.Group>
                            </Col>
                        )}

                        {/* ── Relationship settings ── */}
                        {isRelation && (
                            <>
                                <Col md={12}>
                                    <hr className="my-1" />
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <h6 className="mb-0 text-muted">Relationship</h6>
                                        {apiKey && (
                                            <Badge bg="success-subtle" className="text-success border border-success-subtle font-monospace">
                                                API key: {apiKey}
                                            </Badge>
                                        )}
                                    </div>
                                </Col>

                                {/* Relation Type */}
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Relation Type</Form.Label>
                                        <Form.Select value={currentField.relation_type ?? 'belongsTo'}
                                            onChange={(e) => set('relation_type', e.target.value)}>
                                            <option value="belongsTo">belongsTo — this table has the value</option>
                                            <option value="hasMany">hasMany — related table points back (array)</option>
                                            <option value="hasOne">hasOne — related table points back (single)</option>
                                        </Form.Select>
                                        <Form.Text className="text-muted">
                                            {isBelongsTo
                                                ? 'This column holds the value used to match the related record.'
                                                : 'The related table has a column pointing back to this record\'s ID.'}
                                        </Form.Text>
                                    </Form.Group>
                                </Col>

                                {/* Related Entity */}
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Related Table</Form.Label>
                                        <Form.Select value={currentField.related_entity_id ?? ''}
                                            onChange={(e) => set('related_entity_id', e.target.value ? Number(e.target.value) : null)}>
                                            <option value="">— Select table —</option>
                                            {entities.map((ent) => (
                                                <option key={ent.id} value={ent.id}>{ent.name} ({ent.table_name})</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>

                                {/* Match / FK column */}
                                <Col md={12}>
                                    <Form.Group className="mb-3">
                                        {isBelongsTo ? (
                                            <>
                                                <Form.Label>
                                                    Match Column in Related Table
                                                    <Badge bg="secondary-subtle" className="text-secondary ms-2 border border-secondary-subtle">optional</Badge>
                                                </Form.Label>
                                                <Form.Control
                                                    value={currentField.relation_display_column ?? ''}
                                                    onChange={(e) => set('relation_display_column', e.target.value)}
                                                    placeholder="Leave blank to match by id"
                                                />
                                                <Form.Text className="text-muted">
                                                    Column in the related table to match against. Leave blank → matches by <code>id</code>. Example: set <code>name</code> so that <code>accounts.name = articles.author</code>.
                                                </Form.Text>
                                            </>
                                        ) : (
                                            <>
                                                <Form.Label>
                                                    Foreign Key Column in Related Table
                                                    <span className="text-danger ms-1">*</span>
                                                </Form.Label>
                                                <Form.Control
                                                    value={currentField.relation_display_column ?? ''}
                                                    onChange={(e) => set('relation_display_column', e.target.value)}
                                                    placeholder="e.g. recordNum, article_id"
                                                />
                                                <Form.Text className="text-muted">
                                                    Column in the related table that stores this record's ID (e.g. <code>recordNum</code> in uploads).
                                                </Form.Text>
                                            </>
                                        )}
                                    </Form.Group>
                                </Col>

                                {/* Chain hint box */}
                                <Col md={12}>
                                    <div className="alert alert-info py-2 px-3 mb-2" style={{ fontSize: '0.82rem' }}>
                                        <strong>Chained relations:</strong> To get nested data (e.g. author image from uploads), configure a <em>Section Relation</em> on the related entity (e.g. accounts → uploads hasMany, FK=recordNum). The system will automatically include that data inside <code>{apiKey ?? 'field_relation'}</code>.
                                    </div>
                                </Col>
                            </>
                        )}

                        {/* Required / Nullable */}
                        <Col md={6}>
                            <Form.Check type="checkbox" label="Required" className="mb-2"
                                checked={currentField.required}
                                onChange={(e) => set('required', e.target.checked)} />
                        </Col>
                        <Col md={6}>
                            <Form.Check type="checkbox" label="Nullable" className="mb-2"
                                checked={currentField.nullable}
                                onChange={(e) => set('nullable', e.target.checked)} />
                        </Col>
                    </Row>

                    <hr />
                    <h6>Visibility</h6>
                    <Row>
                        <Col md={6}>
                            <Form.Check type="switch" label="Show in Listing"
                                checked={currentField.is_listing_visible}
                                onChange={(e) => set('is_listing_visible', e.target.checked)} />
                        </Col>
                        <Col md={6}>
                            <Form.Check type="switch" label="Show in Details"
                                checked={currentField.is_detail_visible}
                                onChange={(e) => set('is_detail_visible', e.target.checked)} />
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave} disabled={!currentField.name || !currentField.slug}>
                        <Icon icon="check" className="me-1" />
                        {editingIndex !== null ? 'Update Field' : 'Add Field'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default SectionFields;
