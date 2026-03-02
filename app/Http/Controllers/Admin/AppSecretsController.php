<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSecret;
use App\Services\AppSecretService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppSecretsController extends Controller
{
    /**
     * List all secrets (with masked values).
     */
    public function index(): JsonResponse
    {
        $secrets = AppSecret::orderBy('group')
            ->orderBy('key')
            ->get()
            ->map(fn (AppSecret $s) => $this->formatSecret($s));

        return response()->json($secrets);
    }

    /**
     * Create a new secret.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'key'         => 'required|string|max:255|unique:app_secrets,key|regex:/^[A-Z0-9_]+$/',
            'value'       => 'nullable|string',
            'group'       => 'nullable|string|max:100',
            'label'       => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'is_active'   => 'boolean',
        ]);

        $secret = AppSecret::create($validated);
        AppSecretService::clearCache($secret->key);

        return response()->json($this->formatSecret($secret), 201);
    }

    /**
     * Update an existing secret.
     */
    public function update(Request $request, AppSecret $appSecret): JsonResponse
    {
        $validated = $request->validate([
            'value'       => 'nullable|string',
            'group'       => 'nullable|string|max:100',
            'label'       => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'is_active'   => 'boolean',
        ]);

        // Empty string value means "clear the secret"
        if (array_key_exists('value', $validated) && $validated['value'] === '') {
            $validated['value'] = null;
        }

        $appSecret->update($validated);
        AppSecretService::clearCache($appSecret->key);

        return response()->json($this->formatSecret($appSecret->fresh()));
    }

    /**
     * Delete a secret.
     */
    public function destroy(AppSecret $appSecret): JsonResponse
    {
        AppSecretService::clearCache($appSecret->key);
        $appSecret->delete();

        return response()->json(null, 204);
    }

    /**
     * Reveal (return) the plain-text value — for copy to clipboard.
     */
    public function reveal(AppSecret $appSecret): JsonResponse
    {
        return response()->json(['value' => $appSecret->getPlainValue()]);
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function formatSecret(AppSecret $s): array
    {
        return [
            'id'           => $s->id,
            'key'          => $s->key,
            'label'        => $s->label,
            'group'        => $s->group,
            'description'  => $s->description,
            'is_active'    => $s->is_active,
            'masked_value' => $s->getMaskedValue(),
            'has_value'    => $s->getPlainValue() !== null,
            'created_at'   => $s->created_at?->toDateTimeString(),
            'updated_at'   => $s->updated_at?->toDateTimeString(),
        ];
    }
}
