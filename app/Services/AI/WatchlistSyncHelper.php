<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WatchlistSyncHelper
{
    private array $config;
    private string $apiUrl;
    private string $token;

    public function __construct(array $config)
    {
        $this->config = $config;
        $url = rtrim($config['api_url'] ?? config('app.url'), '/');

        // Normalize to end with /api/v1 (matches legacy helper behavior)
        if (!preg_match('/\/api\/v1\/?$/', $url)) {
            if (preg_match('/\/api\/?$/', $url)) {
                $url = rtrim($url, '/') . '/v1';
            } else {
                $url = rtrim($url, '/') . '/api/v1';
            }
        }

        $this->apiUrl = rtrim($url, '/');
        $this->token = $config['token'] ?? '';
    }

    /**
     * Internal helper to make requests with automatic protocol fallback.
     */
    private function makeRequest(string $method, string $path, array $data = [], bool $asForm = false)
    {
        $url = $this->apiUrl . '/' . ltrim($path, '/');
        $isHttps = str_starts_with($url, 'https://');

        $request = function ($targetUrl) use ($method, $data, $asForm) {
            $pending = Http::withToken($this->token)
                ->withoutVerifying()
                ->withOptions([
                    'version' => 1.1,
                    'curl' => [CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1],
                ])
                ->timeout(30)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0',
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ]);

            if ($asForm) {
                $pending = $pending->asForm();
            } elseif (in_array(strtoupper($method), ['POST', 'PUT', 'PATCH']) && ! empty($data)) {
                $pending = $pending->asJson();
            }

            return $pending->{strtolower($method)}($targetUrl, $data);
        };

        // Attempt 1: Standard URL
        $response = $request($url);

        if ($isHttps && ! $response->successful() && in_array($response->status(), [500, 406])) {
            $fallbackUrl = str_replace('https://', 'http://', $url);
            Log::warning("Watchlist Request failed with {$response->status()} over HTTPS. Retrying over plain HTTP fallback.", ['url' => $fallbackUrl]);
            $response = $request($fallbackUrl);
        }

        // Detect HTML responses (frontend HTML instead of JSON)
        $contentType = $response->header('Content-Type', '');
        $body = (string) $response->body();
        $isHtml = str_contains($contentType, 'text/html')
            || (strlen($body) > 0 && (str_starts_with(trim($body), '<!DOCTYPE') || str_starts_with(trim($body), '<html')));

        if ($isHtml && $response->successful()) {
            Log::error("Watchlist API returned HTML instead of JSON - route may not be matching or middleware redirecting", [
                'method' => $method,
                'url' => $url,
                'status' => $response->status(),
                'content_type' => $contentType,
                'body_preview' => substr($body, 0, 300),
            ]);
        }

        if (! $response->successful()) {
            Log::error("Watchlist API Request Error", [
                'method' => $method,
                'url' => $url,
                'status' => $response->status(),
                'content_type' => $contentType,
                'body' => $isHtml ? substr($body, 0, 500) : $body,
            ]);
        }

        return $response;
    }

    /**
     * Update title with missing data if needed.
     */
    private function updateTitleIfNeeded(int $titleId, array $payload): void
    {
        try {
            $updateData = [];

            if (! empty($payload['poster'] ?? null)) {
                $updateData['poster'] = $payload['poster'];
            }

            if (! empty($payload['description'] ?? null)) {
                $updateData['description'] = $payload['description'];
            }

            if (! empty($updateData)) {
                $updateResponse = $this->makeRequest('PUT', "titles/{$titleId}", $updateData);
                if ($updateResponse->successful()) {
                    Log::info("Updated existing title with missing data", [
                        'title_id' => $titleId,
                        'updated_fields' => array_keys($updateData),
                    ]);
                } else {
                    Log::warning("Failed to update title", [
                        'title_id' => $titleId,
                        'status' => $updateResponse->status(),
                        'response' => substr((string) $updateResponse->body(), 0, 500),
                    ]);
                }
            }
        } catch (\Throwable $e) {
            Log::warning("Error updating title: " . $e->getMessage());
        }
    }

    /**
     * Create or fetch a title for the playlist.
     */
    public function createOrGetTitle(array $payload): ?int
    {
        try {
            // Strategy 1: Public search (no token)
            Log::info("Watchlist Search Strategy 1: Public (No Token)");
            $searchResponse = Http::withoutVerifying()
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0',
                    'Accept' => 'application/json',
                ])
                ->get("{$this->apiUrl}/titles/search", ['query' => $payload['name']]);

            if ($searchResponse->successful()) {
                $data = $searchResponse->json();
                foreach ($data['pagination']['data'] ?? [] as $title) {
                    if (trim(strtolower($title['name'] ?? '')) === trim(strtolower($payload['name']))) {
                        $titleId = $title['id'] ?? null;
                        if ($titleId) {
                            $this->updateTitleIfNeeded($titleId, $payload);
                            return $titleId;
                        }
                    }
                }
            }

            // Strategy 2: Authenticated search
            Log::info("Watchlist Search Strategy 2: Authenticated");
            $response = $this->makeRequest('GET', 'titles/search', ['query' => $payload['name']]);
            if ($response->successful()) {
                $data = $response->json();
                foreach ($data['pagination']['data'] ?? [] as $title) {
                    if (trim(strtolower($title['name'] ?? '')) === trim(strtolower($payload['name']))) {
                        $titleId = $title['id'] ?? null;
                        if ($titleId) {
                            $this->updateTitleIfNeeded($titleId, $payload);
                            return $titleId;
                        }
                    }
                }
            }

            // Strategy 3: Create title
            Log::info("Creating new Watchlist title for '{$payload['name']}'", ['payload' => $payload]);
            $response = $this->makeRequest('POST', 'titles', $payload);

            // Strategy 4: Minimal payload fallback
            if (! $response->successful() && $response->status() === 500) {
                Log::warning("Full payload failed with 500. Retrying with minimal mandatory fields.");
                $minimalPayload = [
                    'name' => $payload['name'],
                    'is_series' => $payload['is_series'] ?? true,
                ];
                $response = $this->makeRequest('POST', 'titles', $minimalPayload);
            }

            if ($response->successful()) {
                $data = $response->json();
                return $data['title']['id'] ?? $data['id'] ?? null;
            }

            if ($response->status() === 500) {
                Log::error("CRITICAL: Watchlist API still returns 500 even after HTTP fallback. Server misconfigured.");
            }

            return null;
        } catch (\Throwable $e) {
            Log::error("WatchlistSyncHelper Error (createOrGetTitle): " . $e->getMessage());
            return null;
        }
    }

    /**
     * Create or update episodes for a title (series).
     */
    public function createEpisodes(int $titleId, array $episodes): array
    {
        $episodeIds = [];
        $seasonNumber = 1;

        // Fetch existing episodes to avoid duplicates
        $existingEpisodes = [];
        try {
            $getResponse = $this->makeRequest('GET', "titles/{$titleId}/seasons/{$seasonNumber}/episodes");
            if ($getResponse->successful()) {
                $episodesData = $getResponse->json();
                $episodesList = $episodesData['pagination']['data']
                    ?? $episodesData['data']
                    ?? $episodesData['episodes']
                    ?? [];
                foreach ($episodesList as $ep) {
                    $epNum = is_array($ep) ? ($ep['episode_number'] ?? null) : ($ep->episode_number ?? null);
                    if ($epNum) {
                        $epId = is_array($ep) ? ($ep['id'] ?? null) : ($ep->id ?? null);
                        if ($epId) {
                            $existingEpisodes[$epNum] = $epId;
                        }
                    }
                }
                Log::info("Found existing episodes", ['count' => count($existingEpisodes), 'episode_numbers' => array_keys($existingEpisodes)]);
            }
        } catch (\Throwable $e) {
            Log::warning("Failed to fetch existing episodes, will try to create anyway", ['error' => $e->getMessage()]);
        }

        foreach ($episodes as $episodePayload) {
            try {
                if (! isset($episodePayload['episode_number'])) {
                    continue;
                }

                $epNum = $episodePayload['episode_number'];

                // Already exists → update minimal data if needed
                if (isset($existingEpisodes[$epNum])) {
                    $existingEpisodeId = $existingEpisodes[$epNum];
                    $episodeIds[] = $existingEpisodeId;

                    $updateData = [];
                    foreach (['description', 'poster', 'name', 'release_date'] as $field) {
                        if (! empty($episodePayload[$field] ?? null)) {
                            $updateData[$field] = $episodePayload[$field];
                        }
                    }

                    if (! empty($updateData)) {
                        try {
                            $updateResponse = $this->makeRequest('PUT', "titles/{$titleId}/seasons/{$seasonNumber}/episodes/{$epNum}", $updateData);
                            if ($updateResponse->successful()) {
                                Log::info("Updated existing episode {$epNum} with missing data", [
                                    'id' => $existingEpisodeId,
                                    'updated_fields' => array_keys($updateData),
                                ]);
                            } else {
                                Log::warning("Failed to update episode {$epNum}", [
                                    'status' => $updateResponse->status(),
                                    'response' => $updateResponse->body(),
                                ]);
                            }
                        } catch (\Throwable $e) {
                            Log::warning("Error updating episode {$epNum}: " . $e->getMessage());
                        }
                    }

                    continue;
                }

                // Create episode
                $response = $this->makeRequest('POST', "titles/{$titleId}/seasons/{$seasonNumber}/episodes", $episodePayload);
                if ($response->successful()) {
                    $data = $response->json();
                    $id = $data['episode']['id'] ?? $data['id'] ?? null;
                    if ($id) {
                        $episodeIds[] = $id;
                        Log::info("Successfully created episode {$epNum}", ['id' => $id]);
                    }
                } elseif ($response->status() === 422) {
                    $errorData = $response->json();
                    if (isset($errorData['errors']['episode_number'])
                        && str_contains($errorData['errors']['episode_number'][0] ?? '', 'already been taken')) {
                        // Race condition: fetch existing again
                        Log::info("Episode {$epNum} already exists (race), fetching existing episode");
                        $getResponse = $this->makeRequest('GET', "titles/{$titleId}/seasons/{$seasonNumber}/episodes");
                        if ($getResponse->successful()) {
                            $episodesData = $getResponse->json();
                            $episodesList = $episodesData['pagination']['data']
                                ?? $episodesData['data']
                                ?? $episodesData['episodes']
                                ?? [];
                            foreach ($episodesList as $ep) {
                                $existingEpNum = is_array($ep) ? ($ep['episode_number'] ?? null) : ($ep->episode_number ?? null);
                                if ($existingEpNum == $epNum) {
                                    $epId = is_array($ep) ? ($ep['id'] ?? null) : ($ep->id ?? null);
                                    if ($epId) {
                                        $episodeIds[] = $epId;
                                        $existingEpisodes[$epNum] = $epId;
                                        Log::info("Found existing episode {$epNum}", ['id' => $epId]);
                                    }
                                    break;
                                }
                            }
                        }
                    } else {
                        Log::warning("Failed to create episode {$epNum}", [
                            'status' => $response->status(),
                            'errors' => $errorData['errors'] ?? null,
                            'response' => $response->body(),
                        ]);
                    }
                } else {
                    Log::warning("Failed to create episode {$epNum}", [
                        'status' => $response->status(),
                        'response' => $response->body(),
                    ]);
                }
            } catch (\Throwable $e) {
                Log::error("WatchlistSyncHelper Error (createEpisodes): " . $e->getMessage());
            }
        }

        return $episodeIds;
    }

    /**
     * Find the Watchlist list ID, creating it if necessary.
     */
    private function findWatchlistIdOrCreate(): ?int
    {
        // Try /user-profile/me/lists
        $listId = $this->findWatchlistId(false);
        if ($listId) {
            return $listId;
        }

        // Try /lists endpoint
        $listId = $this->findWatchlistId(true);
        if ($listId) {
            return $listId;
        }

        // Create Watchlist list
        Log::info("No 'Watchlist' found for user. Creating one...");
        $createList = $this->makeRequest('POST', 'lists', [
            'name' => 'Watchlist',
            'type' => 'list',
            'public' => false,
            'internal' => false,
            'config' => [
                'contentType' => 'manual',
                'contentOrder' => 'channelables.order:asc',
                'contentModel' => 'title',
                'layout' => 'grid',
                'preventDeletion' => true,
            ],
        ]);

        if (! $createList->successful()) {
            Log::warning("Failed to create Watchlist", [
                'status' => $createList->status(),
                'response' => $createList->body(),
            ]);

            return null;
        }

        $resData = $createList->json();
        $listId = $resData['channel']['id']
            ?? $resData['data']['channel']['id']
            ?? $resData['data']['id']
            ?? $resData['list']['id']
            ?? $resData['id']
            ?? null;

        if (! $listId) {
            Log::warning("Watchlist created but ID not found in response", ['response' => $resData]);
        } else {
            Log::info("Successfully created new Watchlist", ['id' => $listId]);
        }

        return $listId;
    }

    /**
     * Helper used by findWatchlistIdOrCreate.
     */
    private function findWatchlistId(bool $useListsEndpoint = false): ?int
    {
        $endpoint = $useListsEndpoint ? 'lists' : 'user-profile/me/lists';
        $response = $this->makeRequest('GET', $endpoint);

        if ($response->successful()) {
            $data = $response->json();
            $lists = $data['pagination']['data'] ?? $data['data'] ?? [];
            foreach ($lists as $list) {
                $listName = trim(strtolower($list['name'] ?? ''));
                if ($listName === 'watchlist') {
                    $listId = $list['id'] ?? null;
                    if ($listId) {
                        Log::info("Found existing Watchlist", ['id' => $listId, 'endpoint' => $endpoint]);
                        return $listId;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Add items to the Watchlist (default 'Watchlist' list).
     */
    public function addToWatchlist(int $titleId, array $episodeIds = []): bool
    {
        try {
            $listId = $this->findWatchlistIdOrCreate();
            if (! $listId) {
                Log::warning("Could not find or create a 'Watchlist' for this user.");
                return false;
            }

            $responseTitle = $this->makeRequest('POST', "lists/{$listId}/add", [
                'itemId' => $titleId,
                'itemType' => 'title',
            ]);

            if ($responseTitle->successful()) {
                Log::info("Successfully added title to watchlist", [
                    'title_id' => $titleId,
                    'list_id' => $listId,
                    'episodes_count' => count($episodeIds),
                ]);
            } else {
                Log::warning("Failed to add title to watchlist", [
                    'title_id' => $titleId,
                    'list_id' => $listId,
                    'status' => $responseTitle->status(),
                    'response' => $responseTitle->body(),
                ]);
            }

            return $responseTitle->successful();
        } catch (\Throwable $e) {
            Log::error("WatchlistSyncHelper Error (addToWatchlist): " . $e->getMessage());
            return false;
        }
    }
}

