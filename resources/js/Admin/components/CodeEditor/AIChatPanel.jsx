import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, X, Zap, Check } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AIChatPanel({ workspace, currentFile, openFiles, onClose, onApplyChanges }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [endpoints, setEndpoints] = useState([]);
    const [selectedEndpoint, setSelectedEndpoint] = useState(null);
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('AUTO');
    const [isAuto, setIsAuto] = useState(true);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadEndpoints();
    }, []);

    useEffect(() => {
        if (selectedEndpoint) {
            loadModelsForEndpoint(selectedEndpoint);
        }
    }, [selectedEndpoint]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    async function loadEndpoints() {
        try {
            const response = await axios.get('/api/ai/endpoints');
            const active = response.data.filter(e => e.is_active);
            setEndpoints(active);
            if (active.length > 0) {
                setSelectedEndpoint(active[0].id);
            }
        } catch (error) {
            toast.error('Failed to load AI endpoints');
        }
    }

    async function loadModelsForEndpoint(endpointId) {
        try {
            // Fetch full endpoint details to get available models
            const response = await axios.get(`/api/ai/endpoints/${endpointId}`);
            const endpoint = response.data;

            const availableModels = endpoint.metadata?.available_models || [];

            // Deduplicate models using Set
            const uniqueModels = [...new Set(availableModels)];

            const modelList = [
                { id: 'AUTO', name: '🤖 AUTO (Best Available)' }
            ];

            if (uniqueModels.length > 0) {
                modelList.push(...uniqueModels.map((m, idx) => ({
                    id: m,
                    name: m
                })));
            }

            setModels(modelList);
        } catch (error) {
            console.error('Failed to load models:', error);
            // Fallback to AUTO only
            setModels([{ id: 'AUTO', name: '🤖 AUTO (Best Available)' }]);
        }
    }

    async function handleSend() {
        if (!input.trim() || loading) return;

        const userMessage = {
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const endpoint = workspace
                ? `/api/workspaces/${workspace.id}/ai/chat`
                : '/api/ai/chat/editor';

            const response = await axios.post(endpoint, {
                message: input,
                endpoint_id: selectedEndpoint,
                model_id: isAuto ? 'AUTO' : selectedModel,
                current_file: currentFile ? {
                    path: currentFile.path,
                    content: currentFile.content,
                    language: currentFile.language
                } : null,
                open_files: openFiles.map(f => ({
                    path: f.path,
                    content: f.content,
                    language: f.language
                }))
            });

            const aiMessage = {
                role: 'assistant',
                content: response.data.message,
                code_changes: response.data.code_changes || [],
                tool_calls: response.data.tool_calls || [],
                requires_approval: response.data.requires_approval || false,
                approval_id: response.data.approval_id || null,
                model_used: response.data.model_used,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            const errorMessage = {
                role: 'assistant',
                content: `Error: ${error.response?.data?.error || error.message}`,
                isError: true,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
            toast.error('AI request failed');
        } finally {
            setLoading(false);
        }
    }

    function handleApply(changes) {
        onApplyChanges(changes);
        toast.success(`Applied ${changes.length} change(s) to editor`);
    }

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    return (
        <div className="ai-chat-panel">
            <div className="chat-header">
                <div className="chat-title">
                    <Zap size={18} />
                    <span>AI Assistant</span>
                </div>
                <button className="btn-icon" onClick={onClose} title="Close">
                    <X size={18} />
                </button>
            </div>

            <div className="chat-controls">
                <div className="mb-2">
                    <label className="form-label">Provider</label>
                    <select
                        className="form-select form-select-sm"
                        value={selectedEndpoint || ''}
                        onChange={(e) => setSelectedEndpoint(Number(e.target.value))}
                    >
                        {endpoints.map(ep => (
                            <option key={ep.id} value={ep.id}>
                                {ep.name} ({ep.provider})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="form-label d-flex justify-content-between">
                        <span>Model</span>
                        <div className="form-check form-check-inline mb-0">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                checked={isAuto}
                                onChange={(e) => {
                                    setIsAuto(e.target.checked);
                                    if (e.target.checked) {
                                        setSelectedModel('AUTO');
                                    }
                                }}
                            />
                            <label className="form-check-label">AUTO</label>
                        </div>
                    </label>
                    <select
                        className="form-select form-select-sm"
                        value={selectedModel}
                        onChange={(e) => {
                            setSelectedModel(e.target.value);
                            setIsAuto(e.target.value === 'AUTO');
                        }}
                        disabled={isAuto}
                    >
                        {models.map((model, idx) => (
                            <option key={`${model.id}-${idx}`} value={model.id}>
                                {model.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="chat-empty-state">
                        <Zap size={48} />
                        <h5>AI Code Assistant</h5>
                        <p>Ask me to help with:</p>
                        <ul>
                            <li>Refactoring code</li>
                            <li>Explaining code</li>
                            <li>Finding bugs</li>
                            <li>Writing new features</li>
                            <li>Generating tests</li>
                        </ul>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role} ${msg.isError ? 'error' : ''}`}>
                        <div className="message-header">
                            <strong>{msg.role === 'user' ? 'You' : 'AI'}</strong>
                            {msg.model_used && (
                                <span className="badge bg-primary">{msg.model_used}</span>
                            )}
                            <span className="message-time">
                                {msg.timestamp.toLocaleTimeString()}
                            </span>
                        </div>
                        <div className="message-content">
                            {msg.content}
                        </div>

                        {msg.tool_calls && msg.tool_calls.length > 0 && (
                            <div className="tool-calls mt-2">
                                <div className="small text-muted mb-1">🔧 Tools Used:</div>
                                {msg.tool_calls.map((tool, toolIdx) => (
                                    <div key={toolIdx} className="tool-call-item mb-1">
                                        <span className={`badge ${tool.result?.success ? 'bg-success' : 'bg-danger'}`}>
                                            {tool.name}
                                        </span>
                                        {tool.result?.message && (
                                            <span className="ms-2 small text-muted">{tool.result.message}</span>
                                        )}
                                        {tool.result?.requires_approval && (
                                            <span className="ms-2 small text-warning">⚠️ Pending Approval</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {msg.requires_approval && (
                            <div className="alert alert-warning mt-2 mb-0 small">
                                ⚠️ This action requires approval. Check the Approvals panel.
                            </div>
                        )}

                        {msg.code_changes && msg.code_changes.length > 0 && !msg.requires_approval && (
                            <div className="message-actions mt-2">
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleApply(msg.code_changes)}
                                >
                                    <Check size={14} className="me-1" />
                                    Apply Changes ({msg.code_changes.length})
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="chat-message assistant loading">
                        <div className="message-content">
                            <div className="spinner-border spinner-border-sm me-2" />
                            Thinking...
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input">
                <textarea
                    className="form-control"
                    placeholder="Ask AI to help with your code..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    rows={3}
                    disabled={loading}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
