<?php

namespace App\Http\Controllers\Admin\Cal;

use App\Http\Controllers\Controller;
use App\Models\CalPlatform;
use App\Services\CalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CalPlatformsController extends Controller
{
    public function index(): JsonResponse
    {
        $platforms = CalPlatform::orderBy('name')->get()->map(fn ($p) => $this->format($p));
        return response()->json($platforms);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'            => 'required|string|max:255',
            'slug'            => 'nullable|string|max:100|unique:cal_platforms,slug|regex:/^[a-z0-9-]+$/',
            'api_key'         => 'nullable|string',
            'base_url'        => 'nullable|url|max:255',
            'webhook_secret'  => 'nullable|string',
            'color'           => 'nullable|string|max:20',
            'settings'        => 'nullable|array',
            'is_active'       => 'boolean',
            'users_entity_id' => 'nullable|exists:section_entities,id',
        ]);

        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $platform = CalPlatform::create($data);

        return response()->json($this->format($platform), 201);
    }

    public function update(Request $request, CalPlatform $calPlatform): JsonResponse
    {
        $data = $request->validate([
            'name'            => 'sometimes|string|max:255',
            'api_key'         => 'nullable|string',
            'base_url'        => 'nullable|url|max:255',
            'webhook_secret'  => 'nullable|string',
            'color'           => 'nullable|string|max:20',
            'settings'        => 'nullable|array',
            'is_active'       => 'boolean',
            'users_entity_id' => 'nullable|exists:section_entities,id',
        ]);

        foreach (['api_key', 'webhook_secret'] as $field) {
            if (array_key_exists($field, $data) && $data[$field] === '') {
                $data[$field] = null;
            }
        }

        $calPlatform->update($data);

        return response()->json($this->format($calPlatform->fresh()));
    }

    public function destroy(CalPlatform $calPlatform): JsonResponse
    {
        $calPlatform->delete();
        return response()->json(null, 204);
    }

    public function revealApiKey(CalPlatform $calPlatform): JsonResponse
    {
        return response()->json(['api_key' => $calPlatform->getPlainApiKey()]);
    }

    public function sync(CalPlatform $calPlatform): JsonResponse
    {
        $service = new CalService($calPlatform);
        $result  = $service->syncBookings();

        if (isset($result['error'])) {
            return response()->json([
                'message'    => 'Cal.com API error',
                'detail'     => $result['error'],
                'http_status'=> $result['status'] ?? null,
                'base_url'   => $calPlatform->base_url,
            ], 422);
        }

        return response()->json($result);
    }

    public function testConnection(CalPlatform $calPlatform): JsonResponse
    {
        $service = new CalService($calPlatform);
        $result  = $service->getEventTypes();

        if (isset($result['error'])) {
            return response()->json(['ok' => false, 'message' => $result['error']], 422);
        }

        return response()->json(['ok' => true, 'event_types' => $result]);
    }

    private function format(CalPlatform $p): array
    {
        return [
            'id'                    => $p->id,
            'name'                  => $p->name,
            'slug'                  => $p->slug,
            'api_key_masked'        => $p->getMaskedApiKey(),
            'webhook_secret_masked' => $p->getMaskedWebhookSecret(),
            'webhook_url'           => $p->getWebhookUrl(),
            'base_url'              => $p->base_url,
            'color'                 => $p->color,
            'settings'              => $p->settings,
            'is_active'             => $p->is_active,
            'users_entity_id'       => $p->users_entity_id,
            'users_table'           => $p->getUsersTable(),
            'meetings_count'        => $p->meetings()->count(),
            'created_at'            => $p->created_at,
        ];
    }
}
