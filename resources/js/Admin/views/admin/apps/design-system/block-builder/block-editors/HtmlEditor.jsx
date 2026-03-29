import { FieldRow, Tarea } from '../shared';

export default function HtmlEditor({ content, set }) {
    return (
        <FieldRow label="HTML Code">
            <Tarea value={content.code} onChange={v => set('code', v)} rows={8}
                placeholder={'<div class="my-widget">\n  <h3>Custom Content</h3>\n  <p>Write any HTML here.</p>\n</div>'}
                mono />
        </FieldRow>
    );
}
