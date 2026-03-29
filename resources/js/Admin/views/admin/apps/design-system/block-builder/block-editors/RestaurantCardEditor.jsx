import { FieldRow, Inp, Tarea } from '../shared';

export default function RestaurantCardEditor({ content, onChange }) {
    const set  = (key, val) => onChange({ ...content, [key]: val });
    const tags = Array.isArray(content.tags) ? content.tags.join(', ') : '';

    return (
        <div>
            <FieldRow label="Restaurant Name">
                <Inp value={content.name} onChange={v => set('name', v)} placeholder="e.g. The Pizza Place" />
            </FieldRow>
            <FieldRow label="Address">
                <Tarea value={content.address} onChange={v => set('address', v)} placeholder="123 Main St, City, State" rows={2} />
            </FieldRow>
            <FieldRow label="Cuisine Tags" hint="comma separated">
                <Inp value={tags} onChange={v => set('tags', v.split(',').map(t => t.trim()).filter(Boolean))} placeholder="American, Italian" />
            </FieldRow>
            <FieldRow label="Rating" hint="0 – 5">
                <input type="number" min="0" max="5" step="0.5" value={content.rating ?? 4}
                    onChange={e => set('rating', parseFloat(e.target.value))}
                    style={{ width: '100%', padding: '6px 10px', fontSize: 12.5, border: '1.5px solid #e2e8f0', borderRadius: 5, outline: 'none' }} />
            </FieldRow>
            <div style={{ display: 'flex', gap: 8 }}>
                <FieldRow label="Reviews">
                    <input type="number" min="0" value={content.review_count ?? 0} onChange={e => set('review_count', parseInt(e.target.value))}
                        style={{ width: '100%', padding: '6px 10px', fontSize: 12.5, border: '1.5px solid #e2e8f0', borderRadius: 5, outline: 'none' }} />
                </FieldRow>
                <FieldRow label="Photos">
                    <input type="number" min="0" value={content.photo_count ?? 0} onChange={e => set('photo_count', parseInt(e.target.value))}
                        style={{ width: '100%', padding: '6px 10px', fontSize: 12.5, border: '1.5px solid #e2e8f0', borderRadius: 5, outline: 'none' }} />
                </FieldRow>
            </div>
            <FieldRow label="Thumbnail URL">
                <Inp value={content.image_url} onChange={v => set('image_url', v)} placeholder="https://..." />
            </FieldRow>
            <FieldRow label="Badge" hint="optional label e.g. New, Popular">
                <Inp value={content.badge || ''} onChange={v => set('badge', v)} placeholder="Popular" />
            </FieldRow>
        </div>
    );
}
