/**
 * F-01: Code Editor Plugin Registry
 *
 * Plugins can register:
 *   - panels      (left sidebar, center view, bottom dock, right panel)
 *   - commands    (shown in command palette)
 *   - statusItems (status bar contributions)
 *   - keybindings (keyboard shortcut contributions)
 *
 * Usage from a plugin:
 *   import registry from '@/Admin/components/CodeEditor/PluginRegistry';
 *
 *   registry.registerPanel({
 *     id: 'my-panel',
 *     label: 'My Panel',
 *     icon: <MyIcon />,
 *     slot: 'left',          // 'left' | 'center' | 'bottom' | 'right'
 *     component: MyPanel,
 *   });
 *
 *   registry.registerCommand({
 *     id: 'my-plugin.doThing',
 *     label: 'My Plugin: Do Thing',
 *     action: () => { ... },
 *     keybinding: 'Ctrl+Shift+T',
 *   });
 */

class PluginRegistry {
    constructor() {
        this._panels      = new Map(); // id → PanelDef
        this._commands    = new Map(); // id → CommandDef
        this._statusItems = new Map(); // id → StatusItemDef
        this._listeners   = new Set(); // change listeners
    }

    // ── Panels ────────────────────────────────────────────────────────────────

    /**
     * @param {{ id, label, icon, slot, component, props? }} def
     *   slot: 'left' | 'center' | 'bottom' | 'right'
     */
    registerPanel(def) {
        if (!def.id || !def.label || !def.slot || !def.component) {
            console.warn('[PluginRegistry] registerPanel: missing required fields (id, label, slot, component)', def);
            return;
        }
        this._panels.set(def.id, def);
        this._notify();
    }

    unregisterPanel(id) {
        this._panels.delete(id);
        this._notify();
    }

    getPanels(slot) {
        const all = [...this._panels.values()];
        return slot ? all.filter(p => p.slot === slot) : all;
    }

    // ── Commands ──────────────────────────────────────────────────────────────

    /**
     * @param {{ id, label, action, category?, keybinding?, when? }} def
     */
    registerCommand(def) {
        if (!def.id || !def.label || !def.action) {
            console.warn('[PluginRegistry] registerCommand: missing required fields (id, label, action)', def);
            return;
        }
        this._commands.set(def.id, def);
        this._notify();
    }

    unregisterCommand(id) {
        this._commands.delete(id);
        this._notify();
    }

    getCommands() {
        return [...this._commands.values()];
    }

    executeCommand(id, ...args) {
        const cmd = this._commands.get(id);
        if (!cmd) { console.warn(`[PluginRegistry] Unknown command: ${id}`); return; }
        return cmd.action(...args);
    }

    // ── Status Bar Items ──────────────────────────────────────────────────────

    /**
     * @param {{ id, label, tooltip?, onClick?, align? }} def
     *   align: 'left' | 'right'
     */
    registerStatusItem(def) {
        if (!def.id || !def.label) {
            console.warn('[PluginRegistry] registerStatusItem: missing required fields (id, label)', def);
            return;
        }
        this._statusItems.set(def.id, { align: 'right', ...def });
        this._notify();
    }

    unregisterStatusItem(id) {
        this._statusItems.delete(id);
        this._notify();
    }

    getStatusItems(align) {
        const all = [...this._statusItems.values()];
        return align ? all.filter(s => s.align === align) : all;
    }

    // ── Change Listeners ──────────────────────────────────────────────────────

    /** Subscribe to registry changes. Returns an unsubscribe function. */
    subscribe(fn) {
        this._listeners.add(fn);
        return () => this._listeners.delete(fn);
    }

    _notify() {
        this._listeners.forEach(fn => fn());
    }

    // ── Introspection ─────────────────────────────────────────────────────────

    getAll() {
        return {
            panels:      [...this._panels.values()],
            commands:    [...this._commands.values()],
            statusItems: [...this._statusItems.values()],
        };
    }

    /** Remove all contributions registered by a given plugin prefix (e.g. 'my-plugin.'). */
    unregisterPlugin(prefix) {
        for (const id of this._panels.keys())      { if (id.startsWith(prefix)) this._panels.delete(id); }
        for (const id of this._commands.keys())    { if (id.startsWith(prefix)) this._commands.delete(id); }
        for (const id of this._statusItems.keys()) { if (id.startsWith(prefix)) this._statusItems.delete(id); }
        this._notify();
    }
}

// Singleton — shared across the entire app
const registry = new PluginRegistry();

// Expose on window so external scripts (loaded via <script>) can register contributions
if (typeof window !== 'undefined') {
    window.XDPluginRegistry = registry;
}

export default registry;
