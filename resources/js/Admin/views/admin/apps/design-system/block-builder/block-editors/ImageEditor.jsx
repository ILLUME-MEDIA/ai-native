import { FieldRow, Inp, Sel, Toggle } from '../shared';

const FIT = [{ value: 'cover', label: 'Cover (fill)' }, { value: 'contain', label: 'Contain (fit)' }, { value: 'fill', label: 'Stretch' }, { value: 'none', label: 'None' }];

export default function ImageEditor({ content, set }) {
    return (<>
        <FieldRow label="Image URL" hint="https://…"><Inp value={content.url} onChange={v => set('url', v)} placeholder="https://example.com/image.jpg" mono /></FieldRow>
        <FieldRow label="Alt Text"><Inp value={content.alt} onChange={v => set('alt', v)} placeholder="Describe the image" /></FieldRow>
        <FieldRow label="Caption"><Inp value={content.caption} onChange={v => set('caption', v)} placeholder="Optional caption" /></FieldRow>
        <FieldRow label="Link URL"><Inp value={content.link_url} onChange={v => set('link_url', v)} placeholder="https://… (optional)" mono /></FieldRow>
        <FieldRow label="Width" hint="px or %"><Inp value={content.width} onChange={v => set('width', v)} placeholder="100%" mono /></FieldRow>
        <FieldRow label="Height" hint="px or auto"><Inp value={content.height} onChange={v => set('height', v)} placeholder="auto" mono /></FieldRow>
        <FieldRow label="Object Fit"><Sel value={content.object_fit || 'cover'} onChange={v => set('object_fit', v)} options={FIT} /></FieldRow>
        <FieldRow label="Rounded corners"><Toggle checked={!!content.rounded} onChange={v => set('rounded', v)} label="Rounded" /></FieldRow>
        {content.url && (
            <div style={{ marginTop: 8, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <img src={content.url} alt={content.alt} style={{ width: '100%', height: 100, objectFit: content.object_fit || 'cover', display: 'block' }} />
            </div>
        )}
    </>);
}
