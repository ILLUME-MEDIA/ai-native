import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal as TerminalIcon, X, Trash2, Plus, Columns2 } from 'lucide-react';
import { useCodeEditorTheme } from './useCodeEditorTheme';

let tabCounter = 0;
function makeTabMeta() {
    tabCounter++;
    return { id: tabCounter, label: 'bash' };
}

// ─── Single terminal instance ────────────────────────────────────────────────

function TerminalInstance({ workspace, active, tabMeta, onTerminalApi, onRegisterClear, onClick }) {
    const [history, setHistory] = useState([]);
    const [command, setCommand] = useState('');
    const [executing, setExecuting] = useState(false);
    const [currentDir, setCurrentDir] = useState('/');
    const [commandHistory, setCommandHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [savedInput, setSavedInput] = useState('');
    const terminalBodyRef = useRef(null);
    const inputRef = useRef(null);
    const abortRef = useRef(null);

    // Scroll to bottom when history changes (only if active)
    useEffect(() => {
        if (active && terminalBodyRef.current) {
            terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
        }
    }, [history, active]);

    // Focus input when tab becomes active
    useEffect(() => {
        if (active && inputRef.current) {
            inputRef.current.focus();
        }
    }, [active, executing, workspace]);

    // Register clear callback with parent
    useEffect(() => {
        if (onRegisterClear) {
            onRegisterClear(tabMeta.id, () => setHistory([]));
        }
    }, [onRegisterClear, tabMeta.id]);

    // Expose terminal API to parent (only when active)
    useEffect(() => {
        if (!onTerminalApi || !active) return;
        onTerminalApi({
            appendEntries: (entries) => {
                const list = Array.isArray(entries) ? entries : [entries];
                setHistory(prev => [...prev, ...list.map(e => ({
                    ...e,
                    timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
                }))]);
            },
            appendOutput: (text, type = 'output') => {
                if (!text) return;
                setHistory(prev => [...prev, { type, content: text, timestamp: new Date() }]);
            },
        });
    }, [onTerminalApi, active]);

    const executeCommand = useCallback(async (e) => {
        e?.preventDefault();
        if (!command.trim() || executing || !workspace) return;

        const cmd = command.trim();

        setCommandHistory(prev => {
            const filtered = prev.filter(c => c !== cmd);
            return [cmd, ...filtered].slice(0, 100);
        });
        setHistoryIndex(-1);
        setSavedInput('');

        setHistory(prev => [...prev, {
            type: 'command',
            content: cmd,
            dir: currentDir,
            timestamp: new Date(),
        }]);
        setCommand('');
        setExecuting(true);

        if (cmd === 'clear' || cmd === 'cls') {
            setHistory([]);
            setExecuting(false);
            return;
        }

        try {
            const url = `/api/workspaces/${workspace.id}/terminal/execute-stream`;
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const controller = new AbortController();
            abortRef.current = controller;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'text/event-stream',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    command: cmd,
                    cwd: currentDir === '/' ? undefined : currentDir,
                }),
                credentials: 'same-origin',
                signal: controller.signal,
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (!line) continue;
                    if (line.startsWith('event:')) {
                        const event = line.substring(6).trim();
                        const next = lines[i + 1] || '';
                        if (next.startsWith('data:')) {
                            const payload = next.substring(5).trim();
                            let data = {};
                            try { data = payload ? JSON.parse(payload) : {}; } catch { data = {}; }
                            handleTerminalEvent(event, data);
                            i++;
                        }
                    }
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                setHistory(prev => [...prev, { type: 'warning', content: 'Command cancelled', timestamp: new Date() }]);
                return;
            }
            const msg = error.response?.data?.error || error.message || 'Command failed';
            setHistory(prev => [...prev, { type: 'error', content: msg, timestamp: new Date() }]);
        } finally {
            setExecuting(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [command, executing, workspace, currentDir]);

    function handleTerminalEvent(event, data) {
        switch (event) {
            case 'stdout':
                if (data.text) setHistory(prev => [...prev, { type: 'output', content: data.text, timestamp: new Date() }]);
                break;
            case 'stderr':
                if (data.text) setHistory(prev => [...prev, { type: 'stderr', content: data.text, timestamp: new Date() }]);
                break;
            case 'approval_required':
                setHistory(prev => [...prev, { type: 'warning', content: 'This command requires approval. Use the Approvals panel to approve it.', timestamp: new Date() }]);
                break;
            case 'exit':
                if (data.working_directory) setCurrentDir(data.working_directory);
                break;
            case 'error':
                setHistory(prev => [...prev, { type: 'error', content: data.error || 'Command failed', timestamp: new Date() }]);
                break;
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            setHistory([]);
            return;
        }
        if (e.key === 'c' && e.ctrlKey) {
            e.preventDefault();
            if (executing && abortRef.current) {
                abortRef.current.abort();
                return;
            }
            if (command) {
                setHistory(prev => [...prev, { type: 'command', content: command + '^C', dir: currentDir, timestamp: new Date() }]);
                setCommand('');
            }
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length === 0) return;
            if (historyIndex === -1) setSavedInput(command);
            const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
            setHistoryIndex(newIndex);
            setCommand(commandHistory[newIndex]);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex <= 0) {
                setHistoryIndex(-1);
                setCommand(savedInput);
                return;
            }
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setCommand(commandHistory[newIndex]);
            return;
        }
    }

    function getPromptPath() {
        if (currentDir === '/' || currentDir === '~') return '~';
        const parts = currentDir.replace(/^\//, '').split('/');
        if (parts.length <= 2) return currentDir;
        return '.../' + parts.slice(-2).join('/');
    }

    return (
        <div
            style={{ display: active ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden' }}
            onClick={onClick}
        >
            <div className="terminal-body" ref={terminalBodyRef} style={{ flex: 1, overflowY: 'auto' }}>
                <div className="terminal-output">
                    {history.length === 0 && (
                        <div className="terminal-welcome">
                            <span className="text-muted">
                                Workspace terminal ready. Type a command to get started.
                            </span>
                        </div>
                    )}
                    {history.map((entry, idx) => (
                        <div key={idx} className={`terminal-line terminal-${entry.type}`}>
                            {entry.type === 'command' && (
                                <div className="terminal-command-line">
                                    <span className="terminal-prompt-display">
                                        <span className="prompt-user">user</span>
                                        <span className="prompt-separator">:</span>
                                        <span className="prompt-path">{entry.dir || '~'}</span>
                                        <span className="prompt-dollar">$</span>
                                    </span>
                                    <span className="terminal-cmd-text">{entry.content}</span>
                                </div>
                            )}
                            {entry.type === 'output' && <pre className="terminal-output-text">{entry.content}</pre>}
                            {entry.type === 'stderr' && <pre className="terminal-stderr-text">{entry.content}</pre>}
                            {entry.type === 'error' && <pre className="terminal-error-text">{entry.content}</pre>}
                            {entry.type === 'warning' && <div className="terminal-warning-text">{entry.content}</div>}
                        </div>
                    ))}
                </div>

                <form onSubmit={executeCommand} className="terminal-input-line">
                    <span className="terminal-prompt-display">
                        <span className="prompt-user">user</span>
                        <span className="prompt-separator">:</span>
                        <span className="prompt-path">{getPromptPath()}</span>
                        <span className="prompt-dollar">$</span>
                    </span>
                    <input
                        ref={inputRef}
                        type="text"
                        className="terminal-input-field"
                        value={command}
                        onChange={(e) => { setCommand(e.target.value); setHistoryIndex(-1); }}
                        onKeyDown={handleKeyDown}
                        disabled={executing}
                        autoComplete="off"
                        spellCheck="false"
                    />
                    {executing && <span className="terminal-spinner" />}
                </form>
            </div>
        </div>
    );
}

// ─── Multi-tab Terminal container ────────────────────────────────────────────

export default function Terminal({ workspace, onClose, onTerminalApi }) {
    const { isDark, tokens: t } = useCodeEditorTheme();
    const [tabs, setTabs] = useState(() => [makeTabMeta()]);
    const [activeId, setActiveId] = useState(() => tabs[0].id);
    const [splitId, setSplitId] = useState(null); // B-13: split terminal pane
    const [splitRatio, setSplitRatio] = useState(50); // left pane width %
    const clearCallbacks = useRef({});
    const activeInputRef = useRef(null);
    const splitResizingRef = useRef(false);
    const splitContainerRef = useRef(null);

    // B-13: drag-to-resize split pane
    useEffect(() => {
        function onMove(e) {
            if (!splitResizingRef.current || !splitContainerRef.current) return;
            const rect = splitContainerRef.current.getBoundingClientRect();
            const ratio = Math.max(20, Math.min(80, ((e.clientX - rect.left) / rect.width) * 100));
            setSplitRatio(ratio);
        }
        function onUp() {
            if (!splitResizingRef.current) return;
            splitResizingRef.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, []);

    function addTab() {
        const meta = makeTabMeta();
        setTabs(prev => [...prev, meta]);
        setActiveId(meta.id);
    }

    function splitTerminal() {
        const meta = makeTabMeta();
        setTabs(prev => [...prev, meta]);
        setSplitId(meta.id);
    }

    function closeSplit() {
        if (!splitId) return;
        setTabs(prev => {
            const next = prev.filter(t => t.id !== splitId);
            delete clearCallbacks.current[splitId];
            return next;
        });
        setSplitId(null);
    }

    function closeTab(id) {
        if (id === splitId) { closeSplit(); return; }
        if (tabs.length <= 1) return;
        setTabs(prev => {
            const idx = prev.findIndex(t => t.id === id);
            const next = prev.filter(t => t.id !== id);
            if (id === activeId) {
                const remaining = next.filter(t => t.id !== splitId);
                setActiveId((remaining[Math.max(0, idx - 1)] || remaining[0] || next[0]).id);
            }
            delete clearCallbacks.current[id];
            return next;
        });
    }

    function registerClear(id, fn) {
        clearCallbacks.current[id] = fn;
    }

    function clearActive() {
        clearCallbacks.current[activeId]?.();
    }

    function focusActive() {
        activeInputRef.current?.focus();
    }

    if (!workspace) {
        return (
            <div className="terminal-panel">
                <div className="terminal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <TerminalIcon size={14} />
                        <span style={{ fontSize: '11px' }}>Terminal</span>
                    </div>
                    <button className="btn-icon" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="terminal-body">
                    <div className="text-center text-muted p-3">
                        <p>Select a workspace to use terminal</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="terminal-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Tab Bar */}
            <div
                className="terminal-header"
                style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    height: '34px',
                    flexShrink: 0,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                }}
            >
                {/* Tabs */}
                <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, overflow: 'hidden' }}>
                    {tabs.map(tab => {
                        const isActive = tab.id === activeId;
                        return (
                            <div
                                key={tab.id}
                                onClick={() => setActiveId(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '0 10px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    whiteSpace: 'nowrap',
                                    background: isActive ? 'rgba(255,107,53,0.08)' : 'transparent',
                                    color: isActive ? (isDark ? '#c9d1d9' : '#24292f') : (isDark ? '#8b949e' : '#57606a'),
                                    borderBottom: isActive ? '2px solid #ff6b35' : '2px solid transparent',
                                    borderRight: `1px solid ${isDark ? '#1c2128' : '#d0d7de'}`,
                                    userSelect: 'none',
                                    flexShrink: 0,
                                }}
                            >
                                <TerminalIcon size={11} style={{ color: isActive ? '#ff6b35' : '#8b949e' }} />
                                <span>{tab.label}</span>
                                {tabs.length > 1 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: t.text3,
                                            padding: '0 1px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            borderRadius: '2px',
                                            lineHeight: 1,
                                        }}
                                        title="Close terminal"
                                    >
                                        <X size={10} />
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {/* New tab button */}
                    <button
                        onClick={addTab}
                        title="New terminal"
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: t.text3,
                            padding: '0 8px',
                            display: 'flex',
                            alignItems: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Plus size={12} />
                    </button>
                </div>

                {/* Right controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '0 6px', flexShrink: 0, marginLeft: 'auto' }}>
                    {/* B-13: Split terminal button */}
                    <button
                        className="btn-icon"
                        onClick={splitId ? closeSplit : splitTerminal}
                        title={splitId ? 'Close split terminal' : 'Split terminal'}
                        style={{ color: splitId ? '#ff6b35' : t.text3 }}
                    >
                        <Columns2 size={13} />
                    </button>
                    <button className="btn-icon" onClick={clearActive} title="Clear terminal (Ctrl+L)">
                        <Trash2 size={13} />
                    </button>
                    <button className="btn-icon" onClick={onClose} title="Close terminal panel">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Terminal instances */}
            {splitId ? (
                /* B-13: Split layout — left pane (activeId) + right pane (splitId) */
                <div ref={splitContainerRef} style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Left pane */}
                    <div style={{ flex: splitRatio, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={focusActive}>
                        {tabs.filter(t => t.id !== splitId).map(tab => (
                            <TerminalInstance
                                key={tab.id}
                                workspace={workspace}
                                active={tab.id === activeId}
                                tabMeta={tab}
                                onTerminalApi={tab.id === activeId ? onTerminalApi : undefined}
                                onRegisterClear={registerClear}
                            />
                        ))}
                    </div>
                    {/* Drag handle */}
                    <div
                        style={{ width: '3px', background: t.border, cursor: 'col-resize', flexShrink: 0, transition: 'background 0.15s' }}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            splitResizingRef.current = true;
                            document.body.style.cursor = 'col-resize';
                            document.body.style.userSelect = 'none';
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,53,0.4)'; }}
                        onMouseLeave={e => { if (!splitResizingRef.current) e.currentTarget.style.background = t.border; }}
                    />
                    {/* Right pane */}
                    <div style={{ flex: 100 - splitRatio, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: `1px solid ${t.border}` }}>
                        {tabs.filter(t => t.id === splitId).map(tab => (
                            <TerminalInstance
                                key={tab.id}
                                workspace={workspace}
                                active={true}
                                tabMeta={tab}
                                onRegisterClear={registerClear}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                /* Single pane — all tabs mounted, inactive hidden */
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={focusActive}>
                    {tabs.map(tab => (
                        <TerminalInstance
                            key={tab.id}
                            workspace={workspace}
                            active={tab.id === activeId}
                            tabMeta={tab}
                            onTerminalApi={tab.id === activeId ? onTerminalApi : undefined}
                            onRegisterClear={registerClear}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
