import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { Search, ChevronRight, ChevronDown, Replace, CheckCheck, Loader } from 'lucide-react';
import { toast } from 'react-toastify';

const btnStyle = (active) => ({
    background: active ? 'rgba(255,107,53,0.15)' : 'transparent',
    border: active ? '1px solid rgba(255,107,53,0.4)' : '1px solid #30363d',
    borderRadius: '3px',
    color: active ? '#ff6b35' : '#8b949e',
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    cursor: 'pointer',
    fontFamily: 'inherit',
});

const inputStyle = {
    width: '100%',
    background: '#0a0c0f',
    border: '1px solid #30363d',
    borderRadius: '4px',
    color: '#c9d1d9',
    padding: '5px 8px',
    fontSize: '12px',
    fontFamily: 'inherit',
    outline: 'none',
};

export default function SearchPanel({ workspace, onResultClick }) {
    const [query, setQuery]               = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [useRegex, setUseRegex]         = useState(false);
    const [results, setResults]           = useState([]);
    const [loading, setLoading]           = useState(false);
    const [searched, setSearched]         = useState(false);
    const [expandedFiles, setExpandedFiles] = useState({});

    // D-02: Replace mode
    const [replaceMode, setReplaceMode]   = useState(false);
    const [replaceText, setReplaceText]   = useState('');
    const [replacing, setReplacing]       = useState(false);

    const debounceRef = useRef(null);

    const doSearch = useCallback(async (q, cs, rx) => {
        if (!workspace || q.length < 2) {
            setResults([]);
            setSearched(false);
            return;
        }
        setLoading(true);
        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/files/search`, {
                params: { query: q, case_sensitive: cs ? 1 : 0, regex: rx ? 1 : 0 }
            });
            setResults(response.data.results || []);
            setSearched(true);
        } catch {
            setResults([]);
            setSearched(true);
        } finally {
            setLoading(false);
        }
    }, [workspace]);

    function handleQueryChange(e) {
        const q = e.target.value;
        setQuery(q);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(q, caseSensitive, useRegex), 400);
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter') {
            clearTimeout(debounceRef.current);
            doSearch(query, caseSensitive, useRegex);
        }
    }

    async function handleReplaceAll() {
        if (!query || replaceText === null || results.length === 0) return;
        setReplacing(true);
        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/files/replace`, {
                query,
                replace: replaceText,
                case_sensitive: caseSensitive,
                regex: useRegex,
            });
            const count = resp.data.replacements ?? 0;
            const files = resp.data.files_changed ?? 0;
            toast.success(`Replaced ${count} occurrence${count !== 1 ? 's' : ''} in ${files} file${files !== 1 ? 's' : ''}`);
            // Re-run search to show updated state
            await doSearch(query, caseSensitive, useRegex);
        } catch (e) {
            toast.error(e.response?.data?.error || 'Replace failed');
        } finally {
            setReplacing(false);
        }
    }

    async function handleReplaceFile(file) {
        if (!query) return;
        setReplacing(true);
        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/files/replace`, {
                query,
                replace: replaceText,
                case_sensitive: caseSensitive,
                regex: useRegex,
                files: [file],
            });
            const count = resp.data.replacements ?? 0;
            toast.success(`Replaced ${count} occurrence${count !== 1 ? 's' : ''} in ${file.split('/').pop()}`);
            await doSearch(query, caseSensitive, useRegex);
        } catch (e) {
            toast.error(e.response?.data?.error || 'Replace failed');
        } finally {
            setReplacing(false);
        }
    }

    const grouped = results.reduce((acc, r) => {
        if (!acc[r.file]) acc[r.file] = [];
        acc[r.file].push(r);
        return acc;
    }, {});

    function toggleFile(file) {
        setExpandedFiles(prev => ({ ...prev, [file]: prev[file] === false ? true : false }));
    }

    function isExpanded(file) {
        return expandedFiles[file] !== false;
    }

    function highlightMatch(content, match) {
        if (!match) return content;
        const idx = content.toLowerCase().indexOf(match.toLowerCase());
        if (idx === -1) return content;
        return (
            <>
                {content.substring(0, idx)}
                <span style={{ background: 'rgba(255,107,53,0.3)', color: '#ff6b35' }}>
                    {content.substring(idx, idx + match.length)}
                </span>
                {content.substring(idx + match.length)}
            </>
        );
    }

    const fileList = Object.entries(grouped);
    const totalResults = results.length;
    const totalFiles = fileList.length;

    if (!workspace) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484f58', fontSize: '12px' }}>
                Select a workspace to search
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid #1c2128', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', color: '#8b949e', textTransform: 'uppercase' }}>
                        Search
                    </span>
                    {/* D-02: Toggle replace mode */}
                    <button
                        onClick={() => setReplaceMode(v => !v)}
                        title="Toggle replace"
                        style={{ ...btnStyle(replaceMode), display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 7px' }}
                    >
                        <Replace size={10} /> Replace
                    </button>
                </div>

                {/* Search input */}
                <div style={{ position: 'relative', marginBottom: replaceMode ? '6px' : '0' }}>
                    <input
                        type="text"
                        value={query}
                        onChange={handleQueryChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Search files..."
                        autoComplete="off"
                        style={{ ...inputStyle, paddingLeft: '28px' }}
                    />
                    <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#484f58', pointerEvents: 'none' }} />
                </div>

                {/* Replace input (D-02) */}
                {replaceMode && (
                    <div style={{ position: 'relative', marginBottom: '6px' }}>
                        <input
                            type="text"
                            value={replaceText}
                            onChange={e => setReplaceText(e.target.value)}
                            placeholder="Replace with..."
                            autoComplete="off"
                            style={{ ...inputStyle, paddingLeft: '28px' }}
                        />
                        <Replace size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#484f58', pointerEvents: 'none' }} />
                    </div>
                )}

                {/* Flags row */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[
                        { key: 'case', label: 'Aa', active: caseSensitive, title: 'Match Case', toggle: () => setCaseSensitive(v => { const n = !v; doSearch(query, n, useRegex); return n; }) },
                        { key: 'regex', label: '.*', active: useRegex, title: 'Use Regex', toggle: () => setUseRegex(v => { const n = !v; doSearch(query, caseSensitive, n); return n; }) },
                    ].map(({ key, label, active, title, toggle }) => (
                        <button key={key} onClick={toggle} title={title} style={btnStyle(active)}>{label}</button>
                    ))}

                    {/* Replace All button */}
                    {replaceMode && totalResults > 0 && (
                        <button
                            onClick={handleReplaceAll}
                            disabled={replacing}
                            title={`Replace all ${totalResults} occurrences`}
                            style={{
                                marginLeft: 'auto',
                                display: 'flex', alignItems: 'center', gap: '3px',
                                background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)',
                                borderRadius: '3px', color: '#ff6b35', fontSize: '10px',
                                padding: '2px 7px', cursor: 'pointer', fontFamily: 'inherit',
                                opacity: replacing ? 0.6 : 1,
                            }}
                        >
                            {replacing ? <Loader size={9} /> : <CheckCheck size={9} />}
                            Replace All
                        </button>
                    )}
                </div>
            </div>

            {/* Results summary */}
            {(searched || loading) && (
                <div style={{ padding: '5px 12px', fontSize: '10px', color: '#8b949e', borderBottom: '1px solid #1c2128', flexShrink: 0 }}>
                    {loading
                        ? 'Searching…'
                        : totalResults === 0
                            ? 'No results'
                            : `${totalResults} result${totalResults !== 1 ? 's' : ''} in ${totalFiles} file${totalFiles !== 1 ? 's' : ''}`}
                </div>
            )}

            {/* Results list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {fileList.map(([file, fileResults]) => (
                    <div key={file}>
                        <div
                            onClick={() => toggleFile(file)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '5px 10px', cursor: 'pointer',
                                background: '#0d0f14', borderBottom: '1px solid #1c2128',
                                fontSize: '11px', color: '#c9d1d9', userSelect: 'none',
                            }}
                        >
                            {isExpanded(file) ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file}>{file}</span>
                            <span style={{ background: '#30363d', borderRadius: '8px', padding: '0 5px', fontSize: '9px', color: '#8b949e', flexShrink: 0 }}>
                                {fileResults.length}
                            </span>
                            {/* D-02: Replace in this file */}
                            {replaceMode && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleReplaceFile(file); }}
                                    disabled={replacing}
                                    title={`Replace in ${file.split('/').pop()}`}
                                    style={{ ...btnStyle(false), padding: '1px 5px', fontSize: '9px', marginLeft: '3px', flexShrink: 0, opacity: replacing ? 0.5 : 1 }}
                                >
                                    <Replace size={9} />
                                </button>
                            )}
                        </div>
                        {isExpanded(file) && fileResults.map((r, idx) => (
                            <div
                                key={idx}
                                onClick={() => onResultClick && onResultClick(r.file, r.line)}
                                style={{
                                    padding: '3px 10px 3px 22px',
                                    cursor: 'pointer', fontSize: '11px',
                                    display: 'flex', gap: '8px', alignItems: 'baseline',
                                    borderBottom: '1px solid rgba(28,33,40,0.4)',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,53,0.08)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ color: '#484f58', flexShrink: 0, fontSize: '10px', minWidth: '28px' }}>L{r.line}</span>
                                <span style={{ color: '#8b949e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {highlightMatch(r.content, r.match)}
                                </span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
