# Design System — Complete Documentation

> **Stack:** Laravel 12 · Inertia.js · React JSX · MySQL
> **Architecture:** Headless CMS — Admin stores structured JSON → API serves it → React components render everything. Zero raw HTML in the database.

---

## Table of Contents

1. [What Is This System?](#1-what-is-this-system)
2. [Core Architecture](#2-core-architecture)
3. [Database Structure](#3-database-structure)
4. [Admin UI — What You Can Do](#4-admin-ui--what-you-can-do)
5. [Block Types Reference](#5-block-types-reference)
6. [Design Tokens — CSS Variable System](#6-design-tokens--css-variable-system)
7. [Public API Reference](#7-public-api-reference)
8. [Frontend Integration — PageRenderer](#8-frontend-integration--pagerenderer)
9. [Section Settings Reference](#9-section-settings-reference)
10. [Block Style Overrides](#10-block-style-overrides)
11. [Responsive Behaviour](#11-responsive-behaviour)
12. [How Everything Connects — End-to-End Flow](#12-how-everything-connects--end-to-end-flow)

---

## 1. What Is This System?

This is a **multi-site, multi-page visual page builder** built on top of a design token engine. It lets you:

- Create multiple "sites" (e.g. `caterbox`, `mybrand`, `restaurant-app`)
- Each site has its own design tokens (colors, fonts, spacing)
- Each site has multiple pages (home, about, contact, etc.)
- Each page has sections (rows), each section has columns, each column has blocks
- Blocks are typed components: heading, navbar, hero banner, restaurant cards, etc.
- The frontend fetches page data from a public API and renders it using typed React components
- Changing a token in admin instantly updates every component using that token

**Key Principle:** No HTML is ever stored in the database. Every block is structured JSON. React components decide how to render it.

---

## 2. Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ADMIN PANEL                             │
│                                                                 │
│  Design System Manager (/admin/apps/design-system)              │
│  ├── Token Engine (colors, fonts, spacing, shadows)             │
│  ├── Sites Manager (create/edit/delete sites)                   │
│  └── Page Builder (sections → columns → blocks)                 │
│       ├── Block Palette (drag blocks from sidebar)              │
│       ├── Canvas (visual section/column layout)                 │
│       └── Block Inspector (edit block content via editors)      │
└────────────────────────┬────────────────────────────────────────┘
                         │  Saves to MySQL
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE                                │
│  ds_sites → ds_site_pages → ds_page_sections → ds_page_blocks  │
│  ds_themes → ds_theme_tokens (CSS variable values)              │
└────────────────────────┬────────────────────────────────────────┘
                         │  Served by Laravel API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PUBLIC API (no auth)                       │
│  GET /api/ds/{siteSlug}                → all site pages + theme │
│  GET /api/ds/{siteSlug}/page/{slug}    → single page + CSS vars │
│  GET /api/ds/{siteSlug}/tokens.json    → raw token map (JSON)   │
│  GET /api/ds/{siteSlug}/tokens.css     → CSS variables file     │
└────────────────────────┬────────────────────────────────────────┘
                         │  Consumed by frontend
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                             │
│  PageRenderer.jsx                                               │
│  ├── Fetches page data from API                                 │
│  ├── Injects CSS variables into <head>                          │
│  ├── SectionRenderer → renders each section with bg/padding     │
│  └── BlockRenderer → picks typed component from BLOCK_MAP       │
│       NavbarBlock, HeroBannerBlock, SearchBarBlock, etc.        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Structure

### Tables

| Table | Purpose |
|---|---|
| `ds_sites` | Sites: slug, name, is_active, api_key, theme_id |
| `ds_site_pages` | Pages per site: slug, title, meta_description, sort_order |
| `ds_page_sections` | Sections per page: layout, label, sort_order, settings (JSON) |
| `ds_page_blocks` | Blocks per section: col (column index), type, label, content (JSON), style (JSON), sort_order |
| `ds_themes` | Theme config per site: name |
| `ds_theme_tokens` | Tokens: theme_id, name, value, category (color/font/spacing/shadow/radius) |

### Block content is pure JSON

```json
// navbar block content:
{
  "logo_text": "Caterbox",
  "logo_url": "/",
  "logo_image": "https://cdn.example.com/logo.png",
  "nav_links": [
    { "label": "Home", "url": "/", "open_new_tab": false },
    { "label": "About", "url": "/about", "open_new_tab": false }
  ],
  "cta": { "label": "Get Started", "url": "#signup", "show": true, "variant": "primary" },
  "sticky": true,
  "bg_color": "#ffffff"
}
```

---

## 4. Admin UI — What You Can Do

### Token Engine Tab

| Feature | What it does |
|---|---|
| Color tokens | Set primary, secondary, success, danger, warning, info colors |
| Structural colors | Sidebar bg, topbar bg, page bg |
| Typography | Choose font family (16+ options including Google Fonts) |
| Spacing scale | Base spacing value — affects padding/margin across site |
| Border radius | Controls card/button corner roundness |
| Shadows | None / Subtle / Default / Medium / Bold |
| Export CSS | Download tokens as a `.css` file with CSS variables |
| Export JSON | Download tokens as a `.json` file for any tech stack |
| Live preview | See components update in real time as you change tokens |

### Sites Manager Tab

| Action | Description |
|---|---|
| Create site | Name + slug (e.g. `caterbox`) |
| Assign theme | Link a token theme to the site |
| Generate API key | For authenticated token access |
| Reveal API key | Masked by default, reveal once |
| View pages | Navigate to page builder for that site |
| Delete site | Soft confirmation |

### Page Builder Tab (SitePageBuilder)

**Page management:**
- Create, rename, reorder, delete pages per site
- Page has: title, slug, meta_description
- Drag pages to reorder (sort_order persists to DB)

**Section management:**
- Add section: choose layout (1col, 2col, 3col, 4col, sidebar-left, sidebar-right)
- Section templates: Navbar, Hero + Search, 2-col, 3-col pre-filled
- Edit section settings: background color, background image, text color, padding, max-width
- Drag to reorder sections
- Duplicate section (coming soon)
- Delete section

**Block management (within BlockBuilderCanvas):**
- Drag blocks from left palette into any column
- Palette is categorised: Content / Media / Interactive / Layout / Navigation / Ecommerce
- Click block → right panel shows the specific editor for that block type
- Drag blocks up/down within a column to reorder
- Duplicate block
- Delete block
- Each block has style overrides tab (color, font size, padding, custom CSS)

---

## 5. Block Types Reference

### Content Blocks

| Type | Fields | Description |
|---|---|---|
| `heading` | text, level (h1–h6), align | Section headings |
| `paragraph` | text, align | Body text with `pre-line` whitespace |
| `image` | url, alt, caption, link_url, object_fit, width, height, rounded | Responsive image, optional caption/link |
| `button` | label, url, variant, size, align, open_new_tab, icon | CTA button in primary/outline/ghost/danger/success |
| `quote` | text, author, author_title, author_image_url, align | Styled blockquote with author info |
| `list` | items[], list_style, icon | Ordered/unordered/icon list |
| `html` | code | Raw HTML escape hatch (use sparingly) |
| `icon` | name, size, color, link_url, align | Emoji-based icon with optional link |

### Media Blocks

| Type | Fields | Description |
|---|---|---|
| `image` | (see above) | |
| `gallery` | images[], columns, gap, lightbox, rounded | Multi-image grid |
| `video` | url, autoplay, muted, loop, show_controls, aspect_ratio | YouTube/Vimeo/direct video |

### Layout Blocks

| Type | Fields | Description |
|---|---|---|
| `spacer` | height (px) | Vertical whitespace |
| `divider` | line_style, color, thickness, width_percent, align | Horizontal rule |

### Navigation Blocks

| Type | Fields | Description |
|---|---|---|
| `navbar` | logo_text, logo_url, logo_image, nav_links[], cta{}, sticky, bg_color | Full responsive navbar — sticky scroll, mobile hamburger, CSS token CTA |

### Ecommerce Blocks

| Type | Fields | Description |
|---|---|---|
| `hero_banner` | promo_tag, headline, subtext, bg_image, bg_overlay, text_align, buttons[] | Hero section — standalone or section-backed |
| `search_bar` | placeholder_restaurant, placeholder_location, button_text, button_bg, show_location | Restaurant/location search with `onSearch` callback |
| `cuisine_tabs` | active_id, categories[] | Horizontally scrollable filter tabs |
| `restaurant_card` | name, address, tags[], rating, review_count, photo_count, image_url, badge | Restaurant listing card with hover effect |
| `deal_card` | title, delivery_info, expiry, image_url, cta_text, cta_url, cta_bg | Promotional deal card |
| `email_subscribe` | placeholder, button_text, disclaimer, button_bg | Email capture form with success state |

---

## 6. Design Tokens — CSS Variable System

### How tokens become CSS variables

Admin sets: `primary color = #f59e0b`

↓ Stored in `ds_theme_tokens` as `{ name: 'color-primary', value: '#f59e0b' }`

↓ API `/api/ds/caterbox/page/home` returns:
```
css: ":root { --color-primary: #f59e0b; --color-secondary: ...; --font-family: 'Inter'; }"
```

↓ `PageRenderer` injects this into `<head>`:
```html
<style id="ds-theme-caterbox">
  :root { --color-primary: #f59e0b; }
</style>
```

↓ Every block uses the variable:
```js
// NavbarBlock CTA button:
background: 'var(--color-primary, #3b82f6)'

// HeroBannerBlock button:
background: 'var(--color-primary, #3b82f6)'

// EmailSubscribeBlock button:
background: content.button_bg || 'var(--color-primary, #f59e0b)'
```

**Result:** Change one token in admin → every component across the entire site updates instantly.

### Available CSS Variables

| Variable | Token name | Default |
|---|---|---|
| `--color-primary` | primary | `#405189` |
| `--color-secondary` | secondary | `#74788d` |
| `--color-success` | success | `#0ab39c` |
| `--color-danger` | danger | `#f06548` |
| `--color-warning` | warning | `#f7b84b` |
| `--color-info` | info | `#299cdb` |
| `--font-family` | typography | `'Inter'` |
| `--spacing-base` | spacing | `8px` |
| `--border-radius` | radius | `8px` |
| `--shadow` | shadow | `0 2px 8px rgba(0,0,0,0.08)` |

---

## 7. Public API Reference

All public endpoints require **no authentication** (designed for external websites/apps).

### GET `/api/ds/{siteSlug}`

Returns all pages for a site with theme data.

```json
{
  "site": { "id": 1, "name": "Caterbox", "slug": "caterbox" },
  "pages": [
    { "id": 1, "title": "Home", "slug": "home", "sort_order": 0 },
    { "id": 2, "title": "About", "slug": "about", "sort_order": 1 }
  ],
  "theme": { "tokens": { "color-primary": "#f59e0b", ... } },
  "css": ":root { --color-primary: #f59e0b; ... }"
}
```

---

### GET `/api/ds/{siteSlug}/page/{pageSlug}`

Returns a single page with all sections, columns, blocks, and resolved CSS.

```json
{
  "site": { "slug": "caterbox", "name": "Caterbox" },
  "page": { "id": 1, "title": "Home", "slug": "home" },
  "css": ":root { --color-primary: #f59e0b; }",
  "sections": [
    {
      "id": 10,
      "label": "Hero Section",
      "layout": "1col",
      "sort_order": 0,
      "content": {
        "bg_image": "https://cdn.example.com/hero.jpg",
        "bg_color": "rgba(0,0,0,0.5)",
        "padding_y": 80,
        "max_width": "1200px",
        "text_color": "#ffffff"
      },
      "blocks": [
        [
          {
            "id": 101,
            "type": "navbar",
            "label": "Main Navbar",
            "col": 0,
            "sort_order": 0,
            "content": { "logo_text": "Caterbox", "nav_links": [...], "sticky": true },
            "style": {}
          },
          {
            "id": 102,
            "type": "hero_banner",
            "label": "Hero Banner",
            "col": 0,
            "sort_order": 1,
            "content": { "headline": "Order Food Near You", "promo_tag": "Fast delivery", "buttons": [...] },
            "style": {}
          }
        ]
      ]
    }
  ]
}
```

**Note:** `blocks` is an array of arrays — `blocks[colIndex][blockIndex]`. A 3-column section returns `blocks[0]`, `blocks[1]`, `blocks[2]`.

---

### GET `/api/ds/{siteSlug}/tokens.json`

Returns the raw token map as JSON. Use this for any non-CSS tech stack.

```json
{
  "color": {
    "primary":   "#f59e0b",
    "secondary": "#64748b"
  },
  "font": {
    "family": "Inter"
  },
  "spacing": {
    "base": "8px"
  }
}
```

---

### GET `/api/ds/{siteSlug}/tokens.css`

Returns a standalone CSS file with all variables. Link directly from HTML.

```css
:root {
  --color-primary: #f59e0b;
  --color-secondary: #64748b;
  --font-family: 'Inter';
  --spacing-base: 8px;
  --border-radius: 8px;
}
```

---

## 8. Frontend Integration — PageRenderer

### Basic usage

```jsx
import PageRenderer from '@/Frontend/PageRenderer';

function HomePage() {
    return <PageRenderer siteSlug="caterbox" pageSlug="home" />;
}
```

### With event handlers (interactive blocks)

```jsx
import { useNavigate } from 'react-router-dom';
import PageRenderer from '@/Frontend/PageRenderer';

function HomePage() {
    const navigate = useNavigate();

    return (
        <PageRenderer
            siteSlug="caterbox"
            pageSlug="home"
            blockProps={{
                search_bar: {
                    onSearch: ({ query, location }) => navigate(`/search?q=${query}&loc=${location}`)
                },
                cuisine_tabs: {
                    onCategoryChange: (categoryId) => navigate(`/restaurants?cuisine=${categoryId}`)
                },
                restaurant_card: {
                    onCardClick: (content) => navigate(`/restaurant/${content.name}`)
                },
                email_subscribe: {
                    onSubscribe: (email) => alert(`Subscribed: ${email}`)
                },
                navbar: {
                    onNavLinkClick: (link) => console.log('Nav clicked:', link)
                }
            }}
        />
    );
}
```

### Pre-fetched data (SSR / Next.js / server components)

```jsx
// Fetch on server, pass data prop to skip client-side fetch
const data = await fetchPage('caterbox', 'home');

return <PageRenderer siteSlug="caterbox" pageSlug="home" data={data} />;
```

### Custom loading state

```jsx
<PageRenderer
    siteSlug="caterbox"
    pageSlug="home"
    loadingNode={<MyCustomSkeleton />}
    onError={(msg) => console.error(msg)}
    updateTitle={true}  // sets document.title from page.title
/>
```

### Importing individual block components

```jsx
import { NavbarBlock, HeroBannerBlock, RestaurantCardBlock } from '@/Frontend/PageRenderer';

// Use blocks standalone:
<NavbarBlock
    content={{ logo_text: 'My Brand', nav_links: [...], cta: {...} }}
    style={{}}
/>
```

### fetchPage utility

```js
import { fetchPage, injectGlobalStyles } from '@/Frontend/PageRenderer';

// Manual fetch (returns same shape as API):
const data = await fetchPage('caterbox', 'home');
console.log(data.sections);
```

---

## 9. Section Settings Reference

Each section's `content` (stored in `settings` JSON column) controls its visual wrapper:

| Setting | Type | Default | Description |
|---|---|---|---|
| `bg_color` | string | `transparent` | Background color or `rgba()` overlay on bg_image |
| `bg_image` | string | `''` | Background image URL (CSS `center/cover`) |
| `text_color` | string | `inherit` | Overrides text color for all blocks in section |
| `padding_y` | number | `40` | Top and bottom padding in pixels |
| `max_width` | string | `'1200px'` | Max width of the content inner container |

**Overlay pattern:** Set both `bg_image` and `bg_color` to apply a color overlay on top of an image (e.g. `bg_color: "rgba(0,0,0,0.5)"` for a dark overlay on a hero image).

---

## 10. Block Style Overrides

Every block has an optional `style` field (JSON) with these override properties:

| Key | CSS property | Example |
|---|---|---|
| `color` | color | `#ffffff` |
| `background` | background | `#1e293b` |
| `padding` | padding | `20px 24px` |
| `margin` | margin | `0 0 24px` |
| `borderRadius` | border-radius | `12px` |
| `fontSize` | font-size | `18px` |
| `fontWeight` | font-weight | `700` |
| `lineHeight` | line-height | `1.6` |
| `textAlign` | text-align | `center` |
| `letterSpacing` | letter-spacing | `0.05em` |
| `marginBottom` | margin-bottom | `32px` |
| `marginTop` | margin-top | `16px` |
| `customCss` | (any CSS) | `border: 2px solid red; opacity: 0.9` |

---

## 11. Responsive Behaviour

### Grid breakpoints (injected globally)

| Breakpoint | Behaviour |
|---|---|
| `> 1024px` | All layouts render as-defined |
| `≤ 1024px` | 4-column → 2-column |
| `≤ 768px` | 2-col, 3-col, 4-col, sidebar-left, sidebar-right → all collapse to 1-column |
| `≤ 480px` | Grid gap reduces from 24px to 16px |

### Navbar mobile (≤ 768px)

- Desktop nav links hidden
- Hamburger `☰` button appears
- Tapping hamburger opens full-width dropdown with all links + CTA button

### Animations

- Every section fades in from bottom with a 12px translate: `ds-fadein` keyframe
- Sections animate in sequence with 80ms delay per section
- Cards have hover: `translateY(-2px)` + `box-shadow` lift
- Buttons have hover: `opacity: 0.88` + `translateY(-1px)`

---

## 12. How Everything Connects — End-to-End Flow

```
1. ADMIN creates site "caterbox"
        ↓
2. ADMIN sets Primary Color token: #f59e0b
        ↓
3. ADMIN creates page "home" for caterbox
        ↓
4. ADMIN adds section: 1-col, bg_image=hero.jpg, padding_y=80
        ↓
5. ADMIN drags "Navbar" block into col 0
        Fills: logo_text="Caterbox", nav_links=[Home,About,Contact], cta.show=true
        ↓
6. ADMIN drags "Hero Banner" block into col 0
        Fills: headline="Order Food Near You", promo_tag="Fast Delivery", buttons=[{label:"Get Started"}]
        ↓
7. All data SAVED as JSON in ds_page_blocks.content (NO HTML anywhere)
        ↓
8. FRONTEND loads:
        <PageRenderer siteSlug="caterbox" pageSlug="home" />
        ↓
9. PageRenderer FETCHES: GET /api/ds/caterbox/page/home
        ↓
10. Response arrives:
        css: ":root { --color-primary: #f59e0b; }"
        sections: [{ layout: "1col", blocks: [[navbar_block, hero_block]] }]
        ↓
11. PageRenderer INJECTS CSS:
        <style id="ds-theme-caterbox">:root { --color-primary: #f59e0b; }</style>
        ↓
12. SectionRenderer renders section:
        - Full-width wrapper with bg_image as CSS background
        - rgba(0,0,0,0.5) overlay div on top
        - Inner div: max-width 1200px, padding 80px 24px
        - Fade-in animation: animationDelay 0ms
        ↓
13. BlockRenderer renders navbar_block:
        BLOCK_MAP['navbar'] = NavbarBlock
        <NavbarBlock content={...} />
        ↓
        Renders: logo | Home About Contact | [Get Started] button
        CTA button background: var(--color-primary, #3b82f6)
        → shows as #f59e0b (from injected token)
        ↓
14. ADMIN changes Primary Color to #ef4444 (red)
        → Token saved in DB
        → Next page load: CSS var updates to #ef4444
        → CTA button, subscribe button, all primary elements go red
        → ZERO code changes needed
```

---

*Generated: 2026-03-29 | Project: LaravelCMS2/myapps*
