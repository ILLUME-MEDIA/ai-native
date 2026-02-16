<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Models\AiDuty;
use App\Models\AiPlatform;
use App\Models\YoutubePlaylist;
use App\Models\YoutubeVideo;
use App\Models\YoutubePlatformPush;
use App\Services\AI\YouTubeScraperService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AiScraperController extends Controller
{
    public function __construct(protected YouTubeScraperService $scraperService)
    {
    }

    public function index()
    {
        return response()->json(
            YoutubePlaylist::query()
                ->select(['id', 'playlist_id', 'playlist_url', 'title', 'manual_image_url', 'metadata', 'video_count', 'last_fetched_at', 'created_at'])
                ->withCount('videos')
                ->latest()
                ->limit(100)
                ->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'playlist_url' => 'required|url',
            'max_results' => 'nullable|integer|min:1|max:10000',
        ]);
        $playlistId = $this->scraperService->extractPlaylistId($request->playlist_url);

        if (!$playlistId) {
            return response()->json(['error' => 'Invalid YouTube Playlist URL'], 422);
        }

        try {
            // Fetch ALL playlist data immediately (title, thumbnails, ALL videos)
            // Large playlists can take time – allow up to 15 minutes
            set_time_limit(900);

            $maxResults = (int) ($request->input('max_results', 5000));
            $playlistData = $this->scraperService->fetchPlaylist($playlistId, $maxResults);
            $playlist = $this->scraperService->syncToDatabase($playlistData);
            $this->ensurePlaylistSyncDutyExists($playlist);

            // Return the playlist with all data for immediate display
            return response()->json([
                'message' => 'Playlist added and synced successfully!',
                'playlist' => $playlist->fresh()->load('videos')->loadCount('videos'),
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function show(YoutubePlaylist $playlist)
    {
        return response()->json($playlist->load('videos'));
    }

    public function sync(YoutubePlaylist $playlist)
    {
        try {
            // Large re-syncs for big playlists – allow more execution time (15 minutes)
            set_time_limit(900);
            // Allow large re-syncs via API while keeping a sensible upper bound
            $playlistData = $this->scraperService->fetchPlaylist($playlist->playlist_id, 10000);
            $this->scraperService->syncToDatabase($playlistData);

            // Auto-enrich after sync to fill any missing stats (only YouTube stats, not AI)
            $enrichResult = $this->scraperService->enrichPlaylistVideos($playlist->playlist_id);

            return response()->json([
                'message' => 'Playlist synced successfully.',
                'enriched' => $enrichResult['enriched'] ?? 0,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function enrich(YoutubePlaylist $playlist)
    {
        // AI enrichment can take long for large playlists - allow 15 minutes
        set_time_limit(900);

        try {
            $result = $this->scraperService->enrichPlaylistVideos($playlist->playlist_id);

            if (!empty($result['error']) && $result['enriched'] === 0) {
                return response()->json(['error' => $result['error']], 422);
            }

            return response()->json([
                'message' => "Enriched {$result['enriched']}/{$result['total']} videos with YouTube metadata.",
                'details' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Remove playlist and all its videos (reset / delete).
     */
    public function destroy(YoutubePlaylist $playlist)
    {
        try {
            $title = $playlist->title ?? $playlist->playlist_id;

            // Delete related pushes and videos first, then the playlist itself.
            $playlist->load('videos.pushes');

            foreach ($playlist->videos as $video) {
                // Remove platform push tracking rows for this video
                if (method_exists($video, 'pushes')) {
                    $video->pushes()->delete();
                }
            }

            // Remove all videos belonging to this playlist
            $playlist->videos()->delete();

            // Finally remove the playlist row
            $playlist->delete();

            return response()->json([
                'message' => "Playlist \"{$title}\" and all its videos have been removed.",
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function push(Request $request, YoutubePlaylist $playlist)
    {
        set_time_limit(300);

        $request->validate([
            'platform_id' => 'nullable|exists:ai_platforms,id',
            'platform_ids' => 'array',
            'platform_ids.*' => 'integer|exists:ai_platforms,id',
            'video_ids' => 'array',
            'video_ids.*' => 'string',
            'limit' => 'integer|min:1',
            'create_duties' => 'boolean',
            'album_mode' => 'nullable|in:single,per_video',
        ]);

        try {
            // Determine which platforms to push to:
            // - If multiple selected (platform_ids), use those
            // - Otherwise fall back to single platform_id (legacy behaviour)
            $platformIds = collect($request->input('platform_ids', []))
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values();

            if ($platformIds->isEmpty() && $request->filled('platform_id')) {
                $platformIds = collect([(int) $request->platform_id]);
            }

            if ($platformIds->isEmpty()) {
                return response()->json([
                    'error' => 'At least one platform must be selected.',
                ], 422);
            }

            $createDuties = $request->boolean('create_duties', true);
            $albumMode = $request->input('album_mode', 'single');

            $overallDetails = [
                'success' => 0,
                'failed' => 0,
                'skipped' => 0,
            ];
            $platformResults = [];

            // Check if both streaming and watchlist platforms are selected
            $platforms = \App\Models\AiPlatform::whereIn('id', $platformIds)->get();
            $hasStreaming = $platforms->where('type', 'streaming')->isNotEmpty();
            $hasWatchlist = $platforms->where('type', 'watchlist')->isNotEmpty();
            $streamingUrls = [];

            // If both platforms selected, push to streaming first
            if ($hasStreaming && $hasWatchlist && count($platformIds) > 1) {
                // Reorder: streaming platforms first, then watchlist
                $streamingPlatforms = $platforms->where('type', 'streaming')->pluck('id')->toArray();
                $watchlistPlatforms = $platforms->where('type', 'watchlist')->pluck('id')->toArray();
                $platformIds = array_merge($streamingPlatforms, $watchlistPlatforms);
            }

            foreach ($platformIds as $platformId) {
                /** @var AiPlatform $platform */
                $platform = \App\Models\AiPlatform::findOrFail($platformId);

                // Determine which video IDs to push for THIS platform
                $options = ['album_mode' => $albumMode];
                $skippedForPlatform = 0;

                // Pass streaming URLs to watchlist if both platforms are selected
                if ($platform->type === 'watchlist' && !empty($streamingUrls)) {
                    $options['streaming_urls'] = $streamingUrls;
                }

                if ($request->filled('video_ids')) {
                    // Admin explicitly selected specific videos
                    $videoIds = $request->video_ids;
                } else {
                    // Get all videos from playlist (platform will check for duplicates)
                    $videoIds = $playlist->videos()->pluck('video_id')->toArray();

                    \Log::info("Preparing to push videos to platform: {$platform->name}", [
                        'playlist_id' => $playlist->playlist_id,
                        'total_videos' => count($videoIds),
                        'note' => 'Platform will skip videos that already exist as tracks'
                    ]);
                }

                // Apply explicit limit from request (admin-selected batch size)
                if ($request->filled('limit') && count($videoIds) > $request->limit) {
                    $skippedForPlatform += count($videoIds) - (int) $request->limit;
                    $videoIds = array_slice($videoIds, 0, (int) $request->limit);
                }

                if (empty($videoIds)) {
                    \Log::info("No videos in playlist for platform: {$platform->name}", [
                        'playlist_id' => $playlist->playlist_id,
                    ]);

                    $platformResults[$platform->name] = [
                        'status' => 'success',
                        'message' => 'No videos found in playlist.',
                        'details' => ['success' => 0, 'failed' => 0, 'skipped' => 0],
                    ];
                    continue;
                }

                // Pass check_existing flag to service to check platform for duplicates
                $options['only_video_ids'] = $videoIds;
                $options['check_existing'] = true;

                $result = $this->scraperService->pushToPlatform(
                    $playlist->playlist_id,
                    $platformId,
                    $options
                );

                // Capture streaming URLs if this was a streaming platform push
                if ($platform->type === 'streaming' && isset($result['streaming_urls'])) {
                    $streamingUrls = $result['streaming_urls'];
                    \Log::info("Captured streaming URLs for watchlist", ['streaming_urls' => $streamingUrls]);
                }

                // Ensure an automated duty exists for remaining videos (optional)
                if ($createDuties) {
                    $this->ensurePushDutyExists($playlist, $platform);
                }

                $details = $result['details'] ?? [];
                $detailsSuccess = $details['success'] ?? 0;
                $detailsFailed = $details['failed'] ?? 0;
                $detailsSkipped = $details['skipped'] ?? 0;

                $overallDetails['success'] += $detailsSuccess;
                $overallDetails['failed'] += $detailsFailed;
                $overallDetails['skipped'] += $detailsSkipped + $skippedForPlatform;

                // Merge back per-platform extra skipped count so UI can show it
                $result['details'] = array_merge($details, [
                    'success' => $detailsSuccess,
                    'failed' => $detailsFailed,
                    'skipped' => $detailsSkipped + $skippedForPlatform,
                ]);

                $platformResults[$platform->name] = $result;
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Push complete.',
                'details' => $overallDetails,
                'platform_results' => $platformResults,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create one automated sync duty per playlist (sync + new episodes tags/genres). No duplicate if same playlist added again.
     */
    protected function ensurePlaylistSyncDutyExists(YoutubePlaylist $playlist): void
    {
        $exists = AiDuty::where('metadata->playlist_id', $playlist->playlist_id)
            ->where('metadata->type', 'youtube_sync')
            ->exists();

        if ($exists) {
            return;
        }

        $baseUrl = config('app.url');
        AiDuty::create([
            'name' => "YouTube Sync: {$playlist->title}",
            'priority' => 85,
            'description' => "Syncs playlist from YouTube on schedule, generates tags/genres for new episodes only.",
            'instructions' => 'Automated sync duty: sync playlist, detect new videos, generate AI tags and genres for new only. Run via DutyExecutionService.',
            'schedule_type' => 'interval',
            'schedule_value' => 'every_1_hour',
            'execution_data' => [
                'playlist_id' => $playlist->playlist_id,
                'playlist_url' => $playlist->playlist_url,
                'playlist_title' => $playlist->title,
                'base_url' => $baseUrl,
            ],
            'is_active' => true,
            'metadata' => [
                'type' => 'youtube_sync',
                'playlist_id' => $playlist->playlist_id,
            ],
        ]);
    }

    protected function ensurePushDutyExists(YoutubePlaylist $playlist, AiPlatform $platform)
    {
        $dutyName = "YouTube: {$playlist->title} → {$platform->name}";

        // Check if duty already exists for this specific combination (no duplicate)
        $exists = AiDuty::where('metadata->playlist_id', $playlist->playlist_id)
            ->where('metadata->platform_id', $platform->id)
            ->where('metadata->type', 'platform_push')
            ->exists();

        if (!$exists) {
            $baseUrl = config('app.url');

            // Try to reuse the last known album ID for this playlist + platform so that
            // future automated pushes keep adding tracks into the same album.
            $lastAlbumId = YoutubePlatformPush::where('playlist_id', $playlist->playlist_id)
                ->where('platform_name', $platform->name)
                ->whereNotNull('platform_album_id')
                ->where('status', 'success')
                ->orderByDesc('pushed_at')
                ->value('platform_album_id');

            $instructions = "Execute the following steps COMPLETELY:

1. **Read execution data**: Extract from execution_data:
   - playlist_url: YouTube playlist URL
   - platform_name: Target platform name
   - base_url: Your site base URL

2. **Fetch playlist data using YouTube Scraper API**:
   - Use http_request tool to call: POST {base_url}/api/ai/scrapers/playlist
   - Body: {\"playlist_url\": \"{playlist_url}\"}
   - Extract all videos from the response

3. **Check existing episodes on platform**:
   - Use execute_query to check 'youtube_platform_pushes' table:
     - Query: SELECT video_id FROM youtube_platform_pushes WHERE platform_name = '{platform_name}' AND status = 'success'
   - Compare fetched videos with already pushed videos
   - Identify missing episodes (videos not yet pushed to platform)

4. **For each MISSING episode**:
   a. **Generate AI Tags using Mistral**:
      - Call: POST {base_url}/api/ai/scrapers/generate-tags
      - Body: {\"title\": \"{video_title}\", \"description\": \"{video_description}\"}
      - Extract tags from response
   
   b. **Generate AI Genres using Mistral**:
      - Call: POST {base_url}/api/ai/scrapers/generate-genres
      - Body: {\"title\": \"{video_title}\", \"description\": \"{video_description}\"}
      - Extract genres from response
   
   c. **Add tags and genres to video data**:
      - Merge tags and genres into video object

5. **Push missing episodes to platform**:
   - Group missing episodes by playlist
   - For each playlist group:
     - Call: POST {base_url}/api/ai/scrapers/{id}/push
     - Body: {
         \"platform_id\": {platform_id},
         \"album_mode\": \"single\",
         \"limit\": 50
       }
   - Verify response indicates success

6. **Store results in database**:
   - Data automatically stored by YouTube Scraper API in 'youtube_platform_pushes' table

7. **Report summary**:
   - Total videos in playlist
   - Number of missing episodes found
   - Number successfully pushed
   - Any errors encountered

IMPORTANT:
- Only push episodes that don't already exist on the platform
- Handle API errors gracefully
- Use http_request tool for all API calls";

            AiDuty::create([
                'name' => $dutyName,
                'priority' => 90,
                'description' => "Automatically syncs new episodes from YouTube playlist '{$playlist->title}' to {$platform->name} platform.",
                'instructions' => $instructions,
                'schedule_type' => 'interval',
                'schedule_value' => 'every_12_hours',
                'execution_data' => [
                    'playlist_url' => $playlist->playlist_url,
                    'platform_name' => $platform->name,
                    'base_url' => $baseUrl,
                    'playlist_id' => $playlist->playlist_id,
                    'playlist_title' => $playlist->title,
                    'platform_id' => $platform->id,
                    'tracking_table' => 'youtube_platform_pushes',
                    'platform_album_id' => $lastAlbumId,
                ],
                'is_active' => true,
                'metadata' => [
                    'type' => 'platform_push',
                    'playlist_id' => $playlist->playlist_id,
                    'platform_id' => $platform->id
                ]
            ]);
        }
    }

    public function playlistByUrl(Request $request)
    {
        $request->validate([
            'playlist_url' => 'required|url',
            'max_results' => 'nullable|integer|min:1|max:10000',
        ]);
        $playlistId = $this->scraperService->extractPlaylistId($request->playlist_url);

        if (!$playlistId) {
            return response()->json(['error' => 'Invalid URL'], 422);
        }

        try {
            $maxResults = (int) ($request->input('max_results', 5000));
            $data = $this->scraperService->fetchPlaylist($playlistId, $maxResults);
            return response()->json(['status' => 'success', 'playlist' => $data, 'videos' => $data['videos'] ?? []]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function generateTags(Request $request)
    {
        $request->validate(['title' => 'required|string']);
        $tags = $this->scraperService->generateTagsOnly($request->title, $request->description ?? '');
        return response()->json(['status' => 'success', 'tags' => $tags]);
    }

    public function generateGenres(Request $request)
    {
        $request->validate(['title' => 'required|string']);
        $genres = $this->scraperService->generateGenresOnly($request->title, $request->description ?? '');
        return response()->json(['status' => 'success', 'genres' => $genres]);
    }

    public function postToSite(Request $request)
    {
        $request->validate([
            'playlist_data' => 'required|array',
            'site_name' => 'required|string'
        ]);

        $platform = AiPlatform::where('name', $request->site_name)->firstOrFail();
        $playlistId = $this->scraperService->extractPlaylistId($request->playlist_data['playlistUrl'] ?? '');

        if (!$playlistId) {
            return response()->json(['error' => 'Playlist ID not found in data'], 422);
        }

        try {
            $result = $this->scraperService->pushToPlatform($playlistId, $platform->id);
            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function generateMetadataForVideo(Request $request, string $videoId)
    {
        try {
            // If genres are provided in request, use them directly (manual assignment)
            if ($request->has('genres')) {
                $video = \App\Models\YoutubeVideo::where('video_id', $videoId)->firstOrFail();
                $video->update([
                    'genres' => $request->genres,
                    'tags_generated_at' => now(),
                ]);
                return response()->json([
                    'status' => 'success',
                    'message' => 'Genres updated',
                    'genres' => $request->genres
                ]);
            }

            // Otherwise, generate using AI
            $metadata = $this->scraperService->generateMetadata($videoId);
            return response()->json(['status' => 'success', 'metadata' => $metadata]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function bulkUpdate(Request $request, YoutubePlaylist $playlist)
    {
        set_time_limit(300);

        $request->validate([
            'tags' => 'array',
            'genres' => 'array',
            'replace' => 'nullable|boolean', // true = overwrite, false = merge
        ]);

        try {
            // Default behavior: REPLACE (overwrite all AI/YouTube tags with manual ones)
            // Set replace=false to MERGE instead
            $replace = $request->boolean('replace', true);

            $count = $this->scraperService->bulkUpdateMetadata(
                $playlist->playlist_id,
                $request->tags ?? [],
                $request->genres ?? [],
                $replace
            );

            $message = $replace
                ? "Replaced tags/genres for {$count} videos (AI/YouTube tags removed)"
                : "Merged tags/genres for {$count} videos (AI/YouTube tags kept)";

            return response()->json([
                'status' => 'success',
                'updated_count' => $count,
                'message' => $message,
                'mode' => $replace ? 'replace' : 'merge',
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get platform-specific genre vocabularies for manual selection
     */
    public function getPlatformGenres()
    {
        $platformGenres = config('platform_genres');

        return response()->json([
            'status' => 'success',
            'platforms' => array_keys($platformGenres),
            'genres' => $platformGenres,
        ]);
    }

    /**
     * Batch generate tags and genres for all videos in a playlist using Mistral AI.
     * Uses the enhanced 3-tag structure and contextual genre generation.
     */
    public function batchGenerateMetadata(Request $request, YoutubePlaylist $playlist)
    {
        set_time_limit(600); // Allow up to 10 minutes for large playlists

        $request->validate([
            'video_ids' => 'nullable|array',
            'video_ids.*' => 'string',
            'force' => 'nullable|boolean', // Force regeneration even if already exists
        ]);

        try {
            $query = YoutubeVideo::where('playlist_id', $playlist->playlist_id);

            // Filter by specific video IDs if provided
            if ($request->filled('video_ids')) {
                $query->whereIn('video_id', $request->video_ids);
            }

            // Only generate for videos without tags/genres unless forced
            if (!$request->boolean('force')) {
                $query->where(function($q) {
                    $q->whereNull('tags_generated_at')
                      ->orWhereJsonLength('tags', 0)
                      ->orWhereJsonLength('genres', 0);
                });
            }

            $videos = $query->get();

            if ($videos->isEmpty()) {
                return response()->json([
                    'status' => 'success',
                    'message' => 'No videos need metadata generation',
                    'generated' => 0,
                    'total' => 0,
                ]);
            }

            $generated = 0;
            $failed = 0;
            $errors = [];

            foreach ($videos as $video) {
                try {
                    // Generate structured 3-tag system: ContentType | Focus | Summary
                    $tags = $this->scraperService->generateTagsOnly(
                        $video->title,
                        $video->description ?? ''
                    );

                    // Generate 3-5 contextual genres
                    $genres = $this->scraperService->generateGenresOnly(
                        $video->title,
                        $video->description ?? '',
                        $video->channel_name ?? ''
                    );

                    // Merge with existing if not forcing
                    if (!$request->boolean('force')) {
                        $existingTags = $video->tags ?? [];
                        $existingGenres = $video->genres ?? [];
                        $tags = array_values(array_unique(array_merge($existingTags, $tags)));
                        $genres = array_values(array_unique(array_merge($existingGenres, $genres)));
                    }

                    // Update video with AI-generated metadata
                    $video->update([
                        'tags' => $tags,
                        'genres' => $genres,
                        'tags_generated_at' => now(),
                    ]);

                    $generated++;
                } catch (\Exception $e) {
                    $failed++;
                    $errors[] = [
                        'video_id' => $video->video_id,
                        'title' => $video->title,
                        'error' => $e->getMessage(),
                    ];
                    \Log::warning("Failed to generate metadata for video {$video->video_id}: " . $e->getMessage());
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => "Generated tags and genres for {$generated}/{$videos->count()} videos",
                'generated' => $generated,
                'failed' => $failed,
                'total' => $videos->count(),
                'errors' => $errors,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Set a manual image URL or upload file for a playlist (overrides scraper image on both platforms).
     */
    public function uploadPlaylistImage(Request $request, YoutubePlaylist $playlist)
    {
        $imageUrl = null;

        // Mode 1: File upload
        if ($request->hasFile('image')) {
            $request->validate([
                'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:10240', // 10MB max
            ]);

            $file = $request->file('image');
            $filename = 'playlist_' . $playlist->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('public/scraper_images', $filename);
            $imageUrl = \Storage::url($path);
        }
        // Mode 2: URL input
        elseif ($request->filled('image_url')) {
            $request->validate([
                'image_url' => 'required|url',
            ]);
            $imageUrl = $request->image_url;
        } else {
            return response()->json(['error' => 'Provide either image file or image_url'], 422);
        }

        $playlist->update(['manual_image_url' => $imageUrl]);

        return response()->json([
            'status' => 'success',
            'message' => 'Manual image set for playlist. This will override the scraper image on next push to streaming and watchlist.',
            'image_url' => $imageUrl,
        ]);
    }

    /**
     * Remove manual image override for a playlist (reverts to scraper image).
     */
    public function removePlaylistImage(YoutubePlaylist $playlist)
    {
        $playlist->update(['manual_image_url' => null]);

        return response()->json([
            'status' => 'success',
            'message' => 'Manual image removed. Scraper image will be used on next push.',
        ]);
    }

    /**
     * Set a manual image URL or upload file for a specific video (overrides scraper image on both platforms).
     */
    public function uploadVideoImage(Request $request, string $videoId)
    {
        $video = YoutubeVideo::where('video_id', $videoId)->firstOrFail();
        $imageUrl = null;

        // Mode 1: File upload
        if ($request->hasFile('image')) {
            $request->validate([
                'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:10240', // 10MB max
            ]);

            $file = $request->file('image');
            $filename = 'video_' . $videoId . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('public/scraper_images', $filename);
            $imageUrl = \Storage::url($path);
        }
        // Mode 2: URL input
        elseif ($request->filled('image_url')) {
            $request->validate([
                'image_url' => 'required|url',
            ]);
            $imageUrl = $request->image_url;
        } else {
            return response()->json(['error' => 'Provide either image file or image_url'], 422);
        }

        $video->update(['manual_image_url' => $imageUrl]);

        return response()->json([
            'status' => 'success',
            'message' => 'Manual image set for video. This will override the scraper image on next push to streaming and watchlist.',
            'image_url' => $imageUrl,
        ]);
    }

    /**
     * Remove manual image override for a specific video (reverts to scraper image).
     */
    public function removeVideoImage(string $videoId)
    {
        $video = YoutubeVideo::where('video_id', $videoId)->firstOrFail();
        $video->update(['manual_image_url' => null]);

        return response()->json([
            'status' => 'success',
            'message' => 'Manual image removed. Scraper image will be used on next push.',
        ]);
    }

    public function videos(Request $request)
    {
        // Allow custom page size up to 1000 rows for power users
        $perPage = (int) ($request->per_page ?? 25);
        if ($perPage < 1) {
            $perPage = 1;
        } elseif ($perPage > 1000) {
            $perPage = 1000;
        }
        $sortBy = in_array($request->sort_by, [
            'title', 'duration', 'published_at', 'channel_name', 'created_at',
            'view_count', 'like_count', 'comment_count',
        ]) ? $request->sort_by : 'created_at';
        $sortDir = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = YoutubeVideo::query()
            ->select([
                'youtube_videos.id', 'youtube_videos.video_id', 'youtube_videos.playlist_id',
                'youtube_videos.title', 'youtube_videos.description', 'youtube_videos.channel_name',
                'youtube_videos.duration', 'youtube_videos.published_at', 'youtube_videos.thumbnail_url',
                'youtube_videos.thumbnail_animated_url', 'youtube_videos.manual_image_url',
                'youtube_videos.tags', 'youtube_videos.genres',
                'youtube_videos.view_count', 'youtube_videos.like_count', 'youtube_videos.comment_count',
                'youtube_videos.metadata', 'youtube_videos.created_at',
            ]);

        // Filter by playlist
        if ($request->filled('playlist_id')) {
            $query->where('youtube_videos.playlist_id', $request->playlist_id);
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('youtube_videos.title', 'like', "%{$search}%")
                  ->orWhere('youtube_videos.channel_name', 'like', "%{$search}%")
                  ->orWhere('youtube_videos.video_id', 'like', "%{$search}%");
            });
        }

        // Filter by push status
        if ($request->filled('status')) {
            $status = $request->status;
            if ($status === 'new') {
                $query->whereDoesntHave('pushes');
            } elseif ($status === 'pushed') {
                $query->whereHas('pushes', fn ($q) => $q->where('status', 'success'));
            } elseif ($status === 'failed') {
                $query->whereHas('pushes', fn ($q) => $q->where('status', 'failed'))
                      ->whereDoesntHave('pushes', fn ($q) => $q->where('status', 'success'));
            }
        }

        $query->orderBy("youtube_videos.{$sortBy}", $sortDir);

        $paginated = $query->paginate($perPage);

        // Attach push status to each video
        $videoIds = $paginated->getCollection()->pluck('video_id')->toArray();
        $pushStatuses = \App\Models\YoutubePlatformPush::whereIn('video_id', $videoIds)
            ->select('video_id', 'platform_name', 'status', 'pushed_at')
            ->get()
            ->groupBy('video_id');

        $paginated->getCollection()->transform(function ($video) use ($pushStatuses) {
            $pushes = $pushStatuses->get($video->video_id, collect());
            $hasSuccess = $pushes->where('status', 'success')->isNotEmpty();
            $hasFailed = $pushes->where('status', 'failed')->isNotEmpty();

            $video->push_status = $pushes->isEmpty() ? 'new' : ($hasSuccess ? 'pushed' : ($hasFailed ? 'failed' : 'pending'));
            $video->push_platforms = $pushes->where('status', 'success')->pluck('platform_name')->unique()->values();
            return $video;
        });

        return response()->json($paginated);
    }
}
