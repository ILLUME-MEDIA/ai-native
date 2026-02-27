import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { Search, ChevronRight, ChevronDown } from 'lucide-react';
import { useCodeEditorTheme } from './useCodeEditorTheme';

export default function SearchPanel({ workspace, onResultClick, isDark: _isDark }) {
    const { isDark: ctxDark, tokens: t } = useCodeEditorTheme();
    const isDark = _isDark !== undefined ? _isDark : ctxDark;
    const [query, setQuery] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [useRegex, setUseRegex] = useState(false);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [expandedFiles, setExpandedFiles] = useState({});
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
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text4, fontSize: '12px' }}>
                Select a workspace to search
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '10px 12px 6px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
                <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', color: t.text3, marginBottom: '8px', textTransform: 'uppercase' }}>
                    Search
                </div>
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        value={query}
                        onChange={handleQueryChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Search files..."
                        autoComplete="off"
                        style={{
                            width: '100%',
                            background: isDark ? '#0a0c0f' : '#ffffff',
                            border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
                            borderRadius: '4px',
                            color: t.text2,
                            padding: '5px 8px 5px 28px',
                            fontSize: '12px',
                            fontFamily: 'inherit',
                            outline: 'none',
                        }}
                    />
                    <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: t.text4, pointerEvents: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    {[
                        { key: 'case', label: 'Aa', active: caseSensitive, title: 'Match Case', toggle: () => setCaseSensitive(v => { const n = !v; doSearch(query, n, useRegex); return n; }) },
                        { key: 'regex', label: '.*', active: useRegex, title: 'Use Regex', toggle: () => setUseRegex(v => { const n = !v; doSearch(query, caseSensitive, n); return n; }) },
                    ].map(({ key, label, active, title, toggle }) => (
                        <button
                            key={key}
                            onClick={toggle}
                            title={title}
                            style={{
                                background: active ? t.accentBg : 'transparent',
                                border: active ? `1px solid ${t.accentBorder}` : `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
                                borderRadius: '3px',
                                color: active ? t.accent : t.text3,
                                fontSize: '10px',
                                fontWeight: '600',
                                padding: '2px 6px',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results summary */}
            {(searched || loading) && (
                <div style={{ padding: '5px 12px', fontSize: '10px', color: t.text3, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
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
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                cursor: 'pointer',
                                background: t.bg2,
                                borderBottom: `1px solid ${t.border}`,
                                fontSize: '11px',
                                color: t.text2,
                                userSelect: 'none',
                            }}
                        >
                            {isExpanded(file) ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file}>{file}</span>
                            <span style={{ background: isDark ? '#30363d' : '#eaeef2', borderRadius: '8px', padding: '0 5px', fontSize: '9px', color: t.text3, flexShrink: 0 }}>
                                {fileResults.length}
                            </span>
                        </div>
                        {isExpanded(file) && fileResults.map((r, idx) => (
                            <div
                                key={idx}
                                onClick={() => onResultClick && onResultClick(r.file, r.line)}
                                style={{
                                    padding: '3px 10px 3px 22px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'baseline',
                                    borderBottom: `1px solid ${isDark ? 'rgba(28,33,40,0.4)' : 'rgba(208,215,222,0.4)'}`,
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = t.accentBg}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ color: t.text4, flexShrink: 0, fontSize: '10px', minWidth: '28px' }}>L{r.line}</span>
                                <span style={{ color: t.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
