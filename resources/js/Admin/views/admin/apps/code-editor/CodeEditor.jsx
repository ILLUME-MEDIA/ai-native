import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import MonacoEditor from '@/Admin/components/CodeEditor/MonacoEditor';
import FileExplorer from '@/Admin/components/CodeEditor/FileExplorer';
import EditorTabs from '@/Admin/components/CodeEditor/EditorTabs';
import AIChatPanel from '@/Admin/components/CodeEditor/AIChatPanel';
import PreviewPanel from '@/Admin/components/CodeEditor/PreviewPanel';
import ThemePanel from '@/Admin/components/CodeEditor/ThemePanel';
import WorkspaceSelector from '@/Admin/components/CodeEditor/WorkspaceSelector';
import Terminal from '@/Admin/components/CodeEditor/Terminal';
import GitPanel from '@/Admin/components/CodeEditor/GitPanel';
import ApprovalPanel from '@/Admin/components/CodeEditor/ApprovalPanel';
import PageBreadcrumb from '@/Admin/components/PageBreadcrumb';
import { toast } from 'react-toastify';
import { Code, MessageSquare, Clock, Palette } from 'lucide-react';

export default function CodeEditor() {
    const [workspace, setWorkspace] = useState(null);
    const [tabs, setTabs] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [activePanel, setActivePanel] = useState('chat');
    const [leftView, setLeftView] = useState('explorer'); // 'explorer' | 'git'
    const [centerView, setCenterView] = useState('code'); // 'code' | 'preview'
    const [terminalOpen, setTerminalOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = Number(localStorage.getItem('codeEditor.sidebarWidth'));
        return Number.isFinite(saved) && saved > 0 ? saved : 250;
    });
    const resizingRef = useRef(false);
    const treeApiRef = useRef(null);
    const terminalApiRef = useRef(null);

    const handleTreeRefresh = useCallback((apiOrFn) => {
        if (typeof apiOrFn === 'function') {
            treeApiRef.current = { refresh: apiOrFn };
            return;
        }
        if (apiOrFn && typeof apiOrFn === 'object') {
            treeApiRef.current = apiOrFn;
            return;
        }
        treeApiRef.current = null;
    }, []);

    function refreshFileTree() {
        treeApiRef.current?.refresh?.();
    }

    function applyFileTreePatch(patchOrPatches) {
        if (treeApiRef.current?.applyPatch) {
            treeApiRef.current.applyPatch(patchOrPatches);
            return;
        }
        // Fallback: refresh if patch API not available
        refreshFileTree();
    }

    const handleTerminalApi = useCallback((api) => {
        terminalApiRef.current = api;
    }, []);

    const appendToTerminal = useCallback((entries) => {
        terminalApiRef.current?.appendEntries?.(entries);
    }, []);

    // Listen for cross-panel file-tree patches (theme save, etc.)
    useEffect(() => {
        function handler(e) {
            if (e?.detail?.patches) {
                applyFileTreePatch(e.detail.patches);
            }
        }
        window.addEventListener('workspace-file-tree-patch', handler);
        return () => window.removeEventListener('workspace-file-tree-patch', handler);
    }, []);

    // Sidebar resize handlers (VS Code-like drag)
    useEffect(() => {
        function onMove(e) {
            if (!resizingRef.current) return;
            const min = 200;
            const max = 520;
            const next = Math.max(min, Math.min(max, e.clientX));
            setSidebarWidth(next);
        }
        function onUp() {
            if (!resizingRef.current) return;
            resizingRef.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('codeEditor.sidebarWidth', String(sidebarWidth));
    }, [sidebarWidth]);

    async function handleFileSelect(file) {
        if (!workspace) return;

        // If user is opening a file, ensure Explorer view is active
        setLeftView('explorer');

        const existing = tabs.find(t => t.path === file.path);
        if (existing) {
            setActiveTab(existing);
            setCenterView('code');
            return;
        }

        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/files/read`, {
                params: { path: file.path }
            });

            const newTab = {
                ...file,
                content: response.data.content,
                language: detectLanguage(file.extension || file.path.split('.').pop()),
                unsaved: false
            };

            setTabs(prev => [...prev, newTab]);
            setActiveTab(newTab);
            setCenterView('code');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to load file');
        }
    }

    function handleWorkspaceSelect(selectedWorkspace) {
        setWorkspace(selectedWorkspace);
        setTabs([]);
        setActiveTab(null);
        setLeftView('explorer');
    }

    function handleEditorChange(newValue) {
        if (!activeTab) return;

        setTabs(prev => prev.map(tab =>
            tab.path === activeTab.path
                ? { ...tab, content: newValue, unsaved: true }
                : tab
        ));

        setActiveTab(prev => ({ ...prev, content: newValue, unsaved: true }));
    }

    async function handleSave(content) {
        if (!activeTab || !workspace) return;

        try {
            await axios.post(`/api/workspaces/${workspace.id}/files/write`, {
                path: activeTab.path,
                content: content || activeTab.content
            });

            setTabs(prev => prev.map(tab =>
                tab.path === activeTab.path
                    ? { ...tab, unsaved: false }
                    : tab
            ));

            setActiveTab(prev => ({ ...prev, unsaved: false }));

            toast.success('File saved');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save file');
        }
    }

    function handleTabClose(tab) {
        if (tab.unsaved) {
            if (!confirm('File has unsaved changes. Close anyway?')) {
                return;
            }
        }

        const newTabs = tabs.filter(t => t.path !== tab.path);
        setTabs(newTabs);

        if (activeTab?.path === tab.path) {
            const index = tabs.findIndex(t => t.path === tab.path);
            setActiveTab(newTabs[index - 1] || newTabs[index] || null);
        }
    }

    function detectLanguage(extension) {
        const map = {
            js: 'javascript', jsx: 'javascript',
            ts: 'typescript', tsx: 'typescript',
            php: 'php', py: 'python', rb: 'ruby', java: 'java',
            css: 'css', scss: 'scss', html: 'html',
            json: 'json', md: 'markdown', sql: 'sql',
            yaml: 'yaml', yml: 'yaml', xml: 'xml',
            sh: 'shell', bash: 'shell',
        };
        return map[extension] || 'plaintext';
    }

    return (
        <div className="container-fluid">
            <PageBreadcrumb
                title="Code Editor"
                items={[
                    { text: 'Apps', link: '/apps' },
                    { text: 'Code Editor', active: true }
                ]}
            />

            <div className="code-editor-container">
                <div className="code-editor-layout">
                    {/* Left: Workspace & File Explorer */}
                    <div className="code-editor-sidebar" style={{ width: `${sidebarWidth}px` }}>
                        <WorkspaceSelector
                            onWorkspaceSelect={handleWorkspaceSelect}
                            currentWorkspace={workspace}
                            leftView={leftView}
                            onOpenGit={() => setLeftView('git')}
                            onOpenExplorer={() => setLeftView('explorer')}
                        />

                        {leftView === 'explorer' ? (
                            <FileExplorer
                                workspace={workspace}
                                onFileSelect={handleFileSelect}
                                currentFile={activeTab}
                                onTreeRefresh={handleTreeRefresh}
                            />
                        ) : (
                            <div className="git-panel git-panel-embedded">
                                <GitPanel
                                    workspace={workspace}
                                    onClose={() => {}}
                                    embedded={true}
                                    onTerminalAppend={appendToTerminal}
                                />
                            </div>
                        )}
                    </div>

                    {/* Drag handle to resize left sidebar */}
                    <div
                        className="sidebar-resizer"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            resizingRef.current = true;
                            document.body.style.cursor = 'col-resize';
                            document.body.style.userSelect = 'none';
                        }}
                        title="Drag to resize sidebar"
                        role="separator"
                        aria-orientation="vertical"
                    />

                    {/* Center: Editor */}
                    <div className="code-editor-main">
                        <EditorTabs
                            tabs={tabs}
                            activeTab={activeTab}
                            activeCenterView={centerView}
                            onTabSelect={(tab) => {
                                setActiveTab(tab);
                                setCenterView('code');
                            }}
                            onPreviewSelect={() => setCenterView('preview')}
                            terminalOpen={terminalOpen}
                            onToggleTerminal={() => setTerminalOpen(v => !v)}
                            onTabClose={handleTabClose}
                        />

                        <div className="editor-split">
                            <div className="editor-canvas">
                            {!workspace ? (
                                <div className="editor-empty-state">
                                    <Code size={64} className="mb-3 opacity-50" />
                                    <h4>No workspace selected</h4>
                                    <p>Create or select a workspace to start coding</p>
                                </div>
                            ) : (
                                <>
                                    {centerView === 'preview' ? (
                                        <PreviewPanel
                                            workspace={workspace}
                                            activeTab={activeTab}
                                            onClose={() => setCenterView('code')}
                                        />
                                    ) : activeTab ? (
                                        <MonacoEditor
                                            value={activeTab.content}
                                            onChange={handleEditorChange}
                                            language={activeTab.language}
                                            path={activeTab.path}
                                            onSave={handleSave}
                                        />
                                    ) : (
                                        <div className="editor-empty-state">
                                            <Code size={64} className="mb-3 opacity-50" />
                                            <h4>No file open</h4>
                                            <p>Select a file from the explorer to start editing</p>
                                        </div>
                                    )}
                                </>
                            )}
                            </div>

                            {/* Bottom Terminal Dock (VS Code style) */}
                            <div className={`bottom-dock ${terminalOpen ? 'open' : 'closed'}`}>
                                <Terminal
                                    workspace={workspace}
                                    onClose={() => setTerminalOpen(false)}
                                    onTerminalApi={handleTerminalApi}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right: Panels (AI, Terminal, Git, Approvals, Theme) */}
                    <div className="code-editor-right">
                        <div className="panel-tabs">
                            <button
                                className={`panel-tab ${activePanel === 'chat' ? 'active' : ''}`}
                                onClick={() => setActivePanel('chat')}
                                title="AI Assistant"
                            >
                                <MessageSquare size={18} />
                            </button>
                            <button
                                className={`panel-tab ${activePanel === 'theme' ? 'active' : ''}`}
                                onClick={() => setActivePanel('theme')}
                                title="Theme Editor"
                            >
                                <Palette size={18} />
                            </button>
                            <button
                                className={`panel-tab ${activePanel === 'approvals' ? 'active' : ''}`}
                                onClick={() => setActivePanel('approvals')}
                                title="Approvals"
                            >
                                <Clock size={18} />
                            </button>
                        </div>

                        <div className="panel-content">
                            {activePanel === 'chat' && (
                                <AIChatPanel
                                    workspace={workspace}
                                    currentFile={activeTab}
                                    openFiles={tabs}
                                    onClose={() => {}}
                                    onFileTreeRefresh={refreshFileTree}
                                    onFileTreePatch={applyFileTreePatch}
                                    onApplyChanges={(changes) => {
                                        changes.forEach(change => {
                                            const tab = tabs.find(t => t.path === change.path);
                                            if (tab) {
                                                setTabs(prev => prev.map(t =>
                                                    t.path === change.path
                                                        ? { ...t, content: change.content, unsaved: true }
                                                        : t
                                                ));
                                                if (activeTab?.path === change.path) {
                                                    setActiveTab(prev => ({ ...prev, content: change.content, unsaved: true }));
                                                }
                                            }
                                        });
                                    }}
                                />
                            )}

                            {/* Preview moved to CENTER tabs; keep right panel space for tools */}

                            {activePanel === 'theme' && (
                                <ThemePanel
                                    workspace={workspace}
                                    onClose={() => {}}
                                />
                            )}

                            {activePanel === 'approvals' && (
                                <ApprovalPanel
                                    workspace={workspace}
                                    onClose={() => {}}
                                    onApproved={() => {
                                        refreshFileTree();
                                        if (activeTab) {
                                            handleFileSelect(activeTab);
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
