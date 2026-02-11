import React, { useState } from 'react';
import axios from 'axios';
import MonacoEditor from '@/Admin/components/CodeEditor/MonacoEditor';
import FileExplorer from '@/Admin/components/CodeEditor/FileExplorer';
import EditorTabs from '@/Admin/components/CodeEditor/EditorTabs';
import AIChatPanel from '@/Admin/components/CodeEditor/AIChatPanel';
import WorkspaceSelector from '@/Admin/components/CodeEditor/WorkspaceSelector';
import Terminal from '@/Admin/components/CodeEditor/Terminal';
import GitPanel from '@/Admin/components/CodeEditor/GitPanel';
import ApprovalPanel from '@/Admin/components/CodeEditor/ApprovalPanel';
import PageBreadcrumb from '@/Admin/components/PageBreadcrumb';
import { toast } from 'react-toastify';
import { Code, MessageSquare, Terminal as TerminalIcon, GitBranch, Clock } from 'lucide-react';

export default function CodeEditor() {
    const [workspace, setWorkspace] = useState(null);
    const [tabs, setTabs] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [activePanel, setActivePanel] = useState('chat'); // chat, terminal, git, approvals

    async function handleFileSelect(file) {
        if (!workspace) return;

        // Check if already open
        const existing = tabs.find(t => t.path === file.path);
        if (existing) {
            setActiveTab(existing);
            return;
        }

        // Load file content from workspace
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
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to load file');
        }
    }

    function handleWorkspaceSelect(selectedWorkspace) {
        setWorkspace(selectedWorkspace);
        setTabs([]);
        setActiveTab(null);
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

        setTabs(prev => prev.filter(t => t.path !== tab.path));

        if (activeTab?.path === tab.path) {
            const index = tabs.findIndex(t => t.path === tab.path);
            setActiveTab(tabs[index - 1] || tabs[index + 1] || null);
        }
    }

    function detectLanguage(extension) {
        const map = {
            js: 'javascript',
            jsx: 'javascript',
            ts: 'typescript',
            tsx: 'typescript',
            php: 'php',
            py: 'python',
            rb: 'ruby',
            java: 'java',
            css: 'css',
            scss: 'scss',
            html: 'html',
            json: 'json',
            md: 'markdown',
            sql: 'sql'
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
                    <div className="code-editor-sidebar">
                        <WorkspaceSelector
                            onWorkspaceSelect={handleWorkspaceSelect}
                            currentWorkspace={workspace}
                        />
                        <FileExplorer
                            workspace={workspace}
                            onFileSelect={handleFileSelect}
                            currentFile={activeTab}
                        />
                    </div>

                    {/* Center: Editor */}
                    <div className="code-editor-main">
                        <EditorTabs
                            tabs={tabs}
                            activeTab={activeTab}
                            onTabSelect={setActiveTab}
                            onTabClose={handleTabClose}
                        />

                        <div className="editor-canvas">
                            {!workspace ? (
                                <div className="editor-empty-state">
                                    <Code size={64} className="mb-3 opacity-50" />
                                    <h4>No workspace selected</h4>
                                    <p>Create or select a workspace to start coding</p>
                                </div>
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
                        </div>
                    </div>

                    {/* Right: Panels (AI, Terminal, Git, Approvals) */}
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
                                className={`panel-tab ${activePanel === 'terminal' ? 'active' : ''}`}
                                onClick={() => setActivePanel('terminal')}
                                title="Terminal"
                            >
                                <TerminalIcon size={18} />
                            </button>
                            <button
                                className={`panel-tab ${activePanel === 'git' ? 'active' : ''}`}
                                onClick={() => setActivePanel('git')}
                                title="Source Control"
                            >
                                <GitBranch size={18} />
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

                            {activePanel === 'terminal' && (
                                <Terminal
                                    workspace={workspace}
                                    onClose={() => {}}
                                />
                            )}

                            {activePanel === 'git' && (
                                <GitPanel
                                    workspace={workspace}
                                    onClose={() => {}}
                                />
                            )}

                            {activePanel === 'approvals' && (
                                <ApprovalPanel
                                    workspace={workspace}
                                    onClose={() => {}}
                                    onApproved={() => {
                                        // Refresh file explorer or reload current file
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
