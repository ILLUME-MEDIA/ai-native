<?php

namespace App\Http\Controllers\Admin\DesignSystem;

use App\Http\Controllers\Controller;
use App\Models\DesignSystem\DsSite;
use App\Models\DesignSystem\DsTheme;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DsSitesController extends Controller
{
    public function index(): JsonResponse
    {
        $sites = DsSite::with('theme:id,name,slug')
            ->orderBy('name')
            ->get()
            ->map(fn($s) => $this->format($s));

        return response()->json($sites);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'slug'        => 'required|string|max:80|unique:ds_sites,slug|regex:/^[a-z0-9-]+$/',
            'domain'      => 'nullable|string|max:255',
            'theme_id'    => 'nullable|exists:ds_themes,id',
            'is_active'   => 'boolean',
            'description' => 'nullable|string|max:500',
        ]);

        $site = DsSite::create($data);

        return response()->json($this->format($site), 201);
    }

    public function show(DsSite $dsSite): JsonResponse
    {
        $dsSite->load('theme:id,name,slug');
        return response()->json($this->format($dsSite));
    }

    public function update(Request $request, DsSite $dsSite): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'slug'        => 'sometimes|string|max:80|unique:ds_sites,slug,' . $dsSite->id . '|regex:/^[a-z0-9-]+$/',
            'domain'      => 'nullable|string|max:255',
            'theme_id'    => 'nullable|exists:ds_themes,id',
            'is_active'   => 'boolean',
            'description' => 'nullable|string|max:500',
        ]);

        $dsSite->update($data);

        return response()->json($this->format($dsSite->fresh('theme')));
    }

    public function destroy(DsSite $dsSite): JsonResponse
    {
        $dsSite->delete();
        return response()->json(['message' => 'Site deleted.']);
    }

    /** Generate / regenerate the API key for a site */
    public function generateKey(DsSite $dsSite): JsonResponse
    {
        $plain = $dsSite->regenerateApiKey();
        return response()->json([
            'api_key'        => $plain,
            'masked_api_key' => $dsSite->getMaskedApiKey(),
        ]);
    }

    /** Reveal the plain-text API key (one-time reveal, like AppSecrets) */
    public function revealKey(DsSite $dsSite): JsonResponse
    {
        return response()->json(['api_key' => $dsSite->getPlainApiKey()]);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private function format(DsSite $site): array
    {
        return [
            'id'             => $site->id,
            'name'           => $site->name,
            'slug'           => $site->slug,
            'domain'         => $site->domain,
            'masked_api_key' => $site->getMaskedApiKey(),
            'has_api_key'    => !empty($site->api_key),
            'theme_id'       => $site->theme_id,
            'theme'          => $site->relationLoaded('theme') ? $site->theme : null,
            'is_active'      => $site->is_active,
            'description'    => $site->description,
            'created_at'     => $site->created_at,
            // API endpoint hints
            'endpoints'      => [
                'tokens' => url("/api/design-tokens/{$site->slug}"),
                'css'    => url("/api/design-tokens/{$site->slug}/css"),
                'theme'  => url("/api/design-tokens/{$site->slug}/theme"),
            ],
        ];
    }
}
