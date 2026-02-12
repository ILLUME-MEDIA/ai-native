import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Palette, Sun, Moon, Download, Upload, Save, RotateCcw,
    ChevronDown, ChevronRight, Type, Sparkles, FileCode
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function ThemePanel({ workspace, onClose }) {
    const [mode, setMode] = useState('light');
    const [activeTab, setActiveTab] = useState('colors');
    const [expandedSections, setExpandedSections] = useState({
        primary: true,
        secondary: true,
        accent: true,
        base: true,
        card: true
    });

    const [theme, setTheme] = useState({
        colors: {
            primary: {
                foreground: '#ffffff',
                background: '#0d6efd',
            },
            secondary: {
                foreground: '#ffffff',
                background: '#6c757d',
            },
            accent: {
                foreground: '#ffffff',
                background: '#0dcaf0',
            },
            base: {
                background: '#ffffff',
                foreground: '#212529',
                muted: '#6c757d',
                mutedForeground: '#6c757d',
                border: '#dee2e6',
            },
            card: {
                background: '#ffffff',
                foreground: '#212529',
                popover: '#ffffff',
                popoverForeground: '#212529',
            },
        },
        typography: {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: {
                base: '14px',
                small: '12px',
                large: '16px',
            },
            lineHeight: '1.5',
            fontWeight: {
                normal: '400',
                medium: '500',
                semibold: '600',
                bold: '700',
            },
        },
        effects: {
            borderRadius: '4px',
            shadow: {
                small: '0 1px 2px rgba(0,0,0,0.05)',
                medium: '0 4px 6px rgba(0,0,0,0.1)',
                large: '0 10px 15px rgba(0,0,0,0.1)',
            },
            blur: '8px',
        },
        rules: {
            spacing: {
                xs: '4px',
                sm: '8px',
                md: '16px',
                lg: '24px',
                xl: '32px',
            },
            transition: '0.2s ease',
        },
    });

    // Load theme from workspace
    useEffect(() => {
        if (workspace) {
            loadTheme();
        }
    }, [workspace]);

    // Live-apply theme changes to PREVIEW ONLY (do not touch editor UI)
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('workspace-theme-changed', {
            detail: { theme, mode }
        }));
    }, [theme, mode]);

    // Throttled status messages (avoid spamming on every color drag)
    const themeStatusTimerRef = useRef(null);
    useEffect(() => {
        if (themeStatusTimerRef.current) {
            clearTimeout(themeStatusTimerRef.current);
        }

        window.dispatchEvent(new CustomEvent('preview-status', {
            detail: { message: '🎨 Theme change detected' }
        }));
        window.dispatchEvent(new CustomEvent('preview-status', {
            detail: { message: '🔄 Updating preview styles' }
        }));

        themeStatusTimerRef.current = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('preview-status', {
                detail: { message: '✅ Preview updated successfully' }
            }));
        }, 250);

        return () => {
            if (themeStatusTimerRef.current) {
                clearTimeout(themeStatusTimerRef.current);
            }
        };
    }, [theme, mode]);

    async function loadTheme() {
        try {
            const response = await axios.get(`/api/workspaces/${workspace.id}/theme`);
            if (response.data.theme) {
                setTheme(response.data.theme);
                setMode(response.data.mode || 'light');
            }
        } catch (error) {
            console.log('No saved theme, using defaults');
        }
    }

    async function saveTheme() {
        if (!workspace) {
            toast.error('No workspace selected');
            return;
        }

        try {
            const resp = await axios.post(`/api/workspaces/${workspace.id}/theme`, {
                theme,
                mode,
            });
            toast.success('Theme saved successfully');
            if (resp?.data?.fs_patches && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('workspace-file-tree-patch', {
                    detail: { patches: resp.data.fs_patches }
                }));
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save theme');
        }
    }

    function resetTheme() {
        if (!confirm('Reset theme to defaults? This cannot be undone.')) return;

        setTheme({
            colors: {
                primary: { foreground: '#ffffff', background: '#0d6efd' },
                secondary: { foreground: '#ffffff', background: '#6c757d' },
                accent: { foreground: '#ffffff', background: '#0dcaf0' },
                base: {
                    background: '#ffffff',
                    foreground: '#212529',
                    muted: '#6c757d',
                    mutedForeground: '#6c757d',
                    border: '#dee2e6',
                },
                card: {
                    background: '#ffffff',
                    foreground: '#212529',
                    popover: '#ffffff',
                    popoverForeground: '#212529',
                },
            },
            typography: {
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: { base: '14px', small: '12px', large: '16px' },
                lineHeight: '1.5',
                fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
            },
            effects: {
                borderRadius: '4px',
                shadow: {
                    small: '0 1px 2px rgba(0,0,0,0.05)',
                    medium: '0 4px 6px rgba(0,0,0,0.1)',
                    large: '0 10px 15px rgba(0,0,0,0.1)',
                },
                blur: '8px',
            },
            rules: {
                spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
                transition: '0.2s ease',
            },
        });
        setMode('light');
        toast.success('Theme reset to defaults');
    }

    function exportTheme() {
        const themeData = JSON.stringify({ theme, mode }, null, 2);
        const blob = new Blob([themeData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `theme-${workspace?.name || 'workspace'}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Theme exported');
    }

    function importTheme() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    if (imported.theme) {
                        setTheme(imported.theme);
                        setMode(imported.mode || 'light');
                        toast.success('Theme imported successfully');
                    } else {
                        toast.error('Invalid theme file');
                    }
                } catch (error) {
                    toast.error('Failed to parse theme file');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function updateColor(section, key, value) {
        setTheme(prev => ({
            ...prev,
            colors: {
                ...prev.colors,
                [section]: {
                    ...prev.colors[section],
                    [key]: value,
                },
            },
        }));
    }

    function toggleSection(section) {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section],
        }));
    }

    function ColorInput({ label, value, onChange }) {
        return (
            <div className="theme-color-input">
                <label className="theme-label">{label}</label>
                <div className="d-flex gap-2 align-items-center">
                    <input
                        type="color"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="theme-color-picker"
                    />
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="form-control form-control-sm theme-text-input"
                        placeholder="#000000"
                    />
                </div>
            </div>
        );
    }

    function ColorSection({ title, section, colors }) {
        const isExpanded = expandedSections[section];

        return (
            <div className="theme-section">
                <div
                    className="theme-section-header"
                    onClick={() => toggleSection(section)}
                >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span>{title}</span>
                </div>
                {isExpanded && (
                    <div className="theme-section-content">
                        {Object.entries(colors).map(([key, value]) => (
                            <ColorInput
                                key={key}
                                label={key.replace(/([A-Z])/g, ' $1').trim()}
                                value={value}
                                onChange={(newValue) => updateColor(section, key, newValue)}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="theme-panel h-100 d-flex flex-column">
            <div className="theme-panel-header">
                <div className="d-flex align-items-center gap-2">
                    <Palette size={18} />
                    <h6 className="mb-0">Theme Editor</h6>
                </div>
                <div className="d-flex gap-2">
                    <button
                        className={`btn btn-sm ${mode === 'light' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setMode('light')}
                        title="Light Mode"
                    >
                        <Sun size={14} />
                    </button>
                    <button
                        className={`btn btn-sm ${mode === 'dark' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setMode('dark')}
                        title="Dark Mode"
                    >
                        <Moon size={14} />
                    </button>
                </div>
            </div>

            <div className="theme-panel-tabs">
                <button
                    className={`theme-tab ${activeTab === 'colors' ? 'active' : ''}`}
                    onClick={() => setActiveTab('colors')}
                >
                    <Palette size={14} />
                    Colors
                </button>
                <button
                    className={`theme-tab ${activeTab === 'typography' ? 'active' : ''}`}
                    onClick={() => setActiveTab('typography')}
                >
                    <Type size={14} />
                    Typography
                </button>
                <button
                    className={`theme-tab ${activeTab === 'effects' ? 'active' : ''}`}
                    onClick={() => setActiveTab('effects')}
                >
                    <Sparkles size={14} />
                    Effects
                </button>
                <button
                    className={`theme-tab ${activeTab === 'rules' ? 'active' : ''}`}
                    onClick={() => setActiveTab('rules')}
                >
                    <FileCode size={14} />
                    Rules
                </button>
            </div>

            <div className="theme-panel-content flex-grow-1 overflow-auto">
                {activeTab === 'colors' && (
                    <div className="p-3">
                        <ColorSection
                            title="Primary"
                            section="primary"
                            colors={theme.colors.primary}
                        />
                        <ColorSection
                            title="Secondary"
                            section="secondary"
                            colors={theme.colors.secondary}
                        />
                        <ColorSection
                            title="Accent"
                            section="accent"
                            colors={theme.colors.accent}
                        />
                        <ColorSection
                            title="Base"
                            section="base"
                            colors={theme.colors.base}
                        />
                        <ColorSection
                            title="Card"
                            section="card"
                            colors={theme.colors.card}
                        />
                    </div>
                )}

                {activeTab === 'typography' && (
                    <div className="p-3">
                        <div className="theme-input-group">
                            <label className="theme-label">Font Family</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={theme.typography.fontFamily}
                                onChange={(e) => setTheme(prev => ({
                                    ...prev,
                                    typography: { ...prev.typography, fontFamily: e.target.value }
                                }))}
                            />
                        </div>
                        <div className="theme-input-group">
                            <label className="theme-label">Base Font Size</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={theme.typography.fontSize.base}
                                onChange={(e) => setTheme(prev => ({
                                    ...prev,
                                    typography: {
                                        ...prev.typography,
                                        fontSize: { ...prev.typography.fontSize, base: e.target.value }
                                    }
                                }))}
                            />
                        </div>
                        <div className="theme-input-group">
                            <label className="theme-label">Line Height</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={theme.typography.lineHeight}
                                onChange={(e) => setTheme(prev => ({
                                    ...prev,
                                    typography: { ...prev.typography, lineHeight: e.target.value }
                                }))}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'effects' && (
                    <div className="p-3">
                        <div className="theme-input-group">
                            <label className="theme-label">Border Radius</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={theme.effects.borderRadius}
                                onChange={(e) => setTheme(prev => ({
                                    ...prev,
                                    effects: { ...prev.effects, borderRadius: e.target.value }
                                }))}
                            />
                        </div>
                        <div className="theme-input-group">
                            <label className="theme-label">Blur</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={theme.effects.blur}
                                onChange={(e) => setTheme(prev => ({
                                    ...prev,
                                    effects: { ...prev.effects, blur: e.target.value }
                                }))}
                            />
                        </div>
                        <div className="theme-input-group">
                            <label className="theme-label">Shadow (Medium)</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={theme.effects.shadow.medium}
                                onChange={(e) => setTheme(prev => ({
                                    ...prev,
                                    effects: {
                                        ...prev.effects,
                                        shadow: { ...prev.effects.shadow, medium: e.target.value }
                                    }
                                }))}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'rules' && (
                    <div className="p-3">
                        <div className="theme-input-group">
                            <label className="theme-label">Transition</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={theme.rules.transition}
                                onChange={(e) => setTheme(prev => ({
                                    ...prev,
                                    rules: { ...prev.rules, transition: e.target.value }
                                }))}
                            />
                        </div>
                        {Object.entries(theme.rules.spacing).map(([key, value]) => (
                            <div key={key} className="theme-input-group">
                                <label className="theme-label">Spacing {key.toUpperCase()}</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={value}
                                    onChange={(e) => setTheme(prev => ({
                                        ...prev,
                                        rules: {
                                            ...prev.rules,
                                            spacing: { ...prev.rules.spacing, [key]: e.target.value }
                                        }
                                    }))}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="theme-panel-footer">
                <div className="d-flex gap-2 mb-2">
                    <button
                        className="btn btn-sm btn-outline-secondary flex-fill"
                        onClick={importTheme}
                        title="Import Theme"
                    >
                        <Upload size={14} /> Import
                    </button>
                    <button
                        className="btn btn-sm btn-outline-secondary flex-fill"
                        onClick={exportTheme}
                        title="Export Theme"
                    >
                        <Download size={14} /> Export
                    </button>
                </div>
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-sm btn-outline-danger flex-fill"
                        onClick={resetTheme}
                        title="Reset to Defaults"
                    >
                        <RotateCcw size={14} /> Reset
                    </button>
                    <button
                        className="btn btn-sm btn-primary flex-fill"
                        onClick={saveTheme}
                        title="Save Theme"
                    >
                        <Save size={14} /> Save
                    </button>
                </div>
            </div>
        </div>
    );
}
