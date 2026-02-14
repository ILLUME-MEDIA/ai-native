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

                    // Published date - always update with YouTube's value
                    if (!empty($snippet['publishedAt'])) {
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

                    // ✨ AUTO-GENERATE TAGS & GENRES using Mistral service
                    // Only generate if not already generated or if tags/genres are empty
                    if (empty($dbVideo->tags_generated_at) || empty($dbVideo->tags) || empty($dbVideo->genres)) {
                        try {
                            $title = $dbVideo->title;
                            $description = $update['description'] ?? $dbVideo->description ?? '';
                            $channelName = $update['channel_name'] ?? $dbVideo->channel_name ?? '';

                            // Generate structured 3-tag system
                            $generatedTags = $this->generateTagsOnly($title, $description);

                            // Generate 3-5 contextual genres
                            $generatedGenres = $this->generateGenresOnly($title, $description, $channelName);

                            // Merge with existing tags/genres
                            $existingTags = $dbVideo->tags ?? [];
                            $existingGenres = $dbVideo->genres ?? [];

                            $finalTags = array_values(array_unique(array_merge($existingTags, $generatedTags)));
                            $finalGenres = array_values(array_unique(array_merge($existingGenres, $generatedGenres)));

                            // Update video with AI-generated metadata
                            $dbVideo->update([
                                'tags' => $finalTags,
                                'genres' => $finalGenres,
                                'tags_generated_at' => now(),
                            ]);

                            Log::info("Auto-generated tags/genres for video: {$vid}");
                        } catch (\Exception $tagError) {
                            Log::warning("Failed to auto-generate tags/genres for {$vid}: " . $tagError->getMessage());
                            // Continue enrichment even if tag/genre generation fails
                        }
                    }

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

        // First, fetch the actual playlist title using playlists.list endpoint
        $playlistTitle = '';
        try {
            $playlistResponse = Http::timeout(15)->get('https://www.googleapis.com/youtube/v3/playlists', [
                'part' => 'snippet',
                'id' => $playlistId,
                'key' => $this->apiKey,
            ]);

            if ($playlistResponse->successful()) {
                $playlistData = $playlistResponse->json();
                $playlistTitle = $playlistData['items'][0]['snippet']['title'] ?? '';
                Log::info("Fetched playlist title from API: {$playlistTitle}");
            }
        } catch (\Exception $e) {
            Log::warning("Failed to fetch playlist title via API: " . $e->getMessage());
        }

        $videos = [];
        $pageToken = null;

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
                // Fallback to channel title only if playlist title fetch failed
                if (empty($playlistTitle) && !empty($snippet['channelTitle'])) {
                    $playlistTitle = $snippet['channelTitle'];
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

        // Extract streaming URLs from options if provided (when both platforms selected)
        $streamingUrls = $options['streaming_urls'] ?? [];

        if ($platform->type === 'streaming') {
            return $this->postToStreamingPlatform($playlist, $platform, $options);
        } elseif ($platform->type === 'watchlist') {
            return $this->syncPlaylistToWatchlist($playlist, $platform, $streamingUrls);
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
     * Ensure genres/tags exist on streaming platform before assigning.
     * Returns arrays of valid genres and tags.
     */
    protected function ensureStreamingGenresTagsExist($baseUrl, $token, array $genres = [], array $tags = []): array
    {
        $validGenres = [];
        $validTags = [];

        // Ensure genres exist
        foreach ($genres as $genreName) {
            try {
                // Check if genre exists
                $searchResponse = $this->makePlatformRequest($baseUrl, $token, 'GET', 'genres', ['query' => $genreName, 'perPage' => 50]);

                if ($searchResponse->successful()) {
                    $data = $searchResponse->json();
                    $existingGenres = $data['pagination']['data'] ?? $data['data'] ?? $data['genres'] ?? [];

                    $found = false;
                    foreach ($existingGenres as $genre) {
                        if (trim(strtolower($genre['name'] ?? '')) === trim(strtolower($genreName))) {
                            $validGenres[] = $genreName;
                            $found = true;
                            Log::info("Streaming: Genre already exists", ['genre' => $genreName]);
                            break;
                        }
                    }

                    if (!$found) {
                        // Create genre
                        $createResponse = $this->makePlatformRequest($baseUrl, $token, 'POST', 'genres', [
                            'name' => $genreName,
                            'display_name' => $genreName,
                        ]);

                        if ($createResponse->successful()) {
                            $validGenres[] = $genreName;
                            Log::info("Streaming: Successfully created genre", ['genre' => $genreName]);
                        } else {
                            // Some streaming platforms auto-create, so add anyway
                            $validGenres[] = $genreName;
                            Log::info("Streaming: Genre creation skipped (platform may auto-create)", ['genre' => $genreName]);
                        }
                    }
                } else {
                    // If genre API not available, include it anyway (streaming platforms usually handle this)
                    $validGenres[] = $genreName;
                }
            } catch (\Throwable $e) {
                // Include anyway, streaming platforms usually auto-create
                $validGenres[] = $genreName;
                Log::info("Streaming: Including genre (platform may auto-create)", ['genre' => $genreName]);
            }
        }

        // For tags, most streaming platforms auto-create, so just include them
        $validTags = $tags;

        return ['genres' => $validGenres, 'tags' => $validTags];
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

    /**
     * Build frontend URL for streaming platform (not API URL)
     * Album: https://creatorstream.tv/channel/bollymix/album/4834/artist-slug/album-slug
     * Track: https://creatorstream.tv/channel/bollymix/track/26785/track-slug
     */
    protected function buildStreamingFrontendUrl($baseUrl, $type, $id, $title, $artistName = null): string
    {
        // Extract base domain and channel from API URL
        // API URL format: https://creatorstream.tv/channel/bollymix/api/v1
        $parts = parse_url($baseUrl);
        $scheme = $parts['scheme'] ?? 'https';
        $host = $parts['host'] ?? '';
        $path = $parts['path'] ?? '';

        // Extract channel name from path like /channel/bollymix/api/v1
        preg_match('/\/channel\/([^\/]+)/', $path, $matches);
        $channel = $matches[1] ?? 'default';

        // Build frontend URL
        $baseHostUrl = "{$scheme}://{$host}";

        if ($type === 'album') {
            // Album URL: /channel/{channel}/album/{id}/{artist-slug}/{album-slug}
            $artistSlug = \Illuminate\Support\Str::slug($artistName ?: 'artist');
            $albumSlug = \Illuminate\Support\Str::slug($title);
            return "{$baseHostUrl}/channel/{$channel}/album/{$id}/{$artistSlug}/{$albumSlug}";
        } else if ($type === 'track') {
            // Track URL: /channel/{channel}/track/{id}/{track-slug} (singular track)
            $trackSlug = \Illuminate\Support\Str::slug($title);
            return "{$baseHostUrl}/channel/{$channel}/track/{$id}/{$trackSlug}";
        }

        return "{$baseHostUrl}/channel/{$channel}";
    }

    protected function postToStreamingPlatform($playlist, $platform, array $options = []): array
    {
        Log::info("Pushing to Streaming Platform: {$platform->name}");

        $baseUrl = rtrim($platform->base_url, '/');
        $token = $platform->api_token;

        // Track streaming URLs for passing to watchlist
        $streamingUrls = [
            'album_url' => null,
            'album_id' => null,
            'track_urls' => [], // video_id => track_url mapping
        ];

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
                $img = $this->resolveImage(null, $firstVideo->thumbnail_url, $firstVideo->video_id);
                if ($img) {
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
                // One shared album for the whole playlist — manual image overrides scraper
                $albumImage = $this->resolveImage(
                    $playlist->manual_image_url,
                    $playlist->videos[0]->thumbnail_url,
                    $playlist->videos[0]->video_id ?? null
                );
                $playlistYoutubeUrl = $playlist->playlist_url ?: ('https://www.youtube.com/playlist?list=' . $playlist->playlist_id);
                // Collect genres/tags from first video
                $first = $playlist->videos[0];
                $playlistGenres = !empty($first->genres) && is_array($first->genres) ? $first->genres : [];
                $playlistTags = !empty($first->tags) && is_array($first->tags) ? array_slice($first->tags, 0, 10) : [];

                // Ensure genres/tags exist on streaming platform
                $validated = $this->ensureStreamingGenresTagsExist($baseUrl, $token, $playlistGenres, $playlistTags);

                // Use first video's published date for album release date
                $albumReleaseDate = date('Y-m-d');
                if (!empty($first->published_at)) {
                    try {
                        $albumReleaseDate = \Carbon\Carbon::parse($first->published_at)->format('Y-m-d');
                    } catch (\Exception $e) {
                        Log::warning("Failed to parse album release date", ['published_at' => $first->published_at]);
                    }
                }

                $albumPayload = [
                    'name' => $playlist->title,
                    'image' => $albumImage,
                    'release_date' => $albumReleaseDate,
                    'artists' => [$artistId],
                    'genres' => $validated['genres'],
                    'tags' => $validated['tags'],
                    'youtube_url' => $playlistYoutubeUrl,
                    'metadata' => [
                        'source' => 'youtube',
                        'playlist_id' => $playlist->playlist_id,
                    ],
                ];

                $existingAlbumId = $options['existing_album_id'] ?? null;
                if ($existingAlbumId) {
                    $singleAlbumId = $existingAlbumId;
                    Log::info("Reusing provided album ID", ['album_id' => $singleAlbumId]);
                } else {
                    // First, search for existing album by name using by-name endpoint
                    $singleAlbumId = null;
                    try {
                        // Try direct by-name endpoint first (more efficient)
                        $albumSlug = \Illuminate\Support\Str::slug($playlist->title);
                        $byNameResponse = $this->makePlatformRequest($baseUrl, $token, 'GET', "albums/by-name/{$albumSlug}");

                        if ($byNameResponse->successful()) {
                            $albumData = $byNameResponse->json()['album'] ?? $byNameResponse->json()['data'] ?? null;
                            if ($albumData) {
                                $singleAlbumId = $albumData['id'] ?? null;
                                if ($singleAlbumId) {
                                    Log::info("Found existing album on streaming platform (by-name)", [
                                        'album_id' => $singleAlbumId,
                                        'album_name' => $playlist->title,
                                        'method' => 'by-name'
                                    ]);
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        Log::info("Album by-name search failed, trying search endpoint", ['error' => $e->getMessage()]);
                    }

                    // Fallback to search endpoint if by-name didn't work
                    if (!$singleAlbumId) {
                        try {
                            $searchResponse = $this->makePlatformRequest($baseUrl, $token, 'GET', 'albums/search', ['query' => $playlist->title]);
                            if ($searchResponse->successful()) {
                                $albums = $searchResponse->json()['data'] ?? $searchResponse->json()['albums'] ?? [];
                                foreach ($albums as $album) {
                                    $albumName = $album['name'] ?? $album['album']['name'] ?? '';
                                    if (trim(strtolower($albumName)) === trim(strtolower($playlist->title))) {
                                        $singleAlbumId = $album['id'] ?? $album['album']['id'] ?? null;
                                        Log::info("Found existing album on streaming platform (search)", [
                                            'album_id' => $singleAlbumId,
                                            'album_name' => $albumName,
                                            'method' => 'search'
                                        ]);
                                        break;
                                    }
                                }
                            }
                        } catch (\Exception $e) {
                            Log::warning("Album search failed, will create new album", ['error' => $e->getMessage()]);
                        }
                    }

                    // If no existing album found, create new one
                    if (!$singleAlbumId) {
                        $albumResponse = $this->makePlatformRequest($baseUrl, $token, 'POST', 'albums', $albumPayload);
                        $singleAlbumId = $albumResponse->json()['album']['id'] ?? $albumResponse->json()['id'] ?? $albumResponse->json()['data']['id'] ?? $albumResponse->json()['data']['album']['id'] ?? null;

                        if ($singleAlbumId) {
                            Log::info("Created new album on streaming platform", [
                                'album_id' => $singleAlbumId,
                                'album_name' => $playlist->title
                            ]);
                        } else {
                            throw new \Exception("Failed to create album. Response: " . substr($albumResponse->body(), 0, 200));
                        }
                    }
                }

                // Capture album URL for watchlist (frontend URL, not API)
                if ($singleAlbumId) {
                    $streamingUrls['album_id'] = $singleAlbumId;
                    // Get artist name from first video's channel
                    $artistName = $playlist->videos[0]->channel_name ?? 'Artist';
                    $streamingUrls['album_url'] = $this->buildStreamingFrontendUrl(
                        $baseUrl,
                        'album',
                        $singleAlbumId,
                        $playlist->title,
                        $artistName
                    );
                    Log::info("Album frontend URL built", ['url' => $streamingUrls['album_url']]);
                }
            }

            // Step 3: Tracks — full payload (image, release_date, description, duration in ms)
            $results = ['success' => 0, 'failed' => 0, 'skipped' => 0];
            $trackErrors = [];
            $existingTracks = [];

            // If check_existing is enabled, fetch existing tracks from album
            $checkExisting = $options['check_existing'] ?? false;
            if ($checkExisting && $singleAlbumId) {
                try {
                    $albumTracksResponse = $this->makePlatformRequest($baseUrl, $token, 'GET', "albums/{$singleAlbumId}");
                    if ($albumTracksResponse->successful()) {
                        $albumData = $albumTracksResponse->json();
                        $tracks = $albumData['album']['tracks'] ?? $albumData['tracks'] ?? $albumData['data']['tracks'] ?? [];

                        // Build a map of existing track names (normalized for comparison)
                        foreach ($tracks as $track) {
                            $trackName = $track['name'] ?? '';
                            if ($trackName) {
                                $existingTracks[] = strtolower(trim($trackName));
                            }
                        }

                        Log::info("Fetched existing tracks from album", [
                            'album_id' => $singleAlbumId,
                            'existing_tracks_count' => count($existingTracks)
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::warning("Failed to fetch existing tracks from album", [
                        'album_id' => $singleAlbumId,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            foreach ($playlist->videos as $video) {
                // Check if track already exists in album
                if ($checkExisting && !empty($existingTracks)) {
                    $videoTitleNormalized = strtolower(trim($video->title ?? ''));
                    if (in_array($videoTitleNormalized, $existingTracks)) {
                        $results['skipped']++;
                        Log::info("Skipping video - track already exists in album", [
                            'video_id' => $video->video_id,
                            'title' => $video->title,
                            'album_id' => $singleAlbumId ?? 'N/A'
                        ]);

                        // Still mark as success in database since it exists on platform
                        \App\Models\YoutubePlatformPush::updateOrCreate(
                            [
                                'video_id' => $video->video_id,
                                'playlist_id' => $playlist->playlist_id,
                                'platform_name' => $platform->name,
                            ],
                            [
                                'push_type' => 'streaming',
                                'status' => 'success',
                                'pushed_at' => now(),
                                'platform_album_id' => $singleAlbumId ?? null,
                            ]
                        );
                        continue;
                    }
                }


                $durationMs = $this->convertDurationToMs($video->duration ?? 'PT0S');
                if ($durationMs < 1000) {
                    $durationMs = 60000;
                }
                $trackImage = $this->resolveImage(
                    $video->manual_image_url,
                    $video->thumbnail_url,
                    $video->video_id
                );

                // Use video's published date as track release date
                $trackReleaseDate = date('Y-m-d');
                if (!empty($video->published_at)) {
                    try {
                        $trackReleaseDate = \Carbon\Carbon::parse($video->published_at)->format('Y-m-d');
                    } catch (\Exception $e) {
                        Log::warning("Failed to parse track release date", [
                            'video_id' => $video->video_id,
                            'published_at' => $video->published_at
                        ]);
                    }
                }

                $trackPayload = [
                    'name' => $video->title ?? 'YouTube Video',
                    'release_date' => $trackReleaseDate,
                    'image' => $trackImage,
                    'duration' => $durationMs,
                    // API docs expect an array of artist IDs
                    'artists' => [$artistId],
                ];

                // Decide album for this video
                if ($albumMode === 'single') {
                    $albumIdForTrack = $singleAlbumId;
                } else {
                    // One album per video: create (or reuse) album based on video title
                    // Ensure genres/tags exist for this video's album
                    $videoGenres = $video->genres ?? [];
                    $videoTags = is_array($video->tags ?? null) ? array_slice($video->tags, 0, 10) : [];
                    $videoValidated = $this->ensureStreamingGenresTagsExist($baseUrl, $token, $videoGenres, $videoTags);

                    // Use video's published date for per-video album
                    $videoAlbumReleaseDate = $trackReleaseDate; // Reuse the same date we calculated for track

                    $videoAlbumPayload = [
                        'name' => $video->title ?? $playlist->title,
                        'image' => $trackImage,
                        'release_date' => $videoAlbumReleaseDate,
                        'artists' => [$artistId],
                        'genres' => $videoValidated['genres'],
                        'tags' => $videoValidated['tags'],
                        'youtube_url' => $video->video_url ?: ('https://www.youtube.com/watch?v=' . $video->video_id),
                        'metadata' => [
                            'source' => 'youtube',
                            'playlist_id' => $playlist->playlist_id,
                            'video_id' => $video->video_id,
                        ],
                    ];

                    // Search for existing album by video title using by-name endpoint
                    $albumIdForTrack = null;
                    $videoAlbumName = $video->title ?? $playlist->title;

                    // Try direct by-name endpoint first
                    try {
                        $videoSlug = \Illuminate\Support\Str::slug($videoAlbumName);
                        $byNameResponse = $this->makePlatformRequest($baseUrl, $token, 'GET', "albums/by-name/{$videoSlug}");

                        if ($byNameResponse->successful()) {
                            $albumData = $byNameResponse->json()['album'] ?? $byNameResponse->json()['data'] ?? null;
                            if ($albumData) {
                                $albumIdForTrack = $albumData['id'] ?? null;
                                if ($albumIdForTrack) {
                                    Log::info("Found existing per-video album (by-name)", [
                                        'album_id' => $albumIdForTrack,
                                        'video_id' => $video->video_id,
                                        'method' => 'by-name'
                                    ]);
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        Log::info("Per-video album by-name failed, trying search", ['video_id' => $video->video_id]);
                    }

                    // Fallback to search endpoint
                    if (!$albumIdForTrack) {
                        try {
                            $searchResponse = $this->makePlatformRequest($baseUrl, $token, 'GET', 'albums/search', ['query' => $videoAlbumName]);
                            if ($searchResponse->successful()) {
                                $albums = $searchResponse->json()['data'] ?? $searchResponse->json()['albums'] ?? [];
                                foreach ($albums as $album) {
                                    $albumName = $album['name'] ?? $album['album']['name'] ?? '';
                                    if (trim(strtolower($albumName)) === trim(strtolower($videoAlbumName))) {
                                        $albumIdForTrack = $album['id'] ?? $album['album']['id'] ?? null;
                                        Log::info("Found existing per-video album (search)", [
                                            'album_id' => $albumIdForTrack,
                                            'video_id' => $video->video_id,
                                            'method' => 'search'
                                        ]);
                                        break;
                                    }
                                }
                            }
                        } catch (\Exception $e) {
                            Log::warning("Per-video album search failed", ['video_id' => $video->video_id]);
                        }
                    }

                    // If no existing album found, create new one
                    if (!$albumIdForTrack) {
                        $albumResponse = $this->makePlatformRequest($baseUrl, $token, 'POST', 'albums', $videoAlbumPayload);
                        $albumIdForTrack = $albumResponse->json()['album']['id'] ?? $albumResponse->json()['id'] ?? $albumResponse->json()['data']['id'] ?? $albumResponse->json()['data']['album']['id'] ?? null;

                        if ($albumIdForTrack) {
                            Log::info("Created new per-video album", [
                                'album_id' => $albumIdForTrack,
                                'video_id' => $video->video_id
                            ]);
                        } else {
                            $results['failed']++;
                            Log::warning("Per-video album creation failed for: " . ($video->title ?? $video->video_id), [
                                'status' => $albumResponse->status(),
                                'body' => substr((string) $albumResponse->body(), 0, 500),
                            ]);
                            continue;
                        }
                    }

                    // In per_video mode, capture first video's album URL for watchlist title
                    if (empty($streamingUrls['album_url']) && $albumIdForTrack) {
                        $streamingUrls['album_id'] = $albumIdForTrack;
                        // Get artist name from video's channel
                        $videoArtistName = $video->channel_name ?? 'Artist';
                        $streamingUrls['album_url'] = $this->buildStreamingFrontendUrl(
                            $baseUrl,
                            'album',
                            $albumIdForTrack,
                            $video->title ?? $playlist->title,
                            $videoArtistName
                        );
                        Log::info("Per-video album frontend URL built", ['url' => $streamingUrls['album_url']]);
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

                    // Extract track ID from response
                    $trackJson = $trackRes->json();
                    $trackId = $trackJson['track']['id']
                        ?? $trackJson['data']['track']['id']
                        ?? $trackJson['data']['id']
                        ?? $trackJson['id']
                        ?? null;

                    // Capture track URL for watchlist (frontend URL, not API)
                    if ($trackId) {
                        $streamingUrls['track_urls'][$video->video_id] = $this->buildStreamingFrontendUrl(
                            $baseUrl,
                            'track',
                            $trackId,
                            $video->title ?? 'YouTube Video'
                        );
                        Log::info("Track frontend URL built", [
                            'video_id' => $video->video_id,
                            'url' => $streamingUrls['track_urls'][$video->video_id]
                        ]);
                    }

                    \App\Models\YoutubePlatformPush::updateOrCreate(
                        [
                            'video_id' => $video->video_id,
                            'playlist_id' => $playlist->playlist_id,
                            'platform_name' => $platform->name,
                        ],
                        [
                            'push_type' => 'streaming',
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
                    'streaming_urls' => $streamingUrls,
                ];
            }

            $skippedMsg = $results['skipped'] > 0
                ? " ({$results['skipped']} already exist)"
                : "";

            Log::info("Streaming push complete - URLs captured", [
                'album_url' => $streamingUrls['album_url'],
                'track_count' => count($streamingUrls['track_urls']),
                'total_success' => $results['success'],
                'total_skipped' => $results['skipped']
            ]);

            return [
                'status' => 'success',
                'message' => "Successfully pushed {$results['success']} tracks to streaming: {$playlist->title}{$skippedMsg}",
                'details' => $results,
                'streaming_urls' => $streamingUrls,
            ];
        } catch (\Exception $e) {
            Log::error("Streaming Push Error: " . $e->getMessage());
            return ['status' => 'error', 'message' => $e->getMessage(), 'streaming_urls' => $streamingUrls];
        }
    }

    protected function syncPlaylistToWatchlist($playlist, $platform, array $streamingUrls = []): array
    {
        try {
            Log::info("Syncing to Watchlist platform via helper: {$platform->name}");

            // Extract streaming URLs if provided
            $albumUrl = $streamingUrls['album_url'] ?? null;
            $trackUrls = $streamingUrls['track_urls'] ?? [];

            Log::info("Watchlist sync - Streaming URLs received", [
                'album_url' => $albumUrl,
                'track_count' => count($trackUrls),
                'has_streaming_urls' => !empty($streamingUrls)
            ]);

            $helper = new WatchlistSyncHelper([
                'api_url' => $platform->base_url,
                'token'   => $platform->api_token,
            ]);

            $firstVideo = $playlist->videos->first();

            // === STEP 0: Resolve title image (manual override → scraper auto) ===
            $titleImage = $this->resolveImage(
                $playlist->manual_image_url,
                $firstVideo->thumbnail_url ?? null,
                $firstVideo->video_id ?? null
            );

            // === STEP 1: Create/Get Person (channel_name → People entity) ===
            $channelName = trim($firstVideo->channel_name ?? '');
            $personId = null;

            if (!empty($channelName)) {
                $personPayload = [
                    'name'        => $channelName,
                    'description' => "YouTube content creator: {$channelName}",
                    'poster'      => $titleImage,
                    'known_for'   => 'creating',
                ];
                $personId = $helper->createOrGetPerson($personPayload);
                Log::info("Watchlist person resolved", [
                    'channel'   => $channelName,
                    'person_id' => $personId,
                ]);
            }

            // === STEP 2: Collect deduplicated genres/tags from all videos ===
            $allGenres = [];
            $allTags = [];
            foreach ($playlist->videos as $video) {
                $allGenres = array_merge($allGenres, $video->genres ?? []);
                $allTags = array_merge($allTags, $video->tags ?? []);
            }
            $allGenres = array_values(array_unique($allGenres));
            $allTags = array_values(array_unique(array_slice($allTags, 0, 20)));

            // === STEP 3: Create/Get Title ===
            $playlistYoutubeUrl = $playlist->playlist_url ?: ('https://www.youtube.com/playlist?list=' . $playlist->playlist_id);

            // Use first video's published date as title release date
            $titleReleaseDate = null;
            if (!empty($firstVideo->published_at)) {
                try {
                    $titleReleaseDate = \Carbon\Carbon::parse($firstVideo->published_at)->format('Y-m-d');
                } catch (\Exception $e) {
                    Log::warning("Failed to parse title release date", ['published_at' => $firstVideo->published_at]);
                }
            }

            $titlePayload = [
                'name'        => $playlist->title,
                'is_series'   => true,
                'description' => $playlist->description,
                'poster'      => $titleImage,
                'youtube_url' => $playlistYoutubeUrl,
            ];

            if ($titleReleaseDate) {
                $titlePayload['release_date'] = $titleReleaseDate;
            }

            // Add streaming album URL if available
            if ($albumUrl) {
                $titlePayload['stream_url'] = $albumUrl;
                Log::info("Adding streaming album URL to watchlist title", ['album_url' => $albumUrl]);
            }

            $titleId = $helper->createOrGetTitle($titlePayload);

            if (!$titleId) {
                throw new \Exception("Failed to create/get title on Watchlist platform.");
            }

            // === STEP 4: Attach Person as credit to Title ===
            if ($personId) {
                $helper->attachPersonToTitle($titleId, $personId);

                // Cache person ID per platform for re-push efficiency
                $cachedPersonIds = $playlist->watchlist_person_ids ?? [];
                $cachedPersonIds[$platform->name] = $personId;
                $playlist->update(['watchlist_person_ids' => $cachedPersonIds]);
            }

            // === STEP 5: Attach genres/tags to title if API supports it ===
            if (!empty($allGenres) || !empty($allTags)) {
                try {
                    $tagPayload = [];
                    if (!empty($allGenres)) {
                        $tagPayload['genres'] = $allGenres;
                    }
                    if (!empty($allTags)) {
                        $tagPayload['tags'] = $allTags;
                    }
                    $helper->updateTitleTags($titleId, $tagPayload);
                } catch (\Throwable $e) {
                    Log::warning("Watchlist: genres/tags attachment failed (non-fatal)", [
                        'title_id' => $titleId,
                        'error'    => $e->getMessage(),
                    ]);
                }
            }

            // === STEP 6: Create Episodes with resolved images ===
            $results = ['success' => 0, 'failed' => 0, 'skipped' => 0];
            $episodesPayload = [];
            $videoIndexMap = []; // episode index → video model

            foreach ($playlist->videos->values() as $index => $video) {
                $episodeImage = $this->resolveImage(
                    $video->manual_image_url,
                    $video->thumbnail_url,
                    $video->video_id
                );
                $videoYoutubeUrl = $video->video_url ?: ('https://www.youtube.com/watch?v=' . $video->video_id);

                // Parse episode release date from video's published_at
                $episodeReleaseDate = null;
                if (!empty($video->published_at)) {
                    try {
                        $episodeReleaseDate = \Carbon\Carbon::parse($video->published_at)->format('Y-m-d');
                    } catch (\Exception $e) {
                        Log::warning("Failed to parse episode release date", [
                            'video_id' => $video->video_id,
                            'published_at' => $video->published_at
                        ]);
                    }
                }

                $episodeData = [
                    'name'           => $video->title,
                    'episode_number' => $index + 1,
                    'description'    => $video->description,
                    'poster'         => $episodeImage,
                    'youtube_url'    => $videoYoutubeUrl,
                ];

                if ($episodeReleaseDate) {
                    $episodeData['release_date'] = $episodeReleaseDate;
                }

                // Add streaming track URL if available
                if (isset($trackUrls[$video->video_id])) {
                    $episodeData['stream_url'] = $trackUrls[$video->video_id];
                    Log::info("Adding streaming track URL to episode", [
                        'video_id' => $video->video_id,
                        'track_url' => $trackUrls[$video->video_id]
                    ]);
                }

                $episodesPayload[] = $episodeData;
                $videoIndexMap[$index] = $video;
            }

            $episodeIds = $helper->createEpisodes($titleId, $episodesPayload);

            // === STEP 7: Add to Watchlist ===
            $added = $helper->addToWatchlist($titleId, $episodeIds);

            // === STEP 8: Track each video push with per-video status ===
            foreach ($playlist->videos->values() as $index => $video) {
                $episodeCreated = isset($episodeIds[$index]);
                \App\Models\YoutubePlatformPush::updateOrCreate(
                    [
                        'video_id'      => $video->video_id,
                        'playlist_id'   => $playlist->playlist_id,
                        'platform_name' => $platform->name,
                    ],
                    [
                        'push_type'          => 'watchlist',
                        'status'             => $episodeCreated ? 'success' : 'failed',
                        'error_message'      => $episodeCreated ? null : 'Episode creation failed or skipped',
                        'pushed_at'          => $episodeCreated ? now() : null,
                        'platform_album_id'  => $titleId,
                        'platform_person_id' => $personId,
                    ]
                );
                if ($episodeCreated) {
                    $results['success']++;
                } else {
                    $results['failed']++;
                }
            }

            return [
                'status'  => 'success',
                'message' => 'Playlist synced to Watchlist with Person entity.',
                'details' => [
                    'success'            => $results['success'],
                    'failed'             => $results['failed'],
                    'title_id'           => $titleId,
                    'person_id'          => $personId,
                    'episodes_created'   => count($episodeIds),
                    'genres_attached'    => count($allGenres),
                    'tags_attached'      => count($allTags),
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
        if (empty($title) && empty($description)) {
            return [];
        }

        $key = Config::get('services.mistral.key') ?: $this->mistralApiKey;
        if (empty($key)) {
            Log::info("Mistral API key not configured, using fallback tag extraction");
            return $this->extractStructuredTags($title, $description);
        }

        try {
            $prompt = "Given the following YouTube video title and description, generate exactly 3 relevant tags for this video, separated by a vertical bar (|), following this structure:

1. Content type (e.g., 'Music', 'Gaming', 'Education', 'Technology', 'Comedy', 'Entertainment', 'Cooking', 'Travel', 'Sports', 'Health', 'Beauty', 'DIY', 'Documentary', 'Review')
2. Specific focus (e.g., 'Tutorial', 'Review', 'Gameplay', 'Interview', 'Recipe', 'Workout', 'Makeup', 'Crafting', 'Analysis')
3. One-word summary (e.g., 'entertainment', 'educational', 'interactive', 'informative', 'creative', 'competitive', 'relaxing', 'inspiring')

Rules:
- DO NOT use generic words like 'video', 'content', 'media', 'the', 'how to' as tags.
- Each tag must be concise (1-3 words), descriptive, and relevant to the actual content.
- Focus on what makes this video unique and searchable.
- Output format: ContentType | Focus | OneWordSummary (no extra text, no numbers, no explanations)

Title: {$title}
Description: " . substr($description, 0, 500) . "

IMPORTANT: Respond with ONLY the tags in the format \"Tag1 | Tag2 | Tag3\" - no explanations, no additional text, just the three tags separated by vertical bars.

Tags:";

            $content = $this->callMistral($prompt, 'mistral-large-latest');
            if ($content) {
                $cleanContent = trim($content);

                // Remove any prompt text that might be included
                if (stripos($cleanContent, 'Title:') !== false || stripos($cleanContent, 'Description:') !== false) {
                    $tagsIndex = strripos($cleanContent, 'Tags:');
                    if ($tagsIndex !== false) {
                        $cleanContent = trim(substr($cleanContent, $tagsIndex + 5));
                    }
                }

                // Remove any explanatory text after newline
                if (strpos($cleanContent, "\n") !== false) {
                    $cleanContent = trim(explode("\n", $cleanContent)[0]);
                }

                // Split on | and filter
                $newTags = array_map('trim', explode('|', $cleanContent));
                $newTags = array_filter($newTags, function($tag) {
                    return strlen($tag) > 0 && strlen($tag) < 50 &&
                           !stripos($tag, 'generate') &&
                           !stripos($tag, 'title:') &&
                           !stripos($tag, 'description:');
                });

                // Validate: should be exactly 3 tags
                if (count($newTags) === 3) {
                    return array_values($newTags);
                }

                Log::warning("Invalid AI response for tags, using fallback", ['tags' => $newTags]);
            }

            // Fallback to structured extraction
            return $this->extractStructuredTags($title, $description);
        } catch (\Exception $e) {
            Log::error("Error generating tags: " . $e->getMessage());
            return $this->extractStructuredTags($title, $description);
        }
    }

    /**
     * Fallback structured tag extraction using rule-based detection
     */
    protected function extractStructuredTags(string $title, string $description): array
    {
        $text = strtolower($title . ' ' . $description);

        $contentTypes = [
            'Music' => ['music', 'song', 'album', 'artist', 'band', 'concert', 'lyrics', 'cover', 'remix', 'track'],
            'Gaming' => ['game', 'gaming', 'gameplay', 'player', 'level', 'boss', 'rpg', 'fps', 'strategy', 'walkthrough'],
            'Education' => ['learn', 'tutorial', 'how to', 'explained', 'lesson', 'course', 'study', 'guide', 'education'],
            'Technology' => ['tech', 'software', 'hardware', 'computer', 'phone', 'app', 'code', 'programming', 'review'],
            'Comedy' => ['funny', 'comedy', 'humor', 'jokes', 'laugh', 'meme', 'parody', 'satire', 'sketch'],
            'Entertainment' => ['entertainment', 'show', 'celebrity', 'news', 'gossip', 'drama', 'reality', 'interview'],
            'Cooking' => ['recipe', 'cooking', 'food', 'kitchen', 'chef', 'baking', 'meal', 'cuisine', 'cook'],
            'Travel' => ['travel', 'vacation', 'trip', 'destination', 'tour', 'adventure', 'explore', 'traveling'],
            'Sports' => ['sport', 'game', 'match', 'team', 'player', 'football', 'basketball', 'soccer', 'athletics'],
            'Health' => ['health', 'fitness', 'workout', 'exercise', 'nutrition', 'diet', 'wellness', 'training'],
            'Beauty' => ['beauty', 'makeup', 'skincare', 'fashion', 'style', 'hair', 'cosmetics'],
            'DIY' => ['diy', 'craft', 'handmade', 'project', 'build', 'make', 'create', 'homemade', 'crafting'],
            'Documentary' => ['documentary', 'investigation', 'true story', 'real life', 'history', 'fact'],
            'Review' => ['review', 'unboxing', 'test', 'comparison', 'rating', 'opinion', 'verdict']
        ];

        $detectedType = 'Entertainment'; // Default
        foreach ($contentTypes as $type => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($text, $keyword)) {
                    $detectedType = $type;
                    break 2;
                }
            }
        }

        $tagMap = [
            'Music' => ['Music', 'Audio', 'Entertainment'],
            'Gaming' => ['Gaming', 'Entertainment', 'Interactive'],
            'Education' => ['Education', 'Learning', 'Tutorial'],
            'Technology' => ['Technology', 'Tech', 'Review'],
            'Comedy' => ['Comedy', 'Humor', 'Entertainment'],
            'Entertainment' => ['Entertainment', 'Show', 'Media'],
            'Cooking' => ['Cooking', 'Food', 'Recipe'],
            'Travel' => ['Travel', 'Adventure', 'Exploration'],
            'Sports' => ['Sports', 'Athletics', 'Competition'],
            'Health' => ['Health', 'Fitness', 'Wellness'],
            'Beauty' => ['Beauty', 'Fashion', 'Lifestyle'],
            'DIY' => ['DIY', 'Crafting', 'Creative'],
            'Documentary' => ['Documentary', 'Educational', 'Factual'],
            'Review' => ['Review', 'Analysis', 'Opinion'],
        ];

        return $tagMap[$detectedType] ?? ['Entertainment', 'Media', 'Content'];
    }

    public function generateGenresOnly(string $title, string $description = '', string $channelName = ''): array
    {
        if (empty($title)) {
            return [];
        }

        $key = Config::get('services.mistral.key') ?: $this->mistralApiKey;
        if (empty($key)) {
            Log::info("Mistral API key not configured, using fallback genre detection");
            return $this->generateBasicGenres($title, $channelName, $description);
        }

        try {
            $prompt = "Given a YouTube video with the following details:
Title: {$title}
Channel: {$channelName}
Description: " . substr($description, 0, 500) . "

Please generate 3-5 relevant genres for this video content. Consider:
1. Content type (Educational, Entertainment, Music, Gaming, Tech, etc.)
2. Format (Tutorial, Review, Vlog, Comedy, etc.)
3. Subject matter (Science, History, Pop Culture, etc.)
4. Target audience (Kids, Adults, Professionals, etc.)

Common genres include: Education, Entertainment, Music, Gaming, Technology, Comedy, Drama, Action, Documentary, Tutorial, Review, Vlog, News, Sports, Travel, Cooking, Health, Fitness, Beauty, Fashion, DIY, Art, Science, History, Politics, Business, Finance, Self-help, Motivation, Kids, Family, Horror, Thriller, Romance, Animation, Podcast.

Return only the genres as a comma-separated list, without explanations or additional text. Maximum 5 genres.";

            $content = $this->callMistral($prompt, 'mistral-large-latest');
            if ($content) {
                $genres = array_map('trim', explode(',', $content));
                $genres = array_filter($genres, function($genre) {
                    return strlen($genre) > 0 && strlen($genre) < 50;
                });
                $genres = array_slice($genres, 0, 5);

                if (count($genres) > 0) {
                    return array_values($genres);
                }
            }

            // Fallback to basic genre detection
            return $this->generateBasicGenres($title, $channelName, $description);
        } catch (\Exception $e) {
            Log::error("Error generating genres: " . $e->getMessage());
            return $this->generateBasicGenres($title, $channelName, $description);
        }
    }

    /**
     * Fallback basic genre detection from title, channel name, and description
     */
    protected function generateBasicGenres(string $title, string $channelName = '', string $description = ''): array
    {
        $content = strtolower($title . ' ' . $channelName . ' ' . $description);
        $genres = [];

        $genreKeywords = [
            'Music' => ['music', 'song', 'album', 'artist', 'band', 'concert', 'lyrics', 'cover', 'remix'],
            'Gaming' => ['game', 'gaming', 'gameplay', 'player', 'level', 'boss', 'rpg', 'fps', 'strategy'],
            'Education' => ['learn', 'tutorial', 'how to', 'explained', 'lesson', 'course', 'study', 'guide'],
            'Technology' => ['tech', 'software', 'hardware', 'computer', 'phone', 'app', 'code', 'programming'],
            'Comedy' => ['funny', 'comedy', 'humor', 'jokes', 'laugh', 'meme', 'parody', 'satire'],
            'Entertainment' => ['entertainment', 'show', 'celebrity', 'news', 'gossip', 'drama', 'reality'],
            'Cooking' => ['recipe', 'cooking', 'food', 'kitchen', 'chef', 'baking', 'meal', 'cuisine'],
            'Travel' => ['travel', 'vacation', 'trip', 'destination', 'tour', 'adventure', 'explore'],
            'Sports' => ['sport', 'game', 'match', 'team', 'player', 'football', 'basketball', 'soccer'],
            'Health' => ['health', 'fitness', 'workout', 'exercise', 'nutrition', 'diet', 'wellness'],
            'Beauty' => ['beauty', 'makeup', 'skincare', 'fashion', 'style', 'hair', 'cosmetics'],
            'DIY' => ['diy', 'craft', 'handmade', 'project', 'build', 'make', 'create', 'homemade'],
            'Documentary' => ['documentary', 'investigation', 'true story', 'real life', 'history', 'fact'],
            'Review' => ['review', 'unboxing', 'test', 'comparison', 'rating', 'opinion', 'verdict']
        ];

        foreach ($genreKeywords as $genre => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($content, $keyword)) {
                    $genres[] = $genre;
                    break;
                }
            }
        }

        if (empty($genres)) {
            $genres[] = 'Entertainment';
        }

        return array_slice(array_unique($genres), 0, 3);
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

    public function bulkUpdateMetadata(string $playlistId, array $tags, array $genres, bool $replace = true): int
    {
        $playlist = YoutubePlaylist::where('playlist_id', $playlistId)->first();
        if (!$playlist)
            return 0;

        $videos = YoutubeVideo::where('playlist_id', $playlist->playlist_id)->get();
        $count = 0;

        foreach ($videos as $video) {
            $update = [];

            // 🏷️ TAGS UPDATE
            if (!empty($tags)) {
                if ($replace) {
                    // Replace mode: Overwrite all existing tags
                    $update['tags'] = $tags;
                } else {
                    // Merge mode: Keep existing and add new
                    $existingTags = $video->tags ?? [];
                    $update['tags'] = array_values(array_unique(array_merge($existingTags, $tags)));
                }
            }

            // 🎭 GENRES UPDATE
            if (!empty($genres)) {
                if ($replace) {
                    // Replace mode: Overwrite all existing genres
                    $update['genres'] = $genres;
                } else {
                    // Merge mode: Keep existing and add new
                    $existingGenres = $video->genres ?? [];
                    $update['genres'] = array_values(array_unique(array_merge($existingGenres, $genres)));
                }
            }

            // Only update if there's something to update
            if (!empty($update)) {
                $update['tags_generated_at'] = now(); // Mark as manually updated
                $video->update($update);
                $count++;
            }
        }

        return $count;
    }

    /**
     * Resolve the best image URL using manual override > scraper thumbnail > YouTube CDN fallback.
     * Used by both streaming and watchlist push flows.
     */
    protected function resolveImage(?string $manualUrl, ?string $scraperUrl, ?string $videoId = null): ?string
    {
        if (!empty($manualUrl) && filter_var($manualUrl, FILTER_VALIDATE_URL)) {
            return $manualUrl;
        }

        if (!empty($scraperUrl) && filter_var($scraperUrl, FILTER_VALIDATE_URL)) {
            return $scraperUrl;
        }

        if (!empty($videoId)) {
            return "https://i.ytimg.com/vi/{$videoId}/hqdefault.jpg";
        }

        return null;
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
