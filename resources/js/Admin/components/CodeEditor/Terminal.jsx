import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Terminal as TerminalIcon, X, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

export default function Terminal({ workspace, onClose, onTerminalApi }) {
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

    useEffect(() => {
        scrollToBottom();
    }, [history]);

    useEffect(() => {
        focusInput();
    }, [executing, workspace]);

    useEffect(() => {
        if (!onTerminalApi) return;
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
                setHistory(prev => [...prev, {
                    type,
                    content: text,
                    timestamp: new Date(),
                }]);
            },
        });
    }, [onTerminalApi]);

    function scrollToBottom() {
        if (terminalBodyRef.current) {
            terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
        }
    }

    function focusInput() {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }

    const executeCommand = useCallback(async (e) => {
        e?.preventDefault();
        if (!command.trim() || executing || !workspace) return;

        const cmd = command.trim();

        // Add to command history
        setCommandHistory(prev => {
            const filtered = prev.filter(c => c !== cmd);
            return [cmd, ...filtered].slice(0, 100);
        });
        setHistoryIndex(-1);
        setSavedInput('');

        // Show command in terminal
        setHistory(prev => [...prev, {
            type: 'command',
            content: cmd,
            dir: currentDir,
            timestamp: new Date(),
        }]);
        setCommand('');
        setExecuting(true);

        // Handle local 'clear' command
        if (cmd === 'clear' || cmd === 'cls') {
            setHistory([]);
            setExecuting(false);
            return;
        }

        try {
            // Streaming terminal execution
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
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    command: cmd,
                    cwd: currentDir === '/' ? undefined : currentDir,
                }),
                credentials: 'same-origin',
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

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
                setHistory(prev => [...prev, {
                    type: 'warning',
                    content: 'Command cancelled',
                    timestamp: new Date(),
                }]);
                return;
            }
            const errorMsg = error.response?.data?.error || error.message || 'Command failed';
            setHistory(prev => [...prev, {
                type: 'error',
                content: errorMsg,
                timestamp: new Date(),
            }]);
        } finally {
            setExecuting(false);
        }
    }, [command, executing, workspace, currentDir]);

    function handleTerminalEvent(event, data) {
        switch (event) {
            case 'stdout':
                if (data.text) {
                    setHistory(prev => [...prev, { type: 'output', content: data.text, timestamp: new Date() }]);
                }
                break;
            case 'stderr':
                if (data.text) {
                    setHistory(prev => [...prev, { type: 'stderr', content: data.text, timestamp: new Date() }]);
                }
                break;
            case 'approval_required':
                setHistory(prev => [...prev, {
                    type: 'warning',
                    content: 'This command requires approval. Use the Approvals panel to approve it.',
                    timestamp: new Date(),
                }]);
                break;
            case 'exit':
                if (data.working_directory) setCurrentDir(data.working_directory);
                break;
            case 'error':
                setHistory(prev => [...prev, {
                    type: 'error',
                    content: data.error || 'Command failed',
                    timestamp: new Date(),
                }]);
                break;
        }
    }

    function handleKeyDown(e) {
        // Ctrl+L: Clear
        if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            setHistory([]);
            return;
        }

        // Ctrl+C: Cancel running command OR current input
        if (e.key === 'c' && e.ctrlKey) {
            e.preventDefault();
            if (executing && abortRef.current) {
                abortRef.current.abort();
                return;
            }
            if (command) {
                setHistory(prev => [...prev, {
                    type: 'command',
                    content: command + '^C',
                    dir: currentDir,
                    timestamp: new Date(),
                }]);
                setCommand('');
            }
            return;
        }

        // Up arrow: Previous command
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length === 0) return;
            if (historyIndex === -1) setSavedInput(command);
            const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
            setHistoryIndex(newIndex);
            setCommand(commandHistory[newIndex]);
            return;
        }

        // Down arrow: Next command
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

    function clearHistory() {
        setHistory([]);
    }

    function getPromptPath() {
        if (currentDir === '/' || currentDir === '~') return '~';
        const parts = currentDir.replace(/^\//, '').split('/');
        if (parts.length <= 2) return currentDir;
        return '.../' + parts.slice(-2).join('/');
    }

    if (!workspace) {
        return (
            <div className="terminal-panel">
                <div className="terminal-header">
                    <div className="d-flex align-items-center gap-2">
                        <TerminalIcon size={16} />
                        <span>Terminal</span>
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
        <div className="terminal-panel" onClick={focusInput}>
            <div className="terminal-header">
                <div className="d-flex align-items-center gap-2">
                    <TerminalIcon size={16} />
                    <span className="terminal-title">Terminal</span>
                    <span className="terminal-workspace-badge">{workspace.name}</span>
                </div>
                <div className="d-flex gap-1">
                    <button className="btn-icon" onClick={clearHistory} title="Clear (Ctrl+L)">
                        <Trash2 size={14} />
                    </button>
                    <button className="btn-icon" onClick={onClose}><X size={16} /></button>
                </div>
            </div>

            <div className="terminal-body" ref={terminalBodyRef}>
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
                            {entry.type === 'output' && (
                                <pre className="terminal-output-text">{entry.content}</pre>
                            )}
                            {entry.type === 'stderr' && (
                                <pre className="terminal-stderr-text">{entry.content}</pre>
                            )}
                            {entry.type === 'error' && (
                                <pre className="terminal-error-text">{entry.content}</pre>
                            )}
                            {entry.type === 'warning' && (
                                <div className="terminal-warning-text">{entry.content}</div>
                            )}
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
                        onChange={(e) => {
                            setCommand(e.target.value);
                            setHistoryIndex(-1);
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={executing}
                        autoComplete="off"
                        spellCheck="false"
                        autoFocus
                    />
                    {executing && <span className="terminal-spinner" />}
                </form>
            </div>
        </div>
    );
}
