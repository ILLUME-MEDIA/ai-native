import React, { useState, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import axios from 'axios';
import { X, Clock, RotateCcw, Loader } from 'lucide-react';
import { toast } from 'react-toastify';

const LANG_MAP = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    php: 'php', py: 'python', rb: 'ruby', java: 'java', go: 'go', rs: 'rust',
    css: 'css', scss: 'scss', html: 'html', json: 'json', md: 'markdown',
    yaml: 'yaml', yml: 'yaml', xml: 'xml', sh: 'shell', bash: 'shell', sql: 'sql',
};

function detectLang(filePath) {
    const ext = filePath?.split('.').pop()?.toLowerCase();
    return LANG_MAP[ext] || 'plaintext';
}

function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

export default function FileHistoryPanel({ workspace, activeTab, onClose, onRestore }) {
    const [snapshots, setSnapshots] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [selectedContent, setSelectedContent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [restoring, setRestoring] = useState(false);

    useEffect(() => {
        if (workspace?.id && activeTab?.path) {
            loadSnapshots();
        }
    }, [workspace?.id, activeTab?.path]);

    async function loadSnapshots() {
        setLoading(true);
        setSelectedId(null);
        setSelectedContent(null);
        try {
            const resp = await axios.get(`/api/workspaces/${workspace.id}/files/snapshots`, {
                params: { path: activeTab.path },
            });
            setSnapshots(resp.data || []);
        } catch {
            toast.error('Failed to load file history');
        } finally {
            setLoading(false);
        }
    }

    async function selectSnapshot(id) {
        if (selectedId === id) return;
        setSelectedId(id);
        setSelectedContent(null);
        try {
            const resp = await axios.get(`/api/workspaces/${workspace.id}/files/snapshots/${id}`);
            setSelectedContent(resp.data.content ?? '');
        } catch {
            toast.error('Failed to load snapshot');
        }
    }

    async function handleRestore() {
        if (selectedId == null || selectedContent == null) return;
        setRestoring(true);
        try {
            const resp = await axios.post(
                `/api/workspaces/${workspace.id}/files/snapshots/${selectedId}/restore`
            );
            onRestore(resp.data.content);
            toast.success('Restored from snapshot');
            onClose();
        } catch {
            toast.error('Failed to restore snapshot');
        } finally {
            setRestoring(false);
        }
    }

    const lang = detectLang(activeTab?.path || '');
    const fileName = activeTab?.path?.split('/').pop() || '';

    return (
        <div style={{
            position: 'absolute', inset: 0, zIndex: 200,
            display: 'flex', flexDirection: 'column',
            background: '#0d0f14',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '0 10px', height: '34px', flexShrink: 0,
                borderBottom: '1px solid #1c2128', background: '#161b22',
            }}>
                <Clock size={12} style={{ color: '#ff6b35', flexShrink: 0 }} />
                <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px', color: '#c9d1d9', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    File History — {fileName}
                </span>

                {selectedId != null && selectedContent != null && (
                    <button
                        onClick={handleRestore}
                        disabled={restoring}
                        style={{
                            marginLeft: 'auto',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', borderRadius: '4px',
                            background: 'rgba(255,107,53,0.15)',
                            border: '1px solid rgba(255,107,53,0.35)',
                            color: '#ff6b35', cursor: restoring ? 'wait' : 'pointer',
                            fontSize: '11px', fontFamily: 'inherit', flexShrink: 0,
                        }}
                    >
                        {restoring
                            ? <Loader size={10} className="spinning" />
                            : <RotateCcw size={10} />
                        }
                        Restore
                    </button>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginLeft: selectedId != null ? '6px' : 'auto',
                        background: 'none', border: 'none',
                        color: '#8b949e', cursor: 'pointer', padding: '2px',
                        display: 'flex', alignItems: 'center', flexShrink: 0,
                    }}
                    title="Close history"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Timeline sidebar */}
                <div style={{
                    width: '176px', flexShrink: 0,
                    borderRight: '1px solid #1c2128',
                    overflowY: 'auto', background: '#0d0f14',
                }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                            <Loader size={16} style={{ color: '#484f58' }} className="spinning" />
                        </div>
                    ) : snapshots.length === 0 ? (
                        <div style={{
                            padding: '20px 14px', fontSize: '11px',
                            color: '#484f58', textAlign: 'center', lineHeight: 1.6,
                        }}>
                            No history yet.
                            <br />
                            <span style={{ fontSize: '10px' }}>
                                Snapshots are saved each time you save a file.
                            </span>
                        </div>
                    ) : (
                        snapshots.map((snap, idx) => (
                            <div
                                key={snap.id}
                                onClick={() => selectSnapshot(snap.id)}
                                style={{
                                    padding: '8px 12px',
                                    borderBottom: '1px solid #1c2128',
                                    cursor: 'pointer',
                                    background: selectedId === snap.id
                                        ? 'rgba(255,107,53,0.08)' : 'transparent',
                                    borderLeft: selectedId === snap.id
                                        ? '2px solid #ff6b35' : '2px solid transparent',
                                }}
                            >
                                <div style={{
                                    fontSize: '11px',
                                    color: selectedId === snap.id ? '#ff6b35' : '#c9d1d9',
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}>
                                    {idx === 0 ? '● latest' : `● ${timeAgo(snap.created_at)}`}
                                </div>
                                <div style={{ fontSize: '10px', color: '#484f58', marginTop: '2px' }}>
                                    {new Date(snap.created_at).toLocaleString([], {
                                        month: 'short', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Diff pane */}
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#161b22' }}>
                    {selectedId == null ? (
                        <div style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            height: '100%', gap: '10px', color: '#484f58',
                        }}>
                            <Clock size={36} />
                            <p style={{ fontSize: '12px', margin: 0 }}>
                                Select a snapshot to compare
                            </p>
                        </div>
                    ) : selectedContent == null ? (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            height: '100%',
                        }}>
                            <Loader size={20} style={{ color: '#484f58' }} className="spinning" />
                        </div>
                    ) : (
                        <>
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1,
                                display: 'flex', alignItems: 'center',
                                padding: '2px 12px',
                                background: '#0d0f14',
                                borderBottom: '1px solid #1c2128',
                                fontSize: '10px', color: '#484f58',
                                fontFamily: "'JetBrains Mono', monospace",
                                gap: '20px',
                            }}>
                                <span>← snapshot</span>
                                <span style={{ marginLeft: 'auto' }}>current →</span>
                            </div>
                            <div style={{ position: 'absolute', top: '22px', bottom: 0, left: 0, right: 0 }}>
                                <DiffEditor
                                    height="100%"
                                    language={lang}
                                    original={selectedContent}
                                    modified={activeTab?.content || ''}
                                    theme="vs-dark"
                                    options={{
                                        readOnly: true,
                                        renderSideBySide: true,
                                        minimap: { enabled: false },
                                        fontSize: 12,
                                        scrollBeyondLastLine: false,
                                        fontFamily: "'JetBrains Mono', monospace",
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
