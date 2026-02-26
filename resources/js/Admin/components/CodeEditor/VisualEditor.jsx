import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Eye, Layers, Type, Box, Minus } from 'lucide-react';
import { toast } from 'react-toastify';

// Inspector script injected into the preview iframe
const INSPECTOR_SCRIPT = `
(function() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:99999;border:2px solid #ff6b35;background:rgba(255,107,53,0.08);box-sizing:border-box;transition:top 0.05s,left 0.05s,width 0.05s,height 0.05s;display:none;';
    document.body.appendChild(overlay);

    function getSelector(el) {
        if (!el || el === document.body) return 'body';
        if (el.id) return '#' + el.id;
        var parts = [];
        var cur = el;
        while (cur && cur !== document.body && parts.length < 5) {
            var sel = cur.tagName.toLowerCase();
            if (cur.id) { parts.unshift('#' + cur.id); break; }
            var cls = Array.prototype.slice.call(cur.classList, 0, 2).join('.');
            if (cls) sel += '.' + cls;
            parts.unshift(sel);
            cur = cur.parentElement;
        }
        return parts.join(' > ');
    }

    function getStyles(el) {
        var cs = window.getComputedStyle(el);
        return {
            display: cs.display, position: cs.position,
            flexDirection: cs.flexDirection, alignItems: cs.alignItems,
            justifyContent: cs.justifyContent, fontSize: cs.fontSize,
            fontWeight: cs.fontWeight, lineHeight: cs.lineHeight,
            color: cs.color, backgroundColor: cs.backgroundColor,
            marginTop: cs.marginTop, marginRight: cs.marginRight,
            marginBottom: cs.marginBottom, marginLeft: cs.marginLeft,
            paddingTop: cs.paddingTop, paddingRight: cs.paddingRight,
            paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft,
            borderWidth: cs.borderWidth, borderStyle: cs.borderStyle,
            borderColor: cs.borderColor, borderRadius: cs.borderRadius,
            width: cs.width, height: cs.height, boxShadow: cs.boxShadow,
        };
    }

    document.addEventListener('mouseover', function(e) {
        e.stopPropagation();
        var rect = e.target.getBoundingClientRect();
        overlay.style.top = rect.top + 'px'; overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px'; overlay.style.height = rect.height + 'px';
        overlay.style.display = 'block';
    }, true);

    document.addEventListener('mouseout', function(e) {
        if (!e.relatedTarget || e.relatedTarget === document.body) overlay.style.display = 'none';
    }, true);

    document.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        var rect = e.target.getBoundingClientRect();
        window.parent.postMessage({
            type: 'VISUAL_EDITOR_ELEMENT_SELECTED',
            selector: getSelector(e.target),
            tagName: e.target.tagName.toLowerCase(),
            styles: getStyles(e.target),
            rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
            textContent: (e.target.textContent || '').slice(0, 100),
        }, '*');
    }, true);
})();
`;

function rgbToHex(color) {
    if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') return '#000000';
    if (color.startsWith('#')) return color;
    const m = color.match(/\d+/g);
    if (!m || m.length < 3) return '#000000';
    return '#' + [m[0], m[1], m[2]].map(x => Number(x).toString(16).padStart(2, '0')).join('');
}

function PropRow({ label, children }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '9px', color: '#8b949e', width: '68px', flexShrink: 0 }}>{label}</span>
            <div style={{ flex: 1 }}>{children}</div>
        </div>
    );
}

const inputBase = {
    background: '#161b22', border: '1px solid #30363d', borderRadius: '3px',
    color: '#c9d1d9', fontSize: '10px', fontFamily: "'JetBrains Mono', monospace",
    padding: '3px 6px', width: '100%', outline: 'none',
};

function StyleInput({ value, onChange, type, options }) {
    if (type === 'color') {
        return (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input type="color" value={rgbToHex(value)} onChange={e => onChange(e.target.value)}
                    style={{ width: '24px', height: '22px', border: 'none', borderRadius: '3px', padding: 0, cursor: 'pointer', background: 'none', flexShrink: 0 }} />
                <input type="text" value={value} onChange={e => onChange(e.target.value)} style={inputBase} />
            </div>
        );
    }
    if (options) {
        return (
            <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputBase, cursor: 'pointer' }}>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        );
    }
    return <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} style={inputBase} />;
}

function SectionHeader({ label }) {
    return <div style={{ marginBottom: '6px', marginTop: '4px', fontSize: '9px', color: '#484f58', fontWeight: '600', letterSpacing: '0.08em' }}>{label}</div>;
}

function LayoutSection({ styles, onChange }) {
    const isFlex = styles.display === 'flex' || styles.display === 'inline-flex';
    return (
        <>
            <PropRow label="display">
                <StyleInput value={styles.display || 'block'} onChange={v => onChange('display', v)}
                    options={['block','flex','grid','inline','inline-block','inline-flex','none']} />
            </PropRow>
            {isFlex && <>
                <PropRow label="flex-dir">
                    <StyleInput value={styles.flexDirection || 'row'} onChange={v => onChange('flexDirection', v)}
                        options={['row','row-reverse','column','column-reverse']} />
                </PropRow>
                <PropRow label="align">
                    <StyleInput value={styles.alignItems || 'stretch'} onChange={v => onChange('alignItems', v)}
                        options={['flex-start','center','flex-end','stretch','baseline']} />
                </PropRow>
                <PropRow label="justify">
                    <StyleInput value={styles.justifyContent || 'flex-start'} onChange={v => onChange('justifyContent', v)}
                        options={['flex-start','center','flex-end','space-between','space-around','space-evenly']} />
                </PropRow>
            </>}
            <PropRow label="position">
                <StyleInput value={styles.position || 'static'} onChange={v => onChange('position', v)}
                    options={['static','relative','absolute','fixed','sticky']} />
            </PropRow>
            <PropRow label="width"><StyleInput value={styles.width || 'auto'} onChange={v => onChange('width', v)} /></PropRow>
            <PropRow label="height"><StyleInput value={styles.height || 'auto'} onChange={v => onChange('height', v)} /></PropRow>
            <SectionHeader label="MARGIN" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '10px' }}>
                {['marginTop','marginRight','marginBottom','marginLeft'].map(k => (
                    <div key={k}>
                        <div style={{ fontSize: '8px', color: '#484f58', marginBottom: '2px' }}>{k.replace('margin','').toLowerCase()}</div>
                        <StyleInput value={styles[k] || '0px'} onChange={v => onChange(k, v)} />
                    </div>
                ))}
            </div>
            <SectionHeader label="PADDING" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                {['paddingTop','paddingRight','paddingBottom','paddingLeft'].map(k => (
                    <div key={k}>
                        <div style={{ fontSize: '8px', color: '#484f58', marginBottom: '2px' }}>{k.replace('padding','').toLowerCase()}</div>
                        <StyleInput value={styles[k] || '0px'} onChange={v => onChange(k, v)} />
                    </div>
                ))}
            </div>
        </>
    );
}

function TypographySection({ styles, onChange }) {
    return (
        <>
            <PropRow label="font-size"><StyleInput value={styles.fontSize || '16px'} onChange={v => onChange('fontSize', v)} /></PropRow>
            <PropRow label="weight">
                <StyleInput value={styles.fontWeight || '400'} onChange={v => onChange('fontWeight', v)}
                    options={['100','200','300','400','500','600','700','800','900','bold','normal']} />
            </PropRow>
            <PropRow label="line-height"><StyleInput value={styles.lineHeight || 'normal'} onChange={v => onChange('lineHeight', v)} /></PropRow>
            <PropRow label="color"><StyleInput type="color" value={styles.color || '#000000'} onChange={v => onChange('color', v)} /></PropRow>
        </>
    );
}

function BackgroundSection({ styles, onChange }) {
    return (
        <>
            <PropRow label="bg-color"><StyleInput type="color" value={styles.backgroundColor || 'transparent'} onChange={v => onChange('backgroundColor', v)} /></PropRow>
            <PropRow label="b-radius"><StyleInput value={styles.borderRadius || '0px'} onChange={v => onChange('borderRadius', v)} /></PropRow>
            <PropRow label="b-width"><StyleInput value={styles.borderWidth || '0px'} onChange={v => onChange('borderWidth', v)} /></PropRow>
            <PropRow label="b-style">
                <StyleInput value={styles.borderStyle || 'none'} onChange={v => onChange('borderStyle', v)}
                    options={['none','solid','dashed','dotted','double','groove','ridge']} />
            </PropRow>
            <PropRow label="b-color"><StyleInput type="color" value={styles.borderColor || '#000000'} onChange={v => onChange('borderColor', v)} /></PropRow>
            <PropRow label="shadow"><StyleInput value={styles.boxShadow || 'none'} onChange={v => onChange('boxShadow', v)} /></PropRow>
        </>
    );
}

const SUPPORTED_EXTS = new Set(['html', 'htm', 'css', 'scss']);
const SECTIONS = [
    { id: 'layout',     label: 'Layout', icon: <Box size={10} /> },
    { id: 'typography', label: 'Type',   icon: <Type size={10} /> },
    { id: 'background', label: 'BG',     icon: <Minus size={10} /> },
];

export default function VisualEditor({ workspace, activeTab }) {
    const iframeRef = useRef(null);
    const [selectedElement, setSelectedElement] = useState(null);
    const [editedStyles, setEditedStyles] = useState({});
    const [activeSection, setActiveSection] = useState('layout');
    const [saving, setSaving] = useState(false);
    const [iframeContent, setIframeContent] = useState('');

    const ext = activeTab?.path?.split('.').pop()?.toLowerCase();
    const isSupported = SUPPORTED_EXTS.has(ext);

    useEffect(() => {
        if (!workspace || !activeTab || !isSupported) { setIframeContent(''); return; }
        axios.get(`/api/workspaces/${workspace.id}/files/read`, { params: { path: activeTab.path } })
            .then(r => {
                let html = r.data.content;
                const scriptTag = `<script>${INSPECTOR_SCRIPT}<\/script>`;
                html = html.includes('</body>') ? html.replace('</body>', scriptTag + '</body>') : html + scriptTag;
                setIframeContent(html);
            })
            .catch(() => toast.error('Failed to load file for visual editing'));
    }, [workspace?.id, activeTab?.path, isSupported]);

    useEffect(() => { setSelectedElement(null); setEditedStyles({}); }, [activeTab?.path]);

    useEffect(() => {
        function handleMessage(e) {
            if (e.data?.type === 'VISUAL_EDITOR_ELEMENT_SELECTED') {
                setSelectedElement(e.data);
                setEditedStyles({ ...e.data.styles });
                setActiveSection('layout');
            }
        }
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    function updateStyle(key, value) { setEditedStyles(prev => ({ ...prev, [key]: value })); }

    function refreshIframe() {
        const saved = iframeContent;
        setIframeContent('');
        setTimeout(() => setIframeContent(saved), 30);
    }

    async function handleApply() {
        if (!selectedElement || !activeTab || !workspace) return;
        setSaving(true);
        try {
            const changed = Object.entries(editedStyles).filter(([k, v]) => selectedElement.styles[k] !== v);
            if (changed.length === 0) { toast('No changes to apply'); setSaving(false); return; }
            const cssProp = str => str.replace(/([A-Z])/g, '-$1').toLowerCase();
            const rules = changed.map(([k, v]) => `  ${cssProp(k)}: ${v};`).join('\n');
            const cssRule = `\n/* Visual Editor — ${selectedElement.selector} */\n${selectedElement.selector} {\n${rules}\n}\n`;
            await axios.post(`/api/workspaces/${workspace.id}/files/write`, {
                path: activeTab.path,
                content: (activeTab.content || '') + cssRule,
            });
            toast.success('Styles applied to ' + activeTab.path.split('/').pop());
            setSelectedElement(prev => ({ ...prev, styles: { ...prev.styles, ...editedStyles } }));
        } catch { toast.error('Failed to apply styles'); }
        finally { setSaving(false); }
    }

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* iframe pane */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#ffffff' }}>
                {!activeTab || !isSupported ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#484f58', flexDirection: 'column', gap: '12px', background: '#161b22' }}>
                        <Eye size={48} />
                        <p style={{ margin: 0, fontSize: '12px' }}>
                            {!activeTab ? 'Open an HTML or CSS file to inspect' : 'Visual editor supports HTML / CSS / SCSS files'}
                        </p>
                    </div>
                ) : (
                    <iframe ref={iframeRef} srcDoc={iframeContent}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        sandbox="allow-scripts allow-same-origin" title="Visual Editor Preview" />
                )}
                <button onClick={refreshIframe} title="Reload preview" style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'rgba(13,15,20,0.8)', border: '1px solid #30363d',
                    borderRadius: '4px', color: '#8b949e', cursor: 'pointer',
                    padding: '4px 6px', display: 'flex', alignItems: 'center',
                }}><RefreshCw size={12} /></button>
                {isSupported && !selectedElement && (
                    <div style={{
                        position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(13,15,20,0.85)', border: '1px solid #30363d', borderRadius: '6px',
                        padding: '6px 12px', fontSize: '10px', color: '#8b949e', pointerEvents: 'none', whiteSpace: 'nowrap',
                    }}>
                        Click any element to inspect &amp; edit its styles
                    </div>
                )}
            </div>

            {/* Properties panel */}
            <div style={{ width: '272px', background: '#0d0f14', borderLeft: '1px solid #1c2128', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #1c2128', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '600', color: '#e6edf3', letterSpacing: '0.08em' }}>
                        {selectedElement ? `<${selectedElement.tagName}>` : 'INSPECTOR'}
                    </span>
                    {selectedElement && (
                        <span style={{ fontSize: '9px', color: '#8b949e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={selectedElement.selector}>
                            {selectedElement.selector}
                        </span>
                    )}
                </div>

                {!selectedElement ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: '#484f58' }}>
                        <Layers size={36} />
                        <p style={{ margin: 0, fontSize: '11px', textAlign: 'center', lineHeight: '1.5' }}>Click any element<br />in the preview to inspect</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', borderBottom: '1px solid #1c2128', flexShrink: 0 }}>
                            {SECTIONS.map(({ id, label, icon }) => (
                                <button key={id} onClick={() => setActiveSection(id)} style={{
                                    flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                                    padding: '6px 4px', fontSize: '9px', fontFamily: 'inherit',
                                    color: activeSection === id ? '#ff6b35' : '#8b949e',
                                    borderBottom: activeSection === id ? '2px solid #ff6b35' : '2px solid transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                                    transition: 'color 0.15s',
                                }}>
                                    {icon}{label}
                                </button>
                            ))}
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }}>
                            {activeSection === 'layout'     && <LayoutSection     styles={editedStyles} onChange={updateStyle} />}
                            {activeSection === 'typography' && <TypographySection styles={editedStyles} onChange={updateStyle} />}
                            {activeSection === 'background' && <BackgroundSection styles={editedStyles} onChange={updateStyle} />}
                        </div>
                        <div style={{ padding: '8px 12px', borderTop: '1px solid #1c2128', flexShrink: 0 }}>
                            <button onClick={handleApply} disabled={saving} style={{
                                width: '100%', background: 'linear-gradient(135deg, #ff6b35, #ff9f1c)',
                                border: 'none', borderRadius: '4px', color: '#fff',
                                cursor: saving ? 'wait' : 'pointer', padding: '7px',
                                fontSize: '10px', fontWeight: '600', fontFamily: 'inherit',
                                opacity: saving ? 0.6 : 1, transition: 'opacity 0.15s',
                            }}>
                                {saving ? 'Applying…' : 'Apply to Source'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
