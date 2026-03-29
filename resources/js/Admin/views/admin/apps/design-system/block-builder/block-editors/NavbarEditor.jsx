import { FieldRow, Inp, Toggle, ColorPicker } from '../shared';

/**
 * NavbarEditor — structured editor for the navbar block type.
 *
 * Content fields:
 *   logo_text   — Brand name text (if no logo_image)
 *   logo_url    — Click target of logo
 *   logo_image  — URL to logo image (overrides logo_text)
 *   nav_links[] — Array of {label, url, open_new_tab}
 *   cta         — {label, url, show, variant}
 *   sticky      — Boolean — sticky position on scroll
 *   bg_color    — Navbar background (overrides section bg)
 */
export default function NavbarEditor({ content, onChange }) {
    const set     = (key, val) => onChange({ ...content, [key]: val });
    const links   = content.nav_links || [];
    const cta     = content.cta || {};

    const setLink    = (i, key, val) => set('nav_links', links.map((l, idx) => idx === i ? { ...l, [key]: val } : l));
    const addLink    = () => set('nav_links', [...links, { label: 'New Link', url: '#', open_new_tab: false }]);
    const removeLink = (i) => set('nav_links', links.filter((_, idx) => idx !== i));
    const moveLink   = (i, dir) => {
        const next = [...links];
        const [item] = next.splice(i, 1);
        next.splice(i + dir, 0, item);
        set('nav_links', next);
    };
    const setCta = (key, val) => set('cta', { ...cta, [key]: val });

    return (
        <div>
            {/* ── Logo ── */}
            <div style={{ fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>Logo</div>

            <FieldRow label="Logo Text" hint="shown when no image">
                <Inp value={content.logo_text || ''} onChange={v => set('logo_text', v)} placeholder="Brand" />
            </FieldRow>
            <FieldRow label="Logo Image URL" hint="optional, overrides text">
                <Inp value={content.logo_image || ''} onChange={v => set('logo_image', v)} placeholder="https://..." />
            </FieldRow>
            <FieldRow label="Logo Link">
                <Inp value={content.logo_url || '/'} onChange={v => set('logo_url', v)} placeholder="/" />
            </FieldRow>
            <FieldRow label="Background">
                <ColorPicker value={content.bg_color || '#ffffff'} onChange={v => set('bg_color', v)} />
            </FieldRow>
            <Toggle checked={!!content.sticky} onChange={v => set('sticky', v)} label="Sticky on scroll" />

            <div style={{ height: 1, background: '#e2e8f0', margin: '14px 0' }} />

            {/* ── Nav Links ── */}
            <div style={{ fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>
                Navigation Links ({links.length})
            </div>

            {links.map((link, i) => (
                <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                        <div style={{ flex: 1 }}>
                            <Inp value={link.label} onChange={v => setLink(i, 'label', v)} placeholder="Label" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <Inp value={link.url} onChange={v => setLink(i, 'url', v)} placeholder="URL" />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Toggle checked={!!link.open_new_tab} onChange={v => setLink(i, 'open_new_tab', v)} label="New tab" />
                        <div style={{ display: 'flex', gap: 4 }}>
                            {i > 0 && (
                                <button onClick={() => moveLink(i, -1)} title="Move up" style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 3, padding: '1px 6px', cursor: 'pointer', fontSize: 12, color: '#64748b' }}>↑</button>
                            )}
                            {i < links.length - 1 && (
                                <button onClick={() => moveLink(i, 1)} title="Move down" style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 3, padding: '1px 6px', cursor: 'pointer', fontSize: 12, color: '#64748b' }}>↓</button>
                            )}
                            <button onClick={() => removeLink(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '0 4px' }}>Remove</button>
                        </div>
                    </div>
                </div>
            ))}

            <button onClick={addLink} style={{ width: '100%', padding: '6px', border: '1.5px dashed #e2e8f0', borderRadius: 6, background: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer', marginBottom: 14 }}>
                + Add Link
            </button>

            <div style={{ height: 1, background: '#e2e8f0', margin: '14px 0' }} />

            {/* ── CTA Button ── */}
            <div style={{ fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>CTA Button</div>

            <Toggle checked={cta.show !== false} onChange={v => setCta('show', v)} label="Show CTA button" />
            {cta.show !== false && (
                <>
                    <FieldRow label="Button Label">
                        <Inp value={cta.label || ''} onChange={v => setCta('label', v)} placeholder="Get Started" />
                    </FieldRow>
                    <FieldRow label="Button URL">
                        <Inp value={cta.url || ''} onChange={v => setCta('url', v)} placeholder="#" />
                    </FieldRow>
                    <FieldRow label="Style">
                        <select value={cta.variant || 'primary'} onChange={e => setCta('variant', e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', fontSize: 12.5, border: '1.5px solid #e2e8f0', borderRadius: 5, outline: 'none' }}>
                            <option value="primary">Primary (filled)</option>
                            <option value="outline">Outline</option>
                            <option value="ghost">Ghost</option>
                        </select>
                    </FieldRow>
                </>
            )}
        </div>
    );
}
