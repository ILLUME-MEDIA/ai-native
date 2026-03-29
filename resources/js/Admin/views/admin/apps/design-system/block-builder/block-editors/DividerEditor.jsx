import { FieldRow, Sel, ColorPicker } from '../shared';

const STYLES = [{ value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }, { value: 'double', label: 'Double' }];
const ALIGNS = [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }];

export default function DividerEditor({ content, set }) {
    return (<>
        <FieldRow label="Line Style"><Sel value={content.line_style || 'solid'} onChange={v => set('line_style', v)} options={STYLES} /></FieldRow>
        <FieldRow label="Color"><ColorPicker value={content.color || '#e2e8f0'} onChange={v => set('color', v)} /></FieldRow>
        <FieldRow label="Thickness" hint="px">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="range" min={1} max={8} step={1} value={content.thickness || 1} onChange={e => set('thickness', parseInt(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28, textAlign: 'center', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 5px' }}>{content.thickness || 1}px</span>
            </div>
        </FieldRow>
        <FieldRow label="Width" hint="%">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="range" min={10} max={100} step={5} value={content.width_percent || 100} onChange={e => set('width_percent', parseInt(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: 11, fontWeight: 700, minWidth: 36, textAlign: 'center', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 5px' }}>{content.width_percent || 100}%</span>
            </div>
        </FieldRow>
        <FieldRow label="Align"><Sel value={content.align || 'center'} onChange={v => set('align', v)} options={ALIGNS} /></FieldRow>
    </>);
}
