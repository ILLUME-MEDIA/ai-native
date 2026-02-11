# AI Agent Implementation Guide

## Overview

This guide explains the complete AI Agent system that enables autonomous file creation, code editing, and terminal command execution within the web-based code editor.

---

## 🎯 What Was Fixed

### Before (Supervisor Mode)
- AI could only provide instructions
- User had to manually execute commands
- No direct workspace manipulation
- Example: AI says "Run `composer require...`" → User copies and runs manually

### After (Agent Mode)
- AI can directly create/edit files
- AI can execute whitelisted commands
- Automatic workspace updates
- Example: AI creates `ecommerce-dashboard/index.html` → File appears instantly

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  (AIChatPanel.jsx - Shows tool execution status)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Workspace Controller                         │
│  (AICommandController - Routes chat to AIManager)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       AI Manager                                │
│  • Builds system prompt with tool definitions                  │
│  • Calls AI adapter with tools                                 │
│  • Runs tool execution loop (max 10 turns)                     │
│  • Aggregates results                                           │
└────────────┬───────────────────────────┬────────────────────────┘
             │                           │
             ▼                           ▼
┌──────────────────────┐    ┌─────────────────────────────────────┐
│   AI Provider        │    │      Tool Executor                  │
│   (OpenAI/Gemini)    │    │  • Validates tool calls             │
│  Returns tool calls  │    │  • Checks permissions               │
└──────────────────────┘    │  • Executes file/terminal ops       │
                            │  • Queues for approval if needed    │
                            └─────────────────────────────────────┘
```

---

## 🔧 Components Created

### 1. Tool Registry (`config/ai_tools.php`)

Defines available tools and their parameters:

```php
'tools' => [
    'createFile' => [...],  // Create new files/dirs
    'writeFile' => [...],   // Edit existing files
    'readFile' => [...],    // Read file content
    'deleteFile' => [...],  // Delete files/dirs
    'listFiles' => [...],   // List directory contents
    'runCommand' => [...],  // Execute terminal commands
]
```

**Configuration Options:**
- `requires_approval`: Whether tool needs manual approval
- `approval_rules`: Path patterns for auto-approve/require-approval
- `allowed_commands`: Whitelist for terminal commands
- `security`: File size limits, blocked paths, allowed extensions

---

### 2. Tool Executor (`app/Services/AI/ToolExecutor.php`)

Executes tool calls with security checks:

**Key Methods:**
- `execute()` - Main entry point, validates and executes tools
- `createFile()` - Creates files with directory auto-creation
- `writeFile()` - Updates files with backup/rollback
- `readFile()` - Reads file content with size limits
- `deleteFile()` - Deletes files (always requires approval)
- `runCommand()` - Executes whitelisted commands with timeout

**Security Features:**
- Path traversal prevention (`../` blocked)
- File extension validation
- File size limits (5MB default)
- Command injection prevention
- Blocked path patterns (`.env`, `config/database.php`, etc.)

---

### 3. AI Agent Permission (`app/Services/AI/AIAgentPermission.php`)

Permission system for AI actions:

```php
AIAgentPermission::canPerform($user, $workspace, 'write', 'src/app.js')
// Returns: true/false
```

**Permission Levels:**
- `read` - Always allowed
- `write` - Can create/edit files (configurable per workspace)
- `execute` - Can run commands (disabled by default)
- `delete` - Can delete files (requires approval)
- `git` - Can use git commands (configurable)

**Default Settings:**
```php
[
    'ai_enabled' => true,
    'ai_permissions' => [
        'can_write_files' => true,
        'can_run_commands' => false,  // Security: disabled by default
        'can_delete_files' => false,
        'can_use_git' => true,
        'blocked_paths' => ['.env', 'config/database.php']
    ]
]
```

---

### 4. Updated AIManager

**New Method: `chatWithCode()`**

Enhanced to support tool execution:

```php
public function chatWithCode(array $data): array
{
    // 1. Get AI endpoint and model
    // 2. Build context (current file, open files)
    // 3. Add tool definitions to system prompt
    // 4. Call AI with tools
    // 5. Execute tool calls in loop (max 10 turns)
    // 6. Return final response + tool results
}
```

**Tool Execution Loop:**
```
Turn 1: AI → createFile("index.html", "...") → Execute → Success
Turn 2: AI → createFile("style.css", "...") → Execute → Success
Turn 3: AI → Text response ("Created dashboard!") → Done
```

---

### 5. Updated OpenAI Adapter

**New Method: `generateTextWithTools()`**

Supports native function calling:

```php
public function generateTextWithTools(array $messages, array $tools = []): array
{
    $payload = [
        'model' => $this->model,
        'messages' => $messages,
        'tools' => $tools,
        'tool_choice' => 'auto'
    ];

    // Call OpenAI API
    // Parse tool_calls from response
    // Return tool_calls or text
}
```

---

### 6. Frontend Updates

**AIChatPanel.jsx:**
- Displays tool execution status with badges
- Shows success/failure for each tool
- Indicates pending approvals
- Auto-refreshes file explorer after mutations

**New UI Elements:**
```jsx
<div className="tool-calls">
    <span className="badge bg-success">createFile ✓</span>
    <span className="small text-muted">File created: index.html</span>
</div>
```

---

## 🚀 Usage Examples

### Example 1: Creating Files

**User:** "create ecommerce dashboard"

**AI Execution:**
```
1. createFile({
     path: "ecommerce-dashboard/index.html",
     content: "<!DOCTYPE html>..."
   }) → ✓ Success

2. createFile({
     path: "ecommerce-dashboard/style.css",
     content: "body { margin: 0; }..."
   }) → ✓ Success

3. createFile({
     path: "ecommerce-dashboard/app.js",
     content: "console.log('Dashboard');"
   }) → ✓ Success

Final Response: "✓ Created ecommerce dashboard with 3 files"
```

**Result:** Files instantly appear in workspace file explorer

---

### Example 2: Editing Files

**User:** "update index.html to add a header"

**AI Execution:**
```
1. readFile({ path: "index.html" })
   → Returns current content

2. writeFile({
     path: "index.html",
     content: "<!DOCTYPE html><html>...<header>..."
   }) → ⚠️ Requires Approval (editing existing file)
```

**Result:** Change queued in Approvals panel → User clicks "Approve" → File updated

---

### Example 3: Running Commands

**User:** "install dependencies with npm"

**AI Execution:**
```
1. runCommand({ command: "npm install" })
   → ⚠️ Requires Approval (command execution)
```

**Result:** Command queued for approval → User approves → Command executes

---

## 🔒 Security Model

### Path-Based Auto-Approval

**Auto-Approved Paths:**
```
src/**/*.js
src/**/*.jsx
src/**/*.css
public/**/*
*.md
README*
docs/**/*
```

**Requires Approval:**
```
*.env*
config/**/*.php
.git/**/*
database/**/*
vendor/**/*
```

**Blocked Entirely:**
```
../ (path traversal)
.env
config/database.php
.git/config
```

---

### Command Whitelist

**Allowed Commands:**
```php
'npm' => ['install', 'run', 'test', 'build', 'start'],
'git' => ['status', 'add', 'commit', 'log', 'diff'],
'php' => ['artisan', '-v', '--version'],
'composer' => ['install', 'update', 'require'],
'node' => ['-v', '--version'],
'ls' => ['-la', '-l', '-a'],
```

**Blocked Patterns:**
```
rm -rf
sudo
&&
;
|
>
<
```

---

## ⚙️ Configuration

### Global Settings

**File:** `config/ai_tools.php`

```php
return [
    'enabled' => true,  // Enable/disable AI tools globally
    'max_execution_turns' => 10,  // Max tool calls per request

    'security' => [
        'block_path_traversal' => true,
        'max_file_size' => 5242880,  // 5MB
        'allowed_extensions' => ['js', 'jsx', 'php', 'css', ...],
        'blocked_paths' => ['.env', 'config/database.php', ...],
    ]
];
```

---

### Per-Workspace Settings

**Database:** `workspaces.settings` (JSON column)

```json
{
  "ai_enabled": true,
  "ai_permissions": {
    "can_write_files": true,
    "can_run_commands": false,
    "can_delete_files": false,
    "can_use_git": true,
    "blocked_paths": [".env", "config/"]
  },
  "ai_approval_settings": {
    "auto_approve_patterns": ["src/**/*.js"],
    "require_approval_patterns": ["config/**/*.php"],
    "default_requires_approval": true
  }
}
```

---

## 📊 Tool Execution Flow

### Successful Tool Call

```
1. User: "create index.html"
2. AI: [TOOL_CALL: createFile({...})]
3. ToolExecutor: validateToolCall() → ✓ Pass
4. ToolExecutor: hasPermission() → ✓ Pass
5. ToolExecutor: requiresApproval() → ✗ No (safe path)
6. ToolExecutor: createFile() → ✓ Success
7. AI: "File created successfully"
8. Frontend: Refresh file explorer → index.html appears
```

---

### Approval Required

```
1. User: "edit config/app.php"
2. AI: [TOOL_CALL: writeFile({path: "config/app.php", ...})]
3. ToolExecutor: requiresApproval() → ✓ Yes (config file)
4. ToolExecutor: queueForApproval() → Create AICommandApproval
5. Return: {requires_approval: true, approval_id: 123}
6. Frontend: Show "⚠️ Pending Approval" badge
7. User: Clicks "Approve" in Approvals panel
8. Backend: executeApprovedCommand() → File updated
```

---

### Permission Denied

```
1. User (non-owner): "create file in someone else's workspace"
2. AI: [TOOL_CALL: createFile({...})]
3. ToolExecutor: hasPermission() → ✗ Fail (not workspace owner)
4. Return: {success: false, error: "Permission denied"}
5. AI: "I don't have permission to modify this workspace"
```

---

## 🧪 Testing

### Test 1: File Creation

```bash
POST /api/workspaces/1/ai/chat
{
  "message": "create a file src/hello.js with console.log('hello')",
  "model_id": "AUTO"
}

Expected Response:
{
  "message": "Created src/hello.js",
  "tool_calls": [
    {
      "name": "createFile",
      "result": {
        "success": true,
        "path": "src/hello.js",
        "message": "File created: src/hello.js"
      }
    }
  ]
}
```

---

### Test 2: Multiple Files

```bash
POST /api/workspaces/1/ai/chat
{
  "message": "create a basic website with index.html, style.css, and script.js"
}

Expected:
- 3 tool calls (createFile × 3)
- All files created in workspace
- File explorer refreshes automatically
```

---

### Test 3: Approval Flow

```bash
POST /api/workspaces/1/ai/chat
{
  "message": "delete .env file"
}

Expected:
- Tool call queued for approval
- requires_approval: true
- approval_id: 456
- Approval appears in Approvals panel
```

---

## 🐛 Troubleshooting

### AI Not Creating Files

**Symptoms:**
- AI gives instructions instead of creating files
- No tool_calls in response

**Possible Causes:**
1. AI tools disabled in config
   - Fix: Set `AI_TOOLS_ENABLED=true` in `.env`

2. Workspace not passed to AIManager
   - Fix: Ensure `workspace` key in `chatWithCode()` params

3. AI model doesn't support function calling
   - Fix: Use GPT-4, GPT-3.5-turbo, or Gemini Pro

4. Tool definitions not in system prompt
   - Debug: Check logs for "AVAILABLE TOOLS" in prompt

---

### Permission Denied

**Symptoms:**
- Tool returns `{success: false, error: "Permission denied"}`

**Possible Causes:**
1. User not workspace owner
   - Fix: Only workspace owners can use AI tools

2. AI permissions disabled for workspace
   - Fix: Update workspace settings `ai_permissions.can_write_files = true`

3. Path is blocked
   - Check: `config/ai_tools.php` → `security.blocked_paths`

---

### All Actions Require Approval

**Symptoms:**
- Every tool call goes to approval queue

**Possible Causes:**
1. Default approval setting too strict
   - Fix: Update workspace settings `ai_approval_settings.default_requires_approval = false`

2. Auto-approve patterns not matching
   - Check patterns in `ai_approval_settings.auto_approve_patterns`

---

## 📈 Performance Considerations

### Tool Execution Limits

- **Max turns per request:** 10 (configurable)
- **Tool timeout:** 30 seconds for terminal commands
- **File size limit:** 5MB (configurable)
- **Max approvals queue:** Unlimited (clean old records periodically)

---

### Optimization Tips

1. **Batch operations:**
   - AI can create multiple files in one request
   - Reduces API calls and user wait time

2. **Auto-approve safe paths:**
   - Add common paths to `auto_approve_patterns`
   - Reduces approval overhead

3. **Use faster models for simple tasks:**
   - GPT-3.5-turbo for file creation
   - GPT-4 for complex refactoring

---

## 🔄 Migration from Supervisor Mode

### Step 1: Enable AI Tools

```bash
# Add to .env
AI_TOOLS_ENABLED=true
AI_MAX_TOOL_TURNS=10
```

### Step 2: Update Workspaces

```php
// Migration or seeder
Workspace::query()->update([
    'settings->ai_enabled' => true,
    'settings->ai_permissions->can_write_files' => true,
    'settings->ai_permissions->can_run_commands' => false,
]);
```

### Step 3: Test

```bash
# Test file creation
curl -X POST /api/workspaces/1/ai/chat \
  -H "Authorization: Bearer {token}" \
  -d '{"message": "create test.txt with content hello"}'
```

---

## 📚 API Reference

### POST `/api/workspaces/{id}/ai/chat`

**Request:**
```json
{
  "message": "create index.html",
  "endpoint_id": 1,
  "model_id": "AUTO",
  "current_file": {
    "path": "src/app.js",
    "content": "...",
    "language": "javascript"
  },
  "open_files": [...]
}
```

**Response:**
```json
{
  "message": "Created index.html successfully",
  "code_changes": [
    {
      "path": "index.html",
      "action": "create",
      "content": "..."
    }
  ],
  "tool_calls": [
    {
      "name": "createFile",
      "arguments": {...},
      "result": {
        "success": true,
        "path": "index.html",
        "message": "File created: index.html"
      }
    }
  ],
  "model_used": "gpt-4-turbo",
  "provider": "openai"
}
```

---

### GET `/api/workspaces/{id}/ai/approvals`

Returns pending approval requests:

```json
[
  {
    "id": 123,
    "command_type": "file_edit",
    "command": {...},
    "affected_files": ["config/app.php"],
    "status": "pending",
    "created_at": "2026-02-10T20:00:00Z"
  }
]
```

---

### POST `/api/approvals/{id}/approve`

Approve and execute a pending tool call:

```json
{
  "success": true,
  "result": [
    {
      "file": "config/app.php",
      "success": true
    }
  ]
}
```

---

## 🎓 Best Practices

### For Developers

1. **Always validate tool inputs** in ToolExecutor
2. **Log all tool executions** for audit trail
3. **Use specific error messages** for debugging
4. **Test with malicious inputs** (path traversal, command injection)

### For Users

1. **Review approval requests carefully** before approving
2. **Start with auto-approve for safe paths** (src/, public/)
3. **Keep commands disabled** unless absolutely needed
4. **Monitor AI tool usage** via audit logs

---

## 🔮 Future Enhancements

### Planned Features

1. **Real-time file explorer sync** via WebSockets
2. **Undo/redo for AI actions**
3. **AI action history per workspace**
4. **Batch approval** (approve multiple at once)
5. **Rate limiting per user/workspace**
6. **Custom tool definitions** (user-defined tools)
7. **Multi-file diff viewer** in approvals
8. **AI can read multiple files** before editing

---

## 📞 Support

For issues or questions:
1. Check logs: `storage/logs/laravel.log`
2. Search for "AI Tool" or "ToolExecutor" in logs
3. Enable debug mode: `APP_DEBUG=true`
4. Check browser console for frontend errors

---

## 🎉 Summary

You now have a **fully functional AI agent** that can:
- ✅ Create files automatically
- ✅ Edit existing files (with approval)
- ✅ Run whitelisted terminal commands (with approval)
- ✅ List and read workspace files
- ✅ Handle permissions and security
- ✅ Show real-time execution status in UI

**The AI is no longer stuck in "Supervisor Mode" - it can actually DO things!**
