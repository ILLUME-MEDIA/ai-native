import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    ChevronRight, ChevronDown, File, Folder, FolderOpen,
    Search, FolderPlus, FilePlus, Trash2, Pencil,
    MoreVertical, RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';

// ──────────────────────────────────────────────────
// TreeNode is defined OUTSIDE FileExplorer so React
// keeps a stable component identity across re-renders.
// ──────────────────────────────────────────────────
function TreeNode({
    item,
    depth = 0,
    currentFile,
    searchQuery,
    renaming,
    creating,
    newName,
    setNewName,
    inputRef,
    onFileClick,
    onContextMenu,
    onToggleDir,
    onSubmitRename,
    onSubmitCreate,
    onInputKeyDown,
}) {
    const [expanded, setExpanded] = useState(depth < 2);
    const isActive = currentFile?.path === item.path;
    const hasChildren = item.children && item.children.length > 0;
    const isRenaming = renaming?.path === item.path;
    const isCreatingHere = creating && creating.parentPath === item.path;

    // Search filter
    if (searchQuery) {
        const matchesSelf = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const hasMatchingDescendant = hasChildren && item.children.some(child =>
            child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (child.children && child.children.length > 0)
        );
        if (!matchesSelf && !hasMatchingDescendant) return null;
    }

    return (
        <div>
            <div
                className={`file-tree-item ${isActive ? 'active' : ''}`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={() => {
                    if (item.type === 'directory') {
                        const next = !expanded;
                        setExpanded(next);
                        onToggleDir?.(item, next);
                    }
                    else onFileClick(item);
                }}
                onContextMenu={(e) => onContextMenu(e, item)}
            >
                {item.type === 'directory' ? (
                    <>
                        <span className="expand-icon">
                            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                        {expanded
                            ? <FolderOpen size={16} className="text-warning" />
                            : <Folder size={16} className="text-warning" />
                        }
                    </>
                ) : (
                    <>
                        <span style={{ width: 16, display: 'inline-block' }} />
                        <File size={16} className="text-muted" />
                    </>
                )}

                {isRenaming ? (
                    <input
                        ref={inputRef}
                        type="text"
                        className="file-rename-input"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => onInputKeyDown(e, onSubmitRename)}
                        onBlur={onSubmitRename}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="new name..."
                        autoFocus
                    />
                ) : (
                    <span className="file-name">{item.name}</span>
                )}

                {!isRenaming && (
                    <span
                        className="file-actions-btn"
                        onClick={(e) => { e.stopPropagation(); onContextMenu(e, item); }}
                    >
                        <MoreVertical size={14} />
                    </span>
                )}
            </div>

            {item.type === 'directory' && expanded && (
                <div>
                    {hasChildren && item.children.map((child, idx) => (
                        <TreeNode
                            key={child.path || idx}
                            item={child}
                            depth={depth + 1}
                            currentFile={currentFile}
                            searchQuery={searchQuery}
                            renaming={renaming}
                            creating={creating}
                            newName={newName}
                            setNewName={setNewName}
                            inputRef={inputRef}
                            onFileClick={onFileClick}
                            onContextMenu={onContextMenu}
                            onToggleDir={onToggleDir}
                            onSubmitRename={onSubmitRename}
                            onSubmitCreate={onSubmitCreate}
                            onInputKeyDown={onInputKeyDown}
                        />
                    ))}

                    {isCreatingHere && (
                        <div className="file-tree-item" style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
                            {creating.type === 'directory'
                                ? <Folder size={16} className="text-warning" />
                                : <File size={16} className="text-muted" />
                            }
                            <input
                                ref={inputRef}
                                type="text"
                                className="file-rename-input"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => onInputKeyDown(e, onSubmitCreate)}
                                onBlur={onSubmitCreate}
                                onClick={(e) => e.stopPropagation()}
                                placeholder={creating.type === 'file' ? 'filename...' : 'folder name...'}
                                autoFocus
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────────
// Main FileExplorer component
// ──────────────────────────────────────────────────
export default function FileExplorer({ workspace, onFileSelect, currentFile, onTreeRefresh }) {
    const [tree, setTree] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [contextMenu, setContextMenu] = useState(null);
    const [creating, setCreating] = useState(null);
    const [renaming, setRenaming] = useState(null);
    const [newName, setNewName] = useState('');
    const inputRef = useRef(null);

    const normalizePath = useCallback((p) => {
        if (p == null) return '';
        let s = String(p).replace(/\\/g, '/').trim();
        s = s.replace(/^\/+/, '');
        s = s.replace(/\/+$/, '');
        return s;
    }, []);

    const sortChildren = useCallback((children) => {
        return [...children].sort((a, b) => {
            if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
            return (a.name || '').localeCompare((b.name || ''), undefined, { sensitivity: 'base' });
        });
    }, []);

    const applyFsPatch = useCallback((patchOrPatches) => {
        const patches = Array.isArray(patchOrPatches) ? patchOrPatches : [patchOrPatches];
        if (!patches || patches.length === 0) return;

        function cloneNode(node) {
            return { ...node, children: node.children ? node.children.map(cloneNode) : [] };
        }

        function ensureDir(nodes, dirPath) {
            const normalized = normalizePath(dirPath);
            if (!normalized) return nodes;
            const parts = normalized.split('/').filter(Boolean);

            let currentNodes = nodes;
            let currentPath = '';

            for (const part of parts) {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                let existing = currentNodes.find(n => n.type === 'directory' && n.path === currentPath);
                if (!existing) {
                    existing = {
                        name: part,
                        path: currentPath,
                        type: 'directory',
                        children: [],
                        size: 0,
                        extension: '',
                    };
                    currentNodes.push(existing);
                    currentNodes = sortChildren(currentNodes);
                }
                if (!existing.children) existing.children = [];
                currentNodes = existing.children;
            }

            return nodes;
        }

        function upsertNode(nodes, node) {
            const path = normalizePath(node.path);
            const parentPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
            ensureDir(nodes, parentPath);

            function insertInto(nodesList) {
                const existingIndex = nodesList.findIndex(n => n.path === path);
                const nextNode = {
                    ...node,
                    path,
                    name: node.name || (path.includes('/') ? path.split('/').pop() : path),
                    children: node.type === 'directory' ? (node.children || []) : undefined,
                };
                if (existingIndex >= 0) {
                    const existing = nodesList[existingIndex];
                    nodesList[existingIndex] = {
                        ...existing,
                        ...nextNode,
                        children: nextNode.type === 'directory'
                            ? (existing.children || nextNode.children || [])
                            : undefined,
                    };
                } else {
                    nodesList.push(nextNode);
                }
                return sortChildren(nodesList);
            }

            function walk(nodesList) {
                if (!parentPath) {
                    return insertInto(nodesList);
                }
                for (let i = 0; i < nodesList.length; i++) {
                    const n = nodesList[i];
                    if (n.type === 'directory' && n.path === parentPath) {
                        const children = n.children ? [...n.children] : [];
                        const nextChildren = insertInto(children);
                        nodesList[i] = { ...n, children: nextChildren };
                        return nodesList;
                    }
                    if (n.type === 'directory' && parentPath.startsWith(n.path + '/')) {
                        const children = n.children ? [...n.children] : [];
                        const nextChildren = walk(children);
                        nodesList[i] = { ...n, children: nextChildren };
                        return nodesList;
                    }
                }
                // Parent not found (should not happen after ensureDir), fallback insert at root
                return insertInto(nodesList);
            }

            return walk(nodes);
        }

        function removeNode(nodes, pathToRemove) {
            const target = normalizePath(pathToRemove);
            function walk(nodesList) {
                const next = [];
                let removed = false;
                for (const n of nodesList) {
                    if (n.path === target || (n.type === 'directory' && target.startsWith(n.path + '/') && n.path === target)) {
                        removed = true;
                        continue;
                    }
                    if (n.type === 'directory' && n.children && target.startsWith(n.path + '/')) {
                        const [childNext, childRemoved] = walk(n.children);
                        removed = removed || childRemoved;
                        next.push({ ...n, children: childNext });
                    } else {
                        next.push(n);
                    }
                }
                return [sortChildren(next), removed];
            }
            return walk(nodes);
        }

        function findNode(nodes, pathToFind) {
            const target = normalizePath(pathToFind);
            for (const n of nodes) {
                if (n.path === target) return n;
                if (n.type === 'directory' && n.children) {
                    const child = findNode(n.children, target);
                    if (child) return child;
                }
            }
            return null;
        }

        function rewritePaths(node, oldBase, newBase) {
            const updated = { ...node };
            if (updated.path === oldBase) {
                updated.path = newBase;
            } else if (updated.path.startsWith(oldBase + '/')) {
                updated.path = newBase + updated.path.substring(oldBase.length);
            }
            updated.name = updated.path.includes('/') ? updated.path.split('/').pop() : updated.path;
            if (updated.children && updated.children.length) {
                updated.children = updated.children.map((c) => rewritePaths(c, oldBase, newBase));
            }
            return updated;
        }

        setTree((prev) => {
            const base = Array.isArray(prev) ? prev.map(cloneNode) : [];
            let nextTree = base;

            for (const rawPatch of patches) {
                if (!rawPatch || typeof rawPatch !== 'object') continue;
                const op = rawPatch.op;

                if (op === 'create') {
                    const node = rawPatch.node || {
                        name: (rawPatch.path || '').split('/').pop(),
                        path: rawPatch.path,
                        type: rawPatch.type || 'file',
                        size: rawPatch.node?.size || 0,
                        extension: rawPatch.node?.extension || '',
                    };
                    nextTree = upsertNode(nextTree, node);
                } else if (op === 'update') {
                    const node = rawPatch.node || {
                        name: (rawPatch.path || '').split('/').pop(),
                        path: rawPatch.path,
                        type: 'file',
                        size: rawPatch.node?.size,
                        extension: rawPatch.node?.extension,
                    };
                    nextTree = upsertNode(nextTree, node);
                } else if (op === 'delete') {
                    const [treeAfter] = removeNode(nextTree, rawPatch.path);
                    nextTree = treeAfter;
                } else if (op === 'rename') {
                    const oldPath = normalizePath(rawPatch.old_path);
                    const newPath = normalizePath(rawPatch.new_path);
                    if (!oldPath || !newPath) continue;
                    const found = findNode(nextTree, oldPath);
                    const [treeWithoutOld] = removeNode(nextTree, oldPath);
                    if (found) {
                        const rewritten = rewritePaths(found, oldPath, newPath);
                        nextTree = upsertNode(treeWithoutOld, rewritten);
                    } else {
                        nextTree = treeWithoutOld;
                    }
                }
            }

            return nextTree;
        });
    }, [normalizePath, sortChildren]);

    const updateDirChildren = useCallback((dirPath, childrenItems) => {
        const target = normalizePath(dirPath);

        function toNode(it) {
            const p = normalizePath(it.path);
            if (it.type === 'directory') {
                return {
                    name: it.name || (p.split('/').pop()),
                    path: p,
                    type: 'directory',
                    children: [],
                    loaded: false,
                    size: 0,
                    extension: '',
                };
            }
            return {
                name: it.name || (p.split('/').pop()),
                path: p,
                type: 'file',
                children: undefined,
                size: it.size || 0,
                extension: it.extension || '',
            };
        }

        function walk(nodes) {
            if (!Array.isArray(nodes)) return nodes;
            return nodes.map(n => {
                if (n.type === 'directory' && n.path === target) {
                    const nextChildren = sortChildren((childrenItems || []).map(toNode));
                    return { ...n, children: nextChildren, loaded: true };
                }
                if (n.type === 'directory' && Array.isArray(n.children) && target.startsWith(n.path + '/')) {
                    return { ...n, children: walk(n.children) };
                }
                return n;
            });
        }

        setTree(prev => walk(Array.isArray(prev) ? prev : []));
    }, [normalizePath, sortChildren]);

    const loadRootIncremental = useCallback(async () => {
        if (!workspace) return;
        setLoading(true);
        try {
            const resp = await axios.get(`/api/workspaces/${workspace.id}/files/list`);
            const items = resp.data?.items || [];
            const nodes = items.map(it => ({
                name: it.name,
                path: normalizePath(it.path),
                type: it.type,
                size: it.size || 0,
                extension: it.extension || '',
                children: it.type === 'directory' ? [] : undefined,
                loaded: it.type === 'directory' ? false : true,
            }));
            setTree(sortChildren(nodes));
        } catch (error) {
            console.error('Failed to load root files:', error);
            toast.error('Failed to load file tree');
        } finally {
            setLoading(false);
        }
    }, [workspace, normalizePath, sortChildren]);

    useEffect(() => {
        if (workspace) {
            loadRootIncremental();
        }
    }, [workspace]);

    // Focus the input after creating/renaming state is set
    useEffect(() => {
        if (creating || renaming) {
            // Small delay to let React commit the DOM, then focus
            const timer = setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                }
            }, 20);
            return () => clearTimeout(timer);
        }
    }, [creating, renaming]);

    useEffect(() => {
        function handleClickOutside() { setContextMenu(null); }
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const loadFileTree = useCallback(async () => {
        if (!workspace) return;
        setLoading(true);
        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/files`);
            setTree(buildTree(response.data.files || []));
        } catch (error) {
            console.error('Failed to load files:', error);
            toast.error('Failed to load file tree');
        } finally {
            setLoading(false);
        }
    }, [workspace]);

    useEffect(() => {
        if (onTreeRefresh) {
            // Back-compat: older parent expects just a refresh function.
            // Newer parent can accept an API object.
            onTreeRefresh({
                refresh: loadRootIncremental,
                applyPatch: applyFsPatch,
            });
        }
    }, [loadRootIncremental, applyFsPatch, onTreeRefresh]);

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
                        children: [],
                        size: isLast ? file.size : 0,
                        extension: isLast ? file.extension : '',
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

    // ── Callbacks (stable via useCallback so TreeNode doesn't re-mount) ──

    const handleFileClick = useCallback((item) => {
        if (item.type === 'file') {
            onFileSelect(item);
        }
    }, [onFileSelect]);

    const handleContextMenu = useCallback((e, item) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, item });
    }, []);

    const handleCreate = useCallback((parentPath, type) => {
        setContextMenu(null);
        setCreating({ parentPath, type });
        setNewName(type === 'file' ? 'untitled.txt' : 'new-folder');
    }, []);

    // We need a ref-based approach for submit so we always read the latest newName
    const newNameRef = useRef(newName);
    const creatingRef = useRef(creating);
    const renamingRef = useRef(renaming);
    const submittingRef = useRef(false); // Guard against double-submit (Enter + blur)
    useEffect(() => { newNameRef.current = newName; }, [newName]);
    useEffect(() => { creatingRef.current = creating; }, [creating]);
    useEffect(() => { renamingRef.current = renaming; }, [renaming]);

    const doSubmitCreate = useCallback(async () => {
        if (submittingRef.current) return;
        const currentCreating = creatingRef.current;
        const currentName = newNameRef.current;
        if (!currentCreating || !currentName.trim()) {
            setCreating(null);
            return;
        }

        submittingRef.current = true;
        const fullPath = currentCreating.parentPath
            ? `${currentCreating.parentPath}/${currentName.trim()}`
            : currentName.trim();

        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/files/create`, {
                path: fullPath,
                type: currentCreating.type,
                content: currentCreating.type === 'file' ? '' : undefined,
            });
            toast.success(`${currentCreating.type === 'file' ? 'File' : 'Folder'} created`);
            setCreating(null);
            setNewName('');
            if (resp?.data?.fs_patch) {
                applyFsPatch(resp.data.fs_patch);
            } else {
                loadFileTree();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create');
        } finally {
            submittingRef.current = false;
        }
    }, [workspace, loadFileTree]);

    const doSubmitRename = useCallback(async () => {
        if (submittingRef.current) return;
        const currentRenaming = renamingRef.current;
        const currentName = newNameRef.current;
        if (!currentRenaming || !currentName.trim() || currentName.trim() === currentRenaming.name) {
            setRenaming(null);
            return;
        }

        submittingRef.current = true;
        const parentPath = currentRenaming.path.includes('/')
            ? currentRenaming.path.substring(0, currentRenaming.path.lastIndexOf('/'))
            : '';
        const newPath = parentPath ? `${parentPath}/${currentName.trim()}` : currentName.trim();

        try {
            const resp = await axios.put(`/api/workspaces/${workspace.id}/files/rename`, {
                old_path: currentRenaming.path,
                new_path: newPath,
            });
            toast.success('Renamed successfully');
            setRenaming(null);
            setNewName('');
            if (resp?.data?.fs_patch) {
                applyFsPatch(resp.data.fs_patch);
            } else {
                loadFileTree();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to rename');
        } finally {
            submittingRef.current = false;
        }
    }, [workspace, loadFileTree]);

    const handleDelete = useCallback(async (item) => {
        setContextMenu(null);
        const label = item.type === 'directory' ? 'folder' : 'file';
        if (!confirm(`Delete ${label} "${item.name}"? This cannot be undone.`)) return;

        try {
            const resp = await axios.delete(`/api/workspaces/${workspace.id}/files/delete`, {
                data: { path: item.path },
            });
            toast.success(`${item.name} deleted`);
            if (resp?.data?.fs_patch) {
                applyFsPatch(resp.data.fs_patch);
            } else {
                loadFileTree();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete');
        }
    }, [workspace, loadFileTree, applyFsPatch]);

    const handleToggleDir = useCallback(async (item, willExpand) => {
        if (!willExpand) return;
        if (!workspace) return;
        if (item.type !== 'directory') return;
        if (item.loaded) return;

        try {
            const resp = await axios.get(`/api/workspaces/${workspace.id}/files/list`, {
                params: { path: item.path }
            });
            updateDirChildren(item.path, resp.data?.items || []);
        } catch (error) {
            toast.error('Failed to load folder');
        }
    }, [workspace, updateDirChildren]);

    const startRename = useCallback((item) => {
        setContextMenu(null);
        setRenaming({ path: item.path, name: item.name });
        setNewName(item.name);
    }, []);

    const handleInputKeyDown = useCallback((e, submitFn) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitFn();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setCreating(null);
            setRenaming(null);
            setNewName('');
        }
    }, []);

    // ── Render ──

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
                <div className="d-flex gap-1">
                    <button className="btn-icon" onClick={() => handleCreate('', 'file')} title="New File">
                        <FilePlus size={14} />
                    </button>
                    <button className="btn-icon" onClick={() => handleCreate('', 'directory')} title="New Folder">
                        <FolderPlus size={14} />
                    </button>
                    <button className="btn-icon" onClick={loadRootIncremental} title="Refresh">
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            <div className="file-explorer-search">
                <div className="input-group input-group-sm">
                    <span className="input-group-text"><Search size={14} /></span>
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
                        <TreeNode
                            key={item.path || idx}
                            item={item}
                            depth={0}
                            currentFile={currentFile}
                            searchQuery={searchQuery}
                            renaming={renaming}
                            creating={creating}
                            newName={newName}
                            setNewName={setNewName}
                            inputRef={inputRef}
                            onFileClick={handleFileClick}
                            onContextMenu={handleContextMenu}
                            onToggleDir={handleToggleDir}
                            onSubmitRename={doSubmitRename}
                            onSubmitCreate={doSubmitCreate}
                            onInputKeyDown={handleInputKeyDown}
                        />
                    ))
                ) : (
                    <div className="p-3 text-center text-muted">
                        <p className="small">No files in workspace</p>
                    </div>
                )}

                {/* Root-level create input */}
                {creating && creating.parentPath === '' && (
                    <div className="file-tree-item" style={{ paddingLeft: '8px' }}>
                        {creating.type === 'directory'
                            ? <Folder size={16} className="text-warning" />
                            : <File size={16} className="text-muted" />
                        }
                        <input
                            ref={inputRef}
                            type="text"
                            className="file-rename-input"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => handleInputKeyDown(e, doSubmitCreate)}
                            onBlur={doSubmitCreate}
                            onClick={(e) => e.stopPropagation()}
                            placeholder={creating.type === 'file' ? 'filename...' : 'folder name...'}
                            autoFocus
                        />
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="file-context-menu"
                    style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 9999 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {contextMenu.item.type === 'directory' && (
                        <>
                            <button onClick={() => handleCreate(contextMenu.item.path, 'file')}>
                                <FilePlus size={14} /> New File
                            </button>
                            <button onClick={() => handleCreate(contextMenu.item.path, 'directory')}>
                                <FolderPlus size={14} /> New Folder
                            </button>
                            <div className="context-menu-divider" />
                        </>
                    )}
                    <button onClick={() => startRename(contextMenu.item)}>
                        <Pencil size={14} /> Rename
                    </button>
                    <button className="text-danger" onClick={() => handleDelete(contextMenu.item)}>
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            )}
        </div>
    );
}
