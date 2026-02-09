<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Models\AiPlatform;
use App\Models\YoutubePlaylist;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WatchlistPlatformController extends Controller
{
    /**
     * Sync data to a watchlist hub
     */
    public function sync(Request $request, AiPlatform $platform)
    {
        if ($platform->type !== 'watchlist') {
            return response()->json(['error' => 'Platform is not of type watchlist'], 400);
        }

        $request->validate([
            'playlist_id' => 'required|exists:youtube_playlists,playlist_id'
        ]);

        $playlist = YoutubePlaylist::where('playlist_id', $request->playlist_id)->with('videos')->first();

        try {
            Log::info("Watchlist Sync: Syncing bulk metadata for '{$playlist->title}' to platform '{$platform->name}'");

            // In a real scenario, this would call an external API or push to a specific DB section
            // For now, we replicate the "Bulk Metadata" sync behavior

            $payload = [
                'hub_name' => $platform->name,
                'target_section' => $platform->target_section,
                'playlist' => [
                    'source_id' => $playlist->playlist_id,
                    'title' => $playlist->title,
                    'video_count' => count($playlist->videos),
                ],
                'metadata' => $playlist->videos->map(function ($video) {
                    return [
                        'title' => $video->title,
                        'youtube_id' => $video->video_id,
                        'duration' => $video->duration,
                        'tags' => $video->tags,
                        'genres' => $video->genres
                    ];
                })
            ];

            // Simulate external delivery (or internal section update)
            Log::info("Watchlist Sync [Payload Prepared]: " . count($payload['metadata']) . " items ready.");

            return response()->json([
                'status' => 'success',
                'message' => 'Playlist metadata synced to Watchlist successfully.',
                'details' => [
                    'title' => $playlist->title,
                    'items_synced' => count($playlist->videos),
                    'target_platform' => $platform->name
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Watchlist Platform Sync Error: " . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
