import { FieldRow, Inp, ColorPicker } from '../shared';

export default function DealCardEditor({ content, onChange }) {
    const set = (key, val) => onChange({ ...content, [key]: val });
    return (
        <div>
            <FieldRow label="Deal Title">
                <Inp value={content.title} onChange={v => set('title', v)} placeholder="$5 off your first order" />
            </FieldRow>
            <FieldRow label="Delivery Info">
                <Inp value={content.delivery_info} onChange={v => set('delivery_info', v)} placeholder="Delivery by 6:15am" />
            </FieldRow>
            <FieldRow label="Expiry">
                <Inp value={content.expiry} onChange={v => set('expiry', v)} placeholder="expired Aug 5" />
            </FieldRow>
            <FieldRow label="Thumbnail URL" hint="optional">
                <Inp value={content.image_url || ''} onChange={v => set('image_url', v)} placeholder="https://..." />
            </FieldRow>
            <FieldRow label="CTA Button Text">
                <Inp value={content.cta_text} onChange={v => set('cta_text', v)} placeholder="Shop Now" />
            </FieldRow>
            <FieldRow label="CTA URL">
                <Inp value={content.cta_url} onChange={v => set('cta_url', v)} placeholder="#" />
            </FieldRow>
            <FieldRow label="CTA Button Color">
                <ColorPicker value={content.cta_bg || '#0f172a'} onChange={v => set('cta_bg', v)} />
            </FieldRow>
        </div>
    );
}
