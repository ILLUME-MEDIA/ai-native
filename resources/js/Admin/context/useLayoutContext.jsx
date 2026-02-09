import { getSystemTheme, toggleAttribute } from "@admin/utils/layout";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSessionStorage } from "usehooks-ts";
const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
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
  if (window.innerWidth > 767) {
    document.body.style.paddingRight = "15px";
  }
  backdropEl.addEventListener("click", () => {
    hideBackdrop();
  });
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
  dir: "ltr"
};
const ALLOWED_SKINS = ["default", "minimal", "modern", "material", "saas", "flat", "galaxy", "luxe", "retro", "neon", "pixel", "soft", "mono", "prism", "nova", "zen", "elegant", "vivid", "aurora", "crystal", "matrix", "orbit", "neo", "silver", "xenon"];
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
const normalizeSettings = value => {
  const next = {
    ...INIT_STATE,
    ...(value || {})
  };
  if (!ALLOWED_SKINS.includes(next.skin)) next.skin = INIT_STATE.skin;
  if (!ALLOWED_THEMES.includes(next.theme)) next.theme = INIT_STATE.theme;
  if (!ALLOWED_ORIENTATIONS.includes(next.orientation)) next.orientation = INIT_STATE.orientation;
  if (!ALLOWED_SIDENAV_SIZES.includes(next.sidenavSize)) next.sidenavSize = INIT_STATE.sidenavSize;
  if (!ALLOWED_SIDENAV_COLORS.includes(next.sidenavColor)) next.sidenavColor = INIT_STATE.sidenavColor;
  if (!ALLOWED_TOPBAR_COLORS.includes(next.topbarColor)) next.topbarColor = INIT_STATE.topbarColor;
  if (!ALLOWED_WIDTHS.includes(next.width)) next.width = INIT_STATE.width;
  if (!ALLOWED_POSITIONS.includes(next.position)) next.position = INIT_STATE.position;
  if (!ALLOWED_DIRS.includes(next.dir)) next.dir = INIT_STATE.dir;
  if (typeof next.sidenavUser !== "boolean") next.sidenavUser = INIT_STATE.sidenavUser;
  return next;
};
const LayoutContext = createContext(undefined);
export const useLayoutContext = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayoutContext can only be used within LayoutProvider");
  }
  return context;
};
export const LayoutProvider = ({
  children
}) => {
  const getInitialSettings = useMemo(() => () => normalizeSettings({
    ...INIT_STATE
  }), []);
  const [settings, setSettings] = useSessionStorage("__THEME_CONFIG__", getInitialSettings);
  const isResponsiveUpdateRef = useRef(false);
  const lastUserSidenavSizeRef = useRef(settings.sidenavSize);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const applyToDom = useCallback(next => {
    if (!document.body) return;
    const theme = next.theme === "system" ? getSystemTheme() : (next.theme || "light");
    toggleAttribute("data-layout", next.orientation === "horizontal" ? "topnav" : "");
    toggleAttribute("data-sidenav-user", String(next.sidenavUser));
    toggleAttribute("data-layout-position", next.position);
    toggleAttribute("data-topbar-color", next.topbarColor);
    toggleAttribute("data-menu-color", next.sidenavColor);
    toggleAttribute("data-bs-theme", theme);
    toggleAttribute("data-skin", next.skin);
    toggleAttribute("data-sidenav-size", next.sidenavSize);
    toggleAttribute("data-layout-width", next.width);
    toggleAttribute("dir", next.dir);
  }, []);

  const updateSettings = useCallback(_newSettings => {
    if (_newSettings?.sidenavSize && !isResponsiveUpdateRef.current) {
      lastUserSidenavSizeRef.current = _newSettings.sidenavSize;
    }
    setSettings(prevSettings => {
      const next = normalizeSettings({ ...prevSettings, ..._newSettings });
      applyToDom(next);
      return next;
    });
    if (isResponsiveUpdateRef.current) {
      isResponsiveUpdateRef.current = false;
    }
  }, [setSettings, applyToDom]);
  const toggleCustomizer = useCallback(() => {
    setIsCustomizerOpen(prevValue => !prevValue);
  }, []);
  const reset = useCallback(() => {
    const defaults = normalizeSettings(INIT_STATE);
    applyToDom(defaults);
    setSettings(defaults);
  }, [setSettings, applyToDom]);
  useEffect(() => {
    setSettings(prevSettings => {
      const normalized = normalizeSettings(prevSettings);
      return shallowEqual(prevSettings, normalized) ? prevSettings : normalized;
    });
  }, [setSettings]);
  // Apply theme/layout attributes to <html> synchronously so theme is correct from first paint
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
    toggleAttribute("data-sidenav-size", settings.sidenavSize);
    toggleAttribute("data-layout-width", settings.width);
    toggleAttribute("dir", settings.dir);
  }, [settings, effectiveTheme]);

  useEffect(() => {
    if (!settings.sidenavSize.includes("on-hover")) hideBackdrop();
  }, [settings.sidenavSize]);

  // When theme is "system", react to OS preference changes
  useEffect(() => {
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => toggleAttribute("data-bs-theme", getSystemTheme());
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [settings.theme]);
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (settings.orientation === "vertical") {
        if (width <= 768) {
          if (settings.sidenavSize !== "offcanvas") {
            isResponsiveUpdateRef.current = true;
            updateSettings({
              sidenavSize: "offcanvas"
            });
          }
        } else if (width <= 1140) {
          const preferred = lastUserSidenavSizeRef.current || INIT_STATE.sidenavSize;
          const desired = ["default", "condensed"].includes(preferred) ? "condensed" : preferred;
          if (settings.sidenavSize !== desired) {
            isResponsiveUpdateRef.current = true;
            updateSettings({
              sidenavSize: desired
            });
          }
        } else {
          const preferred = lastUserSidenavSizeRef.current || INIT_STATE.sidenavSize;
          if (settings.sidenavSize !== preferred) {
            isResponsiveUpdateRef.current = true;
            updateSettings({
              sidenavSize: preferred
            });
          }
        }
      } else if (settings.orientation === "horizontal") {
        if (width < 992) {
          if (settings.sidenavSize !== "offcanvas") {
            isResponsiveUpdateRef.current = true;
            updateSettings({
              sidenavSize: "offcanvas"
            });
          }
        } else {
          const preferred = lastUserSidenavSizeRef.current || INIT_STATE.sidenavSize;
          if (settings.sidenavSize !== preferred) {
            isResponsiveUpdateRef.current = true;
            updateSettings({
              sidenavSize: preferred
            });
          }
        }
      }
    };
    handleResize();
    const debouncedResize = debounce(handleResize, 200);
    window.addEventListener("resize", debouncedResize);
    return () => {
      window.removeEventListener("resize", debouncedResize);
    };
  }, [settings.orientation, settings.sidenavSize, updateSettings]);
  return <LayoutContext.Provider value={useMemo(() => ({
    ...settings,
    updateSettings,
    isCustomizerOpen,
    toggleCustomizer,
    reset
  }), [settings, updateSettings, isCustomizerOpen, toggleCustomizer, reset])}>
      {children}
    </LayoutContext.Provider>;
};
