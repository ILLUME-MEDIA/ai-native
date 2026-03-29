import { FieldRow, Inp, Sel, ColorPicker } from '../shared';

const ALIGNS = [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }];

export default function IconEditor({ content, set }) {
    return (<>
        <FieldRow label="Icon Name" hint="Lucide icon name">
            <Inp value={content.name || ''} onChange={v => set('name', v)} placeholder="Star, Heart, Check, ArrowRight…" />
        </FieldRow>
        <FieldRow label="Size" hint="px">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="range" min={16} max={120} step={4} value={content.size || 48} onChange={e => set('size', parseInt(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: 11, fontWeight: 700, minWidth: 36, textAlign: 'center', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 5px' }}>{content.size || 48}px</span>
            </div>
        </FieldRow>
        <FieldRow label="Color"><ColorPicker value={content.color || ''} onChange={v => set('color', v)} /></FieldRow>
        <FieldRow label="Link URL"><Inp value={content.link_url || ''} onChange={v => set('link_url', v)} placeholder="https://… (optional)" mono /></FieldRow>
        <FieldRow label="Alignment"><Sel value={content.align || 'center'} onChange={v => set('align', v)} options={ALIGNS} /></FieldRow>
    </>);
}
