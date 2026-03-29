import { FieldRow, Tarea, Sel } from '../shared';

const ALIGNS = [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }, { value: 'justify', label: 'Justify' }];

export default function ParagraphEditor({ content, set }) {
    return (<>
        <FieldRow label="Text"><Tarea value={content.text} onChange={v => set('text', v)} rows={4} placeholder="Paragraph text…" /></FieldRow>
        <FieldRow label="Align"><Sel value={content.align || 'left'} onChange={v => set('align', v)} options={ALIGNS} /></FieldRow>
    </>);
}
