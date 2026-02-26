# Code Editor — Full Feature Documentation
> Session date: 2026-02-23 · Branch: `main` · Status: uncommitted

This document describes everything built during this development session on the **XD Studios Laravel CMS Code Editor**. It is written to be understood by everyone on the team — designers, engineers, and project managers alike.

---

## Table of Contents

1. [What We Built — Big Picture](#1-what-we-built--big-picture)
2. [Visual Layout & UI Architecture](#2-visual-layout--ui-architecture)
3. [Feature Breakdown](#3-feature-breakdown)
   - [3.1 Global File Search](#31-global-file-search)
   - [3.2 Git Diff Viewer](#32-git-diff-viewer)
   - [3.3 Git Blame Gutter](#33-git-blame-gutter)
   - [3.4 Branch Management](#34-branch-management)
   - [3.5 Multi-Tab Terminal](#35-multi-tab-terminal)
   - [3.6 Editor Breadcrumb](#36-editor-breadcrumb)
   - [3.7 AI Orchestration (Planning & Clarification)](#37-ai-orchestration-planning--clarification)
   - [3.8 Monaco Editor Enhancements](#38-monaco-editor-enhancements)
4. [Backend API Reference](#4-backend-api-reference)
5. [Data Flow Diagrams](#5-data-flow-diagrams)
6. [File Change Index](#6-file-change-index)
7. [Design System Reference](#7-design-system-reference)
8. [Database Schema Additions](#8-database-schema-additions)
9. [How to Run & Test](#9-how-to-run--test)

---

## 1. What We Built — Big Picture

The Code Editor is a fully in-browser IDE (like VS Code) built into the Laravel CMS admin panel. This session transformed it from a basic file editor into a professional-grade development environment.

### What existed before this session
- Monaco code editor (single tab)
- Basic file explorer (sidebar)
- AI chat panel (right sidebar)
- Simple single-tab terminal
- Basic git status/commit panel

### What we added this session

| Feature | Who cares | Summary |
|---|---|---|
| **Global Search** | Everyone | Search all files in your workspace instantly |
| **Diff Viewer** | Engineers | Visual side-by-side comparison of code changes |
| **Blame Gutter** | Engineers | See who wrote every line of code and when |
| **Branch Management** | Engineers | Create, switch, and manage git branches from the UI |
| **Multi-Tab Terminal** | Engineers | Run multiple terminal sessions simultaneously |
| **Editor Breadcrumb** | Designers / Engineers | Breadcrumb path bar with action buttons above the editor |
| **AI Planning** | Everyone | AI creates structured task plans for complex requests |
| **AI Clarification** | Everyone | AI asks questions when requests are vague |
| **Keyboard Shortcuts** | Engineers | Go-to-line, format document added to Monaco |

---

## 2. Visual Layout & UI Architecture

The editor is split into five major zones. Here is the full layout at a glance:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ACTIVITY BAR (44px)                                                        │
│  ┌──┐                                                                       │
│  │ 📁│  Explorer icon                                                       │
│  │ 🔍│  Search icon      ← NEW: switches left panel to Global Search       │
│  │ 𝌢  │  Git icon                                                           │
│  └──┘                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────┬─────────────────────────────────────────┬──────────────────────┐
│          │  EDITOR TABS (file tab bar)              │                      │
│  LEFT    ├─────────────────────────────────────────┤  RIGHT SIDEBAR       │
│ SIDEBAR  │  BREADCRUMB BAR    [Blame] [other btns] │  (400px)             │
│ (250px)  ├─────────────────────────────────────────┤                      │
│          │                                         │  ┌────────────────┐  │
│ 3 views: │         EDITOR CANVAS                   │  │  AI Chat Panel │  │
│          │                                         │  │                │  │
│ Explorer │  ┌──────────────────┬────────────────┐  │  │  ← Planning    │  │
│ (files)  │  │  MONACO EDITOR   │  BLAME GUTTER  │  │  │  ← Clarify    │  │
│          │  │  (code)          │  (200px)  NEW  │  │  └────────────────┘  │
│ Search   │  │                  │                │  │                      │
│ (NEW)    │  │  OR              │                │  │  OR Theme Panel      │
│          │  │  DIFF VIEWER NEW │                │  │  OR Approval Panel   │
│ Git      │  └──────────────────┴────────────────┘  │                      │
│ (branch  ├─────────────────────────────────────────┤                      │
│  mgmt    │  TERMINAL DOCK (collapsible)             │                      │
│  NEW)    │  ┌────────────────────────────────────┐  │                      │
│          │  │ Tab 1 × │ Tab 2 × │ + │             │  │                      │
│          │  │ $ _                                 │  │  ← Multi-tab NEW    │
│          │  └────────────────────────────────────┘  │                      │
│          ├─────────────────────────────────────────┤                      │
│          │  STATUS BAR: 🌿 main  |  PHP  |  UTF-8  |  LF                  │
└──────────┴─────────────────────────────────────────┴──────────────────────┘
```

### Left Panel — Three Views

```
ACTIVITY BAR     LEFT SIDEBAR CONTENT
  ┌───┐         ┌────────────────────────────────────┐
  │ 📁 │ ──────► │ EXPLORER (file tree)               │
  │   │ active  │  > src/                             │
  │   │         │    > components/                    │
  │   │         │      Button.jsx                     │
  └───┘         └────────────────────────────────────┘

  ┌───┐         ┌────────────────────────────────────┐
  │ 🔍 │ ──────► │ SEARCH (NEW)                       │
  │   │ active  │  ┌─────────────────────┐ [Aa] [.*] │
  │   │         │  │ search query...     │            │
  │   │         │  └─────────────────────┘            │
  │   │         │  > src/App.jsx (3 matches)          │
  │   │         │    12 │ const handleSearch = ()     │
  │   │         │    34 │ // search results           │
  └───┘         └────────────────────────────────────┘

  ┌───┐         ┌────────────────────────────────────┐
  │ 𝌢  │ ──────► │ GIT (enhanced)                     │
  │   │ active  │  Branch: [main ▼]  [+ New Branch]  │
  │   │         │  ──────────────────────────────     │
  │   │         │  CHANGES                            │
  │   │         │  M  src/App.jsx  [diff]             │
  │   │         │  A  src/NewFile.jsx                 │
  │   │         │  ──────────────────────────────     │
  │   │         │  COMMIT HISTORY                     │
  │   │         │  abc1234  Fix login bug  2d ago      │
  └───┘         └────────────────────────────────────┘
```

---

## 3. Feature Breakdown

---

### 3.1 Global File Search

**What it is:** A panel in the left sidebar that searches the text content of every file in your workspace instantly — like Ctrl+Shift+F in VS Code.

**For designers:** It looks like a compact search box with a list of results grouped under each file header. Each result shows a line number and a preview of the matching text.

**For managers:** This eliminates the need to manually open files to find where something is. Developers can locate any piece of code, content, or configuration across the entire project instantly.

**For engineers:** Debounced frontend (400ms), server-side recursive search with regex/case options, 200-result cap (10/file max), binary files skipped.

#### How it works

```
User types in Search box
       │
       ▼ (400ms debounce)
GET /api/workspaces/{id}/files/search
  ?query=handleLogin
  &case_sensitive=0
  &regex=0
       │
       ▼
Server scans workspace directory recursively
  - Skips: .git, node_modules, vendor, binary files, files >1MB
  - Matches: literal or regex per line
  - Max: 200 results total, 10 per file
       │
       ▼
Response: { results: [ { file, line, content, match } ] }
       │
       ▼
UI groups results by file, renders collapsible list
User clicks result → file opens in editor, scrolled to that line
```

#### Search UI controls

| Control | What it does |
|---|---|
| Text box | The search query |
| `Aa` toggle | Case-sensitive on/off |
| `.*` toggle | Regex mode on/off |
| File header | Click to expand/collapse that file's results |
| Result row | Click to open file at that exact line |

#### Component & backend files
- Frontend: `resources/js/Admin/components/CodeEditor/SearchPanel.jsx`
- Backend: `app/Http/Controllers/Workspace/WorkspaceController.php` → `search()` + `searchDirectory()`
- Route: `GET /api/workspaces/{id}/files/search`

---

### 3.2 Git Diff Viewer

**What it is:** A side-by-side (or inline) comparison of what changed in a file — showing old code on the left in red and new code on the right in green, powered by Monaco's built-in DiffEditor.

**For designers:** The diff view replaces the normal code editor canvas when triggered. It has a header showing the file name with green (+) and red (-) badges for line counts, plus Split/Inline toggle buttons.

**For managers:** This gives developers full visibility into every code change before committing. It removes the need to switch to a git client like GitKraken or the command line to review changes.

**For engineers:** Uses Monaco's `DiffEditor` in read-only mode. The backend parses `git diff` unified output into structured JSON (per-file, per-hunk, per-line). The frontend reconstructs the original version by replaying hunks in reverse.

#### How it works

```
User clicks [diff] button on a changed file in Git panel
       │
       ▼
CodeEditor switches centerView = 'diff'
       │
GET /api/workspaces/{id}/git/diff-parsed
  ?file=src/App.jsx
  &staged=0
       │
       ▼
Server runs: git diff -- src/App.jsx
Parses unified diff output into:
{
  files: [{
    file: "src/App.jsx",
    additions: 12,
    deletions: 3,
    hunks: [{
      old_start: 45, new_start: 45,
      lines: [
        { type: "context", content: "  const x = 1;" },
        { type: "removed", content: "  return null;" },
        { type: "added",   content: "  return <App />;" }
      ]
    }]
  }]
}
       │
       ▼
DiffViewer.jsx also fetches current file content
Reconstructs "original" by replaying hunks in reverse
Passes both versions to Monaco DiffEditor
       │
       ▼
Monaco renders side-by-side diff with syntax highlighting
```

#### Diff modes

```
SPLIT VIEW (default):               INLINE VIEW:
┌─────────────┬─────────────┐       ┌─────────────────────────┐
│ ORIGINAL    │ MODIFIED    │       │ src/App.jsx             │
│ (before)    │ (after)     │       ├─────────────────────────┤
├─────────────┼─────────────┤       │   const x = 1;         │
│ const x = 1 │ const x = 1 │       │ - return null;          │
│ return null;│ return <App>│       │ + return <App />;       │
└─────────────┴─────────────┘       └─────────────────────────┘
```

#### Component & backend files
- Frontend: `resources/js/Admin/components/CodeEditor/DiffViewer.jsx`
- Backend: `app/Http/Controllers/Workspace/GitController.php` → `parsedDiff()` + `parseUnifiedDiff()`
- Route: `GET /api/workspaces/{id}/git/diff-parsed`

---

### 3.3 Git Blame Gutter

**What it is:** A 200px sidebar that appears to the right of the code editor showing who last modified each line of code, when, and in which commit — like VS Code's GitLens extension.

**For designers:** Each row in the blame gutter aligns exactly with a line in the code editor. Each commit gets a unique color (generated from its hash). Hovering or clicking a row shows a popover with the full commit details.

**For managers:** This answers the classic "who changed this and why?" question instantly, without leaving the editor. Great for code reviews and debugging regressions.

**For engineers:** Gutter is a separate React div, 200px wide, synced to Monaco's `onDidScrollChange` event. Colors are generated as `hsl(hash % 360, 70%, 55%)`. Click opens a popover with hash, author, email, date, commit message.

#### Visual anatomy

```
CODE EDITOR                    BLAME GUTTER (200px)
┌─────────────────────────┐   ┌─────────────────────────┐
│  1  function App() {    │   │ ██ a1b2c3 John  2d ago  │  ← color per commit
│  2    const x = 1;      │   │ ██ a1b2c3 John  2d ago  │  ← same commit = same color
│  3    return null;      │   │ ██ f4e5d6 Sarah 1w ago  │  ← different commit = different color
│  4  }                   │   │ ██ f4e5d6 Sarah 1w ago  │
│  5                      │   │                         │
└─────────────────────────┘   └─────────────────────────┘

On click:
┌─────────────────────────────────┐
│ ██ f4e5d6  Fix null return bug  │  ← hash-colored header
├─────────────────────────────────┤
│ Author:  Sarah Connor           │
│ Email:   sarah@company.com      │
│ Date:    Feb 16, 2026           │
│ Commit:  f4e5d6ab...            │
└─────────────────────────────────┘
```

#### How the blame toggle works

```
User clicks [Blame] button in breadcrumb bar
       │
       ▼
GET /api/workspaces/{id}/git/blame?file=src/App.jsx
       │
       ▼
Server runs: git blame --line-porcelain -- src/App.jsx
Parses output into array:
[
  { hash, author, email, timestamp, summary },  ← line 1
  { hash, author, email, timestamp, summary },  ← line 2
  ...
]
       │
       ▼
BlameGutter renders 200px div next to Monaco editor
Each row height = Monaco line height
Monaco scroll events keep gutter in sync
```

#### Component & backend files
- Frontend: `resources/js/Admin/components/CodeEditor/BlameGutter.jsx`
- Toggle button passed via `EditorBreadcrumb`'s `actions` prop
- Backend: `app/Http/Controllers/Workspace/GitController.php` → `blame()` + `parseBlame()`
- Route: `GET /api/workspaces/{id}/git/blame`

---

### 3.4 Branch Management

**What it is:** A full branch management UI built into the Git panel — list all branches, switch between them, and create new ones, all without leaving the editor.

**For designers:** The branch section sits at the top of the Git panel with a dropdown showing all branches, a checkout button, and a form to create a new branch.

**For managers:** Developers no longer need to drop to the command line just to switch branches. This keeps them in the editor and reduces context-switching.

**For engineers:** Fetches branches on panel open (`GET /git/branches`), checkout posts to `/git/checkout`, create posts to `/git/branch`. Local branches and remote branches (`remotes/origin/...`) are listed separately in the dropdown.

#### Branch panel layout

```
┌────────────────────────────────────────────────┐
│  GIT PANEL                                     │
├────────────────────────────────────────────────┤
│  BRANCH                                        │
│  ┌─────────────────────────────────┐  [Switch] │
│  │ main ▼                          │           │
│  ├─────────────────────────────────┤           │
│  │ LOCAL                           │           │
│  │   ✓ main (current)              │           │
│  │     feature/login               │           │
│  │ REMOTE                          │           │
│  │     remotes/origin/main         │           │
│  └─────────────────────────────────┘           │
│  [+ New Branch]                                │
│  ┌──────────────────────────────────┐          │
│  │ branch-name...                   │ [Create] │
│  └──────────────────────────────────┘          │
├────────────────────────────────────────────────┤
│  CHANGES                                       │
│  ...                                           │
```

#### API routes added

| Method | Route | Action |
|---|---|---|
| `GET` | `/git/branches` | List all branches + current |
| `POST` | `/git/branch` | Create new branch from HEAD |
| `POST` | `/git/checkout` | Switch to a branch |

#### Component & backend files
- Frontend: `resources/js/Admin/components/CodeEditor/GitPanel.jsx`
- Backend: `app/Http/Controllers/Workspace/GitController.php`
- Routes: `GET /git/branches`, `POST /git/branch`, `POST /git/checkout`

---

### 3.5 Multi-Tab Terminal

**What it is:** The bottom terminal dock now supports multiple terminal sessions in tabs — each with its own command history, working directory, and streaming output.

**For designers:** The terminal header now shows tabs with close buttons (×) and a `+` button to open a new tab. Each tab is a full independent terminal session.

**For managers:** Developers often need to run a dev server in one terminal while running other commands in another. This removes the need to open a separate terminal window.

**For engineers:** Two components — `Terminal` (container, manages tab state) and `TerminalInstance` (single session). Each instance maintains its own `history`, `command`, `executing`, and `currentDir` state. Command execution streams via SSE (`stdout`, `stderr`, `exit` events). Arrow Up/Down cycles command history per-tab.

#### Terminal architecture

```
Terminal (container)
├── state: tabs[], activeId
├── [+ button] → addTab()
│
├── TerminalInstance (Tab 1)
│   ├── state: history[], command, executing, currentDir
│   ├── keyboard: ↑↓ history, Ctrl+L clear, Ctrl+C abort
│   └── POST /terminal/execute-stream → SSE: stdout/stderr/exit
│
├── TerminalInstance (Tab 2)
│   └── (independent session)
│
└── ...
```

#### Tab bar layout

```
┌─────────────────────────────────────────────────────────┐
│ TERMINAL                                                 │
├──────────┬──────────┬──────────┬───┬─────────────────── │
│ Terminal1 × │ Terminal2 × │ Terminal3 × │ + │            │
├──────────────────────────────────────────────────────── │
│ /workspace/project $                                    │
│ $ npm run dev                                           │
│ > vite@5.0.0                                            │
│ > Local: http://localhost:5173/                         │
│ $ _                                                     │
└─────────────────────────────────────────────────────────┘
```

#### Component & backend files
- Frontend: `resources/js/Admin/components/CodeEditor/Terminal.jsx`
- Backend: terminal execution endpoint (pre-existing, streams via SSE)

---

### 3.6 Editor Breadcrumb

**What it is:** A bar just above the code editor canvas that shows the current file's path as clickable segments, with an unsaved dot indicator and a right-side area for action buttons.

**For designers:** Segments are separated by `›` chevrons. The file segment has color coding per language (JS = yellow, TS = blue, PHP = purple, etc.). An orange dot appears on the filename when there are unsaved changes. The right side currently holds the Blame toggle button.

**For engineers:** A simple presentational component. It receives `activeTab` (current file state) and an `actions` prop which accepts any JSX — this is how the Blame button is injected from the parent `CodeEditor`.

#### Breadcrumb anatomy

```
src  ›  components  ›  CodeEditor  ›  MonacoEditor.jsx •    [Blame ▪]
│         │               │               │               │
segment  segment        segment         file name         actions slot
                                       (orange dot = unsaved)
```

#### Language color coding

| Language | Color |
|---|---|
| JS / JSX | `#f7df1e` (yellow) |
| TS / TSX | `#3178c6` (blue) |
| PHP | `#8892be` (purple) |
| SCSS / CSS | `#cc6699` (pink) |
| JSON | `#a8c023` (green-yellow) |
| HTML | `#e44d26` (orange-red) |
| Markdown | `#c9d1d9` (grey) |

#### Component file
- Frontend: `resources/js/Admin/components/CodeEditor/EditorBreadcrumb.jsx`

---

### 3.7 AI Orchestration (Planning & Clarification)

**What it is:** The AI assistant can now respond to complex or vague requests with either a structured task plan or clarifying questions — instead of blindly guessing what to do.

**For designers:**
- **Clarification UI:** A card appears above the chat input with the AI's questions. Each question can have option chips to click. This replaces having to re-type a better prompt.
- **Plan UI:** When a plan is created, a task list card appears in the chat timeline showing numbered tasks with statuses.

**For managers:** This makes the AI assistant more reliable and transparent. For large requests ("build me a full authentication system"), it breaks the work into visible, trackable steps. For vague requests ("fix it"), it asks what "it" means before acting.

**For engineers:** `AIOrchestrator.php` classifies the message before the stream starts. It checks for planning triggers (keywords like "build", "create a full", "implement") and vagueness (< 4 words). If either is true, it appends instructions to the system prompt telling the AI to prefix its response with `PLAN: {json}` or `CLARIFY: {json}`. The controller buffers the first line of the stream to detect these prefixes before forwarding chunks to the client. On detection, a special SSE event (`plan_created` or `clarification_needed`) is fired with the parsed data.

#### Classification logic

```
Incoming message: "build me a full auth system with 2FA"

AIOrchestrator::classify($message)
  checks planning triggers:
    "build" ✓, "full" ✓  → needs_planning = true
  checks vagueness:
    6 words → is_vague = false

→ returns { needs_planning: true, is_vague: false }

AIOrchestrator::getOrchestratorSystemAddendum(true, false)
→ appends to system prompt:
  "If the user is asking you to build something complex,
   start your response with PLAN: followed by a JSON task list..."
```

#### Plan response flow

```
AI Response (raw stream starts):
"PLAN: {"tasks":[{"title":"Install packages","description":"..."},...]}\n
 Now let me start on task 1..."

Controller detects PLAN: prefix on first line
Parses JSON → calls AIOrchestrator::createTaskList()
Saves to DB (ai_task_lists + ai_tasks tables)
Fires SSE event: plan_created { task_list_id, tasks: [...] }

Remaining stream chunks sent normally as "chunk" events

AIChatPanel receives plan_created:
→ renders task list card in chat timeline

┌────────────────────────────────────────────────────┐
│ 📋 TASK PLAN                                       │
├────────────────────────────────────────────────────┤
│  ○  1. Install packages                            │
│  ○  2. Create User model                           │
│  ○  3. Build login controller                      │
│  ○  4. Set up 2FA middleware                       │
│  ○  5. Create Blade views                          │
└────────────────────────────────────────────────────┘
```

#### Clarification flow

```
User message: "fix it"
  → is_vague = true (2 words)

AI response starts with:
"CLARIFY: {"questions":[{"id":"q1","text":"What should I fix?","options":["The login bug","The layout","Something else"]}]}\n"

Controller fires: clarification_needed { questions: [...] }

AIChatPanel renders above chat input:

┌────────────────────────────────────────────────────┐
│  💬 Before I start, I need to clarify:             │
│                                                    │
│  What should I fix?                                │
│  [The login bug]  [The layout]  [Something else]  │
└────────────────────────────────────────────────────┘
```

#### Files involved
- Backend service: `app/Services/AI/AIOrchestrator.php`
- Controller: `app/Http/Controllers/Workspace/AICommandController.php`
- Models: `app/Models/AITaskList.php`, `app/Models/AITask.php`
- Migrations: `database/migrations/2026_02_23_000001_create_ai_task_lists_table.php`
- Migrations: `database/migrations/2026_02_23_000002_create_ai_tasks_table.php`
- Frontend: `resources/js/Admin/components/CodeEditor/AIChatPanel.jsx`

---

### 3.8 Monaco Editor Enhancements

**What it is:** Quality-of-life improvements to the main code editor — two new keyboard shortcuts and two new callback hooks for other components to plug into.

**For engineers:**

| Addition | Details |
|---|---|
| `Ctrl+G` | Go to line — opens Monaco's built-in line jump dialog |
| `Shift+Alt+F` | Format document — runs Monaco's built-in code formatter |
| `onEditorMount(editor, monaco)` prop | Parent gets the raw Monaco editor instance on load |
| `onScrollChange(scrollTop, lineHeight)` prop | Parent gets scroll position on every scroll event |

The two new props (`onEditorMount` + `onScrollChange`) are what enable the Blame Gutter to stay in sync with the editor scroll position, and what allow `CodeEditor` to imperatively scroll to a specific line when a search result is clicked.

#### Component file
- Frontend: `resources/js/Admin/components/CodeEditor/MonacoEditor.jsx`

---

## 4. Backend API Reference

All routes are prefixed with `/api` and require authentication.

### Workspace File Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/workspaces/{id}/files` | List all files recursively |
| `GET` | `/workspaces/{id}/files/list` | List a single directory |
| `GET` | `/workspaces/{id}/files/read` | Read file content |
| `POST` | `/workspaces/{id}/files/write` | Save file content |
| `POST` | `/workspaces/{id}/files/create` | Create file or folder |
| `DELETE` | `/workspaces/{id}/files` | Delete file or folder |
| `POST` | `/workspaces/{id}/files/rename` | Rename file or folder |
| `GET` | `/workspaces/{id}/files/search` | **NEW** — Full-text search |

### Git Routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/workspaces/{id}/git/init` | Initialise git repo |
| `GET` | `/workspaces/{id}/git/status` | Current status |
| `POST` | `/workspaces/{id}/git/add` | Stage files |
| `POST` | `/workspaces/{id}/git/commit` | Commit staged changes |
| `POST` | `/workspaces/{id}/git/push` | Push to origin |
| `POST` | `/workspaces/{id}/git/pull` | Pull from origin |
| `GET` | `/workspaces/{id}/git/log` | Commit history |
| `GET` | `/workspaces/{id}/git/diff` | Raw diff output |
| `GET` | `/workspaces/{id}/git/diff-parsed` | **NEW** — Structured diff JSON |
| `GET` | `/workspaces/{id}/git/blame` | **NEW** — Line-by-line blame |
| `GET` | `/workspaces/{id}/git/branches` | **NEW** — List all branches |
| `POST` | `/workspaces/{id}/git/branch` | **NEW** — Create branch |
| `POST` | `/workspaces/{id}/git/checkout` | **NEW** — Switch branch |

### AI Routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/workspaces/{id}/ai/chat-stream` | **ENHANCED** — Streaming AI with orchestration |
| `POST` | `/workspaces/{id}/ai/chat` | Non-streaming AI fallback |
| `GET` | `/workspaces/{id}/ai/conversations` | List saved conversations |
| `GET` | `/workspaces/{id}/ai/conversations/{id}` | Load conversation history |
| `POST` | `/workspaces/{id}/ai/conversations/{id}/cancel` | Cancel stream |
| `GET` | `/workspaces/{id}/ai/pending-approvals` | Pending change approvals |
| `POST` | `/workspaces/{id}/ai/approvals/{id}/approve` | Approve AI changes |
| `POST` | `/workspaces/{id}/ai/approvals/{id}/reject` | Reject AI changes |

---

## 5. Data Flow Diagrams

### Search flow

```
[User]──types──►[SearchPanel]──400ms──►GET /files/search
                                              │
                                    [WorkspaceController]
                                    searchDirectory() recursively
                                    skips binary, node_modules, .git
                                              │
                                    { results: [{file,line,content}] }
                                              │
                     [SearchPanel]◄───────────┘
                     groups by file, renders list
                              │
                     User clicks result
                              │
                     [CodeEditor] handleFileSelect(path)
                              │
                     GET /files/read → tab opens
                              │
                     pendingScrollLineRef = lineNumber
                              │
                     Monaco scrolls to line
```

### Diff viewer flow

```
[User]──clicks [diff]──►[GitPanel] calls onOpenDiff(file, 'unstaged')
                                  │
                         [CodeEditor] sets centerView='diff'
                                  │
                         [DiffViewer] mounts
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
            GET /git/diff-parsed         GET /files/read
            (structured hunks)           (current content)
                    │                           │
                    └──────────┬────────────────┘
                               │
                    reconstructOriginal(content, hunks)
                    (reverse-apply hunks to recover old version)
                               │
                    Monaco DiffEditor(original, modified)
                               │
                    Renders side-by-side diff
```

### Blame flow

```
[User]──clicks [Blame]──►[CodeEditor] handleBlameToggle()
                                  │
                         GET /git/blame?file=path
                                  │
                         [GitController] blame()
                         git blame --line-porcelain
                         parseBlame() → [{hash,author,timestamp,...}]
                                  │
                         [BlameGutter] renders 200px div
                         Each row = one line of blame
                                  │
                         Monaco.onDidScrollChange
                         → gutter.scrollTop = editor.scrollTop
                                  (perfect sync)
```

### AI Orchestration flow

```
[User]──sends message──►[AIChatPanel]
                                  │
                         POST /ai/chat-stream
                                  │
                         [AICommandController]
                                  │
                         AIOrchestrator::classify(message)
                         ┌────────────┬────────────┐
                         │ complex?   │   vague?   │
                         └────────────┴────────────┘
                                  │
                         build extra_system prompt addendum
                                  │
                         AIManager::chatWithCodeStream(extra_system)
                                  │
                         AI streams response...
                                  │
                    ┌─────────────┴──────────────┐
                    │ First line = "PLAN: {...}"  │ or "CLARIFY: {...}"
                    │ or normal text              │
                    └─────────────────────────────┘
                                  │
                    if PLAN: → createTaskList() → fire plan_created SSE
                    if CLARIFY: → fire clarification_needed SSE
                    always → stream chunks as "chunk" SSE
                                  │
                    [AIChatPanel] handles SSE events:
                    plan_created → render task list in timeline
                    clarification_needed → render Q&A above input
                    chunk → accumulate to streaming message
```

---

## 6. File Change Index

### New files

```
app/
  Models/
    AITask.php                               ← new Eloquent model
    AITaskList.php                           ← new Eloquent model
  Services/
    AI/
      AIOrchestrator.php                     ← new orchestration service

database/migrations/
  2026_02_23_000001_create_ai_task_lists_table.php   ← new migration
  2026_02_23_000002_create_ai_tasks_table.php        ← new migration

resources/js/Admin/components/CodeEditor/
  SearchPanel.jsx                            ← new component
  DiffViewer.jsx                             ← new component
  BlameGutter.jsx                            ← new component
  EditorBreadcrumb.jsx                       ← new component

CHANGELOG.md                                 ← new doc
LOCAL_SETUP.md                               ← new doc
```

### Modified files

```
app/Http/Controllers/Workspace/
  AICommandController.php    — orchestrator injection, prefix buffering, plan/clarify SSE events
  GitController.php          — blame(), parsedDiff(), branches(), createBranch(), checkout()
  WorkspaceController.php    — search() + searchDirectory()

app/Services/AI/
  AIManager.php              — extra_system param support

app/Services/Git/
  GitService.php             — 'blame' added to allowedCommands

routes/api.php               — 6 new routes

public/assets/scss/components/
  _code-editor.scss          — +415 lines: all new component styles

resources/js/Admin/components/CodeEditor/
  AIChatPanel.jsx            — plan_created + clarification_needed SSE handling
  GitPanel.jsx               — branch management UI, onOpenDiff wiring
  MonacoEditor.jsx           — onEditorMount, onScrollChange, Ctrl+G, Shift+Alt+F
  Terminal.jsx               — multi-tab architecture refactor

resources/js/Admin/views/admin/apps/code-editor/
  CodeEditor.jsx             — integrates all new components, leftView/centerView state

package-lock.json            — dependency lock updated
```

---

## 7. Design System Reference

All editor styles live under the `.ce-root` namespace to avoid collisions with the rest of the admin panel.

### Color palette

```
Background layers (darkest → lightest):
  #0a0c0f  — terminal background
  #0d0f14  — activity bar, sidebar, right panel
  #161b22  — editor canvas / code area
  #1c2128  — borders (primary)
  #30363d  — borders (secondary), scrollbar thumb

Text:
  #484f58  — very dim (placeholder, disabled)
  #8b949e  — dim text (secondary labels, line numbers)
  #c9d1d9  — main body text
  #e6edf3  — bright / heading text

Accent:
  #ff6b35  — orange (active icons, highlights, cursor)
  #ff9f1c  — orange-yellow (gradient partner)

Semantic:
  #3fb950  — green (additions, success)
  #f85149  — red (deletions, errors)
  #388bfd  — blue (links, info)
  #d29922  — yellow (warnings)
```

### Typography

```
Font: JetBrains Mono (loaded via Google Fonts)
  — used for all code, terminal, blame gutter, diff viewer

Font sizes:
  Editor code:    14px
  Terminal:       13px
  UI labels:      12px
  Breadcrumb:     13px
  Status bar:     12px
```

### Spacing & sizing

```
Activity bar width:     44px
Left sidebar default:   250px (resizable via drag)
Right sidebar:          400px (fixed)
Blame gutter:           200px
Status bar height:      24px
Tab bar height:         35px
Breadcrumb height:      28px
Terminal tab bar:        32px
```

---

## 8. Database Schema Additions

Two new tables support the AI task orchestration system. Run `php artisan migrate` to apply.

### `ai_task_lists`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | Auto-increment |
| `conversation_id` | bigint FK | Links to `ai_conversations` |
| `status` | enum | `pending`, `in_progress`, `completed` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `ai_tasks`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | Auto-increment |
| `task_list_id` | bigint FK | Links to `ai_task_lists` |
| `order` | integer | Display order (1-based) |
| `title` | string | Short task title |
| `description` | text | Detailed description |
| `status` | enum | `pending`, `in_progress`, `completed`, `failed` |
| `result` | JSON / null | Output data after completion |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

## 9. How to Run & Test

### Prerequisites
- PHP 8.5.1 (`C:\php`)
- MySQL running at `127.0.0.1:3306`, database `laravel`
- Node.js / npm

### Run migrations (for new AI tables)

```bash
php artisan migrate
```

### Build frontend assets

```bash
npm run dev        # development with hot reload
npm run build      # production build
```

### Test new features manually

| Feature | How to test |
|---|---|
| **Global Search** | Click the search icon (🔍) in the activity bar → type a query |
| **Diff Viewer** | Open Git panel → click `[diff]` next to any modified file |
| **Blame Gutter** | Open a file → click `[Blame]` in the breadcrumb bar |
| **Branch Management** | Open Git panel → use the branch dropdown at the top |
| **Multi-Tab Terminal** | Open terminal → click `+` to add a second tab |
| **AI Planning** | Ask AI something complex: *"build me a full login system"* |
| **AI Clarification** | Ask AI something vague: *"fix it"* |
| **Ctrl+G** | Focus code editor → press Ctrl+G → type a line number |
| **Shift+Alt+F** | Focus code editor → press Shift+Alt+F → code formats |

### Backend routes to verify

```bash
# Search
GET /api/workspaces/1/files/search?query=handleLogin

# Blame
GET /api/workspaces/1/git/blame?file=src/App.jsx

# Diff (parsed)
GET /api/workspaces/1/git/diff-parsed?file=src/App.jsx&staged=0

# Branches
GET /api/workspaces/1/git/branches

# Create branch
POST /api/workspaces/1/git/branch  { "name": "feature/my-feature" }

# Checkout
POST /api/workspaces/1/git/checkout  { "branch": "feature/my-feature" }
```

---

*Document generated 2026-02-23 · XD Studios Laravel CMS*
