import React, { useEffect, useState } from 'react';
import { Button, Card, CardHeader, Col, Form, Modal, Row, Table, Badge, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router';
import axios from 'axios';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';

const EntityDataList = () => {
  const { entityId } = useParams();
  const [entity, setEntity] = useState(null);
  const [rows, setRows] = useState([]);
  const [dataError, setDataError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [relationOptions, setRelationOptions] = useState({});

  const listVisibleFields = entity?.fields?.filter((f) => f.list_visible !== false) ?? [];
  const detailVisibleFields = entity?.fields?.filter((f) => f.detail_visible !== false) ?? [];
  const relationFields = entity?.fields?.filter((f) => f.type === 'relationship' && f.related_entity) ?? [];

  useEffect(() => {
    if (!entityId) return;
    const loadEntity = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/section-builder/entities/${entityId}`);
        setEntity(data);
        setSlug(data.slug || data.table_name);
      } catch (e) {
        console.error('Failed to load entity', e);
      } finally {
        setLoading(false);
      }
    };
    loadEntity();
  }, [entityId]);

  useEffect(() => {
    if (!slug) return;
    setDataError(null);
    const loadData = async () => {
      try {
        const { data } = await axios.get(`/api/entities/${slug}`, {
          params: { per_page: 100 },
        });
        setRows(data.data ?? []);
      } catch (e) {
        console.error('Failed to load data', e);
        setRows([]);
        const msg = e.response?.data?.message || e.message || 'Failed to load data';
        setDataError(msg);
      }
    };
    loadData();
  }, [slug]);

  // Load relation options for fields with type=relationship (related_entity from API)
  useEffect(() => {
    if (!relationFields.length) return;
    const load = async () => {
      for (const f of relationFields) {
        const slug = f.related_entity?.slug;
        if (!slug) continue;
        try {
          const { data } = await axios.get(`/api/entities/${slug}`, { params: { per_page: 500 } });
          setRelationOptions((prev) => ({ ...prev, [slug]: data.data ?? [] }));
        } catch (e) {
          setRelationOptions((prev) => ({ ...prev, [slug]: [] }));
        }
      }
    };
    load();
  }, [entity?.id]);

  const loadRelationOptions = async (relatedSlug) => {
    if (relationOptions[relatedSlug]) return;
    try {
      const { data } = await axios.get(`/api/entities/${relatedSlug}`, { params: { per_page: 500 } });
      setRelationOptions((prev) => ({ ...prev, [relatedSlug]: data.data ?? [] }));
    } catch (e) {
      setRelationOptions((prev) => ({ ...prev, [relatedSlug]: [] }));
    }
  };

  const openAdd = () => {
    const initial = {};
    detailVisibleFields.forEach((f) => {
      initial[f.column_name] = f.default_value ?? (f.type === 'boolean' ? false : '');
    });
    setFormData(initial);
    setEditingRecord(null);
    relationFields.forEach((f) => {
      if (f.related_entity?.slug) loadRelationOptions(f.related_entity.slug);
    });
    setShowForm(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    const initial = {};
    detailVisibleFields.forEach((f) => {
      initial[f.column_name] = record[f.column_name] ?? '';
    });
    setFormData(initial);
    relationFields.forEach((f) => {
      if (f.related_entity?.slug) loadRelationOptions(f.related_entity.slug);
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingRecord) {
        await axios.patch(`/api/entities/${slug}/${editingRecord.id}`, formData);
      } else {
        await axios.post(`/api/entities/${slug}`, formData);
      }
      setShowForm(false);
      const { data } = await axios.get(`/api/entities/${slug}`, { params: { per_page: 100 } });
      setRows(data.data ?? []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    if (!confirm('Delete this record?')) return;
    try {
      await axios.delete(`/api/entities/${slug}/${record.id}`);
      setRows((prev) => prev.filter((r) => r.id !== record.id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const getRelationField = (columnName) =>
    relationFields.find((f) => f.column_name === columnName);

  const getRelationLabel = (option, field) => {
    const col = field?.relation_display_column;
    if (col && option[col] != null) return String(option[col]);
    return option.name ?? option.title ?? option.id;
  };

  if (loading || !entity) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2 text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <PageBreadcrumb
        title={entity.name}
        subtitle="Table data"
      />

      <Row>
        <Col>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <Link to="/apps/sections" className="btn btn-soft-secondary btn-sm me-2">
                  <Icon icon="arrow-left" className="me-1" />
                  Back to Sections
                </Link>
                <Link to={`/apps/sections/${entityId}/edit`} className="btn btn-soft-primary btn-sm me-2">
                  <Icon icon="edit" className="me-1" />
                  Edit structure
                </Link>
              </div>
              <Button variant="primary" size="sm" onClick={openAdd}>
                <Icon icon="plus" className="me-1" />
                Add record
              </Button>
            </CardHeader>
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    {listVisibleFields.map((f) => (
                      <th key={f.id}>{f.label || f.column_name}</th>
                    ))}
                    <th style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dataError && (
                    <tr>
                      <td colSpan={listVisibleFields.length + 1} className="text-center py-4">
                        <div className="text-danger small">{dataError}</div>
                        <div className="text-muted small mt-1">Create the table in Section Builder or run migrations, then try again.</div>
                      </td>
                    </tr>
                  )}
                  {!dataError && rows.length === 0 && (
                    <tr>
                      <td colSpan={listVisibleFields.length + 1} className="text-center text-muted py-4">
                        No records. Click &quot;Add record&quot; to create one.
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row.id} onClick={() => openEdit(row)} style={{ cursor: 'pointer' }}>
                      {listVisibleFields.map((f) => {
                        const relField = getRelationField(f.column_name);
                        const val = row[f.column_name];
                        let display = val;
                        if (relField && relationOptions[relField.related_entity?.slug]) {
                          const opt = relationOptions[relField.related_entity.slug].find(
                            (o) => String(o.id) === String(val)
                          );
                          display = opt ? getRelationLabel(opt, relField) : val;
                        }
                        if (f.type === 'boolean') display = val ? 'Yes' : 'No';
                        return (
                          <td key={f.id}>
                            {display != null && display !== '' ? String(display) : '—'}
                          </td>
                        );
                      })}
                      <td onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="soft-danger"
                          size="sm"
                          className="me-1"
                          onClick={() => handleDelete(row)}
                        >
                          <Icon icon="trash" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>
        </Col>
      </Row>

      <Modal show={showForm} onHide={() => setShowForm(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingRecord ? 'Edit' : 'Add'} record</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {detailVisibleFields.map((f) => {
              const relField = getRelationField(f.column_name);
              const options = relField?.related_entity?.slug ? relationOptions[relField.related_entity.slug] : null;

              if (relField) {
                return (
                  <Form.Group key={f.id} className="mb-3">
                    <Form.Label>{f.label || f.column_name}</Form.Label>
                    <Form.Select
                      value={formData[f.column_name] ?? ''}
                      onChange={(e) => setFormData({ ...formData, [f.column_name]: e.target.value || null })}
                    >
                      <option value="">— Select —</option>
                      {(options || []).map((o) => (
                        <option key={o.id} value={o.id}>
                          {getRelationLabel(o, relField)}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                );
              }

              if (f.type === 'boolean') {
                return (
                  <Form.Group key={f.id} className="mb-3">
                    <Form.Check
                      type="switch"
                      id={`f-${f.column_name}`}
                      label={f.label || f.column_name}
                      checked={!!formData[f.column_name]}
                      onChange={(e) =>
                        setFormData({ ...formData, [f.column_name]: e.target.checked })
                      }
                    />
                  </Form.Group>
                );
              }

              if (f.type === 'text') {
                return (
                  <Form.Group key={f.id} className="mb-3">
                    <Form.Label>{f.label || f.column_name}</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={formData[f.column_name] ?? ''}
                      onChange={(e) =>
                        setFormData({ ...formData, [f.column_name]: e.target.value })
                      }
                    />
                  </Form.Group>
                );
              }

              return (
                <Form.Group key={f.id} className="mb-3">
                  <Form.Label>{f.label || f.column_name}</Form.Label>
                  <Form.Control
                    type={f.type === 'integer' ? 'number' : f.type === 'date' || f.type === 'datetime' ? 'datetime-local' : 'text'}
                    value={formData[f.column_name] ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, [f.column_name]: e.target.value })
                    }
                  />
                </Form.Group>
              );
            })}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingRecord ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default EntityDataList;
