import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

export default function PreviewPanel({ workspace, activeTab, onClose }) {
    const [previewEnabled, setPreviewEnabled] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [previewContent, setPreviewContent] = useState('');
    const [error, setError] = useState(null);
    const [workspaceTheme, setWorkspaceTheme] = useState(null);
    const iframeRef = useRef(null);
    const contentRef = useRef(null);

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

    // Theme updates must NOT reload iframe content; only update styles
    useEffect(() => {
        try {
            applyThemeToIframe(workspaceTheme);
        } catch {
            // ignore
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceTheme]);

    function updatePreview() {
        if (!activeTab) {
            setPreviewContent('');
            setError(null);
            return;
        }

        const extension = activeTab.path.split('.').pop().toLowerCase();

        // Check if file is previewable
        if (!isPreviewableFile(extension)) {
            setError({
                type: 'unsupported',
                message: `Preview not available for .${extension} files`,
                suggestion: 'Preview is only available for HTML, CSS, JavaScript, and Markdown files.'
            });
            setPreviewContent('');
            return;
        }

        try {
            let content = activeTab.content || '';

            // Handle different file types
            switch (extension) {
                case 'html':
                case 'htm':
                    setPreviewContent(content);
                    setError(null);
                    break;

                case 'md':
                case 'markdown':
                    // Simple markdown to HTML conversion
                    const htmlContent = convertMarkdownToHtml(content);
                    setPreviewContent(wrapInHtml(htmlContent));
                    setError(null);
                    break;

                case 'css':
                    // Preview CSS with sample HTML
                    const cssPreview = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>${content}</style>
                        </head>
                        <body>
                            <div style="padding: 20px;">
                                <h1>CSS Preview</h1>
                                <p>This is a preview of your CSS styles.</p>
                                <button>Button</button>
                                <a href="#">Link</a>
                                <ul>
                                    <li>List item 1</li>
                                    <li>List item 2</li>
                                    <li>List item 3</li>
                                </ul>
                            </div>
                        </body>
                        </html>
                    `;
                    setPreviewContent(cssPreview);
                    setError(null);
                    break;

                case 'js':
                case 'jsx':
                    // Preview JavaScript in console view
                    const jsPreview = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
                                pre { background: #2d2d2d; padding: 15px; border-radius: 4px; overflow: auto; }
                                .info { color: #4fc1ff; }
                            </style>
                        </head>
                        <body>
                            <div class="info">JavaScript Preview</div>
                            <pre>${escapeHtml(content)}</pre>
                            <div class="info" style="margin-top: 20px;">
                                ℹ️ To see JavaScript execution, save this as an HTML file with a &lt;script&gt; tag.
                            </div>
                        </body>
                        </html>
                    `;
                    setPreviewContent(jsPreview);
                    setError(null);
                    break;

                default:
                    setError({
                        type: 'unsupported',
                        message: `Preview not configured for .${extension} files`,
                        suggestion: 'Add support for this file type in PreviewPanel.jsx'
                    });
                    setPreviewContent('');
            }
        } catch (err) {
            setError({
                type: 'error',
                message: 'Failed to generate preview',
                suggestion: err.message
            });
            setPreviewContent('');
        }
    }

    function isPreviewableFile(extension) {
        const previewableExtensions = [
            'html', 'htm', 'css', 'js', 'jsx', 'md', 'markdown'
        ];
        return previewableExtensions.includes(extension);
    }

    function convertMarkdownToHtml(markdown) {
        // Basic markdown conversion (headers, bold, italic, links, lists)
        let html = markdown
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Bold and italic
            .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
            .replace(/__(.+?)__/g, '<strong>$1</strong>')
            .replace(/_(.+?)_/g, '<em>$1</em>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        return `<p>${html}</p>`;
    }

    function wrapInHtml(content) {
        const themeCss = workspaceTheme?.theme ? themeToCssVars(workspaceTheme.theme, workspaceTheme.mode || 'light') : '';
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style id="workspace-theme-vars">
                    ${themeCss}
                </style>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; }
                    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
                    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
                    a { color: #0366d6; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                    code { background: #f6f8fa; padding: 2px 6px; border-radius: 3px; font-size: 85%; }
                    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; }
                </style>
            </head>
            <body>
                ${content}
            </body>
            </html>
        `;
    }

    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    function handleRefresh() {
        updatePreview();
        toast.success('Preview refreshed');
    }

    function handleOpenInNewTab() {
        if (!previewContent) return;

        const blob = new Blob([previewContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');

        // Clean up the URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

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

                <div className="preview-actions">
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
                        disabled={!previewContent}
                    >
                        <RefreshCw size={16} />
                    </button>

                    <button
                        className="btn-icon"
                        onClick={handleOpenInNewTab}
                        title="Open in new tab"
                        disabled={!previewContent}
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
                        <p>Open an HTML, CSS, JS, or Markdown file to preview</p>
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
                ) : previewContent ? (
                    <iframe
                        ref={iframeRef}
                        srcDoc={previewContent}
                        className="preview-iframe"
                        sandbox="allow-scripts"
                        title="Preview"
                        onLoad={() => {
                            // Apply current theme without reloading content
                            applyThemeToIframe(workspaceTheme);
                        }}
                    />
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
