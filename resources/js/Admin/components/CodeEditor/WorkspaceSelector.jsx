import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Folder, RefreshCw, Edit2, Trash2, MoreVertical, GitBranch, Files } from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const LS_KEY = 'ce_workspace_id';

export default function WorkspaceSelector({ onWorkspaceSelect, currentWorkspace, leftView = 'explorer', onOpenGit, onOpenExplorer, isDark = true }) {
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
        function handleClick() { setShowMenu(null); }
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    // Persist selected workspace to localStorage whenever it changes
    useEffect(() => {
        if (currentWorkspace?.id) {
            localStorage.setItem(LS_KEY, String(currentWorkspace.id));
        }
    }, [currentWorkspace?.id]);

    async function loadWorkspaces() {
        try {
            const response = await axios.get('/api/workspaces');
            const list = response.data;
            setWorkspaces(list);

            if (!currentWorkspace && list.length > 0) {
                // Restore last-used workspace from localStorage, or fall back to first
                const savedId = localStorage.getItem(LS_KEY);
                const toSelect = (savedId && list.find(w => String(w.id) === savedId)) || list[0];
                onWorkspaceSelect(toSelect);
            }

            setLoading(false);
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            toast.error(`Failed to load workspaces: ${msg}`);
            setLoading(false);
        }
    }

    async function createWorkspace() {
        if (!newWorkspace.name.trim()) {
            toast.error('Workspace name is required');
            return;
        }

        try {
            const response = await axios.post('/api/workspaces', newWorkspace);
            setWorkspaces(prev => [response.data, ...prev]);
            setShowCreate(false);
            setNewWorkspace({ name: '', description: '', type: 'project' });
            onWorkspaceSelect(response.data);
            toast.success('Workspace created!');
        } catch (error) {
            const msg = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            Swal.fire({
                title: 'Failed to Create Workspace',
                html: `<code style="font-size:12px;word-break:break-all">${msg}</code>`,
                icon: 'error',
                confirmButtonColor: '#ff6b35',
                background: '#161b22',
                color: '#c9d1d9',
            });
        }
    }

    async function renameWorkspace(workspace) {
        if (!renameValue.trim()) {
            toast.error('Workspace name is required');
            return;
        }

        try {
            const response = await axios.put(`/api/workspaces/${workspace.id}`, { name: renameValue.trim() });
            setWorkspaces(prev => prev.map(w => w.id === workspace.id ? response.data : w));
            if (currentWorkspace?.id === workspace.id) onWorkspaceSelect(response.data);
            setShowRename(null);
            setRenameValue('');
            toast.success('Workspace renamed!');
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            toast.error(`Rename failed: ${msg}`);
        }
    }

    async function deleteWorkspace(workspace) {
        const result = await Swal.fire({
            title: `Delete "${workspace.name}"?`,
            text: 'The workspace will be archived. All files are preserved but it will be hidden.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Archive',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            background: '#161b22',
            color: '#c9d1d9',
        });

        if (!result.isConfirmed) return;

        try {
            await axios.delete(`/api/workspaces/${workspace.id}`);
            const remaining = workspaces.filter(w => w.id !== workspace.id);
            setWorkspaces(remaining);
            if (currentWorkspace?.id === workspace.id) {
                localStorage.removeItem(LS_KEY);
                onWorkspaceSelect(remaining[0] || null);
            }
            toast.success('Workspace archived!');
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            toast.error(`Delete failed: ${msg}`);
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
