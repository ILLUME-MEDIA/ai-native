/**
 * BlockBuilderCanvas — Visual Page Builder
 *
 * Left  (248px): Sections list + Templates tab / Blocks tab
 * Center (flex): Live visual canvas — blocks render like actual output
 * Right  (300px): Inspector — block editor OR section settings
 *
 * Features:
 * - Visual block rendering (see actual output while editing)
 * - Section templates (Navbar, Hero, Features, CTA, Footer, etc.)
 * - Drag-and-drop blocks within/across columns
 * - Drag-and-drop section reordering
 * - Duplicate block
 * - Preview mode (hides editor chrome)
 * - Section background color + padding via settings
 */

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    Plus, Trash2, Eye, EyeOff, GripVertical, X, ChevronDown, ChevronRight,
    Loader2, Blocks, Paintbrush, PenLine, Layout,
    CheckCircle2, MousePointer2, Image as ImageIcon, Play as PlayIcon,
    Navigation, Sparkles, Quote as QuoteIcon, Megaphone,
    PanelBottom, Star, Heart, Check, ArrowRight, Zap, Shield, Globe,
    Mail, Phone, User, Search, Home, Info, AlertCircle, Clock, Calendar,
    Bell, Award, ShoppingCart, TrendingUp, BarChart, Smile, ThumbsUp,
    MessageCircle, Columns2, Columns3, Wand2, Copy, LayoutGrid, Monitor,
} from 'lucide-react';

import { BLOCK_TYPES, BLOCK_CATEGORIES, COLUMN_LAYOUTS } from './BLOCK_REGISTRY';
import { useBlocks } from './useBlocks';
import { FieldRow, Inp, Tarea, Toggle, ColorPicker } from './shared';

import HeadingEditor        from './block-editors/HeadingEditor';
import ParagraphEditor      from './block-editors/ParagraphEditor';
import ImageEditor          from './block-editors/ImageEditor';
import ButtonEditor         from './block-editors/ButtonEditor';
import SpacerEditor         from './block-editors/SpacerEditor';
import DividerEditor        from './block-editors/DividerEditor';
import GalleryEditor        from './block-editors/GalleryEditor';
import VideoEditor          from './block-editors/VideoEditor';
import HtmlEditor           from './block-editors/HtmlEditor';
import QuoteEditor          from './block-editors/QuoteEditor';
import ListEditor           from './block-editors/ListEditor';
import IconEditor           from './block-editors/IconEditor';
import HeroBannerEditor     from './block-editors/HeroBannerEditor';
import SearchBarEditor      from './block-editors/SearchBarEditor';
import CuisineTabsEditor    from './block-editors/CuisineTabsEditor';
import RestaurantCardEditor from './block-editors/RestaurantCardEditor';
import DealCardEditor       from './block-editors/DealCardEditor';
import EmailSubscribeEditor from './block-editors/EmailSubscribeEditor';
import NavbarEditor         from './block-editors/NavbarEditor';

const EDITORS = {
    heading: HeadingEditor, paragraph: ParagraphEditor, image: ImageEditor,
    button: ButtonEditor, spacer: SpacerEditor, divider: DividerEditor,
    gallery: GalleryEditor, video: VideoEditor, html: HtmlEditor,
    quote: QuoteEditor, list: ListEditor, icon: IconEditor,
    // Navigation
    navbar: NavbarEditor,
    // Ecommerce
    hero_banner:     HeroBannerEditor,
    search_bar:      SearchBarEditor,
    cuisine_tabs:    CuisineTabsEditor,
    restaurant_card: RestaurantCardEditor,
    deal_card:       DealCardEditor,
    email_subscribe: EmailSubscribeEditor,
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
    bg: '#f1f5f9', panel: '#ffffff', panelDark: '#f8fafc',
    border: '#e2e8f0',
    text: '#0f172a', textSub: '#334155', textMuted: '#64748b', textLight: '#94a3b8',
    accent: '#3b82f6', accentSoft: '#eff6ff', accentBorder: '#bfdbfe',
    danger: '#ef4444',
    radius: '8px', radiusSm: '5px', radiusLg: '12px',
    shadow: '0 1px 4px rgba(0,0,0,0.06)',
};

// ── Lucide icon map for icon block preview ────────────────────────────────────
const ICON_MAP = {
    Star, Heart, Check, ArrowRight, Zap, Shield, Globe, Mail, Phone,
    User, Search, Home, Info, AlertCircle, CheckCircle2, Clock, Calendar,
    Bell, Award, ShoppingCart, TrendingUp, BarChart, Smile, ThumbsUp,
    MessageCircle, Sparkles, Blocks,
};

// ── Section Templates ─────────────────────────────────────────────────────────
const SECTION_TEMPLATES = [
    {
        id: 'navbar', label: 'Navigation Bar', color: '#3b82f6', bg: '#eff6ff', Icon: Navigation,
        layout: '1col', desc: 'Logo + nav links + CTA button',
        settings: { bg_color: '#ffffff', padding_y: '0' },
        blocks: [
            {
                col: 0, type: 'navbar', label: 'Navbar',
                content: {
                    logo_text:  'Brand',
                    logo_url:   '/',
                    logo_image: '',
                    nav_links: [
                        { label: 'Home',     url: '/',         open_new_tab: false },
                        { label: 'About',    url: '/about',    open_new_tab: false },
                        { label: 'Services', url: '/services', open_new_tab: false },
                        { label: 'Contact',  url: '/contact',  open_new_tab: false },
                    ],
                    cta:      { label: 'Get Started', url: '#', show: true, variant: 'primary' },
                    sticky:   false,
                    bg_color: '#ffffff',
                },
            },
        ],
    },
    {
        id: 'hero', label: 'Hero Banner', color: '#8b5cf6', bg: '#f5f3ff', Icon: ImageIcon,
        layout: '2col', desc: 'Heading + text + button / image',
        settings: { bg_color: '#ffffff', padding_y: '60px' },
        blocks: [
            { col: 0, type: 'heading',   label: 'Hero Heading', content: { text: 'Build Something Amazing', level: 'h1', align: 'left' } },
            { col: 0, type: 'paragraph', label: 'Hero Subtext',  content: { text: 'Start creating beautiful pages with our intuitive block builder. No code required.', align: 'left' } },
            { col: 0, type: 'button',    label: 'Primary CTA',   content: { label: 'Get Started Free', url: '#', variant: 'primary', size: 'lg', align: 'left' } },
            { col: 1, type: 'image',     label: 'Hero Image',    content: { url: '', alt: 'Hero image', width: '100%' } },
        ],
    },
    {
        id: 'features', label: '3 Features', color: '#10b981', bg: '#ecfdf5', Icon: Sparkles,
        layout: '3col', desc: 'Icon + heading + text × 3',
        settings: { bg_color: '#f8fafc', padding_y: '60px' },
        blocks: [
            { col: 0, type: 'icon',      content: { name: 'Zap',    size: 40, color: '#10b981', align: 'center' } },
            { col: 0, type: 'heading',   content: { text: 'Fast & Reliable',   level: 'h3', align: 'center' } },
            { col: 0, type: 'paragraph', content: { text: 'Lightning fast performance with 99.9% uptime guarantee.', align: 'center' } },
            { col: 1, type: 'icon',      content: { name: 'Shield', size: 40, color: '#3b82f6', align: 'center' } },
            { col: 1, type: 'heading',   content: { text: 'Secure by Default', level: 'h3', align: 'center' } },
            { col: 1, type: 'paragraph', content: { text: 'Enterprise-grade security protecting your data 24/7.', align: 'center' } },
            { col: 2, type: 'icon',      content: { name: 'Star',   size: 40, color: '#f59e0b', align: 'center' } },
            { col: 2, type: 'heading',   content: { text: 'Easy to Use',       level: 'h3', align: 'center' } },
            { col: 2, type: 'paragraph', content: { text: 'Intuitive interface designed for teams of all sizes.', align: 'center' } },
        ],
    },
    {
        id: 'cards', label: 'Cards Grid', color: '#0891b2', bg: '#ecfeff', Icon: LayoutGrid,
        layout: '3col', desc: 'Image + heading + text + button × 3',
        settings: { bg_color: '#ffffff', padding_y: '60px' },
        blocks: [
            { col: 0, type: 'image',     content: { url: '', alt: 'Card 1', width: '100%' } },
            { col: 0, type: 'heading',   content: { text: 'Card Title One',   level: 'h4', align: 'left' } },
            { col: 0, type: 'paragraph', content: { text: 'Short description of this card item goes here.', align: 'left' } },
            { col: 0, type: 'button',    content: { label: 'Read More', url: '#', variant: 'outline', size: 'sm', align: 'left' } },
            { col: 1, type: 'image',     content: { url: '', alt: 'Card 2', width: '100%' } },
            { col: 1, type: 'heading',   content: { text: 'Card Title Two',   level: 'h4', align: 'left' } },
            { col: 1, type: 'paragraph', content: { text: 'Short description of this card item goes here.', align: 'left' } },
            { col: 1, type: 'button',    content: { label: 'Read More', url: '#', variant: 'outline', size: 'sm', align: 'left' } },
            { col: 2, type: 'image',     content: { url: '', alt: 'Card 3', width: '100%' } },
            { col: 2, type: 'heading',   content: { text: 'Card Title Three', level: 'h4', align: 'left' } },
            { col: 2, type: 'paragraph', content: { text: 'Short description of this card item goes here.', align: 'left' } },
            { col: 2, type: 'button',    content: { label: 'Read More', url: '#', variant: 'outline', size: 'sm', align: 'left' } },
        ],
    },
    {
        id: 'testimonial', label: 'Testimonial', color: '#8b5cf6', bg: '#f5f3ff', Icon: QuoteIcon,
        layout: '1col', desc: 'Customer quote with author',
        settings: { bg_color: '#f8fafc', padding_y: '60px' },
        blocks: [
            { col: 0, type: 'quote', content: { text: "This product completely transformed how our team works. The results have been incredible and we couldn't be happier.", author: 'Sarah Johnson', author_title: 'CEO, Acme Corp', align: 'center' } },
        ],
    },
    {
        id: 'cta', label: 'Call to Action', color: '#ef4444', bg: '#fef2f2', Icon: Megaphone,
        layout: '1col', desc: 'Heading + subtext + big button',
        settings: { bg_color: '#1e293b', text_color: '#ffffff', padding_y: '80px' },
        blocks: [
            { col: 0, type: 'heading',   content: { text: 'Ready to Get Started?', level: 'h2', align: 'center' } },
            { col: 0, type: 'paragraph', content: { text: 'Join over 10,000 teams already using our platform to build better products.', align: 'center' } },
            { col: 0, type: 'button',    content: { label: 'Start Free Trial', url: '#', variant: 'primary', size: 'lg', align: 'center' } },
        ],
    },
    {
        id: 'footer', label: 'Footer', color: '#6b7280', bg: '#f9fafb', Icon: PanelBottom,
        layout: '3col', desc: 'Brand + nav links + contact info',
        settings: { bg_color: '#1e293b', text_color: '#94a3b8', padding_y: '40px' },
        blocks: [
            { col: 0, type: 'heading',   content: { text: 'Brand', level: 'h4', align: 'left' } },
            { col: 0, type: 'paragraph', content: { text: '© 2024 Your Company.\nAll rights reserved.', align: 'left' } },
            { col: 1, type: 'heading',   content: { text: 'Quick Links', level: 'h5', align: 'left' } },
            { col: 1, type: 'list',      content: { items: [{ text: 'Home' }, { text: 'About' }, { text: 'Services' }, { text: 'Blog' }, { text: 'Contact' }], list_style: 'unordered' } },
            { col: 2, type: 'heading',   content: { text: 'Contact', level: 'h5', align: 'left' } },
            { col: 2, type: 'paragraph', content: { text: 'info@company.com\n+1 (234) 567-890\n123 Main Street, NY', align: 'left' } },
        ],
    },
    {
        id: 'two-col',   label: 'Two Columns',   color: '#64748b', bg: '#f8fafc', Icon: Columns2,
        layout: '2col', desc: 'Empty two-column layout', settings: {}, blocks: [],
    },
    {
        id: 'three-col', label: 'Three Columns', color: '#64748b', bg: '#f8fafc', Icon: Columns3,
        layout: '3col', desc: 'Empty three-column layout', settings: {}, blocks: [],
    },
];

// ── Visual Block Renderer ─────────────────────────────────────────────────────
function BlockPreview({ block, sectionTextColor }) {
    const { block_type, content = {}, style = {} } = block;
    const defColor = sectionTextColor || undefined;
    const wrap = {
        color:        style.color        || defColor,
        background:   style.background   || undefined,
        padding:      style.padding      || undefined,
        margin:       style.margin       || undefined,
        borderRadius: style.borderRadius || undefined,
    };

    switch (block_type) {
        case 'heading': {
            const SZ = { h1: 28, h2: 22, h3: 18, h4: 15, h5: 13, h6: 12 };
            const Tag = content.level || 'h2';
            return <Tag style={{ fontSize: SZ[Tag] || 18, fontWeight: 700, margin: '0 0 4px', textAlign: content.align || 'left', lineHeight: 1.3, color: style.color || defColor || '#0f172a', ...wrap }}>{content.text || 'Heading'}</Tag>;
        }
        case 'paragraph':
            return <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: '0 0 4px', textAlign: content.align || 'left', color: style.color || defColor || '#475569', whiteSpace: 'pre-line', ...wrap }}>{content.text || 'Paragraph...'}</p>;

        case 'image':
            return content.url
                ? <img src={content.url} alt={content.alt || ''} style={{ maxWidth: '100%', height: 'auto', borderRadius: content.rounded ? 8 : 4, display: 'block', objectFit: content.object_fit || 'cover' }} />
                : <div style={{ background: '#f1f5f9', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 90, borderRadius: 6, color: '#94a3b8', gap: 6, fontSize: 11 }}>
                    <ImageIcon size={18} /> {content.alt || 'Set image URL →'}
                  </div>;

        case 'button': {
            const BG = { primary: '#3b82f6', secondary: '#64748b', outline: 'transparent', ghost: 'transparent', danger: '#ef4444' };
            const FG = { primary: '#fff',    secondary: '#fff',    outline: '#3b82f6',     ghost: '#3b82f6',     danger: '#fff'  };
            const BD = { outline: '2px solid #3b82f6', ghost: 'none' };
            const SZ = { sm: ['5px 12px', 11.5], md: ['8px 18px', 13], lg: ['12px 28px', 15] };
            const v = content.variant || 'primary'; const s = content.size || 'md';
            return <div style={{ textAlign: content.align || 'left', ...wrap }}>
                <span style={{ display: 'inline-block', background: BG[v] || BG.primary, color: FG[v] || FG.primary, padding: SZ[s]?.[0] || SZ.md[0], fontSize: SZ[s]?.[1] || 13, fontWeight: 600, borderRadius: 6, border: BD[v] || 'none', lineHeight: 1.4, cursor: 'default', userSelect: 'none' }}>
                    {content.label || 'Button'}
                </span>
            </div>;
        }

        case 'spacer':
            return <div style={{ height: content.height || 40, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, border: '1px dashed #e2e8f040', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{content.height || 40}px spacer</span>
                </div>
            </div>;

        case 'divider':
            return <div style={{ padding: '6px 0', ...wrap }}>
                <hr style={{ border: 'none', borderTop: `${content.thickness || 1}px ${content.line_style || 'solid'} ${content.color || '#e2e8f0'}`, width: `${content.width_percent || 100}%`, margin: '0 auto' }} />
            </div>;

        case 'quote':
            return <blockquote style={{ borderLeft: '4px solid #3b82f6', paddingLeft: 14, margin: '4px 0', ...wrap }}>
                <p style={{ fontSize: 14, fontStyle: 'italic', color: style.color || defColor || '#334155', margin: '0 0 5px', textAlign: content.align || 'left', lineHeight: 1.6 }}>"{content.text || 'Quote text'}"</p>
                {content.author && <cite style={{ fontSize: 11.5, color: defColor ? `${defColor}99` : '#64748b', fontStyle: 'normal', fontWeight: 600 }}>— {content.author}{content.author_title ? `, ${content.author_title}` : ''}</cite>}
            </blockquote>;

        case 'list': {
            const items = content.items || [];
            const itemStyle = { fontSize: 13.5, color: style.color || defColor || '#475569', marginBottom: 3 };
            if (content.list_style === 'checklist') {
                return <div style={{ ...wrap }}>{items.map((it, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                        <CheckCircle2 size={14} color="#10b981" />
                        <span style={itemStyle}>{it.text}</span>
                    </div>
                ))}</div>;
            }
            const Tag = content.list_style === 'ordered' ? 'ol' : 'ul';
            return <Tag style={{ paddingLeft: 20, margin: '0 0 4px', ...wrap }}>{items.map((it, i) => <li key={i} style={itemStyle}>{it.text}</li>)}</Tag>;
        }

        case 'icon': {
            const LucideIcon = ICON_MAP[content.name] || Star;
            return <div style={{ textAlign: content.align || 'center', ...wrap }}>
                <LucideIcon size={content.size || 48} color={content.color || '#3b82f6'} />
            </div>;
        }

        case 'html':
            return <div dangerouslySetInnerHTML={{ __html: content.code || '' }} style={{ fontSize: 13, ...wrap }} />;

        case 'video':
            return content.url
                ? <iframe src={content.url} title="Video" style={{ width: '100%', aspectRatio: '16/9', border: 'none', borderRadius: 6, display: 'block' }} allowFullScreen />
                : <div style={{ background: '#0f172a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 100, color: '#94a3b8', gap: 6, fontSize: 11 }}>
                    <PlayIcon size={20} /> Set video URL in inspector →
                  </div>;

        case 'gallery': {
            const imgs = content.images || [];
            const cols = content.columns || 3;
            return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: content.gap || 8, ...wrap }}>
                {imgs.length > 0
                    ? imgs.map((img, i) => <img key={i} src={img} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: content.rounded ? 6 : 2 }} />)
                    : Array.from({ length: Math.min(cols, 6) }, (_, i) => (
                        <div key={i} style={{ aspectRatio: '1', background: '#f1f5f940', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', borderRadius: 4, fontSize: 10 }}>Photo {i + 1}</div>
                    ))}
            </div>;
        }

        // ── Navigation previews ─────────────────────────────────────────────────
        case 'navbar': {
            const links = content.nav_links || [];
            const cta   = content.cta || {};
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: content.bg_color || '#ffffff', borderRadius: 6, border: '1px solid #e2e8f0', ...wrap }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {content.logo_image
                            ? <img src={content.logo_image} alt="logo" style={{ height: 24, objectFit: 'contain' }} />
                            : <span style={{ fontWeight: 800, fontSize: 15, color: style.color || defColor || '#0f172a' }}>{content.logo_text || 'Brand'}</span>
                        }
                    </div>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        {links.slice(0, 4).map((l, i) => (
                            <span key={i} style={{ fontSize: 12, fontWeight: 500, color: style.color || defColor || '#475569', opacity: 0.85 }}>{l.label}</span>
                        ))}
                        {cta.show !== false && (
                            <span style={{ background: '#3b82f6', color: '#fff', padding: '5px 12px', borderRadius: 5, fontSize: 11, fontWeight: 600 }}>{cta.label || 'Get Started'}</span>
                        )}
                    </div>
                </div>
            );
        }

        // ── Ecommerce previews ──────────────────────────────────────────────────

        case 'hero_banner': {
            const overlay = content.bg_overlay || 'rgba(0,0,0,0.5)';
            return (
                <div style={{ position: 'relative', minHeight: 120, borderRadius: 8, overflow: 'hidden', background: content.bg_image ? `url(${content.bg_image}) center/cover no-repeat` : '#1e293b' }}>
                    <div style={{ position: 'absolute', inset: 0, background: overlay }} />
                    <div style={{ position: 'relative', padding: '20px 16px', textAlign: content.text_align || 'left' }}>
                        {content.promo_tag && <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 5 }}>{content.promo_tag}</div>}
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 8 }}>{content.headline || 'Hero Heading'}</div>
                        {content.subtext && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>{content.subtext}</div>}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: content.text_align === 'center' ? 'center' : 'flex-start' }}>
                            {(content.buttons || []).map((btn, i) => (
                                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', border: '1.5px solid rgba(255,255,255,0.5)', borderRadius: 16, color: '#fff', fontSize: 11, fontWeight: 500, background: btn.style === 'solid' ? 'rgba(255,255,255,0.2)' : 'transparent' }}>
                                    {btn.icon && <span>{btn.icon}</span>} {btn.label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        case 'search_bar':
            return (
                <div style={{ display: 'flex', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', ...wrap }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', borderRight: '1px solid #e2e8f0' }}>
                        <Search size={14} color="#94a3b8" />
                    </div>
                    <div style={{ flex: 1, padding: '9px 10px', fontSize: 12.5, color: '#94a3b8' }}>{content.placeholder_restaurant || 'Search restaurants...'}</div>
                    {content.show_location !== false && (
                        <div style={{ borderLeft: '1px solid #e2e8f0', padding: '9px 10px', fontSize: 12.5, color: '#94a3b8' }}>{content.placeholder_location || 'City, State'}</div>
                    )}
                    <button style={{ background: content.button_bg || '#1e293b', color: '#fff', border: 'none', padding: '0 14px', fontSize: 12.5, fontWeight: 600, cursor: 'default' }}>
                        {content.button_text || 'Search'}
                    </button>
                </div>
            );

        case 'cuisine_tabs': {
            const cats = content.categories || [];
            const active = content.active_id || 'all';
            return (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', ...wrap }}>
                    {cats.map(cat => (
                        <span key={cat.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: cat.id === active ? 700 : 500, background: cat.id === active ? '#1e293b' : '#f1f5f9', color: cat.id === active ? '#fff' : '#334155', border: cat.id === active ? '2px solid #1e293b' : '1.5px solid #e2e8f0' }}>
                            {cat.label}
                            {cat.count && <span style={{ fontSize: 10, background: cat.id === active ? 'rgba(255,255,255,0.2)' : '#e2e8f0', padding: '1px 5px', borderRadius: 8 }}>{cat.count}</span>}
                        </span>
                    ))}
                </div>
            );
        }

        case 'restaurant_card': {
            const tags = Array.isArray(content.tags) ? content.tags : [];
            const stars = Math.round(content.rating || 4);
            return (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'flex', gap: 10, ...wrap }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{content.name || 'Restaurant Name'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, lineHeight: 1.4 }}>{content.address || '123 Main St'}</div>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                            {tags.map((t, i) => <span key={i} style={{ padding: '2px 7px', background: '#f1f5f9', color: '#475569', borderRadius: 4, fontSize: 10.5, fontWeight: 500 }}>{t}</span>)}
                        </div>
                        <div style={{ fontSize: 11, color: '#f59e0b' }}>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)} <span style={{ color: '#64748b' }}>{content.rating}</span></div>
                    </div>
                    {content.image_url
                        ? <img src={content.image_url} alt={content.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                        : <div style={{ width: 60, height: 60, background: '#e2e8f0', borderRadius: 8, flexShrink: 0 }} />}
                </div>
            );
        }

        case 'deal_card':
            return (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'flex', gap: 12, alignItems: 'center', ...wrap }}>
                    {content.image_url
                        ? <img src={content.image_url} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: '50%' }} />
                        : <div style={{ width: 52, height: 52, background: '#e2e8f0', borderRadius: '50%', flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>{content.title || 'Deal Title'}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 7 }}>
                            {content.delivery_info} · <span style={{ color: '#ef4444', fontWeight: 500 }}>{content.expiry}</span>
                        </div>
                        <span style={{ display: 'inline-block', background: content.cta_bg || '#0f172a', color: '#fff', padding: '4px 12px', borderRadius: 14, fontSize: 11, fontWeight: 600 }}>
                            {content.cta_text || 'Shop Now'} →
                        </span>
                    </div>
                </div>
            );

        case 'email_subscribe':
            return (
                <div style={{ ...wrap }}>
                    <div style={{ display: 'flex', border: '1.5px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ flex: 1, padding: '9px 12px', fontSize: 12.5, color: '#94a3b8' }}>{content.placeholder || 'Enter your email'}</div>
                        <button style={{ background: content.button_bg || '#f59e0b', color: '#0f172a', border: 'none', padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'default' }}>
                            {content.button_text || 'Subscribe now'}
                        </button>
                    </div>
                    {content.disclaimer && <div style={{ fontSize: 10.5, color: defColor ? `${defColor}99` : '#94a3b8' }}>{content.disclaimer}</div>}
                </div>
            );

        default:
            return <div style={{ padding: 8, background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: 4, fontSize: 11, color: '#64748b' }}>[{block_type}]</div>;
    }
}

// ── Visual Block Wrapper ──────────────────────────────────────────────────────
function VisualBlock({ block, isActive, onSelect, onDelete, onDuplicate, onToggle, dragHandleProps, previewMode, sectionTextColor }) {
    const [hov, setHov] = useState(false);
    const def  = BLOCK_TYPES[block.block_type] ?? { color: '#64748b', label: block.block_type };
    const show = !previewMode && (hov || isActive);

    return (
        <div
            onClick={e => { if (!previewMode) { e.stopPropagation(); onSelect(block); } }}
            onMouseEnter={() => !previewMode && setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                position: 'relative', marginBottom: 6,
                border: !previewMode ? `2px solid ${isActive ? C.accent : show ? def.color + '99' : 'transparent'}` : 'none',
                borderRadius: 6, opacity: block.is_visible ? 1 : 0.35,
                cursor: previewMode ? 'default' : 'pointer',
                padding: show ? '22px 8px 6px' : '2px 0',
                transition: 'border-color 0.12s, padding 0.1s',
            }}>
            {show && (
                <div onClick={e => e.stopPropagation()}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', background: isActive ? C.accent : def.color, borderRadius: '4px 4px 0 0', zIndex: 5 }}>
                    <div {...dragHandleProps} style={{ color: 'rgba(255,255,255,0.6)', cursor: 'grab', display: 'flex', flexShrink: 0 }}>
                        <GripVertical size={12} />
                    </div>
                    <span style={{ flex: 1, fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {block.label || def.label}
                    </span>
                    <CtrlBtn onClick={() => onDuplicate(block)} title="Duplicate"><Copy size={10} /></CtrlBtn>
                    <CtrlBtn onClick={() => onToggle(block)} title="Toggle visibility">
                        {block.is_visible ? <Eye size={10} /> : <EyeOff size={10} />}
                    </CtrlBtn>
                    <CtrlBtn onClick={() => onDelete(block)} title="Delete"><Trash2 size={10} /></CtrlBtn>
                </div>
            )}
            <BlockPreview block={block} sectionTextColor={sectionTextColor} />
        </div>
    );
}

function CtrlBtn({ onClick, title, children }) {
    return (
        <button onClick={onClick} title={title} style={{ background: 'rgba(255,255,255,0.22)', border: 'none', borderRadius: 3, width: 19, height: 19, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
            {children}
        </button>
    );
}

// ── Visual Column Drop Zone ───────────────────────────────────────────────────
function VisualColumn({ sectionId, colIndex, colCount, blocks, activeBlock, onBlockSelect, onBlockDelete, onBlockDuplicate, onBlockToggle, onColClick, previewMode, sectionTextColor }) {
    return (
        <div style={{ flex: 1, minWidth: 0 }} onClick={() => !previewMode && onColClick(colIndex)}>
            {!previewMode && colCount > 1 && (
                <div style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5, paddingLeft: 2 }}>Col {colIndex + 1}</div>
            )}
            <Droppable droppableId={`col-${sectionId}-${colIndex}`} isDropDisabled={previewMode}>
                {(prov, snap) => (
                    <div ref={prov.innerRef} {...prov.droppableProps}
                        style={{ minHeight: previewMode ? 0 : 60, background: snap.isDraggingOver ? C.accentSoft : 'transparent', border: !previewMode ? `2px dashed ${snap.isDraggingOver ? C.accent : blocks.length === 0 ? C.border : 'transparent'}` : 'none', borderRadius: 6, padding: 4, transition: 'all 0.12s' }}>
                        {!previewMode && blocks.length === 0 && !snap.isDraggingOver && (
                            <div style={{ fontSize: 11, color: C.textLight, textAlign: 'center', padding: '14px 0' }}>Drop blocks here</div>
                        )}
                        {blocks.map((block, idx) => (
                            <Draggable key={block.id} draggableId={`block-${block.id}`} index={idx} isDragDisabled={previewMode}>
                                {(p) => (
                                    <div ref={p.innerRef} {...p.draggableProps}>
                                        <VisualBlock
                                            block={block}
                                            isActive={activeBlock?.id === block.id}
                                            onSelect={onBlockSelect}
                                            onDelete={onBlockDelete}
                                            onDuplicate={onBlockDuplicate}
                                            onToggle={onBlockToggle}
                                            dragHandleProps={p.dragHandleProps}
                                            previewMode={previewMode}
                                            sectionTextColor={sectionTextColor} />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {prov.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}

// ── Visual Section Row ────────────────────────────────────────────────────────
function VisualSectionRow({ section, isActive, onSectionSelect, blocks, activeBlock, onBlockSelect, onBlockDelete, onBlockDuplicate, onBlockToggle, onDeleteSection, onToggleSection, activeCol, onColClick, dragHandleProps, previewMode }) {
    const [expanded, setExpanded] = useState(true);
    const layout   = COLUMN_LAYOUTS[section.layout || '1col'] ?? COLUMN_LAYOUTS['1col'];
    const colCount = layout.columns;
    const settings = section.settings || {};
    const bgColor   = settings.bg_color  || '#ffffff';
    const textColor = settings.text_color || undefined;
    const paddingY  = settings.padding_y  || '20px';
    const maxWidth  = settings.max_width  || '100%';

    const sectionBg = { background: bgColor };

    return (
        <div style={{ marginBottom: previewMode ? 0 : 14, border: !previewMode ? `2px solid ${isActive ? C.accent : C.border}` : 'none', borderRadius: previewMode ? 0 : C.radiusLg, overflow: 'hidden', boxShadow: !previewMode && isActive ? `0 0 0 3px ${C.accentSoft}` : C.shadow, ...sectionBg }}>
            {/* Section header bar — hidden in preview mode */}
            {!previewMode && (
                <div onClick={() => onSectionSelect(section)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: isActive ? '#1e293b' : C.panelDark, cursor: 'pointer', borderBottom: expanded ? `1px solid ${C.border}` : 'none', userSelect: 'none' }}>
                    <div {...dragHandleProps} onClick={e => e.stopPropagation()} style={{ color: C.textMuted, cursor: 'grab', display: 'flex', flexShrink: 0 }}>
                        <GripVertical size={14} />
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); setExpanded(o => !o); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: isActive ? '#94a3b8' : C.textMuted, padding: 0, display: 'flex', flexShrink: 0 }}>
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: isActive ? 'rgba(255,255,255,0.1)' : C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <layout.Icon size={12} color={isActive ? '#93c5fd' : C.accent} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#f1f5f9' : C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {section.label || 'Section'}
                        </div>
                        <div style={{ fontSize: 9.5, color: isActive ? '#94a3b8' : C.textMuted }}>
                            {layout.label} · {Object.values(blocks).flat().length} block{Object.values(blocks).flat().length !== 1 ? 's' : ''}
                            {bgColor !== '#ffffff' && <span style={{ marginLeft: 6, display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: bgColor, border: '1px solid rgba(0,0,0,0.1)', verticalAlign: 'middle' }} />}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => onToggleSection(section)} style={{ background: 'none', border: `1px solid ${isActive ? 'rgba(255,255,255,0.2)' : C.border}`, borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isActive ? '#94a3b8' : C.textMuted }}>
                            {section.is_visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        <button onClick={() => onDeleteSection(section)} style={{ background: 'none', border: `1px solid ${isActive ? 'rgba(255,255,255,0.2)' : C.border}`, borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
                            <Trash2 size={11} />
                        </button>
                    </div>
                </div>
            )}

            {/* Column content area */}
            {(expanded || previewMode) && (
                <div style={{ padding: previewMode ? `${paddingY} 40px` : 14, display: 'grid', gridTemplateColumns: layout.gridTemplate, gap: 14, maxWidth: previewMode ? maxWidth : '100%', margin: previewMode ? '0 auto' : 0, color: textColor }}>
                    {Array.from({ length: colCount }, (_, i) => (
                        <VisualColumn key={i}
                            sectionId={section.id} colIndex={i} colCount={colCount}
                            blocks={blocks[String(i)] ?? []}
                            activeBlock={activeBlock}
                            onBlockSelect={onBlockSelect}
                            onBlockDelete={onBlockDelete}
                            onBlockDuplicate={onBlockDuplicate}
                            onBlockToggle={onBlockToggle}
                            onColClick={onColClick}
                            previewMode={previewMode}
                            sectionTextColor={textColor} />
                    ))}
                </div>
            )}

            {/* Quick-add bar */}
            {!previewMode && expanded && isActive && (
                <div style={{ padding: '6px 14px', borderTop: `1px solid ${C.border}`, background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9.5, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        + Col {(activeCol ?? 0) + 1}:
                    </span>
                    {['heading', 'paragraph', 'image', 'button', 'divider', 'spacer'].map(type => {
                        const def = BLOCK_TYPES[type];
                        return (
                            <button key={type}
                                data-quick-add={type}
                                data-quick-section={section.id}
                                data-quick-col={activeCol ?? 0}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', border: `1px solid ${C.border}`, borderRadius: 12, background: '#fff', cursor: 'pointer', fontSize: 10.5, color: C.textSub }}>
                                <def.Icon size={10} color={def.color} /> {def.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Template Palette ──────────────────────────────────────────────────────────
function TemplatePalette({ onApply, applying }) {
    return (
        <div style={{ padding: '0 12px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Section Templates</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, lineHeight: 1.5 }}>Click to instantly add a pre-built section with all blocks included.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {SECTION_TEMPLATES.map(t => (
                    <button key={t.id} type="button" onClick={() => onApply(t)} disabled={applying}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: `1.5px solid ${C.border}`, borderRadius: C.radius, background: '#fff', cursor: applying ? 'wait' : 'pointer', textAlign: 'left', opacity: applying ? 0.6 : 1 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 7, background: t.bg, border: `1px solid ${t.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <t.Icon size={16} color={t.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{t.label}</div>
                            <div style={{ fontSize: 10.5, color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</div>
                        </div>
                        {applying ? <Loader2 size={13} color={C.accent} /> : <Plus size={13} color={C.textLight} />}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── Block Palette ─────────────────────────────────────────────────────────────
function BlockPalette({ onAdd, targetSectionId, targetCol }) {
    const [cat, setCat] = useState('all');
    const categories    = ['all', ...Object.keys(BLOCK_CATEGORIES)];
    const filtered      = Object.entries(BLOCK_TYPES).filter(([, t]) => cat === 'all' || t.category === cat);

    return (
        <div style={{ padding: '0 12px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Add Block</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {categories.map(c => (
                    <button key={c} type="button" onClick={() => setCat(c)}
                        style={{ fontSize: 9.5, fontWeight: 600, padding: '2px 7px', borderRadius: 20, border: `1.5px solid ${cat === c ? C.accent : C.border}`, background: cat === c ? C.accentSoft : '#fff', color: cat === c ? C.accent : C.textMuted, cursor: 'pointer', textTransform: 'capitalize' }}>
                        {c}
                    </button>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {filtered.map(([type, def]) => (
                    <button key={type} type="button" disabled={!targetSectionId}
                        onClick={() => targetSectionId && onAdd(targetSectionId, targetCol ?? 0, type)}
                        title={targetSectionId ? `Add to Col ${(targetCol ?? 0) + 1}` : 'Select a section first'}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '7px 4px', border: `1.5px solid ${C.border}`, borderRadius: C.radius, background: targetSectionId ? '#fff' : '#f8fafc', cursor: targetSectionId ? 'pointer' : 'not-allowed', opacity: targetSectionId ? 1 : 0.45 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: def.bg, border: `1px solid ${def.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <def.Icon size={14} color={def.color} />
                        </div>
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: C.textSub, textAlign: 'center', lineHeight: 1.2 }}>{def.label}</span>
                    </button>
                ))}
            </div>
            {!targetSectionId
                ? <div style={{ marginTop: 8, padding: '7px 9px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: C.radiusSm, fontSize: 10.5, color: '#92400e' }}>Select a section first, then add blocks here.</div>
                : <div style={{ marginTop: 6, fontSize: 10, color: C.textMuted, textAlign: 'center' }}>Adds to <strong>Col {(targetCol ?? 0) + 1}</strong> — click any column to change</div>}
        </div>
    );
}

// ── Layout Picker ─────────────────────────────────────────────────────────────
function LayoutPicker({ value, onChange }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
            {Object.entries(COLUMN_LAYOUTS).map(([key, def]) => (
                <button key={key} type="button" onClick={() => onChange(key)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 3px', border: `1.5px solid ${value === key ? C.accent : C.border}`, borderRadius: C.radius, background: value === key ? C.accentSoft : '#fff', cursor: 'pointer' }}>
                    <def.Icon size={15} color={value === key ? C.accent : C.textMuted} />
                    <span style={{ fontSize: 9, fontWeight: 600, color: value === key ? C.accent : C.textMuted, textAlign: 'center', lineHeight: 1.2 }}>{def.label}</span>
                </button>
            ))}
        </div>
    );
}

// ── Block Inspector ───────────────────────────────────────────────────────────
function BlockInspector({ block, onUpdate, onClose }) {
    const [tab, setTab] = useState('content');
    const def    = BLOCK_TYPES[block.block_type] ?? { Icon: Blocks, label: block.block_type, color: '#64748b', bg: '#f9fafb' };
    const Editor = EDITORS[block.block_type];
    const setContent = (key, val) => onUpdate(block.id, { content: { ...block.content, [key]: val } });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: C.panelDark }}>
                <div style={{ width: 30, height: 30, borderRadius: 6, background: def.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <def.Icon size={14} color={def.color} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{def.label}</div>
                    <div style={{ fontSize: 10, color: C.textMuted }}>Block editor</div>
                </div>
                <button onClick={onClose} style={{ background: '#e2e8f0', border: 'none', borderRadius: 5, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={13} />
                </button>
            </div>

            <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                <label style={{ fontSize: 9.5, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, display: 'block', marginBottom: 4 }}>Label (optional)</label>
                <input defaultValue={block.label || ''} onBlur={e => onUpdate(block.id, { label: e.target.value })} placeholder={def.label}
                    style={{ width: '100%', padding: '5px 8px', fontSize: 12, border: `1.5px solid ${C.border}`, borderRadius: C.radiusSm, outline: 'none', color: C.text, background: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                {[{ key: 'content', Ico: PenLine, label: 'Content' }, { key: 'style', Ico: Paintbrush, label: 'Style' }].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px', fontSize: 11.5, fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? C.accent : C.textMuted, background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? C.accent : 'transparent'}`, cursor: 'pointer', marginBottom: -1 }}>
                        <t.Ico size={12} /> {t.label}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                {tab === 'content'
                    ? (Editor ? <Editor content={block.content ?? {}} set={setContent} /> : <div style={{ fontSize: 12, color: C.textMuted }}>No settings.</div>)
                    : <BlockStyleTab style={block.style ?? {}} onChange={s => onUpdate(block.id, { style: s })} />}
            </div>
        </div>
    );
}

function BlockStyleTab({ style, onChange }) {
    const set = (k, v) => onChange({ ...style, [k]: v === '' ? undefined : v });
    return (
        <div>
            <FieldRow label="Text Color"><ColorPicker value={style.color || ''} onChange={v => set('color', v)} /></FieldRow>
            <FieldRow label="Background"><ColorPicker value={style.background || ''} onChange={v => set('background', v)} /></FieldRow>
            <FieldRow label="Padding" hint="e.g. 16px"><Inp value={style.padding || ''} onChange={v => set('padding', v)} placeholder="16px" mono /></FieldRow>
            <FieldRow label="Margin"><Inp value={style.margin || ''} onChange={v => set('margin', v)} placeholder="0 0 16px" mono /></FieldRow>
            <FieldRow label="Border Radius"><Inp value={style.borderRadius || ''} onChange={v => set('borderRadius', v)} placeholder="8px" mono /></FieldRow>
            <FieldRow label="Custom CSS" hint="key: value;"><Tarea value={style.customCss || ''} onChange={v => set('customCss', v)} rows={4} placeholder={'font-weight: bold;\ntext-transform: uppercase;'} mono /></FieldRow>
            {Object.values(style).some(Boolean) && (
                <button onClick={() => onChange({})} style={{ width: '100%', padding: '6px', border: `1px solid ${C.border}`, borderRadius: 5, background: 'none', cursor: 'pointer', fontSize: 11, color: C.danger, marginTop: 4 }}>Reset styles</button>
            )}
        </div>
    );
}

// ── Section Inspector ─────────────────────────────────────────────────────────
function SectionInspector({ section, onUpdate, onClose }) {
    const settings = section.settings || {};
    const setSettings = (key, val) => onUpdate(section.id, { settings: { ...settings, [key]: val } });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: C.panelDark }}>
                <div style={{ width: 30, height: 30, borderRadius: 6, background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Layout size={15} color={C.accent} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>Section Settings</div>
                    <div style={{ fontSize: 10, color: C.textMuted }}>Layout, background & display</div>
                </div>
                <button onClick={onClose} style={{ background: '#e2e8f0', border: 'none', borderRadius: 5, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={13} />
                </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                {/* Name */}
                <FieldRow label="Section Name">
                    <input key={section.id} defaultValue={section.label || ''} onBlur={e => onUpdate(section.id, { label: e.target.value })}
                        placeholder="e.g. Hero, Features, Footer…"
                        style={{ width: '100%', padding: '6px 10px', fontSize: 12.5, border: `1.5px solid ${C.border}`, borderRadius: 5, outline: 'none', color: C.text, background: '#fff', boxSizing: 'border-box' }} />
                </FieldRow>

                {/* Layout */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, display: 'block', marginBottom: 8 }}>Column Layout</label>
                    <LayoutPicker value={section.layout || '1col'} onChange={v => onUpdate(section.id, { layout: v })} />
                </div>

                {/* Visibility */}
                <FieldRow label="Visibility">
                    <Toggle checked={section.is_visible !== false} onChange={v => onUpdate(section.id, { is_visible: v })} label="Visible on page" />
                </FieldRow>

                <div style={{ height: 1, background: C.border, margin: '16px 0' }} />

                {/* Background & Styling */}
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 }}>Section Appearance</div>

                <FieldRow label="Background Color">
                    <ColorPicker value={settings.bg_color || '#ffffff'} onChange={v => setSettings('bg_color', v)} />
                </FieldRow>
                <FieldRow label="Background Image URL">
                    <Inp value={settings.bg_image || ''} onChange={v => setSettings('bg_image', v)} placeholder="https://…/photo.jpg" mono />
                </FieldRow>
                <FieldRow label="Text Color" hint="overrides block colors">
                    <ColorPicker value={settings.text_color || ''} onChange={v => setSettings('text_color', v)} />
                </FieldRow>
                <FieldRow label="Vertical Padding" hint="top & bottom">
                    <Inp value={settings.padding_y || ''} onChange={v => setSettings('padding_y', v)} placeholder="60px" mono />
                </FieldRow>
                <FieldRow label="Max Width" hint="content container">
                    <Inp value={settings.max_width || ''} onChange={v => setSettings('max_width', v)} placeholder="1200px" mono />
                </FieldRow>

                {/* Preview swatch */}
                {(settings.bg_color || settings.bg_image) && (
                    <div style={{ marginTop: 8, padding: '16px', borderRadius: 8, background: settings.bg_color || '#fff', backgroundImage: settings.bg_image ? `url(${settings.bg_image})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', border: `1px solid ${C.border}`, fontSize: 11, color: settings.text_color || C.textMuted, textAlign: 'center' }}>
                        Section preview
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Empty Inspector ───────────────────────────────────────────────────────────
function EmptyInspector() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24, gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.panelDark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MousePointer2 size={22} color={C.textLight} />
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textSub, marginBottom: 4 }}>Nothing selected</div>
                <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.6 }}>
                    Click a <strong>section header</strong> bar<br />
                    or click any <strong>block</strong> to edit it
                </div>
            </div>
            <div style={{ marginTop: 4, padding: '10px 12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, fontSize: 11, color: '#92400e', lineHeight: 1.5, width: '100%' }}>
                <strong>Tip:</strong> Use <em>Templates</em> tab to quickly add a pre-built section (Hero, Navbar, Features, etc.)
            </div>
        </div>
    );
}

// ── Main BlockBuilderCanvas ───────────────────────────────────────────────────
export default function BlockBuilderCanvas({ site, page, sections, onSectionUpdate, onSectionDelete, onSectionToggle, onAddSection, onReorderSections }) {
    const [activeSection,  setActiveSection]  = useState(null);
    const [activeBlock,    setActiveBlock]    = useState(null);
    const [leftTab,        setLeftTab]        = useState('templates');
    const [activeCol,      setActiveCol]      = useState(0);
    const [applying,       setApplying]       = useState(false);
    const [previewMode,    setPreviewMode]    = useState(false);
    const [loadedSections, setLoadedSections] = useState(new Set());

    const { getBlocks, loadBlocks, addBlock, updateBlock, deleteBlock, reorderBlocks, saving } = useBlocks(site.id, page.id);

    // ── Sync activeSection with latest sections array ─────────────────────────
    useEffect(() => {
        if (activeSection) {
            const fresh = sections.find(s => s.id === activeSection.id);
            if (fresh) setActiveSection(fresh);
        }
    }, [sections]); // eslint-disable-line

    const ensureBlocks = useCallback((sectionId) => {
        if (!loadedSections.has(sectionId)) {
            loadBlocks(sectionId);
            setLoadedSections(prev => new Set([...prev, sectionId]));
        }
    }, [loadedSections, loadBlocks]);

    useEffect(() => {
        sections.forEach(s => ensureBlocks(s.id));
    }, [sections.map(s => s.id).join(',')]); // eslint-disable-line

    // Reload blocks when layout changes (column count may increase)
    useEffect(() => {
        if (activeSection) {
            loadBlocks(activeSection.id);
        }
    }, [activeSection?.layout]); // eslint-disable-line

    const handleSelectSection = (section) => {
        setActiveSection(section);
        setActiveBlock(null);
        setActiveCol(0);
        ensureBlocks(section.id);
    };

    const handleSelectBlock = (block) => {
        setActiveBlock(block);
        setActiveSection(sections.find(s => s.id === block.section_id) ?? null);
    };

    const handleBlockUpdate = (blockId, patch) => {
        const sectionId = sections.find(s => Object.values(getBlocks(s.id)).flat().some(b => b.id === blockId))?.id;
        if (!sectionId) return;
        updateBlock(sectionId, blockId, patch);
        setActiveBlock(prev => prev?.id === blockId
            ? { ...prev, ...patch, content: patch.content ? { ...prev.content, ...patch.content } : prev.content }
            : prev);
    };

    const handleBlockDelete = async (block) => {
        if (!confirm(`Delete "${block.label || BLOCK_TYPES[block.block_type]?.label || 'block'}"?`)) return;
        await deleteBlock(block.section_id, block.id);
        if (activeBlock?.id === block.id) setActiveBlock(null);
    };

    const handleBlockDuplicate = (block) => {
        addBlock(block.section_id, block.column_index, block.block_type, {
            content: { ...block.content },
            label: block.label ? `${block.label} (copy)` : '',
        });
    };

    const handleBlockToggle = (block) => {
        updateBlock(block.section_id, block.id, { is_visible: !block.is_visible });
    };

    // Apply section template: create section + add all blocks sequentially
    const handleApplyTemplate = async (template) => {
        setApplying(true);
        try {
            const section = await onAddSection(template.layout, template.label, template.settings || {});
            if (!section) return;
            setLoadedSections(prev => new Set([...prev, section.id]));
            for (const blockDef of template.blocks) {
                await addBlock(section.id, blockDef.col, blockDef.type, { content: blockDef.content, label: blockDef.label || '' });
            }
            setActiveSection(section);
            setLeftTab('blocks');
        } finally {
            setApplying(false);
        }
    };

    // Unified DnD for sections + blocks
    const onDragEnd = useCallback((result) => {
        if (!result.destination) return;
        const { source, destination, draggableId, type } = result;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        if (type === 'SECTION') {
            // Section reorder
            const newOrder = Array.from(sections);
            const [moved]  = newOrder.splice(source.index, 1);
            newOrder.splice(destination.index, 0, moved);
            onReorderSections?.(newOrder);
            return;
        }

        // Block reorder (cross-column within same section)
        const parse = (id) => { const [, sid, col] = id.split('-'); return { sectionId: parseInt(sid), col: String(col) }; };
        const src  = parse(source.droppableId);
        const dest = parse(destination.droppableId);
        if (src.sectionId !== dest.sectionId) return;

        const sectionId  = src.sectionId;
        const allBlocks  = getBlocks(sectionId);
        const newGrouped = {};
        for (const [col, blocks] of Object.entries(allBlocks)) { newGrouped[col] = [...blocks]; }

        const srcArr  = [...(newGrouped[src.col]  ?? [])];
        const destArr = src.col === dest.col ? srcArr : [...(newGrouped[dest.col] ?? [])];
        const [moved] = srcArr.splice(source.index, 1);
        destArr.splice(destination.index, 0, moved);
        newGrouped[src.col]  = srcArr;
        newGrouped[dest.col] = destArr;
        reorderBlocks(sectionId, newGrouped);
    }, [getBlocks, reorderBlocks, sections, onReorderSections]);

    // Quick-add bar click handler via data-attrs
    const handleCanvasClick = useCallback((e) => {
        const btn = e.target.closest('[data-quick-add]');
        if (btn) {
            e.stopPropagation();
            addBlock(
                parseInt(btn.getAttribute('data-quick-section')),
                parseInt(btn.getAttribute('data-quick-col') || '0'),
                btn.getAttribute('data-quick-add'),
            );
        }
    }, [addBlock]);

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: C.bg }}>

            {/* ── Left Panel (hidden in preview mode) ─────────────────── */}
            {!previewMode && (
                <div style={{ width: 248, flexShrink: 0, background: C.panel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                        {[{ key: 'templates', label: 'Templates', Icon: Wand2 }, { key: 'blocks', label: 'Blocks', Icon: Blocks }].map(t => (
                            <button key={t.key} onClick={() => setLeftTab(t.key)}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 6px', fontSize: 11.5, fontWeight: leftTab === t.key ? 700 : 400, color: leftTab === t.key ? C.accent : C.textMuted, background: 'none', border: 'none', borderBottom: `2px solid ${leftTab === t.key ? C.accent : 'transparent'}`, cursor: 'pointer', marginBottom: -1 }}>
                                <t.Icon size={13} /> {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Sections list */}
                    <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                Sections{saving && <span style={{ color: C.accent, fontWeight: 400, marginLeft: 4 }}>saving…</span>}
                            </span>
                            <button onClick={() => onAddSection('1col', 'New Section', {})}
                                style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', background: C.accent, color: '#fff', border: 'none', borderRadius: 4, fontSize: 10.5, fontWeight: 600, cursor: 'pointer' }}>
                                <Plus size={11} /> Add
                            </button>
                        </div>
                        {sections.length === 0 && <div style={{ fontSize: 11, color: C.textLight, textAlign: 'center', padding: '6px 0' }}>No sections yet</div>}
                        <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                            {sections.map(s => {
                                const L = COLUMN_LAYOUTS[s.layout || '1col'] ?? COLUMN_LAYOUTS['1col'];
                                return (
                                    <div key={s.id} onClick={() => handleSelectSection(s)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 7px', borderRadius: C.radiusSm, cursor: 'pointer', marginBottom: 1, background: activeSection?.id === s.id ? C.accentSoft : 'transparent', border: `1px solid ${activeSection?.id === s.id ? C.accentBorder : 'transparent'}` }}>
                                        <L.Icon size={12} color={activeSection?.id === s.id ? C.accent : C.textMuted} />
                                        <span style={{ fontSize: 11.5, color: activeSection?.id === s.id ? C.accent : C.textSub, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: activeSection?.id === s.id ? 600 : 400 }}>
                                            {s.label || `Section ${s.id}`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab content */}
                    <div style={{ flex: 1, overflowY: 'auto', paddingTop: 12 }}>
                        {leftTab === 'templates'
                            ? <TemplatePalette onApply={handleApplyTemplate} applying={applying} />
                            : <BlockPalette targetSectionId={activeSection?.id} targetCol={activeCol} onAdd={(sid, col, type) => addBlock(sid, col, type)} />}
                    </div>
                </div>
            )}

            {/* ── Center: Visual Canvas ────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: previewMode ? 0 : 20, background: previewMode ? '#fff' : C.bg }} onClick={handleCanvasClick}>
                {/* Preview mode toolbar */}
                {previewMode && (
                    <div style={{ padding: '8px 20px', background: '#1e293b', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 10 }}>
                        <Monitor size={14} color="#94a3b8" />
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>Preview Mode — showing page as visitors will see it</span>
                        <button onClick={() => setPreviewMode(false)} style={{ marginLeft: 'auto', background: C.accent, border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                            ← Back to Editor
                        </button>
                    </div>
                )}

                {sections.length === 0 && !previewMode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, border: `2px dashed ${C.border}`, borderRadius: C.radiusLg, color: C.textMuted, gap: 16 }}>
                        <Wand2 size={40} color={C.textLight} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: C.textSub, marginBottom: 6 }}>Start building your page</div>
                            <div style={{ fontSize: 12.5, marginBottom: 20 }}>Pick a template to add a pre-built section instantly</div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 520 }}>
                            {SECTION_TEMPLATES.slice(0, 6).map(t => (
                                <button key={t.id} onClick={() => handleApplyTemplate(t)} disabled={applying}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 16px', border: `1.5px solid ${C.border}`, borderRadius: C.radius, background: '#fff', cursor: 'pointer', minWidth: 80 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <t.Icon size={18} color={t.color} />
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: C.textSub }}>{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="sections" type="SECTION" isDropDisabled={previewMode}>
                            {(prov) => (
                                <div ref={prov.innerRef} {...prov.droppableProps}>
                                    {sections.map((section, idx) => (
                                        <Draggable key={section.id} draggableId={`section-${section.id}`} index={idx} isDragDisabled={previewMode}>
                                            {(p) => (
                                                <div ref={p.innerRef} {...p.draggableProps}>
                                                    <VisualSectionRow
                                                        section={section}
                                                        isActive={!previewMode && activeSection?.id === section.id}
                                                        onSectionSelect={handleSelectSection}
                                                        blocks={getBlocks(section.id)}
                                                        activeBlock={activeBlock}
                                                        onBlockSelect={handleSelectBlock}
                                                        onBlockDelete={handleBlockDelete}
                                                        onBlockDuplicate={handleBlockDuplicate}
                                                        onBlockToggle={handleBlockToggle}
                                                        onDeleteSection={onSectionDelete}
                                                        onToggleSection={onSectionToggle}
                                                        activeCol={activeCol}
                                                        onColClick={(col) => { setActiveCol(col); setLeftTab('blocks'); }}
                                                        dragHandleProps={p.dragHandleProps}
                                                        previewMode={previewMode} />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {prov.placeholder}
                                </div>
                            )}
                        </Droppable>

                        {!previewMode && (
                            <>
                                {applying && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8, color: C.accent, fontSize: 13 }}>
                                        <Loader2 size={16} /> Building section…
                                    </div>
                                )}
                                <button onClick={() => onAddSection('1col', 'New Section', {})}
                                    style={{ width: '100%', padding: '10px', border: `2px dashed ${C.border}`, borderRadius: C.radius, background: 'none', cursor: 'pointer', fontSize: 12, color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                                    <Plus size={15} /> Add Empty Section
                                </button>
                            </>
                        )}
                    </DragDropContext>
                )}
            </div>

            {/* ── Right: Inspector (hidden in preview mode) ────────────── */}
            {!previewMode && (
                <div style={{ width: 300, flexShrink: 0, background: C.panel, borderLeft: `1px solid ${C.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {/* Preview toggle button */}
                    <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, background: C.panelDark }}>
                        <button onClick={() => setPreviewMode(true)}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px', background: '#1e293b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11.5, color: '#e2e8f0', fontWeight: 600 }}>
                            <Monitor size={13} /> Preview Page
                        </button>
                    </div>

                    {activeBlock
                        ? <BlockInspector block={activeBlock} onUpdate={handleBlockUpdate} onClose={() => setActiveBlock(null)} />
                        : activeSection
                            ? <SectionInspector section={activeSection} onUpdate={onSectionUpdate} onClose={() => setActiveSection(null)} />
                            : <EmptyInspector />}
                </div>
            )}
        </div>
    );
}
