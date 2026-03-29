import { FieldRow, Inp, ColorPicker, Toggle } from '../shared';

export default function SearchBarEditor({ content, onChange }) {
    const set = (key, val) => onChange({ ...content, [key]: val });
    return (
        <div>
            <FieldRow label="Restaurant Placeholder">
                <Inp value={content.placeholder_restaurant} onChange={v => set('placeholder_restaurant', v)} placeholder="Search restaurants..." />
            </FieldRow>
            <FieldRow label="Location Placeholder">
                <Inp value={content.placeholder_location} onChange={v => set('placeholder_location', v)} placeholder="City, State" />
            </FieldRow>
            <FieldRow label="Button Text">
                <Inp value={content.button_text} onChange={v => set('button_text', v)} placeholder="Search" />
            </FieldRow>
            <FieldRow label="Button Background">
                <ColorPicker value={content.button_bg || '#1e293b'} onChange={v => set('button_bg', v)} />
            </FieldRow>
            <Toggle checked={content.show_location !== false} onChange={v => set('show_location', v)} label="Show location field" />
        </div>
    );
}
