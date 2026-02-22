<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SectionBuilder\SectionBuilderController;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ── API Documentation (Swagger UI) ─────────────────────────────────────────
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
Route::get('/run-migrations', function () {
    try {
        $allOutput = [];
        $skipped   = [];
        $errors    = [];

        // Step 1: Run all migrations normally (handles fresh installs cleanly).
        // If a "table already exists" conflict occurs we fall through to Step 2.
        try {
            Artisan::call('migrate', ['--force' => true]);
            $allOutput[] = Artisan::output();
        } catch (\Illuminate\Database\QueryException $e) {
            if (!str_contains($e->getMessage(), 'already exists') && $e->getCode() !== '42S01') {
                throw $e; // re-throw non-table-exists errors
            }
            $allOutput[] = 'Conflict detected on bulk migrate — switching to per-migration mode.';
        }

        // Step 2: Run each pending migration individually so conflicts can be handled gracefully.
        $ran      = \Illuminate\Support\Facades\DB::table('migrations')->pluck('migration')->toArray();
        $maxBatch = \Illuminate\Support\Facades\DB::table('migrations')->max('batch') ?? 0;
        $batch    = $maxBatch + 1;

        $files = glob(database_path('migrations/*.php'));
        sort($files);

        foreach ($files as $file) {
            $name = pathinfo($file, PATHINFO_FILENAME);

            if (in_array($name, $ran)) {
                continue; // already run — skip
            }

            try {
                Artisan::call('migrate', [
                    '--force' => true,
                    '--path'  => 'database/migrations/' . basename($file),
                ]);
                $allOutput[] = trim(Artisan::output());
            } catch (\Illuminate\Database\QueryException $e) {
                $msg = $e->getMessage();
                if (str_contains($msg, 'already exists') || $e->getCode() === '42S01') {
                    // Table already existed — mark migration as run so it won't be retried.
                    \Illuminate\Support\Facades\DB::table('migrations')->insertOrIgnore([
                        'migration' => $name,
                        'batch'     => $batch,
                    ]);
                    $skipped[] = $name . ' (table already exists — marked as run)';
                } else {
                    $errors[] = $name . ': ' . $msg;
                }
            }
        }

        // Step 3: Storage symlink
        Artisan::call('storage:link');
        $storageLinkOutput = Artisan::output();

        return response()->json([
            'message'             => 'Migrations completed.',
            'migrate_output'      => $allOutput,
            'skipped'             => $skipped,
            'errors'              => $errors,
            'storage_link_output' => $storageLinkOutput,
        ]);

    } catch (\Illuminate\Database\QueryException $e) {
        $code = $e->getCode() ?? 0;
        $msg  = $e->getMessage();
        if ($code === 1045 || str_contains($msg, 'Access denied')) {
            return response()->json([
                'message' => 'Database connection failed. Check .env: DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD.',
                'hint'    => 'Get correct credentials from your hosting panel (cPanel/Plesk). Use their MySQL host (often localhost or a host like mysql.yourdomain.com).',
                'error_code' => 1045,
            ], 503);
        }
        throw $e;
    }
})->name('run-migrations');

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
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
