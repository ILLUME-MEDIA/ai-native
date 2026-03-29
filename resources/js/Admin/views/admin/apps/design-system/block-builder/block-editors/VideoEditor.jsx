import { FieldRow, Inp, Sel, Toggle } from '../shared';

const RATIOS = [{ value: '16:9', label: '16:9 (Widescreen)' }, { value: '4:3', label: '4:3 (Standard)' }, { value: '1:1', label: '1:1 (Square)' }, { value: '9:16', label: '9:16 (Portrait)' }];

export default function VideoEditor({ content, set }) {
    return (<>
        <FieldRow label="Video URL" hint="YouTube / Vimeo / .mp4">
            <Inp value={content.url} onChange={v => set('url', v)} placeholder="https://youtube.com/watch?v=… or https://vimeo.com/…" mono />
        </FieldRow>
        <FieldRow label="Aspect Ratio"><Sel value={content.aspect_ratio || '16:9'} onChange={v => set('aspect_ratio', v)} options={RATIOS} /></FieldRow>
        <FieldRow label="Autoplay"><Toggle checked={!!content.autoplay} onChange={v => set('autoplay', v)} label="Autoplay on load" /></FieldRow>
        <FieldRow label="Muted"><Toggle checked={content.muted !== false} onChange={v => set('muted', v)} label="Muted" /></FieldRow>
        <FieldRow label="Loop"><Toggle checked={!!content.loop} onChange={v => set('loop', v)} label="Loop video" /></FieldRow>
        <FieldRow label="Controls"><Toggle checked={content.show_controls !== false} onChange={v => set('show_controls', v)} label="Show controls" /></FieldRow>
    </>);
}
