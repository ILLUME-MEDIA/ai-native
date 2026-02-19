<?php

namespace App\Jobs;

use App\Models\YoutubePlaylist;
use App\Services\AI\YouTubeScraperService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class EnrichPlaylistJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Max execution time for large playlists (15 minutes).
     */
    public int $timeout = 900;

    /**
     * Do not retry on failure (YouTube/Mistral errors are not transient).
     */
    public int $tries = 1;

    public function __construct(public string $playlistId)
    {
    }

    public function handle(YouTubeScraperService $scraperService): void
    {
        Log::info("EnrichPlaylistJob: starting enrichment for playlist {$this->playlistId}");

        try {
            $result = $scraperService->enrichPlaylistVideos($this->playlistId);

            Log::info("EnrichPlaylistJob: completed", [
                'playlist_id' => $this->playlistId,
                'enriched'    => $result['enriched'] ?? 0,
                'total'       => $result['total'] ?? 0,
                'errors'      => count($result['errors'] ?? []),
            ]);

            // Mark playlist as enriched so the UI can reflect it
            YoutubePlaylist::where('playlist_id', $this->playlistId)
                ->update(['last_fetched_at' => now()]);

        } catch (\Throwable $e) {
            Log::error("EnrichPlaylistJob failed for {$this->playlistId}: " . $e->getMessage());
        }
    }
}
