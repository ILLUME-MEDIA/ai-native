import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Rocket, RefreshCw, Square, Plus, Trash2, ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, Loader, GitBranch, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const STATUS_ICON = {
    idle:      <Clock size={12} color="#8b949e" />,
    queued:    <Clock size={12} color="#ff9f1c" />,
    building:  <Loader size={12} color="#ff9f1c" style={{ animation: 'spin 1s linear infinite' }} />,
    deployed:  <CheckCircle size={12} color="#3fb950" />,
    failed:    <XCircle size={12} color="#f85149" />,
    stopped:   <Square size={12} color="#8b949e" />,
};

const STATUS_COLOR = {
    idle: '#8b949e', queued: '#ff9f1c', building: '#ff9f1c',
    deployed: '#3fb950', failed: '#f85149', stopped: '#8b949e',
};

export default function DeployPanel({ workspace }) {
    const [projects, setProjects]     = useState([]);
    const [loading, setLoading]       = useState(false);
    const [expanded, setExpanded]     = useState({});   // project id → bool (show logs)
    const [logs, setLogs]             = useState({});   // project id → log[]
    const [logOutput, setLogOutput]   = useState(null); // { projectId, logId, output }
    const [deploying, setDeploying]   = useState({});   // project id → bool
    const [showNew, setShowNew]       = useState(false);
    const [newForm, setNewForm]       = useState({ name: '', repo_url: '', branch: 'main', framework: 'laravel' });
    const pollRef = useRef(null);

    const t = {
        bg: '#0d0f14', bg2: '#161b22', border: '#30363d',
        text: '#c9d1d9', text3: '#8b949e', accent: '#ff6b35',
    };

    // ── Load projects ─────────────────────────────────────────────────────────
    const loadProjects = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/deploy/projects');
            setProjects(Array.isArray(data) ? data : data.projects ?? []);
        } catch { /* not set up yet */ } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        loadProjects();
        // Auto-refresh every 8s if any project is building
        pollRef.current = setInterval(() => {
            setProjects(prev => {
                const anyBuilding = prev.some(p => p.status === 'building' || p.status === 'queued');
                if (anyBuilding) loadProjects();
                return prev;
            });
        }, 8000);
        return () => clearInterval(pollRef.current);
    }, [loadProjects]);

    // ── Load logs for a project ───────────────────────────────────────────────
    const loadLogs = useCallback(async (projectId) => {
        try {
            const { data } = await axios.get(`/api/admin/deploy/projects/${projectId}/logs`);
            setLogs(prev => ({ ...prev, [projectId]: data.logs ?? data ?? [] }));
        } catch { /* ignore */ }
    }, []);

    const toggleProject = useCallback((id) => {
        setExpanded(prev => {
            const next = { ...prev, [id]: !prev[id] };
            if (next[id]) loadLogs(id);
            return next;
        });
    }, [loadLogs]);

    // ── Deploy ────────────────────────────────────────────────────────────────
    const deploy = useCallback(async (id) => {
        setDeploying(prev => ({ ...prev, [id]: true }));
        try {
            await axios.post(`/api/admin/deploy/projects/${id}/deploy`);
            toast.success('Deploy started');
            loadProjects();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Deploy failed to start');
        } finally {
            setDeploying(prev => ({ ...prev, [id]: false }));
        }
    }, [loadProjects]);

    const stop = useCallback(async (id) => {
        try {
            await axios.post(`/api/admin/deploy/projects/${id}/stop`);
            toast('Deploy stopped');
            loadProjects();
        } catch { toast.error('Could not stop deploy'); }
    }, [loadProjects]);

    // ── Delete project ────────────────────────────────────────────────────────
    const deleteProject = useCallback(async (id) => {
        try {
            await axios.delete(`/api/admin/deploy/projects/${id}`);
            loadProjects();
        } catch { toast.error('Could not delete project'); }
    }, [loadProjects]);

    // ── Create project ────────────────────────────────────────────────────────
    const createProject = useCallback(async () => {
        if (!newForm.name || !newForm.repo_url) { toast.error('Name and repo URL required'); return; }
        try {
            await axios.post('/api/admin/deploy/projects', newForm);
            setShowNew(false);
            setNewForm({ name: '', repo_url: '', branch: 'main', framework: 'laravel' });
            loadProjects();
            toast.success('Project created');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create project');
        }
    }, [newForm, loadProjects]);

    // ── Load log output ───────────────────────────────────────────────────────
    const viewLogOutput = useCallback(async (projectId, logId) => {
        try {
            const { data } = await axios.get(`/api/admin/deploy/projects/${projectId}/logs/${logId}/output`);
            setLogOutput({ projectId, logId, output: data.output ?? data ?? '' });
        } catch { toast.error('Could not load log output'); }
    }, []);

    // ── Styles ────────────────────────────────────────────────────────────────
    const inputStyle = {
        background: t.bg2, border: `1px solid ${t.border}`, borderRadius: '4px',
        color: t.text, padding: '4px 8px', fontSize: '10px', fontFamily: 'inherit',
        outline: 'none', width: '100%', boxSizing: 'border-box',
    };

    const btnStyle = (color = t.accent) => ({
        background: `rgba(${color === '#f85149' ? '248,81,73' : color === '#3fb950' ? '63,185,80' : '255,107,53'},0.12)`,
        border: `1px solid ${color}44`,
        borderRadius: '4px', color, cursor: 'pointer',
        padding: '3px 8px', fontSize: '9px', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: '4px',
    });

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: t.bg, fontFamily: "'JetBrains Mono', monospace", color: t.text, fontSize: '11px' }}>

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 10px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
                <Rocket size={13} color={t.accent} />
                <span style={{ fontSize: '10px', color: t.text3, letterSpacing: '0.06em' }}>DEPLOY MANAGER</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <button onClick={() => setShowNew(v => !v)} style={btnStyle()} title="New project">
                        <Plus size={10} /> New
                    </button>
                    <button onClick={loadProjects} style={{ background: 'none', border: 'none', color: t.text3, cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Refresh">
                        <RefreshCw size={11} />
                    </button>
                </div>
            </div>

            {/* New project form */}
            {showNew && (
                <div style={{ padding: '10px', borderBottom: `1px solid ${t.border}`, background: t.bg2, display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '9px', color: t.text3, letterSpacing: '0.06em' }}>NEW PROJECT</span>
                    <input style={inputStyle} placeholder="Project name" value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
                    <input style={inputStyle} placeholder="Repo URL (https://github.com/...)" value={newForm.repo_url} onChange={e => setNewForm(f => ({ ...f, repo_url: e.target.value }))} />
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <input style={{ ...inputStyle, width: '50%' }} placeholder="Branch (main)" value={newForm.branch} onChange={e => setNewForm(f => ({ ...f, branch: e.target.value }))} />
                        <select style={{ ...inputStyle, width: '50%' }} value={newForm.framework} onChange={e => setNewForm(f => ({ ...f, framework: e.target.value }))}>
                            <option value="laravel">Laravel</option>
                            <option value="react">React</option>
                            <option value="vue">Vue</option>
                            <option value="node">Node</option>
                            <option value="static">Static</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={createProject} style={btnStyle()}>Create</button>
                        <button onClick={() => setShowNew(false)} style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: '4px', color: t.text3, cursor: 'pointer', padding: '3px 8px', fontSize: '9px', fontFamily: 'inherit' }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Log output modal */}
            {logOutput && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', padding: '16px' }}>
                    <div style={{ flex: 1, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: '6px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: `1px solid ${t.border}` }}>
                            <span style={{ fontSize: '10px', color: t.text3 }}>Deploy Log Output</span>
                            <button onClick={() => setLogOutput(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: t.text3, cursor: 'pointer', fontSize: '14px' }}>✕</button>
                        </div>
                        <pre style={{ flex: 1, overflow: 'auto', margin: 0, padding: '10px 12px', fontSize: '10px', color: t.text, lineHeight: 1.5 }}>
                            {logOutput.output || '(empty)'}
                        </pre>
                    </div>
                </div>
            )}

            {/* Projects list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading && <div style={{ padding: '12px', color: t.text3, fontSize: '10px' }}>Loading projects…</div>}
                {!loading && projects.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: t.text3 }}>
                        <Rocket size={28} color="#30363d" />
                        <span>No deploy projects yet</span>
                        <button onClick={() => setShowNew(true)} style={btnStyle()}><Plus size={10} /> Create first project</button>
                    </div>
                )}

                {projects.map(proj => (
                    <div key={proj.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                        {/* Project header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', cursor: 'pointer' }}
                            onClick={() => toggleProject(proj.id)}>
                            {expanded[proj.id] ? <ChevronDown size={11} color={t.text3} /> : <ChevronRight size={11} color={t.text3} />}
                            {STATUS_ICON[proj.status] ?? STATUS_ICON.idle}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.name}</div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                                    <span style={{ fontSize: '9px', color: t.text3 }}>{proj.framework}</span>
                                    {proj.branch && <span style={{ fontSize: '9px', color: t.text3, display: 'flex', alignItems: 'center', gap: '2px' }}><GitBranch size={8} />{proj.branch}</span>}
                                    <span style={{ fontSize: '9px', color: STATUS_COLOR[proj.status] ?? t.text3, fontWeight: 600 }}>{proj.status?.toUpperCase()}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                                {(proj.status === 'building' || proj.status === 'queued') ? (
                                    <button onClick={() => stop(proj.id)} style={btnStyle('#f85149')} title="Stop"><Square size={9} /> Stop</button>
                                ) : (
                                    <button onClick={() => deploy(proj.id)} disabled={!!deploying[proj.id]} style={btnStyle()} title="Deploy">
                                        {deploying[proj.id] ? <Loader size={9} style={{ animation: 'spin 1s linear infinite' }} /> : <Rocket size={9} />}
                                        {deploying[proj.id] ? 'Starting…' : 'Deploy'}
                                    </button>
                                )}
                                <button onClick={() => deleteProject(proj.id)} style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }} title="Delete">
                                    <Trash2 size={10} />
                                </button>
                            </div>
                        </div>

                        {/* Deploy logs */}
                        {expanded[proj.id] && (
                            <div style={{ padding: '0 10px 8px 28px' }}>
                                {!logs[proj.id] && <div style={{ color: t.text3, fontSize: '9px' }}>Loading logs…</div>}
                                {logs[proj.id]?.length === 0 && <div style={{ color: t.text3, fontSize: '9px' }}>No deploy history</div>}
                                {(logs[proj.id] ?? []).slice(0, 10).map(log => (
                                    <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0', borderBottom: `1px solid rgba(48,54,61,0.3)` }}>
                                        {STATUS_ICON[log.status] ?? STATUS_ICON.idle}
                                        <span style={{ flex: 1, fontSize: '9px', color: STATUS_COLOR[log.status] ?? t.text3 }}>{log.status?.toUpperCase()}</span>
                                        <span style={{ fontSize: '9px', color: t.text3 }}>{log.created_at ? new Date(log.created_at).toLocaleString() : ''}</span>
                                        <button onClick={() => viewLogOutput(proj.id, log.id)}
                                            style={{ background: 'none', border: 'none', color: t.text3, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '1px' }} title="View output">
                                            <ExternalLink size={9} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
