import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Search } from 'lucide-react';
import { toast } from 'react-toastify';

export default function FileExplorer({ workspace, onFileSelect, currentFile }) {
    const [tree, setTree] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (workspace) {
            loadFileTree();
        }
    }, [workspace]);

    async function loadFileTree() {
        if (!workspace) return;

        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/files`);
            setTree(buildTree(response.data.files || []));
            setLoading(false);
        } catch (error) {
            console.error('Failed to load files:', error);
            toast.error('Failed to load file tree');
            setLoading(false);
        }
    }

    function buildTree(files) {
        const root = [];
        const map = {};

        files.forEach(file => {
            const parts = file.path.replace(/\\/g, '/').split('/').filter(Boolean);
            let current = root;
            let currentPath = '';

            parts.forEach((part, index) => {
                currentPath += (currentPath ? '/' : '') + part;
                const isLast = index === parts.length - 1;

                if (!map[currentPath]) {
                    const node = {
                        name: part,
                        path: currentPath,
                        type: isLast ? file.type : 'directory',
                        children: []
                    };
                    map[currentPath] = node;
                    current.push(node);
                }

                if (!isLast) {
                    current = map[currentPath].children;
                }
            });
        });

        return root;
    }

    function handleFileClick(item) {
        if (item.type === 'file') {
            onFileSelect(item);
        }
    }

    function TreeNode({ item, depth = 0 }) {
        const [expanded, setExpanded] = useState(depth < 2);
        const isActive = currentFile?.path === item.path;
        const hasChildren = item.children && item.children.length > 0;

        // Filter by search
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            if (!hasChildren) return null;
        }

        return (
            <div>
                <div
                    className={`file-tree-item ${isActive ? 'active' : ''}`}
                    style={{ paddingLeft: `${depth * 16 + 8}px` }}
                    onClick={() => handleFileClick(item)}
                >
                    {item.type === 'directory' ? (
                        <>
                            <button
                                className="expand-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setExpanded(!expanded);
                                }}
                            >
                                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            {expanded ? <FolderOpen size={16} className="text-warning" /> : <Folder size={16} className="text-warning" />}
                        </>
                    ) : (
                        <>
                            <span style={{ width: 16 }} />
                            <File size={16} className="text-muted" />
                        </>
                    )}
                    <span className="file-name">{item.name}</span>
                </div>

                {item.type === 'directory' && expanded && hasChildren && (
                    <div>
                        {item.children.map((child, idx) => (
                            <TreeNode key={child.path || idx} item={child} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (!workspace) {
        return (
            <div className="file-explorer">
                <div className="file-explorer-header">
                    <h6>EXPLORER</h6>
                </div>
                <div className="p-3 text-center text-muted">
                    <p className="small">Select a workspace to view files</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="file-explorer">
                <div className="file-explorer-header">
                    <h6>EXPLORER</h6>
                </div>
                <div className="p-3 text-center">
                    <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="file-explorer">
            <div className="file-explorer-header">
                <h6>EXPLORER</h6>
                <button className="btn btn-sm btn-link" onClick={loadFileTree} title="Refresh">
                    <i className="ri-refresh-line"></i>
                </button>
            </div>

            <div className="file-explorer-search">
                <div className="input-group input-group-sm">
                    <span className="input-group-text">
                        <Search size={14} />
                    </span>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="file-tree">
                {tree && tree.length > 0 ? (
                    tree.map((item, idx) => (
                        <TreeNode key={item.path || idx} item={item} depth={0} />
                    ))
                ) : (
                    <div className="p-3 text-center text-muted">
                        <p className="small">No files in workspace</p>
                    </div>
                )}
            </div>
        </div>
    );
}
