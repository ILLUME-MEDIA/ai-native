import React from 'react';
import { X, Eye, Terminal as TerminalIcon } from 'lucide-react';

export default function EditorTabs({
    tabs,
    activeTab,
    onTabSelect,
    onTabClose,
    showPreviewTab = true,
    activeCenterView = 'code', // 'code' | 'preview'
    onPreviewSelect,
    showTerminalButton = true,
    terminalOpen = false,
    onToggleTerminal,
}) {
    return (
        <div className="editor-tabs">
            {tabs.map((tab, index) => (
                <div
                    key={`${tab.path}-${index}`}
                    className={`editor-tab ${activeTab?.path === tab.path ? 'active' : ''}`}
                    onClick={() => onTabSelect(tab)}
                >
                    <span className="tab-icon">
                        {getFileIcon(tab.extension)}
                    </span>
                    <span className="tab-name">
                        {tab.name}
                        {tab.unsaved && <span className="unsaved-indicator">●</span>}
                    </span>
                    <button
                        className="tab-close"
                        onClick={(e) => {
                            e.stopPropagation();
                            onTabClose(tab);
                        }}
                        title="Close"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}

            {showPreviewTab && (
                <div
                    className={`editor-tab ${activeCenterView === 'preview' ? 'active' : ''}`}
                    onClick={() => onPreviewSelect?.()}
                    title="Preview"
                >
                    <span className="tab-icon">
                        <Eye size={14} />
                    </span>
                    <span className="tab-name">Preview</span>
                </div>
            )}

            <div className="editor-tabs-actions">
                {showTerminalButton && (
                    <button
                        type="button"
                        className={`editor-tab-action ${terminalOpen ? 'active' : ''}`}
                        onClick={() => onToggleTerminal?.()}
                        title={terminalOpen ? 'Hide Terminal' : 'Show Terminal'}
                    >
                        <TerminalIcon size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}

function getFileIcon(extension) {
    const iconMap = {
        'php': '🐘',
        'js': '📜',
        'jsx': '⚛️',
        'ts': '📘',
        'tsx': '⚛️',
        'css': '🎨',
        'scss': '🎨',
        'html': '🌐',
        'json': '📋',
        'md': '📝',
        'sql': '🗄️',
        'py': '🐍',
        'rb': '💎',
        'java': '☕',
        'go': '🔵',
    };

    return iconMap[extension] || '📄';
}
