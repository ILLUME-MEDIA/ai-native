<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;

class ArtisanController extends Controller
{
    /** POST /api/admin/artisan/migrate */
    public function migrate(): JsonResponse
    {
        $exit = Artisan::call('migrate', ['--force' => true]);

        return response()->json([
            'success' => $exit === 0,
            'output'  => Artisan::output(),
        ]);
    }

    /** POST /api/admin/artisan/cuisines-migrate */
    public function cuisinesMigrate(): JsonResponse
    {
        $exit = Artisan::call('cuisines:migrate');

        return response()->json([
            'success' => $exit === 0,
            'output'  => Artisan::output(),
        ]);
    }

    /** POST /api/admin/artisan/seed-design-system */
    public function seedDesignSystem(): JsonResponse
    {
        $exit = Artisan::call('db:seed', ['--class' => 'DesignSystemSeeder', '--force' => true]);

        return response()->json([
            'success' => $exit === 0,
            'output'  => Artisan::output(),
        ]);
    }
}
