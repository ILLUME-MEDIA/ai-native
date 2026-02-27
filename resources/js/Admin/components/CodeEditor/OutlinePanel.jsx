import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlignLeft } from 'lucide-react';
import { useCodeEditorTheme } from './useCodeEditorTheme';

// ── Symbol kind metadata ─────────────────────────────────────────────────────
const KIND_META = {
    F: { label: 'Function', color: '#dcdcaa' },
    C: { label: 'Class',    color: '#4ec9b0' },
    M: { label: 'Method',   color: '#dcdcaa' },
    V: { label: 'Variable', color: '#9cdcfe' },
    I: { label: 'Interface',color: '#b8d7a3' },
    P: { label: 'Property', color: '#9cdcfe' },
    E: { label: 'Enum',     color: '#b5cea8' },
    K: { label: 'Const',    color: '#4fc1ff' },
    '?': { label: 'Symbol', color: '#8b949e' },
};

// Map Monaco symbol kinds (numeric) to our letter codes
// Monaco SymbolKind: 0=File,1=Module,2=Namespace,3=Package,4=Class,5=Method,
//   6=Property,7=Field,8=Constructor,9=Enum,10=Interface,11=Function,
//   12=Variable,13=Constant,14=String,15=Number,16=Boolean,...
const MONACO_KIND_MAP = {
    4: 'C', 5: 'M', 6: 'P', 7: 'P', 8: 'M', 9: 'E',
    10: 'I', 11: 'F', 12: 'V', 13: 'K',
};

// ── Regex fallback parsers (per language) ────────────────────────────────────
function parseByRegex(content, language) {
    const symbols = [];
    const lines = content.split('\n');

    const patterns = {
        php: [
            { re: /^\s*(abstract\s+|final\s+)?(public|private|protected|static|\s)*\s*function\s+(\w+)\s*\(/, kind: 'F', group: 3 },
            { re: /^\s*(abstract\s+|final\s+)?class\s+(\w+)/, kind: 'C', group: 2 },
            { re: /^\s*interface\s+(\w+)/, kind: 'I', group: 1 },
            { re: /^\s*(public|private|protected)\s+(\$\w+)\s*[=;]/, kind: 'P', group: 2 },
        ],
        javascript: [
            { re: /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/, kind: 'F', group: 1 },
            { re: /^\s*(?:export\s+)?class\s+(\w+)/, kind: 'C', group: 1 },
            { re: /^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\()/, kind: 'F', group: 1 },
            { re: /^\s*(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(.*\)\s*=>/, kind: 'F', group: 1 },
            { re: /^\s*(?:const|let)\s+(\w+)\s*=\s*[^(]/, kind: 'V', group: 1 },
            { re: /^\s*(\w+)\s*\(.*\)\s*\{/, kind: 'M', group: 1 },
        ],
        typescript: [
            { re: /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*[<(]/, kind: 'F', group: 1 },
            { re: /^\s*(?:export\s+)?class\s+(\w+)/, kind: 'C', group: 1 },
            { re: /^\s*(?:export\s+)?interface\s+(\w+)/, kind: 'I', group: 1 },
            { re: /^\s*(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(.*\)\s*=>/, kind: 'F', group: 1 },
            { re: /^\s*(?:export\s+)?const\s+(\w+)\s*=/, kind: 'K', group: 1 },
            { re: /^\s*(?:public|private|protected)\s+(\w+)\s*\(/, kind: 'M', group: 1 },
        ],
        python: [
            { re: /^(\s*)def\s+(\w+)\s*\(/, kind: 'F', group: 2, indent: true, indentGroup: 1 },
            { re: /^(\s*)class\s+(\w+)/, kind: 'C', group: 2, indent: true, indentGroup: 1 },
        ],
        css: [
            { re: /^([.#][\w-]+(?:\s*,\s*[.#][\w-]+)*)\s*\{/, kind: 'M', group: 1 },
            { re: /^@mixin\s+([\w-]+)/, kind: 'F', group: 1 },
        ],
        scss: [
            { re: /^([.#&][\w-]+(?:\s*,\s*[.#&][\w-]+)*)\s*\{/, kind: 'M', group: 1 },
            { re: /^@mixin\s+([\w-]+)/, kind: 'F', group: 1 },
            { re: /^\$([\w-]+)\s*:/, kind: 'V', group: 1 },
        ],
    };

    // Normalize language aliases
    const lang = language === 'jsx' ? 'javascript' : language === 'tsx' ? 'typescript' : language;
    const rules = patterns[lang] || patterns.javascript;

    lines.forEach((line, idx) => {
        for (const rule of rules) {
            const m = rule.re.exec(line);
            if (m) {
                const name = m[rule.group];
                if (!name || name.length < 2) continue;
                // Skip if it looks like a reserved word
                if (['if', 'for', 'while', 'switch', 'catch', 'return', 'new'].includes(name)) continue;
                const indentLevel = rule.indent
                    ? Math.floor((m[rule.indentGroup] || '').length / 4)
                    : 0;
                symbols.push({
                    name,
                    kind: rule.kind,
                    line: idx + 1,
                    indent: indentLevel,
                });
                break;
            }
        }
    });

    return symbols;
}

// ── Try Monaco's built-in document symbol providers ─────────────────────────
async function getMonacoSymbols(editor) {
    try {
        const model = editor?.getModel?.();
        if (!model) return null;

        const monaco = window.monaco;
        if (!monaco) return null;

        // Access document symbol provider registry
        const registry = monaco.languages?.DocumentSymbolProviderRegistry;
        if (!registry) return null;

        const providers = registry.ordered ? registry.ordered(model) : [];
        if (!providers || providers.length === 0) return null;

        const token = monaco.CancellationTokenSource ? new monaco.CancellationTokenSource().token : null;
        if (!token) return null;

        const result = await providers[0].provideDocumentSymbols(model, token);
        if (!result || !Array.isArray(result)) return null;

        // Flatten Monaco's nested symbol tree
        function flatten(symbols, indent = 0) {
            const out = [];
            for (const sym of symbols) {
                const kind = MONACO_KIND_MAP[sym.kind] || '?';
                out.push({
                    name: sym.name,
                    kind,
                    line: sym.range?.startLineNumber ?? 1,
                    indent,
                });
                if (sym.children?.length) {
                    out.push(...flatten(sym.children, indent + 1));
                }
            }
            return out;
        }
        return flatten(result);
    } catch {
        return null;
    }
}

// ── Symbol row ───────────────────────────────────────────────────────────────
function SymbolRow({ symbol, isActive, onClick }) {
    const { isDark, tokens: t } = useCodeEditorTheme();
    const meta = KIND_META[symbol.kind] || KIND_META['?'];
    return (
        <div
            onClick={() => onClick(symbol.line)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: `2px 8px 2px ${8 + symbol.indent * 16}px`,
                cursor: 'pointer',
                background: isActive ? 'rgba(255,107,53,0.08)' : 'transparent',
                borderLeft: isActive ? '2px solid rgba(255,107,53,0.5)' : '2px solid transparent',
                fontSize: '11px',
                fontFamily: "'JetBrains Mono', Consolas, monospace",
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
        >
            {/* Kind badge */}
            <span style={{
                fontSize: '9px',
                fontWeight: '700',
                color: meta.color,
                background: `${meta.color}18`,
                borderRadius: '2px',
                padding: '0 3px',
                flexShrink: 0,
                lineHeight: '14px',
                fontFamily: "'JetBrains Mono', monospace",
            }}>
                {symbol.kind}
            </span>

            {/* Name */}
            <span style={{
                flex: 1,
                color: t.text2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}>
                {symbol.name}
            </span>

            {/* Line number */}
            <span style={{ color: t.text4, fontSize: '10px', flexShrink: 0 }}>
                {symbol.line}
            </span>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OutlinePanel({ monacoEditorRef, activeFile, onJumpToLine, isDark: _isDark }) {
    const { isDark: ctxDark, tokens: t } = useCodeEditorTheme();
    const isDark = _isDark !== undefined ? _isDark : ctxDark;
    const [symbols, setSymbols] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeLine, setActiveLine] = useState(null);

    const refresh = useCallback(async () => {
        const editor = monacoEditorRef?.current;
        if (!editor) { setSymbols([]); return; }

        setLoading(true);
        try {
            // Try Monaco built-in symbol provider first
            const monacoSyms = await getMonacoSymbols(editor);
            if (monacoSyms && monacoSyms.length > 0) {
                setSymbols(monacoSyms);
                setLoading(false);
                return;
            }

            // Fallback: regex-based parsing
            const model = editor.getModel?.();
            const content = model?.getValue?.() || editor.getValue?.() || '';
            const language = model?.getLanguageId?.() || 'javascript';
            const parsed = parseByRegex(content, language);
            setSymbols(parsed);
        } catch {
            setSymbols([]);
        } finally {
            setLoading(false);
        }
    }, [monacoEditorRef]);

    // Refresh when active file changes
    useEffect(() => {
        setSymbols([]);
        setActiveLine(null);
        if (activeFile) {
            // Small delay to let Monaco load the new file model
            const t = setTimeout(() => refresh(), 300);
            return () => clearTimeout(t);
        }
    }, [activeFile, refresh]);

    // Track cursor line for active highlight
    useEffect(() => {
        const editor = monacoEditorRef?.current;
        if (!editor) return;
        const disposable = editor.onDidChangeCursorPosition?.((e) => {
            setActiveLine(e.position.lineNumber);
        });
        return () => disposable?.dispose?.();
    }, [monacoEditorRef, activeFile]);

    function handleJump(line) {
        const editor = monacoEditorRef?.current;
        if (!editor) return;
        editor.revealLineInCenter(line);
        editor.setPosition({ lineNumber: line, column: 1 });
        editor.focus();
        setActiveLine(line);
        onJumpToLine?.(line);
    }

    // Find which symbol is currently active (cursor is within its range)
    const activeSymbolLine = (() => {
        if (!activeLine || symbols.length === 0) return null;
        let best = null;
        for (const sym of symbols) {
            if (sym.line <= activeLine) best = sym.line;
        }
        return best;
    })();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: t.bg1 }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderBottom: `1px solid ${t.border}`,
                flexShrink: 0,
            }}>
                <div style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    letterSpacing: '0.08em',
                    color: t.text3,
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                }}>
                    <AlignLeft size={11} />
                    Outline
                </div>
                <button
                    onClick={refresh}
                    title="Refresh outline"
                    disabled={loading}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: loading ? t.text4 : t.text3,
                        cursor: loading ? 'default' : 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <RefreshCw
                        size={11}
                        style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
                    />
                </button>
            </div>

            {/* Symbol list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {!activeFile ? (
                    <div style={{ padding: '20px 12px', color: t.text4, fontSize: '11px', textAlign: 'center' }}>
                        Open a file to see its outline
                    </div>
                ) : loading ? (
                    <div style={{ padding: '20px 12px', color: t.text4, fontSize: '11px', textAlign: 'center' }}>
                        Loading…
                    </div>
                ) : symbols.length === 0 ? (
                    <div style={{ padding: '20px 12px', color: t.text4, fontSize: '11px', textAlign: 'center' }}>
                        No symbols found
                    </div>
                ) : (
                    symbols.map((sym, idx) => (
                        <SymbolRow
                            key={`${sym.name}-${sym.line}-${idx}`}
                            symbol={sym}
                            isActive={sym.line === activeSymbolLine}
                            onClick={handleJump}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
