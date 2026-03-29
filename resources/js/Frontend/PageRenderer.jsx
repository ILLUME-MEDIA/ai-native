/**
 * PageRenderer — Production-ready Headless CMS frontend renderer
 *
 * ► Fetches:  GET /api/ds/{siteSlug}/page/{pageSlug}
 * ► Renders:  All block types with typed React components
 * ► Styles:   Section bg/overlay/padding from settings, block styles from style field
 * ► Features: Responsive, animated, CSS-variable themed, skeleton loading, SEO title
 *
 * Usage:
 *   <PageRenderer siteSlug="caterbox" pageSlug="home" />
 *
 *   <PageRenderer siteSlug="caterbox" pageSlug="home" blockProps={{
 *     search_bar:      { onSearch: (q) => navigate('/search?q='+q.query) },
 *     cuisine_tabs:    { onCategoryChange: (id) => setCategory(id) },
 *     restaurant_card: { onCardClick: (content) => navigate('/restaurant/'+content.name) },
 *     email_subscribe: { onSubscribe: (email) => toast('Subscribed!') },
 *   }} />
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────────
const DS_BASE = '/api/ds';

const GRID = {
    '1col':          { cols: 1, css: '1fr' },
    '2col':          { cols: 2, css: '1fr 1fr' },
    '3col':          { cols: 3, css: '1fr 1fr 1fr' },
    '4col':          { cols: 4, css: '1fr 1fr 1fr 1fr' },
    'sidebar-left':  { cols: 2, css: '280px 1fr' },
    'sidebar-right': { cols: 2, css: '1fr 280px' },
};

// ── Global CSS injection (once per app) ────────────────────────────────────────
let globalCssInjected = false;
function injectGlobalStyles() {
    if (globalCssInjected || document.getElementById('ds-page-renderer-styles')) return;
    const style = document.createElement('style');
    style.id = 'ds-page-renderer-styles';
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .ds-page-root { font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5; }
        .ds-page-root *, .ds-page-root *::before, .ds-page-root *::after { box-sizing: border-box; }
        .ds-section { width: 100%; }
        .ds-section-inner { width: 100%; margin: 0 auto; }
        .ds-grid { display: grid; gap: 24px; align-items: start; }
        .ds-block-wrap { }
        @keyframes ds-fadein { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ds-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .ds-skeleton {
            background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
            background-size: 200% 100%;
            animation: ds-shimmer 1.5s ease-in-out infinite;
            border-radius: 6px;
        }
        .ds-section-animate { animation: ds-fadein 0.5s ease both; }
        .ds-card-hover { transition: box-shadow 0.2s ease, transform 0.15s ease; cursor: pointer; }
        .ds-card-hover:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.12)!important; transform: translateY(-2px); }
        .ds-btn-hover { transition: opacity 0.15s, transform 0.1s; }
        .ds-btn-hover:hover { opacity: 0.88; transform: translateY(-1px); }
        /* Responsive grid breakdowns */
        @media (max-width: 1024px) {
            .ds-grid-4col { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 768px) {
            .ds-grid-2col, .ds-grid-3col, .ds-grid-4col,
            .ds-grid-sidebar-left, .ds-grid-sidebar-right {
                grid-template-columns: 1fr !important;
            }
            .ds-section-inner { padding-left: 16px !important; padding-right: 16px !important; }
        }
        @media (max-width: 480px) {
            .ds-grid { gap: 16px !important; }
        }
        /* Hide scrollbar on cuisine tabs */
        .ds-cuisine-scroll::-webkit-scrollbar { display: none; }
        .ds-cuisine-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        /* Navbar mobile */
        .ds-navbar-burger { display: none; flex-direction: column; gap: 4px; cursor: pointer; padding: 4px; background: none; border: none; }
        .ds-navbar-burger span { display: block; width: 22px; height: 2px; background: currentColor; border-radius: 2px; transition: all 0.2s; }
        .ds-navbar-links { display: flex; align-items: center; gap: 24px; }
        @media (max-width: 768px) {
            .ds-navbar-burger { display: flex; }
            .ds-navbar-links { display: none; flex-direction: column; align-items: flex-start; gap: 0; position: absolute; top: 100%; left: 0; right: 0; background: inherit; padding: 8px 0; border-top: 1px solid rgba(0,0,0,0.08); z-index: 999; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
            .ds-navbar-links.open { display: flex; }
            .ds-navbar-links a { padding: 10px 24px; width: 100%; }
        }
    `;
    document.head.insertBefore(style, document.head.firstChild);
    globalCssInjected = true;
}

// ── Theme CSS vars injection (once per site slug) ──────────────────────────────
const injectedSlugs = new Set();
function injectThemeCss(css, slug) {
    if (!css || injectedSlugs.has(slug)) return;
    const el = document.createElement('style');
    el.id = `ds-theme-${slug}`;
    el.textContent = css;
    document.head.appendChild(el);
    injectedSlugs.add(slug);
}

// ── Fetch helper ───────────────────────────────────────────────────────────────
async function fetchPage(siteSlug, pageSlug) {
    const res = await fetch(`${DS_BASE}/${siteSlug}/page/${pageSlug}`, {
        headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`[DS] ${res.status} — ${siteSlug}/${pageSlug}`);
    return res.json();
}

// ── Style builder ──────────────────────────────────────────────────────────────
function css(style) {
    if (!style || Array.isArray(style)) return {};
    const m = {};
    const map = {
        color: 'color', background: 'background', padding: 'padding', margin: 'margin',
        borderRadius: 'borderRadius', fontSize: 'fontSize', fontWeight: 'fontWeight',
        lineHeight: 'lineHeight', marginBottom: 'marginBottom', marginTop: 'marginTop',
        textAlign: 'textAlign', letterSpacing: 'letterSpacing',
    };
    for (const [k, v] of Object.entries(map)) {
        if (style[k]) m[k] = style[k];
    }
    if (style.customCss) {
        style.customCss.split(';').forEach(rule => {
            const [k, v] = rule.split(':').map(s => s?.trim());
            if (k && v) m[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
        });
    }
    return m;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADER
// ═══════════════════════════════════════════════════════════════════════════════
function SkeletonPage() {
    return (
        <div style={{ fontFamily: 'system-ui, sans-serif' }}>
            {/* hero skeleton */}
            <div className="ds-skeleton" style={{ height: 380, marginBottom: 0 }} />
            {/* filter skeleton */}
            <div style={{ background: '#fff', padding: '20px 24px', display: 'flex', gap: 8 }}>
                {[80, 100, 120, 90, 110, 95, 130].map((w, i) => (
                    <div key={i} className="ds-skeleton" style={{ height: 34, width: w, borderRadius: 20 }} />
                ))}
            </div>
            {/* cards skeleton */}
            <div style={{ background: '#f8fafc', padding: '32px 24px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                    {Array(6).fill(0).map((_, i) => (
                        <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <div className="ds-skeleton" style={{ height: 14, width: '80%', marginBottom: 8 }} />
                                    <div className="ds-skeleton" style={{ height: 10, width: '100%', marginBottom: 6 }} />
                                    <div className="ds-skeleton" style={{ height: 10, width: '60%', marginBottom: 10 }} />
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <div className="ds-skeleton" style={{ height: 20, width: 60, borderRadius: 4 }} />
                                    </div>
                                </div>
                                <div className="ds-skeleton" style={{ width: 72, height: 72, borderRadius: 10, flexShrink: 0 }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK RENDERERS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Core blocks ────────────────────────────────────────────────────────────────

function HeadingBlock({ content, style }) {
    const Tag = content.level || 'h2';
    const SIZE = { h1: '2.5rem', h2: '2rem', h3: '1.5rem', h4: '1.25rem', h5: '1.1rem', h6: '1rem' };
    return (
        <Tag style={{ fontSize: SIZE[Tag] || '1.75rem', fontWeight: 700, lineHeight: 1.2, margin: '0 0 16px', textAlign: content.align || 'left', color: 'inherit', ...css(style) }}>
            {content.text || ''}
        </Tag>
    );
}

function ParagraphBlock({ content, style }) {
    return (
        <p style={{ fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px', textAlign: content.align || 'left', color: 'inherit', whiteSpace: 'pre-line', ...css(style) }}>
            {content.text || ''}
        </p>
    );
}

function ImageBlock({ content, style }) {
    if (!content.url) return null;
    const img = (
        <img src={content.url} alt={content.alt || ''} loading="lazy"
            style={{ width: content.width || '100%', height: content.height || 'auto', objectFit: content.object_fit || 'cover', borderRadius: content.rounded ? 10 : 0, display: 'block', maxWidth: '100%', ...css(style) }} />
    );
    return content.caption
        ? <figure style={{ margin: 0 }}>{img}<figcaption style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 6 }}>{content.caption}</figcaption></figure>
        : (content.link_url ? <a href={content.link_url} target={content.open_new_tab ? '_blank' : '_self'} rel="noopener noreferrer">{img}</a> : img);
}

function ButtonBlock({ content, style }) {
    const BG = { primary: '#3b82f6', secondary: '#64748b', outline: 'transparent', ghost: 'transparent', danger: '#ef4444', success: '#10b981' };
    const FG = { primary: '#fff', secondary: '#fff', outline: '#3b82f6', ghost: '#3b82f6', danger: '#fff', success: '#fff' };
    const BORDER = { outline: '2px solid #3b82f6', ghost: 'none' };
    const PAD = { sm: '7px 16px', md: '10px 22px', lg: '13px 30px' };
    const FS  = { sm: 13, md: 15, lg: 17 };
    const v = content.variant || 'primary', s = content.size || 'md';
    return (
        <div style={{ textAlign: content.align || 'left', ...css(style) }}>
            <a href={content.url || '#'} target={content.open_new_tab ? '_blank' : '_self'} rel="noopener noreferrer" className="ds-btn-hover"
                style={{ display: 'inline-block', background: BG[v] || BG.primary, color: FG[v] || FG.primary, padding: PAD[s] || PAD.md, fontSize: FS[s] || 15, fontWeight: 600, borderRadius: 8, border: BORDER[v] || 'none', textDecoration: 'none', lineHeight: 1.4 }}>
                {content.label || 'Button'}
            </a>
        </div>
    );
}

function SpacerBlock({ content }) {
    return <div style={{ height: content.height || 40 }} aria-hidden="true" />;
}

function DividerBlock({ content, style }) {
    return (
        <div style={{ padding: '8px 0', ...css(style) }}>
            <hr style={{ border: 'none', borderTop: `${content.thickness || 1}px ${content.line_style || 'solid'} ${content.color || '#e2e8f0'}`, width: `${content.width_percent || 100}%`, margin: '0 auto' }} />
        </div>
    );
}

function QuoteBlock({ content, style }) {
    return (
        <blockquote style={{ borderLeft: '4px solid #3b82f6', paddingLeft: 20, margin: '16px 0', ...css(style) }}>
            <p style={{ fontSize: '1.1rem', fontStyle: 'italic', color: 'inherit', margin: '0 0 8px', textAlign: content.align || 'left', lineHeight: 1.6, opacity: 0.9 }}>
                &ldquo;{content.text || ''}&rdquo;
            </p>
            {content.author && (
                <cite style={{ fontSize: 13, color: 'inherit', fontStyle: 'normal', fontWeight: 600, opacity: 0.7 }}>
                    &mdash; {content.author}{content.author_title ? `, ${content.author_title}` : ''}
                </cite>
            )}
        </blockquote>
    );
}

function ListBlock({ content, style }) {
    const items = content.items || [];
    if (content.list_style === 'checklist') {
        return (
            <div style={css(style)}>
                {items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                        <span style={{ color: '#10b981', flexShrink: 0, fontSize: 16, fontWeight: 700, marginTop: 1 }}>✓</span>
                        <span style={{ fontSize: 15, lineHeight: 1.6 }}>{item.text}</span>
                    </div>
                ))}
            </div>
        );
    }
    const Tag = content.list_style === 'ordered' ? 'ol' : 'ul';
    return (
        <Tag style={{ paddingLeft: 22, margin: '0 0 14px', ...css(style) }}>
            {items.map((it, i) => <li key={i} style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 6 }}>{it.text}</li>)}
        </Tag>
    );
}

function VideoBlock({ content }) {
    if (!content.url) return null;
    return (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 10 }}>
            <iframe src={content.url} title="Video" allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
        </div>
    );
}

function GalleryBlock({ content }) {
    const imgs = content.images || [];
    const cols = content.columns || 3;
    if (!imgs.length) return null;
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: content.gap || 12 }}>
            {imgs.map((url, i) => (
                <img key={i} src={url} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: content.rounded ? 10 : 4, display: 'block' }} />
            ))}
        </div>
    );
}

function HtmlBlock({ content, style }) {
    return <div dangerouslySetInnerHTML={{ __html: content.code || '' }} style={css(style)} />;
}

function IconBlock({ content, style }) {
    // Renders a simple emoji/text icon (no Lucide dependency on frontend)
    const ICONS = {
        Star: '⭐', Heart: '❤️', Check: '✓', ArrowRight: '→', Zap: '⚡', Shield: '🛡️',
        Globe: '🌐', Mail: '✉️', Phone: '📞', User: '👤', Search: '🔍', Home: '🏠',
        Info: 'ℹ️', Clock: '⏰', Calendar: '📅', Bell: '🔔', Award: '🏆',
        ShoppingCart: '🛒', TrendingUp: '📈', Smile: '😊', MessageCircle: '💬',
    };
    const emoji = ICONS[content.name] || '⭐';
    return (
        <div style={{ textAlign: content.align || 'center', ...css(style) }}>
            <span style={{ fontSize: content.size || 48, color: content.color || 'inherit', display: 'inline-block', lineHeight: 1 }}
                role="img" aria-label={content.name || 'icon'}>{emoji}</span>
        </div>
    );
}

// ── Navigation blocks ──────────────────────────────────────────────────────────

/**
 * NavbarBlock — fully structured, zero HTML in DB.
 *
 * All styling uses:
 *  1. Content fields (logo_text, nav_links, cta, bg_color)
 *  2. CSS variables from design tokens (var(--color-primary), etc.)
 *  3. Block-level style overrides
 *
 * Admin changes CTA button color → changes token → ALL navbars update.
 */
function NavbarBlock({ content, style, onNavLinkClick }) {
    const [menuOpen,  setMenuOpen]  = useState(false);
    const [scrolled,  setScrolled]  = useState(false);
    const links = content.nav_links || [];
    const cta   = content.cta || {};

    useEffect(() => {
        if (!content.sticky) return;
        const handler = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
    }, [content.sticky]);

    const navBg  = content.bg_color || '#ffffff';
    const linkColor = style?.color || '#475569';

    const wrapStyle = {
        background:  navBg,
        position:    content.sticky ? 'sticky' : 'static',
        top:         0,
        zIndex:      1000,
        width:       '100%',
        transition:  'box-shadow 0.2s',
        boxShadow:   scrolled ? '0 2px 16px rgba(0,0,0,0.10)' : 'none',
        borderBottom: scrolled ? 'none' : '1px solid rgba(0,0,0,0.06)',
        ...css(style),
    };

    return (
        <nav style={wrapStyle}>
            <div style={{ maxWidth: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 60 }}>
                {/* Logo */}
                <a href={content.logo_url || '/'} style={{ textDecoration: 'none', flexShrink: 0 }}>
                    {content.logo_image
                        ? <img src={content.logo_image} alt={content.logo_text || 'Logo'} style={{ height: 36, objectFit: 'contain' }} />
                        : <span style={{ fontSize: 20, fontWeight: 800, color: linkColor === '#475569' ? '#0f172a' : linkColor, letterSpacing: '-0.02em' }}>{content.logo_text || 'Brand'}</span>
                    }
                </a>

                {/* Desktop nav links */}
                <div className="ds-navbar-links" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
                    {links.map((link, i) => (
                        <a key={i} href={link.url || '#'}
                            target={link.open_new_tab ? '_blank' : '_self'} rel="noopener noreferrer"
                            onClick={() => onNavLinkClick?.(link)}
                            style={{ fontSize: 14, fontWeight: 500, color: linkColor, textDecoration: 'none', transition: 'color 0.15s', opacity: 0.9 }}
                            onMouseOver={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--color-primary, #3b82f6)'; }}
                            onMouseOut={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.color = linkColor; }}>
                            {link.label}
                        </a>
                    ))}
                    {cta.show !== false && (
                        <a href={cta.url || '#'} className="ds-btn-hover"
                            style={{
                                fontSize: 13, fontWeight: 600, textDecoration: 'none', padding: '8px 18px', borderRadius: 7, transition: 'all 0.15s',
                                ...(cta.variant === 'outline'
                                    ? { background: 'transparent', color: 'var(--color-primary, #3b82f6)', border: '2px solid var(--color-primary, #3b82f6)' }
                                    : cta.variant === 'ghost'
                                    ? { background: 'transparent', color: 'var(--color-primary, #3b82f6)', border: 'none' }
                                    : { background: 'var(--color-primary, #3b82f6)', color: '#fff', border: 'none' })
                            }}>
                            {cta.label || 'Get Started'}
                        </a>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button onClick={() => setMenuOpen(o => !o)}
                    className="ds-navbar-burger"
                    style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: linkColor }}>
                    {menuOpen ? '✕' : '☰'}
                </button>
            </div>

            {/* Mobile dropdown */}
            {menuOpen && (
                <div className="ds-navbar-mobile" style={{ background: navBg, borderTop: '1px solid #e2e8f0', padding: '12px 24px 16px' }}>
                    {links.map((link, i) => (
                        <a key={i} href={link.url || '#'} onClick={() => setMenuOpen(false)}
                            style={{ display: 'block', padding: '10px 0', fontSize: 14, fontWeight: 500, color: linkColor, textDecoration: 'none', borderBottom: '1px solid #f1f5f9' }}>
                            {link.label}
                        </a>
                    ))}
                    {cta.show !== false && (
                        <a href={cta.url || '#'} onClick={() => setMenuOpen(false)}
                            style={{ display: 'block', marginTop: 12, textAlign: 'center', background: 'var(--color-primary, #3b82f6)', color: '#fff', padding: '10px 20px', borderRadius: 7, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                            {cta.label || 'Get Started'}
                        </a>
                    )}
                </div>
            )}
        </nav>
    );
}

// ── Ecommerce blocks ───────────────────────────────────────────────────────────

/**
 * HeroBannerBlock — works in 2 modes:
 * 1. Standalone: content.bg_image set → renders its own background/overlay
 * 2. Section-backed: no bg_image → transparent, relies on parent section for bg
 */
function HeroBannerBlock({ content, style }) {
    const hasBg  = !!content.bg_image;
    const align  = content.text_align || 'left';
    const txtAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';

    const wrapper = hasBg ? {
        position: 'relative', minHeight: 380, overflow: 'hidden',
        background: `url(${content.bg_image}) center/cover no-repeat`,
        ...css(style),
    } : { position: 'relative', ...css(style) };

    const inner = {
        position: hasBg ? 'relative' : 'static',
        zIndex: 1,
        padding: hasBg ? '60px 0' : '0',
        textAlign: txtAlign,
    };

    return (
        <div style={wrapper}>
            {hasBg && content.bg_overlay && (
                <div style={{ position: 'absolute', inset: 0, background: content.bg_overlay }} />
            )}
            <div style={inner}>
                {content.promo_tag && (
                    <div style={{ display: 'inline-block', fontSize: 13, fontWeight: 600, color: '#fbbf24', marginBottom: 10, letterSpacing: '0.02em' }}>
                        {content.promo_tag}
                    </div>
                )}
                {content.headline && (
                    <h1 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 800, color: 'inherit', margin: '0 0 14px', lineHeight: 1.12 }}>
                        {content.headline}
                    </h1>
                )}
                {content.subtext && (
                    <p style={{ fontSize: 17, opacity: 0.85, margin: '0 0 28px', maxWidth: 560, lineHeight: 1.6, ...(align === 'center' ? { margin: '0 auto 28px' } : {}) }}>
                        {content.subtext}
                    </p>
                )}
                {(content.buttons || []).length > 0 && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
                        {content.buttons.map((btn, i) => (
                            <a key={i} href={btn.url || '#'} className="ds-btn-hover"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 24, fontSize: 13, fontWeight: 600, textDecoration: 'none', background: btn.style === 'solid' ? '#fff' : 'rgba(255,255,255,0.12)', color: btn.style === 'solid' ? '#0f172a' : 'inherit', border: '1.5px solid rgba(255,255,255,0.55)', backdropFilter: 'blur(4px)' }}>
                                {btn.icon && <span>{btn.icon}</span>} {btn.label}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function SearchBarBlock({ content, style, onSearch }) {
    const [query, setQuery]  = useState('');
    const [loc,   setLoc]    = useState('');
    const submit = useCallback(() => onSearch?.({ query, location: loc }), [query, loc, onSearch]);

    return (
        <div style={{ ...css(style) }}>
            <div style={{ display: 'flex', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', maxWidth: 580 }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', borderRight: '1px solid #e2e8f0', flexShrink: 0 }}>
                    <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                </div>
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                    placeholder={content.placeholder_restaurant || 'Search restaurants...'}
                    style={{ flex: 1, border: 'none', outline: 'none', padding: '15px 12px', fontSize: 15, color: '#0f172a', background: 'transparent', minWidth: 0 }} />
                {content.show_location !== false && (
                    <div style={{ display: 'flex', alignItems: 'center', borderLeft: '1px solid #e2e8f0', padding: '0 12px', gap: 6, flexShrink: 0 }}>
                        <svg width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        <input value={loc} onChange={e => setLoc(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                            placeholder={content.placeholder_location || 'City, State'}
                            style={{ border: 'none', outline: 'none', fontSize: 14, color: '#0f172a', background: 'transparent', width: 120 }} />
                    </div>
                )}
                <button onClick={submit} className="ds-btn-hover"
                    style={{ background: content.button_bg || '#1e293b', color: '#fff', border: 'none', padding: '0 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                    {content.button_text || 'Search'}
                </button>
            </div>
        </div>
    );
}

function CuisineTabsBlock({ content, style, onCategoryChange }) {
    const [active, setActive] = useState(content.active_id || 'all');
    const cats = content.categories || [];
    const select = id => { setActive(id); onCategoryChange?.(id); };
    const scrollRef = useRef(null);

    const scroll = dir => {
        if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 180, behavior: 'smooth' });
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...css(style) }}>
            <button onClick={() => scroll(-1)} aria-label="Scroll left"
                style={{ flexShrink: 0, width: 32, height: 32, border: 'none', borderRadius: '50%', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#334155', transition: 'background 0.15s' }}
                onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'} onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}>
                ‹
            </button>
            <div ref={scrollRef} className="ds-cuisine-scroll"
                style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0', flex: 1 }}>
                {cats.map(cat => (
                    <button key={cat.id} onClick={() => select(cat.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 24, fontSize: 13, fontWeight: cat.id === active ? 700 : 500, background: cat.id === active ? '#1e293b' : '#fff', color: cat.id === active ? '#fff' : '#334155', border: cat.id === active ? '2px solid #1e293b' : '1.5px solid #e2e8f0', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s' }}>
                        {cat.emoji || null}
                        {cat.label}
                        {cat.count && (
                            <span style={{ fontSize: 10, background: cat.id === active ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: cat.id === active ? '#fff' : '#64748b', padding: '1px 6px', borderRadius: 10, fontWeight: 500 }}>
                                {cat.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>
            <button onClick={() => scroll(1)} aria-label="Scroll right"
                style={{ flexShrink: 0, width: 32, height: 32, border: 'none', borderRadius: '50%', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#334155', transition: 'background 0.15s' }}
                onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'} onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}>
                ›
            </button>
        </div>
    );
}

function RestaurantCardBlock({ content, style, onCardClick }) {
    const tags  = Array.isArray(content.tags) ? content.tags : [];
    const stars = parseFloat(content.rating) || 0;
    const full  = Math.floor(stars);
    const half  = (stars - full) >= 0.5;

    return (
        <div onClick={() => onCardClick?.(content)} className="ds-card-hover"
            style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', ...css(style) }}>
            {content.badge && (
                <div style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', padding: '2px 9px', borderRadius: 4, fontSize: 11, fontWeight: 700, marginBottom: 10, letterSpacing: '0.01em' }}>
                    {content.badge}
                </div>
            )}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {content.name || 'Restaurant'}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, lineHeight: 1.45 }}>
                        {content.address}
                    </div>
                    <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
                        {tags.map((t, i) => (
                            <span key={i} style={{ padding: '3px 9px', background: '#f1f5f9', color: '#475569', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>{t}</span>
                        ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b' }}>
                        <span style={{ color: '#f59e0b', letterSpacing: '-1px', fontSize: 13 }}>
                            {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
                        </span>
                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{content.rating}</span>
                        {content.review_count > 0 && <span>✏️ {content.review_count}</span>}
                        {content.photo_count  > 0 && <span>📷 {content.photo_count}</span>}
                    </div>
                </div>
                {content.image_url
                    ? <img src={content.image_url} alt={content.name} loading="lazy"
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, flexShrink: 0, border: '1px solid #f1f5f9' }} />
                    : <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg,#f1f5f9 0%,#e2e8f0 100%)', borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🍽️</div>
                }
            </div>
        </div>
    );
}

function DealCardBlock({ content, style }) {
    return (
        <div className="ds-card-hover"
            style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', ...css(style) }}>
            {content.image_url
                ? <img src={content.image_url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }} />
                : <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg,#f1f5f9 0%,#e2e8f0 100%)', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🎁</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{content.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
                    {content.delivery_info}
                    {content.expiry && <span style={{ color: '#ef4444', fontWeight: 600 }}> · {content.expiry}</span>}
                </div>
                <a href={content.cta_url || '#'} className="ds-btn-hover"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: content.cta_bg || '#0f172a', color: '#fff', padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    {content.cta_text || 'Shop Now'} →
                </a>
            </div>
        </div>
    );
}

function EmailSubscribeBlock({ content, style, onSubscribe }) {
    const [email, setEmail] = useState('');
    const [done,  setDone]  = useState(false);
    const submit = e => {
        e.preventDefault();
        if (!email) return;
        onSubscribe?.(email);
        setDone(true);
    };

    if (done) {
        return (
            <div style={{ ...css(style) }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600 }}>
                    ✓ You&apos;re subscribed! Thank you.
                </div>
            </div>
        );
    }

    return (
        <div style={{ ...css(style) }}>
            <form onSubmit={submit} style={{ maxWidth: 520 }}>
                <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.25)' }}>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                        placeholder={content.placeholder || 'Enter your email'}
                        style={{ flex: 1, border: 'none', outline: 'none', padding: '14px 16px', fontSize: 15, background: 'rgba(255,255,255,0.1)', color: 'inherit', minWidth: 0 }} />
                    <button type="submit" className="ds-btn-hover"
                        style={{ background: content.button_bg || '#f59e0b', color: '#0f172a', border: 'none', padding: '0 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {content.button_text || 'Subscribe now'}
                    </button>
                </div>
                {content.disclaimer && (
                    <p style={{ fontSize: 12, color: 'inherit', opacity: 0.55, margin: '8px 0 0' }}>{content.disclaimer}</p>
                )}
            </form>
        </div>
    );
}

// ── Block type → component map ─────────────────────────────────────────────────
const BLOCK_MAP = {
    heading: HeadingBlock, paragraph: ParagraphBlock, image: ImageBlock, button: ButtonBlock,
    spacer: SpacerBlock, divider: DividerBlock, quote: QuoteBlock, list: ListBlock,
    video: VideoBlock, gallery: GalleryBlock, html: HtmlBlock, icon: IconBlock,
    navbar: NavbarBlock,
    hero_banner: HeroBannerBlock, search_bar: SearchBarBlock, cuisine_tabs: CuisineTabsBlock,
    restaurant_card: RestaurantCardBlock, deal_card: DealCardBlock, email_subscribe: EmailSubscribeBlock,
};

// ── Single block render ────────────────────────────────────────────────────────
function BlockRenderer({ block, blockProps }) {
    const Component = BLOCK_MAP[block.type];
    if (!Component) {
        if (process.env.NODE_ENV === 'development') {
            return <div style={{ padding: 8, background: '#fef3c7', border: '1px dashed #f59e0b', borderRadius: 4, fontSize: 11, color: '#92400e' }}>Unknown block: {block.type}</div>;
        }
        return null;
    }
    const extra = blockProps?.[block.type] || {};
    return <Component content={block.content || {}} style={block.style || {}} {...extra} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
function SectionRenderer({ section, blockProps, animDelay = 0 }) {
    const s      = section.content || {};
    const layout = section.layout  || '1col';
    const grid   = GRID[layout] || GRID['1col'];

    // Section wrapper: full-width, handles bg
    const hasBgImage = !!s.bg_image;
    const isOverlay  = hasBgImage && s.bg_color; // bg_color as overlay on bg_image

    const sectionStyle = {
        width:      '100%',
        position:   'relative',
        background: hasBgImage
            ? `url(${s.bg_image}) center/cover no-repeat`
            : (s.bg_color || 'transparent'),
        color:      s.text_color || 'inherit',
    };

    // Content inner: applies max-width + padding
    const innerStyle = {
        maxWidth: s.max_width || '1200px',
        margin:   '0 auto',
        padding:  `${s.padding_y || 40}px 24px`,
        position: 'relative',
        zIndex:   1,
    };

    // Build columns array from blocks
    // API returns blocks as array: [[col0_blocks], [col1_blocks], ...]
    const columns = Array.from({ length: grid.cols }, (_, i) => {
        const colBlocks = Array.isArray(section.blocks)
            ? (section.blocks[i] || [])            // blocks is array of arrays
            : (section.blocks?.[String(i)] || []); // blocks is object with string keys

        return (
            <div key={i}>
                {colBlocks.map((block, bi) => (
                    <div key={block.id || bi} className="ds-block-wrap" style={{ marginBottom: bi < colBlocks.length - 1 ? 16 : 0 }}>
                        <BlockRenderer block={block} blockProps={blockProps} />
                    </div>
                ))}
            </div>
        );
    });

    const content = grid.cols > 1 ? (
        <div className={`ds-grid ds-grid-${layout}`}
            style={{ gridTemplateColumns: grid.css }}>
            {columns}
        </div>
    ) : columns;

    return (
        <section
            className="ds-section ds-section-animate"
            data-layout={layout}
            data-label={section.label}
            style={{ ...sectionStyle, animationDelay: `${animDelay}ms` }}>
            {/* Colour overlay on top of bg_image */}
            {isOverlay && (
                <div style={{ position: 'absolute', inset: 0, background: s.bg_color, pointerEvents: 'none', zIndex: 0 }} />
            )}
            <div className="ds-section-inner" style={innerStyle}>
                {content}
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PageRenderer
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * @param {string}   siteSlug      Design system site slug (e.g. 'caterbox')
 * @param {string}   pageSlug      Page slug (e.g. 'home')
 * @param {object}   data          Pre-fetched page data — skips the fetch if provided
 * @param {object}   blockProps    Event handlers per block type:
 *                                   { search_bar: { onSearch }, cuisine_tabs: { onCategoryChange }, ... }
 * @param {boolean}  updateTitle   Update document.title from page.title (default: true)
 * @param {node}     loadingNode   Custom loading UI (defaults to SkeletonPage)
 * @param {Function} onError       Called with error message if fetch fails
 */
export default function PageRenderer({
    siteSlug, pageSlug, data: initialData,
    blockProps = {}, updateTitle = true,
    loadingNode, onError,
}) {
    const [data,    setData]    = useState(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const [error,   setError]   = useState(null);

    // Inject global styles once
    useEffect(() => { injectGlobalStyles(); }, []);

    // Fetch page data
    useEffect(() => {
        if (initialData) { setData(initialData); setLoading(false); return; }
        if (!siteSlug || !pageSlug) return;

        let cancelled = false;
        setLoading(true);
        setError(null);

        fetchPage(siteSlug, pageSlug)
            .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
            .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); onError?.(e.message); } });

        return () => { cancelled = true; };
    }, [siteSlug, pageSlug]);

    // Inject theme CSS variables
    useEffect(() => {
        if (data?.css && siteSlug) injectThemeCss(data.css, siteSlug);
    }, [data?.css, siteSlug]);

    // Update document title
    useEffect(() => {
        if (updateTitle && data?.page?.title) document.title = data.page.title;
    }, [data?.page?.title, updateTitle]);

    if (loading) return loadingNode || <SkeletonPage />;

    if (error) {
        return (
            <div style={{ padding: '60px 24px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                <div style={{ fontSize: 16, color: '#ef4444', marginBottom: 8, fontWeight: 600 }}>Failed to load page</div>
                <div style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace' }}>{error}</div>
            </div>
        );
    }

    if (!data) return null;

    const sections = (data.sections || []).filter(s => s.blocks);

    return (
        <div className="ds-page-root" data-ds-site={siteSlug} data-ds-page={pageSlug}>
            {sections.map((section, i) => (
                <SectionRenderer
                    key={section.id || i}
                    section={section}
                    blockProps={blockProps}
                    animDelay={i * 80}
                />
            ))}
        </div>
    );
}

// ── Named exports for custom usage ─────────────────────────────────────────────
export {
    SectionRenderer, BlockRenderer, SkeletonPage,
    HeadingBlock, ParagraphBlock, ImageBlock, ButtonBlock, SpacerBlock,
    DividerBlock, QuoteBlock, ListBlock, VideoBlock, GalleryBlock, HtmlBlock, IconBlock,
    NavbarBlock,
    HeroBannerBlock, SearchBarBlock, CuisineTabsBlock,
    RestaurantCardBlock, DealCardBlock, EmailSubscribeBlock,
    fetchPage, injectGlobalStyles,
};
