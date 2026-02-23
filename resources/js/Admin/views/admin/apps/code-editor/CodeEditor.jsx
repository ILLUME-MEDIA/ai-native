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
import EditorBreadcrumb from '@/Admin/components/CodeEditor/EditorBreadcrumb';
import SearchPanel from '@/Admin/components/CodeEditor/SearchPanel';
import DiffViewer from '@/Admin/components/CodeEditor/DiffViewer';
import BlameGutter from '@/Admin/components/CodeEditor/BlameGutter';
import { toast } from 'react-toastify';
import { Code, MessageSquare, Clock, Palette, Folder, GitBranch, Search, User } from 'lucide-react';

export default function CodeEditor() {
    const [workspace, setWorkspace] = useState(null);
    const [tabs, setTabs] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [activePanel, setActivePanel] = useState('chat');
    const [leftView, setLeftView] = useState('explorer'); // 'explorer' | 'git' | 'search'
    const [centerView, setCenterView] = useState('code'); // 'code' | 'preview' | 'diff'
    const [terminalOpen, setTerminalOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = Number(localStorage.getItem('codeEditor.sidebarWidth'));
        return Number.isFinite(saved) && saved > 0 ? saved : 250;
    });

    // Diff state
    const [diffFile, setDiffFile] = useState(null);
    const [diffType, setDiffType] = useState('unstaged');

    // Blame state
    const [showBlame, setShowBlame] = useState(false);
    const [blameData, setBlameData] = useState(null);
    const [blameLoading, setBlameLoading] = useState(false);

    // Dynamic branch
    const [currentBranch, setCurrentBranch] = useState('main');

    const resizingRef = useRef(false);
    const treeApiRef = useRef(null);
    const terminalApiRef = useRef(null);
    const monacoEditorRef = useRef(null);
    const pendingScrollLineRef = useRef(null);

    const handleTreeRefresh = useCallback((apiOrFn) => {
        if (typeof apiOrFn === 'function') { treeApiRef.current = { refresh: apiOrFn }; return; }
        if (apiOrFn && typeof apiOrFn === 'object') { treeApiRef.current = apiOrFn; return; }
        treeApiRef.current = null;
    }, []);

    function refreshFileTree() { treeApiRef.current?.refresh?.(); }
    function applyFileTreePatch(patchOrPatches) {
        if (treeApiRef.current?.applyPatch) { treeApiRef.current.applyPatch(patchOrPatches); return; }
        refreshFileTree();
    }

    const handleTerminalApi = useCallback((api) => { terminalApiRef.current = api; }, []);
    const appendToTerminal = useCallback((entries) => { terminalApiRef.current?.appendEntries?.(entries); }, []);

    // Fetch current branch when workspace changes
    useEffect(() => {
        if (!workspace?.git_enabled) { setCurrentBranch('main'); return; }
        axios.get(`/api/workspaces/${workspace.id}/git/branches`)
            .then(r => { if (r.data.current) setCurrentBranch(r.data.current); })
            .catch(() => {});
    }, [workspace]);

    // Scroll to pending line when activeTab changes
    useEffect(() => {
        if (pendingScrollLineRef.current !== null && monacoEditorRef.current) {
            const line = pendingScrollLineRef.current;
            pendingScrollLineRef.current = null;
            setTimeout(() => {
                if (monacoEditorRef.current) {
                    monacoEditorRef.current.revealLineInCenter(line);
                    monacoEditorRef.current.setPosition({ lineNumber: line, column: 1 });
                }
            }, 150);
        }
    }, [activeTab?.path]);

    useEffect(() => {
        function handler(e) {
            if (e?.detail?.patches) applyFileTreePatch(e.detail.patches);
        }
        window.addEventListener('workspace-file-tree-patch', handler);
        return () => window.removeEventListener('workspace-file-tree-patch', handler);
    }, []);

    useEffect(() => {
        function onMove(e) {
            if (!resizingRef.current) return;
            setSidebarWidth(Math.max(200, Math.min(520, e.clientX)));
        }
        function onUp() {
            if (!resizingRef.current) return;
            resizingRef.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, []);

    useEffect(() => {
        localStorage.setItem('codeEditor.sidebarWidth', String(sidebarWidth));
    }, [sidebarWidth]);

    async function handleFileSelect(file) {
        if (!workspace) return;
        setLeftView('explorer');
        const existing = tabs.find(t => t.path === file.path);
        if (existing) {
            setActiveTab(existing);
            setCenterView('code');
            return;
        }
        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/files/read`, { params: { path: file.path } });
            const newTab = {
                ...file,
                content: response.data.content,
                language: detectLanguage(file.extension || file.path.split('.').pop()),
                unsaved: false,
            };
            setTabs(prev => [...prev, newTab]);
            setActiveTab(newTab);
            setCenterView('code');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to load file');
        }
    }

    async function handleResultClick(filePath, line) {
        if (!workspace) return;
        pendingScrollLineRef.current = line;
        const existing = tabs.find(t => t.path === filePath);
        if (existing) {
            setActiveTab(existing);
            setCenterView('code');
            return;
        }
        await handleFileSelect({ path: filePath, name: filePath.split('/').pop() });
    }

    function handleOpenDiff(file, type = 'unstaged') {
        setDiffFile(file);
        setDiffType(type);
        setCenterView('diff');
    }

    async function handleBlameToggle() {
        if (!activeTab || !workspace) return;

        if (showBlame) {
            setShowBlame(false);
            return;
        }

        // If we already have blame for this file, just show it
        if (blameData) {
            setShowBlame(true);
            return;
        }

        setBlameLoading(true);
        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/git/blame`, {
                params: { file: activeTab.path }
            });
            setBlameData(response.data.blame || []);
            setShowBlame(true);
        } catch {
            toast.error('Failed to load blame data');
        } finally {
            setBlameLoading(false);
        }
    }

    // Clear blame when file changes
    useEffect(() => {
        setShowBlame(false);
        setBlameData(null);
    }, [activeTab?.path]);

    function handleWorkspaceSelect(selectedWorkspace) {
        setWorkspace(selectedWorkspace);
        setTabs([]);
        setActiveTab(null);
        setLeftView('explorer');
        setCenterView('code');
        setShowBlame(false);
        setBlameData(null);
    }

    function handleEditorChange(newValue) {
        if (!activeTab) return;
        setTabs(prev => prev.map(tab => tab.path === activeTab.path ? { ...tab, content: newValue, unsaved: true } : tab));
        setActiveTab(prev => ({ ...prev, content: newValue, unsaved: true }));
    }

    async function handleSave(content) {
        if (!activeTab || !workspace) return;
        try {
            await axios.post(`/api/workspaces/${workspace.id}/files/write`, {
                path: activeTab.path,
                content: content || activeTab.content,
            });
            setTabs(prev => prev.map(tab => tab.path === activeTab.path ? { ...tab, unsaved: false } : tab));
            setActiveTab(prev => ({ ...prev, unsaved: false }));
            toast.success('File saved');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save file');
        }
    }

    function handleTabClose(tab) {
        if (tab.unsaved && !confirm('File has unsaved changes. Close anyway?')) return;
        const newTabs = tabs.filter(t => t.path !== tab.path);
        setTabs(newTabs);
        if (activeTab?.path === tab.path) {
            const index = tabs.findIndex(t => t.path === tab.path);
            setActiveTab(newTabs[index - 1] || newTabs[index] || null);
        }
    }

    function detectLanguage(extension) {
        const map = {
            js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
            php: 'php', py: 'python', rb: 'ruby', java: 'java',
            css: 'css', scss: 'scss', html: 'html', json: 'json', md: 'markdown',
            sql: 'sql', yaml: 'yaml', yml: 'yaml', xml: 'xml', sh: 'shell', bash: 'shell',
        };
        return map[extension] || 'plaintext';
    }

    const activityItems = [
        { id: 'explorer', icon: <Folder size={16} />,    label: 'Explorer',        action: () => setLeftView('explorer') },
        { id: 'search',   icon: <Search size={16} />,    label: 'Search',          action: () => setLeftView('search') },
        { id: 'git',      icon: <GitBranch size={16} />, label: 'Source Control',  action: () => setLeftView('git') },
    ];

    const rightPanels = [
        { id: 'chat',      icon: <MessageSquare size={14} />, label: 'AI CHAT' },
        { id: 'theme',     icon: <Palette size={14} />,       label: 'THEME' },
        { id: 'approvals', icon: <Clock size={14} />,         label: 'APPROVALS' },
    ];

    const blameBtn = activeTab && workspace?.git_enabled ? (
        <button
            onClick={handleBlameToggle}
            title={showBlame ? 'Hide blame' : 'Show git blame'}
            disabled={blameLoading}
            style={{
                background: showBlame ? 'rgba(255,107,53,0.12)' : 'none',
                border: showBlame ? '1px solid rgba(255,107,53,0.3)' : '1px solid transparent',
                borderRadius: '3px',
                color: showBlame ? '#ff6b35' : blameLoading ? '#484f58' : '#8b949e',
                cursor: blameLoading ? 'wait' : 'pointer',
                padding: '2px 5px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '10px',
                fontFamily: 'inherit',
                gap: '3px',
            }}
        >
            <User size={11} />
        </button>
    ) : null;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');

                .ce-root, .ce-root * { box-sizing: border-box; }
                .ce-root { font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace; }
                .ce-root ::-webkit-scrollbar { width: 4px; height: 4px; }
                .ce-root ::-webkit-scrollbar-track { background: transparent; }
                .ce-root ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }

                .ce-activity-btn { transition: color 0.15s, background 0.15s, border-color 0.15s; }
                .ce-activity-btn:hover { color: #ff6b35 !important; background: rgba(255,107,53,0.08) !important; border-color: rgba(255,107,53,0.2) !important; }

                .ce-panel-tab { transition: color 0.15s, border-color 0.15s, opacity 0.15s; }
                .ce-panel-tab:hover { opacity: 1 !important; color: #ff6b35 !important; }

                .ce-resizer { transition: background 0.15s; }
                .ce-resizer:hover { background: rgba(255, 107, 53, 0.4) !important; }

                .ce-status-item { transition: color 0.15s; cursor: default; }
                .ce-status-item:hover { color: #c9d1d9 !important; }
            `}</style>

            <div
                className="ce-root code-editor-container"
                style={{
                    background: '#0d0f14',
                    color: '#c9d1d9',
                    overflow: 'hidden',
                    height: 'calc(100vh - 65px)',
                    margin: '0 -1.25rem',
                }}
            >
                <div className="code-editor-layout" style={{ display: 'flex', height: '100%' }}>
                    {/* Activity Bar */}
                    <div style={{
                        width: '44px',
                        background: '#0d0f14',
                        borderRight: '1px solid #1c2128',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        paddingTop: '12px',
                        gap: '4px',
                        flexShrink: 0,
                    }}>
                        {activityItems.map(({ id, icon, label, action }) => (
                            <button
                                key={id}
                                className="ce-activity-btn"
                                onClick={action}
                                title={label}
                                style={{
                                    background: leftView === id ? 'rgba(255,107,53,0.1)' : 'none',
                                    border: leftView === id ? '1px solid rgba(255,107,53,0.2)' : '1px solid transparent',
                                    color: leftView === id ? '#ff6b35' : '#8b949e',
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: 0,
                                }}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>

                    {/* Left Sidebar */}
                    <div
                        className="code-editor-sidebar"
                        style={{
                            width: `${sidebarWidth}px`,
                            background: '#0d0f14',
                            borderRight: '1px solid #1c2128',
                            display: 'flex',
                            flexDirection: 'column',
                            flexShrink: 0,
                            overflow: 'hidden',
                        }}
                    >
                        <WorkspaceSelector
                            onWorkspaceSelect={handleWorkspaceSelect}
                            currentWorkspace={workspace}
                            leftView={leftView}
                            onOpenGit={() => setLeftView('git')}
                            onOpenExplorer={() => setLeftView('explorer')}
                        />

                        {leftView === 'explorer' && (
                            <FileExplorer
                                workspace={workspace}
                                onFileSelect={handleFileSelect}
                                currentFile={activeTab}
                                onTreeRefresh={handleTreeRefresh}
                            />
                        )}

                        {leftView === 'search' && (
                            <SearchPanel
                                workspace={workspace}
                                onResultClick={handleResultClick}
                            />
                        )}

                        {leftView === 'git' && (
                            <div className="git-panel git-panel-embedded" style={{ flex: 1, overflow: 'hidden' }}>
                                <GitPanel
                                    workspace={workspace}
                                    onClose={() => {}}
                                    embedded={true}
                                    onTerminalAppend={appendToTerminal}
                                    onOpenDiff={handleOpenDiff}
                                />
                            </div>
                        )}
                    </div>

                    {/* Drag Handle */}
                    <div
                        className="sidebar-resizer ce-resizer"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            resizingRef.current = true;
                            document.body.style.cursor = 'col-resize';
                            document.body.style.userSelect = 'none';
                        }}
                        title="Drag to resize sidebar"
                        role="separator"
                        aria-orientation="vertical"
                        style={{ background: '#1c2128', cursor: 'col-resize', width: '3px', flexShrink: 0 }}
                    />

                    {/* Center: Editor */}
                    <div
                        className="code-editor-main"
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            background: '#161b22',
                        }}
                    >
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

                        <div className="editor-split" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <EditorBreadcrumb activeTab={activeTab} actions={blameBtn} />

                            <div className="editor-canvas" style={{ flex: 1, overflow: 'hidden' }}>
                                {!workspace ? (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#484f58' }}>
                                        <Code size={52} />
                                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#8b949e' }}>No workspace selected</h4>
                                        <p style={{ margin: 0, fontSize: '12px' }}>Create or select a workspace to start coding</p>
                                    </div>
                                ) : (
                                    <>
                                        {centerView === 'preview' ? (
                                            <PreviewPanel
                                                workspace={workspace}
                                                activeTab={activeTab}
                                                onClose={() => setCenterView('code')}
                                            />
                                        ) : centerView === 'diff' && diffFile ? (
                                            <DiffViewer
                                                workspace={workspace}
                                                file={diffFile}
                                                type={diffType}
                                                onClose={() => setCenterView('code')}
                                            />
                                        ) : activeTab ? (
                                            <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
                                                {showBlame && blameData && (
                                                    <BlameGutter
                                                        blameData={blameData}
                                                        editorRef={monacoEditorRef}
                                                        lineHeight={19}
                                                    />
                                                )}
                                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                                    <MonacoEditor
                                                        value={activeTab.content}
                                                        onChange={handleEditorChange}
                                                        language={activeTab.language}
                                                        path={activeTab.path}
                                                        onSave={handleSave}
                                                        onEditorMount={(editor) => { monacoEditorRef.current = editor; }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#484f58' }}>
                                                <Code size={52} />
                                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#8b949e' }}>No file open</h4>
                                                <p style={{ margin: 0, fontSize: '12px' }}>Select a file from the explorer to start editing</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Bottom Terminal Dock */}
                            <div
                                className={`bottom-dock ${terminalOpen ? 'open' : 'closed'}`}
                                style={{ background: '#0a0c0f', borderTop: terminalOpen ? '1px solid #1c2128' : 'none', flexShrink: 0 }}
                            >
                                <Terminal
                                    workspace={workspace}
                                    onClose={() => setTerminalOpen(false)}
                                    onTerminalApi={handleTerminalApi}
                                />
                            </div>
                        </div>

                        {/* Status Bar */}
                        <div style={{
                            height: '24px',
                            background: '#0d0f14',
                            borderTop: '1px solid #1c2128',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 16px',
                            flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                {[`⎇ ${currentBranch}`, activeTab?.language ?? 'plaintext'].map(s => (
                                    <span key={s} className="ce-status-item" style={{ fontSize: '10px', color: '#8b949e' }}>{s}</span>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                {['UTF-8', 'LF'].map(s => (
                                    <span key={s} className="ce-status-item" style={{ fontSize: '10px', color: '#8b949e' }}>{s}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div
                        className="code-editor-right"
                        style={{
                            background: '#0d0f14',
                            borderLeft: '1px solid #1c2128',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* Panel Tab Bar */}
                        <div
                            className="panel-tabs"
                            style={{
                                display: 'flex',
                                borderBottom: '1px solid #1c2128',
                                height: '44px',
                                alignItems: 'stretch',
                                flexShrink: 0,
                            }}
                        >
                            {rightPanels.map(({ id, icon, label }) => (
                                <button
                                    key={id}
                                    className="ce-panel-tab"
                                    onClick={() => setActivePanel(id)}
                                    title={label}
                                    style={{
                                        flex: 1,
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '2px',
                                        color: activePanel === id ? '#ff6b35' : '#8b949e',
                                        borderBottom: activePanel === id ? '2px solid #ff6b35' : '2px solid transparent',
                                        opacity: activePanel === id ? 1 : 0.65,
                                        fontSize: '8px',
                                        fontWeight: '600',
                                        letterSpacing: '0.08em',
                                        fontFamily: 'inherit',
                                        padding: 0,
                                    }}
                                >
                                    {icon}
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="panel-content" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                                                setTabs(prev => prev.map(t => t.path === change.path ? { ...t, content: change.content, unsaved: true } : t));
                                                if (activeTab?.path === change.path) {
                                                    setActiveTab(prev => ({ ...prev, content: change.content, unsaved: true }));
                                                }
                                            }
                                        });
                                    }}
                                />
                            )}
                            {activePanel === 'theme' && (
                                <ThemePanel workspace={workspace} onClose={() => {}} />
                            )}
                            {activePanel === 'approvals' && (
                                <ApprovalPanel
                                    workspace={workspace}
                                    onClose={() => {}}
                                    onApproved={() => {
                                        refreshFileTree();
                                        if (activeTab) handleFileSelect(activeTab);
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
