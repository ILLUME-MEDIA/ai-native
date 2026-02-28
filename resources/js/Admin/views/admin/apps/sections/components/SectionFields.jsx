import Icon from '@admin/components/wrappers/Icon';
import { slugify } from '@admin/utils/stringUtils';
import { useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
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

const SectionFields = ({ fields, onChange, entities = [] }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [currentField, setCurrentField] = useState({
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
    });

    const handleAddField = () => {
        setEditingIndex(null);
        setCurrentField({
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
        });
        setShowModal(true);
    };

    const handleEditField = (index) => {
        setEditingIndex(index);
        setCurrentField({ ...fields[index] });
        setShowModal(true);
    };

    const handleDeleteField = (index) => {
        if (confirm('Are you sure you want to delete this field?')) {
            const newFields = [...fields];
            newFields.splice(index, 1);
            onChange(newFields);
        }
    };

    const handleSaveField = () => {
        const newFields = [...fields];
        if (editingIndex !== null) {
            newFields[editingIndex] = currentField;
        } else {
            newFields.push(currentField);
        }
        onChange(newFields);
        setShowModal(false);
    };

    const handleNameChange = (e) => {
        const name = e.target.value;
        setCurrentField((prev) => ({
            ...prev,
            name,
            slug: slugify(name), // Always sync slug with name for fields
        }));
    };

    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Fields Management</h5>
                <Button variant="primary" size="sm" onClick={handleAddField}>
                    <Icon icon="plus" className="me-1" />
                    Add Field
                </Button>
            </div>

            <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <Table className="table-centered table-nowrap mb-0" hover>
                    <thead className="table-light">
                        <tr>
                            <th scope="col" style={{ width: '20px' }}></th>
                            <th scope="col">Name</th>
                            <th scope="col">Type</th>
                            <th scope="col">Attributes</th>
                            <th scope="col">Default</th>
                            <th scope="col">Visibility</th>
                            <th scope="col" className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <ReactSortable
                        list={fields}
                        setList={onChange}
                        tag="tbody"
                        handle=".drag-handle"
                        animation={150}
                    >
                        {fields.map((field, index) => (
                            <tr key={index}>
                                <td className="align-middle">
                                    <Icon icon="grip-vertical" className="drag-handle fs-lg text-muted cursor-move" style={{ cursor: 'grab' }} />
                                </td>
                                <td className="align-middle">
                                    <div className="fw-semibold">{field.name}</div>
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
                                    <small className="text-muted">{field.default_value || '-'}</small>
                                </td>
                                <td className="align-middle">
                                    <div className="d-flex flex-column gap-1">
                                        <Form.Check
                                            type="switch"
                                            id={`list-vis-${index}`}
                                            label={<small>List</small>}
                                            checked={field.is_listing_visible}
                                            onChange={(e) => {
                                                const newFields = [...fields];
                                                newFields[index].is_listing_visible = e.target.checked;
                                                onChange(newFields);
                                            }}
                                        />
                                        <Form.Check
                                            type="switch"
                                            id={`detail-vis-${index}`}
                                            label={<small>Detail</small>}
                                            checked={field.is_detail_visible}
                                            onChange={(e) => {
                                                const newFields = [...fields];
                                                newFields[index].is_detail_visible = e.target.checked;
                                                onChange(newFields);
                                            }}
                                        />
                                    </div>
                                </td>
                                <td className="align-middle text-end">
                                    <div className="d-flex gap-1 justify-content-end">
                                        <Button variant="light" size="sm" className="btn-icon" onClick={() => handleEditField(index)}>
                                            <Icon icon="edit" />
                                        </Button>
                                        <Button variant="light" size="sm" className="btn-icon text-danger" onClick={() => handleDeleteField(index)}>
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
                                <td colSpan="6" className="text-center py-4 text-muted">
                                    No fields added yet. Click "Add Field" to start.
                                </td>
                            </tr>
                        </tbody>
                    )}
                </Table>
            </div>

            {/* Add/Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{editingIndex !== null ? 'Edit Field' : 'Add New Field'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row>
                        <Col md={12}>
                            <Form.Group className="mb-3">
                                <Form.Label>Name <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    value={currentField.name}
                                    onChange={handleNameChange}
                                    placeholder="e.g. Title"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Type</Form.Label>
                                <Form.Select
                                    value={currentField.type}
                                    onChange={(e) => setCurrentField({ ...currentField, type: e.target.value })}
                                >
                                    {FIELD_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Default Value</Form.Label>
                                <Form.Control
                                    value={currentField.default_value}
                                    onChange={(e) => setCurrentField({ ...currentField, default_value: e.target.value })}
                                    placeholder="Optional"
                                    disabled={currentField.type === 'relationship'}
                                />
                            </Form.Group>
                        </Col>
                        {currentField.type === 'relationship' && (
                            <>
                                <Col md={12}>
                                    <hr className="my-2" />
                                    <h6 className="text-muted">Relationship settings</h6>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Relation Type</Form.Label>
                                        <Form.Select
                                            value={currentField.relation_type ?? 'belongsTo'}
                                            onChange={(e) => setCurrentField({
                                                ...currentField,
                                                relation_type: e.target.value,
                                            })}
                                        >
                                            <option value="belongsTo">belongsTo — FK is on this table</option>
                                            <option value="hasMany">hasMany — FK is on related table</option>
                                            <option value="hasOne">hasOne — FK is on related table (single)</option>
                                        </Form.Select>
                                        <Form.Text className="text-muted">
                                            belongsTo: this table stores the FK (e.g. category_id). hasMany/hasOne: related table stores the FK pointing back.
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Related table (entity)</Form.Label>
                                        <Form.Select
                                            value={currentField.related_entity_id ?? ''}
                                            onChange={(e) => setCurrentField({
                                                ...currentField,
                                                related_entity_id: e.target.value ? Number(e.target.value) : null,
                                            })}
                                        >
                                            <option value="">— Select table —</option>
                                            {entities.map((ent) => (
                                                <option key={ent.id} value={ent.id}>
                                                    {ent.name} ({ent.table_name})
                                                </option>
                                            ))}
                                        </Form.Select>
                                        <Form.Text className="text-muted">
                                            The table this field links to.
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        {['hasMany', 'hasOne'].includes(currentField.relation_type) ? (
                                            <>
                                                <Form.Label>Foreign Key Column <span className="text-danger">*</span></Form.Label>
                                                <Form.Control
                                                    value={currentField.relation_display_column ?? ''}
                                                    onChange={(e) => setCurrentField({
                                                        ...currentField,
                                                        relation_display_column: e.target.value,
                                                    })}
                                                    placeholder="e.g. recordNum, user_id"
                                                />
                                                <Form.Text className="text-muted">
                                                    Column in the related table that stores this record's ID.
                                                </Form.Text>
                                            </>
                                        ) : (
                                            <>
                                                <Form.Label>Display Column</Form.Label>
                                                <Form.Control
                                                    value={currentField.relation_display_column ?? ''}
                                                    onChange={(e) => setCurrentField({
                                                        ...currentField,
                                                        relation_display_column: e.target.value,
                                                    })}
                                                    placeholder="e.g. name, title"
                                                />
                                                <Form.Text className="text-muted">
                                                    Column from related table to show in dropdown.
                                                </Form.Text>
                                            </>
                                        )}
                                    </Form.Group>
                                </Col>
                            </>
                        )}
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Check
                                    type="checkbox"
                                    label="Required"
                                    checked={currentField.required}
                                    onChange={(e) => setCurrentField({ ...currentField, required: e.target.checked })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Check
                                    type="checkbox"
                                    label="Nullable"
                                    checked={currentField.nullable}
                                    onChange={(e) => setCurrentField({ ...currentField, nullable: e.target.checked })}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <hr />
                    <h6>Visibility</h6>
                    <Row>
                        <Col md={6}>
                            <Form.Check
                                type="switch"
                                label="Show in Listing"
                                checked={currentField.is_listing_visible}
                                onChange={(e) => setCurrentField({ ...currentField, is_listing_visible: e.target.checked })}
                            />
                        </Col>
                        <Col md={6}>
                            <Form.Check
                                type="switch"
                                label="Show in Details"
                                checked={currentField.is_detail_visible}
                                onChange={(e) => setCurrentField({ ...currentField, is_detail_visible: e.target.checked })}
                            />
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSaveField} disabled={!currentField.name}>
                        <Icon icon="check" className="me-1" />
                        {editingIndex !== null ? 'Update Field' : 'Add Field'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default SectionFields;
