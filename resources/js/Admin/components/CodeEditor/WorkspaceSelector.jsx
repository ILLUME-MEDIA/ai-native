import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Folder, RefreshCw, Edit2, Trash2, MoreVertical, GitBranch, Files } from 'lucide-react';
import { toast } from 'react-toastify';

export default function WorkspaceSelector({ onWorkspaceSelect, currentWorkspace, leftView = 'explorer', onOpenGit, onOpenExplorer }) {
    const [workspaces, setWorkspaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showRename, setShowRename] = useState(null);
    const [showMenu, setShowMenu] = useState(null);
    const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '', type: 'project' });
    const [renameValue, setRenameValue] = useState('');

    useEffect(() => {
        loadWorkspaces();
    }, []);

    useEffect(() => {
        // Close menu when clicking outside
        function handleClick() {
            setShowMenu(null);
        }
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    async function loadWorkspaces() {
        try {
            const response = await axios.get('/api/workspaces');
            setWorkspaces(response.data);

            // Auto-select first workspace if none selected
            if (!currentWorkspace && response.data.length > 0) {
                onWorkspaceSelect(response.data[0]);
            }

            setLoading(false);
        } catch (error) {
            toast.error('Failed to load workspaces');
            setLoading(false);
        }
    }

    async function createWorkspace() {
        if (!newWorkspace.name) {
            toast.error('Workspace name is required');
            return;
        }

        try {
            const response = await axios.post('/api/workspaces', newWorkspace);
            setWorkspaces([response.data, ...workspaces]);
            setShowCreate(false);
            setNewWorkspace({ name: '', description: '', type: 'project' });
            onWorkspaceSelect(response.data);
            toast.success('Workspace created!');
        } catch (error) {
            toast.error('Failed to create workspace');
        }
    }

    async function renameWorkspace(workspace) {
        if (!renameValue.trim()) {
            toast.error('Workspace name is required');
            return;
        }

        try {
            const response = await axios.put(`/api/workspaces/${workspace.id}`, {
                name: renameValue.trim()
            });

            setWorkspaces(workspaces.map(w => w.id === workspace.id ? response.data : w));

            // Update current workspace if it's the one being renamed
            if (currentWorkspace?.id === workspace.id) {
                onWorkspaceSelect(response.data);
            }

            setShowRename(null);
            setRenameValue('');
            toast.success('Workspace renamed!');
        } catch (error) {
            toast.error('Failed to rename workspace');
        }
    }

    async function deleteWorkspace(workspace) {
        const confirmed = window.confirm(
            `Are you sure you want to delete workspace "${workspace.name}"?\n\n` +
            `This will archive the workspace. All files will be preserved but the workspace will be hidden.`
        );

        if (!confirmed) return;

        try {
            await axios.delete(`/api/workspaces/${workspace.id}`);
            setWorkspaces(workspaces.filter(w => w.id !== workspace.id));

            // If deleting current workspace, select first available
            if (currentWorkspace?.id === workspace.id) {
                const remaining = workspaces.filter(w => w.id !== workspace.id);
                onWorkspaceSelect(remaining[0] || null);
            }

            toast.success('Workspace archived!');
        } catch (error) {
            toast.error('Failed to delete workspace');
        }
    }

    function startRename(workspace) {
        setShowRename(workspace.id);
        setRenameValue(workspace.name);
        setShowMenu(null);
    }

    if (loading) {
        return <div className="workspace-selector loading">Loading workspaces...</div>;
    }

    return (
        <div className="workspace-selector">
            <div className="workspace-header">
                <h6>WORKSPACE</h6>
                <div className="workspace-actions">
                    <button
                        className={`btn-icon ${leftView === 'explorer' ? 'active' : ''}`}
                        onClick={() => onOpenExplorer?.()}
                        title="Explorer"
                        type="button"
                    >
                        <Files size={14} />
                    </button>
                    <button
                        className={`btn-icon ${leftView === 'git' ? 'active' : ''}`}
                        onClick={() => onOpenGit?.()}
                        title="Source Control"
                        type="button"
                    >
                        <GitBranch size={14} />
                    </button>
                    <button className="btn-icon" onClick={loadWorkspaces} title="Refresh">
                        <RefreshCw size={14} />
                    </button>
                    <button className="btn-icon" onClick={() => setShowCreate(true)} title="New Workspace">
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            {showCreate && (
                <div className="workspace-create-form">
                    <input
                        type="text"
                        className="form-control form-control-sm mb-2"
                        placeholder="Workspace name"
                        value={newWorkspace.name}
                        onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') createWorkspace();
                            if (e.key === 'Escape') setShowCreate(false);
                        }}
                        autoFocus
                    />
                    <textarea
                        className="form-control form-control-sm mb-2"
                        placeholder="Description (optional)"
                        rows="2"
                        value={newWorkspace.description}
                        onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                    />
                    <select
                        className="form-select form-select-sm mb-2"
                        value={newWorkspace.type}
                        onChange={(e) => setNewWorkspace({ ...newWorkspace, type: e.target.value })}
                    >
                        <option value="project">Project</option>
                        <option value="site">Website</option>
                        <option value="library">Library</option>
                    </select>
                    <div className="btn-group w-100">
                        <button className="btn btn-sm btn-primary" onClick={createWorkspace}>Create</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                    </div>
                </div>
            )}

            <div className="workspace-list">
                {workspaces.map(workspace => (
                    <div
                        key={workspace.id}
                        className={`workspace-item ${currentWorkspace?.id === workspace.id ? 'active' : ''}`}
                    >
                        {showRename === workspace.id ? (
                            <div className="workspace-rename-form" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') renameWorkspace(workspace);
                                        if (e.key === 'Escape') {
                                            setShowRename(null);
                                            setRenameValue('');
                                        }
                                    }}
                                    onBlur={() => {
                                        setShowRename(null);
                                        setRenameValue('');
                                    }}
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <>
                                <div
                                    className="workspace-main"
                                    onClick={() => onWorkspaceSelect(workspace)}
                                >
                                    <Folder size={16} />
                                    <div className="workspace-info">
                                        <div className="workspace-name">{workspace.name}</div>
                                        <div className="workspace-meta">{workspace.type}</div>
                                    </div>
                                </div>
                                <div className="workspace-menu-trigger">
                                    <button
                                        className="btn-icon btn-icon-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowMenu(showMenu === workspace.id ? null : workspace.id);
                                        }}
                                        title="Actions"
                                    >
                                        <MoreVertical size={14} />
                                    </button>
                                    {showMenu === workspace.id && (
                                        <div className="workspace-menu" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => startRename(workspace)}>
                                                <Edit2 size={14} /> Rename
                                            </button>
                                            <button
                                                className="text-danger"
                                                onClick={() => deleteWorkspace(workspace)}
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {workspaces.length === 0 && (
                    <div className="text-center text-muted p-3">
                        <p className="small">No workspaces yet</p>
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={() => setShowCreate(true)}
                        >
                            <Plus size={14} className="me-1" />
                            Create First Workspace
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
