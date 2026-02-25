import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Eye, EyeOff, RefreshCw, ExternalLink, AlertCircle, Monitor, Tablet, Smartphone } from 'lucide-react';
import { toast } from 'react-toastify';

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'];
const VIEWPORT_WIDTHS = { desktop: '100%', tablet: '768px', mobile: '375px' };

export default function PreviewPanel({ workspace, activeTab, onClose }) {
    const [previewEnabled, setPreviewEnabled] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [previewContent, setPreviewContent] = useState('');
    const [imageDataUrl, setImageDataUrl] = useState(null); // B-18: for image files
    const [error, setError] = useState(null);
    const [workspaceTheme, setWorkspaceTheme] = useState(null);
    const [viewport, setViewport] = useState('desktop'); // B-19: desktop | tablet | mobile
    const iframeRef = useRef(null);

    useEffect(() => {
        function handler(e) {
            if (e?.detail?.theme) {
                setWorkspaceTheme({ theme: e.detail.theme, mode: e.detail.mode || 'light' });
            }
        }
        window.addEventListener('workspace-theme-changed', handler);
        return () => window.removeEventListener('workspace-theme-changed', handler);
    }, []);

    function themeToCssVars(theme, mode) {
        const colors = theme?.colors || {};
        const typography = theme?.typography || {};
        const effects = theme?.effects || {};
        const rules = theme?.rules || {};
        return `
            :root{
                --primary-color:${colors.primary?.background || '#0d6efd'};
                --primary-foreground:${colors.primary?.foreground || '#ffffff'};
                --secondary-color:${colors.secondary?.background || '#6c757d'};
                --accent-color:${colors.accent?.background || '#0dcaf0'};
                --base-bg:${colors.base?.background || '#ffffff'};
                --base-fg:${colors.base?.foreground || '#212529'};
                --muted:${colors.base?.muted || '#6c757d'};
                --border:${colors.base?.border || '#dee2e6'};

                --font-family:${typography.fontFamily || 'system-ui, sans-serif'};
                --font-size:${typography.fontSize?.base || '14px'};
                --line-height:${typography.lineHeight || '1.5'};

                --spacing-xs:${rules.spacing?.xs || '4px'};
                --spacing-sm:${rules.spacing?.sm || '8px'};
                --spacing-md:${rules.spacing?.md || '16px'};
                --spacing-lg:${rules.spacing?.lg || '24px'};
                --spacing-xl:${rules.spacing?.xl || '32px'};

                --radius:${effects.borderRadius || '4px'};
                --shadow:${effects.shadow?.medium || '0 4px 6px rgba(0,0,0,0.1)'};
                --transition:${rules.transition || '0.2s ease'};
            }
            html{background:var(--base-bg);color:var(--base-fg);font-family:var(--font-family);font-size:var(--font-size);line-height:var(--line-height);}
            a{color:var(--primary-color);}
            .card{background:var(--base-bg);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:var(--spacing-md);}
            html[data-theme-mode="${mode}"]{}
        `;
    }

    function applyThemeToIframe(themeState) {
        const iframe = iframeRef.current;
        const doc = iframe?.contentDocument;
        if (!doc || !themeState?.theme) return;

        const mode = themeState.mode || 'light';
        const css = themeToCssVars(themeState.theme, mode);
        const styleEl = doc.getElementById('workspace-theme-vars');
        if (styleEl) {
            styleEl.textContent = css;
        }
        doc.documentElement?.setAttribute('data-theme-mode', mode);
    }

    useEffect(() => {
        if (activeTab && autoRefresh) {
            updatePreview();
        }
    }, [activeTab?.content, activeTab?.path, autoRefresh]);

    useEffect(() => {
        try { applyThemeToIframe(workspaceTheme); } catch { /* ignore */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceTheme]);

    async function updatePreview() {
        if (!activeTab) {
            setPreviewContent('');
            setImageDataUrl(null);
            setError(null);
            return;
        }

        const extension = activeTab.path.split('.').pop().toLowerCase();

        if (!isPreviewableFile(extension)) {
            setError({
                type: 'unsupported',
                message: `Preview not available for .${extension} files`,
                suggestion: 'Preview supports HTML, CSS, JS, Markdown, JSON, and image files.',
            });
            setPreviewContent('');
            setImageDataUrl(null);
            return;
        }

        try {
            let content = activeTab.content || '';

            // B-18: Image preview
            if (IMAGE_EXTS.includes(extension)) {
                setPreviewContent('');
                setError(null);
                if (!workspace) { setImageDataUrl(null); return; }
                try {
                    const resp = await axios.get(`/api/workspaces/${workspace.id}/files/read`, {
                        params: { path: activeTab.path, encoding: 'base64' },
                    });
                    if (resp.data?.encoding === 'base64') {
                        setImageDataUrl(`data:${resp.data.mime};base64,${resp.data.content}`);
                    }
                } catch {
                    setError({ type: 'error', message: 'Failed to load image', suggestion: 'Could not fetch image data from workspace.' });
                    setImageDataUrl(null);
                }
                return;
            }

            setImageDataUrl(null);

            switch (extension) {
                case 'html':
                case 'htm':
                    setPreviewContent(content);
                    setError(null);
                    break;

                case 'md':
                case 'markdown':
                    setPreviewContent(wrapInHtml(convertMarkdownToHtml(content)));
                    setError(null);
                    break;

                case 'css':
                    setPreviewContent(`
                        <!DOCTYPE html><html><head><style>${content}</style></head>
                        <body><div style="padding:20px">
                            <h1>CSS Preview</h1><p>A preview of your CSS styles.</p>
                            <button>Button</button> <a href="#">Link</a>
                            <ul><li>List item 1</li><li>List item 2</li></ul>
                        </div></body></html>
                    `);
                    setError(null);
                    break;

                case 'js':
                case 'jsx':
                    setPreviewContent(`
                        <!DOCTYPE html><html><head>
                        <style>body{font-family:monospace;padding:20px;background:#1e1e1e;color:#d4d4d4}pre{background:#2d2d2d;padding:15px;border-radius:4px;overflow:auto}.info{color:#4fc1ff}</style>
                        </head><body>
                        <div class="info">JavaScript Preview</div>
                        <pre>${escapeHtml(content)}</pre>
                        <div class="info" style="margin-top:20px">ℹ️ To run, embed in an HTML file with a &lt;script&gt; tag.</div>
                        </body></html>
                    `);
                    setError(null);
                    break;

                // B-18: JSON preview with syntax highlighting
                case 'json':
                    try {
                        const parsed = JSON.parse(content);
                        const pretty = JSON.stringify(parsed, null, 2);
                        const highlighted = syntaxHighlightJson(pretty);
                        setPreviewContent(`
                            <!DOCTYPE html><html><head>
                            <style>
                                body{font-family:'Consolas','Monaco',monospace;padding:16px;background:#0d1117;color:#c9d1d9;margin:0;font-size:13px;line-height:1.5}
                                .s{color:#a5d6ff} .n{color:#79c0ff} .b{color:#ff7b72} .null{color:#ff7b72} .k{color:#c9d1d9}
                                pre{margin:0;white-space:pre-wrap;word-break:break-all}
                            </style>
                            </head><body><pre>${highlighted}</pre></body></html>
                        `);
                        setError(null);
                    } catch (e) {
                        setError({ type: 'error', message: 'Invalid JSON', suggestion: e.message });
                        setPreviewContent('');
                    }
                    break;

                default:
                    setError({ type: 'unsupported', message: `No preview for .${extension}`, suggestion: '' });
                    setPreviewContent('');
            }
        } catch (err) {
            setError({ type: 'error', message: 'Failed to generate preview', suggestion: err.message });
            setPreviewContent('');
        }
    }

    function isPreviewableFile(extension) {
        return ['html', 'htm', 'css', 'js', 'jsx', 'md', 'markdown', 'json', ...IMAGE_EXTS].includes(extension);
    }

    function convertMarkdownToHtml(markdown) {
        let html = markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
            .replace(/__(.+?)__/g, '<strong>$1</strong>')
            .replace(/_(.+?)_/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        return `<p>${html}</p>`;
    }

    function wrapInHtml(content) {
        const themeCss = workspaceTheme?.theme ? themeToCssVars(workspaceTheme.theme, workspaceTheme.mode || 'light') : '';
        return `
            <!DOCTYPE html><html><head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style id="workspace-theme-vars">${themeCss}</style>
            <style>
                body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:800px;margin:0 auto;padding:20px}
                h1,h2,h3,h4{margin-top:24px;margin-bottom:16px;font-weight:600}
                h1{font-size:2em;border-bottom:1px solid #eaecef;padding-bottom:.3em}
                h2{font-size:1.5em;border-bottom:1px solid #eaecef;padding-bottom:.3em}
                a{color:#0366d6;text-decoration:none}a:hover{text-decoration:underline}
                code{background:#f6f8fa;padding:2px 6px;border-radius:3px;font-size:85%}
                pre{background:#f6f8fa;padding:16px;border-radius:6px;overflow:auto}
            </style>
            </head><body>${content}</body></html>
        `;
    }

    function escapeHtml(text) {
        return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }

    // B-18: basic JSON syntax highlighter (regex-based, no deps)
    function syntaxHighlightJson(json) {
        return escapeHtml(json).replace(
            /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
            (match) => {
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) return `<span class="k">${match}</span>`; // key
                    return `<span class="s">${match}</span>`; // string
                }
                if (/true|false/.test(match)) return `<span class="b">${match}</span>`;
                if (/null/.test(match)) return `<span class="null">${match}</span>`;
                return `<span class="n">${match}</span>`; // number
            }
        );
    }

    function handleRefresh() {
        updatePreview();
        toast.success('Preview refreshed');
    }

    function handleOpenInNewTab() {
        if (imageDataUrl) {
            window.open(imageDataUrl, '_blank');
            return;
        }
        if (!previewContent) return;
        const blob = new Blob([previewContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // B-19: viewport control
    const viewportButtons = [
        { id: 'desktop', icon: <Monitor size={13} />, title: 'Desktop (full width)' },
        { id: 'tablet',  icon: <Tablet size={13} />,  title: 'Tablet (768px)' },
        { id: 'mobile',  icon: <Smartphone size={13} />, title: 'Mobile (375px)' },
    ];

    const maxWidth = VIEWPORT_WIDTHS[viewport];

    return (
        <div className="preview-panel">
            <div className="preview-header">
                <div className="preview-title">
                    <Eye size={18} />
                    <span>Preview</span>
                    {activeTab && (
                        <span className="preview-file-name">
                            {activeTab.path.split('/').pop()}
                        </span>
                    )}
                </div>

                <div className="preview-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {/* B-19: Viewport toggles */}
                    <div style={{ display: 'flex', gap: '1px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '6px', marginRight: '2px' }}>
                        {viewportButtons.map(({ id, icon, title }) => (
                            <button
                                key={id}
                                className={`btn-icon ${viewport === id ? 'active' : ''}`}
                                onClick={() => setViewport(id)}
                                title={title}
                                style={{ opacity: viewport === id ? 1 : 0.5 }}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>

                    <button
                        className={`btn-icon ${autoRefresh ? 'active' : ''}`}
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
                    >
                        <RefreshCw size={16} className={autoRefresh ? 'spinning-slow' : ''} />
                    </button>

                    <button
                        className="btn-icon"
                        onClick={handleRefresh}
                        title="Refresh preview"
                        disabled={!previewContent && !imageDataUrl}
                    >
                        <RefreshCw size={16} />
                    </button>

                    <button
                        className="btn-icon"
                        onClick={handleOpenInNewTab}
                        title="Open in new tab"
                        disabled={!previewContent && !imageDataUrl}
                    >
                        <ExternalLink size={16} />
                    </button>

                    <button
                        className={`btn-icon ${!previewEnabled ? 'active' : ''}`}
                        onClick={() => setPreviewEnabled(!previewEnabled)}
                        title={previewEnabled ? 'Hide preview' : 'Show preview'}
                    >
                        {previewEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                </div>
            </div>

            <div className="preview-content">
                {!workspace ? (
                    <div className="preview-empty-state">
                        <Eye size={48} className="opacity-50" />
                        <h5>No workspace selected</h5>
                        <p>Select a workspace to preview files</p>
                    </div>
                ) : !activeTab ? (
                    <div className="preview-empty-state">
                        <Eye size={48} className="opacity-50" />
                        <h5>No file selected</h5>
                        <p>Open an HTML, CSS, JS, Markdown, JSON, or image file to preview</p>
                    </div>
                ) : error ? (
                    <div className="preview-error-state">
                        <AlertCircle size={48} className="text-warning" />
                        <h5>{error.message}</h5>
                        <p className="text-muted">{error.suggestion}</p>
                    </div>
                ) : !previewEnabled ? (
                    <div className="preview-empty-state">
                        <EyeOff size={48} className="opacity-50" />
                        <h5>Preview hidden</h5>
                        <p>Click the eye icon to show preview</p>
                    </div>
                ) : imageDataUrl ? (
                    /* B-18: Image preview */
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#0d1117', padding: '16px', overflow: 'auto' }}>
                        <div style={{ maxWidth: maxWidth, transition: 'max-width 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <img
                                src={imageDataUrl}
                                alt={activeTab?.name || 'Preview'}
                                style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 200px)', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}
                            />
                            <span style={{ fontSize: '10px', color: '#484f58', fontFamily: 'monospace' }}>
                                {activeTab?.path?.split('/').pop()}
                            </span>
                        </div>
                    </div>
                ) : previewContent ? (
                    /* B-19: Viewport-constrained iframe */
                    <div style={{ display: 'flex', justifyContent: 'center', height: '100%', overflow: 'hidden', background: '#1c2128' }}>
                        <div style={{
                            width: maxWidth,
                            maxWidth: '100%',
                            height: '100%',
                            transition: 'width 0.3s ease',
                            background: '#fff',
                            boxShadow: viewport !== 'desktop' ? '0 0 0 1px #30363d, 0 4px 32px rgba(0,0,0,0.5)' : 'none',
                        }}>
                            <iframe
                                ref={iframeRef}
                                srcDoc={previewContent}
                                className="preview-iframe"
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                sandbox="allow-scripts"
                                title="Preview"
                                onLoad={() => applyThemeToIframe(workspaceTheme)}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="preview-empty-state">
                        <Eye size={48} className="opacity-50" />
                        <h5>Generating preview...</h5>
                    </div>
                )}
            </div>
        </div>
    );
}
