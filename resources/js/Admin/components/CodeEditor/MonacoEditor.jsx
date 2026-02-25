import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';

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
    onSelectionChange,
    settings = {},
    // B-06: AI Ghost Text
    ghostTextEnabled = false,
    workspaceId = null,
}) {
    const editorRef = useRef(null);

    // B-06: Refs so the InlineCompletionsProvider closure always reads current values
    const ghostTextEnabledRef = useRef(ghostTextEnabled);
    const workspaceIdRef = useRef(workspaceId);
    const filePathRef = useRef(path);

    useEffect(() => { ghostTextEnabledRef.current = ghostTextEnabled; }, [ghostTextEnabled]);
    useEffect(() => { workspaceIdRef.current = workspaceId; }, [workspaceId]);
    useEffect(() => { filePathRef.current = path; }, [path]);

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

        // Selection change for AI selection actions
        if (onSelectionChange) {
            editor.onDidChangeCursorSelection((e) => {
                const selection = e.selection;
                if (
                    selection.isEmpty() ||
                    (selection.startLineNumber === selection.endLineNumber &&
                        selection.startColumn === selection.endColumn)
                ) {
                    onSelectionChange(null);
                    return;
                }
                const selectedText = editor.getModel()?.getValueInRange(selection) || '';
                if (!selectedText.trim()) {
                    onSelectionChange(null);
                    return;
                }
                // Get position of start of selection in screen coordinates
                const startPos = { lineNumber: selection.startLineNumber, column: selection.startColumn };
                const scrolledPos = editor.getScrolledVisiblePosition(startPos);
                const domNode = editor.getDomNode();
                let screenTop = 0;
                let screenLeft = 0;
                if (scrolledPos && domNode) {
                    const rect = domNode.getBoundingClientRect();
                    screenTop = rect.top + scrolledPos.top;
                    screenLeft = rect.left + scrolledPos.left;
                }
                onSelectionChange({
                    text: selectedText,
                    startLineNumber: selection.startLineNumber,
                    startColumn: selection.startColumn,
                    top: screenTop,
                    left: screenLeft,
                });
            });
        }

        // B-06: AI Inline Ghost Text — register InlineCompletionsProvider
        {
            const ghostDisposable = monaco.languages.registerInlineCompletionsProvider('*', {
                provideInlineCompletions: async (model, position, context, token) => {
                    // Only handle requests from this editor's model
                    if (model !== editor.getModel()) return { items: [] };
                    if (!ghostTextEnabledRef.current) return { items: [] };
                    if (!workspaceIdRef.current) return { items: [] };

                    // 800ms debounce — resolved false if timed out, true if cancelled
                    const cancelled = await new Promise(resolve => {
                        const t = setTimeout(() => resolve(false), 800);
                        token.onCancellationRequested(() => { clearTimeout(t); resolve(true); });
                    });
                    if (cancelled || token.isCancellationRequested) return { items: [] };

                    try {
                        const resp = await axios.post(
                            `/api/workspaces/${workspaceIdRef.current}/ai/complete`,
                            {
                                path: filePathRef.current,
                                content: model.getValue(),
                                line: position.lineNumber,
                                column: position.column,
                            }
                        );
                        const completion = resp.data?.completion;
                        if (!completion) return { items: [] };
                        return { items: [{ insertText: completion }], enableForwardStability: true };
                    } catch {
                        return { items: [] };
                    }
                },
                freeInlineCompletions: () => {},
            });
            editor.onDidDispose(() => ghostDisposable.dispose());
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
                minimap: { enabled: settings.minimap !== false },
                fontSize: settings.fontSize || 14,
                lineNumbers: 'on',
                rulers: [80, 120],
                wordWrap: settings.wordWrap ? 'on' : 'off',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: settings.tabSize || 4,
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
                inlineSuggest: { enabled: true },
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
