import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { Badge, Button, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';

const RELATION_TYPES = [
    { value: 'hasMany',        label: 'hasMany — related table points back (array)' },
    { value: 'hasOne',         label: 'hasOne — related table points back (single)' },
    { value: 'belongsTo',      label: 'belongsTo — this table has the FK' },
    { value: 'belongsToMany',  label: 'belongsToMany — pivot table' },
];

const RELATION_COLORS = {
    hasMany:       'primary',
    hasOne:        'info',
    belongsTo:     'success',
    belongsToMany: 'warning',
};

const EMPTY = {
    child_entity_id: '',
    relation_type:   'hasMany',
    foreign_key:     '',
    local_key:       '',
    pivot_table:     '',
    mcp_traversable: false,
};

const SectionRelations = ({ entityId, entities = [] }) => {
    const [relations, setRelations]   = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState(null);
    const [showModal, setShowModal]   = useState(false);
    const [saving, setSaving]         = useState(false);
    const [saveError, setSaveError]   = useState(null);
    const [editingId, setEditingId]   = useState(null);
    const [form, setForm]             = useState(EMPTY);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get(`/api/section-builder/entities/${entityId}/relations`);
            setRelations(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('SectionRelations load error:', err);
            setError(err?.response?.data?.message || err.message || 'Failed to load relations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (entityId) load(); }, [entityId]);

    const openAdd = () => {
        setEditingId(null);
        setForm({ ...EMPTY });
        setShowModal(true);
    };

    const openEdit = (rel) => {
        setEditingId(rel.id);
        setForm({
            child_entity_id: rel.child_entity_id ?? '',
            relation_type:   rel.relation_type   ?? 'hasMany',
            foreign_key:     rel.foreign_key     ?? '',
            local_key:       rel.local_key       ?? '',
            pivot_table:     rel.pivot_table      ?? '',
            mcp_traversable: !!rel.mcp_traversable,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        try {
            const payload = {
                ...form,
                child_entity_id: form.child_entity_id ? Number(form.child_entity_id) : null,
                foreign_key:     form.foreign_key  || null,
                local_key:       form.local_key    || null,
                pivot_table:     form.pivot_table  || null,
            };

            if (editingId) {
                await axios.patch(`/api/section-builder/entities/${entityId}/relations/${editingId}`, payload);
            } else {
                await axios.post(`/api/section-builder/entities/${entityId}/relations`, payload);
            }

            setShowModal(false);
            await load();
        } catch (err) {
            console.error('SectionRelations save error:', err);
            setSaveError(err?.response?.data?.message || err.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this relation?')) return;
        try {
            await axios.delete(`/api/section-builder/entities/${entityId}/relations/${id}`);
            setRelations((prev) => prev.filter((r) => r.id !== id));
        } catch (err) {
            console.error('SectionRelations delete error:', err);
            alert(err?.response?.data?.message || 'Delete failed');
        }
    };

    const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

    const childEntity = entities.find((e) => e.id === Number(form.child_entity_id));
    const isPivot     = form.relation_type === 'belongsToMany';

    // Hint: what key will appear in single-record API response
    const apiKeyHint = () => {
        if (!childEntity) return null;
        if (form.relation_type === 'hasMany')       return childEntity.table_name;
        if (form.relation_type === 'hasOne')        return childEntity.table_name.replace(/s$/, '');
        if (form.relation_type === 'belongsTo')     return `${childEntity.table_name}_relation`;
        if (form.relation_type === 'belongsToMany') return childEntity.table_name;
        return null;
    };

    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h5 className="mb-0">Section Relations</h5>
                    <small className="text-muted">hasMany/hasOne appear in single-record API. Use Field-based relations for list API.</small>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="light" size="sm" onClick={load} disabled={loading} title="Refresh">
                        <Icon icon="refresh" />
                    </Button>
                    <Button variant="primary" size="sm" onClick={openAdd}>
                        <Icon icon="plus" className="me-1" /> Add Relation
                    </Button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger py-2 px-3 mb-3">
                    <strong>Error:</strong> {error}
                    <Button variant="link" size="sm" className="p-0 ms-2" onClick={load}>Retry</Button>
                </div>
            )}

            {loading ? (
                <div className="text-center py-4"><Spinner size="sm" /></div>
            ) : relations.length === 0 && !error ? (
                <div className="text-center py-4 text-muted">No relations yet. Click "Add Relation" to start.</div>
            ) : (
                <Table className="table-centered table-nowrap mb-0" hover>
                    <thead className="table-light">
                        <tr>
                            <th>Type</th>
                            <th>Related Table</th>
                            <th>Foreign Key</th>
                            <th>Local Key</th>
                            <th>MCP</th>
                            <th className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {relations.map((rel) => (
                            <tr key={rel.id}>
                                <td>
                                    <Badge bg={`${RELATION_COLORS[rel.relation_type] ?? 'secondary'}-subtle`}
                                        className={`text-${RELATION_COLORS[rel.relation_type] ?? 'secondary'} border border-${RELATION_COLORS[rel.relation_type] ?? 'secondary'}-subtle`}>
                                        {rel.relation_type}
                                    </Badge>
                                </td>
                                <td>
                                    <span className="fw-semibold">{rel.child_entity?.name}</span>
                                    <code className="text-muted ms-1 small">({rel.child_entity?.table_name})</code>
                                </td>
                                <td><code className="small">{rel.foreign_key || <span className="text-muted">auto</span>}</code></td>
                                <td><code className="small">{rel.local_key || <span className="text-muted">id</span>}</code></td>
                                <td>
                                    {rel.mcp_traversable
                                        ? <Badge bg="success-subtle" className="text-success border border-success-subtle">on</Badge>
                                        : <span className="text-muted">—</span>}
                                </td>
                                <td className="text-end">
                                    <div className="d-flex gap-1 justify-content-end">
                                        <Button variant="light" size="sm" className="btn-icon" onClick={() => openEdit(rel)}>
                                            <Icon icon="edit" />
                                        </Button>
                                        <Button variant="light" size="sm" className="btn-icon text-danger" onClick={() => handleDelete(rel.id)}>
                                            <Icon icon="trash" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            {/* Add / Edit Modal */}
            <Modal show={showModal} onHide={() => { setShowModal(false); setSaveError(null); }} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{editingId ? 'Edit Relation' : 'Add Relation'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {saveError && (
                        <div className="alert alert-danger py-2 px-3 mb-3">
                            <strong>Error:</strong> {saveError}
                        </div>
                    )}
                    <Row>
                        {/* Relation Type */}
                        <Col md={12}>
                            <Form.Group className="mb-3">
                                <Form.Label>Relation Type</Form.Label>
                                <Form.Select value={form.relation_type} onChange={(e) => set('relation_type', e.target.value)}>
                                    {RELATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Related Entity */}
                        <Col md={12}>
                            <Form.Group className="mb-3">
                                <Form.Label>Related Table <span className="text-danger">*</span></Form.Label>
                                <Form.Select value={form.child_entity_id}
                                    onChange={(e) => set('child_entity_id', e.target.value)}>
                                    <option value="">— Select table —</option>
                                    {entities.map((ent) => (
                                        <option key={ent.id} value={ent.id}>{ent.name} ({ent.table_name})</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* API key preview */}
                        {apiKeyHint() && (
                            <Col md={12}>
                                <div className="alert alert-success py-2 px-3 mb-3" style={{ fontSize: '0.82rem' }}>
                                    <strong>API key in single record:</strong> <code>{apiKeyHint()}</code>
                                    <span className="text-muted ms-2">(only in GET /entity/id)</span>
                                </div>
                            </Col>
                        )}

                        {/* Foreign Key */}
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Foreign Key
                                    <Badge bg="secondary-subtle" className="text-secondary ms-1 border border-secondary-subtle">optional</Badge>
                                </Form.Label>
                                <Form.Control value={form.foreign_key}
                                    onChange={(e) => set('foreign_key', e.target.value)}
                                    placeholder={isPivot ? 'e.g. entity_id' : 'e.g. recordNum, article_id'} />
                                <Form.Text className="text-muted">
                                    {isPivot ? 'FK in pivot table pointing to this entity.' : 'Column in related table pointing back. Blank = auto (e.g. article_id).'}
                                </Form.Text>
                            </Form.Group>
                        </Col>

                        {/* Local Key */}
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Local Key
                                    <Badge bg="secondary-subtle" className="text-secondary ms-1 border border-secondary-subtle">optional</Badge>
                                </Form.Label>
                                <Form.Control value={form.local_key}
                                    onChange={(e) => set('local_key', e.target.value)}
                                    placeholder="id" />
                                <Form.Text className="text-muted">Column on this table to match. Blank = id.</Form.Text>
                            </Form.Group>
                        </Col>

                        {/* Pivot table (belongsToMany only) */}
                        {isPivot && (
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Pivot Table</Form.Label>
                                    <Form.Control value={form.pivot_table}
                                        onChange={(e) => set('pivot_table', e.target.value)}
                                        placeholder="e.g. article_tag" />
                                </Form.Group>
                            </Col>
                        )}

                        {/* MCP */}
                        <Col md={12}>
                            <Form.Check type="switch" label="MCP Traversable"
                                checked={form.mcp_traversable}
                                onChange={(e) => set('mcp_traversable', e.target.checked)} />
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}
                        disabled={saving || !form.child_entity_id}>
                        {saving ? <Spinner size="sm" className="me-1" /> : <Icon icon="check" className="me-1" />}
                        {editingId ? 'Update' : 'Add'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default SectionRelations;
