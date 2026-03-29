import { Plus, Trash2 } from 'lucide-react';
import { FieldRow, Inp, Sel } from '../shared';

const STYLES = [{ value: 'unordered', label: '• Bullet list' }, { value: 'ordered', label: '1. Numbered list' }, { value: 'checklist', label: '✓ Checklist' }];

export default function ListEditor({ content, set }) {
    const items    = content.items || [];
    const addItem  = () => set('items', [...items, { text: '' }]);
    const removeItem = i => set('items', items.filter((_, idx) => idx !== i));
    const updateItem = (i, val) => set('items', items.map((it, idx) => idx === i ? { ...it, text: val } : it));

    return (<>
        <FieldRow label="List Style"><Sel value={content.list_style || 'unordered'} onChange={v => set('list_style', v)} options={STYLES} /></FieldRow>
        <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Items</div>
            {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <Inp value={item.text} onChange={v => updateItem(i, v)} placeholder={`Item ${i + 1}`} />
                    <button onClick={() => removeItem(i)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 5, width: 28, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}>
                        <Trash2 size={12} />
                    </button>
                </div>
            ))}
            <button onClick={addItem} style={{ width: '100%', padding: '6px 0', border: '1.5px dashed #cbd5e1', borderRadius: 6, background: 'none', cursor: 'pointer', fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Plus size={13} /> Add Item
            </button>
        </div>
    </>);
}
