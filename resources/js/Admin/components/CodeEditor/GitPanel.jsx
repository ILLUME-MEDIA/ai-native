import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GitBranch, GitCommit, RefreshCw, Upload, Download, X, Plus, Check, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';

export default function GitPanel({ workspace, onClose, onTerminalAppend, embedded = false, onOpenDiff }) {
    const [status, setStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [commitMessage, setCommitMessage] = useState('');
    const [showCommitForm, setShowCommitForm] = useState(false);
    const [lastErrorHelp, setLastErrorHelp] = useState(null);

    // Branch state
    const [branches, setBranches] = useState([]);
    const [currentBranch, setCurrentBranch] = useState('');
    const [branchesOpen, setBranchesOpen] = useState(false);
    const [newBranchName, setNewBranchName] = useState('');
    const [showNewBranchForm, setShowNewBranchForm] = useState(false);
    const [branchLoading, setBranchLoading] = useState(false);

    useEffect(() => {
        if (workspace?.git_enabled) {
            loadGitStatus();
            loadGitLogs();
            loadBranches();
        }
    }, [workspace]);

    async function loadGitStatus() {
        if (!workspace) return;
        setLoading(true);
        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/git/status`);
            setStatus(response.data);
            setLastErrorHelp(response.data?.actionable_help || null);
            if (onTerminalAppend) {
                onTerminalAppend([
                    { type: 'command', content: 'git status', dir: '/', timestamp: new Date() },
                    response.data?.output ? { type: 'output', content: response.data.output, timestamp: new Date() } : null,
                    response.data?.error ? { type: 'stderr', content: response.data.error, timestamp: new Date() } : null,
                ].filter(Boolean));
            }
        } catch {
            toast.error('Failed to load git status');
        } finally {
            setLoading(false);
        }
    }

    async function loadGitLogs() {
        if (!workspace) return;
        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/git/log`, { params: { limit: 10 } });
            setLogs(response.data.commits || []);
        } catch {
            console.error('Failed to load git logs');
        }
    }

    async function loadBranches() {
        if (!workspace) return;
        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/git/branches`);
            setBranches(response.data.branches || []);
            setCurrentBranch(response.data.current || '');
        } catch {
            // ignore
        }
    }

    async function initGit() {
        if (!workspace) return;
        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/git/init`);
            toast.success('Git repository initialized');
            setLastErrorHelp(resp.data?.actionable_help || null);
            if (onTerminalAppend) {
                onTerminalAppend([
                    { type: 'command', content: 'git init', dir: '/', timestamp: new Date() },
                    resp.data?.output ? { type: 'output', content: resp.data.output, timestamp: new Date() } : null,
                    resp.data?.error ? { type: 'stderr', content: resp.data.error, timestamp: new Date() } : null,
                ].filter(Boolean));
            }
            loadGitStatus();
            loadBranches();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to initialize git');
        }
    }

    async function stageAll() {
        if (!workspace) return;
        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/git/add`, { files: ['.'] });
            toast.success('Changes staged');
            setLastErrorHelp(resp.data?.actionable_help || null);
            if (onTerminalAppend) {
                onTerminalAppend([
                    { type: 'command', content: 'git add .', dir: '/', timestamp: new Date() },
                    resp.data?.output ? { type: 'output', content: resp.data.output, timestamp: new Date() } : null,
                    resp.data?.error ? { type: 'stderr', content: resp.data.error, timestamp: new Date() } : null,
                ].filter(Boolean));
            }
            loadGitStatus();
        } catch {
            toast.error('Failed to stage changes');
        }
    }

    async function commit() {
        if (!workspace || !commitMessage.trim()) { toast.error('Commit message required'); return; }
        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/git/commit`, { message: commitMessage });
            toast.success('Changes committed');
            setLastErrorHelp(resp.data?.actionable_help || null);
            if (onTerminalAppend) {
                onTerminalAppend([
                    { type: 'command', content: `git commit -m "${commitMessage}"`, dir: '/', timestamp: new Date() },
                    resp.data?.output ? { type: 'output', content: resp.data.output, timestamp: new Date() } : null,
                    resp.data?.error ? { type: 'stderr', content: resp.data.error, timestamp: new Date() } : null,
                ].filter(Boolean));
            }
            setCommitMessage('');
            setShowCommitForm(false);
            loadGitStatus();
            loadGitLogs();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to commit');
        }
    }

    async function push() {
        if (!workspace) return;
        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/git/push`);
            toast.success('Changes pushed');
            setLastErrorHelp(resp.data?.actionable_help || null);
            if (onTerminalAppend) {
                onTerminalAppend([
                    { type: 'command', content: 'git push', dir: '/', timestamp: new Date() },
                    resp.data?.output ? { type: 'output', content: resp.data.output, timestamp: new Date() } : null,
                    resp.data?.error ? { type: 'stderr', content: resp.data.error, timestamp: new Date() } : null,
                ].filter(Boolean));
            }
            loadGitStatus();
        } catch { toast.error('Failed to push'); }
    }

    async function pull() {
        if (!workspace) return;
        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/git/pull`);
            toast.success('Changes pulled');
            setLastErrorHelp(resp.data?.actionable_help || null);
            if (onTerminalAppend) {
                onTerminalAppend([
                    { type: 'command', content: 'git pull', dir: '/', timestamp: new Date() },
                    resp.data?.output ? { type: 'output', content: resp.data.output, timestamp: new Date() } : null,
                    resp.data?.error ? { type: 'stderr', content: resp.data.error, timestamp: new Date() } : null,
                ].filter(Boolean));
            }
            loadGitStatus();
        } catch { toast.error('Failed to pull'); }
    }

    async function checkoutBranch(branch) {
        if (!workspace || branch === currentBranch) return;
        setBranchLoading(true);
        try {
            await axios.post(`/api/workspaces/${workspace.id}/git/checkout`, { branch });
            toast.success(`Switched to ${branch}`);
            setCurrentBranch(branch);
            setBranchesOpen(false);
            loadGitStatus();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to checkout branch');
        } finally {
            setBranchLoading(false);
        }
    }

    async function createBranch() {
        if (!workspace || !newBranchName.trim()) return;
        setBranchLoading(true);
        try {
            await axios.post(`/api/workspaces/${workspace.id}/git/branch`, { name: newBranchName.trim() });
            toast.success(`Branch "${newBranchName.trim()}" created`);
            await loadBranches();
            setNewBranchName('');
            setShowNewBranchForm(false);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create branch');
        } finally {
            setBranchLoading(false);
        }
    }

    const gitStyle = {
        section: { padding: '10px 12px', borderBottom: '1px solid #1c2128' },
        sectionTitle: { fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', color: '#8b949e', textTransform: 'uppercase', marginBottom: '8px' },
        btn: { background: 'none', border: '1px solid #30363d', borderRadius: '4px', color: '#8b949e', cursor: 'pointer', fontSize: '11px', padding: '3px 8px', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' },
        btnPrimary: { background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: '4px', color: '#ff6b35', cursor: 'pointer', fontSize: '11px', padding: '3px 8px', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' },
    };

    if (!workspace) {
        return (
            <div className={`git-panel ${embedded ? 'git-panel-embedded' : ''}`}>
                {!embedded && (
                    <div className="git-header">
                        <div className="d-flex align-items-center gap-2"><GitBranch size={16} /><span>Source Control</span></div>
                        <button className="btn-icon" onClick={onClose}><X size={16} /></button>
                    </div>
                )}
                <div className="git-body">
                    <div className="text-center text-muted p-3"><p>Select a workspace</p></div>
                </div>
            </div>
        );
    }

    if (!workspace.git_enabled) {
        return (
            <div className={`git-panel ${embedded ? 'git-panel-embedded' : ''}`}>
                {!embedded && (
                    <div className="git-header">
                        <div className="d-flex align-items-center gap-2"><GitBranch size={16} /><span>Source Control</span></div>
                        <button className="btn-icon" onClick={onClose}><X size={16} /></button>
                    </div>
                )}
                <div className="git-body">
                    <div className="text-center p-3">
                        <p className="text-muted mb-3">Git not initialized</p>
                        <button className="btn btn-sm btn-primary" onClick={initGit}>Initialize Repository</button>
                    </div>
                </div>
            </div>
        );
    }

    const localBranches = branches.filter(b => !b.startsWith('remotes/'));
    const remoteBranches = branches.filter(b => b.startsWith('remotes/'));

    return (
        <div className={`git-panel ${embedded ? 'git-panel-embedded' : ''}`}>
            {!embedded && (
                <div className="git-header">
                    <div className="d-flex align-items-center gap-2"><GitBranch size={16} /><span>Source Control</span></div>
                    <div className="d-flex gap-1">
                        <button className="btn-icon" onClick={loadGitStatus} title="Refresh" disabled={loading}>
                            <RefreshCw size={14} className={loading ? 'spin' : ''} />
                        </button>
                        <button className="btn-icon" onClick={onClose}><X size={16} /></button>
                    </div>
                </div>
            )}

            <div className="git-body">
                {lastErrorHelp && (
                    <div className="alert alert-warning small m-2">
                        <div className="fw-semibold">{lastErrorHelp.title}</div>
                        <div className="mb-2">{lastErrorHelp.message}</div>
                        {Array.isArray(lastErrorHelp.windows_steps) && lastErrorHelp.windows_steps.length > 0 && (
                            <ul className="mb-0">{lastErrorHelp.windows_steps.map((s, i) => <li key={i}>{s}</li>)}</ul>
                        )}
                    </div>
                )}

                {/* Branch Section */}
                <div style={gitStyle.section}>
                    <div style={{ ...gitStyle.sectionTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <GitBranch size={11} /> Branches
                        </span>
                        <button
                            onClick={() => { setShowNewBranchForm(v => !v); setNewBranchName(''); }}
                            title="New branch"
                            style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '1px', display: 'flex', alignItems: 'center' }}
                        >
                            <Plus size={12} />
                        </button>
                    </div>

                    {/* Current branch + dropdown trigger */}
                    <button
                        onClick={() => setBranchesOpen(v => !v)}
                        style={{
                            width: '100%',
                            background: '#0a0c0f',
                            border: '1px solid #30363d',
                            borderRadius: '4px',
                            color: '#c9d1d9',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            textAlign: 'left',
                        }}
                    >
                        <GitBranch size={11} style={{ color: '#ff6b35', flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentBranch || '—'}</span>
                        <ChevronDown size={11} style={{ flexShrink: 0, color: '#484f58', transform: branchesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                    </button>

                    {/* Branch list dropdown */}
                    {branchesOpen && (
                        <div style={{ marginTop: '4px', background: '#0a0c0f', border: '1px solid #30363d', borderRadius: '4px', overflow: 'hidden', maxHeight: '160px', overflowY: 'auto' }}>
                            {localBranches.map(branch => (
                                <div
                                    key={branch}
                                    onClick={() => checkoutBranch(branch)}
                                    style={{
                                        padding: '5px 8px',
                                        cursor: branch === currentBranch ? 'default' : 'pointer',
                                        fontSize: '11px',
                                        color: branch === currentBranch ? '#ff6b35' : '#c9d1d9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        borderBottom: '1px solid rgba(28,33,40,0.4)',
                                    }}
                                    onMouseEnter={e => { if (branch !== currentBranch) e.currentTarget.style.background = 'rgba(255,107,53,0.06)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    {branch === currentBranch ? <Check size={10} style={{ color: '#ff6b35', flexShrink: 0 }} /> : <span style={{ width: '10px', flexShrink: 0 }} />}
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{branch}</span>
                                </div>
                            ))}
                            {remoteBranches.length > 0 && (
                                <>
                                    <div style={{ padding: '4px 8px', fontSize: '9px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.08em', borderTop: '1px solid #1c2128' }}>Remote</div>
                                    {remoteBranches.map(branch => (
                                        <div
                                            key={branch}
                                            style={{ padding: '4px 8px 4px 18px', fontSize: '11px', color: '#8b949e', borderBottom: '1px solid rgba(28,33,40,0.3)' }}
                                        >
                                            {branch.replace('remotes/', '')}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}

                    {/* New branch form */}
                    {showNewBranchForm && (
                        <div style={{ marginTop: '6px', display: 'flex', gap: '4px' }}>
                            <input
                                type="text"
                                value={newBranchName}
                                onChange={e => setNewBranchName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') createBranch(); if (e.key === 'Escape') setShowNewBranchForm(false); }}
                                placeholder="New branch name…"
                                autoFocus
                                style={{
                                    flex: 1,
                                    background: '#0a0c0f',
                                    border: '1px solid #30363d',
                                    borderRadius: '4px',
                                    color: '#c9d1d9',
                                    padding: '3px 6px',
                                    fontSize: '11px',
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                    minWidth: 0,
                                }}
                            />
                            <button onClick={createBranch} disabled={branchLoading || !newBranchName.trim()} style={{ ...gitStyle.btnPrimary, flexShrink: 0 }}>
                                Create
                            </button>
                        </div>
                    )}
                </div>

                {/* Changes Section */}
                {status && (
                    <div className="git-section">
                        <div className="git-section-header">
                            <h6>Changes</h6>
                            {status.changes && status.changes.length > 0 && (
                                <span className="badge bg-primary">{status.changes.length}</span>
                            )}
                        </div>

                        {status.changes && status.changes.length > 0 ? (
                            <>
                                <div className="git-changes">
                                    {status.changes.map((change, idx) => (
                                        <div key={idx} className="git-change-item" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span className={`badge badge-${getChangeColor(change.status)}`}>
                                                {change.status}
                                            </span>
                                            <span className="file-path" style={{ flex: 1 }}>{change.file}</span>
                                            {onOpenDiff && change.status !== '??' && (
                                                <button
                                                    title="View diff"
                                                    onClick={() => onOpenDiff(change.file, 'unstaged')}
                                                    style={{
                                                        background: 'none',
                                                        border: '1px solid #30363d',
                                                        borderRadius: '3px',
                                                        color: '#8b949e',
                                                        cursor: 'pointer',
                                                        padding: '1px 5px',
                                                        fontSize: '11px',
                                                        fontFamily: 'inherit',
                                                        flexShrink: 0,
                                                        lineHeight: 1.4,
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.color = '#ff6b35'; e.currentTarget.style.borderColor = 'rgba(255,107,53,0.4)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.color = '#8b949e'; e.currentTarget.style.borderColor = '#30363d'; }}
                                                >
                                                    ≠
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="git-actions mt-2">
                                    {!showCommitForm ? (
                                        <>
                                            <button className="btn btn-sm btn-outline-primary w-100 mb-1" onClick={stageAll}>
                                                Stage All Changes
                                            </button>
                                            <button className="btn btn-sm btn-primary w-100" onClick={() => setShowCommitForm(true)}>
                                                <GitCommit size={14} /> Commit
                                            </button>
                                        </>
                                    ) : (
                                        <div className="commit-form">
                                            <textarea
                                                className="form-control form-control-sm mb-2"
                                                rows="3"
                                                placeholder="Commit message..."
                                                value={commitMessage}
                                                onChange={e => setCommitMessage(e.target.value)}
                                            />
                                            <div className="btn-group w-100">
                                                <button className="btn btn-sm btn-primary" onClick={commit}>Commit</button>
                                                <button className="btn btn-sm btn-secondary" onClick={() => { setShowCommitForm(false); setCommitMessage(''); }}>Cancel</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className="text-muted small">No changes</p>
                        )}
                    </div>
                )}

                {/* Remote Actions */}
                {workspace.git_remote && (
                    <div className="git-section">
                        <div className="git-section-header"><h6>Remote</h6></div>
                        <div className="d-flex gap-2">
                            <button className="btn btn-sm btn-outline-primary flex-fill" onClick={pull}>
                                <Download size={14} /> Pull
                            </button>
                            <button className="btn btn-sm btn-outline-primary flex-fill" onClick={push}>
                                <Upload size={14} /> Push
                            </button>
                        </div>
                    </div>
                )}

                {/* Commit History */}
                {logs.length > 0 && (
                    <div className="git-section">
                        <div className="git-section-header"><h6>Recent Commits</h6></div>
                        <div className="git-logs">
                            {logs.map((log, idx) => (
                                <div key={idx} className="git-log-item">
                                    <div className="git-log-message">{log.message}</div>
                                    <div className="git-log-meta">
                                        <small className="text-muted">{log.author} - {formatRelativeTime(log.date)}</small>
                                    </div>
                                    <div className="git-log-hash">
                                        <code className="small">{log.hash?.substring(0, 7)}</code>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function getChangeColor(status) {
    const s = (status || '').trim();
    return { 'M': 'warning', 'A': 'success', 'D': 'danger', 'R': 'info', '??': 'secondary', 'MM': 'warning', 'AM': 'success' }[s] || 'secondary';
}

function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        const diffSec = Math.floor((new Date() - date) / 1000);
        if (diffSec < 60) return 'just now';
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
        if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
        return date.toLocaleDateString();
    } catch { return dateStr; }
}
