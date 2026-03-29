import { FieldRow } from '../shared';

export default function SpacerEditor({ content, set }) {
    return (
        <FieldRow label="Height" hint="px">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="range" min={8} max={200} step={4} value={content.height || 40}
                    onChange={e => set('height', parseInt(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: 11, fontWeight: 700, minWidth: 38, textAlign: 'center', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 5px' }}>
                    {content.height || 40}px
                </span>
            </div>
        </FieldRow>
    );
}
