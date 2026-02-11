import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Folder, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';

export default function WorkspaceSelector({ onWorkspaceSelect, currentWorkspace }) {
    const [workspaces, setWorkspaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '', type: 'project' });

    useEffect(() => {
        loadWorkspaces();
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

    if (loading) {
        return <div className="workspace-selector loading">Loading workspaces...</div>;
    }

    return (
        <div className="workspace-selector">
            <div className="workspace-header">
                <h6>WORKSPACE</h6>
                <div className="workspace-actions">
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
                        onClick={() => onWorkspaceSelect(workspace)}
                    >
                        <Folder size={16} />
                        <div className="workspace-info">
                            <div className="workspace-name">{workspace.name}</div>
                            <div className="workspace-meta">{workspace.type}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
