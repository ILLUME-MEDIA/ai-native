import { useState, useCallback, useRef } from 'react';

const BASE = '/api/admin/design-system';

function dsCall(path, opts = {}) {
    const xsrf = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
    return fetch(BASE + path, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrf },
        ...opts,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(r => (r.status === 204 ? null : r.json()));
}

/**
 * useBlocks — manages block state for one section at a time.
 *
 * Usage:
 *   const { blocks, loadBlocks, addBlock, updateBlock,
 *           deleteBlock, reorderBlocks, saving } = useBlocks(siteId, pageId);
 *
 * `blocks` shape: { "0": [block,...], "1": [...] }  (keyed by column_index string)
 */
export function useBlocks(siteId, pageId) {
    const [blocksBySectionId, setBlocksBySectionId] = useState({}); // { [sectionId]: groupedBlocks }
    const [saving, setSaving]   = useState(false);
    const saveTimer = useRef(null);

    const blockPath = useCallback((sectionId, extra = '') =>
        `/sites/${siteId}/pages/${pageId}/sections/${sectionId}/blocks${extra}`,
    [siteId, pageId]);

    // ── Load blocks for a section ───────────────────────────────────

    const loadBlocks = useCallback(async (sectionId) => {
        try {
            const data = await dsCall(blockPath(sectionId));
            setBlocksBySectionId(prev => ({ ...prev, [sectionId]: data }));
        } catch (e) { console.error('loadBlocks', e); }
    }, [blockPath]);

    // ── Add block to a column ───────────────────────────────────────

    const addBlock = useCallback(async (sectionId, columnIndex, blockType) => {
        try {
            const block = await dsCall(blockPath(sectionId), {
                method: 'POST',
                body: { block_type: blockType, column_index: columnIndex },
            });
            setBlocksBySectionId(prev => {
                const grouped = { ...(prev[sectionId] ?? {}) };
                const col = String(columnIndex);
                grouped[col] = [...(grouped[col] ?? []), block];
                return { ...prev, [sectionId]: grouped };
            });
            return block;
        } catch (e) { console.error('addBlock', e); }
    }, [blockPath]);

    // ── Update block content/style (debounced auto-save) ───────────

    const updateBlock = useCallback((sectionId, blockId, patch) => {
        // Optimistic UI update
        setBlocksBySectionId(prev => {
            const grouped = prev[sectionId];
            if (!grouped) return prev;
            const next = {};
            for (const [col, blocks] of Object.entries(grouped)) {
                next[col] = blocks.map(b => b.id === blockId ? { ...b, ...patch } : b);
            }
            return { ...prev, [sectionId]: next };
        });

        // Debounced API call
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            setSaving(true);
            try {
                await dsCall(blockPath(sectionId, `/${blockId}`), { method: 'PUT', body: patch });
            } catch (e) { console.error('updateBlock', e); }
            finally { setSaving(false); }
        }, 700);
    }, [blockPath]);

    // ── Delete block ────────────────────────────────────────────────

    const deleteBlock = useCallback(async (sectionId, blockId) => {
        setBlocksBySectionId(prev => {
            const grouped = prev[sectionId];
            if (!grouped) return prev;
            const next = {};
            for (const [col, blocks] of Object.entries(grouped)) {
                next[col] = blocks.filter(b => b.id !== blockId);
            }
            return { ...prev, [sectionId]: next };
        });
        try {
            await dsCall(blockPath(sectionId, `/${blockId}`), { method: 'DELETE' });
        } catch (e) { console.error('deleteBlock', e); }
    }, [blockPath]);

    // ── Reorder blocks (cross-column drag-drop) ─────────────────────
    // newGrouped: { "0": [block,...], "1": [...] }

    const reorderBlocks = useCallback(async (sectionId, newGrouped) => {
        setBlocksBySectionId(prev => ({ ...prev, [sectionId]: newGrouped }));

        const items = [];
        for (const [col, blocks] of Object.entries(newGrouped)) {
            blocks.forEach((b, idx) => {
                items.push({ id: b.id, column_index: parseInt(col), sort_order: idx });
            });
        }
        try {
            await dsCall(blockPath(sectionId, '/reorder'), { method: 'POST', body: { items } });
        } catch (e) { console.error('reorderBlocks', e); }
    }, [blockPath]);

    const getBlocks = useCallback((sectionId) => blocksBySectionId[sectionId] ?? {}, [blocksBySectionId]);

    return { getBlocks, loadBlocks, addBlock, updateBlock, deleteBlock, reorderBlocks, saving };
}
