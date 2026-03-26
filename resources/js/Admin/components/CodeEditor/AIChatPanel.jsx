import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Send, X, Zap, Check, Loader, SlidersHorizontal, ChevronDown, ChevronUp, ListChecks, HelpCircle, Code2, Building2, Eye, Bug, BookOpen, Wrench, Shield, Pin, Pause, Play, SkipForward, RotateCcw } from 'lucide-react';
import { toast } from 'react-toastify';
import { useCodeEditorTheme } from './useCodeEditorTheme';

export default function AIChatPanel({ workspace, currentFile, openFiles, onClose, onApplyChanges, onFileTreeRefresh, onFileTreePatch, prefill, onPrefillConsumed, pinnedContext = [], onUnpinFile }) {
    const { isDark, tokens: t } = useCodeEditorTheme();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState('');
    const [streamingStatus, setStreamingStatus] = useState('');
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [streamSeconds, setStreamSeconds] = useState(0);
    const [conversations, setConversations] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [endpoints, setEndpoints] = useState([]);
    const [selectedEndpoint, setSelectedEndpoint] = useState(null);
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('AUTO');
    const [isAuto, setIsAuto] = useState(true);
    const [uiTarget, setUiTarget] = useState(() => localStorage.getItem('codeEditor.uiTarget') || 'ask');
    const [agentMode, setAgentMode] = useState(() => localStorage.getItem('codeEditor.agentMode') || 'coder');
    const [pendingClarification, setPendingClarification] = useState(null); // { questions: [...] }
    const [activePlanTasks, setActivePlanTasks] = useState(null); // { task_list_id, tasks: [...] }
    const [taskOverrides, setTaskOverrides] = useState({}); // { [taskId]: 'paused'|'pending'|'skipped' }
    const messagesEndRef = useRef(null);
    const eventSourceRef = useRef(null);
    const abortRef = useRef(null);
    const streamStartAtRef = useRef(null);
    const lastEventAtRef = useRef(Date.now());
    const lastStatusRef = useRef('');
    const lastStatusPushAtRef = useRef(0);
    const currentMessageRef = useRef({
        message: '',
        code_changes: [],
        tool_calls: [],
        model_used: null
    });

    useEffect(() => {
        loadEndpoints();
        function onPreviewStatus(e) {
            const msg = e?.detail?.message;
            if (!msg) return;
            setMessages(prev => [...prev, {
                role: 'system',
                content: msg,
                timestamp: new Date(),
            }]);
        }
        window.addEventListener('preview-status', onPreviewStatus);
        return () => {
            // Cleanup: close EventSource connection on unmount
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (abortRef.current) {
                abortRef.current.abort();
            }
            window.removeEventListener('preview-status', onPreviewStatus);
        };
    }, []);

    useEffect(() => {
        if (workspace?.id) {
            loadConversations();
        } else {
            setConversations([]);
            setConversationId(null);
            setMessages([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspace?.id]);

    useEffect(() => {
        localStorage.setItem('codeEditor.uiTarget', uiTarget);
    }, [uiTarget]);

    useEffect(() => {
        localStorage.setItem('codeEditor.agentMode', agentMode);
    }, [agentMode]);

    useEffect(() => {
        if (selectedEndpoint) {
            loadModelsForEndpoint(selectedEndpoint);
        }
    }, [selectedEndpoint]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingMessage]);

    // S3-2: Accept prefill from AI selection actions
    useEffect(() => {
        if (prefill) {
            setInput(prefill);
            if (onPrefillConsumed) onPrefillConsumed();
        }
    }, [prefill]);

    useEffect(() => {
        if (!loading) {
            setStreamSeconds(0);
            streamStartAtRef.current = null;
            return;
        }
        if (!streamStartAtRef.current) streamStartAtRef.current = Date.now();

        const t = setInterval(() => {
            const started = streamStartAtRef.current || Date.now();
            setStreamSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
        }, 500);
        return () => clearInterval(t);
    }, [loading]);

    // Heartbeat: never feel "stuck"
    useEffect(() => {
        if (!loading) return;
        const t = setInterval(() => {
            const silentFor = Date.now() - (lastEventAtRef.current || Date.now());
            if (silentFor > 2500) {
                setStreamingStatus(`⏳ Working… (${streamSeconds}s)`);
            }
        }, 1000);
        return () => clearInterval(t);
    }, [loading, streamSeconds]);


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

    async function loadConversations() {
        if (!workspace?.id) return;
        try {
            const resp = await axios.get(`/api/workspaces/${workspace.id}/ai/conversations`, {
                params: { limit: 20 },
            });
            const list = resp.data?.conversations || [];
            setConversations(list);

            // Auto-select most recent conversation (or create implicit new one on first send)
            if (list.length > 0) {
                const newestId = list[0].id;
                setConversationId(newestId);
                await loadConversation(newestId);
            } else {
                setConversationId(null);
                setMessages([]);
            }
        } catch (e) {
            console.error('Failed to load conversations', e);
        }
    }

    // Only refresh the list without auto-selecting (safe to call anytime)
    async function refreshConversationList() {
        if (!workspace?.id) return;
        try {
            const resp = await axios.get(`/api/workspaces/${workspace.id}/ai/conversations`, {
                params: { limit: 20 },
            });
            setConversations(resp.data?.conversations || []);
        } catch (e) {
            console.error('Failed to refresh conversation list', e);
        }
    }

    async function loadConversation(id) {
        if (!workspace?.id || !id) return;
        try {
            const resp = await axios.get(`/api/workspaces/${workspace.id}/ai/conversations/${id}`, {
                params: { limit: 2000 },
            });
            const events = resp.data?.events || [];
            const reconstructed = eventsToMessages(events);
            setMessages(reconstructed);
        } catch (e) {
            console.error('Failed to load conversation', e);
            toast.error('Failed to load chat history');
        }
    }

    function eventsToMessages(events) {
        const out = [];
        for (const ev of events) {
            const type = ev.type;
            const payload = ev.payload || {};
            const ts = ev.created_at ? new Date(ev.created_at) : new Date();

            if (type === 'user_message') {
                out.push({ role: 'user', content: payload.message || '', timestamp: ts });
            } else if (type === 'assistant_message') {
                out.push({
                    role: 'assistant',
                    content: payload.message || '',
                    code_changes: payload.code_changes || [],
                    tool_calls: payload.tool_calls || [],
                    model_used: payload.model_used || null,
                    timestamp: ts,
                });
            } else if (type === 'status') {
                out.push({ role: 'system', content: payload.message || 'Status update', timestamp: ts });
            } else if (type === 'tool_call') {
                out.push({ role: 'system', content: `🔧 ${payload.tool || 'tool'}: ${payload.status || 'executing'}`, timestamp: ts });
            } else if (type === 'tool_result') {
                const ok = payload.result?.success;
                const msg = payload.result?.message || payload.result?.error || '';
                out.push({ role: 'system', content: `${ok ? '✅' : '❌'} ${payload.tool || 'tool'} ${msg}`.trim(), timestamp: ts });
            } else if (type === 'error') {
                out.push({ role: 'assistant', content: `Error: ${payload.error || 'Unknown error'}`, isError: true, timestamp: ts });
            }
        }
        return out;
    }

    async function loadModelsForEndpoint(endpointId) {
        try {
            const response = await axios.get(`/api/ai/endpoints/${endpointId}`);
            const endpoint = response.data;
            const availableModels = endpoint.metadata?.available_models || [];
            const uniqueModels = [...new Set(availableModels)];

            const modelList = [{ id: 'AUTO', name: '🤖 AUTO (Best Available)' }];

            if (uniqueModels.length > 0) {
                modelList.push(...uniqueModels.map((m) => ({
                    id: m,
                    name: m
                })));
            }

            setModels(modelList);
        } catch (error) {
            console.error('Failed to load models:', error);
            setModels([{ id: 'AUTO', name: '🤖 AUTO (Best Available)' }]);
        }
    }

    // ── Send ───────────────────────────────────────────────────────────────────
    async function handleSend() {
        if (!input.trim() || loading) return;

        if (!workspace?.id) {
            toast.error('No workspace selected. Please open or create a workspace first.');
            return;
        }

        const looksLikeUiRequest = /(auth|login|register|signup|forgot|reset|page|pages|screen|ui|form|layout|dashboard)/i.test(input);
        if (looksLikeUiRequest && (uiTarget === 'ask' || !uiTarget)) {
            setSettingsOpen(true);
            toast.info('Select UI Target (React / HTML / Blade) before generating UI pages.');
            return;
        }

        // Cancel any in-flight stream
        if (abortRef.current) {
            abortRef.current.abort();
        }

        const userMessage = {
            role: 'user',
            content: input,
            images: [],
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        const userInput = input;
        setInput('');
        setLoading(true);
        setStreamingMessage('');
        setStreamingStatus('Connecting...');
        streamStartAtRef.current = Date.now();
        lastEventAtRef.current = Date.now();

        // Reset current message accumulator
        currentMessageRef.current = {
            message: '',
            code_changes: [],
            tool_calls: [],
            model_used: null
        };

        try {
            // Use Server-Sent Events (SSE) for streaming
            const url = `/api/workspaces/${workspace.id}/ai/chat-stream`;

            const formData = new FormData();
            formData.append('message', userInput);
            formData.append('endpoint_id', selectedEndpoint);
            formData.append('model_id', isAuto ? 'AUTO' : selectedModel);
            formData.append('ui_target', uiTarget || 'ask');
            formData.append('agent_mode', agentMode || 'coder');
            if (conversationId) {
                formData.append('conversation_id', conversationId);
            }

            if (currentFile) {
                formData.append('current_file[path]', currentFile.path);
                formData.append('current_file[content]', currentFile.content);
                formData.append('current_file[language]', currentFile.language);
            }

            openFiles.forEach((f, idx) => {
                formData.append(`open_files[${idx}][path]`, f.path);
                formData.append(`open_files[${idx}][content]`, f.content);
                formData.append(`open_files[${idx}][language]`, f.language);
            });

            // A-03: Pinned context — fetch content for pinned files not already open
            if (pinnedContext.length > 0) {
                const pinContents = await Promise.all(
                    pinnedContext.map(async (pin) => {
                        const openFile = openFiles.find(f => f.path === pin.path)
                            || (currentFile?.path === pin.path ? currentFile : null);
                        if (openFile) return { path: pin.path, content: openFile.content || '' };
                        try {
                            const resp = await axios.get(`/api/workspaces/${workspace.id}/files/read`, { params: { path: pin.path } });
                            return { path: pin.path, content: resp.data?.content || '' };
                        } catch {
                            return { path: pin.path, content: '' };
                        }
                    })
                );
                pinContents.forEach((pin, idx) => {
                    formData.append(`pinned_context[${idx}][path]`, pin.path);
                    formData.append(`pinned_context[${idx}][content]`, pin.content);
                });
            }

            // Get CSRF token
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

            const controller = new AbortController();
            abortRef.current = controller;

            // EventSource doesn't support POST, so we'll use fetch with streaming
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'text/event-stream',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData,
                credentials: 'same-origin',
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Read the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (!line) continue;

                    if (line.startsWith('event:')) {
                        const event = line.substring(6).trim();

                        // SSE spec allows multiple data: lines; we support a single JSON line payload.
                        const next = lines[i + 1] || '';
                        if (next.startsWith('data:')) {
                            const payload = next.substring(5).trim();
                            try {
                                const data = payload ? JSON.parse(payload) : null;
                                handleSSEEvent(event, data || {});
                            } catch (e) {
                                console.warn('Failed to parse SSE payload', payload, e);
                            }
                            i++; // skip data line
                        }
                    }
                }
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                // User cancelled / new prompt sent
                setStreamingStatus('Cancelled');
                setLoading(false);
                return;
            }
            console.error('Streaming error:', error);
            const errorMessage = {
                role: 'assistant',
                content: `Error: ${error.message}`,
                isError: true,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
            toast.error('AI request failed');
        } finally {
            setLoading(false);
            setStreamingMessage('');
            setStreamingStatus('');
        }
    }

    function handleSSEEvent(event, data) {
        lastEventAtRef.current = Date.now();
        switch (event) {
            case 'connected':
                setStreamingStatus('Connected');
                if (data?.conversation_id && !conversationId) {
                    setConversationId(data.conversation_id);
                    // Refresh list so it shows up in history
                    loadConversations();
                }
                break;

            case 'status':
                {
                    const msg = (data.message || '').trim();
                    if (msg) {
                        setStreamingStatus(msg);
                        // Push into timeline (throttled + dedup)
                        const now = Date.now();
                        if (msg !== lastStatusRef.current && (now - lastStatusPushAtRef.current) > 250) {
                            lastStatusRef.current = msg;
                            lastStatusPushAtRef.current = now;
                            setMessages(prev => [...prev, {
                                role: 'system',
                                content: msg,
                                timestamp: new Date(),
                            }]);
                        }
                    }
                }
                break;

            case 'chunk':
                // Accumulate response chunks
                currentMessageRef.current.message += data.text || '';
                setStreamingMessage(currentMessageRef.current.message);
                break;

            case 'tool_call':
                {
                    const line = `🔧 ${data.tool || 'tool'}: ${data.status || 'executing'}`;
                    setStreamingStatus(line);
                    setMessages(prev => [...prev, {
                        role: 'system',
                        content: line,
                        timestamp: new Date(),
                    }]);
                }
                break;

            case 'tool_result':
                const toolCall = {
                    name: data.tool,
                    result: data.result
                };
                currentMessageRef.current.tool_calls.push(toolCall);
                {
                    const ok = data.result?.success;
                    const msg = data.result?.message || data.result?.error || '';
                    const path = data.result?.path ? ` (${data.result.path})` : '';
                    const line = `${ok ? '✅' : '❌'} ${data.tool || 'tool'}${path}${msg ? ` — ${msg}` : ''}`;
                    setMessages(prev => [...prev, {
                        role: 'system',
                        content: line,
                        timestamp: new Date(),
                    }]);
                }
                break;

            case 'turn_start':
                setStreamingStatus(`Turn ${data.turn}/${data.max}...`);
                break;

            case 'complete':
                // Final message received
                const aiMessage = {
                    role: 'assistant',
                    content: data.message || currentMessageRef.current.message,
                    code_changes: data.code_changes || [],
                    tool_calls: data.tool_calls || currentMessageRef.current.tool_calls,
                    requires_approval: data.requires_approval || false,
                    approval_id: data.approval_id || null,
                    model_used: data.model_used,
                    timestamp: new Date()
                };

                setMessages(prev => [...prev, aiMessage]);
                setStreamingMessage('');
                setStreamingStatus('');
                setLoading(false);
                break;

            case 'approval_required':
                toast.warning('⚠️ This action requires approval. Check the Approvals panel.');
                break;

            case 'file_tree_changed':
                // AI created/modified files - apply incremental patches when available
                if (data?.patches && onFileTreePatch) {
                    onFileTreePatch(data.patches);
                } else if (onFileTreeRefresh) {
                    onFileTreeRefresh();
                }
                break;

            case 'error':
                const errorMsg = {
                    role: 'assistant',
                    content: `Error: ${data.error}`,
                    isError: true,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, errorMsg]);
                setStreamingMessage('');
                setStreamingStatus('');
                setLoading(false);
                toast.error('AI request failed');
                break;

            case 'done':
                setStreamingStatus('');
                break;

            case 'cancelled':
                setStreamingStatus('Cancelled');
                setStreamingMessage('');
                setLoading(false);
                break;

            case 'plan_created':
                setActivePlanTasks({ task_list_id: data.task_list_id, tasks: data.tasks || [] });
                setMessages(prev => [...prev, {
                    role: 'plan',
                    task_list_id: data.task_list_id,
                    tasks: data.tasks || [],
                    timestamp: new Date(),
                }]);
                setStreamingStatus('Executing plan...');
                break;

            case 'clarification_needed':
                setPendingClarification({ questions: data.questions || [] });
                setLoading(false);
                setStreamingMessage('');
                setStreamingStatus('');
                break;
        }
    }

    const handleCancel = useCallback(async () => {
        if (!loading) return;
        if (abortRef.current) {
            abortRef.current.abort();
        }
        if (workspace?.id && conversationId) {
            try {
                await axios.post(`/api/workspaces/${workspace.id}/ai/conversations/${conversationId}/cancel`, {
                    reason: 'user_cancel',
                });
            } catch (e) {
                // ignore
            }
        }
        setLoading(false);
        setStreamingMessage('');
        setStreamingStatus('Cancelled');
    }, [loading, workspace?.id, conversationId]);

    function handleApply(changes) {
        onApplyChanges(changes);
        toast.success(`Applied ${changes.length} change(s) to editor`);
    }

    // E-01: Task queue step controls
    async function handleTaskAction(taskId, action) {
        if (!workspace?.id) return;
        // Optimistic update
        const optimisticStatus = action === 'pause' ? 'paused' : action === 'skip' ? 'skipped' : 'pending';
        setTaskOverrides(prev => ({ ...prev, [taskId]: optimisticStatus }));
        try {
            await axios.post(`/api/workspaces/${workspace.id}/ai/tasks/${taskId}/${action}`);
        } catch {
            // Revert optimistic update on failure
            setTaskOverrides(prev => { const next = { ...prev }; delete next[taskId]; return next; });
            toast.error(`Failed to ${action} task`);
        }
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

            <AgentModePicker mode={agentMode} onChange={setAgentMode} disabled={loading} />

            {pinnedContext.length > 0 && (
                <div style={{
                    padding: '5px 10px',
                    borderBottom: '1px solid #1c2128',
                    background: 'rgba(255,107,53,0.05)',
                    flexShrink: 0,
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        marginBottom: '4px',
                        fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: '#ff6b35',
                    }}>
                        <Pin size={9} fill="currentColor" />
                        Pinned Context ({pinnedContext.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {pinnedContext.map((pin) => (
                            <span key={pin.path} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '2px 6px', borderRadius: '10px',
                                background: 'rgba(255,107,53,0.1)',
                                border: '1px solid rgba(255,107,53,0.25)',
                                fontSize: '10px', color: '#c9d1d9',
                                fontFamily: "'JetBrains Mono', monospace",
                                maxWidth: '100%',
                            }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }} title={pin.path}>
                                    {pin.name || pin.path.split('/').pop()}
                                </span>
                                {onUnpinFile && (
                                    <button
                                        onClick={() => onUnpinFile(pin)}
                                        style={{
                                            background: 'none', border: 'none', padding: 0,
                                            cursor: 'pointer', color: '#8b949e', lineHeight: 1,
                                            display: 'flex', alignItems: 'center',
                                        }}
                                        title={`Unpin ${pin.name || pin.path}`}
                                    >
                                        <X size={10} />
                                    </button>
                                )}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="chat-controls chat-controls-compact">
                <div className="chat-controls-bar">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary chat-settings-toggle"
                        onClick={() => setSettingsOpen(v => !v)}
                        disabled={loading}
                        title={settingsOpen ? 'Hide settings' : 'Show settings'}
                    >
                        <SlidersHorizontal size={14} className="me-1" />
                        <span style={{ fontSize: '11px' }}>Settings</span>
                        {settingsOpen ? <ChevronUp size={12} className="ms-1" /> : <ChevronDown size={12} className="ms-1" />}
                    </button>
                </div>

                {settingsOpen && (
                    <div className="chat-controls-body">
                        <div className="row g-2">
                            <div className="col-12">
                                <label className="form-label mb-1">UI Target</label>
                                <select
                                    className="form-select form-select-sm"
                                    value={uiTarget}
                                    onChange={(e) => setUiTarget(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="ask">Ask me each time</option>
                                    <option value="react">React (JSX components)</option>
                                    <option value="html">Static HTML</option>
                                    <option value="blade">Laravel Blade (PHP views)</option>
                                </select>
                                <div className="form-text">
                                    For UI/page requests, the AI will follow this target and avoid creating the wrong file types.
                                </div>
                            </div>

                            <div className="col-12">
                                <label className="form-label mb-1">Provider</label>
                                <select
                                    className="form-select form-select-sm"
                                    value={selectedEndpoint || ''}
                                    onChange={(e) => setSelectedEndpoint(Number(e.target.value))}
                                    disabled={loading || endpoints.length === 0}
                                >
                                    {endpoints.length === 0
                                        ? <option value="">— No providers configured —</option>
                                        : endpoints.map(ep => (
                                            <option key={ep.id} value={ep.id}>
                                                {ep.name} ({ep.provider})
                                            </option>
                                        ))
                                    }
                                </select>
                                {endpoints.length === 0 && (
                                    <div className="form-text text-warning" style={{ fontSize: '10px' }}>
                                        No active AI providers found. Go to <strong>Settings → AI Endpoints</strong> to add one.
                                    </div>
                                )}
                            </div>

                            <div className="col-12">
                                <label className="form-label d-flex justify-content-between mb-1">
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
                                            disabled={loading}
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
                                    disabled={isAuto || loading}
                                >
                                    {models.map((model, idx) => (
                                        <option key={`${model.id}-${idx}`} value={model.id}>
                                            {model.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="chat-messages">
                {messages.length === 0 && !loading && (
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

                {renderGroupedMessages(messages, handleApply, taskOverrides, handleTaskAction)}

                {loading && (
                    <div className="chat-msg-row chat-msg-row--ai">
                        <div className="chat-avatar chat-avatar--ai pulse">AI</div>
                        <div className="chat-bubble-wrap">
                            <div className="chat-bubble chat-bubble--ai streaming">
                                {streamingStatus && (
                                    <div className="streaming-status">
                                        <small className="text-muted">
                                            <Loader size={12} className="me-1 spinning" />
                                            {streamingStatus}
                                        </small>
                                    </div>
                                )}
                                <div className="message-content streaming-content">
                                    {streamingMessage || 'Waiting for response...'}
                                    <span className="streaming-cursor">▋</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {pendingClarification && (
                <div className="chat-clarification">
                    <div className="clarification-header">
                        <HelpCircle size={14} />
                        <span>A few quick questions before I proceed:</span>
                        <button
                            className="btn-icon ms-auto"
                            onClick={() => setPendingClarification(null)}
                            title="Dismiss"
                        >
                            <X size={13} />
                        </button>
                    </div>
                    {pendingClarification.questions.map((q) => (
                        <div key={q.id} className="clarification-question">
                            <div className="clarification-q-text">{q.text}</div>
                            <div className="clarification-options">
                                {(q.options || []).map((opt, i) => (
                                    <button
                                        key={i}
                                        className="clarification-option-btn"
                                        onClick={() => {
                                            setPendingClarification(null);
                                            setInput(opt);
                                        }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Chat Input ─────────────────────────────────────────────── */}
            <div style={{
                borderTop: `1px solid ${t.border}`,
                background: t.bg2,
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
            }}>
                {!workspace?.id && (
                    <div style={{ fontSize: '11px', color: '#f85149', padding: '4px 6px', background: 'rgba(248,81,73,0.1)', borderRadius: '4px', border: '1px solid rgba(248,81,73,0.2)' }}>
                        Select a workspace first to use AI chat.
                    </div>
                )}

                {/* Textarea */}
                <textarea
                    placeholder={workspace?.id ? "Ask AI… (Enter to send, Shift+Enter = new line)" : "No workspace selected…"}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    rows={3}
                    disabled={loading || !workspace?.id}
                    style={{
                        width: '100%',
                        background: isDark ? '#0a0c0f' : t.bg3,
                        color: t.text2,
                        border: `1px solid ${t.scrollbar}`,
                        borderRadius: '6px',
                        padding: '8px 10px',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        resize: 'none',
                        outline: 'none',
                        lineHeight: '1.5',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(255,107,53,0.5)'; }}
                    onBlur={e => { e.target.style.borderColor = t.scrollbar; }}
                />

                {/* Action buttons row */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }} />

                    {/* Cancel button */}
                    {loading && (
                        <button
                            onClick={handleCancel}
                            title="Cancel"
                            style={{
                                background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
                                borderRadius: '4px', color: '#f85149', cursor: 'pointer',
                                padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px',
                            }}
                        >
                            <X size={13} /> Cancel
                        </button>
                    )}

                    {/* Send button */}
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim() || !workspace?.id}
                        title="Send (Enter)"
                        style={{
                            background: 'rgba(255,107,53,0.15)',
                            border: '1px solid rgba(255,107,53,0.4)',
                            borderRadius: '4px',
                            color: '#ff6b35',
                            cursor: 'pointer',
                            padding: '4px 12px',
                            fontSize: '11px',
                            display: 'flex', alignItems: 'center', gap: '5px',
                            opacity: (loading || !input.trim() || !workspace?.id) ? 0.4 : 1,
                        }}
                    >
                        {loading ? <Loader size={13} className="spinning" /> : <Send size={13} />}
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}

function renderGroupedMessages(messages, handleApply, taskOverrides = {}, onTaskAction = null) {
    const out = [];
    let systemBucket = [];

    function flushSystem() {
        if (systemBucket.length === 0) return;
        const key = `sys-${out.length}`;
        out.push(
            <div key={key} className="chat-message system-group">
                <div className="system-lines">
                    {systemBucket.map((m, i) => (
                        <div key={i} className="system-line">{m.content}</div>
                    ))}
                </div>
            </div>
        );
        systemBucket = [];
    }

    for (let idx = 0; idx < messages.length; idx++) {
        const msg = messages[idx];
        if (msg.role === 'system') {
            systemBucket.push(msg);
            continue;
        }

        flushSystem();

        if (msg.role === 'plan') {
            const taskBtnStyle = (color) => ({
                background: 'none',
                border: `1px solid ${color}40`,
                borderRadius: '3px',
                color,
                cursor: 'pointer',
                fontSize: '9px',
                padding: '1px 6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.4,
            });
            out.push(
                <div key={idx} className="chat-message plan-message">
                    <div className="plan-header">
                        <ListChecks size={14} />
                        <span>AI Plan — {msg.tasks.length} step{msg.tasks.length !== 1 ? 's' : ''}</span>
                    </div>
                    <ol className="plan-task-list">
                        {msg.tasks.map((t) => {
                            const effectiveStatus = taskOverrides[t.id] ?? t.status;
                            return (
                                <li key={t.id} className={`plan-task plan-task--${effectiveStatus}`}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                                        <div>
                                            <span className="plan-task-title">{t.title}</span>
                                            {t.description && (
                                                <span className="plan-task-desc">{t.description}</span>
                                            )}
                                            {effectiveStatus === 'paused' && (
                                                <span style={{ display: 'block', fontSize: '9px', color: '#d29922', marginTop: '2px' }}>⏸ Paused</span>
                                            )}
                                            {effectiveStatus === 'skipped' && (
                                                <span style={{ display: 'block', fontSize: '9px', color: '#484f58', marginTop: '2px' }}>⏭ Skipped</span>
                                            )}
                                        </div>
                                        {onTaskAction && (
                                            <div style={{ display: 'flex', gap: '3px', flexShrink: 0, marginTop: '1px' }}>
                                                {effectiveStatus === 'paused' ? (
                                                    <button style={taskBtnStyle('#3fb950')} onClick={() => onTaskAction(t.id, 'resume')} title="Resume">
                                                        <Play size={8} /> Resume
                                                    </button>
                                                ) : effectiveStatus !== 'done' && effectiveStatus !== 'skipped' ? (
                                                    <button style={taskBtnStyle('#d29922')} onClick={() => onTaskAction(t.id, 'pause')} title="Pause before this step">
                                                        <Pause size={8} /> Pause
                                                    </button>
                                                ) : null}
                                                {effectiveStatus !== 'skipped' && effectiveStatus !== 'done' && (
                                                    <button style={taskBtnStyle('#484f58')} onClick={() => onTaskAction(t.id, 'skip')} title="Skip this step">
                                                        <SkipForward size={8} /> Skip
                                                    </button>
                                                )}
                                                {(effectiveStatus === 'done' || effectiveStatus === 'skipped') && (
                                                    <button style={taskBtnStyle('#388bfd')} onClick={() => onTaskAction(t.id, 'rerun')} title="Re-run this step">
                                                        <RotateCcw size={8} /> Re-run
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            );
            continue;
        }

        const isUser = msg.role === 'user';
        out.push(
            <div key={idx} className={`chat-msg-row ${isUser ? 'chat-msg-row--user' : 'chat-msg-row--ai'} ${msg.isError ? 'error' : ''}`}>
                {/* AI avatar (left) */}
                {!isUser && (
                    <div className="chat-avatar chat-avatar--ai">AI</div>
                )}

                <div className="chat-bubble-wrap">
                    <div className={`chat-bubble ${isUser ? 'chat-bubble--user' : 'chat-bubble--ai'}`}>
                        <div className="message-content">
                            {msg.content}
                            {msg.images?.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                    {msg.images.map((src, i) => (
                                        <img key={i} src={src} alt={`attachment ${i + 1}`} style={{ maxWidth: '120px', maxHeight: '80px', borderRadius: '4px', objectFit: 'cover' }} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {msg.tool_calls && msg.tool_calls.length > 0 && (
                            <div className="tool-calls mt-2">
                                <div className="small text-muted mb-1">Tools used</div>
                                {msg.tool_calls.map((tool, toolIdx) => (
                                    <div key={toolIdx} className="tool-call-item mb-1">
                                        <span className={`badge ${tool.result?.success ? 'bg-success' : 'bg-danger'}`}>{tool.name}</span>
                                        {tool.result?.path && <span className="ms-2 small text-muted">{tool.result.path}</span>}
                                        {tool.result?.message && <span className="ms-2 small text-muted">— {tool.result.message}</span>}
                                        {tool.result?.requires_approval && <span className="ms-2 small text-warning">Pending Approval</span>}
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
                                <button className="btn btn-sm btn-primary" onClick={() => handleApply(msg.code_changes)}>
                                    <Check size={14} className="me-1" />
                                    Apply Changes ({msg.code_changes.length})
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Meta: time + model */}
                    <div className={`chat-bubble-meta ${isUser ? 'chat-bubble-meta--right' : ''}`}>
                        {msg.model_used && !isUser && (
                            <span className="badge bg-primary me-2" style={{ fontSize: '9px' }}>{msg.model_used}</span>
                        )}
                        <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>

                {/* User avatar (right) */}
                {isUser && (
                    <div className="chat-avatar chat-avatar--me">Me</div>
                )}
            </div>
        );
    }

    flushSystem();
    return out;
}

// ── Agent Mode Picker ─────────────────────────────────────────────────────────

const AGENT_MODES = [
    { id: 'coder',      label: 'Coder',      icon: Code2,     desc: 'Write & edit code' },
    { id: 'architect',  label: 'Architect',  icon: Building2, desc: 'Design & plan systems' },
    { id: 'reviewer',   label: 'Reviewer',   icon: Eye,       desc: 'Find bugs & issues' },
    { id: 'debugger',   label: 'Debugger',   icon: Bug,       desc: 'Trace & fix root causes' },
    { id: 'documenter', label: 'Docs',       icon: BookOpen,  desc: 'Write documentation' },
    { id: 'refactorer', label: 'Refactor',   icon: Wrench,    desc: 'Improve without breaking' },
    { id: 'security',   label: 'Security',   icon: Shield,    desc: 'Audit for vulnerabilities' },
];

function AgentModePicker({ mode, onChange, disabled }) {
    const activeMode = AGENT_MODES.find(m => m.id === mode) || AGENT_MODES[0];

    return (
        <div style={{
            borderBottom: '1px solid #1c2128',
            background: '#0a0c0f',
            padding: '6px 10px 0',
            flexShrink: 0,
        }}>
            <div style={{
                display: 'flex', gap: '3px', overflowX: 'auto', paddingBottom: '6px',
                scrollbarWidth: 'none',
            }}>
                {AGENT_MODES.map(m => {
                    const Icon = m.icon;
                    const active = mode === m.id;
                    return (
                        <button
                            key={m.id}
                            onClick={() => !disabled && onChange(m.id)}
                            title={m.desc}
                            disabled={disabled}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '3px 8px', borderRadius: '12px', border: 'none',
                                cursor: disabled ? 'default' : 'pointer',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '10px', whiteSpace: 'nowrap',
                                transition: 'all 0.15s',
                                background: active ? 'rgba(255,107,53,0.15)' : 'transparent',
                                color: active ? '#ff6b35' : '#484f58',
                                outline: active ? '1px solid rgba(255,107,53,0.3)' : '1px solid transparent',
                                opacity: disabled ? 0.5 : 1,
                            }}
                        >
                            <Icon size={10} />
                            {m.label}
                        </button>
                    );
                })}
            </div>
            <div style={{
                fontSize: '9px', color: '#484f58',
                paddingBottom: '4px', lineHeight: 1,
            }}>
                {activeMode.desc}
            </div>
        </div>
    );
}
