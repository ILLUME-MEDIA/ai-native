<?php

namespace App\Http\Controllers\Admin\DesignSystem;

use App\Http\Controllers\Controller;
use App\Models\DesignSystem\DsToken;
use App\Services\DesignSystem\DesignTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DsTokenController extends Controller
{
    public function __construct(private DesignTokenService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = DsToken::query();

        if ($request->filled('theme_id')) $query->where('theme_id', $request->theme_id);
        if ($request->filled('category'))  $query->where('category', $request->category);
        if ($request->filled('search'))    $query->where('name', 'like', '%' . $request->search . '%');

        return response()->json($query->orderBy('category')->orderBy('sort_order')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'theme_id'    => 'required|exists:ds_themes,id',
            'name'        => 'required|string|max:100',
            'category'    => 'required|in:color,spacing,radius,shadow,font,opacity,border,animation',
            'value'       => 'required|string|max:500',
            'type'        => 'in:static,alias',
            'alias_of'    => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'sort_order'  => 'integer',
        ]);

        $token = DsToken::create($data);
        $this->service->invalidateCache($data['theme_id']);

        return response()->json($token, 201);
    }

    public function update(Request $request, DsToken $dsToken): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'category'    => 'sometimes|in:color,spacing,radius,shadow,font,opacity,border,animation',
            'value'       => 'sometimes|string|max:500',
            'type'        => 'in:static,alias',
            'alias_of'    => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'sort_order'  => 'integer',
        ]);

        $dsToken->update($data);
        $this->service->invalidateCache($dsToken->theme_id);

        return response()->json($dsToken);
    }

    public function destroy(DsToken $dsToken): JsonResponse
    {
        $themeId = $dsToken->theme_id;
        $dsToken->delete();
        $this->service->invalidateCache($themeId);
        return response()->json(null, 204);
    }

    /** Bulk upsert tokens — useful for importing a full token set */
    public function bulkUpsert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'theme_id' => 'required|exists:ds_themes,id',
            'tokens'   => 'required|array',
            'tokens.*.name'     => 'required|string',
            'tokens.*.category' => 'required|string',
            'tokens.*.value'    => 'required|string',
        ]);

        foreach ($data['tokens'] as $t) {
            DsToken::updateOrCreate(
                ['theme_id' => $data['theme_id'], 'name' => $t['name']],
                array_merge($t, ['theme_id' => $data['theme_id']])
            );
        }

        $this->service->invalidateCache($data['theme_id']);

        return response()->json(['message' => 'Tokens synced', 'count' => count($data['tokens'])]);
    }
}
