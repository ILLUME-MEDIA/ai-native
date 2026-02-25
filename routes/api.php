<?php

use App\Http\Controllers\Auth\OtpAuthController;
use App\Http\Controllers\SectionBuilder\EntityController;
use App\Http\Controllers\SectionBuilder\FieldController;
use App\Http\Controllers\SectionBuilder\CombinedEntityController;
use App\Http\Controllers\SectionBuilder\YelpController;
use App\Http\Controllers\DynamicEntityController;
use App\Http\Controllers\Mcp\McpEntityController;
use App\Http\Controllers\PublicApi\CaseStudyController;
use App\Http\Controllers\Admin\CaseStudyController as AdminCaseStudyController;
use App\Http\Controllers\Ecommerce\BusinessController;
use App\Http\Controllers\Ecommerce\MuzzhubController;
use App\Http\Controllers\Ecommerce\MuzzhubCategoryController;
use App\Http\Controllers\Ecommerce\MenuController;
use App\Http\Controllers\Ecommerce\MenuCategoryTypeController;
use App\Http\Controllers\Ecommerce\CartController;
use App\Http\Controllers\Ecommerce\OrderController;
use App\Http\Controllers\Ecommerce\DiscoveryUserController;
use App\Http\Controllers\Ecommerce\MediaUploadController;
use App\Http\Controllers\Ecommerce\DataSourceController;
use App\Http\Controllers\Ecommerce\BusinessRegistrationController;
use App\Http\Controllers\Ecommerce\DoorDashController;
use App\Http\Controllers\Ecommerce\StripeController;
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
    // ── Case Studies Admin CRUD ─────────────────────────────────────────────
    Route::get('/admin/case-studies',                        [AdminCaseStudyController::class, 'index']);
    Route::post('/admin/case-studies/upload-media',          [AdminCaseStudyController::class, 'uploadMedia']);
    Route::post('/admin/case-studies',                       [AdminCaseStudyController::class, 'store']);
    Route::get('/admin/case-studies/{id}',                   [AdminCaseStudyController::class, 'show']);
    Route::patch('/admin/case-studies/{id}',                 [AdminCaseStudyController::class, 'update']);
    Route::post('/admin/case-studies/{id}/update',           [AdminCaseStudyController::class, 'update']);
    Route::delete('/admin/case-studies/{id}',                [AdminCaseStudyController::class, 'destroy']);
    Route::post('/admin/case-studies/{id}/assign-groups',    [AdminCaseStudyController::class, 'assignGroups']);
    // ── Case Study Groups ────────────────────────────────────────────────
    Route::get('/admin/case-study-groups',                   [AdminCaseStudyController::class, 'groupsIndex']);
    Route::post('/admin/case-study-groups',                  [AdminCaseStudyController::class, 'groupsStore']);
    Route::patch('/admin/case-study-groups/{id}',            [AdminCaseStudyController::class, 'groupsUpdate']);
    Route::delete('/admin/case-study-groups/{id}',           [AdminCaseStudyController::class, 'groupsDestroy']);

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
    // Combined endpoint: ek hi API se 2 entities ka data
    Route::get('/section-builder/entities-combined/{first}/{second}', [CombinedEntityController::class, 'index'])
        ->where(['first' => '[0-9]+|[a-zA-Z0-9_-]+', 'second' => '[0-9]+|[a-zA-Z0-9_-]+'])
        ->name('api.section-builder.entities.combined.index');
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

    // ── Ecommerce Admin (write operations + admin-only reads) ───────────────
    Route::prefix('ecommerce')->group(function () {
        // Muzzhub write (admin)
        Route::post('muzzhub',                 [MuzzhubController::class, 'store']);
        Route::patch('muzzhub/{muzzhub}',      [MuzzhubController::class, 'update']);
        Route::delete('muzzhub/{muzzhub}',     [MuzzhubController::class, 'destroy']);

        // Muzzhub categories write (admin)
        Route::post('muzzhub-categories',                            [MuzzhubCategoryController::class, 'store']);
        Route::patch('muzzhub-categories/{muzzhubCategory}',         [MuzzhubCategoryController::class, 'update']);
        Route::delete('muzzhub-categories/{muzzhubCategory}',        [MuzzhubCategoryController::class, 'destroy']);

        // Business write (admin)
        Route::post('businesses',                   [BusinessController::class, 'store']);
        Route::patch('businesses/{business}',       [BusinessController::class, 'update']);
        Route::delete('businesses/{business}',      [BusinessController::class, 'destroy']);

        // Menu categories write (admin)
        Route::post('businesses/{business}/menu-categories',              [MenuController::class, 'storeCategory']);
        Route::patch('businesses/{business}/menu-categories/{category}',  [MenuController::class, 'updateCategory']);
        Route::delete('businesses/{business}/menu-categories/{category}', [MenuController::class, 'destroyCategory']);

        // Menu category types write (admin)
        Route::post('menu-category-types',                          [MenuCategoryTypeController::class, 'store']);
        Route::patch('menu-category-types/{menuCategoryType}',      [MenuCategoryTypeController::class, 'update']);
        Route::delete('menu-category-types/{menuCategoryType}',     [MenuCategoryTypeController::class, 'destroy']);

        // Menu items write (admin)
        Route::post('businesses/{business}/menu-items',             [MenuController::class, 'storeItem']);
        Route::patch('businesses/{business}/menu-items/{item}',     [MenuController::class, 'updateItem']);
        Route::delete('businesses/{business}/menu-items/{item}',    [MenuController::class, 'destroyItem']);

        // Orders admin (list all + status update)
        Route::get('orders',                        [OrderController::class, 'index']);
        Route::get('orders/{order}',                [OrderController::class, 'show']);
        Route::patch('orders/{order}/status',       [OrderController::class, 'updateStatus']);

        // Discovery Users (admin)
        Route::get('discovery-users',                    [DiscoveryUserController::class, 'index']);
        Route::get('discovery-users/{discoveryUser}',    [DiscoveryUserController::class, 'show']);
        Route::patch('discovery-users/{discoveryUser}',  [DiscoveryUserController::class, 'update']);
        Route::delete('discovery-users/{discoveryUser}', [DiscoveryUserController::class, 'destroy']);

        // Media Upload (admin)
        Route::post('upload', [MediaUploadController::class, 'upload']);

        // Data Source Hub (admin)
        Route::get('data-sources',                          [DataSourceController::class, 'index']);
        Route::post('data-sources',                         [DataSourceController::class, 'store']);
        Route::get('data-sources/{dataSource}',             [DataSourceController::class, 'show']);
        Route::patch('data-sources/{dataSource}',           [DataSourceController::class, 'update']);
        Route::delete('data-sources/{dataSource}',          [DataSourceController::class, 'destroy']);
        Route::post('data-sources/{dataSource}/sync',       [DataSourceController::class, 'sync']);
        Route::get('data-sources/{dataSource}/logs',        [DataSourceController::class, 'logs']);

        // Business Registrations (admin management)
        Route::get('registrations',                                     [BusinessRegistrationController::class, 'index']);
        Route::get('registrations/{registration}',                      [BusinessRegistrationController::class, 'show']);
        Route::post('registrations/{registration}/approve',             [BusinessRegistrationController::class, 'approve']);
        Route::post('registrations/{registration}/reject',              [BusinessRegistrationController::class, 'reject']);
        Route::delete('registrations/{registration}',                   [BusinessRegistrationController::class, 'destroy']);
    });

    // ── Yelp Integration ────────────────────────────────────────────────────
    Route::prefix('yelp')->group(function () {
        // Meta
        Route::get('fields',    [YelpController::class, 'yelpFields']);
        Route::get('entities',  [YelpController::class, 'entities']);

        // Accounts
        Route::get('accounts',                      [YelpController::class, 'accountsIndex']);
        Route::post('accounts',                     [YelpController::class, 'accountsStore']);
        Route::post('accounts/verify',              [YelpController::class, 'accountsVerify']);
        Route::patch('accounts/{account}',          [YelpController::class, 'accountsUpdate']);
        Route::delete('accounts/{account}',         [YelpController::class, 'accountsDestroy']);

        // Jobs
        Route::get('jobs',                          [YelpController::class, 'jobsIndex']);
        Route::post('jobs',                         [YelpController::class, 'jobsStore']);
        Route::patch('jobs/{job}',                  [YelpController::class, 'jobsUpdate']);
        Route::delete('jobs/{job}',                 [YelpController::class, 'jobsDestroy']);
        Route::post('jobs/{job}/run',               [YelpController::class, 'jobsRun']);

        // Logs
        Route::get('logs',                          [YelpController::class, 'logsIndex']);
        Route::get('logs/{log}',                    [YelpController::class, 'logProgress']);
        Route::get('logs/{log}/rows',               [YelpController::class, 'logRows']);
        Route::post('logs/{log}/stop',              [YelpController::class, 'logStop']);
    });

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

        // Specific routes must come BEFORE dynamic {playlist} route
        Route::get('scrapers/platform-genres', [\App\Http\Controllers\AI\AiScraperController::class, 'getPlatformGenres']);
        Route::get('scrapers/videos/list', [\App\Http\Controllers\AI\AiScraperController::class, 'videos']);
        Route::post('scrapers/youtube-search', [\App\Http\Controllers\AI\AiScraperController::class, 'youtubeSearch']);
        Route::post('scrapers/import-from-search', [\App\Http\Controllers\AI\AiScraperController::class, 'importFromSearch']);

        // Dynamic {playlist} routes
        Route::get('scrapers/{playlist}', [\App\Http\Controllers\AI\AiScraperController::class, 'show']);
        Route::post('scrapers/{playlist}/sync', [\App\Http\Controllers\AI\AiScraperController::class, 'sync']);
        Route::post('scrapers/{playlist}/enrich', [\App\Http\Controllers\AI\AiScraperController::class, 'enrich']);
        Route::post('scrapers/{playlist}/push', [\App\Http\Controllers\AI\AiScraperController::class, 'push']);
        Route::delete('scrapers/{playlist}', [\App\Http\Controllers\AI\AiScraperController::class, 'destroy']);
        Route::post('scrapers/{playlist}/bulk-update', [\App\Http\Controllers\AI\AiScraperController::class, 'bulkUpdate']);
        Route::post('scrapers/{playlist}/batch-generate-metadata', [\App\Http\Controllers\AI\AiScraperController::class, 'batchGenerateMetadata']);
        Route::post('scrapers/videos/{videoId}/generate-metadata', [\App\Http\Controllers\AI\AiScraperController::class, 'generateMetadataForVideo']);

        // Manual image overrides (apply to both streaming and watchlist pushes)
        Route::post('scrapers/{playlist}/image', [\App\Http\Controllers\AI\AiScraperController::class, 'uploadPlaylistImage']);
        Route::delete('scrapers/{playlist}/image', [\App\Http\Controllers\AI\AiScraperController::class, 'removePlaylistImage']);
        Route::post('scrapers/videos/{videoId}/image', [\App\Http\Controllers\AI\AiScraperController::class, 'uploadVideoImage']);
        Route::delete('scrapers/videos/{videoId}/image', [\App\Http\Controllers\AI\AiScraperController::class, 'removeVideoImage']);

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
        Route::get('files/search', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'search']);
        Route::get('files', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'files']);
        Route::get('files/list', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'listDirectory']);
        Route::get('files/read', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'readFile']);
        Route::post('files/write', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'writeFile']);
        Route::post('files/create', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'createFile']);
        Route::delete('files/delete', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'deleteFile']);
        Route::put('files/rename', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'renameFile']);
        Route::post('files/format', [\App\Http\Controllers\Workspace\WorkspaceController::class, 'formatFile']);

        // Terminal
        Route::post('terminal/execute', [\App\Http\Controllers\Workspace\TerminalController::class, 'execute']);
        Route::post('terminal/execute-stream', [\App\Http\Controllers\Workspace\TerminalController::class, 'executeStream']);

        // Git
        Route::post('git/init', [\App\Http\Controllers\Workspace\GitController::class, 'init']);
        Route::get('git/status', [\App\Http\Controllers\Workspace\GitController::class, 'status']);
        Route::post('git/add', [\App\Http\Controllers\Workspace\GitController::class, 'add']);
        Route::post('git/stage', [\App\Http\Controllers\Workspace\GitController::class, 'stage']);
        Route::post('git/unstage', [\App\Http\Controllers\Workspace\GitController::class, 'unstage']);
        Route::post('git/commit', [\App\Http\Controllers\Workspace\GitController::class, 'commit']);
        Route::post('git/push', [\App\Http\Controllers\Workspace\GitController::class, 'push']);
        Route::post('git/pull', [\App\Http\Controllers\Workspace\GitController::class, 'pull']);
        Route::get('git/log', [\App\Http\Controllers\Workspace\GitController::class, 'log']);
        // B-16: Stash Management
        Route::get('git/stash', [\App\Http\Controllers\Workspace\GitController::class, 'stashList']);
        Route::post('git/stash', [\App\Http\Controllers\Workspace\GitController::class, 'stashCreate']);
        Route::post('git/stash/pop', [\App\Http\Controllers\Workspace\GitController::class, 'stashPop']);
        Route::delete('git/stash', [\App\Http\Controllers\Workspace\GitController::class, 'stashDrop']);
        Route::get('git/diff', [\App\Http\Controllers\Workspace\GitController::class, 'diff']);
        Route::get('git/blame', [\App\Http\Controllers\Workspace\GitController::class, 'blame']);
        Route::get('git/diff-parsed', [\App\Http\Controllers\Workspace\GitController::class, 'parsedDiff']);
        Route::get('git/branches', [\App\Http\Controllers\Workspace\GitController::class, 'branches']);
        Route::post('git/branch', [\App\Http\Controllers\Workspace\GitController::class, 'createBranch']);
        Route::post('git/checkout', [\App\Http\Controllers\Workspace\GitController::class, 'checkout']);

        // AI Commands
        Route::post('ai/chat', [\App\Http\Controllers\Workspace\AICommandController::class, 'chat']);
        Route::post('ai/chat-stream', [\App\Http\Controllers\Workspace\AICommandController::class, 'chatStream']); // SSE streaming
        Route::post('ai/complete', [\App\Http\Controllers\Workspace\AICommandController::class, 'complete']); // B-06: inline ghost text
        Route::post('ai/sketch-to-code', [\App\Http\Controllers\Workspace\AICommandController::class, 'sketchToCode']); // C-02: whiteboard AI
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

        // B-20: Presence / Collaboration Indicators
        Route::get('presence', [\App\Http\Controllers\Workspace\PresenceController::class, 'list']);
        Route::post('presence/heartbeat', [\App\Http\Controllers\Workspace\PresenceController::class, 'heartbeat']);

        // C-03: MCP Store
        Route::get('mcp/catalog',    [\App\Http\Controllers\Workspace\MCPController::class, 'catalog']);
        Route::get('mcp/installed',  [\App\Http\Controllers\Workspace\MCPController::class, 'installed']);
        Route::post('mcp/install',   [\App\Http\Controllers\Workspace\MCPController::class, 'install']);
        Route::post('mcp/uninstall', [\App\Http\Controllers\Workspace\MCPController::class, 'uninstall']);
        Route::post('mcp/configure', [\App\Http\Controllers\Workspace\MCPController::class, 'configure']);
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

// ── Public Ecommerce Routes (no auth required — X-Session-Id or Bearer token) ──
// Storefront browsing, cart management, and order placement.
// Supports: anonymous (X-Session-Id only), Sanctum Bearer token, or OTP Bearer token.
Route::prefix('ecommerce')->group(function () {
    // Public browsing — sellers / restaurants
    Route::get('muzzhub',                               [MuzzhubController::class, 'index']);
    Route::get('muzzhub/{muzzhub}',                     [MuzzhubController::class, 'show']);
    Route::get('muzzhub-categories',                    [MuzzhubCategoryController::class, 'index']);
    Route::get('muzzhub/{muzzhub}/menu-categories',     [MenuController::class, 'muzzhubCategories']);
    Route::get('muzzhub/{muzzhub}/menu-items',          [MenuController::class, 'muzzhubItems']);

    // Public browsing — businesses / restaurants
    Route::get('businesses',                            [BusinessController::class, 'index']);
    Route::get('businesses/{business}',                 [BusinessController::class, 'show']);
    Route::get('businesses/{business}/menu-categories', [MenuController::class, 'categories']);
    Route::get('businesses/{business}/menu-items',      [MenuController::class, 'items']);

    // Public menu listings
    Route::get('menu-items',                            [MenuController::class, 'allItems']);
    Route::get('menu-category-types',                   [MenuCategoryTypeController::class, 'index']);

    // Cart — session-based (X-Session-Id header or cookie session)
    // No auth required; pass X-Session-Id UUID to keep same cart across requests.
    Route::get('cart',              [CartController::class, 'index']);
    Route::post('cart',             [CartController::class, 'store']);
    Route::patch('cart/{cartItem}', [CartController::class, 'update']);
    Route::delete('cart/clear',     [CartController::class, 'clear']);
    Route::delete('cart/{cartItem}',[CartController::class, 'destroy']);

    // Order placement — convert cart to order (session-based, no auth required)
    Route::post('orders',           [OrderController::class, 'store']);
});

// ── DoorDash Drive Delivery Routes ───────────────────────────────────────────
Route::prefix('delivery/doordash')->group(function () {
    Route::get('env',               [DoorDashController::class, 'env']);
    Route::post('quote',            [DoorDashController::class, 'quote']);
    Route::get('status/{order}',    [DoorDashController::class, 'status']);
    Route::post('dispatch/{order}', [DoorDashController::class, 'dispatch']);
    Route::post('cancel/{order}',   [DoorDashController::class, 'cancel']);
    Route::post('webhook',          [DoorDashController::class, 'webhook']);
});

// ── Stripe Payment Routes (OTP Bearer token required) ────────────────────────
// Requires Authorization: Bearer <otp-token> from POST /api/otp-auth/verify
Route::prefix('payment/stripe')->group(function () {
    Route::post('setup-intent',            [StripeController::class, 'setupIntent']);
    Route::post('save-method',             [StripeController::class, 'saveMethod']);
    Route::get('methods',                  [StripeController::class, 'listMethods']);
    Route::delete('methods/{id}',          [StripeController::class, 'deleteMethod']);
    Route::post('methods/{id}/set-default',[StripeController::class, 'setDefault']);
    Route::post('charge',                  [StripeController::class, 'charge']);
    Route::post('webhook',                 [StripeController::class, 'webhook']);
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
    // Special-case: force /api/entities/case-studies to use the custom
    // CaseStudyController so that the response shape matches the legacy API.
    Route::get('/entities/case-studies', [CaseStudyController::class, 'index']);

    Route::get('/entities/{entity}', [DynamicEntityController::class, 'index']);
    Route::get('/entities/{entity}/{id}', [DynamicEntityController::class, 'show']);
    Route::post('/entities/{entity}', [DynamicEntityController::class, 'store']);
    Route::put('/entities/{entity}/{id}', [DynamicEntityController::class, 'update']);
    Route::patch('/entities/{entity}/{id}', [DynamicEntityController::class, 'update']);
    Route::delete('/entities/{entity}/{id}', [DynamicEntityController::class, 'destroy']);
});

// Public Case Studies API (for marketing site / portfolio)
Route::get('/case-studies', [CaseStudyController::class, 'index']);
Route::get('/case-studies/{slug}', [CaseStudyController::class, 'show']);

// Business Registration — requires SITE_API_KEY as Bearer token, throttled
// External sites must send: Authorization: Bearer <SITE_API_KEY>
Route::middleware(['site.api.key', 'throttle:30,1'])->post(
    '/register-business',
    [BusinessRegistrationController::class, 'submit']
)->name('business.register');

// ============================================================
// OTP Auth — All routes fully public (no auth required)
// Used by admin SPA + any external site.
// ============================================================
Route::prefix('otp-auth')->middleware('throttle:60,1')->group(function () {
    Route::post('send',             [OtpAuthController::class, 'send'])           ->name('auth.otp.send');
    Route::post('verify',           [OtpAuthController::class, 'verify'])         ->name('auth.otp.verify');
    Route::post('resend',           [OtpAuthController::class, 'resend'])         ->name('auth.otp.resend');
    Route::post('complete-profile', [OtpAuthController::class, 'completeProfile'])->name('auth.otp.complete-profile');
    Route::get('profile',           [OtpAuthController::class, 'profile'])        ->name('auth.otp.profile');
    Route::get('settings',          [OtpAuthController::class, 'settingsGet'])    ->name('otp-auth.settings.get');
    Route::put('settings',          [OtpAuthController::class, 'settingsUpdate']) ->name('otp-auth.settings.update');
    Route::get('tables',            [OtpAuthController::class, 'tablesIndex'])    ->name('otp-auth.tables');
    Route::get('logs',              [OtpAuthController::class, 'logsIndex'])      ->name('otp-auth.logs');
});

// Backward-compat aliases (old prefix)
Route::prefix('auth/otp')->middleware('throttle:60,1')->group(function () {
    Route::post('send',             [OtpAuthController::class, 'send']);
    Route::post('verify',           [OtpAuthController::class, 'verify']);
    Route::post('resend',           [OtpAuthController::class, 'resend']);
    Route::post('complete-profile', [OtpAuthController::class, 'completeProfile']);
});

// ── Admin Token Auth (for API Docs / external integrations) ─────────────────
// POST /api/auth/token  {email, password}  → returns Sanctum Bearer token
Route::post('/auth/token', function (\Illuminate\Http\Request $request) {
    $request->validate([
        'email'    => 'required|email',
        'password' => 'required|string',
    ]);

    if (!\Illuminate\Support\Facades\Auth::attempt($request->only('email', 'password'))) {
        return response()->json(['message' => 'Invalid credentials.'], 401);
    }

    $user  = \Illuminate\Support\Facades\Auth::user();
    $token = $user->createToken('api-docs')->plainTextToken;

    return response()->json([
        'token'      => $token,
        'token_type' => 'Bearer',
        'user'       => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email],
    ]);
})->middleware('throttle:10,1')->name('auth.token');

