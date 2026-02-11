import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Terminal as TerminalIcon, X, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

export default function Terminal({ workspace, onClose }) {
    const [history, setHistory] = useState([]);
    const [command, setCommand] = useState('');
    const [executing, setExecuting] = useState(false);
    const [currentDir, setCurrentDir] = useState('~');
    const terminalEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        scrollToBottom();
    }, [history]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [executing]);

    function scrollToBottom() {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    async function executeCommand(e) {
        e.preventDefault();
        if (!command.trim() || executing || !workspace) return;

        const cmd = command.trim();
        setHistory(prev => [...prev, { type: 'command', content: `$ ${cmd}`, timestamp: new Date() }]);
        setCommand('');
        setExecuting(true);

        try {
            const response = await axios.post(`/api/workspaces/${workspace.id}/terminal/execute`, {
                command: cmd
            });

            if (response.data.requires_approval) {
                setHistory(prev => [...prev, {
                    type: 'warning',
                    content: '⚠️ This command requires approval. Check the Approvals panel.',
                    timestamp: new Date()
                }]);
            } else {
                setHistory(prev => [...prev, {
                    type: 'output',
                    content: response.data.output || '(No output)',
                    success: response.data.exit_code === 0,
                    timestamp: new Date()
                }]);

                if (response.data.working_directory) {
                    setCurrentDir(response.data.working_directory);
                }
            }
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message || 'Command failed';
            setHistory(prev => [...prev, {
                type: 'error',
                content: errorMsg,
                timestamp: new Date()
            }]);
            toast.error(errorMsg);
        } finally {
            setExecuting(false);
        }
    }

    function clearHistory() {
        setHistory([]);
    }

    function handleKeyDown(e) {
        // TODO: Add command history navigation with Up/Down arrows
        if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            clearHistory();
        }
    }

    if (!workspace) {
        return (
            <div className="terminal-panel">
                <div className="terminal-header">
                    <div className="d-flex align-items-center gap-2">
                        <TerminalIcon size={16} />
                        <span>Terminal</span>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={16} />
                    </button>
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
        <div className="terminal-panel">
            <div className="terminal-header">
                <div className="d-flex align-items-center gap-2">
                    <TerminalIcon size={16} />
                    <span>Terminal - {workspace.name}</span>
                </div>
                <div className="d-flex gap-1">
                    <button className="btn-icon" onClick={clearHistory} title="Clear">
                        <Trash2 size={14} />
                    </button>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="terminal-body">
                <div className="terminal-output">
                    {history.map((entry, idx) => (
                        <div key={idx} className={`terminal-line terminal-${entry.type}`}>
                            {entry.type === 'command' && (
                                <div className="terminal-command">{entry.content}</div>
                            )}
                            {entry.type === 'output' && (
                                <pre className={entry.success ? 'text-success-emphasis' : 'text-danger-emphasis'}>
                                    {entry.content}
                                </pre>
                            )}
                            {entry.type === 'error' && (
                                <div className="text-danger">{entry.content}</div>
                            )}
                            {entry.type === 'warning' && (
                                <div className="text-warning">{entry.content}</div>
                            )}
                        </div>
                    ))}
                    <div ref={terminalEndRef} />
                </div>

                <form onSubmit={executeCommand} className="terminal-input">
                    <span className="terminal-prompt">{currentDir} $</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={executing}
                        placeholder="Enter command..."
                        autoComplete="off"
                        spellCheck="false"
                    />
                    {executing && (
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                            <span className="visually-hidden">Executing...</span>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
