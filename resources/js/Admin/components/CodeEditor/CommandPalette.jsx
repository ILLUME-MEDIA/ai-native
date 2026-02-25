import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Search, File, Terminal, ChevronRight } from 'lucide-react';

// ── File icon based on extension ─────────────────────────────────────────────
function fileIcon(path) {
    const ext = (path || '').split('.').pop().toLowerCase();
    const colors = {
        js: '#f7df1e', jsx: '#61dafb', ts: '#3178c6', tsx: '#61dafb',
        php: '#8892be', py: '#3572a5', rb: '#cc342d', java: '#b07219',
        css: '#563d7c', scss: '#c6538c', html: '#e34c26', json: '#292929',
        md: '#e6edf3', sql: '#e38c00', yaml: '#cb171e', yml: '#cb171e',
        sh: '#89e051', bash: '#89e051', xml: '#f60',
    };
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            flexShrink: 0,
        }}>
            <File size={13} color={colors[ext] || '#8b949e'} />
        </span>
    );
}

// ── Recent files localStorage helpers ────────────────────────────────────────
const RECENT_KEY = 'ce.commandPalette.recentFiles';
function getRecentFiles() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function pushRecentFile(path) {
    const prev = getRecentFiles().filter(p => p !== path);
    localStorage.setItem(RECENT_KEY, JSON.stringify([path, ...prev].slice(0, 10)));
}

// ── Editor command definitions ────────────────────────────────────────────────
function buildCommands(monacoEditorRef) {
    const run = (action) => {
        const ed = monacoEditorRef.current;
        if (!ed) return;
        ed.getAction(action)?.run();
    };
    return [
        {
            id: 'toggleWordWrap',
            label: 'Toggle Word Wrap',
            icon: <ChevronRight size={13} />,
            run: () => {
                const ed = monacoEditorRef.current;
                if (!ed) return;
                const current = ed.getOption(window.monaco?.editor?.EditorOption?.wordWrap ?? 130);
                ed.updateOptions({ wordWrap: current === 'on' ? 'off' : 'on' });
            },
        },
        {
            id: 'toggleMinimap',
            label: 'Toggle Minimap',
            icon: <ChevronRight size={13} />,
            run: () => {
                const ed = monacoEditorRef.current;
                if (!ed) return;
                const enabled = ed.getOption(window.monaco?.editor?.EditorOption?.minimap ?? 98)?.enabled ?? true;
                ed.updateOptions({ minimap: { enabled: !enabled } });
            },
        },
        {
            id: 'goToLine',
            label: 'Go to Line',
            icon: <ChevronRight size={13} />,
            run: () => { run('editor.action.gotoLine'); },
        },
        {
            id: 'formatDocument',
            label: 'Format Document',
            icon: <ChevronRight size={13} />,
            run: () => { run('editor.action.formatDocument'); },
        },
        {
            id: 'find',
            label: 'Find',
            icon: <ChevronRight size={13} />,
            run: () => { run('actions.find'); },
        },
        {
            id: 'findAndReplace',
            label: 'Find and Replace',
            icon: <ChevronRight size={13} />,
            run: () => { run('editor.action.startFindReplaceAction'); },
        },
        {
            id: 'foldAll',
            label: 'Fold All',
            icon: <ChevronRight size={13} />,
            run: () => { run('editor.foldAll'); },
        },
        {
            id: 'unfoldAll',
            label: 'Unfold All',
            icon: <ChevronRight size={13} />,
            run: () => { run('editor.unfoldAll'); },
        },
        {
            id: 'toggleComment',
            label: 'Toggle Comment',
            icon: <ChevronRight size={13} />,
            run: () => { run('editor.action.commentLine'); },
        },
        {
            id: 'increaseFontSize',
            label: 'Increase Font Size',
            icon: <ChevronRight size={13} />,
            run: () => {
                const ed = monacoEditorRef.current;
                if (!ed) return;
                const current = ed.getOption(window.monaco?.editor?.EditorOption?.fontSize ?? 44) || 14;
                ed.updateOptions({ fontSize: current + 1 });
            },
        },
        {
            id: 'decreaseFontSize',
            label: 'Decrease Font Size',
            icon: <ChevronRight size={13} />,
            run: () => {
                const ed = monacoEditorRef.current;
                if (!ed) return;
                const current = ed.getOption(window.monaco?.editor?.EditorOption?.fontSize ?? 44) || 14;
                ed.updateOptions({ fontSize: Math.max(8, current - 1) });
            },
        },
    ];
}

// ── Simple fuzzy / substring filter ─────────────────────────────────────────
function fuzzyMatch(str, query) {
    if (!query) return true;
    const s = str.toLowerCase();
    const q = query.toLowerCase();
    // substring match first (fastest)
    if (s.includes(q)) return true;
    // character-by-character match
    let si = 0;
    for (let qi = 0; qi < q.length; qi++) {
        const idx = s.indexOf(q[qi], si);
        if (idx === -1) return false;
        si = idx + 1;
    }
    return true;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CommandPalette({
    visible,
    mode,
    workspace,
    openTabs,
    onClose,
    onOpenFile,
    onRunCommand,
    monacoEditorRef,
}) {
    const [query, setQuery] = useState('');
    const [allFiles, setAllFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    // Commands are stable — memoized once; actions use the ref which always has latest editor
    const commands = React.useMemo(() => buildCommands(monacoEditorRef), []); // eslint-disable-line

    // ── Load file list when palette opens in files mode ──────────────────────
    useEffect(() => {
        if (!visible) { setQuery(''); setActiveIndex(0); return; }

        // Autofocus input
        setTimeout(() => inputRef.current?.focus(), 30);

        if (mode === 'files' && workspace) {
            setFilesLoading(true);
            axios.get(`/api/workspaces/${workspace.id}/files`)
                .then(r => {
                    const files = (r.data.files || []).filter(f => f.type === 'file').map(f => f.path);
                    setAllFiles(files);
                })
                .catch(() => setAllFiles([]))
                .finally(() => setFilesLoading(false));
        }
    }, [visible, mode, workspace]);

    // ── Build result list ─────────────────────────────────────────────────────
    const results = React.useMemo(() => {
        if (mode === 'commands') {
            return commands.filter(c => fuzzyMatch(c.label, query));
        }
        // files mode
        if (!query) {
            // show recently opened files first, then open tabs
            const recent = getRecentFiles().filter(p =>
                allFiles.includes(p) || openTabs.some(t => t.path === p)
            );
            const tabPaths = openTabs.map(t => t.path).filter(p => !recent.includes(p));
            const combined = [...new Set([...recent, ...tabPaths])];
            return combined.map(p => ({ type: 'file', path: p }));
        }
        return allFiles
            .filter(p => fuzzyMatch(p, query))
            .slice(0, 50)
            .map(p => ({ type: 'file', path: p }));
    }, [query, mode, allFiles, openTabs]); // commands is memoized and stable

    // ── Reset active index when results change ────────────────────────────────
    useEffect(() => { setActiveIndex(0); }, [results.length, query]);

    // ── Scroll active item into view ──────────────────────────────────────────
    useEffect(() => {
        if (!listRef.current) return;
        const item = listRef.current.children[activeIndex];
        item?.scrollIntoView?.({ block: 'nearest' });
    }, [activeIndex]);

    // ── Handle selection ──────────────────────────────────────────────────────
    const selectItem = useCallback((item) => {
        if (mode === 'commands') {
            item.run();
            onRunCommand?.(item.id);
        } else {
            pushRecentFile(item.path);
            onOpenFile?.(item.path);
        }
        onClose();
    }, [mode, onOpenFile, onRunCommand, onClose]);

    // ── Keyboard navigation ───────────────────────────────────────────────────
    function handleKeyDown(e) {
        if (e.key === 'Escape') { onClose(); return; }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[activeIndex]) selectItem(results[activeIndex]);
        }
    }

    if (!visible) return null;

    return (
        <div
            className="ce-command-palette-backdrop"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '80px',
            }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="ce-command-palette-modal"
                style={{
                    width: '100%',
                    maxWidth: '600px',
                    background: '#161b22',
                    border: '1px solid #1c2128',
                    borderRadius: '8px',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Search input */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 12px',
                    borderBottom: '1px solid #1c2128',
                    background: '#0d0f14',
                }}>
                    <Search size={14} color="#484f58" style={{ flexShrink: 0 }} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={mode === 'files' ? 'Search files by name...' : 'Search commands...'}
                        autoComplete="off"
                        style={{
                            flex: 1,
                            background: 'none',
                            border: 'none',
                            color: '#e6edf3',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                            padding: '12px 0',
                            outline: 'none',
                        }}
                    />
                    <span style={{
                        fontSize: '10px',
                        color: '#484f58',
                        background: '#1c2128',
                        padding: '2px 5px',
                        borderRadius: '3px',
                        flexShrink: 0,
                    }}>
                        {mode === 'files' ? 'Ctrl+P' : 'Ctrl+Shift+P'}
                    </span>
                </div>

                {/* Results */}
                <div
                    ref={listRef}
                    style={{
                        maxHeight: '400px',
                        overflowY: 'auto',
                        padding: '4px 0',
                    }}
                >
                    {filesLoading && mode === 'files' ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#484f58', fontSize: '12px' }}>
                            Loading files…
                        </div>
                    ) : results.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#484f58', fontSize: '12px' }}>
                            {query ? 'No results found' : 'Start typing to search…'}
                        </div>
                    ) : (
                        results.map((item, idx) => (
                            <div
                                key={mode === 'commands' ? item.id : item.path}
                                onClick={() => selectItem(item)}
                                onMouseEnter={() => setActiveIndex(idx)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    background: idx === activeIndex ? 'rgba(255,107,53,0.1)' : 'transparent',
                                    borderLeft: idx === activeIndex ? '2px solid #ff6b35' : '2px solid transparent',
                                    transition: 'background 0.1s',
                                }}
                            >
                                {mode === 'commands' ? (
                                    <>
                                        <Terminal size={13} color="#8b949e" style={{ flexShrink: 0 }} />
                                        <span style={{ fontSize: '12px', color: '#c9d1d9', flex: 1 }}>
                                            {item.label}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        {fileIcon(item.path)}
                                        <span style={{
                                            fontSize: '12px',
                                            color: '#c9d1d9',
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }} title={item.path}>
                                            <span style={{ color: '#e6edf3' }}>
                                                {item.path.split('/').pop()}
                                            </span>
                                            {item.path.includes('/') && (
                                                <span style={{ color: '#484f58', marginLeft: '6px', fontSize: '11px' }}>
                                                    {item.path.substring(0, item.path.lastIndexOf('/'))}
                                                </span>
                                            )}
                                        </span>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer hint */}
                {results.length > 0 && (
                    <div style={{
                        padding: '4px 12px',
                        borderTop: '1px solid #1c2128',
                        display: 'flex',
                        gap: '16px',
                        fontSize: '10px',
                        color: '#484f58',
                    }}>
                        <span><kbd style={{ background: '#1c2128', borderRadius: '2px', padding: '1px 4px' }}>↑↓</kbd> navigate</span>
                        <span><kbd style={{ background: '#1c2128', borderRadius: '2px', padding: '1px 4px' }}>Enter</kbd> select</span>
                        <span><kbd style={{ background: '#1c2128', borderRadius: '2px', padding: '1px 4px' }}>Esc</kbd> close</span>
                    </div>
                )}
            </div>
        </div>
    );
}
