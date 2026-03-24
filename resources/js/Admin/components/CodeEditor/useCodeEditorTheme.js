import { useMemo } from 'react';
import { useLayoutContext } from '@admin/context/useLayoutContext';
import { getSystemTheme } from '@admin/utils/layout';

/**
 * Returns theme tokens for the Code Editor.
 * Reads from the global layout context (light / dark / system).
 */
export function useCodeEditorTheme() {
    const { theme } = useLayoutContext();

    const isDark = useMemo(() => {
        if (theme === 'dark') return true;
        if (theme === 'light') return false;
        // system
        return getSystemTheme() === 'dark';
    }, [theme]);

    const tokens = useMemo(() => isDark ? DARK : LIGHT, [isDark]);

    return { isDark, tokens };
}

/* ─── Dark palette (GitHub Dark) ─────────────────────────────── */
const DARK = {
    bg1:        '#0d0f14',   // outermost / activity bar
    bg2:        '#0d1117',   // sidebar, bottom dock
    bg3:        '#161b22',   // editor canvas
    bg4:        '#21262d',   // hover bg
    bgTab:      '#010409',   // tab row bg
    border:     '#1c2128',
    text1:      '#e6edf3',   // primary text
    text2:      '#c9d1d9',   // secondary text
    text3:      '#8b949e',   // muted
    text4:      '#484f58',   // very muted
    accent:     '#ff6b35',   // orange
    accentBg:   'rgba(255,107,53,0.1)',
    accentBorder:'rgba(255,107,53,0.2)',
    warning:    '#d29922',
    scrollbar:  '#30363d',
    monacoTheme:'vs-dark',
};

/* ─── Light palette (GitHub Light) ───────────────────────────── */
const LIGHT = {
    bg1:        '#f6f8fa',   // outermost / activity bar
    bg2:        '#f0f3f6',   // sidebar, bottom dock
    bg3:        '#ffffff',   // editor canvas
    bg4:        '#eaeef2',   // hover bg
    bgTab:      '#f6f8fa',   // tab row bg
    border:     '#d0d7de',
    text1:      '#24292f',
    text2:      '#57606a',
    text3:      '#6e7681',
    text4:      '#afb8c1',
    accent:     '#ff6b35',
    accentBg:   'rgba(255,107,53,0.1)',
    accentBorder:'rgba(255,107,53,0.2)',
    warning:    '#9a6700',
    scrollbar:  '#d0d7de',
    monacoTheme:'vs',
};
