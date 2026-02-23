import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

export default function MonacoEditor({
    value,
    onChange,
    language = 'javascript',
    theme = 'vs-dark',
    readOnly = false,
    onSave,
    height = '100%',
    path = '',
    onEditorMount,
    onScrollChange,
}) {
    const editorRef = useRef(null);

    function handleEditorDidMount(editor, monaco) {
        editorRef.current = editor;

        if (onEditorMount) {
            onEditorMount(editor, monaco);
        }

        // Save (Ctrl+S / Cmd+S)
        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
            () => { if (onSave) onSave(editor.getValue()); }
        );

        // Find (Ctrl+F / Cmd+F)
        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
            () => { editor.getAction('actions.find').run(); }
        );

        // Go to Line (Ctrl+G)
        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG,
            () => { editor.getAction('editor.action.gotoLine').run(); }
        );

        // Format Document (Shift+Alt+F)
        editor.addCommand(
            monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
            () => { editor.getAction('editor.action.formatDocument').run(); }
        );

        // Scroll change for blame gutter sync
        if (onScrollChange) {
            editor.onDidScrollChange(() => {
                const lh = editor.getOption(monaco.editor.EditorOption.lineHeight);
                onScrollChange(editor.getScrollTop(), lh);
            });
        }

        editor.focus();
    }

    function handleEditorChange(newValue) {
        if (onChange && !readOnly) {
            onChange(newValue);
        }
    }

    const detectLanguage = (filePath) => {
        if (!filePath) return language;
        const ext = filePath.split('.').pop()?.toLowerCase();
        const map = {
            'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
            'php': 'php', 'blade': 'blade', 'py': 'python', 'rb': 'ruby', 'java': 'java',
            'go': 'go', 'rs': 'rust', 'c': 'c', 'cpp': 'cpp', 'cs': 'csharp',
            'css': 'css', 'scss': 'scss', 'sass': 'sass', 'less': 'less',
            'html': 'html', 'htm': 'html', 'xml': 'xml', 'json': 'json',
            'yaml': 'yaml', 'yml': 'yaml', 'md': 'markdown', 'sql': 'sql',
            'sh': 'shell', 'bash': 'shell', 'txt': 'plaintext', 'log': 'plaintext',
        };
        return map[ext] || 'plaintext';
    };

    const editorLanguage = path ? detectLanguage(path) : language;

    return (
        <Editor
            height={height}
            language={editorLanguage}
            value={value}
            theme={theme}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
                readOnly,
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                rulers: [80, 120],
                wordWrap: 'off',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: 4,
                insertSpaces: true,
                formatOnPaste: true,
                formatOnType: false,
                quickSuggestions: true,
                suggest: { showKeywords: true, showSnippets: true },
                folding: true,
                foldingStrategy: 'indentation',
                showFoldingControls: 'always',
                matchBrackets: 'always',
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                autoIndent: 'full',
                contextmenu: true,
                cursorBlinking: 'smooth',
                cursorStyle: 'line',
                find: {
                    addExtraSpaceOnTop: false,
                    autoFindInSelection: 'never',
                    seedSearchStringFromSelection: 'always',
                },
                fontLigatures: true,
                renderWhitespace: 'selection',
                smoothScrolling: true,
                snippetSuggestions: 'top',
            }}
            loading={
                <div className="d-flex align-items-center justify-content-center h-100">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading editor…</span>
                    </div>
                </div>
            }
        />
    );
}
