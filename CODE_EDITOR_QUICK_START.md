# Code Editor - Quick Start Guide

## Getting Started (3 Steps)

### 1. Access the Editor
Navigate to: **Apps → Code Editor** from your admin sidebar

### 2. Create Your First Workspace
- Click the **"+"** button in the workspace selector
- Enter workspace details:
  - **Name**: My First Project
  - **Description**: Learning the code editor
  - **Type**: Project
- Click **Create**

### 3. Start Coding!
- Browse files in the left explorer
- Click a file to open it
- Edit with full IntelliSense
- Press **Ctrl+S** to save

---

## Interface Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Apps → Code Editor                                             │
├──────────────┬─────────────────────────┬────────────────────────┤
│  WORKSPACES  │                         │  [💬][⌨️][🌿][⏰]       │
│  • Project 1 │                         │                        │
│  • Project 2 │   📝 Editor Canvas      │   AI Chat Panel        │
│              │                         │                        │
│  FILES       │   [Tab1] [Tab2*]        │   "Help me refactor    │
│  📁 src      │                         │    this function..."   │
│    📄 app.js │   Your code here...     │                        │
│  📁 public   │                         │   [Send]               │
│              │                         │                        │
└──────────────┴─────────────────────────┴────────────────────────┘
```

**Left Sidebar:**
- Workspaces: Switch between projects
- File Explorer: Browse your files
- Search: Filter files

**Center:**
- Editor Tabs: Multiple open files
- Code Editor: Full Monaco editor

**Right Sidebar (Tabs):**
- 💬 **AI Chat**: Ask for code help
- ⌨️ **Terminal**: Run commands
- 🌿 **Git**: Commit & push
- ⏰ **Approvals**: Review AI changes

---

## Common Tasks

### Creating a New File
1. Right-click in file explorer (coming soon)
2. OR use Terminal: `touch src/newfile.js`

### Editing Files
1. Click file in explorer
2. Edit in Monaco editor
3. **Ctrl+S** to save
4. ● indicator shows unsaved changes

### Using Terminal
1. Click ⌨️ **Terminal** tab
2. Type command: `ls -la`
3. Press **Enter**
4. See output in terminal

**Useful Commands:**
```bash
ls              # List files
mkdir src       # Create directory
touch file.js   # Create file
cat file.js     # View file content
npm install     # Install packages
git status      # Check git status
```

### Using Git
1. Click 🌿 **Git** tab
2. **Initialize Repository** (first time only)
3. See list of changed files
4. Click **Stage All Changes**
5. Click **Commit**
6. Enter commit message
7. Click **Commit** again
8. Click **Push** (if remote configured)

### Asking AI for Help
1. Click 💬 **AI Chat** tab
2. Select provider (OpenAI, Gemini, etc.)
3. Enable **AUTO** mode (recommended)
4. Type your question:
   - "Explain this code"
   - "Find bugs in this function"
   - "Refactor this to use async/await"
   - "Add error handling"
   - "Generate unit tests"
5. Click **Send**
6. If AI suggests code changes:
   - Review the suggestion
   - Click **Apply Changes** to update editor
   - OR check **Approvals** tab if flagged

### Approving AI Changes
1. Click ⏰ **Approvals** tab
2. See pending changes
3. Click **View Diff** to compare
4. Click **✓ Approve** to apply
5. OR **✗ Reject** to cancel

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+S** | Save current file |
| **Ctrl+L** | Clear terminal (in terminal panel) |
| **Enter** | Send AI message (in chat) |
| **Shift+Enter** | New line in chat |

---

## Pro Tips

### 1. Multi-File Editing
- Open multiple files by clicking them
- Switch between tabs
- Changes save per tab

### 2. AUTO Mode
- Enable AUTO in AI Chat
- System automatically selects best model
- Falls back if rate limited
- Recommended for consistent results

### 3. Workspace Organization
- Create separate workspaces for:
  - Frontend projects
  - Backend APIs
  - Libraries
  - Websites
- Keeps your work isolated

### 4. Git Workflow
```bash
# In Terminal:
git init
git remote add origin https://github.com/user/repo.git

# In Git Panel:
1. Stage All Changes
2. Commit with message
3. Push
```

### 5. Dangerous Commands
These require approval:
- `rm` (delete files)
- `sudo` (admin commands)
- `chmod 777` (change permissions)
- `>` (output redirection)

You'll see them in **Approvals** tab.

---

## Troubleshooting

### "No workspace selected"
**Solution:** Create or select a workspace from the top-left panel

### "Failed to load file tree"
**Solution:** Click refresh button (↻) in file explorer

### Terminal command stuck
**Solution:** Commands timeout after 60 seconds automatically

### Git operations failing
**Problem:** Repository not initialized
**Solution:** Click "Initialize Repository" in Git panel

### AI not responding
**Check:**
1. Provider is active (Apps → AI → Endpoints)
2. API key is valid
3. Model is available
4. Try AUTO mode

### Changes not saving
**Check:**
1. ● indicator shows unsaved changes
2. Press Ctrl+S
3. Check browser console for errors

---

## Example Workflow: Building a Simple Project

```bash
# 1. Create workspace
Name: Todo App
Type: Project

# 2. Initialize structure (Terminal)
mkdir src
mkdir public
touch src/index.js
touch public/index.html

# 3. Write code (Editor)
# Open src/index.js, write your code
# Press Ctrl+S to save

# 4. Use Git (Git Panel)
# Initialize Repository
# Stage All Changes
# Commit: "Initial commit"

# 5. Get AI help (AI Chat)
"Generate a simple Express server for this app"
# Review and apply changes

# 6. Test (Terminal)
npm init -y
npm install express
node src/index.js
```

---

## Getting Help

### AI Chat Prompts
- "Explain this code"
- "Find bugs"
- "Optimize performance"
- "Add error handling"
- "Convert to TypeScript"
- "Generate tests"
- "Document this function"

### Terminal Help
```bash
ls --help          # Command help
man <command>      # Manual pages
which <command>    # Find command location
```

### Git Help
```bash
git help           # Git help
git status         # Current status
git log            # Commit history
```

---

## What's Next?

### Learn More:
- Monaco Editor: Full VS Code features
- Git: Version control basics
- AI Agents: Using skills and rules
- Terminal: Bash commands

### Advanced Features:
- Custom workspaces for different projects
- Git branching and merging
- AI automation with duties
- Complex terminal scripts

---

**Happy Coding! 🚀**

Need help? Check the main documentation: `CODE_EDITOR_IMPLEMENTATION.md`
