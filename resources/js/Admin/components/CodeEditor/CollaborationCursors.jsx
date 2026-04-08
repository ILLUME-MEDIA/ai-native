import { useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

// Stable palette of distinct colors for collaborators
const COLLAB_COLORS = [
    '#58a6ff', '#3fb950', '#bc8cff', '#ff9f1c', '#39d353',
    '#ff7b72', '#56d364', '#d2a8ff', '#ffa657', '#79c0ff',
];

function colorForUser(userId) {
    return COLLAB_COLORS[userId % COLLAB_COLORS.length];
}

/**
 * C-02: Collaboration Cursors
 *
 * Polls the presence API every 15 s and renders remote cursors as Monaco decorations.
 * Also sends the current user's cursor position + open file on each keystroke (throttled).
 *
 * Props:
 *   workspace         – current workspace object
 *   monacoEditorRef   – ref to the Monaco IStandaloneCodeEditor instance
 *   activeTab         – current open tab ({ path })
 */
export default function CollaborationCursors({ workspace, monacoEditorRef, activeTab, pauseRef }) {
    const decorationsRef  = useRef([]);   // active decoration IDs
    const usersRef        = useRef([]);   // last fetched user list
    const pollTimerRef    = useRef(null);
    const heartbeatRef    = useRef(null);
    const cursorSendRef   = useRef(null); // throttle timer for cursor sends
    const pollAbortRef    = useRef(null); // AbortController for in-flight poll
    const heartAbortRef   = useRef(null); // AbortController for in-flight heartbeat

    // ── Send own cursor position to the server ────────────────────────────────
    const sendCursor = useCallback(() => {
        if (!workspace) return;
        const editor = monacoEditorRef?.current;
        const pos    = editor?.getPosition();

        heartAbortRef.current?.abort();
        heartAbortRef.current = new AbortController();
        axios.post(`/api/workspaces/${workspace.id}/presence/heartbeat`, {
            open_file:   activeTab?.path ?? null,
            cursor_line: pos?.lineNumber ?? null,
            cursor_col:  pos?.column    ?? null,
        }, { signal: heartAbortRef.current.signal }).catch(() => {});
    }, [workspace, monacoEditorRef, activeTab, pauseRef]);

    // Throttled cursor sender — fires at most once per 2 s
    const scheduleCursorSend = useCallback(() => {
        if (cursorSendRef.current) return;
        cursorSendRef.current = setTimeout(() => {
            cursorSendRef.current = null;
            sendCursor();
        }, 2000);
    }, [sendCursor]);

    // ── Apply Monaco decorations for remote cursors ───────────────────────────
    const applyDecorations = useCallback((users) => {
        const editor = monacoEditorRef?.current;
        if (!editor) return;

        const currentFile = activeTab?.path;

        const newDecorations = users
            .filter(u => u.open_file === currentFile && u.cursor_line)
            .map(u => {
                const color = colorForUser(u.user_id);
                const line  = u.cursor_line;
                const col   = u.cursor_col ?? 1;

                return {
                    range: {
                        startLineNumber: line, startColumn: col,
                        endLineNumber:   line, endColumn: col + 1,
                    },
                    options: {
                        className: `collab-cursor-${u.user_id}`,
                        afterContentClassName: `collab-cursor-label-${u.user_id}`,
                        stickiness: 1, // AlwaysGrowsWhenTypingAtEdges
                    },
                };
            });

        // Inject per-user CSS if not already present
        users.forEach(u => {
            const color = colorForUser(u.user_id);
            const styleId = `collab-cursor-style-${u.user_id}`;
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id    = styleId;
                style.textContent = `
                    .collab-cursor-${u.user_id} {
                        border-left: 2px solid ${color};
                        margin-left: -1px;
                    }
                    .collab-cursor-label-${u.user_id}::after {
                        content: '${CSS.escape(u.name)}';
                        background: ${color};
                        color: #0d0f14;
                        font-size: 9px;
                        font-family: 'JetBrains Mono', monospace;
                        padding: 0 4px;
                        border-radius: 0 2px 2px 2px;
                        white-space: nowrap;
                        pointer-events: none;
                        position: absolute;
                        top: -16px;
                        left: 0;
                        z-index: 100;
                    }
                `;
                document.head.appendChild(style);
            }
        });

        decorationsRef.current = editor.deltaDecorations(
            decorationsRef.current,
            newDecorations,
        );
    }, [monacoEditorRef, activeTab]);

    // ── Poll remote cursors ───────────────────────────────────────────────────
    const poll = useCallback(async () => {
        if (!workspace) return;
        pollAbortRef.current?.abort();
        pollAbortRef.current = new AbortController();
        try {
            const { data } = await axios.get(`/api/workspaces/${workspace.id}/presence`,
                { signal: pollAbortRef.current.signal });
            usersRef.current = data.users ?? [];
            applyDecorations(usersRef.current);
        } catch { /* silent — includes AbortError */ }
    }, [workspace, applyDecorations, pauseRef]);

    // ── Start / stop interval helpers ────────────────────────────────────────
    const startTimers = useCallback(() => {
        if (pollTimerRef.current || heartbeatRef.current) return;
        pollTimerRef.current  = setInterval(poll,       60000);
        heartbeatRef.current  = setInterval(sendCursor, 50000);
    }, [poll, sendCursor]);

    const stopTimers = useCallback(() => {
        clearInterval(pollTimerRef.current);
        clearInterval(heartbeatRef.current);
        pollTimerRef.current  = null;
        heartbeatRef.current  = null;
        // Abort any in-flight requests immediately so PHP is freed
        pollAbortRef.current?.abort();
        heartAbortRef.current?.abort();
    }, []);

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!workspace) return;

        // Stop timers entirely while AI streams — restart 3 s after done.
        // This prevents presence from queuing behind chat-stream on single-threaded PHP.
        const onAiStreaming = (e) => {
            if (e.detail?.streaming) {
                stopTimers();
            } else {
                setTimeout(() => startTimers(), 3000);
            }
        };
        window.addEventListener('ce-ai-streaming', onAiStreaming);

        // Delay initial calls 8 s so page-load requests settle first.
        const initTimer = setTimeout(() => { poll(); sendCursor(); startTimers(); }, 8000);

        return () => {
            window.removeEventListener('ce-ai-streaming', onAiStreaming);
            clearTimeout(initTimer);
            stopTimers();
            clearTimeout(cursorSendRef.current);
        };
    }, [workspace, poll, sendCursor, startTimers, stopTimers]);

    // Re-apply decorations when active tab changes
    useEffect(() => {
        applyDecorations(usersRef.current);
    }, [activeTab, applyDecorations]);

    // Listen to Monaco cursor changes
    useEffect(() => {
        const editor = monacoEditorRef?.current;
        if (!editor) return;

        const disposable = editor.onDidChangeCursorPosition(scheduleCursorSend);
        return () => disposable?.dispose();
    }, [monacoEditorRef?.current, scheduleCursorSend]);

    // Clear decorations on unmount
    useEffect(() => {
        return () => {
            const editor = monacoEditorRef?.current;
            if (editor && decorationsRef.current.length) {
                editor.deltaDecorations(decorationsRef.current, []);
            }
        };
    }, []);

    return null; // renders nothing — all output goes through Monaco decorations
}
