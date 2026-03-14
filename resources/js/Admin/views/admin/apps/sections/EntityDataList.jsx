import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, CardHeader, Col, Form, Modal, Row, Table, Badge, Spinner, FormControl } from 'react-bootstrap';
import { Link, useParams } from 'react-router';
import axios from 'axios';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';

const EntityDataList = () => {
  const { entityId } = useParams();
  const [entity, setEntity] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(null); // column name
  const [direction, setDirection] = useState('asc');
  const [columnFilters, setColumnFilters] = useState({});
  const [dataError, setDataError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [relationOptions, setRelationOptions] = useState({});
  const [fileInputMode, setFileInputMode] = useState({}); // { [columnName]: 'upload' | 'url' }
  const [uploadingField, setUploadingField] = useState(null);
  const fileInputRefs = useRef({});
  const [toast, setToast] = useState(null); // { type: 'success'|'danger', msg: string }
  const toastTimer = useRef(null);

  const showToast = (msg, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

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
  }, [slug]);

  const fetchData = async (page = 1, extra = {}) => {
    if (!slug) return;
    try {
      setDataError(null);
      const params = {
        page,
        per_page: pagination.perPage,
        search: search || undefined,
        sort: sort || undefined,
        direction: direction || undefined,
        ...extra,
      };

      // Attach column filters as ?filters[column]=value
      if (Object.keys(columnFilters).length) {
        Object.entries(columnFilters).forEach(([key, value]) => {
          if (value !== '' && value != null) {
            params[`filters[${key}]`] = value;
          }
        });
      }

      const { data } = await axios.get(`/api/entities/${slug}`, { params });

      setRows(data.data ?? []);
      setPagination({
        page: data.current_page ?? page,
        perPage: data.per_page ?? pagination.perPage,
        total: data.total ?? (data.data ? data.data.length : 0),
        lastPage: data.last_page ?? 1,
      });
    } catch (e) {
      console.error('Failed to load data', e);
      setRows([]);
      const msg = e.response?.data?.message || e.message || 'Failed to load data';
      setDataError(msg);
    }
  };

  // Initial data load and whenever slug / search / sort / filters change
  useEffect(() => {
    if (!slug) return;
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, search, sort, direction, JSON.stringify(columnFilters)]);

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

  const getFileMode = (columnName) => fileInputMode[columnName] ?? 'upload';
  const setFileMode = (columnName, mode) =>
    setFileInputMode((prev) => ({ ...prev, [columnName]: mode }));

  const handleFileUpload = async (columnName, file) => {
    if (!file) return;
    setUploadingField(columnName);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'sections');
      const { data } = await axios.post('/api/ecommerce/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFormData((prev) => ({ ...prev, [columnName]: data.url }));
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingField(null);
    }
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
      const wasEditing = !!editingRecord;
      setShowForm(false);
      showToast(wasEditing ? 'Record updated successfully.' : 'Record created successfully.');
      fetchData(wasEditing ? pagination.page : 1);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to save', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    if (!confirm('Delete this record?')) return;
    try {
      await axios.delete(`/api/entities/${slug}/${record.id}`);
      showToast('Record deleted successfully.');
      fetchData(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', 'danger');
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
      {toast && (
        <Alert
          variant={toast.type}
          className="position-fixed top-0 end-0 m-3 shadow"
          style={{ zIndex: 9999, minWidth: 280 }}
          dismissible
          onClose={() => setToast(null)}
        >
          <Icon icon={toast.type === 'success' ? 'circle-check' : 'alert-circle'} className="me-2" />
          {toast.msg}
        </Alert>
      )}

      <PageBreadcrumb
        title={entity.name}
        subtitle="Table data"
      />

      <Row>
        <Col>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex align-items-center flex-wrap gap-2">
                <Link to="/apps/sections" className="btn btn-soft-secondary btn-sm me-2">
                  <Icon icon="arrow-left" className="me-1" />
                  Back to Sections
                </Link>
                <Link to={`/apps/sections/${entityId}/edit`} className="btn btn-soft-primary btn-sm me-2">
                  <Icon icon="edit" className="me-1" />
                  Edit structure
                </Link>
                <span className="badge bg-secondary-subtle text-secondary">
                  Total records: {pagination.total.toLocaleString()}
                </span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div className="app-search">
                  <FormControl
                    type="search"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                    }}
                  />
                  <Icon icon="search" className="app-search-icon text-muted" />
                </div>
                <Button variant="primary" size="sm" onClick={openAdd}>
                  <Icon icon="plus" className="me-1" />
                  Add record
                </Button>
              </div>
            </CardHeader>
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    {listVisibleFields.map((f) => {
                      const isSorted = sort === f.column_name;
                      const icon =
                        !isSorted ? 'arrows-sort' : direction === 'asc' ? 'sort-ascending' : 'sort-descending';
                      return (
                        <th
                          key={f.id}
                          role="button"
                          onClick={() => {
                            if (!isSorted) {
                              setSort(f.column_name);
                              setDirection('asc');
                            } else {
                              setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                            }
                          }}
                        >
                          <span className="d-inline-flex align-items-center gap-1">
                            {f.label || f.column_name}
                            <Icon icon={icon} className="fs-xs" />
                          </span>
                        </th>
                      );
                    })}
                    <th style={{ width: '120px' }}>Actions</th>
                  </tr>
                  {/* Column filter inputs */}
                  <tr>
                    {listVisibleFields.map((f) => (
                      <th key={f.id}>
                        <FormControl
                          size="sm"
                          placeholder="Filter..."
                          value={columnFilters[f.column_name] ?? ''}
                          onChange={(e) =>
                            setColumnFilters((prev) => ({
                              ...prev,
                              [f.column_name]: e.target.value,
                            }))
                          }
                        />
                      </th>
                    ))}
                    <th />
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
                        const isFileField = f.type === 'file';
                        const isImageUrl = isFileField && val && /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(val);
                        return (
                          <td key={f.id}>
                            {isImageUrl ? (
                              <img
                                src={val}
                                alt=""
                                style={{ height: 36, width: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #dee2e6' }}
                              />
                            ) : isFileField && val ? (
                              <a href={val} target="_blank" rel="noreferrer" className="text-truncate d-inline-block" style={{ maxWidth: 140 }} onClick={(e) => e.stopPropagation()}>
                                <Icon icon="file" className="me-1" />
                                {val.split('/').pop()}
                              </a>
                            ) : display != null && display !== '' ? String(display) : '—'}
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
            {/* Simple pagination controls */}
            <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top text-muted small">
              <div>
                Showing{' '}
                {rows.length === 0
                  ? 0
                  : (pagination.page - 1) * pagination.perPage + 1}{' '}
                –
                {Math.min(pagination.page * pagination.perPage, pagination.total)} of{' '}
                {pagination.total.toLocaleString()}
              </div>
              <div className="d-flex align-items-center gap-2">
                <Form.Select
                  size="sm"
                  value={pagination.perPage}
                  onChange={(e) => {
                    const perPage = Number(e.target.value) || 15;
                    setPagination((prev) => ({ ...prev, perPage, page: 1 }));
                    fetchData(1, { per_page: perPage });
                  }}
                >
                  {[10, 15, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </Form.Select>
                <Button
                  variant="light"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchData(pagination.page - 1)}
                >
                  <Icon icon="chevron-left" />
                </Button>
                <span>
                  Page {pagination.page} / {pagination.lastPage}
                </span>
                <Button
                  variant="light"
                  size="sm"
                  disabled={pagination.page >= pagination.lastPage}
                  onClick={() => fetchData(pagination.page + 1)}
                >
                  <Icon icon="chevron-right" />
                </Button>
              </div>
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

              if (f.type === 'file') {
                const mode = getFileMode(f.column_name);
                const currentVal = formData[f.column_name] ?? '';
                const isImage = currentVal && /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(currentVal);
                return (
                  <Form.Group key={f.id} className="mb-3">
                    <Form.Label className="d-flex align-items-center gap-2">
                      {f.label || f.column_name}
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className={`btn btn-sm ${mode === 'upload' ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => setFileMode(f.column_name, 'upload')}
                        >
                          <Icon icon="upload" className="me-1" />
                          Upload
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${mode === 'url' ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => setFileMode(f.column_name, 'url')}
                        >
                          <Icon icon="link" className="me-1" />
                          URL
                        </button>
                      </div>
                    </Form.Label>

                    {mode === 'upload' ? (
                      <div
                        className="border rounded p-3 text-center"
                        style={{ cursor: 'pointer', background: '#f8f9fa' }}
                        onClick={() => fileInputRefs.current[f.column_name]?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleFileUpload(f.column_name, file);
                        }}
                      >
                        <input
                          type="file"
                          style={{ display: 'none' }}
                          ref={(el) => { fileInputRefs.current[f.column_name] = el; }}
                          onChange={(e) => handleFileUpload(f.column_name, e.target.files?.[0])}
                        />
                        {uploadingField === f.column_name ? (
                          <Spinner size="sm" />
                        ) : currentVal ? (
                          <div className="d-flex flex-column align-items-center gap-2">
                            {isImage && (
                              <img
                                src={currentVal}
                                alt="preview"
                                style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }}
                              />
                            )}
                            <small className="text-muted text-truncate" style={{ maxWidth: 300 }}>{currentVal}</small>
                            <small className="text-primary">Click or drag to replace</small>
                          </div>
                        ) : (
                          <div className="text-muted">
                            <Icon icon="upload" className="me-1" />
                            Click or drag & drop to upload
                          </div>
                        )}
                      </div>
                    ) : (
                      <Form.Control
                        type="text"
                        placeholder="https://..."
                        value={currentVal}
                        onChange={(e) => setFormData({ ...formData, [f.column_name]: e.target.value })}
                      />
                    )}

                    {mode === 'url' && currentVal && isImage && (
                      <div className="mt-2">
                        <img
                          src={currentVal}
                          alt="preview"
                          style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain', borderRadius: 4 }}
                        />
                      </div>
                    )}
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
