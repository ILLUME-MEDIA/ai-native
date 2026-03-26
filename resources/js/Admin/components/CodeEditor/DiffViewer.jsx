import React, { useState, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import axios from 'axios';
import { X, GitCompare } from 'lucide-react';

const LANG_MAP = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    php: 'php', py: 'python', rb: 'ruby', java: 'java', go: 'go', rs: 'rust',
    css: 'css', scss: 'scss', html: 'html', json: 'json', md: 'markdown',
    yaml: 'yaml', yml: 'yaml', xml: 'xml', sh: 'shell', bash: 'shell',
};

function detectLanguage(filePath) {
    const ext = filePath?.split('.').pop()?.toLowerCase();
    return LANG_MAP[ext] || 'plaintext';
}

function reconstructOriginal(modifiedContent, hunks) {
    if (!hunks || hunks.length === 0) return modifiedContent;
    const modLines = modifiedContent.split('\n');
    const result = [];
    let modIdx = 0;

    for (const hunk of hunks) {
        const hunkNewStart = hunk.new_start - 1; // 0-indexed
        while (modIdx < hunkNewStart) {
            result.push(modLines[modIdx]);
            modIdx++;
        }
        for (const line of hunk.lines) {
            if (line.type === 'context') {
                result.push(line.content);
                modIdx++;
            } else if (line.type === 'removed') {
                result.push(line.content);
            } else if (line.type === 'added') {
                modIdx++;
            }
        }
    }
    while (modIdx < modLines.length) {
        result.push(modLines[modIdx]);
        modIdx++;
    }
    return result.join('\n');
}

/**
 * DiffViewer — two modes:
 *  1. Git diff:   props { workspace, file, type, commitHash, onClose }
 *  2. File compare: props { workspace, fileA, fileB, onClose }
 */
export default function DiffViewer({ workspace, file, type = 'unstaged', commitHash, fileA, fileB, onClose }) {
    const [originalContent, setOriginalContent] = useState('');
    const [modifiedContent, setModifiedContent] = useState('');
    const [diffInfo, setDiffInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [splitView, setSplitView] = useState(true);

    const compareMode = !!(fileA && fileB);

    useEffect(() => {
        if (!workspace) return;
        if (compareMode) loadFileCompare();
        else if (file) loadDiff();
    }, [workspace?.id, file, type, commitHash, fileA, fileB]);

    async function loadFileCompare() {
        setLoading(true);
        setError(null);
        try {
            const [respA, respB] = await Promise.all([
                axios.get(`/api/workspaces/${workspace.id}/files/read`, { params: { path: fileA } }),
                axios.get(`/api/workspaces/${workspace.id}/files/read`, { params: { path: fileB } }),
            ]);
            setOriginalContent(respA.data.content || '');
            setModifiedContent(respB.data.content || '');
            setDiffInfo(null);
        } catch {
            setError('Failed to load files for comparison');
        } finally {
            setLoading(false);
        }
    }

    async function loadDiff() {
        setLoading(true);
        setError(null);
        try {
            const params = { file };
            if (type === 'staged') params.staged = 1;
            if (type === 'commit' && commitHash) params.commit = commitHash;

            const [diffResponse, fileResponse] = await Promise.all([
                axios.get(`/api/workspaces/${workspace.id}/git/diff-parsed`, { params }),
                axios.get(`/api/workspaces/${workspace.id}/files/read`, { params: { path: file } }),
            ]);

            const currentContent = fileResponse.data.content || '';
            setModifiedContent(currentContent);

            const files = diffResponse.data.files || [];
            const fileData = files.find(f =>
                f.file === file || file.endsWith(f.file) || f.file.endsWith(file)
            ) || files[0] || null;

            setDiffInfo(fileData);
            if (fileData) {
                setOriginalContent(reconstructOriginal(currentContent, fileData.hunks || []));
            } else {
                setOriginalContent(currentContent);
            }
        } catch {
            setError('Failed to load diff');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#161b22', color: '#8b949e', fontSize: '12px' }}>
                Loading diff…
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#161b22', color: '#8b949e', fontSize: '12px', gap: '8px' }}>
                <span>{error}</span>
                <button onClick={onClose} style={{ background: 'none', border: '1px solid #30363d', color: '#8b949e', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit' }}>
                    Back to editor
                </button>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#161b22' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 12px',
                background: '#0d0f14',
                borderBottom: '1px solid #1c2128',
                flexShrink: 0,
                height: '36px',
            }}>
                <GitCompare size={13} style={{ color: '#8b949e', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#c9d1d9', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {compareMode
                        ? <>{fileA?.split('/').pop()} <span style={{ color: '#484f58' }}>↔</span> {fileB?.split('/').pop()}</>
                        : file}
                </span>
                {diffInfo && (
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '10px', color: '#3fb950', background: 'rgba(63,185,80,0.12)', borderRadius: '3px', padding: '1px 5px' }}>+{diffInfo.additions}</span>
                        <span style={{ fontSize: '10px', color: '#f85149', background: 'rgba(248,81,73,0.12)', borderRadius: '3px', padding: '1px 5px' }}>-{diffInfo.deletions}</span>
                    </div>
                )}
                <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                    {[{ label: 'Split', value: true }, { label: 'Inline', value: false }].map(({ label, value }) => (
                        <button
                            key={label}
                            onClick={() => setSplitView(value)}
                            style={{
                                background: splitView === value ? 'rgba(255,107,53,0.15)' : 'transparent',
                                border: splitView === value ? '1px solid rgba(255,107,53,0.4)' : '1px solid #30363d',
                                borderRadius: '3px',
                                color: splitView === value ? '#ff6b35' : '#8b949e',
                                fontSize: '10px',
                                padding: '2px 7px',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={onClose}
                    title="Back to code"
                    style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                >
                    <X size={14} />
                </button>
            </div>

            {/* Diff Editor */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <DiffEditor
                    height="100%"
                    language={detectLanguage(compareMode ? fileA : file)}
                    original={originalContent}
                    modified={modifiedContent}
                    theme="vs-dark"
                    options={{
                        readOnly: true,
                        renderSideBySide: splitView,
                        minimap: { enabled: false },
                        fontSize: 13,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        wordWrap: 'off',
                        renderOverviewRuler: false,
                        lineNumbers: 'on',
                    }}
                />
            </div>
        </div>
    );
}
