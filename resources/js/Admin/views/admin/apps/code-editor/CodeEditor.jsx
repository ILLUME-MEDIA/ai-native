import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useCodeEditorTheme } from '@/Admin/components/CodeEditor/useCodeEditorTheme';
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
import CommandPalette from '@/Admin/components/CodeEditor/CommandPalette';
import OutlinePanel from '@/Admin/components/CodeEditor/OutlinePanel';
import ProblemsPanel from '@/Admin/components/CodeEditor/ProblemsPanel';
import SettingsPanel, { DEFAULT_EDITOR_SETTINGS } from '@/Admin/components/CodeEditor/SettingsPanel';
import KeyboardShortcutsPanel from '@/Admin/components/CodeEditor/KeyboardShortcutsPanel';
import MergeConflictPanel from '@/Admin/components/CodeEditor/MergeConflictPanel';
import PresenceIndicator from '@/Admin/components/CodeEditor/PresenceIndicator';
import VisualEditor from '@/Admin/components/CodeEditor/VisualEditor';
import WhiteboardPanel from '@/Admin/components/CodeEditor/WhiteboardPanel';
import TestRunnerPanel from '@/Admin/components/CodeEditor/TestRunnerPanel';
import HttpClientPanel from '@/Admin/components/CodeEditor/HttpClientPanel';
import DatabasePanel from '@/Admin/components/CodeEditor/DatabasePanel';
import DeployPanel from '@/Admin/components/CodeEditor/DeployPanel';
import CollaborationCursors from '@/Admin/components/CodeEditor/CollaborationCursors';
import PluginManagerPanel from '@/Admin/components/CodeEditor/PluginManagerPanel';
import { usePluginRegistry } from '@/Admin/components/CodeEditor/usePluginRegistry';
import MCPStorePanel from '@/Admin/components/CodeEditor/MCPStorePanel';
import AIRulesPanel from '@/Admin/components/CodeEditor/AIRulesPanel';
import FileHistoryPanel from '@/Admin/components/CodeEditor/FileHistoryPanel';
import TodoTrackerPanel from '@/Admin/components/CodeEditor/TodoTrackerPanel';
import RunConfigPanel from '@/Admin/components/CodeEditor/RunConfigPanel';
import LogViewerPanel from '@/Admin/components/CodeEditor/LogViewerPanel';
import SnippetsPanel from '@/Admin/components/CodeEditor/SnippetsPanel';
import AICodeReviewPanel from '@/Admin/components/CodeEditor/AICodeReviewPanel';
import EnvManagerPanel from '@/Admin/components/CodeEditor/EnvManagerPanel';
import { toast } from 'react-toastify';
import { Code, MessageSquare, Clock, Palette, Folder, GitBranch, Search, User, AlignLeft, Columns2, X as XIcon, Zap, Wrench, Settings, Star, Maximize2, Minimize2, Keyboard, AlertTriangle, Paintbrush, PenTool, Store, BookOpen, ListTodo, Play, FileText, Key, Globe, Database, FlaskConical, Rocket, Puzzle } from 'lucide-react';

export default function CodeEditor() {
    const [workspace, setWorkspace] = useState(null);
    const [tabs, setTabs] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [activePanel, setActivePanel] = useState('chat');
    const [leftView, setLeftView] = useState('explorer'); // 'explorer' | 'git' | 'search' | 'outline' | 'mcp'

    // Command Palette state
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [commandPaletteMode, setCommandPaletteMode] = useState('files'); // 'files' | 'commands'
    const [centerView, setCenterView] = useState('code'); // 'code' | 'preview' | 'diff' | 'merge' | 'visual' | 'whiteboard'
    const [terminalOpen, setTerminalOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = Number(localStorage.getItem('codeEditor.sidebarWidth'));
        return Number.isFinite(saved) && saved > 0 ? saved : 250;
    });

    // Diff state
    const [diffFile, setDiffFile] = useState(null);
    const [diffType, setDiffType] = useState('unstaged');

    // D-01: File comparison (any two files)
    const [compareFileA, setCompareFileA] = useState(null);
    const [compareFileB, setCompareFileB] = useState(null);

    // Blame state
    const [showBlame, setShowBlame] = useState(false);
    const [blameData, setBlameData] = useState(null);
    const [blameLoading, setBlameLoading] = useState(false);

    // Dynamic branch
    const [currentBranch, setCurrentBranch] = useState('main');

    // S3-1: Split Editor
    const [splitMode, setSplitMode] = useState(false);
    const [splitTabs, setSplitTabs] = useState([]);
    const [splitActiveTab, setSplitActiveTab] = useState(null);
    const [focusedPane, setFocusedPane] = useState('main'); // 'main' | 'split'
    const monacoSplitRef = useRef(null);

    // S3-2: AI Selection Actions
    const [selectionActionBar, setSelectionActionBar] = useState(null); // { text, top, left }
    const aiChatPrefillRef = useRef(null); // stores prefill setter from AIChatPanel
    const [aiChatPrefill, setAiChatPrefill] = useState(null);

    // S3-3: Problems Panel — bottom dock tab
    const [bottomTab, setBottomTab] = useState('terminal'); // 'terminal' | 'problems'

    // B-12: Zen Mode
    const [zenMode, setZenMode] = useState(false);
    const ctrlKPressedRef = useRef(false);

    // B-14: Keyboard Shortcuts Panel
    const [showShortcuts, setShowShortcuts] = useState(false);

    // ── Theme (light / dark / system) ──────────────────────────────
    const { isDark, tokens: t } = useCodeEditorTheme();

    // F-01: Plugin registry snapshot (plugin-contributed panels appear in activity bar)
    const { snapshot: pluginSnapshot } = usePluginRegistry();

    // B-06: AI Ghost Text
    const [ghostTextEnabled, setGhostTextEnabled] = useState(() => {
        try { return JSON.parse(localStorage.getItem('ce.ghostText') || 'false'); }
        catch { return false; }
    });

    // B-09: Editor Settings
    const [editorSettings, setEditorSettings] = useState(() => {
        try { return { ...DEFAULT_EDITOR_SETTINGS, ...JSON.parse(localStorage.getItem('ce.settings') || '{}') }; }
        catch { return { ...DEFAULT_EDITOR_SETTINGS }; }
    });

    // B-10: File Bookmarks — keyed by workspace ID
    const [allBookmarks, setAllBookmarks] = useState(() => {
        try { return JSON.parse(localStorage.getItem('ce.bookmarks') || '{}'); }
        catch { return {}; }
    });

    // A-03: Pinned Context — keyed by workspace ID
    const [allPinnedContext, setAllPinnedContext] = useState(() => {
        try { return JSON.parse(localStorage.getItem('ce.pinnedContext') || '{}'); }
        catch { return {}; }
    });

    // B-11: Recently Opened Files — keyed by workspace ID, last 10
    const [allRecents, setAllRecents] = useState(() => {
        try { return JSON.parse(localStorage.getItem('ce.recentFiles') || '{}'); }
        catch { return {}; }
    });

    // B-09: Snippets
    const [snippets, setSnippets] = useState([]);

    // B-08: File history panel
    const [showHistory, setShowHistory] = useState(false);

    // B-15: Merge conflict detection
    const conflictCount = (() => {
        if (!activeTab?.content) return 0;
        return (activeTab.content.match(/^<{7}\s/m) || []).length;
    })();

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

    // B-10: Bookmark helpers
    function getWorkspaceBookmarks() {
        return workspace ? (allBookmarks[workspace.id] || []) : [];
    }
    // B-11: Recent files helpers
    function getWorkspaceRecents() {
        return workspace ? (allRecents[workspace.id] || []) : [];
    }
    function pushRecentFile(file) {
        if (!workspace || !file?.path) return;
        const current = allRecents[workspace.id] || [];
        const deduped = current.filter(r => r.path !== file.path);
        const updated = [{ path: file.path, name: file.name || file.path.split('/').pop() }, ...deduped].slice(0, 10);
        const next = { ...allRecents, [workspace.id]: updated };
        setAllRecents(next);
        localStorage.setItem('ce.recentFiles', JSON.stringify(next));
        // Also sync with CommandPalette's key so both stay consistent
        try {
            const cpRecent = JSON.parse(localStorage.getItem('ce.commandPalette.recentFiles') || '[]').filter(p => p !== file.path);
            localStorage.setItem('ce.commandPalette.recentFiles', JSON.stringify([file.path, ...cpRecent].slice(0, 10)));
        } catch {}
    }

    function toggleBookmark(file) {
        if (!workspace) return;
        const wbm = allBookmarks[workspace.id] || [];
        const isBookmarked = wbm.some(b => b.path === file.path);
        const newWbm = isBookmarked
            ? wbm.filter(b => b.path !== file.path)
            : [...wbm, { path: file.path, name: file.name }];
        const next = { ...allBookmarks, [workspace.id]: newWbm };
        setAllBookmarks(next);
        localStorage.setItem('ce.bookmarks', JSON.stringify(next));
    }

    // A-03: Pinned context helpers
    function getWorkspacePinnedFiles() {
        return workspace ? (allPinnedContext[workspace.id] || []) : [];
    }
    function togglePinnedFile(file) {
        if (!workspace) return;
        const wpc = allPinnedContext[workspace.id] || [];
        const isPinned = wpc.some(p => p.path === file.path);
        const newWpc = isPinned
            ? wpc.filter(p => p.path !== file.path)
            : [...wpc, { path: file.path, name: file.name || file.path.split('/').pop() }];
        const next = { ...allPinnedContext, [workspace.id]: newWpc };
        setAllPinnedContext(next);
        localStorage.setItem('ce.pinnedContext', JSON.stringify(next));
    }

    // B-05: Run Configurations — execute in terminal
    async function handleRunConfig(cfg) {
        if (!workspace) return;
        setTerminalOpen(true);
        setBottomTab('terminal');
        appendToTerminal([{ type: 'command', content: cfg.command, dir: cfg.cwd || '/' }]);
        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/terminal/execute`, {
                command: cfg.command,
                cwd: cfg.cwd || '',
            });
            const entries = [];
            if (resp.data?.output) entries.push({ type: 'output', content: resp.data.output });
            if (resp.data?.error)  entries.push({ type: 'stderr', content: resp.data.error });
            if (entries.length) appendToTerminal(entries);
        } catch (e) {
            appendToTerminal([{ type: 'error', content: e.response?.data?.error || e.message || 'Run failed' }]);
        }
    }

    // B-09: Settings updater — applies to Monaco live
    function updateEditorSettings(newSettings) {
        setEditorSettings(newSettings);
        localStorage.setItem('ce.settings', JSON.stringify(newSettings));
        if (monacoEditorRef.current) {
            monacoEditorRef.current.updateOptions({
                fontSize: newSettings.fontSize,
                tabSize: newSettings.tabSize,
                wordWrap: newSettings.wordWrap ? 'on' : 'off',
                minimap: { enabled: newSettings.minimap },
            });
        }
    }

    // Fetch current branch when workspace changes
    useEffect(() => {
        if (!workspace?.git_enabled) { setCurrentBranch('main'); return; }
        axios.get(`/api/workspaces/${workspace.id}/git/branches`)
            .then(r => { if (r.data.current) setCurrentBranch(r.data.current); })
            .catch(() => {});
    }, [workspace]);

    // B-09: Load snippets when workspace changes
    useEffect(() => {
        if (!workspace) { setSnippets([]); return; }
        axios.get(`/api/workspaces/${workspace.id}/snippets`)
            .then(r => setSnippets(r.data || []))
            .catch(() => setSnippets([]));
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

    // Global keyboard shortcuts
    useEffect(() => {
        function handleKeyDown(e) {
            const ctrl = e.ctrlKey || e.metaKey;
            const key = e.key.toLowerCase();

            // Ctrl+Shift+P = command palette (commands mode)
            if (ctrl && key === 'p' && e.shiftKey) {
                e.preventDefault();
                setCommandPaletteMode('commands');
                setShowCommandPalette(true);
                return;
            }
            // Ctrl+P = command palette (files mode)
            if (ctrl && key === 'p' && !e.shiftKey) {
                e.preventDefault();
                setCommandPaletteMode('files');
                setShowCommandPalette(true);
                return;
            }
            // B-11: Ctrl+Shift+E = jump to recent files (command palette in files mode)
            if (ctrl && e.shiftKey && key === 'e') {
                e.preventDefault();
                setCommandPaletteMode('files');
                setShowCommandPalette(true);
                return;
            }
            // B-12: Ctrl+K chord → then Z = toggle zen mode
            if (ctrl && key === 'k') {
                ctrlKPressedRef.current = true;
                setTimeout(() => { ctrlKPressedRef.current = false; }, 1500);
                return;
            }
            if (ctrlKPressedRef.current && key === 'z') {
                e.preventDefault();
                ctrlKPressedRef.current = false;
                setZenMode(v => !v);
                return;
            }
            // B-14: Ctrl+K then S = keyboard shortcuts panel
            if (ctrlKPressedRef.current && key === 's') {
                e.preventDefault();
                ctrlKPressedRef.current = false;
                setShowShortcuts(true);
                return;
            }
            // B-12: Esc exits zen mode
            if (e.key === 'Escape') {
                setZenMode(false);
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    async function handleFileSelect(file) {
        if (!workspace) return;
        setLeftView('explorer');
        setShowHistory(false);

        // S3-1: Route to focused pane
        if (focusedPane === 'split' && splitMode) {
            const existing = splitTabs.find(t => t.path === file.path);
            if (existing) {
                setSplitActiveTab(existing);
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
                setSplitTabs(prev => [...prev, newTab]);
                setSplitActiveTab(newTab);
                setCenterView('code');
            } catch (error) {
                toast.error(error.response?.data?.error || 'Failed to load file');
            }
            return;
        }

        const existing = tabs.find(t => t.path === file.path);
        if (existing) {
            setActiveTab(existing);
            setCenterView('code');
            pushRecentFile(file);
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
            pushRecentFile(file);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to load file');
        }
    }

    // S3-1: Split pane tab handlers
    function handleSplitTabClose(tab) {
        if (tab.unsaved && !confirm('File has unsaved changes. Close anyway?')) return;
        const newTabs = splitTabs.filter(t => t.path !== tab.path);
        setSplitTabs(newTabs);
        if (splitActiveTab?.path === tab.path) {
            const index = splitTabs.findIndex(t => t.path === tab.path);
            setSplitActiveTab(newTabs[index - 1] || newTabs[index] || null);
        }
    }

    function handleSplitEditorChange(newValue) {
        if (!splitActiveTab) return;
        setSplitTabs(prev => prev.map(tab => tab.path === splitActiveTab.path ? { ...tab, content: newValue, unsaved: true } : tab));
        setSplitActiveTab(prev => ({ ...prev, content: newValue, unsaved: true }));
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
        setCompareFileA(null);
        setCompareFileB(null);
        setCenterView('diff');
    }

    // D-01: Compare two arbitrary files
    function handleCompareWith(fileA, fileB) {
        setCompareFileA(fileA);
        setCompareFileB(fileB);
        setDiffFile(null);
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

    // S3-1: dismiss selection bar when split focus changes
    useEffect(() => {
        setSelectionActionBar(null);
    }, [focusedPane]);

    // S3-2: AI Selection Actions
    function handleSelectionChange(selInfo) {
        if (!selInfo) {
            setSelectionActionBar(null);
            return;
        }
        setSelectionActionBar({
            text: selInfo.text,
            top: selInfo.top,
            left: selInfo.left,
        });
    }

    function handleAISelectionAction(action, text) {
        const templates = {
            explain: `Explain what this code does:\n\`\`\`\n${text}\n\`\`\``,
            fix: `Find and fix any bugs in this code:\n\`\`\`\n${text}\n\`\`\``,
            tests: `Generate unit tests for this code:\n\`\`\`\n${text}\n\`\`\``,
            docs: `Add JSDoc/PHPDoc documentation comments to this code:\n\`\`\`\n${text}\n\`\`\``,
            refactor: `Refactor this code to be cleaner and more maintainable:\n\`\`\`\n${text}\n\`\`\``,
        };
        const message = templates[action] || text;
        setAiChatPrefill(message);
        setActivePanel('chat');
        setSelectionActionBar(null);
    }

    function handleWorkspaceSelect(selectedWorkspace) {
        setWorkspace(selectedWorkspace);
        setTabs([]);
        setActiveTab(null);
        setLeftView('explorer');
        setCenterView('code');
        setShowBlame(false);
        setBlameData(null);
        // Reset split state
        setSplitMode(false);
        setSplitTabs([]);
        setSplitActiveTab(null);
        setFocusedPane('main');
        setSelectionActionBar(null);
    }

    function handleEditorChange(newValue) {
        if (!activeTab) return;
        setTabs(prev => prev.map(tab => tab.path === activeTab.path ? { ...tab, content: newValue, unsaved: true } : tab));
        setActiveTab(prev => ({ ...prev, content: newValue, unsaved: true }));
    }

    async function handleSave(content) {
        if (!activeTab || !workspace) return;
        let finalContent = content || activeTab.content;
        try {
            // Format on save (only if enabled in settings)
            if (editorSettings.formatOnSave !== false) try {
                const formatRes = await axios.post(`/api/workspaces/${workspace.id}/files/format`, {
                    path: activeTab.path,
                    content: finalContent,
                });
                if (formatRes.data?.content && formatRes.data.content !== finalContent) {
                    const formatted = formatRes.data.content;
                    const editor = monacoEditorRef.current;
                    if (editor) {
                        const pos = editor.getPosition();
                        editor.setValue(formatted);
                        if (pos) editor.setPosition(pos);
                    }
                    finalContent = formatted;
                    // Update tab state with formatted content
                    setTabs(prev => prev.map(tab =>
                        tab.path === activeTab.path ? { ...tab, content: formatted } : tab
                    ));
                    setActiveTab(prev => ({ ...prev, content: formatted }));
                }
            } catch {
                // Format failure is non-fatal — continue with save
            }

            await axios.post(`/api/workspaces/${workspace.id}/files/write`, {
                path: activeTab.path,
                content: finalContent,
            });
            setTabs(prev => prev.map(tab => tab.path === activeTab.path ? { ...tab, unsaved: false } : tab));
            setActiveTab(prev => ({ ...prev, unsaved: false }));
            toast.success('File saved');

            // B-08: Save snapshot (fire-and-forget)
            axios.post(`/api/workspaces/${workspace.id}/files/snapshot`, {
                path: activeTab.path,
                content: finalContent,
            }).catch(() => {});
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

    // null = visual divider
    const activityItems = [
        { id: 'explorer',    icon: <Folder size={16} />,     label: 'Explorer',           action: () => setLeftView('explorer'),                                                          isActive: () => leftView === 'explorer' },
        { id: 'search',      icon: <Search size={16} />,     label: 'Search',             action: () => setLeftView('search'),                                                            isActive: () => leftView === 'search' },
        { id: 'git',         icon: <GitBranch size={16} />,  label: 'Source Control',     action: () => setLeftView('git'),                                                               isActive: () => leftView === 'git' },
        { id: 'outline',     icon: <AlignLeft size={16} />,  label: 'Outline',            action: () => setLeftView('outline'),                                                           isActive: () => leftView === 'outline' },
        { id: 'settings',    icon: <Settings size={16} />,   label: 'Settings',           action: () => setLeftView('settings'),                                                          isActive: () => leftView === 'settings' },
        null, // ── Design ──
        { id: 'visual',      icon: <Paintbrush size={16} />, label: 'Visual Editor',      action: () => setCenterView(v => v === 'visual'      ? 'code' : 'visual'),      isActive: () => centerView === 'visual' },
        { id: 'whiteboard',  icon: <PenTool size={16} />,    label: 'Whiteboard',         action: () => setCenterView(v => v === 'whiteboard'  ? 'code' : 'whiteboard'),  isActive: () => centerView === 'whiteboard' },
        null, // ── Tools ──
        { id: 'http-client', icon: <Globe size={16} />,      label: 'HTTP Client',        action: () => setCenterView(v => v === 'http-client' ? 'code' : 'http-client'), isActive: () => centerView === 'http-client' },
        { id: 'database',    icon: <Database size={16} />,   label: 'Database Viewer',    action: () => setCenterView(v => v === 'database'    ? 'code' : 'database'),    isActive: () => centerView === 'database' },
        { id: 'deploy',      icon: <Rocket size={16} />,     label: 'Deploy',             action: () => setCenterView(v => v === 'deploy'      ? 'code' : 'deploy'),      isActive: () => centerView === 'deploy' },
        null, // ── Config ──
        { id: 'ai-rules',    icon: <BookOpen size={16} />,   label: 'AI Rules',           action: () => setLeftView(v => v === 'ai-rules'    ? 'explorer' : 'ai-rules'),    isActive: () => leftView === 'ai-rules' },
        { id: 'run-configs', icon: <Play size={16} />,       label: 'Run Configurations', action: () => setLeftView(v => v === 'run-configs' ? 'explorer' : 'run-configs'), isActive: () => leftView === 'run-configs' },
        { id: 'snippets',    icon: <Zap size={16} />,        label: 'Snippets',           action: () => setLeftView(v => v === 'snippets'    ? 'explorer' : 'snippets'),    isActive: () => leftView === 'snippets' },
        { id: 'env',         icon: <Key size={16} />,        label: 'Env Manager',        action: () => setLeftView(v => v === 'env'         ? 'explorer' : 'env'),         isActive: () => leftView === 'env' },
        { id: 'mcp',         icon: <Store size={16} />,      label: 'MCP Store',          action: () => setLeftView(v => v === 'mcp'         ? 'explorer' : 'mcp'),         isActive: () => leftView === 'mcp' },
        { id: 'plugins',     icon: <Puzzle size={16} />,     label: 'Plugins',            action: () => setLeftView(v => v === 'plugins'     ? 'explorer' : 'plugins'),     isActive: () => leftView === 'plugins' },
        // F-01: Plugin-contributed left panels
        ...pluginSnapshot.panels.filter(p => p.slot === 'left').map(p => ({
            id: p.id, icon: p.icon ?? <Puzzle size={16} />, label: p.label,
            action: () => setLeftView(v => v === p.id ? 'explorer' : p.id),
            isActive: () => leftView === p.id,
        })),
    ];

    const rightPanels = [
        { id: 'chat',      icon: <MessageSquare size={14} />, label: 'AI CHAT' },
        { id: 'review',    icon: <Wrench size={14} />,        label: 'REVIEW' },
        { id: 'theme',     icon: <Palette size={14} />,       label: 'THEME' },
        { id: 'approvals', icon: <Clock size={14} />,         label: 'APPROVALS' },
    ];

    const breadcrumbBtnStyle = (active) => ({
        background: active ? 'rgba(255,107,53,0.12)' : 'none',
        border: active ? '1px solid rgba(255,107,53,0.3)' : '1px solid transparent',
        borderRadius: '3px',
        color: active ? '#ff6b35' : '#8b949e',
        cursor: 'pointer',
        padding: '2px 5px',
        display: 'flex', alignItems: 'center',
        fontSize: '10px', fontFamily: 'inherit', gap: '3px',
    });

    const blameBtn = activeTab ? (
        <>
            {/* B-08: File History */}
            <button
                onClick={() => setShowHistory(v => !v)}
                title={showHistory ? 'Close file history' : 'Show file history'}
                style={breadcrumbBtnStyle(showHistory)}
            >
                <Clock size={11} />
            </button>
            {/* Git Blame */}
            {workspace?.git_enabled && (
                <button
                    onClick={handleBlameToggle}
                    title={showBlame ? 'Hide blame' : 'Show git blame'}
                    disabled={blameLoading}
                    style={{
                        ...breadcrumbBtnStyle(showBlame),
                        color: showBlame ? '#ff6b35' : blameLoading ? '#484f58' : '#8b949e',
                        cursor: blameLoading ? 'wait' : 'pointer',
                    }}
                >
                    <User size={11} />
                </button>
            )}
        </>
    ) : null;

    return (
        <>
            <CommandPalette
                visible={showCommandPalette}
                mode={commandPaletteMode}
                workspace={workspace}
                openTabs={tabs}
                onClose={() => setShowCommandPalette(false)}
                onOpenFile={(path) => {
                    handleFileSelect({ path, name: path.split('/').pop() });
                    setShowCommandPalette(false);
                }}
                onRunCommand={() => setShowCommandPalette(false)}
                monacoEditorRef={monacoEditorRef}
            />

            {/* B-14: Keyboard Shortcuts Panel */}
            <KeyboardShortcutsPanel
                visible={showShortcuts}
                onClose={() => setShowShortcuts(false)}
            />

            {/* C-02: Collaboration cursors — invisible, manages Monaco decorations */}
            {workspace && (
                <CollaborationCursors
                    workspace={workspace}
                    monacoEditorRef={monacoEditorRef}
                    activeTab={activeTab}
                />
            )}

            {/* S3-2: AI Selection Action Bar */}
            {selectionActionBar && (
                <div style={{
                    position: 'fixed',
                    top: Math.max(8, selectionActionBar.top - 44),
                    left: selectionActionBar.left,
                    zIndex: 9998,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    background: t.bg3,
                    border: `1px solid ${t.border}`,
                    borderRadius: '6px',
                    padding: '3px',
                    boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.15)',
                    fontFamily: "'JetBrains Mono', monospace",
                }}>
                    {[
                        { id: 'explain', label: 'Explain' },
                        { id: 'fix', label: 'Fix' },
                        { id: 'tests', label: 'Tests' },
                        { id: 'docs', label: 'Docs' },
                        { id: 'refactor', label: 'Refactor' },
                    ].map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => handleAISelectionAction(id, selectionActionBar.text)}
                            title={`AI: ${label}`}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: t.text2,
                                cursor: 'pointer',
                                padding: '3px 8px',
                                fontSize: '10px',
                                fontFamily: 'inherit',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = t.accentBg; e.currentTarget.style.color = t.accent; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = t.text2; }}
                        >
                            <Zap size={9} />
                            {label}
                        </button>
                    ))}
                    <button
                        onClick={() => setSelectionActionBar(null)}
                        title="Dismiss"
                        style={{ background: 'none', border: 'none', color: t.text4, cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center', marginLeft: '2px' }}
                        onMouseEnter={e => { e.currentTarget.style.color = t.text3; }}
                        onMouseLeave={e => { e.currentTarget.style.color = t.text4; }}
                    >
                        <XIcon size={10} />
                    </button>
                </div>
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');

                .ce-root, .ce-root * { box-sizing: border-box; }
                .ce-root { font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace; }
                .ce-root ::-webkit-scrollbar { width: 4px; height: 4px; }
                .ce-root ::-webkit-scrollbar-track { background: transparent; }
                .ce-root ::-webkit-scrollbar-thumb { background: ${t.scrollbar}; border-radius: 4px; }

                .ce-activity-btn { transition: color 0.15s, background 0.15s, border-color 0.15s; }
                .ce-activity-btn:hover { color: ${t.accent} !important; background: ${t.accentBg} !important; border-color: ${t.accentBorder} !important; }

                .ce-panel-tab { transition: color 0.15s, border-color 0.15s, opacity 0.15s; }
                .ce-panel-tab:hover { opacity: 1 !important; color: ${t.accent} !important; }

                .ce-resizer { transition: background 0.15s; }
                .ce-resizer:hover { background: rgba(255, 107, 53, 0.4) !important; }

                .ce-status-item { transition: color 0.15s; cursor: default; }
                .ce-status-item:hover { color: ${t.text1} !important; }
            `}</style>

            <div
                className="ce-root code-editor-container"
                style={{
                    background: t.bg1,
                    color: t.text2,
                    overflow: 'hidden',
                    height: 'calc(100vh - 65px)',
                    margin: '0 -1.25rem',
                }}
            >
                <div className="code-editor-layout" style={{ display: 'flex', height: '100%' }}>
                    {/* Activity Bar — hidden in zen mode */}
                    <div style={{
                        width: zenMode ? 0 : '44px',
                        background: t.bg1,
                        borderRight: zenMode ? 'none' : `1px solid ${t.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        paddingTop: '12px',
                        paddingBottom: '8px',
                        gap: '4px',
                        flexShrink: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        scrollbarWidth: 'none',
                        transition: 'width 0.2s',
                    }}>
                        {activityItems.map((item, i) => {
                            if (!item) return (
                                <div key={`div-${i}`} style={{ width: '24px', height: '1px', background: t.border, margin: '4px 0', flexShrink: 0 }} />
                            );
                            const { id, icon, label, action, isActive } = item;
                            const active = isActive();
                            return (
                                <button
                                    key={id}
                                    className="ce-activity-btn"
                                    onClick={action}
                                    title={label}
                                    style={{
                                        background: active ? t.accentBg : 'none',
                                        border: active ? `1px solid ${t.accentBorder}` : '1px solid transparent',
                                        color: active ? t.accent : t.text3,
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
                            );
                        })}
                    </div>

                    {/* Left Sidebar — hidden in zen mode */}
                    {!zenMode && (
                        <div
                            className="code-editor-sidebar"
                            style={{
                                width: `${sidebarWidth}px`,
                                background: t.bg2,
                                borderRight: `1px solid ${t.border}`,
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
                                isDark={isDark}
                            />

                            {leftView === 'explorer' && (
                                <FileExplorer
                                    workspace={workspace}
                                    onFileSelect={handleFileSelect}
                                    currentFile={activeTab}
                                    onTreeRefresh={handleTreeRefresh}
                                    bookmarks={getWorkspaceBookmarks()}
                                    onToggleBookmark={toggleBookmark}
                                    recentFiles={getWorkspaceRecents()}
                                    pinnedPaths={new Set(getWorkspacePinnedFiles().map(p => p.path))}
                                    onTogglePin={togglePinnedFile}
                                    onCompareWith={handleCompareWith}
                                />
                            )}

                            {leftView === 'search' && (
                                <SearchPanel
                                    workspace={workspace}
                                    onResultClick={handleResultClick}
                                    isDark={isDark}
                                />
                            )}

                            {leftView === 'git' && (
                                <div className={`git-panel git-panel-embedded${isDark ? '' : ' git-panel-light'}`} style={{ flex: 1, overflow: 'hidden' }}>
                                    <GitPanel
                                        workspace={workspace}
                                        onClose={() => {}}
                                        embedded={true}
                                        onTerminalAppend={appendToTerminal}
                                        onOpenDiff={handleOpenDiff}
                                    />
                                </div>
                            )}

                            {leftView === 'outline' && (
                                <OutlinePanel
                                    monacoEditorRef={monacoEditorRef}
                                    activeFile={activeTab?.path}
                                    isDark={isDark}
                                    onJumpToLine={(line) => {
                                        if (monacoEditorRef.current) {
                                            monacoEditorRef.current.revealLineInCenter(line);
                                            monacoEditorRef.current.setPosition({ lineNumber: line, column: 1 });
                                        }
                                    }}
                                />
                            )}

                            {/* B-09: Settings Panel */}
                            {leftView === 'settings' && (
                                <SettingsPanel
                                    settings={editorSettings}
                                    onChange={updateEditorSettings}
                                    isDark={isDark}
                                />
                            )}

                            {/* C-03: MCP Store */}
                            {leftView === 'mcp' && (
                                <MCPStorePanel workspace={workspace} isDark={isDark} />
                            )}

                            {/* A-01: AI Rules */}
                            {leftView === 'ai-rules' && (
                                <AIRulesPanel workspace={workspace} />
                            )}

                            {/* B-05: Run Configurations */}
                            {leftView === 'run-configs' && (
                                <RunConfigPanel
                                    workspace={workspace}
                                    onRunConfig={handleRunConfig}
                                />
                            )}

                            {/* B-09: Snippets */}
                            {leftView === 'snippets' && (
                                <SnippetsPanel
                                    workspace={workspace}
                                    snippets={snippets}
                                    onSnippetsChange={setSnippets}
                                />
                            )}

                            {/* B-06: Env Manager */}
                            {leftView === 'env' && (
                                <EnvManagerPanel workspace={workspace} />
                            )}

                            {/* F-01: Plugin Manager */}
                            {leftView === 'plugins' && (
                                <PluginManagerPanel />
                            )}

                            {/* F-01: Plugin-contributed left panels */}
                            {pluginSnapshot.panels.filter(p => p.slot === 'left').map(p => (
                                leftView === p.id && (
                                    <p.component key={p.id} workspace={workspace} {...(p.props ?? {})} />
                                )
                            ))}
                        </div>
                    )}

                    {/* Drag Handle — hidden in zen mode */}
                    {!zenMode && (
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
                            style={{ background: t.border, cursor: 'col-resize', width: '3px', flexShrink: 0 }}
                        />
                    )}

                    {/* Center: Editor */}
                    <div
                        className="code-editor-main"
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            background: t.bg3,
                        }}
                    >
                        {/* Tab bar row: EditorTabs + Split button */}
                        <div style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0, background: t.bgTab }}>
                            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                <EditorTabs
                                    tabs={tabs}
                                    activeTab={activeTab}
                                    activeCenterView={centerView}
                                    onTabSelect={(tab) => {
                                        setFocusedPane('main');
                                        setActiveTab(tab);
                                        if (centerView === 'merge') setCenterView('code');
                                        else setCenterView('code');
                                    }}
                                    onPreviewSelect={() => setCenterView('preview')}
                                    terminalOpen={terminalOpen}
                                    onToggleTerminal={() => setTerminalOpen(v => !v)}
                                    onTabClose={handleTabClose}
                                />
                            </div>
                            {/* S3-1: Split Editor toggle */}
                            <button
                                onClick={() => {
                                    if (splitMode) {
                                        setSplitMode(false);
                                        setSplitTabs([]);
                                        setSplitActiveTab(null);
                                        setFocusedPane('main');
                                    } else {
                                        setSplitMode(true);
                                        setFocusedPane('main');
                                    }
                                }}
                                title={splitMode ? 'Close Split Editor' : 'Split Editor Right'}
                                style={{
                                    background: splitMode ? t.accentBg : 'none',
                                    border: 'none',
                                    borderLeft: `1px solid ${t.border}`,
                                    color: splitMode ? t.accent : t.text3,
                                    padding: '0 10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '10px',
                                    fontFamily: 'inherit',
                                    flexShrink: 0,
                                    transition: 'color 0.15s, background 0.15s',
                                }}
                            >
                                {splitMode ? <XIcon size={12} /> : <Columns2 size={13} />}
                            </button>
                        </div>

                        <div className="editor-split" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <EditorBreadcrumb activeTab={focusedPane === 'split' ? splitActiveTab : activeTab} actions={blameBtn} isDark={isDark} />

                            {/* B-15: Merge conflict banner */}
                            {conflictCount > 0 && centerView !== 'merge' && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '4px 14px', flexShrink: 0,
                                    background: 'rgba(210,153,34,0.1)',
                                    borderBottom: '1px solid rgba(210,153,34,0.25)',
                                    fontSize: '11px',
                                }}>
                                    <AlertTriangle size={11} style={{ color: '#d29922', flexShrink: 0 }} />
                                    <span style={{ color: '#d29922' }}>
                                        {conflictCount} merge conflict{conflictCount > 1 ? 's' : ''} in this file
                                    </span>
                                    <button
                                        onClick={() => setCenterView('merge')}
                                        style={{
                                            background: 'rgba(210,153,34,0.15)', border: '1px solid rgba(210,153,34,0.35)',
                                            borderRadius: '4px', color: '#d29922', cursor: 'pointer',
                                            padding: '1px 8px', fontSize: '10px', fontFamily: 'inherit',
                                            marginLeft: '4px',
                                        }}
                                    >
                                        Resolve →
                                    </button>
                                </div>
                            )}

                            <div className="editor-canvas" style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                                {/* B-08: File History Overlay */}
                                {showHistory && activeTab && (
                                    <FileHistoryPanel
                                        workspace={workspace}
                                        activeTab={activeTab}
                                        onClose={() => setShowHistory(false)}
                                        onRestore={(content) => {
                                            setTabs(prev => prev.map(t =>
                                                t.path === activeTab.path
                                                    ? { ...t, content, unsaved: true }
                                                    : t
                                            ));
                                            setActiveTab(prev => ({ ...prev, content, unsaved: true }));
                                            if (monacoEditorRef.current) monacoEditorRef.current.setValue(content);
                                        }}
                                    />
                                )}
                                {centerView === 'http-client' ? (
                                    <HttpClientPanel workspace={workspace} />
                                ) : centerView === 'database' ? (
                                    <DatabasePanel workspace={workspace} />
                                ) : centerView === 'deploy' ? (
                                    <DeployPanel workspace={workspace} />
                                ) : centerView === 'visual' ? (
                                    <VisualEditor
                                        workspace={workspace}
                                        activeTab={activeTab}
                                    />
                                ) : centerView === 'whiteboard' ? (
                                    <WhiteboardPanel
                                        workspace={workspace}
                                        onCreateFile={({ name, content, language }) => {
                                            const newTab = {
                                                path: `whiteboard/${name}`,
                                                name,
                                                content,
                                                language: language || 'javascript',
                                                unsaved: true,
                                            };
                                            setTabs(prev => [...prev, newTab]);
                                            setActiveTab(newTab);
                                            setCenterView('code');
                                        }}
                                    />
                                ) : !workspace ? (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: t.text4 }}>
                                        <Code size={52} />
                                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: t.text3 }}>No workspace selected</h4>
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
                                        ) : centerView === 'diff' && (diffFile || (compareFileA && compareFileB)) ? (
                                            <DiffViewer
                                                workspace={workspace}
                                                file={diffFile}
                                                type={diffType}
                                                fileA={compareFileA}
                                                fileB={compareFileB}
                                                onClose={() => { setCenterView('code'); setCompareFileA(null); setCompareFileB(null); }}
                                            />
                                        ) : centerView === 'merge' && activeTab ? (
                                            <MergeConflictPanel
                                                file={activeTab}
                                                workspace={workspace}
                                                onResolved={(newContent) => {
                                                    setTabs(prev => prev.map(t =>
                                                        t.path === activeTab.path ? { ...t, content: newContent, unsaved: true } : t
                                                    ));
                                                    setActiveTab(prev => ({ ...prev, content: newContent, unsaved: true }));
                                                    if (monacoEditorRef.current) monacoEditorRef.current.setValue(newContent);
                                                    setCenterView('code');
                                                    toast.success('All conflicts resolved');
                                                }}
                                                onClose={() => setCenterView('code')}
                                            />
                                        ) : (
                                            /* S3-1: Split / Single pane layout */
                                            <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
                                                {/* Left / Main pane */}
                                                <div
                                                    style={{ flex: 1, display: 'flex', overflow: 'hidden', outline: focusedPane === 'main' && splitMode ? `1px solid ${t.accentBorder}` : 'none' }}
                                                    onClick={() => setFocusedPane('main')}
                                                >
                                                    {activeTab ? (
                                                        <>
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
                                                                    onSelectionChange={handleSelectionChange}
                                                                    settings={editorSettings}
                                                                    ghostTextEnabled={ghostTextEnabled}
                                                                    workspaceId={workspace?.id}
                                                                    snippets={snippets}
                                                                />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: t.text4 }}>
                                                            <Code size={52} />
                                                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: t.text3 }}>No file open</h4>
                                                            <p style={{ margin: 0, fontSize: '12px' }}>Select a file from the explorer to start editing</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* S3-1: Right split pane */}
                                                {splitMode && (
                                                    <>
                                                        <div style={{ width: '1px', background: t.border, flexShrink: 0 }} />
                                                        <div
                                                            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', outline: focusedPane === 'split' ? `1px solid ${t.accentBorder}` : 'none' }}
                                                            onClick={() => setFocusedPane('split')}
                                                        >
                                                            {/* Split pane tab bar */}
                                                            <div style={{ background: t.bg2, borderBottom: `1px solid ${t.border}`, display: 'flex', overflow: 'hidden', flexShrink: 0, minHeight: '34px' }}>
                                                                {splitTabs.map((tab, index) => (
                                                                    <div
                                                                        key={`split-${tab.path}-${index}`}
                                                                        onClick={(e) => { e.stopPropagation(); setFocusedPane('split'); setSplitActiveTab(tab); }}
                                                                        style={{
                                                                            display: 'flex', alignItems: 'center', gap: '5px',
                                                                            padding: '5px 10px',
                                                                            borderRight: `1px solid ${t.border}`,
                                                                            cursor: 'pointer',
                                                                            background: splitActiveTab?.path === tab.path ? t.bg3 : 'transparent',
                                                                            borderBottom: splitActiveTab?.path === tab.path ? `2px solid ${t.accent}` : '2px solid transparent',
                                                                            color: splitActiveTab?.path === tab.path ? t.text1 : t.text3,
                                                                            fontSize: '11px',
                                                                            fontFamily: 'inherit',
                                                                            whiteSpace: 'nowrap',
                                                                            userSelect: 'none',
                                                                        }}
                                                                    >
                                                                        <span>{tab.name}</span>
                                                                        {tab.unsaved && <span style={{ color: '#d29922' }}>●</span>}
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleSplitTabClose(tab); }}
                                                                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', opacity: 0.6 }}
                                                                        >
                                                                            <XIcon size={11} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                {splitTabs.length === 0 && (
                                                                    <div style={{ padding: '5px 10px', color: t.text4, fontSize: '11px', fontFamily: 'inherit', alignSelf: 'center' }}>
                                                                        Click a file to open here
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Split pane editor */}
                                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                                {splitActiveTab ? (
                                                                    <MonacoEditor
                                                                        value={splitActiveTab.content}
                                                                        onChange={handleSplitEditorChange}
                                                                        language={splitActiveTab.language}
                                                                        path={splitActiveTab.path}
                                                                        onSave={handleSave}
                                                                        onEditorMount={(editor) => { monacoSplitRef.current = editor; }}
                                                                        onSelectionChange={(sel) => { if (focusedPane === 'split') handleSelectionChange(sel); }}
                                                                        settings={editorSettings}
                                                                        theme={t.monacoTheme}
                                                                    />
                                                                ) : (
                                                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: t.text4 }}>
                                                                        <Columns2 size={36} />
                                                                        <p style={{ margin: 0, fontSize: '12px' }}>Click a file in the explorer</p>
                                                                        <p style={{ margin: 0, fontSize: '11px', color: t.scrollbar }}>This pane is focused</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Bottom Dock: Terminal + Problems tabs — hidden in zen mode */}
                            <div
                                className={`bottom-dock ${terminalOpen && !zenMode ? 'open' : 'closed'}`}
                                style={{ background: t.bg1, borderTop: terminalOpen && !zenMode ? `1px solid ${t.border}` : 'none', flexShrink: 0, display: zenMode ? 'none' : 'flex', flexDirection: 'column' }}
                            >
                                {terminalOpen && (
                                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${t.border}`, background: t.bg2, flexShrink: 0 }}>
                                        {[
                                            { id: 'terminal', label: 'TERMINAL',     icon: null },
                                            { id: 'problems', label: 'PROBLEMS',     icon: <Wrench size={10} /> },
                                            { id: 'todo',     label: 'TODO',         icon: <ListTodo size={10} /> },
                                            { id: 'logs',     label: 'LOGS',         icon: <FileText size={10} /> },
                                            { id: 'tests',    label: 'TEST RUNNER',  icon: <FlaskConical size={10} /> },
                                            // F-01: Plugin-contributed bottom dock tabs
                                            ...pluginSnapshot.panels.filter(p => p.slot === 'bottom').map(p => ({
                                                id: p.id, label: p.label.toUpperCase(), icon: p.icon ?? null,
                                            })),
                                        ].map(({ id, label, icon }) => (
                                            <button
                                                key={id}
                                                onClick={() => { setBottomTab(id); setTerminalOpen(true); }}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    padding: '4px 12px',
                                                    color: bottomTab === id ? t.accent : t.text3,
                                                    borderBottom: bottomTab === id ? `2px solid ${t.accent}` : '2px solid transparent',
                                                    fontSize: '9px', fontWeight: '600', letterSpacing: '0.08em',
                                                    fontFamily: 'inherit',
                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                    transition: 'color 0.15s',
                                                }}
                                            >
                                                {icon}
                                                {label}
                                            </button>
                                        ))}
                                        <div style={{ marginLeft: 'auto', paddingRight: '8px' }}>
                                            <button
                                                onClick={() => setTerminalOpen(false)}
                                                style={{ background: 'none', border: 'none', color: t.text3, cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                                title="Close panel"
                                            >
                                                <XIcon size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div style={{ flex: 1, overflow: 'hidden', display: terminalOpen ? 'flex' : 'none', flexDirection: 'column' }}>
                                    <div style={{ display: bottomTab === 'terminal' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
                                        <Terminal
                                            workspace={workspace}
                                            onClose={() => setTerminalOpen(false)}
                                            onTerminalApi={handleTerminalApi}
                                            isDark={isDark}
                                        />
                                    </div>
                                    {bottomTab === 'problems' && (
                                        <ProblemsPanel
                                            tabs={tabs}
                                            monacoEditorRef={monacoEditorRef}
                                            isDark={isDark}
                                            onJumpToFile={(path, line) => {
                                                pendingScrollLineRef.current = line;
                                                const existing = tabs.find(t => t.path === path);
                                                if (existing) {
                                                    setActiveTab(existing);
                                                    setCenterView('code');
                                                    setFocusedPane('main');
                                                } else {
                                                    handleFileSelect({ path, name: path.split('/').pop() });
                                                }
                                            }}
                                        />
                                    )}
                                    {bottomTab === 'todo' && (
                                        <TodoTrackerPanel
                                            workspace={workspace}
                                            onJumpToFile={(path, line) => {
                                                pendingScrollLineRef.current = line;
                                                const existing = tabs.find(t => t.path === path);
                                                if (existing) {
                                                    setActiveTab(existing);
                                                    setCenterView('code');
                                                    setFocusedPane('main');
                                                } else {
                                                    handleFileSelect({ path, name: path.split('/').pop() });
                                                }
                                            }}
                                        />
                                    )}
                                    {/* B-03: Log Viewer */}
                                    {bottomTab === 'logs' && (
                                        <LogViewerPanel
                                            workspace={workspace}
                                            onJumpToFile={(path, line) => {
                                                pendingScrollLineRef.current = line;
                                                const existing = tabs.find(t => t.path === path);
                                                if (existing) {
                                                    setActiveTab(existing);
                                                    setCenterView('code');
                                                    setFocusedPane('main');
                                                } else {
                                                    handleFileSelect({ path, name: path.split('/').pop() });
                                                }
                                            }}
                                        />
                                    )}
                                    {/* B-04: Test Runner */}
                                    {bottomTab === 'tests' && (
                                        <TestRunnerPanel
                                            workspace={workspace}
                                            onJumpToFile={(path, line) => {
                                                pendingScrollLineRef.current = line;
                                                const existing = tabs.find(t => t.path === path);
                                                if (existing) {
                                                    setActiveTab(existing);
                                                    setCenterView('code');
                                                    setFocusedPane('main');
                                                } else {
                                                    handleFileSelect({ path, name: path.split('/').pop() });
                                                }
                                            }}
                                            isDark={isDark}
                                        />
                                    )}
                                    {/* F-01: Plugin-contributed bottom dock panels */}
                                    {pluginSnapshot.panels.filter(p => p.slot === 'bottom').map(p => (
                                        bottomTab === p.id && (
                                            <p.component key={p.id} workspace={workspace} {...(p.props ?? {})} />
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Status Bar */}
                        <div style={{
                            height: '24px',
                            background: t.bg1,
                            borderTop: `1px solid ${t.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 16px',
                            flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                {[`⎇ ${currentBranch}`, activeTab?.language ?? 'plaintext'].map(s => (
                                    <span key={s} className="ce-status-item" style={{ fontSize: '10px', color: t.text3 }}>{s}</span>
                                ))}
                                {/* F-01: Plugin-contributed left-aligned status items */}
                                {pluginSnapshot.statusItems.filter(s => s.align === 'left').map(s => (
                                    <span key={s.id} onClick={s.onClick} title={s.tooltip}
                                        style={{ fontSize: '10px', color: '#8b949e', cursor: s.onClick ? 'pointer' : 'default' }}>
                                        {s.label}
                                    </span>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {/* F-01: Plugin-contributed right-aligned status items */}
                                {pluginSnapshot.statusItems.filter(s => s.align !== 'left').map(s => (
                                    <span key={s.id} onClick={s.onClick} title={s.tooltip}
                                        style={{ fontSize: '10px', color: '#8b949e', cursor: s.onClick ? 'pointer' : 'default' }}>
                                        {s.label}
                                    </span>
                                ))}
                                {/* B-20: Presence / Collaboration Indicators */}
                                <PresenceIndicator
                                    workspaceId={workspace?.id}
                                    openFile={activeTab?.path ?? null}
                                />
                                {['UTF-8', 'LF'].map(s => (
                                    <span key={s} className="ce-status-item" style={{ fontSize: '10px', color: t.text3 }}>{s}</span>
                                ))}
                                {/* B-06: AI Ghost Text toggle */}
                                <button
                                    onClick={() => {
                                        const next = !ghostTextEnabled;
                                        setGhostTextEnabled(next);
                                        localStorage.setItem('ce.ghostText', JSON.stringify(next));
                                    }}
                                    title={ghostTextEnabled ? 'AI Ghost Text: On (click to disable)' : 'AI Ghost Text: Off (click to enable)'}
                                    className="ce-status-item"
                                    style={{
                                        background: 'none', border: 'none', padding: '0 2px',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
                                        color: ghostTextEnabled ? t.accent : t.text3,
                                        fontSize: '10px',
                                    }}
                                >
                                    <Zap size={11} />
                                </button>
                                {/* B-14: Keyboard shortcuts */}
                                <button
                                    onClick={() => setShowShortcuts(true)}
                                    title="Keyboard Shortcuts (Ctrl+K S)"
                                    className="ce-status-item"
                                    style={{ background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: t.text3 }}
                                >
                                    <Keyboard size={11} />
                                </button>
                                {/* B-12: Zen mode toggle */}
                                <button
                                    onClick={() => setZenMode(v => !v)}
                                    title={zenMode ? 'Exit Zen Mode (Esc)' : 'Zen Mode (Ctrl+K Z)'}
                                    className="ce-status-item"
                                    style={{ background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: zenMode ? t.accent : t.text3 }}
                                >
                                    {zenMode ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel — hidden in zen mode */}
                    <div
                        className="code-editor-right"
                        style={{
                            background: t.bg1,
                            borderLeft: `1px solid ${t.border}`,
                            display: zenMode ? 'none' : 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* Panel Tab Bar */}
                        <div
                            className="panel-tabs"
                            style={{
                                display: 'flex',
                                borderBottom: `1px solid ${t.border}`,
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
                                        color: activePanel === id ? t.accent : t.text3,
                                        borderBottom: activePanel === id ? `2px solid ${t.accent}` : '2px solid transparent',
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
                                    prefill={aiChatPrefill}
                                    onPrefillConsumed={() => setAiChatPrefill(null)}
                                    pinnedContext={getWorkspacePinnedFiles()}
                                    onUnpinFile={togglePinnedFile}
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
                            {activePanel === 'review' && (
                                <AICodeReviewPanel
                                    workspace={workspace}
                                    activeFile={activeTab}
                                    onJumpToLine={(line) => {
                                        if (monacoEditorRef.current) {
                                            monacoEditorRef.current.revealLineInCenter(line);
                                            monacoEditorRef.current.setPosition({ lineNumber: line, column: 1 });
                                        }
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
