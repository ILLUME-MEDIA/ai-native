# 🎨 Theme System - Complete Guide

## Overview

Your code editor now includes a **comprehensive theme customization system** similar to magicpath.ai, allowing you to customize colors, typography, effects, and rules for your workspace.

---

## ✨ Features

### 1. **Color Customization**
Customize all color aspects of your editor:

- **Primary Colors** (Button backgrounds, highlights)
  - Foreground (text color)
  - Background (button/highlight color)

- **Secondary Colors** (Secondary buttons, muted elements)
  - Foreground
  - Background

- **Accent Colors** (Links, active states)
  - Foreground
  - Background

- **Base Colors** (Background, text, borders)
  - Background (main background)
  - Foreground (main text color)
  - Muted (secondary text)
  - Muted Foreground
  - Border (border color)

- **Card Colors** (Panels, cards, popovers)
  - Card Background
  - Card Foreground
  - Popover Background
  - Popover Foreground

### 2. **Light/Dark Mode**
Switch between light and dark modes instantly with the sun/moon toggle buttons in the header.

### 3. **Typography Settings**
Customize font properties:
- Font Family
- Base Font Size
- Line Height
- Font Weights (normal, medium, semibold, bold)

### 4. **Effects**
Control visual effects:
- Border Radius
- Box Shadow (small, medium, large)
- Blur intensity

### 5. **Rules**
Define spacing and transitions:
- Spacing Scale (xs, sm, md, lg, xl)
- Transition Duration

### 6. **Import/Export**
- Export theme as JSON file
- Import theme from JSON file
- Share themes across workspaces

### 7. **Save/Reset**
- Save theme to workspace
- Reset to default theme

---

## 🚀 How to Use

### Accessing the Theme Editor

1. Open the Code Editor
2. Select a workspace
3. Click the **Theme icon** (🎨 Palette) in the right sidebar
4. The Theme Editor panel will open

### Customizing Colors

1. Click the **Colors** tab
2. Expand any color section (Primary, Secondary, Accent, Base, Card)
3. Use the color picker or enter hex values directly
4. Changes are immediately visible in the preview

### Switching Modes

Click the **Sun** (☀️) or **Moon** (🌙) icon in the header to switch between light and dark modes.

### Saving Your Theme

1. Customize your theme
2. Click the **Save** button at the bottom
3. Theme is saved to the workspace

### Exporting Theme

1. Click the **Export** button
2. A JSON file will be downloaded with your theme settings
3. Share this file with team members

### Importing Theme

1. Click the **Import** button
2. Select a theme JSON file
3. The theme will be applied immediately

### Resetting Theme

1. Click the **Reset** button
2. Confirm the reset
3. Theme will be reset to default values

---

## 📁 File Structure

### Frontend Components

```
resources/js/Admin/components/CodeEditor/
├── ThemePanel.jsx          # Main theme editor component
└── CodeEditor.jsx          # Updated with theme panel integration
```

### Backend Controllers

```
app/Http/Controllers/Workspace/
└── ThemeController.php     # API for theme management
```

### Routes

```php
// Theme API routes in routes/api.php
Route::get('workspaces/{workspace}/theme', 'getTheme');
Route::post('workspaces/{workspace}/theme', 'saveTheme');
Route::delete('workspaces/{workspace}/theme', 'deleteTheme');
```

### Styles

```
public/assets/scss/components/
└── _code-editor.scss       # Theme panel styles
```

---

## 🎯 API Reference

### Get Theme

```http
GET /api/workspaces/{workspace_id}/theme
```

**Response:**
```json
{
  "theme": {
    "colors": { ... },
    "typography": { ... },
    "effects": { ... },
    "rules": { ... }
  },
  "mode": "light"
}
```

### Save Theme

```http
POST /api/workspaces/{workspace_id}/theme
Content-Type: application/json

{
  "theme": {
    "colors": {
      "primary": {
        "foreground": "#ffffff",
        "background": "#0d6efd"
      },
      ...
    },
    "typography": { ... },
    "effects": { ... },
    "rules": { ... }
  },
  "mode": "light"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Theme saved successfully"
}
```

### Delete Theme (Reset)

```http
DELETE /api/workspaces/{workspace_id}/theme
```

**Response:**
```json
{
  "success": true,
  "message": "Theme reset to default"
}
```

---

## 🎨 Theme Structure

### Complete Theme Object

```javascript
{
  colors: {
    primary: {
      foreground: '#ffffff',
      background: '#0d6efd'
    },
    secondary: {
      foreground: '#ffffff',
      background: '#6c757d'
    },
    accent: {
      foreground: '#ffffff',
      background: '#0dcaf0'
    },
    base: {
      background: '#ffffff',
      foreground: '#212529',
      muted: '#6c757d',
      mutedForeground: '#6c757d',
      border: '#dee2e6'
    },
    card: {
      background: '#ffffff',
      foreground: '#212529',
      popover: '#ffffff',
      popoverForeground: '#212529'
    }
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      base: '14px',
      small: '12px',
      large: '16px'
    },
    lineHeight: '1.5',
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  },
  effects: {
    borderRadius: '4px',
    shadow: {
      small: '0 1px 2px rgba(0,0,0,0.05)',
      medium: '0 4px 6px rgba(0,0,0,0.1)',
      large: '0 10px 15px rgba(0,0,0,0.1)'
    },
    blur: '8px'
  },
  rules: {
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    },
    transition: '0.2s ease'
  }
}
```

---

## 💡 CSS Variable Mapping

When you save a theme, it creates CSS custom properties:

```css
/* Colors */
--theme-primary-fg: #ffffff;
--theme-primary-bg: #0d6efd;
--theme-secondary-fg: #ffffff;
--theme-secondary-bg: #6c757d;
--theme-accent-fg: #ffffff;
--theme-accent-bg: #0dcaf0;
--theme-base-bg: #ffffff;
--theme-base-fg: #212529;
--theme-muted: #6c757d;
--theme-border: #dee2e6;
--theme-card-bg: #ffffff;
--theme-card-fg: #212529;

/* Typography */
--theme-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--theme-font-size: 14px;
--theme-line-height: 1.5;

/* Effects */
--theme-border-radius: 4px;
--theme-shadow: 0 4px 6px rgba(0,0,0,0.1);
--theme-blur: 8px;

/* Rules */
--theme-transition: 0.2s ease;
```

### Using Theme Variables in Your CSS

```css
.my-component {
  background: var(--theme-primary-bg);
  color: var(--theme-primary-fg);
  border-radius: var(--theme-border-radius);
  box-shadow: var(--theme-shadow);
  transition: var(--theme-transition);
}
```

---

## 🎭 Example Themes

### Dark Theme

```json
{
  "theme": {
    "colors": {
      "primary": {
        "foreground": "#ffffff",
        "background": "#3b82f6"
      },
      "base": {
        "background": "#1e1e1e",
        "foreground": "#e0e0e0",
        "border": "#3e3e3e"
      }
    }
  },
  "mode": "dark"
}
```

### High Contrast Theme

```json
{
  "theme": {
    "colors": {
      "primary": {
        "foreground": "#000000",
        "background": "#ffff00"
      },
      "base": {
        "background": "#ffffff",
        "foreground": "#000000",
        "border": "#000000"
      }
    },
    "effects": {
      "borderRadius": "0px"
    }
  },
  "mode": "light"
}
```

### Soft Theme

```json
{
  "theme": {
    "colors": {
      "primary": {
        "foreground": "#ffffff",
        "background": "#84a59d"
      },
      "secondary": {
        "foreground": "#ffffff",
        "background": "#f6bd60"
      },
      "accent": {
        "foreground": "#ffffff",
        "background": "#f28482"
      },
      "base": {
        "background": "#f5ebe0",
        "foreground": "#2d3142",
        "border": "#d9d9d9"
      }
    },
    "effects": {
      "borderRadius": "12px"
    }
  },
  "mode": "light"
}
```

---

## 🔧 Customization Tips

### For Better Readability
- Use high contrast between foreground and background
- Base font size: 14px-16px
- Line height: 1.5-1.6

### For Professional Look
- Limit to 2-3 main colors
- Use consistent border radius (4px or 8px)
- Subtle shadows (0 2px 4px rgba(0,0,0,0.1))

### For Accessibility
- WCAG AA contrast ratio: 4.5:1 for normal text
- WCAG AAA contrast ratio: 7:1 for normal text
- Test with color blindness simulators

---

## 🐛 Troubleshooting

### Theme Not Applying

1. **Clear browser cache**
   - Hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

2. **Check workspace**
   - Ensure you have a workspace selected
   - Theme is saved per workspace

3. **Check console**
   - Open browser DevTools (F12)
   - Look for errors in Console tab

### Theme Not Saving

1. **Check permissions**
   - Ensure `storage/workspaces/` directory is writable
   - Run: `icacls storage\workspaces /grant "IIS_IUSRS:(OI)(CI)F" /T`

2. **Check API response**
   - Open Network tab in DevTools
   - Look for POST request to `/api/workspaces/{id}/theme`
   - Check response status and message

### Import Fails

1. **Check JSON format**
   - Ensure exported JSON is valid
   - Must include `theme` and `mode` properties

2. **File encoding**
   - Save as UTF-8 without BOM

---

## 🚀 Next Steps

1. **Try the default themes** provided in examples above
2. **Create your own theme** that matches your brand
3. **Export and share** themes with your team
4. **Integrate theme variables** into your custom components

---

## 📞 Support

If you encounter issues:

1. Check the browser console for errors
2. Verify API routes are working: `php artisan route:list | grep theme`
3. Check Laravel logs: `storage/logs/laravel.log`
4. Clear Laravel caches: `php artisan config:clear && php artisan cache:clear`

---

**Last Updated:** 2026-02-12
**Status:** Production Ready
**Version:** 1.0.0
