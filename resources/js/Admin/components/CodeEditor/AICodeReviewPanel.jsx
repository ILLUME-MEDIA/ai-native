import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Shield, Loader, AlertTriangle, Info, X, CheckCircle, ChevronDown, ChevronRight, Wand2 } from 'lucide-react';
import { toast } from 'react-toastify';

const SEVERITY_CONFIG = {
    critical: { color: '#f85149', bg: 'rgba(248,81,73,0.12)', label: '🔴 Critical', order: 0 },
    error:    { color: '#f85149', bg: 'rgba(248,81,73,0.12)', label: '🔴 Error',    order: 1 },
    warning:  { color: '#d29922', bg: 'rgba(210,153,34,0.12)', label: '🟡 Warning', order: 2 },
    info:     { color: '#388bfd', bg: 'rgba(56,139,253,0.12)', label: '🔵 Info',    order: 3 },
};

function getSeverityConfig(sev) {
    const s = (sev || '').toLowerCase();
    return SEVERITY_CONFIG[s] || SEVERITY_CONFIG.info;
}

export default function AICodeReviewPanel({ workspace, activeFile, onJumpToLine, onClose }) {
    const [findings, setFindings] = useState([]);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState(null);
    const [expanded, setExpanded] = useState({});

    const canReview = !!(workspace && activeFile?.content && activeFile?.path);

    async function runReview() {
        if (!canReview) return;
        setLoading(true);
        setError(null);
        setFindings([]);
        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/ai/review`, {
                path:    activeFile.path,
                content: activeFile.content,
            });
            setFindings(resp.data.findings || []);
        } catch (e) {
            setError(e.response?.data?.error || 'Review failed');
        } finally {
            setLoading(false);
        }
    }

    // Reset when file changes
    useEffect(() => {
        setFindings([]);
        setError(null);
    }, [activeFile?.path]);

    function toggleExpand(i) {
        setExpanded(prev => ({ ...prev, [i]: !prev[i] }));
    }

    const sorted = [...findings].sort((a, b) => {
        const sA = getSeverityConfig(a.severity).order;
        const sB = getSeverityConfig(b.severity).order;
        return sA - sB || (a.line ?? 0) - (b.line ?? 0);
    });

    const countBySev = findings.reduce((acc, f) => {
        const s = (f.severity || 'info').toLowerCase();
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {});

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            background: '#0d0f14', color: '#c9d1d9',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '12px',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', borderBottom: '1px solid #1c2128', flexShrink: 0,
            }}>
                <Shield size={13} style={{ color: '#ff6b35' }} />
                <span style={{ flex: 1, fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', color: '#8b949e', textTransform: 'uppercase' }}>
                    AI Code Review
                </span>
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', padding: '2px', display: 'flex' }}
                    >
                        <X size={13} />
                    </button>
                )}
            </div>

            {/* File + Run button */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #1c2128', flexShrink: 0 }}>
                <div style={{ fontSize: '10px', color: '#484f58', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeFile?.path || 'No file open'}
                </div>
                <button
                    onClick={runReview}
                    disabled={loading || !canReview}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                        background: loading || !canReview ? 'rgba(255,107,53,0.05)' : 'rgba(255,107,53,0.1)',
                        border: '1px solid rgba(255,107,53,0.3)', borderRadius: '5px',
                        color: loading || !canReview ? '#484f58' : '#ff6b35',
                        cursor: loading || !canReview ? 'default' : 'pointer',
                        padding: '6px', fontSize: '11px', fontFamily: 'inherit',
                    }}
                >
                    {loading ? <Loader size={11} /> : <Wand2 size={11} />}
                    {loading ? 'Reviewing…' : 'Review this file'}
                </button>
            </div>

            {/* Severity summary */}
            {findings.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', padding: '6px 12px', borderBottom: '1px solid #1c2128', flexShrink: 0, flexWrap: 'wrap' }}>
                    {Object.entries(countBySev).map(([sev, cnt]) => {
                        const cfg = getSeverityConfig(sev);
                        return (
                            <span key={sev} style={{
                                fontSize: '9px', padding: '1px 6px', borderRadius: '8px',
                                background: cfg.bg, color: cfg.color, fontWeight: 600,
                            }}>
                                {cnt} {sev}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Findings list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {error && (
                    <div style={{ padding: '16px 12px', color: '#f85149', fontSize: '11px', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                {!loading && !error && findings.length === 0 && (
                    <div style={{ padding: '24px 12px', textAlign: 'center', color: '#484f58', fontSize: '11px', lineHeight: 1.7 }}>
                        <Shield size={28} style={{ opacity: 0.2, marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                        {activeFile ? 'Click "Review this file" to analyse it.' : 'Open a file to review.'}
                    </div>
                )}

                {sorted.map((finding, i) => {
                    const cfg = getSeverityConfig(finding.severity);
                    const isOpen = !!expanded[i];
                    return (
                        <div key={i} style={{ borderBottom: '1px solid rgba(28,33,40,0.6)' }}>
                            <div
                                onClick={() => toggleExpand(i)}
                                style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                                    padding: '8px 12px', cursor: 'pointer',
                                    background: isOpen ? 'rgba(255,107,53,0.03)' : 'transparent',
                                }}
                            >
                                {isOpen ? <ChevronDown size={11} style={{ color: '#484f58', flexShrink: 0, marginTop: '1px' }} />
                                        : <ChevronRight size={11} style={{ color: '#484f58', flexShrink: 0, marginTop: '1px' }} />}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '2px' }}>
                                        <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: cfg.bg, color: cfg.color, fontWeight: 600, flexShrink: 0 }}>
                                            {(finding.severity || 'info').toUpperCase()}
                                        </span>
                                        {finding.line && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onJumpToLine?.(finding.line); }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e', fontSize: '9px', padding: '0', fontFamily: 'inherit', flexShrink: 0 }}
                                            >
                                                L{finding.line}
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#c9d1d9', lineHeight: 1.4 }}>{finding.message}</div>
                                </div>
                            </div>

                            {isOpen && (finding.suggestion || finding.fix_diff) && (
                                <div style={{ padding: '0 12px 10px 31px' }}>
                                    {finding.suggestion && (
                                        <div style={{ fontSize: '10px', color: '#8b949e', lineHeight: 1.5, marginBottom: finding.fix_diff ? '6px' : 0 }}>
                                            {finding.suggestion}
                                        </div>
                                    )}
                                    {finding.fix_diff && (
                                        <pre style={{
                                            background: '#0a0c0f', border: '1px solid #1c2128', borderRadius: '4px',
                                            padding: '6px', fontSize: '10px', color: '#8b949e', overflowX: 'auto',
                                            margin: 0, fontFamily: 'inherit', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                        }}>
                                            {finding.fix_diff}
                                        </pre>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
