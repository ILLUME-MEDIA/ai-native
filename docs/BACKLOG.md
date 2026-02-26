# Code Editor — Feature Backlog

**Last Updated:** 2026-02-24
**Status Log:** See [WORK_LOG.md](WORK_LOG.md)

---

## Already Implemented ✅

- VS Code-style layout (activity bar, sidebar, editor, terminal, status bar)
- Monaco Editor with multi-tab support + Ctrl+G / Shift+Alt+F
- File Explorer (read-only tree)
- Global Search (`SearchPanel.jsx`)
- Diff Viewer (`DiffViewer.jsx`) — Split/Inline toggle
- Blame Gutter (`BlameGutter.jsx`) — hash-colored, click popover
- Branch Management (`GitPanel.jsx`) — checkout + create branch
- Multi-tab Terminal (`TerminalInstance` + `Terminal`)
- AI Chat Panel (`AIChatPanel.jsx`) — task lists + clarification UI
- Live Preview Panel (`PreviewPanel.jsx`) — HTML/CSS/JS/Markdown
- Theme Panel (`ThemePanel.jsx`) — per-workspace theme
- React Scaffolder (`ReactScaffolder.php`)
- Approval Panel (`ApprovalPanel`)
- Status bar (branch, language, UTF-8, LF)
- SSE events: file_tree_changed, plan_created, clarification_needed, etc.
- Backend git: blame, parsedDiff, branches, createBranch, checkout
- Backend search: workspace file search (200 results, 10/file)
- File Explorer Context Menu (new file/folder, rename, delete, copy path)
- Git Stage + Commit UI (staged/unstaged split, per-file checkboxes, commit + push)
- Command Palette (`CommandPalette.jsx`) — Ctrl+P files, Ctrl+Shift+P commands
- Outline Panel (`OutlinePanel.jsx`) — Monaco symbols + regex fallback
- Format on Save — Prettier / PHP-CS-Fixer via backend
- Split Editor (side-by-side panes, independent tab groups, focus indicator)
- AI Selection Actions (floating action bar: Explain / Fix / Tests / Docs / Refactor)
- Problems Panel (`ProblemsPanel.jsx`) — Monaco markers, filter by severity, jump to line
- Settings Panel (`SettingsPanel.jsx`) — fontSize, tabSize, wordWrap, minimap, formatOnSave
- File Bookmarks — star icon per file, bookmarks section in explorer, localStorage per workspace
- Zen Mode — Ctrl+K Z / Esc, hides sidebar+panels, status bar toggle
- Split Terminal — Columns2 button, drag-to-resize, independent sessions
- Keyboard Shortcuts Panel (`KeyboardShortcutsPanel.jsx`) — Ctrl+K S chord, modal, categorized table, Keyboard icon in status bar
- Git Commit History Log — B-17: replaced Bootstrap classes in GitPanel with inline `.ce-*` styles, scrollable 220px list, hash badge + author + relative time, loads 20 commits
- AI Inline Ghost Text (`B-06`) — Monaco `InlineCompletionsProvider`, 800ms debounce, `POST ai/complete` backend, Zap toggle in status bar, refs for enabled/workspaceId/path
- Merge Conflict Resolution UI (`B-15`, `MergeConflictPanel.jsx`) — conflict parser, per-conflict Accept Current/Both/Incoming, progress bar, Apply All, conflict banner above editor
- Stash Management (`B-16`) — GitPanel stash section: stash push, list, pop, drop; GitController stash methods + routes
- Preview: Image + JSON Support (`B-18`) — PreviewPanel fetches base64 for images; JSON pretty-print with syntax highlighting; WorkspaceController base64 read support
- Preview: Responsive Views (`B-19`) — PreviewPanel desktop/tablet/mobile viewport toggle buttons; iframe constrained to selected width

---

## Sprint 5 — Planned 📋

### S1-1: File Explorer Context Menu
**Priority:** P0 | **Effort:** Medium

Right-click context menu on any file/folder in the explorer:
- New File (under selected folder)
- New Folder (under selected folder)
- Rename (inline input replace)
- Delete (with confirmation dialog)
- Copy Path (to clipboard)
- Copy Relative Path

**Backend needed:**
- `POST workspaces/{id}/files/create` — create file or folder
- `PUT workspaces/{id}/files/rename` — rename file/folder
- `DELETE workspaces/{id}/files/delete` — delete file/folder

**Frontend:** `FileExplorer.jsx` — add `onContextMenu` handler, portal-rendered menu

---

### S1-2: Git Stage + Commit UI
**Priority:** P0 | **Effort:** Medium

Complete the git workflow in `GitPanel.jsx`:
- List of changed files (unstaged / staged sections)
- Checkbox to stage/unstage individual files
- "Stage All" / "Unstage All" buttons
- Commit message textarea
- Commit button (runs `git commit -m "..."`)
- Push button (runs `git push`)
- Status refresh after each action

**Backend needed:**
- `GET workspaces/{id}/git/status` — parse `git status --porcelain`
- `POST workspaces/{id}/git/stage` — `git add <file>`
- `POST workspaces/{id}/git/unstage` — `git restore --staged <file>`
- `POST workspaces/{id}/git/commit` — `git commit -m`
- `POST workspaces/{id}/git/push` — `git push`

---

## Backlog — High Priority (P1)

### B-01: Command Palette
**Effort:** Medium-High

`Ctrl+P` → fuzzy-find files to open
`Ctrl+Shift+P` → run editor commands (toggle word wrap, change language, go to line, format document, etc.)

- Floating modal overlay, centered
- Fuzzy search input
- Results list with file icon + path
- Keyboard navigation (↑ ↓ Enter Esc)
- Two modes: file picker vs command runner

---

### B-02: Outline Panel
**Effort:** Medium

Show symbols (functions, classes, variables) for the current open file.
- Uses Monaco `getDocumentSymbols` (built-in, no backend needed)
- Panel in left sidebar (4th activity bar icon)
- Click a symbol → scroll editor to that line
- Refresh on file change

---

### B-03: Problems Panel
**Effort:** Medium

Aggregate linting / syntax errors across open files.
- Backend: run language-appropriate linter (PHP-CS-Fixer, ESLint) on save
- SSE event `lint_results` → update problems panel
- Click error → open file + jump to line
- Count badge on activity bar icon

---

### B-04: Split Editor (Side-by-Side)
**Effort:** High

Open two files simultaneously in a horizontal split.
- "Split Right" button in tab context menu or toolbar
- Independent tab groups (left + right)
- Shared terminal / panels still below
- Drag handle to resize split ratio

---

### B-05: Format on Save
**Effort:** Small

- Backend: run Prettier (JS/JSX/JSON) or PHP-CS-Fixer (PHP) on file path
- `POST workspaces/{id}/files/format` → returns formatted content
- Trigger on Ctrl+S (already wired) before saving
- Toggle in settings

---

## Backlog — Medium Priority (P2)

### B-06: AI Inline Ghost Text (Copilot-style)
**Effort:** High

- Debounced trigger after user stops typing for ~800ms
- POST current file context + cursor position to `/ai/complete`
- Monaco `InlineCompletionsProvider` API → show ghost text
- Tab to accept, Esc to dismiss
- Toggle on/off in status bar

---

### B-07: AI Selection Actions
**Effort:** Small-Medium

Right-click selected code → context menu with:
- Explain this code
- Fix this code
- Generate tests
- Add JSDoc / PHPDoc
- Refactor

Sends selected text + action to AI chat panel, streams response.

---

### B-08: Terminal Error Quick Fix
**Effort:** Small

- Parse terminal stdout/stderr for error patterns (regex: `Error:`, `Fatal:`, `at line X`)
- When error detected → show "Fix with AI" floating button above terminal
- Click → prefills AI chat with error context + current file

---

### B-09: Settings Panel
**Effort:** Medium

Editor preferences panel (gear icon in activity bar or status bar):
- Font size (12–20px)
- Tab size (2 or 4)
- Word wrap toggle
- Minimap toggle
- Auto-save toggle + interval
- Format on save toggle
- Theme picker (editor color theme: Dark+, Monokai, GitHub Dark, etc.)

Persisted per-workspace in backend storage.

---

### B-10: File Bookmarks
**Effort:** Small

- Star icon on any file in explorer → adds to bookmarks list
- Bookmarks section at top of file explorer
- Persisted in workspace storage
- Click bookmark → open file immediately

---

### B-11: Recently Opened Files
**Effort:** Small

- Track last 10 opened files per workspace (in-memory / localStorage)
- Show as "Recent" section in file explorer or in Command Palette
- Keyboard shortcut: `Ctrl+Shift+E` to jump to recent files

---

### B-12: Zen Mode
**Effort:** Small

- `Ctrl+K Z` or button in toolbar
- Hide: activity bar, sidebar, status bar, right panel, terminal dock
- Editor goes fullscreen within the browser window
- Press Esc or same shortcut to exit

---

### B-13: Split Terminal
**Effort:** Small-Medium

- "Split" button in terminal tab bar → adds a column beside active terminal
- Independent sessions side-by-side
- Drag handle to resize

---

## Backlog — Low Priority (P3)

### B-14: Keyboard Shortcuts Panel
**Effort:** Small
List all keybindings in a modal (accessible via `Ctrl+K Ctrl+S`)

### B-15: Merge Conflict Resolution UI
**Effort:** High
Detect `<<<<<<<` markers in files, show inline merge editor to accept current/incoming/both

### B-16: Stash Management
**Effort:** Medium
In Git panel: list stashes, stash current changes, pop/drop a stash

### B-17: Git Commit History Log
**Effort:** Medium
Scrollable log of recent commits with author, date, message, abbreviated hash

### B-18: Preview — Image + JSON Support
**Effort:** Small
Extend PreviewPanel to show images inline and JSON with syntax-highlighted pretty-print

### B-19: Preview — Responsive Views
**Effort:** Small
Add mobile/tablet/desktop viewport toggle buttons in PreviewPanel toolbar

### B-20: Presence / Collaboration Indicators ✅
**Effort:** Very High (implemented with polling — no WebSocket needed)
Show who else is editing the same workspace.
- `workspace_presence` table (migration `2026_02_24_100000`)
- `WorkspacePresence` model; `PresenceController` (heartbeat + list)
- Routes: `GET presence`, `POST presence/heartbeat` under `workspaces/{workspace}`
- `PresenceIndicator.jsx`: heartbeat every 12 s, poll every 15 s, colored avatar circles in status bar, hover tooltip with name + open file, white border when same file open

---

## Sprint 7 — Completed ✅

### C-01: Visual Editor
**Priority:** P1 | **Effort:** High

Click-to-inspect WYSIWYG editor overlaid on the live preview iframe. Select any element → edit visual properties in a panel → patches source file.

**Frontend:**
- `VisualEditor.jsx` — new center view (`centerView === 'visual'`)
- Injected iframe script: element hover highlight, click → `postMessage` with selector + computed styles
- `VisualEditorPanel.jsx` — right-side properties panel:
  - Box Model diagram (margin / border / padding, editable)
  - Layout section (display, flex/grid controls)
  - Typography (font-size, weight, line-height, color)
  - Background + border-radius + box-shadow
- "Apply" writes patch to source CSS/JSX via existing `files/write`

**Activity bar:** `Paintbrush` icon (5th slot)

**Backend:** No new routes — uses existing `files/read` + `files/write`

---

### C-02: Whiteboard (Excalidraw)
**Priority:** P1 | **Effort:** Medium

Excalidraw embedded as a dedicated panel. AI toolbar converts sketches to code.

**Frontend:**
- `npm install @excalidraw/excalidraw`
- `WhiteboardPanel.jsx` — full-canvas Excalidraw instance
- AI toolbar (floating, top-right of canvas):
  - `→ React Component` — exports SVG → AI → streams JSX into new editor tab
  - `→ CSS / Tailwind` — layout + colors from sketch → stylesheet
  - `→ Design Tokens` — extracts colors/sizes → CSS variables file
- New center view option: `centerView === 'whiteboard'`

**Activity bar:** `PenTool` icon (6th slot)

**Backend:**
- `POST workspaces/{workspace}/ai/sketch-to-code` — accepts `{ svg, format: 'react'|'css'|'tokens' }`, SSE streams AI response

---

### C-03: MCP Store
**Priority:** P1 | **Effort:** High

In-editor marketplace to browse, install, and configure MCP servers per workspace. Installed servers are surfaced to the AI orchestrator as available tools.

**Frontend:**
- `MCPStorePanel.jsx` — catalog view with search + category filter tabs (All / AI / Data / DevOps / Communication / Browser)
- `MCPServerCard.jsx` — name, description, author, category badge, Install / Uninstall / Configure buttons
- `MCPConfigModal.jsx` — per-server config form (env vars, args) with JSON preview
- Activity bar: `Store` icon (7th slot)

**Backend:**
- `mcp_servers` table — curated catalog (name, slug, description, category, command, args_schema, env_schema)
- `workspace_mcp_servers` table — installed servers per workspace + stored config
- `MCPCatalogSeeder` — seeds 20+ popular servers (filesystem, github, postgres, puppeteer, slack, brave-search, etc.)
- `MCPController` — `catalog()`, `installed()`, `install()`, `uninstall()`, `configure()`
- `AIOrchestrator` — reads installed MCP servers for the active workspace, appends tool descriptions to system prompt

---

## Notes

- Do NOT edit migration files (historical record)
- All new backend routes go under `workspaces/{workspace}/...`
- CSS under `.ce-root` / `.ce-*` namespace
- Use SSE events for real-time updates (follow existing `file_tree_changed` pattern)
- Keep existing component props/handlers intact when modifying
