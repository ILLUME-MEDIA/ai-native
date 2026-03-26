import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { RefreshCw, Search, Loader } from 'lucide-react';

const TYPE_COLORS = {
    FIXME: { bg: 'rgba(248,81,73,0.15)', border: 'rgba(248,81,73,0.4)', text: '#f85149' },
    TODO:  { bg: 'rgba(255,107,53,0.12)', border: 'rgba(255,107,53,0.35)', text: '#ff6b35' },
    HACK:  { bg: 'rgba(210,153,34,0.12)', border: 'rgba(210,153,34,0.4)', text: '#d29922' },
    NOTE:  { bg: 'rgba(88,166,255,0.12)', border: 'rgba(88,166,255,0.35)', text: '#58a6ff' },
    XXX:   { bg: 'rgba(188,140,255,0.12)', border: 'rgba(188,140,255,0.35)', text: '#bc8cff' },
};

const ALL_TYPES = ['FIXME', 'TODO', 'HACK', 'NOTE', 'XXX'];

export default function TodoTrackerPanel({ workspace, onJumpToFile }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [counts, setCounts] = useState({});

    const load = useCallback(async () => {
        if (!workspace?.id) return;
        setLoading(true);
        try {
            const resp = await axios.get(`/api/workspaces/${workspace.id}/todos`);
            const data = resp.data?.items || [];
            setItems(data);

            // Build counts per type
            const c = {};
            for (const item of data) {
                c[item.type] = (c[item.type] || 0) + 1;
            }
            setCounts(c);
        } catch {
            // non-fatal
        } finally {
            setLoading(false);
        }
    }, [workspace?.id]);

    useEffect(() => {
        load();
    }, [load]);

    const filtered = items.filter(item => {
        if (filter !== 'ALL' && item.type !== filter) return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                item.file.toLowerCase().includes(q) ||
                item.content.toLowerCase().includes(q)
            );
        }
        return true;
    });

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            background: '#0d0f14', color: '#c9d1d9',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
        }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 10px', flexShrink: 0,
                borderBottom: '1px solid #1c2128',
                background: '#0d0f14',
            }}>
                {/* Filter chips */}
                <button
                    onClick={() => setFilter('ALL')}
                    style={{
                        padding: '2px 7px', borderRadius: '10px', border: 'none',
                        cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit',
                        background: filter === 'ALL' ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.05)',
                        color: filter === 'ALL' ? '#ff6b35' : '#8b949e',
                        outline: filter === 'ALL' ? '1px solid rgba(255,107,53,0.3)' : '1px solid transparent',
                    }}
                >
                    ALL {items.length > 0 ? `(${items.length})` : ''}
                </button>
                {ALL_TYPES.filter(t => counts[t]).map(type => {
                    const c = TYPE_COLORS[type] || TYPE_COLORS.TODO;
                    const active = filter === type;
                    return (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            style={{
                                padding: '2px 7px', borderRadius: '10px', border: 'none',
                                cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit',
                                background: active ? c.bg : 'rgba(255,255,255,0.05)',
                                color: active ? c.text : '#8b949e',
                                outline: active ? `1px solid ${c.border}` : '1px solid transparent',
                            }}
                        >
                            {type} ({counts[type]})
                        </button>
                    );
                })}

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Search */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: '#161b22', border: '1px solid #1c2128',
                        borderRadius: '4px', padding: '2px 7px',
                    }}>
                        <Search size={11} style={{ color: '#484f58', flexShrink: 0 }} />
                        <input
                            type="text"
                            placeholder="filter..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                background: 'none', border: 'none', outline: 'none',
                                color: '#c9d1d9', fontSize: '10px', fontFamily: 'inherit',
                                width: '100px',
                            }}
                        />
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={load}
                        disabled={loading}
                        title="Rescan workspace"
                        style={{
                            background: 'none', border: 'none', cursor: loading ? 'wait' : 'pointer',
                            color: '#484f58', padding: '2px', display: 'flex', alignItems: 'center',
                        }}
                    >
                        <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading && items.length === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                        <Loader size={16} style={{ color: '#484f58' }} className="spinning" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{
                        padding: '24px', textAlign: 'center',
                        fontSize: '11px', color: '#484f58',
                    }}>
                        {items.length === 0 ? 'No TODO / FIXME comments found in workspace.' : 'No matches for current filter.'}
                    </div>
                ) : (
                    filtered.map((item, idx) => {
                        const c = TYPE_COLORS[item.type] || TYPE_COLORS.TODO;
                        const fileName = item.file.split('/').pop();
                        const dirPath = item.file.includes('/')
                            ? item.file.substring(0, item.file.lastIndexOf('/'))
                            : '';
                        return (
                            <div
                                key={idx}
                                onClick={() => onJumpToFile?.(item.file, item.line)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '5px 10px',
                                    borderBottom: '1px solid rgba(28,33,40,0.6)',
                                    cursor: 'pointer',
                                    transition: 'background 0.1s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                {/* Type badge */}
                                <span style={{
                                    flexShrink: 0,
                                    padding: '1px 5px', borderRadius: '8px',
                                    fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em',
                                    background: c.bg, color: c.text,
                                    border: `1px solid ${c.border}`,
                                    minWidth: '40px', textAlign: 'center',
                                }}>
                                    {item.type}
                                </span>

                                {/* File + line */}
                                <span style={{
                                    flexShrink: 0, minWidth: '0', maxWidth: '200px',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    fontSize: '10px',
                                }}>
                                    <span style={{ color: '#c9d1d9' }} title={item.file}>{fileName}</span>
                                    <span style={{ color: '#484f58' }}>:{item.line}</span>
                                    {dirPath && (
                                        <span style={{
                                            display: 'block', fontSize: '9px', color: '#484f58',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {dirPath}
                                        </span>
                                    )}
                                </span>

                                {/* Comment content */}
                                <span style={{
                                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap', color: '#8b949e', fontSize: '11px',
                                }} title={item.content}>
                                    {item.content || <span style={{ color: '#484f58', fontStyle: 'italic' }}>no description</span>}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
