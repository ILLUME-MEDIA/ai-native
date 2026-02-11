import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { toast } from 'react-toastify';

export default function ApprovalPanel({ workspace, onClose, onApproved }) {
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedApproval, setSelectedApproval] = useState(null);

    useEffect(() => {
        if (workspace) {
            loadApprovals();
        }
    }, [workspace]);

    async function loadApprovals() {
        if (!workspace) return;

        setLoading(true);
        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/ai/approvals`);
            setApprovals(response.data);
        } catch (error) {
            toast.error('Failed to load approvals');
        } finally {
            setLoading(false);
        }
    }

    async function approve(approvalId) {
        try {
            await axios.post(`/api/approvals/${approvalId}/approve`);
            toast.success('Changes approved and applied');
            loadApprovals();
            if (onApproved) {
                onApproved();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to approve');
        }
    }

    async function reject(approvalId) {
        const reason = prompt('Reason for rejection (optional):');

        try {
            await axios.post(`/api/approvals/${approvalId}/reject`, { reason });
            toast.success('Changes rejected');
            loadApprovals();
        } catch (error) {
            toast.error('Failed to reject');
        }
    }

    function viewDiff(approval) {
        setSelectedApproval(approval);
    }

    if (!workspace) {
        return (
            <div className="approval-panel">
                <div className="approval-header">
                    <div className="d-flex align-items-center gap-2">
                        <Clock size={16} />
                        <span>Approvals</span>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>
                <div className="approval-body">
                    <div className="text-center text-muted p-3">
                        <p>Select a workspace</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="approval-panel">
            <div className="approval-header">
                <div className="d-flex align-items-center gap-2">
                    <Clock size={16} />
                    <span>Pending Approvals</span>
                    {approvals.length > 0 && (
                        <span className="badge bg-warning">{approvals.length}</span>
                    )}
                </div>
                <div className="d-flex gap-1">
                    <button className="btn-icon" onClick={loadApprovals} title="Refresh" disabled={loading}>
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    </button>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="approval-body">
                {selectedApproval ? (
                    <DiffViewer
                        approval={selectedApproval}
                        onBack={() => setSelectedApproval(null)}
                        onApprove={() => {
                            approve(selectedApproval.id);
                            setSelectedApproval(null);
                        }}
                        onReject={() => {
                            reject(selectedApproval.id);
                            setSelectedApproval(null);
                        }}
                    />
                ) : (
                    <>
                        {approvals.length === 0 ? (
                            <div className="text-center text-muted p-3">
                                <AlertTriangle size={32} className="mb-2 opacity-50" />
                                <p className="small">No pending approvals</p>
                            </div>
                        ) : (
                            <div className="approval-list">
                                {approvals.map(approval => (
                                    <ApprovalItem
                                        key={approval.id}
                                        approval={approval}
                                        onApprove={() => approve(approval.id)}
                                        onReject={() => reject(approval.id)}
                                        onViewDiff={() => viewDiff(approval)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function ApprovalItem({ approval, onApprove, onReject, onViewDiff }) {
    const commandTypeLabels = {
        'file_edit': 'Edit File',
        'file_create': 'Create File',
        'file_delete': 'Delete File',
        'terminal_command': 'Terminal Command'
    };

    const commandTypeColors = {
        'file_edit': 'primary',
        'file_create': 'success',
        'file_delete': 'danger',
        'terminal_command': 'warning'
    };

    return (
        <div className="approval-item">
            <div className="approval-item-header">
                <span className={`badge bg-${commandTypeColors[approval.command_type]}`}>
                    {commandTypeLabels[approval.command_type] || approval.command_type}
                </span>
                <small className="text-muted">{formatTime(approval.created_at)}</small>
            </div>

            <div className="approval-item-body">
                <div className="approval-command">
                    <code>{approval.command}</code>
                </div>

                {approval.affected_files && approval.affected_files.length > 0 && (
                    <div className="approval-files mt-2">
                        <small className="text-muted">Affected files:</small>
                        {approval.affected_files.map((file, idx) => (
                            <div key={idx} className="file-badge">
                                <code className="small">{file}</code>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="approval-item-actions">
                {approval.diff && (
                    <button className="btn btn-sm btn-outline-secondary" onClick={onViewDiff}>
                        View Diff
                    </button>
                )}
                <button className="btn btn-sm btn-success" onClick={onApprove}>
                    <CheckCircle size={14} /> Approve
                </button>
                <button className="btn btn-sm btn-danger" onClick={onReject}>
                    <XCircle size={14} /> Reject
                </button>
            </div>
        </div>
    );
}

function DiffViewer({ approval, onBack, onApprove, onReject }) {
    return (
        <div className="diff-viewer">
            <div className="diff-viewer-header">
                <button className="btn btn-sm btn-link" onClick={onBack}>
                    ← Back
                </button>
                <h6 className="mb-0">Diff Preview</h6>
            </div>

            <div className="diff-viewer-body">
                {approval.affected_files && approval.affected_files.map((file, idx) => (
                    <div key={idx} className="diff-file">
                        <div className="diff-file-header">
                            <code>{file}</code>
                        </div>
                        {approval.diff ? (
                            <pre className="diff-content">{approval.diff}</pre>
                        ) : (
                            <div className="diff-split">
                                <div className="diff-pane diff-pane-old">
                                    <div className="diff-pane-label">Before</div>
                                    <pre>{approval.original_content || '(empty)'}</pre>
                                </div>
                                <div className="diff-pane diff-pane-new">
                                    <div className="diff-pane-label">After</div>
                                    <pre>{approval.new_content || '(empty)'}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {approval.command_type === 'terminal_command' && (
                    <div className="alert alert-warning mt-3">
                        <AlertTriangle size={16} className="me-2" />
                        <strong>Terminal Command:</strong>
                        <div className="mt-1">
                            <code>{approval.command}</code>
                        </div>
                    </div>
                )}
            </div>

            <div className="diff-viewer-actions">
                <button className="btn btn-success" onClick={onApprove}>
                    <CheckCircle size={16} /> Approve & Apply
                </button>
                <button className="btn btn-danger" onClick={onReject}>
                    <XCircle size={16} /> Reject
                </button>
            </div>
        </div>
    );
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
}
