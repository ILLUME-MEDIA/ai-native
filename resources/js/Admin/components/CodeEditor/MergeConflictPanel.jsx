import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { GitMerge, Check, X, ChevronRight, AlertTriangle, Zap, Loader } from 'lucide-react';
import { toast } from 'react-toastify';

// ── Parser ────────────────────────────────────────────────────────────────────

function parseConflicts(content) {
    // Matches: <<<<<<< label\ncurrent\n=======\nincoming\n>>>>>>> label
    const regex = /<<<<<<< ([^\n]*)\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> ([^\n]*)/g;
    const conflicts = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        conflicts.push({
            full: match[0],
            startIdx: match.index,
            currentLabel: match[1].trim(),
            current: match[2],
            incoming: match[3],
            incomingLabel: match[4].trim(),
        });
    }
    return conflicts;
}

function applyResolutions(content, conflicts, resolutions) {
    let result = content;
    // Apply in reverse so earlier indices stay valid
    for (let i = conflicts.length - 1; i >= 0; i--) {
        const c = conflicts[i];
        const r = resolutions[i];
        let replacement = '';
        if (r === 'current')        replacement = c.current;
        else if (r === 'incoming')  replacement = c.incoming;
        else if (r === 'both')      replacement = c.current + '\n' + c.incoming;
        else if (r?.type === 'ai')  replacement = r.content;
        result = result.slice(0, c.startIdx) + replacement + result.slice(c.startIdx + c.full.length);
    }
    return result;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CodeBlock({ label, code, color, dim }) {
    return (
        <div style={{
            borderLeft: `3px solid ${color}`,
            marginBottom: '4px',
            opacity: dim ? 0.4 : 1,
            transition: 'opacity 0.2s',
        }}>
            <div style={{
                background: `${color}18`,
                padding: '2px 8px',
                fontSize: '9px',
                color: color,
                fontWeight: '600',
                letterSpacing: '0.06em',
                fontFamily: 'inherit',
            }}>
                {label}
            </div>
            <pre style={{
                margin: 0,
                padding: '6px 10px',
                fontSize: '11px',
                color: '#c9d1d9',
                background: '#0d0f14',
                overflowX: 'auto',
                fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                lineHeight: '1.5',
            }}>
                {code || <span style={{ color: '#484f58', fontStyle: 'italic' }}>(empty)</span>}
            </pre>
        </div>
    );
}

function ConflictCard({ conflict, index, resolution, onResolve }) {
    const resolved = resolution !== null && resolution !== undefined;
    const S = {
        btn: (id) => ({
            background: resolution === id ? (id === 'current' ? 'rgba(46,160,67,0.2)' : id === 'incoming' ? 'rgba(88,166,255,0.2)' : 'rgba(210,153,34,0.2)') : '#0d0f14',
            border: `1px solid ${resolution === id ? (id === 'current' ? '#3fb950' : id === 'incoming' ? '#58a6ff' : '#d29922') : '#30363d'}`,
            borderRadius: '4px',
            color: resolution === id ? (id === 'current' ? '#3fb950' : id === 'incoming' ? '#58a6ff' : '#d29922') : '#8b949e',
            cursor: 'pointer',
            fontSize: '10px',
            fontFamily: 'inherit',
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            transition: 'all 0.15s',
            flexShrink: 0,
        }),
    };

    return (
        <div style={{
            border: resolved ? '1px solid rgba(46,160,67,0.2)' : '1px solid #1c2128',
            borderRadius: '8px',
            overflow: 'hidden',
            background: resolved ? 'rgba(46,160,67,0.04)' : '#161b22',
            transition: 'all 0.2s',
        }}>
            {/* Card header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderBottom: '1px solid #1c2128',
                background: '#0d0f14',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: resolved ? '#3fb950' : '#c9d1d9' }}>
                    {resolved ? <Check size={12} style={{ color: '#3fb950' }} /> : <ChevronRight size={12} style={{ color: '#8b949e' }} />}
                    <span style={{ fontWeight: '600' }}>Conflict #{index + 1}</span>
                    {resolved && <span style={{ fontSize: '10px', color: '#3fb950' }}>({resolution?.type === 'ai' ? 'AI resolved' : resolution === 'current' ? 'Current' : resolution === 'incoming' ? 'Incoming' : 'Both'} accepted)</span>}
                </div>
                {resolved && (
                    <button
                        onClick={() => onResolve(null)}
                        title="Undo resolution"
                        style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', padding: '1px', display: 'flex', alignItems: 'center' }}
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Conflict content */}
            <div style={{ padding: '8px' }}>
                <CodeBlock
                    label={`CURRENT  (HEAD / ${conflict.currentLabel})`}
                    code={conflict.current}
                    color="#3fb950"
                    dim={resolved && resolution !== 'current' && resolution !== 'both'}
                />
                <CodeBlock
                    label={`INCOMING (${conflict.incomingLabel})`}
                    code={conflict.incoming}
                    color="#58a6ff"
                    dim={resolved && resolution !== 'incoming' && resolution !== 'both'}
                />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '6px', padding: '0 8px 8px' }}>
                <button style={S.btn('current')} onClick={() => onResolve('current')}>
                    <Check size={10} /> Accept Current
                </button>
                <button style={S.btn('both')} onClick={() => onResolve('both')}>
                    Accept Both
                </button>
                <button style={S.btn('incoming')} onClick={() => onResolve('incoming')}>
                    <Check size={10} /> Accept Incoming
                </button>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MergeConflictPanel({ file, workspace, onResolved, onClose }) {
    const conflicts = useMemo(() => parseConflicts(file?.content || ''), [file?.content]);
    const [resolutions, setResolutions] = useState({});
    const [aiResolving, setAiResolving] = useState(false);

    const resolvedCount = Object.values(resolutions).filter(r => r !== null && r !== undefined).length;
    const allResolved = resolvedCount === conflicts.length && conflicts.length > 0;

    function handleResolve(index, choice) {
        setResolutions(prev => ({ ...prev, [index]: choice }));
    }

    async function handleAiResolveAll() {
        if (!workspace?.id || aiResolving) return;
        const unresolved = conflicts
            .map((c, i) => ({ ...c, index: i }))
            .filter(c => resolutions[c.index] === null || resolutions[c.index] === undefined);

        if (unresolved.length === 0) {
            toast.info('All conflicts already resolved');
            return;
        }

        setAiResolving(true);
        const content = file.content;
        const lines = content.split('\n');

        try {
            const newResolutions = { ...resolutions };

            for (const c of unresolved) {
                // Extract surrounding context (up to 15 lines before/after)
                const startLine = content.slice(0, c.startIdx).split('\n').length - 1;
                const endLine = content.slice(0, c.startIdx + c.full.length).split('\n').length - 1;
                const contextBefore = lines.slice(Math.max(0, startLine - 15), startLine).join('\n');
                const contextAfter  = lines.slice(endLine + 1, endLine + 16).join('\n');

                const resp = await axios.post(`/api/workspaces/${workspace.id}/ai/resolve-conflict`, {
                    ours:           c.current,
                    theirs:         c.incoming,
                    context_before: contextBefore,
                    context_after:  contextAfter,
                    file_path:      file.path || file.name,
                });

                // Store AI result as a special 'ai' resolution value
                newResolutions[c.index] = { type: 'ai', content: resp.data.resolved };
            }

            setResolutions(newResolutions);
            toast.success(`AI resolved ${unresolved.length} conflict${unresolved.length > 1 ? 's' : ''}`);
        } catch (e) {
            toast.error(e.response?.data?.error || 'AI resolution failed');
        } finally {
            setAiResolving(false);
        }
    }

    function handleApply() {
        if (!allResolved) return;
        const newContent = applyResolutions(file.content, conflicts, resolutions);
        onResolved(newContent);
    }

    if (conflicts.length === 0) {
        return (
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: '#484f58',
                background: '#161b22',
                fontFamily: "'JetBrains Mono', monospace",
            }}>
                <Check size={48} style={{ color: '#3fb950' }} />
                <h4 style={{ margin: 0, fontSize: '14px', color: '#8b949e' }}>No merge conflicts found</h4>
                <button
                    onClick={onClose}
                    style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: '4px', color: '#ff6b35', cursor: 'pointer', padding: '4px 12px', fontSize: '11px', fontFamily: 'inherit' }}
                >
                    Back to Editor
                </button>
            </div>
        );
    }

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#161b22',
            fontFamily: "'JetBrains Mono', monospace",
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px',
                borderBottom: '1px solid #1c2128',
                background: '#0d0f14',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#c9d1d9' }}>
                    <GitMerge size={14} style={{ color: '#d29922' }} />
                    <span style={{ fontWeight: '600' }}>Merge Conflicts</span>
                    <span style={{ color: '#8b949e' }}>— {file?.name || file?.path?.split('/').pop()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '10px', color: resolvedCount === conflicts.length ? '#3fb950' : '#8b949e' }}>
                        {resolvedCount}/{conflicts.length} resolved
                    </span>
                    {workspace && (
                        <button
                            onClick={handleAiResolveAll}
                            disabled={aiResolving || allResolved}
                            style={{
                                background: 'rgba(255,107,53,0.1)',
                                border: '1px solid rgba(255,107,53,0.3)',
                                borderRadius: '4px',
                                color: aiResolving ? '#484f58' : '#ff6b35',
                                cursor: (aiResolving || allResolved) ? 'not-allowed' : 'pointer',
                                fontSize: '11px',
                                fontFamily: 'inherit',
                                padding: '4px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                opacity: allResolved ? 0.4 : 1,
                            }}
                            title="Let AI suggest resolutions for all unresolved conflicts"
                        >
                            {aiResolving ? <Loader size={11} /> : <Zap size={11} />}
                            AI Resolve
                        </button>
                    )}
                    <button
                        onClick={handleApply}
                        disabled={!allResolved}
                        style={{
                            background: allResolved ? 'rgba(46,160,67,0.15)' : 'rgba(48,54,61,0.5)',
                            border: `1px solid ${allResolved ? 'rgba(46,160,67,0.4)' : '#30363d'}`,
                            borderRadius: '4px',
                            color: allResolved ? '#3fb950' : '#484f58',
                            cursor: allResolved ? 'pointer' : 'not-allowed',
                            fontSize: '11px',
                            fontFamily: 'inherit',
                            padding: '4px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s',
                        }}
                        title={allResolved ? 'Apply all resolutions and return to editor' : 'Resolve all conflicts first'}
                    >
                        <Check size={11} /> Apply All
                    </button>
                    <button
                        onClick={onClose}
                        title="Cancel — return to editor"
                        style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: '2px', background: '#1c2128', flexShrink: 0 }}>
                <div style={{
                    height: '100%',
                    width: `${conflicts.length ? (resolvedCount / conflicts.length) * 100 : 0}%`,
                    background: '#3fb950',
                    transition: 'width 0.3s ease',
                }} />
            </div>

            {/* Conflicts list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {conflicts.map((c, i) => (
                    <ConflictCard
                        key={i}
                        index={i}
                        conflict={c}
                        resolution={resolutions[i]}
                        onResolve={(choice) => handleResolve(i, choice)}
                    />
                ))}
            </div>
        </div>
    );
}
