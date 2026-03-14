<?php

namespace App\Http\Controllers\Admin\DesignSystem;

use App\Http\Controllers\Controller;
use App\Models\DesignSystem\DsComponent;
use App\Models\DesignSystem\DsComponentVariant;
use App\Services\DesignSystem\DesignTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DsComponentController extends Controller
{
    public function __construct(private DesignTokenService $service) {}

    // ── Components ─────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        return response()->json(DsComponent::withCount('variants')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'slug'        => 'required|string|max:100|unique:ds_components',
            'type'        => 'required|in:button,input,card,modal,badge,alert,tab,dropdown,tooltip',
            'description' => 'nullable|string',
            'base_props'  => 'nullable|array',
        ]);

        return response()->json(DsComponent::create($data), 201);
    }

    public function show(DsComponent $dsComponent): JsonResponse
    {
        return response()->json($dsComponent->load('variants'));
    }

    public function update(Request $request, DsComponent $dsComponent): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'type'        => 'sometimes|in:button,input,card,modal,badge,alert,tab,dropdown,tooltip',
            'description' => 'nullable|string',
            'base_props'  => 'nullable|array',
        ]);

        $dsComponent->update($data);
        return response()->json($dsComponent);
    }

    public function destroy(DsComponent $dsComponent): JsonResponse
    {
        $dsComponent->delete();
        return response()->json(null, 204);
    }

    // ── Variants ───────────────────────────────────────────────────

    public function storeVariant(Request $request, DsComponent $dsComponent): JsonResponse
    {
        $data = $request->validate([
            'variant_name'   => 'required|string|max:50',
            'style_modifier' => 'nullable|in:outline,soft,ghost,gradient,rounded,outline-rounded,soft-rounded,ghost-rounded,gradient-rounded',
            'size'           => 'nullable|in:sm,md,lg',
            'token_mapping'  => 'required|array',
            'static_classes' => 'nullable|array',
            'description'    => 'nullable|string',
            'is_active'      => 'boolean',
        ]);

        $variant = $dsComponent->variants()->create($data);
        return response()->json($variant, 201);
    }

    public function updateVariant(Request $request, DsComponent $dsComponent, DsComponentVariant $variant): JsonResponse
    {
        $data = $request->validate([
            'variant_name'   => 'sometimes|string|max:50',
            'style_modifier' => 'nullable|string',
            'size'           => 'nullable|in:sm,md,lg',
            'token_mapping'  => 'sometimes|array',
            'static_classes' => 'nullable|array',
            'description'    => 'nullable|string',
            'is_active'      => 'boolean',
        ]);

        $variant->update($data);
        return response()->json($variant);
    }

    public function destroyVariant(DsComponent $dsComponent, DsComponentVariant $variant): JsonResponse
    {
        $variant->delete();
        return response()->json(null, 204);
    }

    // ── Token resolution endpoint ──────────────────────────────────

    /**
     * GET /api/admin/design-system/components/{slug}/resolve
     * ?theme_id=1&variant=primary&modifier=outline&size=lg
     *
     * Returns resolved CSS styles for a specific variant combo.
     * This is what the React component calls to get live styles.
     */
    public function resolve(Request $request, string $slug): JsonResponse
    {
        $themeId  = $request->integer('theme_id') ?: null;
        $resolved = $this->service->resolveAllVariants($slug, $themeId ?? $this->service->getDefaultTheme()->id);
        return response()->json($resolved);
    }
}
