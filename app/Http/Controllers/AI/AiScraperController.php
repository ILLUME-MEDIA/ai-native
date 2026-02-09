<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Models\AiDuty;
use App\Models\AiPlatform;
use App\Models\YoutubePlaylist;
use App\Models\YoutubeVideo;
use App\Services\AI\YouTubeScraperService;
use Illuminate\Http\Request;

class AiScraperController extends Controller
{
    public function __construct(protected YouTubeScraperService $scraperService)
    {
    }

    public function index()
    {
        return response()->json(
            YoutubePlaylist::query()
                ->select(['id', 'playlist_id', 'playlist_url', 'title', 'last_fetched_at', 'created_at'])
                ->withCount('videos')
                ->latest()
                ->limit(100)
                ->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate(['playlist_url' => 'required|url']);
        $playlistId = $this->scraperService->extractPlaylistId($request->playlist_url);

        if (!$playlistId) {
            return response()->json(['error' => 'Invalid YouTube Playlist URL'], 422);
        }

        try {
            $playlistData = $this->scraperService->fetchPlaylist($playlistId);
            $playlist = $this->scraperService->syncToDatabase($playlistData);
            $this->ensurePlaylistSyncDutyExists($playlist);
            return response()->json(['message' => 'Playlist added and synced.']);
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
            $playlistData = $this->scraperService->fetchPlaylist($playlist->playlist_id);
            $this->scraperService->syncToDatabase($playlistData);
            return response()->json(['message' => 'Playlist synced successfully.']);
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
            $playlist->delete();
            return response()->json([
                'message' => "Playlist \"{$title}\" has been removed.",
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function push(Request $request, YoutubePlaylist $playlist)
    {
        set_time_limit(300); // Increase execution time to 5 minutes for large pushes

        $request->validate([
            'platform_id' => 'required|exists:ai_platforms,id'
        ]);

        try {
            $platform = AiPlatform::findOrFail($request->platform_id);

            // Trigger manual push first
            $result = $this->scraperService->pushToPlatform(
                $playlist->playlist_id,
                $request->platform_id
            );

            // After successful first push, ensure an automated duty exists for this specific playlist -> platform combo
            $this->ensurePushDutyExists($playlist, $platform);

            return response()->json($result);
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
         \"playlist_data\": {
           \"title\": \"{playlist_title}\",
           \"description\": \"{playlist_description}\",
           \"videos\": [array of missing videos with tags/genres],
           \"playlistUrl\": \"{playlist_url}\"
         },
         \"site_name\": \"{platform_name}\"
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
                    'tracking_table' => 'youtube_platform_pushes'
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
        $request->validate(['playlist_url' => 'required|url']);
        $playlistId = $this->scraperService->extractPlaylistId($request->playlist_url);

        if (!$playlistId) {
            return response()->json(['error' => 'Invalid URL'], 422);
        }

        try {
            $data = $this->scraperService->fetchPlaylist($playlistId);
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

    public function generateMetadataForVideo(string $videoId)
    {
        try {
            $metadata = $this->scraperService->generateMetadata($videoId);
            return response()->json(['status' => 'success', 'metadata' => $metadata]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function bulkUpdate(Request $request, string $playlistId)
    {
        set_time_limit(300); // Increase execution time for large bulk updates

        $request->validate([
            'tags' => 'array',
            'genres' => 'array'
        ]);

        try {
            $count = $this->scraperService->bulkUpdateMetadata(
                $playlistId,
                $request->tags ?? [],
                $request->genres ?? []
            );
            return response()->json(['status' => 'success', 'updated_count' => $count]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function videos()
    {
        return response()->json(
            YoutubeVideo::query()
                ->select([
                    'id', 'video_id', 'playlist_id', 'title', 'channel_name', 'duration',
                    'published_at', 'thumbnail_url', 'thumbnail_animated_url', 'tags', 'genres',
                ])
                ->orderBy('updated_at', 'desc')
                ->limit(50)
                ->get()
        );
    }
}
