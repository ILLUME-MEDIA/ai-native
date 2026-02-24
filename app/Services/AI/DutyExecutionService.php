<?php

namespace App\Services\AI;

use App\Models\AiDuty;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class DutyExecutionService
{
    public function __construct(
        protected AIManager $aiManager,
        protected YouTubeScraperService $scraperService
    ) {
    }

    /**
     * Execute a specific duty
     */
    public function execute(AiDuty $duty): array
    {
        $duty->markAsRunning();

        try {
            // Check if it's a special deterministic duty (e.g. YouTube Sync or Platform Push)
            if ($this->isYoutubeSyncDuty($duty)) {
                $result = $this->runYoutubeSync($duty);
            } elseif ($this->isPlatformPushDuty($duty)) {
                $result = $this->runPlatformPush($duty);
            } else {
                // AI-driven duties now use the global AI system
                $result = $this->aiManager->execute($duty->instructions, ['mode' => 'duty']);
            }

            $duty->markAsCompleted($result);
            return $result;
        } catch (\Throwable $e) {
            $duty->markAsFailed($e->getMessage());
            Log::error("Duty [{$duty->name}] failed: " . $e->getMessage());
            throw $e;
        }
    }

    protected function isYoutubeSyncDuty(AiDuty $duty): bool
    {
        $data = $duty->execution_data ?? [];
        return isset($data['playlist_id']) && ($duty->metadata['type'] ?? '') === 'youtube_sync';
    }

    protected function runYoutubeSync(AiDuty $duty): array
    {
        $data = $duty->execution_data ?? [];
        $playlistId = $data['playlist_id'] ?? null;
        if (!$playlistId) {
            throw new \Exception('Duty execution_data missing playlist_id.');
        }

        $existingVideoIds = \App\Models\YoutubeVideo::where('playlist_id', $playlistId)->pluck('video_id')->toArray();
        $playlistData = $this->scraperService->fetchPlaylist($playlistId);
        $this->scraperService->syncToDatabase($playlistData);

        $fetchedVideoIds = array_column($playlistData['videos'] ?? [], 'video_id');
        $newVideoIds = array_values(array_diff($fetchedVideoIds, $existingVideoIds));
        $tagsGenerated = 0;

        foreach ($newVideoIds as $videoId) {
            try {
                $meta = $this->scraperService->generateMetadata($videoId);
                if (!empty($meta['tags']) || !empty($meta['genres'])) {
                    $tagsGenerated++;
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning("Duty YouTube Sync: generateMetadata failed for {$videoId}: " . $e->getMessage());
            }
        }

        return [
            'status' => 'success',
            'playlist_id' => $playlistId,
            'playlist_title' => $playlistData['title'] ?? 'Unknown',
            'videos_fetched' => count($playlistData['videos'] ?? []),
            'new_episodes' => count($newVideoIds),
            'tags_genres_generated' => $tagsGenerated,
        ];
    }

    protected function isPlatformPushDuty(AiDuty $duty): bool
    {
        return ($duty->metadata['type'] ?? '') === 'platform_push';
    }

    protected function runPlatformPush(AiDuty $duty): array
    {
        $data = $duty->execution_data ?? [];
        $playlistId = $data['playlist_id'] ?? null;
        $platformId = $data['platform_id'] ?? null;

        if (!$playlistId || !$platformId) {
            throw new \Exception('Duty execution_data missing playlist_id or platform_id.');
        }

        $playlist = \App\Models\YoutubePlaylist::where('playlist_id', $playlistId)->with('videos')->first();
        if (!$playlist) {
            // Playlist was deleted from DB — re-fetch from YouTube and sync
            Log::info("Duty [{$duty->name}]: Playlist {$playlistId} not in DB, re-syncing from YouTube.");
            try {
                $playlistData = $this->scraperService->fetchPlaylist($playlistId);
                $this->scraperService->syncToDatabase($playlistData);
            } catch (\Exception $e) {
                throw new \Exception("Playlist {$playlistId} not found in DB and could not be re-fetched from YouTube: " . $e->getMessage());
            }
            $playlist = \App\Models\YoutubePlaylist::where('playlist_id', $playlistId)->with('videos')->first();
            if (!$playlist) {
                throw new \Exception("Playlist {$playlistId} re-sync completed but still not found in DB.");
            }
        }

        $platform = \App\Models\AiPlatform::find($platformId);
        if (!$platform) {
            throw new \Exception("Platform not found: {$platformId}");
        }

        $pushedVideoIds = \App\Models\YoutubePlatformPush::where('playlist_id', $playlistId)
            ->where('platform_name', $platform->name)
            ->where('status', 'success')
            ->pluck('video_id')
            ->toArray();

        $allVideoIds = $playlist->videos->pluck('video_id')->toArray();
        $missingVideoIds = array_values(array_diff($allVideoIds, $pushedVideoIds));

        if (empty($missingVideoIds)) {
            return [
                'status' => 'success',
                'message' => 'No new episodes to push.',
                'playlist_id' => $playlistId,
                'platform' => $platform->name,
                'pushed' => 0,
            ];
        }

        // --- Resolve existing album_id (Streaming) ---
        // Priority: 1) youtube_platform_pushes table  2) duty execution_data  3) playlist metadata
        $existingAlbumId = \App\Models\YoutubePlatformPush::where('playlist_id', $playlistId)
            ->where('platform_name', $platform->name)
            ->whereNotNull('platform_album_id')
            ->where('status', 'success')
            ->orderByDesc('pushed_at')
            ->value('platform_album_id');

        if (!$existingAlbumId && !empty($data['platform_album_id'])) {
            $existingAlbumId = $data['platform_album_id'];
            Log::info("Duty: using platform_album_id from execution_data", [
                'album_id' => $existingAlbumId,
            ]);
        }

        if (!$existingAlbumId) {
            $playlistMeta    = $playlist->metadata ?? [];
            $existingAlbumId = $playlistMeta['last_album_id'] ?? null;
            if ($existingAlbumId) {
                Log::info("Duty: using last_album_id from playlist metadata", [
                    'album_id' => $existingAlbumId,
                ]);
            }
        }

        // --- Resolve existing artist_id (Streaming) ---
        $existingArtistId = $data['platform_artist_id'] ?? null;
        if (!$existingArtistId) {
            $playlistMeta     = $playlist->metadata ?? [];
            $existingArtistId = $playlistMeta['last_artist_id'] ?? null;
        }

        // --- Resolve existing title_id (Watchlist) ---
        $existingTitleId = $data['platform_title_id'] ?? null;
        if (!$existingTitleId) {
            $playlistMeta    = $playlist->metadata ?? [];
            $existingTitleId = $playlistMeta['last_watchlist_title_id'] ?? null;
            if ($existingTitleId) {
                Log::info("Duty: using last_watchlist_title_id from playlist metadata", [
                    'title_id' => $existingTitleId,
                ]);
            }
        }

        return $this->scraperService->pushToPlatform($playlistId, $platformId, [
            'only_video_ids'    => $missingVideoIds,
            'existing_album_id' => $existingAlbumId,
            'existing_artist_id'=> $existingArtistId,
            'existing_title_id' => $existingTitleId,
            'override_genres'   => $data['override_genres'] ?? [],
            'override_tags'     => $data['override_tags']   ?? [],
        ]);
    }

    protected function executeAiDuty(AiDuty $duty): array
    {
        $prompt = "### AUTOMATED DUTY EXECUTION\n";
        $prompt .= "Duty: {$duty->name}\n";
        $prompt .= "Instructions: {$duty->instructions}\n";

        if ($duty->execution_data) {
            $prompt .= "Context: " . json_encode($duty->execution_data) . "\n";
        }

        return $this->aiManager->execute($prompt);
    }
}
