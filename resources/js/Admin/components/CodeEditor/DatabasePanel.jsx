import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Database, Table2, Play, ChevronRight, RefreshCw, Copy } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const PAGE_SIZE = 50;

export default function DatabasePanel({ workspace }) {
    const [tables, setTables]       = useState([]);
    const [driver, setDriver]       = useState('');
    const [dbName, setDbName]       = useState('');
    const [loading, setLoading]     = useState(false);

    // Table browser state
    const [activeTable, setActiveTable]   = useState(null);
    const [columns, setColumns]           = useState([]);
    const [rows, setRows]                 = useState([]);
    const [total, setTotal]               = useState(0);
    const [page, setPage]                 = useState(1);
    const [pages, setPages]               = useState(1);
    const [sortCol, setSortCol]           = useState('id');
    const [sortDir, setSortDir]           = useState('DESC');
    const [rowsLoading, setRowsLoading]   = useState(false);

    // Query console state
    const [sql, setSql]           = useState('SELECT * FROM ');
    const [queryRows, setQueryRows] = useState(null);
    const [queryErr, setQueryErr]   = useState('');
    const [queryMs, setQueryMs]     = useState(null);
    const [querying, setQuerying]   = useState(false);

    // View: 'browser' | 'query'
    const [view, setView] = useState('browser');

    const sqlRef = useRef(null);

    // ── Load tables ───────────────────────────────────────────────────────────
    const loadTables = useCallback(async () => {
        if (!workspace) return;
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/workspaces/${workspace.id}/db/tables`);
            setTables(data.tables || []);
            setDriver(data.driver || '');
            setDbName(data.database || '');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to load tables');
        } finally {
            setLoading(false);
        }
    }, [workspace]);

    useEffect(() => { loadTables(); }, [loadTables]);

    // ── Load columns + rows ───────────────────────────────────────────────────
    const loadTable = useCallback(async (tableName, pg = 1, sc = sortCol, sd = sortDir) => {
        if (!workspace) return;
        setRowsLoading(true);
        try {
            const [colRes, rowRes] = await Promise.all([
                activeTable !== tableName
                    ? axios.get(`/api/workspaces/${workspace.id}/db/tables/${tableName}/columns`)
                    : Promise.resolve(null),
                axios.get(`/api/workspaces/${workspace.id}/db/tables/${tableName}/rows`, {
                    params: { page: pg, per_page: PAGE_SIZE, sort: sc, dir: sd },
                }),
            ]);

            if (colRes) setColumns(colRes.data.columns || []);
            setRows(rowRes.data.rows || []);
            setTotal(rowRes.data.total || 0);
            setPage(rowRes.data.page || 1);
            setPages(rowRes.data.pages || 1);
            setActiveTable(tableName);
            if (tableName !== activeTable) {
                setSql(`SELECT * FROM ${tableName} `);
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to load table data');
        } finally {
            setRowsLoading(false);
        }
    }, [workspace, activeTable, sortCol, sortDir]);

    const handleSort = useCallback((col) => {
        const newDir = sortCol === col && sortDir === 'DESC' ? 'ASC' : 'DESC';
        setSortCol(col);
        setSortDir(newDir);
        if (activeTable) loadTable(activeTable, 1, col, newDir);
    }, [sortCol, sortDir, activeTable, loadTable]);

    // ── Run query ─────────────────────────────────────────────────────────────
    const runQuery = useCallback(async () => {
        if (!workspace || !sql.trim() || querying) return;
        setQuerying(true);
        setQueryErr('');
        setQueryRows(null);
        try {
            const { data } = await axios.post(`/api/workspaces/${workspace.id}/db/query`, { sql });
            setQueryRows(data.rows || []);
            setQueryMs(data.elapsed_ms);
        } catch (err) {
            setQueryErr(err.response?.data?.error || 'Query failed');
        } finally {
            setQuerying(false);
        }
    }, [workspace, sql, querying]);

    // ── Derive column keys from rows ───────────────────────────────────────────
    const queryColumns = useMemo(() => {
        if (!queryRows || queryRows.length === 0) return [];
        return Object.keys(queryRows[0]);
    }, [queryRows]);

    // ── Styles ────────────────────────────────────────────────────────────────
    const t = { bg: '#0d0f14', bg2: '#161b22', border: '#30363d', text: '#c9d1d9', text3: '#8b949e', accent: '#ff6b35' };

    const tabBtn = (active) => ({
        background: 'none', border: 'none', cursor: 'pointer',
        color: active ? t.accent : t.text3,
        borderBottom: active ? `2px solid ${t.accent}` : '2px solid transparent',
        padding: '4px 12px', fontSize: '9px', fontWeight: '600', letterSpacing: '0.08em', fontFamily: 'inherit',
    });

    const thStyle = {
        padding: '4px 8px', background: '#161b22', color: t.text3, fontWeight: 600,
        borderBottom: `1px solid ${t.border}`, borderRight: `1px solid ${t.border}`,
        fontSize: '9px', textAlign: 'left', whiteSpace: 'nowrap', cursor: 'pointer',
        letterSpacing: '0.04em', userSelect: 'none', position: 'sticky', top: 0,
    };

    const tdStyle = {
        padding: '3px 8px', borderBottom: `1px solid rgba(48,54,61,0.5)`,
        borderRight: `1px solid rgba(48,54,61,0.3)`, fontSize: '10px',
        maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    };

    const cellColor = (v) => {
        if (v === null || v === undefined) return '#484f58';
        if (typeof v === 'number') return '#79c0ff';
        if (typeof v === 'boolean') return v ? '#3fb950' : '#f85149';
        return t.text;
    };

    const cellDisplay = (v) => {
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', height: '100%', background: t.bg, fontFamily: "'JetBrains Mono', monospace", color: t.text, fontSize: '11px' }}>

            {/* ── Left sidebar: table list ── */}
            <div style={{ width: '200px', flexShrink: 0, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '6px 10px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '9px', color: t.text3, letterSpacing: '0.08em' }}>DATABASE</div>
                        <div style={{ fontSize: '10px', color: t.accent }}>{dbName}</div>
                    </div>
                    <button onClick={loadTables} title="Refresh" style={{ background: 'none', border: 'none', color: t.text3, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <RefreshCw size={11} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading && <div style={{ padding: '8px 10px', color: t.text3, fontSize: '10px' }}>Loading…</div>}
                    {!loading && tables.length === 0 && <div style={{ padding: '8px 10px', color: t.text3, fontSize: '10px' }}>No tables found</div>}
                    {tables.map(tbl => (
                        <div
                            key={tbl.name}
                            onClick={() => { loadTable(tbl.name); setView('browser'); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '4px 8px', cursor: 'pointer',
                                background: activeTable === tbl.name ? 'rgba(255,107,53,0.12)' : 'none',
                                borderLeft: activeTable === tbl.name ? `2px solid ${t.accent}` : '2px solid transparent',
                                borderBottom: `1px solid rgba(48,54,61,0.4)`,
                            }}
                            onMouseEnter={e => { if (activeTable !== tbl.name) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                            onMouseLeave={e => { if (activeTable !== tbl.name) e.currentTarget.style.background = 'none'; }}
                        >
                            <Table2 size={10} color={activeTable === tbl.name ? t.accent : t.text3} />
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px' }}>{tbl.name}</span>
                            <span style={{ color: '#484f58', fontSize: '9px' }}>{tbl.row_count > 999 ? (tbl.row_count / 1000).toFixed(1) + 'k' : tbl.row_count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Main area ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* View tabs */}
                <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}`, flexShrink: 0, alignItems: 'center' }}>
                    <button style={tabBtn(view === 'browser')} onClick={() => setView('browser')}>
                        TABLE BROWSER
                    </button>
                    <button style={tabBtn(view === 'query')} onClick={() => setView('query')}>
                        QUERY CONSOLE
                    </button>
                    {activeTable && (
                        <span style={{ marginLeft: 'auto', paddingRight: '10px', color: t.text3, fontSize: '9px' }}>
                            {activeTable} · {total} rows
                        </span>
                    )}
                </div>

                {/* Table browser */}
                {view === 'browser' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {!activeTable && (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: t.text3 }}>
                                <Database size={28} color="#30363d" />
                                <span>Select a table to browse data</span>
                            </div>
                        )}

                        {activeTable && (
                            <>
                                {/* Data grid */}
                                <div style={{ flex: 1, overflow: 'auto' }}>
                                    {rowsLoading ? (
                                        <div style={{ padding: '12px', color: t.text3, fontSize: '10px' }}>Loading rows…</div>
                                    ) : (
                                        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
                                            <thead>
                                                <tr>
                                                    {columns.map(col => (
                                                        <th
                                                            key={col.name}
                                                            style={{ ...thStyle, color: sortCol === col.name ? t.accent : t.text3 }}
                                                            onClick={() => handleSort(col.name)}
                                                            title={`${col.type}${col.nullable ? ' NULL' : ' NOT NULL'}${col.key === 'PRI' ? ' PRIMARY KEY' : ''}`}
                                                        >
                                                            {col.key === 'PRI' && <span style={{ color: '#ff9f1c', marginRight: '3px' }}>🔑</span>}
                                                            {col.name}
                                                            {sortCol === col.name && <span style={{ marginLeft: '3px' }}>{sortDir === 'DESC' ? '↓' : '↑'}</span>}
                                                            <span style={{ color: '#484f58', marginLeft: '4px', fontWeight: 400 }}>{col.type}</span>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.map((row, i) => (
                                                    <tr key={i} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                                        {columns.map(col => {
                                                            const v = row[col.name];
                                                            return (
                                                                <td key={col.name} style={{ ...tdStyle, color: cellColor(v) }} title={cellDisplay(v)}>
                                                                    {cellDisplay(v)}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Pagination */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
                                    <button disabled={page <= 1} onClick={() => loadTable(activeTable, page - 1)}
                                        style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: '3px', color: t.text3, cursor: page > 1 ? 'pointer' : 'default', padding: '2px 8px', fontSize: '9px', fontFamily: 'inherit', opacity: page <= 1 ? 0.4 : 1 }}>
                                        ← Prev
                                    </button>
                                    <span style={{ color: t.text3, fontSize: '9px' }}>Page {page} of {pages}</span>
                                    <button disabled={page >= pages} onClick={() => loadTable(activeTable, page + 1)}
                                        style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: '3px', color: t.text3, cursor: page < pages ? 'pointer' : 'default', padding: '2px 8px', fontSize: '9px', fontFamily: 'inherit', opacity: page >= pages ? 0.4 : 1 }}>
                                        Next →
                                    </button>
                                    <span style={{ marginLeft: 'auto', color: '#484f58', fontSize: '9px' }}>{total} total rows</span>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Query console */}
                {view === 'query' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* SQL input */}
                        <div style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
                            <textarea
                                ref={sqlRef}
                                value={sql}
                                onChange={e => setSql(e.target.value)}
                                onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runQuery(); } }}
                                style={{
                                    width: '100%', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box',
                                    background: t.bg2, border: `1px solid ${t.border}`, borderRadius: '4px',
                                    color: t.text, padding: '6px 8px', fontSize: '11px', fontFamily: 'inherit',
                                    outline: 'none', marginBottom: '6px',
                                }}
                                placeholder="SELECT * FROM users WHERE id = 1"
                                spellCheck={false}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    onClick={runQuery}
                                    disabled={querying || !sql.trim()}
                                    style={{
                                        background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.4)',
                                        borderRadius: '4px', color: t.accent, cursor: 'pointer',
                                        padding: '4px 12px', fontSize: '10px', fontFamily: 'inherit',
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                        opacity: querying || !sql.trim() ? 0.5 : 1,
                                    }}
                                >
                                    <Play size={10} /> {querying ? 'Running…' : 'Run'}
                                </button>
                                <span style={{ color: '#484f58', fontSize: '9px' }}>Ctrl+Enter</span>
                                {queryMs !== null && <span style={{ color: t.text3, fontSize: '9px', marginLeft: 'auto' }}>{queryMs}ms · {queryRows?.length ?? 0} rows</span>}
                            </div>
                        </div>

                        {/* Query results */}
                        <div style={{ flex: 1, overflow: 'auto' }}>
                            {queryErr && (
                                <div style={{ margin: '8px 10px', padding: '8px', background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.25)', borderRadius: '4px', color: '#f85149', fontSize: '10px', whiteSpace: 'pre-wrap' }}>
                                    {queryErr}
                                </div>
                            )}

                            {queryRows && queryRows.length === 0 && (
                                <div style={{ padding: '12px', color: t.text3, fontSize: '10px' }}>Query returned no rows.</div>
                            )}

                            {queryRows && queryRows.length > 0 && (
                                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
                                    <thead>
                                        <tr>
                                            {queryColumns.map(col => (
                                                <th key={col} style={thStyle}>{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {queryRows.map((row, i) => (
                                            <tr key={i} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                                {queryColumns.map(col => {
                                                    const v = row[col];
                                                    return (
                                                        <td key={col} style={{ ...tdStyle, color: cellColor(v) }} title={cellDisplay(v)}>
                                                            {cellDisplay(v)}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
