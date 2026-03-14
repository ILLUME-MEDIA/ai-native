/**
 * DsButton — Token-driven button component
 *
 * All styles come from design tokens in the database.
 * If a token changes in the DB and you call invalidate(), the button re-renders.
 *
 * Usage:
 *   <DsButton variant="primary" />
 *   <DsButton variant="success" modifier="outline" size="lg" />
 *   <DsButton variant="danger"  modifier="soft"    size="sm" rounded />
 *   <DsButton variant="info"    modifier="ghost" loading />
 *   <DsButton variant="primary" modifier="gradient" block />
 *   <DsButton variant="warning" disabled />
 *   <DsButton as="a" href="#"   variant="secondary" />
 */

import React, { forwardRef } from 'react';
import { useTokenEngine } from '../engine/TokenEngine.jsx';

const SIZE_FALLBACK = {
    sm: { padding: '0.25rem 0.5rem',  fontSize: '0.75rem' },
    md: { padding: '0.5rem 1rem',     fontSize: '0.875rem' },
    lg: { padding: '0.75rem 1.5rem',  fontSize: '1rem' },
};

const DsButton = forwardRef(function DsButton(props, ref) {
    const {
        variant   = 'primary',
        modifier  = null,     // 'outline' | 'soft' | 'ghost' | 'gradient' | 'rounded' | etc.
        size      = 'md',
        as: Tag   = 'button',
        children,
        loading   = false,
        block     = false,
        disabled  = false,
        style: extraStyle = {},
        className = '',
        onClick,
        ...rest
    } = props;

    const { resolveVariant, loaded } = useTokenEngine('button');

    // 1. Get variant styles (background, color, border, etc.)
    const { styles: variantStyles, staticClasses } = resolveVariant(variant, modifier);

    // 2. Get size styles (padding, font-size)
    const { styles: sizeStyles } = resolveVariant('base', null, size);

    // 3. Compose final inline style
    const finalStyle = {
        // Base resets
        display:        block ? 'block' : 'inline-flex',
        width:          block ? '100%' : undefined,
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '0.375rem',
        cursor:         disabled || loading ? 'not-allowed' : 'pointer',
        opacity:        disabled ? 0.65 : 1,
        border:         'none',
        outline:        'none',
        textDecoration: 'none',
        lineHeight:     1.5,
        fontFamily:     'inherit',
        transition:     'all 0.15s ease-in-out',
        // Resolved token styles (may override above)
        ...variantStyles,
        // Resolved size styles
        ...(Object.keys(sizeStyles).length ? sizeStyles : SIZE_FALLBACK[size]),
        // Caller overrides
        ...extraStyle,
    };

    // 4. Compose className
    const classes = [
        'ds-btn',
        `ds-btn-${variant}`,
        modifier ? `ds-btn-${modifier}` : '',
        `ds-btn-${size}`,
        block   ? 'ds-btn-block'    : '',
        loading ? 'ds-btn-loading'  : '',
        ...(staticClasses || []),
        className,
    ].filter(Boolean).join(' ');

    const handleClick = (e) => {
        if (disabled || loading) { e.preventDefault(); return; }
        onClick?.(e);
    };

    return (
        <Tag
            ref={ref}
            className={classes}
            style={finalStyle}
            disabled={Tag === 'button' ? (disabled || loading) : undefined}
            aria-disabled={disabled || loading}
            onClick={handleClick}
            {...rest}
        >
            {loading && (
                <span
                    style={{
                        width: '0.875em', height: '0.875em',
                        borderRadius: '50%',
                        border: '2px solid currentColor',
                        borderTopColor: 'transparent',
                        animation: 'ds-spin 0.6s linear infinite',
                        display: 'inline-block',
                        flexShrink: 0,
                    }}
                    aria-hidden="true"
                />
            )}
            {children}
        </Tag>
    );
});

export default DsButton;

// ── CSS animation (inject once) ───────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('ds-btn-styles')) {
    const style = document.createElement('style');
    style.id = 'ds-btn-styles';
    style.textContent = `
        @keyframes ds-spin { to { transform: rotate(360deg); } }
        .ds-btn:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
        .ds-btn-ghost-hover:hover { background-color: rgba(0,0,0,0.05) !important; }
    `;
    document.head.appendChild(style);
}
