import React, { useState } from 'react';
import { Puzzle, Terminal, Layers, AlignLeft, Sidebar, Command, BarChart2, Trash2, RefreshCw } from 'lucide-react';
import { usePluginRegistry } from './usePluginRegistry';

const SLOT_LABEL = { left: 'Sidebar', center: 'Center View', bottom: 'Bottom Dock', right: 'Right Panel' };
const SLOT_ICON  = { left: <Sidebar size={10} />, center: <Layers size={10} />, bottom: <Terminal size={10} />, right: <AlignLeft size={10} /> };

export default function PluginManagerPanel() {
    const { snapshot, registry } = usePluginRegistry();
    const [tab, setTab] = useState('panels'); // 'panels' | 'commands' | 'status'

    const t = {
        bg: '#0d0f14', bg2: '#161b22', border: '#30363d',
        text: '#c9d1d9', text3: '#8b949e', accent: '#ff6b35',
    };

    const tabBtn = (id) => ({
        background: 'none', border: 'none', cursor: 'pointer',
        color: tab === id ? t.accent : t.text3,
        borderBottom: tab === id ? `2px solid ${t.accent}` : '2px solid transparent',
        padding: '5px 12px', fontSize: '9px', fontWeight: '600',
        letterSpacing: '0.08em', fontFamily: 'inherit',
    });

    const badge = (label, color = '#ff9f1c') => (
        <span style={{ background: `${color}22`, border: `1px solid ${color}44`, borderRadius: '3px', color, fontSize: '8px', padding: '1px 5px' }}>{label}</span>
    );

    const removeBtn = (action) => (
        <button onClick={action} style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }} title="Unregister">
            <Trash2 size={9} />
        </button>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: t.bg, fontFamily: "'JetBrains Mono', monospace", color: t.text, fontSize: '11px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
                <Puzzle size={13} color={t.accent} />
                <span style={{ fontSize: '10px', color: t.text3, letterSpacing: '0.06em' }}>PLUGIN MANAGER</span>
                <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#484f58' }}>
                    {snapshot.panels.length}p · {snapshot.commands.length}c · {snapshot.statusItems.length}s
                </span>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
                <button style={tabBtn('panels')}  onClick={() => setTab('panels')}>PANELS ({snapshot.panels.length})</button>
                <button style={tabBtn('commands')} onClick={() => setTab('commands')}>COMMANDS ({snapshot.commands.length})</button>
                <button style={tabBtn('status')}  onClick={() => setTab('status')}>STATUS ({snapshot.statusItems.length})</button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>

                {/* Panels */}
                {tab === 'panels' && (
                    <>
                        {snapshot.panels.length === 0 && (
                            <EmptyState icon={<Layers size={24} color="#30363d" />} text="No panels registered" />
                        )}
                        {snapshot.panels.map(p => (
                            <Row key={p.id}
                                icon={SLOT_ICON[p.slot] ?? <Layers size={10} />}
                                title={p.label}
                                sub={p.id}
                                badge={badge(SLOT_LABEL[p.slot] ?? p.slot)}
                                action={removeBtn(() => registry.unregisterPanel(p.id))}
                                t={t}
                            />
                        ))}
                    </>
                )}

                {/* Commands */}
                {tab === 'commands' && (
                    <>
                        {snapshot.commands.length === 0 && (
                            <EmptyState icon={<Command size={24} color="#30363d" />} text="No commands registered" />
                        )}
                        {snapshot.commands.map(c => (
                            <Row key={c.id}
                                icon={<Command size={10} />}
                                title={c.label}
                                sub={c.id}
                                badge={c.keybinding ? badge(c.keybinding, '#58a6ff') : null}
                                action={removeBtn(() => registry.unregisterCommand(c.id))}
                                t={t}
                            />
                        ))}
                    </>
                )}

                {/* Status items */}
                {tab === 'status' && (
                    <>
                        {snapshot.statusItems.length === 0 && (
                            <EmptyState icon={<BarChart2 size={24} color="#30363d" />} text="No status bar items registered" />
                        )}
                        {snapshot.statusItems.map(s => (
                            <Row key={s.id}
                                icon={<BarChart2 size={10} />}
                                title={s.label}
                                sub={s.id}
                                badge={badge(s.align ?? 'right', '#8b949e')}
                                action={removeBtn(() => registry.unregisterStatusItem(s.id))}
                                t={t}
                            />
                        ))}
                    </>
                )}
            </div>

            {/* Footer: how to register */}
            <div style={{ padding: '8px 10px', borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
                <div style={{ fontSize: '9px', color: '#484f58', lineHeight: 1.6 }}>
                    Plugins register via <span style={{ color: t.text3 }}>window.XDPluginRegistry</span> or<br />
                    <span style={{ color: t.text3 }}>import registry from '@/…/PluginRegistry'</span>
                </div>
            </div>
        </div>
    );
}

function Row({ icon, title, sub, badge, action, t }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderBottom: `1px solid rgba(48,54,61,0.4)` }}>
            <span style={{ color: t.text3 }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
                <div style={{ fontSize: '9px', color: '#484f58', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
            </div>
            {badge}
            {action}
        </div>
    );
}

function EmptyState({ icon, text }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '120px', gap: '8px', color: '#484f58', fontSize: '10px' }}>
            {icon}
            <span>{text}</span>
        </div>
    );
}
