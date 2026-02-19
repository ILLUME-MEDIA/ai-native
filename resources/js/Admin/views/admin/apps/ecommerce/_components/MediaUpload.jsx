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
 */
export default function MediaUpload({
    value = '',
    onChange,
    type = 'image',
    folder = 'ecommerce',
    label,
    required = false,
}) {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [mode, setMode] = useState('url');
    const fileRef = useRef();

    const accept = type === 'audio' ? 'audio/*' : 'image/*';

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
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
            setMode('url');
        } catch (err) {
            setUploadError(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    return (
        <div>
            {label && (
                <Form.Label>
                    {label} {required && <span className="text-danger">*</span>}
                </Form.Label>
            )}

            {/* Preview */}
            {value && type === 'image' && (
                <div className="mb-2">
                    <img
                        src={value} alt=""
                        style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #dee2e6' }}
                    />
                </div>
            )}
            {value && type === 'audio' && (
                <audio controls src={value} className="w-100 mb-2" style={{ height: 36 }} />
            )}

            {/* Mode toggle */}
            <div className="d-flex gap-1 mb-2">
                <button
                    type="button"
                    className={`btn btn-sm ${mode === 'url' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setMode('url')}
                >
                    <Icon icon="link" className="me-1" />URL
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${mode === 'file' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setMode('file')}
                >
                    <Icon icon="upload" className="me-1" />Upload
                </button>
                {value && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger ms-auto"
                        onClick={() => onChange('')}
                        title="Remove"
                    >
                        <Icon icon="trash" />
                    </button>
                )}
            </div>

            {mode === 'url' ? (
                <Form.Control
                    type="url"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={type === 'audio' ? 'https://example.com/audio.mp3' : 'https://example.com/image.jpg'}
                />
            ) : (
                <div>
                    <Form.Control
                        ref={fileRef}
                        type="file"
                        accept={accept}
                        onChange={handleFile}
                        disabled={uploading}
                    />
                    {uploading && (
                        <small className="text-muted mt-1 d-block">
                            <Spinner animation="border" size="sm" className="me-1" />Uploading…
                        </small>
                    )}
                    {uploadError && <small className="text-danger mt-1 d-block">{uploadError}</small>}
                </div>
            )}
        </div>
    );
}
