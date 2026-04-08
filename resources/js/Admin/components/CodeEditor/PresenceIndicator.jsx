import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const AVATAR_COLORS = [
    '#ff6b35', '#3fb950', '#58a6ff', '#f78166', '#d2a8ff',
    '#ffa657', '#79c0ff', '#56d364', '#ff7b72', '#e3b341',
];

function getColor(userId) {
    return AVATAR_COLORS[Math.abs(userId) % AVATAR_COLORS.length];
}

function initials(name) {
    return (name || '?')
        .split(' ')
        .map(w => w[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

/**
 * B-20: Presence / Collaboration Indicators
 *
 * Sends a heartbeat POST every 55 s to register this user as active.
 * Polls GET every 90 s to fetch other active users.
 * Completely pauses (clears intervals) while AI is streaming, restarts after.
 * Renders colored avatar circles in the status bar.
 */
export default function PresenceIndicator({ workspaceId, openFile, pauseRef }) {
    const [users, setUsers]     = useState([]);
    const [tooltip, setTooltip] = useState(null);
    const openFileRef           = useRef(openFile);
    const beatIdRef             = useRef(null);
    const pollIdRef             = useRef(null);
    const beatAbortRef          = useRef(null);
    const pollAbortRef          = useRef(null);
    const workspaceIdRef        = useRef(workspaceId);

    useEffect(() => { openFileRef.current = openFile; }, [openFile]);
    useEffect(() => { workspaceIdRef.current = workspaceId; }, [workspaceId]);

    const beat = useCallback(() => {
        beatAbortRef.current?.abort();
        beatAbortRef.current = new AbortController();
        axios.post(`/api/workspaces/${workspaceIdRef.current}/presence/heartbeat`,
            { open_file: openFileRef.current ?? null },
            { signal: beatAbortRef.current.signal }
        ).catch(() => {});
    }, []);

    const poll = useCallback(() => {
        pollAbortRef.current?.abort();
        pollAbortRef.current = new AbortController();
        axios.get(`/api/workspaces/${workspaceIdRef.current}/presence`,
            { signal: pollAbortRef.current.signal }
        ).then(r => setUsers(r.data?.users ?? [])).catch(() => {});
    }, []);

    const startTimers = useCallback(() => {
        if (beatIdRef.current || pollIdRef.current) return; // already running
        beatIdRef.current = setInterval(beat, 55_000);
        pollIdRef.current = setInterval(poll, 90_000);
    }, [beat, poll]);

    const stopTimers = useCallback(() => {
        clearInterval(beatIdRef.current);
        clearInterval(pollIdRef.current);
        beatIdRef.current = null;
        pollIdRef.current = null;
        // Abort any in-flight requests immediately
        beatAbortRef.current?.abort();
        pollAbortRef.current?.abort();
    }, []);

    useEffect(() => {
        if (!workspaceId) return;

        // Listen to AI streaming events — stop entirely while AI streams,
        // restart when done. This prevents presence from blocking php artisan serve.
        const onAiStreaming = (e) => {
            if (e.detail?.streaming) {
                stopTimers();
            } else {
                // Small delay before restarting so PHP has time to finish chat-stream
                setTimeout(() => startTimers(), 3000);
            }
        };
        window.addEventListener('ce-ai-streaming', onAiStreaming);

        // 5s initial delay, then start
        const initTimer = setTimeout(() => {
            beat();
            poll();
            startTimers();
        }, 5000);

        return () => {
            window.removeEventListener('ce-ai-streaming', onAiStreaming);
            clearTimeout(initTimer);
            stopTimers();
        };
    }, [workspaceId, beat, poll, startTimers, stopTimers]);

    if (!users.length) return null;

    return (
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center', marginRight: '4px' }}>
            {users.map(u => {
                const sameFile = openFile && u.open_file === openFile;
                return (
                    <div
                        key={u.user_id}
                        style={{ position: 'relative' }}
                        onMouseEnter={() => setTooltip(u.user_id)}
                        onMouseLeave={() => setTooltip(null)}
                    >
                        {/* Avatar circle */}
                        <div style={{
                            width: 16, height: 16, borderRadius: '50%',
                            background: getColor(u.user_id),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '7px', fontWeight: 700, color: '#0d0f14',
                            border: sameFile ? '1.5px solid #e6edf3' : '1.5px solid transparent',
                            cursor: 'default',
                            boxSizing: 'border-box',
                        }}>
                            {initials(u.name)}
                        </div>

                        {/* Tooltip */}
                        {tooltip === u.user_id && (
                            <div style={{
                                position: 'absolute', bottom: 22, left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#1c2128', border: '1px solid #30363d',
                                borderRadius: 4, padding: '4px 8px',
                                fontSize: '10px', color: '#c9d1d9',
                                whiteSpace: 'nowrap', zIndex: 10000,
                                pointerEvents: 'none',
                            }}>
                                <div style={{ fontWeight: 600 }}>{u.name}</div>
                                {u.open_file && (
                                    <div style={{ color: '#8b949e', marginTop: 1 }}>
                                        {u.open_file.split('/').pop()}
                                        {sameFile && (
                                            <span style={{ color: '#ff6b35', marginLeft: 4 }}>
                                                (same file)
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
