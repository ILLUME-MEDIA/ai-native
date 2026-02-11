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
        $this->apiKey = $config['api_key'] ?? config('services.youtube.key') ?? env('YOUTUBE_API_KEY');
        $this->mistralApiKey = $config['mistral_api_key'] ?? config('services.mistral.key') ?? env('MISTRAL_API_KEY');
        $this->siteConfigs = $config['site_configs'] ?? [];
    }

    /**
     * Fetch playlist data from YouTube (Scraping + API fallback),
     * then enrich every video with full metadata via the Videos API.
     *
     * $maxResults controls the hard cap when using the official API.
     * YouTube playlists are effectively limited to ~5000 items, so we default to 5000.
     */
    public function fetchPlaylist(string $playlistId, int $maxResults = 5000): array
    {
        Log::info("Fetching YouTube playlist: {$playlistId}");

        // If we have a valid API key configured, always prefer the official API.
        // This avoids the 100‑video limit of the HTML scraper and reliably handles
        // very large playlists (up to ~$5k items).
        if (!empty($this->apiKey)) {
            $data = $this->fetchPlaylistViaApi($playlistId, $maxResults);
        } else {
            // Fallback: HTML scraping only (typically limited to ~100 visible items)
            $data = $this->scrapePlaylistFromPage($playlistId, $maxResults);
        }

        // Enrich all videos with full metadata (views, likes, duration, description, tags, etc.)
        if (!empty($data['videos']) && !empty($this->apiKey)) {
            $data['videos'] = $this->enrichVideosWithDetails($data['videos']);
        }

        return $data;
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
                $response = Http::timeout(25)->withHeaders([
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
                if (!$videoRenderer) continue;

                $videoId = $videoRenderer['videoId'] ?? null;
                if (!$videoId) continue;

                $thumbnailAnimatedUrl = $this->extractMovingThumbnailUrl($videoRenderer);

                // Pick best thumbnail (largest resolution)
                $thumbnails = $videoRenderer['thumbnail']['thumbnails'] ?? [];
                $bestThumb = '';
                $bestWidth = 0;
                foreach ($thumbnails as $t) {
                    $w = $t['width'] ?? 0;
                    if ($w > $bestWidth) {
                        $bestWidth = $w;
                        $bestThumb = $t['url'] ?? '';
                    }
                }
                if (!$bestThumb && !empty($thumbnails)) {
                    $bestThumb = end($thumbnails)['url'] ?? '';
                }

                // Extract view count from videoInfo overlay if available
                $viewCountText = $videoRenderer['videoInfo']['runs'][0]['text'] ?? '';

                $results['videos'][] = [
                    'video_id' => $videoId,
                    'title' => $videoRenderer['title']['runs'][0]['text'] ?? '',
                    'description' => $videoRenderer['descriptionSnippet']['runs'][0]['text'] ?? '',
                    'thumbnail_url' => $bestThumb,
                    'thumbnail_animated_url' => $thumbnailAnimatedUrl,
                    'channel_name' => $videoRenderer['shortBylineText']['runs'][0]['text'] ?? '',
                    'channel_id' => $videoRenderer['shortBylineText']['runs'][0]['navigationEndpoint']['browseEndpoint']['browseId'] ?? '',
                    'duration' => $videoRenderer['lengthText']['simpleText'] ?? ($videoRenderer['lengthText']['accessibility']['accessibilityData']['label'] ?? ''),
                    'video_url' => "https://www.youtube.com/watch?v=" . $videoId,
                    'view_count_text' => $viewCountText,
                ];
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

    /**
     * Enrich videos with full metadata from YouTube Videos API.
     * Fetches: description, publishedAt, duration (ISO 8601), viewCount, likeCount, commentCount,
     * YouTube's own tags, best thumbnail (maxres), category.
     * Batches 50 video IDs per API call.
     */
    protected function enrichVideosWithDetails(array $videos): array
    {
        if (empty($this->apiKey) || empty($videos)) {
            return $videos;
        }

        // Index videos by ID for quick lookup
        $videoMap = [];
        foreach ($videos as $i => $v) {
            $vid = $v['video_id'] ?? null;
            if ($vid) {
                $videoMap[$vid] = $i;
            }
        }

        $allIds = array_keys($videoMap);
        $chunks = array_chunk($allIds, 50);

        foreach ($chunks as $chunk) {
            try {
                $response = Http::get('https://www.googleapis.com/youtube/v3/videos', [
                    'part' => 'snippet,statistics,contentDetails',
                    'id' => implode(',', $chunk),
                    'key' => $this->apiKey,
                ]);

                if (!$response->successful()) {
                    Log::warning('YouTube Videos API failed', ['status' => $response->status()]);
                    continue;
                }

                foreach ($response->json('items') ?? [] as $item) {
                    $vid = $item['id'] ?? null;
                    if (!$vid || !isset($videoMap[$vid])) continue;

                    $idx = $videoMap[$vid];
                    $snippet = $item['snippet'] ?? [];
                    $stats = $item['statistics'] ?? [];
                    $content = $item['contentDetails'] ?? [];

                    // Merge — only fill what's missing or improve quality
                    if (empty($videos[$idx]['description'])) {
                        $videos[$idx]['description'] = $snippet['description'] ?? '';
                    }
                    if (empty($videos[$idx]['published_at'])) {
                        $videos[$idx]['published_at'] = $snippet['publishedAt'] ?? null;
                    }
                    if (empty($videos[$idx]['channel_name'])) {
                        $videos[$idx]['channel_name'] = $snippet['channelTitle'] ?? '';
                    }
                    if (empty($videos[$idx]['channel_id'])) {
                        $videos[$idx]['channel_id'] = $snippet['channelId'] ?? '';
                    }

                    // Duration — prefer ISO 8601 from API (e.g. "PT4M30S")
                    $isoDuration = $content['duration'] ?? null;
                    if ($isoDuration) {
                        $videos[$idx]['duration'] = $isoDuration;
                    }

                    // Statistics
                    $videos[$idx]['view_count'] = (int) ($stats['viewCount'] ?? 0);
                    $videos[$idx]['like_count'] = (int) ($stats['likeCount'] ?? 0);
                    $videos[$idx]['comment_count'] = (int) ($stats['commentCount'] ?? 0);

                    // YouTube's own tags
                    $ytTags = $snippet['tags'] ?? [];
                    if (!empty($ytTags)) {
                        $videos[$idx]['youtube_tags'] = array_slice($ytTags, 0, 20);
                    }

                    // Category
                    $videos[$idx]['category_id'] = $snippet['categoryId'] ?? null;

                    // Definition (hd/sd)
                    $videos[$idx]['definition'] = $content['definition'] ?? null;

                    // Best thumbnail (prefer maxres > high > medium > default)
                    $thumbs = $snippet['thumbnails'] ?? [];
                    foreach (['maxres', 'high', 'standard', 'medium', 'default'] as $quality) {
                        if (!empty($thumbs[$quality]['url'])) {
                            $videos[$idx]['thumbnail_url'] = $thumbs[$quality]['url'];
                            break;
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::warning('enrichVideosWithDetails chunk failed: ' . $e->getMessage());
            }
        }

        Log::info("Enriched " . count($allIds) . " videos with full YouTube metadata.");
        return $videos;
    }

    /**
     * Enrich existing DB videos with full YouTube metadata.
     * Reads video IDs from the database, calls YouTube Videos API in batches,
     * and updates each record directly. Works independently of fetchPlaylist/sync.
     */
    public function enrichPlaylistVideos(string $playlistId): array
    {
        $apiKey = $this->apiKey;
        if (empty($apiKey)) {
            return ['enriched' => 0, 'error' => 'YouTube API key not configured'];
        }

        $videos = YoutubeVideo::where('playlist_id', $playlistId)->get();
        if ($videos->isEmpty()) {
            return ['enriched' => 0, 'error' => 'No videos found for this playlist'];
        }

        $allIds = $videos->pluck('video_id')->toArray();
        $chunks = array_chunk($allIds, 50);
        $enriched = 0;
        $errors = [];

        foreach ($chunks as $chunk) {
            try {
                $response = Http::get('https://www.googleapis.com/youtube/v3/videos', [
                    'part' => 'snippet,statistics,contentDetails',
                    'id' => implode(',', $chunk),
                    'key' => $apiKey,
                ]);

                if (!$response->successful()) {
                    $errMsg = $response->json('error.message') ?? "HTTP {$response->status()}";
                    Log::warning('YouTube Videos API failed during enrichment', ['status' => $response->status(), 'error' => $errMsg]);
                    $errors[] = $errMsg;
                    continue;
                }

                foreach ($response->json('items') ?? [] as $item) {
                    $vid = $item['id'] ?? null;
                    if (!$vid) continue;

                    $dbVideo = $videos->firstWhere('video_id', $vid);
                    if (!$dbVideo) continue;

                    $snippet = $item['snippet'] ?? [];
                    $stats = $item['statistics'] ?? [];
                    $content = $item['contentDetails'] ?? [];

                    $update = [];

                    // Description
                    if (!empty($snippet['description']) && (empty($dbVideo->description) || strlen($dbVideo->description) < 50)) {
                        $update['description'] = $snippet['description'];
                    }

                    // Published date
                    if (!empty($snippet['publishedAt']) && empty($dbVideo->published_at)) {
                        $update['published_at'] = $snippet['publishedAt'];
                    }

                    // Channel info
                    if (!empty($snippet['channelTitle']) && empty($dbVideo->channel_name)) {
                        $update['channel_name'] = $snippet['channelTitle'];
                    }
                    if (!empty($snippet['channelId']) && empty($dbVideo->channel_id)) {
                        $update['channel_id'] = $snippet['channelId'];
                    }

                    // Duration (ISO 8601)
                    if (!empty($content['duration'])) {
                        $update['duration'] = $content['duration'];
                    }

                    // Statistics — always overwrite with fresh data
                    $update['view_count'] = (int) ($stats['viewCount'] ?? 0);
                    $update['like_count'] = (int) ($stats['likeCount'] ?? 0);
                    $update['comment_count'] = (int) ($stats['commentCount'] ?? 0);

                    // Best thumbnail
                    $thumbs = $snippet['thumbnails'] ?? [];
                    foreach (['maxres', 'high', 'standard', 'medium', 'default'] as $quality) {
                        if (!empty($thumbs[$quality]['url'])) {
                            $update['thumbnail_url'] = $thumbs[$quality]['url'];
                            break;
                        }
                    }

                    // Metadata JSON (definition, category, youtube_tags)
                    $meta = $dbVideo->metadata ?? [];
                    if (!empty($content['definition'])) {
                        $meta['definition'] = $content['definition'];
                    }
                    if (!empty($snippet['categoryId'])) {
                        $meta['category_id'] = $snippet['categoryId'];
                    }
                    $ytTags = $snippet['tags'] ?? [];
                    if (!empty($ytTags)) {
                        $meta['youtube_tags'] = array_slice($ytTags, 0, 20);
                        // Merge into tags column
                        $existingTags = $dbVideo->tags ?? [];
                        $update['tags'] = array_values(array_unique(array_merge($existingTags, array_slice($ytTags, 0, 20))));
                    }
                    $update['metadata'] = $meta;

                    $dbVideo->update($update);
                    $enriched++;
                }
            } catch (\Exception $e) {
                Log::warning('enrichPlaylistVideos chunk failed: ' . $e->getMessage());
                $errors[] = $e->getMessage();
            }
        }

        Log::info("Enriched {$enriched}/" . count($allIds) . " videos for playlist {$playlistId}");

        $result = [
            'enriched' => $enriched,
            'total' => count($allIds),
            'errors' => $errors,
        ];

        // If nothing was enriched and we collected API errors, surface a primary error
        if ($enriched === 0 && !empty($errors)) {
            $result['error'] = $errors[0];
        }

        return $result;
    }

    protected function fetchPlaylistViaApi(string $playlistId, int $maxResults = 500): array
    {
        if (empty($this->apiKey)) {
            throw new \Exception("YouTube API Key not configured.");
        }

        $videos = [];
        $pageToken = null;
        $playlistTitle = '';

        do {
            $params = [
                'part' => 'snippet,contentDetails',
                'maxResults' => 50,
                'playlistId' => $playlistId,
                'key' => $this->apiKey,
            ];
            if ($pageToken) {
                $params['pageToken'] = $pageToken;
            }

            $response = Http::timeout(25)->get('https://www.googleapis.com/youtube/v3/playlistItems', $params);

            if ($response->failed()) {
                throw new \Exception("YouTube API request failed: " . $response->json('error.message'));
            }

            $data = $response->json();

            foreach ($data['items'] ?? [] as $item) {
                $snippet = $item['snippet'];
                $videoId = $snippet['resourceId']['videoId'] ?? null;
                if (!$videoId || $snippet['title'] === 'Deleted video' || $snippet['title'] === 'Private video') {
                    continue;
                }
                if (empty($playlistTitle) && !empty($snippet['playlistId'])) {
                    $playlistTitle = $snippet['channelTitle'] ?? '';
                }
                $videos[] = [
                    'video_id' => $videoId,
                    'title' => $snippet['title'],
                    'description' => $snippet['description'] ?? '',
                    'thumbnail_url' => $snippet['thumbnails']['high']['url'] ?? $snippet['thumbnails']['default']['url'] ?? '',
                    'thumbnail_animated_url' => null,
                    'channel_name' => $snippet['videoOwnerChannelTitle'] ?? $snippet['channelTitle'] ?? '',
                    'channel_id' => $snippet['videoOwnerChannelId'] ?? $snippet['channelId'] ?? '',
                    'published_at' => $snippet['publishedAt'] ?? null,
                    'video_url' => "https://www.youtube.com/watch?v=" . $videoId,
                ];
            }

            $pageToken = $data['nextPageToken'] ?? null;

        } while ($pageToken && count($videos) < $maxResults);

        Log::info("YouTube API fetched {$playlistId}: " . count($videos) . " videos across multiple pages.");

        return [
            'playlist_id' => $playlistId,
            'title' => $playlistTitle,
            'videos' => $videos,
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
            // Restrict playlist->videos to the selected subset, preserving order
            $videos = $playlist->videos->whereIn('video_id', $onlyVideoIds)->values();
            $playlist->setRelation('videos', $videos);
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
                ->timeout(60) // Keep individual HTTP calls bounded; large pushes should be chunked by caller
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
            $albumMode = $options['album_mode'] ?? 'single'; // "single" playlist album (default) or "per_video"
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
                    $body = $byNameRes->json();
                    $artistId = $body['artist']['id']
                        ?? $body['id']
                        ?? $body['data']['artist']['id']
                        ?? $body['data']['id']
                        ?? null;
                    if (! $artistId) {
                        Log::warning('Streaming: /artists/by-name returned success but no artist id', [
                            'url' => $byNameUrl,
                            'response' => $body,
                        ]);
                    }
                } else {
                    Log::warning('Streaming: /artists/by-name request failed', [
                        'url' => $byNameUrl,
                        'status' => $byNameRes->status(),
                        'body' => substr((string) $byNameRes->body(), 0, 500),
                    ]);
                }
            } catch (\Exception $e) {
                Log::warning('Streaming: /artists/by-name exception', ['error' => $e->getMessage()]);
            }

            if (!$artistId) {
                try {
                    $searchResponse = $this->makePlatformRequest($baseUrl, $token, 'GET', 'artists/search', ['query' => $artistName]);
                    if ($searchResponse->successful()) {
                        $body = $searchResponse->json();
                        $first = $body['data'][0] ?? $body['pagination']['data'][0] ?? null;
                        if ($first) {
                            $artistId = $first['id'] ?? $first['artist']['id'] ?? null;
                        }
                        if (! $artistId) {
                            Log::warning('Streaming: /artists/search returned success but no artist id', [
                                'query' => $artistName,
                                'response' => $body,
                            ]);
                        }
                    } else {
                        Log::warning('Streaming: /artists/search request failed', [
                            'query' => $artistName,
                            'status' => $searchResponse->status(),
                            'body' => substr((string) $searchResponse->body(), 0, 500),
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::warning('Streaming: /artists/search exception', ['error' => $e->getMessage()]);
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
                if ($artistResponse->successful()) {
                    $body = $artistResponse->json();
                    $artistId = $body['artist']['id']
                        ?? $body['data']['artist']['id']
                        ?? $body['data']['id']
                        ?? $body['id']
                        ?? null;
                    if (! $artistId) {
                        Log::warning('Streaming: POST /artists succeeded but no artist id found', [
                            'payload' => $artistPayload,
                            'response' => $body,
                        ]);
                    }
                } else {
                    Log::warning('Streaming: POST /artists failed', [
                        'payload' => $artistPayload,
                        'status' => $artistResponse->status(),
                        'body' => substr((string) $artistResponse->body(), 0, 500),
                    ]);
                }
            }

            if (!$artistId) {
                throw new \Exception("Failed to create/get artist.");
            }

            // Step 2: Album setup
            $singleAlbumId = null;
            if ($albumMode === 'single') {
                // One shared album for the whole playlist
                $albumImage = $playlist->videos[0]->thumbnail_url ?? null;
                if (!$albumImage) {
                    $albumImage = 'https://i.ytimg.com/vi/' . ($playlist->videos[0]->video_id ?? '') . '/hqdefault.jpg';
                }
                $playlistYoutubeUrl = $playlist->playlist_url ?: ('https://www.youtube.com/playlist?list=' . $playlist->playlist_id);
                $albumPayload = [
                    'name' => $playlist->title,
                    'image' => $albumImage,
                    'release_date' => date('Y-m-d'),
                    'description' => $playlist->description ?? '',
                    'artists' => [$artistId],
                    'genres' => [],
                    'tags' => [],
                    'youtube_url' => $playlistYoutubeUrl,
                    'metadata' => [
                        'source' => 'youtube',
                        'playlist_id' => $playlist->playlist_id,
                    ],
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
                    $singleAlbumId = $existingAlbumId;
                } else {
                    $albumResponse = $this->makePlatformRequest($baseUrl, $token, 'POST', 'albums', $albumPayload);
                    $singleAlbumId = $albumResponse->json()['album']['id'] ?? $albumResponse->json()['id'] ?? $albumResponse->json()['data']['id'] ?? $albumResponse->json()['data']['album']['id'] ?? null;

                    if (!$singleAlbumId) {
                        try {
                            $searchResponse = $this->makePlatformRequest($baseUrl, $token, 'GET', 'albums/search', ['query' => $playlist->title]);
                            $singleAlbumId = $searchResponse->json()['data'][0]['id'] ?? $searchResponse->json()['data'][0]['album']['id'] ?? null;
                        } catch (\Exception $e) {
                            // Ignore
                        }
                    }

                    if (!$singleAlbumId) {
                        throw new \Exception("Failed to create album. Response: " . substr($albumResponse->body(), 0, 200));
                    }
                }
            }

            // Step 3: Tracks — full payload (image, release_date, description, duration in ms)
            $results = ['success' => 0, 'failed' => 0];
            $trackErrors = [];
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
                    // API docs expect an array of artist IDs
                    'artists' => [$artistId],
                ];

                // Decide album for this video
                if ($albumMode === 'single') {
                    $albumIdForTrack = $singleAlbumId;
                } else {
                    // One album per video: create (or reuse) album based on video title
                    $videoAlbumPayload = [
                        'name' => $video->title ?? $playlist->title,
                        'image' => $trackImage,
                        'release_date' => date('Y-m-d'),
                        'description' => $video->description ?? $playlist->description ?? '',
                        'artists' => [$artistId],
                        'genres' => $video->genres ?? [],
                        'tags' => is_array($video->tags ?? null) ? array_slice($video->tags, 0, 10) : [],
                        'youtube_url' => $video->video_url ?: ('https://www.youtube.com/watch?v=' . $video->video_id),
                        'metadata' => [
                            'source' => 'youtube',
                            'playlist_id' => $playlist->playlist_id,
                            'video_id' => $video->video_id,
                        ],
                    ];

                    $albumResponse = $this->makePlatformRequest($baseUrl, $token, 'POST', 'albums', $videoAlbumPayload);
                    $albumIdForTrack = $albumResponse->json()['album']['id'] ?? $albumResponse->json()['id'] ?? $albumResponse->json()['data']['id'] ?? $albumResponse->json()['data']['album']['id'] ?? null;

                    if (! $albumIdForTrack) {
                        $results['failed']++;
                        Log::warning("Per-video album creation failed for: " . ($video->title ?? $video->video_id), [
                            'status' => $albumResponse->status(),
                            'body' => substr((string) $albumResponse->body(), 0, 500),
                        ]);
                        continue;
                    }
                }

                // Try including album_id first, but if the streaming API rejects it
                // (invalid album id), retry once without album_id so tracks still get created.
                $payloadWithAlbum = $trackPayload + ['album_id' => $albumIdForTrack];
                $trackRes = $this->makePlatformRequest($baseUrl, $token, 'POST', 'tracks', $payloadWithAlbum);

                if (!$trackRes->successful() && $trackRes->status() === 422) {
                    $json = $trackRes->json();
                    $msg = is_array($json) ? ($json['message'] ?? '') : '';
                    $albumError = is_array($json) && isset($json['errors']['album_id'][0]) ? $json['errors']['album_id'][0] : '';
                    $albumInvalid = (is_string($msg) && str_contains($msg, 'album id'))
                        || (is_string($albumError) && str_contains($albumError, 'album id'));

                    if ($albumInvalid) {
                        // Retry without album_id so that at least the track is created
                        $trackRes = $this->makePlatformRequest($baseUrl, $token, 'POST', 'tracks', $trackPayload);
                    }
                }

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
                            'platform_album_id' => $albumIdForTrack,
                        ]
                    );
                } else {
                    $results['failed']++;
                    $bodySnippet = substr((string) $trackRes->body(), 0, 400);
                    $errorEntry = "status {$trackRes->status()}: {$bodySnippet}";
                    $trackErrors[] = $errorEntry;
                    Log::warning("Track push failed for: " . ($video->title ?? $video->video_id), [
                        'status' => $trackRes->status(),
                        'body' => $bodySnippet,
                    ]);
                }
            }

            // If all attempts failed, surface first streaming error so the admin can see why
            if ($results['success'] === 0 && $results['failed'] > 0 && !empty($trackErrors)) {
                return [
                    'status' => 'error',
                    'message' => "Streaming platform rejected track creation. First error: {$trackErrors[0]}",
                    'details' => $results,
                ];
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

            $helper = new WatchlistSyncHelper([
                'api_url' => $platform->base_url,
                'token'   => $platform->api_token,
            ]);

            // 1. Create or Get Title
            $titlePayload = [
                'name' => $playlist->title,
                'is_series' => true,
                'description' => $playlist->description,
                'poster' => $playlist->videos->first()->thumbnail_url ?? null
            ];

            $titleId = $helper->createOrGetTitle($titlePayload);

            if (! $titleId) {
                throw new \Exception("Failed to create/get title on Watchlist platform.");
            }

            // 2. Prepare episodes payloads (one per video)
            $results = ['success' => 0, 'failed' => 0, 'skipped' => 0];
            $episodesPayload = [];
            $videoMap = []; // index => video model for tracking

            foreach ($playlist->videos->values() as $index => $video) {
                $episodesPayload[] = [
                    'name' => $video->title,
                    'episode_number' => $index + 1,
                    'description' => $video->description,
                    'poster' => $video->thumbnail_url,
                ];
                $videoMap[$index] = $video;
            }

            $episodeIds = $helper->createEpisodes($titleId, $episodesPayload);

            // 3. Add to Watchlist
            $added = $helper->addToWatchlist($titleId, $episodeIds);

            // 4. Track each video push in youtube_platform_pushes for deduplication
            foreach ($playlist->videos as $video) {
                \App\Models\YoutubePlatformPush::updateOrCreate(
                    [
                        'video_id' => $video->video_id,
                        'playlist_id' => $playlist->playlist_id,
                        'platform_name' => $platform->name,
                    ],
                    [
                        'status' => 'success',
                        'pushed_at' => now(),
                        'platform_album_id' => $titleId,
                    ]
                );
                $results['success']++;
            }

            return [
                'status' => 'success',
                'message' => 'Playlist metadata synced to Watchlist successfully.',
                'details' => [
                    'success' => $results['success'],
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

            // Statistics from Videos API enrichment
            if (isset($videoData['view_count'])) {
                $payload['view_count'] = (int) $videoData['view_count'];
            }
            if (isset($videoData['like_count'])) {
                $payload['like_count'] = (int) $videoData['like_count'];
            }
            if (isset($videoData['comment_count'])) {
                $payload['comment_count'] = (int) $videoData['comment_count'];
            }

            // Store extra metadata (category, definition, youtube tags) in JSON metadata column
            $extra = [];
            if (!empty($videoData['category_id'])) {
                $extra['category_id'] = $videoData['category_id'];
            }
            if (!empty($videoData['definition'])) {
                $extra['definition'] = $videoData['definition'];
            }
            if (!empty($videoData['youtube_tags'])) {
                $extra['youtube_tags'] = $videoData['youtube_tags'];
            }
            if (!empty($extra)) {
                $payload['metadata'] = $extra;
            }

            $existing = YoutubeVideo::where('video_id', $videoId)->first();

            if ($existing) {
                // Merge YouTube's own tags into existing tags (don't overwrite AI-generated ones)
                if (!empty($videoData['youtube_tags'])) {
                    $existingTags = $existing->tags ?? [];
                    $merged = array_values(array_unique(array_merge($existingTags, $videoData['youtube_tags'])));
                    $payload['tags'] = $merged;
                }
                $existing->update($payload);
            } else {
                // New video — set YouTube tags as initial tags
                if (!empty($videoData['youtube_tags'])) {
                    $payload['tags'] = $videoData['youtube_tags'];
                }
                YoutubeVideo::create(array_merge(['video_id' => $videoId], $payload));
            }
        }

        // Optionally auto-enhance playlist title using AI based on video titles/tags
        try {
            $this->enhancePlaylistTitle($playlist);
        } catch (\Exception $e) {
            Log::warning("Failed to enhance playlist title for {$playlist->playlist_id}: " . $e->getMessage());
        }

        return $playlist;
    }

    /**
     * Use AI to generate a better human-friendly playlist title / series name.
     * Runs once per playlist (skips if title already looks customized).
     */
    protected function enhancePlaylistTitle(YoutubePlaylist $playlist): void
    {
        // Skip if title already customized (not just "Uploads from X")
        $currentTitle = trim((string) $playlist->title);
        if ($currentTitle !== '' && !str_starts_with($currentTitle, 'Uploads from')) {
            return;
        }

        $videos = $playlist->videos()->select(['title', 'description', 'tags', 'genres'])->orderBy('created_at')->limit(10)->get();
        if ($videos->isEmpty()) {
            return;
        }

        $examples = [];
        foreach ($videos as $video) {
            $examples[] = [
                'title' => $video->title,
                'description' => mb_substr((string) $video->description, 0, 120),
                'tags' => $video->tags ?? [],
                'genres' => $video->genres ?? [],
            ];
        }

        $prompt = "You are naming a series/album for a YouTube playlist.\n"
            . "Given these example episodes (titles, short descriptions, tags, genres), propose a short, human friendly series name.\n"
            . "Do NOT include words like 'Uploads from' or 'Playlist'.\n"
            . "Return ONLY the new title as plain text, no quotes.\n\n"
            . "Current playlist title: {$currentTitle}\n\n"
            . "Episodes:\n";

        foreach ($examples as $i => $ex) {
            $prompt .= ($i + 1) . ". Title: {$ex['title']}\n";
            if (!empty($ex['description'])) {
                $prompt .= "   Description: {$ex['description']}\n";
            }
            if (!empty($ex['tags'])) {
                $prompt .= "   Tags: " . implode(', ', (array) $ex['tags']) . "\n";
            }
            if (!empty($ex['genres'])) {
                $prompt .= "   Genres: " . implode(', ', (array) $ex['genres']) . "\n";
            }
            $prompt .= "\n";
        }

        $response = $this->aiManager->execute($prompt, ['mode' => 'text']);
        if (is_array($response)) {
            $text = $response['text'] ?? null;
        } else {
            $text = $response;
        }

        if (!is_string($text)) {
            return;
        }

        $newTitle = trim($text);
        if ($newTitle !== '' && strcasecmp($newTitle, $currentTitle) !== 0) {
            $playlist->update(['title' => $newTitle]);
        }
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
