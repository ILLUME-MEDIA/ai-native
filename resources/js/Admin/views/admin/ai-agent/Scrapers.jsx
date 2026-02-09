import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table, Modal, Form, Badge, Image, Spinner } from 'react-bootstrap';
import axios from 'axios';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';

const Scrapers = () => {
    const [playlists, setPlaylists] = useState([]);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [videosLoading, setVideosLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [showPushModal, setShowPushModal] = useState(false);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [pushData, setPushData] = useState({
        platform_id: ''
    });
    const [platforms, setPlatforms] = useState([]);
    const [pushing, setPushing] = useState(false);
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        loadInitial();
    }, []);

    const loadInitial = async () => {
        setLoading(true);
        try {
            const [pRes, platformsRes] = await Promise.all([
                axios.get('/api/ai/scrapers'),
                axios.get('/api/ai/platforms')
            ]);
            setPlaylists(pRes.data);
            setPlatforms(platformsRes.data);
            setLoading(false);
            loadVideos();
        } catch (error) {
            console.error('Error fetching scraper data:', error);
            setLoading(false);
        }
    };

    const loadVideos = async () => {
        setVideosLoading(true);
        try {
            const vRes = await axios.get('/api/ai/scrapers/videos/list');
            setVideos(vRes.data);
        } catch (error) {
            console.error('Error fetching videos:', error);
        } finally {
            setVideosLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pRes, vRes, platformsRes] = await Promise.all([
                axios.get('/api/ai/scrapers'),
                axios.get('/api/ai/scrapers/videos/list'),
                axios.get('/api/ai/platforms')
            ]);
            setPlaylists(pRes.data);
            setVideos(vRes.data);
            setPlatforms(platformsRes.data);
            setVideosLoading(false);
        } catch (error) {
            console.error('Error fetching scraper data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPlaylist = async (e) => {
        e.preventDefault();
        setSyncing(true);
        try {
            await axios.post('/api/ai/scrapers', { playlist_url: playlistUrl });
            setPlaylistUrl('');
            setShowModal(false);
            fetchData();
            alert('Playlist added and first sync started.');
        } catch (error) {
            alert('Failed to add playlist: ' + (error.response?.data?.error || error.message));
        } finally {
            setSyncing(false);
        }
    };

    const handleSync = async (id) => {
        setSyncing(true);
        try {
            await axios.post(`/api/ai/scrapers/${id}/sync`);
            fetchData();
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    const handlePush = async (e) => {
        e.preventDefault();
        setPushing(true);
        try {
            const response = await axios.post(`/api/ai/scrapers/${selectedPlaylist.id}/push`, pushData);
            alert(response.data.message || 'Push successful!');
            setShowPushModal(false);
        } catch (error) {
            alert('Push failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setPushing(false);
        }
    };

    const handleReset = async (pl) => {
        if (!window.confirm(`Remove playlist "${pl.title || pl.playlist_id}" and all its videos? This cannot be undone.`)) {
            return;
        }
        setResetting(true);
        try {
            await axios.delete(`/api/ai/scrapers/${pl.id}`);
            alert('Playlist removed.');
            fetchData();
        } catch (error) {
            alert('Failed to remove: ' + (error.response?.data?.error || error.message));
        } finally {
            setResetting(false);
        }
    };

    const [showMetadataModal, setShowMetadataModal] = useState(false);
    const [metadataTags, setMetadataTags] = useState('');
    const [metadataGenres, setMetadataGenres] = useState('');
    const [generating, setGenerating] = useState(false);
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

    const handleBulkUpdate = async (type) => {
        if (!selectedPlaylist) return;
        setBulkUpdating(true);
        try {
            const payload = type === 'tags'
                ? { tags: metadataTags.split(',').map(t => t.trim()).filter(t => t) }
                : { genres: metadataGenres.split(',').map(t => t.trim()).filter(t => t) };

            const response = await axios.post(`/api/ai/scrapers/${selectedPlaylist.id}/bulk-update`, payload);
            alert(`Updated ${response.data.updated_count} videos.`);
            if (type === 'tags') setMetadataTags('');
            else setMetadataGenres('');
            fetchData();
        } catch (error) {
            alert('Bulk update failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setBulkUpdating(false);
        }
    };

    const handleGenerateMetadata = async () => {
        if (!selectedPlaylist) return;
        setGenerating(true);
        try {
            // Fetch latest video list for this playlist to ensure we have IDs
            const res = await axios.get(`/api/ai/scrapers/${selectedPlaylist.id}`);
            const playlistVideos = res.data.videos || [];

            setGenerationProgress({ current: 0, total: playlistVideos.length });

            for (let i = 0; i < playlistVideos.length; i++) {
                const video = playlistVideos[i];
                try {
                    const genRes = await axios.post(`/api/ai/scrapers/videos/${video.video_id}/generate-metadata`);
                    // Update local video state to show immediate feedback
                    setVideos(prev => prev.map(v =>
                        v.video_id === video.video_id
                            ? { ...v, tags: genRes.data.metadata.tags, genres: genRes.data.metadata.genres }
                            : v
                    ));
                    setGenerationProgress({ current: i + 1, total: playlistVideos.length });
                } catch (e) {
                    console.error(`Failed to generate for ${video.video_id}`, e);
                }
            }
            alert('Metadata generation completed!');
            fetchData();
        } catch (error) {
            alert('Failed to start generation: ' + error.message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <>
            <PageBreadcrumb title="YouTube Scrapers" subtitle="Global AI System" />
            <Row>
                {/* ... existing Playlists Card ... */}
                <Col md={12}>
                    <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <Card.Title as="h5">Monitored Playlists</Card.Title>
                            <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                                Add Playlist
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Table responsive className="table-centered table-nowrap mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Playlist</th>
                                        <th>Videos</th>
                                        <th>Last Fetched</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {playlists.map((pl) => (
                                        <tr key={pl.id}>
                                            <td>
                                                <strong>{pl.title || 'Untitled Playlist'}</strong>
                                                <br />
                                                <small className="text-muted">{pl.playlist_id}</small>
                                            </td>
                                            <td><Badge bg="info">{pl.videos_count} videos</Badge></td>
                                            <td>{pl.last_fetched_at ? new Date(pl.last_fetched_at).toLocaleString() : 'Never'}</td>
                                            <td>
                                                <Button
                                                    variant="soft-primary"
                                                    size="sm"
                                                    className="me-1"
                                                    onClick={() => handleSync(pl.id)}
                                                    disabled={syncing}
                                                >
                                                    <Icon icon="refresh" className="icon-xs" /> Sync
                                                </Button>
                                                <Button
                                                    variant="soft-secondary"
                                                    size="sm"
                                                    className="me-1"
                                                    onClick={() => {
                                                        setSelectedPlaylist(pl);
                                                        setShowMetadataModal(true);
                                                    }}
                                                >
                                                    <Icon icon="sparkles" className="icon-xs" /> AI / Meta
                                                </Button>
                                                <Button
                                                    variant="soft-info"
                                                    size="sm"
                                                    className="me-1"
                                                    onClick={() => {
                                                        setSelectedPlaylist(pl);
                                                        setShowPushModal(true);
                                                    }}
                                                    disabled={pushing}
                                                >
                                                    <Icon icon="send" className="icon-xs" /> Push
                                                </Button>
                                                <Button
                                                    variant="soft-danger"
                                                    size="sm"
                                                    onClick={() => handleReset(pl)}
                                                    disabled={resetting}
                                                    title="Remove this playlist and all its videos"
                                                >
                                                    <Icon icon="trash" className="icon-xs" /> Reset
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={12}>
                    <Card>
                        <Card.Header>
                            <Card.Title as="h5">Recently Fetched Videos</Card.Title>
                        </Card.Header>
                        <Card.Body>
                            <div className="table-responsive">
                                <Table className="table-centered mb-0">
                                    <thead>
                                        <tr>
                                            <th>Video</th>
                                            <th>Channel</th>
                                            <th>Duration</th>
                                            <th>Published</th>
                                            <th>Tags / Genres</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {videos.map((v) => {
                                            const staticThumb = v.thumbnail_url || `https://i.ytimg.com/vi/${v.video_id}/mqdefault.jpg`;
                                            const animatedUrl = v.thumbnail_animated_url || null;
                                            const hasAnimated = animatedUrl && animatedUrl.length > 0;
                                            const isWebm = hasAnimated && /\.webm(\?|$)/i.test(animatedUrl);
                                            const frameUrls = [1, 2, 3].map((n) => `https://i.ytimg.com/vi/${v.video_id}/${n}.jpg`);
                                            const startHover = (el) => {
                                                                const staticEl = el.querySelector('[data-static-thumb]');
                                                                const animEl = el.querySelector('[data-anim-thumb]');
                                                                const frameEl = el.querySelector('[data-frame-thumb]');
                                                                if (hasAnimated && animEl) {
                                                                    if (staticEl) staticEl.style.display = 'none';
                                                                    animEl.style.display = 'block';
                                                                    if (animEl.tagName === 'VIDEO') animEl.play().catch(() => {});
                                                                } else if (frameEl && frameUrls.length) {
                                                                    if (staticEl) staticEl.style.display = 'none';
                                                                    frameEl.style.display = 'block';
                                                                    let idx = 0;
                                                                    frameEl.src = frameUrls[idx];
                                                                    el._frameInterval = setInterval(() => {
                                                                        idx = (idx + 1) % frameUrls.length;
                                                                        frameEl.src = frameUrls[idx];
                                                                    }, 1000);
                                                                }
                                                            };
                                            const endHover = (el) => {
                                                                const staticEl = el.querySelector('[data-static-thumb]');
                                                                const animEl = el.querySelector('[data-anim-thumb]');
                                                                const frameEl = el.querySelector('[data-frame-thumb]');
                                                                if (el._frameInterval) {
                                                                    clearInterval(el._frameInterval);
                                                                    el._frameInterval = null;
                                                                }
                                                                if (staticEl) staticEl.style.display = 'block';
                                                                if (animEl) animEl.style.display = 'none';
                                                                if (animEl && animEl.tagName === 'VIDEO') animEl.pause();
                                                                if (frameEl) frameEl.style.display = 'none';
                                                            };
                                            return (
                                            <tr key={v.id}>
                                                <td style={{ minWidth: '300px' }}>
                                                    <div className="d-flex align-items-center">
                                                        <div
                                                            className="me-2 position-relative rounded overflow-hidden flex-shrink-0"
                                                            style={{ width: '60px', height: '34px' }}
                                                            onMouseEnter={(e) => startHover(e.currentTarget)}
                                                            onMouseLeave={(e) => endHover(e.currentTarget)}
                                                        >
                                                            <img
                                                                data-static-thumb
                                                                src={staticThumb}
                                                                alt=""
                                                                className="rounded"
                                                                style={{ width: '60px', height: '34px', objectFit: 'cover' }}
                                                            />
                                                            {hasAnimated && (isWebm ? (
                                                                <video
                                                                    data-anim-thumb
                                                                    src={animatedUrl}
                                                                    loop
                                                                    muted
                                                                    playsInline
                                                                    preload="metadata"
                                                                    className="position-absolute top-0 start-0 rounded"
                                                                    style={{ width: '60px', height: '34px', objectFit: 'cover', display: 'none' }}
                                                                />
                                                            ) : (
                                                                <img
                                                                    data-anim-thumb
                                                                    src={animatedUrl}
                                                                    alt=""
                                                                    className="position-absolute top-0 start-0 rounded"
                                                                    style={{ width: '60px', height: '34px', objectFit: 'cover', display: 'none' }}
                                                                />
                                                            ))}
                                                            <img
                                                                data-frame-thumb
                                                                alt=""
                                                                className="position-absolute top-0 start-0 rounded"
                                                                style={{ width: '60px', height: '34px', objectFit: 'cover', display: 'none' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="font-weight-bold text-truncate" style={{ maxWidth: '200px' }}>{v.title}</div>
                                                            <small className="text-muted">{v.video_id}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{v.channel_name}</td>
                                                <td><Badge bg="soft-secondary" className="text-secondary">{v.duration}</Badge></td>
                                                <td>{new Date(v.published_at).toLocaleDateString()}</td>
                                                <td>
                                                    <div className="mb-2">
                                                        <span className="small fw-semibold text-uppercase text-muted me-1">Tags:</span>
                                                        {(v.tags && v.tags.length) ? (
                                                            <>
                                                                {v.tags.slice(0, 5).map((tag, i) => (
                                                                    <Badge key={i} bg="soft-success" className="text-success me-1">{tag}</Badge>
                                                                ))}
                                                                {v.tags.length > 5 && <span className="small text-muted">+{v.tags.length - 5}</span>}
                                                            </>
                                                        ) : <span className="text-muted small">—</span>}
                                                    </div>
                                                    <div>
                                                        <span className="small fw-semibold text-uppercase text-muted me-1">Genres:</span>
                                                        {(v.genres && v.genres.length) ? (
                                                            v.genres.map((g, i) => (
                                                                <Badge key={i} bg="soft-warning" className="text-warning me-1">{g}</Badge>
                                                            ))
                                                        ) : <span className="text-muted small">—</span>}
                                                    </div>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                        {videos.length === 0 && videosLoading && (
                                            <tr><td colSpan="5" className="text-center text-muted py-3"><Spinner animation="border" size="sm" className="me-1" />Loading videos...</td></tr>
                                        )}
                                        {videos.length === 0 && !videosLoading && !loading && (
                                            <tr><td colSpan="5" className="text-center">No videos fetched yet.</td></tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Add Playlist Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Add YouTube Playlist</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleAddPlaylist}>
                        <Form.Group className="mb-3">
                            <Form.Label>Playlist URL</Form.Label>
                            <Form.Control
                                type="url"
                                required
                                placeholder="https://www.youtube.com/playlist?list=..."
                                value={playlistUrl}
                                onChange={(e) => setPlaylistUrl(e.target.value)}
                            />
                        </Form.Group>
                        <div className="text-end">
                            <Button variant="secondary" className="me-1" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button variant="primary" type="submit" disabled={syncing}>
                                {syncing ? 'Fetching...' : 'Add & Sync'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Metadata Manager Modal */}
            <Modal show={showMetadataModal} onHide={() => setShowMetadataModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Metadata Manager: {selectedPlaylist?.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <h6>AI Generation</h6>
                    <p className="small text-muted">Generate Tags and Genres using Mistral AI for all videos in this playlist.</p>
                    <Button
                        variant="success"
                        onClick={handleGenerateMetadata}
                        disabled={generating}
                        className="mb-4"
                    >
                        {generating ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-1" />
                                Generating ({generationProgress.current}/{generationProgress.total})...
                            </>
                        ) : 'Generate AI Metadata for All Videos'}
                    </Button>

                    <hr />

                    <h6>Bulk Add Metadata</h6>
                    <p className="small text-muted">Add static tags or genres to ALL videos in this playlist.</p>

                    <Form.Group className="mb-3">
                        <Form.Label>Add Tags (comma separated)</Form.Label>
                        <div className="d-flex">
                            <Form.Control
                                type="text"
                                placeholder="tag1, tag2, tag3"
                                value={metadataTags}
                                onChange={(e) => setMetadataTags(e.target.value)}
                            />
                            <Button
                                variant="primary"
                                className="ms-2"
                                onClick={() => handleBulkUpdate('tags')}
                                disabled={bulkUpdating || !metadataTags}
                            >
                                Add
                            </Button>
                        </div>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Add Genres (comma separated)</Form.Label>
                        <div className="d-flex">
                            <Form.Control
                                type="text"
                                placeholder="Genre 1, Genre 2"
                                value={metadataGenres}
                                onChange={(e) => setMetadataGenres(e.target.value)}
                            />
                            <Button
                                variant="warning"
                                className="ms-2"
                                onClick={() => handleBulkUpdate('genres')}
                                disabled={bulkUpdating || !metadataGenres}
                            >
                                Add
                            </Button>
                        </div>
                    </Form.Group>

                </Modal.Body>
            </Modal>

            {/* Push Modal */}
            <Modal show={showPushModal} onHide={() => setShowPushModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Push to Platform: {selectedPlaylist?.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handlePush}>
                        <Form.Group className="mb-3">
                            <Form.Label>Select Registered Platform</Form.Label>
                            <Form.Select
                                value={pushData.platform_id}
                                onChange={(e) => setPushData({ platform_id: e.target.value })}
                                required
                            >
                                <option value="">-- Choose Platform --</option>
                                {platforms.filter(p => p.is_active).map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.type.toUpperCase()})
                                    </option>
                                ))}
                            </Form.Select>
                            <Form.Text className="text-muted">
                                If your platform is missing, add it in <b>Platform Credentials</b>.
                            </Form.Text>
                        </Form.Group>

                        <div className="alert alert-soft-primary py-2 small">
                            <Icon icon="info-circle" className="me-1" />
                            This will push all videos from "{selectedPlaylist?.title}" to the selected platform using its stored credentials.
                        </div>

                        <div className="text-end mt-3">
                            <Button variant="secondary" className="me-1" onClick={() => setShowPushModal(false)}>Cancel</Button>
                            <Button variant="primary" type="submit" disabled={pushing || !pushData.platform_id}>
                                {pushing ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-1" />
                                        Pushing...
                                    </>
                                ) : 'Start Push Delivery'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default Scrapers;
