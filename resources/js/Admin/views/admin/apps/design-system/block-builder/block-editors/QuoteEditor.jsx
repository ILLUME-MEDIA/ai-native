import { FieldRow, Tarea, Inp, Sel } from '../shared';

const ALIGNS = [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }];

export default function QuoteEditor({ content, set }) {
    return (<>
        <FieldRow label="Quote Text"><Tarea value={content.text} onChange={v => set('text', v)} rows={3} placeholder="Quote text…" /></FieldRow>
        <FieldRow label="Author Name"><Inp value={content.author} onChange={v => set('author', v)} placeholder="John Smith" /></FieldRow>
        <FieldRow label="Author Title"><Inp value={content.author_title} onChange={v => set('author_title', v)} placeholder="CEO, Acme Inc." /></FieldRow>
        <FieldRow label="Author Photo URL"><Inp value={content.author_image_url} onChange={v => set('author_image_url', v)} placeholder="https://…" mono /></FieldRow>
        <FieldRow label="Alignment"><Sel value={content.align || 'center'} onChange={v => set('align', v)} options={ALIGNS} /></FieldRow>
    </>);
}
