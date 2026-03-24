import { useState, useEffect, useRef, useCallback } from 'react';

const API = '/api/admin/deploy';

const STATUS_COLOR = { idle: 'secondary', deploying: 'warning', success: 'success', failed: 'danger', cancelled: 'secondary', running: 'primary', pending: 'info' };
const STATUS_TEXT  = { warning: 'dark' }; // bg-warning needs dark text
const statusBadgeCls = (s) => {
  const bg = STATUS_COLOR[s] || 'secondary';
  const txt = STATUS_TEXT[bg] ? ` text-${STATUS_TEXT[bg]}` : ' text-white';
  return `badge bg-${bg}${txt} text-nowrap`;
};
// Row tint for log list
const LOG_ROW_BG = { success: '#f0fff4', failed: '#fff5f5', running: '#eff6ff', pending: '#eff6ff', cancelled: '' };

const FRAMEWORKS = [
  { value: '',       label: '— Select framework —' },
  { value: 'html',   label: 'Static HTML (no build)' },
  { value: 'vite',   label: 'Vite  →  React / Vue / Svelte' },
  { value: 'next',   label: 'Next.js' },
  { value: 'nuxt',   label: 'Nuxt.js' },
  { value: 'astro',  label: 'Astro' },
  { value: 'gatsby', label: 'Gatsby' },
  { value: 'node',   label: 'Node.js (custom)' },
  { value: 'static', label: 'No build — upload root' },
];

const BUILD_DEFAULTS = {
  next:   { build_command: 'npm run build', build_output_dir: 'out' },
  nuxt:   { build_command: 'npm run generate', build_output_dir: '.output/public' },
  vite:   { build_command: 'npm run build', build_output_dir: 'dist' },
  astro:  { build_command: 'npm run build', build_output_dir: 'dist' },
  gatsby: { build_command: 'npm run build', build_output_dir: 'public' },
  node:   { build_command: 'npm run build', build_output_dir: 'dist' },
  html:   { build_command: '', build_output_dir: '' },
  static: { build_command: '', build_output_dir: '' },
};

const BLANK = {
  name: '', repo_url: '', github_token: '', branch: 'main',
  framework: '', build_command: '', build_output_dir: '', node_path: '',
  ftp_host: '', ftp_username: '', ftp_password: '',
  ftp_path: '/public_html/', ftp_port: 21, ftp_ssl: false,
  auto_deploy: false, deploy_mode: 'webhook', poll_interval: 5,
};

const ago = (iso) => {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
};

const apiFetch = (url, opts = {}) =>
  fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    ...opts,
  });

// ── Inline SVG icons (no font dependency) ────────────────────────────────────
const SvgEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const SvgEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const SvgKey = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="M21 2l-9.6 9.6" />
    <path d="M15.5 7.5l3 3L22 7l-3-3" />
  </svg>
);
const SvgTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const SvgRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const SvgChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const SvgChevronUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);
const SvgCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const SvgCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const SvgUpload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);
const SvgArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const SvgArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

// ── Password input with show/hide + optional reveal-from-server ──────────────
function RevealInput({ value, onChange, placeholder, revealed, onReveal, isLoading, forceShow }) {
  const [show, setShow] = useState(false);
  useEffect(() => { if (forceShow) setShow(true); }, [forceShow]);
  return (
    <div>
      <div className="input-group">
        <input
          type={show ? 'text' : 'password'}
          className="form-control font-monospace"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          title={show ? 'Hide value' : 'Show value'}
          onClick={() => setShow(s => !s)}
        >
          {show ? <SvgEyeOff /> : <SvgEye />}
        </button>
      </div>

      {/* Reveal from server (edit mode only) */}
      {revealed && (
        <button type="button"
          className="btn btn-link p-0 mt-1 small text-decoration-none"
          style={{ fontSize: '0.78rem' }}
          onClick={onReveal} disabled={isLoading}>
          {isLoading
            ? <><span className="spinner-border spinner-border-sm me-1" style={{ width: 10, height: 10 }} />Loading...</>
            : <><SvgKey /><span className="ms-1">Reveal stored value</span></>}
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function DeployManager() {
  const [projects,    setProjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [view,        setView]        = useState('list'); // 'list' | 'detail'
  const [selected,    setSelected]    = useState(null);
  const [showForm,    setShowForm]    = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [form,        setForm]        = useState(BLANK);
  const [saving,      setSaving]      = useState(false);
  const [detecting,   setDetecting]   = useState(false);
  const [detectInfo,  setDetectInfo]  = useState(null);
  const [formErr,       setFormErr]       = useState('');
  const [formTab,       setFormTab]       = useState('repo');
  const [revealing,     setRevealing]     = useState(false);
  const [secretsShown,  setSecretsShown]  = useState(false);
  const [nodeDetecting, setNodeDetecting] = useState(false);
  const [nodeInfo,      setNodeInfo]      = useState(null); // { node_path, node_version, npm_version }
  const [logs,        setLogs]        = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError,   setLogsError]   = useState('');
  const [openLog,     setOpenLog]     = useState(null);
  const [deploying,   setDeploying]   = useState({});
  const [copied,      setCopied]      = useState(null);
  const [fetchError,  setFetchError]  = useState('');
  // liveLog: { id, projectId, status, output, duration_seconds } — tracks the running log output
  const [liveLog,     setLiveLog]     = useState(null);
  const logEndRef  = useRef(null);
  const pollRef    = useRef(null);
  const liveRef    = useRef(null);   // interval for live log output polling

  // ── data ──────────────────────────────────────────────────────────────────

  const fetchProjects = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const r = await apiFetch(`${API}/projects`);
      let data;
      try { data = await r.json(); } catch { data = null; }
      if (!r.ok) {
        const msg = (data && data.message) ? data.message : `Server error ${r.status}`;
        setFetchError(msg);
        setProjects([]);
        return [];
      }
      const list = Array.isArray(data) ? data : [];
      setFetchError('');
      setProjects(list);
      return list;
    } catch (err) {
      setFetchError(err.message || 'Failed to load projects');
      setProjects([]);
      return [];
    } finally { if (!quiet) setLoading(false); }
  }, []);

  const fetchLogs = useCallback(async (projectId, quiet = false) => {
    if (!quiet) setLogsLoading(true);
    try {
      const r = await apiFetch(`${API}/projects/${projectId}/logs`);
      let data;
      try { data = await r.json(); } catch { data = null; }
      if (!r.ok) {
        const msg = (data && (data.message || data.error)) ? (data.message || data.error) : `Failed to load logs (HTTP ${r.status})`;
        setLogsError(msg);
        setLogs([]);
        setOpenLog(null);
        return;
      }
      const list = (Array.isArray(data) ? data : [])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // newest first
      setLogsError('');
      setLogs(list);
      // Auto-open the latest log; keep user's selection only if that log still exists
      setOpenLog(prev => {
        if (prev && list.some(l => l.id === prev)) return prev;
        const active = list.find(l => l.status === 'running' || l.status === 'pending');
        return (active ?? list[0])?.id ?? null;
      });
    } catch (err) {
      setLogsError(err.message || 'Failed to load logs');
      setLogs([]);
      setOpenLog(null);
    } finally { if (!quiet) setLogsLoading(false); }
  }, []);

  // ── Live log output polling (targeted, faster than fetching all logs) ────────
  const startLivePolling = useCallback((projectId, logId) => {
    clearInterval(liveRef.current);
    setLiveLog({ id: logId, projectId, status: 'pending', output: '', duration_seconds: null });
    setOpenLog(logId);

    liveRef.current = setInterval(async () => {
      try {
        const r = await apiFetch(`${API}/projects/${projectId}/logs/${logId}/output`);
        if (!r.ok) return;
        const d = await r.json();
        setLiveLog({ id: logId, projectId, ...d });
        // Mirror into the logs array so the terminal renders correctly
        setLogs(prev => prev.map(l => l.id === logId ? { ...l, ...d } : l));
        // Stop live polling when the deploy finishes
        if (d.status !== 'running' && d.status !== 'pending') {
          clearInterval(liveRef.current);
          // Full refresh so project status + log list are up to date
          fetchProjects(true);
          fetchLogs(projectId, true);
          setLiveLog(null);
        }
      } catch { /* ignore transient network errors */ }
    }, 1500);
  }, [fetchProjects]); // eslint-disable-line

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // Slow background poll: refresh project list + logs while a deploy is active
  useEffect(() => {
    clearInterval(pollRef.current);
    const busy = projects.some(p => p.status === 'deploying') || Object.values(deploying).some(Boolean);
    if (busy) {
      pollRef.current = setInterval(async () => {
        await fetchProjects(true);
        if (selected && !liveLog) fetchLogs(selected, true); // only if no live polling
      }, 4000);
    }
    return () => clearInterval(pollRef.current);
  }, [projects, deploying, selected, liveLog, fetchProjects, fetchLogs]);

  // Clean up live polling on unmount
  useEffect(() => () => clearInterval(liveRef.current), []);

  useEffect(() => {
    if (selected) { setLogs([]); setOpenLog(null); setLiveLog(null); fetchLogs(selected); }
  }, [selected]); // eslint-disable-line

  // Auto-start live polling if we land on a detail view that already has a running log
  // (covers poll-triggered deploys where triggerDeploy wasn't called by the user)
  useEffect(() => {
    if (!selected || liveLog) return;
    const active = logs.find(l => l.status === 'running' || l.status === 'pending');
    if (active) startLivePolling(selected, active.id);
  }, [selected, logs]); // eslint-disable-line

  // Auto-scroll terminal when output changes
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs, openLog, liveLog]);

  // ── reveal stored secrets ─────────────────────────────────────────────────

  const revealSecrets = async () => {
    if (!editId) return;
    setRevealing(true);
    try {
      const r = await apiFetch(`${API}/projects/${editId}/reveal`, { method: 'POST' });
      const d = await r.json();
      setForm(f => ({
        ...f,
        github_token: d.github_token ?? f.github_token,
        ftp_host:     d.ftp_host     ?? f.ftp_host,
        ftp_username: d.ftp_username ?? f.ftp_username,
        ftp_password: d.ftp_password ?? f.ftp_password,
      }));
      setSecretsShown(true);
    } finally { setRevealing(false); }
  };

  // ── project actions ───────────────────────────────────────────────────────

  const openAdd = () => {
    setForm(BLANK); setEditId(null); setDetectInfo(null); setFormErr(''); setFormTab('repo');
    setSecretsShown(false); setShowForm(true);
  };

  const openEdit = (p, e) => {
    e?.stopPropagation();
    setForm({
      ...BLANK,
      name:             p.name             || '',
      repo_url:         p.repo_url         || '',
      branch:           p.branch           || 'main',
      framework:        p.framework        || '',
      build_command:    p.build_command    || '',
      build_output_dir: p.build_output_dir || '',
      node_path:        p.node_path        || '',
      ftp_path:         p.ftp_path         || '/public_html/',
      ftp_port:         p.ftp_port         || 21,
      ftp_ssl:          !!p.ftp_ssl,
      auto_deploy:      !!p.auto_deploy,
      deploy_mode:      p.deploy_mode      || 'webhook',
      poll_interval:    p.poll_interval    || 5,
      // Secrets start blank — user clicks "Reveal" to load them
      github_token: '', ftp_host: '', ftp_username: '', ftp_password: '',
    });
    setDetectInfo(null); setEditId(p.id); setFormErr(''); setFormTab('repo');
    setSecretsShown(false); setShowForm(true);
  };

  const deleteProject = async (p, e) => {
    e?.stopPropagation();
    if (!confirm(`Delete "${p.name}"? All deploy logs will be removed.`)) return;
    const r = await apiFetch(`${API}/projects/${p.id}`, { method: 'DELETE' });
    if (!r.ok) { alert('Delete failed. Please try again.'); return; }
    // Optimistically remove from list immediately
    setProjects(prev => prev.filter(x => x.id !== p.id));
    if (selected === p.id) { setSelected(null); setView('list'); }
  };

  const toggleAutoDeploy = async (p, e) => {
    e?.stopPropagation();
    const r = await apiFetch(`${API}/projects/${p.id}`, {
      method: 'PUT', body: JSON.stringify({ auto_deploy: !p.auto_deploy }),
    });
    if (r.ok) {
      const d = await r.json();
      setProjects(prev => prev.map(x => x.id === p.id ? d : x));
    }
    // No fetchProjects(true) — calling it immediately after PUT can overwrite the
    // correct optimistic state with stale cached data returned by the server.
  };

  const triggerDeploy = async (p, e) => {
    e?.stopPropagation();
    setDeploying(d => ({ ...d, [p.id]: true }));
    try {
      const r = await apiFetch(`${API}/projects/${p.id}/deploy`, { method: 'POST' });
      let d = {};
      try { d = await r.json(); } catch { /* non-JSON response */ }

      if (r.ok && d.log_id) {
        // Navigate to detail and start live polling immediately
        setSelected(p.id);
        setView('detail');
        // Fetch the log list first, then start live polling on the new log
        fetchLogs(p.id, true).then(() => {
          startLivePolling(p.id, d.log_id);
        });
        fetchProjects(true);
      } else {
        const msg = d.message || `Deploy failed (HTTP ${r.status})`;
        alert(msg);
        setDeploying(prev => ({ ...prev, [p.id]: false }));
      }
    } catch (err) {
      alert('Deploy error: ' + err.message);
      setDeploying(prev => ({ ...prev, [p.id]: false }));
    }
    // Clear the "deploying" button indicator after a few seconds
    // (actual status is tracked via liveLog / project.status)
    setTimeout(() => setDeploying(prev => ({ ...prev, [p.id]: false })), 6000);
  };

  const stopDeploy = async (p, e) => {
    e?.stopPropagation();
    clearInterval(liveRef.current);
    setLiveLog(null);
    // Clear deploying flag immediately so the Stop button disappears right away
    setDeploying(prev => ({ ...prev, [p.id]: false }));
    await apiFetch(`${API}/projects/${p.id}/stop`, { method: 'POST' });
    // Refresh immediately — stop controller already sets status=idle in DB
    fetchProjects(true);
    if (selected === p.id) fetchLogs(p.id, true);
  };

  const copyWebhook = async (p, e) => {
    e?.stopPropagation();
    await navigator.clipboard.writeText(p.webhook_url);
    setCopied(p.id); setTimeout(() => setCopied(null), 2000);
  };

  // ── form helpers ──────────────────────────────────────────────────────────

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const detect = async () => {
    if (!form.repo_url) return;
    setDetecting(true); setDetectInfo(null); setFormErr('');
    try {
      const r = await apiFetch(`${API}/detect`, {
        method: 'POST',
        body: JSON.stringify({ repo_url: form.repo_url, github_token: form.github_token, branch: form.branch }),
      });
      const d = await r.json();
      if (!r.ok) { setFormErr(d.error || 'Detection failed'); return; }
      setDetectInfo(d);
      setForm(f => ({
        ...f,
        framework:        d.framework || '',
        build_command:    d.build_command    ?? '',
        build_output_dir: d.build_output_dir ?? '',
      }));
      setFormTab('build');
    } catch (err) { setFormErr(err.message); }
    finally { setDetecting(false); }
  };

  const applyFrameworkDefaults = (fw) => {
    const def = BUILD_DEFAULTS[fw] || { build_command: 'npm run build', build_output_dir: 'dist' };
    setForm(f => ({ ...f, framework: fw, ...def }));
  };

  const detectNode = async () => {
    setNodeDetecting(true); setNodeInfo(null);
    try {
      const r = await apiFetch(`${API}/detect-node`);
      const d = await r.json();
      setNodeInfo(d);
      if (d.found && d.node_path) {
        setForm(f => ({ ...f, node_path: d.node_path }));
      }
    } finally { setNodeDetecting(false); }
  };

  const save = async () => {
    setSaving(true); setFormErr('');
    const body = { ...form };
    // Don't overwrite secrets with empty values
    if (!body.github_token) delete body.github_token;
    if (!body.ftp_host)     delete body.ftp_host;
    if (!body.ftp_username) delete body.ftp_username;
    if (!body.ftp_password) delete body.ftp_password;
    try {
      const url    = editId ? `${API}/projects/${editId}` : `${API}/projects`;
      const method = editId ? 'PUT' : 'POST';
      const r = await apiFetch(url, { method, body: JSON.stringify(body) });
      let d;
      try { d = await r.json(); } catch { d = {}; }
      if (!r.ok) {
        setFormErr(Object.values(d.errors || {}).flat().join(', ') || d.message || `Save failed (${r.status})`);
        return;
      }
      setShowForm(false);
      setView('list');
      // Always fetch fresh from DB — no optimistic state, no delay
      await fetchProjects(true);
      // If we just edited the currently-open project, refresh its logs too
      if (editId && selected === editId) fetchLogs(editId, true);
    } catch (err) { setFormErr(err.message); }
    finally { setSaving(false); }
  };

  // ── render ────────────────────────────────────────────────────────────────

  const selectedProject = projects.find(p => p.id === selected);

  return (
    <div className="container-fluid">

      {/* ══ LIST VIEW ══════════════════════════════════════════════════════ */}
      {view === 'list' && (
        <>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h4 className="mb-0 fw-semibold">Deploy Manager</h4>
              <p className="text-muted small mb-0">GitHub → auto-build → FTP deploy on every commit.</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Project</button>
          </div>

          <div className="card">
            <div className="card-body p-0">
              {fetchError ? (
                <div className="text-center py-5">
                  <div className="alert alert-danger d-inline-block text-start" style={{ maxWidth: 500 }}>
                    <strong>Failed to load projects:</strong><br />
                    <code style={{ fontSize: '0.8rem' }}>{fetchError}</code>
                  </div>
                  <div className="mt-2">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => fetchProjects()}>
                      <SvgRefresh /><span className="ms-1">Retry</span>
                    </button>
                  </div>
                </div>
              ) : loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
              ) : projects.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-3">No deploy projects yet.</p>
                  <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add First Project</button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Project</th>
                        <th>Framework</th>
                        <th>Branch</th>
                        <th>Mode</th>
                        <th>Status</th>
                        <th>Last Deployed</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map(p => {
                        const isDeploying = deploying[p.id] || p.status === 'deploying';
                        return (
                          <tr key={p.id} style={{ cursor: 'pointer' }}
                            onClick={() => { setSelected(p.id); setView('detail'); fetchLogs(p.id); }}>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <span className={`bg-${STATUS_COLOR[p.status] || 'secondary'} rounded-circle flex-shrink-0`}
                                  style={{ width: 8, height: 8, display: 'inline-block' }} />
                                <span className="fw-semibold">{p.name}</span>
                              </div>
                            </td>
                            <td><span className="badge bg-secondary-subtle text-secondary">{p.framework || '—'}</span></td>
                            <td><code className="small">{p.branch || 'main'}</code></td>
                            <td>
                              {p.deploy_mode === 'poll'
                                ? <span className="badge bg-info-subtle text-info border border-info-subtle">Poll {p.poll_interval}m</span>
                                : <span className="badge bg-secondary-subtle text-secondary border">Webhook</span>}
                            </td>
                            <td>
                              <span className={statusBadgeCls(p.status || 'idle')}>
                                {isDeploying && <span className="spinner-border spinner-border-sm me-1" style={{ width: 8, height: 8 }} />}
                                {p.status || 'idle'}
                              </span>
                            </td>
                            <td className="text-muted small">{ago(p.last_deployed_at)}</td>
                            <td className="text-end" onClick={e => e.stopPropagation()}>
                              <div className="d-flex gap-1 justify-content-end">
                                {isDeploying
                                  ? <button className="btn btn-sm btn-danger" onClick={e => stopDeploy(p, e)}>Stop</button>
                                  : <button className="btn btn-sm btn-success" onClick={e => triggerDeploy(p, e)}>Deploy</button>}
                                <button className="btn btn-sm btn-outline-primary" onClick={e => openEdit(p, e)}>Edit</button>
                                <button className="btn btn-sm btn-outline-danger" onClick={e => deleteProject(p, e)}><SvgTrash /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══ DETAIL VIEW ════════════════════════════════════════════════════ */}
      {view === 'detail' && selectedProject && (
        <ProjectDetail
          project={selectedProject}
          logs={logs}
          logsLoading={logsLoading}
          logsError={logsError}
          openLog={openLog}
          setOpenLog={setOpenLog}
          logEndRef={logEndRef}
          deploying={deploying}
          liveLog={liveLog}
          copied={copied}
          onBack={() => setView('list')}
          onDeploy={triggerDeploy}
          onStop={stopDeploy}
          onEdit={openEdit}
          onDelete={deleteProject}
          onToggleAuto={toggleAutoDeploy}
          onCopyWebhook={copyWebhook}
          onRefreshLogs={() => { setLogs([]); setLiveLog(null); fetchLogs(selectedProject.id); }}
        />
      )}

      {/* ── Add / Edit modal ──────────────────────────────────────────── */}
      {showForm && (
        <ProjectFormModal
          form={form} setF={setF} editId={editId}
          formTab={formTab} setFormTab={setFormTab}
          formErr={formErr} saving={saving}
          detecting={detecting} detectInfo={detectInfo}
          revealing={revealing} secretsShown={secretsShown}
          nodeDetecting={nodeDetecting} nodeInfo={nodeInfo}
          onReveal={revealSecrets}
          onDetect={detect}
          onDetectNode={detectNode}
          onApplyFramework={applyFrameworkDefaults}
          onSave={save}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Terminal output — colorises log lines, auto-scroll, live indicator
// ══════════════════════════════════════════════════════════════════════════════
function TerminalOutput({ output, isLive, logEndRef }) {
  const lineClass = (line) => {
    if (line.includes('[ERROR]'))    return 'text-danger';
    if (line.includes('[WARN]'))     return 'text-warning';
    if (line.includes('[stderr]'))   return 'text-warning';
    if (/\[.\/.\]/.test(line))      return 'text-info fw-semibold';
    if (line.includes('=== Deploy')) return 'text-success fw-bold';
    if (line.includes('complete'))   return 'text-success';
    return 'text-light';
  };

  return (
    <pre className="bg-dark text-light m-0 p-3"
      style={{ maxHeight: 450, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', borderRadius: 0 }}>
      {isLive && !output && (
        <span className="text-muted">
          <span className="spinner-border spinner-border-sm me-2" style={{ width: 10, height: 10 }} />
          Starting deploy… waiting for output
        </span>
      )}
      {output
        ? output.split('\n').map((line, i) => (
          <span key={i} className={lineClass(line)}>{line}{'\n'}</span>
        ))
        : (!isLive && <span className="text-muted">No output yet.</span>)}
      {isLive && <span className="text-success blink">▌</span>}
      <span ref={logEndRef} />
    </pre>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Right panel: project detail + logs
// ══════════════════════════════════════════════════════════════════════════════
function ProjectDetail({
  project: p, logs, logsLoading, logsError, openLog, setOpenLog, logEndRef,
  deploying, liveLog, copied, onBack, onDeploy, onStop, onEdit, onDelete, onToggleAuto, onCopyWebhook, onRefreshLogs,
}) {
  const isDeploying = deploying[p.id] || p.status === 'deploying' || (liveLog && (liveLog.status === 'running' || liveLog.status === 'pending'));

  return (
    <div className="d-flex flex-column gap-3">

      {/* ── Back + Header ──────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-body">
          <button className="btn btn-sm btn-outline-secondary mb-3" onClick={onBack}>
            ← Back to Projects
          </button>
          <div className="d-flex flex-wrap align-items-start gap-3">
            <div className="flex-fill">
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <h5 className="mb-0 fw-semibold">{p.name}</h5>
                <span className={statusBadgeCls(p.status || 'idle')}>
                  {isDeploying && <span className="spinner-border spinner-border-sm me-1" style={{ width: 10, height: 10 }} />}
                  {p.status}
                </span>
                {p.deploy_mode === 'poll'
                  ? <span className="badge bg-info-subtle text-info border border-info-subtle small">
                      Poll {p.poll_interval}min
                    </span>
                  : <span className="badge bg-secondary-subtle text-secondary border small">Webhook</span>}
              </div>
              <a href={p.repo_url} target="_blank" rel="noreferrer" className="text-muted small">{p.repo_url}</a>
              <div className="d-flex flex-wrap gap-3 mt-2 small text-muted">
                <span>branch: {p.branch}</span>
                {p.framework && <span>{p.framework}</span>}
                {p.build_command && <span className="font-monospace">{p.build_command}</span>}
                {p.build_output_dir && <span className="font-monospace">{p.build_output_dir}/</span>}
                {p.ftp_path && <span className="font-monospace">{p.ftp_path}</span>}
              </div>
              {p.last_commit_hash && (
                <div className="mt-1 small text-muted">
                  commit: <span className="font-monospace">{p.last_commit_hash.slice(0, 7)}</span>
                  {p.last_deployed_at && <span className="ms-2">deployed {ago(p.last_deployed_at)}</span>}
                </div>
              )}
            </div>

            <div className="d-flex gap-2 flex-shrink-0">
              {isDeploying
                ? <button className="btn btn-sm btn-danger" onClick={e => onStop(p, e)}>
                    <span className="spinner-border spinner-border-sm me-1" style={{ width: 12, height: 12 }} />
                    Stop
                  </button>
                : <button className="btn btn-sm btn-success" onClick={e => onDeploy(p, e)}>
                    <SvgUpload /><span className="ms-1">Deploy Now</span>
                  </button>}
              <button className="btn btn-sm btn-outline-primary" onClick={e => onEdit(p, e)}>
                Edit
              </button>
              <button className="btn btn-sm btn-outline-danger" onClick={e => onDelete(p, e)}>
                <SvgTrash />
              </button>
            </div>
          </div>

          {/* Auto-deploy + webhook URL */}
          <div className="d-flex flex-wrap align-items-center gap-3 mt-3 pt-3 border-top">
            <div className="form-check form-switch mb-0">
              <input className="form-check-input" type="checkbox" id={`auto-${p.id}`}
                checked={p.auto_deploy} onChange={e => onToggleAuto(p, e)} />
              <label className="form-check-label small fw-semibold" htmlFor={`auto-${p.id}`}>
                Auto-deploy on commit
              </label>
            </div>
            {p.deploy_mode === 'webhook' && (
              <div className="input-group input-group-sm" style={{ maxWidth: 400 }}>
                <span className="input-group-text text-muted small">URL</span>
                <input type="text" className="form-control font-monospace"
                  readOnly value={p.webhook_url} style={{ fontSize: '0.68rem' }} />
                <button className="btn btn-outline-secondary" onClick={e => onCopyWebhook(p, e)}>
                  {copied === p.id ? <SvgCheck /> : <SvgCopy />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Deploy Logs ───────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between py-2">
          <span className="fw-semibold small">Deploy Logs</span>
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>Auto-deleted after 3 days</span>
            <button className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={onRefreshLogs}>
              <SvgRefresh />
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          {logsLoading ? (
            <div className="text-center py-4">
              <div className="spinner-border spinner-border-sm text-primary" />
            </div>
          ) : logsError ? (
            <div className="p-3">
              <div className="alert alert-danger mb-0 small">
                <strong>Failed to load logs:</strong><br />
                <code style={{ fontSize: '0.8rem' }}>{logsError}</code>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-muted small py-5">
              No deploy logs yet. Hit <strong>Deploy Now</strong> to start.
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="border-bottom">
                {/* Log row header */}
                <div
                  className={`d-flex align-items-center gap-2 px-3 py-2 ${openLog === log.id ? 'bg-light' : ''}`}
                  style={{ cursor: 'pointer', backgroundColor: openLog === log.id ? undefined : (LOG_ROW_BG[liveLog?.id === log.id ? liveLog.status : log.status] || undefined) }}
                  onClick={() => setOpenLog(openLog === log.id ? null : log.id)}>
                  {(() => {
                    const effectiveStatus = liveLog?.id === log.id ? liveLog.status : log.status;
                    const isRunning = effectiveStatus === 'running' || effectiveStatus === 'pending';
                    return (
                      <span className={statusBadgeCls(effectiveStatus)}
                        style={{ minWidth: 68, fontSize: '0.72rem' }}>
                        {isRunning && <span className="spinner-border spinner-border-sm me-1" style={{ width: 8, height: 8 }} />}
                        {effectiveStatus}
                      </span>
                    );
                  })()}
                  <span className="font-monospace text-muted small text-nowrap">
                    {log.commit_hash ? log.commit_hash.slice(0, 7) : '—'}
                  </span>
                  <span className="small flex-fill text-truncate">
                    {log.commit_message || <em className="text-muted">manual deploy</em>}
                  </span>
                  <span className="small text-muted text-nowrap d-none d-md-block">
                    {log.triggered_by}
                    {log.duration_seconds ? ` · ${log.duration_seconds}s` : ''}
                    {' · '}{new Date(log.created_at).toLocaleString()}
                  </span>
                  <span className="text-muted flex-shrink-0">{openLog === log.id ? <SvgChevronUp /> : <SvgChevronDown />}</span>
                </div>

                {/* Terminal output */}
                {openLog === log.id && (
                  <TerminalOutput
                    output={liveLog?.id === log.id ? liveLog.output : log.output}
                    isLive={liveLog?.id === log.id && (liveLog.status === 'running' || liveLog.status === 'pending')}
                    logEndRef={logEndRef}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Add / Edit Modal
// ══════════════════════════════════════════════════════════════════════════════
function ProjectFormModal({
  form, setF, editId, formTab, setFormTab, formErr, saving,
  detecting, detectInfo, revealing, secretsShown, nodeDetecting, nodeInfo,
  onReveal, onDetect, onDetectNode, onApplyFramework, onSave, onClose,
}) {
  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.55)', zIndex: 1055 }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {editId ? 'Edit Project' : 'Add Deploy Project'}
            </h5>
            <button className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body pb-1">
            {formErr && <div className="alert alert-danger py-2 small mb-3">{formErr}</div>}

            {/* Reveal banner for edit mode */}
            {editId && (
              <div className="alert alert-secondary py-2 d-flex align-items-center gap-2 mb-3 small">
                <SvgKey />
                <span className="ms-1">Secrets are hidden for security.</span>
                <button className="btn btn-sm btn-outline-secondary py-0 ms-auto" onClick={onReveal} disabled={revealing}>
                  {revealing
                    ? <><span className="spinner-border spinner-border-sm me-1" />Loading...</>
                    : <><SvgEye /><span className="ms-1">Reveal all secrets</span></>}
                </button>
              </div>
            )}

            {/* Tabs */}
            <ul className="nav nav-tabs mb-3">
              {[
                { key: 'repo',  label: 'Repository' },
                { key: 'build', label: 'Build' },
                { key: 'ftp',   label: 'FTP & Deploy' },
              ].map(t => (
                <li className="nav-item" key={t.key}>
                  <button className={`nav-link${formTab === t.key ? ' active' : ''}`}
                    onClick={() => setFormTab(t.key)}>
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>

            {/* ── Tab: Repository ──────────────────────────────────────── */}
            {formTab === 'repo' && (
              <div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Project Name <span className="text-danger">*</span></label>
                  <input className="form-control" value={form.name}
                    onChange={e => setF('name', e.target.value)} placeholder="My Portfolio Site" />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">GitHub Repo URL <span className="text-danger">*</span></label>
                  <input className="form-control font-monospace" value={form.repo_url}
                    onChange={e => setF('repo_url', e.target.value)}
                    placeholder="https://github.com/yourname/your-repo" />
                </div>

                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold">Branch</label>
                    <input className="form-control" value={form.branch}
                      onChange={e => setF('branch', e.target.value)} placeholder="main" />
                  </div>
                  <div className="col-md-8 mb-3">
                    <label className="form-label fw-semibold">
                      GitHub Token
                      <span className="badge bg-secondary-subtle text-secondary ms-2 fw-normal small">private repos</span>
                    </label>
                    <RevealInput
                      value={form.github_token}
                      onChange={e => setF('github_token', e.target.value)}
                      placeholder={editId ? '(click Reveal to view / type to change)' : 'ghp_xxxxxxxxxxxx'}
                      revealed={!!editId}
                      onReveal={onReveal}
                      isLoading={revealing}
                      forceShow={secretsShown}
                    />
                    <div className="form-text">
                      GitHub → Settings → Developer Settings → Personal Access Tokens → <code>contents:read</code>
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2 align-items-center flex-wrap">
                  <button className="btn btn-outline-primary" onClick={onDetect}
                    disabled={detecting || !form.repo_url}>
                    {detecting
                      ? <><span className="spinner-border spinner-border-sm me-1" />Detecting...</>
                      : <>Auto-Detect Framework</>}
                  </button>
                  {detectInfo && (
                    <span className="text-success small">
                      <SvgCheck />
                      <strong>{detectInfo.framework}</strong>
                      {detectInfo.build_command && <> · <code>{detectInfo.build_command}</code></>}
                      {detectInfo.build_output_dir && <> → <code>{detectInfo.build_output_dir}/</code></>}
                      {!detectInfo.build_command && <span className="text-muted"> · no build (static)</span>}
                    </span>
                  )}
                </div>

                <div className="d-flex justify-content-end mt-3">
                  <button className="btn btn-primary btn-sm" onClick={() => setFormTab('build')}>
                    Next: Build <SvgArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* ── Tab: Build ───────────────────────────────────────────── */}
            {formTab === 'build' && (
              <div>

                {/* Step visual */}
                <div className="d-flex align-items-center gap-2 mb-3 p-2 rounded bg-light small">
                  <span className="badge bg-primary rounded-pill">1</span>
                  <span className="font-monospace">npm install</span>
                  <span className="text-muted"><SvgArrowRight /></span>
                  <span className="badge bg-success rounded-pill">2</span>
                  <span className="font-monospace">{form.build_command || <em className="text-muted">no build</em>}</span>
                  <span className="text-muted"><SvgArrowRight /></span>
                  <span className="badge bg-info rounded-pill">3</span>
                  <span className="font-monospace">{form.build_output_dir ? `${form.build_output_dir}/` : <em className="text-muted">root</em>}</span>
                  <span className="text-muted"><SvgArrowRight /></span>
                  <span className="badge bg-warning text-dark rounded-pill">4</span>
                  <span>FTP upload</span>
                </div>

                {/* Framework selector */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Framework
                    <span className="badge bg-success-subtle text-success ms-2 fw-normal small">auto-detected · overridable</span>
                  </label>
                  <select className="form-select" value={form.framework}
                    onChange={e => onApplyFramework(e.target.value)}>
                    {FRAMEWORKS.map(fw => <option key={fw.value} value={fw.value}>{fw.label}</option>)}
                  </select>
                  <div className="form-text">Selecting framework auto-fills Build Command + Output Dir.</div>
                </div>

                {/* Build command */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Build Command
                    <span className="badge bg-warning-subtle text-warning ms-2 fw-normal small">overridable</span>
                  </label>
                  <input className="form-control font-monospace" value={form.build_command}
                    onChange={e => setF('build_command', e.target.value)}
                    placeholder="npm run build  ← leave blank for static HTML (no build)" />
                  <div className="form-text">
                    <code>npm install</code> always runs first automatically, then this command.
                    Leave blank for static HTML.
                  </div>
                </div>

                {/* Build output dir */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Build Output Directory
                    <span className="badge bg-warning-subtle text-warning ms-2 fw-normal small">overridable</span>
                  </label>
                  <input className="form-control font-monospace" value={form.build_output_dir}
                    onChange={e => setF('build_output_dir', e.target.value)}
                    placeholder="dist" />
                  <div className="form-text">
                    Folder to upload after build.
                    <code className="ms-1">dist</code> (Vite) ·
                    <code className="ms-1">out</code> (Next) ·
                    <code className="ms-1">build</code> (CRA) ·
                    <code className="ms-1">.output/public</code> (Nuxt) ·
                    <em className="ms-1">blank = upload source root</em>
                  </div>
                </div>

                {/* Node.js path — auto-detect */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Node.js Directory
                    <span className="badge bg-secondary-subtle text-secondary ms-2 fw-normal small">optional</span>
                  </label>
                  <div className="d-flex gap-2">
                    <input className="form-control font-monospace flex-fill" value={form.node_path}
                      onChange={e => setF('node_path', e.target.value)}
                      placeholder="/usr/local/bin  (leave blank if node is in PATH)" />
                    <button type="button" className="btn btn-outline-secondary text-nowrap"
                      onClick={onDetectNode} disabled={nodeDetecting}>
                      {nodeDetecting
                        ? <span className="spinner-border spinner-border-sm" />
                        : <>Auto-detect</>}
                    </button>
                  </div>
                  {nodeInfo && (
                    <div className={`mt-1 small ${nodeInfo.found ? 'text-success' : 'text-danger'}`}>
                      {nodeInfo.found
                        ? <>Node {nodeInfo.node_version} · npm {nodeInfo.npm_version} → <code>{nodeInfo.node_path}</code></>
                        : 'Node.js not found in PATH on this server.'}
                    </div>
                  )}
                  <div className="form-text">
                    Only needed if <code>node</code> / <code>npm</code> is not in your server's <code>$PATH</code>.
                  </div>
                </div>

                <div className="d-flex justify-content-between mt-2">
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => setFormTab('repo')}>
                    <SvgArrowLeft /> Back
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setFormTab('ftp')}>
                    Next: FTP <SvgArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* ── Tab: FTP & Deploy ────────────────────────────────────── */}
            {formTab === 'ftp' && (
              <div>
                <div className="row">
                  <div className="col-md-8 mb-3">
                    <label className="form-label fw-semibold">FTP Host</label>
                    <RevealInput
                      value={form.ftp_host}
                      onChange={e => setF('ftp_host', e.target.value)}
                      placeholder={editId ? '(click Reveal to view)' : 'ftp.yourdomain.com'}
                      revealed={!!editId}
                      onReveal={onReveal}
                      isLoading={revealing}
                      forceShow={secretsShown}
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold">Port</label>
                    <input className="form-control" type="number" value={form.ftp_port}
                      onChange={e => setF('ftp_port', parseInt(e.target.value) || 21)} />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">FTP Username</label>
                    <RevealInput
                      value={form.ftp_username}
                      onChange={e => setF('ftp_username', e.target.value)}
                      placeholder={editId ? '(click Reveal to view)' : 'user@domain.com'}
                      revealed={!!editId}
                      onReveal={onReveal}
                      isLoading={revealing}
                      forceShow={secretsShown}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">FTP Password</label>
                    <RevealInput
                      value={form.ftp_password}
                      onChange={e => setF('ftp_password', e.target.value)}
                      placeholder={editId ? '(click Reveal to view)' : ''}
                      revealed={!!editId}
                      onReveal={onReveal}
                      isLoading={revealing}
                      forceShow={secretsShown}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Deploy Path (remote)</label>
                  <input className="form-control font-monospace" value={form.ftp_path}
                    onChange={e => setF('ftp_path', e.target.value)}
                    placeholder="/public_html/mysite/" />
                  <div className="form-text">Files upload to this directory on your server.</div>
                </div>

                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" id="ftp-ssl"
                    checked={form.ftp_ssl} onChange={e => setF('ftp_ssl', e.target.checked)} />
                  <label className="form-check-label small" htmlFor="ftp-ssl">Use FTPS (SSL)</label>
                </div>

                <hr />

                {/* Deploy mode */}
                <label className="form-label fw-semibold">Auto-Deploy Mode</label>
                <div className="row g-2 mb-3">
                  {[
                    {
                      key: 'webhook',
                      title: 'Webhook (instant)',
                      desc: 'GitHub sends push event to your server. Add the webhook URL to your GitHub repo.',
                    },
                    {
                      key: 'poll',
                      title: 'Poll (no webhook needed)',
                      desc: 'CMS checks GitHub every N minutes. No public webhook URL required.',
                    },
                  ].map(mode => (
                    <div className="col-md-6" key={mode.key}>
                      <div
                        className={`card h-100 border-2 ${form.deploy_mode === mode.key ? 'border-primary bg-primary-subtle' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setF('deploy_mode', mode.key)}>
                        <div className="card-body py-2 px-3">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <input type="radio" className="form-check-input mt-0" readOnly
                              checked={form.deploy_mode === mode.key} />
                            <strong className="small">{mode.title}</strong>
                          </div>
                          <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>{mode.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {form.deploy_mode === 'poll' && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Poll Interval (minutes)</label>
                    <input className="form-control" type="number" min={1} max={60}
                      style={{ maxWidth: 120 }} value={form.poll_interval}
                      onChange={e => setF('poll_interval', parseInt(e.target.value) || 5)} />
                    <div className="form-text">
                      GitHub API checked every {form.poll_interval} min. New commit = auto deploy.
                    </div>
                  </div>
                )}

                <div className="form-check form-switch mb-2">
                  <input className="form-check-input" type="checkbox" id="auto-deploy-chk"
                    checked={form.auto_deploy} onChange={e => setF('auto_deploy', e.target.checked)} />
                  <label className="form-check-label fw-semibold small" htmlFor="auto-deploy-chk">
                    Enable Auto-Deploy
                    <span className="fw-normal text-muted ms-2">
                      (off = webhook/poll detects commits but does NOT deploy automatically)
                    </span>
                  </label>
                </div>

                <div className="d-flex justify-content-start mt-3">
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => setFormTab('build')}>
                    <SvgArrowLeft /> Back
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={onSave} disabled={saving}>
              {saving
                ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</>
                : <>{editId ? 'Save Changes' : 'Create Project'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
