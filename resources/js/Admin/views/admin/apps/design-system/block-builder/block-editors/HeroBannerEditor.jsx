import { FieldRow, Inp, Tarea, ColorPicker, Toggle } from '../shared';

export default function HeroBannerEditor({ content, onChange }) {
    const set = (key, val) => onChange({ ...content, [key]: val });

    const buttons = content.buttons || [];
    const setBtn  = (i, key, val) => {
        const next = buttons.map((b, idx) => idx === i ? { ...b, [key]: val } : b);
        set('buttons', next);
    };
    const addBtn    = () => set('buttons', [...buttons, { label: 'Button', url: '#', icon: '', style: 'outline' }]);
    const removeBtn = (i) => set('buttons', buttons.filter((_, idx) => idx !== i));

    return (
        <div>
            <FieldRow label="Promo Tag" hint="small text above heading">
                <Inp value={content.promo_tag} onChange={v => set('promo_tag', v)} placeholder="Save up to 50% off..." />
            </FieldRow>
            <FieldRow label="Headline">
                <Inp value={content.headline} onChange={v => set('headline', v)} placeholder="Order Delivery Near You" />
            </FieldRow>
            <FieldRow label="Subtext">
                <Tarea value={content.subtext} onChange={v => set('subtext', v)} placeholder="Optional supporting text..." rows={2} />
            </FieldRow>
            <FieldRow label="Background Image URL">
                <Inp value={content.bg_image} onChange={v => set('bg_image', v)} placeholder="https://..." />
            </FieldRow>
            <FieldRow label="Overlay Color" hint="rgba(0,0,0,0.5)">
                <Inp value={content.bg_overlay} onChange={v => set('bg_overlay', v)} placeholder="rgba(0,0,0,0.5)" mono />
            </FieldRow>
            <FieldRow label="Text Align">
                <select value={content.text_align || 'left'} onChange={e => set('text_align', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: 12.5, border: '1.5px solid #e2e8f0', borderRadius: 5, outline: 'none' }}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                </select>
            </FieldRow>

            <div style={{ fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8, marginTop: 4 }}>
                Buttons
            </div>
            {buttons.map((btn, i) => (
                <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        <div style={{ flex: 1 }}><Inp value={btn.label} onChange={v => setBtn(i, 'label', v)} placeholder="Button label" /></div>
                        <div style={{ flex: 1 }}><Inp value={btn.icon} onChange={v => setBtn(i, 'icon', v)} placeholder="icon/emoji" /></div>
                    </div>
                    <Inp value={btn.url} onChange={v => setBtn(i, 'url', v)} placeholder="URL" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                        <select value={btn.style || 'outline'} onChange={e => setBtn(i, 'style', e.target.value)}
                            style={{ padding: '4px 8px', fontSize: 12, border: '1.5px solid #e2e8f0', borderRadius: 4, outline: 'none' }}>
                            <option value="outline">Outline</option>
                            <option value="solid">Solid</option>
                            <option value="ghost">Ghost</option>
                        </select>
                        <button onClick={() => removeBtn(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                            Remove
                        </button>
                    </div>
                </div>
            ))}
            <button onClick={addBtn} style={{ width: '100%', padding: '6px', border: '1.5px dashed #e2e8f0', borderRadius: 6, background: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
                + Add Button
            </button>
        </div>
    );
}
