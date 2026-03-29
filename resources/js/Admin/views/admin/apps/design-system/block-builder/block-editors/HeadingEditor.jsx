import { FieldRow, Inp, Sel } from '../shared';

const LEVELS = ['h1','h2','h3','h4','h5','h6'].map(v => ({ value: v, label: v.toUpperCase() }));
const ALIGNS = [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }];

export default function HeadingEditor({ content, set }) {
    return (<>
        <FieldRow label="Text"><Inp value={content.text} onChange={v => set('text', v)} placeholder="Heading text" /></FieldRow>
        <FieldRow label="Level"><Sel value={content.level || 'h2'} onChange={v => set('level', v)} options={LEVELS} /></FieldRow>
        <FieldRow label="Align"><Sel value={content.align || 'left'} onChange={v => set('align', v)} options={ALIGNS} /></FieldRow>
    </>);
}
