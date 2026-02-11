<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SectionBuilder\SectionBuilderController;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Run all migrations. GET /run-migrations (no key required).
// Route::get('/run-migrations', function () {
//     try {
//         Artisan::call('migrate', ['--force' => true]);
//         $output = Artisan::output();
//         return response()->json([
//             'message' => 'Migrations completed.',
//             'output' => $output,
//         ]);
//     } catch (\Illuminate\Database\QueryException $e) {
//         $code = $e->getCode() ?? 0;
//         $msg = $e->getMessage();
//         if ($code === 1045 || str_contains($msg, 'Access denied')) {
//             return response()->json([
//                 'message' => 'Database connection failed. Check .env: DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD.',
//                 'hint' => 'Get correct credentials from your hosting panel (cPanel/Plesk). Use their MySQL host (often localhost or a host like mysql.yourdomain.com).',
//                 'error_code' => 1045,
//             ], 503);
//         }
//         throw $e;
//     }
// })->name('run-migrations');

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
