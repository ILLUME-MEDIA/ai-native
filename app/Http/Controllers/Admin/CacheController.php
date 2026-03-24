<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;

class CacheController extends Controller
{
    /**
     * Clear all application caches.
     * POST /api/admin/cache/clear
     */
    public function clear(Request $request)
    {
        $cleared = [];
        $errors  = [];

        // 1. Laravel application cache (database/file/redis driver)
        try {
            Cache::flush();
            $cleared[] = 'application cache';
        } catch (\Throwable $e) {
            $errors[] = 'application cache: ' . $e->getMessage();
        }

        // 2. Config cache
        try {
            Artisan::call('config:clear');
            $cleared[] = 'config cache';
        } catch (\Throwable $e) {
            $errors[] = 'config cache: ' . $e->getMessage();
        }

        // 3. Route cache
        try {
            Artisan::call('route:clear');
            $cleared[] = 'route cache';
        } catch (\Throwable $e) {
            $errors[] = 'route cache: ' . $e->getMessage();
        }

        // 4. View cache
        try {
            Artisan::call('view:clear');
            $cleared[] = 'view cache';
        } catch (\Throwable $e) {
            $errors[] = 'view cache: ' . $e->getMessage();
        }

        // 5. Schema sync lock — force fresh sync on next request
        Cache::forget('section_builder_schema_sync_last');
        Cache::forget('section_builder_schema_sync_lock');

        // 6. Public case study cache
        Cache::forget('public:case_studies:index');

        return response()->json([
            'success' => empty($errors),
            'cleared' => $cleared,
            'errors'  => $errors,
            'message' => empty($errors)
                ? 'All caches cleared successfully.'
                : 'Some caches cleared with errors.',
        ]);
    }

    /**
     * Clear only the section builder schema sync cache so changes
     * reflect immediately without a full cache flush.
     * POST /api/admin/cache/sync
     */
    public function syncSchema()
    {
        Cache::forget('section_builder_schema_sync_last');
        Cache::forget('section_builder_schema_sync_lock');

        return response()->json(['message' => 'Schema sync cache cleared. Next request will re-sync.']);
    }
}
