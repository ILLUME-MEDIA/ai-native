<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Models\AiPlatform;
use App\Models\YoutubePlaylist;
use App\Services\AI\YouTubeScraperService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StreamingPlatformController extends Controller
{
    public function __construct(protected YouTubeScraperService $scraperService)
    {
    }

    /**
     * Push playlist data to a streaming platform (Channel API compatible: artist/album/track).
     */
    public function push(Request $request, AiPlatform $platform)
    {
        if ($platform->type !== 'streaming') {
            return response()->json(['error' => 'Platform is not of type streaming'], 400);
        }

        $request->validate([
            'playlist_id' => 'required|exists:youtube_playlists,playlist_id'
        ]);

        $playlist = YoutubePlaylist::where('playlist_id', $request->playlist_id)->with('videos')->first();
        if (!$playlist || $playlist->videos->isEmpty()) {
            return response()->json(['error' => 'Playlist not found or has no videos.'], 404);
        }

        try {
            $result = $this->scraperService->pushToPlatform($playlist->playlist_id, $platform->id);

            if (($result['status'] ?? '') === 'error') {
                return response()->json(['error' => $result['message'] ?? 'Push failed'], 500);
            }

            return response()->json([
                'status' => 'success',
                'message' => $result['message'] ?? "Successfully pushed '{$playlist->title}' to {$platform->name}",
                'details' => $result['details'] ?? []
            ]);
        } catch (\Exception $e) {
            Log::error("Streaming Platform Push Error: " . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
