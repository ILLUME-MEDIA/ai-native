import React, { useState, useEffect, useRef } from 'react';
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
 * Sends a heartbeat POST every 12 s to register this user as active.
 * Polls GET every 15 s to fetch other active users.
 * Renders colored avatar circles in the status bar.
 * Highlights the avatar border when the other user has the same file open.
 */
export default function PresenceIndicator({ workspaceId, openFile }) {
    const [users, setUsers]     = useState([]);
    const [tooltip, setTooltip] = useState(null);   // user_id of hovered avatar
    const openFileRef           = useRef(openFile);

    // keep ref current so heartbeat closure always has the latest path
    useEffect(() => { openFileRef.current = openFile; }, [openFile]);

    useEffect(() => {
        if (!workspaceId) return;

        const beat = () =>
            axios.post(`/api/workspaces/${workspaceId}/presence/heartbeat`, {
                open_file: openFileRef.current ?? null,
            }).catch(() => {});

        const poll = () =>
            axios.get(`/api/workspaces/${workspaceId}/presence`)
                .then(r => setUsers(r.data?.users ?? []))
                .catch(() => {});

        beat();
        poll();

        const beatId = setInterval(beat, 12_000);
        const pollId = setInterval(poll, 15_000);

        return () => {
            clearInterval(beatId);
            clearInterval(pollId);
        };
    }, [workspaceId]);

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
