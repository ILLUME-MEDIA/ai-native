/**
 * TokenEngine — client-side design token resolver
 *
 * Fetches the token map from the API once per session (or on demand),
 * caches it in memory, and provides helpers for React components.
 *
 * Usage:
 *   import { useTokenEngine } from './engine/TokenEngine';
 *   const { resolveVariant, tokens } = useTokenEngine('button');
 */

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

// ── Token Context ─────────────────────────────────────────────────────────────
export const TokenContext = createContext(null);

const API_BASE = '/api/admin/design-system';

// In-memory cache shared across all component instances
const _cache = {
    tokenMap: null,        // flat: { 'color.primary': '#3b82f6', ... }
    components: {},        // { 'button': { 'primary|null|null': { styles, staticClasses }, ... } }
    themeId: null,
};

/** Fetch token map for a theme */
async function fetchTokenMap(themeId) {
    const res = await fetch(`${API_BASE}/tokens?theme_id=${themeId}`);
    const tokens = await res.json();
    const map = {};
    for (const t of tokens) map[t.name] = t.value;
    return map;
}

/** Fetch all resolved variants for a component */
async function fetchComponentVariants(slug, themeId) {
    const res = await fetch(`${API_BASE}/components/${slug}/resolve?theme_id=${themeId}`);
    return await res.json();
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function TokenProvider({ themeId, children }) {
    const [tokenMap, setTokenMap] = useState(_cache.tokenMap || {});
    const [loading, setLoading] = useState(!_cache.tokenMap);

    useEffect(() => {
        if (_cache.tokenMap && _cache.themeId === themeId) {
            setTokenMap(_cache.tokenMap);
            setLoading(false);
            return;
        }
        fetchTokenMap(themeId).then(map => {
            _cache.tokenMap  = map;
            _cache.themeId   = themeId;
            setTokenMap(map);
            setLoading(false);
        });
    }, [themeId]);

    /** Force-refresh tokens (call after admin edits a token) */
    const invalidate = useCallback(async () => {
        _cache.tokenMap    = null;
        _cache.components  = {};
        setLoading(true);
        const map = await fetchTokenMap(themeId);
        _cache.tokenMap = map;
        setTokenMap(map);
        setLoading(false);
    }, [themeId]);

    return (
        <TokenContext.Provider value={{ tokenMap, themeId, loading, invalidate }}>
            {children}
        </TokenContext.Provider>
    );
}

// ── Hook: useTokenEngine ──────────────────────────────────────────────────────
/**
 * Returns helpers for resolving component variants from the token engine.
 *
 * @param {string} componentSlug — e.g. 'button'
 * @returns {{ resolveVariant, getStyle, loaded }}
 */
export function useTokenEngine(componentSlug) {
    const ctx = useContext(TokenContext);
    if (!ctx) throw new Error('useTokenEngine must be used inside <TokenProvider>');

    const { tokenMap, themeId, loading } = ctx;
    const [variants, setVariants] = useState(_cache.components[componentSlug] || null);
    const fetching = useRef(false);

    useEffect(() => {
        if (_cache.components[componentSlug]) {
            setVariants(_cache.components[componentSlug]);
            return;
        }
        if (fetching.current || loading) return;
        fetching.current = true;

        fetchComponentVariants(componentSlug, themeId).then(data => {
            _cache.components[componentSlug] = data;
            setVariants(data);
            fetching.current = false;
        });
    }, [componentSlug, themeId, loading]);

    /**
     * Resolve the inline style object for a specific variant+modifier+size combo.
     *
     * @param {string}  variantName   — 'primary' | 'secondary' | ...
     * @param {string}  [modifier]    — 'outline' | 'soft' | 'ghost' | 'gradient' | 'rounded' | ...
     * @param {string}  [size]        — 'sm' | 'md' | 'lg'
     * @returns {{ styles: object, staticClasses: string[] }}
     */
    const resolveVariant = useCallback((variantName, modifier = null, size = null) => {
        if (!variants) return { styles: {}, staticClasses: [] };
        const key = [variantName, modifier, size].filter(Boolean).join('|');
        return variants[key] || { styles: {}, staticClasses: [] };
    }, [variants]);

    /**
     * Get a raw token value by name, e.g. getToken('color.primary') → '#3b82f6'
     */
    const getToken = useCallback((name) => tokenMap[name] ?? null, [tokenMap]);

    return {
        resolveVariant,
        getToken,
        loaded: !!variants,
        variants,
    };
}
