<?php

use App\Http\Controllers\Auth\OtpAuthController;
use App\Http\Controllers\SectionBuilder\EntityController;
use App\Http\Controllers\SectionBuilder\FieldController;
use App\Http\Controllers\SectionBuilder\CombinedEntityController;
use App\Http\Controllers\SectionBuilder\SectionRelationController;
use App\Http\Controllers\SectionBuilder\YelpController;
use App\Http\Controllers\DynamicEntityController;
use App\Http\Controllers\Mcp\McpEntityController;
use App\Http\Controllers\PublicApi\CaseStudyController;
use App\Http\Controllers\Admin\CaseStudyController as AdminCaseStudyController;
use App\Http\Controllers\Ecommerce\BusinessController;
use App\Http\Controllers\Ecommerce\MuzzhubController;
use App\Http\Controllers\Ecommerce\MuzzhubCategoryController;
use App\Http\Controllers\Ecommerce\CuisineController;
use App\Http\Controllers\Ecommerce\MenuController;
use App\Http\Controllers\Ecommerce\MenuItemModifierController;
use App\Http\Controllers\Ecommerce\MenuCategoryTypeController;
use App\Http\Controllers\Ecommerce\CartController;
use App\Http\Controllers\Ecommerce\CheckoutController;
use App\Http\Controllers\Ecommerce\TaxController;
use App\Http\Controllers\Ecommerce\OrderController;
use App\Http\Controllers\Ecommerce\DiscoveryUserController;
use App\Http\Controllers\Ecommerce\MediaUploadController;
use App\Http\Controllers\Ecommerce\DataSourceController;
use App\Http\Controllers\Ecommerce\BusinessRegistrationController;
use App\Http\Controllers\Ecommerce\DoorDashController;
use App\Http\Controllers\Ecommerce\StripeController;
use App\Http\Controllers\Ecommerce\PosController;
use App\Http\Controllers\Ecommerce\PosCatalogController;
use App\Http\Controllers\Ecommerce\PosPaymentController;
use App\Http\Controllers\Ecommerce\PosWebhookController;
use App\Http\Controllers\Delivery\DeliveryStaffController;
use App\Http\Controllers\Delivery\DeliveryZoneController;
use App\Http\Controllers\Delivery\DeliveryAssignmentController;
use App\Http\Controllers\Delivery\DeliverySettingsController;
use App\Http\Controllers\Delivery\UberEatsController;
use App\Http\Controllers\Delivery\InstacartController;
use App\Http\Controllers\Delivery\PlatformOrderController;
use App\Http\Controllers\Delivery\DeliveryQuoteController;
use App\Http\Controllers\Delivery\UberDirectController;
use App\Http\Controllers\Admin\AppSecretsController;
use App\Http\Controllers\Admin\EcommerceSettingsController;
use App\Http\Controllers\Admin\Cal\CalPlatformsController;
use App\Http\Controllers\Admin\Cal\CalMeetingsController;
use App\Http\Controllers\Admin\KanbanController;
use App\Http\Controllers\Admin\OpenorgUsersController;
use App\Http\Controllers\Admin\PlatformUsersController;
use App\Http\Controllers\Admin\PlatformGenresController;
use App\Http\Controllers\Webhook\CalWebhookController;
use App\Http\Controllers\ShipEngine\ShipEngineController;
use App\Http\Controllers\Admin\DesignSystem\DsThemeController;
use App\Http\Controllers\Admin\DesignSystem\DsTokenController;
use App\Http\Controllers\Admin\DesignSystem\DsComponentController;
use App\Http\Controllers\Admin\DesignSystem\DsSitesController;
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

// ── Cal.com Webhooks (public — no auth, signature verified in controller) ──────
Route::post('/webhooks/cal/{slug}', [CalWebhookController::class, 'handle'])
    ->middleware('throttle:120,1');

// ── Cal.com Integration ────────────────────────────────────────────────────────
Route::prefix('admin/cal')->group(function () {
    // Platforms
    Route::get('platforms',                          [CalPlatformsController::class, 'index']);
    Route::post('platforms',                         [CalPlatformsController::class, 'store']);
    Route::put('platforms/{calPlatform}',            [CalPlatformsController::class, 'update']);
    Route::delete('platforms/{calPlatform}',         [CalPlatformsController::class, 'destroy']);
    Route::post('platforms/{calPlatform}/reveal-key',[CalPlatformsController::class, 'revealApiKey']);
    Route::post('platforms/{calPlatform}/sync',      [CalPlatformsController::class, 'sync']);
    Route::post('platforms/{calPlatform}/test',      [CalPlatformsController::class, 'testConnection']);
    // Meetings
    Route::get('meetings',                           [CalMeetingsController::class, 'index']);
    Route::post('meetings',                          [CalMeetingsController::class, 'store']);
    Route::put('meetings/{calMeeting}',              [CalMeetingsController::class, 'update']);
    Route::delete('meetings/{calMeeting}',           [CalMeetingsController::class, 'destroy']);
    Route::post('meetings/{calMeeting}/cancel',      [CalMeetingsController::class, 'cancelViaApi']);
});

// ── Platform Genres ────────────────────────────────────────────────────────────
Route::prefix('admin/platform-genres')->group(function () {
    Route::get('/',                                    [PlatformGenresController::class, 'index']);
    Route::post('/',                                   [PlatformGenresController::class, 'store']);
    Route::post('/reorder',                            [PlatformGenresController::class, 'reorder']);
    Route::put('/{platformGenre}',                     [PlatformGenresController::class, 'update']);
    Route::delete('/{platformGenre}',                  [PlatformGenresController::class, 'destroy']);
    Route::post('/{platformGenre}/genres',             [PlatformGenresController::class, 'addGenre']);
    Route::delete('/{platformGenre}/genres',           [PlatformGenresController::class, 'removeGenre']);
});

// ── OpenOrg Users (legacy — platform-scoped, openorg_users table only) ────────
Route::prefix('admin/openorg-users')->group(function () {
    Route::get('/',                        [OpenorgUsersController::class, 'index']);
    Route::post('/',                       [OpenorgUsersController::class, 'store']);
    Route::put('/{openorgUser}',           [OpenorgUsersController::class, 'update']);
    Route::delete('/{openorgUser}',        [OpenorgUsersController::class, 'destroy']);
});

// ── Platform Users (dynamic — uses each platform's configured users table) ─────
// Works with openorg_users (default) OR any Section Builder entity table.
// Usage: GET  /api/admin/platforms/{platform}/users
//        POST /api/admin/platforms/{platform}/users
//        PUT  /api/admin/platforms/{platform}/users/{userId}
//        DELETE /api/admin/platforms/{platform}/users/{userId}
Route::prefix('admin/platforms/{platform}')->group(function () {
    Route::get('users',           [PlatformUsersController::class, 'index']);
    Route::post('users',          [PlatformUsersController::class, 'store']);
    Route::put('users/{userId}',  [PlatformUsersController::class, 'update']);
    Route::delete('users/{userId}',[PlatformUsersController::class, 'destroy']);
});

// ── Kanban ─────────────────────────────────────────────────────────────────────
Route::prefix('admin/kanban')->group(function () {
    // Boards
    Route::get('boards',                             [KanbanController::class, 'boardsIndex']);
    Route::post('boards',                            [KanbanController::class, 'boardsStore']);
    Route::get('boards/{board}',                     [KanbanController::class, 'boardsShow']);
    Route::put('boards/{board}',                     [KanbanController::class, 'boardsUpdate']);
    Route::delete('boards/{board}',                  [KanbanController::class, 'boardsDestroy']);
    Route::post('boards/{board}/columns',            [KanbanController::class, 'columnsStore']);
    Route::post('boards/{board}/columns/reorder',    [KanbanController::class, 'columnsReorder']);
    // Columns
    Route::put('columns/{column}',                   [KanbanController::class, 'columnsUpdate']);
    Route::delete('columns/{column}',                [KanbanController::class, 'columnsDestroy']);
    // Cards
    Route::get('cards',                              [KanbanController::class, 'cardsByEmail']);  // ?email=
    Route::post('columns/{column}/cards',            [KanbanController::class, 'cardsStore']);
    Route::put('cards/{card}',                       [KanbanController::class, 'cardsUpdate']);
    Route::delete('cards/{card}',                    [KanbanController::class, 'cardsDestroy']);
    Route::patch('cards/{card}/move',                [KanbanController::class, 'cardsMove']);
});

// ── Ecommerce Settings (platform fee + tip global config) ─────────────────────
Route::prefix('admin/ecommerce-settings')->group(function () {
    Route::get('/',           [EcommerceSettingsController::class, 'index']);
    Route::get('/{group}',    [EcommerceSettingsController::class, 'byGroup']);
    Route::put('/',           [EcommerceSettingsController::class, 'update']);
});

// ── Design System Manager ─────────────────────────────────────────────────────
Route::prefix('admin/design-system')->group(function () {
    // Themes
    Route::get('/themes',                        [DsThemeController::class, 'index']);
    Route::post('/themes',                       [DsThemeController::class, 'store']);
    Route::get('/themes/{dsTheme}',              [DsThemeController::class, 'show']);
    Route::put('/themes/{dsTheme}',              [DsThemeController::class, 'update']);
    Route::delete('/themes/{dsTheme}',           [DsThemeController::class, 'destroy']);
    Route::post('/themes/{dsTheme}/duplicate',    [DsThemeController::class, 'duplicate']);
    Route::post('/themes/{dsTheme}/seed-defaults',[DsThemeController::class, 'seedDefaults']);
    // Exports
    Route::get('/themes/{dsTheme}/export/json',     [DsThemeController::class, 'exportJson']);
    Route::get('/themes/{dsTheme}/export/css',      [DsThemeController::class, 'exportCss']);
    Route::get('/themes/{dsTheme}/export/tailwind', [DsThemeController::class, 'exportTailwind']);
    Route::get('/themes/{dsTheme}/export/dts',      [DsThemeController::class, 'exportDts']);

    // Tokens
    Route::get('/tokens',              [DsTokenController::class, 'index']);
    Route::post('/tokens',             [DsTokenController::class, 'store']);
    Route::put('/tokens/{dsToken}',    [DsTokenController::class, 'update']);
    Route::delete('/tokens/{dsToken}', [DsTokenController::class, 'destroy']);
    Route::post('/tokens/bulk',        [DsTokenController::class, 'bulkUpsert']);

    // Components
    Route::get('/components',                   [DsComponentController::class, 'index']);
    Route::post('/components',                  [DsComponentController::class, 'store']);
    Route::get('/components/{dsComponent}',     [DsComponentController::class, 'show']);
    Route::put('/components/{dsComponent}',     [DsComponentController::class, 'update']);
    Route::delete('/components/{dsComponent}',  [DsComponentController::class, 'destroy']);
    // Component variant resolution (called by React token engine)
    Route::get('/components/{slug}/resolve',    [DsComponentController::class, 'resolve'])->where('slug', '[a-z\-]+');

    // Variants (nested under component)
    Route::post('/components/{dsComponent}/variants',                    [DsComponentController::class, 'storeVariant']);
    Route::put('/components/{dsComponent}/variants/{variant}',           [DsComponentController::class, 'updateVariant']);
    Route::delete('/components/{dsComponent}/variants/{variant}',        [DsComponentController::class, 'destroyVariant']);

    // Sites (multi-site token distribution)
    Route::get('/sites',                          [DsSitesController::class, 'index']);
    Route::post('/sites',                         [DsSitesController::class, 'store']);
    Route::get('/sites/{dsSite}',                 [DsSitesController::class, 'show']);
    Route::put('/sites/{dsSite}',                 [DsSitesController::class, 'update']);
    Route::delete('/sites/{dsSite}',              [DsSitesController::class, 'destroy']);
    Route::post('/sites/{dsSite}/generate-key',   [DsSitesController::class, 'generateKey']);
    Route::post('/sites/{dsSite}/reveal-key',     [DsSitesController::class, 'revealKey']);
});

// ── Public Design Tokens API (no auth — for external apps) ───────────────────
// Usage from any app:
//   GET /api/design-tokens         → { 'color.primary': '#405189', 'radius.md': '0.3rem', ... }
//   GET /api/design-tokens/css     → :root { --bs-primary: #405189; ... }
//   GET /api/design-tokens/theme   → full theme + tokens array
Route::get('/design-tokens', function () {
    $theme = \App\Models\DesignSystem\DsTheme::where('is_default', true)->first()
          ?? \App\Models\DesignSystem\DsTheme::first();
    if (!$theme) return response()->json([]);
    return response()->json($theme->resolveTokenMap())
        ->header('Access-Control-Allow-Origin', '*')
        ->header('Cache-Control', 'public, max-age=60');
});

Route::get('/design-tokens/css', function () {
    $theme = \App\Models\DesignSystem\DsTheme::where('is_default', true)->first()
          ?? \App\Models\DesignSystem\DsTheme::first();
    if (!$theme) return response('/* no theme configured */', 200, ['Content-Type' => 'text/css']);
    $service = app(\App\Services\DesignSystem\DesignTokenService::class);
    $css = $service->generateCss($theme->id);
    return response($css, 200, [
        'Content-Type'                => 'text/css',
        'Access-Control-Allow-Origin' => '*',
        'Cache-Control'               => 'public, max-age=60',
    ]);
});

Route::get('/design-tokens/theme', function () {
    $theme = \App\Models\DesignSystem\DsTheme::where('is_default', true)
        ->with('tokens')->first()
        ?? \App\Models\DesignSystem\DsTheme::with('tokens')->first();
    if (!$theme) return response()->json(null);
    return response()->json([
        'theme'     => ['id' => $theme->id, 'name' => $theme->name, 'slug' => $theme->slug],
        'token_map' => $theme->resolveTokenMap(),
        'tokens'    => $theme->tokens,
    ])->header('Access-Control-Allow-Origin', '*')
      ->header('Cache-Control', 'public, max-age=60');
});

// ── Public Design Tokens API — Per-Site (no auth) ────────────────────────────
// Usage:
//   GET /api/design-tokens/{slug}         → flat token map for that site's theme
//   GET /api/design-tokens/{slug}/css     → CSS custom properties
//   GET /api/design-tokens/{slug}/theme   → full theme + tokens
//   X-DS-Key header also accepted (resolves site by api_key)

$resolveThemeForRequest = function (\Illuminate\Http\Request $request, string $slug) {
    // Try by slug
    $site = \App\Models\DesignSystem\DsSite::where('slug', $slug)
        ->where('is_active', true)->first();

    // Try by API key header if slug not found
    if (!$site) {
        $apiKey = $request->header('X-DS-Key');
        if ($apiKey) {
            $all = \App\Models\DesignSystem\DsSite::where('is_active', true)->get();
            foreach ($all as $s) {
                try {
                    if (decrypt($s->api_key) === $apiKey) { $site = $s; break; }
                } catch (\Throwable) {}
            }
        }
    }

    if (!$site) return null;
    return $site->resolveTheme();
};

Route::get('/design-tokens/{slug}', function (\Illuminate\Http\Request $request, string $slug) use ($resolveThemeForRequest) {
    $theme = $resolveThemeForRequest($request, $slug);
    if (!$theme) return response()->json(['error' => 'Site not found'], 404);
    return response()->json($theme->resolveTokenMap())
        ->header('Access-Control-Allow-Origin', '*')
        ->header('Cache-Control', 'public, max-age=60');
})->where('slug', '[a-z0-9-]+');

Route::get('/design-tokens/{slug}/css', function (\Illuminate\Http\Request $request, string $slug) use ($resolveThemeForRequest) {
    $theme = $resolveThemeForRequest($request, $slug);
    if (!$theme) return response('/* site not found */', 404, ['Content-Type' => 'text/css']);
    $service = app(\App\Services\DesignSystem\DesignTokenService::class);
    $css = $service->generateCss($theme->id);
    return response($css, 200, [
        'Content-Type'                => 'text/css',
        'Access-Control-Allow-Origin' => '*',
        'Cache-Control'               => 'public, max-age=60',
    ]);
})->where('slug', '[a-z0-9-]+');

Route::get('/design-tokens/{slug}/theme', function (\Illuminate\Http\Request $request, string $slug) use ($resolveThemeForRequest) {
    $theme = $resolveThemeForRequest($request, $slug);
    if (!$theme) return response()->json(['error' => 'Site not found'], 404);
    $theme->load('tokens');
    return response()->json([
        'theme'     => ['id' => $theme->id, 'name' => $theme->name, 'slug' => $theme->slug],
        'token_map' => $theme->resolveTokenMap(),
        'tokens'    => $theme->tokens,
    ])->header('Access-Control-Allow-Origin', '*')
      ->header('Cache-Control', 'public, max-age=60');
})->where('slug', '[a-z0-9-]+');

// ── App Secrets (system credentials stored in DB instead of .env) ────────────
// ── Artisan Runner (admin only) ────────────────────────────────────────────
Route::prefix('admin/artisan')->group(function () {
    Route::post('migrate',          [\App\Http\Controllers\Admin\ArtisanController::class, 'migrate']);
    Route::post('cuisines-migrate', [\App\Http\Controllers\Admin\ArtisanController::class, 'cuisinesMigrate']);
});

Route::prefix('admin/app-secrets')->group(function () {
    Route::get('/',                         [AppSecretsController::class, 'index']);
    Route::post('/',                        [AppSecretsController::class, 'store']);
    Route::put('/{appSecret}',              [AppSecretsController::class, 'update']);
    Route::delete('/{appSecret}',           [AppSecretsController::class, 'destroy']);
    Route::post('/{appSecret}/reveal',      [AppSecretsController::class, 'reveal']);
});

Route::group([], function () {
    // ── Case Studies Admin CRUD ─────────────────────────────────────────────
    Route::get('/admin/case-studies',                        [AdminCaseStudyController::class, 'index']);
    Route::post('/admin/case-studies/upload-media',          [AdminCaseStudyController::class, 'uploadMedia']);
    Route::post('/admin/storage-link',                        [AdminCaseStudyController::class, 'storageLink']);
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
    Route::delete('/section-builder/entities/{entity}', [EntityController::class, 'destroy'])
        ->where('entity', '[0-9]+|[a-zA-Z0-9_-]+')
        ->name('api.section-builder.entities.destroy');
    // Combined endpoint: fetch data from 2 entities in a single request
    Route::get('/section-builder/entities-combined/{first}/{second}', [CombinedEntityController::class, 'index'])
        ->where(['first' => '[0-9]+|[a-zA-Z0-9_-]+', 'second' => '[0-9]+|[a-zA-Z0-9_-]+'])
        ->name('api.section-builder.entities.combined.index');
    Route::get('/section-builder/entities/{entity}/mcp', [EntityController::class, 'getMcpConfig'])
        ->where('entity', '[0-9]+|[a-zA-Z0-9_-]+')
        ->name('api.section-builder.entities.mcp');

    // Section Relations CRUD
    Route::get('/section-builder/entities/{entityId}/relations',         [SectionRelationController::class, 'index']);
    Route::post('/section-builder/entities/{entityId}/relations',        [SectionRelationController::class, 'store']);
    Route::patch('/section-builder/entities/{entityId}/relations/{id}',  [SectionRelationController::class, 'update']);
    Route::delete('/section-builder/entities/{entityId}/relations/{id}', [SectionRelationController::class, 'destroy']);

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

        // Cuisines admin (write + activate-all)
        Route::post('cuisines',                     [CuisineController::class, 'store']);
        Route::put('cuisines/activate-all',          [CuisineController::class, 'activateAll']);
        Route::post('cuisines/dedup',               [CuisineController::class, 'dedup']);
        Route::patch('cuisines/{cuisine}',          [CuisineController::class, 'update']);
        Route::delete('cuisines/{cuisine}',         [CuisineController::class, 'destroy']);

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

        // Menu item modifier groups (admin)
        Route::post('businesses/{business}/menu-items/{item}/modifier-groups',                                    [MenuItemModifierController::class, 'storeGroup']);
        Route::patch('businesses/{business}/menu-items/{item}/modifier-groups/{group}',                           [MenuItemModifierController::class, 'updateGroup']);
        Route::delete('businesses/{business}/menu-items/{item}/modifier-groups/{group}',                          [MenuItemModifierController::class, 'destroyGroup']);

        // Menu item modifier options (admin)
        Route::post('businesses/{business}/menu-items/{item}/modifier-groups/{group}/options',                    [MenuItemModifierController::class, 'storeOption']);
        Route::patch('businesses/{business}/menu-items/{item}/modifier-groups/{group}/options/{option}',          [MenuItemModifierController::class, 'updateOption']);
        Route::delete('businesses/{business}/menu-items/{item}/modifier-groups/{group}/options/{option}',         [MenuItemModifierController::class, 'destroyOption']);

        // Orders admin (list all + status update)
        Route::get('orders',                        [OrderController::class, 'index']);
        Route::get('orders/{order}',                [OrderController::class, 'show']);
        Route::patch('orders/{order}/status',       [OrderController::class, 'updateStatus']);

        // Discovery Users (admin)
        // Note: ->where([0-9]+) prevents 'me' from matching these routes
        Route::get('discovery-users',                    [DiscoveryUserController::class, 'index']);
        Route::get('discovery-users/{discoveryUser}',    [DiscoveryUserController::class, 'show'])   ->where('discoveryUser', '[0-9]+');
        Route::patch('discovery-users/{discoveryUser}',  [DiscoveryUserController::class, 'update']) ->where('discoveryUser', '[0-9]+');
        Route::delete('discovery-users/{discoveryUser}', [DiscoveryUserController::class, 'destroy'])->where('discoveryUser', '[0-9]+');

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
        Route::post('accounts/{account}/reveal',    [YelpController::class, 'accountsReveal']);
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
        Route::get('logs/{log}/rows/{rowId}',       [YelpController::class, 'rowDetail']);
        Route::post('logs/{log}/stop',              [YelpController::class, 'logStop']);

        // Reconciliation
        Route::get('reconciliation/summary',        [YelpController::class, 'reconciliationSummary']);
        Route::get('reconciliation/matches',        [YelpController::class, 'reconciliationMatches']);
        Route::get('reconciliation/menu-items',     [YelpController::class, 'reconciliationMenuItems']);
        Route::get('reconciliation/closed',         [YelpController::class, 'reconciliationClosed']);
        Route::get('reconciliation/not-found',      [YelpController::class, 'reconciliationNotFound']);
        Route::get('reconciliation/skipped',        [YelpController::class, 'reconciliationSkipped']);
        Route::post('reconciliation/merge',         [YelpController::class, 'reconciliationMerge']);

        // On-demand menu scraper
        Route::post('scrape-menu',                  [YelpController::class, 'scrapeMenu']);
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
        Route::delete('ai/conversations/{conversation}', [\App\Http\Controllers\Workspace\AIConversationController::class, 'destroy']);

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
    Route::get('cuisines',                              [CuisineController::class, 'index']);
    Route::get('muzzhub/{muzzhub}/menu-categories',     [MenuController::class, 'muzzhubCategories']);
    Route::get('muzzhub/{muzzhub}/menu-items',          [MenuController::class, 'muzzhubItems']);

    // Public browsing — businesses / restaurants
    Route::get('businesses',                            [BusinessController::class, 'index']);
    Route::get('businesses/{business}',                 [BusinessController::class, 'show']);
    Route::get('businesses/{business}/menu-categories',        [MenuController::class, 'categories']);
    Route::get('businesses/{business}/menu-items',             [MenuController::class, 'items']);
    Route::get('businesses/{business}/menu-items/{item}',      [MenuController::class, 'showItem']);

    // Public menu listings
    Route::get('menu-items',                            [MenuController::class, 'allItems']);
    Route::get('menu-category-types',                   [MenuCategoryTypeController::class, 'index']);

    // Cart — session-based (X-Session-Id header or cookie session)
    // No auth required; pass X-Session-Id UUID to keep same cart across requests.
    // cart-data alias added as nginx-cache-bypass workaround (nginx cached /cart GET as HTML)
    Route::get('cart',              [CartController::class, 'index']);
    Route::get('cart-data',         [CartController::class, 'index']);
    Route::post('cart',             [CartController::class, 'store']);
    Route::patch('cart/{cartItem}', [CartController::class, 'update']);
    Route::delete('cart/clear',     [CartController::class, 'clear']);
    Route::delete('cart/{cartItem}',[CartController::class, 'destroy']);

    // Order placement — convert cart to order (session-based, no auth required)
    Route::post('orders',           [OrderController::class, 'store']);

    // Unified checkout — single call: items + customer + payment → order (external sites)
    Route::post('checkout',         [CheckoutController::class, 'checkout']);

    // Tax lookup — ZIP-based US sales tax rates (Avalara tables)
    Route::get('tax',               [TaxController::class, 'show']);
    Route::post('tax',              [TaxController::class, 'calculate']);
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

// ── Uber Direct (DaaS) Delivery Routes ───────────────────────────────────────
Route::prefix('delivery/uber-direct')->group(function () {
    Route::get('config',              [UberDirectController::class, 'config']);
    Route::post('quote',              [UberDirectController::class, 'quote']);
    Route::get('deliveries',          [UberDirectController::class, 'listDeliveries']);
    Route::get('stores',              [UberDirectController::class, 'findStores']);
    Route::post('dispatch/{order}',   [UberDirectController::class, 'dispatch']);
    Route::get('status/{order}',      [UberDirectController::class, 'status']);
    Route::patch('update/{order}',    [UberDirectController::class, 'update']);
    Route::post('cancel/{order}',     [UberDirectController::class, 'cancel']);
    Route::get('proof/{order}',       [UberDirectController::class, 'proofOfDelivery']);
    // CPP (Courier Pick & Pack)
    Route::post('cpp/quote',          [UberDirectController::class, 'cppQuote']);
    Route::post('cpp/dispatch/{order}',[UberDirectController::class, 'cppDispatch']);
});
// Uber Direct webhook (no auth — Uber sends unsigned HTTP POSTs)
Route::post('webhooks/delivery/uber-direct', [UberDirectController::class, 'webhook'])
    ->withoutMiddleware(['auth:sanctum']);

// ── Discovery User Self-Service Routes (OTP Bearer token required) ───────────
// Requires Authorization: Bearer <otp-token> from POST /api/otp-auth/verify (table=discovery_users)
Route::prefix('ecommerce/discovery-users/me')->group(function () {
    Route::get('/',          [DiscoveryUserController::class, 'meShow']);
    Route::patch('/',        [DiscoveryUserController::class, 'meUpdate']);
    Route::get('location',   [DiscoveryUserController::class, 'locationShow']);
    Route::post('location',  [DiscoveryUserController::class, 'locationSave']);  // create (upsert)
    Route::put('location',   [DiscoveryUserController::class, 'locationSave']);  // update (upsert)
    Route::delete('location',[DiscoveryUserController::class, 'locationDestroy']);
});

// ── POS Admin Routes (Sanctum auth required) ─────────────────────────────────
Route::prefix('ecommerce/pos')->group(function () {
    // ── Literal routes first (must come before /{connection} wildcard) ────────
    Route::get('/',                                     [PosController::class, 'index']);
    Route::get('/square/auth-url',                      [PosController::class, 'squareAuthUrl']);
    Route::get('/clover/auth-url',                      [PosController::class, 'cloverAuthUrl']);

    // ── Dynamic connection routes ─────────────────────────────────────────────
    Route::get('/{connection}',                         [PosController::class, 'show']);
    Route::patch('/{connection}',                       [PosController::class, 'update']);
    Route::delete('/{connection}',                      [PosController::class, 'disconnect']);
    Route::get('/{connection}/locations',               [PosController::class, 'locations']);
    Route::patch('/{connection}/location',              [PosController::class, 'setLocation']);

    // Catalog sync
    Route::get('/{connection}/catalog-maps',            [PosCatalogController::class, 'maps']);
    Route::post('/{connection}/push-catalog',           [PosCatalogController::class, 'push']);
    Route::post('/{connection}/pull-catalog',           [PosCatalogController::class, 'pull']);
    Route::delete('/{connection}/catalog-maps/{map}',   [PosCatalogController::class, 'unlink']);

    // POS Terminal / Checkout
    Route::get('/{connection}/devices',                         [PosPaymentController::class, 'devices']);
    Route::post('/{connection}/checkout',                       [PosPaymentController::class, 'createCheckout']);
    Route::get('/{connection}/checkout/{checkoutId}/status',    [PosPaymentController::class, 'checkoutStatus']);
    Route::post('/{connection}/checkout/{checkoutId}/cancel',   [PosPaymentController::class, 'cancelCheckout']);
    Route::post('/{connection}/pay',                            [PosPaymentController::class, 'squarePay']);
});

// ── POS order lookup (admin) ──────────────────────────────────────────────────
Route::get('ecommerce/orders/{order}/pos-orders', [PosPaymentController::class, 'posOrders']);

// ── POS Webhooks (no auth — verified by signature) ────────────────────────────
Route::post('webhooks/pos/square', [PosWebhookController::class, 'square'])->withoutMiddleware(['auth:sanctum']);
Route::post('webhooks/pos/clover', [PosWebhookController::class, 'clover'])->withoutMiddleware(['auth:sanctum']);

// ══════════════════════════════════════════════════════════════════════════════
// ── DELIVERY SYSTEM ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── Admin: Delivery Staff Management ─────────────────────────────────────────
Route::prefix('delivery/staff')->group(function () {
    Route::get('/',                         [DeliveryStaffController::class, 'index']);
    Route::post('/',                        [DeliveryStaffController::class, 'store']);
    Route::get('/available',               [DeliveryStaffController::class, 'available']);
    Route::get('/locations',               [DeliveryStaffController::class, 'locations']);
    Route::get('/{deliveryStaff}',          [DeliveryStaffController::class, 'show']);
    Route::patch('/{deliveryStaff}',        [DeliveryStaffController::class, 'update']);
    Route::delete('/{deliveryStaff}',       [DeliveryStaffController::class, 'destroy']);
    Route::post('/{deliveryStaff}/token',   [DeliveryStaffController::class, 'generateToken']);
});

// ── Admin: Delivery Zones Management ──────────────────────────────────────────
Route::prefix('delivery/zones')->group(function () {
    Route::get('/',                       [DeliveryZoneController::class, 'index']);
    Route::post('/',                      [DeliveryZoneController::class, 'store']);
    Route::post('/reorder',              [DeliveryZoneController::class, 'reorder']);
    Route::get('/{deliveryZone}',         [DeliveryZoneController::class, 'show']);
    Route::patch('/{deliveryZone}',       [DeliveryZoneController::class, 'update']);
    Route::delete('/{deliveryZone}',      [DeliveryZoneController::class, 'destroy']);
});

// ── Public: Check delivery zone for a coordinate ──────────────────────────────
Route::get('/delivery/zones/check-point', [DeliveryZoneController::class, 'checkPoint']);

// ── Public/Storefront: Unified Delivery Quote API ─────────────────────────────
// Single endpoint — pass `vendor` to route to DoorDash / UberEats / Instacart / own
Route::post('/delivery/quote', [DeliveryQuoteController::class, 'quote']);

// ── Admin: Order Assignment / Dispatch ────────────────────────────────────────
Route::prefix('delivery/assignments')->group(function () {
    Route::get('/',                                [DeliveryAssignmentController::class, 'index']);
    Route::post('/assign',                         [DeliveryAssignmentController::class, 'assign']);
    Route::post('/auto-assign',                    [DeliveryAssignmentController::class, 'autoAssign']);
    Route::post('/orders/{order}/unassign',        [DeliveryAssignmentController::class, 'unassign']);
    Route::patch('/{assignment}/status',           [DeliveryAssignmentController::class, 'updateStatus']);
});

// ── Admin: Delivery Platform Settings ─────────────────────────────────────────
Route::prefix('delivery/settings')->group(function () {
    Route::get('/',               [DeliverySettingsController::class, 'index']);
    Route::post('/',              [DeliverySettingsController::class, 'upsert']);
    Route::post('/test',          [DeliverySettingsController::class, 'testConnection']);
});

// ── Admin: All Platform Orders (UberEats + Instacart unified) ─────────────────
Route::prefix('delivery/platform-orders')->group(function () {
    Route::get('/',                                [PlatformOrderController::class, 'index']);
    Route::get('/summary',                         [PlatformOrderController::class, 'summary']);
    Route::get('/{platformOrder}',                 [PlatformOrderController::class, 'show']);
    Route::patch('/{platformOrder}/status',        [PlatformOrderController::class, 'updateStatus']);
});

// ── Admin: UberEats Order Management ──────────────────────────────────────────
Route::prefix('delivery/ubereats')->group(function () {
    Route::get('/config',                          [UberEatsController::class, 'config']);
    Route::get('/orders',                          [UberEatsController::class, 'orders']);
    Route::post('/orders/{platformOrder}/accept',  [UberEatsController::class, 'accept']);
    Route::post('/orders/{platformOrder}/reject',  [UberEatsController::class, 'reject']);
    Route::patch('/orders/{platformOrder}/status', [UberEatsController::class, 'updateOrderStatus']);
});

// ── Admin: Instacart Order Management ─────────────────────────────────────────
Route::prefix('delivery/instacart')->group(function () {
    Route::get('/config',                          [InstacartController::class, 'config']);
    Route::get('/orders',                          [InstacartController::class, 'orders']);
    Route::post('/orders/{platformOrder}/accept',  [InstacartController::class, 'accept']);
    Route::post('/orders/{platformOrder}/reject',  [InstacartController::class, 'reject']);
});

// ── Admin: Uber Direct (Delivery as a Service) ────────────────────────────────
Route::prefix('delivery/uber-direct')->group(function () {
    Route::get('/config',                      [UberDirectController::class, 'config']);
    Route::post('/quote',                      [UberDirectController::class, 'quote']);
    Route::get('/deliveries',                  [UberDirectController::class, 'listDeliveries']);
    Route::post('/stores',                     [UberDirectController::class, 'findStores']);
    Route::post('/dispatch/{order}',           [UberDirectController::class, 'dispatch']);
    Route::get('/status/{order}',              [UberDirectController::class, 'status']);
    Route::post('/update/{order}',             [UberDirectController::class, 'update']);
    Route::post('/cancel/{order}',             [UberDirectController::class, 'cancel']);
    Route::post('/proof/{order}',              [UberDirectController::class, 'proofOfDelivery']);
    // Courier Pick and Pack (CPP)
    Route::post('/cpp/quote',                  [UberDirectController::class, 'cppQuote']);
    Route::post('/cpp/dispatch/{order}',       [UberDirectController::class, 'cppDispatch']);
});

// ── Platform Webhooks (no auth — signature verified internally) ───────────────
Route::post('webhooks/delivery/ubereats',     [UberEatsController::class,   'webhook'])->withoutMiddleware(['auth:sanctum']);
Route::post('webhooks/delivery/instacart',    [InstacartController::class,  'webhook'])->withoutMiddleware(['auth:sanctum']);
Route::post('webhooks/delivery/uber-direct',  [UberDirectController::class, 'webhook'])->withoutMiddleware(['auth:sanctum']);

// ── ShipEngine API Routes (admin auth required) ───────────────────────────────
Route::prefix('shipengine')->group(function () {

    // Account
    Route::get('account/settings',           [ShipEngineController::class, 'getAccountSettings']);

    // Addresses
    Route::post('addresses/validate',        [ShipEngineController::class, 'validateAddresses']);

    // Carriers
    Route::get('carriers',                   [ShipEngineController::class, 'listCarriers']);
    Route::get('carriers/{carrierId}',       [ShipEngineController::class, 'getCarrier']);
    Route::get('carriers/{carrierId}/services', [ShipEngineController::class, 'getCarrierServices']);
    Route::get('carriers/{carrierId}/packages', [ShipEngineController::class, 'getCarrierPackageTypes']);
    Route::get('carriers/{carrierId}/options',  [ShipEngineController::class, 'getCarrierOptions']);

    // Rates
    Route::post('rates',                     [ShipEngineController::class, 'getRates']);
    Route::post('rates/bulk',                [ShipEngineController::class, 'getBulkRates']);
    Route::post('rates/estimate',            [ShipEngineController::class, 'estimateRates']);

    // Shipments
    Route::post('shipments',                 [ShipEngineController::class, 'createShipments']);
    Route::get('shipments',                  [ShipEngineController::class, 'listShipments']);
    Route::get('shipments/{shipmentId}',     [ShipEngineController::class, 'getShipment']);
    Route::put('shipments/{shipmentId}',     [ShipEngineController::class, 'updateShipment']);
    Route::put('shipments/{shipmentId}/cancel', [ShipEngineController::class, 'cancelShipment']);
    Route::get('shipments/{shipmentId}/rates',  [ShipEngineController::class, 'getShipmentRates']);

    // Labels
    Route::post('labels',                            [ShipEngineController::class, 'createLabel']);
    Route::get('labels',                             [ShipEngineController::class, 'listLabels']);
    Route::get('labels/{labelId}',                   [ShipEngineController::class, 'getLabel']);
    Route::put('labels/{labelId}/void',              [ShipEngineController::class, 'voidLabel']);
    Route::get('labels/{labelId}/track',             [ShipEngineController::class, 'getLabelTrackingInfo']);
    Route::post('labels/rates/{rateId}',             [ShipEngineController::class, 'createLabelFromRate']);
    Route::post('labels/shipments/{shipmentId}',     [ShipEngineController::class, 'createLabelFromShipment']);

    // Tracking
    Route::get('tracking',                   [ShipEngineController::class, 'track']);
    Route::post('tracking/start',            [ShipEngineController::class, 'startTracking']);
    Route::post('tracking/stop',             [ShipEngineController::class, 'stopTracking']);

    // Service Points
    Route::post('service-points/search',                                    [ShipEngineController::class, 'searchServicePoints']);
    Route::get('service-points/{carrierCode}/{countryCode}/{servicePointId}', [ShipEngineController::class, 'getServicePoint']);

    // Warehouses
    Route::get('warehouses',                 [ShipEngineController::class, 'listWarehouses']);
    Route::post('warehouses',                [ShipEngineController::class, 'createWarehouse']);
    Route::get('warehouses/{warehouseId}',   [ShipEngineController::class, 'getWarehouse']);
    Route::put('warehouses/{warehouseId}',   [ShipEngineController::class, 'updateWarehouse']);
    Route::delete('warehouses/{warehouseId}',[ShipEngineController::class, 'deleteWarehouse']);

    // Batches
    Route::post('batches',                            [ShipEngineController::class, 'createBatch']);
    Route::get('batches/{batchId}',                   [ShipEngineController::class, 'getBatch']);
    Route::post('batches/{batchId}/add',              [ShipEngineController::class, 'addToBatch']);
    Route::post('batches/{batchId}/remove',           [ShipEngineController::class, 'removeFromBatch']);
    Route::post('batches/{batchId}/process',          [ShipEngineController::class, 'processBatch']);

    // Manifests (LTL / End-of-day)
    Route::post('manifests',                 [ShipEngineController::class, 'createManifest']);
    Route::get('manifests',                  [ShipEngineController::class, 'listManifests']);
    Route::get('manifests/{manifestId}',     [ShipEngineController::class, 'getManifest']);

    // Pickups
    Route::post('pickups',                   [ShipEngineController::class, 'schedulePickup']);
    Route::get('pickups',                    [ShipEngineController::class, 'listPickups']);
    Route::delete('pickups/{pickupId}',      [ShipEngineController::class, 'cancelPickup']);
});

// ── Stripe Payment Routes (OTP Bearer token required) ────────────────────────
// Requires Authorization: Bearer <otp-token> from POST /api/otp-auth/verify
Route::prefix('payment/stripe')->group(function () {
    Route::get('config',                   [StripeController::class, 'config']);       // public — no auth
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
// Public read-only alias: /api/entities/case-studies (no auth required)
// Used by external sites (e.g. javed.io) to fetch portfolio case studies.
Route::get('/entities/case-studies', [CaseStudyController::class, 'index']);
Route::get('/entities/case-studies/{slug}', [CaseStudyController::class, 'show']);

Route::middleware(['mcp.auth', 'mcp.check'])->group(function () {
    Route::get('/entities/{entity}', [DynamicEntityController::class, 'index']);
    Route::get('/entities/{entity}/relation-debug', [DynamicEntityController::class, 'relationDebug']);
    Route::get('/entities/{entity}/by/{field}/{value}', [DynamicEntityController::class, 'showByField']);
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


// ── Platform User Auth (Public API — per Cal platform) ─────────────────────────
// {table} = DB table name (openorg_users, se_xdstudio_users …)
// Platform auto-resolved from table: openorg_users → platform(users_entity_id IS NULL)
//                                     se_xyz_users  → SectionEntity → platform(users_entity_id)
// GET  /api/cal/{table}/users?email=  → get user profile          (SITE_API_KEY)
// POST /api/cal/{table}/users         → find-or-create + token     (SITE_API_KEY)
// GET  /api/cal/{table}/meetings      → public; Bearer token = user-filtered + kanban_card
// GET  /api/cal/{table}/cards?email=  → cards by email param or Bearer token
Route::prefix('cal/{table}')->group(function () {
    Route::middleware(['site.api.key', 'throttle:60,1'])->group(function () {
        Route::get('users',  [\App\Http\Controllers\Api\PlatformUserAuthController::class, 'show']);
        Route::post('users', [\App\Http\Controllers\Api\PlatformUserAuthController::class, 'store']);
    });
    Route::middleware(['throttle:60,1'])->group(function () {
        Route::get('meetings', [\App\Http\Controllers\Api\PlatformUserAuthController::class, 'meetings']);
        Route::get('cards',    [\App\Http\Controllers\Api\PlatformUserAuthController::class, 'cards']);
    });
});
