import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
    {
        category: 'File',
        items: [
            { key: 'Ctrl+S',       action: 'Save File' },
            { key: 'Ctrl+P',       action: 'Quick Open File' },
            { key: 'Ctrl+Shift+P', action: 'Command Palette' },
        ],
    },
    {
        category: 'Navigation',
        items: [
            { key: 'Ctrl+G', action: 'Go to Line' },
            { key: 'Ctrl+F', action: 'Find in File' },
            { key: 'Ctrl+H', action: 'Find & Replace' },
        ],
    },
    {
        category: 'Editor',
        items: [
            { key: 'Shift+Alt+F',    action: 'Format Document' },
            { key: 'Ctrl+/',         action: 'Toggle Line Comment' },
            { key: 'Ctrl+D',         action: 'Select Next Match' },
            { key: 'Alt+↑ / ↓',     action: 'Move Line Up / Down' },
            { key: 'Shift+Alt+↑/↓', action: 'Copy Line Up / Down' },
            { key: 'Ctrl+[ / ]',     action: 'Outdent / Indent Line' },
            { key: 'Ctrl+Z',         action: 'Undo' },
            { key: 'Ctrl+Y',         action: 'Redo' },
        ],
    },
    {
        category: 'Selection',
        items: [
            { key: 'Ctrl+A',      action: 'Select All' },
            { key: 'Ctrl+L',      action: 'Select Current Line' },
            { key: 'Alt+Click',   action: 'Insert Cursor' },
            { key: 'Ctrl+Shift+L', action: 'Select All Occurrences' },
        ],
    },
    {
        category: 'View',
        items: [
            { key: 'Ctrl+K Z', action: 'Toggle Zen Mode' },
            { key: 'Ctrl+K S', action: 'Keyboard Shortcuts Panel' },
            { key: 'Esc',      action: 'Exit Zen Mode / Close Panel' },
        ],
    },
    {
        category: 'AI Copilot',
        items: [
            { key: 'Tab', action: 'Accept Ghost Text Completion' },
            { key: 'Esc', action: 'Dismiss Ghost Text' },
        ],
    },
    {
        category: 'AI Selection Actions',
        items: [
            { key: 'Select text', action: 'Reveal Explain / Fix / Tests / Docs / Refactor bar' },
        ],
    },
];

export default function KeyboardShortcutsPanel({ visible, onClose }) {
    useEffect(() => {
        if (!visible) return;
        function onKey(e) { if (e.key === 'Escape') onClose(); }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [visible, onClose]);

    if (!visible) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                background: 'rgba(0,0,0,0.72)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'JetBrains Mono', monospace",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '10px',
                    width: '560px',
                    maxHeight: '78vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 16px 64px rgba(0,0,0,0.8)',
                    overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderBottom: '1px solid #1c2128',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e6edf3', fontSize: '13px', fontWeight: '600' }}>
                        <Keyboard size={15} style={{ color: '#ff6b35' }} />
                        Keyboard Shortcuts
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                        title="Close (Esc)"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ overflowY: 'auto', padding: '12px 18px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {SHORTCUTS.map(({ category, items }) => (
                        <div key={category}>
                            <div style={{
                                fontSize: '9px',
                                fontWeight: '600',
                                letterSpacing: '0.1em',
                                color: '#ff6b35',
                                textTransform: 'uppercase',
                                marginBottom: '6px',
                            }}>
                                {category}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                {items.map(({ key, action }) => (
                                    <div
                                        key={key}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '5px 8px',
                                            borderRadius: '4px',
                                            cursor: 'default',
                                            gap: '12px',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,53,0.06)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <span style={{ fontSize: '11px', color: '#c9d1d9', flex: 1 }}>{action}</span>
                                        <kbd style={{
                                            background: '#0d0f14',
                                            border: '1px solid #30363d',
                                            borderRadius: '4px',
                                            padding: '2px 7px',
                                            fontSize: '10px',
                                            color: '#ff6b35',
                                            fontFamily: 'inherit',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                        }}>
                                            {key}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{ padding: '8px 18px', borderTop: '1px solid #1c2128', fontSize: '10px', color: '#484f58', textAlign: 'center', flexShrink: 0 }}>
                    Press{' '}
                    <kbd style={{ background: '#0d0f14', border: '1px solid #30363d', borderRadius: '3px', padding: '1px 5px', color: '#8b949e', fontFamily: 'inherit', fontSize: '10px' }}>
                        Esc
                    </kbd>
                    {' '}or click outside to close
                </div>
            </div>
        </div>
    );
}
