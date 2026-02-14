import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Row, Col, Card, Button, Table, Modal, Form, Badge, Spinner, Pagination, InputGroup, Tabs, Tab, ListGroup } from 'react-bootstrap';
import axios from 'axios';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';

/* ─── Predefined Tag Categories (from mistralService.ts) ─── */
const TAG_CATEGORIES = {
    contentTypes: ['Music', 'Gaming', 'Education', 'Technology', 'Comedy', 'Entertainment', 'Cooking', 'Travel', 'Sports', 'Health', 'Beauty', 'DIY', 'Documentary', 'Review'],
    focusTypes: ['Tutorial', 'Review', 'Gameplay', 'Interview', 'Recipe', 'Workout', 'Makeup', 'Crafting', 'Analysis', 'Guide', 'Tips', 'Vlog', 'News'],
    summaryWords: ['entertainment', 'educational', 'interactive', 'informative', 'creative', 'competitive', 'relaxing', 'inspiring', 'practical', 'engaging']
};

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
    const [replaceMode, setReplaceMode] = useState(true); // true = replace, false = merge
    const [generating, setGenerating] = useState(false);
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

    // Use ref for immediate cancellation (state updates are async and won't be seen in the loop)
    const cancelGenerationRef = useRef(false);

    /* ─── Manual Tag/Genre Selector modal state ─── */
    const [showManualSelectorModal, setShowManualSelectorModal] = useState(false);
    const [selectorTab, setSelectorTab] = useState('tags'); // 'tags' or 'genres'
    const [selectedPlatform, setSelectedPlatform] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [platformGenres, setPlatformGenres] = useState({});

    /* ─── Image Manager modal state ─── */
    const [showImageModal, setShowImageModal] = useState(false);
    const [imageTarget, setImageTarget] = useState(null); // { type: 'playlist'|'video', id, title, currentImage, manualImage }
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageMode, setImageMode] = useState('url'); // 'url' or 'upload'
    const [imageSubmitting, setImageSubmitting] = useState(false);

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
        setPushData({ platform_ids: [], limit: '', create_duties: true, album_mode: 'single', force: false });
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
        setPushData({ platform_ids: [], limit: '', create_duties: true, album_mode: 'single', force: false });
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
                ? { tags: metadataTags.split(',').map(t => t.trim()).filter(t => t), replace: replaceMode }
                : { genres: metadataGenres.split(',').map(t => t.trim()).filter(t => t), replace: replaceMode };

            const response = await axios.post(`/api/ai/scrapers/${selectedPlaylist.id}/bulk-update`, payload);

            // Show clear message about what happened
            const mode = response.data.mode === 'replace' ? 'Replaced (AI tags removed)' : 'Merged (AI tags kept)';
            alert(`${response.data.message || `Updated ${response.data.updated_count} videos`}\nMode: ${mode}`);

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
        cancelGenerationRef.current = false; // Reset cancel flag

        try {
            const res = await axios.get(`/api/ai/scrapers/${selectedPlaylist.id}`);
            const playlistVideos = res.data.videos || [];
            setGenerationProgress({ current: 0, total: playlistVideos.length });

            let cancelled = false;
            let playlistDeleted = false;

            for (let i = 0; i < playlistVideos.length; i++) {
                // ⚠️ Check if generation should be cancelled (using ref for immediate check)
                if (cancelGenerationRef.current) {
                    console.log('AI generation cancelled by user at video', i + 1);
                    cancelled = true;
                    break;
                }

                // ⚠️ Check if playlist still exists (check every 5 videos to avoid too many requests)
                if (i % 5 === 0) {
                    try {
                        await axios.get(`/api/ai/scrapers/${selectedPlaylist.id}`);
                    } catch (playlistCheckError) {
                        if (playlistCheckError.response?.status === 404) {
                            console.log('Playlist deleted, stopping generation');
                            playlistDeleted = true;
                            break;
                        }
                    }
                }

                const video = playlistVideos[i];
                try {
                    await axios.post(`/api/ai/scrapers/videos/${video.video_id}/generate-metadata`);
                    setGenerationProgress({ current: i + 1, total: playlistVideos.length });
                } catch (e) {
                    console.error(`Failed to generate for ${video.video_id}`, e);
                }
            }

            // Show appropriate completion message
            if (cancelled) {
                alert('AI generation cancelled by user.');
            } else if (playlistDeleted) {
                alert('Playlist was deleted. AI generation stopped.');
            } else {
                alert('Metadata generation completed!');
                loadVideos();
            }
        } catch (error) {
            console.error('Error in handleGenerateMetadata:', error);
            alert('Failed to start generation: ' + (error.message || 'Unknown error'));
        } finally {
            setGenerating(false);
            cancelGenerationRef.current = false;
        }
    };

    const handleStopGeneration = () => {
        try {
            cancelGenerationRef.current = true; // Set ref immediately
            console.log('Stop button clicked - cancelling generation');
        } catch (error) {
            console.error('Error in handleStopGeneration:', error);
        }
    };

    /* ─── Manual Tag/Genre Selector handlers ─── */
    const handleOpenManualSelector = async () => {
        // Close metadata modal to prevent overdisplay
        setShowMetadataModal(false);

        // Fetch platform genres if not already loaded
        if (Object.keys(platformGenres).length === 0) {
            try {
                const response = await axios.get('/api/ai/scrapers/platform-genres');
                setPlatformGenres(response.data.genres);
            } catch (error) {
                console.error('Error loading platform genres:', error);
                alert('Failed to load platform genres');
                // Re-open metadata modal if loading fails
                setShowMetadataModal(true);
                return;
            }
        }
        setShowManualSelectorModal(true);
    };

    const handleToggleTag = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleToggleGenre = (genre) => {
        setSelectedGenres(prev =>
            prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
        );
    };

    const handleApplyManualSelection = async () => {
        if (selectedTags.length === 0 && selectedGenres.length === 0) {
            alert('Please select at least one tag or genre');
            return;
        }

        try {
            const payload = {};
            if (selectedTags.length > 0) payload.tags = selectedTags;
            if (selectedGenres.length > 0) payload.genres = selectedGenres;
            payload.replace = replaceMode;

            const response = await axios.post(`/api/ai/scrapers/${selectedPlaylist.id}/bulk-update`, payload);

            alert(`${response.data.message}\nMode: ${response.data.mode === 'replace' ? 'Replaced (AI tags removed)' : 'Merged (AI tags kept)'}`);

            // Reset selections
            setSelectedTags([]);
            setSelectedGenres([]);
            setSelectedPlatform('');
            setShowManualSelectorModal(false);
            setShowMetadataModal(true); // Reopen metadata modal

            // Refresh videos
            loadPlaylistVideos(currentPage);
        } catch (error) {
            console.error('Error applying manual selections:', error);
            alert('Failed to apply manual selections: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleCloseManualSelector = () => {
        setShowManualSelectorModal(false);
        setShowMetadataModal(true); // Reopen metadata modal
    };

    const handleAiPickGenre = async () => {
        if (!selectedPlatform) {
            alert('Please select a platform first');
            return;
        }

        if (!videos || videos.length === 0) {
            alert('No videos in this playlist');
            return;
        }

        const availableGenres = platformGenres[selectedPlatform] || [];
        if (availableGenres.length === 0) {
            alert('No genres available for this platform');
            return;
        }

        // Confirm before starting
        if (!confirm(`AI will analyze ${videos.length} videos and assign appropriate genres from ${selectedPlatform} platform. Continue?`)) {
            return;
        }

        // Close manual selector and show progress
        setShowManualSelectorModal(false);
        setGenerating(true);
        setGenerationProgress({ current: 0, total: videos.length });

        try {
            let updated = 0;
            for (let i = 0; i < videos.length; i++) {
                const video = videos[i];
                setGenerationProgress({ current: i + 1, total: videos.length });

                // Smart genre matching based on title and description
                const videoText = `${video.title} ${video.description || ''}`.toLowerCase();
                const matchedGenres = availableGenres
                    .filter(genre => {
                        const genreWords = genre.toLowerCase().split(/[\s&\/]+/);
                        return genreWords.some(word => videoText.includes(word.toLowerCase()));
                    })
                    .slice(0, 3); // Max 3 genres per video

                // If no matches, pick 1-2 random genres
                if (matchedGenres.length === 0) {
                    const randomCount = Math.min(2, availableGenres.length);
                    const shuffled = [...availableGenres].sort(() => 0.5 - Math.random());
                    matchedGenres.push(...shuffled.slice(0, randomCount));
                }

                // Update video with genres
                if (matchedGenres.length > 0) {
                    try {
                        await axios.post(`/api/ai/scrapers/videos/${video.video_id}/generate-metadata`, {
                            platform: selectedPlatform,
                            genres: matchedGenres
                        });
                        updated++;
                    } catch (error) {
                        console.error(`Error updating video ${video.video_id}:`, error);
                    }
                }

                // Small delay to prevent overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            alert(`✅ AI Genre Assignment Complete!\n\nUpdated ${updated} out of ${videos.length} videos with ${selectedPlatform} genres.`);
            loadVideos();
        } catch (error) {
            console.error('Error in AI genre assignment:', error);
            alert('Failed to assign genres: ' + (error.response?.data?.error || error.message));
        } finally {
            setGenerating(false);
            setGenerationProgress({ current: 0, total: 0 });
            setShowMetadataModal(true);
        }
    };

    /* ─── Image Manager actions ─── */
    const openPlaylistImage = (pl) => {
        setImageTarget({
            type: 'playlist',
            id: pl.id,
            title: pl.title || pl.playlist_id,
            currentImage: pl.manual_image_url || null,
            manualImage: pl.manual_image_url || null,
        });
        setImageUrl(pl.manual_image_url || '');
        setImageFile(null);
        setImagePreview(null);
        setImageMode('url');
        setShowImageModal(true);
    };

    const openVideoImage = (video) => {
        setImageTarget({
            type: 'video',
            id: video.video_id,
            title: video.title,
            currentImage: video.manual_image_url || video.thumbnail_url,
            manualImage: video.manual_image_url || null,
            scraperImage: video.thumbnail_url,
        });
        setImageUrl(video.manual_image_url || '');
        setImageFile(null);
        setImagePreview(null);
        setImageMode('url');
        setShowImageModal(true);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (JPG, PNG, WebP, etc.)');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Image size must be less than 10MB');
            return;
        }

        setImageFile(file);
        setImageUrl(''); // Clear URL input when file is selected

        // Generate preview
        const reader = new FileReader();
        reader.onload = (ev) => {
            setImagePreview(ev.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleImageSave = async () => {
        if (!imageTarget) return;
        if (!imageUrl.trim() && !imageFile) {
            alert('Please provide an image URL or upload a file');
            return;
        }

        setImageSubmitting(true);
        try {
            const endpoint = imageTarget.type === 'playlist'
                ? `/api/ai/scrapers/${imageTarget.id}/image`
                : `/api/ai/scrapers/videos/${imageTarget.id}/image`;

            let response;
            if (imageFile) {
                // File upload mode
                const formData = new FormData();
                formData.append('image', imageFile);
                response = await axios.post(endpoint, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                // URL mode
                response = await axios.post(endpoint, { image_url: imageUrl.trim() });
            }

            alert('Image saved. It will be used on the next push to streaming and watchlist.');
            setShowImageModal(false);
            if (imageTarget.type === 'playlist') loadInitial();
            else loadVideos();
        } catch (error) {
            alert('Failed to save image: ' + (error.response?.data?.error || error.message));
        } finally {
            setImageSubmitting(false);
        }
    };

    const handleImageRemove = async () => {
        if (!imageTarget) return;
        if (!window.confirm('Remove manual image? The scraper image will be used on next push.')) return;
        setImageSubmitting(true);
        try {
            const endpoint = imageTarget.type === 'playlist'
                ? `/api/ai/scrapers/${imageTarget.id}/image`
                : `/api/ai/scrapers/videos/${imageTarget.id}/image`;

            await axios.delete(endpoint);
            alert('Manual image removed. Scraper image will be used on next push.');
            setShowImageModal(false);
            if (imageTarget.type === 'playlist') loadInitial();
            else loadVideos();
        } catch (error) {
            alert('Failed to remove image: ' + (error.response?.data?.error || error.message));
        } finally {
            setImageSubmitting(false);
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
                                                        {(generating && selectedPlaylist?.id === pl.id) ? (
                                                            <><Spinner animation="border" size="sm" className="me-1" style={{width: '12px', height: '12px', borderWidth: '2px'}} />
                                                                AI ({generationProgress.current}/{generationProgress.total})</>
                                                        ) : (
                                                            <><Icon icon="sparkles" className="icon-xs" /> AI / Meta</>
                                                        )}
                                                    </Button>
                                                    <Button variant="soft-warning" size="sm" className="me-1" onClick={() => openPlaylistImage(pl)}
                                                        title="Set cover image for streaming album / watchlist title">
                                                        <Icon icon="image" className="icon-xs" /> Image
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
                                                <td>
                                                    <div className="position-relative" style={{ cursor: 'pointer' }} onClick={() => openVideoImage(v)}
                                                        title={v.manual_image_url ? 'Custom image set (click to change)' : 'Click to set custom image'}>
                                                        <VideoThumb video={v} />
                                                        {v.manual_image_url && (
                                                            <span className="position-absolute top-0 end-0 translate-middle badge rounded-pill bg-warning"
                                                                style={{ fontSize: '0.5rem', padding: '2px 4px', zIndex: 2 }}>
                                                                <Icon icon="pen" style={{ width: 8, height: 8 }} />
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
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
                                                        <div className="mb-2">
                                                            <small className="text-dark fw-bold d-flex align-items-center mb-1" style={{fontSize: '0.6rem', letterSpacing: '0.5px'}}>
                                                                <Icon icon="tag" className="me-1 text-dark" style={{width: '10px', height: '10px', stroke: '#000', strokeWidth: 2}} /> TAGS
                                                            </small>
                                                            {v.tags.slice(0, 3).map((tag, i) => (
                                                                <Badge key={i} bg="light" className="text-dark border me-1 mb-1" style={{fontSize: '0.7rem', fontWeight: '600'}}>{tag}</Badge>
                                                            ))}
                                                            {v.tags.length > 3 && <span className="small text-muted">+{v.tags.length - 3}</span>}
                                                        </div>
                                                    ) : null}
                                                    {(v.genres && v.genres.length > 0) ? (
                                                        <div>
                                                            <small className="text-dark fw-bold d-flex align-items-center mb-1" style={{fontSize: '0.6rem', letterSpacing: '0.5px'}}>
                                                                <Icon icon="grid" className="me-1 text-dark" style={{width: '10px', height: '10px', stroke: '#000', strokeWidth: 2}} /> GENRES
                                                            </small>
                                                            {v.genres.map((g, i) => (
                                                                <Badge key={i} bg="light" className="text-dark border me-1 mb-1" style={{fontSize: '0.7rem', fontWeight: '600', borderColor: '#ffc107', backgroundColor: '#fff9e6'}}>{g}</Badge>
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
                    <Modal.Title>
                        Metadata Manager: {selectedPlaylist?.title}
                        {generating && <small className="text-muted ms-2">(AI running in background...)</small>}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <h6>AI Generation</h6>
                    <p className="small text-muted">Generate Tags and Genres using Mistral AI for all videos in this playlist.</p>
                    <div className="d-flex gap-2 mb-4">
                        <Button variant="success" onClick={handleGenerateMetadata} disabled={generating} className="flex-grow-1">
                            {generating ? (
                                <><Spinner animation="border" size="sm" className="me-1" />
                                    Generating ({generationProgress.current}/{generationProgress.total})...</>
                            ) : (
                                <><Icon icon="sparkles" className="icon-xs me-1" />
                                    Generate AI Metadata for All Videos</>
                            )}
                        </Button>
                        {generating && (
                            <Button variant="danger" onClick={handleStopGeneration} title="Stop AI generation">
                                <Icon icon="x-circle" className="icon-xs me-1" />
                                Stop
                            </Button>
                        )}
                    </div>

                    <h6 className="mt-3">Manual Selection</h6>
                    <p className="small text-muted">Select tags and genres from predefined categories.</p>
                    <Button variant="info" onClick={handleOpenManualSelector} className="w-100 mb-3">
                        <Icon icon="list" className="icon-xs me-1" />
                        Open Manual Selector
                    </Button>

                    <hr />
                    <h6>Bulk Add Metadata</h6>
                    <p className="small text-muted">Add static tags or genres to ALL videos in this playlist.</p>

                    {/* Replace/Merge Mode Toggle */}
                    <Form.Group className="mb-3">
                        <div className="d-flex align-items-center gap-3 p-2 bg-light rounded">
                            <Form.Check
                                type="radio"
                                id="mode-replace"
                                name="updateMode"
                                label={
                                    <span>
                                        <strong>Replace Mode</strong>
                                        <br />
                                        <small className="text-muted">Remove AI/YouTube tags, use only manual tags</small>
                                    </span>
                                }
                                checked={replaceMode === true}
                                onChange={() => setReplaceMode(true)}
                            />
                            <Form.Check
                                type="radio"
                                id="mode-merge"
                                name="updateMode"
                                label={
                                    <span>
                                        <strong>Merge Mode</strong>
                                        <br />
                                        <small className="text-muted">Keep AI/YouTube tags, add manual tags</small>
                                    </span>
                                }
                                checked={replaceMode === false}
                                onChange={() => setReplaceMode(false)}
                            />
                        </div>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Add Tags (comma separated)</Form.Label>
                        <div className="d-flex">
                            <Form.Control type="text" placeholder="tag1, tag2, tag3" value={metadataTags}
                                onChange={(e) => setMetadataTags(e.target.value)} />
                            <Button variant="primary" className="ms-2" onClick={() => handleBulkUpdate('tags')}
                                disabled={bulkUpdating || !metadataTags}>
                                {replaceMode ? (
                                    <><Icon icon="refresh-cw" className="icon-xs me-1" /> Replace</>
                                ) : (
                                    <><Icon icon="plus" className="icon-xs me-1" /> Merge</>
                                )}
                            </Button>
                        </div>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Add Genres (comma separated)</Form.Label>
                        <div className="d-flex">
                            <Form.Control type="text" placeholder="Genre 1, Genre 2" value={metadataGenres}
                                onChange={(e) => setMetadataGenres(e.target.value)} />
                            <Button variant="warning" className="ms-2" onClick={() => handleBulkUpdate('genres')}
                                disabled={bulkUpdating || !metadataGenres}>
                                {replaceMode ? (
                                    <><Icon icon="refresh-cw" className="icon-xs me-1" /> Replace</>
                                ) : (
                                    <><Icon icon="plus" className="icon-xs me-1" /> Merge</>
                                )}
                            </Button>
                        </div>
                    </Form.Group>
                </Modal.Body>
            </Modal>

            {/* ─── Manual Tag/Genre Selector Modal ─── */}
            <Modal show={showManualSelectorModal} onHide={handleCloseManualSelector} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <Icon icon="list" className="icon-xs me-2" />
                        Manual Tag & Genre Selector
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="small text-muted mb-3">
                        Select predefined tags and genres to apply to all videos in this playlist.
                        Choose between Replace (remove AI/YouTube tags) or Merge (keep existing tags) mode in the main modal.
                    </p>

                    <Tabs activeKey={selectorTab} onSelect={(k) => setSelectorTab(k)} className="mb-3">
                        {/* ─── Tags Tab ─── */}
                        <Tab eventKey="tags" title={<><Icon icon="tag" className="icon-xs me-1" />Tags</>}>
                            <div className="mt-3">
                                <h6>Selected Tags ({selectedTags.length})</h6>
                                {selectedTags.length > 0 ? (
                                    <div className="mb-3">
                                        {selectedTags.map((tag, i) => (
                                            <Badge key={i} bg="primary" className="me-1 mb-1">
                                                {tag}
                                                <span className="ms-1 cursor-pointer" onClick={() => handleToggleTag(tag)} style={{cursor: 'pointer'}}>×</span>
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="small text-muted">No tags selected yet</p>
                                )}

                                <hr />

                                {/* Content Types */}
                                <div className="mb-3">
                                    <h6 className="text-muted small">Content Types</h6>
                                    <div className="d-flex flex-wrap gap-2">
                                        {TAG_CATEGORIES.contentTypes.map((tag) => (
                                            <Form.Check
                                                key={tag}
                                                type="checkbox"
                                                id={`tag-content-${tag}`}
                                                label={tag}
                                                checked={selectedTags.includes(tag)}
                                                onChange={() => handleToggleTag(tag)}
                                                className="border rounded px-2 py-1"
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Focus Types */}
                                <div className="mb-3">
                                    <h6 className="text-muted small">Focus Types</h6>
                                    <div className="d-flex flex-wrap gap-2">
                                        {TAG_CATEGORIES.focusTypes.map((tag) => (
                                            <Form.Check
                                                key={tag}
                                                type="checkbox"
                                                id={`tag-focus-${tag}`}
                                                label={tag}
                                                checked={selectedTags.includes(tag)}
                                                onChange={() => handleToggleTag(tag)}
                                                className="border rounded px-2 py-1"
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Summary Words */}
                                <div className="mb-3">
                                    <h6 className="text-muted small">Summary Words</h6>
                                    <div className="d-flex flex-wrap gap-2">
                                        {TAG_CATEGORIES.summaryWords.map((tag) => (
                                            <Form.Check
                                                key={tag}
                                                type="checkbox"
                                                id={`tag-summary-${tag}`}
                                                label={tag}
                                                checked={selectedTags.includes(tag)}
                                                onChange={() => handleToggleTag(tag)}
                                                className="border rounded px-2 py-1"
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Tab>

                        {/* ─── Genres Tab ─── */}
                        <Tab eventKey="genres" title={<><Icon icon="grid" className="icon-xs me-1" />Genres</>}>
                            <div className="mt-3">
                                <h6>Selected Genres ({selectedGenres.length})</h6>
                                {selectedGenres.length > 0 ? (
                                    <div className="mb-3">
                                        {selectedGenres.map((genre, i) => (
                                            <Badge key={i} bg="warning" text="dark" className="me-1 mb-1">
                                                {genre}
                                                <span className="ms-1 cursor-pointer" onClick={() => handleToggleGenre(genre)} style={{cursor: 'pointer'}}>×</span>
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="small text-muted">No genres selected yet</p>
                                )}

                                <hr />

                                {/* Platform Selector */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Select Platform</Form.Label>
                                    <div className="d-flex gap-2">
                                        <Form.Select
                                            value={selectedPlatform}
                                            onChange={(e) => setSelectedPlatform(e.target.value)}
                                            className="flex-grow-1"
                                        >
                                            <option value="">Choose a platform...</option>
                                            {Object.keys(platformGenres).map((platform) => (
                                                <option key={platform} value={platform}>{platform}</option>
                                            ))}
                                        </Form.Select>
                                        <Button
                                            variant="success"
                                            onClick={handleAiPickGenre}
                                            disabled={!selectedPlatform || generating}
                                            title="AI will analyze each video and assign appropriate genres from selected platform"
                                        >
                                            <Icon icon="sparkles" className="icon-xs me-1" />
                                            {generating ? 'Assigning...' : 'AI Assign All'}
                                        </Button>
                                    </div>
                                </Form.Group>

                                {/* Genre Checkboxes */}
                                {selectedPlatform && platformGenres[selectedPlatform] && (
                                    <div className="mb-3">
                                        <h6 className="text-muted small">{selectedPlatform} Genres</h6>
                                        <div className="d-flex flex-wrap gap-2">
                                            {platformGenres[selectedPlatform].map((genre) => (
                                                <Form.Check
                                                    key={genre}
                                                    type="checkbox"
                                                    id={`genre-${selectedPlatform}-${genre}`}
                                                    label={genre}
                                                    checked={selectedGenres.includes(genre)}
                                                    onChange={() => handleToggleGenre(genre)}
                                                    className="border rounded px-2 py-1"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Tab>
                    </Tabs>

                    <hr />

                    {/* Action Buttons */}
                    <div className="d-flex gap-2">
                        <Button variant="secondary" onClick={handleCloseManualSelector}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleApplyManualSelection} className="flex-grow-1">
                            <Icon icon="check" className="icon-xs me-1" />
                            Apply Selection ({selectedTags.length} tags, {selectedGenres.length} genres)
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>

            {/* ─── Image Manager Modal ─── */}
            <Modal show={showImageModal} onHide={() => setShowImageModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {imageTarget?.type === 'playlist' ? 'Playlist Cover Image' : 'Video Image Override'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="small text-muted mb-3">
                        <strong>{imageTarget?.title}</strong>
                        <br />
                        Set a custom image that will be used on <strong>both streaming and watchlist</strong> pushes.
                        {imageTarget?.type === 'playlist'
                            ? ' This image will be used as the album cover (streaming) and title poster (watchlist).'
                            : ' This image will be used as the track image (streaming) and episode poster (watchlist).'}
                    </p>

                    {/* Current image preview */}
                    {(imageTarget?.manualImage || imageTarget?.scraperImage || imageTarget?.currentImage) && (
                        <div className="mb-3 text-center">
                            <p className="small fw-semibold mb-1">
                                {imageTarget?.manualImage ? 'Current Custom Image' : 'Current Scraper Image'}
                            </p>
                            <img
                                src={imageTarget?.manualImage || imageTarget?.scraperImage || imageTarget?.currentImage}
                                alt="Current"
                                className="rounded border"
                                style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'cover' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            {imageTarget?.manualImage && (
                                <div className="mt-1">
                                    <Badge bg="warning" className="text-dark">Custom Override Active</Badge>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mode selector */}
                    <div className="d-flex gap-2 mb-3">
                        <Button
                            variant={imageMode === 'url' ? 'primary' : 'outline-secondary'}
                            size="sm"
                            onClick={() => { setImageMode('url'); setImageFile(null); setImagePreview(null); }}
                        >
                            <Icon icon="link" className="icon-xs me-1" />
                            Image URL
                        </Button>
                        <Button
                            variant={imageMode === 'upload' ? 'primary' : 'outline-secondary'}
                            size="sm"
                            onClick={() => { setImageMode('upload'); setImageUrl(''); }}
                        >
                            <Icon icon="upload" className="icon-xs me-1" />
                            Upload File
                        </Button>
                    </div>

                    {imageMode === 'url' ? (
                        <>
                            {/* URL input */}
                            <Form.Group className="mb-3">
                                <Form.Label>Image URL</Form.Label>
                                <Form.Control
                                    type="url"
                                    placeholder="https://example.com/image.jpg"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                />
                                <Form.Text className="text-muted">
                                    Paste a direct URL to an image (JPG, PNG, WebP). This overrides the YouTube thumbnail.
                                </Form.Text>
                            </Form.Group>

                            {/* Preview of entered URL */}
                            {imageUrl && imageUrl.startsWith('http') && (
                                <div className="mb-3 text-center">
                                    <p className="small fw-semibold mb-1">Preview</p>
                                    <img
                                        src={imageUrl}
                                        alt="Preview"
                                        className="rounded border"
                                        style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'cover' }}
                                        onError={(e) => { e.target.alt = 'Could not load image'; }}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* File upload */}
                            <Form.Group className="mb-3">
                                <Form.Label>Upload Image</Form.Label>
                                <Form.Control
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                />
                                <Form.Text className="text-muted">
                                    Select an image file (JPG, PNG, WebP, GIF). Max size: 10MB.
                                </Form.Text>
                            </Form.Group>

                            {/* File preview */}
                            {imagePreview && (
                                <div className="mb-3 text-center">
                                    <p className="small fw-semibold mb-1">Preview</p>
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="rounded border"
                                        style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'cover' }}
                                    />
                                    {imageFile && (
                                        <div className="mt-2">
                                            <Badge bg="info">{imageFile.name}</Badge>
                                            <Badge bg="secondary" className="ms-1">
                                                {(imageFile.size / 1024).toFixed(1)} KB
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    <div className="d-flex justify-content-between">
                        {imageTarget?.manualImage ? (
                            <Button variant="outline-danger" size="sm" onClick={handleImageRemove} disabled={imageSubmitting}>
                                <Icon icon="trash" className="icon-xs me-1" />
                                Remove Override
                            </Button>
                        ) : <div />}
                        <div>
                            <Button variant="secondary" size="sm" className="me-1" onClick={() => setShowImageModal(false)}>Cancel</Button>
                            <Button variant="primary" size="sm" onClick={handleImageSave}
                                disabled={imageSubmitting || (!imageUrl.trim() && !imageFile)}>
                                {imageSubmitting ? <><Spinner animation="border" size="sm" className="me-1" />Saving...</> : 'Save Image'}
                            </Button>
                        </div>
                    </div>
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
