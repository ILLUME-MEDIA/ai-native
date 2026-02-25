import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, Package, Settings, Trash2, Plus, X, Check, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';

const CATEGORIES = ['All', 'AI', 'Data', 'DevOps', 'Browser', 'Communication', 'Tools'];

const CATEGORY_COLORS = {
    AI:            { bg: 'rgba(168,85,247,0.12)',  color: '#c084fc', border: 'rgba(168,85,247,0.3)' },
    Data:          { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
    DevOps:        { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', border: 'rgba(16,185,129,0.3)' },
    Browser:       { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
    Communication: { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.3)' },
    Tools:         { bg: 'rgba(255,107,53,0.12)',  color: '#ff6b35', border: 'rgba(255,107,53,0.3)' },
};

function CategoryBadge({ category }) {
    const c = CATEGORY_COLORS[category] || { bg: 'rgba(139,148,158,0.12)', color: '#8b949e', border: 'rgba(139,148,158,0.3)' };
    return (
        <span style={{
            padding: '1px 6px', borderRadius: '9px', fontSize: '8px', fontWeight: '600',
            background: c.bg, color: c.color, border: `1px solid ${c.border}`, letterSpacing: '0.05em',
        }}>
            {category}
        </span>
    );
}

function ConfigModal({ server, install, onClose, onSave }) {
    const [config, setConfig] = useState(install?.config || {});
    const [saving, setSaving] = useState(false);
    const envSchema = server.env_schema || {};
    const argsSchema = server.args_schema || {};
    const allFields = [
        ...Object.entries(envSchema).map(([k, v]) => ({ key: k, ...v, kind: 'env' })),
        ...Object.entries(argsSchema).map(([k, v]) => ({ key: k, ...v, kind: 'arg' })),
    ];

    async function handleSave() {
        setSaving(true);
        try { await onSave(server.id, config); onClose(); }
        catch { toast.error('Failed to save configuration'); }
        finally { setSaving(false); }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={onClose}>
            <div style={{
                background: '#161b22', border: '1px solid #30363d', borderRadius: '10px',
                width: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                fontFamily: "'JetBrains Mono', monospace", boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#e6edf3' }}>{server.name}</div>
                        <div style={{ fontSize: '10px', color: '#8b949e', marginTop: '2px' }}>Configuration</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                        <X size={16} />
                    </button>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
                    {allFields.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#484f58', padding: '20px 0', fontSize: '11px' }}>
                            No configuration required for this server.
                        </div>
                    ) : allFields.map(({ key, label, description, required, type, kind }) => (
                        <div key={key} style={{ marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <label style={{ fontSize: '10px', color: '#c9d1d9', fontWeight: '500' }}>{label || key}</label>
                                {required && <span style={{ fontSize: '8px', color: '#ff6b35' }}>required</span>}
                                <span style={{ fontSize: '8px', color: '#484f58', marginLeft: 'auto' }}>{kind === 'env' ? 'ENV' : 'ARG'}</span>
                            </div>
                            {description && <div style={{ fontSize: '9px', color: '#8b949e', marginBottom: '4px' }}>{description}</div>}
                            <input
                                type={type === 'password' ? 'password' : 'text'}
                                value={config[key] || ''}
                                onChange={e => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder={key}
                                style={{
                                    width: '100%', background: '#0d0f14', border: '1px solid #30363d',
                                    borderRadius: '4px', color: '#c9d1d9', fontSize: '10px',
                                    fontFamily: 'inherit', padding: '6px 8px', outline: 'none', boxSizing: 'border-box',
                                }}
                            />
                        </div>
                    ))}
                    {Object.keys(config).length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <div style={{ fontSize: '9px', color: '#484f58', marginBottom: '6px', fontWeight: '600' }}>CONFIG PREVIEW</div>
                            <pre style={{
                                background: '#0d0f14', border: '1px solid #30363d', borderRadius: '4px',
                                padding: '8px', fontSize: '9px', color: '#8b949e', overflow: 'auto', maxHeight: '120px', margin: 0,
                            }}>
                                {JSON.stringify(config, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
                <div style={{ padding: '12px 16px', borderTop: '1px solid #30363d', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexShrink: 0 }}>
                    <button onClick={onClose} style={{ background: 'none', border: '1px solid #30363d', borderRadius: '4px', color: '#8b949e', cursor: 'pointer', padding: '6px 14px', fontSize: '10px', fontFamily: 'inherit' }}>
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} style={{
                        background: 'linear-gradient(135deg, #ff6b35, #ff9f1c)', border: 'none', borderRadius: '4px',
                        color: '#fff', cursor: saving ? 'wait' : 'pointer', padding: '6px 16px',
                        fontSize: '10px', fontFamily: 'inherit', fontWeight: '600', opacity: saving ? 0.7 : 1,
                    }}>
                        {saving ? 'Saving…' : 'Save Config'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ServerCard({ server, install, onInstall, onUninstall, onConfigure, actionLoading }) {
    const isInstalled = !!install;
    const isLoading = actionLoading === server.id;
    return (
        <div style={{
            background: '#161b22', border: '1px solid #1c2128', borderRadius: '8px',
            padding: '12px', marginBottom: '8px', transition: 'border-color 0.15s',
        }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#30363d'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1c2128'}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                    width: '36px', height: '36px', flexShrink: 0,
                    background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)',
                    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Package size={16} style={{ color: '#ff6b35' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#e6edf3' }}>{server.name}</span>
                        {isInstalled && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '8px', color: '#34d399', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '9px', padding: '1px 5px' }}>
                                <Check size={8} /> Installed
                            </span>
                        )}
                        <CategoryBadge category={server.category} />
                    </div>
                    <div style={{ fontSize: '9px', color: '#8b949e', marginTop: '1px' }}>by {server.author}</div>
                </div>
            </div>
            <div style={{ fontSize: '10px', color: '#8b949e', lineHeight: '1.5', marginBottom: '10px' }}>{server.description}</div>
            {server.npm_package && (
                <div style={{ marginBottom: '8px' }}>
                    <span style={{ background: '#0d0f14', border: '1px solid #1c2128', borderRadius: '3px', padding: '2px 6px', fontSize: '9px', color: '#8b949e', fontFamily: 'inherit' }}>
                        npx {server.npm_package}
                    </span>
                </div>
            )}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {!isInstalled ? (
                    <button onClick={() => onInstall(server.id)} disabled={isLoading} style={{
                        background: 'linear-gradient(135deg, #ff6b35, #ff9f1c)', border: 'none', borderRadius: '4px',
                        color: '#fff', cursor: isLoading ? 'wait' : 'pointer', padding: '5px 12px',
                        fontSize: '10px', fontFamily: 'inherit', fontWeight: '600',
                        display: 'flex', alignItems: 'center', gap: '4px', opacity: isLoading ? 0.7 : 1,
                    }}>
                        <Plus size={11} />{isLoading ? 'Installing…' : 'Install'}
                    </button>
                ) : (
                    <>
                        <button onClick={() => onConfigure(server)} style={{
                            background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)',
                            borderRadius: '4px', color: '#ff6b35', cursor: 'pointer', padding: '5px 10px',
                            fontSize: '10px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                            <Settings size={11} />Configure
                        </button>
                        <button onClick={() => onUninstall(server.id)} disabled={isLoading} style={{
                            background: 'none', border: '1px solid #30363d', borderRadius: '4px',
                            color: '#8b949e', cursor: isLoading ? 'wait' : 'pointer', padding: '5px 8px',
                            fontSize: '10px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
                            opacity: isLoading ? 0.7 : 1,
                        }}>
                            <Trash2 size={11} />{isLoading ? '…' : 'Remove'}
                        </button>
                    </>
                )}
                {server.docs_url && (
                    <a href={server.docs_url} target="_blank" rel="noreferrer"
                        style={{ marginLeft: 'auto', color: '#484f58', display: 'flex', alignItems: 'center' }} title="View docs">
                        <ExternalLink size={12} />
                    </a>
                )}
            </div>
        </div>
    );
}

export default function MCPStorePanel({ workspace }) {
    const [catalog, setCatalog] = useState([]);
    const [installs, setInstalls] = useState({});
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [configModal, setConfigModal] = useState(null);

    const loadData = useCallback(async () => {
        if (!workspace) return;
        setLoading(true);
        try {
            const [catalogRes, installedRes] = await Promise.all([
                axios.get(`/api/workspaces/${workspace.id}/mcp/catalog`),
                axios.get(`/api/workspaces/${workspace.id}/mcp/installed`),
            ]);
            setCatalog(catalogRes.data.servers || []);
            const map = {};
            (installedRes.data.installs || []).forEach(i => { map[i.mcp_server_id] = i; });
            setInstalls(map);
        } catch { toast.error('Failed to load MCP catalog'); }
        finally { setLoading(false); }
    }, [workspace?.id]);

    useEffect(() => { loadData(); }, [loadData]);

    async function handleInstall(serverId) {
        setActionLoading(serverId);
        try {
            const res = await axios.post(`/api/workspaces/${workspace.id}/mcp/install`, { mcp_server_id: serverId });
            setInstalls(prev => ({ ...prev, [serverId]: res.data.install }));
            toast.success('Server installed');
        } catch { toast.error('Failed to install server'); }
        finally { setActionLoading(null); }
    }

    async function handleUninstall(serverId) {
        setActionLoading(serverId);
        try {
            await axios.post(`/api/workspaces/${workspace.id}/mcp/uninstall`, { mcp_server_id: serverId });
            setInstalls(prev => { const n = { ...prev }; delete n[serverId]; return n; });
            toast.success('Server removed');
        } catch { toast.error('Failed to remove server'); }
        finally { setActionLoading(null); }
    }

    async function handleConfigure(serverId, config) {
        await axios.post(`/api/workspaces/${workspace.id}/mcp/configure`, { mcp_server_id: serverId, config });
        setInstalls(prev => ({ ...prev, [serverId]: { ...prev[serverId], config } }));
        toast.success('Configuration saved');
    }

    const filtered = catalog.filter(s => {
        const matchCat = category === 'All' || s.category === category;
        const q = search.toLowerCase();
        const matchSearch = !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
        return matchCat && matchSearch;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: "'JetBrains Mono', monospace" }}>
            {/* Header */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #1c2128', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '600', color: '#e6edf3', letterSpacing: '0.08em' }}>MCP STORE</span>
                    <span style={{ fontSize: '9px', color: '#8b949e' }}>{Object.keys(installs).length} installed</span>
                </div>
                <div style={{ position: 'relative' }}>
                    <Search size={11} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#484f58', pointerEvents: 'none' }} />
                    <input
                        type="text" placeholder="Search servers…" value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', background: '#161b22', border: '1px solid #30363d',
                            borderRadius: '4px', color: '#c9d1d9', fontSize: '10px', fontFamily: 'inherit',
                            padding: '5px 8px 5px 26px', outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                </div>
            </div>

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: '3px', padding: '8px 12px', borderBottom: '1px solid #1c2128', flexShrink: 0, overflowX: 'auto' }}>
                {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)} style={{
                        background: category === cat ? 'rgba(255,107,53,0.12)' : 'none',
                        border: `1px solid ${category === cat ? 'rgba(255,107,53,0.3)' : 'transparent'}`,
                        borderRadius: '9px', color: category === cat ? '#ff6b35' : '#8b949e',
                        cursor: 'pointer', padding: '3px 8px', fontSize: '9px', fontFamily: 'inherit',
                        fontWeight: category === cat ? '600' : '400', whiteSpace: 'nowrap', transition: 'all 0.15s',
                    }}>
                        {cat}
                    </button>
                ))}
            </div>

            {/* Server list */}
            <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#484f58', padding: '40px 0', fontSize: '11px' }}>Loading catalog…</div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#484f58', padding: '40px 0', fontSize: '11px' }}>
                        {catalog.length === 0 ? (
                            <>No servers in catalog.<br />Run: <code style={{ color: '#ff6b35' }}>php artisan db:seed --class=MCPCatalogSeeder</code></>
                        ) : 'No servers match your search.'}
                    </div>
                ) : filtered.map(server => (
                    <ServerCard
                        key={server.id}
                        server={server}
                        install={installs[server.id]}
                        actionLoading={actionLoading}
                        onInstall={handleInstall}
                        onUninstall={handleUninstall}
                        onConfigure={(srv) => setConfigModal({ server: srv, install: installs[srv.id] })}
                    />
                ))}
            </div>

            {configModal && (
                <ConfigModal
                    server={configModal.server}
                    install={configModal.install}
                    onClose={() => setConfigModal(null)}
                    onSave={handleConfigure}
                />
            )}
        </div>
    );
}
