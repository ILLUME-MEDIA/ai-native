# AI Agent Quick Setup Guide

## ⚡ 5-Minute Setup

### Step 1: Enable AI Tools

Add to `.env`:
```bash
AI_TOOLS_ENABLED=true
AI_MAX_TOOL_TURNS=10
```

### Step 2: Clear Config Cache

```bash
php artisan config:clear
php artisan cache:clear
```

### Step 3: Compile Frontend Assets

```bash
npm run build
# or for development
npm run dev
```

### Step 4: Test It!

1. Go to Code Editor: `/apps/code-editor`
2. Select or create a workspace
3. Open AI Chat panel (right side)
4. Type: **"create a file hello.html with Hello World"**
5. Watch the magic happen! ✨

---

## ✅ Expected Behavior

### Before (Broken)
```
User: "create ecommerce dashboard"
AI: "To create an ecommerce dashboard, run these commands:
     1. mkdir ecommerce-dashboard
     2. cd ecommerce-dashboard
     3. touch index.html
     ..."
User: 😤 (has to copy and run manually)
```

### After (Fixed)
```
User: "create ecommerce dashboard"
AI: 🔧 createFile(index.html) ✓
    🔧 createFile(style.css) ✓
    🔧 createFile(app.js) ✓
    "✅ Created ecommerce dashboard with 3 files!"
User: 🎉 (files appear instantly in workspace)
```

---

## 🔒 Security Defaults

By default, the system is configured securely:

✅ **Auto-Approved:**
- Creating new files in `src/`, `public/`, `docs/`
- Reading any file
- Listing directories

⚠️ **Requires Approval:**
- Editing existing files
- Deleting any file
- Running terminal commands
- Touching config files (`.env`, `config/*.php`)

❌ **Blocked Entirely:**
- Path traversal (`../`)
- Sensitive files (`.env`, `.git/config`)
- Dangerous commands (`rm -rf`, `sudo`)

---

## 🛠️ Configuration Files

### Main Config: `config/ai_tools.php`

```php
return [
    'enabled' => env('AI_TOOLS_ENABLED', true),
    'max_execution_turns' => 10,

    'tools' => [
        'createFile' => [...],
        'writeFile' => [...],
        'readFile' => [...],
        'deleteFile' => [...],
        'runCommand' => [...],
    ],

    'security' => [
        'max_file_size' => 5242880,  // 5MB
        'allowed_extensions' => ['js', 'jsx', 'php', ...],
        'blocked_paths' => ['.env', 'config/database.php'],
    ]
];
```

### Per-Workspace Settings

Update in database (`workspaces.settings`):

```json
{
  "ai_enabled": true,
  "ai_permissions": {
    "can_write_files": true,
    "can_run_commands": false,
    "can_delete_files": false
  }
}
```

---

## 🧪 Quick Tests

### Test 1: File Creation
```
User: "create index.html with <h1>Hello</h1>"
Expected: File created instantly ✓
```

### Test 2: Multiple Files
```
User: "create a React component Button with JSX and CSS"
Expected:
  - Button.jsx ✓
  - Button.css ✓
```

### Test 3: Approval Flow
```
User: "edit .env file"
Expected: "⚠️ Requires approval" → Approvals panel shows request
```

---

## 🐛 Troubleshooting

### Problem: AI Still Gives Instructions

**Check:**
```bash
# 1. Is it enabled?
php artisan tinker
>>> config('ai_tools.enabled')
=> true  ✓

# 2. Is workspace passed to AIManager?
# Check: AICommandController.php line 33-40
'workspace' => $workspace,  ✓

# 3. Clear cache
php artisan config:clear
```

### Problem: "Permission Denied"

**Fix:**
```bash
# Make sure user owns the workspace
php artisan tinker
>>> $workspace = \App\Models\Workspace::find(1);
>>> $workspace->user_id === auth()->id()
=> true  ✓

# Or set permissions
>>> $workspace->settings = ['ai_enabled' => true, 'ai_permissions' => ['can_write_files' => true]];
>>> $workspace->save();
```

### Problem: All Actions Need Approval

**Fix:**
```php
// Update workspace settings
$workspace->settings = [
    'ai_approval_settings' => [
        'auto_approve_patterns' => [
            'src/**/*.js',
            'public/**/*',
            '*.md'
        ],
        'default_requires_approval' => false
    ]
];
$workspace->save();
```

---

## 📂 Files Created

```
config/
  └── ai_tools.php                    (Tool definitions & security)

app/
  ├── Services/AI/
  │   ├── ToolExecutor.php           (Executes tool calls)
  │   └── AIAgentPermission.php      (Permission checks)
  └── Services/AI/AIManager.php      (Updated with tool loop)

resources/js/Admin/components/CodeEditor/
  └── AIChatPanel.jsx                (Updated to show tool status)

public/assets/scss/components/
  └── _code-editor.scss              (Added tool call styles)

Documentation/
  ├── AI_AGENT_IMPLEMENTATION_GUIDE.md  (Full documentation)
  └── AI_AGENT_QUICK_SETUP.md           (This file)
```

---

## 🎯 Key Features

1. **Tool Execution Loop** - AI can call multiple tools in sequence
2. **Permission System** - Fine-grained control per workspace
3. **Approval Workflow** - Dangerous actions require manual approval
4. **Security Guards** - Path traversal, command injection prevention
5. **Real-time UI** - Shows tool execution status with badges
6. **Audit Trail** - All tool calls logged for compliance

---

## 🚀 Advanced Usage

### Enable Command Execution (Careful!)

```php
$workspace->update([
    'settings->ai_permissions->can_run_commands' => true
]);
```

Now AI can run:
- `npm install`
- `git status`
- `composer update`
- (Only whitelisted commands)

### Custom Auto-Approve Patterns

```php
$workspace->update([
    'settings->ai_approval_settings->auto_approve_patterns' => [
        'src/**/*.{js,jsx,ts,tsx}',
        'components/**/*.css',
        'public/images/**/*',
        'README*.md'
    ]
]);
```

### Disable AI for Specific Workspace

```php
$workspace->update(['settings->ai_enabled' => false]);
```

---

## 📞 Need Help?

1. **Check Logs:** `storage/logs/laravel.log`
2. **Enable Debug:** `APP_DEBUG=true` in `.env`
3. **Test Manually:**
   ```bash
   php artisan tinker
   >>> $executor = new \App\Services\AI\ToolExecutor();
   >>> $workspace = \App\Models\Workspace::find(1);
   >>> $user = \App\Models\User::find(1);
   >>> $result = $executor->execute([
           'name' => 'createFile',
           'arguments' => ['path' => 'test.txt', 'content' => 'hello']
       ], $workspace, $user);
   >>> dd($result);
   ```

---

## ✅ Success Checklist

- [ ] AI tools enabled in config
- [ ] Config cache cleared
- [ ] Frontend assets compiled
- [ ] Workspace has AI permissions enabled
- [ ] User owns the workspace
- [ ] AI provider (OpenAI/Gemini) is active
- [ ] Tool definitions loaded in system prompt
- [ ] Test file creation works

---

## 🎉 You're Done!

The AI agent is now fully operational. Try these commands:

```
"create a landing page with HTML, CSS, and JS"
"add a navbar to index.html"
"create a React component TodoList"
"make a Python script that prints hello"
"create a REST API endpoint structure"
```

**The AI will actually DO it, not just tell you how!** 🚀
