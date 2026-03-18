import { useState, useEffect, useRef, useCallback } from 'react';

const API = '/api/admin/deploy';

const STATUS_COLOR = { idle: 'secondary', deploying: 'warning', success: 'success', failed: 'danger' };

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

// ── Password input with show/hide + optional reveal-from-server ──────────────
function RevealInput({ value, onChange, placeholder, revealed, onReveal, isLoading }) {
  const [show, setShow] = useState(false);
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
  const [nodeDetecting, setNodeDetecting] = useState(false);
  const [nodeInfo,      setNodeInfo]      = useState(null); // { node_path, node_version, npm_version }
  const [logs,        setLogs]        = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [openLog,     setOpenLog]     = useState(null);
  const [deploying,   setDeploying]   = useState({});
  const [copied,      setCopied]      = useState(null);
  const logEndRef = useRef(null);
  const pollRef   = useRef(null);

  // ── data ──────────────────────────────────────────────────────────────────

  const fetchProjects = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const r = await apiFetch(`${API}/projects`);
      const data = await r.json();
      setProjects(data);
      return data;
    } finally { if (!quiet) setLoading(false); }
  }, []);

  const fetchLogs = useCallback(async (projectId, quiet = false) => {
    if (!quiet) setLogsLoading(true);
    try {
      const r = await apiFetch(`${API}/projects/${projectId}/logs`);
      const data = await r.json();
      setLogs(data);
      if (data.length) setOpenLog(prev => prev ?? data[0]?.id);
    } finally { if (!quiet) setLogsLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // Auto-refresh while deploying
  useEffect(() => {
    clearInterval(pollRef.current);
    const busy = projects.some(p => p.status === 'deploying') || Object.values(deploying).some(Boolean);
    if (busy) {
      pollRef.current = setInterval(async () => {
        const fresh = await fetchProjects(true);
        if (selected) {
          const still = fresh.find(p => p.id === selected);
          if (still) fetchLogs(selected, true);
        }
      }, 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [projects, deploying, selected, fetchProjects, fetchLogs]);

  useEffect(() => {
    if (selected) { setLogs([]); setOpenLog(null); fetchLogs(selected); }
  }, [selected]); // eslint-disable-line

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs, openLog]);

  // ── reveal stored secrets ─────────────────────────────────────────────────

  const revealSecrets = async () => {
    if (!editId) return;
    setRevealing(true);
    try {
      const r = await apiFetch(`${API}/projects/${editId}/reveal`, { method: 'POST' });
      const d = await r.json();
      setForm(f => ({
        ...f,
        github_token: d.github_token || f.github_token,
        ftp_host:     d.ftp_host     || f.ftp_host,
        ftp_username: d.ftp_username || f.ftp_username,
        ftp_password: d.ftp_password || f.ftp_password,
      }));
    } finally { setRevealing(false); }
  };

  // ── project actions ───────────────────────────────────────────────────────

  const openAdd = () => {
    setForm(BLANK); setEditId(null); setDetectInfo(null); setFormErr(''); setFormTab('repo');
    setShowForm(true);
  };

  const openEdit = (p, e) => {
    e?.stopPropagation();
    setForm({
      ...BLANK,
      name: p.name, repo_url: p.repo_url, branch: p.branch,
      framework: p.framework || '', build_command: p.build_command || '',
      build_output_dir: p.build_output_dir || '', node_path: p.node_path || '',
      // Secrets start blank — user clicks "Reveal" to load them
      github_token: '', ftp_host: '', ftp_username: '', ftp_password: '',
      ftp_path: p.ftp_path || '/public_html/',
      ftp_port: p.ftp_port || 21, ftp_ssl: p.ftp_ssl,
      auto_deploy: p.auto_deploy, deploy_mode: p.deploy_mode || 'webhook',
      poll_interval: p.poll_interval || 5,
    });
    setDetectInfo(null); setEditId(p.id); setFormErr(''); setFormTab('repo');
    setShowForm(true);
  };

  const deleteProject = async (p, e) => {
    e?.stopPropagation();
    if (!confirm(`Delete "${p.name}"? All deploy logs will be removed.`)) return;
    await apiFetch(`${API}/projects/${p.id}`, { method: 'DELETE' });
    if (selected === p.id) setSelected(null);
    fetchProjects();
  };

  const toggleAutoDeploy = async (p, e) => {
    e?.stopPropagation();
    await apiFetch(`${API}/projects/${p.id}`, {
      method: 'PUT', body: JSON.stringify({ auto_deploy: !p.auto_deploy }),
    });
    fetchProjects(true);
  };

  const triggerDeploy = async (p, e) => {
    e?.stopPropagation();
    setDeploying(d => ({ ...d, [p.id]: true }));
    const r = await apiFetch(`${API}/projects/${p.id}/deploy`, { method: 'POST' });
    const d = await r.json();
    if (r.ok) {
      setSelected(p.id);
      setTimeout(() => { fetchProjects(true); fetchLogs(p.id, true); }, 1200);
    } else {
      alert(d.message || 'Deploy failed to start');
      setDeploying(prev => ({ ...prev, [p.id]: false }));
    }
    setTimeout(() => setDeploying(d => ({ ...d, [p.id]: false })), 5000);
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
      const r      = await apiFetch(url, { method, body: JSON.stringify(body) });
      const d      = await r.json();
      if (!r.ok) {
        setFormErr(Object.values(d.errors || {}).flat().join(', ') || d.message || 'Save failed');
        return;
      }
      setShowForm(false);
      const fresh = await fetchProjects(true);
      const id = d.id || editId || fresh[0]?.id;
      if (id) setSelected(id);
    } catch (err) { setFormErr(err.message); }
    finally { setSaving(false); }
  };

  const selectedProject = projects.find(p => p.id === selected);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h4 className="mb-0 fw-semibold"><i className="ri-rocket-line me-2 text-primary" />Deploy Manager</h4>
          <p className="text-muted small mb-0">Connect GitHub repos → auto-build → auto-deploy to cPanel on every commit.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <i className="ri-add-line me-1" />Add Project
        </button>
      </div>

      <div className="row g-3">
        {/* ── Left: projects list ─────────────────────────────────────── */}
        <div className="col-lg-4 col-xl-3">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          ) : projects.length === 0 ? (
            <div className="card text-center py-5">
              <i className="ri-git-repository-line fs-1 text-muted d-block mb-2" />
              <p className="text-muted small mb-3">No projects yet.</p>
              <button className="btn btn-primary btn-sm mx-auto" style={{ width: 130 }} onClick={openAdd}>
                <i className="ri-add-line me-1" />Add Project
              </button>
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {projects.map(p => {
                const isDeploying = deploying[p.id] || p.status === 'deploying';
                return (
                  <div key={p.id}
                    className={`card ${selected === p.id ? 'border-primary shadow-sm' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelected(p.id)}>
                    <div className="card-body py-2 px-3">
                      <div className="d-flex align-items-center gap-2">
                        <span className={`bg-${STATUS_COLOR[p.status] || 'secondary'} rounded-circle`}
                          style={{ width: 8, height: 8, display: 'inline-block', flexShrink: 0 }} />
                        <div className="flex-fill min-w-0">
                          <div className="fw-semibold small text-truncate">{p.name}</div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                            <i className="ri-git-branch-line me-1" />{p.branch}
                            {p.framework && <><span className="mx-1">·</span>{p.framework}</>}
                            <span className="mx-1">·</span>{ago(p.last_deployed_at)}
                          </div>
                        </div>
                        <button className="btn btn-sm p-0 px-1 border-0 text-success"
                          disabled={isDeploying}
                          onClick={e => triggerDeploy(p, e)} title="Deploy Now">
                          {isDeploying
                            ? <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} />
                            : <i className="ri-upload-cloud-2-line fs-6" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right: project detail ────────────────────────────────────── */}
        <div className="col-lg-8 col-xl-9">
          {!selectedProject ? (
            <div className="card text-center py-5">
              <i className="ri-arrow-left-line fs-1 text-muted mb-2" />
              <p className="text-muted">Select a project to view details and logs.</p>
            </div>
          ) : (
            <ProjectDetail
              project={selectedProject}
              logs={logs}
              logsLoading={logsLoading}
              openLog={openLog}
              setOpenLog={setOpenLog}
              logEndRef={logEndRef}
              deploying={deploying}
              copied={copied}
              onDeploy={triggerDeploy}
              onEdit={openEdit}
              onDelete={deleteProject}
              onToggleAuto={toggleAutoDeploy}
              onCopyWebhook={copyWebhook}
              onRefreshLogs={() => { setLogs([]); fetchLogs(selectedProject.id); }}
            />
          )}
        </div>
      </div>

      {/* ── Add / Edit modal ──────────────────────────────────────────── */}
      {showForm && (
        <ProjectFormModal
          form={form} setF={setF} editId={editId}
          formTab={formTab} setFormTab={setFormTab}
          formErr={formErr} saving={saving}
          detecting={detecting} detectInfo={detectInfo}
          revealing={revealing}
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
// Right panel: project detail + logs
// ══════════════════════════════════════════════════════════════════════════════
function ProjectDetail({
  project: p, logs, logsLoading, openLog, setOpenLog, logEndRef,
  deploying, copied, onDeploy, onEdit, onDelete, onToggleAuto, onCopyWebhook, onRefreshLogs,
}) {
  const isDeploying = deploying[p.id] || p.status === 'deploying';

  return (
    <div className="d-flex flex-column gap-3">

      {/* ── Header card ───────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-start gap-3">
            <div className="flex-fill">
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <h5 className="mb-0 fw-semibold">{p.name}</h5>
                <span className={`badge bg-${STATUS_COLOR[p.status] || 'secondary'}`}>
                  {isDeploying && <span className="spinner-border spinner-border-sm me-1" style={{ width: 10, height: 10 }} />}
                  {p.status}
                </span>
                {p.deploy_mode === 'poll'
                  ? <span className="badge bg-info-subtle text-info border border-info-subtle small">
                      <i className="ri-radar-line me-1" />Poll {p.poll_interval}min
                    </span>
                  : <span className="badge bg-secondary-subtle text-secondary border small">
                      <i className="ri-webhook-line me-1" />Webhook
                    </span>}
              </div>
              <a href={p.repo_url} target="_blank" rel="noreferrer" className="text-muted small">
                <i className="ri-github-line me-1" />{p.repo_url}
              </a>
              <div className="d-flex flex-wrap gap-3 mt-2 small text-muted">
                <span><i className="ri-git-branch-line me-1" />{p.branch}</span>
                {p.framework && <span><i className="ri-code-box-line me-1" />{p.framework}</span>}
                {p.build_command && <span className="font-monospace"><i className="ri-hammer-line me-1" />{p.build_command}</span>}
                {p.build_output_dir && <span className="font-monospace"><i className="ri-folder-line me-1" />{p.build_output_dir}/</span>}
                {p.ftp_path && <span className="font-monospace"><i className="ri-server-line me-1" />{p.ftp_path}</span>}
              </div>
              {p.last_commit_hash && (
                <div className="mt-1 small text-muted">
                  <i className="ri-git-commit-line me-1" />
                  <span className="font-monospace">{p.last_commit_hash.slice(0, 7)}</span>
                  {p.last_deployed_at && <span className="ms-2">deployed {ago(p.last_deployed_at)}</span>}
                </div>
              )}
            </div>

            <div className="d-flex gap-2 flex-shrink-0">
              <button className={`btn btn-sm ${isDeploying ? 'btn-secondary' : 'btn-success'}`}
                disabled={isDeploying} onClick={e => onDeploy(p, e)}>
                {isDeploying
                  ? <><span className="spinner-border spinner-border-sm me-1" />Deploying...</>
                  : <><i className="ri-upload-cloud-line me-1" />Deploy Now</>}
              </button>
              <button className="btn btn-sm btn-outline-primary" onClick={e => onEdit(p, e)}>
                <i className="ri-pencil-line me-1" />Edit
              </button>
              <button className="btn btn-sm btn-outline-danger" onClick={e => onDelete(p, e)}>
                <i className="ri-delete-bin-line" />
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
                <span className="input-group-text text-muted small"><i className="ri-webhook-line" /></span>
                <input type="text" className="form-control font-monospace"
                  readOnly value={p.webhook_url} style={{ fontSize: '0.68rem' }} />
                <button className="btn btn-outline-secondary" onClick={e => onCopyWebhook(p, e)}>
                  <i className={copied === p.id ? 'ri-check-line text-success' : 'ri-file-copy-line'} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Deploy Logs ───────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between py-2">
          <span className="fw-semibold small"><i className="ri-terminal-box-line me-1" />Deploy Logs</span>
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>Auto-deleted after 3 days</span>
            <button className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={onRefreshLogs}>
              <i className="ri-refresh-line" />
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          {logsLoading ? (
            <div className="text-center py-4">
              <div className="spinner-border spinner-border-sm text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-muted small py-5">
              <i className="ri-inbox-line d-block fs-2 mb-2" />
              No deploy logs yet. Hit <strong>Deploy Now</strong> to start.
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="border-bottom">
                {/* Log row header */}
                <div
                  className={`d-flex align-items-center gap-2 px-3 py-2 ${openLog === log.id ? 'bg-light' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setOpenLog(openLog === log.id ? null : log.id)}>
                  <span className={`badge bg-${STATUS_COLOR[log.status] || 'secondary'} text-nowrap`}
                    style={{ minWidth: 65, fontSize: '0.72rem' }}>
                    {log.status === 'running' && (
                      <span className="spinner-border spinner-border-sm me-1" style={{ width: 8, height: 8 }} />
                    )}
                    {log.status}
                  </span>
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
                  <i className={`ri-arrow-${openLog === log.id ? 'up' : 'down'}-s-line text-muted flex-shrink-0`} />
                </div>

                {/* Terminal output */}
                {openLog === log.id && (
                  <pre className="bg-dark text-light m-0 p-3"
                    style={{ maxHeight: 400, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', borderRadius: 0 }}>
                    {log.output
                      ? log.output.split('\n').map((line, i) => (
                        <span key={i} className={
                          line.includes('[ERROR]')    ? 'text-danger' :
                          line.includes('[WARN]')     ? 'text-warning' :
                          line.includes('[stderr]')   ? 'text-warning' :
                          /\[.\/.\]/.test(line)       ? 'text-info' :
                          line.includes('=== Deploy') ? 'text-success fw-bold' :
                          line.includes('complete')   ? 'text-success' :
                          'text-light'
                        }>{line}{'\n'}</span>
                      ))
                      : <span className="text-muted">Waiting for output…</span>}
                    <span ref={logEndRef} />
                  </pre>
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
  detecting, detectInfo, revealing, nodeDetecting, nodeInfo,
  onReveal, onDetect, onDetectNode, onApplyFramework, onSave, onClose,
}) {
  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.55)', zIndex: 1055 }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="ri-rocket-line me-2" />{editId ? 'Edit Project' : 'Add Deploy Project'}
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
                { key: 'repo',  icon: 'ri-github-line',   label: 'Repository' },
                { key: 'build', icon: 'ri-hammer-line',    label: 'Build' },
                { key: 'ftp',   icon: 'ri-server-line',    label: 'FTP & Deploy' },
              ].map(t => (
                <li className="nav-item" key={t.key}>
                  <button className={`nav-link${formTab === t.key ? ' active' : ''}`}
                    onClick={() => setFormTab(t.key)}>
                    <i className={`${t.icon} me-1`} />{t.label}
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
                      : <><i className="ri-search-eye-line me-1" />Auto-Detect Framework</>}
                  </button>
                  {detectInfo && (
                    <span className="text-success small">
                      <i className="ri-checkbox-circle-line me-1" />
                      <strong>{detectInfo.framework}</strong>
                      {detectInfo.build_command && <> · <code>{detectInfo.build_command}</code></>}
                      {detectInfo.build_output_dir && <> → <code>{detectInfo.build_output_dir}/</code></>}
                      {!detectInfo.build_command && <span className="text-muted"> · no build (static)</span>}
                    </span>
                  )}
                </div>

                <div className="d-flex justify-content-end mt-3">
                  <button className="btn btn-primary btn-sm" onClick={() => setFormTab('build')}>
                    Next: Build <i className="ri-arrow-right-line ms-1" />
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
                  <i className="ri-arrow-right-line text-muted" />
                  <span className="badge bg-success rounded-pill">2</span>
                  <span className="font-monospace">{form.build_command || <em className="text-muted">no build</em>}</span>
                  <i className="ri-arrow-right-line text-muted" />
                  <span className="badge bg-info rounded-pill">3</span>
                  <span className="font-monospace">{form.build_output_dir ? `${form.build_output_dir}/` : <em className="text-muted">root</em>}</span>
                  <i className="ri-arrow-right-line text-muted" />
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
                    <i className="ri-arrow-left-line me-1" />Back
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setFormTab('ftp')}>
                    Next: FTP <i className="ri-arrow-right-line ms-1" />
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
                      icon: 'ri-webhook-line',
                      title: 'Webhook (instant)',
                      desc: 'GitHub sends push event to your server. Add the webhook URL to your GitHub repo.',
                    },
                    {
                      key: 'poll',
                      icon: 'ri-radar-line',
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
                            <i className={`${mode.icon} fs-5`} />
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
                    <i className="ri-arrow-left-line me-1" />Back
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
                : <><i className="ri-save-line me-1" />{editId ? 'Save Changes' : 'Create Project'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
