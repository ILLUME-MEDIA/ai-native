<?php

use App\Http\Controllers\SectionBuilder\EntityController;
use App\Http\Controllers\SectionBuilder\FieldController;
use App\Http\Controllers\DynamicEntityController;
use App\Http\Controllers\Mcp\McpEntityController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you may register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->group(function () {
    // Section Builder meta configuration (admin SPA only)
    Route::get('/section-builder/entities', [EntityController::class, 'index'])
        ->name('api.section-builder.entities.index');
    Route::post('/section-builder/entities', [EntityController::class, 'store'])
        ->name('api.section-builder.entities.store');
    // Custom route binding: {entity} can be ID, slug, or table name - auto-creates if table exists
    Route::get('/section-builder/entities/{entity}', [EntityController::class, 'show'])
        ->where('entity', '[0-9]+|[a-zA-Z0-9_-]+')
        ->name('api.section-builder.entities.show');
    Route::patch('/section-builder/entities/{entity}', [EntityController::class, 'update'])
        ->where('entity', '[0-9]+|[a-zA-Z0-9_-]+')
        ->name('api.section-builder.entities.update');
    Route::get('/section-builder/entities/{entity}/mcp', [EntityController::class, 'getMcpConfig'])
        ->where('entity', '[0-9]+|[a-zA-Z0-9_-]+')
        ->name('api.section-builder.entities.mcp');

    // Custom route binding: {entity} can be ID, slug, or table name - auto-creates if table exists
    Route::get('/section-builder/entities/{entity}/fields', [FieldController::class, 'index'])
        ->where('entity', '[0-9]+|[a-zA-Z0-9_-]+')
        ->name('api.section-builder.fields.index');
    Route::post('/section-builder/entities/{entity}/fields', [FieldController::class, 'store'])
        ->where('entity', '[0-9]+|[a-zA-Z0-9_-]+')
        ->name('api.section-builder.fields.store');
    Route::patch('/section-builder/entities/{entity}/fields/{field}', [FieldController::class, 'update'])
        ->where('entity', '[0-9]+|[a-zA-Z0-9_-]+')
        ->name('api.section-builder.fields.update');
    Route::post('/section-builder/entities/{entity}/fields/reorder', [FieldController::class, 'reorder'])
        ->where('entity', '[0-9]+|[a-zA-Z0-9_-]+')
        ->name('api.section-builder.fields.reorder');

    //

    // AI Agent Management System (admin-only)
    Route::prefix('ai')->group(function () {
        Route::apiResource('endpoints', \App\Http\Controllers\AI\AIEndpointController::class);
        Route::post('endpoints/{endpoint}/fetch-models', [\App\Http\Controllers\AI\AIEndpointController::class, 'fetchModels']);

        Route::apiResource('platforms', \App\Http\Controllers\AI\AiPlatformController::class);
        Route::post('platforms/{platform}/streaming-push', [\App\Http\Controllers\AI\StreamingPlatformController::class, 'push']);
        Route::post('platforms/{platform}/watchlist-sync', [\App\Http\Controllers\AI\WatchlistPlatformController::class, 'sync']);


        Route::apiResource('duties', \App\Http\Controllers\AI\AiDutyController::class);
        Route::post('duties/{duty}/execute', [\App\Http\Controllers\AI\AiDutyController::class, 'execute']);
        Route::post('duties/{duty}/execute-now', [\App\Http\Controllers\AI\AiDutyController::class, 'executeNow']);

        Route::get('scrapers', [\App\Http\Controllers\AI\AiScraperController::class, 'index']);
        Route::post('scrapers', [\App\Http\Controllers\AI\AiScraperController::class, 'store']);
        Route::get('scrapers/{playlist}', [\App\Http\Controllers\AI\AiScraperController::class, 'show']);
        Route::post('scrapers/{playlist}/sync', [\App\Http\Controllers\AI\AiScraperController::class, 'sync']);
        Route::post('scrapers/{playlist}/enrich', [\App\Http\Controllers\AI\AiScraperController::class, 'enrich']);
        Route::post('scrapers/{playlist}/push', [\App\Http\Controllers\AI\AiScraperController::class, 'push']);
        Route::delete('scrapers/{playlist}', [\App\Http\Controllers\AI\AiScraperController::class, 'destroy']);
        Route::get('scrapers/videos/list', [\App\Http\Controllers\AI\AiScraperController::class, 'videos']);
        Route::post('scrapers/{playlist}/bulk-update', [\App\Http\Controllers\AI\AiScraperController::class, 'bulkUpdate']);
        Route::post('scrapers/videos/{videoId}/generate-metadata', [\App\Http\Controllers\AI\AiScraperController::class, 'generateMetadataForVideo']);

        Route::apiResource('skills', \App\Http\Controllers\AI\AiSkillController::class);
        Route::apiResource('rules', \App\Http\Controllers\AI\AiRuleController::class);

        Route::get('jira-config', [\App\Http\Controllers\AI\JiraConfigController::class, 'show']);
        Route::post('jira-config', [\App\Http\Controllers\AI\JiraConfigController::class, 'update']);

        Route::post('chat', [\App\Http\Controllers\AI\AIChatController::class, 'chat']);
        Route::post('chat/editor', [\App\Http\Controllers\AI\AIChatController::class, 'editorChat']);
        Route::get('chat/audit-logs', [\App\Http\Controllers\AI\AIChatController::class, 'auditLogs']);
    });

    // Code Editor Routes (Admin only)
    Route::prefix('code-editor')->group(function () {
        Route::get('/files', [\App\Http\Controllers\CodeEditor\CodeEditorController::class, 'list']);
        Route::get('/files/read', [\App\Http\Controllers\CodeEditor\CodeEditorController::class, 'read']);
        Route::get('/files/tree', [\App\Http\Controllers\CodeEditor\CodeEditorController::class, 'tree']);
        Route::get('/files/search', [\App\Http\Controllers\CodeEditor\CodeEditorController::class, 'search']);
        Route::post('/files/create', [\App\Http\Controllers\CodeEditor\CodeEditorController::class, 'create']);
        Route::put('/files/update', [\App\Http\Controllers\CodeEditor\CodeEditorController::class, 'update']);
        Route::delete('/files/delete', [\App\Http\Controllers\CodeEditor\CodeEditorController::class, 'delete']);
        Route::put('/files/rename', [\App\Http\Controllers\CodeEditor\CodeEditorController::class, 'rename']);
    });

    // Workspaces (Isolated development environments)
    Route::apiResource('workspaces', \App\Http\Controllers\Workspace\WorkspaceController::class);
    Route::prefix('workspaces/{workspace}')->group(function () {
        // Files
        Route::get('files', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'files']);
        Route::get('files/list', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'listDirectory']);
        Route::get('files/read', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'readFile']);
        Route::post('files/write', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'writeFile']);
        Route::post('files/create', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'createFile']);
        Route::delete('files/delete', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'deleteFile']);
        Route::put('files/rename', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'renameFile']);

        // Terminal
        Route::post('terminal/execute', [\App\Http\Controllers\Workspace\TerminalController::class, 'execute']);
        Route::post('terminal/execute-stream', [\App\Http\Controllers\Workspace\TerminalController::class, 'executeStream']);

        // Git
        Route::post('git/init', [\App\Http\Controllers\Workspace\GitController::class, 'init']);
        Route::get('git/status', [\App\Http\Controllers\Workspace\GitController::class, 'status']);
        Route::post('git/add', [\App\Http\Controllers\Workspace\GitController::class, 'add']);
        Route::post('git/commit', [\App\Http\Controllers\Workspace\GitController::class, 'commit']);
        Route::post('git/push', [\App\Http\Controllers\Workspace\GitController::class, 'push']);
        Route::post('git/pull', [\App\Http\Controllers\Workspace\GitController::class, 'pull']);
        Route::get('git/log', [\App\Http\Controllers\Workspace\GitController::class, 'log']);
        Route::get('git/diff', [\App\Http\Controllers\Workspace\GitController::class, 'diff']);

        // AI Commands
        Route::post('ai/chat', [\App\Http\Controllers\Workspace\AICommandController::class, 'chat']);
        Route::post('ai/chat-stream', [\App\Http\Controllers\Workspace\AICommandController::class, 'chatStream']); // SSE streaming
        Route::get('ai/approvals', [\App\Http\Controllers\Workspace\AICommandController::class, 'pendingApprovals']);
        Route::get('ai/conversations', [\App\Http\Controllers\Workspace\AIConversationController::class, 'index']);
        Route::post('ai/conversations', [\App\Http\Controllers\Workspace\AIConversationController::class, 'store']);
        Route::get('ai/conversations/{conversation}', [\App\Http\Controllers\Workspace\AIConversationController::class, 'show']);
        Route::post('ai/conversations/{conversation}/cancel', [\App\Http\Controllers\Workspace\AIConversationController::class, 'cancel']);

        // Theme
        Route::get('theme', [\App\Http\Controllers\Workspace\ThemeController::class, 'getTheme']);
        Route::post('theme', [\App\Http\Controllers\Workspace\ThemeController::class, 'saveTheme']);
        Route::delete('theme', [\App\Http\Controllers\Workspace\ThemeController::class, 'deleteTheme']);

        // React Scaffolder
        Route::get('react/templates', [\App\Http\Controllers\Workspace\ReactScaffolderController::class, 'getTemplates']);
        Route::post('react/create', [\App\Http\Controllers\Workspace\ReactScaffolderController::class, 'createReactApp']);
        Route::post('react/create-from-template', [\App\Http\Controllers\Workspace\ReactScaffolderController::class, 'createFromTemplate']);
    });

    // AI Command Approvals
    Route::post('approvals/{approval}/approve', [\App\Http\Controllers\Workspace\AICommandController::class, 'approve']);
    Route::post('approvals/{approval}/reject', [\App\Http\Controllers\Workspace\AICommandController::class, 'reject']);

    // Legacy Aliases for YouTube Scraper (AI Duty support)
    Route::prefix('youtube-scraper')->group(function () {
        Route::post('playlist', [\App\Http\Controllers\AI\AiScraperController::class, 'playlistByUrl']);
        Route::post('generate-tags', [\App\Http\Controllers\AI\AiScraperController::class, 'generateTags']);
        Route::post('generate-genres', [\App\Http\Controllers\AI\AiScraperController::class, 'generateGenres']);
        Route::post('post-to-site', [\App\Http\Controllers\AI\AiScraperController::class, 'postToSite']);
    });
});

// MCP API: OpenAI / external clients can use Bearer token (MCP_API_KEY). Admin can use Sanctum.
Route::middleware('mcp.auth')->prefix('mcp')->group(function () {
    Route::get('/entities', [McpEntityController::class, 'list']);
    Route::get('/entities/{entity}', [McpEntityController::class, 'schema']);
    Route::post('/entities/{entity}/query', [McpEntityController::class, 'query']);
    Route::post('/entities/{entity}', [McpEntityController::class, 'store']);
    Route::patch('/entities/{entity}/{id}', [McpEntityController::class, 'update']);
    Route::delete('/entities/{entity}/{id}', [McpEntityController::class, 'destroy']);
});

// Generic dynamic CRUD APIs (dynamic entities) – require either:
// - Logged-in admin (Sanctum cookie), OR
// - Valid MCP_API_KEY as Bearer token.
// AND must pass MCP permissions via mcp.check.
Route::middleware(['mcp.auth', 'mcp.check'])->group(function () {
    Route::get('/entities/{entity}', [DynamicEntityController::class, 'index']);
    Route::get('/entities/{entity}/{id}', [DynamicEntityController::class, 'show']);
    Route::post('/entities/{entity}', [DynamicEntityController::class, 'store']);
    Route::put('/entities/{entity}/{id}', [DynamicEntityController::class, 'update']);
    Route::patch('/entities/{entity}/{id}', [DynamicEntityController::class, 'update']);
    Route::delete('/entities/{entity}/{id}', [DynamicEntityController::class, 'destroy']);
});

