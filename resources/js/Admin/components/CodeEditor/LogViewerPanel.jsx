import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { RefreshCw, Pause, Play, Trash2, ChevronDown, ChevronRight, FileText } from 'lucide-react';

const LEVEL_STYLES = {
    ERROR:   { bg: 'rgba(248,81,73,0.08)',   border: 'rgba(248,81,73,0.25)',   text: '#f85149',  badge: 'rgba(248,81,73,0.18)' },
    CRITICAL:{ bg: 'rgba(248,81,73,0.12)',   border: 'rgba(248,81,73,0.35)',   text: '#f85149',  badge: 'rgba(248,81,73,0.25)' },
    WARNING: { bg: 'rgba(210,153,34,0.08)',  border: 'rgba(210,153,34,0.25)',  text: '#d29922',  badge: 'rgba(210,153,34,0.18)' },
    NOTICE:  { bg: 'rgba(210,153,34,0.05)',  border: 'rgba(210,153,34,0.15)',  text: '#d29922',  badge: 'rgba(210,153,34,0.12)' },
    INFO:    { bg: 'rgba(88,166,255,0.06)',  border: 'rgba(88,166,255,0.2)',   text: '#58a6ff',  badge: 'rgba(88,166,255,0.14)' },
    DEBUG:   { bg: 'transparent',            border: 'rgba(28,33,40,0.5)',     text: '#484f58',  badge: 'rgba(72,79,88,0.25)' },
};

const FILTER_LEVELS = ['ERROR', 'WARNING', 'INFO', 'DEBUG'];
const FILTER_INCLUDES = { ERROR: ['ERROR', 'CRITICAL'], WARNING: ['WARNING', 'NOTICE'], INFO: ['INFO'], DEBUG: ['DEBUG'] };

function levelStyle(level) {
    return LEVEL_STYLES[level] || LEVEL_STYLES.DEBUG;
}

function levelGroup(level) {
    for (const [group, members] of Object.entries(FILTER_INCLUDES)) {
        if (members.includes(level)) return group;
    }
    return 'DEBUG';
}

// Parse file paths out of a stack trace line so we can make them clickable
function parseTraceLine(line, onJumpToFile) {
    // Match: /path/to/file.php(42): or \path\to\file.php(42):
    const match = line.match(/^(#\d+\s+)([^\s(]+\.(php|jsx?|tsx?|py|rb))\((\d+)\)(.*)/);
    if (!match || !onJumpToFile) return <span>{line}</span>;
    const [, prefix, filePath, , lineNum, rest] = match;
    return (
        <span>
            {prefix}
            <button
                onClick={() => onJumpToFile(filePath, parseInt(lineNum, 10))}
                style={{
                    background: 'none', border: 'none', padding: 0,
                    color: '#58a6ff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit',
                    textDecoration: 'underline',
                }}
                title={`Open ${filePath}:${lineNum}`}
            >
                {filePath}({lineNum})
            </button>
            {rest}
        </span>
    );
}

function LogEntry({ entry, onJumpToFile }) {
    const [expanded, setExpanded] = useState(false);
    const s = levelStyle(entry.level);
    const hasTrace = entry.trace && entry.trace.length > 0;

    return (
        <div style={{
            borderBottom: `1px solid ${s.border}`,
            background: s.bg,
            fontFamily: "'JetBrains Mono', monospace",
        }}>
            <div
                onClick={() => hasTrace && setExpanded(v => !v)}
                style={{
                    display: 'flex', alignItems: 'flex-start', gap: '7px',
                    padding: '4px 10px',
                    cursor: hasTrace ? 'pointer' : 'default',
                }}
            >
                {/* Expand toggle */}
                <span style={{ flexShrink: 0, color: '#484f58', paddingTop: '1px', width: '10px' }}>
                    {hasTrace
                        ? (expanded ? <ChevronDown size={9} /> : <ChevronRight size={9} />)
                        : null
                    }
                </span>

                {/* Time */}
                <span style={{ flexShrink: 0, fontSize: '10px', color: '#484f58', paddingTop: '1px', minWidth: '60px' }}>
                    {entry.datetime?.split(' ')[1] ?? ''}
                </span>

                {/* Level badge */}
                <span style={{
                    flexShrink: 0,
                    fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em',
                    padding: '1px 5px', borderRadius: '6px',
                    background: s.badge, color: s.text,
                    minWidth: '52px', textAlign: 'center',
                }}>
                    {entry.level}
                </span>

                {/* Message */}
                <span style={{
                    flex: 1, fontSize: '11px', color: s.text === '#484f58' ? '#8b949e' : s.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }} title={entry.message}>
                    {entry.message}
                </span>
            </div>

            {/* Trace */}
            {expanded && hasTrace && (
                <div style={{
                    padding: '2px 10px 6px 30px',
                    fontSize: '10px', color: '#8b949e',
                    lineHeight: 1.7,
                    borderTop: `1px solid ${s.border}`,
                    background: 'rgba(0,0,0,0.15)',
                }}>
                    {entry.trace.map((line, i) => (
                        <div key={i}>{parseTraceLine(line, onJumpToFile)}</div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function LogViewerPanel({ workspace, onJumpToFile }) {
    const [entries, setEntries]     = useState([]);
    const [loading, setLoading]     = useState(false);
    const [paused, setPaused]       = useState(false);
    const [filter, setFilter]       = useState('ALL');
    const [search, setSearch]       = useState('');
    const [sseSize, setSseSize]     = useState(0);
    const [connected, setConnected] = useState(false);

    const bottomRef    = useRef(null);
    const sseRef       = useRef(null);   // AbortController for current SSE connection
    const pausedRef    = useRef(false);
    const sseSizeRef   = useRef(0);
    const containerRef = useRef(null);
    const autoScrollRef = useRef(true);

    pausedRef.current  = paused;
    sseSizeRef.current = sseSize;

    // ── Initial load ──────────────────────────────────────────────────────
    const loadInitial = useCallback(async () => {
        if (!workspace?.id) return;
        setLoading(true);
        try {
            const resp = await axios.get(`/api/workspaces/${workspace.id}/logs`);
            setEntries(resp.data.entries || []);
            const sz = resp.data.size || 0;
            setSseSize(sz);
            sseSizeRef.current = sz;
        } catch {
            // non-fatal
        } finally {
            setLoading(false);
        }
    }, [workspace?.id]);

    // ── SSE streaming ─────────────────────────────────────────────────────
    const connectSSE = useCallback(() => {
        if (!workspace?.id || pausedRef.current) return;

        // Abort any existing connection
        sseRef.current?.abort();

        const controller = new AbortController();
        sseRef.current = controller;

        const url     = `/api/workspaces/${workspace.id}/logs/stream?size=${sseSizeRef.current}`;
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

        setConnected(false);

        const fetchHeaders = {
            'Accept': 'text/event-stream',
            'X-Requested-With': 'XMLHttpRequest',
        };
        if (csrfToken) fetchHeaders['X-CSRF-TOKEN'] = csrfToken;
        if (window.__SITE_API_KEY__) fetchHeaders['Authorization'] = `Bearer ${window.__SITE_API_KEY__}`;

        fetch(url, {
            method: 'GET',
            headers: fetchHeaders,
            credentials: 'same-origin',
            signal: controller.signal,
        }).then(async (response) => {
            if (!response.ok) return;
            setConnected(true);

            const reader  = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                let event = '';
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.startsWith('event:')) {
                        event = line.substring(6).trim();
                    } else if (line.startsWith('data:')) {
                        let data = {};
                        try { data = JSON.parse(line.substring(5).trim()); } catch { /* skip */ }
                        if (event === 'log' && !pausedRef.current) {
                            setEntries(prev => [...prev.slice(-999), data]);
                        } else if (event === 'size') {
                            const sz = data.size || 0;
                            setSseSize(sz);
                            sseSizeRef.current = sz;
                        } else if (event === 'reconnect') {
                            const sz = data.size || sseSizeRef.current;
                            setSseSize(sz);
                            sseSizeRef.current = sz;
                            setConnected(false);
                            if (!pausedRef.current) {
                                setTimeout(connectSSE, 100);
                            }
                            return;
                        }
                        event = '';
                    }
                }
            }
            setConnected(false);
            if (!pausedRef.current) {
                setTimeout(connectSSE, 2000);
            }
        }).catch(() => {
            setConnected(false);
        });
    }, [workspace?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        loadInitial();
    }, [loadInitial]);

    useEffect(() => {
        if (!paused) {
            connectSSE();
        } else {
            sseRef.current?.abort();
            setConnected(false);
        }
        return () => {
            sseRef.current?.abort();
        };
    }, [paused, connectSSE]);

    // ── Auto-scroll ───────────────────────────────────────────────────────
    useEffect(() => {
        if (autoScrollRef.current && bottomRef.current) {
            bottomRef.current.scrollIntoView({ block: 'end' });
        }
    }, [entries]);

    function handleScroll() {
        const el = containerRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        autoScrollRef.current = atBottom;
    }

    // ── Filtering ─────────────────────────────────────────────────────────
    const counts = useMemo(() => {
        const c = {};
        for (const e of entries) {
            const g = levelGroup(e.level);
            c[g] = (c[g] || 0) + 1;
        }
        return c;
    }, [entries]);

    const filtered = useMemo(() => entries.filter(e => {
        const group = levelGroup(e.level);
        if (filter !== 'ALL' && group !== filter) return false;
        if (search) {
            const q = search.toLowerCase();
            return e.message?.toLowerCase().includes(q) || e.trace?.some(t => t.toLowerCase().includes(q));
        }
        return true;
    }), [entries, filter, search]);

    // ── Handlers ──────────────────────────────────────────────────────────
    function handleClear() {
        setEntries([]);
    }

    async function handleRefresh() {
        sseRef.current?.abort();
        setConnected(false);
        await loadInitial();
        if (!paused) connectSSE();
    }

    // ── Styles ────────────────────────────────────────────────────────────
    const chipStyle = (active, level) => {
        const s = level ? levelStyle(level) : null;
        return {
            padding: '2px 7px', borderRadius: '10px', border: 'none',
            cursor: 'pointer', fontSize: '10px',
            fontFamily: "'JetBrains Mono', monospace",
            background: active ? (s?.badge || 'rgba(255,107,53,0.15)') : 'rgba(255,255,255,0.05)',
            color: active ? (s?.text || '#ff6b35') : '#8b949e',
            outline: active
                ? `1px solid ${s?.border || 'rgba(255,107,53,0.3)'}`
                : '1px solid transparent',
        };
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            background: '#0a0c0f', color: '#c9d1d9',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '12px',
        }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap',
                padding: '4px 10px', flexShrink: 0,
                borderBottom: '1px solid #1c2128',
                background: '#0d0f14',
            }}>
                {/* Connected indicator */}
                <span style={{
                    width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                    background: connected ? '#3fb950' : (paused ? '#d29922' : '#484f58'),
                    boxShadow: connected ? '0 0 4px #3fb950' : 'none',
                }} title={connected ? 'Live' : paused ? 'Paused' : 'Disconnected'} />

                {/* Level filter chips */}
                <button onClick={() => setFilter('ALL')} style={chipStyle(filter === 'ALL', null)}>
                    ALL {entries.length > 0 && `(${entries.length})`}
                </button>
                {FILTER_LEVELS.map(lvl => (
                    counts[lvl] ? (
                        <button key={lvl} onClick={() => setFilter(lvl)} style={chipStyle(filter === lvl, lvl)}>
                            {lvl} ({counts[lvl]})
                        </button>
                    ) : null
                ))}

                {/* Right controls */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {/* Search */}
                    <input
                        type="text"
                        placeholder="filter..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            background: '#161b22', border: '1px solid #1c2128',
                            borderRadius: '4px', padding: '2px 7px',
                            color: '#c9d1d9', fontSize: '10px', fontFamily: 'inherit',
                            outline: 'none', width: '100px',
                        }}
                    />

                    {/* Pause / Resume */}
                    <button
                        onClick={() => setPaused(v => !v)}
                        title={paused ? 'Resume live tail' : 'Pause live tail'}
                        style={{
                            background: paused ? 'rgba(210,153,34,0.1)' : 'none',
                            border: paused ? '1px solid rgba(210,153,34,0.3)' : 'none',
                            borderRadius: '3px',
                            color: paused ? '#d29922' : '#8b949e',
                            cursor: 'pointer', padding: '2px 4px',
                            display: 'flex', alignItems: 'center',
                        }}
                    >
                        {paused ? <Play size={12} /> : <Pause size={12} />}
                    </button>

                    {/* Refresh / re-connect */}
                    <button
                        onClick={handleRefresh}
                        title="Reload log file"
                        style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    >
                        <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    </button>

                    {/* Clear */}
                    <button
                        onClick={handleClear}
                        title="Clear display (does not delete log file)"
                        style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    >
                        <Trash2 size={11} />
                    </button>
                </div>
            </div>

            {/* Log list */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                style={{ flex: 1, overflowY: 'auto' }}
            >
                {loading && entries.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', fontSize: '11px', color: '#484f58' }}>
                        Loading log…
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', fontSize: '11px', color: '#484f58', lineHeight: 1.7 }}>
                        {entries.length === 0 ? (
                            <>
                                <FileText size={28} style={{ marginBottom: '8px', opacity: 0.3 }} />
                                <br />
                                No log entries found.
                                <br />
                                <span style={{ fontSize: '10px' }}>
                                    Expecting <code style={{ color: '#8b949e' }}>storage/logs/laravel.log</code> in workspace.
                                </span>
                            </>
                        ) : 'No matches for current filter.'}
                    </div>
                ) : (
                    <>
                        {filtered.map((entry, idx) => (
                            <LogEntry key={idx} entry={entry} onJumpToFile={onJumpToFile} />
                        ))}
                        <div ref={bottomRef} style={{ height: '1px' }} />
                    </>
                )}
            </div>
        </div>
    );
}
