import React, { useRef, useEffect, useState } from 'react';

function getHashColor(hash) {
    const hue = parseInt(hash.substring(0, 8), 16) % 360;
    return `hsl(${hue}, 50%, 58%)`;
}

function formatRelativeDate(timestamp) {
    if (!timestamp) return '';
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    if (diff < 2592000) return `${Math.floor(diff / 604800)}w`;
    return new Date(timestamp * 1000).toLocaleDateString();
}

function truncate(str, n) {
    if (!str) return '';
    return str.length > n ? str.substring(0, n - 1) + '…' : str;
}

export default function BlameGutter({ blameData, editorRef, lineHeight = 19 }) {
    const gutterRef = useRef(null);
    const [popover, setPopover] = useState(null);

    useEffect(() => {
        const editor = editorRef?.current;
        if (!editor) return;

        const disposable = editor.onDidScrollChange(() => {
            if (gutterRef.current) {
                gutterRef.current.scrollTop = editor.getScrollTop();
            }
        });

        // Sync immediately on mount
        if (gutterRef.current) {
            gutterRef.current.scrollTop = editor.getScrollTop();
        }

        return () => disposable.dispose();
    }, [editorRef?.current]);

    // Close popover on outside click
    useEffect(() => {
        if (popover === null) return;
        function handler() { setPopover(null); }
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, [popover]);

    if (!blameData || blameData.length === 0) return null;

    return (
        <div style={{ position: 'relative', flexShrink: 0, width: '200px' }}>
            <div
                ref={gutterRef}
                style={{
                    width: '200px',
                    height: '100%',
                    overflow: 'hidden',
                    background: '#0d0f14',
                    borderRight: '1px solid #1c2128',
                    fontFamily: "'JetBrains Mono', Consolas, monospace",
                    fontSize: '11px',
                }}
            >
                {blameData.map((entry, idx) => (
                    <div
                        key={idx}
                        onClick={e => { e.stopPropagation(); setPopover(popover === idx ? null : idx); }}
                        style={{
                            height: `${lineHeight}px`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '0 6px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            background: popover === idx ? 'rgba(255,107,53,0.1)' : 'transparent',
                            boxSizing: 'border-box',
                        }}
                        onMouseEnter={e => { if (popover !== idx) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={e => { if (popover !== idx) e.currentTarget.style.background = 'transparent'; }}
                    >
                        <span style={{
                            color: getHashColor(entry.hash),
                            fontWeight: '600',
                            letterSpacing: '-0.02em',
                            flexShrink: 0,
                            fontSize: '10px',
                            fontFamily: 'monospace',
                        }}>
                            {entry.hash.substring(0, 7)}
                        </span>
                        <span style={{ color: '#484f58', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontSize: '10px' }}>
                            {truncate(entry.author, 10)}
                        </span>
                        <span style={{ color: '#30363d', flexShrink: 0, fontSize: '9px' }}>
                            {formatRelativeDate(entry.timestamp)}
                        </span>
                    </div>
                ))}
            </div>

            {popover !== null && blameData[popover] && (
                <div
                    style={{
                        position: 'absolute',
                        top: `${Math.min(popover * lineHeight, blameData.length * lineHeight - 130)}px`,
                        left: '205px',
                        background: '#161b22',
                        border: '1px solid #30363d',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        zIndex: 200,
                        minWidth: '220px',
                        maxWidth: '300px',
                        fontSize: '11px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={() => setPopover(null)}
                        style={{ position: 'absolute', top: '4px', right: '6px', background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '2px' }}
                    >
                        ×
                    </button>
                    <div style={{ color: getHashColor(blameData[popover].hash), fontWeight: '600', marginBottom: '6px', fontFamily: 'monospace', fontSize: '12px' }}>
                        {blameData[popover].hash.substring(0, 12)}
                    </div>
                    <div style={{ color: '#c9d1d9', marginBottom: '3px', fontWeight: '500' }}>{blameData[popover].author}</div>
                    {blameData[popover].email && (
                        <div style={{ color: '#8b949e', fontSize: '10px', marginBottom: '3px' }}>{blameData[popover].email}</div>
                    )}
                    {blameData[popover].timestamp && (
                        <div style={{ color: '#8b949e', fontSize: '10px', marginBottom: '8px' }}>
                            {new Date(blameData[popover].timestamp * 1000).toLocaleString()}
                        </div>
                    )}
                    {blameData[popover].summary && (
                        <div style={{ color: '#c9d1d9', fontSize: '11px', fontStyle: 'italic', borderTop: '1px solid #1c2128', paddingTop: '7px', lineHeight: 1.4 }}>
                            {blameData[popover].summary}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
