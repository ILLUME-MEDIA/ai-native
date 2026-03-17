import { getSystemTheme, toggleAttribute } from "@admin/utils/layout";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { broadcastTokenChange } from "@admin/utils/designSystemSync";

const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { fn(...args); }, delay);
  };
};

export const showBackdrop = () => {
  const htmlEl = document.documentElement;
  const backdropEl = document.createElement("div");
  backdropEl.id = "custom-backdrop";
  backdropEl.className = "offcanvas-backdrop fade show";
  document.body.appendChild(backdropEl);
  document.body.style.overflow = "hidden";
  htmlEl.classList.add("sidebar-enable");
  if (window.innerWidth > 767) document.body.style.paddingRight = "15px";
  backdropEl.addEventListener("click", () => { hideBackdrop(); });
};

export const hideBackdrop = () => {
  const htmlEl = document.documentElement;
  htmlEl.classList.remove("sidebar-enable");
  const backdropEl = document.getElementById("custom-backdrop");
  if (backdropEl) {
    document.body.removeChild(backdropEl);
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }
};

// ─── CSS Variable Helpers ────────────────────────────────────────────────────

const hexToRgb = hex => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : null;
};

const CUSTOM_FONT_LINK_ID = "__design-system-font__";

const loadGoogleFont = fontFamily => {
  const el = document.getElementById(CUSTOM_FONT_LINK_ID);
  if (el) el.remove();
  const systemFonts = ["", "Nunito", "Arial", "Georgia", "Times New Roman",
    "Courier New", "-apple-system", "system-ui", "inherit", "monospace"];
  if (!fontFamily || systemFonts.includes(fontFamily)) return;
  const link = document.createElement("link");
  link.id = CUSTOM_FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
};

// Apply semantic colors — covers both --bs-* (Bootstrap) and --theme-* (skin) prefixes
// Also handles structural colors: sidenavBg, topbarBg, bodyBg
export const applyCustomColors = colors => {
  const root = document.documentElement;

  // Semantic colors
  const COLOR_KEYS = ["primary", "secondary", "success", "danger", "warning", "info"];
  COLOR_KEYS.forEach(key => {
    const val = colors?.[key];
    if (val) {
      const rgb = hexToRgb(val);
      root.style.setProperty(`--bs-${key}`, val);
      if (rgb) root.style.setProperty(`--bs-${key}-rgb`, rgb);
      root.style.setProperty(`--theme-${key}`, val);
      if (rgb) root.style.setProperty(`--theme-${key}-rgb`, rgb);
    } else {
      [`--bs-${key}`, `--bs-${key}-rgb`, `--theme-${key}`, `--theme-${key}-rgb`]
        .forEach(v => root.style.removeProperty(v));
    }
  });

  // Structural colors
  if (colors?.sidenavBg) {
    root.style.setProperty("--theme-sidenav-bg", colors.sidenavBg);
  } else {
    root.style.removeProperty("--theme-sidenav-bg");
  }
  if (colors?.topbarBg) {
    root.style.setProperty("--theme-topbar-bg", colors.topbarBg);
  } else {
    root.style.removeProperty("--theme-topbar-bg");
  }
  if (colors?.bodyBg) {
    const rgb = hexToRgb(colors.bodyBg);
    root.style.setProperty("--bs-body-bg", colors.bodyBg);
    if (rgb) root.style.setProperty("--bs-body-bg-rgb", rgb);
  } else {
    root.style.removeProperty("--bs-body-bg");
    root.style.removeProperty("--bs-body-bg-rgb");
  }
};

// Apply typography, border-radius, shadows
export const applyCustomStyles = styles => {
  const root = document.documentElement;

  // Font Family
  if (styles?.fontFamily) {
    loadGoogleFont(styles.fontFamily);
    const stack = `"${styles.fontFamily}", sans-serif`;
    root.style.setProperty("--bs-body-font-family", stack);
    root.style.setProperty("--bs-font-sans-serif", stack);
  } else {
    root.style.removeProperty("--bs-body-font-family");
    root.style.removeProperty("--bs-font-sans-serif");
    loadGoogleFont("");
  }

  // Font Size (stored as px number)
  if (styles?.fontSize) {
    const px = `${styles.fontSize}px`;
    root.style.setProperty("--bs-body-font-size", px);
    root.style.setProperty("--theme-font-size-base", px);
  } else {
    root.style.removeProperty("--bs-body-font-size");
    root.style.removeProperty("--theme-font-size-base");
  }

  // Line Height
  if (styles?.lineHeight) {
    root.style.setProperty("--bs-body-line-height", String(styles.lineHeight));
  } else {
    root.style.removeProperty("--bs-body-line-height");
  }

  // Border Radius (stored as rem number e.g. 0.3)
  if (styles?.borderRadius !== undefined && styles.borderRadius !== null && styles.borderRadius !== "") {
    const r = parseFloat(styles.borderRadius);
    root.style.setProperty("--bs-border-radius",       `${r}rem`);
    root.style.setProperty("--bs-border-radius-sm",    `${(r * 0.75).toFixed(3)}rem`);
    root.style.setProperty("--bs-border-radius-lg",    `${(r * 1.5).toFixed(3)}rem`);
    root.style.setProperty("--bs-border-radius-xl",    `${(r * 3).toFixed(3)}rem`);
    root.style.setProperty("--bs-border-radius-2xl",   `${(r * 5).toFixed(3)}rem`);
  } else {
    ["--bs-border-radius", "--bs-border-radius-sm", "--bs-border-radius-lg",
     "--bs-border-radius-xl", "--bs-border-radius-2xl"].forEach(v => root.style.removeProperty(v));
  }

  // Box Shadow preset
  const shadowMap = {
    none:    "none",
    subtle:  "0 1px 3px rgba(0,0,0,0.08)",
    default: "0px 1px 4px 0px rgba(130,143,163,0.15)",
    medium:  "0 4px 14px rgba(0,0,0,0.12)",
    bold:    "0 8px 30px rgba(0,0,0,0.18)",
  };
  const shadow = shadowMap[styles?.boxShadow];
  if (shadow !== undefined) {
    root.style.setProperty("--bs-box-shadow", shadow);
    root.style.setProperty("--theme-box-shadow", shadow);
    root.style.setProperty("--theme-theme-card-box-shadow", shadow);
  } else {
    ["--bs-box-shadow", "--theme-box-shadow", "--theme-theme-card-box-shadow"]
      .forEach(v => root.style.removeProperty(v));
  }
};

// ─── DB token sync helpers ───────────────────────────────────────────────────

const COLOR_TOKEN_MAP = {
  primary:   'color.primary',
  secondary: 'color.secondary',
  success:   'color.success',
  danger:    'color.danger',
  warning:   'color.warning',
  info:      'color.info',
};

async function pushColorsToDB(colors) {
  try {
    const xsrf = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
    const themes = await fetch('/api/admin/design-system/themes', {
      headers: { Accept: 'application/json' },
    }).then(r => r.json());
    const theme = (themes ?? []).find(t => t.is_default) ?? themes?.[0];
    if (!theme) return;

    const tokens = Object.entries(colors)
      .filter(([k, v]) => COLOR_TOKEN_MAP[k] && v)
      .map(([k, v]) => ({
        theme_id: theme.id,
        name:     COLOR_TOKEN_MAP[k],
        value:    v,
        category: 'color',
        type:     'static',
      }));
    if (!tokens.length) return;

    await fetch('/api/admin/design-system/tokens/bulk', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrf },
      body:    JSON.stringify({ tokens }),
    });

    // Build full token map for broadcast (so other tabs don't need to refetch)
    const allTokens = await fetch(`/api/admin/design-system/tokens?theme_id=${theme.id}`, {
      headers: { Accept: 'application/json' },
    }).then(r => r.json());
    const map = {};
    (allTokens ?? []).forEach(t => { map[t.name] = t.value; });
    broadcastTokenChange(map);
  } catch { /* silent */ }
}

// ─── State ───────────────────────────────────────────────────────────────────

const INIT_STATE = {
  skin: "default",
  theme: "light",
  orientation: "vertical",
  sidenavSize: "on-hover-active",
  sidenavColor: "dark",
  sidenavUser: false,
  topbarColor: "light",
  width: "fluid",
  position: "fixed",
  dir: "ltr",
  customColors: {},
  customStyles: {},
};

const ALLOWED_SKINS = ["default", "minimal", "modern", "material", "saas", "flat", "galaxy",
  "luxe", "retro", "neon", "pixel", "soft", "mono", "prism", "nova", "zen", "elegant",
  "vivid", "aurora", "crystal", "matrix", "orbit", "neo", "silver", "xenon"];
const ALLOWED_THEMES = ["light", "dark", "system"];
const ALLOWED_ORIENTATIONS = ["vertical", "horizontal"];
const ALLOWED_SIDENAV_SIZES = ["default", "compact", "condensed", "on-hover", "on-hover-active", "offcanvas"];
const ALLOWED_SIDENAV_COLORS = ["light", "dark", "gray", "gradient", "image"];
const ALLOWED_TOPBAR_COLORS = ["light", "dark", "gray", "gradient"];
const ALLOWED_WIDTHS = ["fluid", "boxed"];
const ALLOWED_POSITIONS = ["fixed", "scrollable"];
const ALLOWED_DIRS = ["ltr", "rtl"];

const shallowEqual = (a, b) => {
  if (a === b) return true;
  const aKeys = Object.keys(a || {});
  const bKeys = Object.keys(b || {});
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(key => a[key] === b[key]);
};

const isPlainObj = v => v !== null && typeof v === "object" && !Array.isArray(v);

const normalizeSettings = value => {
  const next = { ...INIT_STATE, ...(value || {}) };
  if (!ALLOWED_SKINS.includes(next.skin))               next.skin = INIT_STATE.skin;
  if (!ALLOWED_THEMES.includes(next.theme))             next.theme = INIT_STATE.theme;
  if (!ALLOWED_ORIENTATIONS.includes(next.orientation)) next.orientation = INIT_STATE.orientation;
  if (!ALLOWED_SIDENAV_SIZES.includes(next.sidenavSize)) next.sidenavSize = INIT_STATE.sidenavSize;
  if (!ALLOWED_SIDENAV_COLORS.includes(next.sidenavColor)) next.sidenavColor = INIT_STATE.sidenavColor;
  if (!ALLOWED_TOPBAR_COLORS.includes(next.topbarColor)) next.topbarColor = INIT_STATE.topbarColor;
  if (!ALLOWED_WIDTHS.includes(next.width))             next.width = INIT_STATE.width;
  if (!ALLOWED_POSITIONS.includes(next.position))       next.position = INIT_STATE.position;
  if (!ALLOWED_DIRS.includes(next.dir))                 next.dir = INIT_STATE.dir;
  if (typeof next.sidenavUser !== "boolean")            next.sidenavUser = INIT_STATE.sidenavUser;
  if (!isPlainObj(next.customColors))                   next.customColors = {};
  if (!isPlainObj(next.customStyles))                   next.customStyles = {};
  return next;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const LayoutContext = createContext(undefined);

export const useLayoutContext = () => {
  const context = useContext(LayoutContext);
  if (!context) throw new Error("useLayoutContext can only be used within LayoutProvider");
  return context;
};

export const LayoutProvider = ({ children }) => {
  const getInitialSettings = useMemo(() => () => normalizeSettings({ ...INIT_STATE }), []);
  const [settings, setSettings] = useLocalStorage("__THEME_CONFIG__", getInitialSettings);
  // responsiveSidenavSize: transient override for small screens — never persisted to localStorage
  const [responsiveSidenavSize, setResponsiveSidenavSize] = useState(null);
  const responsiveSidenavSizeRef = useRef(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  // Effective size = responsive override (if active) ?? user's saved preference
  const effectiveSidenavSize = responsiveSidenavSize ?? settings.sidenavSize;

  const applyToDom = useCallback((next, overrideSize) => {
    if (!document.body) return;
    const theme = next.theme === "system" ? getSystemTheme() : (next.theme || "light");
    const sizeToApply = overrideSize ?? responsiveSidenavSizeRef.current ?? next.sidenavSize;
    toggleAttribute("data-layout", next.orientation === "horizontal" ? "topnav" : "");
    toggleAttribute("data-sidenav-user", String(next.sidenavUser));
    toggleAttribute("data-layout-position", next.position);
    toggleAttribute("data-topbar-color", next.topbarColor);
    toggleAttribute("data-menu-color", next.sidenavColor);
    toggleAttribute("data-bs-theme", theme);
    toggleAttribute("data-skin", next.skin);
    toggleAttribute("data-sidenav-size", sizeToApply);
    toggleAttribute("data-layout-width", next.width);
    toggleAttribute("dir", next.dir);
    applyCustomColors(next.customColors);
    applyCustomStyles(next.customStyles);
  }, []);

  const updateSettings = useCallback(_newSettings => {
    setSettings(prev => {
      const next = normalizeSettings({ ...prev, ..._newSettings });
      applyToDom(next);
      return next;
    });
  }, [setSettings, applyToDom]);

  const toggleCustomizer = useCallback(() => {
    setIsCustomizerOpen(prev => !prev);
  }, []);

  // Colors — applies to DOM + localStorage + DB (debounced)
  const dbSaveTimer = useRef(null);
  const updateCustomColors = useCallback(newColors => {
    setSettings(prev => {
      const merged = { ...(prev.customColors || {}), ...newColors };
      Object.keys(merged).forEach(k => { if (!merged[k]) delete merged[k]; });
      applyCustomColors(merged);
      // Debounced DB sync (800ms after last change)
      clearTimeout(dbSaveTimer.current);
      dbSaveTimer.current = setTimeout(() => pushColorsToDB(merged), 800);
      return { ...prev, customColors: merged };
    });
  }, [setSettings]);

  const resetCustomColors = useCallback(() => {
    applyCustomColors({});
    setSettings(prev => ({ ...prev, customColors: {} }));
  }, [setSettings]);

  // Typography / Shape / Shadow
  const updateCustomStyles = useCallback(newStyles => {
    setSettings(prev => {
      const merged = { ...(prev.customStyles || {}), ...newStyles };
      // Remove null/empty string values
      Object.keys(merged).forEach(k => {
        if (merged[k] === null || merged[k] === "") delete merged[k];
      });
      applyCustomStyles(merged);
      return { ...prev, customStyles: merged };
    });
  }, [setSettings]);

  const resetCustomStyles = useCallback(() => {
    applyCustomStyles({});
    setSettings(prev => ({ ...prev, customStyles: {} }));
  }, [setSettings]);

  // Full reset
  const reset = useCallback(() => {
    const defaults = normalizeSettings(INIT_STATE);
    applyToDom(defaults);
    setSettings(defaults);
  }, [setSettings, applyToDom]);

  // Normalize stale localStorage values on mount
  useEffect(() => {
    setSettings(prev => {
      const normalized = normalizeSettings(prev);
      return shallowEqual(prev, normalized) ? prev : normalized;
    });
  }, [setSettings]);

  // Apply ALL settings synchronously on first paint (avoids flash)
  const effectiveTheme = settings.theme === "system" ? getSystemTheme() : settings.theme;
  useLayoutEffect(() => {
    if (!document.body) return;
    toggleAttribute("data-layout", settings.orientation === "horizontal" ? "topnav" : "");
    toggleAttribute("data-sidenav-user", settings.sidenavUser.toString());
    toggleAttribute("data-layout-position", settings.position);
    toggleAttribute("data-topbar-color", settings.topbarColor);
    toggleAttribute("data-menu-color", settings.sidenavColor);
    toggleAttribute("data-bs-theme", effectiveTheme);
    toggleAttribute("data-skin", settings.skin);
    toggleAttribute("data-sidenav-size", effectiveSidenavSize);
    toggleAttribute("data-layout-width", settings.width);
    toggleAttribute("dir", settings.dir);
    applyCustomColors(settings.customColors);
    applyCustomStyles(settings.customStyles);
  }, [settings, effectiveTheme, effectiveSidenavSize]);

  useEffect(() => {
    if (!effectiveSidenavSize.includes("on-hover")) hideBackdrop();
  }, [effectiveSidenavSize]);

  // System theme: react to OS changes
  useEffect(() => {
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => toggleAttribute("data-bs-theme", getSystemTheme());
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [settings.theme]);

  // Responsive sidenav: only force "offcanvas" on mobile — never overwrite user's saved preference
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const isMobile = settings.orientation === "vertical" ? w <= 768 : w < 992;
      const next = isMobile ? "offcanvas" : null;
      if (next !== responsiveSidenavSizeRef.current) {
        responsiveSidenavSizeRef.current = next;
        setResponsiveSidenavSize(next);
        // Immediately update DOM attribute without touching localStorage
        toggleAttribute("data-sidenav-size", next ?? settings.sidenavSize);
        if (!next || !next.includes("on-hover")) hideBackdrop();
      }
    };
    handleResize();
    const debouncedResize = debounce(handleResize, 200);
    window.addEventListener("resize", debouncedResize);
    return () => window.removeEventListener("resize", debouncedResize);
  }, [settings.orientation, settings.sidenavSize]);

  return (
    <LayoutContext.Provider value={useMemo(() => ({
      ...settings,
      sidenavSize: effectiveSidenavSize, // expose effective (responsive-aware) size
      updateSettings,
      updateCustomColors,
      resetCustomColors,
      updateCustomStyles,
      resetCustomStyles,
      isCustomizerOpen,
      toggleCustomizer,
      reset,
    }), [settings, effectiveSidenavSize, updateSettings, updateCustomColors, resetCustomColors,
        updateCustomStyles, resetCustomStyles, isCustomizerOpen, toggleCustomizer, reset])}>
      {children}
    </LayoutContext.Provider>
  );
};
