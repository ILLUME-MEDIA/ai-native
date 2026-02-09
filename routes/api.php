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
    // Section Builder meta configuration
    Route::get('/section-builder/entities', [EntityController::class, 'index'])
        ->name('api.section-builder.entities.index');
    Route::post('/section-builder/entities', [EntityController::class, 'store'])
        ->name('api.section-builder.entities.store');
    Route::get('/section-builder/entities/{entity}', [EntityController::class, 'show'])
        ->name('api.section-builder.entities.show');
    Route::patch('/section-builder/entities/{entity}', [EntityController::class, 'update'])
        ->name('api.section-builder.entities.update');
    Route::get('/section-builder/entities/{entity}/mcp', [EntityController::class, 'getMcpConfig'])
        ->name('api.section-builder.entities.mcp');

    Route::get('/section-builder/entities/{entity}/fields', [FieldController::class, 'index'])
        ->name('api.section-builder.fields.index');
    Route::post('/section-builder/entities/{entity}/fields', [FieldController::class, 'store'])
        ->name('api.section-builder.fields.store');
    Route::patch('/section-builder/entities/{entity}/fields/{field}', [FieldController::class, 'update'])
        ->name('api.section-builder.fields.update');
    Route::post('/section-builder/entities/{entity}/fields/reorder', [FieldController::class, 'reorder'])
        ->name('api.section-builder.fields.reorder');

    // Generic dynamic CRUD APIs (with MCP middleware)
    Route::middleware('mcp.check')->group(function () {
        Route::get('/entities/{entity}', [DynamicEntityController::class, 'index']);
        Route::get('/entities/{entity}/{id}', [DynamicEntityController::class, 'show']);
        Route::post('/entities/{entity}', [DynamicEntityController::class, 'store']);
        Route::put('/entities/{entity}/{id}', [DynamicEntityController::class, 'update']);
        Route::patch('/entities/{entity}/{id}', [DynamicEntityController::class, 'update']);
        Route::delete('/entities/{entity}/{id}', [DynamicEntityController::class, 'destroy']);
    });

    //

    // AI Agent Management System
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
        Route::get('chat/audit-logs', [\App\Http\Controllers\AI\AIChatController::class, 'auditLogs']);
    });

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

