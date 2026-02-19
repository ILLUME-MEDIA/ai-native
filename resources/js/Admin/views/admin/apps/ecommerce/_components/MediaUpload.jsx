import Icon from '@admin/components/wrappers/Icon';
import axios from 'axios';
import { useRef, useState } from 'react';
import { Form, Spinner } from 'react-bootstrap';

/**
 * MediaUpload — supports image or audio upload + URL input.
 *
 * Props:
 *   value    string       current URL
 *   onChange fn(url)      called with new URL (or '' to clear)
 *   type     'image'|'audio'  default 'image'
 *   folder   string       upload sub-folder (businesses|menu-items|discovery-users)
 *   label    string       optional label text
 *   required bool
 *   aspect   'square'|'wide'  preview shape, default 'square'
 */
export default function MediaUpload({
    value = '',
    onChange,
    type = 'image',
    folder = 'ecommerce',
    label,
    required = false,
    aspect = 'square',
}) {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [urlMode, setUrlMode] = useState(false);
    const [dragging, setDragging] = useState(false);
    const fileRef = useRef();

    const accept = type === 'audio' ? 'audio/*' : 'image/*';

    const doUpload = async (file) => {
        if (!file) return;
        setUploading(true);
        setUploadError('');
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', folder);
        try {
            const { data } = await axios.post('/api/ecommerce/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onChange(data.url);
            setUrlMode(false);
        } catch (err) {
            setUploadError(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleFile = (e) => doUpload(e.target.files?.[0]);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) doUpload(file);
    };

    const previewHeight = aspect === 'wide' ? 120 : 110;

    if (type === 'audio') {
        return (
            <div>
                {label && <Form.Label>{label} {required && <span className="text-danger">*</span>}</Form.Label>}
                {value && <audio controls src={value} className="w-100 mb-2" style={{ height: 36 }} />}
                <div className="d-flex gap-2">
                    <Form.Control type="url" value={value} onChange={e => onChange(e.target.value)} placeholder="https://example.com/audio.mp3" />
                    {value && <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onChange('')}><Icon icon="trash" /></button>}
                </div>
            </div>
        );
    }

    return (
        <div>
            {label && (
                <Form.Label className="mb-1">
                    {label} {required && <span className="text-danger">*</span>}
                </Form.Label>
            )}

            {/* Drop / Preview zone */}
            <div
                onClick={() => !value && !uploading && fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                style={{
                    height: previewHeight,
                    border: `2px dashed ${dragging ? '#0d6efd' : (value ? 'transparent' : '#dee2e6')}`,
                    borderRadius: 10,
                    overflow: 'hidden',
                    cursor: value ? 'default' : 'pointer',
                    background: dragging ? '#e8f0fe' : (value ? '#000' : '#f8f9fa'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'border-color .15s, background .15s',
                }}
            >
                {uploading && (
                    <div className="text-center text-muted">
                        <Spinner animation="border" size="sm" className="mb-1" />
                        <div style={{ fontSize: 12 }}>Uploading…</div>
                    </div>
                )}

                {!uploading && value && (
                    <>
                        <img
                            src={value}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        {/* Hover overlay with actions */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.45)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            opacity: 0, transition: 'opacity .2s',
                        }}
                            className="media-upload-overlay"
                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                            onMouseLeave={e => e.currentTarget.style.opacity = 0}
                        >
                            <button type="button" className="btn btn-sm btn-light"
                                onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                                title="Change image">
                                <Icon icon="camera" style={{ fontSize: 15 }} />
                            </button>
                            <button type="button" className="btn btn-sm btn-light"
                                onClick={e => { e.stopPropagation(); setUrlMode(v => !v); }}
                                title="Paste URL">
                                <Icon icon="link" style={{ fontSize: 15 }} />
                            </button>
                            <button type="button" className="btn btn-sm btn-danger"
                                onClick={e => { e.stopPropagation(); onChange(''); }}
                                title="Remove">
                                <Icon icon="trash" style={{ fontSize: 15 }} />
                            </button>
                        </div>
                    </>
                )}

                {!uploading && !value && (
                    <div className="text-center text-muted px-2" style={{ userSelect: 'none' }}>
                        <Icon icon="cloud-upload" style={{ fontSize: 28, opacity: 0.4 }} />
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                            {dragging ? 'Drop to upload' : 'Click or drag to upload'}
                        </div>
                    </div>
                )}
            </div>

            {uploadError && <small className="text-danger mt-1 d-block">{uploadError}</small>}

            {/* URL input bar (shown when no image or urlMode toggled) */}
            {(!value || urlMode) && (
                <div className="d-flex gap-1 mt-2">
                    <Form.Control
                        type="url"
                        size="sm"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                    />
                    <button type="button" className="btn btn-sm btn-outline-secondary flex-shrink-0"
                        onClick={() => fileRef.current?.click()}
                        title="Upload file">
                        <Icon icon="upload" style={{ fontSize: 14 }} />
                    </button>
                    {value && urlMode && (
                        <button type="button" className="btn btn-sm btn-outline-secondary flex-shrink-0"
                            onClick={() => setUrlMode(false)}>
                            <Icon icon="x" style={{ fontSize: 14 }} />
                        </button>
                    )}
                </div>
            )}

            {/* Hidden file input */}
            <input ref={fileRef} type="file" accept={accept} className="d-none" onChange={handleFile} />
        </div>
    );
}
