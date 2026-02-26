import React from 'react';
import { Settings, Type, AlignJustify, Eye, Save, RotateCcw } from 'lucide-react';

export const DEFAULT_EDITOR_SETTINGS = {
    fontSize: 14,
    tabSize: 4,
    wordWrap: false,
    minimap: true,
    formatOnSave: true,
};

export default function SettingsPanel({ settings = {}, onChange }) {
    const s = { ...DEFAULT_EDITOR_SETTINGS, ...settings };

    function update(key, value) {
        onChange({ ...s, [key]: value });
    }

    function reset() {
        onChange({ ...DEFAULT_EDITOR_SETTINGS });
    }

    const S = {
        section: { padding: '10px 12px', borderBottom: '1px solid #1c2128' },
        sectionLabel: {
            fontSize: '10px', fontWeight: '600', letterSpacing: '0.06em', color: '#8b949e',
            textTransform: 'uppercase', marginBottom: '8px',
            display: 'flex', alignItems: 'center', gap: '5px',
        },
        row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' },
    };

    return (
        <div style={{ flex: 1, overflowY: 'auto', background: '#0d0f14', fontFamily: "'JetBrains Mono', monospace" }}>
            {/* Header */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #1c2128', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Settings size={12} style={{ color: '#ff6b35' }} />
                    <span style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', color: '#8b949e', textTransform: 'uppercase' }}>
                        Editor Settings
                    </span>
                </div>
                <button
                    onClick={reset}
                    title="Reset to defaults"
                    style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#8b949e'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#484f58'; }}
                >
                    <RotateCcw size={12} />
                </button>
            </div>

            {/* Font Size */}
            <div style={S.section}>
                <div style={S.sectionLabel}><Type size={11} /> Font Size</div>
                <div style={S.row}>
                    <input
                        type="range"
                        min="12" max="20" step="1"
                        value={s.fontSize}
                        onChange={e => update('fontSize', Number(e.target.value))}
                        style={{ flex: 1, accentColor: '#ff6b35' }}
                    />
                    <span style={{ fontSize: '12px', color: '#c9d1d9', width: '26px', textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {s.fontSize}px
                    </span>
                </div>
            </div>

            {/* Tab Size */}
            <div style={S.section}>
                <div style={S.sectionLabel}><AlignJustify size={11} /> Tab Size</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {[2, 4].map(n => (
                        <button
                            key={n}
                            onClick={() => update('tabSize', n)}
                            style={{
                                flex: 1, padding: '5px', fontSize: '11px', fontFamily: 'inherit',
                                background: s.tabSize === n ? 'rgba(255,107,53,0.12)' : '#0a0c0f',
                                border: `1px solid ${s.tabSize === n ? 'rgba(255,107,53,0.4)' : '#30363d'}`,
                                borderRadius: '4px',
                                color: s.tabSize === n ? '#ff6b35' : '#8b949e',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            {n} spaces
                        </button>
                    ))}
                </div>
            </div>

            {/* Toggles */}
            {[
                { key: 'wordWrap',     label: 'Word Wrap',      icon: <AlignJustify size={11} /> },
                { key: 'minimap',      label: 'Minimap',        icon: <Eye size={11} /> },
                { key: 'formatOnSave', label: 'Format on Save', icon: <Save size={11} /> },
            ].map(({ key, label, icon }) => (
                <div key={key} style={S.section}>
                    <div style={S.row}>
                        <span style={{ fontSize: '11px', color: '#c9d1d9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#8b949e' }}>{icon}</span>
                            {label}
                        </span>
                        <button
                            onClick={() => update(key, !s[key])}
                            title={s[key] ? `Disable ${label}` : `Enable ${label}`}
                            style={{
                                width: '36px', height: '18px', borderRadius: '9px', border: 'none',
                                cursor: 'pointer', position: 'relative', flexShrink: 0,
                                background: s[key] ? '#ff6b35' : '#30363d',
                                transition: 'background 0.2s',
                            }}
                        >
                            <span style={{
                                position: 'absolute', width: '12px', height: '12px', borderRadius: '50%',
                                background: '#fff', top: '3px',
                                left: s[key] ? '21px' : '3px', transition: 'left 0.2s',
                            }} />
                        </button>
                    </div>
                </div>
            ))}

            <div style={{ padding: '10px 12px', color: '#484f58', fontSize: '10px', lineHeight: 1.5 }}>
                Settings are saved locally in your browser.
            </div>
        </div>
    );
}
