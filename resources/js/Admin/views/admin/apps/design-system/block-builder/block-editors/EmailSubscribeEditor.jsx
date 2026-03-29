import { FieldRow, Inp, Tarea, ColorPicker } from '../shared';

export default function EmailSubscribeEditor({ content, onChange }) {
    const set = (key, val) => onChange({ ...content, [key]: val });
    return (
        <div>
            <FieldRow label="Input Placeholder">
                <Inp value={content.placeholder} onChange={v => set('placeholder', v)} placeholder="Enter your email" />
            </FieldRow>
            <FieldRow label="Button Text">
                <Inp value={content.button_text} onChange={v => set('button_text', v)} placeholder="Subscribe now" />
            </FieldRow>
            <FieldRow label="Button Color">
                <ColorPicker value={content.button_bg || '#f59e0b'} onChange={v => set('button_bg', v)} />
            </FieldRow>
            <FieldRow label="Disclaimer Text">
                <Tarea value={content.disclaimer} onChange={v => set('disclaimer', v)} placeholder="I agree that my data is collected..." rows={2} />
            </FieldRow>
        </div>
    );
}
