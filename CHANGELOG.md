# Changelog — Code Editor & AI Orchestration

> All changes listed here are **uncommitted** as of 2026-02-23.

---

## 1. AI Orchestration System

A lightweight orchestration layer sits between the user's chat message and the AI stream. Before streaming begins, the message is classified and the AI is instructed to emit a structured prefix (`PLAN:` or `CLARIFY:`) on its very first line. The controller buffers output until the first newline, detects the prefix, fires a dedicated SSE event, and then forwards the rest of the stream normally.

### New: `app/Services/AI/AIOrchestrator.php`

Central service class responsible for the entire orchestration pipeline.

| Method | Purpose |
|---|---|
| `classify(string $message): array` | Scans message for planning trigger words and vagueness (< 4 words). Returns `{needs_planning, is_vague}`. |
| `getOrchestratorSystemAddendum(bool, bool): string` | Builds the PLAN / CLARIFY protocol block injected into the system prompt. |
| `parseClarifyPrefix(string $buffer): ?array` | Detects `CLARIFY:{…}` on the first line of a buffered chunk. Returns parsed questions or `null`. |
| `parsePlanPrefix(string $buffer): ?array` | Detects `PLAN:{…}` on the first line. Returns task array or `null`. |
| `createTaskList(int $conversationId, array $tasks): AITaskList` | Persists a new `AITaskList` with `AITask` children and returns the loaded relationship. |
| `getIncompleteTaskList(int $conversationId): ?AITaskList` | Fetches the latest pending/in_progress task list for auto-resume. |
| `startTask / completeTask / failTask / completeTaskList` | Lifecycle helpers for task status transitions. |

**PLANNING_TRIGGERS** (keyword list that activates planning):
`build`, `create a full`, `implement`, `set up`, `develop a`, `make a complete`, `add a feature`, `refactor`, `redesign`, `build out`, `integrate`, `scaffold`, `generate a`, `write a full`.

**CLARIFY protocol** (injected when `is_vague = true`):
The AI must output `CLARIFY:{JSON}` as its very first line if it needs more info before acting — 2–4 short questions, each with 2–4 options.

**PLAN protocol** (injected when `needs_planning = true`):
The AI must output `PLAN:{JSON}` as its very first line listing 2–8 concrete tasks, then immediately begin executing without waiting for confirmation.

### New: `app/Models/AITaskList.php`

Eloquent model for the `ai_task_lists` table.

- Fields: `conversation_id` (FK → `ai_conversations`), `status` (pending/in_progress/completed/failed), `metadata` (JSON)
- Relationship: `tasks()` → `HasMany(AITask)` ordered by `order`

### New: `app/Models/AITask.php`

Eloquent model for the `ai_tasks` table.

- Fields: `task_list_id` (FK → `ai_task_lists`), `order`, `title`, `description`, `status`, `result` (JSON)
- Relationship: `taskList()` → `BelongsTo(AITaskList)`

### New: `database/migrations/2026_02_23_000001_create_ai_task_lists_table.php`

Creates `ai_task_lists` with a cascade-delete foreign key to `ai_conversations`.

```
id | conversation_id (FK) | status (enum) | metadata (json) | timestamps
```

### New: `database/migrations/2026_02_23_000002_create_ai_tasks_table.php`

Creates `ai_tasks` with a cascade-delete foreign key to `ai_task_lists`.

```
id | task_list_id (FK) | order (uint) | title | description | status (enum) | result (json) | timestamps
```

> **Action required:** run `php artisan migrate` once the MySQL connection is available.

### Modified: `app/Services/AI/AIManager.php`

- `chatWithCodeStream()` now reads `$data['extra_system']` and appends it to `$baseSystemPrompt` before the API call.

### Modified: `app/Http/Controllers/Workspace/AICommandController.php`

- `AIOrchestrator` injected via constructor.
- `chatStream()` now:
  1. Calls `orchestrator->classify($message)` before opening the SSE stream.
  2. Calls `orchestrator->getOrchestratorSystemAddendum()` and passes the result as `extra_system` to `AIManager`.
  3. Buffers incoming chunks until the first `\n` to inspect the first line.
  4. On `CLARIFY:` prefix → fires `clarification_needed` SSE event, persists an `AIConversationEvent`, discards the prefix line.
  5. On `PLAN:` prefix → calls `orchestrator->createTaskList()`, fires `plan_created` SSE event with the full task list payload, persists an `AIConversationEvent`, forwards the rest of the stream normally.
  6. On no recognized prefix → forwards everything buffered as a normal `chunk` event.

---

## 2. Code Editor — Terminal Multi-Tab

### Modified: `resources/js/Admin/components/CodeEditor/Terminal.jsx`

Refactored from a single terminal into a multi-tab architecture.

**New internal component: `TerminalInstance`**

Each tab is an independent `TerminalInstance` that:
- Manages its own `history`, `command`, `executing`, `historyIndex` state.
- Scrolls to bottom and focuses input when its tab becomes `active`.
- Registers a `clear` callback with the parent via `onRegisterClear(id, fn)`.
- Exposes the terminal API (`appendEntries`, `appendOutput`) to the parent only while `active`.

**Container component: `Terminal` (exported default)**

- Maintains a `tabs` array (each entry: `{ id, label: 'bash' }`).
- Renders a tab bar with `+` button to add new tabs (`addTab()`).
- `closeTab(id)` — removes a tab; if closing the active tab, selects the adjacent one; refuses to close the last tab.
- `clearActive()` — calls the registered clear function for the active tab.
- `focusActive()` — focuses the input of the active tab.
- Each tab renders as a hidden (`display:none`) or visible `TerminalInstance` so history is preserved when switching.

---

## 3. Code Editor — EditorBreadcrumb

### New: `resources/js/Admin/components/CodeEditor/EditorBreadcrumb.jsx`

VS Code-style file path breadcrumb bar rendered above the Monaco editor.

- Parses the active file path into segments separated by `/`.
- Colors the final segment by extension (JS = `#f0db4f`, JSX = `#61dafb`, TS/TSX = `#3178c6`, PHP = `#9b59f5`, CSS = `#264de4`, SCSS = `#cd6799`, HTML = `#e34c26`, etc.).
- Shows an orange filled dot next to the filename when the file has unsaved changes.
- Accepts an `actions` prop — renders passed React nodes flush-right in the bar (used for the blame toggle button).

---

## 4. Global Search

### Modified: `app/Http/Controllers/Workspace/WorkspaceController.php`

Added `search(Request $request, Workspace $workspace)`:

- Validates: `query` (required, min 2), `case_sensitive` (bool), `regex` (bool).
- Recursively walks the workspace directory via the private `searchDirectory()` helper.
- Skips excluded dirs (`.git`, `node_modules`, `vendor`, etc.) and binary extensions (`png`, `jpg`, `woff`, `mp3`, `mp4`, `zip`, `pdf`, …).
- Skips files > 1 MB.
- Per-file limit: **10 matches**. Total limit: **200 matches**.
- Supports plain-text and regex matching with optional case sensitivity.
- Returns `{ results: [{file, line, content, match}], total, query }`.

### New: `resources/js/Admin/components/CodeEditor/SearchPanel.jsx`

Left-sidebar panel shown when `leftView === 'search'`.

- **Search input** with debounce (400 ms) and Enter key support.
- **Toggles**: `Aa` (match case), `.*` (regex) — active state shown with orange border.
- **Results** grouped by file with a collapsible file header showing the match count badge.
- **Match highlighting** — the matching substring is highlighted orange within the line content.
- Calls `onResultClick(file, line)` on click → handled in `CodeEditor` to open the file and scroll Monaco to that line.

---

## 5. Diff Viewer

### Modified: `app/Http/Controllers/Workspace/GitController.php`

Added `parsedDiff(Request $request, Workspace $workspace)`:

- Accepts `file` (nullable), `staged` (bool), `commit` (nullable hash).
- Builds and executes `git diff [--cached] [commit] [-- file]`.
- Parses the unified diff output via `parseUnifiedDiff()` into structured hunks:
  ```json
  {
    "file": "src/app.js",
    "additions": 3,
    "deletions": 1,
    "hunks": [
      {
        "old_start": 10, "new_start": 10,
        "lines": [
          {"type": "context|added|removed", "old_line": 10, "new_line": 10, "content": "..."}
        ]
      }
    ]
  }
  ```
- Returns `{ success, files: [...] }` (multi-file when no specific file is given).

**Private helper `parseUnifiedDiff(string $output): array`** — handles `diff --git`, `+++ b/`, `@@ … @@` hunk headers, `+`/`-`/` ` line prefixes, and `\ No newline at end of file` markers.

### New: `resources/js/Admin/components/CodeEditor/DiffViewer.jsx`

Monaco `DiffEditor` view rendered in the center canvas when `centerView === 'diff'`.

- Fetches `GET git/diff-parsed?file=…` and `GET files/read?path=…` in parallel.
- Reconstructs the **original** (pre-change) content from the current file content and diff hunks by:
  - Copying lines before each hunk as-is.
  - Re-inserting `removed` lines (which are absent from the working copy).
  - Skipping `added` lines (which are absent from the original).
- Passes `original` and `modified` strings to `<DiffEditor>` from `@monaco-editor/react`.
- Header bar: file path, `+N`/`-N` addition/deletion badges, **Split** / **Inline** toggle, close button.
- Dark theme matching the editor (`#161b22` background, `vs-dark` Monaco theme).
- Language auto-detected from file extension.

---

## 6. Git Blame

### Modified: `app/Services/Git/GitService.php`

- Added `'blame'` to the `$allowedCommands` whitelist.

### Modified: `app/Http/Controllers/Workspace/GitController.php`

Added `blame(Request $request, Workspace $workspace)`:

- Validates `file` param, sanitizes via `sanitizeGitPath()`.
- Executes `git blame --line-porcelain -- {file}`.
- Parses the porcelain format via `parseBlame()` into per-line objects:
  ```json
  [{"line": 1, "hash": "abc1234…", "author": "Jane", "email": "jane@…", "timestamp": 1700000000, "summary": "Fix bug", "content": "const x = 1;"}]
  ```
- Uses a `$commitCache` to reuse metadata for repeated hash occurrences (common with `--line-porcelain`).
- Returns `{ success, blame: [...] }`.

**Private helper `parseBlame(string $output): array`** — processes the `{40-char hash} {orig} {final}` header line, `author`, `author-mail`, `author-time`, `summary` key-value lines, and the tab-prefixed content line for each block.

### New: `resources/js/Admin/components/CodeEditor/BlameGutter.jsx`

Fixed-width (200 px) scrollable pane rendered to the left of the Monaco editor.

- **Per-line rows** — each row contains: 7-char hash (HSL color derived from hash), truncated author (10 chars), relative date (e.g. `3d`, `2w`).
- **Scroll sync** — subscribes to `editor.onDidScrollChange()` via the passed `editorRef` and mirrors `scrollTop` to the gutter's own `scrollTop`, keeping both in perfect alignment.
- **Commit popover** — clicking a row opens an inline popover showing the full 12-char hash (colored), author name, email, ISO timestamp, and commit summary. Clicking elsewhere dismisses it.
- Clean up: disposes the Monaco scroll listener on unmount.

---

## 7. Branch Management

### Modified: `app/Http/Controllers/Workspace/GitController.php`

Three new methods:

**`branches(Workspace $workspace)`**
- Runs `git branch -a --format=%(refname:short)` to list all local and remote branches.
- Runs `git rev-parse --abbrev-ref HEAD` for the current branch.
- Returns `{ success, current: "main", branches: ["main", "feature/x", "remotes/origin/main"] }`.

**`createBranch(Request $request, Workspace $workspace)`**
- Validates `name`, asserts it is a safe git ref.
- Runs `git branch {name}`.

**`checkout(Request $request, Workspace $workspace)`**
- Validates `branch` (required) and `create` (optional bool).
- Asserts the branch name is a safe ref.
- Runs `git checkout [-b] {branch}`.
- Returns the result plus `branch` for the frontend to update its local state.

### Modified: `resources/js/Admin/components/CodeEditor/GitPanel.jsx`

- **Branch section** (new, at the top of the panel body):
  - Fetches `GET git/branches` on mount and after git operations.
  - Displays a dropdown button showing the current branch with a `GitBranch` icon.
  - Dropdown lists local branches (with a `✓` check on the active one) and remote branches in a labelled group.
  - Clicking a non-active local branch calls `POST git/checkout` → shows success toast → updates `currentBranch` state.
  - **"New branch"** button (`+` icon) reveals an inline form — an input + "Create" button. Submitting calls `POST git/branch` then refreshes the branch list.
  - All branch operations are guarded by `branchLoading` state.

- **Diff buttons on change items**:
  - Each file in the changes list that is not `??` (untracked) gets a `≠` icon button.
  - Clicking it calls `onOpenDiff(file, 'unstaged')` (new prop) → handled in `CodeEditor` to show the diff viewer.

---

## 8. Monaco Editor Enhancements

### Modified: `resources/js/Admin/components/CodeEditor/MonacoEditor.jsx`

New props:

| Prop | Type | Purpose |
|---|---|---|
| `onEditorMount(editor, monaco)` | callback | Called after Monaco mounts. Parent uses this to obtain the editor instance ref. |
| `onScrollChange(scrollTop, lineHeight)` | callback | Called on `editor.onDidScrollChange`. Used by `BlameGutter` to sync scroll. |

New keyboard shortcuts registered in `handleEditorDidMount`:

| Shortcut | Action |
|---|---|
| `Ctrl+G` | Go to Line (`editor.action.gotoLine`) |
| `Shift+Alt+F` | Format Document (`editor.action.formatDocument`) |

---

## 9. CodeEditor Wiring

### Modified: `resources/js/Admin/views/admin/apps/code-editor/CodeEditor.jsx`

The main view was extended to wire all new features together.

**New state:**

| State | Purpose |
|---|---|
| `leftView: 'explorer' \| 'search' \| 'git'` | Now includes `'search'` for the search panel |
| `centerView: 'code' \| 'preview' \| 'diff'` | Now includes `'diff'` for the diff viewer |
| `diffFile`, `diffType` | Track which file/type to show in the diff viewer |
| `showBlame`, `blameData`, `blameLoading` | Blame gutter visibility and data |
| `currentBranch` | Dynamic branch name fetched from `git/branches` |

**New refs:**

| Ref | Purpose |
|---|---|
| `monacoEditorRef` | Holds the Monaco editor instance (populated via `onEditorMount`) |
| `pendingScrollLineRef` | Line number to scroll to after a file tab becomes active |

**Activity bar** — added Search icon (`leftView === 'search'`):
```
[Explorer]  [Search]  [Git]
```

**Left sidebar** — renders `<SearchPanel>` when `leftView === 'search'`.

**Center canvas** — renders `<DiffViewer>` when `centerView === 'diff' && diffFile`.

**Monaco canvas** — when `showBlame && blameData`, wraps the editor in a flex row with `<BlameGutter>` on the left.

**EditorBreadcrumb** — passes a blame toggle button as `actions` prop. The button shows a `User` icon; orange/active style when blame is visible; disabled during load.

**Status bar** — branch label changed from hardcoded `'⎇ main'` to `⎇ ${currentBranch}`, fetched from `GET git/branches` on workspace selection.

**`handleResultClick(filePath, line)`** — opens the file (or activates its existing tab), sets `pendingScrollLineRef`, and waits for `activeTab` to change before calling `editor.revealLineInCenter(line)` + `editor.setPosition(...)`.

**`handleOpenDiff(file, type)`** — sets `diffFile`, `diffType`, switches to `centerView = 'diff'`.

**`handleBlameToggle()`** — fetches `GET git/blame?file=activeTab.path` on first use, caches in `blameData`, toggles `showBlame`. Blame data is cleared when the active file changes.

---

## 10. CSS Additions

### Modified: `public/assets/scss/components/_code-editor.scss`

**+415 lines.** New sections appended:

| CSS block | Covers |
|---|---|
| `.chat-message.plan-message`, `.plan-header`, `.plan-task-list`, `.plan-task` | AI plan task list rendered in chat timeline (orange accent, status variants: in_progress / completed / failed) |
| `.chat-clarification`, `.clarification-header`, `.clarification-question`, `.clarification-q-text`, `.clarification-options`, `.clarification-option-btn` | Clarification Q&A block above chat input (blue accent, clickable option pills) |
| `.ce-root .search-panel-root` | Search panel container, input, result groups, file headers, result items, match highlight |
| `.ce-root .diff-viewer-monaco` | Diff viewer header bar with addition/deletion stat badges |
| `.ce-root .blame-gutter-wrap` | Blame gutter scroll container, individual rows (hash / author / date), commit popover |
| `.ce-root .git-branch-section` | Branch selector button, dropdown list, branch items, new-branch form |

---

## 11. New Routes

### Modified: `routes/api.php`

All new routes are under the `workspaces/{workspace}` group (auth:sanctum):

```php
// Files
GET  workspaces/{workspace}/files/search          WorkspaceController@search

// Git
GET  workspaces/{workspace}/git/blame             GitController@blame
GET  workspaces/{workspace}/git/diff-parsed       GitController@parsedDiff
GET  workspaces/{workspace}/git/branches          GitController@branches
POST workspaces/{workspace}/git/branch            GitController@createBranch
POST workspaces/{workspace}/git/checkout          GitController@checkout
```

---

## File Summary

| File | Status | Change |
|---|---|---|
| `app/Services/AI/AIOrchestrator.php` | **New** | Orchestration service — classify, PLAN/CLARIFY prefix generation & parsing, task list CRUD |
| `app/Models/AITaskList.php` | **New** | Eloquent model for `ai_task_lists` |
| `app/Models/AITask.php` | **New** | Eloquent model for `ai_tasks` |
| `database/migrations/2026_02_23_000001_create_ai_task_lists_table.php` | **New** | Migration for `ai_task_lists` |
| `database/migrations/2026_02_23_000002_create_ai_tasks_table.php` | **New** | Migration for `ai_tasks` |
| `app/Services/AI/AIManager.php` | Modified | Accepts `extra_system` and appends it to system prompt |
| `app/Http/Controllers/Workspace/AICommandController.php` | Modified | Injects orchestrator, buffers first-line for prefix detection, fires `plan_created` / `clarification_needed` SSE events |
| `app/Services/Git/GitService.php` | Modified | Added `blame` to allowed commands |
| `app/Http/Controllers/Workspace/GitController.php` | Modified | 5 new methods: `blame`, `parsedDiff`, `branches`, `createBranch`, `checkout`; 2 parse helpers |
| `app/Http/Controllers/Workspace/WorkspaceController.php` | Modified | `search()` + `searchDirectory()` helper |
| `routes/api.php` | Modified | 6 new workspace routes |
| `resources/js/Admin/components/CodeEditor/EditorBreadcrumb.jsx` | **New** | File path breadcrumb with extension color-coding and `actions` slot |
| `resources/js/Admin/components/CodeEditor/SearchPanel.jsx` | **New** | Global workspace search panel with grouped results and match highlighting |
| `resources/js/Admin/components/CodeEditor/DiffViewer.jsx` | **New** | Monaco DiffEditor view — reconstructs original from diff hunks |
| `resources/js/Admin/components/CodeEditor/BlameGutter.jsx` | **New** | Git blame gutter with Monaco scroll sync and commit popover |
| `resources/js/Admin/components/CodeEditor/Terminal.jsx` | Modified | Refactored to multi-tab: `TerminalInstance` + `Terminal` container with `+` / close tab controls |
| `resources/js/Admin/components/CodeEditor/MonacoEditor.jsx` | Modified | `onEditorMount`, `onScrollChange` props; Ctrl+G, Shift+Alt+F shortcuts |
| `resources/js/Admin/components/CodeEditor/GitPanel.jsx` | Modified | Branch section (dropdown, checkout, new-branch form); `≠` diff buttons on changed files |
| `resources/js/Admin/views/admin/apps/code-editor/CodeEditor.jsx` | Modified | Wires Search, Diff, Blame, Branch; dynamic status bar branch; `monacoEditorRef`; scroll-to-line on result click |
| `resources/js/Admin/components/CodeEditor/AIChatPanel.jsx` | Modified | Handles `plan_created` and `clarification_needed` SSE events; renders plan task list and clarification Q&A UI |
| `public/assets/scss/components/_code-editor.scss` | Modified | +415 lines: plan, clarification, search, diff, blame gutter, branch section styles |
