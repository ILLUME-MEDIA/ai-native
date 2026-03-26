import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Play, Square, CheckCircle, XCircle, MinusCircle, Clock, RefreshCw, Filter } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const STATUS_ICON = {
    passed:  <CheckCircle size={11} color="#3fb950" />,
    failed:  <XCircle     size={11} color="#f85149" />,
    skipped: <MinusCircle size={11} color="#8b949e" />,
    running: <Clock       size={11} color="#ff9f1c" style={{ animation: 'spin 1s linear infinite' }} />,
};

const FILTER_OPTS = ['ALL', 'passed', 'failed', 'skipped'];

export default function TestRunnerPanel({ workspace, onJumpToFile, isDark }) {
    const [tests, setTests]       = useState([]);   // { status, name, file, line, duration_ms, message }
    const [summary, setSummary]   = useState(null);  // { total, passed, failed, skipped, ok }
    const [running, setRunning]   = useState(false);
    const [filter, setFilter]     = useState('ALL');
    const [search, setSearch]     = useState('');
    const [expanded, setExpanded] = useState({});    // test name → bool (show message)
    const [runner, setRunner]     = useState('auto');

    const esRef   = useRef(null);
    const listRef = useRef(null);

    // ── Run ──────────────────────────────────────────────────────────────────
    const startRun = useCallback(() => {
        if (!workspace || running) return;

        // Close any previous stream
        esRef.current?.close();
        setTests([]);
        setSummary(null);
        setExpanded({});
        setRunning(true);

        const params = new URLSearchParams({ runner });
        if (search) params.set('filter', search);

        const url = `/api/workspaces/${workspace.id}/test-runner/run?${params}`;
        const es  = new EventSource(url);
        esRef.current = es;

        es.addEventListener('test', (e) => {
            const data = JSON.parse(e.data);
            setTests(prev => {
                const idx = prev.findIndex(t => t.name === data.name);
                if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = data;
                    return next;
                }
                return [...prev, data];
            });
        });

        es.addEventListener('done', (e) => {
            const { summary: s } = JSON.parse(e.data);
            setSummary(s);
            setRunning(false);
            es.close();
            esRef.current = null;
        });

        es.addEventListener('error', (e) => {
            try {
                const { message } = JSON.parse(e.data);
                toast.error(message);
            } catch { /* non-JSON error event */ }
        });

        es.onerror = () => {
            setRunning(false);
            es.close();
            esRef.current = null;
        };
    }, [workspace, running, runner, search]);

    const stopRun = useCallback(() => {
        esRef.current?.close();
        esRef.current = null;
        setRunning(false);
    }, []);

    // Clean up on unmount
    useEffect(() => () => esRef.current?.close(), []);

    // ── Filtered list ────────────────────────────────────────────────────────
    const visible = useMemo(() => {
        return tests.filter(t => {
            if (filter !== 'ALL' && t.status !== filter) return false;
            if (search) {
                const q = search.toLowerCase();
                if (!t.name.toLowerCase().includes(q) && !(t.file || '').toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [tests, filter, search]);

    // ── Styles ───────────────────────────────────────────────────────────────
    const t = {
        bg:      '#0d0f14',
        bg2:     '#161b22',
        border:  '#30363d',
        text:    '#c9d1d9',
        text3:   '#8b949e',
        accent:  '#ff6b35',
    };

    const S = {
        root: {
            display: 'flex', flexDirection: 'column', height: '100%',
            background: t.bg, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: t.text,
        },
        toolbar: {
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px',
            borderBottom: `1px solid ${t.border}`, flexShrink: 0, flexWrap: 'wrap',
        },
        btn: (active) => ({
            background: active ? 'rgba(255,107,53,0.15)' : 'rgba(255,107,53,0.08)',
            border: `1px solid ${active ? 'rgba(255,107,53,0.5)' : 'rgba(255,107,53,0.25)'}`,
            borderRadius: '4px', color: t.accent, cursor: 'pointer',
            padding: '3px 8px', fontSize: '10px', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '4px',
        }),
        stopBtn: {
            background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.35)',
            borderRadius: '4px', color: '#f85149', cursor: 'pointer',
            padding: '3px 8px', fontSize: '10px', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '4px',
        },
        filterBtn: (active) => ({
            background: active ? 'rgba(255,107,53,0.15)' : 'none',
            border: `1px solid ${active ? 'rgba(255,107,53,0.4)' : t.border}`,
            borderRadius: '4px', color: active ? t.accent : t.text3,
            cursor: 'pointer', padding: '2px 7px', fontSize: '9px', fontFamily: 'inherit',
        }),
        search: {
            background: t.bg2, border: `1px solid ${t.border}`, borderRadius: '4px',
            color: t.text, padding: '2px 7px', fontSize: '10px', fontFamily: 'inherit',
            outline: 'none', width: '140px',
        },
        select: {
            background: t.bg2, border: `1px solid ${t.border}`, borderRadius: '4px',
            color: t.text3, padding: '2px 4px', fontSize: '9px', fontFamily: 'inherit',
            outline: 'none', cursor: 'pointer',
        },
        summary: {
            display: 'flex', gap: '12px', padding: '5px 10px',
            borderBottom: `1px solid ${t.border}`, flexShrink: 0, alignItems: 'center',
        },
        list: {
            flex: 1, overflowY: 'auto', padding: '4px 0',
        },
        row: (status) => ({
            display: 'flex', flexDirection: 'column',
            padding: '3px 10px',
            borderBottom: `1px solid rgba(48,54,61,0.4)`,
            cursor: status === 'failed' ? 'pointer' : 'default',
        }),
        rowMain: {
            display: 'flex', alignItems: 'center', gap: '6px',
        },
        testName: {
            flex: 1, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        },
        testFile: {
            color: t.text3, fontSize: '9px', cursor: 'pointer', textDecoration: 'underline',
        },
        duration: {
            color: t.text3, fontSize: '9px', whiteSpace: 'nowrap',
        },
        errorBox: {
            marginTop: '4px', padding: '6px 8px',
            background: 'rgba(248,81,73,0.07)', border: '1px solid rgba(248,81,73,0.2)',
            borderRadius: '4px', color: '#f85149', fontSize: '10px',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        },
        empty: {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: t.text3, flexDirection: 'column', gap: '8px',
        },
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={S.root}>
            {/* Toolbar */}
            <div style={S.toolbar}>
                {running ? (
                    <button style={S.stopBtn} onClick={stopRun} title="Stop test run">
                        <Square size={10} /> Stop
                    </button>
                ) : (
                    <button style={S.btn(false)} onClick={startRun} title="Run tests">
                        <Play size={10} /> Run
                    </button>
                )}

                <input
                    style={S.search}
                    placeholder="Filter by name or file…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />

                {/* Status filter chips */}
                {FILTER_OPTS.map(f => (
                    <button key={f} style={S.filterBtn(filter === f)} onClick={() => setFilter(f)}>
                        {f}
                    </button>
                ))}

                {/* Runner selector */}
                <select style={S.select} value={runner} onChange={e => setRunner(e.target.value)} title="Test runner">
                    <option value="auto">Auto</option>
                    <option value="artisan">Artisan</option>
                    <option value="pest">Pest</option>
                    <option value="phpunit">PHPUnit</option>
                </select>

                {!running && tests.length > 0 && (
                    <button style={{ ...S.btn(false), marginLeft: 'auto' }} onClick={startRun} title="Re-run">
                        <RefreshCw size={10} /> Re-run
                    </button>
                )}
            </div>

            {/* Summary bar */}
            {summary && (
                <div style={S.summary}>
                    <span style={{ color: summary.ok ? '#3fb950' : '#f85149', fontWeight: 600 }}>
                        {summary.ok ? 'PASS' : 'FAIL'}
                    </span>
                    <span style={{ color: '#3fb950' }}>{summary.passed} passed</span>
                    {summary.failed  > 0 && <span style={{ color: '#f85149' }}>{summary.failed} failed</span>}
                    {summary.skipped > 0 && <span style={{ color: '#8b949e' }}>{summary.skipped} skipped</span>}
                    <span style={{ color: t.text3, marginLeft: 'auto' }}>{summary.total} total</span>
                </div>
            )}

            {/* Running indicator */}
            {running && !summary && (
                <div style={{ padding: '4px 10px', color: '#ff9f1c', fontSize: '10px', flexShrink: 0 }}>
                    <Clock size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    Running tests…
                </div>
            )}

            {/* Test list */}
            <div style={S.list} ref={listRef}>
                {visible.length === 0 && !running && (
                    <div style={S.empty}>
                        <Play size={24} color="#30363d" />
                        <span>{tests.length === 0 ? 'Press Run to execute tests' : 'No tests match filter'}</span>
                    </div>
                )}

                {visible.map((test, i) => {
                    const isExpanded = !!expanded[test.name];
                    const hasMessage = test.status === 'failed' && test.message;

                    return (
                        <div
                            key={test.name + i}
                            style={S.row(test.status)}
                            onClick={() => hasMessage && setExpanded(prev => ({ ...prev, [test.name]: !prev[test.name] }))}
                        >
                            <div style={S.rowMain}>
                                {STATUS_ICON[test.status] ?? STATUS_ICON.running}

                                <span style={S.testName} title={test.name}>
                                    {/* Show short class::method */}
                                    {test.name.includes('::') ? test.name.split('::').pop() : test.name}
                                </span>

                                {test.file && (
                                    <span
                                        style={S.testFile}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onJumpToFile?.(test.file, test.line || 1);
                                        }}
                                        title={test.file}
                                    >
                                        {test.file.split('/').pop()}
                                        {test.line ? `:${test.line}` : ''}
                                    </span>
                                )}

                                {test.duration_ms != null && (
                                    <span style={S.duration}>{test.duration_ms}ms</span>
                                )}
                            </div>

                            {/* Error detail */}
                            {isExpanded && hasMessage && (
                                <div style={S.errorBox}>
                                    {test.message}
                                    {test.details ? '\n\n' + test.details : ''}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
