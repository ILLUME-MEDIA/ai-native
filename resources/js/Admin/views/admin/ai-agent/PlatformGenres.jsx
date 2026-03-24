import React, { useState, useEffect } from 'react';
import {
    Row, Col, Card, Button, Modal, Form, Badge, Spinner, InputGroup,
} from 'react-bootstrap';
import { useNavigate } from 'react-router';
import axios from 'axios';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';

const PlatformGenres = () => {
    const navigate = useNavigate();
    const [platforms, setPlatforms] = useState([]);
    const [loading, setLoading] = useState(true);

    // Selected platform (for genre panel)
    const [activePlatform, setActivePlatform] = useState(null);

    // Add/Edit Platform modal
    const [showPlatformModal, setShowPlatformModal] = useState(false);
    const [editingPlatform, setEditingPlatform] = useState(null); // null = add
    const [platformName, setPlatformName] = useState('');
    const [platformSaving, setPlatformSaving] = useState(false);

    // Delete Platform confirm
    const [deletingId, setDeletingId] = useState(null);

    // Add Genre
    const [newGenre, setNewGenre] = useState('');
    const [addingGenre, setAddingGenre] = useState(false);

    // Bulk add genres textarea
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [bulkSaving, setBulkSaving] = useState(false);

    // Genre search filter
    const [genreSearch, setGenreSearch] = useState('');

    useEffect(() => {
        loadPlatforms();
    }, []);

    const loadPlatforms = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/platform-genres');
            setPlatforms(res.data);
            if (res.data.length > 0 && !activePlatform) {
                setActivePlatform(res.data[0]);
            } else if (activePlatform) {
                // refresh active platform from fresh data
                const fresh = res.data.find(p => p.id === activePlatform.id);
                setActivePlatform(fresh || res.data[0] || null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    /* ── Platform CRUD ── */
    const openAddPlatform = () => {
        setEditingPlatform(null);
        setPlatformName('');
        setShowPlatformModal(true);
    };

    const openEditPlatform = (p) => {
        setEditingPlatform(p);
        setPlatformName(p.platform_name);
        setShowPlatformModal(true);
    };

    const savePlatform = async () => {
        if (!platformName.trim()) return;
        setPlatformSaving(true);
        try {
            if (editingPlatform) {
                await axios.put(`/api/admin/platform-genres/${editingPlatform.id}`, {
                    platform_name: platformName.trim(),
                });
            } else {
                await axios.post('/api/admin/platform-genres', {
                    platform_name: platformName.trim(),
                    genres: [],
                });
            }
            setShowPlatformModal(false);
            await loadPlatforms();
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to save platform');
        } finally {
            setPlatformSaving(false);
        }
    };

    const deletePlatform = async (id) => {
        if (!window.confirm('Delete this platform and all its genres?')) return;
        setDeletingId(id);
        try {
            await axios.delete(`/api/admin/platform-genres/${id}`);
            if (activePlatform?.id === id) setActivePlatform(null);
            await loadPlatforms();
        } catch (e) {
            alert('Failed to delete');
        } finally {
            setDeletingId(null);
        }
    };

    /* ── Genre CRUD ── */
    const addGenre = async () => {
        if (!newGenre.trim() || !activePlatform) return;
        setAddingGenre(true);
        try {
            const res = await axios.post(`/api/admin/platform-genres/${activePlatform.id}/genres`, {
                genre: newGenre.trim(),
            });
            setNewGenre('');
            setActivePlatform(res.data);
            setPlatforms(prev => prev.map(p => p.id === res.data.id ? res.data : p));
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to add genre');
        } finally {
            setAddingGenre(false);
        }
    };

    const removeGenre = async (genre) => {
        if (!activePlatform) return;
        try {
            const res = await axios.delete(`/api/admin/platform-genres/${activePlatform.id}/genres`, {
                data: { genre },
            });
            setActivePlatform(res.data);
            setPlatforms(prev => prev.map(p => p.id === res.data.id ? res.data : p));
        } catch (e) {
            alert('Failed to remove genre');
        }
    };

    const saveBulkGenres = async () => {
        if (!activePlatform) return;
        const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return;
        setBulkSaving(true);
        try {
            // Merge with existing genres (deduplicate)
            const existing = activePlatform.genres || [];
            const merged = [...new Set([...existing, ...lines])];
            const res = await axios.put(`/api/admin/platform-genres/${activePlatform.id}`, {
                genres: merged,
            });
            setActivePlatform(res.data);
            setPlatforms(prev => prev.map(p => p.id === res.data.id ? res.data : p));
            setBulkText('');
            setShowBulkModal(false);
        } catch (e) {
            alert('Failed to save genres');
        } finally {
            setBulkSaving(false);
        }
    };

    const replaceAllGenres = async () => {
        if (!activePlatform) return;
        const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return;
        if (!window.confirm(`Replace ALL genres with ${lines.length} new genres?`)) return;
        setBulkSaving(true);
        try {
            const res = await axios.put(`/api/admin/platform-genres/${activePlatform.id}`, {
                genres: lines,
            });
            setActivePlatform(res.data);
            setPlatforms(prev => prev.map(p => p.id === res.data.id ? res.data : p));
            setBulkText('');
            setShowBulkModal(false);
        } catch (e) {
            alert('Failed to replace genres');
        } finally {
            setBulkSaving(false);
        }
    };

    const filteredGenres = (activePlatform?.genres || []).filter(g =>
        g.toLowerCase().includes(genreSearch.toLowerCase())
    );

    return (
        <>
            <PageBreadcrumb title="Platform Genres" subName="AI" />

            <Row>
                {/* ── Left: Platform List ── */}
                <Col md={4} lg={3}>
                    <Card>
                        <Card.Header className="d-flex align-items-center justify-content-between py-2">
                            <strong className="fs-6">Platforms</strong>
                            <div className="d-flex gap-1">
                                <Button size="sm" variant="soft-secondary" onClick={() => navigate('/ai/scrapers')}>
                                    <Icon icon="video" className="icon-xs" />
                                </Button>
                                <Button size="sm" variant="primary" onClick={openAddPlatform}>
                                    <Icon icon="plus" size={14} className="me-1" />
                                    Add
                                </Button>
                            </div>
                        </Card.Header>
                        <Card.Body className="p-0" style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                            {loading ? (
                                <div className="text-center py-4">
                                    <Spinner size="sm" />
                                </div>
                            ) : platforms.length === 0 ? (
                                <p className="text-muted text-center py-4 small">No platforms yet.</p>
                            ) : (
                                <div className="list-group list-group-flush">
                                    {platforms.map(p => (
                                        <div
                                            key={p.id}
                                            className="list-group-item list-group-item-action d-flex align-items-center justify-content-between py-2 px-3"
                                            style={{
                                                cursor: 'pointer',
                                                background: activePlatform?.id === p.id ? 'var(--bs-primary)' : '',
                                            }}
                                            onClick={() => { setActivePlatform(p); setGenreSearch(''); }}
                                        >
                                            <div>
                                                <div className="fw-semibold small" style={{ color: activePlatform?.id === p.id ? '#fff' : '' }}>{p.platform_name}</div>
                                                <div className="small" style={{ color: activePlatform?.id === p.id ? 'rgba(255,255,255,0.7)' : '#6c757d' }}>
                                                    {(p.genres || []).length} genres
                                                </div>
                                            </div>
                                            <div className="d-flex gap-1" onClick={e => e.stopPropagation()}>
                                                <Button
                                                    size="sm"
                                                    variant={activePlatform?.id === p.id ? 'outline-light' : 'outline-secondary'}
                                                    className="p-1"
                                                    title="Edit name"
                                                    onClick={() => openEditPlatform(p)}
                                                >
                                                    <Icon icon="edit" size={13} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={activePlatform?.id === p.id ? 'outline-light' : 'outline-danger'}
                                                    className="p-1"
                                                    title="Delete"
                                                    disabled={deletingId === p.id}
                                                    onClick={() => deletePlatform(p.id)}
                                                >
                                                    {deletingId === p.id
                                                        ? <Spinner size="sm" style={{ width: 12, height: 12 }} />
                                                        : <Icon icon="trash" size={13} />
                                                    }
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* ── Right: Genre Manager ── */}
                <Col md={8} lg={9}>
                    {!activePlatform ? (
                        <Card className="text-center py-5">
                            <Icon icon="list" size={40} className="text-muted mb-3 d-block mx-auto" />
                            <p className="text-muted">Select a platform to manage genres</p>
                        </Card>
                    ) : (
                        <Card>
                            <Card.Header className="d-flex align-items-center justify-content-between py-2 flex-wrap gap-2">
                                <div>
                                    <strong className="fs-6">{activePlatform.platform_name}</strong>
                                    <Badge bg="soft-primary" className="text-primary ms-2">
                                        {(activePlatform.genres || []).length} genres
                                    </Badge>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() => { setBulkText(''); setShowBulkModal(true); }}
                                >
                                    <Icon icon="list" size={14} className="me-1" />
                                    Bulk Add / Replace
                                </Button>
                            </Card.Header>

                            <Card.Body>
                                {/* Add single genre */}
                                <InputGroup className="mb-3" style={{ maxWidth: 420 }}>
                                    <Form.Control
                                        placeholder="New genre name..."
                                        value={newGenre}
                                        onChange={e => setNewGenre(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addGenre()}
                                    />
                                    <Button variant="primary" onClick={addGenre} disabled={addingGenre || !newGenre.trim()}>
                                        {addingGenre ? <Spinner size="sm" /> : <><Icon icon="plus" size={14} className="me-1" />Add</>}
                                    </Button>
                                </InputGroup>

                                {/* Search */}
                                <InputGroup className="mb-3" style={{ maxWidth: 300 }}>
                                    <InputGroup.Text><Icon icon="search" size={14} /></InputGroup.Text>
                                    <Form.Control
                                        placeholder="Search genres..."
                                        value={genreSearch}
                                        onChange={e => setGenreSearch(e.target.value)}
                                    />
                                    {genreSearch && (
                                        <Button variant="outline-secondary" onClick={() => setGenreSearch('')}>
                                            <Icon icon="x" size={14} />
                                        </Button>
                                    )}
                                </InputGroup>

                                {/* Genre tags */}
                                {filteredGenres.length === 0 ? (
                                    <p className="text-muted small">
                                        {genreSearch ? 'No genres match your search.' : 'No genres yet. Add one above.'}
                                    </p>
                                ) : (
                                    <div className="d-flex flex-wrap gap-2">
                                        {filteredGenres.map(genre => (
                                            <Badge
                                                key={genre}
                                                bg="soft-primary"
                                                className="text-primary d-flex align-items-center gap-1 px-2 py-1"
                                                style={{ fontSize: '0.8rem' }}
                                            >
                                                <span>{genre}</span>
                                                <button
                                                    type="button"
                                                    className="btn-close btn-close-sm"
                                                    style={{ fontSize: '0.5rem', filter: 'none', opacity: 0.6 }}
                                                    onClick={() => removeGenre(genre)}
                                                    aria-label="Remove"
                                                />
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {genreSearch && filteredGenres.length !== (activePlatform.genres || []).length && (
                                    <p className="text-muted small mt-2">
                                        Showing {filteredGenres.length} of {(activePlatform.genres || []).length} genres
                                    </p>
                                )}
                            </Card.Body>
                        </Card>
                    )}
                </Col>
            </Row>

            {/* ── Add/Edit Platform Modal ── */}
            <Modal show={showPlatformModal} onHide={() => setShowPlatformModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{editingPlatform ? 'Edit Platform' : 'Add Platform'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Platform Name</Form.Label>
                        <Form.Control
                            autoFocus
                            placeholder="e.g. MyPlatform"
                            value={platformName}
                            onChange={e => setPlatformName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && savePlatform()}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPlatformModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={savePlatform} disabled={platformSaving || !platformName.trim()}>
                        {platformSaving ? <Spinner size="sm" /> : 'Save'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ── Bulk Genre Modal ── */}
            <Modal show={showBulkModal} onHide={() => setShowBulkModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Bulk Genres — {activePlatform?.platform_name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="text-muted small mb-2">
                        One genre per line. <strong>Merge</strong> will add new ones (keeping existing).
                        <strong> Replace</strong> will overwrite all existing genres.
                    </p>
                    <Form.Control
                        as="textarea"
                        rows={14}
                        placeholder={"Genre One\nGenre Two\nGenre Three"}
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowBulkModal(false)}>Cancel</Button>
                    <Button variant="warning" onClick={replaceAllGenres} disabled={bulkSaving || !bulkText.trim()}>
                        {bulkSaving ? <Spinner size="sm" /> : 'Replace All'}
                    </Button>
                    <Button variant="primary" onClick={saveBulkGenres} disabled={bulkSaving || !bulkText.trim()}>
                        {bulkSaving ? <Spinner size="sm" /> : 'Merge'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default PlatformGenres;
