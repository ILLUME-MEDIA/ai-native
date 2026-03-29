/**
 * Shared form atoms for block editors.
 * Mirrors the atoms in SitePageBuilder.jsx but self-contained.
 */
import { useState } from 'react';

const C = {
    border:      '#e2e8f0',
    borderFocus: '#3b82f6',
    text:        '#0f172a',
    textMuted:   '#64748b',
    textLight:   '#94a3b8',
    accent:      '#3b82f6',
    accentSoft:  '#eff6ff',
    panelDark:   '#f8fafc',
    radiusSm:    '5px',
};

const inputBase = {
    width: '100%', padding: '6px 10px', fontSize: 12.5,
    border: `1.5px solid ${C.border}`, borderRadius: C.radiusSm,
    outline: 'none', color: C.text, background: '#fff',
    boxSizing: 'border-box', transition: 'border-color 0.15s', lineHeight: 1.4,
};

export function FieldRow({ label, hint, children }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                {label}
                {hint && <span style={{ fontSize: 10, fontWeight: 400, color: C.textLight, textTransform: 'none' }}>{hint}</span>}
            </label>
            {children}
        </div>
    );
}

export function Inp({ value, onChange, placeholder, mono }) {
    const [focused, setFocused] = useState(false);
    return (
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ ...inputBase, fontFamily: mono ? '"Fira Code", monospace' : 'inherit', borderColor: focused ? C.borderFocus : C.border, boxShadow: focused ? `0 0 0 3px ${C.accentSoft}` : 'none' }} />
    );
}

export function Tarea({ value, onChange, placeholder, rows = 3, mono }) {
    const [focused, setFocused] = useState(false);
    return (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ ...inputBase, resize: 'vertical', fontFamily: mono ? '"Fira Code", monospace' : 'inherit', borderColor: focused ? C.borderFocus : C.border, boxShadow: focused ? `0 0 0 3px ${C.accentSoft}` : 'none' }} />
    );
}

export function Sel({ value, onChange, options }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)}
            style={{ ...inputBase, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%2364748b'%3E%3Cpath d='M12 15l-7-7h14z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: 28 }}>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}

export function ColorPicker({ value, onChange }) {
    return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)}
                style={{ width: 36, height: 32, padding: 3, border: `1.5px solid ${C.border}`, borderRadius: C.radiusSm, cursor: 'pointer', display: 'block' }} />
            <Inp value={value} onChange={onChange} placeholder="#ffffff or transparent" mono />
        </div>
    );
}

export function Toggle({ checked, onChange, label }) {
    return (
        <button type="button" onClick={() => onChange(!checked)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: checked ? C.accent : '#cbd5e1', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </div>
            <span style={{ fontSize: 12.5, color: '#334155' }}>{label}</span>
        </button>
    );
}
