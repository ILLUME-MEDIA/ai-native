# Online Code Editor - Setup Instructions

## Phase 1: Backend Setup (Completed ✓)

All backend files have been created. Now run these commands:

### 1. Install Dependencies (if needed)

```bash
# No additional PHP dependencies needed - uses existing Laravel packages
```

### 2. Run Migration

```bash
php artisan migrate
```

### 3. Seed Permissions

```bash
php artisan db:seed --class=CodeEditorPermissionSeeder
```

### 4. Verify Backend

Test that the API works:

```bash
# List files (must be authenticated)
curl -X GET "http://localhost/api/code-editor/files?path=/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Phase 2: Frontend Setup

### 1. Install NPM Dependencies

```bash
npm install @monaco-editor/react monaco-editor --save
```

### 2. Create Remaining React Files

I'll provide the code for each file below:

#### A. Main CodeEditor Page

**File:** `resources/js/Admin/views/admin/apps/code-editor/CodeEditor.jsx`

```jsx
import React, { useState } from 'react';
import axios from 'axios';
import MonacoEditor from '@/components/CodeEditor/MonacoEditor';
import FileExplorer from '@/components/CodeEditor/FileExplorer';
import EditorTabs from '@/components/CodeEditor/EditorTabs';
import AIChatPanel from '@/components/CodeEditor/AIChatPanel';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { toast } from 'react-toastify';

export default function CodeEditor() {
    const [tabs, setTabs] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [showChat, setShowChat] = useState(true);

    async function handleFileSelect(file) {
        // Check if already open
        const existing = tabs.find(t => t.path === file.path);
        if (existing) {
            setActiveTab(existing);
            return;
        }

        // Load file content
        try {
            const response = await axios.get('/api/code-editor/files/read', {
                params: { path: file.path }
            });

            const newTab = {
                ...file,
                content: response.data.content,
                language: detectLanguage(file.extension),
                unsaved: false
            };

            setTabs(prev => [...prev, newTab]);
            setActiveTab(newTab);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to load file');
        }
    }

    function handleEditorChange(newValue) {
        if (!activeTab) return;

        setTabs(prev => prev.map(tab =>
            tab.path === activeTab.path
                ? { ...tab, content: newValue, unsaved: true }
                : tab
        ));

        setActiveTab(prev => ({ ...prev, content: newValue, unsaved: true }));
    }

    async function handleSave(content) {
        if (!activeTab) return;

        try {
            await axios.put('/api/code-editor/files/update', {
                path: activeTab.path,
                content: content || activeTab.content
            });

            setTabs(prev => prev.map(tab =>
                tab.path === activeTab.path
                    ? { ...tab, unsaved: false }
                    : tab
            ));

            setActiveTab(prev => ({ ...prev, unsaved: false }));

            toast.success('File saved');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save file');
        }
    }

    function handleTabClose(tab) {
        if (tab.unsaved) {
            if (!confirm('File has unsaved changes. Close anyway?')) {
                return;
            }
        }

        setTabs(prev => prev.filter(t => t.path !== tab.path));

        if (activeTab?.path === tab.path) {
            const index = tabs.findIndex(t => t.path === tab.path);
            setActiveTab(tabs[index - 1] || tabs[index + 1] || null);
        }
    }

    function detectLanguage(extension) {
        const map = {
            js: 'javascript',
            jsx: 'javascript',
            ts: 'typescript',
            tsx: 'typescript',
            php: 'php',
            py: 'python',
            rb: 'ruby',
            java: 'java',
            css: 'css',
            scss: 'scss',
            html: 'html',
            json: 'json',
            md: 'markdown',
            sql: 'sql'
        };
        return map[extension] || 'plaintext';
    }

    return (
        <div className="container-fluid">
            <PageBreadcrumb
                title="Code Editor"
                items={[
                    { text: 'Apps', link: '/apps' },
                    { text: 'Code Editor', active: true }
                ]}
            />

            <div className="code-editor-container">
                <div className="code-editor-layout">
                    {/* Left: File Explorer */}
                    <div className="code-editor-sidebar">
                        <FileExplorer
                            onFileSelect={handleFileSelect}
                            currentFile={activeTab}
                        />
                    </div>

                    {/* Center: Editor */}
                    <div className="code-editor-main">
                        <EditorTabs
                            tabs={tabs}
                            activeTab={activeTab}
                            onTabSelect={setActiveTab}
                            onTabClose={handleTabClose}
                        />

                        <div className="editor-canvas">
                            {activeTab ? (
                                <MonacoEditor
                                    value={activeTab.content}
                                    onChange={handleEditorChange}
                                    language={activeTab.language}
                                    path={activeTab.path}
                                    onSave={handleSave}
                                />
                            ) : (
                                <div className="editor-empty-state">
                                    <h4>No file open</h4>
                                    <p>Select a file from the explorer to start editing</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: AI Chat (collapsible) */}
                    {showChat && (
                        <div className="code-editor-chat">
                            <AIChatPanel
                                currentFile={activeTab}
                                openFiles={tabs}
                                onClose={() => setShowChat(false)}
                                onApplyChanges={(changes) => {
                                    changes.forEach(change => {
                                        const tab = tabs.find(t => t.path === change.path);
                                        if (tab) {
                                            setTabs(prev => prev.map(t =>
                                                t.path === change.path
                                                    ? { ...t, content: change.content, unsaved: true }
                                                    : t
                                            ));
                                            if (activeTab?.path === change.path) {
                                                setActiveTab(prev => ({ ...prev, content: change.content, unsaved: true }));
                                            }
                                        }
                                    });
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Toggle chat button */}
                {!showChat && (
                    <button
                        className="btn btn-primary chat-toggle"
                        onClick={() => setShowChat(true)}
                    >
                        Show AI Assistant
                    </button>
                )}
            </div>
        </div>
    );
}
```

#### B. SCSS Styles

**File:** `resources/assets/scss/components/_code-editor.scss`

```scss
.code-editor-container {
    height: calc(100vh - 180px);
    display: flex;
    flex-direction: column;
}

.code-editor-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
    border: 1px solid var(--border-color, #dee2e6);
    border-radius: 4px;
}

.code-editor-sidebar {
    width: 250px;
    border-right: 1px solid var(--border-color, #dee2e6);
    background: var(--bs-body-bg);
    overflow-y: auto;
}

.code-editor-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.code-editor-chat {
    width: 350px;
    border-left: 1px solid var(--border-color, #dee2e6);
    background: var(--bs-body-bg);
}

.editor-tabs {
    display: flex;
    background: var(--bs-secondary-bg);
    border-bottom: 1px solid var(--border-color, #dee2e6);
    overflow-x: auto;
    min-height: 40px;
}

.editor-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-right: 1px solid var(--border-color, #dee2e6);
    cursor: pointer;
    user-select: none;
    transition: background 0.2s;

    &.active {
        background: var(--bs-body-bg);
        border-bottom: 2px solid var(--bs-primary);
    }

    &:hover {
        background: var(--bs-tertiary-bg);
    }
}

.tab-icon {
    font-size: 14px;
}

.tab-name {
    font-size: 13px;
}

.unsaved-indicator {
    color: var(--bs-warning);
    margin-left: 4px;
}

.tab-close {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    opacity: 0.6;
    display: flex;
    align-items: center;

    &:hover {
        opacity: 1;
    }
}

.editor-canvas {
    flex: 1;
    overflow: hidden;
}

.editor-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--bs-secondary-color);
}

.file-explorer {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.file-explorer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid var(--border-color, #dee2e6);

    h6 {
        margin: 0;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
        color: var(--bs-secondary-color);
    }
}

.file-explorer-search {
    padding: 10px;
    border-bottom: 1px solid var(--border-color, #dee2e6);
}

.file-tree {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
}

.file-tree-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 13px;
    transition: background 0.2s;

    &:hover {
        background: var(--bs-secondary-bg);
    }

    &.active {
        background: var(--bs-primary-bg-subtle);
        color: var(--bs-primary);
    }

    .expand-button {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
    }
}

.file-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ai-chat-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color, #dee2e6);

    .chat-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
    }

    .btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        opacity: 0.7;

        &:hover {
            opacity: 1;
        }
    }
}

.chat-controls {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color, #dee2e6);
    background: var(--bs-secondary-bg);
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.chat-empty-state {
    text-align: center;
    color: var(--bs-secondary-color);
    padding: 40px 20px;

    svg {
        opacity: 0.3;
        margin-bottom: 16px;
    }

    ul {
        text-align: left;
        display: inline-block;
        margin-top: 16px;
    }
}

.chat-message {
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 8px;

    &.user {
        background: var(--bs-primary-bg-subtle);
        margin-left: 20px;
    }

    &.assistant {
        background: var(--bs-secondary-bg);
        margin-right: 20px;
    }

    &.error {
        background: var(--bs-danger-bg-subtle);
        border-left: 3px solid var(--bs-danger);
    }

    &.loading {
        opacity: 0.7;
    }
}

.message-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 12px;
}

.message-time {
    margin-left: auto;
    color: var(--bs-secondary-color);
}

.message-content {
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.5;
}

.message-actions {
    padding-top: 12px;
    border-top: 1px solid var(--border-color, #dee2e6);
}

.chat-input {
    display: flex;
    gap: 8px;
    padding: 16px;
    border-top: 1px solid var(--border-color, #dee2e6);

    textarea {
        resize: none;
    }

    button {
        align-self: flex-end;
    }
}

.chat-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
}
```

### 3. Import SCSS in Main File

Add to `resources/assets/scss/app.scss`:

```scss
// Code Editor
@import 'components/code-editor';
```

### 4. Add Route

**File:** `resources/js/Admin/routes/index.jsx`

Add this import at the top:

```jsx
const CodeEditor = lazy(() => import('@/views/admin/apps/code-editor/CodeEditor'));
```

Add this route in the routes array:

```jsx
{ path: 'apps/code-editor', element: <CodeEditor /> },
```

### 5. Add Menu Item

**File:** `resources/js/Admin/layouts/components/data.js`

In the `Apps` section, add:

```javascript
{
    key: 'code-editor',
    label: 'Code Editor',
    isTitle: false,
    icon: 'ri-code-s-slash-line',
    url: '/apps/code-editor',
},
```

---

## Phase 3: Build & Test

### 1. Build Frontend

```bash
npm run dev
# or for production
npm run build
```

### 2. Test the Application

1. Navigate to `/admin/apps/code-editor`
2. You should see:
   - File explorer on the left
   - Empty editor in the center
   - AI chat panel on the right

3. Click a file in the explorer
4. File should load in Monaco Editor
5. Make changes and press Ctrl+S to save
6. Try asking AI to help with code

---

## Phase 4: Configuration

### 1. Environment Variables

Add to `.env`:

```env
# Code Editor
CODE_EDITOR_MAX_FILE_SIZE=10485760
CODE_EDITOR_THEME=vs-dark
CODE_EDITOR_AUTO_SAVE=0

# AI Keys (if not already set)
OPENAI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
MISTRAL_API_KEY=your_key_here
```

### 2. Permissions

The seeder creates default permissions. To customize:

1. Navigate to database
2. Edit `code_editor_permissions` table
3. OR create a UI for managing permissions

---

## Troubleshooting

### Monaco Editor Not Loading

```bash
npm install --save-dev @monaco-editor/react monaco-editor
npm run build
```

### Permission Denied Errors

Check `code_editor_permissions` table and verify patterns match your file paths.

### AI Chat Not Working

1. Verify AI endpoints are active: `/admin/ai/endpoints`
2. Check API keys are set in `.env`
3. Test endpoint: `POST /api/ai/chat/editor` with Postman

---

## Next Steps

1. ✅ Run migrations
2. ✅ Seed permissions
3. ✅ Install NPM packages
4. ✅ Create remaining React files (use code above)
5. ✅ Import SCSS
6. ✅ Add route
7. ✅ Add menu item
8. ✅ Build frontend
9. ✅ Test!

---

## File Checklist

### Backend (✓ All Created)
- [x] Migration: `create_code_editor_permissions_table.php`
- [x] Model: `CodeEditorPermission.php`
- [x] Controller: `CodeEditorController.php`
- [x] Seeder: `CodeEditorPermissionSeeder.php`
- [x] Service: `AIManager.php` (extended)
- [x] Controller: `AIChatController.php` (extended)
- [x] Routes: `api.php` (updated)
- [x] Config: `codeeditor.php`

### Frontend (✓ 4/7 Created, 3 Provided Above)
- [x] Component: `MonacoEditor.jsx`
- [x] Component: `FileExplorer.jsx`
- [x] Component: `EditorTabs.jsx`
- [x] Component: `AIChatPanel.jsx`
- [ ] Page: `CodeEditor.jsx` (code provided above)
- [ ] Style: `_code-editor.scss` (code provided above)
- [ ] Route + Menu (instructions provided above)

---

**Total Implementation Time:** ~2-3 hours if following this guide

**Difficulty:** Intermediate

**Support:** Refer to `ONLINE_CODE_EDITOR_SYSTEM_DESIGN.md` for complete architecture details
