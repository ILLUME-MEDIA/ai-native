/**
 * RestaurantDemo — Complete ecommerce restaurant page
 * Powered entirely by design tokens from:
 *   GET /api/design-tokens/discovery        → JSON token map
 *   GET /api/design-tokens/discovery/css    → CSS variables (injected into page)
 *   GET /api/design-tokens/discovery/theme  → Full theme metadata
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const DS_SLUG = 'discovery';
const DS_BASE = `https://development.illumemedia.app/api/design-tokens/${DS_SLUG}`;

let cssInjected = false;
function injectDesignTokenCss() {
    if (cssInjected || document.getElementById('ds-resto-css')) { cssInjected = true; return; }
    const link = document.createElement('link');
    link.id = 'ds-resto-css'; link.rel = 'stylesheet';
    link.href = `${DS_BASE}/css`; link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    cssInjected = true;
}

const CATEGORIES = [
    { id: 'all', label: 'All', emoji: '🍽️' },
    { id: 'pizza', label: 'Pizza', emoji: '🍕' },
    { id: 'burgers', label: 'Burgers', emoji: '🍔' },
    { id: 'sushi', label: 'Sushi', emoji: '🍣' },
    { id: 'pasta', label: 'Pasta', emoji: '🍝' },
    { id: 'desserts', label: 'Desserts', emoji: '🍰' },
    { id: 'drinks', label: 'Drinks', emoji: '🥤' },
    { id: 'salads', label: 'Salads', emoji: '🥗' },
];

const MENU_ITEMS = [
    { id: 1,  cat: 'pizza',    name: 'Margherita Classic',    desc: 'Fresh tomato, mozzarella, basil, olive oil',              price: 14.99, rating: 4.8, reviews: 240, badge: 'Popular',     emoji: '🍕', calories: 820 },
    { id: 2,  cat: 'pizza',    name: 'BBQ Chicken Feast',     desc: 'Smoky BBQ, grilled chicken, red onion, jalapeño',         price: 17.99, rating: 4.7, reviews: 189, badge: 'Spicy',       emoji: '🍕', calories: 950 },
    { id: 3,  cat: 'pizza',    name: 'Veggie Supreme',        desc: 'Bell peppers, mushrooms, olives, artichoke hearts',       price: 13.99, rating: 4.5, reviews: 132, badge: 'Vegan',       emoji: '🍕', calories: 720 },
    { id: 4,  cat: 'burgers',  name: 'Double Smash Burger',   desc: 'Two smashed patties, American cheese, special sauce',     price: 12.99, rating: 4.9, reviews: 310, badge: 'Best Seller', emoji: '🍔', calories: 1100 },
    { id: 5,  cat: 'burgers',  name: 'Crispy Chicken Burger', desc: 'Fried chicken breast, coleslaw, pickles, chipotle mayo',  price: 11.99, rating: 4.6, reviews: 205, badge: null,          emoji: '🍔', calories: 890 },
    { id: 6,  cat: 'burgers',  name: 'Mushroom Swiss Burger', desc: 'Beef patty, sautéed mushrooms, Swiss cheese, aioli',      price: 13.49, rating: 4.4, reviews: 98,  badge: 'New',         emoji: '🍔', calories: 980 },
    { id: 7,  cat: 'sushi',    name: 'Dragon Roll',           desc: 'Shrimp tempura, avocado, unagi, tobiko',                  price: 16.99, rating: 4.9, reviews: 278, badge: 'Popular',     emoji: '🍣', calories: 640 },
    { id: 8,  cat: 'sushi',    name: 'Salmon Nigiri Set',     desc: '6-piece premium Atlantic salmon over sushi rice',         price: 14.50, rating: 4.8, reviews: 195, badge: null,          emoji: '🍣', calories: 480 },
    { id: 9,  cat: 'pasta',    name: 'Carbonara Classica',    desc: 'Spaghetti, guanciale, egg yolk, Pecorino, black pepper',  price: 13.99, rating: 4.7, reviews: 167, badge: 'Chef Pick',   emoji: '🍝', calories: 760 },
    { id: 10, cat: 'pasta',    name: 'Pesto Genovese',        desc: 'Trofie pasta, fresh basil pesto, pine nuts, Parmigiano',  price: 12.99, rating: 4.5, reviews: 143, badge: 'Vegan',       emoji: '🍝', calories: 680 },
    { id: 11, cat: 'desserts', name: 'Tiramisu',              desc: 'Espresso-soaked ladyfingers, mascarpone cream, cocoa',    price: 7.99,  rating: 4.9, reviews: 312, badge: 'Popular',     emoji: '🍰', calories: 420 },
    { id: 12, cat: 'desserts', name: 'Lava Chocolate Cake',   desc: 'Warm dark chocolate cake, molten center, vanilla gelato', price: 8.99,  rating: 4.8, reviews: 256, badge: 'Hot',         emoji: '🍰', calories: 580 },
    { id: 13, cat: 'drinks',   name: 'Mango Lassi',           desc: 'Fresh mango, yogurt, cardamom, honey',                   price: 5.99,  rating: 4.6, reviews: 88,  badge: null,          emoji: '🥤', calories: 220 },
    { id: 14, cat: 'drinks',   name: 'Craft Lemonade',        desc: 'Fresh-squeezed lemon, mint, sparkling water, agave',     price: 4.99,  rating: 4.5, reviews: 76,  badge: 'Fresh',       emoji: '🥤', calories: 130 },
    { id: 15, cat: 'salads',   name: 'Caesar Royal',          desc: 'Romaine, parmesan, croutons, anchovy caesar dressing',   price: 10.99, rating: 4.4, reviews: 115, badge: null,          emoji: '🥗', calories: 380 },
    { id: 16, cat: 'salads',   name: 'Greek Garden',          desc: 'Cucumber, tomato, feta, kalamata olives, oregano',       price: 9.99,  rating: 4.6, reviews: 134, badge: 'Healthy',     emoji: '🥗', calories: 290 },
];

const BADGE_STYLE = {
    'Popular':     { bg: 'var(--color-primary)',   color: '#fff' },
    'Best Seller': { bg: 'var(--color-secondary)', color: '#fff' },
    'New':         { bg: 'var(--color-success)',   color: '#fff' },
    'Spicy':       { bg: '#f97316',                color: '#fff' },
    'Vegan':       { bg: '#16a34a',                color: '#fff' },
    'Hot':         { bg: 'var(--color-danger)',     color: '#fff' },
    'Chef Pick':   { bg: '#7c3aed',                color: '#fff' },
    'Fresh':       { bg: 'var(--color-info)',       color: '#fff' },
    'Healthy':     { bg: '#0d9488',                color: '#fff' },
};

// ── Inspector: Token definitions ──────────────────────────────────────────────
const TOKEN_DEFS = {
    'color.primary':    { cssVar: '--color-primary',    label: 'Primary Color',         group: 'Colors',     desc: 'Main brand color — buttons, links, accents, logo' },
    'color.secondary':  { cssVar: '--color-secondary',  label: 'Secondary / Red',       group: 'Colors',     desc: 'Secondary accent used in badges, cart counter' },
    'color.success':    { cssVar: '--color-success',    label: 'Success Color',         group: 'Colors',     desc: '"Added" state on cart buttons, positive feedback' },
    'color.dark':       { cssVar: '--color-dark',       label: 'Dark Text Color',       group: 'Colors',     desc: 'Primary text on light backgrounds' },
    'color.gray.50':    { cssVar: '--color-gray-50',    label: 'Page Background',       group: 'Colors',     desc: 'Page-level background, subtle neutral surface' },
    'color.gray.100':   { cssVar: '--color-gray-100',   label: 'Card Image Background', group: 'Colors',     desc: 'Image area, input bg, chip fills' },
    'color.gray.500':   { cssVar: '--color-gray-500',   label: 'Muted Text',            group: 'Colors',     desc: 'Descriptions, subtitles, secondary labels' },
    'font.family.sans': { cssVar: '--font-family-sans', label: 'Font Family',           group: 'Typography', desc: 'Primary sans-serif font for the entire page' },
    'radius.md':        { cssVar: '--radius-md',        label: 'Medium Border Radius',  group: 'Radius',     desc: 'Buttons, inputs, small cards, tooltips' },
    'radius.lg':        { cssVar: '--radius-lg',        label: 'Large Border Radius',   group: 'Radius',     desc: 'Menu cards, panels, promo cards' },
    'radius.xl':        { cssVar: '--radius-xl',        label: 'Extra Large Radius',    group: 'Radius',     desc: 'Hero banner, large featured areas' },
    'radius.full':      { cssVar: '--radius-full',      label: 'Pill / Full Radius',    group: 'Radius',     desc: 'Category pills, tags, search bar, badges' },
    'shadow.sm':        { cssVar: '--shadow-sm',        label: 'Small Shadow',          group: 'Shadows',    desc: 'Header bar, active buttons, subtle elevation' },
    'shadow.md':        { cssVar: '--shadow-md',        label: 'Medium Shadow',         group: 'Shadows',    desc: 'Promo cards, CTA buttons, dropdowns' },
    'shadow.lg':        { cssVar: '--shadow-lg',        label: 'Large Shadow',          group: 'Shadows',    desc: 'Card hover state elevation' },
    'shadow.card':      { cssVar: '--shadow-card',      label: 'Card Default Shadow',   group: 'Shadows',    desc: 'Default elevation for menu item cards' },
    'shadow.xl':        { cssVar: '--shadow-xl',        label: 'Extra Large Shadow',    group: 'Shadows',    desc: 'Floating cart button, modals' },
    'border.color':     { cssVar: '--border-color',     label: 'Border Color',          group: 'Colors',     desc: 'Dividers, input borders, section separators' },
};

// Each inspectable zone → metadata + which tokens it uses
const ZONE_DEFS = {
    // ── Section-level zones ───────────────────────────────────────────────────
    header:             { label: 'Sticky Header',          desc: 'Top nav bar with logo, search, cart. Sticks to viewport top on scroll.',     tokens: ['color.primary', 'color.secondary', 'shadow.sm', 'border.color', 'font.family.sans', 'radius.md', 'radius.full'] },
    'hero-banner':      { label: 'Hero Banner',            desc: 'Full-width promotional banner with gradient background and CTA buttons.',    tokens: ['color.primary', 'radius.xl', 'shadow.md', 'radius.md', 'radius.full', 'font.family.sans'] },
    'featured':         { label: 'Featured Items Section', desc: 'Hand-picked dishes highlighted at the top of the menu by the chef.',         tokens: ['color.primary', 'color.dark', 'color.gray.500'] },
    'category-tabs':    { label: 'Category Filter Tabs',  desc: 'Filter the menu by food type — container for all category pill buttons.',    tokens: ['color.primary', 'radius.full', 'border.color', 'shadow.sm'] },
    'menu-grid':        { label: 'Menu Grid',              desc: 'Responsive grid of all menu items based on active category filter.',         tokens: ['color.gray.50'] },
    footer:             { label: 'Footer',                 desc: 'Dark footer with site links, copyright and active theme name.',              tokens: ['color.primary', 'color.dark', 'radius.md', 'border.color'] },
    // ── Individual element zones ──────────────────────────────────────────────
    logo:               { label: 'Logo / Brand',           desc: 'Brand logo mark with icon + wordmark. Icon uses primary color as background.',tokens: ['color.primary', 'radius.md', 'font.family.sans'] },
    'search-bar':       { label: 'Search Bar',             desc: 'Site-wide search input with icon. Pill shape via radius.full.',             tokens: ['radius.full', 'border.color', 'color.gray.50', 'color.dark'] },
    'cart-button':      { label: 'Cart Button',            desc: 'Header CTA button. Background = primary color, counter badge = secondary.',  tokens: ['color.primary', 'color.secondary', 'radius.md'] },
    'hero-cta-primary': { label: 'Hero Primary CTA',       desc: '"Order Now" button on hero banner. White bg, primary color text.',          tokens: ['color.primary', 'radius.md', 'shadow.md'] },
    'hero-cta-secondary':{ label: 'Hero Secondary CTA',    desc: '"View Menu" button — ghost style with white border on primary bg.',         tokens: ['color.primary', 'radius.md'] },
    'promo-card':       { label: 'Promo Feature Card',     desc: 'Individual highlight card (Express Delivery / Top Rated / Healthy).',        tokens: ['radius.lg', 'shadow.md'] },
    'category-button':  { label: 'Category Filter Button', desc: 'Pill button to filter menu. Active = primary bg + white text + shadow.',    tokens: ['color.primary', 'radius.full', 'border.color', 'shadow.sm'] },
    'menu-card':        { label: 'Menu Item Card',         desc: 'Dish card — image, name, desc, rating, price, Add to cart button.',         tokens: ['radius.lg', 'shadow.card', 'shadow.lg', 'color.primary', 'color.success', 'color.gray.100', 'color.gray.500', 'color.dark', 'radius.full', 'radius.md'] },
    'info-card':        { label: 'Feature Info Card',      desc: 'Individual feature highlight tile (Free Delivery, Secure, 5-Star…).',       tokens: ['radius.lg', 'shadow.sm', 'color.dark', 'color.gray.500'] },
    'footer-brand':     { label: 'Footer Brand Block',     desc: 'Footer logo + tagline. Logo icon uses primary color as background.',        tokens: ['color.primary', 'radius.md'] },
    'footer-column':    { label: 'Footer Link Column',     desc: 'Navigation link group in footer (Company / Support / Cities).',             tokens: ['color.primary'] },
    // ── Menu card sub-elements ────────────────────────────────────────────────
    'card-image-area':  { label: 'Card Image Area',        desc: 'Food emoji display area. Gradient bg uses gray-100 → gray-200 tokens.',     tokens: ['color.gray.100', 'radius.lg'] },
    'card-badge':       { label: 'Status Badge',           desc: 'Item badge (Popular / New / Best Seller). Uses brand color tokens.',         tokens: ['color.primary', 'color.secondary', 'color.success', 'radius.full'] },
    'card-favorite':    { label: 'Favourite Button',       desc: 'Heart icon. White circle button, secondary color on hover, shadow-sm.',      tokens: ['color.secondary', 'shadow.sm'] },
    'card-title':       { label: 'Item Name',              desc: 'Dish name heading. Dark text color from token, sans-serif font family.',      tokens: ['color.dark', 'font.family.sans'] },
    'card-description': { label: 'Item Description',      desc: 'Short desc text. color.gray.500 for muted / secondary appearance.',          tokens: ['color.gray.500', 'font.family.sans'] },
    'card-rating':      { label: 'Rating & Calories Row',  desc: 'Star rating + review count + calorie info. Uses gray-500 muted text.',       tokens: ['color.gray.500'] },
    'card-price':       { label: 'Item Price',             desc: 'Price label. Large bold text using color.dark for high contrast.',           tokens: ['color.dark', 'font.family.sans'] },
    'card-add-btn':     { label: '"Add to Cart" Button',   desc: 'Primary action button. color.primary → switches to color.success when added.',tokens: ['color.primary', 'color.success', 'radius.md'] },
    // ── Hero sub-elements ─────────────────────────────────────────────────────
    'hero-badge':       { label: 'Hero Promo Pill',        desc: '"Limited Time Offer" pill. Translucent white bg, radius.full shape.',        tokens: ['radius.full'] },
    'hero-title':       { label: 'Hero Headline Text',     desc: 'Main hero H1. Largest text on page, white, bold. font.family.sans.',         tokens: ['font.family.sans'] },
    'hero-subtitle':    { label: 'Hero Subtitle',          desc: 'Supporting copy below headline. 85% opacity white. font.family.sans.',        tokens: ['font.family.sans'] },
    // ── Header sub-elements ───────────────────────────────────────────────────
    'location-picker':  { label: 'Location Picker',        desc: 'City selector in header. Arrow chevron uses color.primary.',                 tokens: ['color.primary'] },
};

const GROUP_COLORS = { Colors: '#f472b6', Typography: '#a78bfa', Radius: '#34d399', Shadows: '#fbbf24' };

function resolveVar(cssVar) {
    try { return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || null; }
    catch { return null; }
}

// ── Inspector: Red highlight box ──────────────────────────────────────────────
function InspectorHighlight({ rect, label, pinned }) {
    if (!rect) return null;
    const color = pinned ? '#ff6b35' : '#ef4444';
    return (
        <div style={{
            position: 'fixed',
            top: rect.top - 2, left: rect.left - 2,
            width: rect.width + 4, height: rect.height + 4,
            border: `2px solid ${color}`,
            borderRadius: 4,
            pointerEvents: 'none',
            zIndex: 8990,
            boxShadow: `0 0 0 4px rgba(239,68,68,0.12), inset 0 0 0 1px rgba(239,68,68,0.08)`,
            transition: pinned ? 'none' : 'top 0.06s, left 0.06s, width 0.06s, height 0.06s',
        }}>
            <div style={{
                position: 'absolute', top: -22, left: -2,
                background: color, color: '#fff',
                fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
                padding: '2px 8px', borderRadius: '4px 4px 0 0',
                whiteSpace: 'nowrap', lineHeight: '18px',
            }}>
                {label}
            </div>
        </div>
    );
}

// ── Inspector: Token detail panel ─────────────────────────────────────────────
function InspectorPanel({ zone, tokenMap, onClose }) {
    if (!zone || !ZONE_DEFS[zone]) return null;
    const info = ZONE_DEFS[zone];

    const byGroup = {};
    info.tokens.forEach(key => {
        const def = TOKEN_DEFS[key];
        if (!def) return;
        if (!byGroup[def.group]) byGroup[def.group] = [];
        byGroup[def.group].push({ key, def });
    });

    return (
        <div style={{
            position: 'fixed', top: 60, right: 16,
            width: 370, maxHeight: 'calc(100vh - 76px)',
            overflowY: 'auto', zIndex: 9100,
            background: '#0f1117',
            border: '1.5px solid rgba(255,107,53,0.4)',
            borderRadius: 12,
            boxShadow: '0 16px 56px rgba(0,0,0,0.75)',
            fontFamily: '"SF Mono","Fira Code","Consolas",monospace',
        }}>
            {/* Header */}
            <div style={{ padding: '13px 16px 11px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff6b35', flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.01em' }}>{info.label}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55, fontFamily: 'sans-serif' }}>{info.desc}</p>
                    <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif' }}>
                        Source: <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{DS_BASE}</span>
                    </div>
                </div>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 6, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: 16, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>×</button>
            </div>

            {/* Token groups */}
            <div style={{ padding: '12px 14px' }}>
                {Object.entries(byGroup).map(([group, items]) => (
                    <div key={group} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: GROUP_COLORS[group] ?? '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7, fontFamily: 'sans-serif' }}>
                            ▸ {group}
                        </div>
                        {items.map(({ key, def }) => {
                            const liveVal = resolveVar(def.cssVar);
                            const apiVal  = tokenMap?.[key] ?? null;
                            const isColor = def.group === 'Colors' && liveVal && (liveVal.startsWith('#') || liveVal.startsWith('rgb'));
                            return (
                                <div key={key} style={{ marginBottom: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '9px 11px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    {/* Label + swatch */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                                        {isColor && (
                                            <span style={{ width: 14, height: 14, borderRadius: 3, background: liveVal || apiVal || '#999', flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)', display: 'inline-block' }} />
                                        )}
                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{def.label}</span>
                                    </div>

                                    {/* Token key */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'sans-serif' }}>Token key</span>
                                        <code style={{ fontSize: 11, color: '#a5f3fc', background: 'rgba(165,243,252,0.07)', padding: '1px 6px', borderRadius: 4 }}>{key}</code>
                                    </div>

                                    {/* CSS variable */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'sans-serif' }}>CSS variable</span>
                                        <code style={{ fontSize: 11, color: '#86efac', background: 'rgba(134,239,172,0.07)', padding: '1px 6px', borderRadius: 4 }}>var({def.cssVar})</code>
                                    </div>

                                    {/* API value (from JSON endpoint) */}
                                    {apiVal && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'sans-serif' }}>API value</span>
                                            <code style={{ fontSize: 11, color: '#fcd34d', background: 'rgba(252,211,77,0.07)', padding: '1px 6px', borderRadius: 4, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(apiVal)}</code>
                                        </div>
                                    )}

                                    {/* Live computed value */}
                                    {liveVal && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'sans-serif' }}>Live (computed)</span>
                                            <code style={{ fontSize: 11, color: '#f9a8d4', background: 'rgba(249,168,212,0.07)', padding: '1px 6px', borderRadius: 4, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{liveVal}</code>
                                        </div>
                                    )}

                                    <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5, fontFamily: 'sans-serif' }}>{def.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* How it works footer */}
            <div style={{ padding: '10px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.28)', lineHeight: 1.65, fontFamily: 'sans-serif' }}>
                    <strong style={{ color: 'rgba(255,255,255,0.45)' }}>How it works:</strong> Admin saves token → API serves updated{' '}
                    <code style={{ fontSize: 10, color: '#60a5fa' }}>GET /css</code> → browser re-fetches → every site using this theme updates automatically. No redeploy needed.
                </p>
            </div>
        </div>
    );
}

// ── Stars ──────────────────────────────────────────────────────────────────────
function Stars({ rating }) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return (
        <span style={{ color: '#f59e0b', fontSize: 13, letterSpacing: 1 }}>
            {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
        </span>
    );
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ msg, onClose }) {
    useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, [onClose]);
    return (
        <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            background: 'var(--color-dark, #212529)', color: '#fff',
            padding: '12px 20px', borderRadius: 'var(--radius-md, 0.65rem)',
            boxShadow: 'var(--shadow-xl)', fontFamily: 'var(--font-family-sans)',
            fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10,
            animation: 'dsToastIn 0.25s ease',
        }}>
            <span style={{ fontSize: 18 }}>🛒</span> {msg}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 18, lineHeight: 1, marginLeft: 6, padding: 0 }}>×</button>
        </div>
    );
}

// ── Cart Sidebar ───────────────────────────────────────────────────────────────
function CartSidebar({ items, onClose, onRemove, onQtyChange }) {
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
            <div style={{
                position: 'fixed', top: 0, right: 0, height: '100vh', width: 380, maxWidth: '95vw',
                background: '#fff', zIndex: 1001, display: 'flex', flexDirection: 'column',
                boxShadow: 'var(--shadow-2xl)', fontFamily: 'var(--font-family-sans)',
                animation: 'dsSlideIn 0.28s ease',
            }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color, #dee2e6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--color-dark, #212529)' }}>Your Order</h3>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-gray-500, #6b7280)' }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--color-gray-100, #f3f4f6)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-dark, #212529)' }}>×</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                    {items.length === 0 ? (
                        <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--color-gray-400, #9ca3af)' }}>
                            <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
                            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-gray-600, #4b5563)' }}>Your cart is empty</p>
                            <p style={{ fontSize: 14 }}>Add some delicious items!</p>
                        </div>
                    ) : items.map(item => (
                        <div key={item.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border-color-light, #f1f3f5)' }}>
                            <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'var(--color-gray-100, #f3f4f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{item.emoji}</div>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--color-dark, #212529)' }}>{item.name}</p>
                                <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--color-primary, #2f70f4)', fontWeight: 600 }}>${(item.price * item.qty).toFixed(2)}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <button onClick={() => onQtyChange(item.id, item.qty - 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid var(--border-color, #dee2e6)', background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-dark, #212529)', fontWeight: 700 }}>−</button>
                                    <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'center', color: 'var(--color-dark, #212529)' }}>{item.qty}</span>
                                    <button onClick={() => onQtyChange(item.id, item.qty + 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'var(--color-primary, #2f70f4)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>+</button>
                                    <button onClick={() => onRemove(item.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-gray-400, #9ca3af)', cursor: 'pointer', fontSize: 18 }}>🗑</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {items.length > 0 && (
                    <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color, #dee2e6)' }}>
                        <div style={{ marginBottom: 12 }}>
                            {[['Subtotal', total], ['Delivery fee', 2.99], ['Tax (8%)', total * 0.08]].map(([label, val]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 14, color: 'var(--color-gray-500, #6b7280)' }}>{label}</span>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-dark, #212529)' }}>${Number(val).toFixed(2)}</span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border-color, #dee2e6)', marginTop: 6 }}>
                                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-dark, #212529)' }}>Total</span>
                                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary, #2f70f4)' }}>${(total + 2.99 + total * 0.08).toFixed(2)}</span>
                            </div>
                        </div>
                        <button style={{ width: '100%', padding: '14px', background: 'var(--color-primary, #2f70f4)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 16, fontWeight: 700, letterSpacing: '0.02em', boxShadow: 'var(--shadow-md)', transition: 'opacity 0.15s' }}>
                            Place Order →
                        </button>
                        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-gray-400, #9ca3af)', marginTop: 10 }}>Est. delivery: 25–35 min</p>
                    </div>
                )}
            </div>
        </>
    );
}

// ── Menu Card ──────────────────────────────────────────────────────────────────
function MenuCard({ item, onAdd, isInCart }) {
    const [hover, setHover] = useState(false);
    const badge = item.badge ? BADGE_STYLE[item.badge] : null;

    return (
        <div
            data-ds-zone="menu-card"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                background: '#fff', borderRadius: 'var(--radius-lg, 0.70rem)',
                boxShadow: hover ? 'var(--shadow-lg)' : 'var(--shadow-card, 0 2px 8px rgba(0,0,0,0.08))',
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                transform: hover ? 'translateY(-3px)' : 'none',
            }}
        >
            {/* Image area */}
            <div data-ds-zone="card-image-area" style={{ position: 'relative', height: 160, background: 'linear-gradient(135deg, var(--color-gray-100, #f3f4f6) 0%, var(--color-gray-200, #e5e7eb) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 72, lineHeight: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}>{item.emoji}</span>
                {badge && (
                    <span data-ds-zone="card-badge" style={{ position: 'absolute', top: 12, left: 12, background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full, 0.95rem)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                        {item.badge}
                    </span>
                )}
                <button data-ds-zone="card-favorite" style={{ position: 'absolute', top: 10, right: 10, background: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)', color: hover ? 'var(--color-secondary, #d32727)' : 'var(--color-gray-300, #d1d5db)', transition: 'color 0.15s' }}>♥</button>
            </div>

            {/* Content */}
            <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 data-ds-zone="card-title" style={{ margin: '0 0 5px', fontSize: 15, fontWeight: 700, color: 'var(--color-dark, #212529)', lineHeight: 1.3 }}>{item.name}</h3>
                <p data-ds-zone="card-description" style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--color-gray-500, #6b7280)', lineHeight: 1.5, flex: 1 }}>{item.desc}</p>
                <div data-ds-zone="card-rating" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                    <Stars rating={item.rating} />
                    <span style={{ fontSize: 12, color: 'var(--color-gray-500, #6b7280)', marginLeft: 2 }}>{item.rating} ({item.reviews})</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-gray-400, #9ca3af)' }}>🔥 {item.calories} cal</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span data-ds-zone="card-price" style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-dark, #212529)' }}>${item.price.toFixed(2)}</span>
                    <button
                        data-ds-zone="card-add-btn"
                        onClick={() => onAdd(item)}
                        style={{
                            background: isInCart ? 'var(--color-success, #107a37)' : 'var(--color-primary, #2f70f4)',
                            color: '#fff', border: 'none', borderRadius: 'var(--radius-md, 0.65rem)',
                            padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            transition: 'background 0.15s, transform 0.1s',
                            transform: hover ? 'scale(1.03)' : 'scale(1)',
                            display: 'flex', alignItems: 'center', gap: 5,
                        }}
                    >
                        {isInCart ? '✓ Added' : '+ Add'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RestaurantDemo() {
    const [tokens,      setTokens]      = useState({});
    const [theme,       setTheme]       = useState(null);
    const [category,    setCategory]    = useState('all');
    const [cart,        setCart]        = useState([]);
    const [cartOpen,    setCartOpen]    = useState(false);
    const [search,      setSearch]      = useState('');
    const [toast,       setToast]       = useState(null);
    const [loading,     setLoading]     = useState(true);

    // Inspector state
    const [inspectMode, setInspectMode] = useState(false);
    const [hoveredZone, setHoveredZone] = useState(null);
    const [hoveredRect, setHoveredRect] = useState(null);
    const [pinnedZone,  setPinnedZone]  = useState(null);
    const [pinnedRect,  setPinnedRect]  = useState(null);

    // Load CSS + JSON + theme on mount
    useEffect(() => {
        injectDesignTokenCss();
        Promise.all([
            fetch(`${DS_BASE}`).then(r => r.json()),
            fetch(`${DS_BASE}/theme`).then(r => r.json()),
        ]).then(([tokenMap, themeData]) => {
            setTokens(tokenMap);
            setTheme(themeData?.theme ?? null);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    // Inspector hover + click listeners
    useEffect(() => {
        if (!inspectMode) {
            setHoveredZone(null);
            setHoveredRect(null);
            return;
        }

        function findZone(target) {
            let el = target;
            while (el && el !== document.body) {
                if (el.dataset?.dsZone) return el;
                el = el.parentElement;
            }
            return null;
        }

        function onMove(e) {
            const el = findZone(e.target);
            if (el) {
                setHoveredZone(el.dataset.dsZone);
                setHoveredRect(el.getBoundingClientRect());
            } else {
                setHoveredZone(null);
                setHoveredRect(null);
            }
        }

        function onClick(e) {
            // Don't intercept clicks on inspector panel or toggle bar
            if (e.target.closest('[data-inspector-ui]')) return;
            const el = findZone(e.target);
            if (el) {
                e.preventDefault();
                e.stopPropagation();
                setPinnedZone(el.dataset.dsZone);
                setPinnedRect(el.getBoundingClientRect());
            }
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('click', onClick, true);
        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('click', onClick, true);
        };
    }, [inspectMode]);

    // Clear pinned when exiting inspect mode
    useEffect(() => { if (!inspectMode) setPinnedZone(null); }, [inspectMode]);

    const addToCart = useCallback((item) => {
        setCart(prev => {
            const exists = prev.find(c => c.id === item.id);
            if (exists) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
            return [...prev, { ...item, qty: 1 }];
        });
        setToast(`${item.name} added to cart`);
    }, []);

    const removeFromCart = useCallback((id) => setCart(prev => prev.filter(c => c.id !== id)), []);

    const changeQty = useCallback((id, qty) => {
        if (qty <= 0) { removeFromCart(id); return; }
        setCart(prev => prev.map(c => c.id === id ? { ...c, qty } : c));
    }, [removeFromCart]);

    const cartCount = cart.reduce((s, c) => s + c.qty, 0);
    const cartIds   = new Set(cart.map(c => c.id));

    const filtered = MENU_ITEMS.filter(item => {
        const matchCat    = category === 'all' || item.cat === category;
        const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.desc.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    const featured = MENU_ITEMS.filter(i => ['Best Seller', 'Chef Pick', 'Popular'].includes(i.badge)).slice(0, 4);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', fontFamily: 'var(--font-family-sans, Inter, sans-serif)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16, animation: 'dsSpin 1s linear infinite', display: 'inline-block' }}>🍽️</div>
                    <p style={{ color: 'var(--color-gray-500, #6b7280)', fontSize: 16 }}>Loading menu…</p>
                </div>
            </div>
        );
    }

    const primary   = tokens['color.primary']   ?? '#2f70f4';
    const secondary = tokens['color.secondary'] ?? '#d32727';
    const fontSans  = tokens['font.family.sans'] ?? 'Inter, sans-serif';

    return (
        <div style={{ fontFamily: fontSans, color: 'var(--color-dark, #212529)', background: 'var(--color-gray-50, #f9fafb)', minHeight: '100vh', cursor: inspectMode ? 'crosshair' : 'default' }}>
            <style>{`
                @keyframes dsSlideIn  { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes dsToastIn  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes dsSpin     { to { transform: rotate(360deg); } }
                @keyframes dsInspectPulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
                .ds-cat-btn:hover     { background: var(--color-primary, #2f70f4) !important; color: #fff !important; transform: translateY(-2px); }
                .ds-nav-search:focus  { outline: none; border-color: var(--color-primary, #2f70f4) !important; box-shadow: 0 0 0 3px rgba(47,112,244,0.12) !important; }
                .ds-promo-card:hover  { transform: scale(1.02) !important; }
            `}</style>

            {/* ── INSPECTOR TOGGLE BAR ───────────────────────────────────────── */}
            <div
                data-inspector-ui="true"
                style={{
                    position: 'sticky', top: 0, zIndex: 200,
                    background: inspectMode ? 'rgba(15,17,23,0.97)' : 'rgba(15,17,23,0.92)',
                    backdropFilter: 'blur(10px)',
                    borderBottom: `1.5px solid ${inspectMode ? 'rgba(255,107,53,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    padding: '8px 20px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    fontFamily: '"SF Mono","Fira Code","Consolas",monospace',
                    transition: 'border-color 0.2s',
                }}
            >
                {/* Toggle button */}
                <button
                    onClick={() => setInspectMode(m => !m)}
                    style={{
                        background: inspectMode ? '#ef4444' : 'rgba(239,68,68,0.12)',
                        color: inspectMode ? '#fff' : '#ef4444',
                        border: `1.5px solid ${inspectMode ? '#ef4444' : 'rgba(239,68,68,0.35)'}`,
                        borderRadius: 8, padding: '5px 14px',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        letterSpacing: '0.03em', flexShrink: 0,
                        animation: inspectMode ? 'dsInspectPulse 2s ease infinite' : 'none',
                    }}
                >
                    <span style={{ fontSize: 13 }}>🔍</span>
                    {inspectMode ? 'Exit Inspect' : 'Inspect Tokens'}
                </button>

                {inspectMode ? (
                    <>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'sans-serif' }}>
                            Hover any section to see its design tokens · Click to pin the panel
                        </span>
                        {hoveredZone && ZONE_DEFS[hoveredZone] && !pinnedZone && (
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#ff6b35', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)', padding: '3px 10px', borderRadius: 6, flexShrink: 0 }}>
                                {ZONE_DEFS[hoveredZone].label}
                            </span>
                        )}
                        {pinnedZone && ZONE_DEFS[pinnedZone] && (
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#fff', background: '#ff6b35', padding: '3px 10px', borderRadius: 6, flexShrink: 0 }}>
                                📌 {ZONE_DEFS[pinnedZone].label}
                            </span>
                        )}
                    </>
                ) : (
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif' }}>
                        Click to inspect design tokens powering each UI element — powered by{' '}
                        <span style={{ color: '#60a5fa' }}>{DS_BASE}</span>
                    </span>
                )}
            </div>

            {/* ── STICKY HEADER ──────────────────────────────────────────────── */}
            <header
                data-ds-zone="header"
                style={{ position: 'sticky', top: inspectMode ? 45 : 45, zIndex: 100, background: '#fff', borderBottom: '1px solid var(--border-color-light, #f1f3f5)', boxShadow: 'var(--shadow-sm)', padding: '0 24px' }}
            >
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, height: 64 }}>
                    <div data-ds-zone="logo" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🍽️</div>
                        <div>
                            <span style={{ fontWeight: 800, fontSize: 18, color: primary, letterSpacing: '-0.02em' }}>Foodi</span>
                            <span style={{ fontSize: 10, display: 'block', color: 'var(--color-gray-400, #9ca3af)', lineHeight: 1, marginTop: -2 }}>Fast delivery</span>
                        </div>
                    </div>

                    <div data-ds-zone="location-picker" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-gray-600, #4b5563)', fontSize: 13, flexShrink: 0, cursor: 'pointer' }}>
                        <span>📍</span>
                        <span style={{ fontWeight: 500 }}>New York, NY</span>
                        <span style={{ color: primary, fontSize: 11 }}>▼</span>
                    </div>

                    <div data-ds-zone="search-bar" style={{ flex: 1, maxWidth: 480, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>🔍</span>
                        <input
                            className="ds-nav-search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search for pizza, burgers, sushi…"
                            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid var(--border-color, #dee2e6)', borderRadius: 'var(--radius-full, 0.95rem)', fontSize: 14, fontFamily: 'inherit', outline: 'none', color: 'var(--color-dark, #212529)', background: 'var(--color-gray-50, #f9fafb)', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22 }}>👤</button>
                        <button
                            data-ds-zone="cart-button"
                            onClick={() => !inspectMode && setCartOpen(true)}
                            style={{ position: 'relative', background: primary, color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '9px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}
                        >
                            🛒 Cart
                            {cartCount > 0 && (
                                <span style={{ background: secondary, color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 60px' }}>

                {/* ── HERO BANNER ──────────────────────────────────────────── */}
                <div
                    data-ds-zone="hero-banner"
                    style={{ borderRadius: 'var(--radius-xl, 0.80rem)', background: `linear-gradient(135deg, ${primary} 0%, #1d4ed8 100%)`, padding: '40px 48px', marginBottom: 32, position: 'relative', overflow: 'hidden' }}
                >
                    <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 160, opacity: 0.12, transform: 'rotate(15deg)', lineHeight: 1 }}>🍕</div>
                    <div style={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
                        <span data-ds-zone="hero-badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 'var(--radius-full)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            🔥 Limited Time Offer
                        </span>
                        <h1 data-ds-zone="hero-title" style={{ margin: '14px 0 10px', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 900, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                            Free delivery on your first order
                        </h1>
                        <p data-ds-zone="hero-subtitle" style={{ margin: '0 0 24px', color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.6 }}>
                            Order from 500+ restaurants. Use code <strong style={{ color: '#fff' }}>FOODI25</strong> for 25% off.
                        </p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button data-ds-zone="hero-cta-primary" style={{ background: '#fff', color: primary, border: 'none', borderRadius: 'var(--radius-md)', padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}>
                                Order Now →
                            </button>
                            <button data-ds-zone="hero-cta-secondary" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 'var(--radius-md)', padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                                View Menu
                            </button>
                        </div>
                    </div>
                    {theme && (
                        <div style={{ position: 'absolute', bottom: 14, right: 20, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-full)', backdropFilter: 'blur(4px)' }}>
                            Theme: {theme.name}
                        </div>
                    )}
                </div>

                {/* ── PROMO CARDS ───────────────────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 36 }}>
                    {[
                        { emoji: '🚀', title: 'Express Delivery', desc: '30 min or free',  bg: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
                        { emoji: '⭐', title: 'Top Rated Spots',  desc: '4.8+ rated only', bg: `linear-gradient(135deg, ${secondary}, #f87171)` },
                        { emoji: '💚', title: 'Healthy Options',  desc: 'Fresh & organic',  bg: 'linear-gradient(135deg, #107a37, #4ade80)' },
                    ].map(c => (
                        <div data-ds-zone="promo-card" className="ds-promo-card" key={c.title} style={{ background: c.bg, borderRadius: 'var(--radius-lg)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'transform 0.2s ease', boxShadow: 'var(--shadow-md)' }}>
                            <span style={{ fontSize: 40, flexShrink: 0 }}>{c.emoji}</span>
                            <div>
                                <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#fff' }}>{c.title}</p>
                                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{c.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── FEATURED ──────────────────────────────────────────────── */}
                <section data-ds-zone="featured" style={{ marginBottom: 40 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-dark, #212529)' }}>🌟 Featured Items</h2>
                            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-gray-500, #6b7280)' }}>Hand-picked by our chefs</p>
                        </div>
                        <button onClick={() => setCategory('all')} style={{ background: 'none', border: 'none', color: primary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>See all →</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                        {featured.map(item => (
                            <MenuCard key={item.id} item={item} onAdd={addToCart} isInCart={cartIds.has(item.id)} />
                        ))}
                    </div>
                </section>

                {/* ── CATEGORY TABS ─────────────────────────────────────────── */}
                <section data-ds-zone="category-tabs" style={{ marginBottom: 24 }}>
                    <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 800, color: 'var(--color-dark, #212529)' }}>Browse Menu</h2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {CATEGORIES.map(cat => {
                            const active = category === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    data-ds-zone="category-button"
                                    className="ds-cat-btn"
                                    onClick={() => !inspectMode && setCategory(cat.id)}
                                    style={{ padding: '8px 18px', borderRadius: 'var(--radius-full)', border: active ? 'none' : '1.5px solid var(--border-color, #dee2e6)', background: active ? primary : '#fff', color: active ? '#fff' : 'var(--color-gray-700, #374151)', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: 6, boxShadow: active ? 'var(--shadow-sm)' : 'none' }}
                                >
                                    <span>{cat.emoji}</span> {cat.label}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* ── MENU GRID ─────────────────────────────────────────────── */}
                <section data-ds-zone="menu-grid">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-gray-500, #6b7280)' }}>
                            {filtered.length} item{filtered.length !== 1 ? 's' : ''} {search ? `matching "${search}"` : `in ${category === 'all' ? 'all categories' : category}`}
                        </p>
                        <select style={{ border: '1.5px solid var(--border-color, #dee2e6)', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--color-dark, #212529)', background: '#fff' }}>
                            <option>Sort: Popular</option>
                            <option>Sort: Price ↑</option>
                            <option>Sort: Rating</option>
                        </select>
                    </div>

                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-gray-400, #9ca3af)' }}>
                            <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
                            <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-gray-600, #4b5563)' }}>No items found</p>
                            <p style={{ fontSize: 14 }}>Try a different search or category</p>
                            <button onClick={() => { setSearch(''); setCategory('all'); }} style={{ marginTop: 12, background: primary, color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 24px', cursor: 'pointer', fontWeight: 600 }}>Clear filters</button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                            {filtered.map(item => (
                                <MenuCard key={item.id} item={item} onAdd={addToCart} isInCart={cartIds.has(item.id)} />
                            ))}
                        </div>
                    )}
                </section>

                {/* ── INFO STRIP ────────────────────────────────────────────── */}
                <div
                    data-ds-zone="info-strip"
                    style={{ marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}
                >
                    {[
                        { emoji: '🚚', title: 'Free Delivery',   desc: 'On orders above $20' },
                        { emoji: '🕐', title: '30 Min Delivery', desc: 'Or your money back' },
                        { emoji: '🔒', title: 'Secure Payment',  desc: '100% safe & encrypted' },
                        { emoji: '⭐', title: '5-Star Quality',  desc: 'Carefully curated restaurants' },
                    ].map(i => (
                        <div data-ds-zone="info-card" key={i.title} style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-xs)', textAlign: 'center' }}>
                            <div style={{ fontSize: 36, marginBottom: 10 }}>{i.emoji}</div>
                            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 15, color: 'var(--color-dark, #212529)' }}>{i.title}</p>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-gray-500, #6b7280)' }}>{i.desc}</p>
                        </div>
                    ))}
                </div>
            </main>

            {/* ── FOOTER ────────────────────────────────────────────────────── */}
            <footer data-ds-zone="footer" style={{ background: 'var(--color-dark, #212529)', color: 'rgba(255,255,255,0.7)', padding: '40px 24px 28px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32, marginBottom: 32 }}>
                        <div data-ds-zone="footer-brand">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🍽️</div>
                                <span style={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>Foodi</span>
                            </div>
                            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>Delivering happiness to your door since 2020.</p>
                        </div>
                        {[
                            { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Press'] },
                            { title: 'Support', links: ['Help Center', 'Safety', 'Terms', 'Privacy'] },
                            { title: 'Cities',  links: ['New York', 'Los Angeles', 'Chicago', 'Houston'] },
                        ].map(col => (
                            <div data-ds-zone="footer-column" key={col.title}>
                                <h4 style={{ margin: '0 0 12px', color: '#fff', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.title}</h4>
                                {col.links.map(link => (
                                    <p key={link} style={{ margin: '0 0 8px', fontSize: 13 }}>
                                        <a href="#" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>{link}</a>
                                    </p>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <p style={{ margin: 0, fontSize: 12 }}>© 2025 Foodi. Styled with <a href="#" style={{ color: primary }}>Design System</a> tokens.</p>
                        {theme && <p style={{ margin: 0, fontSize: 12 }}>Active theme: <span style={{ color: primary, fontWeight: 600 }}>{theme.name}</span></p>}
                    </div>
                </div>
            </footer>

            {/* ── CART SIDEBAR ──────────────────────────────────────────────── */}
            {cartOpen && (
                <CartSidebar items={cart} onClose={() => setCartOpen(false)} onRemove={removeFromCart} onQtyChange={changeQty} />
            )}

            {/* ── TOAST ─────────────────────────────────────────────────────── */}
            {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

            {/* ── FLOATING CART BUTTON ──────────────────────────────────────── */}
            {cartCount > 0 && !cartOpen && !inspectMode && (
                <button
                    onClick={() => setCartOpen(true)}
                    style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: primary, color: '#fff', border: 'none', borderRadius: 'var(--radius-full)', padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-xl)', zIndex: 500, display: 'flex', alignItems: 'center', gap: 10 }}
                >
                    <span>🛒</span>
                    View Order ({cartCount} item{cartCount !== 1 ? 's' : ''})
                    <span style={{ background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 14 }}>
                        ${cart.reduce((s, c) => s + c.price * c.qty, 0).toFixed(2)}
                    </span>
                </button>
            )}

            {/* ── INSPECTOR OVERLAYS ────────────────────────────────────────── */}
            {inspectMode && !pinnedZone && hoveredZone && (
                <InspectorHighlight rect={hoveredRect} label={ZONE_DEFS[hoveredZone]?.label} pinned={false} />
            )}
            {inspectMode && pinnedZone && (
                <InspectorHighlight rect={pinnedRect} label={ZONE_DEFS[pinnedZone]?.label} pinned={true} />
            )}
            {inspectMode && pinnedZone && (
                <div data-inspector-ui="true">
                    <InspectorPanel zone={pinnedZone} tokenMap={tokens} onClose={() => setPinnedZone(null)} />
                </div>
            )}
        </div>
    );
}
