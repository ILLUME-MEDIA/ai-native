import React from 'react';
import { X } from 'lucide-react';

export default function EditorTabs({ tabs, activeTab, onTabSelect, onTabClose }) {
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
