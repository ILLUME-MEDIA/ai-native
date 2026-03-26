import { useState, useEffect, useCallback } from 'react';
import registry from './PluginRegistry';

/**
 * F-01: React hook that subscribes to PluginRegistry changes.
 * Re-renders when plugins register or unregister.
 *
 * Returns the registry instance plus a snapshot of registered contributions.
 */
export function usePluginRegistry() {
    const [snapshot, setSnapshot] = useState(() => registry.getAll());

    useEffect(() => {
        const unsub = registry.subscribe(() => setSnapshot(registry.getAll()));
        return unsub;
    }, []);

    const executeCommand = useCallback((id, ...args) => registry.executeCommand(id, ...args), []);

    return { registry, snapshot, executeCommand };
}

export default usePluginRegistry;
