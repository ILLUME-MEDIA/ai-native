import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, X, Zap, Check, Loader, SlidersHorizontal, ChevronDown, ChevronUp, ListChecks, HelpCircle, Code2, Building2, Eye, Bug, BookOpen, Wrench, Shield, Pin, Pause, Play, SkipForward, RotateCcw, SquarePen, History, Trash2, Paperclip, Mic, MicOff, FileCode } from 'lucide-react';
import { toast } from 'react-toastify';
import { useCodeEditorTheme } from './useCodeEditorTheme';

export default function AIChatPanel({ workspace, currentFile, openFiles, onClose, onApplyChanges, onFileTreeRefresh, onFileTreePatch, prefill, onPrefillConsumed, pinnedContext = [], onUnpinFile, onTerminalAppend, onOpenTerminal, onLoadingChange }) {
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
    const [showHistory, setShowHistory] = useState(false);
    const [appliedMsgIds, setAppliedMsgIds] = useState(new Set());
    // Approval IDs that have been acted on (approved/rejected) — persisted in localStorage
    // so the banner never reappears after hard refresh.
    const [resolvedApprovalIds, setResolvedApprovalIds] = useState(() => {
        try { return new Set(JSON.parse(localStorage.getItem('ce_resolved_approvals') || '[]')); }
        catch { return new Set(); }
    });
    const [attachments, setAttachments] = useState([]);   // [{id,type,name,dataUrl,mimeType,textContent}]
    const [isRecording, setIsRecording] = useState(false);
    const messagesEndRef = useRef(null);
    const eventSourceRef = useRef(null);
    const abortRef = useRef(null);
    const conversationIdRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const recognitionRef = useRef(null);
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

    // Keep ref in sync so handleSend always reads the latest conversationId
    useEffect(() => {
        conversationIdRef.current = conversationId;
    }, [conversationId]);

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

    // Notify parent + broadcast window event when AI streaming starts/stops.
    // Presence components listen to 'ce-ai-streaming' to abort in-flight requests.
    useEffect(() => {
        onLoadingChange?.(loading);
        window.dispatchEvent(new CustomEvent('ce-ai-streaming', { detail: { streaming: loading } }));
    }, [loading]);

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

    // Heartbeat: update status and auto-cancel if stream goes silent or runs too long
    useEffect(() => {
        if (!loading) return;
        const SILENT_TIMEOUT_MS  = 300_000; // abort if no server event for 5 min (npm install can take long)
        const MAX_TOTAL_MS       = 20 * 60_000; // hard cap at 20 minutes
        const t = setInterval(() => {
            const silentFor  = Date.now() - (lastEventAtRef.current || Date.now());
            const totalMs    = streamStartAtRef.current ? Date.now() - streamStartAtRef.current : 0;

            if (silentFor > 2500) {
                setStreamingStatus(`⏳ Working… (${streamSeconds}s)`);
            }

            if (silentFor >= SILENT_TIMEOUT_MS) {
                handleCancel();
                toast.warning('AI stream timed out — no response for 5 min. Request cancelled.');
            } else if (totalMs >= MAX_TOTAL_MS) {
                handleCancel();
                toast.warning('AI request exceeded 20 minutes and was auto-cancelled.');
            }
        }, 1000);
        return () => clearInterval(t);
    }, [loading, streamSeconds, handleCancel]);


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
    // ── File / image attachment handling ─────────────────────────────────────
    const handleFileSelect = useCallback((files) => {
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            const id = Date.now() + Math.random();
            if (file.type.startsWith('image/')) {
                reader.onload = (e) => setAttachments(prev => [...prev, {
                    id, type: 'image', name: file.name,
                    dataUrl: e.target.result, mimeType: file.type,
                }]);
                reader.readAsDataURL(file);
            } else {
                // text / code file
                reader.onload = (e) => setAttachments(prev => [...prev, {
                    id, type: 'file', name: file.name,
                    textContent: e.target.result, mimeType: file.type || 'text/plain',
                }]);
                reader.readAsText(file);
            }
        });
    }, []);

    const handlePaste = useCallback((e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) handleFileSelect([file]);
            }
        }
    }, [handleFileSelect]);

    const removeAttachment = useCallback((id) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    }, []);

    // ── Voice input (Web Speech API) ──────────────────────────────────────────
    const toggleVoice = useCallback(() => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            return;
        }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { toast.error('Voice input not supported in this browser (try Chrome)'); return; }

        const rec = new SR();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = navigator.language || 'en-US';
        recognitionRef.current = rec;

        rec.onresult = (e) => {
            const transcript = Array.from(e.results)
                .map(r => r[0].transcript).join(' ');
            setInput(prev => (prev ? prev + ' ' : '') + transcript);
        };
        rec.onend  = () => setIsRecording(false);
        rec.onerror = () => { setIsRecording(false); toast.error('Voice recognition error'); };
        rec.start();
        setIsRecording(true);
    }, [isRecording]);

    async function handleSend() {
        if ((!input.trim() && attachments.length === 0) || loading) return;

        if (!workspace?.id) {
            toast.error('No workspace selected. Please open or create a workspace first.');
            return;
        }

        // Cancel any in-flight stream
        if (abortRef.current) {
            abortRef.current.abort();
        }

        const sentAttachments = [...attachments];
        const userMessage = {
            role: 'user',
            content: input,
            attachments: sentAttachments,
            timestamp: new Date()
        };

        setMessages(prev => {
            const withoutTrailingSystem = [...prev];
            while (withoutTrailingSystem.length > 0 &&
                   withoutTrailingSystem[withoutTrailingSystem.length - 1].role === 'system') {
                withoutTrailingSystem.pop();
            }
            return [...withoutTrailingSystem, userMessage];
        });
        const userInput = input;
        setInput('');
        setAttachments([]);
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
            // Use ref to always get the latest conversationId (avoids stale closure)
            const currentConvId = conversationIdRef.current;
            if (currentConvId) {
                formData.append('conversation_id', currentConvId);
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

            // Attach files/images
            const imgAttachments  = sentAttachments.filter(a => a.type === 'image');
            const fileAttachments = sentAttachments.filter(a => a.type === 'file');

            // Append file text contents directly to the message
            if (fileAttachments.length > 0) {
                const fileContext = fileAttachments
                    .map(f => `\`\`\`${f.name}\n${f.textContent}\n\`\`\``)
                    .join('\n\n');
                formData.set('message', (userInput ? userInput + '\n\n' : '') + fileContext);
            }

            // Images — sent as base64 data URLs for vision-capable models
            imgAttachments.forEach((img, i) => {
                formData.append(`images[${i}][name]`, img.name);
                formData.append(`images[${i}][data]`, img.dataUrl);
                formData.append(`images[${i}][mime]`, img.mimeType);
            });

            // Get CSRF token
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

            const controller = new AbortController();
            abortRef.current = controller;

            // Build headers — include Bearer token so WorkspaceAuth middleware
            // can authenticate when there is no session (local dev).
            const fetchHeaders = {
                'Accept': 'text/event-stream',
                'X-Requested-With': 'XMLHttpRequest',
            };
            if (csrfToken) fetchHeaders['X-CSRF-TOKEN'] = csrfToken;
            if (window.__SITE_API_KEY__) fetchHeaders['Authorization'] = `Bearer ${window.__SITE_API_KEY__}`;

            // EventSource doesn't support POST, so we'll use fetch with streaming
            const response = await fetch(url, {
                method: 'POST',
                headers: fetchHeaders,
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

                // Split on double newlines (SSE message boundary) — NOT single newlines.
                // Splitting on \n causes events to be silently dropped when `event:` and
                // `data:` lines arrive in separate network reads.
                const messages = buffer.split('\n\n');
                buffer = messages.pop(); // keep incomplete last message

                for (const msg of messages) {
                    if (!msg.trim()) continue;
                    let event = 'message';
                    let data = '';
                    for (const line of msg.split('\n')) {
                        if (line.startsWith('event:')) event = line.substring(6).trim();
                        else if (line.startsWith('data:')) data = line.substring(5).trim();
                        // ':' lines are SSE comments (keepalive) — ignore
                    }
                    if (!data) continue;
                    try {
                        handleSSEEvent(event, JSON.parse(data));
                    } catch (e) {
                        console.warn('Failed to parse SSE payload', data, e);
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
                if (data?.conversation_id && !conversationIdRef.current) {
                    setConversationId(data.conversation_id);
                    conversationIdRef.current = data.conversation_id;
                    // Only refresh the list (no auto-select) so new chat stays active
                    refreshConversationList();
                }
                break;

            case 'status':
                {
                    const msg = (data.message || '').trim();
                    if (msg) {
                        setStreamingStatus(msg);
                        // Push into timeline (throttled + dedup)
                        const now = Date.now();
                        if (msg !== lastStatusRef.current) {
                            lastStatusRef.current = msg;
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
                // Accumulate response chunks, stripping ANSI codes
                currentMessageRef.current.message += (data.text || '').replace(/\x1B\[[0-9;]*[A-Za-z]|\[\d+(?:;\d+)*m/g, '');
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
                    // If AI is running a command, open terminal so user can see output
                    if (data.tool === 'runCommand' && data.arguments?.command) {
                        if (onOpenTerminal) onOpenTerminal();
                        if (onTerminalAppend) onTerminalAppend([{
                            type: 'command',
                            content: `[AI] ${data.arguments.command}`,
                            dir: data.arguments.cwd || '/',
                            timestamp: new Date(),
                        }]);
                    }
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
                    // Push runCommand output to terminal panel
                    if (data.tool === 'runCommand' && onTerminalAppend) {
                        const entries = [];
                        if (data.result?.output) entries.push({ type: 'output', content: data.result.output, timestamp: new Date() });
                        if (data.result?.error_output) entries.push({ type: 'stderr', content: data.result.error_output, timestamp: new Date() });
                        if (!ok && data.result?.error) entries.push({ type: 'error', content: data.result.error, timestamp: new Date() });
                        if (entries.length) onTerminalAppend(entries);
                    }
                }
                break;

            case 'turn_start':
                setStreamingStatus(`Turn ${data.turn}/${data.max}...`);
                if (data.turn > 1) {
                    // Only show subsequent turns to avoid noise on turn 1
                    setMessages(prev => [...prev, {
                        role: 'system',
                        content: `🔁 Turn ${data.turn}/${data.max}`,
                        timestamp: new Date(),
                    }]);
                }
                break;

            case 'complete':
                {
                // Final message received
                const finalContent = data.message || currentMessageRef.current.message;
                const finalToolCalls = data.tool_calls || currentMessageRef.current.tool_calls;
                // Fallback: if AI wrote files but gave no text, show a summary
                const fallbackContent = !finalContent && finalToolCalls?.length > 0
                    ? `Done! Created/updated ${finalToolCalls.length} file(s). Check the file explorer to see the changes.`
                    : finalContent;

                const aiMessage = {
                    role: 'assistant',
                    content: fallbackContent,
                    code_changes: data.code_changes || [],
                    tool_calls: finalToolCalls,
                    requires_approval: data.requires_approval || false,
                    approval_id: data.approval_id || null,
                    model_used: data.model_used,
                    timestamp: new Date()
                };

                setMessages(prev => [...prev, aiMessage]);
                setStreamingMessage('');
                setStreamingStatus('');
                setLoading(false);
                // Refresh conversation list so the auto-generated title appears in history
                refreshConversationList();
                }
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

            case 'keepalive':
                // Server heartbeat — just resets lastEventAtRef (done above) so timeout doesn't fire
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

    function handleApply(changes, msgId) {
        onApplyChanges(changes);
        if (msgId) setAppliedMsgIds(prev => new Set([...prev, msgId]));
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

    function handleNewChat() {
        if (loading) return;
        setMessages([]);
        setConversationId(null);
        setInput('');
        setStreamingMessage('');
        setStreamingStatus('');
        setPendingClarification(null);
        setActivePlanTasks(null);
        setTaskOverrides({});
        setShowHistory(false);
        currentMessageRef.current = { message: '', code_changes: [], tool_calls: [], model_used: null };
    }

    async function handleSelectConversation(id) {
        if (loading) return;
        setConversationId(id);
        setMessages([]);
        setShowHistory(false);
        await loadConversation(id);
    }

    async function handleDeleteConversation(e, id) {
        e.stopPropagation();
        if (!workspace?.id) return;
        try {
            await axios.delete(`/api/workspaces/${workspace.id}/ai/conversations/${id}`);
            if (id === conversationId) {
                handleNewChat();
            }
            await refreshConversationList();
        } catch {
            toast.error('Failed to delete conversation');
        }
    }

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    return (
        <div className="ai-chat-panel" style={{ position: 'relative' }}>
            <div className="chat-header">
                <div className="chat-title">
                    <Zap size={18} />
                    <span>AI Assistant</span>
                </div>
                <button
                    className="btn-icon"
                    onClick={() => { if (!loading) setShowHistory(v => !v); }}
                    title="Chat History"
                    style={{ opacity: loading ? 0.4 : 1, color: showHistory ? '#ff6b35' : undefined }}
                >
                    <History size={16} />
                </button>
                <button
                    className="btn-icon"
                    onClick={handleNewChat}
                    disabled={loading}
                    title="New Chat"
                    style={{ opacity: loading ? 0.4 : 1 }}
                >
                    <SquarePen size={16} />
                </button>
                <button className="btn-icon" onClick={onClose} title="Close">
                    <X size={18} />
                </button>
            </div>

            {showHistory && (
                <div style={{
                    position: 'absolute',
                    top: '40px',
                    right: '8px',
                    width: '280px',
                    background: t.bg3,
                    border: `1px solid ${t.border}`,
                    borderRadius: '8px',
                    boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 100,
                    maxHeight: '360px',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{
                        padding: '8px 12px',
                        borderBottom: `1px solid ${t.border}`,
                        fontSize: '11px',
                        fontWeight: 600,
                        color: t.text3,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <span>Chat History</span>
                        <button
                            style={{ background: 'none', border: 'none', color: t.text3, cursor: 'pointer', padding: 0 }}
                            onClick={() => setShowHistory(false)}
                        >
                            <X size={13} />
                        </button>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {conversations.length === 0 ? (
                            <div style={{ padding: '16px 12px', fontSize: '12px', color: t.text3, textAlign: 'center' }}>
                                No previous chats
                            </div>
                        ) : conversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => handleSelectConversation(conv.id)}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    borderBottom: `1px solid ${t.border}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: conv.id === conversationId ? 'rgba(255,107,53,0.08)' : 'transparent',
                                    borderLeft: conv.id === conversationId ? '2px solid #ff6b35' : '2px solid transparent',
                                }}
                                onMouseEnter={e => { if (conv.id !== conversationId) e.currentTarget.style.background = t.bg4; }}
                                onMouseLeave={e => { if (conv.id !== conversationId) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '12px',
                                        color: t.text2,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {conv.title || 'Untitled Chat'}
                                    </div>
                                    <div style={{ fontSize: '10px', color: t.text3, marginTop: '2px' }}>
                                        {conv.last_activity_at ? new Date(conv.last_activity_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                                    style={{
                                        background: 'none', border: 'none', padding: '2px',
                                        color: t.text3, cursor: 'pointer', flexShrink: 0,
                                        display: 'flex', alignItems: 'center',
                                        borderRadius: '3px',
                                    }}
                                    title="Delete"
                                    onMouseEnter={e => { e.currentTarget.style.color = '#f85149'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = t.text3; }}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <AgentModePicker mode={agentMode} onChange={setAgentMode} disabled={loading} />

            {pinnedContext.length > 0 && (
                <div style={{
                    padding: '5px 10px',
                    borderBottom: `1px solid ${t.border}`,
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
                                fontSize: '10px', color: t.text2,
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
                                            cursor: 'pointer', color: t.text3, lineHeight: 1,
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

                {renderGroupedMessages(messages, handleApply, taskOverrides, handleTaskAction, appliedMsgIds, resolvedApprovalIds, (id) => {
                    const next = new Set(resolvedApprovalIds);
                    next.add(String(id));
                    setResolvedApprovalIds(next);
                    try { localStorage.setItem('ce_resolved_approvals', JSON.stringify([...next])); } catch {}
                    onFileTreeRefresh?.();
                }, workspace, isDark)}

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
                                    {streamingMessage ? (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                            code({ inline, children, ...props }) {
                                                return inline
                                                    ? <code style={{ background: 'rgba(110,118,129,0.2)', borderRadius: '3px', padding: '1px 5px', fontSize: '85%', fontFamily: 'monospace', color: isDark ? '#e6edf3' : '#24292f' }} {...props}>{children}</code>
                                                    : <pre style={{ background: isDark ? '#0d1117' : '#f6f8fa', border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`, borderRadius: '6px', padding: '10px 14px', overflowX: 'auto', fontSize: '12px', margin: '6px 0' }}><code style={{ fontFamily: 'monospace', color: isDark ? '#e6edf3' : '#24292f' }} {...props}>{children}</code></pre>;
                                            },
                                            p: ({ children }) => <div style={{ margin: '4px 0', lineHeight: '1.6' }}>{children}</div>,
                                        }}>{streamingMessage}</ReactMarkdown>
                                    ) : 'Waiting for response...'}
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
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,text/*,.js,.jsx,.ts,.tsx,.php,.py,.java,.go,.rs,.c,.cpp,.cs,.json,.yaml,.yml,.md,.sql,.sh,.env,.txt,.csv,.xml,.html,.css,.scss"
                style={{ display: 'none' }}
                onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }}
            />

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

                {/* Attachment previews */}
                {attachments.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {attachments.map(att => (
                            <div key={att.id} style={{
                                position: 'relative',
                                background: isDark ? '#1c2128' : '#f3f4f6',
                                border: `1px solid ${t.border}`,
                                borderRadius: '5px',
                                overflow: 'hidden',
                                maxWidth: att.type === 'image' ? '70px' : '140px',
                            }}>
                                {att.type === 'image' ? (
                                    <img src={att.dataUrl} alt={att.name}
                                        style={{ width: '70px', height: '50px', objectFit: 'cover', display: 'block' }} />
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 6px' }}>
                                        <FileCode size={12} color="#58a6ff" />
                                        <span style={{ fontSize: '10px', color: t.text2, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {att.name}
                                        </span>
                                    </div>
                                )}
                                <button
                                    onClick={() => removeAttachment(att.id)}
                                    style={{
                                        position: 'absolute', top: '1px', right: '1px',
                                        background: 'rgba(0,0,0,0.6)', border: 'none',
                                        borderRadius: '50%', width: '14px', height: '14px',
                                        cursor: 'pointer', color: '#fff', fontSize: '8px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        lineHeight: 1, padding: 0,
                                    }}
                                    title="Remove"
                                >×</button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    placeholder={workspace?.id ? "Ask AI… (Enter = send, Shift+Enter = new line, paste image)" : "No workspace selected…"}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    onPaste={handlePaste}
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
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {/* Upload files/images */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading || !workspace?.id}
                        title="Attach file or image"
                        style={{
                            background: 'none', border: `1px solid ${t.border}`,
                            borderRadius: '4px', color: t.text3, cursor: 'pointer',
                            padding: '3px 7px', fontSize: '11px',
                            display: 'flex', alignItems: 'center', gap: '3px',
                            opacity: (!workspace?.id) ? 0.4 : 1,
                        }}
                    >
                        <Paperclip size={12} />
                    </button>

                    {/* Voice input */}
                    <button
                        onClick={toggleVoice}
                        disabled={loading || !workspace?.id}
                        title={isRecording ? 'Stop recording' : 'Voice input'}
                        style={{
                            background: isRecording ? 'rgba(255,107,53,0.2)' : 'none',
                            border: `1px solid ${isRecording ? 'rgba(255,107,53,0.6)' : t.border}`,
                            borderRadius: '4px',
                            color: isRecording ? '#ff6b35' : t.text3,
                            cursor: 'pointer',
                            padding: '3px 7px', fontSize: '11px',
                            display: 'flex', alignItems: 'center', gap: '3px',
                            opacity: (!workspace?.id) ? 0.4 : 1,
                            animation: isRecording ? 'pulse 1s infinite' : 'none',
                        }}
                    >
                        {isRecording ? <MicOff size={12} /> : <Mic size={12} />}
                    </button>

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
                        disabled={loading || (!input.trim() && attachments.length === 0) || !workspace?.id}
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
                            opacity: (loading || (!input.trim() && attachments.length === 0) || !workspace?.id) ? 0.4 : 1,
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

// ── Inline approval widget — shown directly in the chat bubble ───────────────
function InlineApproval({ approvalId, workspaceId, onResolved }) {
    const [busy, setBusy] = React.useState(false);
    const [status, setStatus] = React.useState(null); // 'approved' | 'rejected'

    async function act(action) {
        setBusy(true);
        try {
            await axios.post(`/api/approvals/${approvalId}/${action}`);
            setStatus(action === 'approve' ? 'approved' : 'rejected');
            onResolved?.(approvalId);
        } catch {
            setStatus(null);
        } finally {
            setBusy(false);
        }
    }

    if (status) {
        return (
            <div style={{ marginTop: '8px', fontSize: '11px', color: status === 'approved' ? '#3fb950' : '#f85149', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {status === 'approved' ? <Check size={12} /> : <X size={12} />}
                {status === 'approved' ? 'Changes applied' : 'Changes rejected'}
            </div>
        );
    }

    return (
        <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(210,167,0,0.08)', border: '1px solid rgba(210,167,0,0.3)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#e3b341', flex: 1 }}>⚠️ AI wants to write files — approve to apply</span>
            <button
                onClick={() => act('approve')}
                disabled={busy}
                style={{ background: 'rgba(63,185,80,0.15)', border: '1px solid rgba(63,185,80,0.4)', borderRadius: '4px', color: '#3fb950', cursor: busy ? 'default' : 'pointer', padding: '3px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', opacity: busy ? 0.6 : 1 }}
            >
                {busy ? <Loader size={11} className="spinning" /> : <Check size={11} />} Approve
            </button>
            <button
                onClick={() => act('reject')}
                disabled={busy}
                style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: '4px', color: '#f85149', cursor: busy ? 'default' : 'pointer', padding: '3px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', opacity: busy ? 0.6 : 1 }}
            >
                <X size={11} /> Reject
            </button>
        </div>
    );
}

function renderGroupedMessages(messages, handleApply, taskOverrides = {}, onTaskAction = null, appliedMsgIds = new Set(), resolvedApprovalIds = new Set(), onApprovalResolved = null, workspace = null, isDark = true) {
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
                            {isUser ? (
                                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                            ) : (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        code({ inline, className, children, ...props }) {
                                            const codeColor = isDark ? '#e6edf3' : '#24292f';
                                            const codeBg = isDark ? '#0d1117' : '#f6f8fa';
                                            const codeBorder = isDark ? '#30363d' : '#d0d7de';
                                            return inline ? (
                                                <code style={{
                                                    background: isDark ? 'rgba(110,118,129,0.2)' : 'rgba(175,184,193,0.2)',
                                                    borderRadius: '3px',
                                                    padding: '1px 5px',
                                                    fontSize: '85%',
                                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                                    color: codeColor,
                                                }} {...props}>{children}</code>
                                            ) : (
                                                <pre style={{
                                                    background: codeBg,
                                                    border: `1px solid ${codeBorder}`,
                                                    borderRadius: '6px',
                                                    padding: '12px 14px',
                                                    overflowX: 'auto',
                                                    fontSize: '12px',
                                                    lineHeight: '1.5',
                                                    margin: '8px 0',
                                                }}>
                                                    <code style={{
                                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                                        color: codeColor,
                                                    }} {...props}>{children}</code>
                                                </pre>
                                            );
                                        },
                                        p: ({ children }) => <div style={{ margin: '4px 0', lineHeight: '1.6' }}>{children}</div>,
                                        ul: ({ children }) => <ul style={{ paddingLeft: '18px', margin: '4px 0' }}>{children}</ul>,
                                        ol: ({ children }) => <ol style={{ paddingLeft: '18px', margin: '4px 0' }}>{children}</ol>,
                                        li: ({ children }) => <li style={{ margin: '2px 0' }}>{children}</li>,
                                        h1: ({ children }) => <h5 style={{ margin: '8px 0 4px', fontWeight: 700, color: isDark ? '#e6edf3' : '#24292f' }}>{children}</h5>,
                                        h2: ({ children }) => <h6 style={{ margin: '8px 0 4px', fontWeight: 700, color: isDark ? '#e6edf3' : '#24292f' }}>{children}</h6>,
                                        h3: ({ children }) => <strong style={{ display: 'block', margin: '6px 0 2px', color: isDark ? '#e6edf3' : '#24292f' }}>{children}</strong>,
                                        strong: ({ children }) => <strong style={{ color: isDark ? '#e6edf3' : '#24292f', fontWeight: 600 }}>{children}</strong>,
                                        em: ({ children }) => <em style={{ color: isDark ? '#c9d1d9' : '#57606a' }}>{children}</em>,
                                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#58a6ff' : '#0969da', textDecoration: 'none' }}>{children}</a>,
                                        blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid #ff6b35', paddingLeft: '10px', margin: '6px 0', color: isDark ? '#8b949e' : '#57606a' }}>{children}</blockquote>,
                                        hr: () => <hr style={{ border: 'none', borderTop: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`, margin: '8px 0' }} />,
                                        table: ({ children }) => <table style={{ borderCollapse: 'collapse', width: '100%', margin: '6px 0', fontSize: '12px' }}>{children}</table>,
                                        th: ({ children }) => <th style={{ border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`, padding: '4px 8px', background: isDark ? '#161b22' : '#f6f8fa', textAlign: 'left' }}>{children}</th>,
                                        td: ({ children }) => <td style={{ border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`, padding: '4px 8px' }}>{children}</td>,
                                    }}
                                >
                                    {msg.content || ''}
                                </ReactMarkdown>
                            )}
                            {msg.attachments?.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                                    {msg.attachments.map((att, i) => att.type === 'image' ? (
                                        <img key={i} src={att.dataUrl} alt={att.name}
                                            style={{ maxWidth: '140px', maxHeight: '100px', borderRadius: '4px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    ) : (
                                        <span key={i} style={{ fontSize: '10px', background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.3)', borderRadius: '3px', padding: '2px 6px', color: '#58a6ff' }}>
                                            📄 {att.name}
                                        </span>
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

                        {msg.requires_approval && msg.approval_id && !resolvedApprovalIds.has(String(msg.approval_id)) && (
                            <InlineApproval
                                approvalId={msg.approval_id}
                                workspaceId={workspace?.id}
                                onResolved={onApprovalResolved}
                            />
                        )}

                        {msg.code_changes && msg.code_changes.length > 0 && !msg.requires_approval && (() => {
                            const msgId = msg.timestamp?.getTime?.() ?? idx;
                            const applied = appliedMsgIds.has(msgId);
                            return applied ? null : (
                                <div className="message-actions mt-2">
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => handleApply(msg.code_changes, msgId)}
                                    >
                                        <Check size={14} className="me-1" />
                                        Apply Changes ({msg.code_changes.length})
                                    </button>
                                </div>
                            );
                        })()}

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
    const { isDark, tokens: t } = useCodeEditorTheme();

    return (
        <div style={{
            borderBottom: `1px solid ${t.border}`,
            background: t.bg2,
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
                                color: active ? '#ff6b35' : t.text4,
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
                fontSize: '9px', color: t.text4,
                paddingBottom: '4px', lineHeight: 1,
            }}>
                {activeMode.desc}
            </div>
        </div>
    );
}
