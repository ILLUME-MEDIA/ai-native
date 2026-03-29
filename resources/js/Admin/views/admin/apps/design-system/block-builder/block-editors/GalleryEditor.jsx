import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FieldRow, Inp, Toggle } from '../shared';

export default function GalleryEditor({ content, set }) {
    const images  = content.images || [];
    const addImg  = () => set('images', [...images, { url: '', alt: '', caption: '' }]);
    const removeImg = i => set('images', images.filter((_, idx) => idx !== i));
    const updateImg = (i, key, val) => set('images', images.map((img, idx) => idx === i ? { ...img, [key]: val } : img));

    return (<>
        <FieldRow label="Columns" hint="2–4">
            <div style={{ display: 'flex', gap: 6 }}>
                {[2,3,4].map(n => (
                    <button key={n} type="button" onClick={() => set('columns', n)}
                        style={{ flex: 1, padding: '5px 0', border: `1.5px solid ${(content.columns || 3) === n ? '#3b82f6' : '#e2e8f0'}`, borderRadius: 5, background: (content.columns || 3) === n ? '#eff6ff' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: (content.columns || 3) === n ? '#3b82f6' : '#64748b' }}>
                        {n}
                    </button>
                ))}
            </div>
        </FieldRow>
        <FieldRow label="Gap" hint="px">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="range" min={0} max={32} step={4} value={content.gap || 12} onChange={e => set('gap', parseInt(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28, textAlign: 'center', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 5px' }}>{content.gap || 12}px</span>
            </div>
        </FieldRow>
        <FieldRow label="Lightbox"><Toggle checked={!!content.lightbox} onChange={v => set('lightbox', v)} label="Enable lightbox" /></FieldRow>
        <FieldRow label="Rounded"><Toggle checked={!!content.rounded} onChange={v => set('rounded', v)} label="Rounded corners" /></FieldRow>
        <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Images ({images.length})</div>
            {images.map((img, i) => (
                <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', marginBottom: 8, background: '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>Image {i + 1}</span>
                        <button onClick={() => removeImg(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={12} /></button>
                    </div>
                    <FieldRow label="URL"><Inp value={img.url} onChange={v => updateImg(i, 'url', v)} placeholder="https://…" mono /></FieldRow>
                    <FieldRow label="Alt"><Inp value={img.alt} onChange={v => updateImg(i, 'alt', v)} placeholder="Image description" /></FieldRow>
                    {img.url && <img src={img.url} alt={img.alt} style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 4, marginTop: 4 }} />}
                </div>
            ))}
            <button onClick={addImg} style={{ width: '100%', padding: '6px 0', border: '1.5px dashed #cbd5e1', borderRadius: 6, background: 'none', cursor: 'pointer', fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Plus size={13} /> Add Image
            </button>
        </div>
    </>);
}
