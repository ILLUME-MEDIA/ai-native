# CLAUDE.md — Laravel CMS Code Editor Project

## Session Continuity — REQUIRED

At the **start of every session**, before doing anything else:
1. Read `.claude/session-log.md` and `.claude/progress.md`
2. Resume from where the previous session left off
3. Do NOT ask the user to recap — the logs are authoritative

At the **end of every session** (or when context is getting full), append to `.claude/session-log.md`:
- What was built/fixed
- What is in progress
- What the next step is (specific file, function, task)

After completing any roadmap feature, update `.claude/progress.md` to mark it done.

---

## Project Stack

- Laravel 12 + Inertia.js + React (JSX) + Monaco Editor
- PHP 8.5.1 on Windows 11 (`C:\php`)
- MySQL (`laravel` DB, 127.0.0.1:3306) — NOT SQLite
- Node/npm for frontend assets, Vite dev server on port 5173

## Key Conventions

- Dark theme palette: `#0d0f14` base, `#ff6b35` orange accent — see memory for full palette
- CSS namespaced under `.ce-root` / `.ce-*` prefixed class names
- `position: absolute; inset: 0` for panels that must fill `editor-canvas` (has `position: relative`)
- Do NOT edit migration files — they are historical records
- Do NOT `git push` without explicit user request
- All existing component props/handlers preserved when doing UI-only changes

## Route Prefix

New workspace API routes go under: `workspaces/{workspace}/` in `routes/api.php`

## Frontend Panel Pattern

New panels are React components in `resources/js/Admin/components/CodeEditor/`.
They receive `{ workspace, ...panel-specific-props }` and are wired into `CodeEditor.jsx`.

## Auto-logging Hook

This project uses auto session logging. Always update `.claude/session-log.md` when:
- Completing a feature or fixing a bug
- Hitting a context limit
- Switching focus areas
