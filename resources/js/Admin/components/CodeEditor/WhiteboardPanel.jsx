import React, { useState, useCallback } from 'react';
import { Excalidraw, exportToSvg } from '@excalidraw/excalidraw';
import axios from 'axios';
import { Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

const CONVERT_FORMATS = [
    { format: 'react',  label: '→ React Component', ext: 'jsx' },
    { format: 'css',    label: '→ CSS / Tailwind',   ext: 'css' },
    { format: 'tokens', label: '→ Design Tokens',    ext: 'css' },
];

export default function WhiteboardPanel({ workspace, onCreateFile }) {
    const [excalidrawAPI, setExcalidrawAPI] = useState(null);
    const [converting, setConverting] = useState(null);

    const handleExcalidrawAPI = useCallback((api) => { setExcalidrawAPI(api); }, []);

    async function convertSketch(format, ext) {
        if (!excalidrawAPI || !workspace) return;
        setConverting(format);
        try {
            const elements = excalidrawAPI.getSceneElements();
            if (!elements || elements.length === 0) {
                toast.error('Draw something on the canvas first!');
                setConverting(null);
                return;
            }
            const appState = excalidrawAPI.getAppState();
            const files = excalidrawAPI.getFiles();
            const svgEl = await exportToSvg({ elements, appState, files });
            const svgString = new XMLSerializer().serializeToString(svgEl);

            const response = await axios.post(
                `/api/workspaces/${workspace.id}/ai/sketch-to-code`,
                { svg: svgString, format },
            );
            const code = response.data?.code || '';
            if (!code) { toast.error('AI returned no code'); setConverting(null); return; }

            const fileName = `sketch-${format}-${Date.now()}.${ext}`;
            onCreateFile?.({ name: fileName, content: code, language: ext === 'jsx' ? 'javascript' : ext });
            toast.success(`Converted to ${format} — opened in editor`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Conversion failed');
        } finally {
            setConverting(null);
        }
    }

    function clearCanvas() {
        excalidrawAPI?.resetScene();
        toast('Canvas cleared');
    }

    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* Excalidraw canvas — fills entire space */}
            <Excalidraw
                excalidrawAPI={handleExcalidrawAPI}
                theme="dark"
                UIOptions={{ canvasActions: { export: { saveFileToDisk: false }, loadScene: false } }}
            />

            {/* AI Toolbar — floating top-right */}
            <div style={{
                position: 'absolute', top: '12px', right: '12px', zIndex: 100,
                display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end',
                background: 'rgba(13,15,20,0.88)', border: '1px solid #30363d',
                borderRadius: '8px', padding: '6px', backdropFilter: 'blur(8px)',
                fontFamily: "'JetBrains Mono', monospace",
            }}>
                {CONVERT_FORMATS.map(({ format, label, ext }) => (
                    <button
                        key={format}
                        onClick={() => convertSketch(format, ext)}
                        disabled={!!converting}
                        title={converting === format ? 'Converting…' : label}
                        style={{
                            background: converting === format ? 'rgba(255,107,53,0.18)' : 'rgba(22,27,34,0.7)',
                            border: `1px solid ${converting === format ? 'rgba(255,107,53,0.4)' : '#30363d'}`,
                            borderRadius: '5px',
                            color: converting === format ? '#ff6b35' : '#c9d1d9',
                            cursor: converting ? (converting === format ? 'wait' : 'default') : 'pointer',
                            padding: '5px 10px', fontSize: '10px', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', gap: '5px',
                            opacity: converting && converting !== format ? 0.45 : 1,
                            transition: 'all 0.15s', whiteSpace: 'nowrap',
                        }}
                    >
                        {converting === format ? 'Converting…' : label}
                    </button>
                ))}
                <button
                    onClick={clearCanvas}
                    disabled={!!converting}
                    title="Clear canvas"
                    style={{
                        background: 'none', border: '1px solid #30363d', borderRadius: '5px',
                        color: '#8b949e', cursor: 'pointer', padding: '5px 8px',
                        display: 'flex', alignItems: 'center', opacity: converting ? 0.45 : 1,
                    }}
                >
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
}
