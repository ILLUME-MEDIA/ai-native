/**
 * BlockBuilderCanvas — WordPress-like block page builder
 *
 * Layout:
 *   Left  (240px) : Section list + Add Section button + Block Palette
 *   Center (flex) : Page canvas — sections as rows, columns, blocks
 *   Right  (300px): Inspector — block or section settings
 */

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    Plus, Trash2, Eye, EyeOff, GripVertical, X, ChevronDown, ChevronRight,
    Loader2, Blocks, Settings, Paintbrush, PenLine, Tag, Layout,
    CheckCircle2, MousePointer2,
} from 'lucide-react';

import { BLOCK_TYPES, BLOCK_CATEGORIES, COLUMN_LAYOUTS } from './BLOCK_REGISTRY';
import { useBlocks } from './useBlocks';
import { FieldRow, Inp, Sel, Toggle } from './shared';

// Block content editors
import HeadingEditor      from './block-editors/HeadingEditor';
import ParagraphEditor    from './block-editors/ParagraphEditor';
import ImageEditor        from './block-editors/ImageEditor';
import ButtonEditor       from './block-editors/ButtonEditor';
import SpacerEditor       from './block-editors/SpacerEditor';
import DividerEditor      from './block-editors/DividerEditor';
import GalleryEditor      from './block-editors/GalleryEditor';
import VideoEditor        from './block-editors/VideoEditor';
import HtmlEditor         from './block-editors/HtmlEditor';
import QuoteEditor        from './block-editors/QuoteEditor';
import ListEditor         from './block-editors/ListEditor';
import IconEditor         from './block-editors/IconEditor';

const EDITORS = {
    heading: HeadingEditor, paragraph: ParagraphEditor, image: ImageEditor,
    button: ButtonEditor, spacer: SpacerEditor, divider: DividerEditor,
    gallery: GalleryEditor, video: VideoEditor, html: HtmlEditor,
    quote: QuoteEditor, list: ListEditor, icon: IconEditor,
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
    bg: '#f1f5f9', panel: '#ffffff', panelDark: '#f8fafc',
    border: '#e2e8f0', borderFocus: '#3b82f6',
    text: '#0f172a', textSub: '#334155', textMuted: '#64748b', textLight: '#94a3b8',
    accent: '#3b82f6', accentSoft: '#eff6ff', accentBorder: '#bfdbfe',
    danger: '#ef4444', dangerSoft: '#fef2f2',
    topbar: '#1e293b', topbarText: '#f1f5f9',
    radius: '8px', radiusSm: '5px', radiusLg: '12px',
    shadow: '0 1px 3px rgba(0,0,0,0.06)',
    shadowMd: '0 4px 12px rgba(0,0,0,0.08)',
};

// ── API helper ────────────────────────────────────────────────────────────────
const BASE = '/api/admin/design-system';
function dsCall(path, opts = {}) {
    const xsrf = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
    return fetch(BASE + path, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrf },
        ...opts,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(r => (r.status === 204 ? null : r.json()));
}

// ── Block Palette ─────────────────────────────────────────────────────────────
function BlockPalette({ onAdd, targetSectionId, targetColumn }) {
    const [cat, setCat] = useState('all');

    const categories = ['all', ...Object.keys(BLOCK_CATEGORIES)];
    const filtered   = Object.entries(BLOCK_TYPES).filter(([, t]) => cat === 'all' || t.category === cat);

    return (
        <div style={{ padding: '0 12px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Add Block</div>
            {/* Category pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {categories.map(c => (
                    <button key={c} type="button" onClick={() => setCat(c)}
                        style={{ fontSize: 9.5, fontWeight: 600, padding: '2px 8px', borderRadius: 20, border: `1.5px solid ${cat === c ? C.accent : C.border}`, background: cat === c ? C.accentSoft : '#fff', color: cat === c ? C.accent : C.textMuted, cursor: 'pointer', textTransform: 'capitalize' }}>
                        {c}
                    </button>
                ))}
            </div>
            {/* Block tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {filtered.map(([type, def]) => (
                    <button key={type} type="button"
                        onClick={() => targetSectionId && onAdd(targetSectionId, targetColumn ?? 0, type)}
                        disabled={!targetSectionId}
                        title={targetSectionId ? `Add ${def.label}` : 'Select a section first'}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 4px', border: `1.5px solid ${C.border}`, borderRadius: C.radius, background: targetSectionId ? '#fff' : '#f8fafc', cursor: targetSectionId ? 'pointer' : 'not-allowed', opacity: targetSectionId ? 1 : 0.5, transition: 'all 0.15s' }}>
                        <div style={{ width: 30, height: 30, borderRadius: 7, background: def.bg, border: `1px solid ${def.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <def.Icon size={15} color={def.color} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: C.textSub, textAlign: 'center', lineHeight: 1.2 }}>{def.label}</span>
                    </button>
                ))}
            </div>
            {!targetSectionId && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: C.radiusSm, fontSize: 11, color: '#92400e' }}>
                    Click a section to select it, then add blocks here.
                </div>
            )}
        </div>
    );
}

// ── Column Layout Picker ──────────────────────────────────────────────────────
function LayoutPicker({ value, onChange }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {Object.entries(COLUMN_LAYOUTS).map(([key, def]) => (
                <button key={key} type="button" onClick={() => onChange(key)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '7px 4px', border: `1.5px solid ${value === key ? C.accent : C.border}`, borderRadius: C.radius, background: value === key ? C.accentSoft : '#fff', cursor: 'pointer' }}>
                    <def.Icon size={16} color={value === key ? C.accent : C.textMuted} />
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: value === key ? C.accent : C.textMuted, textAlign: 'center', lineHeight: 1.2 }}>{def.label}</span>
                </button>
            ))}
        </div>
    );
}

// ── Single Block Card in canvas ───────────────────────────────────────────────
function BlockCard({ block, isActive, onSelect, onDelete, onToggle, dragHandleProps }) {
    const def     = BLOCK_TYPES[block.block_type] ?? { Icon: Blocks, label: block.block_type, color: '#64748b', bg: '#f9fafb' };
    const preview = block.content?.text || block.content?.label || block.content?.url || '';
    const [hov, setHov] = useState(false);

    return (
        <div onClick={() => onSelect(block)}
            onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ background: isActive ? C.accentSoft : '#fff', border: `1.5px solid ${isActive ? C.accent : hov ? '#cbd5e1' : C.border}`, borderLeft: `3px solid ${isActive ? C.accent : def.color}`, borderRadius: C.radiusSm, padding: '7px 10px', marginBottom: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.12s', opacity: block.is_visible ? 1 : 0.45 }}>
            <div {...dragHandleProps} onClick={e => e.stopPropagation()} style={{ color: '#cbd5e1', cursor: 'grab', flexShrink: 0 }}>
                <GripVertical size={14} />
            </div>
            <div style={{ width: 26, height: 26, borderRadius: 5, background: def.bg, border: `1px solid ${def.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <def.Icon size={13} color={def.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {block.label || def.label}
                </div>
                {preview && <div style={{ fontSize: 10, color: C.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(preview).slice(0, 40)}</div>}
            </div>
            <div style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => onToggle(block)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textMuted }}>
                    {block.is_visible ? <Eye size={11} /> : <EyeOff size={11} />}
                </button>
                <button onClick={() => onDelete(block)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.danger }}>
                    <Trash2 size={11} />
                </button>
            </div>
        </div>
    );
}

// ── Column Drop Zone ──────────────────────────────────────────────────────────
function ColumnDropZone({ sectionId, colIndex, blocks, activeBlock, onBlockSelect, onBlockDelete, onBlockToggle }) {
    const droppableId = `col-${sectionId}-${colIndex}`;

    return (
        <Droppable droppableId={droppableId}>
            {(prov, snap) => (
                <div ref={prov.innerRef} {...prov.droppableProps}
                    style={{ flex: 1, minHeight: 60, background: snap.isDraggingOver ? C.accentSoft : C.panelDark, border: `2px dashed ${snap.isDraggingOver ? C.accent : C.border}`, borderRadius: C.radius, padding: '6px', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, paddingLeft: 4 }}>Col {colIndex + 1}</div>
                    {blocks.length === 0 && !snap.isDraggingOver && (
                        <div style={{ fontSize: 11, color: C.textLight, textAlign: 'center', padding: '10px 0' }}>Drop blocks here</div>
                    )}
                    {blocks.map((block, idx) => (
                        <Draggable key={block.id} draggableId={`block-${block.id}`} index={idx}>
                            {(p) => (
                                <div ref={p.innerRef} {...p.draggableProps}>
                                    <BlockCard block={block}
                                        isActive={activeBlock?.id === block.id}
                                        onSelect={onBlockSelect}
                                        onDelete={onBlockDelete}
                                        onToggle={onBlockToggle}
                                        dragHandleProps={p.dragHandleProps} />
                                </div>
                            )}
                        </Draggable>
                    ))}
                    {prov.placeholder}
                </div>
            )}
        </Droppable>
    );
}

// ── Section Row in Canvas ─────────────────────────────────────────────────────
function SectionRow({ section, isActive, onSectionSelect, blocks, activeBlock, onBlockSelect, onBlockDelete, onBlockToggle, onDeleteSection, onToggleSection }) {
    const [expanded, setExpanded]  = useState(true);
    const layout  = COLUMN_LAYOUTS[section.layout || '1col'] ?? COLUMN_LAYOUTS['1col'];
    const colCount = layout.columns;

    return (
        <div style={{ marginBottom: 10, border: `1.5px solid ${isActive ? C.accent : C.border}`, borderRadius: C.radiusLg, overflow: 'hidden', boxShadow: isActive ? `0 0 0 3px ${C.accentSoft}` : 'none' }}>
            {/* Section header bar */}
            <div onClick={() => onSectionSelect(section)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: isActive ? C.accentSoft : C.panelDark, cursor: 'pointer', borderBottom: expanded ? `1px solid ${C.border}` : 'none' }}>
                <button type="button" onClick={e => { e.stopPropagation(); setExpanded(o => !o); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 0, display: 'flex' }}>
                    {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: isActive ? C.accent : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <layout.Icon size={13} color={isActive ? '#fff' : C.textMuted} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {section.label || `Section ${section.id}`}
                    </div>
                    <div style={{ fontSize: 10, color: C.textMuted }}>{layout.label} · {Object.values(blocks).flat().length} blocks</div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => onToggleSection(section)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textMuted }}>
                        {section.is_visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button onClick={() => onDeleteSection(section)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.danger }}>
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            {/* Column grid */}
            {expanded && (
                <div style={{ padding: 10, display: 'grid', gridTemplateColumns: layout.gridTemplate, gap: 8 }}>
                    {Array.from({ length: colCount }, (_, i) => (
                        <ColumnDropZone key={i} sectionId={section.id} colIndex={i}
                            blocks={blocks[String(i)] ?? []}
                            activeBlock={activeBlock}
                            onBlockSelect={onBlockSelect}
                            onBlockDelete={onBlockDelete}
                            onBlockToggle={onBlockToggle} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Block Inspector (right panel when block selected) ─────────────────────────
function BlockInspector({ block, onUpdate, onClose }) {
    const [tab, setTab]   = useState('content');
    const def  = BLOCK_TYPES[block.block_type] ?? { Icon: Blocks, label: block.block_type, color: '#64748b', bg: '#f9fafb' };
    const Editor = EDITORS[block.block_type];

    const setContent = (key, val) => onUpdate(block.id, { content: { ...block.content, [key]: val } });
    const setStyle   = (key, val) => onUpdate(block.id, { style: { ...(block.style ?? {}), [key]: val } });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 7, background: def.bg, border: `1px solid ${def.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <def.Icon size={15} color={def.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{def.label}</div>
                    <div style={{ fontSize: 10.5, color: C.textMuted }}>Block Settings</div>
                </div>
                <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={14} />
                </button>
            </div>

            {/* Label field */}
            <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, background: C.panelDark, flexShrink: 0 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Tag size={10} /> Block Label
                </label>
                <input defaultValue={block.label || ''} onBlur={e => onUpdate(block.id, { label: e.target.value })}
                    placeholder={def.label} style={{ width: '100%', padding: '5px 9px', fontSize: 12, border: `1.5px solid ${C.border}`, borderRadius: C.radiusSm, outline: 'none', color: C.text, background: '#fff', boxSizing: 'border-box' }} />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', padding: '0 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                {[{ key: 'content', Ico: PenLine, label: 'Content' }, { key: 'style', Ico: Paintbrush, label: 'Style' }].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', fontSize: 11.5, fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? C.accent : C.textMuted, background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? C.accent : 'transparent'}`, cursor: 'pointer', marginBottom: -1 }}>
                        <t.Ico size={13} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                {tab === 'content' ? (
                    Editor ? <Editor content={block.content ?? {}} set={setContent} /> : <div style={{ fontSize: 12, color: C.textMuted }}>No settings for this block type.</div>
                ) : (
                    <BlockStyleTab style={block.style ?? {}} onChange={s => onUpdate(block.id, { style: s })} />
                )}
            </div>
        </div>
    );
}

// ── Minimal block style tab ───────────────────────────────────────────────────
function BlockStyleTab({ style, onChange }) {
    const set = (k, v) => onChange({ ...style, [k]: v === '' ? undefined : v });

    return (
        <div>
            <FieldRow label="Text Color">
                <input type="color" value={style.color || '#000000'} onChange={e => set('color', e.target.value)}
                    style={{ width: 36, height: 32, border: `1.5px solid ${C.border}`, borderRadius: 5, cursor: 'pointer', padding: 3 }} />
            </FieldRow>
            <FieldRow label="Background Color">
                <input type="color" value={style.background || '#ffffff'} onChange={e => set('background', e.target.value)}
                    style={{ width: 36, height: 32, border: `1.5px solid ${C.border}`, borderRadius: 5, cursor: 'pointer', padding: 3 }} />
            </FieldRow>
            <FieldRow label="Padding" hint="e.g. 16px or 8px 16px">
                <input type="text" value={style.padding || ''} onChange={e => set('padding', e.target.value)} placeholder="16px"
                    style={{ width: '100%', padding: '6px 10px', fontSize: 12, border: `1.5px solid ${C.border}`, borderRadius: 5, outline: 'none', color: C.text, background: '#fff', fontFamily: 'monospace', boxSizing: 'border-box' }} />
            </FieldRow>
            <FieldRow label="Margin" hint="e.g. 0 0 16px 0">
                <input type="text" value={style.margin || ''} onChange={e => set('margin', e.target.value)} placeholder="0 0 16px 0"
                    style={{ width: '100%', padding: '6px 10px', fontSize: 12, border: `1.5px solid ${C.border}`, borderRadius: 5, outline: 'none', color: C.text, background: '#fff', fontFamily: 'monospace', boxSizing: 'border-box' }} />
            </FieldRow>
            <FieldRow label="Border Radius" hint="px">
                <input type="text" value={style.borderRadius || ''} onChange={e => set('borderRadius', e.target.value)} placeholder="8px"
                    style={{ width: '100%', padding: '6px 10px', fontSize: 12, border: `1.5px solid ${C.border}`, borderRadius: 5, outline: 'none', color: C.text, background: '#fff', fontFamily: 'monospace', boxSizing: 'border-box' }} />
            </FieldRow>
            <FieldRow label="Custom CSS">
                <textarea value={style.customCss || ''} onChange={e => set('customCss', e.target.value)} rows={4}
                    placeholder={'font-weight: 700;\ntext-transform: uppercase;'}
                    style={{ width: '100%', padding: '6px 10px', fontSize: 11.5, border: `1.5px solid ${C.border}`, borderRadius: 5, outline: 'none', color: C.text, background: '#fff', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
            </FieldRow>
            {Object.keys(style).some(k => style[k]) && (
                <button onClick={() => onChange({})} style={{ width: '100%', padding: '6px', border: `1px solid ${C.border}`, borderRadius: 5, background: 'none', cursor: 'pointer', fontSize: 11, color: C.danger }}>
                    Reset styles
                </button>
            )}
        </div>
    );
}

// ── Section Inspector (right panel when section selected) ─────────────────────
function SectionInspector({ section, onUpdate, onClose }) {
    const layout = section.layout || '1col';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 7, background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layout size={16} color={C.accent} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>Section</div>
                    <div style={{ fontSize: 10.5, color: C.textMuted }}>Layout & Settings</div>
                </div>
                <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={14} />
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                <FieldRow label="Section Label">
                    <input defaultValue={section.label || ''} onBlur={e => onUpdate(section.id, { label: e.target.value })}
                        placeholder="My Section"
                        style={{ width: '100%', padding: '6px 10px', fontSize: 12.5, border: `1.5px solid ${C.border}`, borderRadius: 5, outline: 'none', color: C.text, background: '#fff', boxSizing: 'border-box' }} />
                </FieldRow>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, display: 'block', marginBottom: 8 }}>Column Layout</label>
                    <LayoutPicker value={layout} onChange={v => onUpdate(section.id, { layout: v })} />
                </div>

                <FieldRow label="Visibility">
                    <Toggle checked={section.is_visible} onChange={v => onUpdate(section.id, { is_visible: v })} label="Visible on page" />
                </FieldRow>
            </div>
        </div>
    );
}

// ── No Selection State ────────────────────────────────────────────────────────
function EmptyInspector() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24, gap: 12, color: C.textMuted }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.panelDark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MousePointer2 size={22} color={C.textLight} />
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textSub, marginBottom: 4 }}>Nothing selected</div>
                <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>Click a section or block<br />to edit its settings</div>
            </div>
        </div>
    );
}

// ── Main BlockBuilderCanvas ───────────────────────────────────────────────────
export default function BlockBuilderCanvas({ site, page, sections, onSectionUpdate, onSectionDelete, onSectionToggle, onAddSection }) {
    const [activeSection, setActiveSection] = useState(null);
    const [activeBlock,   setActiveBlock]   = useState(null);
    const [loadedSections, setLoadedSections] = useState(new Set());

    const { getBlocks, loadBlocks, addBlock, updateBlock, deleteBlock, reorderBlocks, saving } = useBlocks(site.id, page.id);

    // Load blocks when a section is expanded/selected
    const ensureBlocks = useCallback((sectionId) => {
        if (!loadedSections.has(sectionId)) {
            loadBlocks(sectionId);
            setLoadedSections(prev => new Set([...prev, sectionId]));
        }
    }, [loadedSections, loadBlocks]);

    // Load blocks for all sections on mount
    useEffect(() => {
        sections.forEach(s => ensureBlocks(s.id));
    }, [sections.map(s => s.id).join(',')]); // eslint-disable-line

    const handleSelectSection = (section) => {
        setActiveSection(section);
        setActiveBlock(null);
        ensureBlocks(section.id);
    };

    const handleSelectBlock = (block) => {
        setActiveBlock(block);
        setActiveSection(sections.find(s => s.id === block.section_id) ?? null);
    };

    const handleBlockUpdate = (blockId, patch) => {
        const sectionId = sections.find(s => {
            const blocks = getBlocks(s.id);
            return Object.values(blocks).flat().some(b => b.id === blockId);
        })?.id;
        if (!sectionId) return;
        updateBlock(sectionId, blockId, patch);
        // Update activeBlock optimistically
        setActiveBlock(prev => prev?.id === blockId ? { ...prev, ...patch } : prev);
    };

    const handleBlockDelete = async (block) => {
        if (!confirm(`Delete "${block.label || BLOCK_TYPES[block.block_type]?.label || 'block'}"?`)) return;
        await deleteBlock(block.section_id, block.id);
        if (activeBlock?.id === block.id) setActiveBlock(null);
    };

    const handleBlockToggle = (block) => {
        updateBlock(block.section_id, block.id, { is_visible: !block.is_visible });
    };

    // DnD — cross-column block reorder
    const onDragEnd = useCallback((result) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const parseSrc = (id) => { const [, sid, col] = id.split('-'); return { sectionId: parseInt(sid), col: String(col) }; };
        const src  = parseSrc(source.droppableId);
        const dest = parseSrc(destination.droppableId);

        if (src.sectionId !== dest.sectionId) return; // cross-section not supported

        const sectionId = src.sectionId;
        const allBlocks = getBlocks(sectionId);
        const newGrouped = {};

        // Clone
        for (const [col, blocks] of Object.entries(allBlocks)) {
            newGrouped[col] = [...blocks];
        }

        // Move the block
        const srcArr  = [...(newGrouped[src.col]  ?? [])];
        const destArr = src.col === dest.col ? srcArr : [...(newGrouped[dest.col] ?? [])];
        const [moved] = srcArr.splice(source.index, 1);
        destArr.splice(destination.index, 0, moved);

        newGrouped[src.col]  = srcArr;
        newGrouped[dest.col] = destArr;

        reorderBlocks(sectionId, newGrouped);
    }, [getBlocks, reorderBlocks]);

    const targetColIndex = 0; // TODO: track which column is focused for palette

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: C.bg }}>
            {/* ── Left: Section list + Block Palette ─────────────────── */}
            <div style={{ width: 240, flexShrink: 0, background: C.panel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                {/* Sections list */}
                <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Sections</span>
                        <button onClick={onAddSection}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: C.accent, color: '#fff', border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            <Plus size={12} /> Add
                        </button>
                    </div>
                    {sections.map(s => (
                        <div key={s.id} onClick={() => handleSelectSection(s)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: C.radiusSm, cursor: 'pointer', background: activeSection?.id === s.id ? C.accentSoft : 'transparent', marginBottom: 2, border: `1px solid ${activeSection?.id === s.id ? C.accentBorder : 'transparent'}` }}>
                            {(() => { const L = COLUMN_LAYOUTS[s.layout || '1col'] ?? COLUMN_LAYOUTS['1col']; return <L.Icon size={13} color={activeSection?.id === s.id ? C.accent : C.textMuted} />; })()}
                            <span style={{ fontSize: 12, fontWeight: 500, color: activeSection?.id === s.id ? C.accent : C.textSub, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.label || `Section ${s.id}`}
                            </span>
                            {saving && <Loader2 size={10} color={C.accent} />}
                        </div>
                    ))}
                </div>

                {/* Block palette */}
                <div style={{ flex: 1, overflowY: 'auto', paddingTop: 12 }}>
                    <BlockPalette
                        targetSectionId={activeSection?.id}
                        targetColumn={targetColIndex}
                        onAdd={(sid, col, type) => addBlock(sid, col, type)} />
                </div>
            </div>

            {/* ── Center: Canvas ─────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {sections.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, border: `2px dashed ${C.border}`, borderRadius: C.radiusLg, color: C.textMuted }}>
                        <Blocks size={32} color={C.textLight} style={{ marginBottom: 12 }} />
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>No sections yet</div>
                        <div style={{ fontSize: 12, marginBottom: 16 }}>Add your first section to start building</div>
                        <button onClick={onAddSection}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: C.accent, color: '#fff', border: 'none', borderRadius: C.radius, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            <Plus size={15} /> Add First Section
                        </button>
                    </div>
                ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                        {sections.map(section => (
                            <SectionRow key={section.id}
                                section={section}
                                isActive={activeSection?.id === section.id}
                                onSectionSelect={handleSelectSection}
                                blocks={getBlocks(section.id)}
                                activeBlock={activeBlock}
                                onBlockSelect={handleSelectBlock}
                                onBlockDelete={handleBlockDelete}
                                onBlockToggle={handleBlockToggle}
                                onDeleteSection={onSectionDelete}
                                onToggleSection={onSectionToggle} />
                        ))}
                    </DragDropContext>
                )}
            </div>

            {/* ── Right: Inspector ───────────────────────────────────── */}
            <div style={{ width: 300, flexShrink: 0, background: C.panel, borderLeft: `1px solid ${C.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {activeBlock
                    ? <BlockInspector block={activeBlock} onUpdate={handleBlockUpdate} onClose={() => setActiveBlock(null)} />
                    : activeSection
                        ? <SectionInspector section={activeSection} onUpdate={onSectionUpdate} onClose={() => setActiveSection(null)} />
                        : <EmptyInspector />}
            </div>
        </div>
    );
}
