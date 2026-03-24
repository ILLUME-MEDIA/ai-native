<?php

namespace App\Http\Controllers\Admin\DesignSystem;

use App\Http\Controllers\Controller;
use App\Models\DesignSystem\DsTheme;
use App\Services\DesignSystem\DesignTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DsThemeController extends Controller
{
    public function __construct(private DesignTokenService $service) {}

    public function index(): JsonResponse
    {
        return response()->json(DsTheme::withCount('tokens')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'slug'        => 'required|string|max:100|unique:ds_themes',
            'is_default'  => 'boolean',
            'description' => 'nullable|string',
        ]);

        if (!empty($data['is_default'])) {
            DsTheme::where('is_default', true)->update(['is_default' => false]);
        }

        $theme = DsTheme::create($data);
        return response()->json($theme, 201);
    }

    public function show(DsTheme $dsTheme): JsonResponse
    {
        return response()->json($dsTheme->load('tokens'));
    }

    public function update(Request $request, DsTheme $dsTheme): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'slug'        => "sometimes|string|max:100|unique:ds_themes,slug,{$dsTheme->id}",
            'is_default'  => 'boolean',
            'description' => 'nullable|string',
        ]);

        if (!empty($data['is_default'])) {
            DsTheme::where('id', '!=', $dsTheme->id)->update(['is_default' => false]);
        }

        $dsTheme->update($data);
        $this->service->invalidateCache($dsTheme->id);

        return response()->json($dsTheme);
    }

    public function destroy(DsTheme $dsTheme): JsonResponse
    {
        $dsTheme->delete();
        $this->service->invalidateCache($dsTheme->id);
        return response()->json(null, 204);
    }

    // ── Export endpoints ───────────────────────────────────────────

    public function exportJson(DsTheme $dsTheme): JsonResponse
    {
        return response()->json($this->service->exportJson($dsTheme->id));
    }

    public function exportCss(DsTheme $dsTheme)
    {
        $css = $this->service->generateCss($dsTheme->id);
        return response($css, 200)->header('Content-Type', 'text/css');
    }

    public function exportTailwind(DsTheme $dsTheme): JsonResponse
    {
        return response()->json($this->service->exportTailwindConfig($dsTheme->id));
    }

    public function exportDts(DsTheme $dsTheme): JsonResponse
    {
        // Design Token Standard (W3C format)
        return response()->json($this->service->exportDesignTokenStandard($dsTheme->id));
    }

    /** Duplicate a theme with all its tokens */
    public function duplicate(DsTheme $dsTheme): JsonResponse
    {
        $newTheme = $dsTheme->replicate();
        $newTheme->name = $dsTheme->name . ' (Copy)';
        $newTheme->slug = $dsTheme->slug . '-copy-' . time();
        $newTheme->is_default = false;
        $newTheme->save();

        foreach ($dsTheme->tokens as $token) {
            $newToken = $token->replicate();
            $newToken->theme_id = $newTheme->id;
            $newToken->save();
        }

        return response()->json($newTheme->load('tokens'), 201);
    }

    /** Seed a full professional token set into the theme */
    public function seedDefaults(DsTheme $dsTheme): JsonResponse
    {
        $seeder = new \Database\Seeders\DesignTokenSeeder();
        $seeder->run($dsTheme->id);
        $this->service->invalidateCache($dsTheme->id);
        return response()->json([
            'message'      => 'Full token set seeded successfully.',
            'tokens_count' => $dsTheme->tokens()->count(),
        ]);
    }
}
