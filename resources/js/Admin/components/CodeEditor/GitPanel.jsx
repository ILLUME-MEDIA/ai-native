import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GitBranch, GitCommit, GitPullRequest, RefreshCw, Upload, Download, X } from 'lucide-react';
import { toast } from 'react-toastify';

export default function GitPanel({ workspace, onClose }) {
    const [status, setStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [commitMessage, setCommitMessage] = useState('');
    const [showCommitForm, setShowCommitForm] = useState(false);

    useEffect(() => {
        if (workspace?.git_enabled) {
            loadGitStatus();
            loadGitLogs();
        }
    }, [workspace]);

    async function loadGitStatus() {
        if (!workspace) return;

        setLoading(true);
        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/git/status`);
            setStatus(response.data);
        } catch (error) {
            toast.error('Failed to load git status');
        } finally {
            setLoading(false);
        }
    }

    async function loadGitLogs() {
        if (!workspace) return;

        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/git/log`, {
                params: { limit: 10 }
            });
            setLogs(response.data.commits || []);
        } catch (error) {
            console.error('Failed to load git logs:', error);
        }
    }

    async function initGit() {
        if (!workspace) return;

        try {
            await axios.post(`/api/workspaces/${workspace.id}/git/init`);
            toast.success('Git repository initialized');
            loadGitStatus();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to initialize git');
        }
    }

    async function stageAll() {
        if (!workspace) return;

        try {
            await axios.post(`/api/workspaces/${workspace.id}/git/add`, { files: ['.'] });
            toast.success('Changes staged');
            loadGitStatus();
        } catch (error) {
            toast.error('Failed to stage changes');
        }
    }

    async function commit() {
        if (!workspace || !commitMessage.trim()) {
            toast.error('Commit message required');
            return;
        }

        try {
            await axios.post(`/api/workspaces/${workspace.id}/git/commit`, {
                message: commitMessage
            });
            toast.success('Changes committed');
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
            await axios.post(`/api/workspaces/${workspace.id}/git/push`);
            toast.success('Changes pushed');
            loadGitStatus();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to push');
        }
    }

    async function pull() {
        if (!workspace) return;

        try {
            await axios.post(`/api/workspaces/${workspace.id}/git/pull`);
            toast.success('Changes pulled');
            loadGitStatus();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to pull');
        }
    }

    if (!workspace) {
        return (
            <div className="git-panel">
                <div className="git-header">
                    <div className="d-flex align-items-center gap-2">
                        <GitBranch size={16} />
                        <span>Source Control</span>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>
                <div className="git-body">
                    <div className="text-center text-muted p-3">
                        <p>Select a workspace</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!workspace.git_enabled) {
        return (
            <div className="git-panel">
                <div className="git-header">
                    <div className="d-flex align-items-center gap-2">
                        <GitBranch size={16} />
                        <span>Source Control</span>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>
                <div className="git-body">
                    <div className="text-center p-3">
                        <p className="text-muted mb-3">Git not initialized</p>
                        <button className="btn btn-sm btn-primary" onClick={initGit}>
                            Initialize Repository
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="git-panel">
            <div className="git-header">
                <div className="d-flex align-items-center gap-2">
                    <GitBranch size={16} />
                    <span>Source Control</span>
                </div>
                <div className="d-flex gap-1">
                    <button className="btn-icon" onClick={loadGitStatus} title="Refresh" disabled={loading}>
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    </button>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="git-body">
                {/* Status Section */}
                {status && (
                    <div className="git-section">
                        <div className="git-section-header">
                            <h6>Changes</h6>
                            {status.changes && status.changes.length > 0 && (
                                <span className="badge bg-primary">{status.changes.length}</span>
                            )}
                        </div>

                        {status.branch && (
                            <div className="git-branch mb-2">
                                <small className="text-muted">Branch: <strong>{status.branch}</strong></small>
                            </div>
                        )}

                        {status.changes && status.changes.length > 0 ? (
                            <>
                                <div className="git-changes">
                                    {status.changes.map((change, idx) => (
                                        <div key={idx} className="git-change-item">
                                            <span className={`badge badge-${getChangeColor(change.status)}`}>
                                                {change.status}
                                            </span>
                                            <span className="file-path">{change.file}</span>
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
                                                onChange={(e) => setCommitMessage(e.target.value)}
                                            />
                                            <div className="btn-group w-100">
                                                <button className="btn btn-sm btn-primary" onClick={commit}>
                                                    Commit
                                                </button>
                                                <button className="btn btn-sm btn-secondary" onClick={() => {
                                                    setShowCommitForm(false);
                                                    setCommitMessage('');
                                                }}>
                                                    Cancel
                                                </button>
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
                        <div className="git-section-header">
                            <h6>Remote</h6>
                        </div>
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
                        <div className="git-section-header">
                            <h6>Recent Commits</h6>
                        </div>
                        <div className="git-logs">
                            {logs.map((log, idx) => (
                                <div key={idx} className="git-log-item">
                                    <div className="git-log-message">{log.message}</div>
                                    <div className="git-log-meta">
                                        <small className="text-muted">
                                            {log.author} · {log.date}
                                        </small>
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
    const colors = {
        'M': 'warning',  // Modified
        'A': 'success',  // Added
        'D': 'danger',   // Deleted
        'R': 'info',     // Renamed
        '??': 'secondary' // Untracked
    };
    return colors[status] || 'secondary';
}
