/**
 * SitePageBuilder — Professional Page Builder
 * Uses lucide-react for all icons (installed, renders inline SVGs — always visible).
 * 3-panel layout: Pages list | Section canvas | Settings panel
 * Drag-and-drop via @hello-pangea/dnd · Auto-save debounced 700ms
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    ArrowLeft, Check, X, Plus, Trash2, Eye, EyeOff, Pencil,
    GripVertical, Globe, Palette, Loader2, FileText, Files,
    LayoutGrid, Image, Film, Sparkles, Quote, Megaphone, PanelBottom,
    Navigation, MousePointer2, Blocks, Tag, PenLine, Paintbrush,
    Code2, Code, ShieldCheck, RefreshCw, Frame, ArrowUpDown,
    Contrast, Type, Layers, CheckCircle2, CheckSquare,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Maximize2, MoveHorizontal, Zap, Blend, FlipHorizontal2,
} from 'lucide-react';

// ── API ───────────────────────────────────────────────────────────────────────
const DS_BASE = '/api/admin/design-system';
function dsCall(path, opts = {}) {
    const xsrf = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
    return fetch(DS_BASE + path, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrf },
        ...opts,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(r => (r.status === 204 ? null : r.json()));
}

// ── Section type registry (lucide-react icons) ────────────────────────────────
const SECTION_TYPES = {
    navbar:       { Icon: Navigation,  label: 'Navigation Bar',  desc: 'Header with logo & links',   color: '#3b82f6', bg: '#eff6ff' },
    hero:         { Icon: Image,       label: 'Hero / Banner',   desc: 'Full-width intro section',   color: '#8b5cf6', bg: '#f5f3ff' },
    carousel:     { Icon: Film,        label: 'Carousel',        desc: 'Image or content slider',    color: '#f59e0b', bg: '#fffbeb' },
    cards:        { Icon: LayoutGrid,  label: 'Cards Grid',      desc: 'Services or product cards',  color: '#10b981', bg: '#ecfdf5' },
    features:     { Icon: Sparkles,    label: 'Features',        desc: 'Highlight key features',     color: '#06b6d4', bg: '#ecfeff' },
    testimonials: { Icon: Quote,       label: 'Testimonials',    desc: 'Customer reviews & quotes',  color: '#f97316', bg: '#fff7ed' },
    cta:          { Icon: Megaphone,   label: 'Call to Action',  desc: 'Conversion / signup block',  color: '#ef4444', bg: '#fef2f2' },
    footer:       { Icon: PanelBottom, label: 'Footer',          desc: 'Links, copyright & social',  color: '#6b7280', bg: '#f9fafb' },
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
    bg:          '#f1f5f9',
    panel:       '#ffffff',
    panelDark:   '#f8fafc',
    border:      '#e2e8f0',
    borderFocus: '#3b82f6',
    text:        '#0f172a',
    textSub:     '#334155',
    textMuted:   '#64748b',
    textLight:   '#94a3b8',
    accent:      '#3b82f6',
    accentHover: '#2563eb',
    accentSoft:  '#eff6ff',
    accentBorder:'#bfdbfe',
    danger:      '#ef4444',
    dangerSoft:  '#fef2f2',
    success:     '#16a34a',
    successSoft: '#dcfce7',
    warning:     '#f59e0b',
    warningSoft: '#fffbeb',
    hover:       '#f1f5f9',
    topbar:      '#1e293b',
    topbarText:  '#f1f5f9',
    shadow:      '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    shadowMd:    '0 4px 12px rgba(0,0,0,0.08)',
    radius:      '8px',
    radiusSm:    '5px',
    radiusLg:    '12px',
};

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ── Shared form atoms ─────────────────────────────────────────────────────────
const inputBase = {
    width: '100%', padding: '6px 10px', fontSize: 12.5,
    border: `1.5px solid ${C.border}`, borderRadius: C.radiusSm,
    outline: 'none', color: C.text, background: '#fff',
    boxSizing: 'border-box', transition: 'border-color 0.15s', lineHeight: 1.4,
};

function FieldRow({ label, hint, children }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                {label}
                {hint && <span style={{ fontSize: 10, fontWeight: 400, color: C.textLight, textTransform: 'none' }}>{hint}</span>}
            </label>
            {children}
        </div>
    );
}

function Inp({ value, onChange, placeholder, mono }) {
    const [focused, setFocused] = useState(false);
    return (
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ ...inputBase, fontFamily: mono ? '"Fira Code", monospace' : 'inherit', borderColor: focused ? C.borderFocus : C.border, boxShadow: focused ? `0 0 0 3px ${C.accentSoft}` : 'none' }} />
    );
}

function Tarea({ value, onChange, placeholder, rows = 2 }) {
    const [focused, setFocused] = useState(false);
    return (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ ...inputBase, resize: 'vertical', fontFamily: 'inherit', borderColor: focused ? C.borderFocus : C.border, boxShadow: focused ? `0 0 0 3px ${C.accentSoft}` : 'none' }} />
    );
}

function Sel({ value, onChange, options }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)}
            style={{ ...inputBase, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%2364748b'%3E%3Cpath d='M12 15l-7-7h14z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: 28 }}>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}

function ColorPicker({ value, onChange }) {
    return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)}
                style={{ width: 36, height: 32, padding: 3, border: `1.5px solid ${C.border}`, borderRadius: C.radiusSm, cursor: 'pointer', display: 'block' }} />
            <Inp value={value} onChange={onChange} placeholder="#ffffff or transparent" mono />
        </div>
    );
}

function Toggle({ checked, onChange, label }) {
    return (
        <button type="button" onClick={() => onChange(!checked)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: checked ? C.accent : '#cbd5e1', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </div>
            <span style={{ fontSize: 12.5, color: C.textSub }}>{label}</span>
        </button>
    );
}

function ListEditor({ items, onChange, fields, addLabel, emptyItem }) {
    const add    = () => onChange([...items, { ...emptyItem }]);
    const remove = i => onChange(items.filter((_, idx) => idx !== i));
    const upd    = (i, key, val) => onChange(items.map((it, idx) => idx === i ? { ...it, [key]: val } : it));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map((item, i) => (
                <div key={i} style={{ background: C.panelDark, border: `1.5px solid ${C.border}`, borderRadius: C.radius, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.textLight, letterSpacing: 0.8, textTransform: 'uppercase' }}>Item {i + 1}</span>
                        <button onClick={() => remove(i)} title="Remove"
                            style={{ background: C.dangerSoft, border: 'none', borderRadius: 5, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.danger }}>
                            <X size={12} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {fields.map(f => (
                            f.type === 'textarea'
                                ? <Tarea key={f.key} value={item[f.key]} onChange={v => upd(i, f.key, v)} placeholder={f.placeholder} rows={2} />
                                : <Inp   key={f.key} value={item[f.key]} onChange={v => upd(i, f.key, v)} placeholder={f.placeholder} mono={f.mono} />
                        ))}
                    </div>
                </div>
            ))}
            <button onClick={add}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '7px', fontSize: 12, border: `1.5px dashed ${C.accentBorder}`, borderRadius: C.radius, background: C.accentSoft, color: C.accent, cursor: 'pointer', fontWeight: 600 }}>
                <Plus size={13} /> {addLabel}
            </button>
        </div>
    );
}

// ── Per-type settings panels ──────────────────────────────────────────────────
function NavbarSettings({ s, set }) {
    return (<>
        <FieldRow label="Logo Text"><Inp value={s.logo_text} onChange={v => set('logo_text', v)} placeholder="Brand Name" /></FieldRow>
        <FieldRow label="Logo URL" hint="optional"><Inp value={s.logo_url} onChange={v => set('logo_url', v)} placeholder="/" mono /></FieldRow>
        <FieldRow label="Nav Links">
            <ListEditor items={s.links || []} onChange={v => set('links', v)}
                fields={[{ key: 'label', placeholder: 'Link label (e.g. Home)' }, { key: 'url', placeholder: '/page-url', mono: true }]}
                addLabel="Add Nav Link" emptyItem={{ label: '', url: '/' }} />
        </FieldRow>
        <FieldRow label="CTA Button"><div style={{ display: 'flex', gap: 6 }}><Inp value={s.cta_label} onChange={v => set('cta_label', v)} placeholder="Get Started" /><Inp value={s.cta_url} onChange={v => set('cta_url', v)} placeholder="#contact" mono /></div></FieldRow>
        <FieldRow label="Background Color"><ColorPicker value={s.bg_color} onChange={v => set('bg_color', v)} /></FieldRow>
        <FieldRow label="Behavior"><Toggle checked={s.sticky} onChange={v => set('sticky', v)} label="Sticky (fixed on scroll)" /></FieldRow>
    </>);
}

function HeroSettings({ s, set }) {
    return (<>
        <FieldRow label="Headline"><Inp value={s.title} onChange={v => set('title', v)} placeholder="Welcome to Our Site" /></FieldRow>
        <FieldRow label="Sub-headline"><Tarea value={s.subtitle} onChange={v => set('subtitle', v)} placeholder="Short tagline or description…" rows={2} /></FieldRow>
        <FieldRow label="Primary CTA"><div style={{ display: 'flex', gap: 6 }}><Inp value={s.cta_label} onChange={v => set('cta_label', v)} placeholder="Get Started" /><Inp value={s.cta_url} onChange={v => set('cta_url', v)} placeholder="#contact" mono /></div></FieldRow>
        <FieldRow label="Secondary CTA"><div style={{ display: 'flex', gap: 6 }}><Inp value={s.cta2_label} onChange={v => set('cta2_label', v)} placeholder="Learn More" /><Inp value={s.cta2_url} onChange={v => set('cta2_url', v)} placeholder="#features" mono /></div></FieldRow>
        <FieldRow label="Background Color"><ColorPicker value={s.bg_color} onChange={v => set('bg_color', v)} /></FieldRow>
        <FieldRow label="Background Image" hint="URL"><Inp value={s.bg_image_url} onChange={v => set('bg_image_url', v)} placeholder="https://..." mono /></FieldRow>
        <FieldRow label="Alignment">
            <Sel value={s.align || 'center'} onChange={v => set('align', v)} options={[{ value: 'left', label: '← Left' }, { value: 'center', label: '⊙ Center' }, { value: 'right', label: '→ Right' }]} />
        </FieldRow>
    </>);
}

function CarouselSettings({ s, set }) {
    return (<>
        <FieldRow label="Slides">
            <ListEditor items={s.slides || []} onChange={v => set('slides', v)}
                fields={[{ key: 'title', placeholder: 'Slide title' }, { key: 'subtitle', placeholder: 'Slide subtitle', type: 'textarea' }, { key: 'cta_label', placeholder: 'Button label' }, { key: 'cta_url', placeholder: '/url', mono: true }]}
                addLabel="Add Slide" emptyItem={{ title: 'New Slide', subtitle: '', bg_color: '#405189', cta_label: 'Learn More', cta_url: '#' }} />
        </FieldRow>
        <FieldRow label="Controls">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: C.panelDark, borderRadius: C.radius, border: `1px solid ${C.border}` }}>
                <Toggle checked={s.autoplay}    onChange={v => set('autoplay', v)}    label="Autoplay slides" />
                <Toggle checked={s.show_dots}   onChange={v => set('show_dots', v)}   label="Show dot indicators" />
                <Toggle checked={s.show_arrows} onChange={v => set('show_arrows', v)} label="Show navigation arrows" />
            </div>
        </FieldRow>
        <FieldRow label="Interval (ms)"><input type="number" value={s.interval || 5000} onChange={e => set('interval', parseInt(e.target.value))} min={1000} max={15000} step={500} style={{ ...inputBase }} /></FieldRow>
    </>);
}

function CardsSettings({ s, set }) {
    return (<>
        <FieldRow label="Section Title"><Inp value={s.title} onChange={v => set('title', v)} placeholder="Our Services" /></FieldRow>
        <FieldRow label="Section Subtitle"><Inp value={s.subtitle} onChange={v => set('subtitle', v)} placeholder="What we offer" /></FieldRow>
        <FieldRow label="Columns per Row"><Sel value={String(s.columns || 3)} onChange={v => set('columns', parseInt(v))} options={[{ value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }, { value: '4', label: '4 Columns' }]} /></FieldRow>
        <FieldRow label="Cards">
            <ListEditor items={s.cards || []} onChange={v => set('cards', v)}
                fields={[{ key: 'title', placeholder: 'Card title' }, { key: 'description', placeholder: 'Description', type: 'textarea' }, { key: 'icon', placeholder: 'Lucide icon name (e.g. Star)' }, { key: 'link_label', placeholder: 'Link label' }, { key: 'link_url', placeholder: '/url', mono: true }]}
                addLabel="Add Card" emptyItem={{ title: 'New Card', description: '', icon: 'Star', link_label: 'Learn More', link_url: '#' }} />
        </FieldRow>
    </>);
}

function FeaturesSettings({ s, set }) {
    return (<>
        <FieldRow label="Section Title"><Inp value={s.title} onChange={v => set('title', v)} placeholder="Why Choose Us" /></FieldRow>
        <FieldRow label="Section Subtitle"><Inp value={s.subtitle} onChange={v => set('subtitle', v)} placeholder="Optional subtitle" /></FieldRow>
        <FieldRow label="Feature Items">
            <ListEditor items={s.items || []} onChange={v => set('items', v)}
                fields={[{ key: 'icon', placeholder: 'Lucide icon name (e.g. CheckCircle2)' }, { key: 'title', placeholder: 'Feature title' }, { key: 'description', placeholder: 'Feature description', type: 'textarea' }]}
                addLabel="Add Feature" emptyItem={{ icon: 'CheckCircle2', title: 'New Feature', description: '' }} />
        </FieldRow>
    </>);
}

function TestimonialsSettings({ s, set }) {
    return (<>
        <FieldRow label="Section Title"><Inp value={s.title} onChange={v => set('title', v)} placeholder="What Our Customers Say" /></FieldRow>
        <FieldRow label="Testimonials">
            <ListEditor items={s.items || []} onChange={v => set('items', v)}
                fields={[{ key: 'name', placeholder: 'Customer full name' }, { key: 'role', placeholder: 'Job title & company' }, { key: 'text', placeholder: 'Testimonial text…', type: 'textarea' }, { key: 'rating', placeholder: 'Star rating (1–5)' }]}
                addLabel="Add Testimonial" emptyItem={{ name: 'Customer Name', role: 'Title', text: 'Great product!', rating: 5 }} />
        </FieldRow>
    </>);
}

function CtaSettings({ s, set }) {
    return (<>
        <FieldRow label="Headline"><Inp value={s.title} onChange={v => set('title', v)} placeholder="Ready to Get Started?" /></FieldRow>
        <FieldRow label="Sub-headline"><Tarea value={s.subtitle} onChange={v => set('subtitle', v)} placeholder="Supporting description…" /></FieldRow>
        <FieldRow label="Button"><div style={{ display: 'flex', gap: 6 }}><Inp value={s.button_label} onChange={v => set('button_label', v)} placeholder="Start Free Trial" /><Inp value={s.button_url} onChange={v => set('button_url', v)} placeholder="/signup" mono /></div></FieldRow>
        <FieldRow label="Background Color"><ColorPicker value={s.bg_color} onChange={v => set('bg_color', v)} /></FieldRow>
        <FieldRow label="Alignment"><Sel value={s.align || 'center'} onChange={v => set('align', v)} options={[{ value: 'left', label: '← Left' }, { value: 'center', label: '⊙ Center' }, { value: 'right', label: '→ Right' }]} /></FieldRow>
    </>);
}

function FooterSettings({ s, set }) {
    return (<>
        <FieldRow label="Logo Text"><Inp value={s.logo_text} onChange={v => set('logo_text', v)} placeholder="Brand Name" /></FieldRow>
        <FieldRow label="Tagline"><Inp value={s.tagline} onChange={v => set('tagline', v)} placeholder="Building great things since…" /></FieldRow>
        <FieldRow label="Copyright"><Inp value={s.copyright} onChange={v => set('copyright', v)} placeholder="© 2024 Brand. All rights reserved." /></FieldRow>
        <FieldRow label="Footer Columns">
            <ListEditor items={s.columns || []} onChange={v => set('columns', v)}
                fields={[{ key: 'title', placeholder: 'Column heading (e.g. Company)' }]}
                addLabel="Add Column" emptyItem={{ title: 'New Column', links: [] }} />
        </FieldRow>
        <FieldRow label="Social Links">
            <ListEditor items={s.social || []} onChange={v => set('social', v)}
                fields={[{ key: 'platform', placeholder: 'twitter / facebook / instagram / linkedin' }, { key: 'url', placeholder: 'https://...', mono: true }]}
                addLabel="Add Social Link" emptyItem={{ platform: 'twitter', url: '' }} />
        </FieldRow>
    </>);
}

const SETTINGS_MAP = { navbar: NavbarSettings, hero: HeroSettings, carousel: CarouselSettings, cards: CardsSettings, features: FeaturesSettings, testimonials: TestimonialsSettings, cta: CtaSettings, footer: FooterSettings };

// ── Style Overrides Tab ───────────────────────────────────────────────────────
const SHADOW_OPTIONS = [
    { value: '',                                                  label: '— Inherit global —' },
    { value: 'none',                                              label: 'None' },
    { value: '0 1px 3px rgba(0,0,0,0.08)',                       label: 'Subtle' },
    { value: '0 4px 12px rgba(0,0,0,0.10)',                      label: 'Medium' },
    { value: '0 8px 30px rgba(0,0,0,0.15)',                      label: 'Strong' },
    { value: '0 20px 60px rgba(0,0,0,0.18)',                     label: 'Dramatic' },
    { value: 'inset 0 2px 8px rgba(0,0,0,0.12)',                 label: 'Inset' },
];

const BG_SIZE_OPTIONS = [
    { value: '',        label: '— default —' },
    { value: 'cover',   label: 'Cover (fill)' },
    { value: 'contain', label: 'Contain (fit)' },
    { value: '100% auto', label: 'Full width' },
    { value: 'auto 100%', label: 'Full height' },
];

const BG_POS_OPTIONS = [
    { value: '',              label: '— default —' },
    { value: 'center center', label: 'Center' },
    { value: 'top center',    label: 'Top' },
    { value: 'bottom center', label: 'Bottom' },
    { value: 'left center',   label: 'Left' },
    { value: 'right center',  label: 'Right' },
];

const FONT_FAMILY_OPTIONS = [
    { value: '',                   label: '— Inherit theme —' },
    { value: 'inherit',            label: 'Inherit' },
    { value: "'Inter', sans-serif",          label: 'Inter' },
    { value: "'Poppins', sans-serif",        label: 'Poppins' },
    { value: "'Outfit', sans-serif",         label: 'Outfit' },
    { value: "'DM Sans', sans-serif",        label: 'DM Sans' },
    { value: "'Montserrat', sans-serif",     label: 'Montserrat' },
    { value: "'Roboto', sans-serif",         label: 'Roboto' },
    { value: "'Nunito', sans-serif",         label: 'Nunito' },
    { value: "'Playfair Display', serif",    label: 'Playfair Display' },
    { value: "'Georgia', serif",             label: 'Georgia' },
    { value: "'Courier New', monospace",     label: 'Courier New' },
];

const FONT_WEIGHT_OPTIONS = [
    { value: '',    label: '— Inherit —' },
    { value: '300', label: 'Light (300)' },
    { value: '400', label: 'Regular (400)' },
    { value: '500', label: 'Medium (500)' },
    { value: '600', label: 'SemiBold (600)' },
    { value: '700', label: 'Bold (700)' },
    { value: '800', label: 'ExtraBold (800)' },
    { value: '900', label: 'Black (900)' },
];

const TEXT_TRANSFORM_OPTIONS = [
    { value: '',           label: '— Inherit —' },
    { value: 'none',       label: 'None' },
    { value: 'uppercase',  label: 'UPPERCASE' },
    { value: 'lowercase',  label: 'lowercase' },
    { value: 'capitalize', label: 'Capitalize' },
];

const BORDER_STYLE_OPTIONS = [
    { value: '',       label: '— Inherit —' },
    { value: 'none',   label: 'None' },
    { value: 'solid',  label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' },
    { value: 'double', label: 'Double' },
];

const OVERFLOW_OPTIONS = [
    { value: '',        label: '— default —' },
    { value: 'visible', label: 'Visible' },
    { value: 'hidden',  label: 'Hidden' },
    { value: 'scroll',  label: 'Scroll' },
    { value: 'auto',    label: 'Auto' },
];

const POSITION_OPTIONS = [
    { value: '',         label: '— default —' },
    { value: 'relative', label: 'Relative' },
    { value: 'sticky',   label: 'Sticky' },
    { value: 'fixed',    label: 'Fixed' },
];

function StyleGroup({ IconComp, title, children, collapsible = false }) {
    const [open, setOpen] = useState(true);
    return (
        <div style={{ marginBottom: 16 }}>
            <button type="button" onClick={() => collapsible && setOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', marginBottom: open ? 10 : 4, paddingBottom: 6, borderBottom: `1px solid ${C.border}`, background: 'none', border: 'none', padding: 0, paddingBottom: 6, cursor: collapsible ? 'pointer' : 'default' }}>
                <IconComp size={13} color={C.textMuted} />
                <span style={{ flex: 1, fontSize: 10.5, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, textAlign: 'left' }}>{title}</span>
                {collapsible && <span style={{ fontSize: 10, color: C.textLight }}>{open ? '▲' : '▼'}</span>}
            </button>
            {open && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>}
        </div>
    );
}

// Slider with live value badge
function Slider({ min, max, step, value, onChange, unit = 'px' }) {
    const num = parseFloat(value) || 0;
    return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="range" min={min} max={max} step={step} value={num}
                onChange={e => onChange(e.target.value === String(min) ? '' : `${e.target.value}${unit}`)}
                style={{ flex: 1 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.text, minWidth: 38, textAlign: 'center', background: C.panelDark, border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 5px' }}>{num}{unit}</span>
        </div>
    );
}

// Alignment button group
function AlignButtons({ value, onChange }) {
    const opts = [
        { v: 'left',    Icon: AlignLeft    },
        { v: 'center',  Icon: AlignCenter  },
        { v: 'right',   Icon: AlignRight   },
        { v: 'justify', Icon: AlignJustify },
    ];
    return (
        <div style={{ display: 'flex', gap: 4 }}>
            {opts.map(o => (
                <button key={o.v} type="button" onClick={() => onChange(value === o.v ? '' : o.v)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 30, border: `1.5px solid ${value === o.v ? C.accent : C.border}`, borderRadius: C.radiusSm, background: value === o.v ? C.accentSoft : '#fff', cursor: 'pointer', color: value === o.v ? C.accent : C.textMuted }}>
                    <o.Icon size={13} />
                </button>
            ))}
        </div>
    );
}

function StyleTab({ style = {}, onChange }) {
    const set = (key, value) => onChange({ ...style, [key]: value === '' ? undefined : value });
    const hasOverrides = Object.values(style).some(v => v !== undefined && v !== '');

    return (
        <div>
            {hasOverrides && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '6px 10px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: C.radiusSm }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#92400e', fontWeight: 600 }}>
                        <Paintbrush size={12} /> Custom styles active
                    </div>
                    <button onClick={() => onChange({})}
                        style={{ background: 'none', border: 'none', fontSize: 11, color: C.danger, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <RefreshCw size={11} /> Reset all
                    </button>
                </div>
            )}

            {/* ── Background ─────────────────────────────── */}
            <StyleGroup IconComp={Contrast} title="Background">
                <FieldRow label="Background Color"><ColorPicker value={style.bg || ''} onChange={v => set('bg', v)} /></FieldRow>
                <FieldRow label="Gradient" hint="CSS gradient">
                    <Inp value={style.bgGradient || ''} onChange={v => set('bgGradient', v)}
                        placeholder="linear-gradient(135deg,#667eea,#764ba2)" mono />
                </FieldRow>
                <FieldRow label="Background Image URL">
                    <Inp value={style.bgImage || ''} onChange={v => set('bgImage', v)} placeholder="https://..." mono />
                </FieldRow>
                {style.bgImage && <>
                    <FieldRow label="BG Size"><Sel value={style.bgSize || ''} onChange={v => set('bgSize', v)} options={BG_SIZE_OPTIONS} /></FieldRow>
                    <FieldRow label="BG Position"><Sel value={style.bgPos || ''} onChange={v => set('bgPos', v)} options={BG_POS_OPTIONS} /></FieldRow>
                    <FieldRow label="BG Attachment">
                        <div style={{ display: 'flex', gap: 6 }}>
                            {['', 'scroll', 'fixed', 'local'].map(v => (
                                <button key={v} type="button" onClick={() => set('bgAttach', v)}
                                    style={{ flex: 1, fontSize: 10.5, padding: '4px 0', border: `1.5px solid ${(style.bgAttach || '') === v ? C.accent : C.border}`, borderRadius: C.radiusSm, background: (style.bgAttach || '') === v ? C.accentSoft : '#fff', cursor: 'pointer', color: (style.bgAttach || '') === v ? C.accent : C.textMuted, fontWeight: 600 }}>
                                    {v || 'Default'}
                                </button>
                            ))}
                        </div>
                    </FieldRow>
                </>}
                <FieldRow label="Overlay Color" hint="semi-transparent">
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <ColorPicker value={style.overlayColor || ''} onChange={v => set('overlayColor', v)} />
                    </div>
                </FieldRow>
                {style.overlayColor && (
                    <FieldRow label="Overlay Opacity">
                        <Slider min={0} max={1} step={0.05} value={style.overlayOpacity ?? 0.4} onChange={v => set('overlayOpacity', v)} unit="" />
                    </FieldRow>
                )}
            </StyleGroup>

            {/* ── Typography ─────────────────────────────── */}
            <StyleGroup IconComp={Type} title="Typography" collapsible>
                <FieldRow label="Heading Color"><ColorPicker value={style.headingColor || ''} onChange={v => set('headingColor', v)} /></FieldRow>
                <FieldRow label="Body Text Color"><ColorPicker value={style.textColor || ''} onChange={v => set('textColor', v)} /></FieldRow>
                <FieldRow label="Accent / Link Color"><ColorPicker value={style.accentColor || ''} onChange={v => set('accentColor', v)} /></FieldRow>
                <FieldRow label="Font Family"><Sel value={style.fontFamily || ''} onChange={v => set('fontFamily', v)} options={FONT_FAMILY_OPTIONS} /></FieldRow>
                <FieldRow label="Font Size (body)" hint="px">
                    <Slider min={10} max={24} step={1} value={parseInt(style.fontSize) || 14} onChange={v => set('fontSize', v)} />
                </FieldRow>
                <FieldRow label="Font Weight"><Sel value={style.fontWeight || ''} onChange={v => set('fontWeight', v)} options={FONT_WEIGHT_OPTIONS} /></FieldRow>
                <FieldRow label="Line Height" hint="e.g. 1.6">
                    <Inp value={style.lineHeight || ''} onChange={v => set('lineHeight', v)} placeholder="1.6" mono />
                </FieldRow>
                <FieldRow label="Letter Spacing" hint="em">
                    <Slider min={-0.1} max={0.3} step={0.01} value={parseFloat(style.letterSpacing) || 0} onChange={v => set('letterSpacing', v)} unit="em" />
                </FieldRow>
                <FieldRow label="Text Transform"><Sel value={style.textTransform || ''} onChange={v => set('textTransform', v)} options={TEXT_TRANSFORM_OPTIONS} /></FieldRow>
                <FieldRow label="Text Align"><AlignButtons value={style.textAlign || ''} onChange={v => set('textAlign', v)} /></FieldRow>
            </StyleGroup>

            {/* ── Border ─────────────────────────────────── */}
            <StyleGroup IconComp={Frame} title="Border" collapsible>
                <FieldRow label="Border Style"><Sel value={style.borderStyle || ''} onChange={v => set('borderStyle', v)} options={BORDER_STYLE_OPTIONS} /></FieldRow>
                <FieldRow label="Border Color"><ColorPicker value={style.borderColor || ''} onChange={v => set('borderColor', v)} /></FieldRow>
                <FieldRow label="Border Width" hint="px">
                    <Slider min={0} max={8} step={1} value={parseInt(style.borderWidth) || 0} onChange={v => set('borderWidth', v)} />
                </FieldRow>
                <FieldRow label="Border Radius" hint="px">
                    <Slider min={0} max={48} step={2} value={parseInt(style.borderRadius) || 0} onChange={v => set('borderRadius', v)} />
                </FieldRow>
                <FieldRow label="Outline Color" hint="focus ring">
                    <ColorPicker value={style.outlineColor || ''} onChange={v => set('outlineColor', v)} />
                </FieldRow>
            </StyleGroup>

            {/* ── Spacing & Layout ───────────────────────── */}
            <StyleGroup IconComp={ArrowUpDown} title="Spacing & Layout" collapsible>
                <FieldRow label="Vertical Padding" hint="px">
                    <Slider min={0} max={160} step={4} value={parseInt(style.paddingY) || 0} onChange={v => set('paddingY', v)} />
                </FieldRow>
                <FieldRow label="Horizontal Padding" hint="px or %">
                    <Inp value={style.paddingX || ''} onChange={v => set('paddingX', v)} placeholder="5% or 40px" mono />
                </FieldRow>
                <FieldRow label="Margin Top" hint="px">
                    <Slider min={-40} max={80} step={4} value={parseInt(style.marginTop) || 0} onChange={v => set('marginTop', v)} />
                </FieldRow>
                <FieldRow label="Margin Bottom" hint="px">
                    <Slider min={-40} max={80} step={4} value={parseInt(style.marginBottom) || 0} onChange={v => set('marginBottom', v)} />
                </FieldRow>
                <FieldRow label="Max Width" hint="px / % / vw">
                    <Inp value={style.maxWidth || ''} onChange={v => set('maxWidth', v)} placeholder="1200px or 90%" mono />
                </FieldRow>
                <FieldRow label="Min Height" hint="px or vh">
                    <Inp value={style.minHeight || ''} onChange={v => set('minHeight', v)} placeholder="400px or 60vh" mono />
                </FieldRow>
                <FieldRow label="Overflow"><Sel value={style.overflow || ''} onChange={v => set('overflow', v)} options={OVERFLOW_OPTIONS} /></FieldRow>
                <FieldRow label="Position"><Sel value={style.position || ''} onChange={v => set('position', v)} options={POSITION_OPTIONS} /></FieldRow>
            </StyleGroup>

            {/* ── Effects ────────────────────────────────── */}
            <StyleGroup IconComp={Blend} title="Effects" collapsible>
                <FieldRow label="Box Shadow"><Sel value={style.shadow || ''} onChange={v => set('shadow', v)} options={SHADOW_OPTIONS} /></FieldRow>
                <FieldRow label="Opacity" hint="0–1">
                    <Slider min={0} max={1} step={0.05} value={parseFloat(style.opacity) ?? 1} onChange={v => set('opacity', v)} unit="" />
                </FieldRow>
                <FieldRow label="Backdrop Blur" hint="px">
                    <Slider min={0} max={30} step={2} value={parseInt(style.backdropBlur) || 0} onChange={v => set('backdropBlur', v)} />
                </FieldRow>
                <FieldRow label="Transition" hint="CSS transition">
                    <Inp value={style.transition || ''} onChange={v => set('transition', v)} placeholder="all 0.3s ease" mono />
                </FieldRow>
                <FieldRow label="Transform" hint="CSS transform">
                    <Inp value={style.transform || ''} onChange={v => set('transform', v)} placeholder="scale(1.02) rotate(-1deg)" mono />
                </FieldRow>
                <FieldRow label="Filter" hint="CSS filter">
                    <Inp value={style.filter || ''} onChange={v => set('filter', v)} placeholder="brightness(0.9) saturate(1.2)" mono />
                </FieldRow>
            </StyleGroup>

            {/* ── Custom CSS ─────────────────────────────── */}
            <StyleGroup IconComp={Code2} title="Custom CSS" collapsible>
                <FieldRow label="Extra CSS Classes">
                    <Inp value={style.cssClass || ''} onChange={v => set('cssClass', v)} placeholder="my-section hero-dark" mono />
                </FieldRow>
                <FieldRow label="Inline CSS" hint="wrapper element">
                    <Tarea value={style.customCss || ''} onChange={v => set('customCss', v)}
                        placeholder={'background: linear-gradient(135deg, #667eea, #764ba2);\ncolor: white;\nborder-top: 3px solid #ff6b35;'} rows={5} />
                </FieldRow>
            </StyleGroup>

            {/* ── CSS Preview ────────────────────────────── */}
            {hasOverrides && (
                <div style={{ background: '#0f172a', borderRadius: C.radius, padding: '12px 14px', marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                        <Code size={11} color="#64748b" />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>Generated CSS Preview</span>
                    </div>
                    <pre style={{ margin: 0, fontSize: 10.5, color: '#94a3b8', fontFamily: '"Fira Code", monospace', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                        {buildStylePreview(style)}
                    </pre>
                </div>
            )}
        </div>
    );
}

function buildStylePreview(style) {
    if (!style) return '';
    const lines = ['.section-wrapper {'];
    const bg = style.bgGradient || (style.bg ? style.bg : '');
    if (style.bgGradient)      lines.push(`  background: ${style.bgGradient};`);
    else if (style.bg)         lines.push(`  background-color: ${style.bg};`);
    if (style.bgImage)         lines.push(`  background-image: url("${style.bgImage}");`);
    if (style.bgSize)          lines.push(`  background-size: ${style.bgSize};`);
    if (style.bgPos)           lines.push(`  background-position: ${style.bgPos};`);
    if (style.bgAttach)        lines.push(`  background-attachment: ${style.bgAttach};`);
    if (style.overlayColor)    lines.push(`  /* overlay via ::before pseudo-element */`);
    if (style.borderStyle)     lines.push(`  border-style: ${style.borderStyle};`);
    if (style.borderColor)     lines.push(`  border-color: ${style.borderColor};`);
    if (style.borderWidth)     lines.push(`  border-width: ${style.borderWidth};`);
    if (style.borderRadius)    lines.push(`  border-radius: ${style.borderRadius};`);
    if (style.paddingY)        lines.push(`  padding-top: ${style.paddingY};\n  padding-bottom: ${style.paddingY};`);
    if (style.paddingX)        lines.push(`  padding-left: ${style.paddingX};\n  padding-right: ${style.paddingX};`);
    if (style.marginTop)       lines.push(`  margin-top: ${style.marginTop};`);
    if (style.marginBottom)    lines.push(`  margin-bottom: ${style.marginBottom};`);
    if (style.maxWidth)        lines.push(`  max-width: ${style.maxWidth};\n  margin-left: auto;\n  margin-right: auto;`);
    if (style.minHeight)       lines.push(`  min-height: ${style.minHeight};`);
    if (style.overflow)        lines.push(`  overflow: ${style.overflow};`);
    if (style.position)        lines.push(`  position: ${style.position};`);
    if (style.shadow)          lines.push(`  box-shadow: ${style.shadow};`);
    if (style.opacity != null && style.opacity !== '')  lines.push(`  opacity: ${style.opacity};`);
    if (style.backdropBlur)    lines.push(`  backdrop-filter: blur(${style.backdropBlur});`);
    if (style.transition)      lines.push(`  transition: ${style.transition};`);
    if (style.transform)       lines.push(`  transform: ${style.transform};`);
    if (style.filter)          lines.push(`  filter: ${style.filter};`);
    if (style.fontFamily)      lines.push(`  font-family: ${style.fontFamily};`);
    if (style.fontSize)        lines.push(`  font-size: ${style.fontSize};`);
    if (style.fontWeight)      lines.push(`  font-weight: ${style.fontWeight};`);
    if (style.lineHeight)      lines.push(`  line-height: ${style.lineHeight};`);
    if (style.letterSpacing)   lines.push(`  letter-spacing: ${style.letterSpacing};`);
    if (style.textTransform)   lines.push(`  text-transform: ${style.textTransform};`);
    if (style.textAlign)       lines.push(`  text-align: ${style.textAlign};`);
    if (style.textColor)       lines.push(`  color: ${style.textColor};`);
    lines.push('}');
    if (style.headingColor) lines.push(`.section-wrapper h1, .section-wrapper h2, .section-wrapper h3 {\n  color: ${style.headingColor};\n}`);
    if (style.accentColor)  lines.push(`.section-wrapper a {\n  color: ${style.accentColor};\n}`);
    if (style.customCss)    lines.push(`/* Custom */\n${style.customCss}`);
    return lines.join('\n');
}

// ── Settings Panel (Content + Style tabs) ────────────────────────────────────
function SettingsPanel({ section, onUpdate, onClose }) {
    const [local, setLocal] = useState(section?.settings ?? {});
    const [tab, setTab]     = useState('content');
    const timer = useRef(null);

    useEffect(() => { setLocal(section?.settings ?? {}); setTab('content'); }, [section?.id]);

    const set = (key, value) => {
        const next = { ...local, [key]: value };
        setLocal(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => onUpdate(section.id, { settings: next }), 700);
    };

    const setStyle = (styleObj) => {
        const next = { ...local, _style: styleObj };
        setLocal(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => onUpdate(section.id, { settings: next }), 700);
    };

    const styleOverrides = local._style ?? {};
    const hasStyle = Object.values(styleOverrides).some(v => v !== undefined && v !== '');

    if (!section) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24, gap: 10 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.panelDark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MousePointer2 size={22} color={C.textLight} />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textSub, marginBottom: 4 }}>No section selected</div>
                    <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5 }}>Click any section in the canvas<br />to edit its settings here</div>
                </div>
            </div>
        );
    }

    const type   = SECTION_TYPES[section.section_type] || { Icon: Blocks, label: section.section_type, color: '#64748b', bg: '#f9fafb' };
    const Editor = SETTINGS_MAP[section.section_type] ?? (() => <div style={{ fontSize: 12, color: C.textMuted, padding: '12px 0' }}>No settings for this section.</div>);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* header */}
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: type.bg, border: `1px solid ${type.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <type.Icon size={16} color={type.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{section.label || type.label}</div>
                    <div style={{ fontSize: 10.5, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
                        Section Settings
                        {hasStyle && <span style={{ fontSize: 9, background: '#fde68a', color: '#92400e', borderRadius: 8, padding: '1px 6px', fontWeight: 700 }}>Styled</span>}
                    </div>
                </div>
                <button onClick={onClose} style={{ background: C.hover, border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textMuted }}>
                    <X size={15} />
                </button>
            </div>

            {/* label */}
            <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, background: C.panelDark, flexShrink: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: C.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                    <Tag size={10} /> Section Label
                </label>
                <input type="text" defaultValue={section.label || ''} onBlur={e => onUpdate(section.id, { label: e.target.value })}
                    placeholder={type.label} style={{ ...inputBase, fontSize: 12 }} />
            </div>

            {/* tabs */}
            <div style={{ display: 'flex', padding: '0 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                {[
                    { key: 'content', Ico: PenLine,    label: 'Content' },
                    { key: 'style',   Ico: Paintbrush, label: hasStyle ? 'Style ✦' : 'Style' },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', fontSize: 11.5, fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? C.accent : C.textMuted, background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? C.accent : 'transparent'}`, cursor: 'pointer', marginBottom: -1, transition: 'all 0.15s' }}>
                        <t.Ico size={13} /> {t.label}
                    </button>
                ))}
            </div>

            {/* body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
                {tab === 'content' ? <Editor s={local} set={set} /> : <StyleTab style={styleOverrides} onChange={setStyle} />}
            </div>
        </div>
    );
}

// ── Section Card (canvas row) ─────────────────────────────────────────────────
function SectionCard({ section, isActive, onSelect, onDelete, onToggle, dragHandleProps }) {
    const type = SECTION_TYPES[section.section_type] || { Icon: Blocks, label: section.section_type, color: '#64748b', bg: '#f9fafb', desc: '' };
    const [hovered, setHovered] = useState(false);
    const hasStyle = section.settings?._style && Object.values(section.settings._style).some(v => v !== undefined && v !== '');

    return (
        <div onClick={() => onSelect(section)}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{ background: isActive ? C.accentSoft : C.panel, border: `1.5px solid ${isActive ? C.accent : hovered ? '#cbd5e1' : C.border}`, borderLeft: `3px solid ${isActive ? C.accent : type.color}`, borderRadius: C.radius, padding: '10px 12px', marginBottom: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s', boxShadow: hovered || isActive ? C.shadow : 'none', opacity: section.is_visible ? 1 : 0.5 }}>
            {/* drag */}
            <div {...dragHandleProps} onClick={e => e.stopPropagation()} style={{ color: '#cbd5e1', cursor: 'grab', flexShrink: 0 }}>
                <GripVertical size={16} />
            </div>
            {/* icon */}
            <div style={{ width: 32, height: 32, borderRadius: 7, background: type.bg, border: `1px solid ${type.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <type.Icon size={15} color={type.color} />
            </div>
            {/* info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{section.label || type.label}</span>
                    {hasStyle && <span style={{ fontSize: 9, background: '#fde68a', color: '#92400e', borderRadius: 8, padding: '1px 5px', fontWeight: 700, flexShrink: 0 }}>Styled</span>}
                </div>
                <div style={{ fontSize: 10.5, color: C.textMuted }}>{type.desc}</div>
            </div>
            {/* actions */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => onToggle(section)} title={section.is_visible ? 'Hide' : 'Show'}
                    style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 5, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textMuted }}>
                    {section.is_visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button onClick={() => onDelete(section)} title="Delete"
                    style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 5, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.danger }}>
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
}

// ── Section Palette Item ──────────────────────────────────────────────────────
function PaletteItem({ typeKey, type, onClick }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button onClick={() => onClick(typeKey)}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', background: hovered ? type.bg : 'none', border: `1px solid ${hovered ? type.color + '40' : C.border}`, borderRadius: C.radius, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.12s' }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: type.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <type.Icon size={14} color={type.color} />
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{type.label}</div>
                <div style={{ fontSize: 10, color: C.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{type.desc}</div>
            </div>
        </button>
    );
}

// ── Page Item (left panel) ────────────────────────────────────────────────────
function PageItem({ page, isActive, onClick, onDelete, onRename, sectionsCount, dragHandleProps }) {
    const [editing, setEditing] = useState(false);
    const [name, setName]       = useState(page.name);
    const [hovered, setHovered] = useState(false);

    const commit = () => {
        setEditing(false);
        if (name.trim() && name !== page.name) onRename(page, name.trim());
        else setName(page.name);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: C.radius, cursor: 'pointer', marginBottom: 3, background: isActive ? C.accentSoft : hovered ? C.hover : 'transparent', border: `1.5px solid ${isActive ? C.accentBorder : 'transparent'}`, transition: 'all 0.15s' }}
            onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            <div {...dragHandleProps} onClick={e => e.stopPropagation()} style={{ color: '#cbd5e1', cursor: 'grab', flexShrink: 0 }}>
                <GripVertical size={14} />
            </div>
            <div style={{ width: 26, height: 26, borderRadius: 5, background: isActive ? C.accent : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={12} color={isActive ? '#fff' : C.textMuted} />
            </div>
            {editing ? (
                <input autoFocus value={name} onChange={e => setName(e.target.value)}
                    onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setName(page.name); setEditing(false); } }}
                    onClick={e => e.stopPropagation()}
                    style={{ flex: 1, fontSize: 12, border: `1.5px solid ${C.accent}`, borderRadius: 4, padding: '2px 6px', outline: 'none', minWidth: 0 }} />
            ) : (
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: isActive ? 600 : 400, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{page.name}</span>
            )}
            {!editing && sectionsCount > 0 && (
                <span style={{ fontSize: 9.5, background: isActive ? C.accent + '20' : '#e2e8f0', color: isActive ? C.accent : C.textMuted, borderRadius: 10, padding: '1px 6px', fontWeight: 600, flexShrink: 0 }}>{sectionsCount}</span>
            )}
            {!editing && (hovered || isActive) && (
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
                        <Pencil size={11} />
                    </button>
                    <button onClick={() => onDelete(page)} style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: C.danger, display: 'flex' }}>
                        <Trash2 size={11} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Add Page Form ─────────────────────────────────────────────────────────────
function AddPageForm({ themes, onAdd, onCancel }) {
    const [name, setName]       = useState('');
    const [themeId, setThemeId] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try { await onAdd(name.trim(), themeId || null); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ padding: '14px', borderTop: `1px solid ${C.border}`, background: C.panel, boxShadow: '0 -4px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: 5, background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={13} color={C.accent} />
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.accent }}>New Page</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
                    placeholder="Page name (e.g. Home, About, Menu)"
                    style={{ ...inputBase, borderColor: C.accent, boxShadow: `0 0 0 3px ${C.accentSoft}` }} />
                <select value={themeId} onChange={e => setThemeId(e.target.value)} style={{ ...inputBase, cursor: 'pointer' }}>
                    <option value="">— Inherit site global theme —</option>
                    {themes.map(t => <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' ★' : ''}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 7 }}>
                    <button onClick={submit} disabled={loading || !name.trim()}
                        style={{ flex: 1, padding: '7px', fontSize: 12.5, background: C.accent, color: '#fff', border: 'none', borderRadius: C.radiusSm, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: (!name.trim() || loading) ? 0.6 : 1 }}>
                        {loading ? <Loader2 size={13} /> : <Plus size={13} />}
                        {loading ? 'Creating…' : 'Create Page'}
                    </button>
                    <button onClick={onCancel} style={{ padding: '7px 12px', fontSize: 12, background: 'none', color: C.textMuted, border: `1.5px solid ${C.border}`, borderRadius: C.radiusSm, cursor: 'pointer' }}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Save Badge ────────────────────────────────────────────────────────────────
function SaveBadge({ status }) {
    if (!status) return null;
    if (status === 'saving') return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: C.warning, background: C.warningSoft, border: `1px solid ${C.warning}30`, borderRadius: 20, padding: '3px 10px' }}>
            <Loader2 size={12} /> Saving…
        </div>
    );
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: C.success, background: C.successSoft, border: `1px solid ${C.success}30`, borderRadius: 20, padding: '3px 10px' }}>
            <CheckCircle2 size={12} /> Saved
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SitePageBuilder({ site, themes = [], onClose }) {
    const [pages, setPages]                 = useState([]);
    const [sectionCounts, setSectionCounts] = useState({});
    const [activePage, setActivePage]       = useState(null);
    const [sections, setSections]           = useState([]);
    const [activeSection, setActiveSection] = useState(null);
    const [loadingPages, setLoadingPages]   = useState(true);
    const [loadingSec, setLoadingSec]       = useState(false);
    const [showAddPage, setShowAddPage]     = useState(false);
    const [saveStatus, setSaveStatus]       = useState('');
    const saveTimer = useRef(null);

    const markSaving = () => {
        setSaveStatus('saving');
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => setSaveStatus('saved'), 1000);
    };

    useEffect(() => {
        setLoadingPages(true);
        dsCall(`/sites/${site.id}/pages`).then(data => {
            const list = Array.isArray(data) ? data : [];
            setPages(list);
            const counts = {};
            list.forEach(p => { counts[p.id] = p.sections_count ?? 0; });
            setSectionCounts(counts);
            if (list.length > 0) setActivePage(list[0]);
            else setShowAddPage(true);
        }).finally(() => setLoadingPages(false));
    }, [site.id]);

    useEffect(() => {
        if (!activePage) { setSections([]); return; }
        setLoadingSec(true);
        setActiveSection(null);
        dsCall(`/sites/${site.id}/pages/${activePage.id}/sections`)
            .then(data => setSections(Array.isArray(data) ? data : []))
            .finally(() => setLoadingSec(false));
    }, [activePage?.id]);

    const handleAddPage = async (name, themeId) => {
        const page = await dsCall(`/sites/${site.id}/pages`, { method: 'POST', body: { name, theme_id: themeId || null } });
        setPages(prev => [...prev, page]);
        setSectionCounts(c => ({ ...c, [page.id]: 0 }));
        setActivePage(page);
        setShowAddPage(false);
        markSaving();
    };

    const handleRenamePage = async (page, name) => {
        const updated = await dsCall(`/sites/${site.id}/pages/${page.id}`, { method: 'PUT', body: { name, slug: slugify(name) } });
        setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
        if (activePage?.id === updated.id) setActivePage(updated);
        markSaving();
    };

    const handleDeletePage = async (page) => {
        if (!confirm(`Delete page "${page.name}"? All its sections will be permanently removed.`)) return;
        await dsCall(`/sites/${site.id}/pages/${page.id}`, { method: 'DELETE' });
        const next = pages.filter(p => p.id !== page.id);
        setPages(next);
        if (activePage?.id === page.id) setActivePage(next[0] ?? null);
        markSaving();
    };

    const handlePageThemeChange = async (themeId) => {
        const updated = await dsCall(`/sites/${site.id}/pages/${activePage.id}`, { method: 'PUT', body: { theme_id: themeId || null } });
        setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
        setActivePage(updated);
        markSaving();
    };

    const onPagesDragEnd = async (result) => {
        if (!result.destination) return;
        const list = Array.from(pages);
        const [moved] = list.splice(result.source.index, 1);
        list.splice(result.destination.index, 0, moved);
        setPages(list);
        await dsCall(`/sites/${site.id}/pages/reorder`, { method: 'POST', body: { items: list.map((p, i) => ({ id: p.id, sort_order: i })) } });
        markSaving();
    };

    const handleAddSection = async (sectionType) => {
        if (!activePage) return;
        const sec = await dsCall(`/sites/${site.id}/pages/${activePage.id}/sections`, { method: 'POST', body: { section_type: sectionType } });
        setSections(prev => [...prev, sec]);
        setSectionCounts(c => ({ ...c, [activePage.id]: (c[activePage.id] ?? 0) + 1 }));
        setActiveSection(sec);
        markSaving();
    };

    const handleUpdateSection = useCallback(async (sectionId, data) => {
        if (!activePage) return;
        markSaving();
        const updated = await dsCall(`/sites/${site.id}/pages/${activePage.id}/sections/${sectionId}`, { method: 'PUT', body: data });
        setSections(prev => prev.map(s => s.id === updated.id ? updated : s));
        if (activeSection?.id === updated.id) setActiveSection(updated);
    }, [site.id, activePage?.id, activeSection?.id]);

    const handleToggleSection = async (section) => {
        const updated = await dsCall(`/sites/${site.id}/pages/${activePage.id}/sections/${section.id}`, { method: 'PUT', body: { is_visible: !section.is_visible } });
        setSections(prev => prev.map(s => s.id === updated.id ? updated : s));
        markSaving();
    };

    const handleDeleteSection = async (section) => {
        if (!confirm(`Delete "${SECTION_TYPES[section.section_type]?.label ?? section.section_type}" section?`)) return;
        await dsCall(`/sites/${site.id}/pages/${activePage.id}/sections/${section.id}`, { method: 'DELETE' });
        setSections(prev => prev.filter(s => s.id !== section.id));
        setSectionCounts(c => ({ ...c, [activePage.id]: Math.max(0, (c[activePage.id] ?? 1) - 1) }));
        if (activeSection?.id === section.id) setActiveSection(null);
        markSaving();
    };

    const onSectionsDragEnd = async (result) => {
        if (!result.destination || !activePage) return;
        const list = Array.from(sections);
        const [moved] = list.splice(result.source.index, 1);
        list.splice(result.destination.index, 0, moved);
        setSections(list);
        await dsCall(`/sites/${site.id}/pages/${activePage.id}/sections/reorder`, { method: 'POST', body: { items: list.map((s, i) => ({ id: s.id, sort_order: i })) } });
        markSaving();
    };

    const globalTheme = themes.find(t => t.id === site.resolved_theme_id) ?? themes.find(t => t.is_default) ?? themes[0];
    const pageTheme   = activePage?.theme_id ? themes.find(t => t.id === activePage.theme_id) : null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: C.bg, fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>

            {/* ── Topbar ── */}
            <div style={{ height: 52, flexShrink: 0, background: C.topbar, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.2)' }}>
                <button onClick={onClose}
                    style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12.5, cursor: 'pointer', color: C.topbarText, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ArrowLeft size={14} /> Back
                </button>
                <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.12)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Globe size={14} color="#93c5fd" />
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.topbarText, lineHeight: 1.2 }}>{site.name}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1.2 }}>Page Builder</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 10px' }}>
                    <Palette size={12} color="rgba(255,255,255,0.5)" />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Global Theme:</span>
                    <span style={{ fontSize: 11, color: C.topbarText, fontWeight: 600 }}>{globalTheme?.name ?? 'Default'}</span>
                </div>
                <div style={{ flex: 1 }} />
                <SaveBadge status={saveStatus} />
                <button onClick={onClose}
                    style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 7, padding: '6px 16px', fontSize: 12.5, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} /> Done
                </button>
            </div>

            {/* ── 3-panel body ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* ── Left Panel (260px) ── */}
                <div style={{ width: 260, flexShrink: 0, background: C.panel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* pages header */}
                    <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Files size={14} color={C.textMuted} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.8 }}>Pages</span>
                            <span style={{ fontSize: 9.5, background: '#e2e8f0', color: C.textMuted, borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>{pages.length}</span>
                        </div>
                        <button onClick={() => setShowAddPage(v => !v)}
                            style={{ background: showAddPage ? C.accent : C.accentSoft, border: `1px solid ${showAddPage ? C.accent : C.accentBorder}`, borderRadius: 6, padding: '4px 9px', fontSize: 11, cursor: 'pointer', color: showAddPage ? '#fff' : C.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Plus size={12} /> Add
                        </button>
                    </div>

                    {/* pages list */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 4px', minHeight: 60 }}>
                        {loadingPages ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '16px 0', fontSize: 12, color: C.textMuted }}>
                                <Loader2 size={15} /> Loading…
                            </div>
                        ) : pages.length === 0 && !showAddPage ? (
                            <div style={{ textAlign: 'center', padding: '20px 12px', fontSize: 11.5, color: C.textMuted, lineHeight: 1.6 }}>
                                No pages yet.<br />Click <strong>+ Add</strong> to create your first page.
                            </div>
                        ) : (
                            <DragDropContext onDragEnd={onPagesDragEnd}>
                                <Droppable droppableId="pages">
                                    {(prov) => (
                                        <div ref={prov.innerRef} {...prov.droppableProps}>
                                            {pages.map((page, idx) => (
                                                <Draggable key={page.id} draggableId={`page-${page.id}`} index={idx}>
                                                    {(prov) => (
                                                        <div ref={prov.innerRef} {...prov.draggableProps}>
                                                            <PageItem page={page} isActive={activePage?.id === page.id}
                                                                onClick={() => setActivePage(page)} onDelete={handleDeletePage}
                                                                onRename={handleRenamePage} sectionsCount={sectionCounts[page.id] ?? 0}
                                                                dragHandleProps={prov.dragHandleProps} />
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {prov.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        )}
                    </div>

                    {showAddPage && <AddPageForm themes={themes} onAdd={handleAddPage} onCancel={() => setShowAddPage(false)} />}

                    {/* palette */}
                    {activePage && !showAddPage && (
                        <>
                            <div style={{ padding: '10px 12px 6px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                <Blocks size={13} color={C.textMuted} />
                                <span style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Add Section</span>
                            </div>
                            <div style={{ overflowY: 'auto', padding: '0 8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {Object.entries(SECTION_TYPES).map(([key, type]) => (
                                    <PaletteItem key={key} typeKey={key} type={type} onClick={handleAddSection} />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* ── Center Panel ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                    {!activePage ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, padding: 32 }}>
                            <div style={{ width: 64, height: 64, borderRadius: 16, background: C.panel, border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LayoutGrid size={28} color={C.textLight} />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 15, fontWeight: 700, color: C.textSub, marginBottom: 5 }}>No page selected</div>
                                <div style={{ fontSize: 12.5, color: C.textMuted }}>Create a page on the left to start building.</div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* page header */}
                            <div style={{ padding: '10px 18px', borderBottom: `1px solid ${C.border}`, background: C.panel, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, boxShadow: C.shadow }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                    <div style={{ width: 30, height: 30, borderRadius: 7, background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <FileText size={14} color={C.accent} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activePage.name}</div>
                                        <div style={{ fontSize: 10.5, color: C.textMuted }}>/{activePage.slug} · {sections.length} section{sections.length !== 1 ? 's' : ''}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                                    <Palette size={13} color={C.textMuted} />
                                    <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap' }}>Page Theme:</span>
                                    <select value={activePage.theme_id || ''} onChange={e => handlePageThemeChange(e.target.value)}
                                        style={{ fontSize: 11.5, padding: '4px 8px', border: `1.5px solid ${C.border}`, borderRadius: C.radiusSm, outline: 'none', color: C.text, background: '#fff', cursor: 'pointer', maxWidth: 180 }}>
                                        <option value="">— Inherit global ({globalTheme?.name ?? 'Default'}) —</option>
                                        {themes.map(t => <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' ★' : ''}</option>)}
                                    </select>
                                    {pageTheme && (
                                        <span style={{ fontSize: 10, padding: '2px 8px', background: '#e0e7ff', color: '#4f46e5', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                                            <ShieldCheck size={10} /> {pageTheme.name}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* sections */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
                                {loadingSec ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', padding: '48px 0', fontSize: 13, color: C.textMuted }}>
                                        <Loader2 size={18} /> Loading sections…
                                    </div>
                                ) : sections.length === 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 52, color: C.textMuted, border: `2px dashed ${C.border}`, borderRadius: C.radiusLg, background: C.panel }}>
                                        <div style={{ width: 52, height: 52, borderRadius: 14, background: C.panelDark, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                                            <Blocks size={22} color={C.textLight} />
                                        </div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: C.textSub, marginBottom: 5 }}>No sections yet</div>
                                        <div style={{ fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>Use the <strong>Add Section</strong> panel on the left<br />to build this page.</div>
                                    </div>
                                ) : (
                                    <DragDropContext onDragEnd={onSectionsDragEnd}>
                                        <Droppable droppableId="sections">
                                            {(prov) => (
                                                <div ref={prov.innerRef} {...prov.droppableProps}>
                                                    {sections.map((sec, idx) => (
                                                        <Draggable key={sec.id} draggableId={`sec-${sec.id}`} index={idx}>
                                                            {(prov) => (
                                                                <div ref={prov.innerRef} {...prov.draggableProps}>
                                                                    <SectionCard section={sec} isActive={activeSection?.id === sec.id}
                                                                        onSelect={setActiveSection} onDelete={handleDeleteSection}
                                                                        onToggle={handleToggleSection} dragHandleProps={prov.dragHandleProps} />
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {prov.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </DragDropContext>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* ── Right Panel: Settings (300px) ── */}
                <div style={{ width: 300, flexShrink: 0, background: C.panel, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <SettingsPanel section={activeSection} onUpdate={handleUpdateSection} onClose={() => setActiveSection(null)} />
                </div>
            </div>
        </div>
    );
}
