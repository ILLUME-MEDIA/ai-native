# Complete Online Code Editor with AI Agent Integration
## System Design & Architecture Documentation

**Version:** 1.0
**Date:** 2026-02-10
**Author:** System Architecture Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Requirements & Constraints](#system-requirements--constraints)
3. [Architecture Overview](#architecture-overview)
4. [Backend Architecture (Laravel)](#backend-architecture-laravel)
5. [Frontend Architecture (React)](#frontend-architecture-react)
6. [AI Agent System](#ai-agent-system)
7. [File System Integration](#file-system-integration)
8. [Chat UI System](#chat-ui-system)
9. [MCP Permissions System](#mcp-permissions-system)
10. [Automation & Duties](#automation--duties)
11. [YouTube Scraper Integration](#youtube-scraper-integration)
12. [Section/Table/Field Logic](#sectiontablefield-logic)
13. [Implementation Plan](#implementation-plan)
14. [UI Flow & User Experience](#ui-flow--user-experience)
15. [Security Considerations](#security-considerations)
16. [Extension Points & Future Enhancements](#extension-points--future-enhancements)

---

## Executive Summary

This document describes a **complete online code editor system** similar to VS Code, integrated into an existing Laravel + React admin panel. The system provides:

- **Monaco Editor** integration with full syntax highlighting and IntelliSense
- **File Explorer** with tree view, file operations (create, edit, delete, rename)
- **Multi-tab Interface** for managing multiple open files
- **Deep AI Agent Integration** for code assistance, refactoring, generation, and explanation
- **Global AI System** with provider management (OpenAI, Gemini, Mistral)
- **AUTO Mode** with intelligent model selection and fallback
- **Chat UI** embedded within the editor for seamless AI interaction
- **MCP Permissions** for fine-grained access control
- **Automation System** with duties, skills, and rules
- **Laravel Filesystem Backend** for server-side file operations

### Key Design Principles

1. **Seamless Integration**: Editor fits within existing admin panel (sidebar + navbar remain visible)
2. **Global AI**: Single AI system (not per-agent or per-API)
3. **Provider-Based**: Support for multiple AI providers with model auto-fetching
4. **Permission-Driven**: Table-based MCP system controls access
5. **Production-Ready**: Built on existing, proven architecture

---

## System Requirements & Constraints

### Must-Have Requirements

#### 1. Existing Infrastructure
- **Backend**: Laravel 10+ with existing API routes
- **Frontend**: React 18+ with React Router v7
- **UI System**: Bootstrap 5 with custom SCSS
- **State Management**: Context API + local state
- **Authentication**: Laravel Sanctum

#### 2. UI Constraints
- Sidebar and navbar **must remain visible**
- Editor must fit within the **main content area**
- Follow existing **design system** (colors, typography, spacing)
- Reuse existing **component library** (DataTable, modals, etc.)
- Maintain **routing structure** (`/admin/apps/code-editor`)

#### 3. AI Requirements
- **Global AI system** (no per-agent creation)
- Support **OpenAI, Gemini, Mistral** providers
- Provider management: API key, base URL, provider type
- **Auto-fetch models** from provider APIs
- **AUTO mode**: Intelligent model selection with fallback
- **No forced defaults**: Optional default model
- **Graceful degradation**: Handle API failures elegantly

#### 4. Editor Features
- Monaco Editor with language detection
- File tree (collapsible, searchable)
- Multi-tab support (open, close, switch)
- Save functionality (Ctrl+S)
- Read-only mode support
- Syntax highlighting for all common languages
- IntelliSense/autocomplete
- Error indicators

#### 5. AI Agent Capabilities
- Code writing and generation
- Code refactoring
- Code explanation
- Error detection and fixing
- File creation suggestions
- Multi-file operations

---

## Architecture Overview

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (React SPA)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌───────────────────┐  ┌─────────────────┐  │
│  │   Sidebar    │  │   Code Editor     │  │   AI Chat UI    │  │
│  │   (Fixed)    │  │   (Monaco)        │  │   (Embedded)    │  │
│  │              │  │                   │  │                 │  │
│  │  - Menu      │  │  ┌─────────────┐ │  │  ┌───────────┐  │  │
│  │  - Apps      │  │  │ File Tree   │ │  │  │  Model    │  │  │
│  │  - AI        │  │  │ - Files     │ │  │  │  Selector │  │  │
│  │  - Sections  │  │  │ - Folders   │ │  │  └───────────┘  │  │
│  │              │  │  │ - Search    │ │  │                 │  │
│  └──────────────┘  │  └─────────────┘ │  │  ┌───────────┐  │  │
│                    │                   │  │  │  Chat     │  │  │
│  ┌──────────────┐  │  ┌─────────────┐ │  │  │  Messages │  │  │
│  │   Navbar     │  │  │   Tabs      │ │  │  │           │  │  │
│  │   (Fixed)    │  │  │ - File 1    │ │  │  └───────────┘  │  │
│  └──────────────┘  │  │ - File 2    │ │  │                 │  │
│                    │  └─────────────┘ │  │  ┌───────────┐  │  │
│                    │                   │  │  │  Input    │  │  │
│                    │  ┌─────────────┐ │  │  │  Box      │  │  │
│                    │  │   Editor    │ │  │  └───────────┘  │  │
│                    │  │   Canvas    │ │  │                 │  │
│                    │  │             │ │  └─────────────────┘  │
│                    │  └─────────────┘ │                       │
│                    └───────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ AJAX (Axios)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LARAVEL BACKEND (API)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               File System API                             │  │
│  │  /api/code-editor/files                                   │  │
│  │    - list, read, create, update, delete, rename, move     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               AI Agent API                                │  │
│  │  /api/ai/chat                                             │  │
│  │    - Process AI requests with context                     │  │
│  │    - Execute duties (code generation, refactoring)        │  │
│  │    - Apply multi-file changes                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               AI Provider Management                      │  │
│  │  /api/ai/endpoints                                        │  │
│  │    - CRUD for AI providers                                │  │
│  │    - Fetch models from provider                           │  │
│  │    - Auto-selection logic                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FILESYSTEM (Server)                           │
│                    /var/www/project/                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  AI PROVIDERS (External APIs)                    │
│    - OpenAI (GPT-4, GPT-3.5)                                    │
│    - Google Gemini (Pro, Flash)                                 │
│    - Mistral AI (Large, Medium, Small)                          │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: User Request → AI Response

```
1. User types in Chat UI: "Refactor this function to use async/await"
2. React captures message + current file context
3. POST /api/ai/chat with:
   - message
   - current_file_path
   - current_file_content
   - open_files[]
   - selected_model (or AUTO)
4. Laravel AIManager:
   - Determines model (AUTO or selected)
   - Builds context (file content, duties, skills, rules)
   - Calls AI provider API
   - Parses response
   - Extracts code changes
5. Returns to React:
   - AI message
   - code_changes[] { file, content, action }
   - suggested_model (if AUTO)
6. React displays:
   - Message in chat
   - Diff preview for changes
   - "Apply" button
7. User clicks "Apply":
   - Monaco editor updates
   - Tabs marked as unsaved
8. User saves (Ctrl+S):
   - POST /api/code-editor/files/save
   - File written to disk
```

---

## Backend Architecture (Laravel)

### 1. File System API

#### New Controller: `CodeEditorController.php`

**Location:** `app/Http/Controllers/CodeEditor/CodeEditorController.php`

**Purpose:** Manage file operations for the online editor

**Methods:**

```php
// List files and folders
GET /api/code-editor/files?path=/
Response: {
  files: [
    { name, path, type: 'file|directory', size, modified, extension }
  ]
}

// Read file content
GET /api/code-editor/files/read?path=/app/Models/User.php
Response: {
  content: "...",
  path: "...",
  encoding: "utf-8",
  size: 1024,
  modified: "2026-02-10 10:30:00"
}

// Create file
POST /api/code-editor/files/create
Body: { path, content, type: 'file|directory' }
Response: { success, path, message }

// Update file
PUT /api/code-editor/files/update
Body: { path, content }
Response: { success, message }

// Delete file
DELETE /api/code-editor/files/delete
Body: { path }
Response: { success, message }

// Rename/Move file
PUT /api/code-editor/files/rename
Body: { old_path, new_path }
Response: { success, message }

// Search files
GET /api/code-editor/files/search?query=User&path=/app
Response: {
  results: [
    { path, line, match, context }
  ]
}
```

**Security:**

- Validate paths (no `../` escaping)
- Restrict to project directory only
- Check file permissions
- Admin-only access (Sanctum middleware)
- Log all operations

#### Implementation Example

```php
<?php

namespace App\Http\Controllers\CodeEditor;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

class CodeEditorController extends Controller
{
    protected $basePath;

    public function __construct()
    {
        // Restrict to project root
        $this->basePath = base_path();
    }

    /**
     * List files in directory
     */
    public function list(Request $request)
    {
        $path = $this->sanitizePath($request->input('path', '/'));
        $fullPath = $this->basePath . $path;

        if (!File::isDirectory($fullPath)) {
            return response()->json(['error' => 'Invalid directory'], 400);
        }

        $files = [];
        foreach (File::allFiles($fullPath, false) as $file) {
            $files[] = [
                'name' => $file->getFilename(),
                'path' => $this->relativePath($file->getRealPath()),
                'type' => $file->isDir() ? 'directory' : 'file',
                'size' => $file->getSize(),
                'modified' => $file->getMTime(),
                'extension' => $file->getExtension()
            ];
        }

        return response()->json(['files' => $files]);
    }

    /**
     * Read file content
     */
    public function read(Request $request)
    {
        $path = $this->sanitizePath($request->input('path'));
        $fullPath = $this->basePath . $path;

        if (!File::exists($fullPath) || File::isDirectory($fullPath)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        $content = File::get($fullPath);

        return response()->json([
            'content' => $content,
            'path' => $path,
            'encoding' => 'utf-8',
            'size' => File::size($fullPath),
            'modified' => File::lastModified($fullPath)
        ]);
    }

    /**
     * Create file or directory
     */
    public function create(Request $request)
    {
        $request->validate([
            'path' => 'required|string',
            'type' => 'required|in:file,directory',
            'content' => 'nullable|string'
        ]);

        $path = $this->sanitizePath($request->input('path'));
        $fullPath = $this->basePath . $path;

        if (File::exists($fullPath)) {
            return response()->json(['error' => 'Path already exists'], 409);
        }

        if ($request->input('type') === 'directory') {
            File::makeDirectory($fullPath, 0755, true);
        } else {
            File::put($fullPath, $request->input('content', ''));
        }

        return response()->json([
            'success' => true,
            'path' => $path,
            'message' => ucfirst($request->input('type')) . ' created successfully'
        ]);
    }

    /**
     * Update file content
     */
    public function update(Request $request)
    {
        $request->validate([
            'path' => 'required|string',
            'content' => 'required|string'
        ]);

        $path = $this->sanitizePath($request->input('path'));
        $fullPath = $this->basePath . $path;

        if (!File::exists($fullPath)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        File::put($fullPath, $request->input('content'));

        return response()->json([
            'success' => true,
            'message' => 'File saved successfully'
        ]);
    }

    /**
     * Delete file or directory
     */
    public function delete(Request $request)
    {
        $request->validate(['path' => 'required|string']);

        $path = $this->sanitizePath($request->input('path'));
        $fullPath = $this->basePath . $path;

        if (!File::exists($fullPath)) {
            return response()->json(['error' => 'Path not found'], 404);
        }

        if (File::isDirectory($fullPath)) {
            File::deleteDirectory($fullPath);
        } else {
            File::delete($fullPath);
        }

        return response()->json([
            'success' => true,
            'message' => 'Deleted successfully'
        ]);
    }

    /**
     * Rename or move file
     */
    public function rename(Request $request)
    {
        $request->validate([
            'old_path' => 'required|string',
            'new_path' => 'required|string'
        ]);

        $oldPath = $this->sanitizePath($request->input('old_path'));
        $newPath = $this->sanitizePath($request->input('new_path'));

        $oldFullPath = $this->basePath . $oldPath;
        $newFullPath = $this->basePath . $newPath;

        if (!File::exists($oldFullPath)) {
            return response()->json(['error' => 'Source not found'], 404);
        }

        if (File::exists($newFullPath)) {
            return response()->json(['error' => 'Destination already exists'], 409);
        }

        File::move($oldFullPath, $newFullPath);

        return response()->json([
            'success' => true,
            'message' => 'Renamed successfully'
        ]);
    }

    /**
     * Search in files
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $path = $this->sanitizePath($request->input('path', '/'));

        // Implementation: Use grep or custom search
        // Return matching lines with context

        return response()->json(['results' => []]);
    }

    /**
     * Sanitize and validate path
     */
    protected function sanitizePath($path)
    {
        // Remove any ../ attempts
        $path = str_replace('..', '', $path);

        // Ensure leading slash
        if (!str_starts_with($path, '/')) {
            $path = '/' . $path;
        }

        return $path;
    }

    /**
     * Get relative path from base
     */
    protected function relativePath($fullPath)
    {
        return str_replace($this->basePath, '', $fullPath);
    }
}
```

#### Route Registration

**File:** `routes/api.php`

```php
// Code Editor Routes (Admin only)
Route::middleware(['auth:sanctum'])->prefix('code-editor')->group(function () {
    Route::get('/files', [CodeEditorController::class, 'list']);
    Route::get('/files/read', [CodeEditorController::class, 'read']);
    Route::post('/files/create', [CodeEditorController::class, 'create']);
    Route::put('/files/update', [CodeEditorController::class, 'update']);
    Route::delete('/files/delete', [CodeEditorController::class, 'delete']);
    Route::put('/files/rename', [CodeEditorController::class, 'rename']);
    Route::get('/files/search', [CodeEditorController::class, 'search']);
});
```

### 2. AI Service Enhancement

#### Extend `AIManager` Service

**File:** `app/Services/AI/AIManager.php`

Add methods for code editor context:

```php
/**
 * Process chat with code editor context
 */
public function chatWithCode(array $data)
{
    $message = $data['message'];
    $currentFile = $data['current_file'] ?? null;
    $openFiles = $data['open_files'] ?? [];
    $modelId = $data['model_id'] ?? null;

    // Get endpoint
    $endpoint = $this->getEndpoint($data['endpoint_id'] ?? null);

    // AUTO mode logic
    if ($modelId === 'AUTO' || !$modelId) {
        $modelId = $this->selectBestModel($endpoint);
    }

    // Build context
    $context = $this->buildCodeContext($currentFile, $openFiles);

    // Get duties, skills, rules
    $duties = AiDuty::active()->get();
    $skills = AiSkill::active()->get();
    $rules = AiRule::active()->get();

    // Build system prompt
    $systemPrompt = $this->buildSystemPrompt($duties, $skills, $rules, $context);

    // Call AI
    $response = $this->callProvider($endpoint, $modelId, [
        'system' => $systemPrompt,
        'messages' => [
            ['role' => 'user', 'content' => $message]
        ]
    ]);

    // Parse code changes from response
    $codeChanges = $this->parseCodeChanges($response);

    return [
        'message' => $response,
        'code_changes' => $codeChanges,
        'model_used' => $modelId
    ];
}

/**
 * Build code context for AI
 */
protected function buildCodeContext($currentFile, $openFiles)
{
    $context = "# Code Editor Context\n\n";

    if ($currentFile) {
        $context .= "## Current File: {$currentFile['path']}\n\n";
        $context .= "```{$currentFile['language']}\n";
        $context .= $currentFile['content'];
        $context .= "\n```\n\n";
    }

    if (!empty($openFiles)) {
        $context .= "## Open Files:\n\n";
        foreach ($openFiles as $file) {
            $context .= "### {$file['path']}\n";
            $context .= "```{$file['language']}\n";
            $context .= $file['content'];
            $context .= "\n```\n\n";
        }
    }

    return $context;
}

/**
 * Parse code changes from AI response
 */
protected function parseCodeChanges($response)
{
    // Extract code blocks with file paths
    // Format: ```php:app/Models/User.php

    preg_match_all('/```(\w+):([^\n]+)\n(.*?)```/s', $response, $matches, PREG_SET_ORDER);

    $changes = [];
    foreach ($matches as $match) {
        $changes[] = [
            'language' => $match[1],
            'path' => trim($match[2]),
            'content' => $match[3],
            'action' => 'update' // or 'create', 'delete'
        ];
    }

    return $changes;
}

/**
 * Select best available model (AUTO mode)
 */
protected function selectBestModel($endpoint)
{
    $models = $endpoint->models ?? [];

    if (empty($models)) {
        throw new \Exception('No models available for endpoint');
    }

    // Priority: GPT-4 > Gemini Pro > Mistral Large > others
    $priorities = [
        'gpt-4' => 100,
        'gpt-4-turbo' => 95,
        'gemini-pro' => 90,
        'mistral-large' => 85,
        'gpt-3.5-turbo' => 70
    ];

    $bestModel = null;
    $bestScore = -1;

    foreach ($models as $model) {
        foreach ($priorities as $keyword => $score) {
            if (str_contains(strtolower($model['id']), $keyword)) {
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestModel = $model['id'];
                }
            }
        }
    }

    return $bestModel ?? $models[0]['id'];
}
```

#### Update `AIChatController`

**File:** `app/Http/Controllers/AI/AIChatController.php`

Add method for code editor chat:

```php
public function editorChat(Request $request)
{
    $request->validate([
        'message' => 'required|string',
        'endpoint_id' => 'nullable|exists:ai_endpoints,id',
        'model_id' => 'nullable|string',
        'current_file' => 'nullable|array',
        'open_files' => 'nullable|array'
    ]);

    try {
        $aiManager = app(AIManager::class);

        $result = $aiManager->chatWithCode($request->all());

        // Log to audit
        AiAuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'editor_chat',
            'request_data' => $request->except(['current_file.content', 'open_files']),
            'response_data' => ['model' => $result['model_used']],
            'status' => 'success'
        ]);

        return response()->json($result);

    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage()
        ], 500);
    }
}
```

### 3. File Operation Permissions

#### New Model: `CodeEditorPermission`

**Location:** `app/Models/CodeEditorPermission.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CodeEditorPermission extends Model
{
    protected $fillable = [
        'path_pattern',
        'can_read',
        'can_write',
        'can_delete',
        'can_execute',
        'user_id', // null = applies to all users
        'description'
    ];

    protected $casts = [
        'can_read' => 'boolean',
        'can_write' => 'boolean',
        'can_delete' => 'boolean',
        'can_execute' => 'boolean'
    ];

    /**
     * Check if user can perform action on path
     */
    public static function canPerform($userId, $path, $action)
    {
        // Admin bypass
        if (auth()->user()?->is_admin) {
            return true;
        }

        // Find matching permission rules
        $permissions = static::where(function ($q) use ($userId) {
            $q->whereNull('user_id')->orWhere('user_id', $userId);
        })->get();

        foreach ($permissions as $perm) {
            if (fnmatch($perm->path_pattern, $path)) {
                return $perm->{"can_$action"} ?? false;
            }
        }

        // Default: deny
        return false;
    }
}
```

#### Migration

```php
Schema::create('code_editor_permissions', function (Blueprint $table) {
    $table->id();
    $table->string('path_pattern'); // e.g., /app/Models/*.php
    $table->boolean('can_read')->default(false);
    $table->boolean('can_write')->default(false);
    $table->boolean('can_delete')->default(false);
    $table->boolean('can_execute')->default(false);
    $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
    $table->text('description')->nullable();
    $table->timestamps();
});
```

---

## Frontend Architecture (React)

### 1. Monaco Editor Integration

#### Install Dependencies

```bash
npm install @monaco-editor/react monaco-editor
```

#### Create Monaco Component

**File:** `resources/js/Admin/components/CodeEditor/MonacoEditor.jsx`

```jsx
import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

export default function MonacoEditor({
    value,
    onChange,
    language,
    theme = 'vs-dark',
    readOnly = false,
    onSave,
    height = '100%'
}) {
    const editorRef = useRef(null);

    function handleEditorDidMount(editor, monaco) {
        editorRef.current = editor;

        // Add save command (Ctrl+S / Cmd+S)
        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S,
            () => {
                if (onSave) {
                    onSave(editor.getValue());
                }
            }
        );
    }

    function handleEditorChange(newValue) {
        if (onChange) {
            onChange(newValue);
        }
    }

    return (
        <Editor
            height={height}
            language={language}
            value={value}
            theme={theme}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
                readOnly,
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                rulers: [80, 120],
                wordWrap: 'off',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: 4,
                insertSpaces: true
            }}
        />
    );
}
```

### 2. File Explorer Component

**File:** `resources/js/Admin/components/CodeEditor/FileExplorer.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';

export default function FileExplorer({ onFileSelect, currentFile }) {
    const [tree, setTree] = useState([]);
    const [expanded, setExpanded] = useState(new Set(['/']));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFiles('/');
    }, []);

    async function loadFiles(path) {
        try {
            const response = await axios.get('/api/code-editor/files', {
                params: { path }
            });

            setTree(response.data.files);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load files:', error);
        }
    }

    function toggleExpand(path) {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }

    function renderTree(items, depth = 0) {
        return items.map(item => (
            <div key={item.path}>
                <div
                    className={`file-tree-item ${currentFile?.path === item.path ? 'active' : ''}`}
                    style={{ paddingLeft: `${depth * 20 + 10}px` }}
                    onClick={() => {
                        if (item.type === 'directory') {
                            toggleExpand(item.path);
                        } else {
                            onFileSelect(item);
                        }
                    }}
                >
                    {item.type === 'directory' ? (
                        <>
                            {expanded.has(item.path) ? (
                                <ChevronDown size={16} />
                            ) : (
                                <ChevronRight size={16} />
                            )}
                            {expanded.has(item.path) ? (
                                <FolderOpen size={16} />
                            ) : (
                                <Folder size={16} />
                            )}
                        </>
                    ) : (
                        <>
                            <span style={{ width: 16 }} />
                            <File size={16} />
                        </>
                    )}
                    <span className="file-name">{item.name}</span>
                </div>

                {item.type === 'directory' && expanded.has(item.path) && item.children && (
                    <div className="file-tree-children">
                        {renderTree(item.children, depth + 1)}
                    </div>
                )}
            </div>
        ));
    }

    if (loading) {
        return <div className="p-3">Loading files...</div>;
    }

    return (
        <div className="file-explorer">
            <div className="file-explorer-header">
                <h6>EXPLORER</h6>
            </div>
            <div className="file-tree">
                {renderTree(tree)}
            </div>
        </div>
    );
}
```

### 3. Tab System Component

**File:** `resources/js/Admin/components/CodeEditor/EditorTabs.jsx`

```jsx
import React from 'react';
import { X } from 'lucide-react';

export default function EditorTabs({ tabs, activeTab, onTabSelect, onTabClose }) {
    return (
        <div className="editor-tabs">
            {tabs.map(tab => (
                <div
                    key={tab.path}
                    className={`editor-tab ${activeTab?.path === tab.path ? 'active' : ''}`}
                    onClick={() => onTabSelect(tab)}
                >
                    <span className="tab-name">
                        {tab.name}
                        {tab.unsaved && <span className="unsaved-indicator">●</span>}
                    </span>
                    <button
                        className="tab-close"
                        onClick={(e) => {
                            e.stopPropagation();
                            onTabClose(tab);
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}
```

### 4. Main Code Editor Page

**File:** `resources/js/Admin/views/admin/apps/code-editor/CodeEditor.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MonacoEditor from '@/components/CodeEditor/MonacoEditor';
import FileExplorer from '@/components/CodeEditor/FileExplorer';
import EditorTabs from '@/components/CodeEditor/EditorTabs';
import AIChatPanel from '@/components/CodeEditor/AIChatPanel';
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
            toast.error('Failed to load file');
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
            toast.error('Failed to save file');
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
                                // Apply AI-suggested changes
                                changes.forEach(change => {
                                    const tab = tabs.find(t => t.path === change.path);
                                    if (tab) {
                                        setTabs(prev => prev.map(t =>
                                            t.path === change.path
                                                ? { ...t, content: change.content, unsaved: true }
                                                : t
                                        ));
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
    );
}
```

### 5. Styling

**File:** `resources/assets/scss/components/_code-editor.scss`

```scss
.code-editor-container {
    height: calc(100vh - 60px); // Subtract navbar height
    display: flex;
    flex-direction: column;
}

.code-editor-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
}

.code-editor-sidebar {
    width: 250px;
    border-right: 1px solid var(--border-color);
    background: var(--sidebar-bg);
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
    border-left: 1px solid var(--border-color);
    background: var(--bg-secondary);
}

.editor-tabs {
    display: flex;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
    overflow-x: auto;
}

.editor-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-right: 1px solid var(--border-color);
    cursor: pointer;
    user-select: none;

    &.active {
        background: var(--bg-primary);
        border-bottom: 2px solid var(--primary-color);
    }

    &:hover {
        background: var(--bg-hover);
    }
}

.tab-name {
    font-size: 13px;
}

.unsaved-indicator {
    color: var(--warning-color);
    margin-left: 4px;
}

.tab-close {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    opacity: 0.6;

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
    color: var(--text-muted);
}

.file-explorer {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.file-explorer-header {
    padding: 10px;
    border-bottom: 1px solid var(--border-color);

    h6 {
        margin: 0;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
        color: var(--text-muted);
    }
}

.file-tree {
    flex: 1;
    overflow-y: auto;
}

.file-tree-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    cursor: pointer;
    font-size: 13px;

    &:hover {
        background: var(--bg-hover);
    }

    &.active {
        background: var(--primary-color-light);
        color: var(--primary-color);
    }
}

.file-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.chat-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
}
```

---

## AI Agent System

### 1. Global AI Architecture

Unlike per-agent or per-API approaches, this system uses a **global AI configuration** where:

- **AI Endpoints** are managed centrally
- **Duties, Skills, Rules** are global behaviors
- **Providers** (OpenAI, Gemini, Mistral) are configured once
- **Models** are auto-fetched and cached
- **AUTO mode** intelligently selects the best available model

### 2. AI Endpoint Management

**Existing System** (`ai_endpoints` table):

```php
- name: "OpenAI Production"
- provider: "openai" | "google" | "mistral" | "custom"
- base_url: "https://api.openai.com/v1"
- api_key: encrypted
- models: JSON array of available models
- default_model: optional default
- is_active: boolean
- auto_model_selection: boolean
```

**Model Fetching Flow:**

```
1. Admin adds AI Endpoint
2. System calls provider's model list API:
   - OpenAI: GET /v1/models
   - Gemini: GET /v1beta/models
   - Mistral: GET /v1/models
3. Parse response, extract model IDs
4. Store in `models` JSON field
5. Display in dropdown for selection
```

### 3. Duties, Skills, Rules (Global Behavior)

#### Duties

**Purpose:** Define what the AI agent should do proactively

**Examples:**
- "Generate unit tests for new functions"
- "Check for security vulnerabilities"
- "Optimize database queries"
- "Add JSDoc comments to functions"

**Structure:**
```php
{
    name: "Generate Tests",
    description: "Automatically create tests for new code",
    instructions: "When user creates a new function, suggest unit tests...",
    is_active: true,
    priority: 10,
    schedule_type: "manual" | "interval" | "daily"
}
```

#### Skills

**Purpose:** Define how the AI performs tasks

**Examples:**
- "Code refactoring patterns"
- "Best practices for Laravel"
- "React hooks optimization"

**Structure:**
```php
{
    name: "Laravel Best Practices",
    type: "knowledge",
    content: "Always use dependency injection, follow PSR-12...",
    is_active: true
}
```

#### Rules

**Purpose:** Constraints and safety guidelines

**Examples:**
- "Never modify .env files"
- "Always add try-catch for database operations"
- "Don't delete migration files"

**Structure:**
```php
{
    name: "File Safety Rules",
    rule_text: "Never delete files without user confirmation...",
    is_active: true,
    severity: "critical" | "warning" | "info"
}
```

### 4. AUTO Mode Logic

**Flow Diagram:**

```
User sends chat message
    │
    ├─> Model selected manually? ──Yes──> Use selected model
    │                                           │
    └─> AUTO mode? ──Yes──> Select best model  │
                               │                │
                               ▼                │
                    ┌─────────────────────┐    │
                    │  Priority Ranking   │    │
                    │  1. GPT-4 Turbo     │    │
                    │  2. Gemini Pro      │    │
                    │  3. Mistral Large   │    │
                    │  4. GPT-3.5 Turbo   │    │
                    └─────────────────────┘    │
                               │                │
                               ▼                │
                    Check model availability   │
                               │                │
                               ▼                │
                    ┌─────────────────────┐    │
                    │  Rate Limit Check   │    │
                    │  (from last error)  │    │
                    └─────────────────────┘    │
                               │                │
                               ├─ Available ────┤
                               │                │
                               ├─ Limit hit ────> Try next model
                               │                      │
                               └──────────────────────┘
                                                │
                                                ▼
                                        Call AI Provider
                                                │
                                        ┌───────┴────────┐
                                        │                │
                                   Success          Rate Limit Error
                                        │                │
                                        │                ▼
                                        │         Mark model as limited
                                        │         Auto-switch to next
                                        │                │
                                        └────────┬───────┘
                                                 │
                                                 ▼
                                         Return response
```

**Implementation:**

```php
// AIManager.php

protected function selectBestModel($endpoint)
{
    $models = $endpoint->models;

    // Model priority (higher = better)
    $priority = [
        'gpt-4-turbo' => 100,
        'gpt-4' => 95,
        'gemini-1.5-pro' => 90,
        'mistral-large' => 85,
        'gpt-3.5-turbo' => 70,
        'gemini-1.5-flash' => 65
    ];

    // Check rate limit cache
    $rateLimited = Cache::get("model_rate_limited:{$endpoint->id}", []);

    // Sort models by priority, filter out rate-limited
    $availableModels = collect($models)
        ->sortByDesc(fn($model) => $priority[$model['id']] ?? 0)
        ->filter(fn($model) => !in_array($model['id'], $rateLimited))
        ->values();

    if ($availableModels->isEmpty()) {
        // All models rate-limited, clear cache and retry
        Cache::forget("model_rate_limited:{$endpoint->id}");
        return $this->selectBestModel($endpoint);
    }

    return $availableModels->first()['id'];
}

protected function handleRateLimitError($endpoint, $modelId)
{
    $rateLimited = Cache::get("model_rate_limited:{$endpoint->id}", []);
    $rateLimited[] = $modelId;

    // Cache for 5 minutes
    Cache::put("model_rate_limited:{$endpoint->id}", $rateLimited, now()->addMinutes(5));

    // Retry with next model
    $nextModel = $this->selectBestModel($endpoint);
    if ($nextModel !== $modelId) {
        return $this->callProvider($endpoint, $nextModel, $messages);
    }

    throw new \Exception('All models rate-limited. Please try again later.');
}
```

### 5. Context Building for Code Editor

The AI system must understand the code context. When a user asks a question or requests an action, the system builds context from:

1. **Current File**
   - File path
   - Language
   - Full content
   - Cursor position (future enhancement)

2. **Open Files**
   - All tabs currently open
   - Their contents
   - Relationships (imports, etc.)

3. **Project Structure** (future enhancement)
   - File tree structure
   - Dependencies (package.json, composer.json)
   - Framework detection (Laravel, React)

4. **Duties**
   - Active duties relevant to the task
   - Example: "Generate tests" duty activates when user creates a function

5. **Skills**
   - Relevant knowledge bases
   - Example: "Laravel Best Practices" skill loads when editing .php files

6. **Rules**
   - Active safety rules
   - Example: "Don't modify .env" rule always applies

**Context Assembly:**

```php
protected function buildCodeContext($currentFile, $openFiles, $duties, $skills, $rules)
{
    $context = "# Code Editor Context\n\n";

    // Current file
    if ($currentFile) {
        $context .= "## Current File\n\n";
        $context .= "**Path:** `{$currentFile['path']}`\n";
        $context .= "**Language:** {$currentFile['language']}\n\n";
        $context .= "```{$currentFile['language']}\n";
        $context .= $currentFile['content'];
        $context .= "\n```\n\n";
    }

    // Open files (abbreviated)
    if (!empty($openFiles)) {
        $context .= "## Open Files\n\n";
        foreach ($openFiles as $file) {
            $context .= "- `{$file['path']}`\n";
        }
        $context .= "\n";
    }

    // Active duties
    if ($duties->isNotEmpty()) {
        $context .= "## Your Duties\n\n";
        foreach ($duties as $duty) {
            $context .= "### {$duty->name}\n";
            $context .= "{$duty->instructions}\n\n";
        }
    }

    // Relevant skills
    if ($skills->isNotEmpty()) {
        $context .= "## Skills & Knowledge\n\n";
        foreach ($skills as $skill) {
            $context .= "### {$skill->name}\n";
            $context .= "{$skill->content}\n\n";
        }
    }

    // Rules
    if ($rules->isNotEmpty()) {
        $context .= "## Rules & Constraints\n\n";
        foreach ($rules as $rule) {
            $context .= "- [{$rule->severity}] {$rule->rule_text}\n";
        }
        $context .= "\n";
    }

    return $context;
}
```

### 6. Code Change Parsing

When AI suggests code changes, they must be parsed and applied. The AI should return changes in a structured format:

**Format Convention:**

````markdown
I'll help you refactor this function. Here are the changes:

```php:app/Models/User.php
<?php

namespace App\Models;

// Updated code here...
```

```php:app/Services/UserService.php
// New file or updated code
```
````

**Parser:**

```php
protected function parseCodeChanges($response)
{
    // Match pattern: ```language:path\ncode\n```
    preg_match_all('/```(\w+):([^\n]+)\n(.*?)```/s', $response, $matches, PREG_SET_ORDER);

    $changes = [];

    foreach ($matches as $match) {
        $language = $match[1];
        $path = trim($match[2]);
        $content = $match[3];

        // Determine action (create, update, delete)
        $action = 'update';
        if (strpos($response, "create new file: $path") !== false) {
            $action = 'create';
        } elseif (strpos($response, "delete file: $path") !== false) {
            $action = 'delete';
        }

        $changes[] = [
            'language' => $language,
            'path' => $path,
            'content' => $content,
            'action' => $action
        ];
    }

    return $changes;
}
```

---

## Chat UI System

### 1. Chat Panel Component

**File:** `resources/js/Admin/components/CodeEditor/AIChatPanel.jsx`

```jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, X, Settings, Zap } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AIChatPanel({ currentFile, openFiles, onClose, onApplyChanges }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [endpoints, setEndpoints] = useState([]);
    const [selectedEndpoint, setSelectedEndpoint] = useState(null);
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('AUTO');
    const [isAuto, setIsAuto] = useState(true);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadEndpoints();
    }, []);

    useEffect(() => {
        if (selectedEndpoint) {
            loadModels(selectedEndpoint);
        }
    }, [selectedEndpoint]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    async function loadEndpoints() {
        try {
            const response = await axios.get('/api/ai/endpoints');
            const active = response.data.endpoints.filter(e => e.is_active);
            setEndpoints(active);
            if (active.length > 0) {
                setSelectedEndpoint(active[0].id);
            }
        } catch (error) {
            toast.error('Failed to load AI endpoints');
        }
    }

    async function loadModels(endpointId) {
        const endpoint = endpoints.find(e => e.id === endpointId);
        if (endpoint && endpoint.models) {
            const modelList = [
                { id: 'AUTO', name: '🤖 AUTO (Best Available)' },
                ...endpoint.models.map(m => ({ id: m.id, name: m.name || m.id }))
            ];
            setModels(modelList);
        }
    }

    async function handleSend() {
        if (!input.trim() || loading) return;

        const userMessage = {
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await axios.post('/api/ai/chat/editor', {
                message: input,
                endpoint_id: selectedEndpoint,
                model_id: isAuto ? 'AUTO' : selectedModel,
                current_file: currentFile ? {
                    path: currentFile.path,
                    content: currentFile.content,
                    language: currentFile.language
                } : null,
                open_files: openFiles.map(f => ({
                    path: f.path,
                    content: f.content,
                    language: f.language
                }))
            });

            const aiMessage = {
                role: 'assistant',
                content: response.data.message,
                code_changes: response.data.code_changes || [],
                model_used: response.data.model_used,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            const errorMessage = {
                role: 'assistant',
                content: `Error: ${error.response?.data?.error || error.message}`,
                isError: true,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
            toast.error('AI request failed');
        } finally {
            setLoading(false);
        }
    }

    function handleApply(changes) {
        onApplyChanges(changes);
        toast.success('Changes applied to editor');
    }

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    return (
        <div className="ai-chat-panel">
            {/* Header */}
            <div className="chat-header">
                <div className="chat-title">
                    <Zap size={18} />
                    <span>AI Assistant</span>
                </div>
                <button className="btn-icon" onClick={onClose}>
                    <X size={18} />
                </button>
            </div>

            {/* Model Selection */}
            <div className="chat-controls">
                <div className="form-group">
                    <label>Provider</label>
                    <select
                        className="form-select form-select-sm"
                        value={selectedEndpoint || ''}
                        onChange={(e) => setSelectedEndpoint(Number(e.target.value))}
                    >
                        {endpoints.map(ep => (
                            <option key={ep.id} value={ep.id}>
                                {ep.name} ({ep.provider})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>
                        Model
                        <span className="ms-2">
                            <input
                                type="checkbox"
                                checked={isAuto}
                                onChange={(e) => {
                                    setIsAuto(e.target.checked);
                                    if (e.target.checked) {
                                        setSelectedModel('AUTO');
                                    }
                                }}
                            />
                            <span className="ms-1">AUTO</span>
                        </span>
                    </label>
                    <select
                        className="form-select form-select-sm"
                        value={selectedModel}
                        onChange={(e) => {
                            setSelectedModel(e.target.value);
                            setIsAuto(e.target.value === 'AUTO');
                        }}
                        disabled={isAuto}
                    >
                        {models.map(model => (
                            <option key={model.id} value={model.id}>
                                {model.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="chat-empty-state">
                        <Zap size={48} />
                        <h5>AI Code Assistant</h5>
                        <p>Ask me to help with:</p>
                        <ul>
                            <li>Refactoring code</li>
                            <li>Explaining code</li>
                            <li>Finding bugs</li>
                            <li>Writing new features</li>
                            <li>Generating tests</li>
                        </ul>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role} ${msg.isError ? 'error' : ''}`}>
                        <div className="message-header">
                            <strong>{msg.role === 'user' ? 'You' : 'AI'}</strong>
                            {msg.model_used && (
                                <span className="model-badge">{msg.model_used}</span>
                            )}
                            <span className="message-time">
                                {msg.timestamp.toLocaleTimeString()}
                            </span>
                        </div>
                        <div className="message-content">
                            {msg.content}
                        </div>

                        {msg.code_changes && msg.code_changes.length > 0 && (
                            <div className="message-actions">
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleApply(msg.code_changes)}
                                >
                                    Apply Changes ({msg.code_changes.length})
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="chat-message assistant loading">
                        <div className="message-content">
                            <div className="spinner-border spinner-border-sm me-2" />
                            Thinking...
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input">
                <textarea
                    className="form-control"
                    placeholder="Ask AI to help with your code..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    rows={3}
                    disabled={loading}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
```

### 2. Chat Styling

```scss
.ai-chat-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary);
}

.chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
}

.chat-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
}

.chat-controls {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-tertiary);

    .form-group {
        margin-bottom: 8px;

        &:last-child {
            margin-bottom: 0;
        }
    }

    label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--text-muted);
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.chat-empty-state {
    text-align: center;
    color: var(--text-muted);
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
        background: var(--primary-color-light);
        margin-left: 40px;
    }

    &.assistant {
        background: var(--bg-tertiary);
        margin-right: 40px;
    }

    &.error {
        background: var(--danger-color-light);
        border-left: 3px solid var(--danger-color);
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

.model-badge {
    background: var(--primary-color);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
}

.message-time {
    margin-left: auto;
    color: var(--text-muted);
}

.message-content {
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.5;
}

.message-actions {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
}

.chat-input {
    display: flex;
    gap: 8px;
    padding: 16px;
    border-top: 1px solid var(--border-color);

    textarea {
        resize: none;
    }

    button {
        align-self: flex-end;
    }
}
```

### 3. Error Handling

**Common Issues & Solutions:**

| Issue | Cause | Solution |
|-------|-------|----------|
| "Model undefined" | No endpoint selected | Auto-select first active endpoint |
| "No models available" | Models not fetched | Add "Refresh Models" button |
| "Rate limit exceeded" | Provider limit hit | AUTO mode switches to next model |
| "Endpoint inactive" | Endpoint disabled | Filter to show only active endpoints |
| "Invalid API key" | Wrong credentials | Show clear error, link to settings |

**Error Recovery Flow:**

```javascript
try {
    // Call AI API
} catch (error) {
    if (error.response?.status === 429) {
        // Rate limit - switch model
        if (isAuto) {
            // Retry with next model automatically
            return retryWithNextModel();
        } else {
            toast.error('Rate limit exceeded. Try AUTO mode.');
        }
    } else if (error.response?.status === 401) {
        toast.error('Invalid API key. Please check endpoint settings.');
    } else if (error.response?.status === 404) {
        toast.error('Model not found. Please select a different model.');
    } else {
        toast.error(`AI request failed: ${error.message}`);
    }
}
```

---

## MCP Permissions System

### 1. Overview

The MCP (Model Context Protocol) system provides fine-grained access control for:
- **Database entities** (tables via Section Builder)
- **File operations** (code editor)
- **AI agent actions** (read/write permissions)

### 2. Permission Levels

#### Table-Level Permissions (Existing)

**Model:** `SectionEntity`

```php
'mcp_readable' => true,      // AI can read data
'mcp_writable' => true,      // AI can create/update
'mcp_deletable' => true,     // AI can delete
'mcp_enabled' => true        // Overall MCP access
```

#### Field-Level Permissions (Existing)

**Model:** `SectionField`

```php
'mcp_readable' => true,      // AI can see this field
'mcp_writable' => true       // AI can modify this field
```

#### File-Level Permissions (New)

**Model:** `CodeEditorPermission`

```php
'path_pattern' => '/app/Models/*.php',  // Glob pattern
'can_read' => true,
'can_write' => true,
'can_delete' => false,
'can_execute' => false,
'user_id' => null              // null = applies to all
```

### 3. Permission Evaluation Flow

```
AI Request
    │
    ▼
┌─────────────────────┐
│   Check User Role   │
│   Admin? → Allow    │
└─────────────────────┘
    │
    ▼ Not Admin
┌─────────────────────┐
│  Check API Key      │
│  SITE_API_KEY?      │
│  MCP_API_KEY?       │
│  → Allow            │
└─────────────────────┘
    │
    ▼ No API Key
┌─────────────────────┐
│  Check MCP Perms    │
│  - Entity level     │
│  - Field level      │
│  - File level       │
└─────────────────────┘
    │
    ├─ Allowed → Execute
    └─ Denied  → 403 Error
```

### 4. Permission UI

#### File Permission Manager

**Page:** `/admin/code-editor/permissions`

**Features:**
- List all permission rules
- Add new rules with glob patterns
- Test patterns against paths
- Enable/disable rules
- Per-user overrides

**Component Example:**

```jsx
export default function FilePermissions() {
    const [permissions, setPermissions] = useState([]);
    const [testPath, setTestPath] = useState('');
    const [testResult, setTestResult] = useState(null);

    async function testPermission() {
        const response = await axios.post('/api/code-editor/permissions/test', {
            path: testPath,
            action: 'write'
        });
        setTestResult(response.data);
    }

    return (
        <div className="card">
            <div className="card-header">
                <h5>File Permissions</h5>
            </div>

            <div className="card-body">
                {/* Permission Rules Table */}
                <DataTable
                    columns={[
                        { key: 'path_pattern', label: 'Pattern' },
                        { key: 'can_read', label: 'Read', render: (val) => val ? '✓' : '✗' },
                        { key: 'can_write', label: 'Write', render: (val) => val ? '✓' : '✗' },
                        { key: 'can_delete', label: 'Delete', render: (val) => val ? '✓' : '✗' },
                        { key: 'description', label: 'Description' }
                    ]}
                    data={permissions}
                />

                {/* Test Tool */}
                <div className="mt-4">
                    <h6>Test Permission</h6>
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="/app/Models/User.php"
                            value={testPath}
                            onChange={(e) => setTestPath(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={testPermission}>
                            Test
                        </button>
                    </div>

                    {testResult && (
                        <div className={`alert mt-2 ${testResult.allowed ? 'alert-success' : 'alert-danger'}`}>
                            {testResult.allowed ? 'Allowed' : 'Denied'}
                            {testResult.matching_rule && (
                                <div>Matched rule: {testResult.matching_rule}</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
```

### 5. Default Permission Rules

When the system is initialized, these default rules are created:

```php
// Safe to read
CodeEditorPermission::create([
    'path_pattern' => '/app/**/*.php',
    'can_read' => true,
    'can_write' => true,
    'description' => 'Application code'
]);

CodeEditorPermission::create([
    'path_pattern' => '/resources/**/*',
    'can_read' => true,
    'can_write' => true,
    'description' => 'Frontend resources'
]);

// Read-only
CodeEditorPermission::create([
    'path_pattern' => '/config/**/*.php',
    'can_read' => true,
    'can_write' => false,
    'description' => 'Configuration files (read-only)'
]);

// Forbidden
CodeEditorPermission::create([
    'path_pattern' => '/.env*',
    'can_read' => false,
    'can_write' => false,
    'can_delete' => false,
    'description' => 'Environment files (forbidden)'
]);

CodeEditorPermission::create([
    'path_pattern' => '/vendor/**/*',
    'can_read' => true,
    'can_write' => false,
    'description' => 'Vendor dependencies (read-only)'
]);

CodeEditorPermission::create([
    'path_pattern' => '/database/migrations/*.php',
    'can_read' => true,
    'can_write' => false,
    'can_delete' => false,
    'description' => 'Database migrations (read-only)'
]);
```

---

## Automation & Duties

### 1. Duty System Integration

The existing `AiDuty` system can be extended to work with the code editor:

#### Duty Types for Code Editor

```php
// Existing duty types
'schedule_type' => 'manual' | 'interval' | 'daily' | 'weekly' | 'monthly' | 'cron'

// New: Code editor-specific triggers
'trigger_type' => 'file_save' | 'file_create' | 'git_commit' | 'on_demand'
```

#### Example Duties

**1. Auto-Generate Tests**

```php
AiDuty::create([
    'name' => 'Generate Unit Tests',
    'description' => 'Automatically create tests for new code',
    'trigger_type' => 'file_create',
    'trigger_pattern' => '/app/**/*.php',
    'instructions' => 'When a new PHP file is created in /app, generate corresponding PHPUnit tests in /tests',
    'execution_data' => json_encode([
        'test_template' => 'phpunit',
        'coverage_target' => 80
    ]),
    'is_active' => true,
    'priority' => 10
]);
```

**2. Code Review on Save**

```php
AiDuty::create([
    'name' => 'Code Review Assistant',
    'description' => 'Review code for issues when saved',
    'trigger_type' => 'file_save',
    'trigger_pattern' => '/app/**/*.php',
    'instructions' => 'Review the saved file for: security vulnerabilities, performance issues, code style violations, best practice violations',
    'is_active' => true,
    'priority' => 5
]);
```

**3. Documentation Generator**

```php
AiDuty::create([
    'name' => 'Auto-Document Functions',
    'description' => 'Add PHPDoc comments to functions',
    'trigger_type' => 'on_demand',
    'instructions' => 'Add comprehensive PHPDoc comments to all functions without documentation',
    'is_active' => true
]);
```

### 2. Duty Execution in Editor

**Trigger Points:**

```javascript
// After file save
async function handleSave(content) {
    await axios.put('/api/code-editor/files/update', { path, content });

    // Trigger duties
    const duties = await axios.post('/api/ai/duties/trigger', {
        event: 'file_save',
        file_path: path,
        file_content: content
    });

    // Display duty results
    if (duties.data.suggestions.length > 0) {
        showDutySuggestions(duties.data.suggestions);
    }
}
```

**Duty Result Display:**

```jsx
function DutySuggestions({ suggestions, onApply, onDismiss }) {
    return (
        <div className="duty-suggestions">
            <div className="alert alert-info">
                <strong>AI Suggestions</strong>
                <p>{suggestions.length} duties have suggestions for this file</p>
            </div>

            {suggestions.map((suggestion, idx) => (
                <div key={idx} className="duty-suggestion-card">
                    <h6>{suggestion.duty_name}</h6>
                    <p>{suggestion.message}</p>

                    {suggestion.changes && (
                        <div className="suggested-changes">
                            <pre>{suggestion.changes}</pre>
                            <div className="actions">
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => onApply(suggestion.changes)}
                                >
                                    Apply
                                </button>
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => onDismiss(idx)}
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
```

### 3. Automation Flow: Credential → Duty → Scheduler → Upload

This is the existing YouTube scraper pattern, extended for general automation:

```
┌─────────────────────┐
│  1. Admin Adds      │
│     Credentials     │
│  (API Token, URL)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Duty Auto-      │
│     Created         │
│  (Scrape playlist)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. Scheduler Runs  │
│     (Cron job)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  4. Execute Duty    │
│  - Fetch data       │
│  - Process with AI  │
│  - Transform        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  5. Upload to       │
│     Platform        │
│  (HTTP POST)        │
└─────────────────────┘
```

**Controller Implementation:**

```php
// When platform credentials are saved
public function storePlatform(Request $request)
{
    $platform = AiPlatform::create($request->validated());

    // Auto-create associated duty
    $this->createPlatformDuty($platform);

    return response()->json($platform);
}

protected function createPlatformDuty(AiPlatform $platform)
{
    AiDuty::create([
        'name' => "Sync to {$platform->name}",
        'description' => "Automatically sync content to {$platform->name}",
        'schedule_type' => 'daily',
        'schedule_value' => '02:00', // 2 AM
        'instructions' => "Fetch latest content and push to {$platform->name}",
        'execution_data' => json_encode([
            'platform_id' => $platform->id,
            'platform_type' => $platform->type
        ]),
        'is_active' => true,
        'priority' => 10
    ]);
}
```

---

## YouTube Scraper Integration

### 1. Current Implementation

**Service:** `App\Services\AI\YouTubeScraperService`

**Features:**
- Scrapes YouTube playlists (HTML + API fallback)
- Extracts video metadata
- AI generates tags/genres via Mistral
- Pushes to streaming platforms (artist/album/track structure)
- Watchlist integration

### 2. Integration with Code Editor

While the scraper doesn't directly integrate with the code editor, it demonstrates the automation pattern:

**Workflow:**

```
1. Admin adds YouTube playlist URL
2. System scrapes playlist → creates YoutubePlaylist record
3. System fetches videos → creates YoutubeVideo records
4. Duty executes:
   - For each video:
     - Call AI to generate tags/genres
     - Transform to platform format
     - Push via API
5. Track status in youtube_platform_pushes
```

### 3. AI Metadata Generation

**Example from YouTube Scraper:**

```php
protected function generateMetadata($video)
{
    $prompt = "Generate metadata for this video:\n\n";
    $prompt .= "Title: {$video->title}\n";
    $prompt .= "Description: {$video->description}\n\n";
    $prompt .= "Provide:\n";
    $prompt .= "- 5-10 relevant tags\n";
    $prompt .= "- 2-3 genre classifications\n";

    $response = $this->aiManager->chat([
        'endpoint_id' => $this->getMistralEndpoint(),
        'model_id' => 'mistral-large',
        'message' => $prompt
    ]);

    $parsed = $this->parseMetadataResponse($response);

    $video->update([
        'ai_tags' => $parsed['tags'],
        'ai_genres' => $parsed['genres']
    ]);
}
```

**Same Pattern for Code:**

```php
protected function generateCodeTags($file)
{
    $prompt = "Analyze this code and generate metadata:\n\n";
    $prompt .= "File: {$file['path']}\n";
    $prompt .= "```{$file['language']}\n{$file['content']}\n```\n\n";
    $prompt .= "Provide:\n";
    $prompt .= "- Purpose of the file\n";
    $prompt .= "- Key functions/classes\n";
    $prompt .= "- Dependencies\n";
    $prompt .= "- Suggested documentation improvements\n";

    // Similar AI call
}
```

### 4. Push to Platform Pattern

**Streaming Platform (Artist/Album/Track):**

```php
// Transform playlist → album
$albumData = [
    'name' => $playlist->title,
    'artist' => $playlist->channel_name,
    'description' => $playlist->description,
    'tracks' => []
];

foreach ($playlist->videos as $video) {
    $albumData['tracks'][] = [
        'title' => $video->title,
        'duration' => $video->duration,
        'url' => $video->url,
        'tags' => $video->ai_tags,
        'genre' => $video->ai_genres[0] ?? null
    ];
}

// POST to platform API
Http::withToken($platform->api_token)
    ->post("{$platform->base_url}/api/albums", $albumData);
```

**Watchlist Platform (Series/Episodes):**

```php
// Transform playlist → series
$seriesData = [
    'name' => $playlist->title,
    'description' => $playlist->description,
    'episodes' => []
];

foreach ($playlist->videos as $index => $video) {
    $seriesData['episodes'][] = [
        'episode_number' => $index + 1,
        'title' => $video->title,
        'duration' => $video->duration,
        'url' => $video->url
    ];
}

Http::withToken($platform->api_token)
    ->post("{$platform->base_url}/api/series", $seriesData);
```

---

## Section/Table/Field Logic

### 1. Current Issues & Fixes

#### Issue #1: System Fields Showing

**Problem:** Fields like `id`, `created_at`, `updated_at` show in UI

**Solution:** Filter system fields

```php
// SectionField model
public function scopeUserCreated($query)
{
    $systemFields = ['id', 'created_at', 'updated_at', 'deleted_at'];

    return $query->whereNotIn('column_name', $systemFields);
}

// Usage in controller
$fields = SectionField::where('section_entity_id', $entityId)
    ->userCreated()
    ->orderBy('sort_order')
    ->get();
```

#### Issue #2: Slug Required for Fields

**Problem:** Fields currently require slug, but should auto-generate from name

**Solution:** Auto-generate in model observer

```php
// SectionField observer
class SectionFieldObserver
{
    public function creating(SectionField $field)
    {
        if (empty($field->slug)) {
            $field->slug = Str::slug($field->label ?: $field->column_name);
        }
    }
}
```

#### Issue #3: API Request/Response Not Visible

**Problem:** Hard to debug API calls

**Solution:** Add API documentation component

```jsx
// SectionApi.jsx - Enhanced
export default function SectionApi({ entity }) {
    const [selectedEndpoint, setSelectedEndpoint] = useState('list');
    const [requestBody, setRequestBody] = useState('{}');
    const [response, setResponse] = useState(null);

    const endpoints = [
        {
            method: 'GET',
            path: `/api/entities/${entity.slug}`,
            name: 'List',
            description: 'Get all records with pagination'
        },
        {
            method: 'GET',
            path: `/api/entities/${entity.slug}/{id}`,
            name: 'Show',
            description: 'Get single record by ID'
        },
        {
            method: 'POST',
            path: `/api/entities/${entity.slug}`,
            name: 'Create',
            description: 'Create new record',
            sampleBody: entity.fields.reduce((acc, field) => {
                if (!field.is_system) {
                    acc[field.column_name] = field.type === 'string' ? 'Example value' : null;
                }
                return acc;
            }, {})
        },
        // ... more endpoints
    ];

    async function testEndpoint() {
        try {
            const endpoint = endpoints.find(e => e.name === selectedEndpoint);
            const method = endpoint.method.toLowerCase();

            let config = {
                method,
                url: endpoint.path.replace('{id}', '1'),
            };

            if (method !== 'get') {
                config.data = JSON.parse(requestBody);
            }

            const result = await axios(config);
            setResponse({
                status: result.status,
                data: result.data,
                headers: result.headers
            });
        } catch (error) {
            setResponse({
                status: error.response?.status || 'Error',
                data: error.response?.data || error.message,
                headers: error.response?.headers
            });
        }
    }

    return (
        <div className="section-api-tester">
            <div className="row">
                <div className="col-md-6">
                    <h5>Request</h5>

                    <div className="form-group">
                        <label>Endpoint</label>
                        <select
                            className="form-select"
                            value={selectedEndpoint}
                            onChange={(e) => {
                                setSelectedEndpoint(e.target.value);
                                const ep = endpoints.find(x => x.name === e.target.value);
                                if (ep.sampleBody) {
                                    setRequestBody(JSON.stringify(ep.sampleBody, null, 2));
                                }
                            }}
                        >
                            {endpoints.map(ep => (
                                <option key={ep.name} value={ep.name}>
                                    {ep.method} {ep.path}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Request Body</label>
                        <textarea
                            className="form-control font-monospace"
                            rows={10}
                            value={requestBody}
                            onChange={(e) => setRequestBody(e.target.value)}
                        />
                    </div>

                    <button className="btn btn-primary" onClick={testEndpoint}>
                        Send Request
                    </button>
                </div>

                <div className="col-md-6">
                    <h5>Response</h5>

                    {response && (
                        <div className="response-container">
                            <div className="response-status">
                                Status: <span className={`badge bg-${response.status < 400 ? 'success' : 'danger'}`}>
                                    {response.status}
                                </span>
                            </div>

                            <div className="response-body">
                                <pre>{JSON.stringify(response.data, null, 2)}</pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* API Documentation */}
            <div className="mt-4">
                <h5>Available Columns</h5>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Column</th>
                            <th>Type</th>
                            <th>Required</th>
                            <th>MCP Read</th>
                            <th>MCP Write</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entity.fields.filter(f => !f.is_system).map(field => (
                            <tr key={field.id}>
                                <td><code>{field.column_name}</code></td>
                                <td>{field.type}</td>
                                <td>{field.required ? 'Yes' : 'No'}</td>
                                <td>{field.mcp_readable ? '✓' : '✗'}</td>
                                <td>{field.mcp_writable ? '✓' : '✗'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
```

#### Issue #4: Columns Not Matching Configuration

**Problem:** Displayed columns don't match `list_visible` settings

**Solution:** Enforce in DataTable component

```jsx
// EntityDataList.jsx
const columns = entity.fields
    .filter(field => field.list_visible && !field.is_system)
    .map(field => ({
        accessorKey: field.column_name,
        header: field.label || field.column_name,
        sortable: field.is_sortable,
        searchable: field.is_searchable
    }));

<DataTable
    columns={columns}
    data={data}
    // ...
/>
```

---

## Implementation Plan

### Phase 1: Backend Setup (Week 1)

**Tasks:**

1. **Create File System API** (2 days)
   - [ ] Create `CodeEditorController`
   - [ ] Implement all file operations (list, read, create, update, delete, rename)
   - [ ] Add path validation and security
   - [ ] Register routes
   - [ ] Write tests

2. **Extend AI Manager** (2 days)
   - [ ] Add `chatWithCode()` method
   - [ ] Implement `buildCodeContext()`
   - [ ] Add `parseCodeChanges()`
   - [ ] Implement `selectBestModel()` (AUTO mode)
   - [ ] Add rate limit handling

3. **File Permissions System** (1 day)
   - [ ] Create `CodeEditorPermission` model
   - [ ] Create migration
   - [ ] Add permission checking middleware
   - [ ] Seed default permissions

4. **Duty System Enhancement** (2 days)
   - [ ] Add `trigger_type` field to duties
   - [ ] Create duty trigger logic
   - [ ] Implement file event handlers
   - [ ] Add duty result formatting

### Phase 2: Frontend Core (Week 2)

**Tasks:**

1. **Monaco Editor Integration** (2 days)
   - [ ] Install `@monaco-editor/react`
   - [ ] Create `MonacoEditor` component
   - [ ] Add save command (Ctrl+S)
   - [ ] Configure themes and options
   - [ ] Add language detection

2. **File Explorer** (2 days)
   - [ ] Create `FileExplorer` component
   - [ ] Implement tree view with expand/collapse
   - [ ] Add file icons
   - [ ] Implement file selection
   - [ ] Add search functionality (future)

3. **Tab System** (1 day)
   - [ ] Create `EditorTabs` component
   - [ ] Implement tab switching
   - [ ] Add close button
   - [ ] Show unsaved indicator
   - [ ] Handle unsaved warning

4. **Main Editor Page** (2 days)
   - [ ] Create `CodeEditor.jsx` page
   - [ ] Integrate all components
   - [ ] Implement state management
   - [ ] Add file loading/saving
   - [ ] Handle errors

### Phase 3: AI Integration (Week 3)

**Tasks:**

1. **Chat Panel UI** (3 days)
   - [ ] Create `AIChatPanel` component
   - [ ] Build message list
   - [ ] Add input with send button
   - [ ] Implement model selector
   - [ ] Add AUTO mode toggle
   - [ ] Show loading states

2. **AI Communication** (2 days)
   - [ ] Create `/api/ai/chat/editor` endpoint
   - [ ] Send current file context
   - [ ] Send open files context
   - [ ] Handle responses
   - [ ] Parse code changes

3. **Code Application** (2 days)
   - [ ] Display code change previews
   - [ ] Add "Apply" button
   - [ ] Update editor content
   - [ ] Mark tabs as unsaved
   - [ ] Show success/error messages

### Phase 4: Polish & Features (Week 4)

**Tasks:**

1. **Styling** (2 days)
   - [ ] Create SCSS for all components
   - [ ] Match existing admin theme
   - [ ] Add dark mode support
   - [ ] Make responsive
   - [ ] Add animations

2. **Permission Management** (2 days)
   - [ ] Create permissions management page
   - [ ] Build permission rule UI
   - [ ] Add test tool
   - [ ] Integrate with editor

3. **Section Builder Fixes** (1 day)
   - [ ] Hide system fields
   - [ ] Auto-generate slugs
   - [ ] Fix API tester
   - [ ] Fix column visibility

4. **Testing & Bug Fixes** (2 days)
   - [ ] Test all file operations
   - [ ] Test AI chat
   - [ ] Test permissions
   - [ ] Fix any issues
   - [ ] Write documentation

### Phase 5: Advanced Features (Future)

**Tasks:**

- [ ] Search in files
- [ ] Git integration
- [ ] Multi-file diff view
- [ ] Code snippets
- [ ] Keyboard shortcuts customization
- [ ] Collaborative editing
- [ ] Terminal integration
- [ ] Debugger integration

---

## UI Flow & User Experience

### 1. Initial Page Load

```
User navigates to /admin/apps/code-editor
    │
    ▼
Page renders with:
    - Sidebar (existing admin sidebar)
    - Navbar (existing admin navbar)
    - Editor layout:
        - File Explorer (left, 250px)
        - Editor Area (center, flex)
        - Chat Panel (right, 350px, collapsible)
    │
    ▼
File Explorer loads root directory
Chat Panel loads AI endpoints
    │
    ▼
Show empty state: "No file open"
```

### 2. File Selection Flow

```
User clicks file in explorer
    │
    ▼
Check if file already open
    ├─ Yes: Switch to existing tab
    └─ No: Load file content
        │
        ▼
    API: GET /api/code-editor/files/read?path=...
        │
        ▼
    Create new tab with content
    Set as active tab
    Monaco detects language
    Show file in editor
```

### 3. Editing Flow

```
User types in editor
    │
    ▼
onChange event fires
    │
    ▼
Update tab state:
    - content = new value
    - unsaved = true
    │
    ▼
Tab shows unsaved indicator (●)
```

### 4. Save Flow

```
User presses Ctrl+S (or clicks Save)
    │
    ▼
API: PUT /api/code-editor/files/update
    Body: { path, content }
    │
    ▼
Success?
    ├─ Yes:
    │   - Mark tab as saved
    │   - Show toast: "File saved"
    │   - Trigger duties (if configured)
    │   - Show duty suggestions (if any)
    │
    └─ No:
        - Show error toast
        - Keep unsaved state
```

### 5. AI Chat Flow

```
User types message in chat
User clicks Send (or Enter)
    │
    ▼
Add user message to chat
Show "Thinking..." indicator
    │
    ▼
API: POST /api/ai/chat/editor
    Body: {
        message,
        endpoint_id,
        model_id (or AUTO),
        current_file: { path, content, language },
        open_files: [...]
    }
    │
    ▼
Backend:
    - Determines model (AUTO or selected)
    - Builds context (file + duties + skills + rules)
    - Calls AI provider
    - Parses response for code changes
    │
    ▼
Response received
    │
    ▼
Add AI message to chat
Show model used (badge)
    │
    ▼
Code changes detected?
    ├─ Yes:
    │   - Show "Apply Changes" button
    │   - User clicks Apply
    │   - Update editor(s) with new code
    │   - Mark tabs as unsaved
    │
    └─ No:
        - Just show message
```

### 6. Model Selection Flow

```
Chat Panel loads
    │
    ▼
Fetch active AI endpoints
    │
    ▼
Select first endpoint by default
    │
    ▼
Load models for endpoint:
    - Add "AUTO" option first
    - Add provider models
    │
    ▼
AUTO is selected by default
    │
    ▼
User can:
    ├─ Keep AUTO (recommended)
    │   - System picks best model
    │   - Auto-switches on rate limit
    │
    └─ Select specific model
        - Disables AUTO
        - Uses only that model
        - Shows error if rate limited
```

### 7. Error Handling

**Rate Limit Error (AUTO mode):**
```
Request fails with 429
    │
    ▼
System marks model as rate-limited
    │
    ▼
Auto-selects next best model
    │
    ▼
Retries request
    │
    ▼
Shows user: "Switched to [model] due to rate limit"
```

**Rate Limit Error (Manual mode):**
```
Request fails with 429
    │
    ▼
Show error: "Rate limit exceeded for [model]. Try AUTO mode."
    │
    ▼
User must manually switch model or enable AUTO
```

**Permission Denied:**
```
File operation fails with 403
    │
    ▼
Show error: "Permission denied: You cannot [action] this file"
    │
    ▼
Log to console: Matching permission rule
```

**Network Error:**
```
Request fails (timeout, network)
    │
    ▼
Show error: "Network error. Please check your connection."
    │
    ▼
Retry button available
```

---

## Security Considerations

### 1. Path Traversal Prevention

**Threats:**
- User tries to access files outside project: `../../etc/passwd`
- Malicious AI suggests reading sensitive files

**Mitigations:**
```php
protected function sanitizePath($path)
{
    // Remove ../ attempts
    $path = str_replace('..', '', $path);

    // Ensure absolute path within project
    $fullPath = realpath($this->basePath . $path);

    if (!$fullPath || !str_starts_with($fullPath, $this->basePath)) {
        throw new \Exception('Invalid path');
    }

    return $path;
}
```

### 2. Code Injection Prevention

**Threats:**
- AI generates malicious code
- User pastes malicious code

**Mitigations:**
- All code is saved as plain text (no execution)
- File permissions prevent executing certain files
- Duty rules block dangerous operations
- Admin approval required for sensitive changes

### 3. API Key Security

**Threats:**
- API keys exposed in logs
- Keys transmitted insecurely

**Mitigations:**
```php
// Encrypt in database
protected $casts = [
    'api_key' => 'encrypted'
];

// Never log keys
Log::info('AI request', [
    'endpoint' => $endpoint->name,
    'model' => $model,
    'api_key' => '***REDACTED***'
]);

// Use HTTPS only
// Verify in middleware
if (!$request->secure()) {
    abort(403, 'HTTPS required');
}
```

### 4. Permission Bypass Prevention

**Threats:**
- User tries to bypass MCP permissions
- API key theft

**Mitigations:**
```php
// Always check permissions
if (!CodeEditorPermission::canPerform(auth()->id(), $path, 'write')) {
    abort(403);
}

// API keys use different permission sets
if ($request->bearerToken() === config('app.mcp_api_key')) {
    // Grant appropriate access
} else {
    // Enforce user permissions
}

// Log all operations
CodeEditorLog::create([
    'user_id' => auth()->id(),
    'action' => 'update',
    'path' => $path,
    'success' => true,
    'ip' => $request->ip()
]);
```

### 5. XSS Prevention

**Threats:**
- Malicious code in chat messages
- User injects scripts in file content

**Mitigations:**
```jsx
// Always sanitize displayed code
import DOMPurify from 'dompurify';

function ChatMessage({ content }) {
    return (
        <div dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(marked(content))
        }} />
    );
}

// Monaco handles code content safely
```

### 6. Rate Limiting

**Threats:**
- Abuse of AI API
- DoS attacks

**Mitigations:**
```php
// Laravel rate limiting
Route::middleware(['throttle:60,1'])->group(function () {
    Route::post('/ai/chat/editor', [AIChatController::class, 'editorChat']);
});

// Per-user limits
RateLimiter::for('ai-chat', function (Request $request) {
    return Limit::perUser(30)->per(minute);
});
```

---

## Extension Points & Future Enhancements

### 1. Near-Term Enhancements

**Search in Files**
- Add grep-like search across project
- Show results with file/line context
- Jump to search result

**Git Integration**
- Show git status in file explorer
- Commit/push from editor
- View diff before committing
- AI generates commit messages

**Keyboard Shortcuts**
- Customizable shortcuts
- Command palette (Ctrl+Shift+P)
- Quick file switcher (Ctrl+P)

**Code Snippets**
- Save reusable code snippets
- Share snippets across team
- AI suggests relevant snippets

### 2. Medium-Term Enhancements

**Collaborative Editing**
- Multiple users edit same file
- Show cursors of other users
- Real-time sync via WebSockets

**Terminal Integration**
- Embedded terminal in editor
- Run commands without leaving editor
- See output inline

**Debugger Integration**
- Set breakpoints
- Step through code
- Inspect variables
- Works with Xdebug (PHP)

**Language Server Protocol (LSP)**
- Better IntelliSense
- Go to definition
- Find references
- Rename refactoring

### 3. Long-Term Vision

**Visual Builder Integration**
- Drag-drop components
- Generate code automatically
- Preview changes live

**AI Pair Programming**
- AI suggests code as you type (Copilot-style)
- AI reviews PRs automatically
- AI detects bugs proactively

**Cloud Workspace**
- Save workspace state
- Resume from any device
- Team workspaces

**Plugin System**
- Allow custom extensions
- Marketplace for plugins
- API for third-party integrations

---

## Appendix

### A. File Structure

```
app/
├── Http/Controllers/
│   ├── CodeEditor/
│   │   └── CodeEditorController.php (NEW)
│   └── AI/
│       ├── AIChatController.php (UPDATE)
│       └── ...
├── Models/
│   ├── CodeEditorPermission.php (NEW)
│   └── ...
├── Services/
│   └── AI/
│       └── AIManager.php (UPDATE)
└── ...

resources/js/Admin/
├── views/admin/apps/
│   └── code-editor/
│       └── CodeEditor.jsx (NEW)
├── components/
│   └── CodeEditor/
│       ├── MonacoEditor.jsx (NEW)
│       ├── FileExplorer.jsx (NEW)
│       ├── EditorTabs.jsx (NEW)
│       └── AIChatPanel.jsx (NEW)
└── ...

resources/assets/scss/
└── components/
    └── _code-editor.scss (NEW)

database/migrations/
└── YYYY_MM_DD_create_code_editor_permissions_table.php (NEW)
```

### B. API Reference

#### File Operations

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/code-editor/files` | GET | List files |
| `/api/code-editor/files/read` | GET | Read file |
| `/api/code-editor/files/create` | POST | Create file/directory |
| `/api/code-editor/files/update` | PUT | Update file |
| `/api/code-editor/files/delete` | DELETE | Delete file/directory |
| `/api/code-editor/files/rename` | PUT | Rename/move file |
| `/api/code-editor/files/search` | GET | Search in files |

#### AI Operations

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai/chat/editor` | POST | AI chat with code context |
| `/api/ai/endpoints` | GET | List AI endpoints |
| `/api/ai/endpoints/{id}/fetch-models` | POST | Fetch models from provider |
| `/api/ai/duties/trigger` | POST | Trigger duties for file event |

#### Permissions

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/code-editor/permissions` | GET | List permission rules |
| `/api/code-editor/permissions` | POST | Create permission rule |
| `/api/code-editor/permissions/test` | POST | Test permission |

### C. Environment Variables

```env
# AI Providers
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
MISTRAL_API_KEY=...

# MCP Access
MCP_API_KEY=...
SITE_API_KEY=...

# Code Editor
CODE_EDITOR_BASE_PATH=/var/www/project
CODE_EDITOR_MAX_FILE_SIZE=10485760  # 10MB
CODE_EDITOR_ALLOWED_EXTENSIONS=php,js,jsx,ts,tsx,css,scss,html,json,md,txt
```

### D. FAQ

**Q: Will this replace my local IDE?**
A: No. This is for quick edits, AI-assisted coding, and online collaboration. Complex development should still use local IDE.

**Q: Is the AI always watching my code?**
A: No. AI only activates when you send a message or trigger a duty.

**Q: Can I disable AI features?**
A: Yes. The editor works standalone. Chat panel can be closed/hidden.

**Q: What if I accidentally delete a file?**
A: Consider adding a "trash" feature or requiring confirmation. Back up your files regularly.

**Q: Can non-admin users access the editor?**
A: Yes, if you add role-based permissions. By default, only admins.

**Q: How do I add a new AI provider?**
A: Go to AI > Manage Endpoints > Add Endpoint. Enter API key and base URL.

**Q: What's the difference between Duty, Skill, and Rule?**
- **Duty**: What the AI should do ("Generate tests")
- **Skill**: How the AI does it ("Laravel best practices")
- **Rule**: What the AI must not do ("Never delete migrations")

---

## Conclusion

This document defines a complete online code editor system integrated into your Laravel + React admin panel. The system provides:

✅ **Monaco Editor** with full IDE features
✅ **File System API** for safe file operations
✅ **AI Agent** with duties, skills, and rules
✅ **Global Provider Management** (OpenAI, Gemini, Mistral)
✅ **AUTO Mode** with intelligent model selection
✅ **Chat UI** embedded in editor
✅ **MCP Permissions** for fine-grained control
✅ **Automation System** for scheduled tasks
✅ **Production-Ready** architecture

The implementation plan is structured in 4-week phases, with clear tasks and deliverables.

**Next Steps:**
1. Review this document with your team
2. Prioritize features if needed
3. Begin Phase 1 implementation
4. Test incrementally
5. Deploy to staging
6. Gather feedback
7. Iterate and improve

**Key Success Factors:**
- Maintain existing UI consistency
- Ensure security at every layer
- Provide graceful error handling
- Make AI helpful, not intrusive
- Keep performance optimal
- Document as you build

This system will significantly enhance your admin panel, making it a powerful development platform with AI assistance built-in.

---

**Document Version:** 1.0
**Last Updated:** 2026-02-10
**Status:** Ready for Implementation

