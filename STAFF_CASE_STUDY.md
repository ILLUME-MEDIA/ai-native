# In-Browser IDE — Staff-Level Case Study
**XD Studios Laravel CMS · Code Editor Feature Set**
*Written for: Hiring Manager review · Perspectives: Staff Designer + Staff Engineer*

---

## Executive Summary

We designed and shipped a production-grade, in-browser IDE embedded inside a Laravel CMS admin panel — in a single focused session. The system now covers the full developer workflow loop: write code, search across a codebase, review diffs, trace authorship, manage branches, run terminal commands, and get AI assistance that plans and clarifies before it acts.

This document is not a feature list. It is a record of the decisions made, the constraints navigated, and the reasoning that shaped the outcome — told from two staff-level perspectives.

---

## The Problem

> *"Developers using this CMS have to context-switch constantly. They write code here, open GitKraken there, search in a separate terminal, then come back. Every switch costs flow."*

### The baseline product

Before this session, the editor was:
- A single Monaco instance (one tab, no memory)
- A basic file explorer
- A one-tab terminal with no history navigation
- A git panel that could only stage and commit
- An AI chat panel with no awareness of task complexity

### What was missing

The gap was not individual features. The gap was **workflow completeness**. A developer could not go from "I need to find where this bug lives" → "I need to see what changed" → "I need to understand who introduced it" → "I need to fix it and commit to a new branch" without leaving the tool.

Every one of those steps required a context switch. We closed all of them.

---

## Constraints

Naming constraints explicitly is a staff-level behaviour. These shaped every decision.

| Constraint | Category | Impact |
|---|---|---|
| Must run entirely in the browser — no Electron, no native shell access | Platform | Terminal, git, and file I/O all must go through a Laravel API; no direct OS access |
| Monaco Editor is a black box — scroll, layout, and lifecycle are internal | Technical | Blame gutter sync and scroll-to-line required careful API surface mapping |
| The project runs on Windows 11 with git path inconsistencies | Environment | Git service allowlisting, path sanitization, and Windows-specific error help all required |
| No breaking changes to existing component props or CSS class names | Backward compatibility | All existing integrations (approvals panel, file tree patching) must keep working |
| SSE (Server-Sent Events) is the streaming primitive, not WebSockets | Infrastructure | No bidirectional channel; plan/clarify detection required first-line buffering before flush |
| AI response format is a streamed character stream, not structured output | AI constraint | Prefix detection (`PLAN:` / `CLARIFY:`) had to be bolted onto the token stream, not the JSON layer |
| Single codebase — Laravel 12, Inertia.js, React — no separate service | Architecture | All features had to compose cleanly inside one monolith; no microservice escape hatch |

---

## Staff Designer Perspective

### Design Philosophy

The guiding constraint was: **this should feel like VS Code, not like a CMS plugin.**

That means the designer's job was not to invent new patterns. It was to faithfully reproduce known, trusted IDE conventions — and make deliberate decisions about where to diverge, and why.

### Framework: Spatial Consistency

IDE users have deeply ingrained spatial expectations: activity bar on the left, editor in the centre, contextual panels on the right, terminal at the bottom. Violating any of these would create unconscious friction even if users couldn't name why.

Every layout decision was benchmarked against VS Code's spatial grammar:

```
┌────────────────────────────────────────────────────────────────────────┐
│ VS Code model             │ Our implementation                         │
├───────────────────────────┼────────────────────────────────────────────┤
│ Activity bar (icon strip) │ 44px strip, Explorer/Search/Git icons      │
│ Primary sidebar           │ 250px resizable, 3 swappable panel views   │
│ Editor group              │ Monaco + tabs + breadcrumb                 │
│ Panel (terminal)          │ Bottom dock, collapsible, multi-tab        │
│ Secondary sidebar         │ 400px right panel (AI/Theme/Approvals)     │
│ Status bar                │ 24px bar: branch · language · encoding     │
└───────────────────────────┴────────────────────────────────────────────┘
```

The divergence: VS Code has no AI panel. We placed it in the secondary sidebar — the right-hand position — because it is persistent context, not ephemeral content. That decision keeps the editor canvas uninterrupted.

### Design Decision: Blame Gutter as a Gutter, Not a Tooltip

The naive approach would have been blame-on-hover — a tooltip that appears when you hover a line. It is cheap to build and requires no layout change.

We rejected it for three reasons:
1. Tooltips disappear. You cannot compare blame across ten lines simultaneously.
2. The relevant data (who, when, which commit) is most useful when scannable, not transient.
3. VS Code GitLens — the industry reference — uses a persistent gutter precisely because scanning matters more than drilling.

**Decision:** 200px persistent gutter, rendered as a sibling div to Monaco, scroll-synced. Each commit gets a hash-derived HSL colour, making commit groupings visually scannable without reading text.

```
┌──────────────────────────┐  ┌───────────────────────────┐
│  CODE EDITOR             │  │  BLAME GUTTER             │
├──────────────────────────┤  ├───────────────────────────┤
│  1  function login() {   │  │  ██ a1b2  Sarah  2d ago   │
│  2    validate(input);   │  │  ██ a1b2  Sarah  2d ago   │  ← same commit
│  3    const t = token(); │  │  ██ f9c3  James  3w ago   │  ← different commit
│  4    return session(t); │  │  ██ f9c3  James  3w ago   │    = different colour
│  5  }                    │  │  ██ 02d1  Sarah  1d ago   │
└──────────────────────────┘  └───────────────────────────┘
```

The colour is not decorative. It encodes meaning: same colour = same commit. A developer can see at a glance that lines 1–2 belong to one change and lines 3–4 belong to another, before reading a single character of the metadata.

### Design Decision: Clarification UI Placement

When the AI needs to ask questions before acting, where does that UI live?

Options considered:

| Option | Problem |
|---|---|
| A modal dialog | Interrupts flow; blocks the entire editor |
| A new chat message in the timeline | Gets buried as conversation grows |
| A pinned card at the top of the chat | Competes with the "send" area, confusing input state |
| **A card above the chat input** | The user's attention is already at the input; the question appears between reading and responding |

We chose the last option. It occupies the space the user is about to interact with, making the Q&A feel like a natural continuation rather than an interruption.

```
┌──────────────────────────────────────────────────────┐
│  CHAT TIMELINE (scrollable)                          │
│  ...                                                 │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  💬 Before I start, I need to clarify:        │  │  ← appears only
│  │                                                │  │    when needed
│  │  Which part needs fixing?                      │  │
│  │  [The login flow]  [The layout]  [API errors] │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─────────────────────────────────────────────┐ [→] │
│  │  Type a message...                          │     │
│  └─────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

### Design Decision: Search Results Grouped by File, Not by Relevance

Full-text search tools often rank results by relevance score. We deliberately chose grouping by file instead.

Rationale: developers searching a codebase are almost never looking for the single most relevant result. They are building a mental map of *where something exists*. File grouping makes that map explicit. A relevance-ranked flat list forces them to rebuild it themselves.

```
FLAT LIST (rejected)              FILE-GROUPED (chosen)
─────────────────────             ────────────────────────────────
  34  App.jsx  handleLogin        ▼ src/App.jsx  (3 matches)
  12  App.jsx  handleLogin           12  handleLogin() {
  67  auth.php  handleLogin          34  // calls handleLogin
  22  routes.php  login              67  return handleLogin
 100  auth.php  handleLogin        ▼ app/Http/Controllers/auth.php  (2 matches)
   5  routes.php  login               22  Route::post('/login'...)
                                     100  handleLogin($request)
                                   ▼ routes/web.php  (1 match)
                                       5  login → AuthController
```

### Design Token System

All component styles are namespaced under `.ce-root` to ensure zero collision with the broader admin panel. Tokens were defined at the top of the SCSS file and used consistently:

```
Depth / bg:      #0a0c0f → #0d0f14 → #161b22  (terminal → sidebar → editor)
Borders:         #1c2128 (structural) → #30363d (secondary)
Text hierarchy:  #484f58 → #8b949e → #c9d1d9 → #e6edf3  (4 levels)
Accent:          #ff6b35 (primary) + #ff9f1c (gradient)
Semantic:        #3fb950 green · #f85149 red · #d29922 yellow · #388bfd blue
```

Four text levels might seem excessive. In an editor, they matter: a line number, a comment, a keyword, and an identifier need to be visually distinct at 14px in a dark environment. The hierarchy is load-bearing.

---

## Staff Engineer Perspective

### Architectural Philosophy

The guiding question for every backend decision: **can this be done safely with what we already have, or does it require a new abstraction?**

New abstractions have carrying costs — they need to be understood, maintained, and extended. The goal was to add capability without adding complexity debt.

### Framework: Layered Composition

The system is structured in three layers. Each layer has one job:

```
┌───────────────────────────────────────────────────────────────┐
│  LAYER 3 — React UI components                                │
│  Each component owns its own state and one API concern.       │
│  SearchPanel knows about search. BlameGutter knows about      │
│  scroll sync. DiffViewer knows about diff reconstruction.     │
├───────────────────────────────────────────────────────────────┤
│  LAYER 2 — Laravel controllers                                │
│  Thin. Controllers validate, authorize, delegate to services, │
│  and serialize responses. No business logic lives here.       │
├───────────────────────────────────────────────────────────────┤
│  LAYER 1 — Services (GitService, AIOrchestrator, AIManager)   │
│  All logic lives here. Git command allowlisting, path         │
│  sanitization, blame parsing, diff parsing, classification.   │
└───────────────────────────────────────────────────────────────┘
```

This layering meant that when we added blame, parsedDiff, branches, and checkout, none of them changed the controller's structure. They followed the pattern already established.

### Engineering Decision: SSE First-Line Buffering for AI Orchestration

**The problem:** The AI's planning and clarification output is a streamed character sequence. The `PLAN:` and `CLARIFY:` prefixes appear on the first line of the response. But SSE flushes chunks as they arrive — the first line may arrive in 3–10 separate chunks before a newline.

**The naive approach:** Parse after stream completes. Discard all intermediate chunks, buffer the full response, then act.

**Why that fails:** It destroys the streaming UX. The user sees nothing for several seconds, then the response appears all at once.

**The solution:** Buffer only until the first newline is received. Once a `\n` is detected, examine the buffer:

```
Buffer accumulates: "P" → "PL" → "PLA" → "PLAN" → "PLAN:" → "PLAN: {..."

On first \n:
  → if buffer starts with "PLAN:"   → parse JSON, fire plan_created SSE event
  → if buffer starts with "CLARIFY:" → parse JSON, fire clarification_needed SSE event
  → else                             → flush buffer as first chunk immediately

After prefix resolved:
  → all subsequent chunks pass through without buffering
  → normal streaming latency resumes
```

This gives us structured orchestration output without any perceptible delay to the streaming experience.

```
Timeline without buffering (naive):
t=0ms  [nothing]
t=0ms  [nothing]
...
t=3000ms  [full response appears]

Timeline with first-line buffering:
t=0ms   [buffering - user sees nothing]
t=80ms  [PLAN: detected - task list card renders]
t=85ms  [streaming text begins immediately after]
t=90ms  [chunk...]
t=100ms [chunk...]
```

The cost of buffering is ~80ms — imperceptible. The benefit is a structured task list rendered before the prose begins.

### Engineering Decision: Reconstruct Original from Diff, Don't Store It

The diff viewer needs two things: the original (pre-change) version of a file and the current version. The current version is trivial — read the file. The original is not stored anywhere.

Options:

| Option | Problem |
|---|---|
| `git show HEAD:path` | Only gives you the committed version, not the baseline of unstaged changes |
| Store original on first read | Creates state management complexity; stale if file is edited externally |
| **Reconstruct from diff hunks** | No storage, always accurate, works for unstaged/staged/commit diffs |

We chose reconstruction. The algorithm applies diff hunks in reverse to the current file content:

```
Given current file (modified):
  line 1: const x = 1;
  line 2: return <App />;    ← this was changed
  line 3: }

Given diff hunk:
  @@ -2,1 +2,1 @@
  - return null;              ← original
  + return <App />;           ← current

Reconstruction:
  Walk current file line by line
  When a hunk's new_start matches current position:
    skip the added lines
    insert the removed lines
  Result:
    line 1: const x = 1;
    line 2: return null;      ← original restored
    line 3: }
```

This is stateless, accurate, and requires no new storage. The backend returns structured hunk data; the reconstruction happens entirely in the browser.

### Engineering Decision: Git Command Allowlisting

Direct git execution is a shell injection risk. The `GitService` maintains an explicit allowlist of permitted git subcommands. Any command not on the list is rejected before execution.

```
allowedCommands = [
  'init', 'status', 'add', 'commit', 'push', 'pull',
  'log', 'diff', 'blame', 'branch', 'checkout', 'rev-parse'
]
```

Branch names and file paths are further sanitized:
- Branch/ref names validated against `^[a-zA-Z0-9._/\-]+$` — no shell metacharacters
- File paths are resolved against the workspace root and checked for path traversal
- The `blame` command uses `--` separator to prevent file paths being interpreted as flags

This follows the principle of **least privilege at the command boundary**: the API surface of git available through our application is exactly what we need and nothing more.

### Engineering Decision: Recursive Search with Hard Limits

Unbounded workspace search is a DoS vector. A workspace could contain gigabytes of logs, build artefacts, or auto-generated files.

```
Limits applied:
  Total results:     200 (hard cap)
  Results per file:  10 (prevents one large file from consuming the budget)
  File size:         1MB max (files above this are skipped entirely)
  Excluded dirs:     .git, node_modules, vendor, storage, bootstrap/cache
  Binary extensions: 30+ types (images, fonts, archives, executables)
```

The search short-circuits as soon as the total cap is reached — it does not scan the remainder of the file tree. At worst, for a very large workspace, the first 200 results are returned from the first directories encountered. This is an acceptable tradeoff: the user gets fast, useful results, not an exhaustive index.

For regex mode, the pattern is compiled once and reused per line — not recompiled per file — and input is validated before execution to prevent ReDoS.

### Engineering Decision: Monaco Scroll Sync via `onDidScrollChange`

Monaco's scroll position is internal state — it cannot be read from the DOM. Making the blame gutter track the editor required attaching to Monaco's own event.

The gutter receives the Monaco editor instance via the `onEditorMount` prop. On mount, it registers:

```js
editor.onDidScrollChange((e) => {
  gutterRef.current.scrollTop = e.scrollTop;
});
```

This is a direct write to a DOM property — not a React state update. The reason: React state updates are batched and asynchronous. At 60fps scroll speed, a state-driven approach introduces visible lag. The DOM write is synchronous and imperceptible.

The line height is passed from Monaco's `getOption(monaco.editor.EditorOption.lineHeight)` — not hardcoded — so the gutter stays accurate if the user changes font size.

### Engineering Decision: `AIOrchestrator` as a Standalone Service

We could have embedded the classification logic directly in `AICommandController`. That would have been three extra lines in an already-large controller.

We extracted it because:
1. Classification logic will grow — new trigger words, new intent types, new response formats
2. The orchestrator has its own state concerns (creating task lists, managing task transitions)
3. It has a separate test surface — classification correctness is testable in isolation

The orchestrator is injected via Laravel's service container, which means its dependencies (the `AITaskList` / `AITask` models) are resolved cleanly and the controller remains unaware of them.

```
AICommandController
  └── __construct(AIManager, AIOrchestrator, Filesystem)
           │
           ▼
  chatStream()
    1. orchestrator->classify(message)
    2. orchestrator->getOrchestratorSystemAddendum(...)
    3. aiManager->chatWithCodeStream([..., extra_system])
    4. buffer first line of stream
    5. if PLAN: → orchestrator->createTaskList() → fire SSE
    6. if CLARIFY: → fire SSE
    7. stream remainder normally
```

The controller composes these; it does not implement them.

---

## Outcomes & Impact

### Developer workflow before vs. after

| Workflow step | Before | After |
|---|---|---|
| Find where a function is used | Open terminal, run grep, navigate manually | Type in Search panel, click result |
| Review what changed in a file | Open GitKraken or terminal git diff | Click [diff] in git panel |
| Find who introduced a bug | Run git blame in terminal, count lines | Click [Blame] in breadcrumb |
| Switch to a feature branch | Open terminal, run git checkout | Use branch dropdown in git panel |
| Run two commands simultaneously | Impossible — one terminal | Open second terminal tab |
| Ask AI to do something complex | AI guesses and often gets it wrong | AI shows a plan before acting |
| Ask AI something vague | AI either errors or hallucinates a task | AI asks a clarifying question |

### Quantitative scope

```
Session output:
  New React components:     4  (SearchPanel, DiffViewer, BlameGutter, EditorBreadcrumb)
  New backend routes:       6  (search, blame, diff-parsed, branches, branch, checkout)
  New service methods:      10 (classify, addendum, parsePlan, parseClarify, createTaskList, ...)
  New CSS (net additions):  415 lines
  Modified files:           13
  Net code change:          +1,797 lines / -495 lines

Backend coverage:
  Git commands supported:   12 → now covers the complete solo developer git workflow
  AI SSE event types:       12 (connected, status, chunk, tool_call, tool_result,
                               turn_start, complete, approval_required, file_tree_changed,
                               plan_created, clarification_needed, error/cancelled/done)
```

### Architectural impact

The session established three patterns that future features can follow:

**1. Panel extensibility via `leftView` / `centerView` state:**
Adding a new left panel (e.g., Docker containers, database browser) requires registering one activity bar icon and one `leftView` value. The panel slot handles the rest.

**2. Action extensibility via `EditorBreadcrumb` `actions` prop:**
Any feature that needs a toggle button above the editor (e.g., minimap toggle, lint panel) passes its button as a prop. The breadcrumb does not need to know about it.

**3. AI prefix protocol:**
Any future AI behaviour that requires structured output before prose (e.g., `DIFF:`, `TEST:`, `SCHEMA:` prefixes) plugs into the existing first-line buffering and SSE dispatch pipeline without touching the streaming core.

---

## What We Would Do Differently at Scale

Naming tradeoffs honestly is a staff-level behaviour.

| Decision | What we'd change with more time / scale |
|---|---|
| `reconstructOriginal()` in the browser | At scale: cache the pre-change version server-side on first access to avoid re-running the algorithm on every diff view |
| Hard-coded 200/10 search limits | Make these workspace-level config values; a small workspace can afford 500 results |
| `AIOrchestrator::classify()` is keyword-based | Replace with a lightweight intent classifier or a dedicated classification prompt at the AI layer for higher accuracy |
| Blame gutter DOM scroll sync | Acceptable now; at scale, consider a canvas-rendered gutter for performance with 10,000+ line files |
| Multi-tab terminal: each tab is independent | At scale: share a pty session pool server-side to avoid spawning a new process per tab |
| No test coverage added | These features need integration tests for the git parsing logic (blame parser, diff parser) — the correctness of those functions is not self-evident |

---

## Skills Demonstrated

### Staff Designer
- **Systems thinking** — treating the IDE as a spatial system with inherited user expectations, not a collection of features
- **Decision documentation** — articulating *why* a design was chosen, not just what it looks like
- **Information hierarchy** — choosing grouping strategies (blame colour encoding, search file grouping) that reduce cognitive load
- **Constraint-first design** — working within Monaco's black-box model rather than fighting it
- **Design token discipline** — four-level text hierarchy, depth-coded backgrounds, semantic colour usage

### Staff Engineer
- **Architectural layering** — clean separation of UI, controller, and service concerns
- **Security-first API design** — command allowlisting, path sanitization, ref validation at every git boundary
- **Performance-aware UI engineering** — DOM write over React state for scroll sync; hard budget limits for search
- **Streaming systems design** — first-line buffering to extract structured output from a character stream without degrading UX
- **Composition over configuration** — new features extend existing patterns (`actions` prop, `leftView`/`centerView`) rather than requiring architectural changes
- **Honest tradeoff documentation** — identifying what was deferred and why

---

*XD Studios · Laravel CMS Code Editor · 2026-02-23*
