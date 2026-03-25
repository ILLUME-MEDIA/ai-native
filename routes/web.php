<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SectionBuilder\SectionBuilderController;
use App\Http\Controllers\Ecommerce\PosController;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ── Deploy verification ───────────────────────────────────────────────────────
Route::get('/version', function () {
    $commit     = trim(shell_exec('git rev-parse --short HEAD 2>/dev/null') ?? 'unknown');

    $opcache = null;
    if (function_exists('opcache_get_status')) {
        $s = opcache_get_status(false);
        $opcache = $s ? [
            'enabled'             => true,
            'validate_timestamps' => ini_get('opcache.validate_timestamps') ? 'ON' : 'OFF (files never reloaded — run /clear-cache after deploys)',
            'revalidate_freq_sec' => (int) ini_get('opcache.revalidate_freq'),
            'cached_scripts'      => $s['opcache_statistics']['num_cached_scripts'] ?? null,
        ] : ['enabled' => false];
    }

    return response()->json([
        'commit'      => $commit,
        'branch'      => trim(shell_exec('git rev-parse --abbrev-ref HEAD 2>/dev/null') ?? 'unknown'),
        'message'     => trim(shell_exec('git log -1 --pretty=%s 2>/dev/null') ?? 'unknown'),
        'committed_at'=> trim(shell_exec('git log -1 --pretty=%ci 2>/dev/null') ?? 'unknown'),
        'server_time' => now()->toDateTimeString(),
        'env'         => app()->environment(),
        'opcache'     => $opcache,
    ]);
});

// ── One-time: fix wrong DoorDash string delivery IDs ─────────────────────────
// DoorDash GET /deliveries/{id} requires the numeric internal ID.
// Pass known numeric IDs as query params: ?ids=ORD-ABC:2788693984,ORD-DEF:2788689796
// Or it will attempt to look up by the order number stored in doordash_delivery_id.
Route::get('/fix-doordash-ids', function (Illuminate\Http\Request $request) {
    // Accept manual mapping: ?ids=ORD-9YLJP6G3:2788693984,ORD-FGBFBSCP:2788689796
    $manualMap = [];
    if ($request->query('ids')) {
        foreach (explode(',', $request->query('ids')) as $pair) {
            [$orderNum, $numericId] = explode(':', trim($pair)) + [null, null];
            if ($orderNum && $numericId) {
                $manualMap[trim($orderNum)] = trim($numericId);
            }
        }
    }

    $orders = \App\Models\Order::whereNotNull('doordash_delivery_id')
        ->whereRaw("doordash_delivery_id REGEXP '[^0-9]'")
        ->get(['id', 'order_number', 'doordash_delivery_id']);

    if ($orders->isEmpty()) {
        return response()->json(['message' => 'No orders with wrong DoorDash IDs found.']);
    }

    $doorDash = app(\App\Services\DoorDashService::class);
    $results  = [];

    foreach ($orders as $order) {
        $numericId = $manualMap[$order->order_number] ?? null;

        if (!$numericId) {
            $results[] = [
                'order'  => $order->order_number,
                'old_id' => $order->doordash_delivery_id,
                'error'  => 'No numeric DoorDash ID provided. Pass ?ids=ORDER_NUM:NUMERIC_ID',
                'result' => 'skipped',
            ];
            continue;
        }

        try {
            // DoorDash v1 GET requires the numeric internal ID
            $delivery = $doorDash->getDelivery($numericId);

            $trackingUrl = $delivery['delivery_tracking_url'] ?? null;
            $status      = $delivery['status']               ?? null;
            $eta         = $delivery['estimated_delivery_time'] ?? null;

            $order->update(array_filter([
                'doordash_delivery_id'  => (string) $numericId,
                'doordash_tracking_url' => $trackingUrl,
                'tracking_url'          => $trackingUrl,
                'doordash_status'       => $status,
                'estimated_delivery_at' => $eta ? \Illuminate\Support\Carbon::parse($eta) : null,
            ], fn($v) => $v !== null));

            $results[] = [
                'order'        => $order->order_number,
                'old_id'       => $order->doordash_delivery_id,
                'new_id'       => $numericId,
                'status'       => $status,
                'tracking_url' => $trackingUrl,
                'result'       => 'fixed',
            ];
        } catch (\Throwable $e) {
            $results[] = [
                'order'  => $order->order_number,
                'old_id' => $order->doordash_delivery_id,
                'error'  => $e->getMessage(),
                'result' => 'error',
            ];
        }
    }

    return response()->json([
        'message' => 'Processed ' . $orders->count() . ' orders.',
        'results' => $results,
    ]);
});


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
    // opcache_reset() only clears the current worker process.
    // opcache_invalidate() per-file forces reload even in multi-worker setups.
    $invalidated = 0;
    $resetOk     = false;
    if (function_exists('opcache_reset')) {
        $resetOk = opcache_reset();
    }
    if (function_exists('opcache_invalidate')) {
        // Recursively invalidate every PHP file under app/ and routes/
        $dirs = [app_path(), base_path('routes'), base_path('bootstrap')];
        foreach ($dirs as $dir) {
            $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
            foreach ($it as $file) {
                if ($file->getExtension() === 'php') {
                    opcache_invalidate($file->getPathname(), true);
                    $invalidated++;
                }
            }
        }
    }

    Artisan::call('config:clear');
    Artisan::call('route:clear');
    Artisan::call('view:clear');
    Artisan::call('cache:clear');
    Artisan::call('event:clear');

    return response()->json([
        'message'            => 'All caches cleared.',
        'opcache_reset'      => $resetOk,
        'opcache_invalidated'=> $invalidated . ' PHP files',
        'cleared'            => ['config', 'route', 'view', 'cache', 'event'],
        'note'               => $invalidated === 0
            ? 'OPcache extension not active — restart your web server to clear bytecode cache'
            : 'OPcache files invalidated for this worker. If multi-worker (Apache/FPM), also restart the server.',
    ]);
})->name('clear-cache');

Route::get('/run-migrations', function () {
    // Clear OPcache FIRST so updated migration files are picked up, not cached old versions
    if (function_exists('opcache_reset')) {
        opcache_reset();
    }

    // Pre-flight fixes — idempotent raw SQL patches that run before the migration system.
    // Safe to run multiple times. Fixes schema issues that cause migration runner to crash.
    $preflightFixes = [];

    // If openorg_users table is missing, delete its migration records so the runner recreates it
    if (!\Illuminate\Support\Facades\Schema::hasTable('openorg_users')) {
        \Illuminate\Support\Facades\DB::table('migrations')->whereIn('migration', [
            '2026_03_05_200000_add_openorg_users_and_platform_links',
            '2026_03_13_062901_make_cal_platform_id_nullable_in_openorg_users',
        ])->delete();
        $preflightFixes[] = 'openorg_users missing → migration records cleared for recreation';
    } else {
        // Table exists — ensure cal_platform_id and name are nullable
        try {
            \Illuminate\Support\Facades\DB::statement(
                'ALTER TABLE openorg_users MODIFY COLUMN cal_platform_id BIGINT UNSIGNED NULL'
            );
            $preflightFixes[] = 'openorg_users.cal_platform_id → nullable OK';
        } catch (\Throwable $e) {
            $preflightFixes[] = 'openorg_users.cal_platform_id: ' . $e->getMessage();
        }
        try {
            \Illuminate\Support\Facades\DB::statement(
                'ALTER TABLE openorg_users MODIFY COLUMN name VARCHAR(255) NULL'
            );
            $preflightFixes[] = 'openorg_users.name → nullable OK';
        } catch (\Throwable $e) {
            $preflightFixes[] = 'openorg_users.name: ' . $e->getMessage();
        }
    }

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
                || str_contains($msg, "can't drop")
                || str_contains($msg, 'check that it exists')
                || in_array($code, ['42S01', '42S21', '1060', '1061', '1062', '1091'], true);
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
        } catch (\Throwable $e) {
            $allOutput[] = 'Bulk migrate error (switching to per-migration mode): ' . $e->getMessage();
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
        try {
            Artisan::call('migrate', ['--force' => true]);
            $allOutput[] = trim(Artisan::output());
        } catch (\Throwable $e) {
            $errors[] = 'final-pass: ' . $e->getMessage();
        }

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

        // Migrate cuisines from muzzhub.cuisine text → cuisines table + pivot
        try {
            Artisan::call('cuisines:migrate');
            $seederOutput['cuisines:migrate'] = trim(Artisan::output()) ?: 'Done';
        } catch (\Throwable $e) {
            $seederErrors['cuisines:migrate'] = $e->getMessage();
        }

        foreach ($seeders as $seeder) {
            try {
                Artisan::call('db:seed', ['--class' => $seeder, '--force' => true]);
                $seederOutput[$seeder] = trim(Artisan::output()) ?: 'Done';
            } catch (\Throwable $e) {
                $seederErrors[$seeder] = $e->getMessage();
            }
        }

        // Clear Laravel config/route/view caches.
        Artisan::call('config:clear');
        Artisan::call('route:clear');
        Artisan::call('view:clear');

        return response()->json([
            'message' => 'Migrations + Seeders completed.',
            'preflight_fixes' => $preflightFixes,
            'migrate_output' => $allOutput,
            'skipped' => $skipped,
            'errors' => $errors,
            'replayed_migrations' => $replayed,
            'recreated_tables' => array_values(array_unique($recreated)),
            'storage_link_output' => $storageLinkOutput,
            'seeders' => $seederOutput,
            'seeder_errors' => $seederErrors,
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
    return redirect('/admin/dashboard/ecommerce');
});

Route::get('/dashboard', function (Request $request) {
    return redirect('/admin/dashboard/ecommerce');
})->name('dashboard');

// Auth middleware temporarily removed — session cookie issue on cPanel.
// TODO: re-add auth middleware once login session cookie is fixed.
Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

Route::get('/admin/{any?}', [SectionBuilderController::class, 'index'])
    ->where('any', '.*')
    ->name('admin.spas.index');

// Redirect bare /apps/* to /admin/apps/* so React Router basename="/admin" can handle it
Route::get('/apps/{any}', fn($any) => redirect("/admin/apps/{$any}"))
    ->where('any', '.*');

// TEMPORARY: one-time nginx proxy cache purge — hit this URL once then remove.
Route::get('/purge-nginx-cache-7f3k9x', function () {
    $deleted = 0;
    $searched = [];
    $paths = [
        '/var/cache/nginx',
        '/var/lib/nginx/cache',
        '/tmp/nginx_cache',
        '/home/' . (getenv('USER') ?: 'n111145') . '/tmp',
        sys_get_temp_dir() . '/nginx_cache',
    ];
    foreach ($paths as $dir) {
        $searched[] = $dir;
        if (! is_dir($dir)) continue;
        $files = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS)
        );
        foreach ($files as $file) {
            if ($file->isFile() && @unlink($file->getPathname())) {
                $deleted++;
            }
        }
    }
    return response()->json([
        'status'   => 'done',
        'deleted'  => $deleted,
        'searched' => $searched,
        'note'     => 'Remove this route after use.',
    ]);
});

// ── Uber Direct Debug ──────────────────────────────────────────────────────
Route::get('/debug-uber-direct', function () {
    $results = [];

    // Step 0: Which DB are we connected to?
    $results['db_connection'] = [
        'database' => \Illuminate\Support\Facades\DB::getDatabaseName(),
        'host'     => config('database.connections.mysql.host'),
        'env_file' => app()->environmentFilePath(),
        'app_env'  => app()->environment(),
        'all_app_secrets_count' => \App\Models\AppSecret::count(),
        'all_keys_in_table'     => \App\Models\AppSecret::pluck('key')->toArray(),
    ];

    // Step 1: Raw DB check (NO is_active filter)
    $keys = ['UBER_DIRECT_CLIENT_ID', 'UBER_DIRECT_CLIENT_SECRET', 'UBER_DIRECT_CUSTOMER_ID', 'UBER_DIRECT_ENV'];
    $secrets = \App\Models\AppSecret::whereIn('key', $keys)->get();
    $results['db_total_found'] = $secrets->count();

    foreach ($secrets as $s) {
        try {
            $plain = $s->getPlainValue();
            $results['db'][$s->key] = [
                'is_active' => $s->is_active,
                'decrypted' => $plain ? '✓ (' . strlen($plain) . ' chars, ends: ...' . substr($plain, -4) . ')' : 'EMPTY',
            ];
        } catch (\Throwable $e) {
            $results['db'][$s->key] = [
                'is_active'     => $s->is_active,
                'decrypt_error' => $e->getMessage(),
            ];
        }
    }

    // Check if any keys completely missing from DB
    $foundKeys = $secrets->pluck('key')->toArray();
    $missingKeys = array_diff($keys, $foundKeys);
    if ($missingKeys) $results['db_missing_keys'] = array_values($missingKeys);

    // Step 2: AppSecretService check
    foreach (['UBER_DIRECT_CLIENT_ID', 'UBER_DIRECT_CLIENT_SECRET', 'UBER_DIRECT_CUSTOMER_ID', 'UBER_DIRECT_ENV'] as $key) {
        $val = \App\Services\AppSecretService::get($key, '__NOT_SET__');
        $results['service'][$key] = $val === '__NOT_SET__'
            ? 'NOT SET'
            : ($val ? '✓ (' . strlen($val) . ' chars)' : 'EMPTY STRING');
    }

    // Step 3: Try OAuth token
    try {
        $uber = app(\App\Services\UberDirectService::class);
        $results['env'] = $uber->getEnv();
        $results['customer_id_set'] = $uber->getCustomerId() ? '✓' : 'EMPTY';

        // Force a quote to test full flow
        $raw = $uber->createQuote(
            '{"street_address":["100 Market St"],"city":"San Francisco","state":"CA","zip_code":"94105","country":"US"}',
            '{"street_address":["456 Mission St"],"city":"San Francisco","state":"CA","zip_code":"94105","country":"US"}',
            3550
        );
        $results['oauth'] = 'SUCCESS';
        $results['quote_response'] = $raw;
    } catch (\Throwable $e) {
        $results['oauth_error'] = $e->getMessage();
    }

    return response()->json($results, 200, [], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
});

require __DIR__.'/auth.php';

