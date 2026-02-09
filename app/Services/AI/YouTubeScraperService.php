<?php

namespace App\Services\AI;

use App\Models\YoutubePlaylist;
use App\Models\YoutubeVideo;
use App\Services\AI\WatchlistSyncHelper;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;

class YouTubeScraperService
{
    protected ?string $apiKey;
    protected ?string $mistralApiKey;
    protected array $siteConfigs;
    protected \App\Services\AI\AIManager $aiManager;

    public function __construct(\App\Services\AI\AIManager $aiManager, array $config = [])
    {
        $this->aiManager = $aiManager;
        $this->apiKey = $config['api_key'] ?? config('services.youtube.key');
        $this->mistralApiKey = $config['mistral_api_key'] ?? config('services.mistral.key');
        $this->siteConfigs = $config['site_configs'] ?? [];
    }

    /**
     * Fetch playlist data from YouTube (Scraping + API fallback)
     */
    public function fetchPlaylist(string $playlistId, int $maxResults = 100): array
    {
        Log::info("Fetching YouTube playlist: {$playlistId}");

        // Attempt scraping first (to save quota)
        try {
            $data = $this->scrapePlaylistFromPage($playlistId, $maxResults);
            if (!empty($data['videos'])) {
                return $data;
            }
        } catch (\Exception $e) {
            Log::warning("Scraping failed for playlist {$playlistId}: " . $e->getMessage());
        }

        // Fallback to API
        return $this->fetchPlaylistViaApi($playlistId, $maxResults);
    }

    /**
     * Scrape playlist ID from a URL
     */
    public function extractPlaylistId(string $url): ?string
    {
        if (preg_match('/[?&]list=([^#&?]+)/', $url, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Main scraping logic (parses ytInitialData)
     */
    protected function scrapePlaylistFromPage(string $playlistId, int $maxResults = 100): array
    {
        $url = "https://www.youtube.com/playlist?list={$playlistId}";
        $maxRetries = 3;
        $lastError = null;
        $response = null;

        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            try {
                $response = Http::timeout(60)->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept-Language' => 'en-US,en;q=0.9',
                    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Referer' => 'https://www.youtube.com/',
                ])->get($url);

                if ($response->successful())
                    break;
                $lastError = "HTTP " . $response->status();
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
                if ($attempt < $maxRetries)
                    sleep(pow(2, $attempt));
            }
        }

        if (!$response || !$response->successful()) {
            throw new \Exception("YouTube scrape failed after {$maxRetries} attempts. Last error: {$lastError}");
        }

        $html = $response->body();
        $initialData = null;

        // Pattern 1
        if (preg_match('/var ytInitialData = (\{.*?\});/', $html, $matches)) {
            $initialData = json_decode($matches[1], true);
        }
        // Pattern 2
        if (!$initialData && preg_match('/window\["ytInitialData"\]\s*=\s*(\{.*?\});/s', $html, $matches)) {
            $initialData = json_decode($matches[1], true);
        }

        if (!$initialData) {
            throw new \Exception("Could not extract ytInitialData from YouTube page.");
        }

        return $this->parseYtInitialData($initialData, $playlistId);
    }

    protected function parseYtInitialData(array $data, string $playlistId): array
    {
        $results = [
            'playlist_id' => $playlistId,
            'title' => '',
            'description' => '',
            'video_count' => 0,
            'videos' => []
        ];

        try {
            // Extract metadata
            $header = $data['header']['playlistHeaderRenderer'] ?? $data['header']['c4TabbedHeaderRenderer'] ?? null;
            if ($header) {
                $results['title'] = $header['title']['simpleText'] ?? $header['title']['runs'][0]['text'] ?? '';
            }

            $sidebar = $data['sidebar']['playlistSidebarRenderer']['items'] ?? [];
            foreach ($sidebar as $item) {
                if (isset($item['playlistSidebarPrimaryInfoRenderer'])) {
                    $renderer = $item['playlistSidebarPrimaryInfoRenderer'];
                    if (empty($results['title'])) {
                        $results['title'] = $renderer['title']['runs'][0]['text'] ?? '';
                    }
                    $results['video_count'] = (int) ($renderer['stats'][0]['runs'][0]['text'] ?? 0);
                }
            }

            // Extract videos
            $contents = $data['contents']['twoColumnBrowseResultsRenderer']['tabs'][0]['tabRenderer']['content']['sectionListRenderer']['contents'][0]['itemSectionRenderer']['contents'][0]['playlistVideoListRenderer']['contents'] ?? [];

            foreach ($contents as $item) {
                $videoRenderer = $item['playlistVideoRenderer'] ?? null;
                if ($videoRenderer) {
                    $videoId = $videoRenderer['videoId'];
                    $thumbnailAnimatedUrl = $this->extractMovingThumbnailUrl($videoRenderer);
                    $results['videos'][] = [
                        'video_id' => $videoId,
                        'title' => $videoRenderer['title']['runs'][0]['text'] ?? '',
                        'thumbnail_url' => $videoRenderer['thumbnail']['thumbnails'][0]['url'] ?? '',
                        'thumbnail_animated_url' => $thumbnailAnimatedUrl,
                        'channel_name' => $videoRenderer['shortBylineText']['runs'][0]['text'] ?? '',
                        'channel_id' => $videoRenderer['shortBylineText']['runs'][0]['navigationEndpoint']['browseEndpoint']['browseId'] ?? '',
                        'duration' => $videoRenderer['lengthText']['simpleText'] ?? '',
                        'video_url' => "https://www.youtube.com/watch?v=" . $videoId
                    ];
                }
            }
        } catch (\Exception $e) {
            Log::error("Error parsing ytInitialData: " . $e->getMessage());
        }

        return $results;
    }

    /**
     * Extract moving thumbnail URL (animated 3s loop WebP or WebM) from playlistVideoRenderer / videoRenderer.
     * Path: richThumbnail.movingThumbnailRenderer.movingThumbnailDetails.thumbnails[].url
     */
    protected function extractMovingThumbnailUrl(array $renderer): ?string
    {
        $thumbnails = $renderer['richThumbnail']['movingThumbnailRenderer']['movingThumbnailDetails']['thumbnails'] ?? null;
        if (!is_array($thumbnails) || empty($thumbnails)) {
            return null;
        }
        foreach ($thumbnails as $t) {
            $url = $t['url'] ?? null;
            if ($url && is_string($url)) {
                $url = trim($url);
                if (str_starts_with($url, '//')) {
                    $url = 'https:' . $url;
                }
                return $url;
            }
        }
        return null;
    }

    protected function fetchPlaylistViaApi(string $playlistId, int $maxResults = 100): array
    {
        if (empty($this->apiKey)) {
            throw new \Exception("YouTube API Key not configured.");
        }

        $response = Http::get('https://www.googleapis.com/youtube/v3/playlistItems', [
            'part' => 'snippet,contentDetails',
            'maxResults' => min($maxResults, 50),
            'playlistId' => $playlistId,
            'key' => $this->apiKey
        ]);

        if ($response->failed()) {
            throw new \Exception("YouTube API request failed: " . $response->json('error.message'));
        }

        $data = $response->json();
        $videos = [];

        foreach ($data['items'] as $item) {
            $snippet = $item['snippet'];
            $videoId = $snippet['resourceId']['videoId'];
            $videos[] = [
                'video_id' => $videoId,
                'title' => $snippet['title'],
                'description' => $snippet['description'],
                'thumbnail_url' => $snippet['thumbnails']['high']['url'] ?? $snippet['thumbnails']['default']['url'] ?? '',
                'thumbnail_animated_url' => null,
                'channel_name' => $snippet['videoOwnerChannelTitle'] ?? $snippet['channelTitle'] ?? '',
                'channel_id' => $snippet['videoOwnerChannelId'] ?? $snippet['channelId'] ?? '',
                'published_at' => $snippet['publishedAt'],
                'video_url' => "https://www.youtube.com/watch?v=" . $videoId
            ];
        }

        return [
            'playlist_id' => $playlistId,
            'videos' => $videos
        ];
    }

    /**
     * Post to a specific platform (Streaming vs Watchlist)
     */
    public function pushToPlatform(string $playlistId, string|int $platformId, array $options = []): array
    {
        $playlist = YoutubePlaylist::where('playlist_id', $playlistId)->with('videos')->first();
        if (!$playlist) {
            throw new \Exception("Playlist not found in database.");
        }

        $onlyVideoIds = $options['only_video_ids'] ?? null;
        if (!empty($onlyVideoIds)) {
            $playlist->setRelation('videos', $playlist->videos->whereIn('video_id', $onlyVideoIds));
        }

        $platform = \App\Models\AiPlatform::findOrFail($platformId);

        if ($platform->type === 'streaming') {
            return $this->postToStreamingPlatform($playlist, $platform, $options);
        } elseif ($platform->type === 'watchlist') {
            return $this->syncPlaylistToWatchlist($playlist, $platform);
        }

        throw new \Exception("Unsupported platform type: {$platform->type}");
    }

    protected function makePlatformRequest($baseUrl, $token, $method, $path, array $data = [], bool $asForm = false)
    {
        $url = rtrim($baseUrl, '/') . '/' . ltrim($path, '/');
        $isHttps = str_starts_with($url, 'https://');

        $request = function ($targetUrl) use ($method, $data, $asForm, $token) {
            $pending = Http::withToken($token)
                ->withoutVerifying()
                ->timeout(120) // Increased for large playlists
                ->withHeaders([
                    'Accept' => 'application/json',
                ]);

            if ($asForm) {
                $pending = $pending->asForm();
            }

            return $pending->{strtolower($method)}($targetUrl, $data);
        };

        $response = $request($url);

        if ($isHttps && !$response->successful() && in_array($response->status(), [500, 406])) {
            $fallbackUrl = str_replace('https://', 'http://', $url);
            Log::warning("Platform Request failed with {$response->status()} over HTTPS. Retrying over plain HTTP fallback.", ['url' => $fallbackUrl]);
            $response = $request($fallbackUrl);
        }

        return $response;
    }

    /**
     * Extract ID from API response (supports Channel API: artist.id, album.id, and flat id / data.id).
     */
    protected function extractIdFromResponse($response, string $resource = 'id'): ?int
    {
        $json = $response->json();
        if (!$json) {
            return null;
        }
        $candidates = [
            $json[$resource]['id'] ?? null,
            $json['data'][$resource]['id'] ?? null,
            $json['data']['id'] ?? null,
            $json['id'] ?? null,
        ];
        foreach ($candidates as $id) {
            if ($id !== null && $id !== '') {
                return is_numeric($id) ? (int) $id : $id;
            }
        }
        return null;
    }

    protected function postToStreamingPlatform($playlist, $platform, array $options = []): array
    {
        Log::info("Pushing to Streaming Platform: {$platform->name}");

        $baseUrl = rtrim($platform->base_url, '/');
        $token = $platform->api_token;

        try {
            $artistName = trim($playlist->videos[0]->channel_name ?? 'Various Artists');
            if (empty($artistName) || $artistName === 'Various Artists') {
                $artistName = $playlist->videos[0]->channel_name ?? 'Unknown Artist';
            }

            // Step 1: Artist — try Channel API style (by-name) first, then search, then create
            $artistId = null;
            try {
                $byNameUrl = $baseUrl . '/artists/by-name/' . rawurlencode($artistName);
                $byNameRes = Http::withToken($token)->withoutVerifying()->timeout(30)
                    ->withHeaders(['Accept' => 'application/json'])
                    ->get($byNameUrl);
                if ($byNameRes->successful()) {
                    $artistId = $byNameRes->json()['artist']['id'] ?? $byNameRes->json()['id'] ?? $byNameRes->json()['data']['artist']['id'] ?? $byNameRes->json()['data']['id'] ?? null;
                }
            } catch (\Exception $e) {
                // Ignore
            }

            if (!$artistId) {
                try {
                    $searchResponse = $this->makePlatformRequest($baseUrl, $token, 'GET', 'artists/search', ['query' => $artistName]);
                    if ($searchResponse->successful()) {
                        $artistId = $searchResponse->json()['data'][0]['id'] ?? $searchResponse->json()['data'][0]['artist']['id'] ?? null;
                    }
                } catch (\Exception $e) {
                    // Ignore
                }
            }

            if (!$artistId) {
                $artistPayload = ['name' => $artistName];
                $firstVideo = $playlist->videos[0];
                $img = $firstVideo->thumbnail_url ?? null;
                if ($img && filter_var($img, FILTER_VALIDATE_URL)) {
                    $artistPayload['image_small'] = $img;
                }
                $artistResponse = $this->makePlatformRequest($baseUrl, $token, 'POST', 'artists', $artistPayload);
                $artistId = $artistResponse->json()['artist']['id'] ?? $artistResponse->json()['id'] ?? $artistResponse->json()['data']['id'] ?? $artistResponse->json()['data']['artist']['id'] ?? null;
            }

            if (!$artistId) {
                throw new \Exception("Failed to create/get artist.");
            }

            // Step 2: Album — full payload for Channel API (image, release_date, genres, tags)
            $albumImage = $playlist->videos[0]->thumbnail_url ?? null;
            if (!$albumImage) {
                $albumImage = 'https://i.ytimg.com/vi/' . ($playlist->videos[0]->video_id ?? '') . '/hqdefault.jpg';
            }
            $albumPayload = [
                'name' => $playlist->title,
                'image' => $albumImage,
                'release_date' => date('Y-m-d'),
                'description' => $playlist->description ?? '',
                'artists' => [$artistId],
                'genres' => [],
                'tags' => [],
            ];
            // Add playlist-level tags/genres if we have them from first video
            $first = $playlist->videos[0];
            if (!empty($first->genres)) {
                $albumPayload['genres'] = is_array($first->genres) ? $first->genres : [];
            }
            if (!empty($first->tags)) {
                $albumPayload['tags'] = is_array($first->tags) ? array_slice($first->tags, 0, 10) : [];
            }

            $existingAlbumId = $options['existing_album_id'] ?? null;
            if ($existingAlbumId) {
                $albumId = $existingAlbumId;
            } else {
                $albumResponse = $this->makePlatformRequest($baseUrl, $token, 'POST', 'albums', $albumPayload);
                $albumId = $albumResponse->json()['album']['id'] ?? $albumResponse->json()['id'] ?? $albumResponse->json()['data']['id'] ?? $albumResponse->json()['data']['album']['id'] ?? null;

                if (!$albumId) {
                    try {
                        $searchResponse = $this->makePlatformRequest($baseUrl, $token, 'GET', 'albums/search', ['query' => $playlist->title]);
                        $albumId = $searchResponse->json()['data'][0]['id'] ?? $searchResponse->json()['data'][0]['album']['id'] ?? null;
                    } catch (\Exception $e) {
                        // Ignore
                    }
                }

                if (!$albumId) {
                    throw new \Exception("Failed to create album. Response: " . substr($albumResponse->body(), 0, 200));
                }
            }

            // Step 3: Tracks — full payload (image, release_date, description, duration in ms)
            $results = ['success' => 0, 'failed' => 0];
            foreach ($playlist->videos as $video) {
                $durationMs = $this->convertDurationToMs($video->duration ?? 'PT0S');
                if ($durationMs < 1000) {
                    $durationMs = 60000;
                }
                $trackImage = $video->thumbnail_url ?? null;
                if (!$trackImage) {
                    $trackImage = 'https://i.ytimg.com/vi/' . $video->video_id . '/hqdefault.jpg';
                }
                $trackPayload = [
                    'name' => $video->title ?? 'YouTube Video',
                    'release_date' => date('Y-m-d'),
                    'image' => $trackImage,
                    'duration' => $durationMs,
                    'description' => $video->description ?? '',
                    'artists' => [$artistId],
                    'album_id' => $albumId,
                ];
                $trackRes = $this->makePlatformRequest($baseUrl, $token, 'POST', 'tracks', $trackPayload);

                if ($trackRes->successful()) {
                    $results['success']++;
                    \App\Models\YoutubePlatformPush::updateOrCreate(
                        [
                            'video_id' => $video->video_id,
                            'playlist_id' => $playlist->playlist_id,
                            'platform_name' => $platform->name,
                        ],
                        [
                            'status' => 'success',
                            'pushed_at' => now(),
                            'platform_album_id' => $albumId,
                        ]
                    );
                } else {
                    $results['failed']++;
                    Log::warning("Track push failed for: " . ($video->title ?? $video->video_id), [
                        'status' => $trackRes->status(),
                        'body' => $trackRes->body(),
                    ]);
                }
            }

            return [
                'status' => 'success',
                'message' => "Successfully pushed to streaming: {$playlist->title}",
                'details' => $results,
            ];
        } catch (\Exception $e) {
            Log::error("Streaming Push Error: " . $e->getMessage());
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    protected function syncPlaylistToWatchlist($playlist, $platform): array
    {
        try {
            Log::info("Syncing to Watchlist platform via helper: {$platform->name}");

            // Instantiate helper with same behavior as legacy plugin
            $helper = new WatchlistSyncHelper([
                'api_url' => $platform->base_url,
                'token'   => $platform->api_token,
            ]);

            // 1. Create or Get Title
            $titlePayload = [
                'name' => $playlist->title,
                'is_series' => true,
                'description' => $playlist->description,
                'poster' => $playlist->videos[0]->thumbnail_url ?? null
            ];

            $titleId = $helper->createOrGetTitle($titlePayload);

            if (! $titleId) {
                throw new \Exception("Failed to create/get title on Watchlist platform.");
            }

            // 2. Prepare episodes payloads (one per video)
            $episodesPayload = [];
            foreach ($playlist->videos as $index => $video) {
                $episodesPayload[] = [
                    'name' => $video->title,
                    'episode_number' => $index + 1,
                    'description' => $video->description,
                    'poster' => $video->thumbnail_url,
                ];
            }

            $episodeIds = $helper->createEpisodes($titleId, $episodesPayload);

            // 3. Add to Watchlist
            $added = $helper->addToWatchlist($titleId, $episodeIds);

            return [
                'status' => 'success',
                'message' => 'Playlist metadata synced to Watchlist successfully.',
                'details' => [
                    'episodes_created' => count($episodeIds),
                    'added_to_watchlist' => $added,
                ],
            ];
        } catch (\Exception $e) {
            Log::error("Watchlist Push Error: " . $e->getMessage());
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    /**
     * Call Mistral API for chat completion (no default model in config; use mistral-small for tags/genres).
     */
    protected function callMistral(string $userMessage, string $model = 'mistral-small'): ?string
    {
        $key = Config::get('services.mistral.key') ?: $this->mistralApiKey;
        if (empty($key)) {
            return null;
        }

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . trim($key),
        ])->post('https://api.mistral.ai/v1/chat/completions', [
            'model' => $model,
            'messages' => [
                ['role' => 'user', 'content' => $userMessage],
            ],
            'temperature' => 0.7,
        ]);

        if (!$response->successful()) {
            Log::warning('Mistral API error', ['status' => $response->status(), 'body' => $response->body()]);
            return null;
        }

        $data = $response->json();
        return $data['choices'][0]['message']['content'] ?? null;
    }

    public function generateMetadata(string $videoId): array
    {
        $video = YoutubeVideo::where('video_id', $videoId)->first();
        if (!$video)
            return [];

        try {
            $tags = [];
            $genres = [];

            // Prefer Mistral when API key is set (no default model; we use mistral-small for this task)
            if (Config::get('services.mistral.key') || $this->mistralApiKey) {
                $tags = $this->generateTagsOnly($video->title, $video->description ?? '');
                $genres = $this->generateGenresOnly($video->title, $video->description ?? '', $video->channel_name ?? '');
            }

            if (empty($tags) && empty($genres)) {
                $prompt = "Analyze this video title and description. Generate 5 highly relevant SEO tags and 2 music/content genres.
            Return ONLY a JSON object: {\"tags\": [\"tag1\", \"tag2\", ...], \"genres\": [\"genre1\", \"genre2\"]}.
            Title: {$video->title}
            Description: {$video->description}";
                $response = $this->aiManager->execute($prompt, ['mode' => 'json']);
                $result = $response['text'] ?? null;
                if ($result && is_string($result)) {
                    $result = json_decode($result, true);
                }
                $tags = $result['tags'] ?? [];
                $genres = $result['genres'] ?? [];
            } else {
                $result = ['tags' => $tags, 'genres' => $genres];
            }

            if (!empty($tags) || !empty($genres)) {
                $existingTags = $video->tags ?? [];
                $existingGenres = $video->genres ?? [];
                $newTags = array_values(array_unique(array_merge($existingTags, $tags)));
                $newGenres = array_values(array_unique(array_merge($existingGenres, $genres)));
                $video->update([
                    'tags' => $newTags,
                    'genres' => $newGenres,
                    'tags_generated_at' => now(),
                ]);
            }

            return $result ?? ['tags' => [], 'genres' => []];
        } catch (\Exception $e) {
            Log::error("AI Metadata Error for video {$videoId}: " . $e->getMessage());
            return [];
        }
    }

    public function generateTagsOnly(string $title, string $description = ''): array
    {
        $msg = "Generate 5-10 relevant SEO tags for this content. Return only a JSON object: {\"tags\": [\"tag1\", \"tag2\", ...]}. No explanation.\n\nTitle: {$title}\nDescription: " . substr($description, 0, 500);
        $content = $this->callMistral($msg);
        if ($content) {
            $content = trim($content);
            if (preg_match('/\{[\s\S]*\}/', $content, $m)) {
                $result = json_decode($m[0], true);
                if ($result && isset($result['tags'])) {
                    return array_values(array_map('trim', (array) $result['tags']));
                }
            }
            return array_values(array_map('trim', array_filter(explode(',', $content))));
        }
        try {
            $result = $this->aiManager->execute("Generate 5 SEO tags for: {$title}. Return JSON: {\"tags\": []}", ['mode' => 'json']);
            if (is_string($result)) {
                $result = json_decode($result, true);
            }
            return $result['tags'] ?? [];
        } catch (\Exception $e) {
            return [];
        }
    }

    public function generateGenresOnly(string $title, string $description = '', string $channelName = ''): array
    {
        $msg = "Generate 2-3 music/content genres for this content. Return only a JSON object: {\"genres\": [\"genre1\", \"genre2\"]}. No explanation.\n\nTitle: {$title}\nChannel: {$channelName}\nDescription: " . substr($description, 0, 500);
        $content = $this->callMistral($msg);
        if ($content) {
            $content = trim($content);
            if (preg_match('/\{[\s\S]*\}/', $content, $m)) {
                $result = json_decode($m[0], true);
                if ($result && isset($result['genres'])) {
                    return array_values(array_map('trim', (array) $result['genres']));
                }
            }
            return array_values(array_map('trim', array_filter(explode(',', $content))));
        }
        try {
            $result = $this->aiManager->execute("Generate 2 genres for: {$title}. Return JSON: {\"genres\": []}", ['mode' => 'json']);
            if (is_string($result)) {
                $result = json_decode($result, true);
            }
            return $result['genres'] ?? [];
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Store scraped data in DB
     */
    public function syncToDatabase(array $playlistData): YoutubePlaylist
    {
        $playlist = YoutubePlaylist::updateOrCreate(
            ['playlist_id' => $playlistData['playlist_id']],
            [
                'playlist_url' => "https://www.youtube.com/playlist?list={$playlistData['playlist_id']}",
                'title' => $playlistData['title'] ?? null,
                'description' => $playlistData['description'] ?? null,
                'video_count' => count($playlistData['videos']),
                'last_fetched_at' => now()
            ]
        );

        foreach ($playlistData['videos'] as $videoData) {
            $videoId = $videoData['video_id'] ?? $videoData['videoId'] ?? null;
            if (!$videoId) {
                continue;
            }
            $payload = [
                'playlist_id' => $playlist->playlist_id,
                'title' => $videoData['title'] ?? '',
                'description' => $videoData['description'] ?? '',
                'channel_name' => $videoData['channel_name'] ?? '',
                'channel_id' => $videoData['channel_id'] ?? '',
                'thumbnail_url' => $videoData['thumbnail_url'] ?? '',
                'thumbnail_animated_url' => $videoData['thumbnail_animated_url'] ?? null,
                'duration' => $videoData['duration'] ?? $videoData['durationMs'] ?? '',
                'video_url' => $videoData['video_url'] ?? '',
            ];
            if (!empty($videoData['published_at'])) {
                $payload['published_at'] = $videoData['published_at'];
            }
            YoutubeVideo::updateOrCreate(
                ['video_id' => $videoId],
                $payload
            );
            // Preserve existing tags/genres: we do not overwrite them here; they stay until AI/Meta or bulk update
        }

        return $playlist;
    }

    public function bulkUpdateMetadata(string $playlistId, array $tags, array $genres): int
    {
        $playlist = YoutubePlaylist::where('playlist_id', $playlistId)->first();
        if (!$playlist)
            return 0;

        $videos = YoutubeVideo::where('playlist_id', $playlist->playlist_id)->get();
        $count = 0;

        foreach ($videos as $video) {
            $existingTags = $video->tags ?? [];
            $existingGenres = $video->genres ?? [];

            $newTags = array_values(array_unique(array_merge($existingTags, $tags)));
            $newGenres = array_values(array_unique(array_merge($existingGenres, $genres)));

            $video->update([
                'tags' => $newTags,
                'genres' => $newGenres
            ]);
            $count++;
        }

        return $count;
    }

    protected function convertDurationToMs(string $duration): int
    {
        if (strpos($duration, 'PT') === 0) {
            $pattern = '/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/';
            preg_match($pattern, $duration, $matches);
            $hours = (int) ($matches[1] ?? 0);
            $minutes = (int) ($matches[2] ?? 0);
            $seconds = (int) ($matches[3] ?? 0);
            return ($hours * 3600 + $minutes * 60 + $seconds) * 1000;
        }

        // Handle "MM:SS"
        $parts = explode(':', $duration);
        if (count($parts) === 2)
            return ($parts[0] * 60 + $parts[1]) * 1000;
        if (count($parts) === 3)
            return ($parts[0] * 3600 + $parts[1] * 60 + $parts[2]) * 1000;

        return 0;
    }
}
