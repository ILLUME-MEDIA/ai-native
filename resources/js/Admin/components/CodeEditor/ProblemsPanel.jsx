import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';

// Severity constants matching Monaco marker severity
const SEVERITY = {
    HINT: 1,
    INFO: 2,
    WARNING: 4,
    ERROR: 8,
};

function groupMarkersByFile(markers) {
    const grouped = {};
    for (const marker of markers) {
        const uri = marker.resource?.toString?.() || marker.resource || 'unknown';
        // Extract just the path portion from the URI
        let path = uri;
        try {
            const url = new URL(uri);
            path = url.pathname.replace(/^\//, '');
        } catch {
            // not a valid URL, use as-is
        }
        if (!grouped[path]) {
            grouped[path] = { path, filename: path.split('/').pop(), markers: [] };
        }
        grouped[path].markers.push(marker);
    }
    return Object.values(grouped);
}

function SeverityIcon({ severity, size = 13 }) {
    if (severity >= SEVERITY.ERROR) {
        return <AlertCircle size={size} style={{ color: '#f85149', flexShrink: 0 }} />;
    }
    if (severity >= SEVERITY.WARNING) {
        return <AlertTriangle size={size} style={{ color: '#d29922', flexShrink: 0 }} />;
    }
    if (severity >= SEVERITY.INFO) {
        return <Info size={size} style={{ color: '#58a6ff', flexShrink: 0 }} />;
    }
    return <Info size={size} style={{ color: '#484f58', flexShrink: 0 }} />;
}

export default function ProblemsPanel({ tabs, monacoEditorRef, onJumpToFile }) {
    const [markers, setMarkers] = useState([]);
    const [filterErrors, setFilterErrors] = useState(true);
    const [filterWarnings, setFilterWarnings] = useState(true);

    const refreshMarkers = useCallback(() => {
        if (!window.monaco) return;
        try {
            const all = window.monaco.editor.getModelMarkers({});
            setMarkers(all);
        } catch {
            // monaco not ready
        }
    }, []);

    useEffect(() => {
        if (!window.monaco) return;

        // Initial load
        refreshMarkers();

        // Listen for marker changes
        let disposable;
        try {
            disposable = window.monaco.editor.onDidChangeMarkers(() => {
                refreshMarkers();
            });
        } catch {
            // ignore if monaco not ready
        }

        return () => {
            disposable?.dispose?.();
        };
    }, [refreshMarkers]);

    // Also refresh when tabs change (new files opened)
    useEffect(() => {
        const t = setTimeout(refreshMarkers, 500);
        return () => clearTimeout(t);
    }, [tabs, refreshMarkers]);

    const errorCount = markers.filter(m => m.severity >= SEVERITY.ERROR).length;
    const warningCount = markers.filter(m => m.severity >= SEVERITY.WARNING && m.severity < SEVERITY.ERROR).length;

    const filteredMarkers = markers.filter(m => {
        if (m.severity >= SEVERITY.ERROR) return filterErrors;
        if (m.severity >= SEVERITY.WARNING) return filterWarnings;
        return true; // always show hints/info
    });

    const groupedFiles = groupMarkersByFile(filteredMarkers);
    const totalVisible = filteredMarkers.length;

    return (
        <div className="ce-problems-panel">
            {/* Header */}
            <div className="ce-problems-header">
                <span className="ce-problems-title">PROBLEMS</span>
                {totalVisible > 0 && (
                    <span className="ce-problems-count-badge">{totalVisible}</span>
                )}
                <button
                    className="ce-problems-refresh-btn"
                    onClick={refreshMarkers}
                    title="Refresh"
                >
                    <RefreshCw size={11} />
                </button>
            </div>

            {/* Filter row */}
            <div className="ce-problems-filters">
                <button
                    className={`ce-problems-filter-chip ${filterErrors ? 'active error' : ''}`}
                    onClick={() => setFilterErrors(v => !v)}
                    title={filterErrors ? 'Hide errors' : 'Show errors'}
                >
                    <AlertCircle size={10} />
                    Errors ({errorCount})
                </button>
                <button
                    className={`ce-problems-filter-chip ${filterWarnings ? 'active warning' : ''}`}
                    onClick={() => setFilterWarnings(v => !v)}
                    title={filterWarnings ? 'Hide warnings' : 'Show warnings'}
                >
                    <AlertTriangle size={10} />
                    Warnings ({warningCount})
                </button>
            </div>

            {/* Content */}
            <div className="ce-problems-list">
                {totalVisible === 0 ? (
                    <div className="ce-problems-empty">
                        <CheckCircle size={24} style={{ color: '#3fb950' }} />
                        <span>No problems detected</span>
                    </div>
                ) : (
                    groupedFiles.map((group) => {
                        const fileErrors = group.markers.filter(m => m.severity >= SEVERITY.ERROR).length;
                        const fileWarnings = group.markers.filter(m => m.severity >= SEVERITY.WARNING && m.severity < SEVERITY.ERROR).length;

                        return (
                            <div key={group.path} className="ce-problem-file-group">
                                <div className="ce-problem-file-header">
                                    <span className="ce-problem-file-icon">📄</span>
                                    <span className="ce-problem-file-name" title={group.path}>{group.filename}</span>
                                    <span className="ce-problem-file-path" title={group.path}>{group.path}</span>
                                    <span className="ce-problem-file-counts">
                                        {fileErrors > 0 && (
                                            <span className="ce-problem-file-count error">
                                                <AlertCircle size={10} /> {fileErrors}
                                            </span>
                                        )}
                                        {fileWarnings > 0 && (
                                            <span className="ce-problem-file-count warning">
                                                <AlertTriangle size={10} /> {fileWarnings}
                                            </span>
                                        )}
                                    </span>
                                </div>

                                {group.markers.map((marker, idx) => (
                                    <div
                                        key={idx}
                                        className={`ce-problem-row ce-problem-severity-${getSeverityClass(marker.severity)}`}
                                        onClick={() => onJumpToFile?.(group.path, marker.startLineNumber)}
                                        title={`${marker.message} (${group.filename}:${marker.startLineNumber}:${marker.startColumn})`}
                                    >
                                        <SeverityIcon severity={marker.severity} />
                                        <span className="ce-problem-message">{marker.message}</span>
                                        <span className="ce-problem-location">
                                            {marker.startLineNumber}:{marker.startColumn}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function getSeverityClass(severity) {
    if (severity >= SEVERITY.ERROR) return 'error';
    if (severity >= SEVERITY.WARNING) return 'warning';
    if (severity >= SEVERITY.INFO) return 'info';
    return 'hint';
}
