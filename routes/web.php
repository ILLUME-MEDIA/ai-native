<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SectionBuilder\SectionBuilderController;
use App\Http\Controllers\Ecommerce\PosController;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// â”€â”€ API Documentation (Swagger UI) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Access via: /api-docs  (no auth required)
Route::get('/api-docs', function () {
    return redirect('/api-docs/index.html');
})->name('api-docs');

// Serve YAML with correct content-type so Swagger UI can load it cross-origin
Route::get('/api-docs/openapi.yaml', function () {
    $path = public_path('api-docs/openapi.yaml');
    if (!file_exists($path)) {
        abort(404, 'API docs YAML not found.');
    }
    return response()->file($path, [
        'Content-Type'                => 'application/yaml',
        'Access-Control-Allow-Origin' => '*',
    ]);
})->name('api-docs.yaml');

// Run all migrations. GET /run-migrations (no key required).
// Smart mode: if a table already exists (created manually before migration was added),
// the migration is marked as run in the migrations table without re-creating the table.
// Clear all Laravel + OPcache caches. GET /clear-cache
Route::get('/clear-cache', function () {
    $opcacheCleared = function_exists('opcache_reset') ? opcache_reset() : false;

    Artisan::call('config:clear');
    Artisan::call('route:clear');
    Artisan::call('view:clear');
    Artisan::call('cache:clear');
    Artisan::call('event:clear');

    return response()->json([
        'message'        => 'All caches cleared.',
        'opcache_reset'  => $opcacheCleared,
        'cleared'        => ['config', 'route', 'view', 'cache', 'event'],
    ]);
})->name('clear-cache');

Route::get('/run-migrations', function () {
    try {
        $allOutput = [];
        $skipped = [];
        $errors = [];
        $replayed = [];
        $recreated = [];

        $isIgnorableMigrationConflict = function (\Throwable $e): bool {
            $msg = strtolower($e->getMessage());
            $code = (string) ($e->getCode() ?? '');

            return str_contains($msg, 'already exists')
                || str_contains($msg, 'duplicate column')
                || str_contains($msg, 'duplicate key name')
                || str_contains($msg, 'duplicate entry')
                || str_contains($msg, 'duplicate index')
                || in_array($code, ['42S01', '42S21', '1060', '1061', '1062'], true);
        };

        // Step 1: Best-effort bulk migrate.
        try {
            Artisan::call('migrate', ['--force' => true]);
            $allOutput[] = trim(Artisan::output());
        } catch (\Illuminate\Database\QueryException $e) {
            if (!$isIgnorableMigrationConflict($e)) {
                throw $e;
            }
            $allOutput[] = 'Conflict detected on bulk migrate. Switching to per-migration mode.';
        }

        // Step 2: Per-migration mode with smart replay for missing create-table migrations.
        $ran = \Illuminate\Support\Facades\DB::table('migrations')->pluck('migration')->toArray();
        $ranMap = array_fill_keys($ran, true);
        $maxBatch = \Illuminate\Support\Facades\DB::table('migrations')->max('batch') ?? 0;
        $batch = $maxBatch + 1;

        $files = glob(database_path('migrations/*.php'));
        sort($files);

        foreach ($files as $file) {
            $name = pathinfo($file, PATHINFO_FILENAME);
            $base = basename($file);

            // If migration says create_{table}_table, but table is missing while migration is marked run:
            // remove migration row and replay it.
            if (preg_match('/create_(.+)_table$/', $name, $m)) {
                $table = $m[1];
                if (isset($ranMap[$name]) && !\Illuminate\Support\Facades\Schema::hasTable($table)) {
                    \Illuminate\Support\Facades\DB::table('migrations')->where('migration', $name)->delete();
                    unset($ranMap[$name]);
                    $replayed[] = $name . ' (migration entry removed)';
                    $recreated[] = $table;
                }
            }

            if (isset($ranMap[$name])) {
                continue;
            }

            try {
                Artisan::call('migrate', [
                    '--force' => true,
                    '--path' => 'database/migrations/' . $base,
                ]);
                $allOutput[] = trim(Artisan::output());
                $ranMap[$name] = true;
            } catch (\Illuminate\Database\QueryException $e) {
                if ($isIgnorableMigrationConflict($e)) {
                    \Illuminate\Support\Facades\DB::table('migrations')->insertOrIgnore([
                        'migration' => $name,
                        'batch' => $batch,
                    ]);
                    $skipped[] = $name . ' (conflict ignored and marked as run)';
                    $ranMap[$name] = true;
                } else {
                    $errors[] = $name . ': ' . $e->getMessage();
                }
            }
        }

        // Step 2b: One final full pass in case dependencies resolved during replay.
        Artisan::call('migrate', ['--force' => true]);
        $allOutput[] = trim(Artisan::output());

        // Step 3: Storage symlink.
        Artisan::call('storage:link');
        $storageLinkOutput = trim(Artisan::output());

        // Step 4: Run seeders.
        $seederOutput = [];
        $seederErrors = [];
        $seeders = [
            'CodeEditorPermissionSeeder',
            'MCPCatalogSeeder',
            'MenuCategoryTypeSeeder',
            'RestaurantSampleDataSeeder',
            'AppSecretsSeeder',
        ];

        foreach ($seeders as $seeder) {
            try {
                Artisan::call('db:seed', ['--class' => $seeder, '--force' => true]);
                $seederOutput[$seeder] = trim(Artisan::output()) ?: 'Done';
            } catch (\Throwable $e) {
                $seederErrors[$seeder] = $e->getMessage();
            }
        }

        // Clear OPcache so newly deployed PHP files take effect immediately.
        $opcacheCleared = function_exists('opcache_reset') ? opcache_reset() : false;

        // Clear Laravel config/route/view caches.
        Artisan::call('config:clear');
        Artisan::call('route:clear');
        Artisan::call('view:clear');

        return response()->json([
            'message' => 'Migrations + Seeders completed.',
            'migrate_output' => $allOutput,
            'skipped' => $skipped,
            'errors' => $errors,
            'replayed_migrations' => $replayed,
            'recreated_tables' => array_values(array_unique($recreated)),
            'storage_link_output' => $storageLinkOutput,
            'seeders' => $seederOutput,
            'seeder_errors' => $seederErrors,
            'opcache_reset' => $opcacheCleared,
        ]);
    } catch (\Throwable $e) {
        $code = method_exists($e, 'getCode') ? $e->getCode() : 0;
        $msg = $e->getMessage();

        if ($code === 1045 || str_contains($msg, 'Access denied')) {
            return response()->json([
                'message' => 'Database connection failed. Check .env: DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD.',
                'hint' => 'Get correct credentials from your hosting panel (cPanel/Plesk). Use their MySQL host (often localhost or mysql.yourdomain.com).',
                'error_code' => 1045,
            ], 503);
        }

        return response()->json([
            'message' => 'Unexpected error during migration/seeding.',
            'error' => $msg,
            'class' => get_class($e),
            'file' => $e->getFile() . ':' . $e->getLine(),
        ], 500);
    }
})->name('run-migrations');

// â”€â”€ POS OAuth Callbacks (Square + Clover redirect here after user authorizes) â”€â”€
Route::get('/pos/square/callback', [PosController::class, 'squareCallback'])->name('pos.square.callback');
Route::get('/pos/clover/callback', [PosController::class, 'cloverCallback'])->name('pos.clover.callback');

// â”€â”€ Storage fallback (serves files directly if /public/storage symlink returns 403) â”€â”€
Route::get('/storage/{path}', function ($path) {
    $fullPath = storage_path('app/public/' . $path);
    if (!file_exists($fullPath)) {
        abort(404);
    }
    $mimeType = mime_content_type($fullPath) ?: 'application/octet-stream';
    return response()->file($fullPath, ['Content-Type' => $mimeType]);
})->where('path', '.*')->name('storage.serve');

Route::get('/', function () {
    if (auth()->check()) {
        return Inertia::location('/admin/dashboard/ecommerce');
    }
    return Inertia::location(route('login'));
});

Route::get('/dashboard', function (Request $request) {
    $adminUrl = '/admin/dashboard/ecommerce';

    // If this is an Inertia visit, force a full page load to the admin SPA.
    if ($request->header('X-Inertia')) {
        return Inertia::location($adminUrl);
    }

    return redirect($adminUrl);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Section Builder entrypoint (serve SPA)
    // Use a catch-all to allow React Router to handle sub paths. Controller still runs a sync and provides initial props.
    Route::get('/admin/{any?}', [SectionBuilderController::class, 'index'])
        ->where('any', '.*')
        ->name('admin.spas.index');
});

require __DIR__.'/auth.php';

