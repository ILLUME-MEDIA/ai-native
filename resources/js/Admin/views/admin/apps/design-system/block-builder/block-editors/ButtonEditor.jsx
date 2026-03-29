import { FieldRow, Inp, Sel, Toggle } from '../shared';

const VARIANTS = [{ value: 'primary', label: 'Primary' }, { value: 'secondary', label: 'Secondary' }, { value: 'outline', label: 'Outline' }, { value: 'ghost', label: 'Ghost' }, { value: 'danger', label: 'Danger' }, { value: 'success', label: 'Success' }];
const SIZES    = [{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }];
const ALIGNS   = [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }];

export default function ButtonEditor({ content, set }) {
    return (<>
        <FieldRow label="Label"><Inp value={content.label} onChange={v => set('label', v)} placeholder="Button text" /></FieldRow>
        <FieldRow label="URL"><Inp value={content.url} onChange={v => set('url', v)} placeholder="https://… or #anchor" mono /></FieldRow>
        <FieldRow label="Variant"><Sel value={content.variant || 'primary'} onChange={v => set('variant', v)} options={VARIANTS} /></FieldRow>
        <FieldRow label="Size"><Sel value={content.size || 'md'} onChange={v => set('size', v)} options={SIZES} /></FieldRow>
        <FieldRow label="Alignment"><Sel value={content.align || 'left'} onChange={v => set('align', v)} options={ALIGNS} /></FieldRow>
        <FieldRow label="Icon class" hint="lucide name or ri-*"><Inp value={content.icon || ''} onChange={v => set('icon', v)} placeholder="ArrowRight" mono /></FieldRow>
        <FieldRow label="Open in new tab"><Toggle checked={!!content.open_new_tab} onChange={v => set('open_new_tab', v)} label="New tab" /></FieldRow>
    </>);
}
