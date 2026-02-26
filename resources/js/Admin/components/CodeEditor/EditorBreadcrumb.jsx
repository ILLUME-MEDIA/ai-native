import React from 'react';
import { ChevronRight } from 'lucide-react';

const EXT_COLORS = {
    js:   '#f0db4f', jsx:  '#61dafb',
    ts:   '#3178c6', tsx:  '#3178c6',
    php:  '#9b59f5', py:   '#4b8bbe',
    css:  '#264de4', scss: '#cd6799',
    html: '#e34c26', json: '#8b949e',
    md:   '#6db33f', sql:  '#e88e0b',
    sh:   '#89d247', bash: '#89d247',
    xml:  '#f1c40f', yaml: '#cc3534', yml: '#cc3534',
};

function getExt(path) {
    if (!path) return '';
    const dot = path.lastIndexOf('.');
    return dot !== -1 ? path.slice(dot + 1).toLowerCase() : '';
}

function parsePath(path) {
    if (!path) return [];
    // Normalize slashes and split
    return path.replace(/\\/g, '/').split('/').filter(Boolean);
}

export default function EditorBreadcrumb({ activeTab, actions }) {
    if (!activeTab) {
        return (
            <div style={{
                height: '28px',
                background: '#161b22',
                borderBottom: '1px solid #1c2128',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '12px',
                flexShrink: 0,
            }}>
                <span style={{ fontSize: '11px', color: '#484f58', fontFamily: 'inherit' }}>
                    No file open
                </span>
            </div>
        );
    }

    const segments = parsePath(activeTab.path);
    const ext = getExt(activeTab.path);
    const fileColor = EXT_COLORS[ext] || '#c9d1d9';

    return (
        <div style={{
            height: '28px',
            background: '#161b22',
            borderBottom: '1px solid #1c2128',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '12px',
            paddingRight: '6px',
            gap: 0,
            flexShrink: 0,
            overflow: 'hidden',
        }}>
            {segments.map((seg, i) => {
                const isLast = i === segments.length - 1;
                const color = isLast ? fileColor : '#8b949e';
                const fontWeight = isLast ? '500' : '400';

                return (
                    <React.Fragment key={i}>
                        <span
                            style={{
                                fontSize: '11px',
                                color,
                                fontWeight,
                                fontFamily: 'inherit',
                                whiteSpace: 'nowrap',
                                cursor: 'default',
                                userSelect: 'none',
                                flexShrink: 0,
                            }}
                            title={activeTab.path}
                        >
                            {seg}
                        </span>
                        {isLast && activeTab.unsaved && (
                            <span
                                title="Unsaved changes"
                                style={{
                                    display: 'inline-block',
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: '#ff6b35',
                                    marginLeft: '5px',
                                    flexShrink: 0,
                                    verticalAlign: 'middle',
                                }}
                            />
                        )}
                        {!isLast && (
                            <ChevronRight
                                size={10}
                                style={{ color: '#484f58', flexShrink: 0, margin: '0 1px' }}
                            />
                        )}
                    </React.Fragment>
                );
            })}
            {actions && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 }}>
                    {actions}
                </div>
            )}
        </div>
    );
}
