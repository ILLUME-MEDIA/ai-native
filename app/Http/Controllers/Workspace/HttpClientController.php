<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\ConnectionException;

class HttpClientController extends Controller
{
    use AuthorizesRequests;

    // ─── Collections ──────────────────────────────────────────────────────────

    public function collectionsIndex(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $collections = DB::table('http_request_collections')
            ->where('workspace_id', $workspace->id)
            ->orderBy('name')
            ->get();

        $requests = DB::table('http_saved_requests')
            ->whereIn('collection_id', $collections->pluck('id'))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $grouped = $collections->map(function ($c) use ($requests) {
            $c->requests = $requests->where('collection_id', $c->id)->values();
            return $c;
        });

        return response()->json(['collections' => $grouped]);
    }

    public function collectionsStore(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $data = $request->validate([
            'name'  => 'required|string|max:100',
            'color' => 'nullable|string|max:7',
        ]);

        $id = DB::table('http_request_collections')->insertGetId([
            'workspace_id' => $workspace->id,
            'name'         => $data['name'],
            'color'        => $data['color'] ?? '#ff6b35',
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        return response()->json(['collection' => DB::table('http_request_collections')->find($id)], 201);
    }

    public function collectionsUpdate(Request $request, Workspace $workspace, int $collection)
    {
        $this->authorize('update', $workspace);
        $this->assertCollectionBelongsToWorkspace($collection, $workspace->id);

        $data = $request->validate([
            'name'  => 'sometimes|string|max:100',
            'color' => 'nullable|string|max:7',
        ]);

        DB::table('http_request_collections')->where('id', $collection)->update(array_merge($data, ['updated_at' => now()]));

        return response()->json(['collection' => DB::table('http_request_collections')->find($collection)]);
    }

    public function collectionsDestroy(Workspace $workspace, int $collection)
    {
        $this->authorize('update', $workspace);
        $this->assertCollectionBelongsToWorkspace($collection, $workspace->id);

        DB::table('http_request_collections')->where('id', $collection)->delete();

        return response()->json(null, 204);
    }

    // ─── Saved Requests ───────────────────────────────────────────────────────

    public function requestsStore(Request $request, Workspace $workspace, int $collection)
    {
        $this->authorize('update', $workspace);
        $this->assertCollectionBelongsToWorkspace($collection, $workspace->id);

        $data = $request->validate([
            'name'      => 'required|string|max:200',
            'method'    => 'required|string|in:GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
            'url'       => 'required|string|max:2000',
            'headers'   => 'nullable|array',
            'params'    => 'nullable|array',
            'body'      => 'nullable|string',
            'body_type' => 'nullable|string|in:none,json,form,raw',
            'auth_type' => 'nullable|string|in:none,bearer,basic,apikey',
            'auth_data' => 'nullable|array',
        ]);

        $id = DB::table('http_saved_requests')->insertGetId([
            'collection_id' => $collection,
            'name'          => $data['name'],
            'method'        => strtoupper($data['method']),
            'url'           => $data['url'],
            'headers'       => json_encode($data['headers'] ?? []),
            'params'        => json_encode($data['params'] ?? []),
            'body'          => $data['body'] ?? null,
            'body_type'     => $data['body_type'] ?? 'none',
            'auth_type'     => $data['auth_type'] ?? 'none',
            'auth_data'     => json_encode($data['auth_data'] ?? []),
            'sort_order'    => 0,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        return response()->json(['request' => DB::table('http_saved_requests')->find($id)], 201);
    }

    public function requestsUpdate(Request $request, Workspace $workspace, int $collection, int $savedRequest)
    {
        $this->authorize('update', $workspace);
        $this->assertCollectionBelongsToWorkspace($collection, $workspace->id);

        $data = $request->validate([
            'name'      => 'sometimes|string|max:200',
            'method'    => 'sometimes|string|in:GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
            'url'       => 'sometimes|string|max:2000',
            'headers'   => 'nullable|array',
            'params'    => 'nullable|array',
            'body'      => 'nullable|string',
            'body_type' => 'nullable|string|in:none,json,form,raw',
            'auth_type' => 'nullable|string|in:none,bearer,basic,apikey',
            'auth_data' => 'nullable|array',
        ]);

        $update = array_filter($data, fn ($v) => $v !== null);
        foreach (['headers', 'params', 'auth_data'] as $key) {
            if (isset($update[$key])) {
                $update[$key] = json_encode($update[$key]);
            }
        }
        $update['updated_at'] = now();

        DB::table('http_saved_requests')->where('id', $savedRequest)->where('collection_id', $collection)->update($update);

        return response()->json(['request' => DB::table('http_saved_requests')->find($savedRequest)]);
    }

    public function requestsDestroy(Workspace $workspace, int $collection, int $savedRequest)
    {
        $this->authorize('update', $workspace);
        $this->assertCollectionBelongsToWorkspace($collection, $workspace->id);

        DB::table('http_saved_requests')->where('id', $savedRequest)->where('collection_id', $collection)->delete();

        return response()->json(null, 204);
    }

    // ─── Send ─────────────────────────────────────────────────────────────────

    /**
     * B-01: Proxy an HTTP request and return the full response.
     *
     * Body: { method, url, headers, params, body, body_type, auth_type, auth_data }
     */
    public function send(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $data = $request->validate([
            'method'    => 'required|string|in:GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
            'url'       => 'required|string|url|max:2000',
            'headers'   => 'nullable|array',
            'params'    => 'nullable|array',
            'body'      => 'nullable|string',
            'body_type' => 'nullable|string|in:none,json,form,raw',
            'auth_type' => 'nullable|string|in:none,bearer,basic,apikey',
            'auth_data' => 'nullable|array',
        ]);

        $method    = strtolower($data['method']);
        $url       = $data['url'];
        $headers   = $data['headers'] ?? [];
        $params    = $data['params'] ?? [];
        $bodyType  = $data['body_type'] ?? 'none';
        $authType  = $data['auth_type'] ?? 'none';
        $authData  = $data['auth_data'] ?? [];

        $pending = Http::withHeaders($headers)
            ->timeout(30)
            ->withoutVerifying(); // allow self-signed certs in dev

        // Apply auth
        $pending = match ($authType) {
            'bearer' => $pending->withToken($authData['token'] ?? ''),
            'basic'  => $pending->withBasicAuth($authData['username'] ?? '', $authData['password'] ?? ''),
            'apikey' => $pending->withHeaders([$authData['key'] ?? 'X-API-Key' => $authData['value'] ?? '']),
            default  => $pending,
        };

        // Append query params
        if (!empty($params)) {
            $url .= (str_contains($url, '?') ? '&' : '?') . http_build_query($params);
        }

        $startMs = (int) round(microtime(true) * 1000);

        try {
            $response = match ($bodyType) {
                'json' => $pending->$method($url, json_decode($data['body'] ?? '{}', true) ?? []),
                'form' => $pending->asForm()->$method($url, $this->parseKvPairs($data['body'] ?? '')),
                default => $pending->withBody($data['body'] ?? '', 'text/plain')->$method($url),
            };
        } catch (ConnectionException $e) {
            return response()->json(['error' => 'Connection failed: ' . $e->getMessage()], 422);
        }

        $elapsedMs = (int) round(microtime(true) * 1000) - $startMs;

        $resHeaders = [];
        foreach ($response->headers() as $k => $v) {
            $resHeaders[$k] = is_array($v) ? implode(', ', $v) : $v;
        }

        $body = $response->body();
        $isJson = str_contains($resHeaders['Content-Type'] ?? '', 'json');

        return response()->json([
            'status'      => $response->status(),
            'status_text' => $this->statusText($response->status()),
            'headers'     => $resHeaders,
            'body'        => $body,
            'is_json'     => $isJson,
            'size'        => strlen($body),
            'elapsed_ms'  => $elapsedMs,
        ]);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function assertCollectionBelongsToWorkspace(int $collectionId, int $workspaceId): void
    {
        $exists = DB::table('http_request_collections')
            ->where('id', $collectionId)
            ->where('workspace_id', $workspaceId)
            ->exists();

        abort_unless($exists, 404, 'Collection not found');
    }

    private function parseKvPairs(string $raw): array
    {
        $result = [];
        foreach (explode("\n", $raw) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            [$k, $v] = array_pad(explode('=', $line, 2), 2, '');
            if ($k !== '') {
                $result[trim($k)] = trim($v);
            }
        }
        return $result;
    }

    private function statusText(int $code): string
    {
        return match ($code) {
            200 => 'OK', 201 => 'Created', 204 => 'No Content',
            301 => 'Moved Permanently', 302 => 'Found',
            400 => 'Bad Request', 401 => 'Unauthorized', 403 => 'Forbidden',
            404 => 'Not Found', 405 => 'Method Not Allowed', 422 => 'Unprocessable Entity',
            429 => 'Too Many Requests', 500 => 'Internal Server Error',
            502 => 'Bad Gateway', 503 => 'Service Unavailable',
            default => '',
        };
    }
}
