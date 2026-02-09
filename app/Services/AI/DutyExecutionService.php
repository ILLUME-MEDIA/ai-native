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
        } catch (\Exception $e) {
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
            throw new \Exception("Playlist not found: {$playlistId}");
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

        $existingAlbumId = \App\Models\YoutubePlatformPush::where('playlist_id', $playlistId)
            ->where('platform_name', $platform->name)
            ->whereNotNull('platform_album_id')
            ->value('platform_album_id');

        return $this->scraperService->pushToPlatform($playlistId, $platformId, [
            'only_video_ids' => $missingVideoIds,
            'existing_album_id' => $existingAlbumId,
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
