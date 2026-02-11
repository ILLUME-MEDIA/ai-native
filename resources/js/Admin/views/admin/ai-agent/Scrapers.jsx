import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Row, Col, Card, Button, Table, Modal, Form, Badge, Spinner, Pagination, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';

/* ─── Number formatter (1200 → "1.2K", 1500000 → "1.5M") ─── */
const fmtNum = (n) => {
    if (!n || n === 0) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
};

/* ─── Duration formatter: "PT4M30S" → "4:30", "3:45" stays "3:45" ─── */
const fmtDuration = (d) => {
    if (!d) return '—';
    // Already human-readable (contains ":" but not "PT")
    if (d.includes(':') && !d.startsWith('PT')) return d;
    // ISO 8601 format
    const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return d;
    const h = parseInt(m[1] || 0);
    const min = parseInt(m[2] || 0);
    const sec = parseInt(m[3] || 0);
    if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${min}:${String(sec).padStart(2, '0')}`;
};

/* ─── Status badge helper ─── */
const StatusBadge = ({ status }) => {
    const map = {
        new:     { bg: 'soft-secondary', text: 'text-secondary', label: 'New' },
        pushed:  { bg: 'soft-success',   text: 'text-success',   label: 'Pushed' },
        failed:  { bg: 'soft-danger',    text: 'text-danger',    label: 'Failed' },
        pending: { bg: 'soft-warning',   text: 'text-warning',   label: 'Pending' },
    };
    const s = map[status] || map.new;
    return <Badge bg={s.bg} className={s.text}>{s.label}</Badge>;
};

/* ─── Animated thumbnail component ─── */
const VideoThumb = ({ video }) => {
    const staticThumb = video.thumbnail_url || `https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`;
    const animatedUrl = video.thumbnail_animated_url || null;
    const hasAnimated = animatedUrl && animatedUrl.length > 0;
    const isWebm = hasAnimated && /\.webm(\?|$)/i.test(animatedUrl);
    const frameUrls = [1, 2, 3].map((n) => `https://i.ytimg.com/vi/${video.video_id}/${n}.jpg`);
    const intervalRef = useRef(null);

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
            intervalRef.current = setInterval(() => {
                idx = (idx + 1) % frameUrls.length;
                frameEl.src = frameUrls[idx];
            }, 1000);
        }
    };

    const endHover = (el) => {
        const staticEl = el.querySelector('[data-static-thumb]');
        const animEl = el.querySelector('[data-anim-thumb]');
        const frameEl = el.querySelector('[data-frame-thumb]');
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        if (staticEl) staticEl.style.display = 'block';
        if (animEl) animEl.style.display = 'none';
        if (animEl && animEl.tagName === 'VIDEO') animEl.pause();
        if (frameEl) frameEl.style.display = 'none';
    };

    return (
        <div
            className="me-2 position-relative rounded overflow-hidden flex-shrink-0"
            style={{ width: '60px', height: '34px' }}
            onMouseEnter={(e) => startHover(e.currentTarget)}
            onMouseLeave={(e) => endHover(e.currentTarget)}
        >
            <img data-static-thumb src={staticThumb} alt="" className="rounded" style={{ width: '60px', height: '34px', objectFit: 'cover' }} />
            {hasAnimated && (isWebm ? (
                <video data-anim-thumb src={animatedUrl} loop muted playsInline preload="metadata"
                    className="position-absolute top-0 start-0 rounded"
                    style={{ width: '60px', height: '34px', objectFit: 'cover', display: 'none' }} />
            ) : (
                <img data-anim-thumb src={animatedUrl} alt=""
                    className="position-absolute top-0 start-0 rounded"
                    style={{ width: '60px', height: '34px', objectFit: 'cover', display: 'none' }} />
            ))}
            <img data-frame-thumb alt="" className="position-absolute top-0 start-0 rounded"
                style={{ width: '60px', height: '34px', objectFit: 'cover', display: 'none' }} />
        </div>
    );
};

const Scrapers = () => {
    /* ─── Playlists & Platforms state ─── */
    const [playlists, setPlaylists] = useState([]);
    const [platforms, setPlatforms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [enriching, setEnriching] = useState(false);
    const [resetting, setResetting] = useState(false);

    /* ─── Videos DataTable state ─── */
    const [videos, setVideos] = useState([]);
    const [videosLoading, setVideosLoading] = useState(true);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 25 });
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [rowsInput, setRowsInput] = useState('25');
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [filterPlaylist, setFilterPlaylist] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [selectedVideoIds, setSelectedVideoIds] = useState(new Set());

    /* ─── Modals state ─── */
    const [showModal, setShowModal] = useState(false);
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [maxResults, setMaxResults] = useState('');
    const [showPushModal, setShowPushModal] = useState(false);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [pushData, setPushData] = useState({ platform_ids: [], limit: '', create_duties: true, album_mode: 'single' });
    const [pushing, setPushing] = useState(false);
    const [showMetadataModal, setShowMetadataModal] = useState(false);
    const [metadataTags, setMetadataTags] = useState('');
    const [metadataGenres, setMetadataGenres] = useState('');
    const [generating, setGenerating] = useState(false);
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

    const searchTimeout = useRef(null);

    /* ─── Load playlists + platforms once ─── */
    useEffect(() => {
        loadInitial();
    }, []);

    /* ─── Reload videos when filters/sort/page change ─── */
    useEffect(() => {
        loadVideos();
    }, [pagination.current_page, sortBy, sortDir, filterPlaylist, filterStatus]);

    const loadInitial = async () => {
        setLoading(true);
        try {
            const [pRes, platRes] = await Promise.all([
                axios.get('/api/ai/scrapers'),
                axios.get('/api/ai/platforms'),
            ]);
            setPlaylists(pRes.data);
            setPlatforms(platRes.data);
        } catch (error) {
            console.error('Error fetching scraper data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadVideos = useCallback(async (page, append = false) => {
        if (append) {
            setLoadingMore(true);
        } else {
            setVideosLoading(true);
        }
        try {
            const targetPage = page || pagination.current_page || 1;
            const params = {
                page: targetPage,
                per_page: rowsPerPage,
                sort_by: sortBy,
                sort_dir: sortDir,
            };
            if (search) params.search = search;
            if (filterPlaylist) params.playlist_id = filterPlaylist;
            if (filterStatus) params.status = filterStatus;

            const res = await axios.get('/api/ai/scrapers/videos/list', { params });
            const newRows = res.data.data || [];

            setVideos(prev => append ? [...prev, ...newRows] : newRows);
            setPagination({
                current_page: res.data.current_page,
                last_page: res.data.last_page,
                total: res.data.total,
                per_page: res.data.per_page,
            });
        } catch (error) {
            console.error('Error fetching videos:', error);
        } finally {
            if (append) {
                setLoadingMore(false);
            } else {
                setVideosLoading(false);
            }
        }
    }, [pagination.current_page, rowsPerPage, sortBy, sortDir, search, filterPlaylist, filterStatus]);

    const refreshAll = async () => {
        await loadInitial();
        loadVideos(1);
    };

    /* ─── Search with debounce ─── */
    const handleSearchChange = (val) => {
        setSearch(val);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            setPagination(p => ({ ...p, current_page: 1 }));
            loadVideos(1);
        }, 400);
    };

    /* ─── Sorting ─── */
    const handleSort = (col) => {
        if (sortBy === col) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(col);
            setSortDir('asc');
        }
        setPagination(p => ({ ...p, current_page: 1 }));
    };

    const SortIcon = ({ col }) => {
        if (sortBy !== col) return <Icon icon="chevrons-up-down" className="icon-xs text-muted ms-1" />;
        return sortDir === 'asc'
            ? <Icon icon="chevron-up" className="icon-xs text-primary ms-1" />
            : <Icon icon="chevron-down" className="icon-xs text-primary ms-1" />;
    };

    /* ─── Selection ─── */
    const allOnPageSelected = videos.length > 0 && videos.every(v => selectedVideoIds.has(v.video_id));

    const toggleSelectAll = () => {
        setSelectedVideoIds(prev => {
            const next = new Set(prev);
            if (allOnPageSelected) {
                videos.forEach(v => next.delete(v.video_id));
            } else {
                videos.forEach(v => next.add(v.video_id));
            }
            return next;
        });
    };

    const toggleSelect = (videoId) => {
        setSelectedVideoIds(prev => {
            const next = new Set(prev);
            if (next.has(videoId)) next.delete(videoId);
            else next.add(videoId);
            return next;
        });
    };

    /* ─── Playlist actions ─── */
    const handleAddPlaylist = async (e) => {
        e.preventDefault();
        setSyncing(true);
        try {
            const payload = { playlist_url: playlistUrl };
            const parsedMax = parseInt(maxResults, 10);
            if (parsedMax && parsedMax > 0) {
                payload.max_results = Math.min(parsedMax, 10000);
            }
            await axios.post('/api/ai/scrapers', payload);
            setPlaylistUrl('');
            setMaxResults('');
            setShowModal(false);
            refreshAll();
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
            const res = await axios.post(`/api/ai/scrapers/${id}/sync`);
            const enriched = res.data.enriched ?? 0;
            refreshAll();
            alert(`Sync complete. ${enriched > 0 ? `Enriched ${enriched} videos with YouTube metadata.` : 'Videos synced.'}`);
        } catch (error) {
            alert('Sync failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setSyncing(false);
        }
    };

    const handleEnrich = async (id) => {
        setEnriching(true);
        try {
            const res = await axios.post(`/api/ai/scrapers/${id}/enrich`);
            alert(res.data.message || 'Enrichment complete.');
            loadVideos();
        } catch (error) {
            alert('Enrich failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setEnriching(false);
        }
    };

    const handleReset = async (pl) => {
        if (!window.confirm(`Remove playlist "${pl.title || pl.playlist_id}" and all its videos? This cannot be undone.`)) return;
        setResetting(true);
        try {
            await axios.delete(`/api/ai/scrapers/${pl.id}`);
            alert('Playlist removed.');
            refreshAll();
        } catch (error) {
            alert('Failed to remove: ' + (error.response?.data?.error || error.message));
        } finally {
            setResetting(false);
        }
    };

    /* ─── Push action ─── */
    const openPushModal = (pl) => {
        setSelectedPlaylist(pl);
        setPushData({ platform_ids: [], limit: '', create_duties: true, album_mode: 'single' });
        setShowPushModal(true);
    };

    const openPushFromSelection = () => {
        if (selectedVideoIds.size === 0) { alert('Select at least one video.'); return; }
        // Find playlist for the first selected video
        const firstVideo = videos.find(v => selectedVideoIds.has(v.video_id));
        if (!firstVideo) return;
        const pl = playlists.find(p => p.playlist_id === firstVideo.playlist_id);
        if (!pl) { alert('Cannot determine playlist for selected videos.'); return; }
        setSelectedPlaylist(pl);
        setPushData({ platform_ids: [], limit: '', create_duties: true, album_mode: 'single' });
        setShowPushModal(true);
    };

    const handlePush = async (e) => {
        e.preventDefault();
        setPushing(true);
        try {
            const payload = {};

            if (pushData.platform_ids && pushData.platform_ids.length > 0) {
                payload.platform_ids = pushData.platform_ids;
            }

            // If we opened push from video selection, send specific video IDs
            if (selectedVideoIds.size > 0) {
                payload.video_ids = Array.from(selectedVideoIds);
            }

            // Apply limit if specified
            if (pushData.limit && parseInt(pushData.limit) > 0) {
                payload.limit = parseInt(pushData.limit);
            }

            payload.create_duties = !!pushData.create_duties;
            payload.album_mode = pushData.album_mode || 'single';

            const response = await axios.post(`/api/ai/scrapers/${selectedPlaylist.id}/push`, payload);
            const details = response.data.details || {};
            alert(response.data.message || `Push complete: ${details.success || 0} succeeded, ${details.failed || 0} failed.`);
            setShowPushModal(false);
            setSelectedVideoIds(new Set());
            loadVideos();
        } catch (error) {
            alert('Push failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setPushing(false);
        }
    };

    /* ─── Metadata actions ─── */
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
            loadVideos();
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
            const res = await axios.get(`/api/ai/scrapers/${selectedPlaylist.id}`);
            const playlistVideos = res.data.videos || [];
            setGenerationProgress({ current: 0, total: playlistVideos.length });

            for (let i = 0; i < playlistVideos.length; i++) {
                const video = playlistVideos[i];
                try {
                    await axios.post(`/api/ai/scrapers/videos/${video.video_id}/generate-metadata`);
                    setGenerationProgress({ current: i + 1, total: playlistVideos.length });
                } catch (e) {
                    console.error(`Failed to generate for ${video.video_id}`, e);
                }
            }
            alert('Metadata generation completed!');
            loadVideos();
        } catch (error) {
            alert('Failed to start generation: ' + error.message);
        } finally {
            setGenerating(false);
        }
    };

    /* ─── Pagination renderer ─── */
    const renderPagination = () => {
        if (pagination.last_page <= 1) return null;
        const pages = [];
        const { current_page, last_page } = pagination;

        const addPage = (num) => {
            pages.push(
                <Pagination.Item key={num} active={num === current_page}
                    onClick={() => setPagination(p => ({ ...p, current_page: num }))}>
                    {num}
                </Pagination.Item>
            );
        };

        pages.push(<Pagination.Prev key="prev" disabled={current_page <= 1}
            onClick={() => setPagination(p => ({ ...p, current_page: p.current_page - 1 }))} />);

        if (last_page <= 7) {
            for (let i = 1; i <= last_page; i++) addPage(i);
        } else {
            addPage(1);
            if (current_page > 3) pages.push(<Pagination.Ellipsis key="e1" disabled />);
            for (let i = Math.max(2, current_page - 1); i <= Math.min(last_page - 1, current_page + 1); i++) addPage(i);
            if (current_page < last_page - 2) pages.push(<Pagination.Ellipsis key="e2" disabled />);
            addPage(last_page);
        }

        pages.push(<Pagination.Next key="next" disabled={current_page >= last_page}
            onClick={() => setPagination(p => ({ ...p, current_page: p.current_page + 1 }))} />);

        return <Pagination className="mb-0 justify-content-end">{pages}</Pagination>;
    };

    /* ─── Infinite scroll handler for table body ─── */
    const handleTableScroll = (e) => {
        const { scrollTop, clientHeight, scrollHeight } = e.target;
        const nearBottom = scrollHeight - scrollTop - clientHeight < 80;
        if (
            nearBottom &&
            !videosLoading &&
            !loadingMore &&
            pagination.current_page < pagination.last_page
        ) {
            const nextPage = pagination.current_page + 1;
            loadVideos(nextPage, true);
        }
    };

    /* ─── Determine push count for the push modal info ─── */
    const selectedPlatforms = platforms.filter(p => (pushData.platform_ids || []).includes(String(p.id)));

    return (
        <>
            <PageBreadcrumb title="YouTube Scrapers" subtitle="Global AI System" />
            <Row>
                {/* ─── Playlists Card ─── */}
                <Col md={12}>
                    <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <Card.Title as="h5">Monitored Playlists</Card.Title>
                            <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                                Add Playlist
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            {loading ? (
                                <div className="text-center py-3"><Spinner animation="border" size="sm" /> Loading...</div>
                            ) : (
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
                                                    <Button variant="soft-primary" size="sm" className="me-1" onClick={() => handleSync(pl.id)} disabled={syncing}>
                                                        <Icon icon="refresh" className="icon-xs" /> {syncing ? 'Syncing...' : 'Sync'}
                                                    </Button>
                                                    <Button variant="soft-success" size="sm" className="me-1" onClick={() => handleEnrich(pl.id)} disabled={enriching}
                                                        title="Fetch views, likes, comments, HD info from YouTube API">
                                                        <Icon icon="bar-chart" className="icon-xs" /> {enriching ? 'Enriching...' : 'Enrich'}
                                                    </Button>
                                                    <Button variant="soft-secondary" size="sm" className="me-1"
                                                        onClick={() => { setSelectedPlaylist(pl); setShowMetadataModal(true); }}>
                                                        <Icon icon="sparkles" className="icon-xs" /> AI / Meta
                                                    </Button>
                                                    <Button variant="soft-info" size="sm" className="me-1" onClick={() => openPushModal(pl)} disabled={pushing}>
                                                        <Icon icon="send" className="icon-xs" /> Push
                                                    </Button>
                                                    <Button variant="soft-danger" size="sm" onClick={() => handleReset(pl)} disabled={resetting}
                                                        title="Remove this playlist and all its videos">
                                                        <Icon icon="trash" className="icon-xs" /> Reset
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {playlists.length === 0 && (
                                            <tr><td colSpan="4" className="text-center text-muted py-3">No playlists added yet.</td></tr>
                                        )}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* ─── Videos DataTable Card ─── */}
                <Col md={12}>
                    <Card>
                        <Card.Header>
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <Card.Title as="h5" className="mb-0">
                                    Videos {pagination.total > 0 && <small className="text-muted fw-normal">({pagination.total} total)</small>}
                                </Card.Title>
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                    {/* Search */}
                                    <InputGroup size="sm" style={{ width: '220px' }}>
                                        <InputGroup.Text><Icon icon="search" className="icon-xs" /></InputGroup.Text>
                                        <Form.Control placeholder="Search videos..." value={search}
                                            onChange={(e) => handleSearchChange(e.target.value)} />
                                    </InputGroup>
                                    {/* Playlist filter */}
                                    <Form.Select size="sm" style={{ width: '180px' }} value={filterPlaylist}
                                        onChange={(e) => { setFilterPlaylist(e.target.value); setPagination(p => ({ ...p, current_page: 1 })); }}>
                                        <option value="">All Playlists</option>
                                        {playlists.map(pl => (
                                            <option key={pl.playlist_id} value={pl.playlist_id}>{pl.title || pl.playlist_id}</option>
                                        ))}
                                    </Form.Select>
                                    {/* Status filter */}
                                    <Form.Select size="sm" style={{ width: '140px' }} value={filterStatus}
                                        onChange={(e) => { setFilterStatus(e.target.value); setPagination(p => ({ ...p, current_page: 1 })); }}>
                                        <option value="">All Status</option>
                                        <option value="new">New</option>
                                        <option value="pushed">Pushed</option>
                                        <option value="failed">Failed</option>
                                    </Form.Select>
                                    {/* Rows per page (preset + custom) */}
                                    <Form.Select
                                        size="sm"
                                        style={{ width: '120px' }}
                                        value={rowsPerPage}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value, 10) || 25;
                                            setRowsPerPage(value);
                                            setRowsInput(String(value));
                                            setPagination(p => ({ ...p, current_page: 1, per_page: value }));
                                        }}
                                    >
                                        <option value={25}>25 / page</option>
                                        <option value={50}>50 / page</option>
                                        <option value={100}>100 / page</option>
                                    </Form.Select>
                                    <InputGroup size="sm" style={{ width: '120px' }}>
                                        <Form.Control
                                            type="number"
                                            min={1}
                                            max={1000}
                                            value={rowsInput}
                                            onChange={(e) => setRowsInput(e.target.value)}
                                            onBlur={() => {
                                                const parsed = parseInt(rowsInput, 10);
                                                if (!parsed || parsed < 1) return;
                                                const clamped = Math.min(parsed, 1000);
                                                setRowsPerPage(clamped);
                                                setPagination(p => ({ ...p, current_page: 1, per_page: clamped }));
                                            }}
                                            placeholder="Custom"
                                        />
                                    </InputGroup>
                                    {/* Push selected */}
                                    {selectedVideoIds.size > 0 && (
                                        <Button variant="primary" size="sm" onClick={openPushFromSelection}>
                                            <Icon icon="send" className="icon-xs me-1" />
                                            Push {selectedVideoIds.size} Selected
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <div
                                className="table-responsive"
                                style={{ maxHeight: '600px', overflowY: 'auto' }}
                                onScroll={handleTableScroll}
                            >
                                <Table className="table-centered table-hover mb-0" size="sm">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: '36px' }}>
                                                <Form.Check type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} />
                                            </th>
                                            <th style={{ width: '70px' }}>Thumb</th>
                                            <th style={{ cursor: 'pointer', minWidth: '220px' }} onClick={() => handleSort('title')}>
                                                Title <SortIcon col="title" />
                                            </th>
                                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('duration')}>
                                                Duration <SortIcon col="duration" />
                                            </th>
                                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('view_count')}>
                                                Views <SortIcon col="view_count" />
                                            </th>
                                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('like_count')}>
                                                Likes <SortIcon col="like_count" />
                                            </th>
                                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('published_at')}>
                                                Published <SortIcon col="published_at" />
                                            </th>
                                            <th>Status</th>
                                            <th>Tags / Genres</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {videos.map((v) => {
                                            const def = v.metadata?.definition;
                                            return (
                                            <tr key={v.id} className={selectedVideoIds.has(v.video_id) ? 'table-active' : ''}>
                                                <td>
                                                    <Form.Check type="checkbox" checked={selectedVideoIds.has(v.video_id)}
                                                        onChange={() => toggleSelect(v.video_id)} />
                                                </td>
                                                <td><VideoThumb video={v} /></td>
                                                <td>
                                                    <div className="fw-semibold text-truncate" style={{ maxWidth: '240px' }} title={v.description || v.title}>
                                                        {v.title}
                                                    </div>
                                                    <small className="text-muted">{v.channel_name}</small>
                                                </td>
                                                <td>
                                                    <Badge bg="soft-secondary" className="text-secondary">{fmtDuration(v.duration)}</Badge>
                                                    {def === 'hd' && <Badge bg="soft-primary" className="text-primary ms-1" style={{fontSize: '0.6rem'}}>HD</Badge>}
                                                </td>
                                                <td>
                                                    <span title={v.view_count?.toLocaleString()}>{fmtNum(v.view_count)}</span>
                                                </td>
                                                <td>
                                                    <span className="text-danger" title={v.like_count?.toLocaleString()}>
                                                        {v.like_count > 0 && <Icon icon="heart" className="icon-xs me-1" />}
                                                        {fmtNum(v.like_count)}
                                                    </span>
                                                    {v.comment_count > 0 && (
                                                        <small className="text-muted d-block" title={v.comment_count?.toLocaleString()}>
                                                            {fmtNum(v.comment_count)} comments
                                                        </small>
                                                    )}
                                                </td>
                                                <td>
                                                    {v.published_at ? new Date(v.published_at).toLocaleDateString() : '—'}
                                                </td>
                                                <td>
                                                    <StatusBadge status={v.push_status || 'new'} />
                                                    {v.push_platforms && v.push_platforms.length > 0 && (
                                                        <div className="mt-1">
                                                            {v.push_platforms.map((p, i) => (
                                                                <small key={i} className="text-muted d-block">{p}</small>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    {(v.tags && v.tags.length > 0) ? (
                                                        <div className="mb-1">
                                                            {v.tags.slice(0, 3).map((tag, i) => (
                                                                <Badge key={i} bg="soft-success" className="text-success me-1" style={{fontSize: '0.65rem'}}>{tag}</Badge>
                                                            ))}
                                                            {v.tags.length > 3 && <span className="small text-muted">+{v.tags.length - 3}</span>}
                                                        </div>
                                                    ) : null}
                                                    {(v.genres && v.genres.length > 0) ? (
                                                        <div>
                                                            {v.genres.map((g, i) => (
                                                                <Badge key={i} bg="soft-warning" className="text-warning me-1" style={{fontSize: '0.65rem'}}>{g}</Badge>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                    {(!v.tags || v.tags.length === 0) && (!v.genres || v.genres.length === 0) && (
                                                        <span className="text-muted small">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                            );
                                        })}
                                        {videos.length === 0 && videosLoading && (
                                            <tr><td colSpan="9" className="text-center text-muted py-4">
                                                <Spinner animation="border" size="sm" className="me-1" />Loading videos...
                                            </td></tr>
                                        )}
                                        {videos.length === 0 && !videosLoading && (
                                            <tr><td colSpan="9" className="text-center text-muted py-4">No videos found.</td></tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                            {/* Pagination footer */}
                            {pagination.total > 0 && (
                                <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top">
                                    <small className="text-muted">
                                        Showing {((pagination.current_page - 1) * pagination.per_page) + 1}–{Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total}
                                        {selectedVideoIds.size > 0 && <> &middot; <strong>{selectedVideoIds.size} selected</strong></>}
                                    </small>
                                    {renderPagination()}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* ─── Add Playlist Modal ─── */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Add YouTube Playlist</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleAddPlaylist}>
                        <Form.Group className="mb-3">
                            <Form.Label>Playlist URL</Form.Label>
                            <Form.Control type="url" required placeholder="https://www.youtube.com/playlist?list=..."
                                value={playlistUrl} onChange={(e) => setPlaylistUrl(e.target.value)} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Max videos to import (optional)</Form.Label>
                            <Form.Control
                                type="number"
                                min={1}
                                max={10000}
                                placeholder="Default: up to 5000 via YouTube API"
                                value={maxResults}
                                onChange={(e) => setMaxResults(e.target.value)}
                            />
                            <Form.Text className="text-muted">
                                Leave empty for default (up to 5000). Set higher only if your API quota allows it.
                            </Form.Text>
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

            {/* ─── Metadata Manager Modal ─── */}
            <Modal show={showMetadataModal} onHide={() => setShowMetadataModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Metadata Manager: {selectedPlaylist?.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <h6>AI Generation</h6>
                    <p className="small text-muted">Generate Tags and Genres using Mistral AI for all videos in this playlist.</p>
                    <Button variant="success" onClick={handleGenerateMetadata} disabled={generating} className="mb-4">
                        {generating ? (
                            <><Spinner animation="border" size="sm" className="me-1" />
                                Generating ({generationProgress.current}/{generationProgress.total})...</>
                        ) : 'Generate AI Metadata for All Videos'}
                    </Button>
                    <hr />
                    <h6>Bulk Add Metadata</h6>
                    <p className="small text-muted">Add static tags or genres to ALL videos in this playlist.</p>
                    <Form.Group className="mb-3">
                        <Form.Label>Add Tags (comma separated)</Form.Label>
                        <div className="d-flex">
                            <Form.Control type="text" placeholder="tag1, tag2, tag3" value={metadataTags}
                                onChange={(e) => setMetadataTags(e.target.value)} />
                            <Button variant="primary" className="ms-2" onClick={() => handleBulkUpdate('tags')}
                                disabled={bulkUpdating || !metadataTags}>Add</Button>
                        </div>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Add Genres (comma separated)</Form.Label>
                        <div className="d-flex">
                            <Form.Control type="text" placeholder="Genre 1, Genre 2" value={metadataGenres}
                                onChange={(e) => setMetadataGenres(e.target.value)} />
                            <Button variant="warning" className="ms-2" onClick={() => handleBulkUpdate('genres')}
                                disabled={bulkUpdating || !metadataGenres}>Add</Button>
                        </div>
                    </Form.Group>
                </Modal.Body>
            </Modal>

            {/* ─── Push Modal ─── */}
            <Modal show={showPushModal} onHide={() => setShowPushModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Push to Platform: {selectedPlaylist?.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handlePush}>
                        {/* Platform selection (multi-select) */}
                        <Form.Group className="mb-3">
                            <Form.Label>Target Platforms</Form.Label>
                            <div className="border rounded p-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                <div className="fw-semibold small text-muted mb-1">Streaming</div>
                                {platforms.filter(p => p.is_active && p.type === 'streaming').map(p => {
                                    const idStr = String(p.id);
                                    const checked = (pushData.platform_ids || []).includes(idStr);
                                    return (
                                        <Form.Check
                                            key={p.id}
                                            type="checkbox"
                                            id={`push-platform-streaming-${p.id}`}
                                            label={p.name}
                                            checked={checked}
                                            onChange={(e) => {
                                                setPushData(d => {
                                                    const ids = new Set(d.platform_ids || []);
                                                    if (e.target.checked) ids.add(idStr);
                                                    else ids.delete(idStr);
                                                    return { ...d, platform_ids: Array.from(ids) };
                                                });
                                            }}
                                            className="mb-1 small"
                                        />
                                    );
                                })}

                                <div className="fw-semibold small text-muted mt-2 mb-1">Watchlist</div>
                                {platforms.filter(p => p.is_active && p.type === 'watchlist').map(p => {
                                    const idStr = String(p.id);
                                    const checked = (pushData.platform_ids || []).includes(idStr);
                                    return (
                                        <Form.Check
                                            key={p.id}
                                            type="checkbox"
                                            id={`push-platform-watchlist-${p.id}`}
                                            label={p.name}
                                            checked={checked}
                                            onChange={(e) => {
                                                setPushData(d => {
                                                    const ids = new Set(d.platform_ids || []);
                                                    if (e.target.checked) ids.add(idStr);
                                                    else ids.delete(idStr);
                                                    return { ...d, platform_ids: Array.from(ids) };
                                                });
                                            }}
                                            className="mb-1 small"
                                        />
                                    );
                                })}
                            </div>
                            <Form.Text className="text-muted">
                                Select one or more platforms (e.g. <b>Streaming</b> and <b>Watchlist</b>) to push in a single step.
                            </Form.Text>
                        </Form.Group>

                        {/* Platform type info */}
                        {selectedPlatforms.length > 0 && (
                            <div className="alert alert-soft-info py-2 small mb-3">
                                <strong>{selectedPlatforms.length}</strong> platform(s) selected:&nbsp;
                                {selectedPlatforms.map((p, idx) => (
                                    <span key={p.id}>
                                        {idx > 0 && ', '}
                                        {p.name} <span className="text-muted">({p.type})</span>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Selection info */}
                        <div className="alert alert-soft-secondary py-2 small mb-3">
                            {selectedVideoIds.size > 0 ? (
                                <><strong>{selectedVideoIds.size}</strong> videos selected from the table. Only these will be pushed.</>
                            ) : (
                                <>All <strong>unpushed</strong> videos from "{selectedPlaylist?.title}" will be included. Already-pushed videos are automatically skipped.</>
                            )}
                        </div>

                        {/* Duty creation toggle */}
                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                id="push-create-duties"
                                label="Create / update automated duties for selected platforms"
                                checked={!!pushData.create_duties}
                                onChange={(e) => setPushData(d => ({ ...d, create_duties: e.target.checked }))}
                            />
                            <Form.Text className="text-muted">
                                Uncheck if you <b>do not</b> want AI duties to be created/updated for this push.
                            </Form.Text>
                        </Form.Group>

                        {/* Album grouping mode (streaming platforms) */}
                        <Form.Group className="mb-3">
                            <Form.Label>Album grouping (Streaming)</Form.Label>
                            <div className="d-flex flex-column gap-1">
                                <Form.Check
                                    type="radio"
                                    id="album-mode-single"
                                    label="Single album for whole playlist"
                                    checked={pushData.album_mode === 'single'}
                                    onChange={() => setPushData(d => ({ ...d, album_mode: 'single' }))}
                                />
                                <Form.Check
                                    type="radio"
                                    id="album-mode-per-video"
                                    label="Separate album per video"
                                    checked={pushData.album_mode === 'per_video'}
                                    onChange={() => setPushData(d => ({ ...d, album_mode: 'per_video' }))}
                                />
                            </div>
                            <Form.Text className="text-muted">
                                Applies to streaming platforms only. Watchlist platforms always treat videos as episodes.
                            </Form.Text>
                        </Form.Group>

                        {/* Limit */}
                        <Form.Group className="mb-3">
                            <Form.Label>Push Limit (optional)</Form.Label>
                            <Form.Control type="number" min="1" placeholder="Push all (leave empty)"
                                value={pushData.limit}
                                onChange={(e) => setPushData(d => ({ ...d, limit: e.target.value }))} />
                            <Form.Text className="text-muted">
                                Limit how many videos to push now. Remaining videos will be handled by the automated duty.
                            </Form.Text>
                        </Form.Group>

                        <div className="text-end mt-3">
                            <Button variant="secondary" className="me-1" onClick={() => setShowPushModal(false)}>Cancel</Button>
                            <Button variant="primary" type="submit" disabled={pushing || !(pushData.platform_ids && pushData.platform_ids.length)}>
                                {pushing ? (
                                    <><Spinner animation="border" size="sm" className="me-1" />Pushing...</>
                                ) : 'Start Push'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default Scrapers;
