import { FieldRow, Inp } from '../shared';

export default function CuisineTabsEditor({ content, onChange }) {
    const cats = content.categories || [];
    const set  = (key, val) => onChange({ ...content, [key]: val });

    const setCat = (i, key, val) => {
        const next = cats.map((c, idx) => idx === i ? { ...c, [key]: val } : c);
        set('categories', next);
    };
    const addCat    = () => set('categories', [...cats, { id: `cat-${Date.now()}`, label: 'New', count: null }]);
    const removeCat = (i) => set('categories', cats.filter((_, idx) => idx !== i));

    return (
        <div>
            <FieldRow label="Active Category ID" hint="default selected">
                <Inp value={content.active_id || 'all'} onChange={v => set('active_id', v)} placeholder="all" />
            </FieldRow>

            <div style={{ fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8, marginTop: 4 }}>
                Categories ({cats.length})
            </div>

            {cats.map((cat, i) => (
                <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <Inp value={cat.id} onChange={v => setCat(i, 'id', v)} placeholder="id (slug)" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <Inp value={cat.label} onChange={v => setCat(i, 'label', v)} placeholder="Label" />
                    </div>
                    <div style={{ width: 60 }}>
                        <Inp value={cat.count ?? ''} onChange={v => setCat(i, 'count', v || null)} placeholder="count" />
                    </div>
                    <button onClick={() => removeCat(i)} title="Remove" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>×</button>
                </div>
            ))}

            <button onClick={addCat} style={{ width: '100%', padding: '6px', border: '1.5px dashed #e2e8f0', borderRadius: 6, background: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
                + Add Category
            </button>
        </div>
    );
}
