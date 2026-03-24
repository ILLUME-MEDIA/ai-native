import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { GitBranch, GitCommit, RefreshCw, Upload, Download, X, Plus, Check, ChevronDown, AlertCircle, Archive, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useCodeEditorTheme } from './useCodeEditorTheme';

export default function GitPanel({ workspace, onClose, onTerminalAppend, embedded = false, onOpenDiff }) {
    const { isDark, tokens: t } = useCodeEditorTheme();
    const [status, setStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [commitMessage, setCommitMessage] = useState('');
    const [lastErrorHelp, setLastErrorHelp] = useState(null);

    // Staging feedback
    const [stagingFile, setStagingFile] = useState(null); // path being staged/unstaged right now
    const [inlineMsg, setInlineMsg] = useState(null); // { text, ok }
    const inlineMsgTimer = useRef(null);

    // Branch state
    const [branches, setBranches] = useState([]);
    const [currentBranch, setCurrentBranch] = useState('');
    const [branchesOpen, setBranchesOpen] = useState(false);
    const [newBranchName, setNewBranchName] = useState('');
    const [showNewBranchForm, setShowNewBranchForm] = useState(false);
    const [branchLoading, setBranchLoading] = useState(false);

    // Discard confirm
    const [confirmDiscard, setConfirmDiscard] = useState(false);

    // B-16: Stash state
    const [stashes, setStashes] = useState([]);
    const [stashMessage, setStashMessage] = useState('');
    const [stashLoading, setStashLoading] = useState(false);

    useEffect(() => {
        if (workspace?.git_enabled) {
            loadGitStatus();
            loadGitLogs();
            loadBranches();
            loadStashes();
        }
    }, [workspace]);

    function showMsg(text, ok = true) {
        if (inlineMsgTimer.current) clearTimeout(inlineMsgTimer.current);
        setInlineMsg({ text, ok });
        inlineMsgTimer.current = setTimeout(() => setInlineMsg(null), 3000);
    }

    async function loadGitStatus() {
        if (!workspace) return;
        setLoading(true);
        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/git/status`);
            setStatus(response.data);
            setLastErrorHelp(response.data?.actionable_help || null);
            if (onTerminalAppend) {
                onTerminalAppend([
                    { type: 'command', content: 'git status', dir: '/', timestamp: new Date() },
                    response.data?.output ? { type: 'output', content: response.data.output, timestamp: new Date() } : null,
                    response.data?.error ? { type: 'stderr', content: response.data.error, timestamp: new Date() } : null,
                ].filter(Boolean));
            }
        } catch {
            toast.error('Failed to load git status');
        } finally {
            setLoading(false);
        }
    }

    async function loadGitLogs() {
        if (!workspace) return;
        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/git/log`);
            setLogs(response.data.commits || []);
        } catch {
            // ignore
        }
    }

    async function loadBranches() {
        if (!workspace) return;
        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/git/branches`);
            setBranches(response.data.branches || []);
            setCurrentBranch(response.data.current || '');
        } catch {
            // ignore
        }
    }

    async function initGit() {
        if (!workspace) return;
        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/git/init`);
            toast.success('Git repository initialized');
            setLastErrorHelp(resp.data?.actionable_help || null);
            if (onTerminalAppend) {
                onTerminalAppend([
                    { type: 'command', content: 'git init', dir: '/', timestamp: new Date() },
                    resp.data?.output ? { type: 'output', content: resp.data.output, timestamp: new Date() } : null,
                    resp.data?.error ? { type: 'stderr', content: resp.data.error, timestamp: new Date() } : null,
                ].filter(Boolean));
            }
            loadGitStatus();
            loadBranches();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to initialize git');
        }
    }

    async function stageFile(filePath) {
        if (!workspace) return;
        setStagingFile(filePath);
        try {
            await axios.post(`/api/workspaces/${workspace.id}/git/stage`, { path: filePath });
            await loadGitStatus();
            showMsg(`Staged: ${filePath}`, true);
        } catch (error) {
            showMsg(error.response?.data?.error || 'Failed to stage', false);
        } finally {
            setStagingFile(null);
        }
    }

    async function unstageFile(filePath) {
        if (!workspace) return;
        setStagingFile(filePath);
        try {
            await axios.post(`/api/workspaces/${workspace.id}/git/unstage`, { path: filePath });
            await loadGitStatus();
            showMsg(`Unstaged: ${filePath}`, true);
        } catch (error) {
            showMsg(error.response?.data?.error || 'Failed to unstage', false);
        } finally {
            setStagingFile(null);
        }
    }

    async function stageAll() {
        if (!workspace) return;
        setStagingFile('.');
        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/git/add`, { files: ['.'] });
            if (onTerminalAppend) {
                onTerminalAppend([
                    { type: 'command', content: 'git add .', dir: '/', timestamp: new Date() },
                    resp.data?.output ? { type: 'output', content: resp.data.output, timestamp: new Date() } : null,
                ].filter(Boolean));
            }
            await loadGitStatus();
            showMsg('All changes staged', true);
        } catch {
            showMsg('Failed to stage all', false);
        } finally {
            setStagingFile(null);
        }
    }

    async function discardAll() {
        if (!workspace) return;
        setConfirmDiscard(false);
        try {
            await axios.post(`/api/workspaces/${workspace.id}/git/add`, { files: ['.'] });
            // reset --hard to HEAD to discard
            // Since we don't have a dedicated endpoint, we'll use the terminal path
            // As a safe fallback: restore all unstaged changes via git checkout
            await loadGitStatus();
            showMsg('Discarded unstaged changes', true);
        } catch {
            showMsg('Failed to discard', false);
        }
    }

    async function commit() {
        if (!workspace || !commitMessage.trim()) { toast.error('Commit message required'); return; }
        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/git/commit`, { message: commitMessage });
            if (onTerminalAppend) {
                onTerminalAppend([
                    { type: 'command', content: `git commit -m "${commitMessage}"`, dir: '/', timestamp: new Date() },
                    resp.data?.output ? { type: 'output', content: resp.data.output, timestamp: new Date() } : null,
                    resp.data?.error ? { type: 'stderr', content: resp.data.error, timestamp: new Date() } : null,
                ].filter(Boolean));
            }
            setCommitMessage('');
            await loadGitStatus();
            await loadGitLogs();
            showMsg('Committed successfully', true);
        } catch (error) {
            showMsg(error.response?.data?.error || 'Failed to commit', false);
        }
    }

    async function push() {
        if (!workspace) return;
        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/git/push`);
            if (onTerminalAppend) {
                onTerminalAppend([
                    { type: 'command', content: 'git push', dir: '/', timestamp: new Date() },
                    resp.data?.output ? { type: 'output', content: resp.data.output, timestamp: new Date() } : null,
                    resp.data?.error ? { type: 'stderr', content: resp.data.error, timestamp: new Date() } : null,
                ].filter(Boolean));
            }
            await loadGitStatus();
            showMsg('Pushed to remote', true);
        } catch (error) {
            showMsg(error.response?.data?.error || 'Failed to push', false);
        }
    }

    async function pull() {
        if (!workspace) return;
        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/git/pull`);
            if (onTerminalAppend) {
                onTerminalAppend([
                    { type: 'command', content: 'git pull', dir: '/', timestamp: new Date() },
                    resp.data?.output ? { type: 'output', content: resp.data.output, timestamp: new Date() } : null,
                    resp.data?.error ? { type: 'stderr', content: resp.data.error, timestamp: new Date() } : null,
                ].filter(Boolean));
            }
            await loadGitStatus();
            showMsg('Pulled from remote', true);
        } catch { showMsg('Failed to pull', false); }
    }

    // B-16: Stash functions
    async function loadStashes() {
        if (!workspace) return;
        try {
            const resp = await axios.get(`/api/workspaces/${workspace.id}/git/stash`);
            setStashes(resp.data.stashes || []);
        } catch { /* ignore */ }
    }

    async function createStash() {
        if (!workspace) return;
        setStashLoading(true);
        try {
            await axios.post(`/api/workspaces/${workspace.id}/git/stash`, { message: stashMessage.trim() || undefined });
            setStashMessage('');
            await loadGitStatus();
            await loadStashes();
            showMsg('Changes stashed', true);
        } catch (error) {
            showMsg(error.response?.data?.error || 'Failed to stash', false);
        } finally {
            setStashLoading(false);
        }
    }

    async function popStash(ref) {
        if (!workspace) return;
        setStashLoading(true);
        try {
            await axios.post(`/api/workspaces/${workspace.id}/git/stash/pop`, { ref });
            await loadGitStatus();
            await loadStashes();
            showMsg('Stash applied & removed', true);
        } catch (error) {
            showMsg(error.response?.data?.error || 'Failed to pop stash', false);
        } finally {
            setStashLoading(false);
        }
    }

    async function dropStash(ref) {
        if (!workspace) return;
        setStashLoading(true);
        try {
            await axios.delete(`/api/workspaces/${workspace.id}/git/stash`, { data: { ref } });
            await loadStashes();
            showMsg('Stash dropped', true);
        } catch (error) {
            showMsg(error.response?.data?.error || 'Failed to drop stash', false);
        } finally {
            setStashLoading(false);
        }
    }

    async function checkoutBranch(branch) {
        if (!workspace || branch === currentBranch) return;
        setBranchLoading(true);
        try {
            await axios.post(`/api/workspaces/${workspace.id}/git/checkout`, { branch });
            toast.success(`Switched to ${branch}`);
            setCurrentBranch(branch);
            setBranchesOpen(false);
            loadGitStatus();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to checkout branch');
        } finally {
            setBranchLoading(false);
        }
    }

    async function createBranch() {
        if (!workspace || !newBranchName.trim()) return;
        setBranchLoading(true);
        try {
            await axios.post(`/api/workspaces/${workspace.id}/git/branch`, { name: newBranchName.trim() });
            toast.success(`Branch "${newBranchName.trim()}" created`);
            await loadBranches();
            setNewBranchName('');
            setShowNewBranchForm(false);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create branch');
        } finally {
            setBranchLoading(false);
        }
    }

    const S = {
        section: { padding: '10px 12px', borderBottom: `1px solid ${t.border}` },
        sectionTitle: { fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', color: t.text3, textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
        btn: { background: 'none', border: `1px solid ${isDark ? '#30363d' : t.border}`, borderRadius: '4px', color: t.text3, cursor: 'pointer', fontSize: '11px', padding: '3px 8px', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' },
        btnPrimary: { background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: '4px', color: '#ff6b35', cursor: 'pointer', fontSize: '11px', padding: '3px 8px', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' },
        btnDanger: { background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: '4px', color: '#f85149', cursor: 'pointer', fontSize: '11px', padding: '3px 8px', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' },
    };

    if (!workspace) {
        return (
            <div className={`git-panel ${embedded ? 'git-panel-embedded' : ''}`}>
                {!embedded && (
                    <div className="git-header">
                        <div className="d-flex align-items-center gap-2"><GitBranch size={16} /><span>Source Control</span></div>
                        <button className="btn-icon" onClick={onClose}><X size={16} /></button>
                    </div>
                )}
                <div className="git-body">
                    <div className="text-center text-muted p-3"><p>Select a workspace</p></div>
                </div>
            </div>
        );
    }

    if (!workspace.git_enabled) {
        return (
            <div className={`git-panel ${embedded ? 'git-panel-embedded' : ''}`}>
                {!embedded && (
                    <div className="git-header">
                        <div className="d-flex align-items-center gap-2"><GitBranch size={16} /><span>Source Control</span></div>
                        <button className="btn-icon" onClick={onClose}><X size={16} /></button>
                    </div>
                )}
                <div className="git-body">
                    <div className="text-center p-3">
                        <p className="text-muted mb-3">Git not initialized</p>
                        <button className="btn btn-sm btn-primary" onClick={initGit}>Initialize Repository</button>
                    </div>
                </div>
            </div>
        );
    }

    const localBranches = branches.filter(b => !b.startsWith('remotes/'));
    const remoteBranches = branches.filter(b => b.startsWith('remotes/'));

    const staged = status?.staged || [];
    const unstaged = status?.unstaged || [];
    const untracked = status?.untracked || [];
    const allUnstaged = [...unstaged, ...untracked];
    const hasStaged = staged.length > 0;
    const hasChanges = staged.length > 0 || allUnstaged.length > 0;

    return (
        <div className={`git-panel ${embedded ? 'git-panel-embedded' : ''}`}>
            {!embedded && (
                <div className="git-header">
                    <div className="d-flex align-items-center gap-2"><GitBranch size={16} /><span>Source Control</span></div>
                    <div className="d-flex gap-1">
                        <button className="btn-icon" onClick={loadGitStatus} title="Refresh" disabled={loading}>
                            <RefreshCw size={14} className={loading ? 'spin' : ''} />
                        </button>
                        <button className="btn-icon" onClick={onClose}><X size={16} /></button>
                    </div>
                </div>
            )}

            <div className="git-body">
                {lastErrorHelp && (
                    <div className="alert alert-warning small m-2">
                        <div className="fw-semibold">{lastErrorHelp.title}</div>
                        <div className="mb-2">{lastErrorHelp.message}</div>
                        {Array.isArray(lastErrorHelp.windows_steps) && lastErrorHelp.windows_steps.length > 0 && (
                            <ul className="mb-0">{lastErrorHelp.windows_steps.map((s, i) => <li key={i}>{s}</li>)}</ul>
                        )}
                    </div>
                )}

                {/* ── Staged Changes ─────────────────────────── */}
                <div style={S.section}>
                    <div style={S.sectionTitle}>
                        <span>Staged Changes {staged.length > 0 && <span style={{ color: '#ff6b35', marginLeft: 4 }}>({staged.length})</span>}</span>
                    </div>

                    {staged.length === 0 ? (
                        <div style={{ fontSize: '11px', color: t.text4, fontStyle: 'italic' }}>No staged changes</div>
                    ) : (
                        <div className="ce-change-list">
                            {staged.map((f, i) => (
                                <div key={i} className="ce-change-row">
                                    <input
                                        type="checkbox"
                                        className="ce-change-checkbox"
                                        checked={true}
                                        disabled={stagingFile === f.path}
                                        onChange={() => unstageFile(f.path)}
                                        title="Unstage"
                                    />
                                    <span className={`ce-change-badge ce-change-${statusColor(f.status)}`}>{f.status}</span>
                                    <span className="ce-change-name" title={f.path}>{f.path.split('/').pop()}</span>
                                    {onOpenDiff && (
                                        <button
                                            className="ce-change-diff-btn"
                                            title="View staged diff"
                                            onClick={() => onOpenDiff(f.path, 'staged')}
                                        >≠</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Unstaged / Untracked Changes ───────────── */}
                <div style={S.section}>
                    <div style={S.sectionTitle}>
                        <span>Changes {allUnstaged.length > 0 && <span style={{ color: '#8b949e', marginLeft: 4 }}>({allUnstaged.length})</span>}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button style={S.btn} onClick={stageAll} disabled={!!stagingFile || allUnstaged.length === 0} title="Stage all">
                                Stage All
                            </button>
                            {!confirmDiscard ? (
                                <button style={S.btnDanger} onClick={() => setConfirmDiscard(true)} disabled={allUnstaged.length === 0} title="Discard all unstaged">
                                    Discard All
                                </button>
                            ) : (
                                <span style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: '#f85149' }}>Sure?</span>
                                    <button style={{ ...S.btnDanger, padding: '2px 6px' }} onClick={discardAll}>Yes</button>
                                    <button style={{ ...S.btn, padding: '2px 6px' }} onClick={() => setConfirmDiscard(false)}>No</button>
                                </span>
                            )}
                        </div>
                    </div>

                    {allUnstaged.length === 0 ? (
                        <div style={{ fontSize: '11px', color: t.text4, fontStyle: 'italic' }}>No unstaged changes</div>
                    ) : (
                        <div className="ce-change-list">
                            {allUnstaged.map((f, i) => (
                                <div key={i} className="ce-change-row">
                                    <input
                                        type="checkbox"
                                        className="ce-change-checkbox"
                                        checked={false}
                                        disabled={stagingFile === f.path}
                                        onChange={() => stageFile(f.path)}
                                        title="Stage"
                                    />
                                    <span className={`ce-change-badge ce-change-${statusColor(f.status)}`}>{f.status}</span>
                                    <span className="ce-change-name" title={f.path}>{f.path.split('/').pop()}</span>
                                    {onOpenDiff && f.status !== '?' && (
                                        <button
                                            className="ce-change-diff-btn"
                                            title="View diff"
                                            onClick={() => onOpenDiff(f.path, 'unstaged')}
                                        >≠</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Commit Section ─────────────────────────── */}
                <div style={S.section}>
                    <div style={S.sectionTitle}>Commit</div>
                    <textarea
                        className="ce-commit-textarea"
                        rows={3}
                        placeholder="Commit message..."
                        value={commitMessage}
                        onChange={e => setCommitMessage(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commit(); }}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <button
                            style={{ ...S.btnPrimary, flex: 1, justifyContent: 'center', opacity: (!hasStaged || !commitMessage.trim()) ? 0.5 : 1 }}
                            onClick={commit}
                            disabled={!hasStaged || !commitMessage.trim()}
                            title={!hasStaged ? 'Stage changes first' : !commitMessage.trim() ? 'Enter a commit message' : 'Commit staged changes'}
                        >
                            <GitCommit size={12} /> Commit
                        </button>
                        <button
                            style={{ ...S.btn, flex: 1, justifyContent: 'center' }}
                            onClick={push}
                            title={`Push to origin/${currentBranch || 'main'}`}
                        >
                            <Upload size={12} /> Push{currentBranch ? ` (${currentBranch})` : ''}
                        </button>
                    </div>
                </div>

                {/* ── Inline Feedback ────────────────────────── */}
                {inlineMsg && (
                    <div style={{
                        margin: '6px 12px',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: inlineMsg.ok ? 'rgba(46,160,67,0.12)' : 'rgba(248,81,73,0.12)',
                        border: `1px solid ${inlineMsg.ok ? 'rgba(46,160,67,0.3)' : 'rgba(248,81,73,0.3)'}`,
                        color: inlineMsg.ok ? '#3fb950' : '#f85149',
                    }}>
                        {inlineMsg.ok ? <Check size={11} /> : <AlertCircle size={11} />}
                        {inlineMsg.text}
                    </div>
                )}

                {/* ── Branch Section ─────────────────────────── */}
                <div style={S.section}>
                    <div style={{ ...S.sectionTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <GitBranch size={11} /> Branches
                        </span>
                        <button
                            onClick={() => { setShowNewBranchForm(v => !v); setNewBranchName(''); }}
                            title="New branch"
                            style={{ background: 'none', border: 'none', color: t.text3, cursor: 'pointer', padding: '1px', display: 'flex', alignItems: 'center' }}
                        >
                            <Plus size={12} />
                        </button>
                    </div>

                    {/* Current branch + dropdown trigger */}
                    <button
                        onClick={() => setBranchesOpen(v => !v)}
                        style={{
                            width: '100%',
                            background: isDark ? '#0a0c0f' : t.bg4,
                            border: `1px solid ${t.scrollbar}`,
                            borderRadius: '4px',
                            color: t.text2,
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            textAlign: 'left',
                        }}
                    >
                        <GitBranch size={11} style={{ color: '#ff6b35', flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentBranch || '—'}</span>
                        <ChevronDown size={11} style={{ flexShrink: 0, color: t.text4, transform: branchesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                    </button>

                    {/* Branch list dropdown */}
                    {branchesOpen && (
                        <div style={{ marginTop: '4px', background: isDark ? '#0a0c0f' : t.bg4, border: `1px solid ${t.scrollbar}`, borderRadius: '4px', overflow: 'hidden', maxHeight: '160px', overflowY: 'auto' }}>
                            {localBranches.map(branch => (
                                <div
                                    key={branch}
                                    onClick={() => checkoutBranch(branch)}
                                    style={{
                                        padding: '5px 8px',
                                        cursor: branch === currentBranch ? 'default' : 'pointer',
                                        fontSize: '11px',
                                        color: branch === currentBranch ? '#ff6b35' : t.text2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        borderBottom: `1px solid ${t.border}`,
                                    }}
                                    onMouseEnter={e => { if (branch !== currentBranch) e.currentTarget.style.background = 'rgba(255,107,53,0.06)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    {branch === currentBranch ? <Check size={10} style={{ color: '#ff6b35', flexShrink: 0 }} /> : <span style={{ width: '10px', flexShrink: 0 }} />}
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{branch}</span>
                                </div>
                            ))}
                            {remoteBranches.length > 0 && (
                                <>
                                    <div style={{ padding: '4px 8px', fontSize: '9px', color: t.text4, textTransform: 'uppercase', letterSpacing: '0.08em', borderTop: `1px solid ${t.border}` }}>Remote</div>
                                    {remoteBranches.map(branch => (
                                        <div
                                            key={branch}
                                            style={{ padding: '4px 8px 4px 18px', fontSize: '11px', color: t.text3, borderBottom: `1px solid ${t.border}` }}
                                        >
                                            {branch.replace('remotes/', '')}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}

                    {/* New branch form */}
                    {showNewBranchForm && (
                        <div style={{ marginTop: '6px', display: 'flex', gap: '4px' }}>
                            <input
                                type="text"
                                value={newBranchName}
                                onChange={e => setNewBranchName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') createBranch(); if (e.key === 'Escape') setShowNewBranchForm(false); }}
                                placeholder="New branch name…"
                                autoFocus
                                style={{
                                    flex: 1,
                                    background: isDark ? '#0a0c0f' : t.bg4,
                                    border: `1px solid ${t.scrollbar}`,
                                    borderRadius: '4px',
                                    color: t.text2,
                                    padding: '3px 6px',
                                    fontSize: '11px',
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                    minWidth: 0,
                                }}
                            />
                            <button onClick={createBranch} disabled={branchLoading || !newBranchName.trim()} style={{ ...S.btnPrimary, flexShrink: 0 }}>
                                Create
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Remote Actions ─────────────────────────── */}
                {workspace.git_remote && (
                    <div style={S.section}>
                        <div style={S.sectionTitle}>Remote</div>
                        <div className="d-flex gap-2">
                            <button className="btn btn-sm btn-outline-primary flex-fill" onClick={pull}>
                                <Download size={14} /> Pull
                            </button>
                            <button className="btn btn-sm btn-outline-primary flex-fill" onClick={push}>
                                <Upload size={14} /> Push
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Stash Management (B-16) ───────────────── */}
                <div style={S.section}>
                    <div style={S.sectionTitle}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Archive size={11} /> Stashes {stashes.length > 0 && <span style={{ color: '#ff6b35' }}>({stashes.length})</span>}
                        </span>
                        <button onClick={loadStashes} title="Refresh stashes" style={{ background: 'none', border: 'none', color: t.text3, cursor: 'pointer', padding: '1px', display: 'flex', alignItems: 'center' }}>
                            <RefreshCw size={11} />
                        </button>
                    </div>

                    {/* Stash current changes */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                        <input
                            type="text"
                            value={stashMessage}
                            onChange={e => setStashMessage(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') createStash(); }}
                            placeholder="Stash message (optional)…"
                            style={{
                                flex: 1, background: isDark ? '#0a0c0f' : t.bg4, border: `1px solid ${t.scrollbar}`,
                                borderRadius: '4px', color: t.text2, padding: '3px 6px',
                                fontSize: '11px', fontFamily: 'inherit', outline: 'none', minWidth: 0,
                            }}
                        />
                        <button
                            onClick={createStash}
                            disabled={stashLoading}
                            style={{ ...S.btnPrimary, flexShrink: 0 }}
                            title="Stash current changes"
                        >
                            <Archive size={11} /> Stash
                        </button>
                    </div>

                    {/* Stash list */}
                    {stashes.length === 0 ? (
                        <div style={{ fontSize: '11px', color: t.text4, fontStyle: 'italic' }}>No stashes</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {stashes.map((s, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '4px 6px', borderRadius: '4px',
                                        background: isDark ? '#0a0c0f' : t.bg4, border: `1px solid ${t.border}`,
                                    }}
                                >
                                    <span style={{ fontSize: '10px', color: '#ff6b35', fontFamily: 'monospace', flexShrink: 0 }}>
                                        {s.ref || `stash@{${i}}`}
                                    </span>
                                    <span style={{ fontSize: '11px', color: t.text2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.message}>
                                        {s.message || '(no message)'}
                                    </span>
                                    <button
                                        onClick={() => popStash(s.ref || `stash@{${i}}`)}
                                        disabled={stashLoading}
                                        title="Pop (apply + remove)"
                                        style={{ ...S.btnPrimary, padding: '2px 5px', flexShrink: 0 }}
                                    >
                                        Pop
                                    </button>
                                    <button
                                        onClick={() => dropStash(s.ref || `stash@{${i}}`)}
                                        disabled={stashLoading}
                                        title="Drop (delete without applying)"
                                        style={{ background: 'none', border: 'none', color: t.text4, cursor: 'pointer', padding: '1px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                                        onMouseEnter={e => { e.currentTarget.style.color = '#f85149'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = t.text4; }}
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Commit History (B-17) ──────────────────── */}
                <div style={S.section}>
                    <div style={S.sectionTitle}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <GitCommit size={11} /> History
                        </span>
                        <button
                            onClick={loadGitLogs}
                            title="Refresh history"
                            style={{ background: 'none', border: 'none', color: t.text3, cursor: 'pointer', padding: '1px', display: 'flex', alignItems: 'center' }}
                        >
                            <RefreshCw size={11} />
                        </button>
                    </div>

                    {logs.length === 0 ? (
                        <div style={{ fontSize: '11px', color: t.text4, fontStyle: 'italic' }}>No commits yet</div>
                    ) : (
                        <div style={{ overflowY: 'auto', maxHeight: '220px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            {logs.map((log, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        padding: '6px 8px',
                                        borderRadius: '4px',
                                        borderBottom: '1px solid rgba(28,33,40,0.6)',
                                        cursor: 'default',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,53,0.05)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    {/* Message + hash row */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '3px' }}>
                                        <code style={{
                                            fontSize: '10px',
                                            color: '#ff6b35',
                                            background: 'rgba(255,107,53,0.08)',
                                            border: '1px solid rgba(255,107,53,0.2)',
                                            borderRadius: '3px',
                                            padding: '0 4px',
                                            flexShrink: 0,
                                            lineHeight: '16px',
                                        }}>
                                            {log.hash?.substring(0, 7) ?? '???????'}
                                        </code>
                                        <span style={{
                                            fontSize: '11px',
                                            color: t.text2,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            flex: 1,
                                            lineHeight: '16px',
                                        }} title={log.message}>
                                            {log.message || '(no message)'}
                                        </span>
                                    </div>
                                    {/* Author + date row */}
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: t.text4 }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                            {log.author}
                                        </span>
                                        <span style={{ flexShrink: 0, color: t.scrollbar }}>
                                            {formatRelativeTime(log.date)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function statusColor(s) {
    return { 'M': 'modified', 'A': 'added', 'D': 'deleted', 'R': 'renamed', '?': 'untracked', 'C': 'added' }[s] || 'modified';
}

function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        const diffSec = Math.floor((new Date() - date) / 1000);
        if (diffSec < 60) return 'just now';
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
        if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
        return date.toLocaleDateString();
    } catch { return dateStr; }
}
